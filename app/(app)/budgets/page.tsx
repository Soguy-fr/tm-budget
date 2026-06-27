import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { flattenForGrid, cellKey, totalKey } from "@/lib/budget-grid";
import type { StructureLine, Budget, Bailleur } from "@/lib/types";
import { BudgetList } from "@/components/budgets/BudgetList";
import { ScenarioSelect } from "@/components/budgets/ScenarioSelect";
import { CoveragePanel, type CoverageFinancing } from "@/components/budgets/CoveragePanel";
import { InterneGrid } from "@/components/interne/InterneGrid";
import { computeCoverage, type CoverageYearSummary } from "@/lib/coverage";
import { GuideLink } from "@/components/GuideLink";
import { getRole } from "@/lib/auth/role";
import { can } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: { tab?: string; budget?: string };
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <h1 className="mb-2 text-xl font-bold text-brand-night">Scénarios</h1>
        <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Supabase n&apos;est pas encore configuré.
        </p>
      </div>
    );
  }

  const supabase = createClient();
  const { data: budgetsRaw } = await supabase
    .from("budgets")
    .select("*")
    .eq("archived", false)
    .order("created_at");
  const budgets = (budgetsRaw ?? []) as Budget[];

  const { data: years } = await supabase.from("budget_years").select("budget_id, year");
  const yearsByBudget: Record<string, number[]> = {};
  for (const y of years ?? []) {
    (yearsByBudget[y.budget_id as string] ??= []).push(y.year as number);
  }

  const tab = searchParams.tab === "edition" ? "edition" : "liste";

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold text-brand-night">Scénarios</h1>
        <GuideLink anchor="travailler-un-nouveau-budget" />
      </div>

      {/* Onglets Liste / Édition (F2.6) */}
      <div className="mb-4 flex gap-1 border-b border-slate-200 text-sm">
        <Link
          href="/budgets?tab=liste"
          className={`-mb-px border-b-2 px-3 py-1.5 ${
            tab === "liste" ? "border-brand-night font-medium text-brand-night" : "border-transparent text-slate-500"
          }`}
        >
          Liste
        </Link>
        <Link
          href="/budgets?tab=edition"
          className={`-mb-px border-b-2 px-3 py-1.5 ${
            tab === "edition" ? "border-brand-night font-medium text-brand-night" : "border-transparent text-slate-500"
          }`}
        >
          Édition
        </Link>
      </div>

      {tab === "liste" ? (
        <>
          <p className="mb-4 text-sm text-slate-500">
            Créez, dupliquez et activez un scénario. Un seul actif à la fois (F2.2) ;
            l&apos;activation est réservée à la direction (P10).
          </p>
          <BudgetList
            budgets={budgets}
            yearsByBudget={yearsByBudget}
            coverageByBudget={await coverageByBudget(supabase, budgets, yearsByBudget)}
          />
        </>
      ) : (
        <EditionTab supabase={supabase} budgets={budgets} selectedId={searchParams.budget} />
      )}
    </div>
  );
}

// F2.9 — couverture par scénario (résumé par année) pour l'onglet Liste.
async function coverageByBudget(
  supabase: ReturnType<typeof createClient>,
  budgets: Budget[],
  yearsByBudget: Record<string, number[]>,
): Promise<Record<string, CoverageYearSummary[]>> {
  const [{ data: bm }, { data: fin }, { data: finM }] = await Promise.all([
    supabase.from("budget_monthly").select("budget_id, year, month, amount").range(0, 99999),
    supabase.from("scenario_financing").select("id, budget_id"),
    supabase.from("scenario_financing_monthly").select("scenario_financing_id, year, month, amount"),
  ]);
  const finToBudget = new Map<string, string>();
  for (const f of fin ?? []) finToBudget.set(f.id as string, f.budget_id as string);

  const depByBudget: Record<string, Record<string, number>> = {};
  for (const r of bm ?? []) {
    const b = r.budget_id as string;
    (depByBudget[b] ??= {});
    const k = `${r.year}:${r.month}`;
    depByBudget[b][k] = (depByBudget[b][k] ?? 0) + Number(r.amount);
  }
  const recByBudget: Record<string, Record<string, number>> = {};
  for (const r of finM ?? []) {
    const b = finToBudget.get(r.scenario_financing_id as string);
    if (!b) continue;
    (recByBudget[b] ??= {});
    const k = `${r.year}:${r.month}`;
    recByBudget[b][k] = (recByBudget[b][k] ?? 0) + Number(r.amount);
  }

  const out: Record<string, CoverageYearSummary[]> = {};
  for (const bdg of budgets) {
    const years = yearsByBudget[bdg.id] ?? [];
    if (years.length === 0) {
      out[bdg.id] = [];
      continue;
    }
    out[bdg.id] = computeCoverage(
      Number(bdg.coverage_baseline),
      years,
      recByBudget[bdg.id] ?? {},
      depByBudget[bdg.id] ?? {},
    ).summary;
  }
  return out;
}

