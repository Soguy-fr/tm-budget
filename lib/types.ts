// Types du domaine (miroir de DATA-MODEL.md). Montants en euros (number).

export type StructureLine = {
  id: string;
  code: string;
  level: 1 | 2 | 3;
  label: string;
  parent_id: string | null;
  sort_order: number;
  active: boolean;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

export type Budget = {
  id: string;
  name: string;
  type: "interne";
  is_active: boolean;
  initial_cash: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type BudgetYear = {
  id: string;
  budget_id: string;
  year: number;
};

export type Bailleur = {
  id: string;
  code: string;
  name: string;
  color: string;
  convention_start: string | null;
  convention_end: string | null;
  montant_conventionne: number | null; // C2/Q4 — plafond contractuel
  created_at: string;
};

export type BudgetMonthly = {
  id: string;
  budget_id: string;
  line_id: string;
  year: number;
  month: number; // 1..12
  amount: number;
  bailleur_id: string | null;
};

export type BudgetLineTotal = {
  id: string;
  budget_id: string;
  line_id: string;
  year: number;
  total_input: number | null;
};

export type BailleurLine = {
  id: string;
  bailleur_id: string;
  code: string;
  label: string;
  sort_order: number;
};

export type BailleurIncomeMonthly = {
  id: string;
  bailleur_id: string;
  year: number;
  month: number;
  amount: number;
};

export type BailleurExpenseMonthly = {
  id: string;
  bailleur_line_id: string;
  year: number;
  month: number;
  amount: number;
};

export type GlEntry = {
  id: string;
  import_batch: string | null;
  entry_date: string; // ISO date
  entry_type: "Dépense" | "Recette";
  label: string | null;
  amount: number;
  raw: Record<string, unknown> | null;
  line_id: string | null;
  bailleur_id: string | null;
  confirmed: boolean;  // C6 — double validation des allocations
  archived: boolean;   // BR-10.2 — purge = soft-delete
  created_at: string;
};

// U1 — rôles applicatifs
export type Role = "admin" | "gestionnaire" | "lecteur";

// U2 — piste d'audit
export type AuditLogEntry = {
  id: string;
  table_name: string;
  record_id: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: string | null;
  changed_at: string;
};

// C4 / BR-11 — clôture mensuelle
export type MonthClosure = {
  id: string;
  year: number;
  month: number; // 1..12
  closed_at: string;
  reopened_at: string | null;
};

// C4 / BR-7.5 — rapprochement bancaire
export type BankReconciliation = {
  id: string;
  year: number;
  month: number; // 1..12
  statement_balance: number;
  note: string | null;
  created_at: string;
};

// Vue v_suivi_depenses
export type SuiviDepense = {
  budget_id: string;
  line_id: string;
  code: string;
  label: string;
  year: number;
  prevu: number;
  realise: number;
};

// Vue v_suivi_bailleurs
export type SuiviBailleur = {
  bailleur_id: string;
  code: string;
  year: number;
  recettes_prevues: number;
  recettes_recues: number;
  depenses_prevues: number;
  depenses_realisees: number;
};
