"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: boolean; error?: string };

export type MonthlyChange = {
  line_id: string;
  year: number;
  month: number;
  amount: number;
};
export type TotalChange = {
  line_id: string;
  year: number;
  total_input: number | null;
};
export type BailleurChange = {
  line_id: string;
  year: number;
  month: number;
  bailleur_id: string | null;
};

// BR-9.1 — Envoi groupé (upsert) des modifications du mode édition par lot.
// Montants et assignations bailleur sont upsertés séparément : chaque upsert
// ne touche que ses colonnes, l'autre est préservée sur conflit.
export async function saveGrid(
  budgetId: string,
  monthly: MonthlyChange[],
  totals: TotalChange[],
  bailleurs: BailleurChange[] = [],
): Promise<ActionResult> {
  const supabase = createClient();

  if (monthly.length > 0) {
    const rows = monthly.map((m) => ({ budget_id: budgetId, ...m }));
    const { error } = await supabase
      .from("budget_monthly")
      .upsert(rows, { onConflict: "budget_id,line_id,year,month" });
    if (error) return { ok: false, error: error.message };
  }

  // F3.9 — assignation bailleur par (LB × mois), un seul bailleur (P4).
  if (bailleurs.length > 0) {
    const rows = bailleurs.map((b) => ({ budget_id: budgetId, ...b }));
    const { error } = await supabase
      .from("budget_monthly")
      .upsert(rows, { onConflict: "budget_id,line_id,year,month" });
    if (error) return { ok: false, error: error.message };
  }

  if (totals.length > 0) {
    const rows = totals.map((t) => ({ budget_id: budgetId, ...t }));
    const { error } = await supabase
      .from("budget_line_totals")
      .upsert(rows, { onConflict: "budget_id,line_id,year" });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/interne");
  return { ok: true };
}

// BR-8.1 — Ajouter une année : crée les mailles vides (0) pour toutes les LB niv.3.
export async function addYear(
  budgetId: string,
  year: number,
): Promise<ActionResult> {
  const supabase = createClient();

  const { error: yearErr } = await supabase
    .from("budget_years")
    .insert({ budget_id: budgetId, year });
  if (yearErr) return { ok: false, error: yearErr.message };

  const { data: leaves } = await supabase
    .from("structure_lines")
    .select("id")
    .eq("level", 3)
    .eq("active", true);

  if (leaves && leaves.length > 0) {
    const rows = leaves.flatMap((l) =>
      Array.from({ length: 12 }, (_, i) => ({
        budget_id: budgetId,
        line_id: l.id as string,
        year,
        month: i + 1,
        amount: 0,
      })),
    );
    await supabase
      .from("budget_monthly")
      .upsert(rows, { onConflict: "budget_id,line_id,year,month", ignoreDuplicates: true });
  }

  revalidatePath("/interne");
  return { ok: true };
}

// BR-8.1 — Retirer une année (perte de données, confirmation côté UI).
export async function removeYear(
  budgetId: string,
  year: number,
): Promise<ActionResult> {
  const supabase = createClient();

  await supabase
    .from("budget_monthly")
    .delete()
    .eq("budget_id", budgetId)
    .eq("year", year);
  await supabase
    .from("budget_line_totals")
    .delete()
    .eq("budget_id", budgetId)
    .eq("year", year);
  const { error } = await supabase
    .from("budget_years")
    .delete()
    .eq("budget_id", budgetId)
    .eq("year", year);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/interne");
  return { ok: true };
}
