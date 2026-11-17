<div align="center">

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · **Français** · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

# @dsh-plugins/file-upload

Une **ligne trombone sous Tâches d'automatisation** dans la barre latérale web de [DSH](https://github.com/deepseek-ai/deepseek-harness) qui ouvre une page de téléversement : choisir un dossier sur l'hôte comme le fait la boîte de dialogue de l'espace de travail, sélectionner plusieurs fichiers à la fois et regarder chacun d'eux se téléverser avec sa propre barre de progression.

<img src="../assets/uploaded.png" alt="La page Téléverser un fichier après le téléversement de trois fichiers : la ligne trombone est sélectionnée dans la barre latérale gauche, le dossier de destination est défini et chaque ligne affiche une barre verte et l'étiquette Téléversé" width="1200" />

<sub>Les noms des espaces de travail et des sessions dans la barre latérale sont floutés.</sub>

</div>

## Pourquoi

DSH peut déplacer des octets *hors* de l'espace de travail ([`@dsh-plugins/file-download`](https://github.com/tribesman/dsh-file-download)) et prépare des pièces jointes du navigateur pour un prompt, mais il n'existait aucun moyen de déposer plusieurs fichiers existants dans un dossier du serveur sans un shell sur l'hôte. Ce plugin apporte la pièce manquante, à l'endroit où vivent les autres panneaux globaux.

## Où cela apparaît

| Endroit | Quoi |
| --- | --- |
| Barre latérale gauche | Une ligne **Téléverser un fichier** avec un glyphe trombone, juste sous **Tâches d'automatisation** (`order: 11`) |
| Colonne principale | La page de téléversement, ouverte en sélectionnant cette ligne |

<img src="../assets/upload-page.png" alt="La page Téléverser un fichier sans destination encore choisie : la ligne de la barre latérale se trouve sous Tâches d'automatisation, la page montre une carte de destination et une zone de dépôt en pointillés" width="1200" />

Tout sur la page forme un seul flux :

