# PITFALLS.md

> Journal des bugs rencontrés et règles pour ne pas les reproduire.
> À compléter après chaque correction de bug (process projet : spec → implémentation → doc du bug ici).

## P-BUG-1 — État client non resynchronisé après `router.refresh()`

**Symptôme** : le bouton « Rafraîchir » du tableur interne semblait sans effet ;
les données n'étaient pas rechargées à l'écran.

**Cause** : les copies de travail (`work`, `workTotals`, `workBailleur`) étaient
initialisées par `useState(props)`. En React, `useState(initial)` n'utilise
`initial` **qu'au premier rendu**. `router.refresh()` refetch les Server
Components et passe de **nouvelles props**, mais l'état local conservait l'ancienne
valeur → aucun changement visible.

**Correctif** : resynchroniser l'état dérivé des props via `useEffect`, en évitant
d'écraser des saisies non enregistrées :
```tsx
useEffect(() => {
  if (dirty) return;            // ne pas perdre les modifs en cours d'édition
  setWork(monthly);
  setWorkTotals(totals);
  setWorkBailleur(bailleurByCell);
}, [monthly, totals, bailleurByCell, dirty]);
```

**Règle générale** : tout composant client qui copie des props serveur dans un
`useState` pour les éditer DOIT prévoir une resynchronisation (`useEffect` gardé
par un flag `dirty`, ou remontage via `key`). Sinon `router.refresh()` /
revalidation n'aura aucun effet visible.

## P-BUG-2 — Limite de 1000 lignes de PostgREST/Supabase

**Symptôme** : au-delà de 1000 mailles, les requêtes Supabase tronquent
**silencieusement** les résultats. Concrètement (2026-06-30) : la couverture de
la liste des scénarios affichait « Total dépense 2025 = 9 583 € » alors que
l'édition du même scénario montrait 247 783 € — la requête `budget_monthly`
**toutes scénarios** (6 936 lignes) ne renvoyait que les 1000 premières, et le
scénario actif (1011 mailles) était en queue, donc presque entièrement coupé.

**Cause** : `db-max-rows` de PostgREST plafonne **chaque** requête à 1000 lignes.
⚠ **`.range(0, 99999)` NE contourne PAS ce plafond** (l'ancien correctif de cette
fiche était faux) : `range` borne la fenêtre demandée mais le serveur la re-borne à
`db-max-rows`. Un scénario seul peut dépasser 1000 mailles (≈ feuilles × années × 12).

**Correctif** : **paginer** par pages de 1000 jusqu'à épuisement. Helper
`lib/supabase/fetch-all.ts` (`fetchAll(build)`), appliqué à toutes les lectures
agrégeant un budget entier ou tous les budgets : liste/édition/comparaison des
scénarios, `/interne`, `/suivi`, `/suivi/graphiques`, `/tresorerie`, `/cloture`,
`/financements/[id]`, `/grand-livre`, et l'outil tréso du chat.
```ts
const rows = await fetchAll((f, t) =>
  supabase.from("budget_monthly").select("…").eq("budget_id", id).range(f, t));
```

**Règle** : pour toute table à fort volume (`budget_monthly`, `gl_entries`) dont on
**somme/agrège** le contenu, paginer avec `fetchAll`. Ne jamais se fier à un
`.range()` large pour « tout » récupérer. (Pour un simple **affichage** borné, ex.
les 2000 dernières écritures GL, un `.range()` reste acceptable — mais ≤ 1000 par
requête, donc paginer si l'on veut réellement 2000.)

## P-BUG-3 — Poignée de redimensionnement de colonne invisible / inopérante

**Symptôme** : les colonnes du Grand Livre n'étaient pas redimensionnables ; la
poignée était invisible.

**Causes** :
1. Poignée transparente (largeur 4px, couleur seulement au survol) → invisible.
2. `<table>` sans largeur explicite : avec `table-fixed`, la largeur du tableau
   restait contrainte au conteneur, donc augmenter une colonne ne se voyait pas.

**Correctif** :
- Poignée toujours visible : zone large (`w-2`) avec un trait `bg-slate-300`,
  `cursor-col-resize`.
- `<table style={{ width: Σ largeurs }}>` pour que `table-fixed` + `colgroup`
  imposent les largeurs et activent le scroll horizontal.

**Règle** : colonnes redimensionnables = `table-fixed` + `colgroup` avec largeurs
en state + largeur totale sur `<table>` + poignée visible avec zone de clic ≥ 6px.

## P-BUG-4 — Bailleur traité comme obligatoire sur les dépenses

**Symptôme** : une dépense n'apparaissait dans le suivi des dépenses que si un
bailleur était assigné.

**Cause** : `allocationStatus` et `v_suivi_depenses` exigeaient `bailleur_id` pour
une dépense. Or le bailleur est **facultatif** (BR-4.1) : la LB suffit pour le
suivi des dépenses ; le bailleur ne sert qu'au suivi par bailleur (BR-6).

**Correctif** : dépense OK dès que `line_id` est renseigné (cf. migration
`0004_suivi_depenses_bailleur_facultatif.sql`).

**Règle** : bien distinguer les deux suivis — **dépenses** (clé = LB) vs
**bailleur** (clé = bailleur). Ne jamais coupler les deux conditions.

## P-BUG-5 — Pages lentes : chargement non borné + rendu de gros tableaux

**Symptôme** : pages très lentes, onglet Chrome saturé.

**Causes probables** : requêtes `.range(0, 99999)` chargeant tout le Grand Livre +
rendu de toutes les écritures dans une table `table-fixed`, en `force-dynamic`
(refetch à chaque navigation).

**Mitigations appliquées** : la liste du GL est limitée aux 2000 écritures les plus
récentes (`.range(0, 1999)` + tri date desc). Les agrégats (réalisé, trésorerie)
restent calculés côté serveur.

**Règle** : ne jamais rendre des milliers de lignes éditables sans pagination ou
virtualisation. Borner les requêtes d'affichage ; garder les agrégats côté base/serveur.

## P-BUG-6 — « Masquer vides » ne masque pas une ligne affichée à 0

**Symptôme** : avec « Masquer vides » actif, une LB affichant « 0 € » (ex. 1.1.2)
restait visible.

**Causes** :
1. **Sémantique « toutes années »** : la première version masquait une LB seulement
   si elle était nulle sur **toutes** les années. Une ligne nulle dans l'année
   affichée mais saisie dans une autre année restait visible → contre-intuitif.
2. **Override `total_input`** : le total affiché d'une feuille peut être le total
   saisi (BR-1.1), distinct de Σ mois. Tester l'emptiness sur Σ mois pouvait
   diverger de ce que l'utilisateur voit.

**Correctif** : masquage **par bloc d'année**, basé sur le **montant réellement
affiché** : feuille = `total_input ?? Σ mois` pour cette année ; parent = agrégat
des mois de l'année. Calculé dans `YearBlock` (pas au niveau global).

**Règle** : un filtre « masquer ce qui est à 0 » doit se baser sur la **valeur que
l'utilisateur voit à l'écran**, dans le **périmètre affiché** (ici l'année), pas sur
un agrégat global ni sur une grandeur sous-jacente différente de l'affichage.
