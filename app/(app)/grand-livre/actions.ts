"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MappedEntry } from "@/lib/gl";

type ActionResult = { ok: boolean; error?: string; count?: number };

// F5.1 — Importer un GL (CSV déjà parsé/mappé côté client), conserver `raw`.
export async function importGl(
  filename: string,
  entries: MappedEntry[],
): Promise<ActionResult> {
  if (entries.length === 0) return { ok: false, error: "Aucune écriture à importer." };
  const supabase = createClient();

  const { data: imp, error: impErr } = await supabase
    .from("gl_imports")
    .insert({ filename, row_count: entries.length })
    .select("id")
    .single();
  if (impErr || !imp) return { ok: false, error: impErr?.message ?? "Import échoué." };

  const batch = imp.id as string;
  const rows = entries.map((e) => ({
    import_batch: batch,
    entry_date: e.entry_date,
    entry_type: e.entry_type,
    label: e.label,
    amount: e.amount,
    raw: e.raw,
  }));

  const { error } = await supabase.from("gl_entries").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/grand-livre");
  return { ok: true, count: entries.length };
}

// F5.2 / F5.3 — Allouer / corriger LB et bailleur d'une écriture.
export async function updateAllocation(
  id: string,
  line_id: string | null,
  bailleur_id: string | null,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("gl_entries")
    .update({ line_id, bailleur_id })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/grand-livre");
  return { ok: true };
}
