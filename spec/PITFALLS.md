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

**Symptôme** (préventif) : au-delà de ~1000 mailles, les requêtes Supabase
tronquent silencieusement les résultats (limite par défaut de PostgREST).

**Correctif** : ajouter `.range(0, 99999)` sur les requêtes volumineuses
(`budget_monthly`, `gl_entries`).

**Règle** : pour toute table à fort volume (mailles mensuelles, écritures GL),
paginer explicitement ou poser un `.range()` large.
