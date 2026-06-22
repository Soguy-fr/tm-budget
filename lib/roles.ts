// U1 — Rôles & permissions. Matrice pure, testable.
// admin > gestionnaire > lecteur. Enforcement : RLS (0006) + server actions.
import type { Role } from "./types";

export type AppAction =
  | "edit_budget"          // saisir montants/totaux du prévisionnel
  | "import_gl"            // importer un CSV Grand Livre
  | "allocate_gl"          // allouer LB/bailleur sur une écriture
  | "confirm_allocation"   // C6 — confirmer une allocation en attente
  | "reconcile"            // C4 — saisir le solde de relevé bancaire
  | "close_month"          // C4 — clore/réouvrir un mois
  | "manage_structure"     // CRUD lignes budgétaires
  | "manage_bailleurs"     // CRUD bailleurs, lignes, mapping
  | "manage_budgets"       // CRUD budgets, activation, duplication
  | "purge"                // purge annuelle
  | "view_audit"           // U2 — consulter la piste d'audit
  | "manage_roles"         // U1 — attribuer les rôles
  | "use_ai";              // I1/I2 — suggestions + chatbot

const GESTIONNAIRE_ACTIONS: ReadonlySet<AppAction> = new Set([
  "edit_budget", "import_gl", "allocate_gl", "reconcile", "use_ai",
]);

export function can(role: Role, action: AppAction): boolean {
  if (role === "admin") return true;
  if (role === "gestionnaire") return GESTIONNAIRE_ACTIONS.has(action);
  return false; // lecteur : lecture seule
}

export function isRole(x: unknown): x is Role {
  return x === "admin" || x === "gestionnaire" || x === "lecteur";
}

// C6 — une allocation posée par un non-admin part « à confirmer ».
export function allocationConfirmedByDefault(role: Role): boolean {
  return role === "admin";
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  gestionnaire: "Gestionnaire",
  lecteur: "Lecteur",
};
