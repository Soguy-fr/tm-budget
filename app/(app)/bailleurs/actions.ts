"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { denyUnless } from "@/lib/auth/role";

type ActionResult = { ok: boolean; error?: string };

// F4.1 — Créer un bailleur.
export async function createBailleur(input: {
  code: string;
  name: string;
  color: string;
  convention_start: string | null;
  convention_end: string | null;
  montant_conventionne?: number | null; // C2/Q4 — plafond contractuel
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
    montant_conventionne: input.montant_conventionne ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/bailleurs");
  return { ok: true };
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
