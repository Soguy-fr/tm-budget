import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Bailleur } from "@/lib/types";
import { BailleurCreate } from "@/components/bailleurs/BailleurCreate";
import { GuideLink } from "@/components/GuideLink";

export const dynamic = "force-dynamic";

export default async function BailleursPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <h1 className="mb-2 text-xl font-bold text-brand-night">Bailleurs</h1>
        <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Supabase n&apos;est pas encore configuré.
        </p>
      </div>
    );
  }

  const supabase = createClient();
  const { data } = await supabase.from("bailleurs").select("*").order("code");
  const bailleurs = (data ?? []) as Bailleur[];

  return (
    <div className="max-w-2xl">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold text-brand-night">Bailleurs</h1>
        <GuideLink anchor="ajouter-un-bailleur" />
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Sources de financement. Chaque bailleur a sa nomenclature, son mapping
        vers les LB internes et ses recettes prévues.
      </p>

      <BailleurCreate />

      <div className="mt-4 space-y-2">
        {bailleurs.length === 0 && (
          <p className="text-sm text-slate-500">Aucun bailleur.</p>
        )}
        {bailleurs.map((b) => (
          <Link
            key={b.id}
            href={`/bailleurs/${b.id}`}
            className="flex items-center justify-between rounded border border-slate-200 bg-white p-3 hover:border-brand-emerald"
          >
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: b.color }} />
              <span className="font-medium text-brand-night">{b.code}</span>
              <span className="text-sm text-slate-500">{b.name}</span>
            </span>
            <span className="text-xs text-slate-400">
              {b.convention_start && b.convention_end
                ? `${b.convention_start} → ${b.convention_end}`
                : "—"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
