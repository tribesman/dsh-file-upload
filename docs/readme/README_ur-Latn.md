<div align="center">

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · **Roman Urdu** · [Română](README_ro.md) · [Български](README_bg.md)

# @dsh-plugins/file-upload

DSH ke web sidebar mein **Automation tasks ke neeche paperclip wala row** jo ek
upload page kholta hai: Host par koi folder isi tarah chunein jaise workspace dialog
chunta hai, ek saath kai files chunein, aur har file ko uske apne progress bar ke
saath upload hotay dekhein.

<img src="../assets/uploaded.png" alt="Teen files ki upload mukammal hone ke baad ka Upload file page: left sidebar mein paperclip wala row selected hai, destination folder set hai, aur har row mein sabz bar aur Uploaded tag nazar aata hai" width="1200" />

<sub>Sidebar mein workspace aur session ke naam dhundhle kiye gaye hain.</sub>

</div>

## Kyun

DSH bytes ko workspace se *bahar* le ja sakta hai ([`@dsh-plugins/file-download`](https://github.com/tribesman/dsh-file-download))
aur ek prompt ke liye browser attachments tayyar karta hai, lekin Host par shell ke
baghair kai mojood files ko server ke kisi folder mein rakhne ka koi tareeqa nahi
tha. Yeh plugin wohi kaam add karta hai, wahin jahan baqi global panels rehte hain.

## Kahan nazar aata hai

| Jagah | Kya |
| --- | --- |
| Left sidebar | **Upload file** ka row jismein paperclip ka nishan hai, theek **Automation tasks** ke neeche (`order: 11`) |
| Main column | Upload page, jo us row ko select karne se khulta hai |

<img src="../assets/upload-page.png" alt="Upload file page jab koi destination chuna nahi gaya: sidebar ka row Automation tasks ke neeche hai, page par destination card aur dashed drop zone dikh raha hai" width="1200" />

Page par sab kuch ek hi flow hai:

1. **Destination folder** — *Choose folder* ek in-app dialog kholta hai jo Host ki
   apni directory listing se chalta hai (`ctx.uiWorkspace.listDirectory`, wohi
   bunyadi cheez jo **Select Workspace Directory** ke peeche hai): breadcrumb ke jumps,
   click se edit hone wala path, hidden folders ka toggle, aur *Choose this folder*
   ka faisla. Folder ki list Host se aati hai, is liye yeh door ke browser se bhi
   chalta hai jahan OS ka koi chooser mojood nahi hota.

   <img src="../assets/folder-picker.png" alt="Select folder on server dialog: breadcrumbs mein Home aur demo folder dikh rahe hain, aur archive, photos aur reports listed hain" width="1200" />

2. **Choose files** — page ka file picker ek saath kai files leta hai, aur page par
   kahin bhi drop ki gayi files usi queue mein shamil ho jati hain.
3. **Upload files** — queue ek waqt mein ek file chalati hai; har row bheje gaye
   bytes ka counter, ek progress bar aur ek state tag dikhati hai. Nakaam row apna
   message rakhti hai aur **Retry** pesh karti hai; **Cancel upload** queue ko rok
   deta hai aur baqi rows tayyar chhod deta hai.

   <img src="../assets/uploading.png" alt="Upload jaari hai: pehli row 800 MB mein se 215 MB batati hai, aadha bhara bar aur Uploading tag ke saath, baqi rows Ready ki haalat mein intezar kar rahi hain, aur header mein Cancel upload maujood hai" width="1200" />

## Yeh kaise kaam karta hai

**Host wala hissa** — shared `/api` fence par ek authenticated streaming route:

```
POST /api/file-upload/write?dir=<absolute folder>&name=<file name>
content-type: application/octet-stream
```

Yeh `ctx.connection.fetch` par baitha hai, is liye Connection is handler ke chalne
se pehle browser ki signed Harness credential ke saath request ko qabool karta
hai: ghair-authenticated request yahan kabhi nahi pohanchti, aur sirf owner Peer ko
serve kiya jata hai. Dono coordinates validate hote hain (ek absolute, mojood
directory; ek saada file name jismein koi separator nahi), aur body seedha ek saath
wali `.dsh-upload-<uuid>.part` file mein stream hoti hai jo aakhri byte pohanchne ke
baad hi apni jagah rename hoti hai — abort ya fail hui upload asli naam ke neeche
kuch nahi chhodti.

**Browser wala hissa** — haath se likha lazy-CJS bundle jo sirf shell ki di hui
baseline (`react`, `react-dom`) maangta hai. Yeh do contributions register karta
hai: `sidebar.panellist` row aur usi key wala `main` panel, aur sidebar ko usay
select karne ke liye bas yahi contract chahiye. Page thread par saada
`XMLHttpRequest` hi har file ka progress asli banata hai: `xhr.upload.onprogress`
woh bytes batata hai jo browser ne waqai socket ko diye hain.

## Install kaise karein

Yeh package ek **bundle** hai (`dsh.bundle.patch`), is liye Plugin Manager isay ek
hi row ki tarah install aur update kar sakta hai:

```bash
# kisi checkout se — yeh folder link karta hai, tabdeeliyan foran nazar aati hain
dsh plugin --profile web add /path/to/dsh-file-upload

# ya git remote se
dsh plugin --profile web add "git+https://github.com/tribesman/dsh-file-upload.git"
```

Donon mein se koi bhi raasta UI se bhi liya ja sakta hai: **Plugins → Add plugin**.

`PATH` par `dsh` na ho to checkout ko profile mein symlink karein aur row haath se
add karein:

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

Row ka id pehle se shipped kisi id ko dohrana nahi chahiye: `file-upload` pehle se
`@deepseek-ai/dsh-client-file-upload` ka hai, yani browser ka prompt-attachment
transport, aur ek hi id wale do Loader entries mein sirf ek hi compose hota hai. Isi
liye `file-upload-panel`.

Harness ko ek baar restart karein taa ke naya add kiya gaya Loader row compose ho.
Live instance par insert kiya gaya row baghair restart mount ho jata hai.

Check karein ke kaam karta hai: sidebar mein **Upload file** theek **Automation
tasks** ke neeche aa jata hai, page Host ke home folder ki list dikhata hai, aur
mukammal hui upload aap ke chune hue folder mein utarti hai:

```bash
ls -l "/the/folder/you/chose"
```

## Settings

Yeh dono settings plugin row ke `config` mein rehti hain, is liye profile ki patch
layer inhein upgrades ke dauran mehfooz rakhti hai:

```yaml
- id: file-upload-panel
  name: '@dsh-plugins/file-upload'
  config:
    maxFileBytes: 1048576      # by default 1073741824 (1 GiB), 1024 … 16 GiB
    conflict: overwrite        # by default "rename"
```

| Field | Default | Matlab |
| --- | --- | --- |
| `maxFileBytes` | `1073741824` | Ek file ke liye hadd, aur isi value tak ki ijazat hai; is se bari body `413` ke saath rad ho jati hai aur kuch bhi mehfooz nahi hota |
| `conflict` | `"rename"` | Pehle se maujood naam ka kya matlab hai: `rename` purani file ko rakhta hai aur nai file ko `name (1).ext` bana kar rakhta hai; `overwrite` usay badal deta hai |

Row apna schema haath se likhe Standard Schema ki tarah elaan karta hai, is liye upar
di gayi values plugin ke activate hote waqt jaanchi jati hain aur kharab value row ko
error ke saath nakaam kar deti hai. Plugin Manager sirf native Schemastery graphs
parhta hai, is liye uska configuration form is row ke schema ko unsupported batata
hai aur koi field pesh nahi karta: values patch mein set karein, jaisa upar dikhaya
gaya hai.

## Security ke baare mein

- Route **`/api` Connection fence par ek theek-theek route** hai, seedha web server
  path nahi, is liye yeh browser ki signed session cookie maangta hai aur sirf owner
  Peer ko serve karta hai. Yeh apni taraf se Host/Origin mein koi chhoot bhi nahi
  jodta.
- Route wahin likhta hai jahan tasdeeq-shuda operator ishara kare, DSH process ke
  ikhtiyaraat ke saath — wohi rasai jo workspace directory picker aur `bash` tool ke
  paas pehle se hai. Destination folder pehle se mojood hona chahiye; plugin folders
  nahi banata.
- Browser ek folder aur ek file name batata hai, uske andar ka path kabhi nahi:
  naam `.` se paak aur separator se paak hai, is liye koi request chune hue folder se
  bahar nahi nikal sakti.
- Temp files apne target ke paas banti hain aur fail ya cancel hone par hata di jati
  hain; aakhri naam ke neeche kuch nahi bachta jab tak har byte na pohanch jaye.

## Maaloom kamiyan

- Page ki har visit par ek hi upload queue: list page ke andar hi mehdood rehti hai,
  aur upload ke dauran page chhodne se transfer chalta rehta hai (Host file mukammal
  kar deta hai) magar rows yaad nahi rehti.
- Picker mein folder banane ka koi tareeqa nahi aur na hi resume: fail hui upload
  pehle byte se dobara shuru hoti hai.
- Picker sirf folders list karta hai, aur kati hui levels paging ke bajaye
  `truncated` batati hain.
- Page ki taraf `maxFileBytes` ke liye koi peshgi jaanch nahi: barri file transfer
  ke baad Host rad kar deta hai.
- Host error ka text English mein likhta hai aur message mein errno code rakhta hai.

## Development

```bash
npm test        # node --test: route aur bundle par 22 cases
npm run check   # dono hisson par syntax gate
```

Host tests route ko asli `Request`/`Response` objects aur asli temp directory ke
saath chalate hain, is liye woh bytes ka raasta, conflict policies, size ceiling,
cancellation aur failure text ko baghair harness jaanch lete hain. Browser tests
bundle ko React aur DOM ke stub ke saath ek VM mein chalate hain, is liye unhein na
harness chahiye na browser.

## Files

| Path | Kaam |
| --- | --- |
| `lib/index.js` | Host wala hissa: streaming write route aur uska config schema |
| `lib/client.js` | Browser wala hissa: lazy-CJS bundle, sidebar row, page, folder dialog |
| `cordis.patch.yml` | Bundle patch: woh ek Host row |
| `locale/*.json` | Plugin Manager mein dikhne wala title aur description |
| `icon.svg` | Paperclip wala tile icon |
| `docs/assets/*.png` | Woh screenshots jo yeh README aur iske tarjume istemal karte hain |
| `docs/readme/README_*.md` | Tarjuma shuda READMEs |
| `test/host.test.mjs` | Route ka behaviour: statuses, policies, ceiling, cancellation aur failure text |
| `test/client.test.mjs` | Bundle ka contract: row ki shape, order, dictionaries aur stylesheet |

## Tarjume

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md) · [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · **[Roman Urdu](README_ur-Latn.md)** · [Română](README_ro.md) · [Български](README_bg.md)

Tarjuma shuda READMEs [`docs/readme/`](.) mein rehti hain. Woh isi plugin
ko bayan karti hain; jahan inka is file se ikhtilaf ho, is file ki baat maani jati
hai.

## License

MIT.
