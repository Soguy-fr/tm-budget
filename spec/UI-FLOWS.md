# UI-FLOWS.md

> Écrans, navigation et parcours. Décrit l'interface sans imposer le code.
> Le composant central est un **tableur riche** réutilisé par la page interne et les pages bailleur.

## 1. Navigation générale

```
┌──────────────────────────────────────────────┐
│  Barre supérieure : [Budget actif ▼] [Éditer] │
│  [Rafraîchir]   ● modifications non enregistrées│
├────────────┬─────────────────────────────────┤
│ Menu       │                                  │
│ ─────────  │      Zone de contenu             │
│ Budgets    │                                  │
│ Structure  │                                  │
│ Interne    │  (page tableur)                  │
│ Bailleurs ▼│                                  │
│   · FPC    │                                  │
│   · SW     │                                  │
│   · JFN    │                                  │
│ Grand Livre│                                  │
│ Suivi      │                                  │
│ Dashboard  │                                  │
└────────────┴─────────────────────────────────┘
```

## 2. Page « Structure » (F1)

Arbre hiérarchique éditable.
```
Code     Intitulé                    [+ Ligne] [Masquer vides]
1        Operating Costs
  1.1    Core Team
    1.1.1 Director              [renommer] [supprimer]
    1.1.2 Programme Manager
  1.2    Office & Admin
2        Programme Activities
  ...
```
- **Ajouter** sous une branche → numéro suivant auto (1.1.25), placé en fin de groupe (P3).
- **Renommer** → modal d'avertissement « ce changement s'applique à tous les budgets ».
- **Supprimer** → bloqué si montant/écriture liés, message explicatif (P8).

## 3. Page « Budget interne » — le tableur principal (F3, F7)

C'est l'écran cœur. Une seule page, plusieurs couches activables.

Sous le titre du budget : boutons d'accordéon des lignes (BR-8.3) —
**Tout déplier · Catégories seules · Cat. + sous-cat.** — et chevrons ▶/▼ par
catégorie. L'entête de chaque année affiche le **total annuel du budget** (BR-8.4).

```
[Éditer] [Répartir] [Afficher bailleur] [Suivi des dépenses] [Solde tréso ▼ Budgété|Réel]
Légende bailleurs : ■FPC ■SW ■JFN  ■non assigné

▼ 2026   Total 52 800 · réalisé 41 200        [retirer année]
  Code   Ligne              Total            Jan  Fev  ... Déc
  1      Operating Costs    52 800
   1.1   Core Team          69 600
    1.1.1 Director           30 000 (+250)*   2500 2500 ... 2500
          ↳ réalisé**         28 900           938  ...        ← si "Suivi" activé
    1.1.2 Programme Manager  21 600           [cellules colorées par bailleur si activé]
  ...
  ─────────────────────────────────────────────────
  Solde trésorerie (Budgété)†                  -11200 37600 ...    ← si activé, masquable
[+ Ajouter une année]

*  écart inline dans la cellule Total, rouge si ≠ 0 (BR-1.1) — plus de colonnes Σmois/Écart
** ligne réalisé en lecture seule (depuis le GL) ; total réalisé rouge si dépassement
†  sélecteur Budgété/Réel ; rouge si négatif
```

### Couches activables (boutons bascule)
- **Afficher bailleur** : chaque cellule mois prend la couleur de son bailleur (BR-2.3). En mode édition, cliquer une cellule ouvre le choix du bailleur.
- **Suivi des dépenses** : insère une ligne réalisé sous chaque LB (BR-5.3).
- **Solde tréso** : insère la ligne du bas, sélecteur Budgété/Réel (BR-7.4).

### Cellule « Total » d'une LB
- Normale si total = Σ mois ; **rouge + écart affiché** sinon (BR-1.1).
- Bouton « Répartir » (répartit le total) et « Mettre à jour le total » (total = Σ mois).

### Mode édition (BR-9.1)
- Hors édition : tout en lecture (noir), couches consultables.
- Clic « Éditer » : champs saisissables en bleu. Modifs locales.
- Saisie des montants = **frappe directe du nombre**, sans incrémenteurs +1/−1
  (pas de boutons stepper sur les champs numériques).
