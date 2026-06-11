# DATA-MODEL.md

> Schéma Postgres concret (Supabase). Traduit `DOMAIN-MODEL.md` en tables.
> Tous les montants sont en centimes d'euro (entier) pour éviter les erreurs de flottant,
> ou en `numeric(14,2)` si l'on préfère la lisibilité — **choix retenu : `numeric(14,2)`**.

## 1. Conventions

- Clés primaires : `uuid` (gen_random_uuid()).
- Horodatage : `created_at`, `updated_at` (timestamptz, défaut now()).
- Montants : `numeric(14,2)`, en euros.
- Mois : entier `1..12`. Année : entier.
- Pas de RLS multi-utilisateur au MVP (mono-utilisateur). RLS à ajouter en Phase multi-users.

## 2. Tables

### structure_lines
La structure budgétaire unique et partagée.
```sql
create table structure_lines (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,           -- '1.1.1' (label libre, P3)
  level        smallint not null check (level between 1 and 3),
  label        text not null,
  parent_id    uuid references structure_lines(id),
  sort_order   int not null,                   -- ordre d'affichage, indépendant du code
  active       boolean not null default true,
  comment      text,                            -- commentaire libre (F1.7), bulle au survol
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on structure_lines(parent_id);
create index on structure_lines(sort_order);
```

### budgets
```sql
create table budgets (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,                -- libre, nommé par l'utilisateur
  type           text not null default 'interne' check (type in ('interne')),
  is_active      boolean not null default false,
  initial_cash   numeric(14,2) not null default 0,  -- solde tréso au 1er janv. de la 1re année
  archived       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
-- au plus un budget actif :
create unique index one_active_budget on budgets(is_active) where is_active = true;
```

### budget_years
```sql
create table budget_years (
  id          uuid primary key default gen_random_uuid(),
  budget_id   uuid not null references budgets(id) on delete cascade,
  year        int not null,
  unique (budget_id, year)
);
```

### bailleurs
```sql
create table bailleurs (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,          -- 'FPC'
  name          text not null,                 -- 'Fondation ...'
  color         text not null,                 -- hex, pour le code couleur
  convention_start date,                       -- période décalée possible (P9)
  convention_end   date,
  created_at    timestamptz not null default now()
);
```

### budget_monthly
La maille atomique du prévisionnel interne : (budget × LB × année × mois).
```sql
create table budget_monthly (
  id           uuid primary key default gen_random_uuid(),
  budget_id    uuid not null references budgets(id) on delete cascade,
  line_id      uuid not null references structure_lines(id),
  year         int not null,
  month        smallint not null check (month between 1 and 12),
  amount       numeric(14,2) not null default 0,   -- saisie (bleu)
  bailleur_id  uuid references bailleurs(id),       -- un seul bailleur / maille (P4), null = non assigné
  unique (budget_id, line_id, year, month)
);
create index on budget_monthly(budget_id, year);
create index on budget_monthly(line_id);
create index on budget_monthly(bailleur_id);
```

