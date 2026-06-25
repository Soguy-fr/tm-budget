# Guide de l'utilisateur — Budget ONG

Bienvenue ! Cette appli remplace tes fichiers Excel de budget. Elle a été pensée pour une ONG comme la tienne : une équipe à Yaoundé, des collègues en télétravail en Europe, des missions dans le bassin du Congo, plusieurs bailleurs… et pas forcément un diplôme de comptabilité dans l'équipe. Bonne nouvelle : il n'en faut pas.

Tout au long du guide, on suivra une ONG fictive d'écoféminisme : elle forme des femmes leaders à Yaoundé, plante des pépinières communautaires à Kribi et mène des missions fluviales sur le bassin du Congo. Ses bailleurs imaginaires : la **Fondation Sororité Verte (FSV)** et **Sista Climat (SC)**. Toute ressemblance avec ta vraie ONG est volontaire.

> 💡 **Le principe en une phrase** : tu écris ton plan de dépenses une seule fois (le budget interne), tu dis quel bailleur paie quoi et quand, tu importes la compta réelle… et l'appli compare tout ça pour toi.

---

## Premiers pas

### Se connecter

Ouvre l'appli dans ton navigateur et connecte-toi avec ton email. C'est tout. Pas de mot de passe à coller sur un post-it.

### Les rôles : qui peut faire quoi

Chaque membre de l'équipe a un rôle :

- **Admin** — la cheffe d'orchestre (souvent la coordinatrice ou la responsable financière). Elle peut tout faire : modifier la structure, créer des budgets, clore les mois, gérer les rôles.
- **Gestionnaire** — saisit les montants, importe la compta, alloue les dépenses. Par exemple, la chargée de suivi à Yaoundé ou la consultante finance à Bruxelles.
- **Lecteur** — regarde mais ne touche pas. Parfait pour le conseil d'administration ou un bailleur curieux.

> ⚠️ **Attention** : quand une gestionnaire alloue une dépense, l'allocation est marquée « À confirmer » jusqu'à validation par l'admin. C'est le principe des quatre yeux : deux personnes valent mieux qu'une, surtout à 6 000 km de distance.

### La règle d'or des couleurs

- **Bleu** = c'est toi qui saisis.
- **Noir** = c'est l'appli qui calcule. On ne touche pas.
- **Rouge** = quelque chose cloche (écart, dépassement, trésorerie négative). On regarde.

---

## La structure budgétaire

*Page : Configuration*

La structure, c'est le squelette de tous tes budgets : la liste de tes lignes budgétaires (LB), organisée en 3 niveaux.

Exemple chez nous :

- **1. Ressources humaines** (niveau 1 — la grande catégorie)
  - **1.1 Salaires** (niveau 2 — la sous-catégorie)
    - **1.1.1 Coordinatrice — Yaoundé** (niveau 3 — la ligne qui porte les montants)
    - **1.1.2 Chargée de plaidoyer — Yaoundé**
    - **1.1.3 Consultante M&E — Bruxelles (remote)**
- **2. Activités**
  - **2.1 Formations leadership**
    - **2.1.1 Atelier leadership féminin — Kribi**
  - **2.2 Environnement**
    - **2.2.1 Pépinières communautaires**
    - **2.2.2 Mission fluviale bassin du Congo**

Seul le **niveau 3** reçoit des montants. Les niveaux 1 et 2 s'additionnent tout seuls.

> ⚠️ **Attention** : la structure est **partagée par tous les budgets**. Si tu renommes « 1.1.1 Coordinatrice », le nom change partout, y compris dans les anciens budgets. L'appli te prévient avant. Et une ligne qui porte déjà des montants ou des écritures ne peut pas être supprimée — c'est fait exprès, pour ne jamais perdre d'historique.

Bon à savoir : les numéros (1.1.1, 1.1.2…) ne sont jamais renumérotés. Si tu ajoutes une ligne, elle prend le numéro suivant. Pas de panique si ça saute un numéro un jour : c'est cosmétique, pas comptable.

Chaque ligne a aussi une **Description** (colonne visible directement dans Configuration) qui explique à quoi elle correspond — « salaire chargé, 0,8 ETP, basée à Yaoundé ». Si le texte est long, il est tronqué dans la colonne ; **passe la souris dessus** pour lire l'intégralité. C'est le même texte que tu retrouves en bulle dans le tableur et le Grand Livre.

---

## Travailler un nouveau budget

*Page : Scénario*

Un « budget » ici, c'est un scénario complet de prévisionnel. Tu peux en avoir plusieurs (« Budget 2026 v1 », « Budget 2026 révisé juin »), mais **un seul est actif** à la fois — c'est lui que toute l'appli affiche.