- Re-clic / « Enregistrer » : envoi groupé + recalcul. Indicateur ● si non enregistré.

## 4. Pages « Bailleur » (F4) — même gabarit

Identiques au tableur interne, mais centrées sur le bailleur (sert au **rapport financier** du bailleur).

```
Bailleur FPC — convention 04/2026 → 03/2028   [Éditer] [Suivi] [+ année]

BLOC DÉPENSES PRÉVUES
  Code  Ligne bailleur       LB mappées       Total   Jan ... Déc
  A1    Ressources humaines  1.1.1, 1.1.2     ...
  A2    Frais de bureau      1.2.1, 1.2.2     ...
  (Non assigné)†                              ...     ← calculé, équilibre
  TOTAL DÉPENSES

BLOC RECETTES PRÉVUES (déblocages)
  Tranche / source           Total   Jan  Fev(60k) ... Jul(40k) ...
  TOTAL RECETTES

Solde prévu (recettes − dépenses)
```
- La ligne **« Non assigné »** est calculée (BR-3.2) pour équilibrer recettes = dépenses.
- Le **mapping** ligne bailleur → LB internes se définit ici.
- L'assignation des mois aux bailleurs reste pilotée côté **page interne** (couche couleur) :
  ici on voit le résultat, on n'édite que la nomenclature/recettes du bailleur.

> Important (décision G.) : sur la page interne, on ne voit le bailleur que via le **code couleur**.
> Pour éditer finement, une ligne « ↳ bailleur » sous chaque LB apparaît en mode édition
> (comme dans le fichier Excel de simulation).

## 5. Page « Grand Livre » (F5)

```
[Importer CSV]   Filtres : [Type ▼][Mois ▼][LB ▼][Bailleur ▼][Statut ▼]

Date       Type     Libellé              Montant   LB      Bailleur  Statut
2026-01-05 Dépense  Salaire Director     2 500 €   1.1.1   FPC       OK
2026-05-20 Dépense  Café & divers          95 €   (vide)  (vide)    À allouer  ← surligné
...
```
- Colonnes **LB** et **Bailleur** éditables ; bailleur pré-rempli depuis le plan (BR-2.4).
- Colonne **Description LB** : à l'allocation d'une LB, son libellé complet (code + intitulé)
  s'affiche pour lever toute ambiguïté (F5.10).
- Lignes non allouées surlignées (BR-4.1).
- Filtres multi-colonnes pour classer vite (F5.5) ; **filtre date en accordéon**
  (année → mois) et bouton **Réinitialiser les filtres** (F5.8).
- **Largeur des colonnes ajustable** par glisser d'une poignée d'entête (F5.9).
- Avertissement discret si réalisé ≠ plan (BR-4.2), non bloquant.

## 6. Pages « Suivi » (F6)

- **Suivi dépenses** : tableau prévu / réalisé / écart / % par LB (BR-5).
- **Suivi bailleurs** : tableau recettes & dépenses prévues vs réelles par bailleur (BR-6).
- Dépassements en rouge.

## 7. Page « Dashboard » (F8, Phase 2)

Graphiques : dépenses vs budget, répartition par bailleur, courbe trésorerie cumulée.

## 8. Parcours types

### Parcours A — Construire le prévisionnel
Structure → créer Budget 2026 → page interne → ajouter 2026 → Éditer → saisir montants →
Afficher bailleur → assigner les mois → Enregistrer.

### Parcours B — Suivi mensuel
Grand Livre → importer CSV du mois → allouer les écritures (LB + bailleur) →
page interne : activer « Suivi des dépenses » et « Solde tréso (Réel) » pour voir où on en est.

### Parcours C — Rapport bailleur
Page bailleur FPC → activer Suivi → lire recettes reçues vs prévues, dépenses réalisées vs prévues →
exporter (Phase 2).

### Parcours D — Révision en cours d'année
Budgets → dupliquer le budget actif → renommer « Budget révisé juin » → modifier →
sélectionner comme actif.
