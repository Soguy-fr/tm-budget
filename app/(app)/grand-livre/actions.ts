"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MappedEntry } from "@/lib/gl";
import { denyUnless } from "@/lib/auth/role";
import { findDuplicates } from "@/lib/duplicates";
import { isClosed, type ClosureRow } from "@/lib/closure";
import {
  buildCategorizePrompt, parseCategorizeResponse, resolveSuggestions,
  type CatSuggestion,
} from "@/lib/ai/categorize";
import { chatCompletion } from "@/lib/ai/openrouter";

type ActionResult = { ok: boolean; error?: string; count?: number };

async function loadClosures(supabase: ReturnType<typeof createClient>): Promise<ClosureRow[]> {
  const { data, error } = await supabase
    .from("month_closures")
    .select("year, month, reopened_at");
  if (error) return []; // table absente (pré-0006) → aucun verrou
  return (data ?? []) as ClosureRow[];
}

// F5.1 — Importer un GL (CSV déjà parsé/mappé côté client), conserver `raw`.
// C1 — détection de doublons : sans `force`, l'import s'arrête et renvoie les
// doublons probables ; le client confirme (tout importer / ignorer les doublons).
export type ImportResult = ActionResult & {
  duplicates?: Array<{ index: number; entry_date: string; amount: number; label: string | null }>;
};

export async function importGl(
  filename: string,
  entries: MappedEntry[],
  mode: "check" | "force" | "skip-duplicates" = "check",
): Promise<ImportResult> {
  if (entries.length === 0) return { ok: false, error: "Aucune écriture à importer." };
  const supabase = createClient();
  const deny = await denyUnless(supabase, "import_gl");
  if (deny) return { ok: false, error: deny };

  // BR-11.2 — pas d'import dans un mois clos.
  const closures = await loadClosures(supabase);
  const lockedMonth = entries.find((e) =>
    isClosed(closures, Number(e.entry_date.slice(0, 4)), Number(e.entry_date.slice(5, 7))),
  );
  if (lockedMonth) {
    return {
      ok: false,
      error: `Import refusé : le mois ${lockedMonth.entry_date.slice(0, 7)} est clos (réouvrir d'abord).`,
    };
  }

  // C1 — doublons probables vs écritures existantes (même date + montant + libellé proche).
  let toInsert = entries;
  if (mode !== "force") {
    const dates = Array.from(new Set(entries.map((e) => e.entry_date)));
    const { data: existing } = await supabase
      .from("gl_entries")
      .select("entry_date, amount, label")
      .in("entry_date", dates)
      .range(0, 9999);
    const dups = findDuplicates(entries, (existing ?? []) as Array<{ entry_date: string; amount: number; label: string | null }>);
    if (dups.length > 0 && mode === "check") {
      return {
        ok: false,
        duplicates: dups.map((d) => ({
          index: d.index,
          entry_date: d.incoming.entry_date,
          amount: d.incoming.amount,
          label: d.incoming.label,
        })),
      };
    }
    if (mode === "skip-duplicates") {
      const dupIdx = new Set(dups.map((d) => d.index));
      toInsert = entries.filter((_, i) => !dupIdx.has(i));
      if (toInsert.length === 0) return { ok: false, error: "Toutes les écritures sont des doublons." };
    }
  }

  const { data: imp, error: impErr } = await supabase
    .from("gl_imports")
    .insert({ filename, row_count: toInsert.length })
    .select("id")
    .single();
  if (impErr || !imp) return { ok: false, error: impErr?.message ?? "Import échoué." };

  const batch = imp.id as string;
  const rows = toInsert.map((e) => ({
    import_batch: batch,
    entry_date: e.entry_date,
    entry_type: e.entry_type,
    label: e.label,
    amount: e.amount,
    code_analytique: e.code_analytique,
    raw: e.raw,
  }));

  const { error } = await supabase.from("gl_entries").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/grand-livre");
  return { ok: true, count: toInsert.length };
}

