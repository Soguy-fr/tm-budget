"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { denyUnless } from "@/lib/auth/role";
import { eligibleMonths, planAssignment } from "@/lib/financement";

type ActionResult = { ok: boolean; error?: string };

// F4.9 — Créer un bailleur (acteur). Un acteur porte 1..N financements.
export async function createFunder(name: string): Promise<ActionResult> {
  if (!name.trim()) return { ok: false, error: "Nom du bailleur requis." };
  const supabase = createClient();
  const deny = await denyUnless(supabase, "manage_bailleurs");
  if (deny) return { ok: false, error: deny };
  const { error } = await supabase.from("funders").insert({ name: name.trim() });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/bailleurs");
  return { ok: true };
}

// F4.1 / F4.10 — Créer un financement (fonds). convention_* = fenêtre d'éligibilité.
export async function createBailleur(input: {
  code: string;
  name: string;
  color: string;
  convention_start: string | null;
  convention_end: string | null;
  funder_id?: string | null;
  reference?: string | null;
  description?: string | null;
  montant_total?: number | null;
}): Promise<ActionResult> {
  if (!input.code.trim() || !input.name.trim())
    return { ok: false, error: "Code et nom requis." };
  const supabase = createClient();
  const deny = await denyUnless(supabase, "manage_bailleurs");
  if (deny) return { ok: false, error: deny };
  const { error } = await supabase.from("bailleurs").insert({
    code: input.code.trim(),
    name: input.name.trim(),
    color: input.color || "#64748b",
    convention_start: input.convention_start || null,
    convention_end: input.convention_end || null,
    funder_id: input.funder_id || null,
    reference: input.reference?.trim() || null,
    description: input.description?.trim() || null,
    montant_total: input.montant_total ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/bailleurs");
  return { ok: true };
}

// F4.10 — Éditer les champs d'un financement (en-tête).
export async function updateFinancement(
  id: string,
  fields: {
    funder_id: string | null;
    reference: string | null;
    description: string | null;
    montant_total: number | null;
    convention_start: string | null;
    convention_end: string | null;
  },
): Promise<ActionResult> {
  const supabase = createClient();
  const deny = await denyUnless(supabase, "manage_bailleurs");
  if (deny) return { ok: false, error: deny };
  const { error } = await supabase
    .from("bailleurs")
    .update({
      funder_id: fields.funder_id || null,
      reference: fields.reference?.trim() || null,
      description: fields.description?.trim() || null,
      montant_total: fields.montant_total ?? null,
      convention_start: fields.convention_start || null,
      convention_end: fields.convention_end || null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/bailleurs/${id}`);
  return { ok: true };
}

// F4.12 / BR-3.5 — Assigner les LB mappées au financement sur sa fenêtre d'éligibilité.
// force=false : si des mailles portent un AUTRE financement, renvoie le nb de conflits
// SANS écrire (l'UI demande confirmation). force=true : applique l'écrasement.
export async function assignLinesToBudget(
  bailleurId: string,
  force: boolean,
): Promise<{ ok: boolean; error?: string; conflicts?: number; applied?: number }> {
  const supabase = createClient();
  const deny = await denyUnless(supabase, "edit_budget");
  if (deny) return { ok: false, error: deny };

  const { data: budget } = await supabase
    .from("budgets")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  if (!budget) return { ok: false, error: "Aucun budget actif." };

  const { data: fin } = await supabase
    .from("bailleurs")
    .select("convention_start, convention_end")
    .eq("id", bailleurId)
    .maybeSingle();
  if (!fin) return { ok: false, error: "Financement introuvable." };

  const { data: linesRows } = await supabase
    .from("bailleur_lines")
    .select("id")
    .eq("bailleur_id", bailleurId);
  const finLineIds = (linesRows ?? []).map((r) => r.id as string);
  if (finLineIds.length === 0)
    return { ok: false, error: "Aucune ligne de financement (créez et mappez d'abord)." };

  const { data: maps } = await supabase
    .from("bailleur_line_mapping")
    .select("line_id")
    .in("bailleur_line_id", finLineIds);
  const mappedLineIds = Array.from(new Set((maps ?? []).map((m) => m.line_id as string)));
  if (mappedLineIds.length === 0)
    return { ok: false, error: "Aucune ligne budgétaire mappée." };

  const { data: yrs } = await supabase
    .from("budget_years")
    .select("year")
    .eq("budget_id", budget.id);
  const years = (yrs ?? []).map((y) => y.year as number);
  const months = eligibleMonths(fin.convention_start, fin.convention_end, years);
  if (months.length === 0)
    return { ok: false, error: "Aucun mois éligible dans les années du budget." };

  const { data: cur } = await supabase
    .from("budget_monthly")
    .select("line_id, year, month, bailleur_id")
    .eq("budget_id", budget.id)
    .in("line_id", mappedLineIds);
  const currentByCell: Record<string, string | null> = {};
  for (const c of cur ?? [])
    currentByCell[`${c.line_id}:${c.year}:${c.month}`] = (c.bailleur_id as string | null) ?? null;

  const { cells, conflicts } = planAssignment({
    financementId: bailleurId,
    mappedLineIds,
    months,
    currentByCell,
  });

  if (conflicts.length > 0 && !force) {
    return { ok: true, conflicts: conflicts.length };
  }

  // Upsert : impute le financement à chaque maille cible. amount non fourni →
  // créé à 0 (nouvelle maille) ou conservé (maille existante).
  const payload = cells.map((c) => ({
    budget_id: budget.id,
    line_id: c.line_id,
    year: c.year,
    month: c.month,
    bailleur_id: bailleurId,
  }));
  const { error } = await supabase
    .from("budget_monthly")
    .upsert(payload, { onConflict: "budget_id,line_id,year,month" });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/bailleurs/${bailleurId}`);
  revalidatePath("/interne");
  return { ok: true, applied: cells.length };
}

// F4.2 — Ajouter une ligne bailleur (A1, A2…).
export async function addBailleurLine(
  bailleurId: string,
  code: string,
  label: string,
): Promise<ActionResult> {
  if (!code.trim()) return { ok: false, error: "Code requis." };
  const supabase = createClient();
  const deny = await denyUnless(supabase, "manage_bailleurs");
  if (deny) return { ok: false, error: deny };

  const { data: existing } = await supabase
    .from("bailleur_lines")
    .select("sort_order")
    .eq("bailleur_id", bailleurId);
  const sort_order =
    (existing ?? []).reduce((m, r) => Math.max(m, r.sort_order as number), 0) + 10;

  const { error } = await supabase.from("bailleur_lines").insert({
    bailleur_id: bailleurId,
    code: code.trim(),
    label: label.trim() || code.trim(),
    sort_order,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/bailleurs/${bailleurId}`);
  return { ok: true };
}

export async function deleteBailleurLine(
  bailleurId: string,
  lineId: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const deny = await denyUnless(supabase, "manage_bailleurs");
  if (deny) return { ok: false, error: deny };
  const { error } = await supabase.from("bailleur_lines").delete().eq("id", lineId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/bailleurs/${bailleurId}`);
  return { ok: true };
}

// F4.3 — Définir le mapping ligne bailleur → LB internes (remplace l'existant).
export async function setLineMapping(
  bailleurId: string,
  bailleurLineId: string,
  lineIds: string[],
): Promise<ActionResult> {
  const supabase = createClient();
  const deny = await denyUnless(supabase, "manage_bailleurs");
  if (deny) return { ok: false, error: deny };
  await supabase
    .from("bailleur_line_mapping")
    .delete()
    .eq("bailleur_line_id", bailleurLineId);
  if (lineIds.length > 0) {
    const { error } = await supabase
      .from("bailleur_line_mapping")
      .insert(lineIds.map((line_id) => ({ bailleur_line_id: bailleurLineId, line_id })));
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(`/bailleurs/${bailleurId}`);
  return { ok: true };
}

// F4.5 — Enregistrer les recettes prévues (déblocages) par mois.
export async function saveIncome(
  bailleurId: string,
  rows: { year: number; month: number; amount: number }[],
): Promise<ActionResult> {
  if (rows.length === 0) return { ok: true };
  const supabase = createClient();
  const deny = await denyUnless(supabase, "edit_budget");
  if (deny) return { ok: false, error: deny };
  const payload = rows.map((r) => ({ bailleur_id: bailleurId, ...r }));
  const { error } = await supabase
    .from("bailleur_income_monthly")
    .upsert(payload, { onConflict: "bailleur_id,year,month" });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/bailleurs/${bailleurId}`);
  return { ok: true };
}
