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

  it("trou de financement : dépense avant la recette → restant = creux", () => {
    // baseline 0 ; dépense 10000 en mars ; recette 10000 en septembre.
    const dep = ymMap([[2026, 3, 10000]]);
    const rec = ymMap([[2026, 9, 10000]]);
    const r = computeCoverage(0, [2026], rec, dep);
    // cumul plonge à -10000 de mars à août, remonte à 0 en septembre.
    expect(r.byYear[2026][2]).toBe(-10000); // mars (idx 2)
    expect(r.byYear[2026][11]).toBe(0);     // décembre
    expect(r.summary[0].restantACouvrir).toBe(10000);
    // charges cumulées = 10000, restant 10000 → couvert 0%
    expect(r.summary[0].couvertPct).toBe(0);
  });

  it("financement glissant multi-années : restant par année", () => {
    // 2026 : charges 50000 réparties, recette GIZ 40000.
    // 2027 : charges 60000, recette GIZ 33000.
    const dep = ymMap([[2026, 12, 50000], [2027, 12, 60000]]);
    const rec = ymMap([[2026, 1, 40000], [2027, 1, 33000]]);
    const r = computeCoverage(0, [2026, 2027], rec, dep);
    // fin 2026 : 40000 - 50000 = -10000 → restant 10000 (à fin 2026)
    expect(r.summary[0].restantACouvrir).toBe(10000);
    // fin 2027 : cumul = 40000-50000+33000-60000 = -37000 → restant 37000
    expect(r.summary[1].restantACouvrir).toBe(37000);
    expect(r.summary[1].soldeFin).toBe(-37000);
  });

  it("couvert % = part des charges cumulées couverte", () => {
    // charges 58800 sur 2026, recette 47600 → restant 11200 → couvert 81%
    const dep = ymMap([[2026, 12, 58800]]);
    const rec = ymMap([[2026, 1, 47600]]);
    const r = computeCoverage(0, [2026], rec, dep);
    expect(r.summary[0].restantACouvrir).toBe(11200);
    expect(r.summary[0].couvertPct).toBe(81); // round(100*(1-11200/58800))
  });

  it("aucune charge → couvert 100%", () => {
    const r = computeCoverage(0, [2026], {}, {});
    expect(r.summary[0].couvertPct).toBe(100);
    expect(r.summary[0].restantACouvrir).toBe(0);
  });
});