// F5.2 / F5.3 — Allouer / corriger LB et bailleur d'une écriture.
// C6 — une allocation posée par un non-admin part « à confirmer ».
export async function updateAllocation(
  id: string,
  line_id: string | null,
  bailleur_id: string | null,
): Promise<ActionResult> {
  const supabase = createClient();
  const deny = await denyUnless(supabase, "allocate_gl");
  if (deny) return { ok: false, error: deny };

  // BR-11.2 — pas de modification d'allocation sur un mois clos.
  const { data: entry } = await supabase
    .from("gl_entries")
    .select("entry_date")
    .eq("id", id)
    .maybeSingle();
  if (entry) {
    const closures = await loadClosures(supabase);
    const y = Number((entry.entry_date as string).slice(0, 4));
    const m = Number((entry.entry_date as string).slice(5, 7));
    if (isClosed(closures, y, m)) {
      return { ok: false, error: `Mois ${y}-${String(m).padStart(2, "0")} clos : allocation verrouillée.` };
    }
  }

  // F12.6 supprimée : toute allocation est directement effective (confirmed=true).
  const { error } = await supabase
    .from("gl_entries")
    .update({ line_id, bailleur_id, confirmed: true })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/grand-livre");
  return { ok: true };
}

// I1 — Suggestions d'allocation par IA (OpenRouter, modèle gratuit).
// Lit jusqu'à 20 écritures non allouées + l'historique d'allocations comme
// exemples, et renvoie des suggestions VALIDÉES (codes existants uniquement).
export type SuggestResult = ActionResult & {
  suggestions?: Array<{
    entry_id: string;
    line_id: string;
    line_label: string;
    bailleur_id: string | null;
    bailleur_code: string | null;
    confidence: CatSuggestion["confidence"];
  }>;
};

export async function suggestAllocations(): Promise<SuggestResult> {
  const supabase = createClient();
  const deny = await denyUnless(supabase, "use_ai");
  if (deny) return { ok: false, error: deny };

  const [{ data: unalloc }, { data: lines }, { data: bailleurs }, { data: history }] =
    await Promise.all([
      supabase.from("gl_entries").select("id, entry_date, entry_type, label, amount")
        .is("line_id", null).eq("entry_type", "Dépense")
        .order("entry_date", { ascending: false }).range(0, 19),
      supabase.from("structure_lines").select("id, code, label").eq("level", 3).eq("active", true),
      supabase.from("bailleurs").select("id, code, name"),
      supabase.from("gl_entries").select("label, line_id, bailleur_id")
        .not("line_id", "is", null).not("label", "is", null)
        .order("created_at", { ascending: false }).range(0, 39),
    ]);

  const entries = (unalloc ?? []) as Array<{ id: string; entry_date: string; entry_type: "Dépense" | "Recette"; label: string | null; amount: number }>;
  if (entries.length === 0) return { ok: false, error: "Aucune écriture non allouée à catégoriser." };

  const catLines = (lines ?? []) as Array<{ id: string; code: string; label: string }>;
  const catBailleurs = (bailleurs ?? []) as Array<{ id: string; code: string; name: string }>;
  const lineCodeById = new Map(catLines.map((l) => [l.id, l.code]));
  const bailleurCodeById = new Map(catBailleurs.map((b) => [b.id, b.code]));
  const examples = ((history ?? []) as Array<{ label: string | null; line_id: string | null; bailleur_id: string | null }>)
    .filter((h) => h.label && h.line_id && lineCodeById.has(h.line_id))
    .slice(0, 20)
    .map((h) => ({
      label: h.label as string,
      line_code: lineCodeById.get(h.line_id as string) as string,
      bailleur_code: h.bailleur_id ? bailleurCodeById.get(h.bailleur_id) ?? null : null,
    }));

  const { system, user } = buildCategorizePrompt(entries, catLines, catBailleurs, examples);

  let text: string;
  try {
    const res = await chatCompletion({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    text = res.message.content ?? "";
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Appel OpenRouter échoué." };
  }

  const parsed = parseCategorizeResponse(
    text,
    new Set(entries.map((e) => e.id)),
    new Set(catLines.map((l) => l.code)),
    new Set(catBailleurs.map((b) => b.code)),
  );
  const resolved = resolveSuggestions(parsed, catLines, catBailleurs);
  if (resolved.length === 0) {
    return { ok: false, error: "L'IA n'a produit aucune suggestion exploitable (réessayer)." };
  }
  const lineLabelById = new Map(catLines.map((l) => [l.id, `${l.code} ${l.label}`]));
  return {
    ok: true,
    suggestions: resolved.map((r) => ({
      entry_id: r.entry_id,
      line_id: r.line_id,
      line_label: lineLabelById.get(r.line_id) ?? r.line_id,
      bailleur_id: r.bailleur_id,
      bailleur_code: r.bailleur_id ? bailleurCodeById.get(r.bailleur_id) ?? null : null,
      confidence: r.confidence,
    })),
  };
}
