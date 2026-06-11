# Site MAMAFI

Site web de l'association MAMAFI avec un backend simple pour modifier les contenus et recevoir des promesses de dons.

La palette visuelle reprend les couleurs du logo MAMAFI : vert principal `#20a840`, vert profond `#187030`, noir et blanc. Les anciennes teintes violettes et dorees ont ete retirees des interfaces.

## Lancement

```bash
node server.js
```

Sous Windows, si `npm` n'est pas installe, lancer directement :

```powershell
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

Il est aussi possible de double-cliquer sur `start-local.cmd`.

Puis ouvrir :

- Site public : http://localhost:3000
- Administration : http://localhost:3000/admin.html

Le mot de passe admin par defaut est `mamafi-admin`.
Le lien admin n'est pas affiche sur la page publique; il faut ouvrir directement `/admin.html`.

Le mot de passe peut etre change depuis l'administration. Le nouveau mot de passe est stocke sous forme de hash dans `data/settings.json`.

## Donnees

- `assets/css/` contient les feuilles de style.
- `assets/js/` contient les scripts des pages.
- `assets/images/` contient le logo et les images integrees au site.
- `assets/uploads/` contient les images ajoutees depuis l'administration.
- `assets/payment/` contient uniquement les logos des moyens de don.
- Les contenus du site sont stockes dans `data/content.json`.
- Les promesses de dons sont stockees dans `data/donations.json`.
- Les styles, textes bilingues, images, legendes, domaines d'action, galeries, reseaux sociaux et moyens de dons sont modifiables dans l'admin.
- Les images et logos sont ajoutes directement depuis l'ordinateur avec aperçu, sans devoir saisir une URL. Formats acceptes : JPG, PNG, WebP et GIF, jusqu'a 12 Mo.
- Chaque image dispose d'une miniature et de reglages non destructifs : hauteur, cadrage, luminosite, contraste, saturation et rotation.
- La page publique comprend une bande de partenaires et une carte OpenStreetMap des zones d'intervention.
- Les partenaires et les zones geographiques sont modifiables depuis l'administration.
- Une page dediee `actions.html` presente les projets par categorie avec lieu, periode, statut, objectifs, resultats et galerie.
- Une page dediee `actualites.html` presente un article a la une, des actualites filtrables par categorie et une lecture detaillee. Le titre, l'introduction, les dates, categories, textes et images sont geres depuis l'administration.
- L'administration utilise une session serveur avec cookie HttpOnly. Le mot de passe n'est plus conserve dans le stockage du navigateur.
- Un code de recuperation configurable permet de reinitialiser un mot de passe oublie.
- Les champs de mot de passe disposent d'un bouton pour afficher ou masquer leur contenu.
- L'identite du site et les chiffres cles sont maintenant modifiables depuis l'administration.

## Dons

Les moyens de don affiches sur le site sont configurables depuis l'administration. Aucun lien de documentation technique ou cle de paiement n'est affiche dans l'interface.
