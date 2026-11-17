<div align="center">

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · **Italiano**
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

# @dsh-plugins/file-upload

Una **riga con graffetta sotto Attività di automazione** nella barra laterale web di [DSH](https://github.com/deepseek-ai/deepseek-harness) che apre una pagina di caricamento: scegliere una cartella sull'host come fa la finestra dell'area di lavoro, selezionare più file insieme e seguire il caricamento di ciascuno con la propria barra di avanzamento.

<img src="../assets/uploaded.png" alt="La pagina Carica file dopo il completamento del caricamento di tre file: la riga con la graffetta è selezionata nella barra laterale sinistra, la cartella di destinazione è impostata e ogni riga mostra una barra verde e l'etichetta Caricato" width="1200" />

<sub>I nomi delle aree di lavoro e delle sessioni nella barra laterale sono sfocati.</sub>

</div>

## Perché

DSH può spostare byte *fuori* dall'area di lavoro ([`@dsh-plugins/file-download`](https://github.com/tribesman/dsh-file-download)) e prepara gli allegati del browser per un prompt, ma non c'era modo di mettere più file esistenti in una cartella sul server senza una shell sull'host. Questo plugin fornisce la controparte mancante, nel posto in cui vivono gli altri pannelli globali.

## Dove appare

| Luogo | Cosa |
| --- | --- |
| Barra laterale sinistra | Una riga **Carica file** con il glifo di una graffetta, subito sotto **Attività di automazione** (`order: 11`) |
| Colonna principale | La pagina di caricamento, aperta selezionando quella riga |

<img src="../assets/upload-page.png" alt="La pagina Carica file senza alcuna destinazione ancora scelta: la riga della barra laterale si trova sotto Attività di automazione, la pagina mostra una scheda di destinazione e un'area di rilascio tratteggiata" width="1200" />

Tutto nella pagina è un unico flusso:

1. **Cartella di destinazione** — *Scegli cartella* apre una finestra all'interno dell'applicazione alimentata dall'elenco delle directory dell'host stesso (`ctx.uiWorkspace.listDirectory`, la stessa primitiva dietro **Seleziona directory dell'area di lavoro**): salti nei breadcrumb, un percorso modificabile con un clic, un interruttore per le cartelle nascoste e una conferma finale *Scegli questa cartella*. L'elenco delle cartelle proviene dall'host, quindi funziona da un browser remoto dove non esiste alcun selettore del sistema operativo.

   <img src="../assets/folder-picker.png" alt="La finestra Scegli cartella sul server: i breadcrumb mostrano Home e la cartella demo, con archive, photos e reports elencate" width="1200" />

2. **Scegli i file** — il selettore di file della pagina accetta più file insieme e i file trascinati in qualsiasi punto della pagina si aggiungono alla stessa coda.
3. **Carica i file** — la coda procede un file alla volta; ogni riga mostra il contatore dei byte inviati, una barra di avanzamento e un'etichetta di stato. Una riga fallita conserva il proprio messaggio e offre **Riprova**; **Annulla caricamento** ferma la coda e lascia pronte le righe rimanenti.

   <img src="../assets/uploading.png" alt="Un caricamento in corso: la prima riga riporta 215 MB di 800 MB con una barra riempita a metà e l'etichetta Caricamento in corso, le altre righe attendono come Pronto e l'intestazione offre Annulla caricamento" width="1200" />

## Come funziona

**Metà host** — una rotta di streaming autenticata sulla barriera `/api` condivisa:

```
POST /api/file-upload/write?dir=<absolute folder>&name=<file name>
content-type: application/octet-stream
```

Si appoggia a `ctx.connection.fetch`, così Connection ammette la richiesta rispetto alla credenziale Harness firmata del browser prima che questo gestore venga eseguito: una richiesta non autenticata non lo raggiunge mai e viene servito solo il Peer proprietario. Entrambe le coordinate vengono validate (una directory assoluta ed esistente; un semplice nome di file senza separatore) e il corpo viene trasmesso direttamente in un file adiacente `.dsh-upload-<uuid>.part` che viene rinominato al suo posto solo dopo l'arrivo dell'ultimo byte: un caricamento interrotto o fallito non lascia nulla sotto il nome reale.

**Metà browser** — un bundle lazy-CJS scritto a mano che richiede soltanto la base fornita dalla shell (`react`, `react-dom`). Registra due contributi: la riga `sidebar.panellist` e il pannello `main` con la stessa chiave, che è l'intero contratto di cui la barra laterale ha bisogno per selezionarlo. Il semplice `XMLHttpRequest` sul thread della pagina è ciò che rende reale l'avanzamento per file: `xhr.upload.onprogress` riporta i byte che il browser ha effettivamente consegnato al socket.

## Installazione

Il pacchetto è un **bundle** (`dsh.bundle.patch`), quindi il gestore dei plugin può installarlo e aggiornarlo come un'unica riga:

```bash
# da un checkout — collega questa directory, le modifiche restano attive
dsh plugin --profile web add /path/to/dsh-file-upload

# oppure dal remoto git
dsh plugin --profile web add "git+https://github.com/tribesman/dsh-file-upload.git"
```

Entrambi i percorsi si possono seguire anche dall'interfaccia: **Plugin → Aggiungi plugin**.

Senza `dsh` nel `PATH`, creare un collegamento simbolico al checkout nel profilo e aggiungere la riga a mano:

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

L'id della riga non deve ripetere uno già distribuito: `file-upload` appartiene già a `@deepseek-ai/dsh-client-file-upload`, il trasporto degli allegati del prompt nel browser, e due voci del Loader che condividono un id ne compongono una sola. Da qui `file-upload-panel`.

Riavviare una volta l'harness perché una riga del Loader appena aggiunta venga composta. Su un'istanza attiva una riga inserita viene montata senza riavvio.

Verificare che funzioni: la barra laterale acquista **Carica file** subito sotto **Attività di automazione**, la pagina elenca la cartella home dell'host e un caricamento completato finisce nella cartella scelta:

```bash
ls -l "/the/folder/you/chose"
```

## Configurazione

Entrambe le manopole vivono nella `config` della riga del plugin, così il livello di patch del profilo le conserva attraverso gli aggiornamenti:

```yaml
- id: file-upload-panel
  name: '@dsh-plugins/file-upload'
  config:
    maxFileBytes: 1048576      # predefinito 1073741824 (1 GiB), 1024 … 16 GiB
    conflict: overwrite        # predefinito "rename"
```

| Campo | Predefinito | Significato |
| --- | --- | --- |
| `maxFileBytes` | `1073741824` | Limite massimo inclusivo per un file; un corpo più grande viene rifiutato con `413` e non viene memorizzato nulla |
| `conflict` | `"rename"` | Che cosa significa un nome già occupato: `rename` conserva il file esistente e colloca quello nuovo come `name (1).ext`; `overwrite` lo sostituisce |

La riga dichiara il proprio schema come uno Standard Schema scritto a mano, quindi i valori sopra vengono validati all'attivazione del plugin e un valore errato fa fallire la riga con un errore. Il gestore dei plugin legge solo grafi Schemastery nativi, perciò il suo modulo di configurazione segnala lo schema di questa riga come non supportato e non offre campi: impostare i valori nella patch, come mostrato sopra.

## Note sulla sicurezza

- La rotta è una **rotta esatta sulla barriera `/api` di Connection**, non un percorso grezzo di un server web, quindi richiede il cookie di sessione firmato del browser e serve solo il Peer proprietario. Inoltre non introduce alcun allentamento Host/Origin proprio.
- La rotta scrive ovunque l'operatore autenticato la indirizzi, con i permessi del processo DSH: la stessa portata che hanno già il selettore di directory dell'area di lavoro e lo strumento `bash`. La destinazione deve esistere già; il plugin non crea cartelle.
- Il browser indica una cartella e un nome di file, mai un percorso al suo interno: il nome è privo di `.` e di separatori, quindi una richiesta non può uscire dalla cartella scelta.
- I file temporanei vengono creati accanto alla loro destinazione e rimossi in caso di errore o annullamento; sotto il nome finale non resta nulla a meno che ogni byte non sia arrivato.

## Limitazioni note

- Una coda di caricamento per visita della pagina: l'elenco è locale alla pagina e chi abbandona la pagina a metà caricamento lascia proseguire il trasferimento (l'host completa il file) ma dimentica le righe.
- Nessuna creazione di cartelle nel selettore e nessuna ripresa: un caricamento fallito riparte dal primo byte.
- Il selettore elenca solo cartelle e i livelli tagliati riportano `truncated` invece di impaginare.
- La pagina non ha un controllo preliminare lato client per `maxFileBytes`: un file troppo grande viene rifiutato dall'host dopo il trasferimento.
- L'host scrive il testo degli errori in inglese e conserva il codice errno nel messaggio.

## Sviluppo

```bash
npm test        # node --test: 22 casi sulla rotta e sul bundle
npm run check   # controllo di sintassi su entrambe le metà
```

I test dell'host guidano la rotta attraverso oggetti `Request`/`Response` reali e una vera directory temporanea, quindi coprono il percorso dei byte, le politiche di conflitto, il limite di dimensione, l'annullamento e il testo di errore senza un harness. I test del browser eseguono il bundle in una VM con un React e un DOM simulati, quindi non richiedono né un harness né un browser.

## File

| Percorso | Ruolo |
| --- | --- |
| `lib/index.js` | Metà host: la rotta di scrittura in streaming e il suo schema di configurazione |
| `lib/client.js` | Metà browser: bundle lazy-CJS, riga della barra laterale, pagina, finestra delle cartelle |
| `cordis.patch.yml` | Patch del bundle: l'unica riga host |
| `locale/*.json` | Titolo e descrizione mostrati dal gestore dei plugin |
| `icon.svg` | L'icona del riquadro con la graffetta |
| `docs/assets/*.png` | Screenshot usati da questo README e dalle sue traduzioni |
| `docs/readme/README_*.md` | I README tradotti |
| `test/host.test.mjs` | Comportamento della rotta: stati, politiche, limite, annullamento, testo di errore |
| `test/client.test.mjs` | Contratto del bundle: forma della riga, ordine, dizionari, foglio di stile |

## Traduzioni

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · **[Italiano](README_it.md)** · [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

I README tradotti si trovano in [`docs/readme/`](.). Descrivono lo stesso plugin; dove sono in disaccordo con questo file, prevale questo file.

## Licenza

MIT.
