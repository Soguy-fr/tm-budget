import { describe, it, expect } from "vitest";
import {
  lastClosedMonthIndex,
  fluxBudgeted,
  fluxReal,
  chainCumulative,
  negativeMonths,
  realFlowsByMonth,
} from "./treasury";

describe("lastClosedMonthIndex (BR-7.3 option A)", () => {
  it("année passée : tout clos (11)", () => {
    expect(lastClosedMonthIndex(2025, new Date("2026-06-15"))).toBe(11);
  });
  it("année future : rien de clos (-1)", () => {
    expect(lastClosedMonthIndex(2027, new Date("2026-06-15"))).toBe(-1);
  });
  it("année courante : mois en cours exclu", () => {
    // juin = index 5 → dernier clos = mai = 4
    expect(lastClosedMonthIndex(2026, new Date("2026-06-15"))).toBe(4);
  });
});

describe("realFlowsByMonth (BR-7.3 / A1 — la caisse reflète la banque)", () => {
  it("inclut les écritures NON allouées (sans LB ni bailleur)", () => {
    // Le bug A1 : ces écritures étaient filtrées par isAllocated() → solde ≠ banque.
    const entries = [
      // dépense allouée
      { entry_date: "2026-03-05", entry_type: "Dépense" as const, amount: 1000,
        line_id: "lb-1", bailleur_id: "b-1" },
      // dépense NON allouée (À allouer) — doit compter quand même
      { entry_date: "2026-03-12", entry_type: "Dépense" as const, amount: 250,
        line_id: null, bailleur_id: null },
      // recette NON allouée — doit compter quand même
      { entry_date: "2026-03-20", entry_type: "Recette" as const, amount: 5000,
        line_id: null, bailleur_id: null },
    ];
    const { rec, dep } = realFlowsByMonth(entries);
    expect(dep["2026:3"]).toBe(1250); // 1000 + 250, pas 1000
    expect(rec["2026:3"]).toBe(5000);
  });

  it("somme les montants signés (BR-4.4 — un avoir réduit les dépenses)", () => {
    const entries = [
      { entry_date: "2026-03-05", entry_type: "Dépense" as const, amount: 1000 },
      { entry_date: "2026-03-10", entry_type: "Dépense" as const, amount: -120 }, // avoir
    ];
    const { dep } = realFlowsByMonth(entries);
    expect(dep["2026:3"]).toBe(880);
  });

  it("agrège par année:mois sans zéro de tête (clé « 2026:3 »)", () => {
    const entries = [
      { entry_date: "2026-03-05", entry_type: "Dépense" as const, amount: 10 },
      { entry_date: "2026-11-05", entry_type: "Dépense" as const, amount: 20 },
      { entry_date: "2025-03-05", entry_type: "Dépense" as const, amount: 30 },
    ];
    const { dep } = realFlowsByMonth(entries);
    expect(dep["2026:3"]).toBe(10);
    expect(dep["2026:11"]).toBe(20);
    expect(dep["2025:3"]).toBe(30);
  });
});

describe("chainCumulative (BR-7.1 chaînage)", () => {
  it("cumul du 1er mois = initial + flux, puis enchaîne", () => {
    const flux = [1000, -500, 2000];
    expect(chainCumulative(50000, flux)).toEqual([51000, 50500, 52500]);
  });
});

describe("fluxReal (bascule réel→budget au bon mois)", () => {
  it("mois ≤ M réel, mois > M budgété", () => {
    const recReel = Array(12).fill(100);
    const depReel = Array(12).fill(40);
    const recBud = Array(12).fill(200);
    const depBud = Array(12).fill(50);
    const flux = fluxReal(4, recReel, depReel, recBud, depBud); // dernier clos = mai (idx4)
    // jan..mai (0..4) : 100-40 = 60 (réel)
    expect(flux.slice(0, 5)).toEqual(Array(5).fill(60));
    // jun..déc (5..11) : 200-50 = 150 (budgété)
    expect(flux.slice(5)).toEqual(Array(7).fill(150));
  });

  it("M = -1 → tout budgété", () => {
    const flux = fluxReal(-1, Array(12).fill(100), Array(12).fill(40), Array(12).fill(200), Array(12).fill(50));
    expect(flux.every((f) => f === 150)).toBe(true);
  });
});

describe("fluxBudgeted + negativeMonths", () => {
  it("trou de trésorerie détecté", () => {
    const flux = fluxBudgeted([0, 0, 0], [20000, 0, 0].concat(Array(9).fill(0)));
    const cumul = chainCumulative(10000, flux); // 1er mois : 10000-20000 = -10000
    expect(cumul[0]).toBe(-10000);
    expect(negativeMonths(cumul)).toContain(0);
  });
});