### Créer ou dupliquer

- **Créer** : nouveau budget vide, nomme-le clairement (« Budget 2026 — version AG »).
- **Dupliquer** : copie intégrale du budget actif, montants et bailleurs compris. C'est LE bon réflexe avant une grosse révision : tu dupliques, tu bidouilles la copie, et si l'assemblée générale valide, tu actives la nouvelle version.

### Le solde initial de trésorerie

À la création, saisis le **solde initial** : c'est l'argent sur le compte en banque au 1er janvier de la première année. Exemple : il reste 8 450 000 FCFA convertis, soit 12 900 €, sur le compte au 1er janvier → solde initial = 12 900. Ce chiffre est le point de départ de toute la courbe de trésorerie.

> 💡 **Astuce** : tu travailles en euros partout. Si ta compta locale est en FCFA, convertis avant de saisir (et garde le taux utilisé quelque part — ton auditeur te dira merci).

---

## Saisir le prévisionnel

*Page : Suivi interne*

C'est le grand tableur : tes lignes budgétaires en lignes, les 12 mois en colonnes, une section par année (repliable).

### Le mode édition

Clique sur **Éditer** : les cases passent en bleu, tu saisis. Tes modifications s'accumulent sans toucher la base. Clique sur **Enregistrer** : tout part d'un coup. Un garde-fou te retient si tu essaies de quitter la page avec des modifications non enregistrées.

### Total annuel et bouton « Répartir »

Tu connais souvent le total annuel avant le détail mensuel. Exemple : l'atelier leadership de Kribi coûtera 6 000 € dans l'année.

1. Saisis 6 000 dans la colonne Total.
2. Si la somme des mois ne colle pas, la cellule passe en **rouge** avec l'écart affiché.
3. Deux issues : **Répartir** (l'appli étale 500 €/mois — le dernier mois absorbe l'arrondi) ou **Mettre à jour le total** (le total devient la somme des mois).

Pour des dépenses ponctuelles (la mission fluviale, c'est en mars et avril, pas en janvier), saisis directement dans les bons mois.

### Dire qui paie : l'assignation bailleur

Chaque case (ligne × mois) peut être imputée à **un seul bailleur**. Le cofinancement, c'est par partage des mois : le salaire de la coordinatrice est payé par la FSV de janvier à mai, puis par Sista Climat de juin à décembre. Cinq cases FSV, sept cases SC.

Le bouton **Afficher bailleur** colore les cases aux couleurs de chaque bailleur — en un coup d'œil tu vois ce qui est financé (et le gris « non assigné » qui pique les yeux : c'est ton trou de financement).

> ⚠️ **Attention** : une case = un bailleur, jamais deux. Si deux bailleurs cofinancent le même mois du même poste, découpe la ligne en deux LB (ex : « 1.1.1a Coordinatrice — part FSV »). Mais le partage des mois suffit dans 90 % des cas.

---

## Ajouter un financement

*Page : Financement*

Un mot de vocabulaire d'abord : un **bailleur** est un *acteur* (la Fondation JFN), un **financement** est un *fonds* qu'il accorde (JFN-001, doté de 10 000 €). Un même bailleur peut accorder **plusieurs** financements — d'où la distinction. Dans l'appli (et la page Trésorerie), on raisonne surtout par **financement**.

Pour chaque financement :

