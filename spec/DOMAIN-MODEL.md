# DOMAIN-MODEL.md

> Modèle conceptuel : les entités du domaine, leurs relations, et les règles
> d'intégrité. Indépendant de la base de données (voir `DATA-MODEL.md` pour le schéma
> Postgres concret) et de l'interface (voir `UI-FLOWS.md`).

## 1. Vue d'ensemble

```
                    ┌─────────────────────┐
                    │   STRUCTURE (unique) │
                    │   Lignes budgétaires │
                    └──────────┬──────────┘
                               │ partagée par
              ┌────────────────┼────────────────┐
              │                                  │
     ┌────────▼─────────┐              ┌─────────▼──────────┐
     │     BUDGET       │  1 actif     │   PÉRIODE (année)  │
     │ (interne, nommé) │──────────────│   Jan..Déc         │
     └────────┬─────────┘              └─────────┬──────────┘
              │                                  │
     ┌────────▼──────────────────────────────────▼─────────┐
     │              MONTANT MENSUEL PRÉVU                    │
     │  (budget × LB × année × mois) → montant + bailleur    │
     └────────┬──────────────────────────────────┬─────────┘
              │ agrège vers                       │ réalisé via
     ┌────────▼─────────┐              ┌──────────▼─────────┐
     │     BAILLEUR     │              │   GRAND LIVRE (GL) │
     │  + lignes A1..An │              │  écritures + alloc │
     │  + recettes prév.│              └────────────────────┘
     └──────────────────┘
```

## 2. Entités

### 2.1 Ligne budgétaire (LB) — *structure*

La brique de la structure budgétaire, partagée par tous les budgets.

- `code` : label texte libre, unique (ex : `1.1.1`). Voir P3.
- `niveau` : 1 (catégorie), 2 (sous-catégorie), 3 (ligne). **Seul le niveau 3 porte des montants.**
- `intitulé` : libellé lisible (ex : « Director »).
- `parent` : référence à la LB de niveau supérieur (null pour niveau 1).
- `ordre` : entier d'affichage, indépendant du code.
- `actif` : booléen (soft-delete possible si jamais utilisée).

**Règles**

- Une LB de niveau 1 ou 2 n'a jamais de montant propre : ses totaux sont la somme de ses enfants.
- Suppression interdite si montant non nul ou écriture GL liée (P8). Sinon soft-delete.
- Renommage autorisé, avec avertissement de propagation (P8).

### 2.2 Budget

Un conteneur de prévisionnel, nommé librement par l'utilisateur.

- `nom` : libre (ex : « Budget 2026 v1 », « Budget révisé juin »).
- `type` : `interne` (un budget interne actif à la fois sert de référence).
- `est_actif` : un seul budget marqué actif à un instant donné.
- `solde_initial` : solde de trésorerie saisi au 1er janvier de la **première** année du budget (P : voir BUSINESS-RULES tréso).
- `archivé` : booléen.

**Règles**

- Tous les budgets internes partagent la même structure de LB (P2).
- Dupliquer un budget copie l'intégralité de ses montants et assignations.
- Un seul budget actif ; sélectionner un nouveau désactive le précédent.

### 2.3 Période (année)

Une année civile rattachée à un budget.

- `année` : entier (ex : 2026).
- Ajout/retrait d'années à la demande (accordéon dans l'UI).

### 2.4 Montant mensuel prévu

La maille atomique du prévisionnel de dépense.

- clé : (budget, LB niveau 3, année, mois ∈ 1..12).
- `montant` : euros (saisie bleue).
- `bailleur` : référence au bailleur imputé pour ce (LB × mois). Peut être nul (= non assigné).

**Règles**

- Un seul bailleur par maille (P4).
- Le **total annuel saisi** d'une LB peut différer de la somme de ses 12 mois :
  l'écart est affiché (rouge) et réconciliable via les boutons « Répartir » / « Mettre à jour le total » (voir BUSINESS-RULES).

### 2.5 Bailleur

Une source de financement (ex : FPC, SW, JFN).

