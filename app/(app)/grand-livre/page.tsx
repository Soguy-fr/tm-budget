import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { StructureLine, Bailleur, GlEntry } from "@/lib/types";
import { GlTable } from "@/components/grand-livre/GlTable";

export const dynamic = "force-dynamic";

export default async function GrandLivrePage() {
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

  const [{ data: entries }, { data: lines }, { data: bailleurs }, planRes] = await Promise.all([
    supabase.from("gl_entries").select("*").order("entry_date", { ascending: false }),
    supabase
      .from("structure_lines")
      .select("*")
      .eq("level", 3)
      .eq("active", true)
      .order("sort_order"),
    supabase.from("bailleurs").select("*").order("code"),
    budget
      ? supabase
          .from("budget_monthly")
          .select("line_id, year, month, bailleur_id")
          .eq("budget_id", budget.id)
      : Promise.resolve({ data: [] as { line_id: string; year: number; month: number; bailleur_id: string | null }[] }),
  ]);

  // BR-2.4 — plan d'assignation pour pré-remplir le bailleur : clé LB:année:mois.
  const planByCell: Record<string, string> = {};
  for (const p of planRes.data ?? []) {
    if (p.bailleur_id) {
      planByCell[`${p.line_id}:${p.year}:${p.month}`] = p.bailleur_id as string;
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-brand-night">Grand Livre</h1>
      <p className="mb-4 text-sm text-slate-500">
        Importez le grand livre (CSV), allouez chaque écriture à une LB et un
        bailleur. Le réalisé en découle (P1, P5).
      </p>
      <GlTable
        entries={(entries ?? []) as GlEntry[]}
        lines={(lines ?? []) as StructureLine[]}
        bailleurs={(bailleurs ?? []) as Bailleur[]}
        planByCell={planByCell}
      />
    </div>
  );
}
