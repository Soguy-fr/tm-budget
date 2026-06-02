"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nextChildCode, nextSortOrder, canDeleteLine } from "@/lib/structure";
import type { StructureLine } from "@/lib/types";

type ActionResult = { ok: boolean; error?: string };

// F1.2 — Ajouter une LB sous une branche (numéro suivant, P3).
// parentId null → niveau 1.
export async function addLine(
  parentId: string | null,
  label: string,
): Promise<ActionResult> {
  const supabase = createClient();

  let parent: StructureLine | null = null;
  if (parentId) {
    const { data, error } = await supabase
      .from("structure_lines")
      .select("*")
      .eq("id", parentId)
      .single();
    if (error || !data) return { ok: false, error: "Ligne parente introuvable." };
    parent = data as StructureLine;
    if (parent.level >= 3) {
      return { ok: false, error: "Le niveau 3 ne peut pas avoir d'enfants." };
    }
  }

  // Frères = lignes ayant le même parent.
  const siblingsQuery = supabase.from("structure_lines").select("code, sort_order");
  const { data: siblings } = parentId
    ? await siblingsQuery.eq("parent_id", parentId)
    : await siblingsQuery.is("parent_id", null);

  const siblingCodes = (siblings ?? []).map((s) => s.code as string);
  const siblingOrders = (siblings ?? []).map((s) => s.sort_order as number);

  const code = nextChildCode(parent?.code ?? null, siblingCodes);
  const level = parent ? parent.level + 1 : 1;
  const sort_order = nextSortOrder(siblingOrders);

  const { error } = await supabase.from("structure_lines").insert({
    code,
    level,
    label: label.trim() || code,
    parent_id: parentId,
    sort_order,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/structure");
  return { ok: true };
}

// F1.3 — Renommer (avertissement de propagation géré côté UI, P8).
export async function renameLine(
  id: string,
  label: string,
): Promise<ActionResult> {
  if (!label.trim()) return { ok: false, error: "Le libellé est requis." };
  const supabase = createClient();
  const { error } = await supabase
    .from("structure_lines")
    .update({ label: label.trim() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/structure");
  return { ok: true };
}

// F1.5 — Supprimer (interdit si montant/écriture liés, P8 ; sinon soft-delete).
export async function deleteLine(id: string): Promise<ActionResult> {
  const supabase = createClient();

  const { count: amountCount } = await supabase
    .from("budget_monthly")
    .select("id", { count: "exact", head: true })
    .eq("line_id", id)
    .neq("amount", 0);

  const { count: glCount } = await supabase
    .from("gl_entries")
    .select("id", { count: "exact", head: true })
    .eq("line_id", id);

  const guard = canDeleteLine({
    hasNonZeroAmount: (amountCount ?? 0) > 0,
    hasGlEntry: (glCount ?? 0) > 0,
  });
  if (!guard.ok) return { ok: false, error: guard.reason };

  // Soft-delete (DOMAIN-MODEL 2.1).
  const { error } = await supabase
    .from("structure_lines")
    .update({ active: false })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/structure");
  return { ok: true };
}