- `nom`, `code` court, `couleur` (pour le code couleur d'assignation).
- `période_convention` : date début / fin (peut être décalée de l'année civile, P9).
- `lignes_bailleur` : liste de lignes propres au bailleur (voir 2.6).
- `recettes_prévues` : prévisionnel mensuel des déblocages attendus (voir 2.7).

### 2.6 Ligne bailleur

Une ligne de la nomenclature **propre** au bailleur (ex : `A1 Ressources humaines`),
mappée vers une ou plusieurs LB internes.

- `code` bailleur (ex : `A1`), `intitulé`.
- `lb_internes_mappées` : une ou plusieurs LB internes (ex : `1.1.1` + `1.1.2`).
- `montants_prévus` : dépenses prévues, mensuelles, multi-années (même gabarit que l'interne).

**Règles**

- La structure d'un bailleur est libre et créée au fil de l'eau (pas de structure imposée).
- Le mapping ligne bailleur → LB internes est le pont entre les deux mondes.
- Une ligne calculée **« Non assigné »** porte le solde (recettes prévues − dépenses prévues assignées)
  pour garantir l'équilibre recettes = dépenses dans la vue bailleur. Calculée, non saisie.

### 2.7 Recette prévue (déblocage attendu)

Le prévisionnel d'entrée d'argent d'un bailleur.

- clé : (bailleur, année, mois).
- `montant` attendu ce mois-là (saisie bleue). Ex : Fév 60 000, Avr 40 000.
- Pas de modélisation en pourcentages : on saisit directement le montant espéré par mois.

### 2.8 Écriture du Grand Livre (GL)

Une ligne du grand livre comptable importée (CSV), représentant le réalisé.

- Colonnes natives importées : Date, Type (Dépense/Recette), Libellé, Montant (€) **signé**
  (négatif = avoir/remboursement, BR-4.4), + métadonnées comptables conservées.
- `lb_interne` : allocation (saisie/pré-remplie en UI). Vide pour une recette pure.
- `bailleur` : allocation (saisie/pré-remplie). Obligatoire pour calcul du suivi bailleur.
- `statut_allocation` : OK / À allouer (calculé).

**Règles**

- Pré-remplissage du bailleur d'après le plan (le bailleur prévu pour cette LB × mois). Modifiable.
- Réalité ≠ plan autorisé (P : Tension D) : seul le total annuel par bailleur doit rester cohérent.
  Un écart plan/réel produit un **avertissement non bloquant**, pas un blocage.
- Une écriture non allouée est surlignée et exclue des agrégats **analytiques**
  (suivi LB, suivi bailleur) jusqu'à allocation — mais elle compte **toujours**
  dans la trésorerie réelle (la caisse reflète la banque, BR-7.3/A1).
- Une écriture n'est jamais supprimée physiquement : la purge annuelle l'archive
  (`archived`, BR-10.2) — conservation comptable 10 ans.

### 2.9 Clôture mensuelle

L'acte explicite qui fige un mois (BR-11).

- clé : (année, mois). États : ouvert → clos → (réouvert, tracé) → clos.
- Le dernier mois clos définit la frontière réel/budgété de la trésorerie (BR-7.3).
- Mois clos = écritures GL du mois, leurs allocations et les montants budgétés
  du mois **verrouillés** (BR-11.2).

### 2.10 Rapprochement bancaire

Le contrôle de complétude du GL (BR-7.5).

- clé : (année, mois). `solde_relevé` saisi par l'utilisateur.
- `écart` = solde_relevé − solde calculé (réel) : calculé, jamais saisi.
- Écart ≠ 0 = signal : GL incomplet, doublon d'import, ou mouvement hors GL.

## 3. Relations clés

| Relation                               | Cardinalité            | Note                            |
| -------------------------------------- | ---------------------- | ------------------------------- |
| Structure → Budgets                    | 1 structure, N budgets | structure partagée (P2)         |
| Budget → Périodes                      | 1 → N                  | années civiles                  |
| (Budget,LB,Année,Mois) → Montant prévu | 1 → 1                  | maille atomique                 |
| Montant prévu → Bailleur               | N → 0..1               | un bailleur max par maille (P4) |
| Bailleur → Lignes bailleur             | 1 → N                  | nomenclature propre             |
| Ligne bailleur → LB internes           | N → N                  | mapping                         |
| Bailleur → Recettes prévues            | 1 → N (par mois)       | déblocages attendus             |
| GL → LB interne                        | N → 0..1               | allocation                      |
| GL → Bailleur                          | N → 0..1               | allocation                      |

## 4. Invariants de cohérence (à vérifier en continu)

- **INV1** : pour toute LB niveau 3, `total_annuel_saisi == Σ(12 mois)` OU un écart est affiché (rouge).
- **INV2** : tout (LB × mois) avec montant > 0 devrait avoir un bailleur ; sinon « non assigné » signalé.
- **INV3** : dans une vue bailleur, `Σ recettes prévues == Σ dépenses prévues` (assurée par la ligne « Non assigné »).
- **INV4** : un bailleur assigné à une écriture GL doit financer la LB concernée à un moment de l'année (sinon avertissement, Tension A/D).
- **INV5** (Phase) : `Σ dépenses réalisées d'un bailleur ≤ recettes du bailleur` (alerte de dépassement si faux).
- **INV6** : la trésorerie réelle d'un mois clos = Σ de **toutes** les écritures GL
  du mois (allouées ou non, signées), indépendante du statut d'allocation (A1).
- **INV7** : `Σ dépenses réalisées (tous bailleurs) + réalisé non assigné == Σ dépenses GL allouées (LB)`
  — les deux suivis se recoupent (BR-6.3, A6).
- **INV8** : aucune donnée (GL, allocation, montant budgété) d'un mois clos ne change
  sans réouverture explicite et tracée (BR-11.2, A3).
- **INV9** : si un rapprochement bancaire existe pour un mois, `écart == 0` est attendu ;
  sinon signal rouge non bloquant (BR-7.5, A2).
