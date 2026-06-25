import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { aggregateByCategory, type LeafAmounts } from "@/lib/suivi";
import { isAllocated } from "@/lib/gl";
import type { StructureLine, Budget, GlEntry } from "@/lib/types";
import { SuiviTabs } from "@/components/suivi/SuiviTabs";
import { DepenseTable } from "@/components/suivi/DepenseTable";
import { GuideLink } from "@/components/GuideLink";

export const dynamic = "force-dynamic";

export default async function SuiviPage() {
  if (!isSupabaseConfigured()) {
    return <Notice>Supabase n&apos;est pas encore configuré.</Notice>;
  }

  const supabase = createClient();
  const { data: budgetRow } = await supabase
    .from("budgets")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (!budgetRow) {
    return <Notice>Aucun budget actif. Activez un budget dans « Scénario ».</Notice>;
  }
  const budget = budgetRow as Budget;

  const [{ data: structure }, { data: yearRows }, { data: monthly }, { data: gl }] =
    await Promise.all([
      supabase.from("structure_lines").select("*").eq("active", true),
      supabase.from("budget_years").select("year").eq("budget_id", budget.id),
      supabase.from("budget_monthly").select("line_id, year, month, amount").eq("budget_id", budget.id).range(0, 99999),
      supabase.from("gl_entries").select("*").eq("entry_type", "Dépense").eq("archived", false).range(0, 99999),
    ]);

  const lines = (structure ?? []) as StructureLine[];
  const years = (yearRows ?? []).map((y) => y.year as number).sort((a, b) => a - b);

  // BR-5.5 — date de référence : calc_date du budget, sinon aujourd'hui.
  const today = new Date();
  const refYear = budget.calc_date ? Number(budget.calc_date.slice(0, 4)) : today.getFullYear();
  const refMonth = budget.calc_date ? Number(budget.calc_date.slice(5, 7)) : today.getMonth() + 1;
  const mFor = (year: number) => (year < refYear ? 12 : year > refYear ? 0 : refMonth);

  // Prévu (budget_monthly) annuel + cumulé à date, par (LB × année).
  const prevu: Record<string, number> = {};
  const prevuTD: Record<string, number> = {};
  for (const r of monthly ?? []) {
    const k = `${r.line_id}:${r.year}`;
    const a = Number(r.amount);
    prevu[k] = (prevu[k] ?? 0) + a;
    if (r.month <= mFor(r.year)) prevuTD[k] = (prevuTD[k] ?? 0) + a;
  }

  // Réalisé (GL dépenses allouées, BR-5.1) annuel + cumulé à date, par (LB × année).
  const realise: Record<string, number> = {};
  const realiseTD: Record<string, number> = {};
  for (const e of (gl ?? []) as GlEntry[]) {
    if (!e.line_id || !isAllocated(e)) continue;
    const y = Number(e.entry_date.slice(0, 4));
    const mo = Number(e.entry_date.slice(5, 7));
    const k = `${e.line_id}:${y}`;
    const a = Number(e.amount);
    realise[k] = (realise[k] ?? 0) + a;
    if (mo <= mFor(y)) realiseTD[k] = (realiseTD[k] ?? 0) + a;
  }

  const leafLines = lines.filter((l) => l.level === 3);
  const data = years.map((year) => {
    const leaf: Record<string, LeafAmounts> = {};
    for (const l of leafLines) {
      const k = `${l.id}:${year}`;
      leaf[l.id] = {
        prevu: prevu[k] ?? 0,
        realise: realise[k] ?? 0,
        prevuToDate: prevuTD[k] ?? 0,
        realiseToDate: realiseTD[k] ?? 0,
      };
    }
    return { year, rows: aggregateByCategory(lines, leaf) };
  });

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h1 className="text-xl font-bold text-brand-night">Dashboard</h1>
        <GuideLink anchor="suivre-les-depenses" />
      </div>
      <SuiviTabs />
      <p className="mb-4 text-sm text-slate-500">
        Prévu vs réalisé par catégorie (niveaux 1 et 2) — {budget.name}. Vitesse calculée
        au {refMonth.toString().padStart(2, "0")}/{refYear}
        {budget.calc_date ? " (date du jour, Trésorerie)" : " (aujourd'hui)"}.
      </p>

      {data.length === 0 && <p className="text-sm text-slate-500">Aucune donnée.</p>}
      {data.map(({ year, rows }) => (
        <DepenseTable key={year} year={year} rows={rows} />
      ))}
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
