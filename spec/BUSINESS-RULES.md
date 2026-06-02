# BUSINESS-RULES.md

> Règles de calcul précises. Chaque règle est numérotée pour être référencée
> dans le code et les tests. Les exemples utilisent des euros.

## 1. Réconciliation total annuel ↔ somme des mois (LB niveau 3)

### BR-1.1 — Affichage de l'écart
Pour une LB sur une année :
```
écart = total_annuel_saisi − Σ(montants des 12 mois)
```
- Si `écart == 0` : la cellule « Total » s'affiche en couleur normale.
- Si `écart ≠ 0` : la cellule « Total » passe en **rouge** et l'écart est affiché à côté
  (ex : « +250 € » ou « −250 € »).

### BR-1.2 — Bouton « Répartir »
Répartit le `total_annuel_saisi` également sur les 12 mois (ou sur les mois actifs du bailleur si filtré).
```
montant_mois = arrondi_euro(total / n_mois)
```
- **Arrondi** : à l'euro. Le **dernier mois** absorbe le reste pour que la somme retombe exacte.
  Ex : 100 000 / 12 = 8 333 ; mois 1..11 = 8 333 ; mois 12 = 8 337 (100 000 − 11×8 333).
- **Écrasement** : si des montants existent déjà, afficher un **avertissement de confirmation** avant d'écraser.

### BR-1.3 — Bouton « Mettre à jour le total »
Recalcule `total_annuel_saisi = Σ(12 mois)`. Remet l'écart à 0 et la cellule en couleur normale.

## 2. Assignation bailleur (LB × mois)

### BR-2.1 — Un seul bailleur par maille
Chaque (LB × mois) référence 0 ou 1 bailleur. Jamais 2 (P4).

### BR-2.2 — Cofinancement par partage des mois
Pour cofinancer une LB, répartir ses mois entre bailleurs.
Ex : Loyer 800 €/mois cofinancé FPC 5 mois (jan–mai) + SW 7 mois (jun–déc).

### BR-2.3 — Code couleur (bouton « Afficher bailleur »)
Quand activé, chaque cellule mois prend la couleur de son bailleur. Une légende liste
couleur ↔ bailleur. Les mailles sans bailleur restent neutres (signalées « non assigné »).

### BR-2.4 — Pré-remplissage GL
À l'allocation d'une écriture GL, si la LB est renseignée et le mois connu, l'appli
**propose** le bailleur prévu au plan pour ce (LB × mois). Modifiable (BR-4.2).

## 3. Vue bailleur

### BR-3.1 — Mapping dépenses
Une ligne bailleur (A1…) agrège les montants des LB internes qui lui sont mappées,
restreints aux mois assignés à ce bailleur.

### BR-3.2 — Ligne « Non assigné » (équilibre)
Dans la vue bailleur :
```
non_assigné = Σ recettes prévues − Σ dépenses prévues assignées
```
Cette ligne est **calculée**, jamais saisie. Elle garantit `recettes = dépenses` à l'affichage.
Si négative, c'est un signal de sur-affectation (dépenses fléchées > recettes promises).

### BR-3.3 — Recettes prévues
Saisie directe du montant attendu par mois (pas de %). Le total = Σ des 12 mois × années.

## 4. Grand Livre & allocation

### BR-4.1 — Statut d'allocation
```
statut = OK   si (type = Recette et bailleur renseigné)
              ou (type = Dépense et LB renseignée et bailleur renseigné)
         À allouer sinon
```
Une écriture « À allouer » est surlignée et **exclue** des agrégats de suivi.

### BR-4.2 — Plan vs réel (avertissement non bloquant)
Si le bailleur saisi sur une écriture diffère du bailleur prévu au plan pour ce (LB × mois) :
- afficher un **avertissement** (« réalisé non conforme au plan ») ;
- **ne pas bloquer** (P : Tension D). Seul compte que le total annuel par bailleur reste cohérent.
- exposer un indicateur « conforme au plan : oui/non » par écriture (utile au contrôle).

### BR-4.3 — Réalisé = caisse
Le rattachement temporel d'une écriture utilise sa **date de paiement** (P5).

