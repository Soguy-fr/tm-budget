import { describe, it, expect } from "vitest";
import { indicators, realiseByCell, realiseByLineYear } from "./suivi";
import type { GlEntry } from "./types";

const E = (p: Partial<GlEntry>): GlEntry => ({
  id: Math.random().toString(),
  import_batch: null,
  entry_date: "2026-01-15",
  entry_type: "Dépense",
  label: null,
  amount: 0,
  raw: null,
  line_id: null,
  bailleur_id: null,
  confirmed: true,
  archived: false,
  created_at: "",
  ...p,
});

describe("indicators (BR-5.2)", () => {
  it("écart, % consommé, dépassement", () => {
    expect(indicators(1000, 938)).toEqual({ ecart: 62, pctConso: 0.938, depassement: false });
  });
  it("dépassement si réalisé > prévu", () => {
    const r = indicators(1000, 1200);
    expect(r.depassement).toBe(true);
    expect(r.ecart).toBe(-200);
  });
  it("% = 0 si prévu = 0", () => {
    expect(indicators(0, 500).pctConso).toBe(0);
  });
});

describe("realiseByCell (BR-5.3 — réalisé = Σ GL par LB×mois)", () => {
  it("somme les dépenses allouées par maille", () => {
    const entries = [
      E({ line_id: "L1", bailleur_id: "B", amount: 938, entry_date: "2026-01-05" }),
      E({ line_id: "L1", bailleur_id: "B", amount: 62, entry_date: "2026-01-20" }),
      E({ line_id: "L1", bailleur_id: "B", amount: 500, entry_date: "2026-02-10" }),
    ];
    const m = realiseByCell(entries);
    expect(m["L1:2026:1"]).toBe(1000); // janvier
    expect(m["L1:2026:2"]).toBe(500); // février
  });

  it("compte une dépense avec LB même sans bailleur (BR-4.1)", () => {
    const entries = [
      E({ line_id: "L1", bailleur_id: null, amount: 999, entry_date: "2026-01-05" }), // LB sans bailleur → comptée
    ];
    expect(realiseByCell(entries)["L1:2026:1"]).toBe(999);
  });

  it("exclut les dépenses sans LB et les recettes", () => {
    const entries = [
      E({ line_id: null, bailleur_id: "B", amount: 50, entry_date: "2026-01-05" }), // pas de LB → exclue
      E({ line_id: null, bailleur_id: "B", amount: 100, entry_type: "Recette", entry_date: "2026-01-05" }),
    ];
    expect(Object.keys(realiseByCell(entries))).toHaveLength(0);
  });
});

describe("realiseByLineYear", () => {
  it("agrège l'année", () => {
    const entries = [
      E({ line_id: "L1", bailleur_id: "B", amount: 1000, entry_date: "2026-01-05" }),
      E({ line_id: "L1", bailleur_id: "B", amount: 500, entry_date: "2026-06-05" }),
    ];
    expect(realiseByLineYear(entries)["L1:2026"]).toBe(1500);
  });
});
