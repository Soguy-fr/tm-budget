"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatEur, MONTHS_FR } from "@/lib/format";
import { computeCoverage } from "@/lib/coverage";
import {
  updateCoverageBaseline,
  addScenarioFinancing,
  renameScenarioFinancing,
  deleteScenarioFinancing,
  saveScenarioFinancingMonths,
  convertScenarioFinancing,
} from "@/app/(app)/budgets/financing-actions";

export type CoverageFinancing = {
  id: string;
  name: string;
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

  // Resync depuis le serveur quand les props changent (après save/ajout/refresh).
  // Corrige les ids périmés → évite l'erreur FK à l'enregistrement.
  useEffect(() => {
    setWork(financings);
  }, [financings]);
  useEffect(() => {
    setBaseStr(String(baseline));
  }, [baseline]);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Erreur.");
      else router.refresh();
    });
  }

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

  function monthsArray(f: CoverageFinancing, year: number): number[] {
    return Array.from({ length: 12 }, (_, i) => f.months[`${year}:${i + 1}`] ?? 0);
  }
  function finTotal(f: CoverageFinancing): number {
    return Object.values(f.months).reduce((s, v) => s + (v || 0), 0);
  }
  function yearTotal(f: CoverageFinancing, year: number): number {
    return monthsArray(f, year).reduce((a, b) => a + b, 0);
  }

  function setMonth(finId: string, year: number, monthIdx: number, value: number) {
    setWork((w) =>
      w.map((f) =>
        f.id === finId
          ? { ...f, months: { ...f.months, [`${year}:${monthIdx + 1}`]: value } }
          : f,
      ),
    );
  }

  function saveYear(finId: string, year: number) {
    const f = work.find((x) => x.id === finId);
    if (!f) return;
    const arr = monthsArray(f, year);
    setError(null);
    startTransition(async () => {
      const res = await saveScenarioFinancingMonths(finId, year, arr);
      if (!res.ok) {
        setError(res.error ?? "Erreur.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="mt-8 rounded border border-slate-200 bg-white p-4">
      <h2 className="mb-1 text-lg font-bold text-brand-night">Financements prévisionnels & couverture</h2>
      <p className="mb-3 text-sm text-slate-500">
        Simulez vos recettes pour vérifier qu&apos;elles couvrent les charges (BR-12).
      </p>

      {error && (
        <p className="mb-3 rounded border border-alert/30 bg-red-50 p-2 text-sm text-alert">{error}</p>
      )}

      {/* Solde initial de couverture + aide */}
      <div className="mb-4 flex items-center gap-2 text-sm">
        <label className="text-slate-500">Solde initial de couverture</label>
        <HelpDot />
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

      {/* Deux tableaux : couverture par année + liste des financements */}
      <div className="mb-5 flex flex-wrap gap-6">
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase text-slate-400">Couverture par année</h3>
          <table className="text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="px-2 py-1 text-left">Année</th>
                <th className="px-2 py-1 text-right">Total dépense</th>
                <th className="px-2 py-1 text-right">Total reçu</th>
                <th className="px-2 py-1 text-right">Solde fin</th>
                <th className="px-2 py-1 text-right">Couvert</th>
              </tr>
            </thead>
            <tbody>
              {coverage.summary.map((s) => (
                <tr key={s.year} className="border-t border-slate-100">
                  <td className="px-2 py-1 font-medium">{s.year}</td>
                  <td className="px-2 py-1 text-right font-bold text-brand-night">{formatEur(s.charges)}</td>
                  <td className="px-2 py-1 text-right">{formatEur(s.recettes)}</td>
                  <td className={`px-2 py-1 text-right ${s.soldeFin < 0 ? "font-bold text-alert" : ""}`}>
                    {formatEur(s.soldeFin)}
                  </td>
                  <td className={`px-2 py-1 text-right ${s.couvertPct < 100 ? "text-alert" : "text-brand-emerald"}`}>
                    {s.couvertPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="mb-1 text-xs font-medium uppercase text-slate-400">Financements</h3>
          <table className="text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="px-2 py-1 text-left">Nom</th>
                <th className="px-2 py-1 text-right">Montant total</th>
              </tr>
            </thead>
            <tbody>
              {work.map((f) => (
                <tr key={f.id} className="border-t border-slate-100">
                  <td className="px-2 py-1">{f.name}{f.converted && <span className="ml-1 text-[10px] text-brand-emerald">✓</span>}</td>
                  <td className="px-2 py-1 text-right">{formatEur(finTotal(f))}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-300 font-medium">
                <td className="px-2 py-1">Total</td>
                <td className="px-2 py-1 text-right">{formatEur(work.reduce((s, f) => s + finTotal(f), 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Saisie mensuelle par financement et par année (stylo ✏) */}
      {years.length === 0 ? (
        <p className="text-sm text-slate-500">Ajoutez une année au scénario pour saisir les recettes.</p>
      ) : (
        <div className="space-y-3">
          {work.map((f) => (
            <div key={f.id} className="rounded border border-slate-100 p-2">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-medium text-brand-night">{f.name}</span>
                <span className="text-xs text-slate-400">{formatEur(finTotal(f))}</span>
                {canEdit && (
                  <>
                    <button
                      onClick={() => {
                        const n = window.prompt("Renommer le financement", f.name);
                        if (n && n.trim()) run(() => renameScenarioFinancing(f.id, n));
                      }}
                      className="text-[11px] text-slate-400 hover:text-brand-night"
                      title="Renommer"
                    >
                      ✎
                    </button>
                    {!f.converted && <ConvertButton financing={f} total={finTotal(f)} />}
                    <button
                      onClick={() => {
                        if (window.confirm(`Supprimer le financement « ${f.name} » ?`))
                          run(() => deleteScenarioFinancing(f.id));
                      }}
                      className="text-[11px] text-alert hover:underline"
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400">
                      <th className="px-1 py-0.5 text-left">Année</th>
                      {MONTHS_FR.map((m) => (
                        <th key={m} className="px-1 py-0.5 text-right">{m}</th>
                      ))}
                      <th className="px-1 py-0.5 text-right">Σ</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {years.map((year) => {
                      const arr = monthsArray(f, year);
                      return (
                        <tr key={year} className="border-b border-slate-50">
                          <td className="px-1 py-0.5 font-medium">{year}</td>
                          {arr.map((v, i) => (
                            <td key={i} className="px-0.5 py-0.5 text-right">
                              {canEdit ? (
                                <input
                                  type="number"
                                  value={v}
                                  onChange={(e) => setMonth(f.id, year, i, Number(e.target.value) || 0)}
                                  className="w-12 rounded border border-slate-300 px-0.5 py-0.5 text-right text-input"
                                />
                              ) : v !== 0 ? (
                                formatEur(v)
                              ) : (
                                <span className="text-slate-300">·</span>
                              )}
                            </td>
                          ))}
                          <td className="px-1 py-0.5 text-right text-slate-500">{formatEur(yearTotal(f, year))}</td>
                          <td className="px-1 py-0.5 text-right">
                            {canEdit && (
                              <button
                                onClick={() => saveYear(f.id, year)}
                                disabled={pending}
                                className="rounded bg-brand-emerald px-1.5 py-0.5 text-[10px] text-white disabled:opacity-40"
                                title="Enregistrer les recettes de cette année"
                              >
                                ✓ Enreg.
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {canEdit && <AddFinancing budgetId={budgetId} onError={setError} />}
        </div>
      )}

      {isActive && work.some((f) => !f.converted) && (
        <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          ⚠ Scénario actif avec des financements prévisionnels non convertis. Utilisez
          « Convertir » pour créer les financements réels.
        </p>
      )}
    </section>
  );
}

function HelpDot() {
  return (
    <span className="group relative inline-flex">
      <Link
        href="/guide#travailler-un-nouveau-budget"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-500 hover:bg-slate-100"
        title="Le solde initial = caisse + financements antérieurs garantis (repliés). La couverture est une approximation par pseudo-trésorerie : solde de fin d'année positif = 100 % couvert, négatif = il manque ce montant. Cliquez pour le guide."
      >
        ?
      </Link>
    </span>
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

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
        + Ligne de financement
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (ex GIZ)" className="w-32 rounded border border-slate-300 px-2 py-1 text-xs" />
      <button
        onClick={() => {
          onError(null);
          startTransition(async () => {
            const res = await addScenarioFinancing(budgetId, name);
            if (!res.ok) onError(res.error ?? "Erreur.");
            else { setOpen(false); setName(""); router.refresh(); }
          });
        }}
        disabled={pending}
        className="rounded bg-brand-night px-2 py-1 text-xs text-white"
      >
        Ajouter
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-slate-500">Annuler</button>
      <span className="text-[11px] text-slate-400">(le montant se calcule à partir des mois)</span>
    </span>
  );
}

// F2.8 / BR-12.3 — convertir une ligne en financement réel.
function ConvertButton({ financing, total }: { financing: CoverageFinancing; total: number }) {
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
      <span className="text-[11px] font-medium">Convertir « {financing.name} » ({formatEur(total)}) en financement réel</span>
      {err && <span className="text-[10px] text-alert">{err}</span>}
      <span className="flex flex-wrap gap-1">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code court (GIZ)" className="w-24 rounded border border-slate-300 px-1 py-0.5 text-[10px]" />
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
                montantTotal: total,
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
