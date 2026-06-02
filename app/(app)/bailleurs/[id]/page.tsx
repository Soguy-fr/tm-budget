import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Bailleur, BailleurLine, StructureLine } from "@/lib/types";
import { BailleurDetail } from "@/components/bailleurs/BailleurDetail";

export const dynamic = "force-dynamic";

export default async function BailleurPage({ params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) {
    return <p className="text-sm text-amber-800">Supabase non configuré.</p>;
  }
  const supabase = createClient();

  const { data: bailleur } = await supabase
    .from("bailleurs")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!bailleur) {
    return (
      <div>
        <Link href="/bailleurs" className="text-sm text-brand-emerald">
          ← Bailleurs
        </Link>
        <p className="mt-2 text-sm text-slate-500">Bailleur introuvable.</p>
      </div>
    );
  }

  const { data: budget } = await supabase
    .from("budgets")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  const [{ data: lines }, { data: mapping }, { data: structure }, { data: income }, planRes, yearRes] =
    await Promise.all([
      supabase.from("bailleur_lines").select("*").eq("bailleur_id", params.id).order("sort_order"),
      supabase.from("bailleur_line_mapping").select("bailleur_line_id, line_id"),
      supabase
        .from("structure_lines")
        .select("*")
        .eq("level", 3)
        .eq("active", true)
        .order("sort_order"),
      supabase
        .from("bailleur_income_monthly")
        .select("year, month, amount")
        .eq("bailleur_id", params.id),
      budget
        ? supabase
            .from("budget_monthly")
            .select("line_id, amount, bailleur_id")
            .eq("budget_id", budget.id)
        : Promise.resolve({ data: [] as { line_id: string; amount: number; bailleur_id: string | null }[] }),
      budget
        ? supabase.from("budget_years").select("year").eq("budget_id", budget.id)
        : Promise.resolve({ data: [] as { year: number }[] }),
    ]);

  // mapping bailleur_line_id → line_ids[] (limité à ce bailleur)
  const lineIds = new Set((lines ?? []).map((l) => l.id as string));
  const mappingByLine: Record<string, string[]> = {};
  for (const m of mapping ?? []) {
    if (lineIds.has(m.bailleur_line_id as string)) {
      (mappingByLine[m.bailleur_line_id as string] ??= []).push(m.line_id as string);
    }
  }

  const income2: Record<string, number> = {};
  for (const r of income ?? []) {
    income2[`${r.year}:${r.month}`] = Number(r.amount);
  }

  const years = (yearRes.data ?? []).map((y) => y.year as number).sort((a, b) => a - b);
  const yearList = years.length ? years : [new Date().getFullYear()];

  return (
    <div>
      <Link href="/bailleurs" className="text-sm text-brand-emerald">
        ← Bailleurs
      </Link>
      <BailleurDetail
        bailleur={bailleur as Bailleur}
        lines={(lines ?? []) as BailleurLine[]}
        mappingByLine={mappingByLine}
        structure={(structure ?? []) as StructureLine[]}
        planMonthly={(planRes.data ?? []) as { line_id: string; amount: number; bailleur_id: string | null }[]}
        income={income2}
        years={yearList}
      />
    </div>
  );
}
