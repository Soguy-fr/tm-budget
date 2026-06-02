"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TreeNode } from "@/lib/structure";
import { addLine, renameLine, deleteLine } from "@/app/(app)/structure/actions";

export function StructureTree({ tree }: { tree: TreeNode[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addingRoot, setAddingRoot] = useState(false);

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

      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          <span>Code · Intitulé</span>
          <span>Actions</span>
        </div>

        {tree.length === 0 && (
          <p className="px-3 py-4 text-sm text-slate-500">
            Aucune ligne. Ajoutez une catégorie de niveau 1.
          </p>
        )}

        {tree.map((node) => (
          <Row key={node.id} node={node} depth={0} run={run} pending={pending} />
        ))}
      </div>

      <div className="mt-3">
        {addingRoot ? (
          <AddForm
            placeholder="Intitulé de la catégorie (niveau 1)"
            onCancel={() => setAddingRoot(false)}
            onSubmit={(label) => {
              run(() => addLine(null, label));
              setAddingRoot(false);
            }}
          />
        ) : (
          <button
            onClick={() => setAddingRoot(true)}
            className="rounded bg-brand-night px-3 py-1.5 text-sm text-white"
          >
            + Catégorie (niveau 1)
          </button>
        )}
      </div>
    </div>
  );
}

function Row({
  node,
  depth,
  run,
  pending,
}: {
  node: TreeNode;
  depth: number;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
  pending: boolean;
}) {
  const [adding, setAdding] = useState(false);

  function onRename() {
    // P8 — avertissement de propagation avant renommage.
    const ok = window.confirm(
      "Ce changement de libellé s'applique à TOUS les budgets et au suivi (structure partagée, P2). Continuer ?",
    );
    if (!ok) return;
    const label = window.prompt("Nouvel intitulé", node.label);
    if (label && label.trim()) run(() => renameLine(node.id, label));
  }

  function onDelete() {
    const ok = window.confirm(
      `Supprimer « ${node.code} ${node.label} » ? (Bloqué si des montants ou écritures y sont liés.)`,
    );
    if (ok) run(() => deleteLine(node.id));
  }

  return (
    <div>
      <div
        className="flex items-center justify-between border-b border-slate-50 px-3 py-1.5 text-sm hover:bg-slate-50"
        style={{ paddingLeft: 12 + depth * 20 }}
      >
        <span className={node.level === 3 ? "text-formula" : "font-medium text-brand-night"}>
          <span className="mr-2 inline-block min-w-[3.5rem] font-mono text-xs text-slate-400">
            {node.code}
          </span>
          {node.label}
        </span>
        <span className="flex gap-2 text-xs">
          {node.level < 3 && (
            <button
              onClick={() => setAdding((v) => !v)}
              disabled={pending}
              className="text-brand-emerald hover:underline"
            >
              + Ligne
            </button>
          )}
          <button onClick={onRename} disabled={pending} className="text-slate-500 hover:underline">
            Renommer
          </button>
          <button onClick={onDelete} disabled={pending} className="text-alert hover:underline">
            Supprimer
          </button>
        </span>
      </div>

      {adding && (
        <div style={{ paddingLeft: 32 + depth * 20 }} className="py-1.5 pr-3">
          <AddForm
            placeholder={`Intitulé (niveau ${node.level + 1})`}
            onCancel={() => setAdding(false)}
            onSubmit={(label) => {
              run(() => addLine(node.id, label));
              setAdding(false);
            }}
          />
        </div>
      )}

      {node.children.map((child) => (
        <Row key={child.id} node={child} depth={depth + 1} run={run} pending={pending} />
      ))}
    </div>
  );
}

function AddForm({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  onSubmit: (label: string) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (label.trim()) onSubmit(label);
      }}
      className="flex gap-2"
    >
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
      />
      <button
        type="submit"
        className="rounded bg-brand-emerald px-3 py-1 text-sm text-white"
      >
        Ajouter
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600"
      >
        Annuler
      </button>
    </form>
  );
}