## 5. Suivi des dépenses (prévu vs réalisé)

### BR-5.1 — Réalisé par LB
```
réalisé(LB, année) = Σ amount des écritures GL où type=Dépense, line_id=LB, année(date)=année, statut=OK
```

### BR-5.2 — Indicateurs
```
écart      = prévu − réalisé
% consommé = réalisé / prévu   (0 si prévu = 0)
```
Mise en évidence rouge si `réalisé > prévu` (dépassement).

### BR-5.3 — Affichage ligne réalisé (bouton « Suivi des dépenses »)
Quand activé, une ligne réalisé s'affiche **sous** la ligne prévue, mois par mois
(ex : prévu 1 000 € janvier → réalisé 938 € en dessous). Ligne réalisé en lecture seule.

## 6. Suivi par bailleur

### BR-6.1 — Réalisé recettes / dépenses
```
recettes_reçues(bailleur, année)    = Σ GL où type=Recette, bailleur=B, année(date)=année
dépenses_réalisées(bailleur, année) = Σ GL où type=Dépense, bailleur=B, année(date)=année
solde_réalisé                       = recettes_reçues − dépenses_réalisées
% recettes reçues                   = recettes_reçues / recettes_prévues
```

### BR-6.2 — Alerte dépassement bailleur
Si `dépenses_réalisées > recettes (prévues ou conventionnées)` : alerte de dépassement (INV5).

## 7. Trésorerie (prévision glissante)

### BR-7.1 — Solde initial
`initial_cash` est saisi **une fois**, au 1er janvier de la **première** année du budget.
Les années suivantes chaînent automatiquement : `solde_initial(N+1) = solde_final(N)`.

### BR-7.2 — Mode Budgété
Pour chaque mois, dans l'ordre chronologique :
```
flux_mois   = Σ recettes prévues (tous bailleurs) − Σ dépenses prévues (budget interne)
cumul_mois  = cumul_mois_précédent + flux_mois     (cumul du 1er mois = initial_cash + flux)
```

### BR-7.3 — Mode Réel (prévision glissante)
Soit `M` le dernier mois **clos** (mois courant exclu, option A retenue).
```
Pour les mois ≤ M : flux = recettes reçues (GL) − dépenses réalisées (GL)
Pour les mois  > M : flux = recettes prévues − dépenses prévues (budgété)
cumul enchaîné sans couture, départ = initial_cash
```
Le mois en cours et les mois futurs restent **budgétés** tant que le mois n'est pas clos (option A).

### BR-7.4 — Affichage
Ligne « Solde trésorerie » en bas du tableau du budget interne, **masquable**,
avec sélecteur **Budgété / Réel**. Détecte les trous (solde cumulé négatif → rouge).

## 8. Multi-années & accordéon

### BR-8.1 — Ajout/retrait d'année
Ajouter une année crée les mailles vides (montant 0) pour toutes les LB.
Retirer une année supprime ses mailles **après confirmation** (perte de données).

### BR-8.2 — Repli/dépli
Chaque année est un bloc accordéon repliable indépendamment.

## 9. Édition par lot (P7)

### BR-9.1 — Cycle d'édition
1. Clic « Éditer » → tous les champs saisissables passent en écriture (bleu).
2. L'utilisateur modifie ; les changements sont accumulés **côté client**.
3. Clic « Éditer » (re-bascule) ou « Enregistrer » → envoi **groupé** (upsert) + recalcul des totaux.
4. Bouton « Rafraîchir » → re-fetch depuis la base (résout tout doute de désynchronisation).

### BR-9.2 — Garde-fou
Indicateur « modifications non enregistrées » + confirmation avant de quitter la page si des changements sont en attente.

## 10. Export & purge

### BR-10.1 — Export
Export d'un budget (et de ses suivis) au format XLSX. *(Structure exacte du fichier à préciser — voir OPEN-QUESTIONS.)*

### BR-10.2 — Purge annuelle
Une fois par an : exporter les budgets + suivis, puis remettre à zéro en **conservant la structure**
des LB (qui reste modifiable). Les budgets sont archivés/supprimés, la structure persiste (P2).
