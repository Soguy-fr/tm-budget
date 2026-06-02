// Suivi prévu vs réalisé (BUSINESS-RULES §5). Pur, testable.
import type { GlEntry } from "./types";
import { isAllocated } from "./gl";

// BR-5.2 — indicateurs de suivi des dépenses.
export function indicators(prevu: number, realise: number): {
  ecart: number;
  pctConso: number;
  depassement: boolean;
} {
  return {
    ecart: prevu - realise,
    pctConso: prevu > 0 ? realise / prevu : 0,
    depassement: realise > prevu,
  };
}

// BR-5.1 / BR-5.3 — réalisé par (LB × année × mois), depuis le GL.
// Ne compte que les dépenses ALLOUÉES (statut OK, BR-4.1).
export function realiseByCell(entries: GlEntry[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of entries) {
    if (e.entry_type !== "Dépense" || !e.line_id) continue;
    if (!isAllocated(e)) continue;
    const year = Number(e.entry_date.slice(0, 4));
    const month = Number(e.entry_date.slice(5, 7));
    const k = `${e.line_id}:${year}:${month}`;
    map[k] = (map[k] ?? 0) + Number(e.amount);
  }
  return map;
}

// Réalisé annuel par LB (Σ des 12 mois).
export function realiseByLineYear(entries: GlEntry[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of entries) {
    if (e.entry_type !== "Dépense" || !e.line_id) continue;
    if (!isAllocated(e)) continue;
    const year = Number(e.entry_date.slice(0, 4));
    const k = `${e.line_id}:${year}`;
    map[k] = (map[k] ?? 0) + Number(e.amount);
  }
  return map;
}
