// Grand Livre : mapping CSV → écriture, statut d'allocation (BR-4.1). Pur.
import type { GlEntry } from "./types";

// BR-4.1 — Statut d'allocation.
export function allocationStatus(e: {
  entry_type: "Dépense" | "Recette";
  line_id: string | null;
  bailleur_id: string | null;
}): "OK" | "À allouer" {
  if (e.entry_type === "Recette") {
    return e.bailleur_id ? "OK" : "À allouer";
  }
  // Dépense
  return e.line_id && e.bailleur_id ? "OK" : "À allouer";
}

// Parse un montant « 2 500,50 » / « 2,500.50 » / « 2500.5 » → number.
export function parseAmount(raw: string): number {
  let s = raw.replace(/[\s €]/g, "");
  if (s === "") return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    // virgule = séparateur décimal → enlever les points (milliers)
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    // point décimal → enlever les virgules (milliers)
    s = s.replace(/,/g, "");
  }
  const n = Number.parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

// Parse une date AAAA-MM-JJ ou JJ/MM/AAAA → ISO (AAAA-MM-JJ). null si invalide.
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(s);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    return `${m[3]}-${mo}-${d}`;
  }
  return null;
}

// Normalise le type d'écriture.
export function parseType(raw: string): "Dépense" | "Recette" | null {
  const s = raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (s.startsWith("dep") || s.startsWith("debit") || s === "d") return "Dépense";
  if (s.startsWith("rec") || s.startsWith("cred") || s === "c") return "Recette";
  return null;
}

// Trouve une colonne du CSV par noms candidats (insensible casse/accents).
export function findColumn(headers: string[], candidates: string[]): string | null {
  const norm = (x: string) =>
    x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const normCands = candidates.map(norm);
  for (const h of headers) {
    if (normCands.includes(norm(h))) return h;
  }
  return null;
}

export type MappedEntry = {
  entry_date: string;
  entry_type: "Dépense" | "Recette";
  label: string | null;
  amount: number;
  raw: Record<string, string>;
};

// Mappe une ligne CSV vers une écriture (P5 : date de paiement, P6 : euros).
export function mapCsvRow(
  raw: Record<string, string>,
  cols: { date: string; type: string; label: string; amount: string },
): MappedEntry | { error: string } {
  const entry_date = parseDate(raw[cols.date] ?? "");
  if (!entry_date) return { error: `Date invalide : « ${raw[cols.date]} »` };
  const entry_type = parseType(raw[cols.type] ?? "");
  if (!entry_type) return { error: `Type invalide : « ${raw[cols.type]} »` };
  return {
    entry_date,
    entry_type,
    label: raw[cols.label] ?? null,
    amount: Math.abs(parseAmount(raw[cols.amount] ?? "0")),
    raw,
  };
}

// Agrégat : ne compter que les écritures OK (BR-4.1 — exclusion des « À allouer »).
export function isAllocated(e: Pick<GlEntry, "entry_type" | "line_id" | "bailleur_id">): boolean {
  return allocationStatus(e) === "OK";
}
