# Check utilisateur — à vérifier

> Liste des choses à tester. Coche au fur et à mesure. Chaque mise à jour est horodatée.

## Journal des mises à jour

- **2026-06-28 13:25** — Fix : détail mensuel de chaque financement **toujours visible et éditable** (12 inputs + ✓ par année). Le stylo verrou est retiré (il masquait les mois).
- **2026-06-28 12:24** — Itération 2 **livrée** (build OK, 227 tests verts, 5 commits). À tester ci-dessous. Migration **0011** ajoutée (description).
- **2026-06-28 12:11** — Itération 2 : Config en onglets, stylo /interne, refonte liste scénarios (accordéon + description + suppression + couverture par année + « ? »), refonte CoveragePanel (montant auto, stylo par année, 2e tableau financements, fix FK), nouvelle formule de couverture (solde fin d'année).
- **2026-06-28 (matin)** — Itération 1 : 4 chantiers (rôles, édition ligne-par-ligne, onglets scénario, financements prévisionnels).

---

## ⚠️ Prérequis (à faire une fois)

- [ ] Appliquer les migrations dans l'ordre : `0009`, `0010`, `0011` (Supabase → SQL Editor).
- [ ] `.env.local` : `SUPABASE_SERVICE_ROLE_KEY` (pour l'onglet Utilisateurs).
- [ ] Redémarrer `npm run dev` après un `git pull`.

---

## Itération 2 (nouveau)

### Configuration — onglets

- [ ] http://localhost:3000/structure : onglets **Structure** et **Utilisateurs**.
- [ ] Onglet Structure : l'arbre des LB + la zone danger/purge en bas.
- [ ] Onglet Utilisateurs : liste des comptes + dropdown rôle (guillaume verrouillé).

### /interne — stylo

- [ ] Le bouton d'édition par ligne est une **icône stylo ✏** sobre (plus de bouton « Éditer »).

### Liste des scénarios (accordéon)

- [ ] http://localhost:3000/budgets?tab=liste : chaque scénario est un **accordéon** (replié = nom + début de description).
- [ ] Déplié : **une ligne par année** → total dépense (gras), total reçu, solde fin d'année, % couvert.
- [ ] Le solde initial de couverture **n'apparaît pas** sur cette page.
- [ ] Indicateur **« ? »** : survol explique l'approximation + lien guide.
- [ ] **Supprimer** un scénario : confirmation « Êtes-vous sûr ? » ; **impossible** sur l'actif.

### Description de scénario

- [ ] Onglet Édition : on peut modifier le **titre** et la **description** du scénario.
- [ ] La description (premières lignes) s'affiche dans la liste.

### CoveragePanel (édition)

- [ ] Ajouter une ligne de financement = **nom seul** (pas de montant ; il se calcule depuis les mois).
- [ ] Détail mensuel de chaque financement **toujours visible et éditable** (12 inputs), enregistré **par année** (✓).
- [ ] **Plus d'erreur** « foreign key … scenario_financing_monthly » à l'enregistrement.
- [ ] Tableau **Couverture par année** + tableau **Liste des financements** (montant total = Σ années).
- [ ] % couvert : solde fin positif → 100 % ; négatif → (charges+solde)/charges (ex 100/−20 → 80 %).

---

## Itération 1 (rappel)

### Rôles & comptes

- [ ] Onglet Utilisateurs visible (guillaume/mireille) ; diane ne le voit pas.
- [ ] diane : Activer un scénario échoue ; mireille : Activer marche.
- [ ] Allocation GL par diane : effective tout de suite (plus de « À confirmer »).

### Édition ligne par ligne (/interne)

- [ ] Stylo par LB niv.3 ; une seule ligne ouverte à la fois.
- [ ] Total **verrouillé** sur l'actif (🔒) ; **figé** à l'ouverture, le **Solde** = total − Σ mois.
- [ ] Enregistrer refusé si Σ ≠ total ; ⚠ en tête de ligne ; **Solde** copiable ; **Effacer**.

### Onglet Édition de scénario

- [ ] /budgets?tab=edition : tableur du scénario sélectionné, sans tréso ni suivi ; total éditable.

### Conversion à l'activation

- [ ] Bouton **Convertir** : crée le financement réel (visible dans /financements) + recettes prévues.