- **Référence** (JFN-001), **bailleur** (l'acteur qui donne), **couleur** (celle des cases du tableur).
- **Montant total** : ce que le bailleur va verser (ex 10 000 €). Sert aux écarts Budgété/Dépensé et au drapeau rouge de dépassement.
- **Dates d'éligibilité** : du 1er avril 2026 au 31 mars 2028 par exemple — la fenêtre pendant laquelle une dépense peut être imputée à ce fonds. Oui, les bailleurs adorent les années qui ne ressemblent pas aux nôtres.
- **Description** : à quoi sert ce fonds.

### Les lignes de financement et le mapping

Chaque financement a SA nomenclature à lui (A1 « Ressources humaines », A2 « Activités terrain »…). Plutôt que de tenir deux comptabilités, tu **mappes** : la ligne A1 du fonds correspond à tes LB 1.1.1, 1.1.2 et 1.1.3. L'appli traduit automatiquement ton budget interne dans le format du bailleur. Une saisie, deux langues.

### Assigner les lignes dans le budget

Une fois le mapping fait, le bouton **« Assigner les lignes dans le budget »** fait le gros du travail : pour chaque LB mappée, sur **chaque mois de la fenêtre d'éligibilité**, il impute la maille à ce financement. Plus besoin de colorier case par case dans Suivi interne.

> ⚠️ **Ça écrase l'existant** : si certaines mailles étaient déjà imputées à un **autre** financement, l'appli te les liste et demande **confirmation** avant d'écraser. Comme une maille ne peut porter qu'**un seul** financement (règle de cofinancement), si deux fonds couvrent la même ligne **sur la même période**, le bouton ne peut pas les partager : règle ce cas à la main ensuite, via la couche couleur de Suivi interne (ex : FPC janvier-mai, SW juin-décembre).

### Budgété et Dépensé

En face de chaque ligne du fonds, deux colonnes parlent d'elles-mêmes :

- **Budgété** : la somme des lignes de TON budget prévisionnel actuellement imputées à ce financement. Si le fonds vaut 10 000 € et que tu n'as budgété que 8 000 €, l'appli indique « reste 2 000 à budgéter ». Si tu as budgété 12 000 €, elle crie « sur-budgété de 2 000 ».
- **Dépensé** : la somme des écritures du Grand Livre réellement imputées à ce financement. Même logique d'écart : sous-dépensé ou dépassement (rouge).

### Les recettes prévues

Saisis quand l'argent doit **arriver** : le fonds verse 60 000 € en février et 40 000 € en septembre. C'est le carburant de la courbe de trésorerie.

> ⚠️ **Attention** : la ligne « Non assigné » de la vue financement est calculée automatiquement (recettes prévues − dépenses fléchées). Si elle devient négative, tu as promis plus de dépenses à ce fonds qu'il ne donne d'argent. Aïe. À corriger avant de signer quoi que ce soit.

### Le pack audit

Le bouton **📦 Pack audit (CSV)** génère en un clic un fichier prêt pour l'auditeur ou le rapport bailleur : convention, synthèse, mapping, recettes prévues, liste des écritures réelles. Quand l'auditrice de la FSV écrit un vendredi à 16h, tu réponds avant 16h05. Effet garanti.

---

## Le Grand Livre : la réalité entre dans l'appli

*Page : Grand Livre*

Le Grand Livre (GL), c'est l'export de ta comptabilité réelle : chaque paiement, chaque encaissement. Lui seul fait foi pour le « réalisé ». Règle simple : **ce qui compte, c'est la date où l'argent bouge** (pas la date de la facture).

### Importer le CSV

Bouton **Importer CSV** → choisis l'export de ta compta. L'appli reconnaît les colonnes Date, Type, Libellé, Montant. Pas sûr du format ? Le bouton **Télécharger un fichier exemple** te donne un modèle prêt à remplir.

Le fichier doit avoir ces colonnes, en-têtes sur la 1re ligne, séparateur point-virgule ou virgule :

- **Date** (obligatoire) : au format AAAA-MM-JJ ou JJ/MM/AAAA — la date où l'argent bouge.
- **Type** (obligatoire) : « Dépense » ou « Recette ».
- **Montant** (obligatoire) : en euros, **une seule colonne signée** (ex : 5,34 ou −37,56).
- **Libellé** (facultatif) : le texte de l'écriture.
- **Code analytique** (facultatif) : le **niveau 2** d'une ligne budgétaire (ex « 1.1 Core Team »). Pratique : quand tu choisis ensuite la LB de l'écriture, l'appli ne te propose **que les sous-lignes** de ce niveau 2 (1.1.1, 1.1.2…) — impossible de te tromper et d'aller piocher dans 2.1.1. Si le code est vide ou inconnu, le menu reste complet et un petit avertissement t'invite à vérifier.

- **Montant = une seule colonne, déjà en euros.** Si ton export comptable a deux colonnes Débit et Crédit séparées, calcule d'abord Débit − Crédit dans une colonne unique avant d'importer (sinon l'appli n'en lit qu'une et le total est faux).
- Les montants **négatifs** sont acceptés : un avoir (le traiteur de Kribi rembourse 120 € de trop-perçu) se saisit en Dépense à −120. Il vient en déduction de la ligne — pas en recette.
- **Doublons** : si tu réimportes par erreur le même fichier (ça arrive aux meilleures), l'appli repère les écritures déjà présentes (même date, même montant, même libellé) et te propose d'importer **sans** les doublons. Merci qui ?

### Allouer chaque écriture

Une écriture importée doit être rangée : quelle LB ? quel bailleur ?

- Les écritures non rangées sont **surlignées en jaune** (« À allouer ») et ne comptent dans aucun suivi (sauf la trésorerie — l'argent est bien sorti du compte, lui).
- Quand tu choisis la LB, l'appli **propose le bailleur prévu au plan** pour ce mois-là. Tu peux le changer : la réalité a le droit de différer du plan.
- Le bailleur est **facultatif** sur une dépense : la LB suffit pour le suivi des dépenses.

### Le coup de pouce de l'IA

Tu as 47 écritures à allouer un lundi matin ? Clique sur **✨ Suggérer LB (IA)**. L'assistant lit les libellés (« Carburant pirogue mission Mbandaka »… ça sent la ligne 2.2.2), s'inspire de tes allocations passées et propose LB + bailleur avec un niveau de confiance. **Rien n'est appliqué sans ton clic** — l'IA propose, l'humaine dispose.

> ⚠️ **Attention aux petits drapeaux ⚠** dans la colonne Statut : ils signalent une dépense **hors fenêtre d'éligibilité** du financement, un financement **différent de celui prévu au plan** pour cette ligne ce mois-là, une LB non couverte, un montant inhabituel (10× la moyenne de la ligne), ou un paiement daté un dimanche. Ce ne sont pas des blocages, ce sont des « regarde-moi ça de plus près ».

---

## Suivre les dépenses

*Page : Dashboard, et bouton « Suivi des dépenses » sur le Suivi interne*

C'est LA question du lundi : où en est-on ?

- **Prévu** : ton budget.
- **Réalisé** : la somme des écritures du Grand Livre allouées à la ligne.
- **Écart** et **% consommé** : calculés tout seuls.

Sur le tableur interne, active **Suivi des dépenses** : une ligne « réalisé » s'affiche sous chaque ligne prévue, mois par mois. Si l'atelier de Kribi affiche prévu 6 000 / réalisé 7 200, le total passe en **rouge** : dépassement. Pas de panique, mais une explication à préparer pour la FSV.

Astuce : **clique sur n'importe quelle case mois** du tableur → tu atterris sur le Grand Livre filtré sur cette ligne et ce mois, avec le détail des dépenses. Fini le « mais c'est quoi ces 940 € en mars ?? ».

Le **Dashboard** ajoute les graphiques : dépenses vs budget par catégorie, répartition par bailleur, courbe de trésorerie. Parfait pour la réunion d'équipe (ou pour briller au CA).

Sur l'**onglet Dépense** du Dashboard, on reste volontairement à la vue d'ensemble : seuls les **niveaux 1 et 2** s'affichent (1 Operating Costs, 1.1 Core Team…), pas le détail niveau 3. Une colonne **Commentaire** (bouton **Édit / OK**) te laisse annoter chaque catégorie — « dépassement assumé, mission supplémentaire validée par le CA ». Ce commentaire est le **même** que celui de la page Configuration : tu l'écris ici, il apparaît partout (et inversement).

---

## La trésorerie : éviter la panne sèche

*Sur la page Suivi interne (ligne du bas) — et la page Trésorerie dédiée*

La trésorerie répond à une question vitale : **aura-t-on assez d'argent sur le compte chaque mois ?** Avoir un budget équilibré sur l'année ne suffit pas — si la FSV verse en septembre mais que les salaires tombent tous les mois, juillet peut faire mal.

Deux modes :

- **Budgété** : la projection théorique (recettes prévues − dépenses prévues, cumulées mois après mois depuis le solde initial).
- **Réel** : les mois clos utilisent les vrais chiffres du Grand Livre, les mois futurs gardent le budget. C'est la prévision glissante : ta meilleure boule de cristal.

Un mois en **rouge** = solde négatif prévu. Exemple typique : la mission fluviale d'avril coûte cher, le versement Sista Climat n'arrive qu'en juin → mai est rouge. Solutions : décaler la mission, demander une avance au bailleur, ou pleurer (déconseillé, préférer les deux premières).

> 💡 **Le saviez-vous** : la trésorerie compte TOUTES les écritures, même celles pas encore allouées. Normal : la banque, elle, n'attend pas que tu ranges tes étiquettes.

### La page Trésorerie : la même chose, en plus lisible

*Page : Trésorerie*

Cette page est une **synthèse** du solde budgété (les mêmes chiffres que la ligne du bas de Suivi interne, mode Budgété) présentée clairement : une ligne par **financement** (ses recettes prévues mois par mois), une ligne **Dépenses totales**, une ligne **Solde**.

Le petit plus malin : la case **« Date du jour du calcul »**. Tu y mets une date (par défaut aujourd'hui) et l'appli **grise tous les mois passés** — tu ne regardes que l'avenir. Le solde réellement en caisse à cette date se saisit dans la case **Solde forcé**, qui se pose dans le mois juste avant (date au 13 juin 2025 → solde forcé affiché en « Solde mai 2025 »), et la projection repart de là. Change la date pour simuler « et si on était déjà en septembre ? » sans toucher à ton budget.

---

## Clore le mois : le rituel mensuel

*Page : Clôture*

Une fois par mois (idéalement la première semaine du mois suivant), on « ferme » le mois écoulé. C'est le moment vérité-café de la responsable financière.

### Le rapprochement bancaire

Saisis le **solde du relevé bancaire** de fin de mois. L'appli le compare au solde qu'elle calcule :

- **Écart = 0** (vert) : ta compta et ta banque racontent la même histoire. Champagne (ou jus de bissap).
- **Écart ≠ 0** (rouge) : il manque des écritures, un import a doublonné, ou un paiement est passé hors compta. À élucider avant de clore.

### La check-list puis le verrou

Sur le prochain mois à clore, l'appli affiche : GL importé ? écritures allouées ? rapprochement OK ? Puis **Clore le mois** :

- Les écritures, allocations et montants budgétés du mois deviennent **non modifiables**.
- La trésorerie « Réel » bascule ce mois en vrais chiffres.
- Les mois se ferment **dans l'ordre** : pas de mars clos avant février (la machine à remonter le temps n'est pas au budget).

> ⚠️ **Attention** : pourquoi verrouiller ? Parce qu'un chiffre déjà envoyé à un bailleur ne doit plus bouger en silence. Si tu dois vraiment corriger janvier, **Réouvrir** existe (seulement le dernier mois clos), et l'action est tracée. Ton auditeur voit tout. C'est le but.

---

## L'assistant IA : pose tes questions

*Page : Assistant IA*

Un chat où tu poses tes questions en français normal :

- « Quelles lignes dépassent leur budget cette année ? »
- « Combien reste-t-il à recevoir de la FSV ? »
- « Quel sera le solde de trésorerie en décembre ? »
- « Montre-moi les dépenses de la mission fluviale en avril. »

L'assistant **lit tes vraies données** via des outils fermés — il n'invente pas de chiffres et ne peut pas modifier quoi que ce soit. Sous chaque réponse, il indique quelles données il a consultées (« données lues : get_suivi_depenses »).

> 💡 **Limite assumée** : le modèle gratuit est parfois lent ou répond à côté. Repose la question, ou reformule. Et pour les décisions importantes, vérifie sur le Dashboard — l'assistant est un collègue sympa, pas le commissaire aux comptes.

---

## Qui a fait quoi : l'audit

*Page : Audit (admin uniquement)*

Chaque modification — un montant changé, une allocation déplacée, une écriture supprimée — est enregistrée automatiquement : quoi, quand, qui, ancienne valeur → nouvelle valeur.

À quoi ça sert ? Quand la consultante de Bruxelles demande « qui a changé le budget pépinières de 3 000 à 4 500 ? », la réponse est à deux clics. Pas d'accusation au doigt mouillé, juste les faits. Et pour un audit bailleur, c'est de l'or.

---

## La fin d'année : archiver et repartir

*Page : Scénario, zone de purge*

Une fois l'exercice bouclé, exporté et rapporté :

1. **Exporte** d'abord tout (les rapports, les packs audit par bailleur).
2. La **purge** remet les compteurs à zéro : montants, recettes prévues… La structure des lignes et les bailleurs restent.
3. Les écritures du Grand Livre ne sont **jamais supprimées** : elles sont archivées, invisibles mais conservées. La loi impose de garder les pièces comptables 10 ans — l'appli le fait pour toi.

> ⚠️ **Attention** : la purge demande de taper « PURGER » en toutes lettres. Ce n'est pas pour t'embêter : c'est le genre de bouton qu'on ne veut pas presser en cherchant la machine à café.

---

## En cas de pépin

- **« Accès refusé »** : ton rôle ne permet pas cette action. Vois avec l'admin.
- **« Mois clos »** : tu essaies de modifier un mois verrouillé. Passe par la page Clôture (Réouvrir) si c'est vraiment nécessaire.
- **Un chiffre te semble faux** : clique sur la case → Grand Livre filtré → vérifie les écritures et leurs allocations. 9 fois sur 10, c'est une écriture mal rangée.
- **Le bouton Rafraîchir** (tableur) recharge les données depuis la base — utile si une collègue vient de modifier quelque chose depuis Bruxelles pendant que tu avais la page ouverte à Yaoundé.

Bonne gestion, et que la trésorerie soit toujours verte 🌱
