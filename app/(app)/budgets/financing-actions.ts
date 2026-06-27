"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { denyUnless } from "@/lib/auth/role";

type ActionResult = { ok: boolean; error?: string };

// F2.7 / BR-12 — base de couverture du scénario (financements déjà acquis).
export async function updateCoverageBaseline(
  budgetId: string,
  value: number,
): Promise<ActionResult> {
  const supabase = createClient();
  const deny = await denyUnless(supabase, "edit_budget");
  if (deny) return { ok: false, error: deny };
  const { error } = await supabase
    .from("budgets")
    .update({ coverage_baseline: value })
    .eq("id", budgetId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/budgets");
  return { ok: true };
}

// F2.7 — créer une ligne de financement prévisionnel.
export async function addScenarioFinancing(
  budgetId: string,
  name: string,
  amountTotal: number,
): Promise<ActionResult> {
  if (!name.trim()) return { ok: false, error: "Nom requis." };
  const supabase = createClient();
  const deny = await denyUnless(supabase, "edit_budget");
  if (deny) return { ok: false, error: deny };
  const { error } = await supabase
    .from("scenario_financing")
    .insert({ budget_id: budgetId, name: name.trim(), amount_total: amountTotal });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/budgets");
  return { ok: true };
}

export async function updateScenarioFinancing(
  id: string,
  name: string,
  amountTotal: number,
): Promise<ActionResult> {
  const supabase = createClient();
  const deny = await denyUnless(supabase, "edit_budget");
  if (deny) return { ok: false, error: deny };
  const { error } = await supabase
    .from("scenario_financing")
    .update({ name: name.trim(), amount_total: amountTotal })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/budgets");
  return { ok: true };
}

export async function deleteScenarioFinancing(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const deny = await denyUnless(supabase, "edit_budget");
  if (deny) return { ok: false, error: deny };
  const { error } = await supabase.from("scenario_financing").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/budgets");
  return { ok: true };
}

// F2.7 — répartition mensuelle d'une ligne (12 mois d'une année).
export async function saveScenarioFinancingMonths(
  financingId: string,
  year: number,
  months: number[],
): Promise<ActionResult> {
  if (months.length !== 12) return { ok: false, error: "12 mois attendus." };
  const supabase = createClient();
  const deny = await denyUnless(supabase, "edit_budget");
  if (deny) return { ok: false, error: deny };
  const rows = months.map((amount, i) => ({
    scenario_financing_id: financingId,
    year,
    month: i + 1,
    amount: amount ?? 0,
  }));
  const { error } = await supabase
    .from("scenario_financing_monthly")
    .upsert(rows, { onConflict: "scenario_financing_id,year,month" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/budgets");
  return { ok: true };
}

// F2.8 / BR-12.3 — convertir une ligne prévisionnelle en financement réel.
// Crée un `bailleurs` (fonds) + copie la répartition mensuelle en recettes prévues.
export type ConvertInput = {
  financingId: string;
  code: string;            // référence courte unique (bailleurs.code)
  reference: string;       // ID affiché (JFN-001)
  color: string;           // hex
  conventionStart: string | null;
  conventionEnd: string | null;
  description: string | null;
  montantTotal: number | null;
};

export async function convertScenarioFinancing(
  input: ConvertInput,
): Promise<ActionResult> {
  const supabase = createClient();
  const deny = await denyUnless(supabase, "manage_bailleurs");
  if (deny) return { ok: false, error: deny };

  const { data: fin } = await supabase
    .from("scenario_financing")
    .select("id, name, amount_total, converted_bailleur_id")
    .eq("id", input.financingId)
    .maybeSingle();
  if (!fin) return { ok: false, error: "Financement prévisionnel introuvable." };
  if (fin.converted_bailleur_id) return { ok: false, error: "Déjà converti." };

  // Crée le financement réel (table bailleurs = fonds).
  const { data: created, error: cErr } = await supabase
    .from("bailleurs")
    .insert({
      code: input.code.trim(),
      name: fin.name as string,
      color: input.color,
      reference: input.reference.trim() || null,
      description: input.description,
      montant_total: input.montantTotal ?? (fin.amount_total as number),
      convention_start: input.conventionStart,
      convention_end: input.conventionEnd,
    })
    .select("id")
    .single();
  if (cErr || !created) return { ok: false, error: cErr?.message ?? "Création du financement échouée." };
  const bailleurId = created.id as string;

  // Copie la répartition mensuelle simulée en recettes prévues (BR-3.3).
  const { data: monthlyRows } = await supabase
    .from("scenario_financing_monthly")
    .select("year, month, amount")
    .eq("scenario_financing_id", input.financingId);
  if (monthlyRows && monthlyRows.length > 0) {
    const incomeRows = monthlyRows.map((r) => ({
      bailleur_id: bailleurId,
      year: r.year,
      month: r.month,
      amount: r.amount,
    }));
    const { error: iErr } = await supabase
      .from("bailleur_income_monthly")
      .upsert(incomeRows, { onConflict: "bailleur_id,year,month" });
    if (iErr) return { ok: false, error: iErr.message };
  }

  // Marque la ligne convertie (ne sera plus reproposée).
  const { error: uErr } = await supabase
    .from("scenario_financing")
    .update({ converted_bailleur_id: bailleurId })
    .eq("id", input.financingId);
  if (uErr) return { ok: false, error: uErr.message };

  revalidatePath("/budgets");
  revalidatePath("/financements");
  return { ok: true };
}
