"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FlatRow } from "@/lib/budget-grid";
import { cellKey, totalKey, aggregateMonths } from "@/lib/budget-grid";
import { repartir, sumMonths } from "@/lib/budget-calc";
import {
  fluxBudgeted,
  fluxReal,
  chainCumulative,
  lastClosedMonthIndexExplicit,
} from "@/lib/treasury";
import type { ClosureRow } from "@/lib/closure";
import { formatEur, formatEcart, MONTHS_FR } from "@/lib/format";
import type { Bailleur } from "@/lib/types";
import {
  saveGrid,
  addYear,
  removeYear,
  type MonthlyChange,
  type TotalChange,
  type BailleurChange,
} from "@/app/(app)/interne/actions";

const UNASSIGNED = "#cbd5e1"; // gris ardoise — non assigné

export function InterneGrid({
  budgetId,
  budgetName,
  rows,
  years,
  monthly,
  totals,
  bailleurs,
  bailleurByCell,
  realise,
  initialCash,
  incomePrevu,
  recReel,
  depReel,
  closures = [],
}: {
  budgetId: string;
  budgetName: string;
  rows: FlatRow[];
  years: number[];
  monthly: Record<string, number>;
  totals: Record<string, number>;
  bailleurs: Bailleur[];
  bailleurByCell: Record<string, string | null>;
  realise: Record<string, number>;
  initialCash: number;
  incomePrevu: Record<string, number>;
  recReel: Record<string, number>;
  depReel: Record<string, number>;
  closures?: ClosureRow[]; // BR-11.1 — clôtures explicites (M de la tréso réelle)
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [showBailleur, setShowBailleur] = useState(false);
  const [showSuivi, setShowSuivi] = useState(false);
  const [showTreso, setShowTreso] = useState(false);
  const [tresoMode, setTresoMode] = useState<"budget" | "reel">("budget");
  const [error, setError] = useState<string | null>(null);

  const [work, setWork] = useState<Record<string, number>>(monthly);
  const [workTotals, setWorkTotals] = useState<Record<string, number>>(totals);
  const [workBailleur, setWorkBailleur] = useState<Record<string, string | null>>(
    bailleurByCell,
  );
  const [dirty, setDirty] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  // BR-8.3 — lignes budgétaires repliées (ids de LB niv.1/2). Affichage seul.
  const [collapsedLines, setCollapsedLines] = useState<Set<string>>(new Set());
  // F1.6 — masquer les LB vides (somme nulle sur toutes les années).
  const [hideEmpty, setHideEmpty] = useState(false);
  const [hideMonths, setHideMonths] = useState(false);
  const [yearFilter, setYearFilter] = useState<number | null>(null);

  // P-BUG-1 — resynchroniser les copies de travail quand les props serveur
  // changent (router.refresh / revalidation). Sans ça, « Rafraîchir » n'a aucun
  // effet visible car useState ne lit l'initial qu'au premier rendu.
  useEffect(() => {
    if (dirty) return; // ne pas écraser des saisies non enregistrées
    setWork(monthly);
    setWorkTotals(totals);
    setWorkBailleur(bailleurByCell);
  }, [monthly, totals, bailleurByCell, dirty]);

  const colorOf = useMemo(() => {
    const map = new Map(bailleurs.map((b) => [b.id, b.color]));
    return (id: string | null) => (id ? map.get(id) ?? UNASSIGNED : UNASSIGNED);
  }, [bailleurs]);

  // F5.12 — au chargement, scroller vers la LB ciblée par l'ancre (#lb-<id>).
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-brand-emerald");
      const t = setTimeout(() => el.classList.remove("ring-2", "ring-brand-emerald"), 2000);
      return () => clearTimeout(t);
    }
  }, []);

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

  // BR-7.* — cumul de trésorerie chaîné sur toutes les années, selon le mode.
  const tresoByYear = useMemo(() => {
    const m12 = <T,>(fn: (i: number) => T) => Array.from({ length: 12 }, (_, i) => fn(i));
    const flat: number[] = [];
    for (const year of years) {
      const depBud = m12((i) =>
        leaves.reduce((s, l) => s + (work[cellKey(l.id, year, i + 1)] ?? 0), 0),
      );
      const recBud = m12((i) => incomePrevu[`${year}:${i + 1}`] ?? 0);
      let flux: number[];
      if (tresoMode === "budget") {
        flux = fluxBudgeted(recBud, depBud);
      } else {
        const M = lastClosedMonthIndexExplicit(year, closures);
        const recR = m12((i) => recReel[`${year}:${i + 1}`] ?? 0);
        const depR = m12((i) => depReel[`${year}:${i + 1}`] ?? 0);
        flux = fluxReal(M, recR, depR, recBud, depBud);
      }
      flat.push(...flux);
    }
    const cumul = chainCumulative(initialCash, flat);
    const byYear: Record<number, number[]> = {};
    years.forEach((y, idx) => {
      byYear[y] = cumul.slice(idx * 12, idx * 12 + 12);
    });
    return byYear;
  }, [years, leaves, work, incomePrevu, recReel, depReel, initialCash, tresoMode]);

  function setCell(lineId: string, year: number, monthIdx: number, value: number) {
    setWork((w) => ({ ...w, [cellKey(lineId, year, monthIdx + 1)]: value }));
    setDirty(true);
  }
  function setTotal(lineId: string, year: number, value: number) {
    setWorkTotals((t) => ({ ...t, [totalKey(lineId, year)]: value }));
    setDirty(true);
  }
  // F3.9 / P4 — un seul bailleur par maille (le select remplace).
  function setBailleur(lineId: string, year: number, monthIdx: number, b: string | null) {
    setWorkBailleur((m) => ({ ...m, [cellKey(lineId, year, monthIdx + 1)]: b }));
    setDirty(true);
  }

  function doRepartir(lineId: string, year: number) {
    const months = leafMonths(lineId, year, work);
    const total = workTotals[totalKey(lineId, year)] ?? sumMonths(months);
    if (months.some((m) => m !== 0)) {
      if (!window.confirm("Des montants existent déjà sur cette ligne. Les écraser ?")) return;
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

  function doMajTotal(lineId: string, year: number) {
    setTotal(lineId, year, sumMonths(leafMonths(lineId, year, work)));
  }

  // F3.14 — ouvrir le Grand Livre filtré sur (LB × année × mois).
  // Clic cellule → GL filtré. Pour une catégorie (niv.1/2) : filtre sur TOUTES ses
  // feuilles descendantes (les écritures sont allouées aux feuilles). `from=interne`.
  function openGl(lineIds: string[] | null, year: number, monthIdx: number) {
    const p = new URLSearchParams({ year: String(year), month: String(monthIdx + 1), from: "interne" });
    if (lineIds && lineIds.length) p.set("line", lineIds.join(","));
    router.push(`/grand-livre?${p.toString()}`);
  }

  function save() {
    setError(null);
    const monthlyChanges: MonthlyChange[] = [];
    const bailleurChanges: BailleurChange[] = [];
    for (const leaf of leaves) {
      for (const year of years) {
        for (let m = 1; m <= 12; m++) {
          const k = cellKey(leaf.id, year, m);
          if ((work[k] ?? 0) !== (monthly[k] ?? 0)) {
            monthlyChanges.push({ line_id: leaf.id, year, month: m, amount: work[k] ?? 0 });
          }
          const wb = workBailleur[k] ?? null;
          if (wb !== (bailleurByCell[k] ?? null)) {
            bailleurChanges.push({ line_id: leaf.id, year, month: m, bailleur_id: wb });
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
      const res = await saveGrid(budgetId, monthlyChanges, totalChanges, bailleurChanges);
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
    setWorkBailleur(bailleurByCell);
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
    if (!window.confirm(`Retirer l'année ${year} ? Toutes ses saisies seront supprimées.`)) return;
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

  // BR-8.3 — accordéon des lignes budgétaires.
  function toggleLine(id: string) {
    setCollapsedLines((c) => {
      const n = new Set(c);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function expandAllLines() {
    setCollapsedLines(new Set());
  }
  // Replie toutes les LB d'un niveau donné (1 → catégories seules ; 2 → cat.+sous-cat.).
  function collapseToLevel(level: 1 | 2) {
    setCollapsedLines(new Set(rows.filter((r) => r.level === level && r.hasChildren).map((r) => r.id)));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-xl font-bold text-brand-night">{budgetName}</h1>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="rounded bg-brand-night px-3 py-1.5 text-sm text-white">
            Éditer
          </button>
        ) : (
          <>
            <button onClick={save} disabled={pending} className="rounded bg-brand-emerald px-3 py-1.5 text-sm text-white disabled:opacity-50">
              Enregistrer
            </button>
            <button onClick={cancel} disabled={pending} className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600">
              Annuler
            </button>
          </>
        )}
        <button onClick={refresh} disabled={pending} className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600">
          Rafraîchir
        </button>
        <button
          onClick={() => setShowBailleur((v) => !v)}
          className={`rounded px-3 py-1.5 text-sm ${
            showBailleur ? "bg-brand-night text-white" : "border border-slate-300 text-slate-600"
          }`}
        >
          Afficher bailleur
        </button>
        <button
          onClick={() => setShowSuivi((v) => !v)}
          className={`rounded px-3 py-1.5 text-sm ${
            showSuivi ? "bg-brand-night text-white" : "border border-slate-300 text-slate-600"
          }`}
        >
          Suivi des dépenses
        </button>
        <button
          onClick={() => setShowTreso((v) => !v)}
          className={`rounded px-3 py-1.5 text-sm ${
            showTreso ? "bg-brand-night text-white" : "border border-slate-300 text-slate-600"
          }`}
        >
          Solde tréso
        </button>
        {showTreso && (
          <select
            value={tresoMode}
            onChange={(e) => setTresoMode(e.target.value as "budget" | "reel")}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="budget">Budgété</option>
            <option value="reel">Réel (glissant)</option>
          </select>
        )}
        <button onClick={onAddYear} disabled={pending} className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600">
          + Année
        </button>
        {dirty && <span className="text-sm text-alert">● modifications non enregistrées</span>}
      </div>

      {/* BR-8.3 — niveau d'affichage des lignes budgétaires */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400">Affichage :</span>
        <button onClick={() => collapseToLevel(1)} className="rounded border border-slate-300 px-3 py-1 font-medium text-slate-600 hover:bg-slate-100" title="Niveau 1 — catégories seules">
          1
        </button>
        <button onClick={() => collapseToLevel(2)} className="rounded border border-slate-300 px-3 py-1 font-medium text-slate-600 hover:bg-slate-100" title="Niveaux 1 et 2">
          2
        </button>
        <button onClick={expandAllLines} className="rounded border border-slate-300 px-3 py-1 font-medium text-slate-600 hover:bg-slate-100" title="Niveau 3 — tout déplier">
          3
        </button>
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <button
          onClick={() => setHideEmpty((v) => !v)}
          className={`rounded border px-3 py-1 font-medium ${
            hideEmpty
              ? "border-brand-emerald bg-emerald-50 text-brand-night"
              : "border-slate-300 text-slate-600 hover:bg-slate-100"
          }`}
          title="F1.6 — masquer les lignes dont le montant est nul sur toutes les années"
        >
          {hideEmpty ? "✓ " : ""}Masquer vides
        </button>
        <button
          onClick={() => setHideMonths((v) => !v)}
          className={`rounded border px-3 py-1 font-medium ${
            hideMonths
              ? "border-brand-emerald bg-emerald-50 text-brand-night"
              : "border-slate-300 text-slate-600 hover:bg-slate-100"
          }`}
          title="Replier les colonnes de mois (ne garder que le Total)"
        >
          {hideMonths ? "✓ " : ""}Replier les mois
        </button>
        {years.length > 1 && (
          <>
            <span className="mx-1 h-4 w-px bg-slate-200" />
            <span className="text-slate-400">Année :</span>
            <select
              value={yearFilter ?? ""}
              onChange={(e) => setYearFilter(e.target.value ? Number(e.target.value) : null)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">Toutes</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {showBailleur && (
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="font-medium">Légende :</span>
          {bailleurs.map((b) => (
            <span key={b.id} className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: b.color }} />
              {b.reference || b.code}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: UNASSIGNED }} />
            non assigné
          </span>
        </div>
      )}

      {error && (
        <p className="mb-3 rounded border border-alert/30 bg-red-50 p-2 text-sm text-alert">{error}</p>
      )}

      {years.length === 0 && (
        <p className="text-sm text-slate-500">Aucune année. Ajoutez une année pour saisir.</p>
      )}

      {(yearFilter ? years.filter((y) => y === yearFilter) : years).map((year) => (
        <YearBlock
          key={year}
          year={year}
          hideMonths={hideMonths}
          rows={rows}
          work={work}
          workTotals={workTotals}
          workBailleur={workBailleur}
          editing={editing}
          showBailleur={showBailleur}
          showSuivi={showSuivi}
          showTreso={showTreso}
          tresoMode={tresoMode}
          tresoCumul={tresoByYear[year] ?? []}
          realise={realise}
          bailleurs={bailleurs}
          colorOf={colorOf}
          collapsed={collapsed.has(year)}
          collapsedLines={collapsedLines}
          hideEmpty={hideEmpty}
          onToggleLine={toggleLine}
          onToggle={() => toggleYear(year)}
          onRemove={() => onRemoveYear(year)}
          setCell={setCell}
          setTotal={setTotal}
          setBailleur={setBailleur}
          doRepartir={doRepartir}
          doMajTotal={doMajTotal}
          openGl={openGl}
        />
      ))}
    </div>
  );
}

function leafMonths(lineId: string, year: number, work: Record<string, number>): number[] {
  return Array.from({ length: 12 }, (_, i) => work[cellKey(lineId, year, i + 1)] ?? 0);
}

type RowHandlers = {
  setCell: (lineId: string, year: number, monthIdx: number, value: number) => void;
  setTotal: (lineId: string, year: number, value: number) => void;
  setBailleur: (lineId: string, year: number, monthIdx: number, b: string | null) => void;
  doRepartir: (lineId: string, year: number) => void;
  doMajTotal: (lineId: string, year: number) => void;
  openGl: (lineIds: string[] | null, year: number, monthIdx: number) => void;
};

function YearBlock({
  year,
  hideMonths,
  rows,
  work,
  workTotals,
  workBailleur,
  editing,
  showBailleur,
  showSuivi,
  showTreso,
  tresoMode,
  tresoCumul,
  realise,
  bailleurs,
  colorOf,
  collapsed,
  collapsedLines,
  hideEmpty,
  onToggleLine,
  onToggle,
  onRemove,
  ...handlers
}: {
  year: number;
  hideMonths: boolean;
  rows: FlatRow[];
  work: Record<string, number>;
  workTotals: Record<string, number>;
  workBailleur: Record<string, string | null>;
  editing: boolean;
  showBailleur: boolean;
  showSuivi: boolean;
  showTreso: boolean;
  tresoMode: "budget" | "reel";
  tresoCumul: number[];
  realise: Record<string, number>;
  bailleurs: Bailleur[];
  colorOf: (id: string | null) => string;
  collapsed: boolean;
  collapsedLines: Set<string>;
  hideEmpty: boolean;
  onToggleLine: (id: string) => void;
  onToggle: () => void;
  onRemove: () => void;
} & RowHandlers) {
  // BR-8.4 — total annuel du budget = Σ de toutes les LB niveau 3.
  const leafRows = rows.filter((r) => r.level === 3);
  const yearTotal = leafRows.reduce((s, r) => s + sumMonths(leafMonths(r.id, year, work)), 0);
  // Réalisé annuel (Σ GL alloué) pour l'entête quand « Suivi » actif.
  const yearRealise = leafRows.reduce(
    (s, r) =>
      s + Array.from({ length: 12 }, (_, i) => realise[cellKey(r.id, year, i + 1)] ?? 0).reduce((a, b) => a + b, 0),
    0,
  );

  // F1.6 — lignes dont le montant AFFICHÉ cette année est nul (override total_input
  // pris en compte pour les feuilles, agrégat des mois pour les parents).
  const emptyThisYear = new Set<string>();
  if (hideEmpty) {
    for (const r of rows) {
      const disp =
        r.level === 3
          ? workTotals[totalKey(r.id, year)] ?? sumMonths(leafMonths(r.id, year, work))
          : sumMonths(aggregateMonths(r.leafIds, year, work));
      if (disp === 0) emptyThisYear.add(r.id);
    }
  }

  // BR-8.3 — masquer les descendants d'une ligne repliée.
  const visibleRows: FlatRow[] = [];
  let hideDepth = -1;
  for (const row of rows) {
    if (hideDepth >= 0 && row.depth > hideDepth) continue;
    hideDepth = -1;
    if (emptyThisYear.has(row.id)) continue; // F1.6 — LB vide (année affichée)
    visibleRows.push(row);
    if (row.hasChildren && collapsedLines.has(row.id)) hideDepth = row.depth;
  }

  return (
    <div className="mb-4 overflow-hidden rounded border border-slate-200 bg-white">
      <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
        <button onClick={onToggle} className="font-heading text-sm font-bold text-brand-night">
          {collapsed ? "▶" : "▼"} {year}
        </button>
        <span className="flex items-center gap-3">
          <span className="text-sm font-medium text-brand-night">
            Total {year} : {formatEur(yearTotal)}
            {showSuivi && (
              <>
                {" · réalisé "}
                <span className={yearRealise > yearTotal ? "font-bold text-alert" : "text-slate-500"}>
                  {formatEur(yearRealise)}
                </span>
              </>
            )}
          </span>
          <button onClick={onRemove} className="text-xs text-alert hover:underline">
            retirer année
          </button>
        </span>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="sticky left-0 bg-white px-2 py-1 text-left">Code · Ligne</th>
                <th className="px-2 py-1 text-right">Total</th>
                {!hideMonths && MONTHS_FR.map((m) => (
                  <th key={m} className="px-2 py-1 text-right">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <GridRow
                  key={row.id}
                  row={row}
                  year={year}
                  work={work}
                  workTotals={workTotals}
                  workBailleur={workBailleur}
                  editing={editing}
                  showBailleur={showBailleur}
                  showSuivi={showSuivi}
                  realise={realise}
                  bailleurs={bailleurs}
                  colorOf={colorOf}
                  collapsedLine={collapsedLines.has(row.id)}
                  onToggleLine={onToggleLine}
                  hideMonths={hideMonths}
                  {...handlers}
                />
              ))}

              {/* F3.11 / BR-7.4 — ligne « Solde trésorerie » (masquable, Budgété/Réel) */}
              {showTreso && (
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-medium">
                  <td className="sticky left-0 bg-inherit px-2 py-1 text-left">
                    Solde trésorerie ({tresoMode === "budget" ? "Budgété" : "Réel"})
                  </td>
                  <td />
                  {!hideMonths && Array.from({ length: 12 }, (_, i) => {
                    const v = tresoCumul[i] ?? 0;
                    return (
                      <td
                        key={i}
                        className={`px-2 py-1 text-right ${v < 0 ? "font-bold text-alert" : ""}`}
                      >
                        {formatEur(v)}
                      </td>
                    );
                  })}
                </tr>
              )}
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
  workBailleur,
  editing,
  showBailleur,
  showSuivi,
  realise,
  bailleurs,
  colorOf,
  collapsedLine,
  onToggleLine,
  hideMonths,
  setCell,
  setTotal,
  setBailleur,
  doRepartir,
  doMajTotal,
  openGl,
}: {
  row: FlatRow;
  year: number;
  hideMonths: boolean;
  work: Record<string, number>;
  workTotals: Record<string, number>;
  workBailleur: Record<string, string | null>;
  editing: boolean;
  showBailleur: boolean;
  showSuivi: boolean;
  realise: Record<string, number>;
  bailleurs: Bailleur[];
  colorOf: (id: string | null) => string;
  collapsedLine: boolean;
  onToggleLine: (id: string) => void;
} & RowHandlers) {
  const isLeaf = row.level === 3;
  const months = isLeaf ? leafMonths(row.id, year, work) : aggregateMonths(row.leafIds, year, work);
  const sumM = sumMonths(months);
  const totalInput = isLeaf ? workTotals[totalKey(row.id, year)] ?? sumM : sumM;
  const ecartVal = totalInput - sumM;
  const hasEcart = isLeaf && ecartVal !== 0;

  return (
    <>
      <tr className={`border-b border-slate-50 ${isLeaf ? "" : "bg-slate-50/60 font-medium"}`}>
        <td
          id={`lb-${row.id}`}
          title={row.comment ?? undefined}
          className={`sticky left-0 scroll-mt-24 bg-inherit px-2 py-1 text-left ${row.comment ? "cursor-help" : ""}`}
          style={{ paddingLeft: 8 + row.depth * 14 }}
        >
          {row.hasChildren ? (
            <button
              onClick={() => onToggleLine(row.id)}
              className="mr-1 inline-block w-3 text-[10px] text-slate-400 hover:text-slate-700"
              title={collapsedLine ? "Déplier" : "Replier"}
            >
              {collapsedLine ? "▶" : "▼"}
            </button>
          ) : (
            <span className="mr-1 inline-block w-3" />
          )}
          <span className="mr-2 font-mono text-[10px] text-slate-400">{row.code}</span>
          {row.label}
          {row.comment && <span className="ml-1 text-[10px] text-slate-400">💬</span>}
          {isLeaf && editing && (
            <span className="ml-2 inline-flex gap-1">
              <button onClick={() => doRepartir(row.id, year)} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-200" title="Répartir (BR-1.2)">
                Répartir
              </button>
              <button onClick={() => doMajTotal(row.id, year)} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-200" title="Total = Σ mois (BR-1.3)">
                Maj total
              </button>
            </span>
          )}
        </td>

        <td className={`px-2 py-1 text-right ${hasEcart ? "text-alert" : ""}`}>
          {isLeaf && editing ? (
            <input type="number" value={totalInput} onChange={(e) => setTotal(row.id, year, Number(e.target.value) || 0)} className="w-20 rounded border border-slate-300 px-1 py-0.5 text-right text-input" />
          ) : (
            <>
              {formatEur(totalInput)}
              {hasEcart && (
                <span className="ml-1 text-[10px]">({formatEcart(ecartVal)})</span>
              )}
            </>
          )}
        </td>

        {!hideMonths && months.map((val, i) => {
          const k = cellKey(row.id, year, i + 1);
          const b = isLeaf ? workBailleur[k] ?? null : null;
          // F3.8 / BR-2.3 — code couleur par cellule quand la couche est active.
          const tint =
            showBailleur && isLeaf && val !== 0
              ? { backgroundColor: hexWithAlpha(colorOf(b), 0.28) }
              : undefined;
          return (
            <td key={i} className="px-2 py-1 text-right" style={tint}>
              {isLeaf && editing ? (
                <input type="number" value={val} onChange={(e) => setCell(row.id, year, i, Number(e.target.value) || 0)} className="w-16 rounded border border-slate-300 px-1 py-0.5 text-right text-input" />
              ) : (
                // Montant budgété (lecture). Le clic d'ouverture du GL est sur la ligne RÉALISÉ.
                <span className="text-right">
                  {val !== 0 ? formatEur(val) : <span className="text-slate-300">·</span>}
                </span>
              )}
            </td>
          );
        })}
      </tr>

      {/* F3.9 — ligne « ↳ bailleur » sous chaque LB en mode édition (décision G.) */}
      {isLeaf && editing && (
        <tr className="border-b border-slate-100 bg-slate-50/40">
          <td className="sticky left-0 bg-inherit px-2 py-1 text-left text-[10px] text-slate-400" style={{ paddingLeft: 20 + row.depth * 14 }}>
            ↳ bailleur
          </td>
          <td />
          {!hideMonths && months.map((_, i) => {
            const k = cellKey(row.id, year, i + 1);
            const b = workBailleur[k] ?? "";
            return (
              <td key={i} className="px-1 py-1">
                <select
                  value={b}
                  onChange={(e) => setBailleur(row.id, year, i, e.target.value || null)}
                  className="w-16 rounded border border-slate-300 px-0.5 py-0.5 text-[10px]"
                  style={{ background: b ? hexWithAlpha(colorOf(b), 0.28) : undefined }}
                >
                  <option value="">—</option>
                  {bailleurs.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.reference || opt.code}
                    </option>
                  ))}
                </select>
              </td>
            );
          })}
        </tr>
      )}

      {/* F3.10 / BR-5.3 — ligne réalisé (lecture seule), toutes LB (niv.1/2 agrégé),
          visible même repliée pour voir les dépenses par catégorie */}
      {showSuivi && (() => {
        const ids = isLeaf ? [row.id] : row.leafIds;
        const realiseMonths = Array.from({ length: 12 }, (_, i) =>
          ids.reduce((s, id) => s + (realise[cellKey(id, year, i + 1)] ?? 0), 0),
        );
        const realiseTotal = realiseMonths.reduce((a, b) => a + b, 0);
        return (
          <tr className="border-b border-slate-100 bg-emerald-50/40 text-slate-500">
            <td className="sticky left-0 bg-inherit px-2 py-1 text-left text-[10px]" style={{ paddingLeft: 20 + row.depth * 14 }}>
              ↳ réalisé
            </td>
            <td className={`px-2 py-1 text-right text-[11px] ${realiseTotal > sumM ? "font-medium text-alert" : ""}`}>
              {formatEur(realiseTotal)}
            </td>
            {!hideMonths && realiseMonths.map((r, i) => {
              const over = r > (months[i] ?? 0); // BR-5.2 — dépassement en rouge
              return (
                <td key={i} className={`px-2 py-1 text-right text-[11px] ${over ? "font-medium text-alert" : ""}`}>
                  {/* F3.14 — clic sur le réalisé → Grand Livre filtré (LB/feuilles + mois) */}
                  <button
                    onClick={() => openGl(ids, year, i)}
                    className="w-full cursor-pointer text-right hover:text-brand-emerald hover:underline"
                    title="Voir les écritures dans le Grand Livre"
                  >
                    {r !== 0 ? formatEur(r) : <span className="text-slate-300">·</span>}
                  </button>
                </td>
              );
            })}
          </tr>
        );
      })()}
    </>
  );
}

// Hex (#rrggbb) + alpha → rgba.
function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
