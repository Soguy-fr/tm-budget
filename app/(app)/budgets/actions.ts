"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cloneMonthlyRows, duplicateName } from "@/lib/budgets";
import type { Budget } from "@/lib/types";

type ActionResult = { ok: boolean; error?: string };

// F2.1 — Créer un budget nommé librement.
export async function createBudget(name: string): Promise<ActionResult> {
  if (!name.trim()) return { ok: false, error: "Le nom est requis." };
  const supabase = createClient();
  const { error } = await supabase
    .from("budgets")
    .insert({ name: name.trim(), type: "interne" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/budgets");
  return { ok: true };
}

// F2.2 — Sélectionner le budget actif (un seul, contrainte DB one_active_budget).
// Désactiver d'abord l'actif courant pour respecter l'index unique partiel.
export async function setActiveBudget(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error: unsetErr } = await supabase
    .from("budgets")
    .update({ is_active: false })
    .eq("is_active", true);
  if (unsetErr) return { ok: false, error: unsetErr.message };

  const { error } = await supabase
    .from("budgets")
    .update({ is_active: true })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/budgets");
  return { ok: true };
}

// F2.5 — Saisir le solde initial de trésorerie (1er janvier, 1re année).
export async function updateInitialCash(
  id: string,
  value: number,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("budgets")
    .update({ initial_cash: value })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/budgets");
  return { ok: true };
}

// F2.3 — Dupliquer un budget : copie années + mailles (montants + assignations).
export async function duplicateBudget(id: string): Promise<ActionResult> {
  const supabase = createClient();

  const { data: src, error: srcErr } = await supabase
    .from("budgets")
    .select("*")
    .eq("id", id)
    .single();
  if (srcErr || !src) return { ok: false, error: "Budget source introuvable." };
  const source = src as Budget;

  // Nouveau budget (jamais actif par défaut), solde initial repris.
  const { data: created, error: createErr } = await supabase
    .from("budgets")
    .insert({
      name: duplicateName(source),
      type: source.type,
      is_active: false,
      initial_cash: source.initial_cash,
    })
    .select("id")
    .single();
  if (createErr || !created) {
    return { ok: false, error: createErr?.message ?? "Création échouée." };
  }
  const newId = created.id as string;

  // Années.
  const { data: years } = await supabase
    .from("budget_years")
    .select("year")
    .eq("budget_id", id);
  if (years && years.length > 0) {
    await supabase
      .from("budget_years")
      .insert(years.map((y) => ({ budget_id: newId, year: y.year })));
  }

  // Mailles mensuelles (montants + assignations bailleur).
  const { data: monthly } = await supabase
    .from("budget_monthly")
    .select("line_id, year, month, amount, bailleur_id")
    .eq("budget_id", id);
  if (monthly && monthly.length > 0) {
    await supabase
      .from("budget_monthly")
      .insert(cloneMonthlyRows(monthly, newId));
  }

  // Totaux annuels saisis (BR-1.1).
  const { data: totals } = await supabase
    .from("budget_line_totals")
    .select("line_id, year, total_input")
    .eq("budget_id", id);
  if (totals && totals.length > 0) {
    await supabase
      .from("budget_line_totals")
      .insert(totals.map((t) => ({ budget_id: newId, ...t })));
  }

  revalidatePath("/budgets");
  return { ok: true };
}
