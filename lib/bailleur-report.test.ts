import { describe, it, expect } from "vitest";
import {
  derivedExpenseForLine,
  totalAssignedExpenses,
  nonAssigne,
  isBalanced,
} from "./bailleur-report";

const M = (line_id: string, amount: number, bailleur_id: string | null) => ({
  line_id,
  amount,
  bailleur_id,
});

describe("derivedExpenseForLine (BR-3.1 — dérivé du plan interne)", () => {
  it("somme les LB mappées assignées à ce bailleur", () => {
    const monthly = [
      M("L1", 2500, "FPC"),
      M("L2", 1800, "FPC"),
      M("L1", 2500, "SW"), // autre bailleur
      M("L3", 999, "FPC"), // non mappé
    ];
    // ligne bailleur mappée vers L1 + L2
    expect(derivedExpenseForLine(monthly, "FPC", ["L1", "L2"])).toBe(4300);
  });
});

describe("totalAssignedExpenses", () => {
  it("somme tout ce qui est assigné au bailleur", () => {
    const monthly = [M("L1", 2500, "FPC"), M("L2", 1800, "FPC"), M("L1", 500, "SW")];
    expect(totalAssignedExpenses(monthly, "FPC")).toBe(4300);
  });
});

describe("nonAssigne / équilibre (BR-3.2, INV3)", () => {
  it("non assigné = recettes − dépenses assignées", () => {
    expect(nonAssigne(60000, 43000)).toBe(17000);
  });
  it("négatif si sur-affectation", () => {
    expect(nonAssigne(40000, 43000)).toBe(-3000);
  });
  it("l'équilibre recettes = dépenses tient toujours", () => {
    expect(isBalanced(60000, 43000)).toBe(true);
    expect(isBalanced(40000, 43000)).toBe(true);
  });
});
