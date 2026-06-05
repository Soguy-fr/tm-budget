# FEATURES.md

> Inventaire complet des fonctionnalités (projet FULL), découpé par phase.
> Chaque fonctionnalité référence les règles de `BUSINESS-RULES.md` (BR-x).

## Légende
- 🟢 **MVP** — pour la démonstration au client
- 🟡 **Phase 2** — après validation du client
- 🔵 **Phase 3** — confort / industrialisation

---

## F1 — Structure budgétaire

| # | Fonctionnalité | Phase | Règles |
|---|---|---|---|
| F1.1 | Afficher l'arbre hiérarchique des LB (niveaux 1/2/3) | 🟢 | P2, P3 |
| F1.2 | Ajouter une LB (numéro suivant dans la branche, pas de renumérotation) | 🟢 | P3 |
| F1.3 | Renommer une LB avec avertissement de propagation | 🟢 | P8 |
| F1.4 | Réordonner les LB (champ ordre) | 🟡 | P3 |
| F1.5 | Supprimer une LB (interdit si montant/écriture liés ; sinon soft-delete) | 🟢 | P8 |
| F1.6 | Masquer les LB vides (bouton « masquer vide ») | 🟡 | — |

## F2 — Gestion des budgets

| # | Fonctionnalité | Phase | Règles |
|---|---|---|---|
| F2.1 | Créer un budget nommé librement | 🟢 | — |
| F2.2 | Sélectionner le budget actif (un seul à la fois) | 🟢 | — |
| F2.3 | Dupliquer le budget actif (copie montants + assignations) | 🟢 | — |
| F2.4 | Archiver un budget | 🟡 | — |
| F2.5 | Saisir le solde initial de trésorerie (1er janvier, 1re année) | 🟢 | BR-7.1 |

## F3 — Prévisionnel interne (page tableur principale)

| # | Fonctionnalité | Phase | Règles |
|---|---|---|---|
| F3.1 | Saisir les montants mensuels par LB | 🟢 | — |
| F3.2 | Multi-années sur la même page (accordéon par année) | 🟢 | BR-8.2 |
| F3.3 | Ajouter / retirer une année (boutons) | 🟢 | BR-8.1 |
| F3.4 | Total annuel + écart vs Σ mois (rouge si ≠) | 🟢 | BR-1.1 |
| F3.5 | Bouton « Répartir » (total → 12 mois, arrondi euro, reste sur dernier mois) | 🟢 | BR-1.2 |
| F3.6 | Bouton « Mettre à jour le total » (total = Σ mois) | 🟢 | BR-1.3 |
| F3.7 | Mode édition par lot (bouton Éditer) + Rafraîchir + garde-fou non-enregistré | 🟢 | BR-9.1, BR-9.2 |
| F3.8 | Bouton « Afficher bailleur » → code couleur par cellule + légende | 🟢 | BR-2.3 |
| F3.9 | Éditer l'assignation bailleur d'un (LB × mois) | 🟢 | BR-2.1, BR-2.2 |
| F3.10 | Bouton « Suivi des dépenses » → ligne réalisé sous la ligne prévue | 🟢 | BR-5.3 |
| F3.11 | Ligne « Solde trésorerie » en bas, masquable, sélecteur Budgété/Réel | 🟢 | BR-7.* |
| F3.12 | Accordéon sur les LB : replier/déplier une catégorie ; boutons globaux « tout déplier », « catégories seules » (niv.1), « cat. + sous-cat. » (niv.1+2) | 🟢 | BR-8.3 |
| F3.13 | Total annuel du budget affiché dans l'entête de chaque année (Σ de toutes les LB niv.3) | 🟢 | BR-8.4 |
| F3.14 | Clic sur une cellule mois (hors édition) → ouvre le Grand Livre filtré sur cette LB + année + mois | 🟢 | — |

## F4 — Bailleurs (pages dédiées, même gabarit que l'interne)

