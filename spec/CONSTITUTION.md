# CONSTITUTION.md

> Principes invariants du projet. Tout choix de conception, de modèle de données ou
> d'interface doit respecter ces règles. En cas de doute pendant l'implémentation,
> ce fichier tranche.

## 1. Identité du projet

**Nom de travail** : Budget ONG (application de prévisionnel et suivi budgétaire multi-bailleurs)

**Objectif** : remplacer les fichiers Excel de prévisionnel et de suivi budgétaire d'une
ONG par une application web, en gérant nativement la complexité du financement
multi-bailleurs (une dépense interne financée par différents bailleurs selon les mois).

**Utilisateur cible (MVP)** : un gestionnaire financier unique (mono-utilisateur).

**Stack** : Next.js (hébergé Vercel) + Supabase (Postgres). React Query / SWR pour le cache client.

## 2. Principes invariants (non négociables)

### P1 — Source de vérité unique
Le **budget interne** porte les montants prévisionnels de dépenses. Les vues bailleur
en **découlent** : elles ne dupliquent jamais une saisie de montant déjà faite côté interne.
Le réalisé provient **exclusivement** du Grand Livre (GL).
> Conséquence : aucune donnée chiffrée n'est saisie deux fois. Une valeur a un seul propriétaire.

### P2 — Structure budgétaire partagée et unique
Il existe **une seule** structure de lignes budgétaires (LB), partagée par tous les budgets
internes et par le suivi. Ajouter/renommer une LB l'affecte partout.

### P3 — Code = label libre, pas de renumérotation
Le code d'une LB (ex : `1.1.1`) est un **label texte libre**, pas un index calculé.
L'ordre d'affichage est géré par un champ séparé (`ordre`). Insérer une ligne ne
renumérote jamais les autres : une nouvelle ligne prend le numéro suivant disponible
dans sa branche (ex : après `1.1.24`, la nouvelle est `1.1.25`, ajoutée en fin de groupe `1.1.x`).

### P4 — Assignation bailleur à la maille (LB × mois)
Chaque couple (ligne budgétaire × mois) est imputé à **un seul bailleur**.
Le cofinancement d'une LB se fait en **répartissant les mois** entre bailleurs
(ex : Loyer = FPC 5 mois + SW 7 mois). **Jamais** de partage d'un même mois entre deux bailleurs.

### P5 — Réalisé = comptabilité de caisse
Le réalisé est compté à la **date de paiement effectif** (sortie/entrée de caisse),
pas à la date d'engagement ni d'échéance.

### P6 — Devise unique
Toute l'application travaille en **euros (€)**. Pas de multi-devises (le GL peut contenir
des colonnes devise mais seules les colonnes en euros sont exploitées).

### P7 — Édition par lot, pas cellule par cellule
L'édition se fait via un **mode édition** explicite (bouton bascule). Les modifications
sont accumulées côté client puis **envoyées en un seul lot** à la validation.
Objectif : minimiser les appels base de données et garantir la cohérence des totaux.

### P8 — Intégrité référentielle protégée
Une LB ne peut **pas** être supprimée tant qu'elle porte un montant non nul dans un
budget ou qu'une écriture du GL lui est assignée. Le renommage est autorisé mais
**avertit** l'utilisateur que le changement se propage partout.

### P9 — Année civile
L'unité de temps est l'**année civile** (janvier → décembre). Un projet pluriannuel est
une succession d'années civiles. Un bailleur dont la convention est décalée
(ex : avril 2026 → mars 2028) est géré en laissant vides les mois non financés.

## 3. Périmètre

L'application couvre, à terme (FULL) :
- la définition de la structure budgétaire ;
- le prévisionnel de dépenses interne, multi-années, avec assignation bailleur par (LB × mois) ;
- des pages bailleur (recettes + dépenses prévues, mappées vers les LB internes) servant aux rapports financiers ;
- l'import du Grand Livre (CSV) et l'allocation des écritures (LB interne + bailleur) ;
- le suivi prévu vs réalisé (par LB et par bailleur) ;
- la trésorerie en prévision glissante (budgété / réel) ;
- la gestion de plusieurs budgets (créer, dupliquer, sélectionner l'actif) ;
- l'export et la purge annuelle.

Le découpage MVP / Phase 2 / Phase 3 est défini dans `ROADMAP.md`.

## 4. Conventions de couleur (héritées de la charte)

| Usage | Couleur |
|---|---|
| Saisie utilisateur (input) | Bleu |
| Calcul / formule (lecture seule) | Noir |
| Écart / alerte / dépassement | Rouge |
| Assignation bailleur | une couleur par bailleur + légende |

Palette de marque disponible : Bleu Nuit `#1E293B`, Vert Émeraude `#0FA86B`,
Blanc Cassé `#F8FAFC`. Typo : Montserrat (titres) / Inter (corps).
