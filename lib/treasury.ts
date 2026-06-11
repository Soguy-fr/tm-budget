// Trésorerie en prévision glissante (BUSINESS-RULES §7). Pur, testable.
import { lastClosedIndex, type ClosureRow } from "./closure";

// BR-7.3 — M = dernier mois EXPLICITEMENT clos (BR-11.1).
// Fallback : tant qu'aucune clôture n'existe (adoption progressive), on garde
// l'ancien comportement implicite « mois courant − 1 ».
export function lastClosedMonthIndexExplicit(
  year: number,
  closures: ClosureRow[],
  now: Date = new Date(),
): number {
  if (closures.some((c) => !c.reopened_at)) return lastClosedIndex(closures, year);
  return lastClosedMonthIndex(year, now);
}

// Comportement implicite historique (option A : mois courant exclu).
// Retourne un index 0..11, ou -1 si aucun mois clos (année future).
export function lastClosedMonthIndex(year: number, now: Date = new Date()): number {
  const cy = now.getFullYear();
  if (year < cy) return 11; // année passée : tout est clos
  if (year > cy) return -1; // année future : rien de clos
  return now.getMonth() - 1; // année courante : mois en cours exclu
}

// BR-7.3 (A1) — agrège les flux réels du GL par clé « année:mois ».
// Somme TOUTES les écritures, allouées ou non : la caisse reflète la banque,
// pas le suivi analytique. Le statut d'allocation (BR-4.1) ne s'applique pas ici.
// Montants signés (BR-4.4) : un avoir négatif réduit le flux de dépenses.
export function realFlowsByMonth(
  entries: Array<{ entry_date: string; entry_type: "Dépense" | "Recette"; amount: number }>,
): { rec: Record<string, number>; dep: Record<string, number> } {
  const rec: Record<string, number> = {};
  const dep: Record<string, number> = {};
  for (const e of entries) {
    const k = `${Number(e.entry_date.slice(0, 4))}:${Number(e.entry_date.slice(5, 7))}`;
    if (e.entry_type === "Recette") rec[k] = (rec[k] ?? 0) + Number(e.amount);
    else dep[k] = (dep[k] ?? 0) + Number(e.amount);
  }
  return { rec, dep };
}

// BR-7.2 — flux budgété d'un mois = recettes prévues − dépenses prévues.
export function fluxBudgeted(recettes: number[], depenses: number[]): number[] {
  return Array.from({ length: 12 }, (_, i) => (recettes[i] ?? 0) - (depenses[i] ?? 0));
}

// BR-7.3 — flux en mode Réel (glissant) : réel jusqu'au dernier mois clos M,
// budgété au-delà.
export function fluxReal(
  lastClosed: number,
  recettesReel: number[],
  depensesReel: number[],
  recettesBud: number[],
  depensesBud: number[],
): number[] {
  return Array.from({ length: 12 }, (_, i) => {
    if (i <= lastClosed) return (recettesReel[i] ?? 0) - (depensesReel[i] ?? 0);
    return (recettesBud[i] ?? 0) - (depensesBud[i] ?? 0);
  });
}

// BR-7.1 — cumul chaîné : départ = initial_cash, chaque mois ajoute son flux.
// Renvoie les soldes cumulés de fin de mois.
export function chainCumulative(initialCash: number, flux: number[]): number[] {
  const out: number[] = [];
  let c = initialCash;
  for (const f of flux) {
    c += f;
    out.push(c);
  }
  return out;
}

// Détecte les mois en trou de trésorerie (cumul négatif) — BR-7.4.
export function negativeMonths(cumul: number[]): number[] {
  const out: number[] = [];
  cumul.forEach((c, i) => {
    if (c < 0) out.push(i);
  });
  return out;
}
