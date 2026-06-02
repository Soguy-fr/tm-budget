import { describe, it, expect } from "vitest";
import { nextChildCode, canDeleteLine, nextSortOrder } from "./structure";

describe("nextChildCode (P3 — pas de renumérotation)", () => {
  it("niveau 1 : prochain entier", () => {
    expect(nextChildCode(null, ["1", "2"])).toBe("3");
  });

  it("après 1.1.24 → 1.1.25 (fin de groupe)", () => {
    const siblings = Array.from({ length: 24 }, (_, i) => `1.1.${i + 1}`);
    expect(nextChildCode("1.1", siblings)).toBe("1.1.25");
  });

  it("ignore les trous, prend max+1 (jamais de réindexation)", () => {
    // 1.1.3 supprimé : la suite reste 1.1.5, pas 1.1.3
    expect(nextChildCode("1.1", ["1.1.1", "1.1.2", "1.1.4"])).toBe("1.1.5");
  });

  it("branche vide → premier enfant", () => {
    expect(nextChildCode("2.1", [])).toBe("2.1.1");
  });
});

describe("canDeleteLine (P8 — intégrité protégée)", () => {
  it("bloque si montant non nul", () => {
    const r = canDeleteLine({ hasNonZeroAmount: true, hasGlEntry: false });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/montant/i);
  });

  it("bloque si écriture GL liée", () => {
    const r = canDeleteLine({ hasNonZeroAmount: false, hasGlEntry: true });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Grand Livre/i);
  });

  it("autorise si rien de lié (→ soft-delete)", () => {
    expect(canDeleteLine({ hasNonZeroAmount: false, hasGlEntry: false }).ok).toBe(
      true,
    );
  });
});

describe("nextSortOrder", () => {
  it("après le dernier frère", () => {
    expect(nextSortOrder([10, 20, 30])).toBe(40);
    expect(nextSortOrder([])).toBe(10);
  });
});
