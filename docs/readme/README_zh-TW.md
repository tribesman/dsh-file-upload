<div align="center">

[English](../../README.md) · [简体中文](README_zh.md) · **繁體中文** · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

# @dsh-plugins/file-upload

這是 [DSH](https://github.com/deepseek-ai/deepseek-harness) 網頁側邊欄中一個**位於「自動化任務」下方的迴紋針項目**，點開後就是一個上傳頁面：像工作區對話方塊那樣在主機上挑選資料夾，一次選取多個檔案，然後看著它們各自帶著一條獨立的進度條上傳。

<img src="../assets/uploaded.png" alt="三個檔案上傳完成後的「上傳檔案」頁面：左側側邊欄中迴紋針項目處於選取狀態，目標資料夾已設定，每一列都顯示綠色進度條和「已上傳」標籤" width="1200" />

<sub>側邊欄中的工作區名稱和工作階段名稱已模糊處理。</sub>

</div>

## 為什麼

DSH 能把位元組*搬出*工作區（[`@dsh-plugins/file-download`](https://github.com/tribesman/dsh-file-download)），也能為單一提示暫存瀏覽器附件，但先前一直沒有辦法在不開主機 shell 的情況下，把幾個既有檔案放進伺服器上的某個資料夾。本外掛補上了缺少的那一半，位置就選在其他全域面板所在的地方。

## 顯示位置

| 位置 | 內容 |
| --- | --- |
| 左側邊欄 | 一列帶迴紋針圖示的 **上傳檔案** 項目，緊接在 **自動化任務** 下方（`order: 11`） |
| 主欄 | 上傳頁面，選取該列即可開啟 |

<img src="../assets/upload-page.png" alt="尚未選擇目標資料夾的「上傳檔案」頁面：側邊欄那一列位於「自動化任務」下方，頁面上是一張目標資料夾卡片和一個虛線拖放區" width="1200" />

頁面上的所有內容構成一個流程：

1. **目標資料夾** —— *選擇資料夾* 會開啟一個應用程式內對話方塊，資料來自主機自己的目錄清單（`ctx.uiWorkspace.listDirectory`，也就是 **選擇工作區目錄** 背後的同一套基礎操作）：麵包屑導覽跳轉、點擊即可編輯的路徑、隱藏資料夾切換，以及一個 *選擇此資料夾* 的確認。資料夾清單來自主機，因此在沒有作業系統選擇器的遠端瀏覽器中同樣可用。

   <img src="../assets/folder-picker.png" alt="「在伺服器上選擇資料夾」對話方塊：麵包屑導覽顯示主目錄和示範資料夾，下方列出 archive、photos 和 reports" width="1200" />

2. **選擇檔案** —— 頁面的檔案選擇器支援一次選取多個檔案，拖放到頁面任意位置的檔案也會加入同一個佇列。
3. **上傳檔案** —— 佇列一次只處理一個檔案；每一列顯示已傳送位元組數、進度條和狀態標籤。失敗的列會保留錯誤訊息並提供 **重試**；**取消上傳** 會停下佇列，其餘各列仍維持就緒。

   <img src="../assets/uploading.png" alt="上傳進行中：第一列顯示 800 MB 中的 215 MB，進度條半滿並帶有「上傳中」標籤，其餘各列以「就緒」狀態等待，頁首提供「取消上傳」" width="1200" />

## 運作方式

**主機端** —— 共用 `/api` 邊界上的一條帶驗證的串流路由：

```
POST /api/file-upload/write?dir=<absolute folder>&name=<file name>
content-type: application/octet-stream
```

它掛在 `ctx.connection.fetch` 上，因此 Connection 會在本處理常式執行之前，用瀏覽器持有的已簽署 Harness 憑證對請求進行准入判定：未通過驗證的請求根本到不了這裡，而且只服務擁有者 Peer。兩個座標都會被驗證（一個既有的絕對目錄；一個不含分隔符號的裸檔案名稱），請求主體則直接串流寫入同目錄下的 `.dsh-upload-<uuid>.part` 檔案，只有在最後一個位元組抵達之後才會改名就位——被中止或失敗的上傳不會在真實檔名底下留下任何東西。

**瀏覽器端** —— 一個手寫的 lazy-CJS bundle，只依賴 shell 預先提供的基準（`react`、`react-dom`）。它註冊兩個貢獻項目：`sidebar.panellist` 那一列，以及用同樣的鍵註冊的 `main` 面板——這正是側邊欄要選取它所需的全部約定。真正讓逐檔進度可信的，是頁面執行緒上那個樸素的 `XMLHttpRequest`：`xhr.upload.onprogress` 回報的是瀏覽器確實已交給通訊端的位元組數。

## 安裝

本套件是一個 **bundle**（`dsh.bundle.patch`），因此外掛管理器可以把它當作一列來安裝和更新：

```bash
# 從本機簽出安裝 —— 連結此目錄，修改立即生效
dsh plugin --profile web add /path/to/dsh-file-upload

# 或者從 git 遠端安裝
dsh plugin --profile web add "git+https://github.com/tribesman/dsh-file-upload.git"
```

這兩種方式也可以從介面進行：**外掛 → 新增外掛**。

如果 `PATH` 上沒有 `dsh`，就用符號連結把簽出目錄接進 profile，再手動加入這一列：

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

這一列的 id 不能與隨附的 id 重複：`file-upload` 已經屬於 `@deepseek-ai/dsh-client-file-upload`，也就是瀏覽器的提示附件傳輸通道；兩個共用同一 id 的 Loader 項目只會組成其中一個。所以才有了 `file-upload-panel`。

把 harness 重新啟動一次，新加入的 Loader 列才會組成。在執行中的執行個體上，插入的列不必重新啟動就會掛載。

驗證一下：側邊欄會在 **自動化任務** 正下方多出 **上傳檔案**，頁面會列出主機的家目錄，上傳完成後檔案會落進你選取的資料夾：

```bash
ls -l "/the/folder/you/chose"
```

## 設定

兩個開關都放在外掛列的 `config` 裡，因此 profile 的 patch 層在升級後仍會保留它們：

```yaml
- id: file-upload-panel
  name: '@dsh-plugins/file-upload'
  config:
    maxFileBytes: 1048576      # 預設 1073741824 (1 GiB)，1024 … 16 GiB
    conflict: overwrite        # 預設 "rename"
```

| 欄位 | 預設值 | 說明 |
| --- | --- | --- |
| `maxFileBytes` | `1073741824` | 單一檔案的大小上限（含邊界值）；更大的主體會以 `413` 拒絕，且不會儲存任何內容 |
| `conflict` | `"rename"` | 名稱已被佔用時的處理方式：`rename` 保留原有檔案，新檔案以 `name (1).ext` 存入；`overwrite` 則直接取代 |

這一列把 schema 宣告為手寫的 Standard Schema，因此上面的取值會在啟用外掛時被驗證，取值不合法會讓該列報錯失敗。外掛管理器只讀取原生 Schemastery 圖，所以它的設定表單會把這一列的 schema 回報為不受支援，也不提供任何欄位：請像上面那樣直接在 patch 裡設定值。

## 安全性說明

- 這條路由是 **`/api` Connection 邊界上的一條精確路由**，而不是原始的網頁伺服器路徑，因此它要求瀏覽器出示已簽署的工作階段 Cookie，並且只服務擁有者 Peer。它本身也沒有加入任何 Host/Origin 放寬。
- 這條路由會以 DSH 程序的權限，寫入已驗證操作者所指的任何位置——這與工作區目錄選擇器和 `bash` 工具原本就有的權限範圍相同。目標必須已經存在；本外掛不會建立資料夾。
- 瀏覽器只給出一個資料夾和一個檔案名稱，絕不會給出其中某一層路徑：檔案名稱既不含 `.` 也不含分隔符號，因此請求無法逃出所選資料夾。
- 暫存檔案會建立在目標檔案旁邊，失敗或取消時會被刪除；除非每一個位元組都已抵達，否則最終檔名底下不會留下任何東西。

## 已知限制

- 每次造訪頁面只有一個上傳佇列：清單只存在於頁面內，上傳中途離開頁面會讓傳輸繼續（由主機把檔案寫完），但那些列的紀錄會被遺忘。
- 選擇器裡無法建立資料夾，也不支援續傳：失敗的上傳會從第一個位元組重新開始。
- 選擇器只列出資料夾，層級被截斷時只會回報 `truncated`，不會分頁。
- 頁面沒有針對 `maxFileBytes` 的用戶端預檢：過大的檔案要等傳輸結束後才由主機拒絕。
- 主機的錯誤文字是英文，並會在訊息裡保留 errno 碼。

## 開發

```bash
npm test        # node --test：涵蓋路由與 bundle 的 22 個案例
npm run check   # 對兩端的語法檢查
```

主機端測試用真實的 `Request`/`Response` 物件和真實的暫存目錄來驅動路由，因此不需 harness 就能涵蓋位元組通路、衝突策略、大小上限、取消以及失敗文字。瀏覽器端測試在一個 VM 中執行 bundle，React 和 DOM 都是替身實作，因此既不需要 harness，也不需要瀏覽器。

## 檔案

| 路徑 | 角色 |
| --- | --- |
| `lib/index.js` | 主機端：串流寫入路由及其設定 schema |
| `lib/client.js` | 瀏覽器端：lazy-CJS bundle、側邊欄那一列、頁面、資料夾對話方塊 |
| `cordis.patch.yml` | bundle patch：那一列主機設定 |
| `locale/*.json` | 外掛管理器的顯示標題和說明 |
| `icon.svg` | 迴紋針的磚塊圖示 |
| `docs/assets/*.png` | 本 README 及其譯文使用的螢幕擷取畫面 |
| `docs/readme/README_*.md` | 各語言的譯文 |
| `test/host.test.mjs` | 路由行為：狀態碼、策略、上限、取消、失敗文字 |
| `test/client.test.mjs` | bundle 約定：列的形狀、順序、字典、樣式表 |

## 翻譯

[English](../../README.md) · [简体中文](README_zh.md) · **[繁體中文](README_zh-TW.md)** · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md) · [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

各語言的譯文位於 [`docs/readme/`](.)。它們描述的是同一個外掛；若與本文有出入，以本文為準。

## 授權條款

MIT.
