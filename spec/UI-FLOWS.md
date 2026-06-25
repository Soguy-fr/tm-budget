# UI-FLOWS.md

> Écrans, navigation et parcours. Décrit l'interface sans imposer le code.
> Le composant central est un **tableur riche** réutilisé par la page interne et les pages bailleur.

## 1. Navigation générale

Nomenclature des entrées de menu (les routes techniques restent inchangées) :

| Libellé menu     | Route          | Ancien nom |
|------------------|----------------|------------|
| Scénario         | `/budgets`     | Budgets    |
| Suivi interne    | `/interne`     | Interne    |
| Trésorerie       | `/tresorerie`  | *(nouveau, F7.7)* |
| Financement      | `/bailleurs`   | Bailleurs (renommé) |
| Grand Livre      | `/grand-livre` | Grand Livre|
| Dashboard        | `/suivi`       | Suivi      |
| Configuration    | `/structure`   | Structure (déplacé en **dernier**) |

> **Financement** : la route technique `/bailleurs` reste inchangée ; seul le libellé
> change. Le menu liste les financements (fonds), groupés par bailleur (acteur).

- **Scénario** : on y teste plusieurs budgets (créer / dupliquer / activer).
- **Configuration** : structure budgétaire + futurs réglages. Toujours en bas du menu.

```
┌────────────┬─────────────────────────────────┐
│ Menu       │      Zone de contenu             │
│ ─────────  │                                  │
│ Scénario   │                                  │
│ Suivi interne                                 │
│ Bailleurs  │  (page tableur)                  │
│ Grand Livre│                                  │
│ Dashboard  │                                  │
│ Configuration (dernier)                       │
└────────────┴─────────────────────────────────┘
```

## 2. Page « Structure » (F1)

Arbre hiérarchique éditable.
```
Code     Intitulé              Description (comment, tronqué…)   [+ Ligne] [Masquer vides]
1        Operating Costs       Coûts de fonctionnement…
  1.1    Core Team             Équipe permanente du siège…
    1.1.1 Director             Directeur exécutif (ED)…       [renommer] [supprimer]
    1.1.2 Programme Manager
  1.2    Office & Admin
2        Programme Activities
  ...
```
- **Colonne « Description »** (F1.8) toujours affichée = champ `comment`. Si long, tronqué
  aux X premiers caractères avec « … » ; **aperçu complet au survol souris**. Édité via
  l'éditeur de ligne (multiligne), comme aujourd'hui.
- **Ajouter** sous une branche → numéro suivant auto (1.1.25), placé en fin de groupe (P3).
- **Éditer** (un seul bouton par ligne) → panneau : intitulé (1 ligne) + commentaire
  (multiligne). Note de propagation « le changement d'intitulé s'applique à tous les
  budgets » (P8).
- **Effacer** → uniquement dans l'éditeur (pas de bouton supprimer dans la liste,
  jugé trop dangereux). Confirmation explicite ; bloqué si montant/écriture liés (P8).
- **Réordonner (F1.4)** → boutons ▲▼ par ligne, déplacent la LB parmi ses **frères
  uniquement** (échange `sort_order`). Le **code n'est jamais renuméroté** (P3) :
  seul l'ordre d'affichage change.

