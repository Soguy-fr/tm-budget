// Trésorerie en prévision glissante (BUSINESS-RULES §7). Pur, testable.

// BR-7.3 — dernier mois CLOS pour une année (option A : mois courant exclu).
// Retourne un index 0..11, ou -1 si aucun mois clos (année future).
export function lastClosedMonthIndex(year: number, now: Date = new Date()): number {
  const cy = now.getFullYear();
  if (year < cy) return 11; // année passée : tout est clos
  if (year > cy) return -1; // année future : rien de clos
  return now.getMonth() - 1; // année courante : mois en cours exclu
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
