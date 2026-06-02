"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FlatRow } from "@/lib/budget-grid";
import { cellKey, totalKey, aggregateMonths } from "@/lib/budget-grid";
import { repartir, sumMonths } from "@/lib/budget-calc";
import { formatEur, formatEcart, MONTHS_FR } from "@/lib/format";
import {
  saveGrid,
  addYear,
  removeYear,
  type MonthlyChange,
  type TotalChange,
} from "@/app/(app)/interne/actions";

export function InterneGrid({
  budgetId,
  budgetName,
  rows,
  years,
  monthly,
  totals,
}: {
  budgetId: string;
  budgetName: string;
  rows: FlatRow[];
  years: number[];
  monthly: Record<string, number>;
  totals: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Copies de travail (mode édition par lot, P7 / BR-9.1).
  const [work, setWork] = useState<Record<string, number>>(monthly);
  const [workTotals, setWorkTotals] = useState<Record<string, number>>(totals);
  const [dirty, setDirty] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  // BR-9.2 — garde-fou : confirmation avant de quitter si modifs non enregistrées.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const leaves = useMemo(() => rows.filter((r) => r.level === 3), [rows]);

  function setCell(lineId: string, year: number, monthIdx: number, value: number) {
    setWork((w) => ({ ...w, [cellKey(lineId, year, monthIdx + 1)]: value }));
    setDirty(true);
  }
  function setTotal(lineId: string, year: number, value: number) {
    setWorkTotals((t) => ({ ...t, [totalKey(lineId, year)]: value }));
    setDirty(true);
  }

  // BR-1.2 — Répartir le total sur les 12 mois (avertissement si écrasement).
  function doRepartir(lineId: string, year: number) {
    const months = leafMonths(lineId, year, work);
    const total = workTotals[totalKey(lineId, year)] ?? sumMonths(months);
    const hasExisting = months.some((m) => m !== 0);
    if (hasExisting) {
      const ok = window.confirm(
        "Des montants existent déjà sur cette ligne. Les écraser par la répartition ?",
      );
      if (!ok) return;
    }
    const dist = repartir(total);
    setWork((w) => {
      const next = { ...w };
      for (let m = 0; m < 12; m++) next[cellKey(lineId, year, m + 1)] = dist[m];
      return next;
    });
    setWorkTotals((t) => ({ ...t, [totalKey(lineId, year)]: total }));
    setDirty(true);
  }

  // BR-1.3 — Mettre à jour le total = Σ des 12 mois (écart → 0).
  function doMajTotal(lineId: string, year: number) {
    const s = sumMonths(leafMonths(lineId, year, work));
    setTotal(lineId, year, s);
  }

  function save() {
    setError(null);
    const monthlyChanges: MonthlyChange[] = [];
    for (const leaf of leaves) {
      for (const year of years) {
        for (let m = 1; m <= 12; m++) {
          const k = cellKey(leaf.id, year, m);
          const cur = work[k] ?? 0;
          const orig = monthly[k] ?? 0;
          if (cur !== orig) {
            monthlyChanges.push({ line_id: leaf.id, year, month: m, amount: cur });
          }
        }
      }
    }
    const totalChanges: TotalChange[] = [];
    for (const k of Object.keys(workTotals)) {
      if (workTotals[k] !== totals[k]) {
        const [line_id, year] = k.split(":");
        totalChanges.push({ line_id, year: Number(year), total_input: workTotals[k] });
      }
    }

    startTransition(async () => {
      const res = await saveGrid(budgetId, monthlyChanges, totalChanges);
      if (!res.ok) {
        setError(res.error ?? "Échec de l'enregistrement.");
        return;
      }
      setDirty(false);
      setEditing(false);
      router.refresh();
    });
  }

  function cancel() {
    setWork(monthly);
    setWorkTotals(totals);
    setDirty(false);
    setEditing(false);
  }

  function refresh() {
    if (dirty && !window.confirm("Des modifications non enregistrées seront perdues. Continuer ?"))
      return;
    setDirty(false);
    router.refresh();
  }

  function onAddYear() {
    const next = years.length ? Math.max(...years) + 1 : new Date().getFullYear();
    const input = window.prompt("Année à ajouter", String(next));
    if (!input) return;
    const year = Number(input);
    if (!Number.isInteger(year)) return;
    startTransition(async () => {
      const res = await addYear(budgetId, year);
      if (!res.ok) setError(res.error ?? "Erreur.");
      else router.refresh();
    });
  }

  function onRemoveYear(year: number) {
    if (
      !window.confirm(
        `Retirer l'année ${year} ? Toutes ses saisies seront supprimées (perte de données).`,
      )
    )
      return;
    startTransition(async () => {
      const res = await removeYear(budgetId, year);
      if (!res.ok) setError(res.error ?? "Erreur.");
      else router.refresh();
    });
  }

  function toggleYear(year: number) {
    setCollapsed((c) => {
      const n = new Set(c);
      n.has(year) ? n.delete(year) : n.add(year);
      return n;
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-xl font-bold text-brand-night">{budgetName}</h1>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="rounded bg-brand-night px-3 py-1.5 text-sm text-white"
          >
            Éditer
          </button>
        ) : (
          <>
            <button
              onClick={save}
              disabled={pending}
              className="rounded bg-brand-emerald px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Enregistrer
            </button>
            <button
              onClick={cancel}
              disabled={pending}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
            >
              Annuler
            </button>
          </>
        )}
        <button
          onClick={refresh}
          disabled={pending}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
        >
          Rafraîchir
        </button>
        <button
          onClick={onAddYear}
          disabled={pending}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
        >
          + Année
        </button>
        {dirty && (
          <span className="flex items-center gap-1 text-sm text-alert">
            ● modifications non enregistrées
          </span>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded border border-alert/30 bg-red-50 p-2 text-sm text-alert">
          {error}
        </p>
      )}

      {years.length === 0 && (
        <p className="text-sm text-slate-500">
          Aucune année. Ajoutez une année pour saisir le prévisionnel.
        </p>
      )}

      {years.map((year) => (
        <YearBlock
          key={year}
          year={year}
          rows={rows}
          work={work}
          workTotals={workTotals}
          editing={editing}
          collapsed={collapsed.has(year)}
          onToggle={() => toggleYear(year)}
          onRemove={() => onRemoveYear(year)}
          setCell={setCell}
          setTotal={setTotal}
          doRepartir={doRepartir}
          doMajTotal={doMajTotal}
        />
      ))}
    </div>
  );
}

// Σ des mois d'une LB niveau 3 dans la copie de travail.
function leafMonths(lineId: string, year: number, work: Record<string, number>): number[] {
  return Array.from({ length: 12 }, (_, i) => work[cellKey(lineId, year, i + 1)] ?? 0);
}

function YearBlock({
  year,
  rows,
  work,
  workTotals,
  editing,
  collapsed,
  onToggle,
  onRemove,
  setCell,
  setTotal,
  doRepartir,
  doMajTotal,
}: {
  year: number;
  rows: FlatRow[];
  work: Record<string, number>;
  workTotals: Record<string, number>;
  editing: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onRemove: () => void;
  setCell: (lineId: string, year: number, monthIdx: number, value: number) => void;
  setTotal: (lineId: string, year: number, value: number) => void;
  doRepartir: (lineId: string, year: number) => void;
  doMajTotal: (lineId: string, year: number) => void;
}) {
  return (
    <div className="mb-4 overflow-hidden rounded border border-slate-200 bg-white">
      <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
        <button onClick={onToggle} className="font-heading text-sm font-bold text-brand-night">
          {collapsed ? "▶" : "▼"} {year}
        </button>
        <button onClick={onRemove} className="text-xs text-alert hover:underline">
          retirer année
        </button>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="sticky left-0 bg-white px-2 py-1 text-left">Code · Ligne</th>
                <th className="px-2 py-1 text-right">Total</th>
                <th className="px-2 py-1 text-right">Σ mois</th>
                <th className="px-2 py-1 text-right">Écart</th>
                {MONTHS_FR.map((m) => (
                  <th key={m} className="px-2 py-1 text-right">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <GridRow
                  key={row.id}
                  row={row}
                  year={year}
                  work={work}
                  workTotals={workTotals}
                  editing={editing}
                  setCell={setCell}
                  setTotal={setTotal}
                  doRepartir={doRepartir}
                  doMajTotal={doMajTotal}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GridRow({
  row,
  year,
  work,
  workTotals,
  editing,
  setCell,
  setTotal,
  doRepartir,
  doMajTotal,
}: {
  row: FlatRow;
  year: number;
  work: Record<string, number>;
  workTotals: Record<string, number>;
  editing: boolean;
  setCell: (lineId: string, year: number, monthIdx: number, value: number) => void;
  setTotal: (lineId: string, year: number, value: number) => void;
  doRepartir: (lineId: string, year: number) => void;
  doMajTotal: (lineId: string, year: number) => void;
}) {
  const isLeaf = row.level === 3;

  // Niveau 1/2 : agrégation des feuilles (lecture seule, total = Σ mois).
  const months = isLeaf
    ? leafMonths(row.id, year, work)
    : aggregateMonths(row.leafIds, year, work);
  const sumM = sumMonths(months);
  const totalInput = isLeaf ? workTotals[totalKey(row.id, year)] ?? sumM : sumM;
  const ecartVal = totalInput - sumM;
  const hasEcart = isLeaf && ecartVal !== 0;

  return (
    <tr className={`border-b border-slate-50 ${isLeaf ? "" : "bg-slate-50/60 font-medium"}`}>
      <td
        className="sticky left-0 bg-inherit px-2 py-1 text-left"
        style={{ paddingLeft: 8 + row.depth * 14 }}
      >
        <span className="mr-2 font-mono text-[10px] text-slate-400">{row.code}</span>
        {row.label}
        {isLeaf && editing && (
          <span className="ml-2 inline-flex gap-1">
            <button
              onClick={() => doRepartir(row.id, year)}
              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-200"
              title="Répartir le total sur 12 mois (BR-1.2)"
            >
              Répartir
            </button>
            <button
              onClick={() => doMajTotal(row.id, year)}
              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-200"
              title="Total = Σ mois (BR-1.3)"
            >
              Maj total
            </button>
          </span>
        )}
      </td>

      {/* Total */}
      <td className={`px-2 py-1 text-right ${hasEcart ? "text-alert" : ""}`}>
        {isLeaf && editing ? (
          <input
            type="number"
            value={totalInput}
            onChange={(e) => setTotal(row.id, year, Number(e.target.value) || 0)}
            className="w-20 rounded border border-slate-300 px-1 py-0.5 text-right text-input"
          />
        ) : (
          formatEur(totalInput)
        )}
      </td>
      {/* Σ mois */}
      <td className="px-2 py-1 text-right text-slate-500">{formatEur(sumM)}</td>
      {/* Écart */}
      <td className={`px-2 py-1 text-right ${hasEcart ? "font-medium text-alert" : "text-slate-400"}`}>
        {hasEcart ? formatEcart(ecartVal) : "—"}
      </td>

      {/* 12 mois */}
      {months.map((val, i) => (
        <td key={i} className="px-2 py-1 text-right">
          {isLeaf && editing ? (
            <input
              type="number"
              value={val}
              onChange={(e) => setCell(row.id, year, i, Number(e.target.value) || 0)}
              className="w-16 rounded border border-slate-300 px-1 py-0.5 text-right text-input"
            />
          ) : val !== 0 ? (
            formatEur(val)
          ) : (
            <span className="text-slate-300">·</span>
          )}
        </td>
      ))}
    </tr>
  );
}
