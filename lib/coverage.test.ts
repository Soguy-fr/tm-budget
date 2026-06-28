import { describe, it, expect } from "vitest";
import { computeCoverage } from "./coverage";

// Helper : remplit une année avec un montant unique au mois donné.
function ymMap(entries: Array<[number, number, number]>): Record<string, number> {
  const m: Record<string, number> = {};
  for (const [y, mo, v] of entries) m[`${y}:${mo}`] = v;
  return m;
}

describe("computeCoverage (BR-12)", () => {
  it("baseline couvre tout → restant 0, couvert 100%", () => {
    const dep = ymMap([[2026, 6, 10000]]);
    const rec = {};
    const r = computeCoverage(12000, [2026], rec, dep);
    expect(r.summary[0].charges).toBe(10000);
    expect(r.summary[0].restantACouvrir).toBe(0);
    expect(r.summary[0].couvertPct).toBe(100);
    expect(r.summary[0].soldeFin).toBe(2000); // 12000 - 10000
  });

  it("solde fin d'année négatif → restant = |solde fin|, couvert dérivé", () => {
    // baseline 0 ; dépense 10000 en mars ; recette 10000 en septembre.
    const dep = ymMap([[2026, 3, 10000]]);
    const rec = ymMap([[2026, 9, 10000]]);
    const r = computeCoverage(0, [2026], rec, dep);
    // solde fin = 0 (la recette de septembre comble la dépense) → 100 %.
    expect(r.byYear[2026][11]).toBe(0);
    expect(r.summary[0].soldeFin).toBe(0);
    expect(r.summary[0].restantACouvrir).toBe(0);
    expect(r.summary[0].couvertPct).toBe(100);
  });

  it("financement glissant multi-années : couverture par solde fin d'année", () => {
    // 2026 : charges 50000, recette 40000 → solde fin -10000.
    // 2027 : charges 60000, recette 33000 → solde fin -37000.
    const dep = ymMap([[2026, 12, 50000], [2027, 12, 60000]]);
    const rec = ymMap([[2026, 1, 40000], [2027, 1, 33000]]);
    const r = computeCoverage(0, [2026, 2027], rec, dep);
    expect(r.summary[0].soldeFin).toBe(-10000);
    expect(r.summary[0].restantACouvrir).toBe(10000);
    // (50000-10000)/50000 = 80%
    expect(r.summary[0].couvertPct).toBe(80);
    expect(r.summary[1].soldeFin).toBe(-37000);
    expect(r.summary[1].restantACouvrir).toBe(37000);
    // 2027 seule : (60000-37000)/60000 = 38%
    expect(r.summary[1].couvertPct).toBe(38);
    expect(r.summary[1].recettes).toBe(33000);
  });

  it("exemple spec : charges 100, solde fin -20 → couvert 80%", () => {
    const dep = ymMap([[2026, 6, 100]]);
    const rec = ymMap([[2026, 6, 80]]);
    const r = computeCoverage(0, [2026], rec, dep);
    expect(r.summary[0].soldeFin).toBe(-20);
    expect(r.summary[0].couvertPct).toBe(80);
    expect(r.summary[0].restantACouvrir).toBe(20);
  });

  it("solde fin positif → 100% même si trou en cours d'année", () => {
    // baseline 30000 couvre tout ; dépense 100 jan, recette 0 → solde fin 29900 > 0.
    const dep = ymMap([[2026, 1, 100]]);
    const r = computeCoverage(30000, [2026], {}, dep);
    expect(r.summary[0].couvertPct).toBe(100);
  });

  it("aucune charge → couvert 100%", () => {
    const r = computeCoverage(0, [2026], {}, {});
    expect(r.summary[0].couvertPct).toBe(100);
    expect(r.summary[0].restantACouvrir).toBe(0);
  });
});
