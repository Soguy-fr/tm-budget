import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Budget } from "@/lib/types";
import { BudgetList } from "@/components/budgets/BudgetList";
import { PurgeZone } from "@/components/budgets/PurgeZone";
import { GuideLink } from "@/components/GuideLink";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
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
  const { data: budgets } = await supabase
    .from("budgets")
    .select("*")
    .eq("archived", false)
    .order("created_at");

  const { data: years } = await supabase.from("budget_years").select("budget_id, year");

  const yearsByBudget: Record<string, number[]> = {};
  for (const y of years ?? []) {
    (yearsByBudget[y.budget_id as string] ??= []).push(y.year as number);
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold text-brand-night">Scénarios</h1>
        <GuideLink anchor="travailler-un-nouveau-budget" />
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Créez, dupliquez et sélectionnez le budget actif. Un seul budget actif à
        la fois (F2.2).
      </p>
      <BudgetList
        budgets={(budgets ?? []) as Budget[]}
        yearsByBudget={yearsByBudget}
      />
      <PurgeZone />
    </div>
  );
}
