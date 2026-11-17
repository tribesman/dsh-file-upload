<div align="center">

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · **Türkçe** · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

# @dsh-plugins/file-upload

**Otomasyon görevlerinin altındaki ataş satırı**,
[DSH](https://github.com/deepseek-ai/deepseek-harness) web kenar çubuğunda bir
yükleme sayfası açar: çalışma alanı iletişim kutusunun yaptığı gibi Sunucu
üzerinde bir klasör seçin, aynı anda birkaç dosya işaretleyin ve her birinin kendi
ilerleme çubuğuyla yüklenmesini izleyin.

<img src="../assets/uploaded.png" alt="Üç dosya yüklenip bittikten sonra Dosya yükle sayfası: soldaki kenar çubuğunda ataş satırı seçili, hedef klasör ayarlanmış ve her satırda yeşil bir çubukla Yüklendi etiketi görünüyor" width="1200" />

<sub>Kenar çubuğundaki çalışma alanı ve oturum adları bulanıktır.</sub>

</div>

## Neden

DSH baytları çalışma alanının *dışına* taşıyabiliyor ([`@dsh-plugins/file-download`](https://github.com/tribesman/dsh-file-download))
ve tek bir istem için tarayıcı eklerini hazırlıyor; ama Sunucu üzerinde bir kabuk
açmadan var olan birkaç dosyayı sunucudaki bir klasöre koymanın bir yolu yoktu.
Bu eklenti o eylemi, diğer genel panellerin durduğu yere ekliyor.

## Nerede görünür

| Yer | Ne |
| --- | --- |
| Sol kenar çubuğu | **Otomasyon görevlerinin** hemen altında, ataş simgeli bir **Dosya yükle** satırı (`order: 11`) |
| Ana sütun | O satır seçilerek açılan yükleme sayfası |

<img src="../assets/upload-page.png" alt="Henüz hedef klasör seçilmemiş Dosya yükle sayfası: kenar çubuğu satırı Otomasyon görevlerinin altında duruyor, sayfada bir hedef kartı ve kesikli çizgili bir bırakma alanı görünüyor" width="1200" />

Sayfadaki her şey tek bir akıştır:

1. **Hedef klasör** — *Klasör seç* düğmesi, Sunucunun kendi dizin listesini kullanan
   uygulama içi bir iletişim kutusu açar (`ctx.uiWorkspace.listDirectory`, yani
   **Select Workspace Directory** öğesinin arkasındaki aynı ilkel): gezinti iziyle
   atlama, tıklayarak düzenlenen bir yol, gizli klasör anahtarı ve
   *Bu klasörü seç* onayı. Klasör listesi Sunucudan geldiği için, işletim sistemi
   seçicisinin bulunmadığı uzak bir tarayıcıdan da çalışır.

   <img src="../assets/folder-picker.png" alt="Sunucuda klasör seç iletişim kutusu: gezinti izi Ev ve demo klasörünü gösteriyor, altında archive, photos ve reports listelenmiş" width="1200" />

2. **Dosya seç** — sayfanın dosya seçicisi aynı anda birkaç dosya kabul eder;
   sayfanın herhangi bir yerine bırakılan dosyalar da aynı kuyruğa katılır.
3. **Dosyaları yükle** — kuyruk dosyaları tek tek işler; her satırda gönderilen
   bayt sayacı, bir ilerleme çubuğu ve bir durum etiketi görünür. Başarısız satır
   mesajını korur ve **Yeniden dene** seçeneğini sunar; **Yüklemeyi iptal et**
   kuyruğu durdurur ve kalan satırları hazır bırakır.

   <img src="../assets/uploading.png" alt="Sürmekte olan bir yükleme: ilk satır 800 MB'ın 215 MB'ını bildiriyor, çubuk yarıya kadar dolu ve Yükleniyor etiketi duruyor; diğer satırlar Hazır olarak bekliyor ve başlıkta Yüklemeyi iptal et sunuluyor" width="1200" />

## Nasıl çalışır

**Sunucu tarafı** — ortak `/api` sınırı üzerinde kimlik doğrulamalı tek bir akış
rotası:

```
POST /api/file-upload/write?dir=<absolute folder>&name=<file name>
content-type: application/octet-stream
```

Rota `ctx.connection.fetch` üzerine oturur; yani Connection, isteği bu işleyici
çalışmadan önce tarayıcının imzalı Harness kimlik bilgisine göre kabul eder:
kimliği doğrulanmamış bir istek buraya hiç ulaşmaz ve yalnızca sahibi olan Peer'e
hizmet edilir. Her iki koordinat da doğrulanır (mutlak ve var olan bir dizin;
ayırıcı içermeyen tek bir çıplak dosya adı) ve gövde doğrudan yanındaki
`.dsh-upload-<uuid>.part` dosyasına akıtılır; bu dosya ancak son bayt geldikten
sonra asıl yerine taşınır — yarıda kalan ya da başarısız bir yükleme, gerçek ad
altında hiçbir şey bırakmaz.

**Tarayıcı tarafı** — yalnızca kabuğun sayfaya önceden verdiği temel paketlere
(`react`, `react-dom`) ihtiyaç duyan, elle yazılmış tembel bir CJS bundle'ı. İki
öğe kaydeder: `sidebar.panellist` satırı ve aynı anahtarla `main` paneli — kenar
çubuğunun onu seçmek için ihtiyaç duyduğu sözleşmenin tamamı budur. Dosya başına
ilerlemeyi gerçek kılan şey, sayfanın iş parçacığındaki düz `XMLHttpRequest`tir:
`xhr.upload.onprogress`, tarayıcının gerçekten sokete verdiği baytları bildirir.

## Kurulum

Paket bir **bundle**'dır (`dsh.bundle.patch`), bu yüzden Plugin Manager onu tek
satır olarak kurabilir ve güncelleyebilir:

```bash
# bir çalışma kopyasından — bu dizini bağlar, düzenlemeler canlı kalır
dsh plugin --profile web add /path/to/dsh-file-upload

# ya da git uzak deposundan
dsh plugin --profile web add "git+https://github.com/tribesman/dsh-file-upload.git"
```

Her iki yol da arayüzden kullanılabilir: **Eklentiler → Eklenti ekle**.

`dsh` komutu `PATH` içinde yoksa, çalışma kopyasını profil içine sembolik
bağlayın ve satırı elle ekleyin:

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

Satır kimliği, paketle gelen bir kimliği tekrarlamamalıdır: `file-upload` zaten
tarayıcının istem eki taşıyıcısı olan `@deepseek-ai/dsh-client-file-upload`
paketine ait ve aynı kimliği paylaşan iki Loader girdisinden yalnızca biri
oluşturulur. Bu yüzden `file-upload-panel`.

Yeni eklenen bir Loader satırının devreye girmesi için harness'ı bir kez yeniden
başlatın. Çalışan bir örnekte eklenen satır, yeniden başlatma olmadan bağlanır.

Çalıştığını doğrulayın: kenar çubuğunda **Otomasyon görevlerinin** hemen altında
**Dosya yükle** belirir, sayfa Sunucunun ana dizinini listeler ve tamamlanan
yükleme seçtiğiniz klasöre düşer:

```bash
ls -l "/the/folder/you/chose"
```

## Yapılandırma

İki ayar da eklenti satırının `config` bölümünde yaşar, böylece profilin patch
katmanı yükseltmelerde bunları korur:

```yaml
- id: file-upload-panel
  name: '@dsh-plugins/file-upload'
  config:
    maxFileBytes: 1048576      # varsayılan 1073741824 (1 GiB), 1024 … 16 GiB
    conflict: overwrite        # varsayılan "rename"
```

| Alan | Varsayılan | Anlamı |
| --- | --- | --- |
| `maxFileBytes` | `1073741824` | Tek bir dosya için üst sınır: tam bu boyuttaki dosya kabul edilir, daha büyük gövde `413` ile reddedilir ve hiçbir şey saklanmaz |
| `conflict` | `"rename"` | Dolu bir adın anlamı: `rename` var olan dosyayı korur ve yenisini `name (1).ext` olarak yanına koyar; `overwrite` onun yerini alır |

Satır, şemasını elle yazılmış bir Standard Schema olarak bildirir; bu yüzden
yukarıdaki değerler eklenti etkinleşirken doğrulanır ve hatalı bir değer satırı
bir hatayla düşürür. Plugin Manager yalnızca Schemastery'nin kendi grafiklerini
okuduğu için yapılandırma formu bu satırın şemasını desteklenmiyor olarak bildirir
ve hiçbir alan sunmaz: değerleri yukarıda gösterildiği gibi patch dosyasında
ayarlayın.

## Güvenlik notları

- Rota, ham bir web sunucusu yolu değil, **`/api` Connection sınırında tam bir rotadır**;
  bu yüzden tarayıcının imzalı oturum çerezini gerektirir ve yalnızca sahibi olan
  Peer'e hizmet eder. Kendi adına Host/Origin gevşetmesi de eklemez.
- Rota, kimliği doğrulanmış operatörün gösterdiği yere, DSH sürecinin izinleriyle
  yazar — çalışma alanı dizin seçicisinin ve `bash` aracının zaten sahip olduğu
  erişimin aynısı. Hedef klasör önceden var olmalıdır; eklenti klasör oluşturmaz.
- Tarayıcı bir klasör ve bir dosya adı söyler, ama asla klasörün içindeki bir yolu
  söylemez: adında nokta ve ayırıcı yoktur, bu yüzden bir istek seçilen klasörün
  dışına çıkamaz.
- Geçici dosyalar hedeflerinin yanında oluşturulur ve başarısızlık ya da iptalde
  silinir; her bayt gelmedikçe son ad altında hiçbir şey kalmaz.

## Bilinen sınırlamalar

- Sayfa ziyareti başına tek yükleme kuyruğu: liste sayfaya özgüdür ve yükleme
  sürerken sayfadan ayrılmak aktarımı sürdürür (Sunucu dosyayı bitirir) ama
  satırları unutur.
- Seçicide klasör oluşturma ve kaldığı yerden sürdürme yok: başarısız bir
  yükleme ilk bayttan başlar.
- Seçici yalnızca klasörleri listeler ve kırpılan düzeyler sayfalama yerine
  `truncated` bildirir.
- Sayfada `maxFileBytes` için istemci tarafında ön kontrol yok: çok büyük bir
  dosya, aktarım bittikten sonra Sunucu tarafından reddedilir.
- Sunucu hata metnini İngilizce yazar ve errno kodunu mesajda tutar.

## Geliştirme

```bash
npm test        # node --test: rota ve bundle üzerinde 22 durum
npm run check   # iki yarı için sözdizimi denetimi
```

Sunucu testleri rotayı gerçek `Request`/`Response` nesneleri ve gerçek bir geçici
dizin üzerinden çalıştırır; böylece bayt yolunu, çakışma politikalarını, boyut sınırını,
iptali ve hata metnini harness olmadan kapsar. Tarayıcı testleri bundle'ı, sahte
bir React ve DOM ile bir VM içinde çalıştırır; bu yüzden ne harness ne de tarayıcı
gerekir.

## Dosyalar

| Yol | Rol |
| --- | --- |
| `lib/index.js` | Sunucu tarafı: akışlı yazma rotası ve yapılandırma şeması |
| `lib/client.js` | Tarayıcı tarafı: tembel CJS bundle, kenar çubuğu satırı, sayfa, klasör iletişim kutusu |
| `cordis.patch.yml` | Bundle patch'i: tek Sunucu satırı |
| `locale/*.json` | Plugin Manager görünen başlığı ve açıklaması |
| `icon.svg` | Ataş şeklindeki döşeme simgesi |
| `docs/assets/*.png` | Bu README ve çevirilerinin kullandığı ekran görüntüleri |
| `docs/readme/README_*.md` | Çevrilmiş README'ler |
| `test/host.test.mjs` | Rota davranışı: durumlar, politikalar, üst sınır, iptal, hata metni |
| `test/client.test.mjs` | Bundle sözleşmesi: satır biçimi, sıra, sözlükler, stil sayfası |

## Çeviriler

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · **[Türkçe](README_tr.md)** · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md) · [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

Çevrilmiş README'ler [`docs/readme/`](.) içinde durur. Aynı eklentiyi
anlatırlar; bu dosyayla çeliştikleri yerde bu dosya geçerlidir.

## Lisans

MIT.
