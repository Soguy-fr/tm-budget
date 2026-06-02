// Règles de calcul du prévisionnel interne (BUSINESS-RULES.md §1).
// Logique pure, testable indépendamment de l'UI et de la base.

// BR-1.2 — Répartit un total également sur n mois, arrondi à l'euro,
// le DERNIER mois absorbe le reste pour que la somme retombe exacte.
// `monthsActive` : indices (0..11) des mois à servir ; défaut = les 12 mois.
export function repartir(
  total: number,
  monthsActive: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
): number[] {
  const result = new Array(12).fill(0);
  const n = monthsActive.length;
  if (n === 0) return result;

  const base = Math.round(total / n);
  let accumulated = 0;
  monthsActive.forEach((m, i) => {
    if (i < n - 1) {
      result[m] = base;
      accumulated += base;
    } else {
      // dernier mois actif = reste exact
      result[m] = total - accumulated;
    }
  });
  return result;
}

// BR-1.1 — écart = total annuel saisi − Σ des 12 mois.
export function ecart(totalInput: number, months: number[]): number {
  return totalInput - sumMonths(months);
}

// BR-1.3 — total = Σ des 12 mois.
export function sumMonths(months: number[]): number {
  return months.reduce((a, b) => a + (b || 0), 0);
}
