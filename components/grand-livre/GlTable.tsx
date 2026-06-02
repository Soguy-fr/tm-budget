"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StructureLine, Bailleur, GlEntry } from "@/lib/types";
import { formatEur } from "@/lib/format";
import { parseCsv } from "@/lib/csv";
import { allocationStatus, findColumn, mapCsvRow, type MappedEntry } from "@/lib/gl";
import { importGl, updateAllocation } from "@/app/(app)/grand-livre/actions";

export function GlTable({
  entries,
  lines,
  bailleurs,
  planByCell,
}: {
  entries: GlEntry[];
  lines: StructureLine[];
  bailleurs: Bailleur[];
  planByCell: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Filtres multi-colonnes (F5.5).
  const [fType, setFType] = useState("");
  const [fMonth, setFMonth] = useState("");
  const [fLine, setFLine] = useState("");
  const [fBailleur, setFBailleur] = useState("");
  const [fStatut, setFStatut] = useState("");

  const lineLabel = useMemo(
    () => new Map(lines.map((l) => [l.id, `${l.code} ${l.label}`])),
    [lines],
  );
  const bailleurCode = useMemo(
    () => new Map(bailleurs.map((b) => [b.id, b.code])),
    [bailleurs],
  );

  const filtered = entries.filter((e) => {
    const statut = allocationStatus(e);
    const month = Number(e.entry_date.slice(5, 7));
    if (fType && e.entry_type !== fType) return false;
    if (fMonth && month !== Number(fMonth)) return false;
    if (fLine && e.line_id !== fLine) return false;
    if (fBailleur && e.bailleur_id !== fBailleur) return false;
    if (fStatut && statut !== fStatut) return false;
    return true;
  });

  async function onFile(file: File) {
    setError(null);
    setImportMsg(null);
    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    if (rows.length === 0) {
      setError("CSV vide ou illisible.");
      return;
    }
    const cols = {
      date: findColumn(headers, ["date", "date paiement", "date de paiement"]),
      type: findColumn(headers, ["type", "sens"]),
      label: findColumn(headers, ["libelle", "libellé", "label", "description"]),
      amount: findColumn(headers, ["montant", "montant (€)", "amount", "debit", "credit"]),
    };
    if (!cols.date || !cols.type || !cols.amount) {
      setError(
        `Colonnes requises introuvables. Détectées : ${headers.join(", ")}. Besoin de Date, Type, Montant.`,
      );
      return;
    }

    const mapped: MappedEntry[] = [];
    const errors: string[] = [];
    for (const row of rows) {
      const res = mapCsvRow(row, {
        date: cols.date,
        type: cols.type,
        label: cols.label ?? cols.date,
        amount: cols.amount,
      });
      if ("error" in res) errors.push(res.error);
      else mapped.push(res);
    }
    if (mapped.length === 0) {
      setError(`Aucune ligne valide. ${errors[0] ?? ""}`);
      return;
    }
    const note = errors.length ? ` (${errors.length} ignorée(s))` : "";
    if (!window.confirm(`Importer ${mapped.length} écriture(s)${note} ?`)) return;

    startTransition(async () => {
      const res = await importGl(file.name, mapped);
      if (!res.ok) setError(res.error ?? "Import échoué.");
      else {
        setImportMsg(`${res.count} écriture(s) importée(s)${note}.`);
        router.refresh();
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function onChangeLine(e: GlEntry, line_id: string | null) {
    // BR-2.4 — pré-remplir le bailleur depuis le plan si vide.
    let bailleur = e.bailleur_id;
    if (line_id && !bailleur) {
      const y = Number(e.entry_date.slice(0, 4));
      const m = Number(e.entry_date.slice(5, 7));
      bailleur = planByCell[`${line_id}:${y}:${m}`] ?? null;
    }
    save(e.id, line_id, bailleur);
  }

  function save(id: string, line_id: string | null, bailleur_id: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await updateAllocation(id, line_id, bailleur_id);
      if (!res.ok) setError(res.error ?? "Erreur.");
      else router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          className="hidden"
          id="gl-file"
        />
        <label
          htmlFor="gl-file"
          className="cursor-pointer rounded bg-brand-night px-3 py-1.5 text-sm text-white"
        >
          Importer CSV
        </label>
        {importMsg && <span className="text-sm text-brand-emerald">{importMsg}</span>}
      </div>

      {error && (
        <p className="mb-3 rounded border border-alert/30 bg-red-50 p-2 text-sm text-alert">{error}</p>
      )}

      {/* Filtres (F5.5) */}
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Select value={fType} onChange={setFType} label="Type">
          <option value="Dépense">Dépense</option>
          <option value="Recette">Recette</option>
        </Select>
        <Select value={fMonth} onChange={setFMonth} label="Mois">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={String(i + 1)}>
              {String(i + 1).padStart(2, "0")}
            </option>
          ))}
        </Select>
        <Select value={fLine} onChange={setFLine} label="LB">
          {lines.map((l) => (
            <option key={l.id} value={l.id}>
              {l.code}
            </option>
          ))}
        </Select>
        <Select value={fBailleur} onChange={setFBailleur} label="Bailleur">
          {bailleurs.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code}
            </option>
          ))}
        </Select>
        <Select value={fStatut} onChange={setFStatut} label="Statut">
          <option value="OK">OK</option>
          <option value="À allouer">À allouer</option>
        </Select>
        <span className="self-center text-slate-400">{filtered.length} écriture(s)</span>
      </div>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-2 py-1">Date</th>
              <th className="px-2 py-1">Type</th>
              <th className="px-2 py-1">Libellé</th>
              <th className="px-2 py-1 text-right">Montant</th>
              <th className="px-2 py-1">LB</th>
              <th className="px-2 py-1">Bailleur</th>
              <th className="px-2 py-1">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-slate-400">
                  Aucune écriture. Importez un CSV.
                </td>
              </tr>
            )}
            {filtered.map((e) => {
              const statut = allocationStatus(e);
              const unallocated = statut === "À allouer";
              return (
                <tr
                  key={e.id}
                  className={`border-b border-slate-50 ${unallocated ? "bg-amber-50" : ""}`}
                >
                  <td className="px-2 py-1 font-mono text-[11px]">{e.entry_date}</td>
                  <td className="px-2 py-1">{e.entry_type}</td>
                  <td className="px-2 py-1">{e.label}</td>
                  <td className="px-2 py-1 text-right">{formatEur(e.amount)}</td>
                  <td className="px-2 py-1">
                    <select
                      value={e.line_id ?? ""}
                      disabled={pending}
                      onChange={(ev) => onChangeLine(e, ev.target.value || null)}
                      className="rounded border border-slate-300 px-1 py-0.5"
                    >
                      <option value="">—</option>
                      {lines.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.code}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={e.bailleur_id ?? ""}
                      disabled={pending}
                      onChange={(ev) => save(e.id, e.line_id, ev.target.value || null)}
                      className="rounded border border-slate-300 px-1 py-0.5"
                    >
                      <option value="">—</option>
                      {bailleurs.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        unallocated ? "bg-amber-200 text-amber-800" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {statut}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-slate-300 px-2 py-1"
    >
      <option value="">{label} : tous</option>
      {children}
    </select>
  );
}