> **Purge annuelle (F9.2)** — bouton en zone danger de la page **Scénario**.
> Remet à zéro les données transactionnelles (mailles, totaux saisis, écritures GL,
> recettes/dépenses bailleur). La **structure des LB et les bailleurs sont conservés**
> (P2). Irréversible → **double confirmation** (saisir le mot « PURGER »). Exporter
> avant (F9.1).

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
- **Masquer vides (F1.6)** : toggle qui retire, **dans chaque bloc d'année**, les
  LB dont le **montant affiché pour cette année** vaut 0 (feuille : total saisi
  s'il existe, sinon Σ mois ; parent : agrégat des mois). Le masquage est donc
  par année : une LB nulle en 2025 mais saisie en 2026 reste visible dans le bloc
  2026. Recalcul en direct quand on édite une valeur.

### Cellule « Total » d'une LB
- Normale si total = Σ mois ; **rouge + écart affiché** sinon (BR-1.1).
- Bouton « Répartir » (répartit le total) et « Mettre à jour le total » (total = Σ mois).

### Mode édition (BR-9.1)
- Hors édition : tout en lecture (noir), couches consultables.
- Clic « Éditer » : champs saisissables en bleu. Modifs locales.
- Saisie des montants = **frappe directe du nombre**, sans incrémenteurs +1/−1
  (pas de boutons stepper sur les champs numériques).
- Re-clic / « Enregistrer » : envoi groupé + recalcul. Indicateur ● si non enregistré.

## 4. Pages « Financement » (F4) — même gabarit

Identiques au tableur interne, mais centrées sur le financement (sert au **rapport financier**).

```
Financement JFN-001  (Bailleur : Fondation JFN)   montant total 10 000 €
Éligibilité 04/2026 → 03/2028                      [Éditer] [Suivi] [+ année]
Description : Fonds de soutien au programme jeunesse…
                                                   [Assigner les lignes dans le budget]

BLOC DÉPENSES PRÉVUES (dérivées du plan interne)
  Code  Ligne financement    LB mappées       Budgété   Dépensé   Total   Jan ... Déc
  A1    Ressources humaines  1.1.1, 1.1.2     6 000     5 200     ...
  A2    Frais de bureau      1.2.1, 1.2.2     3 500     3 400     ...
  (Non assigné)†                              ...                 ← calculé, équilibre
  TOTAL                       Budgété 9 500 · Dépensé 8 600 · Fonds 10 000 (reste 500 à budgéter)

BLOC RECETTES PRÉVUES (déblocages)
  Tranche / source           Total   Jan  Fev(60k) ... Jul(40k) ...
  TOTAL RECETTES

Solde prévu (recettes − dépenses)
```
- **En-tête** : référence, bailleur (acteur), `montant_total`, fenêtre d'éligibilité, description (F4.9/F4.10).
- Colonnes **Budgété** / **Dépensé** par ligne + récap d'écart vs `montant_total` (F4.11, BR-3.4) :
  « reste X à budgéter » si sous-budgété, « sur-budgété » / dépassement (rouge) sinon.
- Bouton **« Assigner les lignes dans le budget »** (F4.12, BR-3.5) : impute les LB mappées
  au financement sur la fenêtre d'éligibilité. **Confirmation** listant les conflits si des
  mailles portent déjà un autre financement (écrasement).
- La ligne **« Non assigné »** est calculée (BR-3.2) pour équilibrer recettes = dépenses.
- Le **mapping** ligne financement → LB internes se définit ici.
- L'assignation fine des mois reste pilotée côté **page interne** (couche couleur) ; le bouton
  d'assignation ci-dessus est le raccourci « gros sel » par fenêtre d'éligibilité.

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
- Colonnes **LB** et **Financement** éditables ; financement pré-rempli depuis le plan (BR-2.4).
- Colonne **Code analytique** (importée) : équivaut au niveau 2 (ex `1.1 Core Team`). Le
  dropdown **LB est restreint** aux sous-lignes niveau 3 du niveau 2 reconnu (BR-4.5) ;
  si vide/non reconnu → dropdown complet + petit **avertissement** sur la ligne.
- À l'allocation d'un financement : avertissements **hors éligibilité** et **non prévu au
  plan** (BR-4.6), non bloquants.
- Colonne **Description LB** : à l'allocation d'une LB, son libellé complet (code + intitulé)
  s'affiche pour lever toute ambiguïté (F5.10).
- Lignes non allouées surlignées (BR-4.1).
- Filtres multi-colonnes pour classer vite (F5.5) ; **filtre date en accordéon**
  (année → mois) et bouton **Réinitialiser les filtres** (F5.8).
- **Largeur des colonnes ajustable** par glisser d'une poignée d'entête (F5.9).
- Avertissement discret si réalisé ≠ plan (BR-4.2), non bloquant.

## 6. Pages « Dashboard / Suivi » (F6, F8)

- **Onglet Dépense** : tableau prévu / réalisé / écart / % — **niveaux 1 et 2 uniquement**
  (pas niveau 3, BR-5.4). Colonne **Commentaire** éditable (bouton **Édit / OK**), liée au
  champ `comment` partagé (F1.7) : éditer ici met à jour la bulle partout.
  - **Hiérarchie & accordéon (F8.6)** : niv.1 en bloc repliable (chevron ▶/▼) ; niv.2 indentés
    dessous. Agrégat niv.1 visible même replié.
  - **% consommé (F8.7, BR-5.6)** : barre de dégradé 0 % blanc → 100 % vert ; négatif rouge.
  - **Vitesse (F8.8, BR-5.5)** : jauge 0→200 % du rythme à la date du jour. Vert 80–120 %,
    rouge < 80 % (sous-régime) / > 120 % (surrégime). « — » si l'année n'a pas encore commencé.

```
[Dépenses] [Bailleurs] [Graphiques]                    Date du jour : [25/06/2026]
Code  Ligne                Prévu   Réalisé  Écart  % consommé        Vitesse        Comment.
▼ 1   Operating Costs      52 800  41 200   …      [▓▓▓▓░ 78%]        [|███ 110%|]   …  [Édit]
   1.1 Core Team           69 600  …        …      [▓▓▓▓▓ 100%]       [|██ 95%|]      …  [Édit]
▶ 2   Programme Activities …       …                …                 …
```
- **Onglet Bailleurs** : tableau recettes & dépenses prévues vs réelles par financement (BR-6).
- Dépassements en rouge.

## 6b. Page « Trésorerie » (F7.7)

Synthèse lisible, **budgété pur** ; mêmes montants que la ligne solde de Suivi interne (BR-7.7).

```
Trésorerie — Budgété          Date du jour du calcul : [13/06/2025]

              (grisé) Jan  Fev  Mar  Avr  Mai  | Jun  Jul  ... Déc
Financement JFN-001          …    …    …    …    | 60k  …
Financement FPC              …    …    …    …    | …
Dépenses totales             …    …    …    …    | …
─────────────────────────────────────────────────────────────────
Solde            (grisé)…              [Forcé: 12 000]| 13k  …
```
- **Une ligne par financement** (recettes prévues du mois), **Dépenses totales**, **Solde** (BR-7.7).
- **Date du jour** saisissable : grise les colonnes des mois antérieurs ; la cellule **Solde
  forcé** se pose dans le **mois précédent** (ici Mai 2025) et le chaînage repart de là.
- Vocabulaire : **Financement** (pas « Bailleur »). Solde négatif → rouge (trou de tréso).

## 7. Page « Dashboard » — onglet Graphiques (F8, Phase 2 / Jalon 10)

La page `/suivi` (menu « Dashboard ») gagne un 3e onglet **« Graphiques »**
(après Dépenses et Bailleurs). Sélecteur d'année en tête (réutilise les années du
budget actif). Tout est calculé côté serveur depuis les vues existantes
(`v_suivi_depenses`, `v_suivi_bailleurs`) + chaînage trésorerie ; le rendu utilise
**Recharts** côté client.

