import { describe, it, expect } from "vitest";
import { parseCsv, detectDelimiter } from "./csv";
import {
  allocationStatus,
  parseAmount,
  parseDate,
  parseType,
  isAllocated,
  findColumn,
} from "./gl";

describe("parseCsv", () => {
  it("détecte le délimiteur ; et gère les guillemets", () => {
    const text = 'Date;Type;Libellé;Montant\n2026-01-05;Dépense;"Salaire; Director";2 500\n';
    const { headers, rows } = parseCsv(text);
    expect(headers).toEqual(["Date", "Type", "Libellé", "Montant"]);
    expect(rows[0]["Libellé"]).toBe("Salaire; Director"); // ; dans guillemets préservé
    expect(rows[0]["Montant"]).toBe("2 500");
  });

  it("délimiteur virgule par défaut", () => {
    expect(detectDelimiter("a,b,c")).toBe(",");
    expect(detectDelimiter("a;b;c")).toBe(";");
  });
});

describe("parseAmount", () => {
  it("gère virgule décimale et espaces milliers", () => {
    expect(parseAmount("2 500,50")).toBe(2500.5);
    expect(parseAmount("2,500.50")).toBe(2500.5);
    expect(parseAmount("2500")).toBe(2500);
    expect(parseAmount("95 €")).toBe(95);
  });
});

describe("parseDate (Q7)", () => {
  it("accepte AAAA-MM-JJ et JJ/MM/AAAA", () => {
    expect(parseDate("2026-01-05")).toBe("2026-01-05");
    expect(parseDate("05/01/2026")).toBe("2026-01-05");
    expect(parseDate("5/1/2026")).toBe("2026-01-05");
    expect(parseDate("nope")).toBeNull();
  });
});

describe("parseType", () => {
  it("normalise dépense/recette", () => {
    expect(parseType("Dépense")).toBe("Dépense");
    expect(parseType("recette")).toBe("Recette");
    expect(parseType("crédit")).toBe("Recette");
    expect(parseType("xyz")).toBeNull();
  });
});

describe("allocationStatus (BR-4.1)", () => {
  it("Dépense OK seulement si LB + bailleur", () => {
    expect(allocationStatus({ entry_type: "Dépense", line_id: "L", bailleur_id: "B" })).toBe("OK");
    expect(allocationStatus({ entry_type: "Dépense", line_id: "L", bailleur_id: null })).toBe("À allouer");
    expect(allocationStatus({ entry_type: "Dépense", line_id: null, bailleur_id: "B" })).toBe("À allouer");
  });
  it("Recette OK si bailleur (LB facultative)", () => {
    expect(allocationStatus({ entry_type: "Recette", line_id: null, bailleur_id: "B" })).toBe("OK");
    expect(allocationStatus({ entry_type: "Recette", line_id: null, bailleur_id: null })).toBe("À allouer");
  });
});

describe("isAllocated (exclusion des agrégats)", () => {
  it("exclut les écritures à allouer", () => {
    expect(isAllocated({ entry_type: "Dépense", line_id: "L", bailleur_id: "B" })).toBe(true);
    expect(isAllocated({ entry_type: "Dépense", line_id: null, bailleur_id: null })).toBe(false);
  });
});

describe("findColumn", () => {
  it("trouve une colonne par candidats (accents/casse)", () => {
    const headers = ["Date paiement", "Libellé", "Montant (€)"];
    expect(findColumn(headers, ["libelle", "label"])).toBe("Libellé");
    expect(findColumn(headers, ["absent"])).toBeNull();
  });
});
