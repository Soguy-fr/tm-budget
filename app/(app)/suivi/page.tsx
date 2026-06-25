import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { indicators, aggregateByCategory } from "@/lib/suivi";
import { formatEur, formatEcart } from "@/lib/format";
import type { SuiviDepense, StructureLine } from "@/lib/types";
import { SuiviTabs } from "@/components/suivi/SuiviTabs";
import { CommentCell } from "@/components/suivi/CommentCell";
import { GuideLink } from "@/components/GuideLink";

export const dynamic = "force-dynamic";

export default async function SuiviPage() {
  if (!isSupabaseConfigured()) {
    return <Notice>Supabase n&apos;est pas encore configuré.</Notice>;
  }

  const supabase = createClient();
  const { data: budget } = await supabase
    .from("budgets")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();

  if (!budget) {
    return <Notice>Aucun budget actif. Activez un budget dans « Budgets ».</Notice>;
  }

  const { data: rows } = await supabase
    .from("v_suivi_depenses")
    .select("*")
    .eq("budget_id", budget.id);

  // BR-5.4 — structure complète (tous niveaux + commentaire) pour agréger vers niv.1/2.
  const { data: structure } = await supabase
    .from("structure_lines")
    .select("*")
    .eq("active", true);
  const lines = (structure ?? []) as StructureLine[];

  const all = (rows ?? []) as SuiviDepense[];
  const years = Array.from(new Set(all.map((r) => r.year))).sort((a, b) => a - b);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h1 className="text-xl font-bold text-brand-night">Dashboard</h1>
        <GuideLink anchor="suivre-les-depenses" />
      </div>
      <SuiviTabs />
      <p className="mb-4 text-sm text-slate-500">
        Prévu (budget interne) vs réalisé (Grand Livre, écritures allouées) par
        catégorie (niveaux 1 et 2) — {budget.name}.
      </p>

      {years.length === 0 && <p className="text-sm text-slate-500">Aucune donnée.</p>}

      {years.map((year) => {
        // BR-5.4 — agrège les feuilles de l'année vers les catégories niv.1/2.
        const leaf: Record<string, { prevu: number; realise: number }> = {};
        for (const r of all) {
          if (r.year === year) leaf[r.line_id] = { prevu: r.prevu, realise: r.realise };
        }
        const catRows = aggregateByCategory(lines, leaf);
        return (
          <div key={year} className="mb-4 overflow-hidden rounded border border-slate-200 bg-white">
            <div className="bg-slate-50 px-3 py-2 font-heading text-sm font-bold text-brand-night">
              {year}
            </div>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-1">Code</th>
                  <th className="px-2 py-1">Ligne</th>
                  <th className="px-2 py-1 text-right">Prévu</th>
                  <th className="px-2 py-1 text-right">Réalisé</th>
                  <th className="px-2 py-1 text-right">Écart</th>
                  <th className="px-2 py-1 text-right">% consommé</th>
                  <th className="px-2 py-1">Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {catRows.map((r) => {
                  const ind = indicators(r.prevu, r.realise);
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-slate-50 ${r.level === 1 ? "bg-slate-50/60 font-medium text-brand-night" : ""}`}
                    >
                      <td className="px-2 py-1 font-mono text-[11px] text-slate-400">{r.code}</td>
                      <td className="px-2 py-1" style={{ paddingLeft: r.level === 2 ? 20 : undefined }}>
                        {r.label}
                      </td>
                      <td className="px-2 py-1 text-right">{formatEur(r.prevu)}</td>
                      <td className={`px-2 py-1 text-right ${ind.depassement ? "font-medium text-alert" : ""}`}>
                        {formatEur(r.realise)}
                      </td>
                      <td className={`px-2 py-1 text-right ${ind.depassement ? "text-alert" : "text-slate-500"}`}>
                        {formatEcart(ind.ecart)}
                      </td>
                      <td className={`px-2 py-1 text-right ${ind.depassement ? "text-alert" : "text-slate-500"}`}>
                        {Math.round(ind.pctConso * 100)}%
                      </td>
                      <td className="px-2 py-1 align-top">
                        <CommentCell lineId={r.id} comment={r.comment} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="mb-2 text-xl font-bold text-brand-night">Suivi des dépenses</h1>
      <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        {children}
      </p>
    </div>
  );
}