// F2.6 — onglet Édition : tableur du scénario sélectionné (sans tréso ni suivi).
async function EditionTab({
  supabase,
  budgets,
  selectedId,
}: {
  supabase: ReturnType<typeof createClient>;
  budgets: Budget[];
  selectedId?: string;
}) {
  if (budgets.length === 0) {
    return <p className="text-sm text-slate-500">Aucun scénario. Créez-en un dans l&apos;onglet Liste.</p>;
  }

  const selected =
    budgets.find((b) => b.id === selectedId) ??
    budgets.find((b) => b.is_active) ??
    budgets[0];

  const [
    { data: lines },
    { data: yearRows },
    { data: monthlyRows },
    { data: totalRows },
    { data: bailleurRows },
    { data: finRows },
    { data: finMonthlyRows },
  ] = await Promise.all([
    supabase.from("structure_lines").select("*").eq("active", true).order("sort_order"),
    supabase.from("budget_years").select("year").eq("budget_id", selected.id),
    supabase
      .from("budget_monthly")
      .select("line_id, year, month, amount, bailleur_id")
      .eq("budget_id", selected.id)
      .range(0, 99999),
    supabase
      .from("budget_line_totals")
      .select("line_id, year, total_input")
      .eq("budget_id", selected.id),
    supabase.from("bailleurs").select("*").order("code"),
    supabase
      .from("scenario_financing")
      .select("id, name, amount_total, converted_bailleur_id")
      .eq("budget_id", selected.id)
      .order("sort_order"),
    supabase
      .from("scenario_financing_monthly")
      .select("scenario_financing_id, year, month, amount"),
  ]);

  const flat = flattenForGrid((lines ?? []) as StructureLine[]);
  const monthly: Record<string, number> = {};
  const bailleurByCell: Record<string, string | null> = {};
  for (const r of monthlyRows ?? []) {
    const k = cellKey(r.line_id as string, r.year as number, r.month as number);
    monthly[k] = Number(r.amount);
    bailleurByCell[k] = (r.bailleur_id as string | null) ?? null;
  }
  const totals: Record<string, number> = {};
  for (const r of totalRows ?? []) {
    if (r.total_input != null) {
      totals[totalKey(r.line_id as string, r.year as number)] = Number(r.total_input);
    }
  }
  const yearList = (yearRows ?? []).map((y) => y.year as number).sort((a, b) => a - b);

  // BR-12 — dépenses du scénario par année:mois (Σ budget_monthly toutes LB).
  const depByYM: Record<string, number> = {};
  for (const r of monthlyRows ?? []) {
    const k = `${r.year}:${r.month}`;
    depByYM[k] = (depByYM[k] ?? 0) + Number(r.amount);
  }
  // Financements prévisionnels + leur répartition mensuelle.
  const finMonthsById: Record<string, Record<string, number>> = {};
  for (const r of finMonthlyRows ?? []) {
    const id = r.scenario_financing_id as string;
    (finMonthsById[id] ??= {})[`${r.year}:${r.month}`] = Number(r.amount);
  }
  const coverageFinancings: CoverageFinancing[] = (finRows ?? []).map((f) => ({
    id: f.id as string,
    name: f.name as string,
    amount_total: Number(f.amount_total),
    converted: f.converted_bailleur_id != null,
    months: finMonthsById[f.id as string] ?? {},
  }));

  const role = await getRole(supabase);
  const canEdit = can(role, "edit_budget");

  return (
    <div>
      <ScenarioSelect budgets={budgets} selectedId={selected.id} />
      <p className="mb-3 text-xs text-slate-400">
        Brouillon : le total des lignes est modifiable ici. Sur le scénario actif
        (Suivi interne) il est verrouillé (BR-1.4).
      </p>
      <InterneGrid
        budgetId={selected.id}
        budgetName={selected.name}
        rows={flat}
        years={yearList}
        monthly={monthly}
        totals={totals}
        bailleurs={(bailleurRows ?? []) as Bailleur[]}
        bailleurByCell={bailleurByCell}
        realise={{}}
        initialCash={Number(selected.initial_cash)}
        incomePrevu={{}}
        recReel={{}}
        depReel={{}}
        closures={[]}
        isDraft
        allowTreso={false}
        allowSuivi={false}
        canEdit={canEdit}
      />
      <CoveragePanel
        budgetId={selected.id}
        isActive={selected.is_active}
        baseline={Number(selected.coverage_baseline)}
        years={yearList}
        depByYM={depByYM}
        financings={coverageFinancings}
        canEdit={canEdit}
      />
    </div>
  );
}
