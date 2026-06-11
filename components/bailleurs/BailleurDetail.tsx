"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Bailleur, BailleurLine, StructureLine } from "@/lib/types";
import { formatEur, MONTHS_FR } from "@/lib/format";
import {
  derivedExpenseForLine,
  totalAssignedExpenses,
  nonAssigne,
} from "@/lib/bailleur-report";
import {
  addBailleurLine,
  deleteBailleurLine,
  setLineMapping,
  saveIncome,
} from "@/app/(app)/bailleurs/actions";
import { getBailleurPack } from "@/app/(app)/bailleurs/pack-action";

type Plan = { line_id: string; amount: number; bailleur_id: string | null };

export function BailleurDetail({
  bailleur,
  lines,
  mappingByLine,
  structure,
  planMonthly,
  income,
  years,
}: {
  bailleur: Bailleur;
  lines: BailleurLine[];
  mappingByLine: Record<string, string[]>;
  structure: StructureLine[];
  planMonthly: Plan[];
  income: Record<string, number>;
  years: number[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const lbLabel = useMemo(
    () => new Map(structure.map((s) => [s.id, `${s.code} ${s.label}`])),
    [structure],
  );

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Erreur.");
      else router.refresh();
    });
  }

  // ── Recettes (état de travail éditable) ───────────────────────────────────
  const [workIncome, setWorkIncome] = useState<Record<string, number>>(income);
  const [incomeDirty, setIncomeDirty] = useState(false);
  function setInc(year: number, month: number, v: number) {
    setWorkIncome((w) => ({ ...w, [`${year}:${month}`]: v }));
    setIncomeDirty(true);
  }
  function saveRecettes() {
    const rows: { year: number; month: number; amount: number }[] = [];
    for (const year of years) {
      for (let m = 1; m <= 12; m++) {
        const k = `${year}:${m}`;
        if ((workIncome[k] ?? 0) !== (income[k] ?? 0)) {
          rows.push({ year, month: m, amount: workIncome[k] ?? 0 });
        }
      }
    }
    run(async () => {
      const res = await saveIncome(bailleur.id, rows);
      if (res.ok) setIncomeDirty(false);
      return res;
    });
  }

  const recettesTotal = years.reduce(
    (s, y) => s + Array.from({ length: 12 }, (_, i) => workIncome[`${y}:${i + 1}`] ?? 0).reduce((a, b) => a + b, 0),
    0,
  );
  const depensesAssignees = totalAssignedExpenses(planMonthly, bailleur.id);
  const reste = nonAssigne(recettesTotal, depensesAssignees);

  // ── Ajout ligne bailleur ──────────────────────────────────────────────────
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");

  return (
    <div className="mt-2 max-w-5xl">
      <h1 className="flex items-center gap-2 text-xl font-bold text-brand-night">
        <span className="inline-block h-4 w-4 rounded-sm" style={{ background: bailleur.color }} />
        {bailleur.code} — {bailleur.name}
      </h1>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {bailleur.convention_start && bailleur.convention_end
            ? `Convention ${bailleur.convention_start} → ${bailleur.convention_end}`
            : "Convention non renseignée"}
          {bailleur.montant_conventionne != null &&
            ` · Plafond conventionné : ${formatEur(Number(bailleur.montant_conventionne))}`}
        </p>
        {/* C5 — pack audit bailleur en un clic (CSV multi-sections) */}
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const year = years.at(-1) ?? new Date().getFullYear();
              const res = await getBailleurPack(bailleur.id, year);
              if (!res.ok || !res.csv) {
                setError(res.error ?? "Export échoué.");
                return;
              }
              const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = res.filename ?? "pack-audit.csv";
              a.click();
              URL.revokeObjectURL(a.href);
            })
          }
          className="shrink-0 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          📦 Pack audit (CSV)
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded border border-alert/30 bg-red-50 p-2 text-sm text-alert">{error}</p>
      )}

      {/* ── BLOC DÉPENSES PRÉVUES (dérivées du plan interne, BR-3.1) ── */}
      <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide text-slate-500">
        Dépenses prévues (dérivées du plan interne)
      </h2>
      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-2 py-1">Code</th>
              <th className="px-2 py-1">Ligne bailleur</th>
              <th className="px-2 py-1">LB internes mappées</th>
              <th className="px-2 py-1 text-right">Total dérivé</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const mapped = mappingByLine[l.id] ?? [];
              const total = derivedExpenseForLine(planMonthly, bailleur.id, mapped);
              return (
                <tr key={l.id} className="border-b border-slate-50 align-top">
                  <td className="px-2 py-1 font-mono text-xs text-slate-400">{l.code}</td>
                  <td className="px-2 py-1">{l.label}</td>
                  <td className="px-2 py-1">
                    <MappingEditor
                      structure={structure}
                      selected={mapped}
                      lbLabel={lbLabel}
                      onSave={(ids) => run(() => setLineMapping(bailleur.id, l.id, ids))}
                      pending={pending}
                    />
                  </td>
                  <td className="px-2 py-1 text-right">{formatEur(total)}</td>
                  <td className="px-2 py-1 text-right">
                    <button
                      onClick={() => run(() => deleteBailleurLine(bailleur.id, l.id))}
                      disabled={pending}
                      className="text-xs text-alert hover:underline"
                    >
                      Suppr.
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* BR-3.2 — ligne « Non assigné » calculée (équilibre) */}
            <tr className="border-b border-slate-100 bg-slate-50 text-slate-600">
              <td className="px-2 py-1"></td>
              <td className="px-2 py-1 italic" colSpan={2}>
                Non assigné (équilibre recettes = dépenses)
              </td>
              <td className={`px-2 py-1 text-right ${reste < 0 ? "font-medium text-alert" : ""}`}>
                {formatEur(reste)}
              </td>
              <td></td>
            </tr>
            <tr className="font-medium">
              <td className="px-2 py-1" colSpan={3}>
                Total dépenses (= recettes)
              </td>
              <td className="px-2 py-1 text-right">{formatEur(depensesAssignees + reste)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      {reste < 0 && (
        <p className="mt-1 text-xs text-alert">
          Sur-affectation : les dépenses fléchées dépassent les recettes promises (BR-3.2).
        </p>
      )}

      {/* Ajout ligne bailleur */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newCode.trim()) {
            run(() => addBailleurLine(bailleur.id, newCode, newLabel));
            setNewCode("");
            setNewLabel("");
          }
        }}
        className="mt-2 flex gap-2"
      >
        <input
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="Code (A1)"
          className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Intitulé (Ressources humaines)"
          className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button type="submit" disabled={pending} className="rounded bg-brand-emerald px-3 py-1 text-sm text-white">
          + Ligne bailleur
        </button>
      </form>

      {/* ── BLOC RECETTES PRÉVUES (déblocages, BR-3.3) ── */}
      <div className="mt-6 mb-2 flex items-center gap-3">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-slate-500">
          Recettes prévues (déblocages attendus)
        </h2>
        {incomeDirty && (
          <button onClick={saveRecettes} disabled={pending} className="rounded bg-brand-emerald px-3 py-1 text-xs text-white">
            Enregistrer les recettes
          </button>
        )}
      </div>
      {years.map((year) => {
        const yearTotal = Array.from({ length: 12 }, (_, i) => workIncome[`${year}:${i + 1}`] ?? 0).reduce(
          (a, b) => a + b,
          0,
        );
        return (
          <div key={year} className="mb-3 overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-2 py-1 text-left">{year}</th>
                  <th className="px-2 py-1 text-right">Total</th>
                  {MONTHS_FR.map((m) => (
                    <th key={m} className="px-2 py-1 text-right">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-1 text-slate-500">Recettes</td>
                  <td className="px-2 py-1 text-right font-medium">{formatEur(yearTotal)}</td>
                  {Array.from({ length: 12 }, (_, i) => {
                    const v = workIncome[`${year}:${i + 1}`] ?? 0;
                    return (
                      <td key={i} className="px-1 py-1">
                        <input
                          type="number"
                          value={v}
                          onChange={(e) => setInc(year, i + 1, Number(e.target.value) || 0)}
                          className="w-16 rounded border border-slate-300 px-1 py-0.5 text-right text-input"
                        />
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Solde prévu */}
      <div className="mt-2 text-sm">
        <span className="text-slate-500">Total recettes prévues : </span>
        <span className="font-medium">{formatEur(recettesTotal)}</span>
        <span className="ml-4 text-slate-500">Solde prévu (recettes − dépenses) : </span>
        <span className="font-medium">{formatEur(recettesTotal - (depensesAssignees + reste))}</span>
        <span className="ml-1 text-xs text-slate-400">(équilibré par « Non assigné »)</span>
      </div>
    </div>
  );
}

// Éditeur de mapping ligne bailleur → LB internes (F4.3).
function MappingEditor({
  structure,
  selected,
  lbLabel,
  onSave,
  pending,
}: {
  structure: StructureLine[];
  selected: string[];
  lbLabel: Map<string, string>;
  onSave: (ids: string[]) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(selected);

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        {selected.length === 0 ? (
          <span className="text-xs text-slate-400">aucune</span>
        ) : (
          selected.map((id) => (
            <span key={id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">
              {lbLabel.get(id)?.split(" ")[0] ?? id}
            </span>
          ))
        )}
        <button
          onClick={() => {
            setDraft(selected);
            setOpen(true);
          }}
          className="text-[10px] text-brand-emerald hover:underline"
        >
          modifier
        </button>
      </div>
    );
  }

  function toggle(id: string) {
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  }

  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-2">
      <div className="max-h-40 overflow-y-auto">
        {structure.map((s) => (
          <label key={s.id} className="flex items-center gap-1 text-[11px]">
            <input type="checkbox" checked={draft.includes(s.id)} onChange={() => toggle(s.id)} />
            <span className="font-mono text-slate-400">{s.code}</span> {s.label}
          </label>
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        <button
          onClick={() => {
            onSave(draft);
            setOpen(false);
          }}
          disabled={pending}
          className="rounded bg-brand-emerald px-2 py-0.5 text-[10px] text-white"
        >
          Enregistrer
        </button>
        <button onClick={() => setOpen(false)} className="text-[10px] text-slate-500">
          Annuler
        </button>
      </div>
    </div>
  );
}
