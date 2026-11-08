# RA2026 – Rapports d'activité des services Mlezi Maore

Outil de production des rapports d'activité (RA) annuels : campagne Siège, saisie encadrée par les chefs de service, avis des directeurs, contrôle qualité, validation DGA, PDF A4 conforme à la charte.

Il existe en deux versions, construites à partir des mêmes sources :

| Version | Fichier | Usage |
|---|---|---|
| **Web app Apps Script** (version de référence) | `apps-script/` | Servie par Google ; les brouillons sont lus et enregistrés directement dans le Drive. |
| Hors ligne | `dist/RA_Mlezi_Maore_outil.html` | Secours : un seul fichier, sans connexion ; les brouillons circulent en `.json`. |

## Où vivent les fichiers

Drive partagé › *Rapports d'activités de services 2025* › **2026** :

| Dossier | Contenu | Le brouillon y arrive quand… |
|---|---|---|
| `Campagne_RA_2026.json` (racine) | Campagne du Siège (périmètre, imports, statuts) | « Enregistrer la campagne » |
| **1. Modèles** | Un brouillon pré-rempli par RA | le Siège génère les brouillons |
| **2. En cours** | Brouillons modifiés par les services | premier enregistrement par le chef de service ; statuts *Transmis au directeur*, *À corriger* |
| **3. Soumis à validation** | RA transmis au Siège | statuts *Transmis au Siège*, *Contrôlé* |
| **4. Validés DGA** | RA validés | statut *Validé* |
| `Exports/` | CSV de suivi, activité consolidée, export FEI réduit | exports lancés depuis l'outil |

Le classeur **Suivi rapports d'activités et de service** (onglet *Suivi RA*) tient une ligne par RA : statut, dossier, lien, dernière action, compte Google, nombre d'écarts aux sources et de champs repris non relus.

## Déploiement de la web app

1. **Copier le projet dans le classeur.** Ouvrir le classeur › *Extensions › Apps Script*, puis :
   - avec **clasp** (recommandé, les bibliothèques font ~1 Mo) :
     ```bash
     npm install -g @google/clasp && clasp login
     clasp clone <ID_DU_SCRIPT> --rootDir apps-script   # ID : Paramètres du projet Apps Script
     python3 build.py && clasp push
     ```
   - ou à la main : créer `Code.gs` et les fichiers HTML `Index`, `app`, `lib_xlsx`, `lib_paged` (sans extension), coller leur contenu ; afficher le manifeste (*Paramètres › Afficher appsscript.json*) et coller `apps-script/appsscript.json`.
2. **Vérifier l'installation** : exécuter `setup` une fois et accepter les autorisations (Drive, Sheets).
3. **Déployer** : *Déployer › Nouveau déploiement › Application Web* ; *Exécuter en tant que* : **moi** ; *Accès* : **tous les utilisateurs du domaine Mlezi Maore**. Copier l'URL.
4. **Comptes Siège** : la liste `CFG.ADMINS` de `Code.gs` donne accès à la campagne, au contrôle qualité et à la validation. Y ajouter le compte de la DGA si elle valide elle-même dans l'outil.
5. Diffuser l'URL aux directeurs et chefs de service (menu du classeur *Rapports d'activité › Ouvrir l'outil*).

Mettre à jour : modifier `src/`, lancer `python3 build.py`, `clasp push`, puis *Déployer › Gérer les déploiements › Modifier › Nouvelle version* (l'URL ne change pas).

## Lancer la campagne 2026 (Siège)

1. Ouvrir la web app › **Nouvelle campagne** › 2026 ; paramètres et logos (logo combiné Mlezi Maore + GROUPE SOS, logo GROUPE SOS).
2. Importer : `vue_service` (xlsx), suivis d'activité 2026 et 2025 (xlsx), organigrammes (`S08_organigramme.png`…), export Ageval (passer par *Préparer l'export FEI*), `Reprise_RA_2025.json`.
3. Contrôler le rapport d'import, le périmètre et le registre 2002-2.
4. **Générer les brouillons « À lancer »** : un brouillon par RA est déposé dans *1. Modèles*.
5. **Enregistrer la campagne**.

Les services ouvrent la web app › **Brouillons du Drive** › leur RA. Le Siège récupère les RA transmis avec **Récupérer les brouillons du Drive** (ou **Campagne du Drive** à l'ouverture).

## Développement

- `src/` : `shell.html` (gabarit et styles), `core.js` (imports, référentiel, activité, FEI, registre 2002-2), `saisie.js` (brouillon, saisie, contrôles « Vérifier », reprise N-1), `report.js` (rendu A4 Paged.js), `views.js` (écrans), `drive.js` (mode web app).
- `vendor/` : SheetJS, Paged.js et Open Sans, embarqués (voir `vendor/LICENCES.md`).
- `python3 build.py` reconstruit `dist/` et `apps-script/`.

**Aucune donnée dans ce dépôt** : campagnes, brouillons, reprises et exports restent dans le Drive (voir `.gitignore`).
