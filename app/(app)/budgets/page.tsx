import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { flattenForGrid, cellKey, totalKey } from "@/lib/budget-grid";
import type { StructureLine, Budget, Bailleur } from "@/lib/types";
import { BudgetList } from "@/components/budgets/BudgetList";
import { ScenarioSelect } from "@/components/budgets/ScenarioSelect";
import { CoveragePanel, type PlanFinancingRow } from "@/components/budgets/CoveragePanel";
import { ScenarioMeta } from "@/components/budgets/ScenarioMeta";
import { InterneGrid } from "@/components/interne/InterneGrid";
import { computePlanCoverage, type PlanYearCoverage, type PlanFinancing } from "@/lib/coverage";
import type { FinancingStatus } from "@/lib/types";
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

// F2.9 / BR-12.2 — couverture par scénario (par année, empilée) pour l'onglet Liste.
async function coverageByBudget(
  supabase: ReturnType<typeof createClient>,
  budgets: Budget[],
  yearsByBudget: Record<string, number[]>,
): Promise<Record<string, PlanYearCoverage[]>> {
  const [{ data: bm }, { data: fin }, { data: finY }] = await Promise.all([
    supabase.from("budget_monthly").select("budget_id, year, amount").range(0, 99999),
    supabase.from("scenario_financing").select("id, budget_id, statut"),
    supabase.from("scenario_financing_yearly").select("scenario_financing_id, year, amount"),
  ]);
  // fonds → (budget, statut)
  const finMeta = new Map<string, { budget: string; statut: FinancingStatus }>();
  for (const f of fin ?? [])
    finMeta.set(f.id as string, { budget: f.budget_id as string, statut: f.statut as FinancingStatus });

  // dépenses par budget × année
  const depByBudget: Record<string, Record<number, number>> = {};
  for (const r of bm ?? []) {
    const b = r.budget_id as string;
    (depByBudget[b] ??= {});
    depByBudget[b][r.year as number] = (depByBudget[b][r.year as number] ?? 0) + Number(r.amount);
  }
  // plan (couche 1) par budget : un PlanFinancing par fonds
  const planByBudget: Record<string, Record<string, PlanFinancing>> = {};
  for (const f of fin ?? []) {
    const b = f.budget_id as string;
    (planByBudget[b] ??= {})[f.id as string] = { statut: f.statut as FinancingStatus, yearly: {} };
  }
  for (const r of finY ?? []) {
    const meta = finMeta.get(r.scenario_financing_id as string);
    if (!meta) continue;
    const pf = planByBudget[meta.budget]?.[r.scenario_financing_id as string];
    if (pf) pf.yearly[r.year as number] = Number(r.amount);
  }

  const out: Record<string, PlanYearCoverage[]> = {};
  for (const bdg of budgets) {
    const years = yearsByBudget[bdg.id] ?? [];
    if (years.length === 0) {
      out[bdg.id] = [];
      continue;
    }
    out[bdg.id] = computePlanCoverage(
      years,
      depByBudget[bdg.id] ?? {},
      Object.values(planByBudget[bdg.id] ?? {}),
    );
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
    { data: finYearlyRows },
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
      .select("id, name, statut, amount_total, eligib_start, eligib_end, converted_bailleur_id")
      .eq("budget_id", selected.id)
      .order("sort_order"),
    supabase
      .from("scenario_financing_monthly")
      .select("scenario_financing_id, year, month, amount"),
    supabase
      .from("scenario_financing_yearly")
      .select("scenario_financing_id, year, amount"),
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

  // BR-12 — dépenses du scénario par année (Σ budget_monthly toutes LB).
  const depByYear: Record<number, number> = {};
  for (const r of monthlyRows ?? []) {
    depByYear[r.year as number] = (depByYear[r.year as number] ?? 0) + Number(r.amount);
  }
  // Plan de financement : couche 1 (annuelle) + couche 2 (mensuelle) par fonds.
  const finYearsById: Record<string, Record<number, number>> = {};
  for (const r of finYearlyRows ?? []) {
    const id = r.scenario_financing_id as string;
    (finYearsById[id] ??= {})[r.year as number] = Number(r.amount);
  }
  const finMonthsById: Record<string, Record<string, number>> = {};
  for (const r of finMonthlyRows ?? []) {
    const id = r.scenario_financing_id as string;
    (finMonthsById[id] ??= {})[`${r.year}:${r.month}`] = Number(r.amount);
  }
  const planFinancings: PlanFinancingRow[] = (finRows ?? []).map((f) => ({
    id: f.id as string,
    name: f.name as string,
    statut: f.statut as FinancingStatus,
    amountTotal: Number(f.amount_total),
    eligibStart: (f.eligib_start as string | null) ?? null,
    eligibEnd: (f.eligib_end as string | null) ?? null,
    converted: f.converted_bailleur_id != null,
    yearly: finYearsById[f.id as string] ?? {},
    months: finMonthsById[f.id as string] ?? {},
  }));

  const role = await getRole(supabase);
  const canEdit = can(role, "edit_budget");

  return (
    <div>
      <ScenarioSelect budgets={budgets} selectedId={selected.id} />
      <ScenarioMeta
        budgetId={selected.id}
        name={selected.name}
        description={selected.description}
        canEdit={canEdit}
      />
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
        years={yearList}
        depByYear={depByYear}
        financings={planFinancings}
        canEdit={canEdit}
      />
    </div>
  );
}
