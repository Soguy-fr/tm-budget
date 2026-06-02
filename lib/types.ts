// Types du domaine (miroir de DATA-MODEL.md). Montants en euros (number).

export type StructureLine = {
  id: string;
  code: string;
  level: 1 | 2 | 3;
  label: string;
  parent_id: string | null;
  sort_order: number;
  active: boolean;
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
