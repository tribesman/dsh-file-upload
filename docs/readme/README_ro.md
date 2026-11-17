<div align="center">

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · **Română** · [Български](README_bg.md)

# @dsh-plugins/file-upload

**Un rând cu agrafă sub secțiunea Sarcini de automatizare** din bara laterală web a [DSH](https://github.com/deepseek-ai/deepseek-harness), care deschide o pagină de încărcare: alege un folder pe gazdă la fel ca dialogul spațiului de lucru, selectează mai multe fișiere deodată și urmărește cum fiecare se încarcă cu propria bară de progres.

<img src="../assets/uploaded.png" alt="Pagina Încarcă fișier după ce trei fișiere s-au încărcat: rândul cu agrafă este selectat în bara laterală stângă, folderul destinație este setat, iar fiecare rând arată o bară verde și eticheta Încărcat" width="1200" />

<sub>Numele spațiilor de lucru și ale sesiunilor din bara laterală sunt estompate.</sub>

</div>

## De ce

DSH poate muta octeți *în afara* spațiului de lucru ([`@dsh-plugins/file-download`](https://github.com/tribesman/dsh-file-download)) și pregătește atașamente din browser pentru un singur prompt, dar nu exista nicio cale de a pune mai multe fișiere existente într-un folder de pe server fără un shell pe gazdă. Acest plugin adaugă perechea care lipsea, în locul în care stau celelalte panouri globale.

## Unde apare

| Loc | Ce |
| --- | --- |
| Bara laterală stângă | Un rând **Încarcă fișier** cu o pictogramă de agrafă, direct sub **Sarcini de automatizare** (`order: 11`) |
| Coloana principală | Pagina de încărcare, deschisă selectând acel rând |

<img src="../assets/upload-page.png" alt="Pagina Încarcă fișier fără un folder destinație ales încă: rândul din bara laterală stă sub Sarcini de automatizare, iar pagina arată un card de destinație și o zonă punctată unde poți trage fișiere" width="1200" />

Totul pe pagină este un singur flux:

1. **Folderul destinație** — *Alege folderul* deschide un dialog în aplicație, condus de listarea de directoare a gazdei (`ctx.uiWorkspace.listDirectory`, aceeași primitivă din spatele **Selectează directorul spațiului de lucru**): salturi prin breadcrumb-uri, o cale editabilă prin clic, comutatorul pentru folderele ascunse și confirmarea *Alege acest folder*. Lista de foldere vine de la gazdă, așa că funcționează dintr-un browser la distanță, unde nu există un selector al sistemului de operare.

   <img src="../assets/folder-picker.png" alt="Dialogul Alege folderul pe server: breadcrumb-urile arată Folderul personal și folderul demo, cu archive, photos și reports listate" width="1200" />

2. **Alege fișiere** — selectorul de fișiere al paginii acceptă mai multe fișiere deodată, iar fișierele trase oriunde pe pagină intră în aceeași coadă.
3. **Încarcă fișiere** — coada procesează câte un fișier pe rând; fiecare rând arată contorul de octeți trimiși, o bară de progres și o etichetă de stare. Un rând eșuat își păstrează mesajul și oferă **Reîncearcă**; **Anulează încărcarea** oprește coada și lasă rândurile rămase pregătite.

   <img src="../assets/uploading.png" alt="O încărcare în curs: primul rând raportează 215 MB din 800 MB, cu bara pe jumătate umplută și eticheta Se încarcă, celelalte rânduri așteaptă ca Pregătit, iar antetul oferă Anulează încărcarea" width="1200" />

## Cum funcționează

**Partea de gazdă** — o singură rută de streaming autentificată pe bariera comună `/api`:

```
POST /api/file-upload/write?dir=<absolute folder>&name=<file name>
content-type: application/octet-stream
```

Ea stă pe `ctx.connection.fetch`, așa că Connection admite cererea față de acreditarea semnată a Harness-ului din browser înainte de a rula acest handler: o cerere neautentificată nu ajunge niciodată la el, iar doar Peer-ul proprietarului este deservit. Ambele coordonate sunt validate (un director absolut și existent; un singur nume de fișier fără separator), iar corpul este transmis în streaming direct într-un fișier frate `.dsh-upload-<uuid>.part`, care este redenumit la locul lui doar după ce a sosit ultimul octet — o încărcare întreruptă sau eșuată nu lasă nimic în urmă sub numele real.

**Partea de browser** — un bundle lazy-CJS scris de mână, care cere doar baza preîncărcată de shell (`react`, `react-dom`). Înregistrează două contribuții: rândul `sidebar.panellist` și panoul `main` cu aceeași cheie, iar acesta este tot contractul de care are nevoie bara laterală ca să îl selecteze. `XMLHttpRequest`-ul simplu din firul paginii este ceea ce face progresul pe fișier real: `xhr.upload.onprogress` raportează octeții pe care browserul i-a predat efectiv socketului.

## Instalare

Pachetul este un **bundle** (`dsh.bundle.patch`), așa că Managerul de pluginuri îl poate instala și actualiza ca un singur rând:

```bash
# dintr-un checkout — creează un link către acest director, modificările rămân live
dsh plugin --profile web add /path/to/dsh-file-upload

# sau din depozitul git remote
dsh plugin --profile web add "git+https://github.com/tribesman/dsh-file-upload.git"
```

Ambele căi pot fi luate și din interfață: **Pluginuri → Adaugă plugin**.

Fără `dsh` în `PATH`, creează un link simbolic al checkout-ului în profil și adaugă rândul manual:

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

Id-ul rândului nu poate repeta unul livrat: `file-upload` aparține deja pachetului `@deepseek-ai/dsh-client-file-upload`, transportul de atașamente pentru prompt al browserului, iar două intrări Loader care împart un id compun doar una dintre ele. De aici `file-upload-panel`.

Repornește harness-ul o dată, ca un rând Loader nou adăugat să se compună. Pe o instanță pornită, un rând inserat se montează fără repornire.

Verifică dacă funcționează: bara laterală capătă **Încarcă fișier** chiar sub **Sarcini de automatizare**, pagina listează folderul personal al gazdei, iar o încărcare terminată ajunge în folderul pe care l-ai ales:

```bash
ls -l "/the/folder/you/chose"
```

## Configurare

Cele două opțiuni stau în `config`-ul rândului pluginului, așa că stratul de patch al profilului le păstrează și după actualizări:

```yaml
- id: file-upload-panel
  name: '@dsh-plugins/file-upload'
  config:
    maxFileBytes: 1048576      # implicit 1073741824 (1 GiB), 1024 … 16 GiB
    conflict: overwrite        # implicit "rename"
```

| Câmp | Implicit | Semnificație |
| --- | --- | --- |
| `maxFileBytes` | `1073741824` | Plafon inclusiv pentru un fișier; un corp mai mare este refuzat cu `413` și nu se stochează nimic |
| `conflict` | `"rename"` | Ce înseamnă un nume ocupat: `rename` păstrează fișierul existent și așază noul fișier ca `name (1).ext`; `overwrite` îl înlocuiește |

Rândul își declară schema ca un Standard Schema scris de mână, așa că valorile de mai sus sunt validate când pluginul se activează, iar o valoare greșită face rândul să eșueze cu o eroare. Managerul de pluginuri citește doar grafuri Schemastery native, de aceea formularul lui de configurare raportează schema acestui rând ca nesuportată și nu oferă niciun câmp: setează valorile în patch, ca mai sus.

## Note de securitate

- Ruta este o **rută exactă pe bariera `/api` a serviciului Connection**, nu o cale brută de server web, așa că cere cookie-ul de sesiune semnat al browserului și deservește doar Peer-ul proprietarului. De asemenea, nu adaugă nicio relaxare proprie pentru Host/Origin.
- Ruta scrie oriunde o indică operatorul autentificat, cu permisiunile procesului DSH — aceeași rază de acțiune pe care o au deja selectorul de director al spațiului de lucru și instrumentul `bash`. Folderul destinație trebuie să existe deja; pluginul nu creează foldere.
- Browserul indică un folder și un nume de fișier, niciodată o cale în interiorul lui: numele nu conține `.` și nici separatori, așa că o cerere nu poate scăpa din folderul ales.
- Fișierele temporare sunt create lângă țintă și eliminate la eșec sau anulare; nimic nu rămâne sub numele final decât dacă au sosit toți octeții.

## Limitări cunoscute

- O singură coadă de încărcare pe vizită a paginii: lista este locală paginii, iar părăsirea paginii în timpul încărcării lasă transferul să continue (gazda termină fișierul), dar uită rândurile.
- Fără creare de foldere în selector și fără reluare: o încărcare eșuată repornește de la primul octet.
- Selectorul listează doar foldere, iar nivelurile tăiate raportează `truncated` în loc să pagineze.
- Pagina nu are o verificare prealabilă pe client pentru `maxFileBytes`: un fișier prea mare este refuzat de gazdă după transfer.
- Gazda scrie textul erorii în engleză și păstrează codul errno în mesaj.

## Dezvoltare

```bash
npm test        # node --test: 22 de cazuri pe rută și pe bundle
npm run check   # verificare de sintaxă pentru ambele părți
```

Testele pentru gazdă trec ruta prin obiecte `Request`/`Response` reale și un director temporar real, așa că acoperă calea octeților, politicile de conflict, plafonul de dimensiune, anularea și textul de eșec fără un harness. Testele pentru browser execută bundle-ul într-o VM cu un stub de React și de DOM, așa că nu au nevoie nici de harness, nici de browser.

## Fișiere

| Cale | Rol |
| --- | --- |
| `lib/index.js` | Partea de gazdă: ruta de scriere în streaming și schema ei de configurare |
| `lib/client.js` | Partea de browser: bundle lazy-CJS, rândul din bara laterală, pagina, dialogul de foldere |
| `cordis.patch.yml` | Patch-ul bundle-ului: singurul rând de gazdă |
| `locale/*.json` | Titlul și descrierea afișate în Managerul de pluginuri |
| `icon.svg` | Pictograma de placă cu agrafă |
| `docs/assets/*.png` | Capturi de ecran folosite de acest README și de traducerile lui |
| `docs/readme/README_*.md` | README-urile traduse |
| `test/host.test.mjs` | Comportamentul rutei: statusuri, politici, plafon, anulare, text de eșec |
| `test/client.test.mjs` | Contractul bundle-ului: forma rândului, ordinea, dicționarele, foaia de stil |

## Traduceri

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md) · [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · **[Română](README_ro.md)** · [Български](README_bg.md)

README-urile traduse stau în [`docs/readme/`](.). Ele descriu același plugin; unde nu sunt de acord cu acest fișier, câștigă acest fișier.

## Licență

MIT.
