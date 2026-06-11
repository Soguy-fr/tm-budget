# ROADMAP.md

> Séquencement d'implémentation. Pensé pour Claude Code en Spec Driven Design :
> chaque jalon est livrable et testable avant de passer au suivant.

## Stack & mise en place

- **Frontend** : Next.js (App Router) sur Vercel.
- **Base** : Supabase (Postgres) — free tier pour le MVP, upgrade Pro si le client valide.
- **Cache client** : React Query (ou SWR) — clé de la stratégie « édition par lot » (P7).
- **Tableur** : composant maison ou librairie grille (à arbitrer : AG Grid Community / TanStack Table).
- **Graphiques** (Phase 2) : Recharts.

## Jalon 0 — Fondations (½ jour)

- Projet Next.js + connexion Supabase + auth mono-utilisateur (F10.1).
- Migrations des tables de `DATA-MODEL.md`.
- Seed : structure d'exemple + 3 bailleurs (réutiliser la simulation Excel comme jeu de test).

## Jalon 1 — Structure (1 jour) → F1

- Page Structure : arbre, ajout (numéro auto), renommage (avertissement), suppression protégée.
- Tests : P3 (pas de renumérotation), P8 (suppression bloquée).

## Jalon 2 — Budgets (1 jour) → F2

- CRUD budgets, sélection actif (contrainte un seul actif), duplication, solde initial.
- Tests : duplication copie montants + assignations ; un seul actif.

## Jalon 3 — Prévisionnel interne, socle (3 jours) → F3.1–F3.7

- Tableur multi-années (accordéon), saisie mensuelle.
- Totaux + écarts rouges (BR-1.1), Répartir (BR-1.2), Mettre à jour total (BR-1.3).
- Mode édition par lot + Rafraîchir + garde-fou non-enregistré (BR-9).
- **C'est le cœur technique.** Tester l'arrondi de répartition (reste sur dernier mois).

## Jalon 4 — Assignation bailleur (1,5 jour) → F3.8, F3.9

- Couche « Afficher bailleur » (code couleur + légende).
- Édition de l'assignation (ligne « ↳ bailleur » en mode édition).
- Tests : un seul bailleur par maille (P4), cofinancement par partage des mois.

## Jalon 5 — Grand Livre (2 jours) → F5.1–F5.5

- Import CSV (conservation `raw`), table éditable, allocation LB + bailleur.
- Pré-remplissage bailleur depuis le plan (BR-2.4), surlignage non alloués, filtres multi-colonnes.
- Tests : statut d'allocation (BR-4.1), exclusion des non-alloués des agrégats.

## Jalon 6 — Suivi dépenses + ligne réalisé (1,5 jour) → F3.10, F6.1

- Vue `v_suivi_depenses`, page Suivi dépenses.
- Couche « Suivi des dépenses » : ligne réalisé sous chaque LB (BR-5.3).
- Tests : réalisé = Σ GL par LB ; % consommé ; dépassement rouge.

## Jalon 7 — Bailleurs (2,5 jours) → F4.1–F4.6

- Pages bailleur (même gabarit) : lignes A1…, mapping vers LB, recettes prévues, ligne « Non assigné ».
- Vue `v_suivi_bailleurs`, page Suivi bailleurs (F6.2).
- Tests : équilibre recettes = dépenses (BR-3.2), réalisé bailleur depuis GL (BR-6.1).

## Jalon 8 — Trésorerie (1,5 jour) → F7

- Ligne « Solde tréso » intégrée au tableur, sélecteur Budgété/Réel.
- Prévision glissante (BR-7.3, option A : mois en cours budgété jusqu'à clôture).
- Solde initial saisi (BR-7.1). Trous en rouge.
- Tests : chaînage cumul ; bascule réel→budget au bon mois ; **les flux réels
  incluent les écritures non allouées (A1/BR-7.3) — test dédié.**

### ✅ Fin du MVP — démontrable au client

À ce stade, l'outil couvre tout le 🟢 de `FEATURES.md`.

---

## Phase 2 — après validation client

- Jalon 9 — Dépenses prévues bailleur + réalisé sur page bailleur (F4.4, F4.7).
- Jalon 10 — Dashboard graphiques (F8.1–F8.3). 🚧 **en cours** — onglet « Graphiques »
  sur `/suivi`, Recharts, données via `lib/charts.ts` (pur+testé) + vues existantes.
  Voir UI-FLOWS §7.
- Jalon 11 — Export XLSX budget + rapport bailleur (F9.1, F4.8).
- Jalon 12 — Purge annuelle (F9.2), masquer LB vides (F1.6), réordonner LB (F1.4).
  🚧 **en cours** — F1.4 boutons ▲▼ dans Configuration (swap `sort_order`,
  helper pur `reorderSwap`) ; F1.6 toggle « Masquer vides » sur Suivi interne
  (helper pur `lineIsEmpty`) ; F9.2 purge sur Scénarios (reset données
  transactionnelles, structure + bailleurs conservés, double confirmation).
- Jalon 13 — Avertissement/indicateur plan vs réel (F5.6, F5.7), alerte dépassement bailleur (F6.3).
- Jalon 14 — Rigueur comptable (corrections A1–A7 de `AMELIORATIONS.md`) :
  clôture mensuelle + verrouillage (F11.1–F11.3, BR-11), rapprochement bancaire
  (F7.6, BR-7.5), montants signés / avoirs (F5.14, BR-4.4), ligne « Réalisé non
  assigné » (F6.5, BR-6.3), purge en soft-delete + export obligatoire (F9.2 révisée).
  Tests : INV6–INV9.
- Bascule Supabase Pro (backups, storage) si usage réel.

## Phase 3 — industrialisation

- Multi-utilisateurs + rôles + RLS (F10.2).
- Real-time édition concurrente (F10.3).
- Sauvegardes/restauration (F9.3), dashboard complet (F8.4).

---

## Estimation

- **MVP (Jalons 0–8)** : ~16 jours-homme. Réaliste sur ~4 semaines en solo, plus court avec Nathan.
- Risque principal : le **tableur interactif** (Jalons 3–4). Tout le reste est standard.
  → arbitrer tôt le choix de la grille (TanStack Table recommandé pour le contrôle fin de l'édition par lot).

## Définition de « terminé » (par jalon)

1. Les règles BR référencées passent leurs tests.
2. Zéro erreur de cohérence (invariants INV1–INV5 vérifiés là où ils s'appliquent).
3. Le jalon est utilisable de bout en bout sans console développeur.
