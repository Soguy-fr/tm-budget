"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBailleur } from "@/app/(app)/bailleurs/actions";

export function BailleurCreate() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    color: "#2563eb",
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
      });
      if (!res.ok) setError(res.error ?? "Erreur.");
      else {
        setForm({ code: "", name: "", color: "#2563eb", convention_start: "", convention_end: "" });
        setOpen(false);
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
        + Nouveau bailleur
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded border border-slate-200 bg-white p-3">
      {error && <p className="text-sm text-alert">{error}</p>}
      <div className="flex gap-2">
        <input
          placeholder="Code (FPC)"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          className="w-28 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          placeholder="Nom complet"
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
      <div className="flex items-center gap-2 text-sm">
        <label className="text-slate-500">Convention (P9, décalée possible)</label>
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
