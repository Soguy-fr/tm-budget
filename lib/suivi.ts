// Suivi prévu vs réalisé (BUSINESS-RULES §5). Pur, testable.
import type { GlEntry, StructureLine } from "./types";
import { isAllocated } from "./gl";
import { buildTree } from "./structure";

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

// BR-5.4 — Dashboard onglet Dépense : agrège les feuilles (niveau 3) vers leurs
// catégories niveau 1 et 2. Ne renvoie QUE les niveaux 1 et 2 (pas le 3), dans
// l'ordre d'affichage de l'arbre (niveau 1 puis ses sous-catégories niveau 2).
export type CategoryRow = {
  id: string;
  code: string;
  label: string;
  level: number;
  comment: string | null;
  prevu: number;
  realise: number;
};

export function aggregateByCategory(
  lines: StructureLine[],
  leaf: Record<string, { prevu: number; realise: number }>,
): CategoryRow[] {
  const tree = buildTree(lines);
  const totals = new Map<string, { prevu: number; realise: number }>();

  // Post-ordre : somme des descendants. Les montants ne vivent qu'au niveau 3.
  const sum = (node: ReturnType<typeof buildTree>[number]): { prevu: number; realise: number } => {
    let prevu = 0;
    let realise = 0;
    if (node.children.length === 0) {
      const a = leaf[node.id];
      if (a) {
        prevu = a.prevu;
        realise = a.realise;
      }
    } else {
      for (const c of node.children) {
        const s = sum(c);
        prevu += s.prevu;
        realise += s.realise;
      }
    }
    totals.set(node.id, { prevu, realise });
    return { prevu, realise };
  };
  tree.forEach(sum);

  // Pré-ordre : émet niveaux 1 et 2 dans l'ordre d'affichage.
  const out: CategoryRow[] = [];
  const emit = (node: ReturnType<typeof buildTree>[number]) => {
    if (node.level <= 2) {
      const t = totals.get(node.id)!;
      out.push({
        id: node.id,
        code: node.code,
        label: node.label,
        level: node.level,
        comment: node.comment ?? null,
        prevu: t.prevu,
        realise: t.realise,
      });
    }
    node.children.forEach(emit);
  };
  tree.forEach(emit);
  return out;
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