```
[Dépenses] [Bailleurs] [Graphiques]            Année : [2026 ▼]

┌─ Dépenses vs budget par catégorie (F8.1) ─┐  ┌─ Répartition réalisé (F8.2) ─┐
│  barres group: prévu | réalisé par niv.1  │  │  donut par catégorie niv.1   │
│  réalisé rouge si > prévu                 │  │  + donut par bailleur        │
└───────────────────────────────────────────┘  └──────────────────────────────┘
┌─ Trésorerie cumulée : prévu vs réel (F8.3) ──────────────────────────────────┐
│  courbe mensuelle Jan…Déc, 2 séries (budgété, réel glissant), 0 en pointillé │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **F8.1** : barres groupées prévu/réalisé, agrégées par **catégorie de niveau 1**
  (premier segment du code LB) pour rester lisible ; réalisé en rouge si dépassement.
- **F8.2** : deux donuts — répartition du **réalisé par catégorie** (niv.1) et
  répartition du **réalisé par bailleur** (depuis `v_suivi_bailleurs`). Couleur
  bailleur = sa couleur de convention.
- **F8.3** : courbe de **trésorerie cumulée** (BR-7.*), deux séries Budgété vs Réel
  glissant (réel jusqu'au dernier mois clos, budget ensuite), ligne 0 repère ;
  segment négatif signalé.
- Logique de mise en forme des données isolée dans `lib/charts.ts` (pur, testé) ;
  les composants Recharts ne font que rendre.

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
