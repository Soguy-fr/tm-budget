import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { flattenForGrid, cellKey, totalKey } from "@/lib/budget-grid";
import type { StructureLine, Budget, Bailleur } from "@/lib/types";
import { InterneGrid } from "@/components/interne/InterneGrid";

export const dynamic = "force-dynamic";

export default async function InternePage() {
  if (!isSupabaseConfigured()) {
    return <Notice>Supabase n&apos;est pas encore configuré.</Notice>;
  }

  const supabase = createClient();

  const { data: budgetRow } = await supabase
    .from("budgets")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  const budget = budgetRow as Budget | null;

  if (!budget) {
    return (
      <Notice>
        Aucun budget actif. Activez un budget dans la section « Budgets ».
      </Notice>
    );
  }

  const [
    { data: lines },
    { data: years },
    { data: monthlyRows },
    { data: totalRows },
    { data: bailleurRows },
  ] = await Promise.all([
    supabase.from("structure_lines").select("*").eq("active", true).order("sort_order"),
    supabase.from("budget_years").select("year").eq("budget_id", budget.id),
    supabase
      .from("budget_monthly")
      .select("line_id, year, month, amount, bailleur_id")
      .eq("budget_id", budget.id),
    supabase
      .from("budget_line_totals")
      .select("line_id, year, total_input")
      .eq("budget_id", budget.id),
    supabase.from("bailleurs").select("*").order("code"),
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

  const yearList = (years ?? []).map((y) => y.year as number).sort((a, b) => a - b);

  return (
    <InterneGrid
      budgetId={budget.id}
      budgetName={budget.name}
      rows={flat}
      years={yearList}
      monthly={monthly}
      totals={totals}
      bailleurs={(bailleurRows ?? []) as Bailleur[]}
      bailleurByCell={bailleurByCell}
    />
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="mb-2 text-xl font-bold text-brand-night">Prévisionnel interne</h1>
      <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        {children}
      </p>
    </div>
  );
}
