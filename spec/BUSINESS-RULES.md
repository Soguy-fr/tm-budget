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
- Si `écart ≠ 0` : la cellule « Total » passe en **rouge** et l'écart est affiché
  **dans la même cellule** (ex : « 30 000 (+250) »).
- Pas de colonnes dédiées « Σ mois » ni « Écart » dans le tableur (jugées inutiles) :
  l'information d'écart vit dans la cellule Total.

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
Le **bailleur est facultatif** sur une dépense : associer un bailleur n'est PAS
obligatoire. La LB suffit pour le suivi des dépenses ; le bailleur ne sert qu'au
suivi par bailleur (BR-6).
```
statut = OK   si (type = Dépense et LB renseignée)            -- bailleur facultatif
              ou (type = Recette et bailleur renseigné)
         À allouer sinon
```
- Une dépense **sans LB** est « À allouer » : surlignée, exclue du suivi des dépenses.
- Une dépense **avec LB mais sans bailleur** est **OK pour le suivi des dépenses**
  (comptée en réalisé par LB), mais n'entre pas dans le suivi par bailleur (BR-6.1).
- Indicateur séparé « bailleur manquant » possible (informatif, non bloquant).

### BR-4.2 — Plan vs réel (avertissement non bloquant)
Si le bailleur saisi sur une écriture diffère du bailleur prévu au plan pour ce (LB × mois) :
- afficher un **avertissement** (« réalisé non conforme au plan ») ;
- **ne pas bloquer** (P : Tension D). Seul compte que le total annuel par bailleur reste cohérent.
- exposer un indicateur « conforme au plan : oui/non » par écriture (utile au contrôle).

### BR-4.3 — Réalisé = caisse
Le rattachement temporel d'une écriture utilise sa **date de paiement** (P5).

### BR-4.4 — Avoirs & remboursements
Le montant d'une écriture GL est **signé** (négatif autorisé) :
- **Avoir fournisseur** ou **remboursement reçu d'une dépense** = écriture de type
  `Dépense` à montant **négatif** (vient en déduction du réalisé de la LB).
  JAMAIS une `Recette` : cela polluerait les recettes du bailleur et fausserait
  le % de recettes reçues (BR-6.1).
- **Reversement à un bailleur** (trop-perçu restitué) = `Recette` à montant négatif.
- Tous les agrégats (suivi LB, suivi bailleur, trésorerie) somment les montants signés
  sans traitement particulier.

## 5. Suivi des dépenses (prévu vs réalisé)

### BR-5.1 — Réalisé par LB
```
réalisé(LB, année) = Σ amount des écritures GL où type=Dépense, line_id=LB, année(date)=année
```
Le bailleur n'intervient PAS ici (BR-4.1) : une dépense avec LB compte qu'elle ait
un bailleur ou non. Seul `line_id` manquant l'exclut.

### BR-5.2 — Indicateurs
```
écart      = prévu − réalisé
% consommé = réalisé / prévu   (0 si prévu = 0)
```
Mise en évidence rouge si `réalisé > prévu` (dépassement).

### BR-5.3 — Affichage ligne réalisé (bouton « Suivi des dépenses »)
Quand activé, une ligne réalisé s'affiche **sous** la ligne prévue, mois par mois
(ex : prévu 1 000 € janvier → réalisé 938 € en dessous). Ligne réalisé en lecture seule.
La ligne réalisé s'affiche aussi pour les LB de **niveau 1 et 2** (réalisé agrégé
= Σ des feuilles), et reste visible même lorsque la catégorie est repliée (BR-8.3) —
on voit ainsi les dépenses par catégorie sans déplier.
Le **total annuel réalisé** (cellule Total de la ligne réalisé) passe en **rouge**
en cas de dépassement (réalisé annuel > prévu annuel), pas seulement mois par mois.
L'entête de chaque année affiche le **réalisé annuel à côté du budget annuel**
(BR-8.4), rouge si dépassement.

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

### BR-6.3 — Ligne « Réalisé non assigné » (réconciliation)
Le suivi par bailleur affiche une ligne calculée supplémentaire :
```
réalisé_non_assigné(année) = Σ dépenses GL avec LB mais SANS bailleur
```
Garantit la réconciliation des deux suivis :
```
Σ dépenses_réalisées(tous bailleurs) + réalisé_non_assigné = Σ dépenses GL allouées (LB)
```
Sans cette ligne, une dépense avec LB sans bailleur est comptée dans le suivi des
dépenses (BR-5.1) mais invisible dans le suivi bailleur → totaux non recoupables.

## 7. Trésorerie (prévision glissante)

