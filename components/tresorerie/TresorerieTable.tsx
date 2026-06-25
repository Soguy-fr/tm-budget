"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TreasuryCell } from "@/lib/treasury";
import { formatEur, MONTHS_FR } from "@/lib/format";
import { saveTreasurySettings } from "@/app/(app)/tresorerie/actions";

type Fin = { id: string; label: string; name: string; color: string; recByCell: Record<string, number> };

export function TresorerieTable({
  budgetId,
  calcDate,
  forcedBalance,
  cells,
  financements,
}: {
  budgetId: string;
  calcDate: string | null;
  forcedBalance: number | null;
  cells: TreasuryCell[];
  financements: Fin[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(calcDate ?? "");
  const [forced, setForced] = useState(forcedBalance != null ? String(forcedBalance) : "");
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveTreasurySettings(
        budgetId,
        date || null,
        forced === "" ? null : Number(forced),
      );
      if (!res.ok) setError(res.error ?? "Erreur.");
      else router.refresh();
    });
  }

  const key = (c: TreasuryCell) => `${c.year}:${c.month}`;
  const years = Array.from(new Set(cells.map((c) => c.year)));
  const grey = "bg-slate-100 text-slate-300";

  return (
    <div>
      {/* Réglages : date du jour + solde forcé */}
      <div className="mb-3 flex flex-wrap items-end gap-3 rounded border border-slate-200 bg-white p-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Date du jour du calcul</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Solde forcé en caisse (€)</span>
          <input
            type="number"
            placeholder="ex : 12000"
            value={forced}
            onChange={(e) => setForced(e.target.value)}
            className="w-36 rounded border border-slate-300 px-2 py-1 text-right text-input"
          />
        </label>
        <button
          onClick={save}
          disabled={pending}
          className="rounded bg-brand-emerald px-3 py-1.5 text-white disabled:opacity-40"
        >
          Appliquer
        </button>
        {date && (
          <button
            onClick={() => {
              setDate("");
              setForced("");
              startTransition(async () => {
                await saveTreasurySettings(budgetId, null, null);
                router.refresh();
              });
            }}
            disabled={pending}
            className="rounded border border-slate-300 px-3 py-1.5 text-slate-600 disabled:opacity-40"
          >
            Réinitialiser
          </button>
        )}
        <span className="text-xs text-slate-400">
          La date grise les mois passés ; le solde forcé est posé sur le mois précédent et la
          projection repart de là.
        </span>
      </div>

      {error && (
        <p className="mb-3 rounded border border-alert/30 bg-red-50 p-2 text-sm text-alert">{error}</p>
      )}

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="border-collapse text-xs">
          <thead>
            {/* Bandeau années */}
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="sticky left-0 bg-white px-2 py-1 text-left">Financement</th>
              {years.map((y) => (
                <th key={y} colSpan={12} className="border-l border-slate-200 px-2 py-1 text-center font-bold">
                  {y}
                </th>
              ))}
            </tr>
            <tr className="border-b border-slate-200 text-slate-400">
              <th className="sticky left-0 bg-white px-2 py-1"></th>
              {cells.map((c) => (
                <th key={key(c)} className={`px-1.5 py-1 text-right ${c.greyed ? grey : ""} ${c.month === 1 ? "border-l border-slate-200" : ""}`}>
                  {MONTHS_FR[c.month - 1]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Une ligne par financement : recettes prévues */}
            {financements.map((f) => (
              <tr key={f.id} className="border-b border-slate-50">
                <td className="sticky left-0 bg-white px-2 py-1">
                  <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: f.color }} />
                  <span title={f.name}>{f.label}</span>
                </td>
                {cells.map((c) => {
                  const v = f.recByCell[key(c)] ?? 0;
                  return (
                    <td key={key(c)} className={`px-1.5 py-1 text-right ${c.greyed ? grey : "text-slate-600"}`}>
                      {v ? formatEur(v) : ""}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Dépenses totales */}
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <td className="sticky left-0 bg-white px-2 py-1 font-medium text-brand-night">Dépenses totales</td>
              {cells.map((c) => (
                <td key={key(c)} className={`px-1.5 py-1 text-right ${c.greyed ? grey : "text-slate-600"}`}>
                  {c.dep ? formatEur(c.dep) : ""}
                </td>
              ))}
            </tr>

            {/* Solde chaîné */}
            <tr className="font-medium">
              <td className="sticky left-0 bg-white px-2 py-1 text-brand-night">Solde</td>
              {cells.map((c) => (
                <td
                  key={key(c)}
                  className={`px-1.5 py-1 text-right ${
                    c.forcedHere
                      ? "bg-brand-cream font-bold text-brand-brown"
                      : c.greyed
                        ? grey
                        : c.solde != null && c.solde < 0
                          ? "text-alert"
                          : "text-brand-night"
                  }`}
                  title={c.forcedHere ? "Solde forcé (point de départ de la projection)" : undefined}
                >
                  {c.solde != null ? formatEur(c.solde) : ""}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
