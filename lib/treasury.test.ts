import { describe, it, expect } from "vitest";
import {
  lastClosedMonthIndex,
  fluxBudgeted,
  fluxReal,
  chainCumulative,
  negativeMonths,
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
