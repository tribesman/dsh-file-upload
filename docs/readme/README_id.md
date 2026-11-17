<div align="center">

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · **Bahasa Indonesia** · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

# @dsh-plugins/file-upload

**Baris klip kertas di bawah Tugas otomasi** pada bilah samping web
[DSH](https://github.com/deepseek-ai/deepseek-harness); baris itu membuka halaman unggah:
pilih folder di Host dengan cara yang sama seperti dialog workspace, pilih beberapa
berkas sekaligus, lalu saksikan setiap berkas diunggah dengan bilah kemajuannya
sendiri.

<img src="../assets/uploaded.png" alt="Halaman Unggah berkas setelah tiga berkas selesai diunggah: baris klip kertas terpilih di bilah samping kiri, folder tujuan sudah diatur, dan setiap baris menampilkan bilah hijau serta label Terunggah" width="1200" />

<sub>Nama workspace dan nama sesi di bilah samping diburamkan.</sub>

</div>

## Mengapa

DSH dapat memindahkan byte *keluar* dari workspace ([`@dsh-plugins/file-download`](https://github.com/tribesman/dsh-file-download))
dan menyiapkan lampiran browser untuk satu prompt, tetapi belum ada cara menaruh
beberapa berkas yang sudah ada ke dalam sebuah folder di server tanpa shell di
Host. Plugin ini menyediakan pasangan yang selama ini hilang, di tempat panel global lain berada.

## Di mana tampilannya

| Tempat | Apa |
| --- | --- |
| Bilah samping kiri | Baris **Unggah berkas** dengan ikon klip kertas, tepat di bawah **Tugas otomasi** (`order: 11`) |
| Kolom utama | Halaman unggah, terbuka saat baris itu dipilih |

<img src="../assets/upload-page.png" alt="Halaman Unggah berkas tanpa tujuan yang dipilih: baris bilah samping berada di bawah Tugas otomasi, halaman menampilkan kartu tujuan dan zona jatuh bertitik-titik" width="1200" />

Semua yang ada di halaman ini adalah satu alur:

1. **Folder tujuan** — *Pilih folder* membuka dialog di dalam aplikasi yang
   digerakkan oleh daftar direktori milik Host sendiri
   (`ctx.uiWorkspace.listDirectory`, primitif yang sama di balik **Pilih
   Direktori Workspace**): lompat lewat breadcrumb, jalur yang bisa diklik untuk
   disunting, tombol tampil-sembunyikan folder tersembunyi, dan penetapan *Pilih
   folder ini*. Daftar foldernya datang dari Host, jadi ini berfungsi dari
   peramban jarak jauh yang tidak punya pemilih sistem operasi.

   <img src="../assets/folder-picker.png" alt="Dialog Pilih folder di server: breadcrumb menampilkan Home dan folder demo, dengan archive, photos, dan reports terdaftar" width="1200" />

2. **Pilih berkas** — pemilih berkas di halaman menerima beberapa berkas
   sekaligus, dan berkas yang dijatuhkan di mana saja pada halaman ikut masuk ke
   antrean yang sama.
3. **Unggah berkas** — antrean berjalan satu berkas pada satu waktu; setiap baris
   menampilkan penghitung byte terkirim, bilah kemajuan, dan label status. Baris
   yang gagal menyimpan pesannya dan menawarkan **Coba lagi**; **Batalkan unggahan**
   menghentikan antrean dan membiarkan baris sisanya tetap siap.

   <img src="../assets/uploading.png" alt="Unggahan sedang berjalan: baris pertama melaporkan 215 MB dari 800 MB dengan bilah terisi separuh dan label Sedang mengunggah, baris lain menunggu sebagai Siap, dan header halaman menawarkan Batalkan unggahan" width="1200" />

## Cara kerjanya

**Bagian Host** — satu rute streaming terautentikasi pada batas `/api` bersama:

```
POST /api/file-upload/write?dir=<absolute folder>&name=<file name>
content-type: application/octet-stream
```

Rute ini berada di `ctx.connection.fetch`, sehingga Connection menerima permintaan
terhadap kredensial Harness bertanda tangan milik peramban sebelum handler ini
berjalan: permintaan tanpa autentikasi tidak pernah mencapainya, dan hanya Peer
pemilik yang dilayani. Kedua nilai divalidasi (satu direktori absolut yang
sudah ada; satu nama berkas polos tanpa pemisah), dan isinya dialirkan langsung ke
berkas `.dsh-upload-<uuid>.part` di sebelahnya yang baru diganti nama ke tempatnya
setelah byte terakhir tiba — unggahan yang dibatalkan atau gagal tidak
meninggalkan apa pun dengan nama akhir.

**Bagian peramban** — sebuah bundle lazy-CJS yang ditulis tangan yang hanya memerlukan
dasar yang disemai shell (`react`, `react-dom`). Bundle ini mendaftarkan dua
kontribusi: baris `sidebar.panellist` dan panel `main` dengan kunci yang sama,
yaitu seluruh kontrak yang dibutuhkan bilah samping untuk memilihnya.
`XMLHttpRequest` biasa di thread halaman itulah yang membuat kemajuan per berkas
menjadi nyata: `xhr.upload.onprogress` melaporkan byte yang benar-benar sudah
diserahkan peramban ke soket.

## Instalasi

Paket ini adalah sebuah **bundle** (`dsh.bundle.patch`), sehingga Plugin Manager
dapat memasang dan memperbaruinya sebagai satu baris:

```bash
# dari checkout — menautkan direktori ini, perubahan tetap berlaku langsung
dsh plugin --profile web add /path/to/dsh-file-upload

# atau dari remote git
dsh plugin --profile web add "git+https://github.com/tribesman/dsh-file-upload.git"
```

Cara mana pun juga bisa ditempuh dari UI: **Plugin → Tambah plugin**.

Tanpa `dsh` di `PATH`, tautkan checkout ke profil dan tambahkan barisnya dengan
tangan:

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

Id baris tidak boleh mengulang id yang sudah dibawa paket: `file-upload` sudah
menjadi milik `@deepseek-ai/dsh-client-file-upload`, transport lampiran prompt di
peramban, dan dua entri Loader yang berbagi satu id hanya menyusun salah satunya.
Karena itu dipakai `file-upload-panel`.

Mulai ulang harness sekali agar baris Loader yang baru ditambahkan tersusun. Pada
instance yang sedang berjalan, baris yang disisipkan ter-mount tanpa mulai ulang.

Periksa bahwa ini bekerja: bilah samping bertambah dengan **Unggah berkas** tepat
di bawah **Tugas otomasi**, halaman mendaftar folder home Host, dan unggahan yang
selesai mendarat di folder yang Anda pilih:

```bash
ls -l "/the/folder/you/chose"
```

## Konfigurasi

Kedua parameter berada di `config` baris plugin, sehingga lapisan patch
profil menyimpannya melewati pembaruan:

```yaml
- id: file-upload-panel
  name: '@dsh-plugins/file-upload'
  config:
    maxFileBytes: 1048576      # bawaan 1073741824 (1 GiB), 1024 … 16 GiB
    conflict: overwrite        # bawaan "rename"
```

| Field | Bawaan | Arti |
| --- | --- | --- |
| `maxFileBytes` | `1073741824` | Batas atas inklusif untuk satu berkas; isi yang lebih besar ditolak dengan `413` dan tidak ada yang disimpan |
| `conflict` | `"rename"` | Arti nama yang sudah dipakai: `rename` mempertahankan berkas yang ada dan menempatkan yang baru sebagai `name (1).ext`; `overwrite` menggantinya |

Baris ini mendeklarasikan skemanya sebagai Standard Schema yang ditulis tangan, sehingga
nilai di atas divalidasi saat plugin aktif dan nilai yang salah menggagalkan baris
itu dengan galat. Plugin Manager hanya membaca graf Schemastery native, jadi
formulir konfigurasinya melaporkan skema baris ini sebagai tidak didukung dan
tidak menawarkan field apa pun: atur nilainya di patch, seperti ditunjukkan di
atas.

## Catatan keamanan

- Rute ini adalah **rute persis pada batas Connection `/api`**, bukan jalur server
  web mentah, sehingga memerlukan cookie sesi bertanda tangan peramban dan hanya
  melayani Peer pemilik. Rute ini juga tidak menambahkan pelonggaran Host/Origin
  sendiri.
- Rute menulis ke mana pun operator terautentikasi mengarahkannya, dengan izin
  proses DSH — jangkauan yang sama dengan yang sudah dimiliki pemilih direktori
  workspace dan alat `bash`. Tujuan harus sudah ada; plugin tidak membuat folder.
- Peramban menyebut sebuah folder dan sebuah nama berkas, tidak pernah sebuah
  jalur di dalamnya: namanya bebas `.` dan bebas pemisah, sehingga permintaan
  tidak dapat keluar dari folder yang dipilih.
- Berkas sementara dibuat di samping targetnya dan dihapus saat gagal atau
  dibatalkan; tidak ada yang tertinggal dengan nama akhir kecuali seluruh byte
  sudah tiba.

## Batasan yang diketahui

- Satu antrean unggah per kunjungan halaman: daftarnya bersifat lokal halaman, dan
  meninggalkan halaman di tengah unggahan membiarkan transfer tetap berjalan (Host
  menyelesaikan berkasnya) tetapi melupakan baris-barisnya.
- Tidak ada pembuatan folder di pemilih dan tidak ada lanjut-sambung: unggahan
  yang gagal dimulai ulang dari byte pertama.
- Pemilih hanya mendaftar folder, dan tingkat yang terpotong melaporkan
  `truncated` alih-alih membuat halaman berikutnya.
- Halaman tidak punya preflight sisi klien untuk `maxFileBytes`: berkas yang
  terlalu besar ditolak oleh Host setelah transfer selesai.
- Host menulis teks galat dalam bahasa Inggris dan menyimpan kode errno di dalam
  pesannya.

## Pengembangan

```bash
npm test        # node --test: 22 kasus untuk rute dan bundle
npm run check   # gerbang sintaksis pada kedua bagian
```

Tes Host menjalankan rute melalui objek `Request`/`Response` sungguhan dan
direktori temp sungguhan, sehingga mencakup jalur byte, kebijakan konflik, plafon
ukuran, pembatalan, dan teks kegagalan tanpa harness. Tes peramban menjalankan
bundle di dalam VM dengan React dan DOM tiruan, sehingga tidak memerlukan harness
maupun peramban.

## Berkas

| Jalur | Peran |
| --- | --- |
| `lib/index.js` | Bagian Host: rute tulis streaming dan skema konfigurasinya |
| `lib/client.js` | Bagian peramban: bundle lazy-CJS, baris bilah samping, halaman, dialog folder |
| `cordis.patch.yml` | Patch bundle: satu baris Host |
| `locale/*.json` | Judul dan deskripsi tampilan Plugin Manager |
| `icon.svg` | Ikon ubin klip kertas |
| `docs/assets/*.png` | Tangkapan layar yang dipakai README ini dan terjemahannya |
| `docs/readme/README_*.md` | README yang diterjemahkan |
| `test/host.test.mjs` | Perilaku rute: status, kebijakan, plafon, pembatalan, teks kegagalan |
| `test/client.test.mjs` | Kontrak bundle: bentuk baris, urutan, kamus, stylesheet |

## Terjemahan

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · **[Bahasa Indonesia](README_id.md)** · [Italiano](README_it.md) · [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

README terjemahan berada di [`docs/readme/`](.). Semuanya menjelaskan
plugin yang sama; bila ada yang berbeda dengan berkas ini, berkas ini yang
menang.

## Lisensi

MIT.
