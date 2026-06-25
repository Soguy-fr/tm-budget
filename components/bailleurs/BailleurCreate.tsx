"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBailleur, createFunder } from "@/app/(app)/bailleurs/actions";
import type { Funder } from "@/lib/types";

export function BailleurCreate({ funders }: { funders: Funder[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newFunder, setNewFunder] = useState("");
  const [form, setForm] = useState({
    code: "",
    name: "",
    reference: "",
    funder_id: "",
    montant_total: "",
    description: "",
    color: "#a0b44e",
    convention_start: "",
    convention_end: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createBailleur({
        code: form.code,
        name: form.name,
        color: form.color,
        convention_start: form.convention_start || null,
        convention_end: form.convention_end || null,
        funder_id: form.funder_id || null,
        reference: form.reference || null,
        description: form.description || null,
        montant_total: form.montant_total ? Number(form.montant_total) : null,
      });
      if (!res.ok) setError(res.error ?? "Erreur.");
      else {
        setForm({
          code: "", name: "", reference: "", funder_id: "", montant_total: "",
          description: "", color: "#a0b44e", convention_start: "", convention_end: "",
        });
        setOpen(false);
        router.refresh();
      }
    });
  }

  function addFunder() {
    if (!newFunder.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await createFunder(newFunder);
      if (!res.ok) setError(res.error ?? "Erreur.");
      else {
        setNewFunder("");
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-brand-night px-3 py-1.5 text-sm text-white"
      >
        + Nouveau financement
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded border border-slate-200 bg-white p-3">
      {error && <p className="text-sm text-alert">{error}</p>}
      <div className="flex gap-2">
        <input
          placeholder="Référence (JFN-001)"
          value={form.reference}
          onChange={(e) => setForm({ ...form, reference: e.target.value })}
          className="w-36 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          placeholder="Code court (FPC)"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          className="w-28 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          placeholder="Libellé du fonds"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          type="color"
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
          className="h-8 w-10 rounded border border-slate-300"
          title="Couleur"
        />
      </div>

      {/* Bailleur (acteur) + création inline */}
      <div className="flex items-center gap-2 text-sm">
        <label className="w-32 shrink-0 text-slate-500">Bailleur (acteur)</label>
        <select
          value={form.funder_id}
          onChange={(e) => setForm({ ...form, funder_id: e.target.value })}
          className="flex-1 rounded border border-slate-300 px-2 py-1"
        >
          <option value="">— aucun —</option>
          {funders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <input
          placeholder="+ nouveau bailleur"
          value={newFunder}
          onChange={(e) => setNewFunder(e.target.value)}
          className="w-40 rounded border border-slate-300 px-2 py-1"
        />
        <button
          type="button"
          onClick={addFunder}
          disabled={pending || !newFunder.trim()}
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 disabled:opacity-40"
        >
          Ajouter
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="w-32 shrink-0 text-slate-500">Montant total (€)</label>
        <input
          type="number"
          placeholder="10000"
          value={form.montant_total}
          onChange={(e) => setForm({ ...form, montant_total: e.target.value })}
          className="w-32 rounded border border-slate-300 px-2 py-1 text-right text-input"
        />
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="w-32 shrink-0 text-slate-500">Éligibilité (P9)</label>
        <input
          type="date"
          value={form.convention_start}
          onChange={(e) => setForm({ ...form, convention_start: e.target.value })}
          className="rounded border border-slate-300 px-2 py-1"
        />
        <span>→</span>
        <input
          type="date"
          value={form.convention_end}
          onChange={(e) => setForm({ ...form, convention_end: e.target.value })}
          className="rounded border border-slate-300 px-2 py-1"
        />
      </div>

      <textarea
        placeholder="Description du fonds"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        rows={2}
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
      />

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded bg-brand-emerald px-3 py-1 text-sm text-white">
          Créer
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600">
          Annuler
        </button>
      </div>
    </form>
  );
}
