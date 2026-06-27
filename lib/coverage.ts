// Couverture de scénario (pseudo-trésorerie de simulation) — BUSINESS-RULES §12.
// Pure, testable. Distinct de la trésorerie réelle (treasury.ts).
import { chainCumulative } from "./treasury";

function ym(year: number, month: number): string {
  return `${year}:${month}`;
}

export type CoverageYearSummary = {
  year: number;
  charges: number;          // Σ dépenses de l'année
  restantACouvrir: number;  // BR-12.2 : ampleur du creux négatif d'ici fin N
  couvertPct: number;       // 0..100
  soldeFin: number;         // cumul à fin décembre N
};

export type CoverageResult = {
  // cumul mensuel chronologique (toutes années), et découpé par année.
  months: number[];
  byYear: Record<number, number[]>;
  summary: CoverageYearSummary[];
  // restant à couvrir global (sur tout l'horizon) = pire creux.
  restantGlobal: number;
};

// BR-12.1 — cumul = coverage_baseline + Σ recettes simulées − Σ dépenses, chaîné.
// BR-12.2 — par année : charges, restant à couvrir, couvert %.
export function computeCoverage(
  baseline: number,
  years: number[],
  recByYM: Record<string, number>,
  depByYM: Record<string, number>,
): CoverageResult {
  const sorted = [...years].sort((a, b) => a - b);
  const flux: number[] = [];
  for (const y of sorted) {
    for (let m = 1; m <= 12; m++) {
      flux.push((recByYM[ym(y, m)] ?? 0) - (depByYM[ym(y, m)] ?? 0));
    }
  }
  const months = chainCumulative(baseline, flux);

  const byYear: Record<number, number[]> = {};
  sorted.forEach((y, idx) => {
    byYear[y] = months.slice(idx * 12, idx * 12 + 12);
  });

  const summary: CoverageYearSummary[] = sorted.map((y, idx) => {
    const endIdx = idx * 12 + 12; // exclusif
    const minToEnd = months.slice(0, endIdx).reduce((m, v) => Math.min(m, v), Infinity);
    const restant = Math.max(0, -minToEnd);
    // charges cumulées (toutes années jusqu'à N inclus).
    let chargesCum = 0;
    for (let j = 0; j <= idx; j++) {
      const yy = sorted[j];
      for (let m = 1; m <= 12; m++) chargesCum += depByYM[ym(yy, m)] ?? 0;
    }
    // charges de l'année N seule (affichage).
    let chargesN = 0;
    for (let m = 1; m <= 12; m++) chargesN += depByYM[ym(y, m)] ?? 0;

    const couvertPct =
      chargesCum > 0
        ? Math.max(0, Math.min(100, Math.round(100 * (1 - restant / chargesCum))))
        : 100;
    return {
      year: y,
      charges: chargesN,
      restantACouvrir: restant,
      couvertPct,
      soldeFin: byYear[y][11] ?? baseline,
    };
  });

  const restantGlobal = Math.max(
    0,
    -months.reduce((m, v) => Math.min(m, v), baseline),
  );

  return { months, byYear, summary, restantGlobal };
}
