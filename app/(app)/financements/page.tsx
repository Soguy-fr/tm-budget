import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isActiveOn } from "@/lib/financement";
import type { Bailleur, Funder } from "@/lib/types";
import { BailleurCreate } from "@/components/bailleurs/BailleurCreate";
import { GuideLink } from "@/components/GuideLink";

export const dynamic = "force-dynamic";

export default async function BailleursPage({
  searchParams,
}: {
  searchParams: { statut?: string };
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <h1 className="mb-2 text-xl font-bold text-brand-night">Financement</h1>
        <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Supabase n&apos;est pas encore configuré.
        </p>
      </div>
    );
  }

  const supabase = createClient();
  const [{ data }, { data: fundersData }] = await Promise.all([
    supabase.from("bailleurs").select("*").order("code"),
    supabase.from("funders").select("*").order("name"),
  ]);
  const funders = (fundersData ?? []) as Funder[];
  const funderName = new Map(funders.map((f) => [f.id, f.name]));

  // F4.13 — statut actif/inactif (date du jour) + tri par date de début d'éligibilité.
  const today = new Date().toISOString().slice(0, 10);
  const statut = searchParams.statut === "actif" || searchParams.statut === "inactif"
    ? searchParams.statut
    : null;
  const all = (data ?? []) as Bailleur[];
  const withActive = all.map((b) => ({ b, actif: isActiveOn(b.convention_start, b.convention_end, today) }));
  const bailleurs = withActive
    .filter((x) => (statut === "actif" ? x.actif : statut === "inactif" ? !x.actif : true))
    .sort((a, z) => (a.b.convention_start ?? "9999").localeCompare(z.b.convention_start ?? "9999"));

  const filterLink = (s: string | null) =>
    `border px-2 py-0.5 rounded ${statut === s ? "border-brand-olive bg-brand-lime/20 text-brand-brown" : "border-slate-200 text-slate-500"}`;

  return (
    <div className="max-w-2xl">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold text-brand-night">Financement</h1>
        <GuideLink anchor="ajouter-un-financement" />
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Fonds accordés par les bailleurs. Chaque financement a sa nomenclature, son
        mapping vers les LB internes, sa fenêtre d&apos;éligibilité et ses recettes prévues.
      </p>

      <BailleurCreate />

      {/* F4.13 — filtre statut (tri par date de début d'éligibilité) */}
      <div className="mt-4 flex items-center gap-1 text-xs">
        <span className="text-slate-500">Statut :</span>
        <Link href="/financements" className={filterLink(null)}>Tous</Link>
        <Link href="/financements?statut=actif" className={filterLink("actif")}>Actifs</Link>
        <Link href="/financements?statut=inactif" className={filterLink("inactif")}>Inactifs</Link>
        <span className="ml-2 text-slate-400">triés par date de début</span>
      </div>

      <div className="mt-2 space-y-2">
        {bailleurs.length === 0 && (
          <p className="text-sm text-slate-500">Aucun financement.</p>
        )}
        {bailleurs.map(({ b, actif }) => (
          <Link
            key={b.id}
            href={`/financements/${b.id}`}
            className="flex items-center justify-between rounded border border-slate-200 bg-white p-3 hover:border-brand-emerald"
          >
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: b.color }} />
              <span className="font-medium text-brand-night">{b.reference || b.code}</span>
              <span className="text-sm text-slate-500">{b.name}</span>
              {b.funder_id && (
                <span className="text-xs text-slate-400">· {funderName.get(b.funder_id)}</span>
              )}
              <span className={`rounded px-1.5 py-0.5 text-[10px] ${actif ? "bg-brand-lime/30 text-brand-brown" : "bg-slate-100 text-slate-400"}`}>
                {actif ? "actif" : "inactif"}
              </span>
            </span>
            <span className="text-xs text-slate-400">
              {b.convention_start && b.convention_end
                ? `${b.convention_start.split("-").reverse().join("/")} → ${b.convention_end.split("-").reverse().join("/")}`
                : "—"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
