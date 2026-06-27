"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Budget } from "@/lib/types";
import { formatEur } from "@/lib/format";
import type { CoverageYearSummary } from "@/lib/coverage";
import {
  createBudget,
  setActiveBudget,
  duplicateBudget,
  updateInitialCash,
} from "@/app/(app)/budgets/actions";

export function BudgetList({
  budgets,
  yearsByBudget,
  coverageByBudget = {},
}: {
  budgets: Budget[];
  yearsByBudget: Record<string, number[]>;
  coverageByBudget?: Record<string, CoverageYearSummary[]>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Erreur.");
      else router.refresh();
    });
  }

  return (
    <div className="max-w-3xl">
      {error && (
        <p className="mb-3 rounded border border-alert/30 bg-red-50 p-2 text-sm text-alert">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) {
            run(() => createBudget(newName));
            setNewName("");
          }
        }}
        className="mb-4 flex gap-2"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nom du nouveau budget (ex : Budget 2026 v1)"
          className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-brand-night px-3 py-1.5 text-sm text-white"
        >
          + Créer
        </button>
      </form>

      <div className="space-y-2">
        {budgets.length === 0 && (
          <p className="text-sm text-slate-500">Aucun budget. Créez-en un.</p>
        )}
        {budgets.map((b) => (
          <BudgetRow
            key={b.id}
            budget={b}
            years={yearsByBudget[b.id] ?? []}
            coverage={coverageByBudget[b.id] ?? []}
            pending={pending}
            run={run}
          />
        ))}
      </div>
    </div>
  );
}

function BudgetRow({
  budget,
  years,
  coverage,
  pending,
  run,
}: {
  budget: Budget;
  years: number[];
  coverage: CoverageYearSummary[];
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [cash, setCash] = useState(String(budget.initial_cash));
  const dirty = Number(cash) !== budget.initial_cash;

  return (
    <div
      className={`rounded border bg-white p-3 ${
        budget.is_active ? "border-brand-emerald" : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-brand-night">{budget.name}</span>
          {budget.is_active && (
            <span className="ml-2 rounded bg-brand-emerald px-2 py-0.5 text-xs text-white">
              Actif
            </span>
          )}
          <div className="text-xs text-slate-400">
            {years.length > 0
              ? `Années : ${years.sort().join(", ")}`
              : "Aucune année"}
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          <Link
            href={`/budgets?tab=edition&budget=${budget.id}`}
            className="rounded border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-50"
          >
            Éditer
          </Link>
          {!budget.is_active && (
            <button
              onClick={() => run(() => setActiveBudget(budget.id))}
              disabled={pending}
              className="rounded border border-brand-emerald px-2 py-1 text-brand-emerald hover:bg-emerald-50"
            >
              Activer
            </button>
          )}
          <button
            onClick={() => run(() => duplicateBudget(budget.id))}
            disabled={pending}
            className="rounded border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-50"
          >
            Dupliquer
          </button>
        </div>
      </div>

      {/* F2.9 — montant total par année + couvert / restant à couvrir */}
      {coverage.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {coverage.map((c) => (
            <span key={c.year} className="text-slate-500">
              <span className="font-medium text-brand-night">{c.year}</span> :{" "}
              {formatEur(c.charges)} · couvert {c.couvertPct}%
              {c.restantACouvrir > 0 && (
                <span className="font-bold text-alert"> · reste {formatEur(c.restantACouvrir)}</span>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 text-sm">
        <label className="text-slate-500">Solde initial tréso (1er janv.)</label>
        <input
          type="number"
          value={cash}
          onChange={(e) => setCash(e.target.value)}
          className="w-32 rounded border border-slate-300 px-2 py-1 text-right text-input"
        />
        <span className="text-xs text-slate-400">{formatEur(budget.initial_cash)}</span>
        {dirty && (
          <button
            onClick={() => run(() => updateInitialCash(budget.id, Number(cash) || 0))}
            disabled={pending}
            className="rounded bg-input px-2 py-1 text-xs text-white"
          >
            Enregistrer
          </button>
        )}
      </div>
    </div>
  );
}
