import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { buildTree } from "@/lib/structure";
import type { StructureLine } from "@/lib/types";
import { StructureTree } from "@/components/structure/StructureTree";
import { GuideLink } from "@/components/GuideLink";

export const dynamic = "force-dynamic";

export default async function StructurePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <h1 className="mb-2 text-xl font-bold text-brand-night">Configuration</h1>
        <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Supabase n&apos;est pas encore configuré. Renseignez{" "}
          <code>.env.local</code> puis appliquez les migrations et le seed.
        </p>
      </div>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("structure_lines")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  const tree = buildTree((data ?? []) as StructureLine[]);

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold text-brand-night">Configuration</h1>
        <GuideLink anchor="la-structure-budgetaire" />
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Structure budgétaire unique, partagée par tous les budgets (P2). Seul le
        niveau 3 porte des montants.
      </p>
      <StructureTree tree={tree} />
    </div>
  );
}
