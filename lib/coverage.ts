// Couverture de scénario (pseudo-trésorerie de simulation) — BUSINESS-RULES §12.
// Pure, testable. Distinct de la trésorerie réelle (treasury.ts).
import { chainCumulative } from "./treasury";

function ym(year: number, month: number): string {
  return `${year}:${month}`;
}

export type CoverageYearSummary = {
  year: number;
  charges: number;          // Σ dépenses de l'année
  recettes: number;         // Σ recettes simulées de l'année
  restantACouvrir: number;  // BR-12.2 : max(0, −solde_fin)
  couvertPct: number;       // 0..100, dérivé du solde de fin d'année
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

  const summary: CoverageYearSummary[] = sorted.map((y) => {
    // BR-12.2 — couverture dérivée du SOLDE DE FIN D'ANNÉE (cumul à décembre N).
    const soldeFin = byYear[y][11] ?? baseline;
    let chargesN = 0;
    let recettesN = 0;
    for (let m = 1; m <= 12; m++) {
      chargesN += depByYM[ym(y, m)] ?? 0;
      recettesN += recByYM[ym(y, m)] ?? 0;
    }
    const restant = Math.max(0, -soldeFin);
    // solde positif → 100 % ; sinon (charges + solde)/charges ; charges 0 → 100 %.
    const couvertPct =
      soldeFin >= 0 || chargesN === 0
        ? 100
        : Math.max(0, Math.min(100, Math.round((100 * (chargesN + soldeFin)) / chargesN)));
    return {
      year: y,
      charges: chargesN,
      recettes: recettesN,
      restantACouvrir: restant,
      couvertPct,
      soldeFin,
    };
  });

  const restantGlobal = Math.max(
    0,
    -months.reduce((m, v) => Math.min(m, v), baseline),
  );

  return { months, byYear, summary, restantGlobal };
}
