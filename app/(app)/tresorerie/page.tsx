import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { treasuryForecast } from "@/lib/treasury";
import type { Bailleur, Budget } from "@/lib/types";
import { TresorerieTable } from "@/components/tresorerie/TresorerieTable";
import { GuideLink } from "@/components/GuideLink";

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

  const [{ data: yearRows }, { data: monthly }, { data: income }, { data: bailleurs }] =
    await Promise.all([
      supabase.from("budget_years").select("year").eq("budget_id", budget.id),
      supabase.from("budget_monthly").select("year, month, amount").eq("budget_id", budget.id).range(0, 99999),
      supabase.from("bailleur_income_monthly").select("bailleur_id, year, month, amount"),
      supabase.from("bailleurs").select("*").order("code"),
    ]);

  const years = (yearRows ?? []).map((y) => y.year as number).sort((a, b) => a - b);
  const yearList = years.length ? years : [new Date().getFullYear()];

  // Dépenses prévues totales par mois (BR-7.2).
  const depByMonth: Record<string, number> = {};
  for (const r of monthly ?? []) {
    const k = `${r.year}:${r.month}`;
    depByMonth[k] = (depByMonth[k] ?? 0) + Number(r.amount);
  }

  // Recettes prévues totales + par financement (BR-3.3).
  const recByMonth: Record<string, number> = {};
  const recByFin: Record<string, Record<string, number>> = {};
  for (const r of income ?? []) {
    const k = `${r.year}:${r.month}`;
    const v = Number(r.amount);
    recByMonth[k] = (recByMonth[k] ?? 0) + v;
    (recByFin[r.bailleur_id as string] ??= {})[k] = (recByFin[r.bailleur_id as string]?.[k] ?? 0) + v;
  }

  const calc = budget.calc_date
    ? { year: Number(budget.calc_date.slice(0, 4)), month: Number(budget.calc_date.slice(5, 7)) }
    : null;

  const cells = treasuryForecast({
    years: yearList,
    recByMonth,
    depByMonth,
    initialCash: Number(budget.initial_cash),
    calc,
    forcedBalance: budget.forced_balance != null ? Number(budget.forced_balance) : null,
  });

  // Financements ayant au moins une recette prévue (lignes du tableau).
  const allBailleurs = (bailleurs ?? []) as Bailleur[];
  const financements = allBailleurs
    .filter((b) => recByFin[b.id])
    .map((b) => ({
      id: b.id,
      label: b.reference || b.code,
      name: b.name,
      color: b.color,
      recByCell: recByFin[b.id] ?? {},
    }));

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold text-brand-night">Trésorerie</h1>
        <GuideLink anchor="la-tresorerie-eviter-la-panne-seche" />
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Synthèse budgétée — recettes prévues par financement, dépenses totales et solde
        chaîné ({budget.name}). Mêmes montants que la ligne solde de Suivi interne.
      </p>
      <TresorerieTable
        budgetId={budget.id}
        calcDate={budget.calc_date}
        forcedBalance={budget.forced_balance != null ? Number(budget.forced_balance) : null}
        cells={cells}
        financements={financements}
      />
    </div>
  );
}
