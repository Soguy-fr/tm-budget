import { describe, it, expect } from "vitest";
import { flattenForGrid, aggregateMonths, lineMonths, cellKey } from "./budget-grid";
import type { StructureLine } from "./types";

const L = (
  id: string,
  code: string,
  level: 1 | 2 | 3,
  parent_id: string | null,
  sort_order: number,
): StructureLine => ({
  id,
  code,
  level,
  label: code,
  parent_id,
  sort_order,
  active: true,
  comment: null,
  created_at: "",
  updated_at: "",
});

describe("flattenForGrid", () => {
  it("ordonne et calcule les feuilles de chaque parent", () => {
    const lines = [
      L("c1", "1", 1, null, 10),
      L("c11", "1.1", 2, "c1", 10),
      L("l111", "1.1.1", 3, "c11", 10),
      L("l112", "1.1.2", 3, "c11", 20),
    ];
    const flat = flattenForGrid(lines);
    expect(flat.map((r) => r.code)).toEqual(["1", "1.1", "1.1.1", "1.1.2"]);
    expect(flat[0].leafIds.sort()).toEqual(["l111", "l112"]); // niveau 1 = 2 feuilles
    expect(flat[2].leafIds).toEqual(["l111"]); // niveau 3 = lui-même
  });
});

describe("aggregateMonths (total parent = Σ feuilles)", () => {
  it("somme les feuilles mois par mois", () => {
    const monthly: Record<string, number> = {
      [cellKey("l111", 2026, 1)]: 2500,
      [cellKey("l112", 2026, 1)]: 1800,
      [cellKey("l111", 2026, 2)]: 2500,
    };
    const agg = aggregateMonths(["l111", "l112"], 2026, monthly);
    expect(agg[0]).toBe(4300); // janvier
    expect(agg[1]).toBe(2500); // février
    expect(agg[11]).toBe(0);
  });
});

describe("lineMonths", () => {
  it("renvoie 12 valeurs, 0 si absent", () => {
    const monthly = { [cellKey("l111", 2026, 3)]: 500 };
    const m = lineMonths("l111", 2026, monthly);
    expect(m).toHaveLength(12);
    expect(m[2]).toBe(500);
    expect(m[0]).toBe(0);
  });
});
