import Link from "next/link";
import { formatEur } from "@/lib/format";
import type { PlanYearCoverage } from "@/lib/coverage";

// F8.6 / BR-12.2 — bloc dashboard : couverture annuelle empilée par statut.
export function PlanFinancementBlock({ coverage }: { coverage: PlanYearCoverage[] }) {
  if (coverage.length === 0) return null;
  return (
    <section className="mb-5 rounded border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Plan de financement — couverture des dépenses
        </h2>
        <Legend />
      </div>
      <div className="space-y-2">
        {coverage.map((c) => (
          <div key={c.year} className="flex items-center gap-3 text-xs">
            <span className="w-12 font-medium text-brand-night">{c.year}</span>
            <span className="w-24 text-right text-slate-500">{formatEur(c.charges)}</span>
            <span className="flex h-4 flex-1 overflow-hidden rounded bg-slate-100">
              <span className="bg-brand-emerald" style={{ width: `${c.pctSigne}%` }} title={`Signé ${c.pctSigne}%`} />
              <span className="bg-emerald-300" style={{ width: `${c.pctPromis}%` }} title={`Promis ${c.pctPromis}%`} />
              <span className="bg-amber-400" style={{ width: `${c.pctEspere}%` }} title={`Espéré ${c.pctEspere}%`} />
              <span className="bg-alert" style={{ width: `${c.pctNonCouvert}%` }} title={`Non couvert ${c.pctNonCouvert}%`} />
            </span>
            <span className="w-44 text-right text-[11px] text-slate-500">
              {c.pctSigne}% / {c.pctPromis}% / {c.pctEspere}% / {c.pctNonCouvert}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Legend() {
  const items: Array<[string, string]> = [
    ["bg-brand-emerald", "Signé"],
    ["bg-emerald-300", "Promis"],
    ["bg-amber-400", "Espéré"],
    ["bg-alert", "Non couvert"],
  ];
  return (
    <span className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
      {items.map(([cls, label]) => (
        <span key={label} className="flex items-center gap-1">
          <span className={`inline-block h-2.5 w-2.5 rounded-sm ${cls}`} />
          {label}
        </span>
      ))}
    </span>
  );
}
