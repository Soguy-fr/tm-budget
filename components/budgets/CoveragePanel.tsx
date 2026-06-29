"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatEur, MONTHS_FR } from "@/lib/format";
import { computePlanCoverage, type PlanFinancing } from "@/lib/coverage";
import type { FinancingStatus } from "@/lib/types";
import {
  addScenarioFinancing,
  updateScenarioFinancing,
  deleteScenarioFinancing,
  saveScenarioFinancingYears,
  saveScenarioFinancingMonths,
  convertScenarioFinancing,
} from "@/app/(app)/budgets/financing-actions";

export type PlanFinancingRow = {
  id: string;
  name: string;
  statut: FinancingStatus;
  amountTotal: number;
  eligibStart: string | null;
  eligibEnd: string | null;
  converted: boolean;
  yearly: Record<number, number>; // couche 1
  months: Record<string, number>; // couche 2 `${year}:${month}`
};

const STATUT_LABEL: Record<FinancingStatus, string> = {
  signe: "Signé",
  promis: "Promis",
  espere: "Espéré",
};

export function CoveragePanel({
  budgetId,
  isActive,
  years,
  depByYear,
  financings,
  canEdit,
}: {
  budgetId: string;
  isActive: boolean;
  years: number[];
  depByYear: Record<number, number>;
  financings: PlanFinancingRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [work, setWork] = useState<PlanFinancingRow[]>(financings);

  // Resync depuis le serveur quand les props changent (corrige les ids périmés → FK).
  useEffect(() => {
    setWork(financings);
  }, [financings]);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Erreur.");
      else router.refresh();
    });
  }

  const coverage = useMemo(() => {
    const plan: PlanFinancing[] = work.map((f) => ({ statut: f.statut, yearly: f.yearly }));
    return computePlanCoverage(years, depByYear, plan);
  }, [work, years, depByYear]);

  function monthsArray(f: PlanFinancingRow, year: number): number[] {
    return Array.from({ length: 12 }, (_, i) => f.months[`${year}:${i + 1}`] ?? 0);
  }
  const sumMonths = (f: PlanFinancingRow) =>
    Object.values(f.months).reduce((s, v) => s + (v || 0), 0);
  const sumYears = (f: PlanFinancingRow) =>
    Object.values(f.yearly).reduce((s, v) => s + (v || 0), 0);

  function patch(finId: string, p: Partial<PlanFinancingRow>) {
    setWork((w) => w.map((f) => (f.id === finId ? { ...f, ...p } : f)));
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
  function setYearAmount(finId: string, year: number, value: number) {
    setWork((w) =>
      w.map((f) => (f.id === finId ? { ...f, yearly: { ...f.yearly, [year]: value } } : f)),
    );
  }

  return (
    <section className="mt-8 rounded border border-slate-200 bg-white p-4">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-lg font-bold text-brand-night">Plan de financement</h2>
        <HelpDot />
      </div>
      <p className="mb-3 text-sm text-slate-500">
        Par fonds : statut, montant, dates d&apos;éligibilité, répartition annuelle (couverture)
        et versements mensuels (trésorerie). BR-12.
      </p>

      {error && (
        <p className="mb-3 rounded border border-alert/30 bg-red-50 p-2 text-sm text-alert">{error}</p>
      )}

      {/* Couverture par année (empilé signé/promis/espéré/non couvert) */}
      <div className="mb-5">
        <h3 className="mb-1 text-xs font-medium uppercase text-slate-400">Couverture par année</h3>
        <table className="text-xs">
          <thead>
            <tr className="text-slate-500">
              <th className="px-2 py-1 text-left">Année</th>
              <th className="px-2 py-1 text-right">Charges</th>
              <th className="px-2 py-1 text-left">Couverture</th>
              <th className="px-2 py-1 text-right">Signé</th>
              <th className="px-2 py-1 text-right">Promis</th>
              <th className="px-2 py-1 text-right">Espéré</th>
              <th className="px-2 py-1 text-right">Non couvert</th>
            </tr>
          </thead>
          <tbody>
            {coverage.map((c) => (
              <tr key={c.year} className="border-t border-slate-100">
                <td className="px-2 py-1 font-medium">{c.year}</td>
                <td className="px-2 py-1 text-right font-bold text-brand-night">{formatEur(c.charges)}</td>
                <td className="px-2 py-1">
                  <CoverageBar c={c} />
                </td>
                <td className="px-2 py-1 text-right text-brand-emerald">{c.pctSigne}%</td>
                <td className="px-2 py-1 text-right text-emerald-400">{c.pctPromis}%</td>
                <td className="px-2 py-1 text-right text-amber-500">{c.pctEspere}%</td>
                <td className={`px-2 py-1 text-right ${c.pctNonCouvert > 0 ? "text-alert" : "text-slate-400"}`}>
                  {c.pctNonCouvert}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Saisie par fonds */}
      {years.length === 0 ? (
        <p className="text-sm text-slate-500">Ajoutez une année au scénario pour saisir le plan.</p>
      ) : (
        <div className="space-y-3">
          {work.map((f) => {
            const sm = sumMonths(f);
            const sy = sumYears(f);
            const mismatch = sy !== f.amountTotal || sm !== f.amountTotal;
            return (
              <div key={f.id} className="rounded border border-slate-100 p-2">
                {/* Entête fonds : nom, statut, montant, dates */}
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-brand-night">{f.name}</span>
                  {f.converted && <span className="text-[10px] text-brand-emerald">✓ converti</span>}
                  {canEdit ? (
                    <>
                      <select
                        value={f.statut}
                        onChange={(e) => {
                          const statut = e.target.value as FinancingStatus;
                          patch(f.id, { statut });
                          run(() => updateScenarioFinancing(f.id, { statut }));
                        }}
                        className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                      >
                        <option value="signe">Signé</option>
                        <option value="promis">Promis</option>
                        <option value="espere">Espéré</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        Montant
                        <input
                          type="number"
                          value={f.amountTotal}
                          onChange={(e) => patch(f.id, { amountTotal: Number(e.target.value) || 0 })}
                          onBlur={() => run(() => updateScenarioFinancing(f.id, { amount_total: f.amountTotal }))}
                          className="w-24 rounded border border-slate-300 px-1 py-0.5 text-right text-input"
                        />
                      </label>
                      <label className="flex items-center gap-1 text-xs text-slate-500" title="Début d'éligibilité">
                        Élig.
                        <input
                          type="date"
                          value={f.eligibStart ?? ""}
                          onChange={(e) => patch(f.id, { eligibStart: e.target.value || null })}
                          onBlur={() => run(() => updateScenarioFinancing(f.id, { eligib_start: f.eligibStart }))}
                          className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                        />
                      </label>
                      <label className="flex items-center gap-1 text-xs text-slate-500" title="Fin d'éligibilité">
                        →
                        <input
                          type="date"
                          value={f.eligibEnd ?? ""}
                          onChange={(e) => patch(f.id, { eligibEnd: e.target.value || null })}
                          onBlur={() => run(() => updateScenarioFinancing(f.id, { eligib_end: f.eligibEnd }))}
                          className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                        />
                      </label>
                      <button
                        onClick={() => {
                          const n = window.prompt("Renommer le fonds", f.name);
                          if (n && n.trim()) run(() => updateScenarioFinancing(f.id, { name: n }));
                        }}
                        className="text-[11px] text-slate-400 hover:text-brand-night"
                        title="Renommer"
                      >
                        ✎
                      </button>
                      {!f.converted && <ConvertButton financing={f} />}
                      <button
                        onClick={() => {
                          if (window.confirm(`Supprimer le fonds « ${f.name} » ?`))
                            run(() => deleteScenarioFinancing(f.id));
                        }}
                        className="text-[11px] text-alert hover:underline"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {STATUT_LABEL[f.statut]} · {formatEur(f.amountTotal)}
                    </span>
                  )}
                </div>

                {/* Réconciliation ⚠ non bloquante (BR-12.1) */}
                <p className={`mb-1 text-[11px] ${mismatch ? "text-amber-600" : "text-slate-400"}`}>
                  {mismatch ? "⚠ " : ""}
                  Σ annuel {formatEur(sy)} · Σ mensuel {formatEur(sm)} · montant {formatEur(f.amountTotal)}
                  {mismatch ? " (écart)" : " (OK)"}
                </p>

                {/* Couche 1 — répartition annuelle */}
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400">Répartition annuelle :</span>
                  {years.map((year) => (
                    <label key={year} className="flex items-center gap-1">
                      {year}
                      {canEdit ? (
                        <input
                          type="number"
                          value={f.yearly[year] ?? 0}
                          onChange={(e) => setYearAmount(f.id, year, Number(e.target.value) || 0)}
                          className="w-20 rounded border border-slate-300 px-1 py-0.5 text-right text-input"
                        />
                      ) : (
                        <span>{formatEur(f.yearly[year] ?? 0)}</span>
                      )}
                    </label>
                  ))}
                  {canEdit && (
                    <button
                      onClick={() => {
                        const yearly: Record<number, number> = {};
                        for (const y of years) yearly[y] = f.yearly[y] ?? 0;
                        run(() => saveScenarioFinancingYears(f.id, yearly));
                      }}
                      disabled={pending}
                      className="rounded bg-brand-emerald px-1.5 py-0.5 text-[10px] text-white disabled:opacity-40"
                      title="Enregistrer la répartition annuelle"
                    >
                      ✓
                    </button>
                  )}
                </div>

                {/* Couche 2 — versements mensuels */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400">
                        <th className="px-1 py-0.5 text-left">Versements</th>
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
                            <td className="px-1 py-0.5 text-right text-slate-500">
                              {formatEur(arr.reduce((a, b) => a + b, 0))}
                            </td>
                            <td className="px-1 py-0.5 text-right">
                              {canEdit && (
                                <button
                                  onClick={() => run(() => saveScenarioFinancingMonths(f.id, year, arr))}
                                  disabled={pending}
                                  className="rounded bg-brand-emerald px-1.5 py-0.5 text-[10px] text-white disabled:opacity-40"
                                  title="Enregistrer les versements de cette année"
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
            );
          })}
          {canEdit && <AddFinancing budgetId={budgetId} onError={setError} />}
        </div>
      )}

      {isActive && work.some((f) => !f.converted) && (
        <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          ⚠ Scénario actif avec des fonds non convertis. Utilisez « Convertir » pour créer les
          financements réels.
        </p>
      )}
    </section>
  );
}

function CoverageBar({
  c,
}: {
  c: { pctSigne: number; pctPromis: number; pctEspere: number; pctNonCouvert: number };
}) {
  return (
    <span className="flex h-3 w-40 overflow-hidden rounded bg-slate-100" title="Signé / Promis / Espéré / Non couvert">
      <span className="bg-brand-emerald" style={{ width: `${c.pctSigne}%` }} />
      <span className="bg-emerald-300" style={{ width: `${c.pctPromis}%` }} />
      <span className="bg-amber-400" style={{ width: `${c.pctEspere}%` }} />
      <span className="bg-alert" style={{ width: `${c.pctNonCouvert}%` }} />
    </span>
  );
}

function HelpDot() {
  return (
    <Link
      href="/guide#le-plan-de-financement-ai-je-de-quoi-payer-tout-ca"
      className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-500 hover:bg-slate-100"
      title="Couverture = répartition annuelle des fonds par statut (signé/promis/espéré) sur la dépense annuelle. Les versements mensuels servent à la trésorerie. Cliquez pour le guide."
    >
      ?
    </Link>
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
        + Fonds
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
      <span className="text-[11px] text-slate-400">(statut par défaut : espéré)</span>
    </span>
  );
}

// F2.8 / BR-12.4 — convertir un fonds en financement réel.
function ConvertButton({ financing }: { financing: PlanFinancingRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [reference, setReference] = useState("");
  const [color, setColor] = useState("#0FA86B");
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
      <span className="text-[11px] font-medium">Convertir « {financing.name} » ({formatEur(financing.amountTotal)}) en financement réel</span>
      {err && <span className="text-[10px] text-alert">{err}</span>}
      <span className="flex flex-wrap gap-1">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code court (GIZ)" className="w-24 rounded border border-slate-300 px-1 py-0.5 text-[10px]" />
        <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Référence (GIZ-001)" className="w-28 rounded border border-slate-300 px-1 py-0.5 text-[10px]" />
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-6 w-8 rounded border border-slate-300" />
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
                conventionStart: financing.eligibStart,
                conventionEnd: financing.eligibEnd,
                description: desc || null,
                montantTotal: financing.amountTotal,
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
