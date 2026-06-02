// Vue bailleur : dépenses dérivées du plan interne (P1, Q3-a) + équilibre. Pur.
import type { BudgetMonthly } from "./types";

type MonthlyLite = Pick<BudgetMonthly, "line_id" | "amount" | "bailleur_id">;

// BR-3.1 — dépenses prévues d'une ligne bailleur = Σ des LB internes mappées,
// restreintes aux mailles assignées à CE bailleur.
export function derivedExpenseForLine(
  monthly: MonthlyLite[],
  bailleurId: string,
  mappedLineIds: string[],
): number {
  const set = new Set(mappedLineIds);
  let sum = 0;
  for (const m of monthly) {
    if (m.bailleur_id === bailleurId && set.has(m.line_id)) sum += Number(m.amount);
  }
  return sum;
}

// Total des dépenses prévues assignées à un bailleur (toutes LB confondues).
export function totalAssignedExpenses(monthly: MonthlyLite[], bailleurId: string): number {
  let sum = 0;
  for (const m of monthly) {
    if (m.bailleur_id === bailleurId) sum += Number(m.amount);
  }
  return sum;
}

// BR-3.2 — ligne « Non assigné » = recettes prévues − dépenses assignées.
// Garantit recettes = dépenses à l'affichage. Négative = sur-affectation.
export function nonAssigne(recettesPrevues: number, depensesAssignees: number): number {
  return recettesPrevues - depensesAssignees;
}

// INV3 — vérifie l'équilibre : dépenses assignées + non assigné == recettes.
export function isBalanced(recettes: number, depensesAssignees: number): boolean {
  return depensesAssignees + nonAssigne(recettes, depensesAssignees) === recettes;
}
