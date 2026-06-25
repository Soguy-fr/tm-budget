"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Bailleur, BailleurLine, StructureLine, Funder } from "@/lib/types";
import { formatEur, MONTHS_FR } from "@/lib/format";
import {
  derivedExpenseForLine,
  totalAssignedExpenses,
  realisedExpenseForLine,
  totalRealisedExpenses,
  fundGap,
  nonAssigne,
} from "@/lib/bailleur-report";
import {
  addBailleurLine,
  deleteBailleurLine,
  setLineMapping,
  saveIncome,
  assignLinesToBudget,
  updateFinancement,
} from "@/app/(app)/bailleurs/actions";
import { getBailleurPack } from "@/app/(app)/bailleurs/pack-action";

type Plan = { line_id: string; amount: number; bailleur_id: string | null };
export type GlLite = {
  line_id: string | null;
  bailleur_id: string | null;
  amount: number;
  entry_type: "Dépense" | "Recette";
  archived: boolean;
};

export function BailleurDetail({
  bailleur,
  funders,
  lines,
  mappingByLine,
  structure,
  planMonthly,
  glEntries,
  income,
  years,
}: {
  bailleur: Bailleur;
  funders: Funder[];
  lines: BailleurLine[];
  mappingByLine: Record<string, string[]>;
  structure: StructureLine[];
  planMonthly: Plan[];
  glEntries: GlLite[];
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

  // BR-3.4 — Dépensé (GL) + écarts vs montant_total.
  const totalDepense = totalRealisedExpenses(glEntries, bailleur.id);
  const gapBudget = fundGap(bailleur.montant_total, depensesAssignees);
  const gapDepense = fundGap(bailleur.montant_total, totalDepense);
  const funderName = funders.find((f) => f.id === bailleur.funder_id)?.name ?? null;

  // BR-3.5 — bouton « Assigner les lignes dans le budget » (avec confirmation des conflits).
  function assignLines() {
    setError(null);
    startTransition(async () => {
      const res = await assignLinesToBudget(bailleur.id, false);
      if (!res.ok) {
        setError(res.error ?? "Erreur.");
        return;
      }
      if (res.conflicts && res.conflicts > 0) {
        const ok = window.confirm(
          `${res.conflicts} maille(s) (LB × mois) sont déjà imputées à un AUTRE financement.\n\n` +
            "Les écraser et les imputer à ce financement ? (les mailles déjà à ce financement ou libres sont assignées sans confirmation)",
        );
        if (!ok) return;
        const res2 = await assignLinesToBudget(bailleur.id, true);
        if (!res2.ok) {
          setError(res2.error ?? "Erreur.");
          return;
        }
      }
      router.refresh();
    });
  }

  // ── Ajout ligne bailleur ──────────────────────────────────────────────────
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");

  return (
    <div className="mt-2 max-w-5xl">
      <h1 className="flex items-center gap-2 text-xl font-bold text-brand-night">
        <span className="inline-block h-4 w-4 rounded-sm" style={{ background: bailleur.color }} />
        {bailleur.reference || bailleur.code} — {bailleur.name}
      </h1>
      <div className="mb-1 text-sm text-slate-500">
        {funderName && <>Bailleur : <span className="font-medium text-brand-night">{funderName}</span> · </>}
        {bailleur.convention_start && bailleur.convention_end
          ? `Éligibilité ${bailleur.convention_start} → ${bailleur.convention_end}`
          : "Éligibilité non renseignée"}
        {bailleur.montant_total != null &&
          ` · Montant total : ${formatEur(Number(bailleur.montant_total))}`}
      </div>
      {bailleur.description && (
        <p className="mb-2 max-w-3xl text-sm text-slate-600">{bailleur.description}</p>
      )}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative flex gap-2">
          {/* F4.12/BR-3.5 — assigner les LB mappées sur la fenêtre d'éligibilité */}
          <button
            disabled={pending}
            onClick={assignLines}
            className="rounded bg-brand-night px-3 py-1.5 text-sm text-white disabled:opacity-40"
            title="Impute les LB mappées à ce financement sur sa fenêtre d'éligibilité"
          >
            Assigner les lignes dans le budget
          </button>
          <FinancementEdit bailleur={bailleur} funders={funders} pending={pending} run={run} />
        </div>
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
              <th className="px-2 py-1 text-right">Budgété</th>
              <th className="px-2 py-1 text-right">Dépensé</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const mapped = mappingByLine[l.id] ?? [];
              const total = derivedExpenseForLine(planMonthly, bailleur.id, mapped);
              const depense = realisedExpenseForLine(glEntries, bailleur.id, mapped);
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
                  <td className="px-2 py-1 text-right text-slate-600">{formatEur(depense)}</td>
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
              <td colSpan={2}></td>
            </tr>
            <tr className="font-medium">
              <td className="px-2 py-1" colSpan={3}>
                Total
              </td>
              <td className="px-2 py-1 text-right">{formatEur(depensesAssignees)}</td>
              <td className="px-2 py-1 text-right">{formatEur(totalDepense)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* BR-3.4 — récap écarts vs montant total du fonds */}
      {bailleur.montant_total != null && (
        <p className="mt-1 text-xs text-slate-500">
          Fonds {formatEur(Number(bailleur.montant_total))} ·{" "}
          <span className={gapBudget != null && gapBudget < 0 ? "text-alert" : ""}>
            {gapBudget != null && gapBudget >= 0
              ? `reste ${formatEur(gapBudget)} à budgéter`
              : `sur-budgété de ${formatEur(Math.abs(gapBudget ?? 0))}`}
          </span>
          {" · "}
          <span className={gapDepense != null && gapDepense < 0 ? "text-alert" : ""}>
            {gapDepense != null && gapDepense >= 0
              ? `${formatEur(gapDepense)} non encore dépensés`
              : `dépassement de ${formatEur(Math.abs(gapDepense ?? 0))}`}
          </span>
        </p>
      )}
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

// F4.10 — Éditer les champs d'un financement (acteur, référence, montant, éligibilité, description).
function FinancementEdit({
  bailleur,
  funders,
  pending,
  run,
}: {
  bailleur: Bailleur;
  funders: Funder[];
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    funder_id: bailleur.funder_id ?? "",
    reference: bailleur.reference ?? "",
    montant_total: bailleur.montant_total != null ? String(bailleur.montant_total) : "",
    convention_start: bailleur.convention_start ?? "",
    convention_end: bailleur.convention_end ?? "",
    description: bailleur.description ?? "",
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={pending}
        className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
      >
        Modifier
      </button>
    );
  }

  return (
    <div className="absolute z-10 mt-10 w-[28rem] space-y-2 rounded border border-slate-300 bg-white p-3 shadow">
      <div className="flex gap-2">
        <input
          placeholder="Référence (JFN-001)"
          value={f.reference}
          onChange={(e) => setF({ ...f, reference: e.target.value })}
          className="w-36 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          type="number"
          placeholder="Montant total (€)"
          value={f.montant_total}
          onChange={(e) => setF({ ...f, montant_total: e.target.value })}
          className="flex-1 rounded border border-slate-300 px-2 py-1 text-right text-sm text-input"
        />
      </div>
      <select
        value={f.funder_id}
        onChange={(e) => setF({ ...f, funder_id: e.target.value })}
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
      >
        <option value="">— bailleur (acteur) : aucun —</option>
        {funders.map((fn) => (
          <option key={fn.id} value={fn.id}>{fn.name}</option>
        ))}
      </select>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Éligibilité</span>
        <input
          type="date"
          value={f.convention_start}
          onChange={(e) => setF({ ...f, convention_start: e.target.value })}
          className="rounded border border-slate-300 px-2 py-1"
        />
        <span>→</span>
        <input
          type="date"
          value={f.convention_end}
          onChange={(e) => setF({ ...f, convention_end: e.target.value })}
          className="rounded border border-slate-300 px-2 py-1"
        />
      </div>
      <textarea
        placeholder="Description du fonds"
        value={f.description}
        onChange={(e) => setF({ ...f, description: e.target.value })}
        rows={2}
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            run(() =>
              updateFinancement(bailleur.id, {
                funder_id: f.funder_id || null,
                reference: f.reference || null,
                description: f.description || null,
                montant_total: f.montant_total ? Number(f.montant_total) : null,
                convention_start: f.convention_start || null,
                convention_end: f.convention_end || null,
              }),
            );
            setOpen(false);
          }}
          disabled={pending}
          className="rounded bg-brand-emerald px-3 py-1 text-sm text-white"
        >
          Enregistrer
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600"
        >
          Annuler
        </button>
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