| # | Fonctionnalité | Phase | Règles |
|---|---|---|---|
| F4.1 | Créer un bailleur (nom, code, couleur, période convention) | 🟢 | — |
| F4.2 | Créer des lignes bailleur (A1, A2…) | 🟢 | — |
| F4.3 | Mapper une ligne bailleur → une ou plusieurs LB internes | 🟢 | BR-3.1 |
| F4.4 | Saisir les dépenses prévues du bailleur (mensuel, multi-années, accordéon) | 🟡 | BR-3.1 |
| F4.5 | Saisir les recettes prévues (déblocages attendus par mois) | 🟢 | BR-3.3 |
| F4.6 | Ligne « Non assigné » calculée (équilibre recettes = dépenses) | 🟢 | BR-3.2 |
| F4.7 | Affichage du réalisé sur la page bailleur (bouton, comme l'interne) | 🟡 | BR-5.3, BR-6.1 |
| F4.8 | Export rapport financier par bailleur | 🟡 | BR-10.1 |

## F5 — Grand Livre

| # | Fonctionnalité | Phase | Règles |
|---|---|---|---|
| F5.1 | Importer un GL au format CSV (conserver toutes colonnes en `raw`) | 🟢 | — |
| F5.2 | Allouer une écriture à une LB interne | 🟢 | BR-4.1 |
| F5.3 | Allouer / corriger le bailleur (pré-rempli depuis le plan) | 🟢 | BR-2.4, BR-4.2 |
| F5.4 | Surlignage des écritures non allouées | 🟢 | BR-4.1 |
| F5.5 | Filtrer par plusieurs colonnes (tri rapide pour classer) | 🟢 | — |
| F5.6 | Avertissement « réalisé non conforme au plan » | 🟡 | BR-4.2 |
| F5.7 | Indicateur conforme au plan (oui/non) par écriture | 🟡 | BR-4.2 |
| F5.8 | Filtre date en accordéon (année puis mois) + bouton « Réinitialiser les filtres » | 🟢 | — |
| F5.9 | Largeur des colonnes ajustable (poignée de redimensionnement) | 🟢 | — |
| F5.10 | Colonne « Description LB » + menu déroulant LB affichant code ET intitulé, trié dans l'ordre de la structure | 🟢 | — |
| F5.11 | Sur GL filtré par LB+année+mois : bandeau récap « réalisé total vs planifié pour la période » | 🟢 | BR-5.1 |
| F5.12 | Bouton « Retour au budget » sur le GL ouvert depuis une cellule du tableur (revient à la bonne ligne) | 🟢 | F3.14 |

## F6 — Suivi

| # | Fonctionnalité | Phase | Règles |
|---|---|---|---|
| F6.1 | Suivi dépenses par LB : prévu / réalisé / écart / % consommé | 🟢 | BR-5.1, BR-5.2 |
| F6.2 | Suivi par bailleur : recettes & dépenses, prévu vs réalisé | 🟢 | BR-6.1 |
| F6.3 | Alerte dépassement bailleur | 🟡 | BR-6.2 |
| F6.4 | Suivi mois par mois (réalisé cumulé vs prévu) | 🟡 | BR-5.* |

## F7 — Trésorerie

| # | Fonctionnalité | Phase | Règles |
|---|---|---|---|
| F7.1 | Solde tréso intégré au tableau interne (ligne du bas, Budgété/Réel) | 🟢 | BR-7.* |
| F7.2 | Prévision glissante (réel jusqu'au dernier mois clos, budget ensuite) | 🟢 | BR-7.3 |
| F7.3 | Chaînage des soldes entre années | 🟡 | BR-7.1 |
| F7.4 | Détection visuelle des trous de trésorerie | 🟢 | BR-7.4 |

## F8 — Dashboard

| # | Fonctionnalité | Phase | Règles |
|---|---|---|---|
| F8.1 | Graphique dépenses vs budget par LB | 🟡 | — |
| F8.2 | Répartition des dépenses par catégorie / par bailleur | 🟡 | — |
| F8.3 | Courbe trésorerie cumulée prévu vs réel | 🟡 | BR-7.* |
| F8.4 | Tableau de bord complet multi-indicateurs | 🔵 | — |

## F9 — Export & maintenance

| # | Fonctionnalité | Phase | Règles |
|---|---|---|---|
| F9.1 | Export XLSX d'un budget + suivis | 🟡 | BR-10.1 |
| F9.2 | Purge annuelle (export puis reset, structure conservée) | 🟡 | BR-10.2 |
| F9.3 | Sauvegardes / restauration | 🔵 | — |

## F10 — Transverse

| # | Fonctionnalité | Phase | Règles |
|---|---|---|---|
| F10.1 | Authentification (mono-utilisateur au départ) | 🟢 | — |
| F10.2 | Multi-utilisateurs + rôles (admin/lecteur) + RLS | 🔵 | — |
| F10.3 | Real-time (édition concurrente) | 🔵 | — |

---

## Définition du MVP (🟢 uniquement)

Le MVP démontrable = structure + budgets (créer/dupliquer/sélectionner) + page prévisionnel
interne complète (multi-années, totaux/écarts, répartir, mode édition, code couleur bailleur,
ligne réalisé, ligne trésorerie) + bailleurs (création, lignes, mapping, recettes, non-assigné)
+ GL (import, allocation, filtres) + suivi dépenses & bailleurs + trésorerie glissante.

C'est volontairement ambitieux pour le MVP : c'est le **cœur de valeur** qui permet au client
de juger l'outil. Les graphiques, exports et confort sont en Phase 2+.
