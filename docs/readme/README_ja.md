<div align="center">

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · **日本語** · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

# @dsh-plugins/file-upload

[DSH](https://github.com/deepseek-ai/deepseek-harness) の Web サイドバーで、**［自動化タスク］のすぐ下に並ぶペーパークリップの行**です。この行を開くとアップロードページが表示され、ワークスペースのダイアログと同じ方法でホスト上のフォルダーを選び、複数のファイルを一度に選択して、それぞれが独自のプログレスバーでアップロードされる様子を確認できます。

<img src="../assets/uploaded.png" alt="3 つのファイルのアップロードが終わった後の［ファイルをアップロード］ページ。左のサイドバーではペーパークリップの行が選択され、保存先フォルダーが設定され、各行に緑色のバーと［アップロード済み］タグが表示されています" width="1200" />

<sub>サイドバーのワークスペース名とセッション名はぼかしています。</sub>

</div>

## なぜ必要か

DSH はワークスペースの外へバイトを*持ち出す*ことができ（[`@dsh-plugins/file-download`](https://github.com/tribesman/dsh-file-download)）、1 つのプロンプトのためにブラウザーの添付ファイルを一時的に預かることもできます。しかし、ホスト上でシェルを開かずに、既存の複数のファイルをサーバー上のフォルダーへ入れる方法はありませんでした。このプラグインが、ほかのグローバルパネルと同じ場所に、欠けていた相方を加えます。

## 表示される場所

| 場所 | 内容 |
| --- | --- |
| 左サイドバー | ペーパークリップのアイコンが付いた **ファイルをアップロード** の行。**自動化タスク** のすぐ下（`order: 11`） |
| メインカラム | その行を選ぶと開くアップロードページ |

<img src="../assets/upload-page.png" alt="保存先をまだ選んでいない［ファイルをアップロード］ページ。サイドバーの行は［自動化タスク］の下にあり、ページには保存先カードと破線のドロップゾーンが表示されています" width="1200" />

ページ上のすべては 1 つの流れでできています：

1. **保存先フォルダー** —— *フォルダーを選択* を押すと、ホスト自身のディレクトリ一覧（`ctx.uiWorkspace.listDirectory`。**ワークスペースディレクトリを選択** の背後にあるのと同じプリミティブです）に基づくアプリ内ダイアログが開きます。パンくずのジャンプ、クリックして編集できるパス、隠しフォルダーの切り替え、そして *このフォルダーを選択* の確定操作があります。フォルダー一覧はホストから取得するため、OS の選択ダイアログが存在しないリモートブラウザーからでも動作します。

   <img src="../assets/folder-picker.png" alt="［サーバー上のフォルダーを選択］ダイアログ。パンくずにホームとデモフォルダーが表示され、archive、photos、reports が一覧に並んでいます" width="1200" />

2. **ファイルを選択** —— ページのファイルピッカーは複数ファイルの同時選択に対応しており、ページのどこかにドロップしたファイルも同じキューに加わります。
3. **ファイルをアップロード** —— キューは 1 ファイルずつ処理します。各行には送信済みバイト数、プログレスバー、状態タグが表示されます。失敗した行はメッセージを保持したまま **再試行** を提示し、**アップロードを中止** を押すとキューが停止し、残りの行は準備完了のまま残ります。

   <img src="../assets/uploading.png" alt="アップロード進行中の画面。1 行目は 800 MB のうち 215 MB を送信済みと表示し、半分まで進んだバーと［アップロード中］タグが付いています。ほかの行は［準備完了］として待機し、ヘッダーには［アップロードを中止］が表示されています" width="1200" />

## 仕組み

**ホスト側** —— 共有の `/api` 境界上にある、認証付きのストリーミングルート 1 本でできています：

```
POST /api/file-upload/write?dir=<absolute folder>&name=<file name>
content-type: application/octet-stream
```

これは `ctx.connection.fetch` 上にあり、Connection はこのハンドラーが動く前に、ブラウザーの署名済み Harness 資格情報に対してリクエストの受理を判定します。認証されていないリクエストはここまで届かず、所有者の Peer だけが処理されます。2 つの座標（存在する絶対ディレクトリ、区切り文字を含まない単一のファイル名）が検証され、本文はそのまま隣の `.dsh-upload-<uuid>.part` ファイルへストリームされ、最後のバイトが届いてから初めて正式な名前にリネームされます。中断や失敗のあったアップロードは、本来のファイル名の下に何も残しません。

**ブラウザー側** —— シェルが用意するベースライン（`react`、`react-dom`）だけを要求する、手書きの lazy-CJS bundle です。2 つのコントリビューションを登録します。`sidebar.panellist` の行と、同じキーで登録する `main` パネルです。これがサイドバー側でその行を選択するために必要な契約のすべてです。ファイルごとの進捗を本物にしているのは、ページスレッド上の素の `XMLHttpRequest` です。`xhr.upload.onprogress` は、ブラウザーが実際にソケットへ渡したバイト数を報告します。

## インストール

このパッケージは **bundle**（`dsh.bundle.patch`）なので、プラグインマネージャーは 1 行としてインストールし、更新できます：

```bash
# チェックアウトから — このディレクトリをリンクし、編集はそのまま反映されます
dsh plugin --profile web add /path/to/dsh-file-upload

# または git リモートから
dsh plugin --profile web add "git+https://github.com/tribesman/dsh-file-upload.git"
```

どちらの方法も UI から実行できます：**プラグイン → プラグインを追加**。

`PATH` に `dsh` がない場合は、チェックアウトへのシンボリックリンクをプロファイルに張り、行を手作業で追加します：

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

行の id は同梱の id と重複してはいけません。`file-upload` はすでに `@deepseek-ai/dsh-client-file-upload`（ブラウザー側のプロンプト添付トランスポート）のものです。同じ id を共有する 2 つの Loader エントリは、どちらか一方しか合成されません。そこで `file-upload-panel` です。

新しく追加した Loader の行を合成するには、ハーネスを一度再起動してください。稼働中のインスタンスでは、挿入した行は再起動なしでマウントされます。

動作確認：サイドバーの **自動化タスク** のすぐ下に **ファイルをアップロード** が増え、ページにホストのホームフォルダーが表示され、完了したアップロードは選んだフォルダーに置かれます：

```bash
ls -l "/the/folder/you/chose"
```

## 設定

2 つの設定項目はどちらもプラグイン行の `config` にあり、プロファイルのパッチレイヤーがアップグレード後も保持します：

```yaml
- id: file-upload-panel
  name: '@dsh-plugins/file-upload'
  config:
    maxFileBytes: 1048576      # 既定 1073741824 (1 GiB)、1024 … 16 GiB
    conflict: overwrite        # 既定 "rename"
```

| フィールド | 既定値 | 意味 |
| --- | --- | --- |
| `maxFileBytes` | `1073741824` | 1 ファイルあたりの上限（この値を含む）。これを超える本文は `413` で拒否され、何も保存されません |
| `conflict` | `"rename"` | 名前が使用済みのときの扱い。`rename` は既存ファイルを残し、新しいファイルを `name (1).ext` として保存します。`overwrite` は置き換えます |

この行はスキーマを手書きの Standard Schema として宣言しているため、上の値はプラグインの有効化時に検証され、不正な値はエラーで行を失敗させます。プラグインマネージャーはネイティブの Schemastery グラフしか読まないため、その設定フォームはこの行のスキーマを未対応として扱い、フィールドを表示しません。上の例のようにパッチで値を設定してください。

## セキュリティに関する注意

- このルートは **`/api` Connection 境界上の正確なルート**であり、生の Web サーバーパスではありません。そのため、ブラウザーの署名済みセッション Cookie を必要とし、所有者の Peer だけに提供されます。Host/Origin の緩和も独自には追加しません。
- このルートは、認証された操作者が指定した場所へ、DSH プロセスの権限で書き込みます。ワークスペースのディレクトリピッカーや `bash` ツールがすでに持っているのと同じ到達範囲です。保存先はすでに存在している必要があり、プラグインがフォルダーを作成することはありません。
- ブラウザーが指定するのはフォルダーとファイル名だけで、その中のパスは指定しません。名前に `.` も区切り文字も含まれないため、リクエストが選択したフォルダーの外へ出ることはありません。
- 一時ファイルは対象の隣に作成され、失敗や中止のときは削除されます。すべてのバイトが届かない限り、最終的な名前の下に何も残りません。

## 既知の制限

- アップロードキューはページを訪れるたびに 1 つです。一覧はページ内だけのもので、アップロード中にページを離れると転送自体は続きます（ホストがファイルを書き終えます）が、行の情報は失われます。
- ピッカーでフォルダーを作成することはできず、再開もできません。失敗したアップロードは最初のバイトからやり直しになります。
- ピッカーはフォルダーだけを一覧し、階層が打ち切られた場合はページングではなく `truncated` を報告します。
- ページには `maxFileBytes` のクライアント側プリフライトがありません。大きすぎるファイルは転送後にホストが拒否します。
- ホストはエラーテキストを英語で書き、メッセージに errno コードを残します。

## 開発

```bash
npm test        # node --test：ルートと bundle に関する 22 のケース
npm run check   # ホスト側とブラウザー側の構文チェック
```

ホスト側のテストは、実際の `Request`/`Response` オブジェクトと実際の一時ディレクトリでルートを動かすため、ハーネスなしでバイト経路、競合ポリシー、サイズ上限、中止、失敗時のテキストをカバーします。ブラウザー側のテストは、スタブの React と DOM を備えた VM で bundle を実行するため、ハーネスもブラウザーも必要としません。

## ファイル

| パス | 役割 |
| --- | --- |
| `lib/index.js` | ホスト側：ストリーミング書き込みルートとその設定スキーマ |
| `lib/client.js` | ブラウザー側：lazy-CJS bundle、サイドバーの行、ページ、フォルダーダイアログ |
| `cordis.patch.yml` | bundle パッチ：ホスト側の 1 行 |
| `locale/*.json` | プラグインマネージャーの表示タイトルと説明 |
| `icon.svg` | ペーパークリップのタイルアイコン |
| `docs/assets/*.png` | この README と各翻訳で使うスクリーンショット |
| `docs/readme/README_*.md` | 翻訳された README |
| `test/host.test.mjs` | ルートの挙動：ステータス、ポリシー、上限、中止、失敗時のテキスト |
| `test/client.test.mjs` | bundle の契約：行の形、順序、辞書、スタイルシート |

## 翻訳

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · **[日本語](README_ja.md)** · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md) · [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

翻訳された README は [`docs/readme/`](.) にあります。どれも同じプラグインについて説明しています。このファイルと食い違う場合は、このファイルが優先します。

## ライセンス

MIT.
