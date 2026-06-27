"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatEur, MONTHS_FR } from "@/lib/format";
import { computeCoverage } from "@/lib/coverage";
import {
  updateCoverageBaseline,
  addScenarioFinancing,
  deleteScenarioFinancing,
  saveScenarioFinancingMonths,
  convertScenarioFinancing,
} from "@/app/(app)/budgets/financing-actions";

export type CoverageFinancing = {
  id: string;
  name: string;
  amount_total: number;
  converted: boolean;
  months: Record<string, number>; // `${year}:${month}` → montant
};

export function CoveragePanel({
  budgetId,
  isActive,
  baseline,
  years,
  depByYM,
  financings,
  canEdit,
}: {
  budgetId: string;
  isActive: boolean;
  baseline: number;
  years: number[];
  depByYM: Record<string, number>;
  financings: CoverageFinancing[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [baseStr, setBaseStr] = useState(String(baseline));
  const [work, setWork] = useState<CoverageFinancing[]>(financings);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Erreur.");
      else router.refresh();
    });
  }

  // BR-12.1 — recettes simulées agrégées par mois (toutes lignes).
  const recByYM = useMemo(() => {
    const m: Record<string, number> = {};
    for (const f of work) {
      for (const [k, v] of Object.entries(f.months)) m[k] = (m[k] ?? 0) + (v || 0);
    }
    return m;
  }, [work]);

  const baseNum = Number(baseStr) || 0;
  const coverage = useMemo(
    () => computeCoverage(baseNum, years, recByYM, depByYM),
    [baseNum, years, recByYM, depByYM],
  );

  function setMonth(finId: string, year: number, monthIdx: number, value: number) {
    setWork((w) =>
      w.map((f) =>
        f.id === finId
          ? { ...f, months: { ...f.months, [`${year}:${monthIdx + 1}`]: value } }
          : f,
      ),
    );
  }

  function monthsArray(f: CoverageFinancing, year: number): number[] {
    return Array.from({ length: 12 }, (_, i) => f.months[`${year}:${i + 1}`] ?? 0);
  }

  return (
    <section className="mt-8 rounded border border-slate-200 bg-white p-4">
      <h2 className="mb-1 text-lg font-bold text-brand-night">Financements prévisionnels & couverture</h2>
      <p className="mb-3 text-sm text-slate-500">
        Simulez vos recettes pour vérifier qu&apos;elles couvrent les charges dans le temps
        (BR-12). Distinct de la trésorerie réelle.
      </p>

      {error && (
        <p className="mb-3 rounded border border-alert/30 bg-red-50 p-2 text-sm text-alert">{error}</p>
      )}

      {/* Solde initial de couverture */}
      <div className="mb-4 flex items-center gap-2 text-sm">
        <label className="text-slate-500" title="Reliquat + financements déjà acquis, repliés">
          Solde initial de couverture ⓘ
        </label>
        <input
          type="number"
          value={baseStr}
          onChange={(e) => setBaseStr(e.target.value)}
          disabled={!canEdit}
          className="w-32 rounded border border-slate-300 px-2 py-1 text-right text-input"
        />
        {canEdit && Number(baseStr) !== baseline && (
          <button
            onClick={() => run(() => updateCoverageBaseline(budgetId, baseNum))}
            disabled={pending}
            className="rounded bg-input px-2 py-1 text-xs text-white"
          >
            Enregistrer
          </button>
        )}
      </div>

      {/* Résumé couverture par année (F2.9) */}
      <div className="mb-4 overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr className="text-slate-500">
              <th className="px-2 py-1 text-left">Année</th>
              <th className="px-2 py-1 text-right">Charges</th>
              <th className="px-2 py-1 text-right">Couvert</th>
              <th className="px-2 py-1 text-right">Restant à couvrir</th>
              <th className="px-2 py-1 text-right">Solde fin</th>
            </tr>
          </thead>
          <tbody>
            {coverage.summary.map((s) => (
              <tr key={s.year} className="border-t border-slate-100">
                <td className="px-2 py-1 font-medium">{s.year}</td>
                <td className="px-2 py-1 text-right">{formatEur(s.charges)}</td>
                <td className="px-2 py-1 text-right">{s.couvertPct}%</td>
                <td className={`px-2 py-1 text-right ${s.restantACouvrir > 0 ? "font-bold text-alert" : "text-slate-400"}`}>
                  {s.restantACouvrir > 0 ? formatEur(s.restantACouvrir) : "—"}
                </td>
                <td className={`px-2 py-1 text-right ${s.soldeFin < 0 ? "font-bold text-alert" : ""}`}>
                  {formatEur(s.soldeFin)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lignes de financement prévisionnel + répartition mensuelle par année */}
      {years.length === 0 ? (
        <p className="text-sm text-slate-500">Ajoutez une année au scénario pour saisir les recettes.</p>
      ) : (
        years.map((year) => (
          <div key={year} className="mb-4 overflow-x-auto rounded border border-slate-100">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="px-2 py-1 text-left">{year} — Financement</th>
                  {MONTHS_FR.map((m) => (
                    <th key={m} className="px-1 py-1 text-right">{m}</th>
                  ))}
                  <th className="px-2 py-1" />
                </tr>
              </thead>
              <tbody>
                {work.map((f) => {
                  const arr = monthsArray(f, year);
                  return (
                    <tr key={f.id} className="border-b border-slate-50">
                      <td className="px-2 py-1 text-left font-medium text-brand-night">
                        {f.name}
                        {f.converted && <span className="ml-1 text-[10px] text-brand-emerald" title="Converti en financement réel">✓ converti</span>}
                      </td>
                      {arr.map((v, i) => (
                        <td key={i} className="px-1 py-1">
                          <input
                            type="number"
                            value={v}
                            disabled={!canEdit}
                            onChange={(e) => setMonth(f.id, year, i, Number(e.target.value) || 0)}
                            className="w-14 rounded border border-slate-300 px-1 py-0.5 text-right text-input"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right">
                        {canEdit && (
                          <button
                            onClick={() => run(() => saveScenarioFinancingMonths(f.id, year, monthsArray(f, year)))}
                            disabled={pending}
                            className="rounded bg-brand-emerald px-1.5 py-0.5 text-[10px] text-white"
                          >
                            Enreg.
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Charges (Σ dépenses du scénario) */}
                <tr className="border-t border-slate-200 text-slate-500">
                  <td className="px-2 py-1 text-left">Charges (Σ dépenses)</td>
                  {Array.from({ length: 12 }, (_, i) => (
                    <td key={i} className="px-1 py-1 text-right">
                      {formatEur(depByYM[`${year}:${i + 1}`] ?? 0)}
                    </td>
                  ))}
                  <td />
                </tr>

                {/* Solde de couverture (cumul) — rouge si négatif */}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-medium">
                  <td className="px-2 py-1 text-left">Solde de couverture (cumul)</td>
                  {(coverage.byYear[year] ?? []).map((v, i) => (
                    <td key={i} className={`px-1 py-1 text-right ${v < 0 ? "font-bold text-alert" : ""}`}>
                      {formatEur(v)}
                    </td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        ))
      )}

      {/* Gestion des lignes */}
      {canEdit && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AddFinancing budgetId={budgetId} onError={setError} />
          {work.map((f) => (
            <span key={f.id} className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs">
              {f.name}
              {!f.converted && (
                <ConvertButton financing={f} />
              )}
              <button
                onClick={() => run(() => deleteScenarioFinancing(f.id))}
                disabled={pending}
                className="text-alert hover:underline"
                title="Supprimer"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {isActive && work.some((f) => !f.converted) && (
        <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          ⚠ Ce scénario est actif et contient des financements prévisionnels non convertis.
          Convertissez-les en financements réels (bouton « Convertir ») pour les retrouver
          dans la page Financement.
        </p>
      )}
    </section>
  );
}

function AddFinancing({
  budgetId,
  onError,
}: {
  budgetId: string;
  onError: (e: string | null) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("0");

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
        + Ligne de financement
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (ex GIZ)" className="w-28 rounded border border-slate-300 px-2 py-1 text-xs" />
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Montant" className="w-24 rounded border border-slate-300 px-2 py-1 text-right text-xs" />
      <button
        onClick={() => {
          onError(null);
          startTransition(async () => {
            const res = await addScenarioFinancing(budgetId, name, Number(amount) || 0);
            if (!res.ok) onError(res.error ?? "Erreur.");
            else {
              setOpen(false);
              setName("");
              setAmount("0");
              router.refresh();
            }
          });
        }}
        disabled={pending}
        className="rounded bg-brand-night px-2 py-1 text-xs text-white"
      >
        Ajouter
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-slate-500">Annuler</button>
    </span>
  );
}

// F2.8 / BR-12.3 — convertir une ligne en financement réel (formulaire champs manquants).
function ConvertButton({ financing }: { financing: CoverageFinancing }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [reference, setReference] = useState("");
  const [color, setColor] = useState("#0FA86B");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [desc, setDesc] = useState("");

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded border border-brand-emerald px-1.5 py-0.5 text-[10px] text-brand-emerald hover:bg-emerald-50">
        Convertir
      </button>
    );
  }
  return (
    <span className="flex flex-col gap-1 rounded border border-brand-emerald bg-emerald-50 p-2">
      <span className="text-[11px] font-medium">Convertir « {financing.name} » en financement réel</span>
      {err && <span className="text-[10px] text-alert">{err}</span>}
      <span className="flex flex-wrap gap-1">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code court (ex GIZ)" className="w-24 rounded border border-slate-300 px-1 py-0.5 text-[10px]" />
        <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Référence (GIZ-001)" className="w-28 rounded border border-slate-300 px-1 py-0.5 text-[10px]" />
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-6 w-8 rounded border border-slate-300" />
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded border border-slate-300 px-1 py-0.5 text-[10px]" title="Début d'éligibilité" />
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded border border-slate-300 px-1 py-0.5 text-[10px]" title="Fin d'éligibilité" />
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" className="w-32 rounded border border-slate-300 px-1 py-0.5 text-[10px]" />
      </span>
      <span className="flex gap-1">
        <button
          onClick={() => {
            setErr(null);
            if (!code.trim()) { setErr("Code court requis."); return; }
            startTransition(async () => {
              const res = await convertScenarioFinancing({
                financingId: financing.id,
                code,
                reference,
                color,
                conventionStart: start || null,
                conventionEnd: end || null,
                description: desc || null,
                montantTotal: financing.amount_total,
              });
              if (!res.ok) setErr(res.error ?? "Erreur.");
              else { setOpen(false); router.refresh(); }
            });
          }}
          disabled={pending}
          className="rounded bg-brand-emerald px-2 py-0.5 text-[10px] text-white"
        >
          Créer le financement
        </button>
        <button onClick={() => setOpen(false)} className="text-[10px] text-slate-500">Annuler</button>
      </span>
    </span>
  );
}
