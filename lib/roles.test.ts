import { describe, it, expect } from "vitest";
import { can, isRole, allocationConfirmedByDefault, type AppAction } from "./roles";

describe("can (U1 — matrice de permissions)", () => {
  it("admin : tout", () => {
    const all: AppAction[] = [
      "edit_budget", "import_gl", "allocate_gl", "confirm_allocation",
      "reconcile", "close_month", "manage_structure", "manage_bailleurs",
      "manage_budgets", "purge", "view_audit", "manage_roles", "use_ai",
    ];
    for (const a of all) expect(can("admin", a)).toBe(true);
  });

  it("gestionnaire : transactionnel oui, référentiel/clôture/audit non", () => {
    expect(can("gestionnaire", "edit_budget")).toBe(true);
    expect(can("gestionnaire", "import_gl")).toBe(true);
    expect(can("gestionnaire", "allocate_gl")).toBe(true);
    expect(can("gestionnaire", "reconcile")).toBe(true);
    expect(can("gestionnaire", "use_ai")).toBe(true);
    expect(can("gestionnaire", "confirm_allocation")).toBe(false); // C6
    expect(can("gestionnaire", "close_month")).toBe(false);
    expect(can("gestionnaire", "manage_structure")).toBe(false);
    expect(can("gestionnaire", "manage_budgets")).toBe(false);
    expect(can("gestionnaire", "purge")).toBe(false);
    expect(can("gestionnaire", "view_audit")).toBe(false);
    expect(can("gestionnaire", "manage_roles")).toBe(false);
  });

  it("lecteur : rien", () => {
    expect(can("lecteur", "edit_budget")).toBe(false);
    expect(can("lecteur", "allocate_gl")).toBe(false);
    expect(can("lecteur", "use_ai")).toBe(false);
  });
});

describe("allocationConfirmedByDefault (C6)", () => {
  it("admin auto-confirmé, gestionnaire à confirmer", () => {
    expect(allocationConfirmedByDefault("admin")).toBe(true);
    expect(allocationConfirmedByDefault("gestionnaire")).toBe(false);
    expect(allocationConfirmedByDefault("lecteur")).toBe(false);
  });
});

describe("isRole", () => {
  it("valide les rôles connus", () => {
    expect(isRole("admin")).toBe(true);
    expect(isRole("gestionnaire")).toBe(true);
    expect(isRole("lecteur")).toBe(true);
    expect(isRole("superadmin")).toBe(false);
    expect(isRole(null)).toBe(false);
  });
});