1. **Dossier de destination** — *Choisir un dossier* ouvre une boîte de dialogue intégrée à l'application, alimentée par la liste des répertoires de l'hôte elle-même (`ctx.uiWorkspace.listDirectory`, la même primitive que celle qui se trouve derrière **Sélectionner le répertoire de l'espace de travail**) : sauts dans le fil d'Ariane, chemin modifiable d'un clic, bascule des dossiers cachés et confirmation finale *Choisir ce dossier*. La liste des dossiers vient de l'hôte, elle fonctionne donc depuis un navigateur distant où aucun sélecteur du système d'exploitation n'existe.

   <img src="../assets/folder-picker.png" alt="La boîte de dialogue Choisir un dossier sur le serveur : le fil d'Ariane affiche Accueil et le dossier démo, avec archive, photos et reports listés" width="1200" />

2. **Choisir des fichiers** — le sélecteur de fichiers de la page accepte plusieurs fichiers à la fois, et les fichiers déposés n'importe où sur la page rejoignent la même file d'attente.
3. **Téléverser des fichiers** — la file d'attente traite un fichier à la fois ; chaque ligne affiche le compteur d'octets envoyés, une barre de progression et une étiquette d'état. Une ligne en échec conserve son message et propose **Réessayer** ; **Annuler le téléversement** arrête la file et laisse les lignes restantes prêtes.

   <img src="../assets/uploading.png" alt="Un téléversement en cours : la première ligne indique 215 Mo sur 800 Mo avec une barre à moitié remplie et l'étiquette Téléversement en cours, les autres lignes attendent en Prêt, et l'en-tête propose Annuler le téléversement" width="1200" />

## Comment ça marche

**Moitié hôte** — une route de streaming authentifiée sur la barrière `/api` partagée :

```
POST /api/file-upload/write?dir=<absolute folder>&name=<file name>
content-type: application/octet-stream
```

Elle repose sur `ctx.connection.fetch`, si bien que Connection admet la requête au regard des identifiants Harness signés du navigateur avant que ce gestionnaire ne s'exécute : une requête non authentifiée ne l'atteint jamais, et seul le Peer propriétaire est servi. Les deux coordonnées sont validées (un répertoire absolu et existant ; un nom de fichier simple sans séparateur), et le corps est diffusé directement dans un fichier voisin `.dsh-upload-<uuid>.part` qui n'est renommé à sa place qu'après l'arrivée du dernier octet — un téléversement abandonné ou échoué ne laisse rien sous le vrai nom.

**Moitié navigateur** — un bundle CJS paresseux écrit à la main qui ne requiert que la base fournie par le shell (`react`, `react-dom`). Il enregistre deux contributions : la ligne `sidebar.panellist` et le panneau `main` avec la même clé, ce qui constitue tout le contrat dont la barre latérale a besoin pour le sélectionner. Le simple `XMLHttpRequest` sur le fil de la page est ce qui rend la progression par fichier réelle : `xhr.upload.onprogress` signale les octets que le navigateur a réellement remis au socket.

## Installation

Le paquet est un **bundle** (`dsh.bundle.patch`), le gestionnaire de plugins peut donc l'installer et le mettre à jour comme une seule ligne :

```bash
# depuis un checkout — crée un lien vers ce répertoire, les modifications restent actives
dsh plugin --profile web add /path/to/dsh-file-upload

# ou depuis le dépôt git distant
dsh plugin --profile web add "git+https://github.com/tribesman/dsh-file-upload.git"
```

L'un ou l'autre chemin peut aussi passer par l'interface : **Plugins → Ajouter un plugin**.

Sans `dsh` dans le `PATH`, créez un lien symbolique vers le checkout dans le profil et ajoutez la ligne à la main :

```yaml
# $DSH_HOME/profiles/web/cordis.patch.yml
- insert:
    - id: file-upload-panel
      name: '@dsh-plugins/file-upload'
```

```bash
ln -s /path/to/dsh-file-upload \
  "$DSH_HOME/profiles/web/node_modules/@dsh-plugins/file-upload"
```

L'identifiant de ligne ne doit pas répéter un identifiant déjà livré : `file-upload` appartient déjà à `@deepseek-ai/dsh-client-file-upload`, le transport des pièces jointes du prompt dans le navigateur, et deux entrées du Loader partageant un identifiant n'en composent qu'une. D'où `file-upload-panel`.

Redémarrez le harness une fois pour qu'une ligne du Loader nouvellement ajoutée soit composée. Sur une instance active, une ligne insérée est montée sans redémarrage.

Vérifiez que cela fonctionne : la barre latérale gagne **Téléverser un fichier** juste sous **Tâches d'automatisation**, la page liste le dossier personnel de l'hôte, et un téléversement terminé aboutit dans le dossier que vous avez choisi :

```bash
ls -l "/the/folder/you/chose"
```

## Configuration

Les deux réglages vivent dans la `config` de la ligne du plugin, la couche de correctifs du profil les conserve donc à travers les mises à jour :

```yaml
- id: file-upload-panel
  name: '@dsh-plugins/file-upload'
  config:
    maxFileBytes: 1048576      # par défaut 1073741824 (1 GiB), 1024 … 16 GiB
    conflict: overwrite        # par défaut "rename"
```

| Champ | Valeur par défaut | Signification |
| --- | --- | --- |
| `maxFileBytes` | `1073741824` | Plafond inclusif pour un fichier ; un corps plus gros est refusé avec `413` et rien n'est stocké |
| `conflict` | `"rename"` | Ce que signifie un nom déjà pris : `rename` conserve le fichier existant et dépose le nouveau sous `name (1).ext` ; `overwrite` le remplace |

La ligne déclare son schéma comme un Standard Schema écrit à la main, les valeurs ci-dessus sont donc validées à l'activation du plugin et une mauvaise valeur fait échouer la ligne avec une erreur. Le gestionnaire de plugins ne lit que les graphes Schemastery natifs, son formulaire de configuration signale donc le schéma de cette ligne comme non pris en charge et n'offre aucun champ : définissez les valeurs dans le correctif, comme montré ci-dessus.

## Notes de sécurité

- La route est une **route exacte sur la barrière `/api` de Connection**, pas un chemin brut de serveur web ; elle exige donc le cookie de session signé du navigateur et ne sert que le Peer propriétaire. Elle n'ajoute pas non plus d'assouplissement Host/Origin qui lui soit propre.
- La route écrit là où l'opérateur authentifié la dirige, avec les permissions du processus DSH — la même portée que celle qu'ont déjà le sélecteur de répertoire de l'espace de travail et l'outil `bash`. La destination doit déjà exister ; le plugin ne crée pas de dossiers.
- Le navigateur nomme un dossier et un nom de fichier, jamais un chemin à l'intérieur : le nom est exempt de `.` et de séparateurs, une requête ne peut donc pas s'échapper du dossier choisi.
- Les fichiers temporaires sont créés à côté de leur cible et supprimés en cas d'échec ou d'annulation ; rien ne subsiste sous le nom final tant que tous les octets ne sont pas arrivés.

## Limitations connues

- Une file de téléversement par visite de page : la liste est locale à la page, et quitter la page au milieu d'un téléversement laisse le transfert se poursuivre (l'hôte termine le fichier) mais oublie les lignes.
- Aucune création de dossier dans le sélecteur et aucune reprise : un téléversement échoué repart du premier octet.
- Le sélecteur ne liste que des dossiers, et les niveaux tronqués signalent `truncated` plutôt que de paginer.
- La page n'a pas de contrôle préalable côté client pour `maxFileBytes` : un fichier trop volumineux est refusé par l'hôte après le transfert.
- L'hôte rédige le texte d'erreur en anglais et conserve le code errno dans le message.

## Développement

```bash
npm test        # node --test: 22 cas sur la route et le bundle
npm run check   # contrôle de syntaxe sur les deux moitiés
```

Les tests de l'hôte pilotent la route via de vrais objets `Request`/`Response` et un vrai répertoire temporaire ; ils couvrent donc le chemin des octets, les politiques de conflit, le plafond de taille, l'annulation et le texte d'échec sans harness. Les tests du navigateur exécutent le bundle dans une VM avec un React et un DOM simulés ; ils n'ont donc besoin ni d'un harness ni d'un navigateur.

## Fichiers

| Chemin | Rôle |
| --- | --- |
| `lib/index.js` | Moitié hôte : la route d'écriture en streaming et son schéma de configuration |
| `lib/client.js` | Moitié navigateur : bundle CJS paresseux, ligne de barre latérale, page, boîte de dialogue de dossiers |
| `cordis.patch.yml` | Correctif du bundle : l'unique ligne hôte |
| `locale/*.json` | Titre et description affichés par le gestionnaire de plugins |
| `icon.svg` | L'icône de tuile en trombone |
| `docs/assets/*.png` | Captures d'écran utilisées par ce README et ses traductions |
| `docs/readme/README_*.md` | Les READMEs traduits |
| `test/host.test.mjs` | Comportement de la route : statuts, politiques, plafond, annulation, texte d'échec |
| `test/client.test.mjs` | Contrat du bundle : forme de la ligne, ordre, dictionnaires, feuille de style |

## Traductions

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · **[Français](README_fr.md)** · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md) · [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

Les READMEs traduits se trouvent dans [`docs/readme/`](.). Ils décrivent le même plugin ; en cas de divergence avec ce fichier, ce fichier fait foi.

## Licence

MIT.