### BR-7.1 — Solde initial et chaînage
`initial_cash` est saisi **une fois**, au 1er janvier de la **première** année du budget.
Les années suivantes chaînent automatiquement : `solde_initial(N+1) = solde_final(N)`.
Chaque mode chaîne **ses propres soldes**, sans mélange :
- Mode **Budgété** : `solde_final(N)` = solde budgété de décembre N.
- Mode **Réel** : `solde_final(N)` = solde glissant de décembre N (réel si tous les
  mois de N sont clos, sinon réel jusqu'à M puis budgété — BR-7.3).

### BR-7.2 — Mode Budgété
Pour chaque mois, dans l'ordre chronologique :
```
flux_mois   = Σ recettes prévues (tous bailleurs) − Σ dépenses prévues (budget interne)
cumul_mois  = cumul_mois_précédent + flux_mois     (cumul du 1er mois = initial_cash + flux)
```

### BR-7.3 — Mode Réel (prévision glissante)
Soit `M` le dernier mois **explicitement clos** via la clôture mensuelle (BR-11.1).
Le mois en cours et les mois futurs restent **budgétés** tant qu'ils ne sont pas
clos (option A) — un GL importé en retard ne produit jamais un cumul faux silencieux.
```
Pour les mois ≤ M : flux = recettes reçues (GL) − dépenses réalisées (GL)
Pour les mois  > M : flux = recettes prévues − dépenses prévues (budgété)
cumul enchaîné sans couture, départ = initial_cash
```
**Périmètre des sommes GL** : les flux réels incluent **TOUTES** les écritures GL
du mois, **allouées ou non**. Le statut d'allocation (BR-4.1) ne s'applique PAS à
la trésorerie : la caisse reflète la banque, pas le suivi analytique. Une écriture
« À allouer » est exclue des suivis par LB et par bailleur, mais compte dans le
solde de trésorerie.

### BR-7.4 — Affichage
Ligne « Solde trésorerie » en bas du tableau du budget interne, **masquable**,
avec sélecteur **Budgété / Réel**. Détecte les trous (solde cumulé négatif → rouge).

### BR-7.5 — Rapprochement bancaire
Pour chaque mois, l'utilisateur peut saisir le **solde du relevé bancaire** en fin de mois.
```
écart_rapprochement = solde_relevé − solde_calculé (mode Réel, fin de mois)
```
- Écart ≠ 0 → affiché en **rouge** à côté du solde calculé : GL incomplet, doublon,
  ou écriture hors GL. C'est le contrôle de complétude du GL.
- Un mois sans solde de relevé saisi est signalé « non rapproché ».
- Le rapprochement (écart = 0) est un prérequis **recommandé** (non bloquant au début)
  de la clôture mensuelle (BR-11.1).

## 8. Multi-années & accordéon

### BR-8.1 — Ajout/retrait d'année
Ajouter une année crée les mailles vides (montant 0) pour toutes les LB.
Retirer une année supprime ses mailles **après confirmation** (perte de données).

### BR-8.2 — Repli/dépli (années)
Chaque année est un bloc accordéon repliable indépendamment.

### BR-8.3 — Accordéon sur les lignes budgétaires
Dans le tableur, chaque LB de niveau 1 ou 2 peut être repliée pour masquer ses
enfants (chevron ▶/▼). Sous le titre, **3 boutons de niveau d'affichage** :
- **1** : ne montre que le niveau 1 (replie tous les niveaux 1) ;
- **2** : montre niveaux 1 et 2, masque le niveau 3 (replie tous les niveaux 2) ;
- **3** : tout déplier (toutes les LB visibles).
L'état de repli est purement d'affichage (non persisté), partagé entre les années.

### BR-8.4 — Total annuel du budget
L'entête de chaque bloc année affiche le **total du budget pour l'année** =
Σ des montants de toutes les LB de niveau 3 (= Σ des catégories de niveau 1).
Recalculé en direct en mode édition. Quand la couche « Suivi des dépenses » est
active, l'entête affiche aussi le **réalisé annuel** à côté du budget annuel,
en **rouge** si réalisé > budget (dépassement).

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

**Garde-fous** — les pièces comptables se conservent **10 ans** (obligation légale) :
- L'export XLSX de l'exercice est **obligatoire et vérifié** avant purge : le bouton
  « Purger » reste désactivé tant qu'un export couvrant les données à purger n'a pas
  été généré et téléchargé.
- Les écritures GL ne sont **jamais supprimées physiquement** : purge = `archived=true`
  (soft-delete). Les vues et agrégats filtrent `archived=false`. Une restauration
  reste possible.

## 11. Clôture mensuelle

### BR-11.1 — Clôture explicite
Un mois passe à l'état **clos** par une action utilisateur explicite (pas d'automatisme
calendaire). Check-list affichée avant clôture :
- GL du mois importé ;
- écritures du mois allouées (ou consciemment laissées « À allouer ») ;
- rapprochement bancaire effectué (BR-7.5) — recommandé, non bloquant.

Le dernier mois clos définit `M` pour la trésorerie réelle (BR-7.3).
Les mois se clôturent dans l'ordre chronologique (pas de trou).

### BR-11.2 — Verrouillage des périodes closes
Sur un mois clos :
- les **écritures GL** datées de ce mois et leurs **allocations** (LB, bailleur)
  deviennent non modifiables ;
- les **montants budgétés** (`budget_monthly`) de ce mois deviennent non modifiables ;
- toute modification exige une **réouverture** explicite du mois (action tracée,
  avec confirmation), puis une re-clôture.
Objectif : ce qui a été reporté (bailleur, CA) ne peut plus bouger silencieusement.
