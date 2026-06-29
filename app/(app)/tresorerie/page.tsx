import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Budget, FinancingStatus } from "@/lib/types";
import { TresorerieTable } from "@/components/tresorerie/TresorerieTable";
import { GuideLink } from "@/components/GuideLink";

// Couleur d'affichage d'un fonds selon son statut (signé/promis/espéré).
const STATUT_COLOR: Record<FinancingStatus, string> = {
  signe: "#0FA86B",
  promis: "#6ee7b7",
  espere: "#fbbf24",
};

export const dynamic = "force-dynamic";

export default async function TresoreriePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <h1 className="mb-2 text-xl font-bold text-brand-night">Trésorerie</h1>
        <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Supabase n&apos;est pas encore configuré.
        </p>
      </div>
    );
  }

  const supabase = createClient();
  const { data: budgetRow } = await supabase
    .from("budgets")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  if (!budgetRow) {
    return (
      <div>
        <h1 className="mb-2 text-xl font-bold text-brand-night">Trésorerie</h1>
        <p className="text-sm text-slate-500">Aucun budget actif. Activez un budget dans « Scénario ».</p>
      </div>
    );
  }
  const budget = budgetRow as Budget;

  const [{ data: yearRows }, { data: monthly }, { data: fins }, { data: finMonthly }] =
    await Promise.all([
      supabase.from("budget_years").select("year").eq("budget_id", budget.id),
      supabase.from("budget_monthly").select("year, month, amount").eq("budget_id", budget.id).range(0, 99999),
      supabase
        .from("scenario_financing")
        .select("id, name, statut")
        .eq("budget_id", budget.id)
        .order("sort_order"),
      supabase.from("scenario_financing_monthly").select("scenario_financing_id, year, month, amount"),
    ]);

  const years = (yearRows ?? []).map((y) => y.year as number).sort((a, b) => a - b);
  const yearList = years.length ? years : [new Date().getFullYear()];

  // Dépenses prévues totales par mois (BR-7.7).
  const depByMonth: Record<string, number> = {};
  for (const r of monthly ?? []) {
    const k = `${r.year}:${r.month}`;
    depByMonth[k] = (depByMonth[k] ?? 0) + Number(r.amount);
  }

  // BR-7.7 — versements (couche 2) par fonds du scénario actif.
  const recByFin: Record<string, Record<string, number>> = {};
  for (const r of finMonthly ?? []) {
    const id = r.scenario_financing_id as string;
    (recByFin[id] ??= {})[`${r.year}:${r.month}`] = Number(r.amount);
  }

  // Lignes du tableau : un fonds par ligne (couleur selon statut).
  const financements = (fins ?? []).map((f) => ({
    id: f.id as string,
    label: f.name as string,
    name: f.name as string,
    statut: f.statut as FinancingStatus,
    color: STATUT_COLOR[f.statut as FinancingStatus],
    recByCell: recByFin[f.id as string] ?? {},
  }));

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold text-brand-night">Trésorerie</h1>
        <GuideLink anchor="la-page-tresorerie-la-meme-chose-en-plus-lisible" />
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Scénario actif ({budget.name}) — versements par fonds, dépenses totales et solde chaîné,
        filtrables par statut (signé / promis / espéré).
      </p>
      <TresorerieTable
        budgetId={budget.id}
        calcDate={budget.calc_date}
        forcedBalance={budget.forced_balance != null ? Number(budget.forced_balance) : null}
        years={yearList}
        depByMonth={depByMonth}
        initialCash={Number(budget.initial_cash)}
        financements={financements}
      />
    </div>
  );
}
