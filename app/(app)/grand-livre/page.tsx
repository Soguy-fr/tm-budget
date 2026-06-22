import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getRole } from "@/lib/auth/role";
import { can } from "@/lib/roles";
import { checkEntryEligibility } from "@/lib/eligibility";
import { scoreAnomalies } from "@/lib/anomalies";
import type { StructureLine, Bailleur, GlEntry } from "@/lib/types";
import { GlTable } from "@/components/grand-livre/GlTable";
import { GuideLink } from "@/components/GuideLink";

export const dynamic = "force-dynamic";

export default async function GrandLivrePage({
  searchParams,
}: {
  searchParams: { line?: string; year?: string; month?: string; from?: string };
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <h1 className="mb-2 text-xl font-bold text-brand-night">Grand Livre</h1>
        <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Supabase n&apos;est pas encore configuré.
        </p>
      </div>
    );
  }

  const supabase = createClient();

  const { data: budget } = await supabase
    .from("budgets")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  const role = await getRole(supabase);

  const [{ data: entries }, { data: lines }, { data: bailleurs }, planRes, { data: mappingRows }] = await Promise.all([
    // Perf : limiter l'affichage aux 2000 écritures les plus récentes (hors archivées, BR-10.2).
    supabase.from("gl_entries").select("*").eq("archived", false)
      .order("entry_date", { ascending: false }).range(0, 1999),
    supabase
      .from("structure_lines")
      .select("*")
      .eq("level", 3)
      .eq("active", true),
    supabase.from("bailleurs").select("*").order("code"),
    budget
      ? supabase
          .from("budget_monthly")
          .select("line_id, year, month, amount, bailleur_id")
          .eq("budget_id", budget.id)
          .range(0, 99999)
      : Promise.resolve({ data: [] as { line_id: string; year: number; month: number; amount: number; bailleur_id: string | null }[] }),
    // C2 — mapping LB ↔ bailleur (liste blanche d'éligibilité).
    supabase.from("bailleur_line_mapping").select("bailleur_line_id, line_id, bailleur_lines(bailleur_id)"),
  ]);

  // BR-2.4 — plan d'assignation pour pré-remplir le bailleur : clé LB:année:mois.
  // + montant planifié par maille (F5.11).
  const planByCell: Record<string, string> = {};
  const planAmountByCell: Record<string, number> = {};
  for (const p of planRes.data ?? []) {
    const k = `${p.line_id}:${p.year}:${p.month}`;
    if (p.bailleur_id) planByCell[k] = p.bailleur_id as string;
    planAmountByCell[k] = (planAmountByCell[k] ?? 0) + Number(p.amount);
  }

  // F5.10 — tri naturel des LB par code (1.1.2 avant 1.1.10), ordre de la structure.
  const sortedLines = ((lines ?? []) as StructureLine[]).sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true }),
  );
  // F1.7 — commentaire par LB (bulle au survol de la colonne LB).
  const commentByLine: Record<string, string> = {};
  for (const l of sortedLines) {
    if (l.comment) commentByLine[l.id] = l.comment;
  }

  // C2 — LB mappées par bailleur (liste blanche).
  const allEntries = (entries ?? []) as GlEntry[];
  const allBailleurs = (bailleurs ?? []) as Bailleur[];
  const mappedByBailleur = new Map<string, Set<string>>();
  type MappingRow = {
    line_id: string;
    bailleur_lines: { bailleur_id: string } | Array<{ bailleur_id: string }> | null;
  };
  for (const m of (mappingRows ?? []) as unknown as MappingRow[]) {
    const bl = m.bailleur_lines;
    const bid = Array.isArray(bl) ? bl[0]?.bailleur_id : bl?.bailleur_id;
    if (!bid) continue;
    const set = mappedByBailleur.get(bid) ?? new Set<string>();
    set.add(m.line_id);
    mappedByBailleur.set(bid, set);
  }
  const bailleurById = new Map(allBailleurs.map((b) => [b.id, b]));

  // C3 — historique des montants par LB (pour le z-score).
  const historyByLine = new Map<string, number[]>();
  for (const e of allEntries) {
    if (e.entry_type !== "Dépense" || !e.line_id) continue;
    const arr = historyByLine.get(e.line_id) ?? [];
    arr.push(Number(e.amount));
    historyByLine.set(e.line_id, arr);
  }

  // C2 + C3 — avertissements par écriture (calcul serveur, affichage ⚠ dans la table).
  const warningsByEntry: Record<string, string[]> = {};
  for (const e of allEntries) {
    const warnings: string[] = [];
    const bailleur = e.bailleur_id ? bailleurById.get(e.bailleur_id) ?? null : null;
    warnings.push(
      ...checkEntryEligibility(
        e,
        bailleur
          ? {
              code: bailleur.code,
              convention_start: bailleur.convention_start,
              convention_end: bailleur.convention_end,
              montant_conventionne: bailleur.montant_conventionne != null ? Number(bailleur.montant_conventionne) : null,
            }
          : null,
        e.bailleur_id ? mappedByBailleur.get(e.bailleur_id) ?? null : null,
      ).map((w) => w.message),
    );
    if (e.entry_type === "Dépense" && e.line_id) {
      // Historique = autres écritures de la LB (exclure l'écriture elle-même une
      // fois, sinon elle lisse son propre z-score).
      const history = historyByLine.get(e.line_id) ?? [];
      const idx = history.indexOf(Number(e.amount));
      const others = idx === -1 ? history : [...history.slice(0, idx), ...history.slice(idx + 1)];
      warnings.push(...scoreAnomalies({ entry_date: e.entry_date, amount: Number(e.amount) }, others).map((f) => f.message));
    }
    if (warnings.length > 0) warningsByEntry[e.id] = warnings;
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold text-brand-night">Grand Livre</h1>
        <GuideLink anchor="le-grand-livre-la-realite-entre-dans-l-appli" />
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Importez le grand livre (CSV), allouez chaque écriture à une LB et un
        bailleur. Le réalisé en découle (P1, P5).
      </p>
      <GlTable
        entries={allEntries}
        lines={sortedLines}
        bailleurs={allBailleurs}
        planByCell={planByCell}
        planAmountByCell={planAmountByCell}
        commentByLine={commentByLine}
        warningsByEntry={warningsByEntry}
        canConfirm={can(role, "confirm_allocation")}
        initialFilters={{
          line: searchParams.line,
          year: searchParams.year,
          month: searchParams.month,
          fromInterne: searchParams.from === "interne",
        }}
      />
    </div>
  );
}