### budget_line_totals (optionnel)
Stocke le « total annuel saisi » d'une LB quand il diffère volontairement de la somme des mois
(permet d'afficher l'écart rouge sans l'écraser). Si non présent, total = Σ mois.
```sql
create table budget_line_totals (
  id          uuid primary key default gen_random_uuid(),
  budget_id   uuid not null references budgets(id) on delete cascade,
  line_id     uuid not null references structure_lines(id),
  year        int not null,
  total_input numeric(14,2),                    -- total saisi par l'utilisateur (bleu)
  unique (budget_id, line_id, year)
);
```

### bailleur_lines
Nomenclature propre au bailleur (A1, A2…), mappée vers des LB internes.
```sql
create table bailleur_lines (
  id           uuid primary key default gen_random_uuid(),
  bailleur_id  uuid not null references bailleurs(id) on delete cascade,
  code         text not null,                  -- 'A1'
  label        text not null,                  -- 'Ressources humaines'
  sort_order   int not null,
  unique (bailleur_id, code)
);
```

### bailleur_line_mapping
Mapping N–N : une ligne bailleur ↔ une ou plusieurs LB internes.
```sql
create table bailleur_line_mapping (
  bailleur_line_id uuid not null references bailleur_lines(id) on delete cascade,
  line_id          uuid not null references structure_lines(id),
  primary key (bailleur_line_id, line_id)
);
```

### bailleur_expense_monthly
Dépenses prévues côté bailleur (même gabarit mensuel multi-années que l'interne).
```sql
create table bailleur_expense_monthly (
  id               uuid primary key default gen_random_uuid(),
  bailleur_line_id uuid not null references bailleur_lines(id) on delete cascade,
  year             int not null,
  month            smallint not null check (month between 1 and 12),
  amount           numeric(14,2) not null default 0,
  unique (bailleur_line_id, year, month)
);
```

### bailleur_income_monthly
Recettes prévues (déblocages attendus) par bailleur, par mois.
```sql
create table bailleur_income_monthly (
  id           uuid primary key default gen_random_uuid(),
  bailleur_id  uuid not null references bailleurs(id) on delete cascade,
  year         int not null,
  month        smallint not null check (month between 1 and 12),
  amount       numeric(14,2) not null default 0,
  unique (bailleur_id, year, month)
);
```

### gl_entries
Le Grand Livre importé + allocations.
```sql
create table gl_entries (
  id            uuid primary key default gen_random_uuid(),
  import_batch  uuid,                           -- référence l'import CSV
  entry_date    date not null,                  -- date de paiement (caisse, P5)
  entry_type    text not null check (entry_type in ('Dépense','Recette')),
  label         text,
  amount        numeric(14,2) not null,         -- SIGNÉ : négatif = avoir/remboursement (BR-4.4)
  -- métadonnées comptables natives conservées (colonnes du CSV source) :
  raw           jsonb,                          -- toutes les colonnes d'origine du grand livre
  -- allocations (UI) :
  line_id       uuid references structure_lines(id),   -- LB interne (null si recette pure)
  bailleur_id   uuid references bailleurs(id),
  archived      boolean not null default false,  -- purge = soft-delete (BR-10.2) ; jamais de delete physique
  created_at    timestamptz not null default now()
);
create index on gl_entries(entry_date);
create index on gl_entries(line_id);
create index on gl_entries(bailleur_id);
create index on gl_entries(entry_type);
```

### gl_imports
Trace des imports CSV (pour purge/rollback).
```sql
create table gl_imports (
  id           uuid primary key default gen_random_uuid(),
  filename     text,
  row_count    int,
  imported_at  timestamptz not null default now()
);
```

### month_closures
Clôture mensuelle explicite (BR-11). Le dernier mois clos = `M` de la trésorerie réelle (BR-7.3).
```sql
create table month_closures (
  id          uuid primary key default gen_random_uuid(),
  year        int not null,
  month       smallint not null check (month between 1 and 12),
  closed_at   timestamptz not null default now(),
  reopened_at timestamptz,                      -- null = clos ; non-null = réouvert (tracé, BR-11.2)
  unique (year, month)
);
```
> Le verrouillage (BR-11.2) s'applique côté API : refuser tout upsert sur
> `budget_monthly` (année, mois clos) et toute modification d'écriture GL
> (`entry_date` dans un mois clos) tant que `reopened_at` est null.

### bank_reconciliations
Rapprochement bancaire mensuel (BR-7.5) : solde du relevé saisi par l'utilisateur.
```sql
create table bank_reconciliations (
  id                 uuid primary key default gen_random_uuid(),
  year               int not null,
  month              smallint not null check (month between 1 and 12),
  statement_balance  numeric(14,2) not null,    -- solde du relevé en fin de mois
  note               text,
  created_at         timestamptz not null default now(),
  unique (year, month)
);
```
> `écart_rapprochement` = `statement_balance` − solde calculé (mode Réel) :
> calculé côté application, jamais stocké.

## 3. Vues (calculs agrégés côté base — limite les appels)

### v_suivi_depenses — prévu vs réalisé par LB
```sql
create view v_suivi_depenses as
select
  b.id  as budget_id,
  sl.id as line_id,
  sl.code,
  sl.label,
  by_.year,
  coalesce(sum(bm.amount),0)                                   as prevu,
  coalesce((select sum(g.amount) from gl_entries g
            where g.line_id = sl.id and g.entry_type='Dépense'
              and g.archived = false
              and extract(year from g.entry_date) = by_.year),0) as realise
from budgets b
join budget_years by_ on by_.budget_id = b.id
join structure_lines sl on sl.level = 3
left join budget_monthly bm
  on bm.budget_id = b.id and bm.line_id = sl.id and bm.year = by_.year
group by b.id, sl.id, sl.code, sl.label, by_.year;
```

### v_suivi_bailleurs — recettes/dépenses prévues vs réalisées par bailleur
```sql
create view v_suivi_bailleurs as
select
  ba.id as bailleur_id, ba.code, by_.year,
  coalesce((select sum(i.amount) from bailleur_income_monthly i
            where i.bailleur_id=ba.id and i.year=by_.year),0)            as recettes_prevues,
  coalesce((select sum(g.amount) from gl_entries g
            where g.bailleur_id=ba.id and g.entry_type='Recette'
              and g.archived=false
              and extract(year from g.entry_date)=by_.year),0)           as recettes_recues,
  coalesce((select sum(e.amount) from bailleur_expense_monthly e
            join bailleur_lines bl on bl.id=e.bailleur_line_id
            where bl.bailleur_id=ba.id and e.year=by_.year),0)           as depenses_prevues,
  coalesce((select sum(g.amount) from gl_entries g
            where g.bailleur_id=ba.id and g.entry_type='Dépense'
              and g.archived=false
              and extract(year from g.entry_date)=by_.year),0)           as depenses_realisees
from bailleurs ba
cross join (select distinct year from budget_years) by_;
```

### v_realise_non_assigne — réconciliation suivi bailleur (BR-6.3)
Dépenses réalisées avec LB mais sans bailleur : comptées dans le suivi des dépenses,
affichées en ligne « Réalisé non assigné » dans le suivi bailleur.
```sql
create view v_realise_non_assigne as
select
  extract(year from g.entry_date)::int as year,
  sum(g.amount)                        as realise_non_assigne
from gl_entries g
where g.entry_type='Dépense' and g.line_id is not null
  and g.bailleur_id is null and g.archived=false
group by 1;
```

> La trésorerie (prévision glissante budgété/réel) est calculée côté application
> car elle dépend du dernier mois clos (`month_closures`, BR-11.1) et du chaînage
> des soldes (voir BUSINESS-RULES). **Attention (BR-7.3)** : les flux réels de
> trésorerie somment **toutes** les écritures GL non archivées du mois, y compris
> les « À allouer » (pas de filtre `line_id`/`bailleur_id`) — la caisse reflète la
> banque, pas le suivi analytique.

## 4. Notes d'implémentation

- Charger un budget = 1 requête sur `budget_monthly` (filtre budget+année) + 1 sur la structure.
- Les vues `v_suivi_*` servent les pages de suivi en une requête.
- L'écriture en mode édition par lot (P7) = un `upsert` groupé sur `budget_monthly`.
- Conserver `raw jsonb` du GL permet de ne rien perdre des colonnes comptables d'origine.
