/**
 * @dsh-plugins/file-upload — browser half.
 *
 * Hand-written lazy-CJS bundle in the DSH client-module factory form: running
 * the script only REGISTERS the factory; everything below runs at
 * materialization. Only the shell-seeded baseline (`react`, `react-dom`) is
 * required, so no Harness Client package is imported as a module.
 *
 * Two contributions:
 *
 *  - `sidebar.panellist` — the paperclip row. Its id equals the main-panel key,
 *    which is the whole contract the sidebar needs: selecting the row selects
 *    that panel. `order: 11` puts it directly under Automation tasks (10).
 *  - `main` — the page. It picks a destination folder through the same Host
 *    directory-listing primitive the workspace dialog drives
 *    (`ctx.uiWorkspace.listDirectory`), collects several files from the
 *    browser, and streams them one at a time to this package's Host route with
 *    a progress bar per file.
 *
 * Everything visible is drawn here: own controls, own stylesheet, host theme
 * tokens only. The row glyph is the host's own 16px paperclip silhouette, so
 * it sits beside the shipped row icons instead of looking foreign.
 */
window.__ModuleLoader__.load({
	id: "@dsh-plugins/file-upload",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const reactDom = require("react-dom");
		const h = react.createElement;

		/** Locale namespace owned by this plugin. */
		const NS = "file-upload";
		/** Sidebar row id; it must equal the `main` slot key it selects. */
		const PANEL_ID = "file-upload";
		/** Row order: directly after Automation tasks, which registers 10. */
		const PANEL_ORDER = 11;
		/** Host route registered by this package's Host half. */
		const WRITE_ROUTE = "api/file-upload/write";
		/** Host glyph silhouette, drawn here so no package is required at runtime. */
		const PAPERCLIP =
			"M12.75 4.5V9.5C12.75 10.7598 12.2496 11.968 11.3588 12.8588C10.468 13.7496 9.25978 14.25 8 14.25" +
			"C6.74022 14.25 5.53204 13.7496 4.64124 12.8588C3.75045 11.968 3.25 10.7598 3.25 9.5V5" +
			"C3.25 4.13805 3.59241 3.3114 4.2019 2.7019C4.8114 2.09241 5.63805 1.75 6.5 1.75" +
			"C7.36195 1.75 8.1886 2.09241 8.7981 2.7019C9.40759 3.3114 9.75 4.13805 9.75 5V9.5" +
			"C9.75 9.96413 9.56563 10.4092 9.23744 10.7374C8.90925 11.0656 8.46413 11.25 8 11.25" +
			"C7.53587 11.25 7.09075 11.0656 6.76256 10.7374C6.43437 10.4092 6.25 9.96413 6.25 9.5V5.5";
		const FOLDER =
			"M1.50439 3.11059C1.50439 2.55831 1.95211 2.1106 2.50439 2.1106H5.43389C5.67773 2.1106 5.91318 2.19969 6.09593 2.36113" +
			"L7.71649 3.79265C7.89924 3.95409 8.1347 4.04319 8.3785 4.04319H13.4958C14.0481 4.04319 14.4958 4.4909 14.4958 5.04319" +
			"V12.8894C14.4958 13.4417 14.0481 13.8894 13.4958 13.8894H2.50439C1.95211 13.8894 1.50439 13.4417 1.50439 12.8894V4.04319V3.11059Z";

		//#region copy
		/** English copy; also the fallback for a dictionary that did not bind. */
		const EN = {
			panel: "Upload file",
			title: "Upload files",
			"destination.label": "Destination folder",
			"destination.empty": "No folder chosen yet",
			"destination.choose": "Choose folder",
			"destination.change": "Change folder",
			"picker.title": "Select folder on server",
			"picker.home": "Home",
			"picker.parent": "Parent folder",
			"picker.cancel": "Cancel",
			"picker.choose": "Choose this folder",
			"picker.loading": "Loading…",
			"picker.empty": "No subfolders here",
			"picker.truncated": "Too many folders to list; only the beginning is shown.",
			"picker.showHidden": "Show hidden files",
			"picker.editPath": "Edit path",
			"picker.failed": "Could not open this folder.",
			"files.choose": "Choose files",
			"files.hint": "Several files can be selected at once, or dropped here",
			"upload.action": "Upload files",
			"upload.cancel": "Cancel upload",
			"upload.clear": "Clear list",
			"file.remove": "Remove",
			"file.retry": "Retry",
			"state.ready": "Ready",
			"state.uploading": "Uploading",
			"state.done": "Uploaded",
			"state.failed": "Failed",
			"notice.needFolder": "Choose a destination folder first.",
			"notice.needFiles": "Choose at least one file.",
			"notice.uploaded": "Uploaded: {count} → {path}",
			"notice.partial": "Uploaded: {count} of {total} → {path}",
			"notice.cancelled": "Upload cancelled."
		};

		/** Dictionaries this plugin owns. */
		const DICTIONARIES = {
			en: EN,
			ru: {
				panel: "Загрузить файл",
				title: "Загрузка файлов",
				"destination.label": "Папка назначения",
				"destination.empty": "Папка пока не выбрана",
				"destination.choose": "Выбрать папку",
				"destination.change": "Изменить папку",
				"picker.title": "Выбрать папку на сервере",
				"picker.home": "Домашняя папка",
				"picker.parent": "Родительская папка",
				"picker.cancel": "Отмена",
				"picker.choose": "Выбрать эту папку",
				"picker.loading": "Загрузка…",
				"picker.empty": "Вложенных папок нет",
				"picker.truncated": "Папок слишком много; показана только начальная часть списка.",
				"picker.showHidden": "Показать скрытые папки",
				"picker.editPath": "Изменить путь",
				"picker.failed": "Не удалось открыть эту папку.",
				"files.choose": "Выбрать файлы",
				"files.hint": "Можно выбрать сразу несколько файлов или перетащить их сюда",
				"upload.action": "Загрузить файлы",
				"upload.cancel": "Отменить загрузку",
				"upload.clear": "Очистить список",
				"file.remove": "Убрать",
				"file.retry": "Повторить",
				"state.ready": "Готов к загрузке",
				"state.uploading": "Загружается",
				"state.done": "Загружен",
				"state.failed": "Ошибка",
				"notice.needFolder": "Сначала выберите папку назначения.",
				"notice.needFiles": "Выберите хотя бы один файл.",
				"notice.uploaded": "Загружено файлов: {count} → {path}",
				"notice.partial": "Загружено файлов: {count} из {total} → {path}",
				"notice.cancelled": "Загрузка отменена."
			},
			zh: {
				panel: "上传文件",
				title: "上传文件",
				"destination.label": "目标文件夹",
				"destination.empty": "尚未选择文件夹",
				"destination.choose": "选择文件夹",
				"destination.change": "更改文件夹",
				"picker.title": "在服务器上选择文件夹",
				"picker.home": "主目录",
				"picker.parent": "上级文件夹",
				"picker.cancel": "取消",
				"picker.choose": "选择此文件夹",
				"picker.loading": "加载中…",
				"picker.empty": "没有子文件夹",
				"picker.truncated": "文件夹过多，仅显示开头部分。",
				"picker.showHidden": "显示隐藏文件夹",
				"picker.editPath": "编辑路径",
				"picker.failed": "无法打开此文件夹。",
				"files.choose": "选择文件",
				"files.hint": "可以一次选择多个文件，也可以拖到此处",
				"upload.action": "上传文件",
				"upload.cancel": "取消上传",
				"upload.clear": "清空列表",
				"file.remove": "移除",
				"file.retry": "重试",
				"state.ready": "待上传",
				"state.uploading": "上传中",
				"state.done": "已上传",
				"state.failed": "失败",
				"notice.needFolder": "请先选择目标文件夹。",
				"notice.needFiles": "请至少选择一个文件。",
				"notice.uploaded": "已上传文件：{count} → {path}",
				"notice.partial": "已上传文件：{count}/{total} → {path}",
				"notice.cancelled": "上传已取消。"
			},
			ja: {
				panel: "ファイルをアップロード",
				title: "ファイルをアップロード",
				"destination.label": "保存先フォルダー",
				"destination.empty": "フォルダーが未選択です",
				"destination.choose": "フォルダーを選択",
				"destination.change": "フォルダーを変更",
				"picker.title": "サーバー上のフォルダーを選択",
				"picker.home": "ホーム",
				"picker.parent": "親フォルダー",
				"picker.cancel": "キャンセル",
				"picker.choose": "このフォルダーを選択",
				"picker.loading": "読み込み中…",
				"picker.empty": "サブフォルダーはありません",
				"picker.truncated": "フォルダーが多すぎます。先頭のみ表示しています。",
				"picker.showHidden": "隠しフォルダーを表示",
				"picker.editPath": "パスを編集",
				"picker.failed": "このフォルダーを開けませんでした。",
				"files.choose": "ファイルを選択",
				"files.hint": "複数のファイルをまとめて選ぶか、ここにドロップできます",
				"upload.action": "ファイルをアップロード",
				"upload.cancel": "アップロードを中止",
				"upload.clear": "一覧をクリア",
				"file.remove": "除外",
				"file.retry": "再試行",
				"state.ready": "待機中",
				"state.uploading": "送信中",
				"state.done": "送信済み",
				"state.failed": "失敗",
				"notice.needFolder": "先に保存先フォルダーを選んでください。",
				"notice.needFiles": "ファイルを1つ以上選んでください。",
				"notice.uploaded": "アップロード済み: {count} 件 → {path}",
				"notice.partial": "アップロード済み: {total} 件中 {count} 件 → {path}",
				"notice.cancelled": "アップロードを中止しました。"
			},
			es: {
				panel: "Subir archivo",
				title: "Subir archivos",
				"destination.label": "Carpeta de destino",
				"destination.empty": "Todavía no hay carpeta elegida",
				"destination.choose": "Elegir carpeta",
				"destination.change": "Cambiar carpeta",
				"picker.title": "Elegir carpeta en el servidor",
				"picker.home": "Inicio",
				"picker.parent": "Carpeta superior",
				"picker.cancel": "Cancelar",
				"picker.choose": "Elegir esta carpeta",
				"picker.loading": "Cargando…",
				"picker.empty": "No hay subcarpetas",
				"picker.truncated": "Hay demasiadas carpetas; solo se muestra el principio.",
				"picker.showHidden": "Mostrar carpetas ocultas",
				"picker.editPath": "Editar ruta",
				"picker.failed": "No se pudo abrir esta carpeta.",
				"files.choose": "Elegir archivos",
				"files.hint": "Puede elegir varios archivos a la vez o soltarlos aquí",
				"upload.action": "Subir archivos",
				"upload.cancel": "Cancelar subida",
				"upload.clear": "Borrar lista",
				"file.remove": "Quitar",
				"file.retry": "Reintentar",
				"state.ready": "Listo",
				"state.uploading": "Subiendo",
				"state.done": "Subido",
				"state.failed": "Error",
				"notice.needFolder": "Elija primero una carpeta de destino.",
				"notice.needFiles": "Elija al menos un archivo.",
				"notice.uploaded": "Subidos: {count} → {path}",
				"notice.partial": "Subidos: {count} de {total} → {path}",
				"notice.cancelled": "Subida cancelada."
			},
			fr: {
				panel: "Envoyer un fichier",
				title: "Envoyer des fichiers",
				"destination.label": "Dossier de destination",
				"destination.empty": "Aucun dossier choisi pour l'instant",
				"destination.choose": "Choisir un dossier",
				"destination.change": "Changer de dossier",
				"picker.title": "Choisir un dossier sur le serveur",
				"picker.home": "Dossier personnel",
				"picker.parent": "Dossier parent",
				"picker.cancel": "Annuler",
				"picker.choose": "Choisir ce dossier",
				"picker.loading": "Chargement…",
				"picker.empty": "Aucun sous-dossier",
				"picker.truncated": "Trop de dossiers à afficher ; seul le début est affiché.",
				"picker.showHidden": "Afficher les dossiers cachés",
				"picker.editPath": "Modifier le chemin",
				"picker.failed": "Impossible d'ouvrir ce dossier.",
				"files.choose": "Choisir des fichiers",
				"files.hint": "Plusieurs fichiers peuvent être sélectionnés à la fois, ou déposés ici",
				"upload.action": "Envoyer les fichiers",
				"upload.cancel": "Annuler l'envoi",
				"upload.clear": "Vider la liste",
				"file.remove": "Retirer",
				"file.retry": "Réessayer",
				"state.ready": "Prêt",
				"state.uploading": "Envoi",
				"state.done": "Envoyé",
				"state.failed": "Échec",
				"notice.needFolder": "Choisissez d'abord un dossier de destination.",
				"notice.needFiles": "Choisissez au moins un fichier.",
				"notice.uploaded": "Envoyés : {count} → {path}",
				"notice.partial": "Envoyés : {count} sur {total} → {path}",
				"notice.cancelled": "Envoi annulé."
			},
			de: {
				panel: "Datei hochladen",
				title: "Dateien hochladen",
				"destination.label": "Zielordner",
				"destination.empty": "Noch kein Ordner gewählt",
				"destination.choose": "Ordner wählen",
				"destination.change": "Ordner ändern",
				"picker.title": "Ordner auf dem Server wählen",
				"picker.home": "Persönlicher Ordner",
				"picker.parent": "Übergeordneter Ordner",
				"picker.cancel": "Abbrechen",
				"picker.choose": "Diesen Ordner wählen",
				"picker.loading": "Laden…",
				"picker.empty": "Keine Unterordner",
				"picker.truncated": "Zu viele Ordner; nur der Anfang wird angezeigt.",
				"picker.showHidden": "Versteckte Ordner anzeigen",
				"picker.editPath": "Pfad bearbeiten",
				"picker.failed": "Dieser Ordner ließ sich nicht öffnen.",
				"files.choose": "Dateien wählen",
				"files.hint": "Mehrere Dateien können auf einmal gewählt oder hier abgelegt werden",
				"upload.action": "Dateien hochladen",
				"upload.cancel": "Hochladen abbrechen",
				"upload.clear": "Liste leeren",
				"file.remove": "Entfernen",
				"file.retry": "Erneut versuchen",
				"state.ready": "Bereit",
				"state.uploading": "Wird geladen",
				"state.done": "Hochgeladen",
				"state.failed": "Fehlgeschlagen",
				"notice.needFolder": "Wählen Sie zuerst einen Zielordner.",
				"notice.needFiles": "Wählen Sie mindestens eine Datei.",
				"notice.uploaded": "Hochgeladen: {count} → {path}",
				"notice.partial": "Hochgeladen: {count} von {total} → {path}",
				"notice.cancelled": "Hochladen abgebrochen."
			},
			pt: {
				panel: "Enviar arquivo",
				title: "Enviar arquivos",
				"destination.label": "Pasta de destino",
				"destination.empty": "Nenhuma pasta escolhida ainda",
				"destination.choose": "Escolher pasta",
				"destination.change": "Trocar pasta",
				"picker.title": "Escolher pasta no servidor",
				"picker.home": "Pasta pessoal",
				"picker.parent": "Pasta superior",
				"picker.cancel": "Cancelar",
				"picker.choose": "Escolher esta pasta",
				"picker.loading": "Carregando…",
				"picker.empty": "Nenhuma subpasta",
				"picker.truncated": "Há pastas demais; apenas o início é exibido.",
				"picker.showHidden": "Mostrar pastas ocultas",
				"picker.editPath": "Editar caminho",
				"picker.failed": "Não foi possível abrir esta pasta.",
				"files.choose": "Escolher arquivos",
				"files.hint": "Vários arquivos podem ser escolhidos de uma vez ou soltos aqui",
				"upload.action": "Enviar arquivos",
				"upload.cancel": "Cancelar envio",
				"upload.clear": "Limpar lista",
				"file.remove": "Remover",
				"file.retry": "Tentar de novo",
				"state.ready": "Pronto",
				"state.uploading": "Enviando",
				"state.done": "Enviado",
				"state.failed": "Falhou",
				"notice.needFolder": "Escolha primeiro uma pasta de destino.",
				"notice.needFiles": "Escolha pelo menos um arquivo.",
				"notice.uploaded": "Enviados: {count} → {path}",
				"notice.partial": "Enviados: {count} de {total} → {path}",
				"notice.cancelled": "Envio cancelado."
			}
		};
		//#endregion

		//#region styles
		const CSS_ID = "dsh-plugin-file-upload";
		const CSS = [
			".dfu-page{display:flex;flex-direction:column;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;",
			"color:var(--dsw-alias-label-primary,#0f1115);background:var(--dsw-alias-bg-base,#fff);font-size:14px;line-height:1.6}",
			".dfu-scroll{flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable}",
			".dfu-content{max-width:960px;margin:0 auto;padding:0 clamp(24px,4vw,48px) 48px}",
			"@media (max-width:767px){.dfu-content{padding-inline:20px}}",
			".dfu-heading{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;",
			"padding-top:28px;margin-bottom:24px}",
			".dfu-heading h1{margin:0;font-size:20px;line-height:28px;font-weight:500;letter-spacing:-.01em}",
			".dfu-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",

			".dfu-card{border:.5px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));border-radius:16px;",
			"background:var(--dsw-alias-bg-layer-1,#fff);padding:14px 16px;margin-bottom:16px}",
			".dfu-dest{display:flex;align-items:center;gap:14px;min-width:0}",
			".dfu-glyphTile{display:flex;align-items:center;justify-content:center;flex:none;width:36px;height:36px;",
			"border-radius:10px;background:rgba(127,127,127,.12);color:var(--dsw-alias-label-secondary,#61666b)}",
			".dfu-destBody{display:flex;flex-direction:column;min-width:0;flex:1}",
			".dfu-destLabel{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#61666b)}",
			".dfu-destPath{font-size:14px;line-height:22px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dfu-destPath.is-empty{color:var(--dsw-alias-label-secondary,#61666b);font-style:italic}",

			".dfu-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 14px;",
			"border-radius:12px;border:1px solid transparent;background:transparent;color:inherit;font:inherit;",
			"font-size:14px;line-height:1;cursor:pointer;white-space:nowrap;flex:none;transition:background-color .12s,opacity .12s}",
			".dfu-btn:hover:not(:disabled){background:rgba(127,127,127,.14)}",
			".dfu-btn:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#3b82f6);outline-offset:2px}",
			".dfu-btn:disabled{opacity:.4;cursor:default}",
			".dfu-btn.is-primary{background:var(--dsw-alias-brand-primary,#0f1115);color:#fff}",
			".dfu-btn.is-primary:hover:not(:disabled){background:var(--dsw-alias-brand-primary,#0f1115);opacity:.86}",
			".dfu-btn.is-outline{border-color:var(--dsw-alias-border-l1,rgba(0,0,0,.14))}",
			".dfu-btn.is-small{height:28px;padding:0 10px;font-size:12px;border-radius:9px;gap:4px}",
			".dfu-btn.is-quiet{color:var(--dsw-alias-label-secondary,#61666b);font-size:13px;height:28px;padding:0 8px}",
			".dfu-btn.is-icon{width:28px;height:28px;padding:0;border-radius:9px;color:var(--dsw-alias-label-secondary,#61666b)}",

			".dfu-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;",
			"padding:34px 20px;border-radius:16px;border:1px dashed var(--dsw-alias-border-l2,rgba(0,0,0,.22));",
			"background:var(--dsw-alias-bg-layer-2,rgba(127,127,127,.04));text-align:center;cursor:pointer;",
			"transition:border-color .12s,background-color .12s;font:inherit;color:inherit;width:100%}",
			".dfu-drop:hover:not(:disabled){border-color:var(--dsw-alias-border-l2,rgba(0,0,0,.4));",
			"background:rgba(127,127,127,.08)}",
			".dfu-drop:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#3b82f6);outline-offset:2px}",
			".dfu-drop:disabled{cursor:default;opacity:.55}",
			".dfu-page.is-dragging .dfu-drop{border-color:var(--dsw-alias-brand-primary,#0f1115);",
			"background:rgba(127,127,127,.14)}",
			".dfu-dropGlyph{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:12px;",
			"background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-brand-primary,#0f1115);",
			"border:.5px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));margin-bottom:2px}",
			".dfu-dropTitle{font-size:14px;font-weight:500;line-height:22px}",
			".dfu-dropHint{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#61666b)}",

			".dfu-list{display:flex;flex-direction:column;gap:2px;margin:0;padding:0;list-style:none}",
			".dfu-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;min-width:0}",
			".dfu-row:hover{background:rgba(127,127,127,.08)}",
			".dfu-rowGlyph{flex:none;display:flex;align-items:center;justify-content:center;width:28px;height:28px;",
			"border-radius:8px;background:rgba(127,127,127,.12);color:var(--dsw-alias-label-secondary,#61666b)}",
			".dfu-rowBody{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}",
			".dfu-rowTop{display:flex;align-items:baseline;gap:8px;min-width:0}",
			".dfu-rowName{font-size:13px;font-weight:500;line-height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}",
			".dfu-rowMeta{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#61666b);white-space:nowrap;flex:none}",
			".dfu-bar{position:relative;height:4px;border-radius:2px;background:rgba(127,127,127,.2);overflow:hidden}",
			".dfu-barFill{height:100%;border-radius:2px;background:var(--dsw-alias-brand-primary,#0f1115);",
			"transition:width .12s linear}",
			".dfu-barFill.is-done{background:var(--dsw-alias-state-success-primary,#16a34a)}",
			".dfu-barFill.is-failed{background:var(--dsw-alias-state-error-primary,#dc2626)}",
			".dfu-rowNote{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#61666b);",
			"overflow-wrap:anywhere}",
			".dfu-rowNote.is-error{color:var(--dsw-alias-state-error-primary,#dc2626)}",
			".dfu-tag{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px;border-radius:999px;",
			"font-size:11px;font-weight:500;line-height:1;flex:none;white-space:nowrap;",
			"background:rgba(127,127,127,.16);color:var(--dsw-alias-label-secondary,#61666b)}",
			".dfu-tag.is-done{background:rgba(22,163,74,.14);color:var(--dsw-alias-state-success-primary,#15803d)}",
			".dfu-tag.is-failed{background:rgba(220,38,38,.14);color:var(--dsw-alias-state-error-primary,#b91c1c)}",
			".dfu-tag.is-uploading{background:rgba(59,130,246,.16);color:var(--dsw-alias-brand-primary,#1d4ed8)}",

			".dfu-notice{display:flex;align-items:flex-start;gap:8px;padding:10px 14px;border-radius:12px;",
			"font-size:13px;line-height:20px;margin-bottom:16px;overflow-wrap:anywhere}",
			".dfu-notice.is-error{background:rgba(220,38,38,.1);color:var(--dsw-alias-state-error-primary,#b91c1c)}",
			".dfu-notice.is-success{background:rgba(22,163,74,.1);color:var(--dsw-alias-state-success-primary,#15803d)}",

			".dfu-mask{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;",
			"padding:24px;background:rgba(15,17,21,.32)}",
			".dfu-dialog{display:flex;flex-direction:column;width:680px;max-width:100%;height:500px;max-height:100%;",
			"border-radius:28px;background:var(--dsw-alias-bg-overlay,#fff);overflow:hidden;",
			"box-shadow:0 0 0 .5px rgba(0,0,0,.16),0 3px 8px rgba(0,0,0,.04),0 0 20px rgba(0,0,0,.05)}",
			".dfu-dialog:focus{outline:none}",
			".dfu-dialogHead{display:flex;flex-direction:column;gap:4px;padding:16px 14px 10px 24px;",
			"border-bottom:.5px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));flex:none}",
			".dfu-dialogTitleRow{display:flex;align-items:center;gap:8px}",
			".dfu-dialogTitle{margin:0;font-size:16px;line-height:24px;font-weight:500;flex:1;min-width:0;",
			"overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dfu-crumbs{display:flex;align-items:center;gap:2px;flex-wrap:wrap;padding-right:8px;min-height:22px}",
			".dfu-crumb{display:inline-flex;align-items:center;height:20px;padding:0 2px;border:0;background:none;",
			"font:inherit;font-size:13px;line-height:20px;font-weight:500;border-radius:6px;",
			"color:var(--dsw-alias-label-secondary,#61666b);cursor:pointer;white-space:nowrap}",
			".dfu-crumb:hover{color:var(--dsw-alias-label-primary,#0f1115);text-decoration:underline}",
			".dfu-crumb.is-current{color:var(--dsw-alias-label-primary,#0f1115);font-weight:500}",
			".dfu-crumbSep{color:var(--dsw-alias-state-idle-primary,#c3c6cb);font-size:12px;flex:none}",
			".dfu-pathInput{width:100%;height:28px;padding:0 10px;border-radius:8px;font:inherit;font-size:13px;",
			"border:.5px solid var(--dsw-alias-border-l2,rgba(0,0,0,.24));",
			"background:var(--dsw-alias-bg-layer-1,#fff);color:inherit;box-sizing:border-box}",
			".dfu-pathInput:focus{outline:2px solid var(--dsw-focus-ring-color,#3b82f6);outline-offset:1px}",
			".dfu-dialogBody{flex:1;min-height:0;overflow:auto;padding:8px 16px 8px 16px;scrollbar-gutter:stable}",
			".dfu-dirRow{display:flex;align-items:center;gap:10px;width:100%;height:28px;padding:0 8px;border:0;",
			"border-radius:8px;background:none;color:inherit;font:inherit;font-size:13px;line-height:20px;",
			"text-align:left;cursor:pointer;min-width:0;margin-bottom:2px}",
			".dfu-dirRow:hover{background:rgba(127,127,127,.12)}",
			".dfu-dirRow:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#3b82f6);outline-offset:-2px}",
			".dfu-dirRowName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dfu-dirRowGlyph,.dfu-dirRowChevron{flex:none;color:var(--dsw-alias-label-secondary,#61666b);display:flex}",
			".dfu-dirEmpty{display:flex;align-items:center;justify-content:center;padding:40px 16px;",
			"font-size:13px;color:var(--dsw-alias-label-secondary,#61666b);text-align:center}",
			".dfu-dirError{margin:8px 0;padding:10px 12px;border-radius:10px;font-size:13px;line-height:20px;",
			"background:rgba(220,38,38,.1);color:var(--dsw-alias-state-error-primary,#b91c1c);overflow-wrap:anywhere}",
			".dfu-dialogFoot{display:flex;align-items:center;gap:8px;padding:16px 24px;flex:none;",
			"border-top:.5px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12))}",
			".dfu-spacer{flex:1}",
			".dfu-toggle{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 8px;border:0;",
			"background:none;color:var(--dsw-alias-label-secondary,#61666b);font:inherit;font-size:13px;",
			"font-weight:500;border-radius:8px;cursor:pointer}",
			".dfu-toggle:hover{background:rgba(127,127,127,.12)}",
			".dfu-toggle:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#3b82f6);outline-offset:1px}",
			".dfu-toggleMark{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;",
			"border-radius:4px;border:.5px solid currentColor;opacity:.5}",
			".dfu-toggleMark.is-on{opacity:1;background:currentColor}",
			".dfu-toggleMark.is-on>svg{color:var(--dsw-alias-bg-overlay,#fff)}",

			"body[data-ds-dark-theme] .dfu-btn.is-outline{border-color:var(--dsw-alias-border-l2,rgba(255,255,255,.16))}",
			"body[data-ds-dark-theme] .dfu-btn.is-primary{color:#0f1115}",
			"body[data-ds-dark-theme] .dfu-mask{background:rgba(0,0,0,.55)}",
			"body[data-ds-dark-theme] .dfu-tag{background:rgba(255,255,255,.12)}",
			"body[data-ds-dark-theme] .dfu-toggleMark.is-on>svg{color:var(--dsw-alias-bg-layer-1,#151517)}"
		].join("");

		/** Insert the stylesheet once per document, tagged so it can be reclaimed. */
		function installStyles() {
			if (document.getElementById(CSS_ID) !== null) return;
			try {
				const style = document.createElement("style");
				style.id = CSS_ID;
				style.dataset.pluginCss = CSS_ID;
				style.textContent = CSS;
				document.head.appendChild(style);
			} catch {
				/* A missing stylesheet never blocks an upload. */
			}
		}
		//#endregion

		//#region glyphs
		/**
		 * One 16-unit stroked glyph, sized by the caller.
		 * @param root0 - viewBox width, path list, edge size, and extra props.
		 * @returns the svg element.
		 */
		function Glyph({ paths, size = 16, viewBox = "0 0 16 16", strokeWidth, className, style }) {
			return h(
				"svg",
				{
					viewBox,
					width: size,
					height: size,
					fill: "none",
					stroke: "currentColor",
					strokeWidth: strokeWidth ?? (size / 16) * 1.2,
					strokeLinecap: "round",
					strokeLinejoin: "round",
					"aria-hidden": "true",
					focusable: "false",
					className,
					style
				},
				paths.map((d, index) => h("path", { key: index, d }))
			);
		}

		/** The paperclip the sidebar row and the drop zone share. */
		function PaperclipIcon(props) {
			return h(Glyph, { ...props, paths: [PAPERCLIP], strokeWidth: props.strokeWidth ?? (props.size ?? 16) / 16 });
		}

		/** Folder glyph for the destination row and the picker's rows. */
		function FolderIcon(props) {
			return h(Glyph, { ...props, paths: [FOLDER, "M3.63501 7.66614H12.3647"] });
		}

		/** Chevron Right. */
		function ChevronIcon(props) {
			return h(Glyph, { ...props, paths: ["M6.25 3.5 10.5 8 6.25 12.5"] });
		}

		/** Pencil. */
		function PencilIcon(props) {
			return h(Glyph, { ...props, paths: ["M11.2 2.8 13.2 4.8 5.4 12.6H3.4V10.6Z"] });
		}

		/** Small cross. */
		function CloseIcon(props) {
			return h(Glyph, { ...props, paths: ["M4.2 4.2 11.8 11.8", "M11.8 4.2 4.2 11.8"] });
		}

		/** Small check. */
		function CheckIcon(props) {
			return h(Glyph, { ...props, paths: ["M3 8.4 6.2 11.6 13 4.4"] });
		}

		/** Upward arrow into a tray. */
		function UploadIcon(props) {
			return h(Glyph, {
				...props,
				paths: ["M8 10.6V2.4", "M4.6 5.8 8 2.4 11.4 5.8", "M2.4 10.4V13.6H13.6V10.4"]
			});
		}
		//#endregion

		//#region helpers
		/**
		 * Translate without throwing; a missing key falls back to English copy.
		 * @param t - slot or service translator.
		 * @param key - dictionary key.
		 * @param params - placeholder values.
		 * @returns visible copy.
		 */
		function tr(t, key, params) {
			let value;
			try {
				value = typeof t === "function" ? t(key, params) : undefined;
			} catch {
				value = undefined;
			}
			if (typeof value !== "string" || value === "" || value === key) value = EN[key] ?? key;
			if (params === undefined) return value;
			return value.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
		}

		/** Human byte size. */
		function formatBytes(bytes) {
			if (!Number.isFinite(bytes) || bytes < 0) return "";
			if (bytes < 1024) return `${String(bytes)} B`;
			const units = ["KB", "MB", "GB", "TB"];
			let value = bytes / 1024;
			let unit = 0;
			while (value >= 1024 && unit < units.length - 1) {
				value /= 1024;
				unit += 1;
			}
			const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
			return `${value.toFixed(digits)} ${units[unit]}`;
		}

		/** Message text of anything thrown by the listing or the upload route. */
		function messageOf(error) {
			if (error !== null && typeof error === "object") {
				if (typeof error.message === "string" && error.message !== "") return error.message;
				const rpc = error.rpcError;
				if (rpc !== null && typeof rpc === "object" && typeof rpc.message === "string") return rpc.message;
			}
			return String(error);
		}

		/**
		 * Breadcrumb rows for display: inside the home subtree the chain starts at
		 * a localized Home crumb, so the dialog opens on "Home" exactly like the
		 * workspace dialog; outside it the full ancestry shows, rooted at its own
		 * path.
		 * @param listing - the listed level, or null before the first answer.
		 * @param homeLabel - localized label for the home folder.
		 * @returns the crumbs to draw.
		 */
		function displayCrumbs(listing, homeLabel) {
			if (listing === null) return [];
			const homeIndex = listing.crumbs.findIndex((crumb) => crumb.path === listing.home);
			if (homeIndex === -1) return listing.crumbs;
			return [{ name: homeLabel, path: listing.home, hidden: false }, ...listing.crumbs.slice(homeIndex + 1)];
		}

		/**
		 * Post one file to this package's Host route, reporting consumed bytes.
		 * @param request - destination folder, the browser File, a progress sink and an abort signal.
		 * @returns the settled Host value.
		 */
		function uploadFile({ folder, file, onProgress, signal }) {
			return new Promise((resolve, reject) => {
				if (signal.aborted) {
					reject(new DOMException("Aborted", "AbortError"));
					return;
				}
				const url = new URL(WRITE_ROUTE, document.baseURI);
				url.searchParams.set("dir", folder);
				url.searchParams.set("name", file.name);
				const xhr = new XMLHttpRequest();
				const abort = () => xhr.abort();
				const settle = (run) => {
					signal.removeEventListener("abort", abort);
					run();
				};
				xhr.open("POST", url.href);
				xhr.withCredentials = true;
				xhr.setRequestHeader("content-type", "application/octet-stream");
				xhr.upload.onprogress = (event) => {
					if (event.lengthComputable) onProgress(event.loaded, event.total);
				};
				xhr.onload = () => {
					let payload;
					try {
						payload = JSON.parse(xhr.responseText);
					} catch {
						payload = undefined;
					}
					if (xhr.status === 200 && payload !== undefined && payload.ok === true) {
						settle(() => {
							resolve(payload);
						});
						return;
					}
					const message =
						payload !== undefined && payload.ok === false && payload.error !== undefined
							? String(payload.error.message ?? "")
							: "";
					settle(() => {
						reject(new Error(message === "" ? `HTTP ${String(xhr.status)}` : message));
					});
				};
				xhr.onerror = () => {
					settle(() => {
						reject(new Error("The upload connection failed."));
					});
				};
				xhr.onabort = () => {
					settle(() => {
						reject(new DOMException("Aborted", "AbortError"));
					});
				};
				signal.addEventListener("abort", abort, { once: true });
				xhr.send(file);
			});
		}
		//#endregion

		//#region folder picker
		/**
		 * The server folder dialog: breadcrumbs, an editable path, one directory
		 * level from the Host's own listing primitive, and a confirm step. It
		 * mirrors the workspace dialog's structure so the two read as one surface.
		 * @param props - visibility, the starting folder, the listing call and the two verdicts.
		 * @returns the modal element, or null while closed.
		 */
		function FolderPicker({ open, initial, listDirectory, onPick, onClose, t }) {
			const [listing, setListing] = react.useState(null);
			const [loading, setLoading] = react.useState(false);
			const [error, setError] = react.useState("");
			const [showHidden, setShowHidden] = react.useState(false);
			const [editing, setEditing] = react.useState(false);
			const [draft, setDraft] = react.useState("");
			const abortRef = react.useRef(null);
			const confirmRef = react.useRef(null);
			const inputRef = react.useRef(null);

			const load = react.useCallback(
				(path) => {
					if (abortRef.current !== null) abortRef.current.abort();
					const controller = new AbortController();
					abortRef.current = controller;
					setLoading(true);
					setError("");
					Promise.resolve()
						.then(() => listDirectory(path, controller.signal))
						.then((result) => {
							if (controller.signal.aborted) return;
							setListing(result);
							setLoading(false);
						})
						.catch((failure) => {
							if (controller.signal.aborted) return;
							setError(messageOf(failure));
							setLoading(false);
						});
				},
				[listDirectory]
			);

			react.useEffect(() => {
				if (!open) return undefined;
				setEditing(false);
				setError("");
				setListing(null);
				load(initial);
				return () => {
					if (abortRef.current !== null) abortRef.current.abort();
				};
			}, [open, initial, load]);

			react.useEffect(() => {
				if (!open) return undefined;
				const onKeyDown = (event) => {
					if (event.key !== "Escape" || event.defaultPrevented) return;
					event.preventDefault();
					event.stopPropagation();
					onClose();
				};
				document.addEventListener("keydown", onKeyDown, true);
				const timer = setTimeout(() => {
					if (inputRef.current !== null) inputRef.current.focus();
					else if (confirmRef.current !== null) confirmRef.current.focus();
				}, 0);
				return () => {
					document.removeEventListener("keydown", onKeyDown, true);
					clearTimeout(timer);
				};
			}, [open, onClose]);

			if (!open) return null;

			const crumbs = displayCrumbs(listing, tr(t, "picker.home"));
			const visible = listing === null
				? []
				: listing.entries.filter((entry) => showHidden || !entry.hidden);
			const current = listing === null ? initial : listing.path;

			const beginEdit = () => {
				setDraft(current === undefined ? "" : current);
				setEditing(true);
			};

			const submitEdit = () => {
				const target = draft.trim();
				setEditing(false);
				if (target === "") return;
				load(target);
			};

			return reactDom.createPortal(
				h(
					"div",
					{
						className: "dfu-mask",
						onMouseDown: (event) => {
							if (event.target === event.currentTarget) onClose();
						}
					},
					h(
						"div",
						{
							className: "dfu-dialog",
							role: "dialog",
							"aria-modal": "true",
							"aria-label": tr(t, "picker.title"),
							tabIndex: -1
						},
						h(
							"div",
							{ className: "dfu-dialogHead" },
							h(
								"div",
								{ className: "dfu-dialogTitleRow" },
								h("h2", { className: "dfu-dialogTitle" }, tr(t, "picker.title")),
								h(
									"button",
									{
										type: "button",
										className: "dfu-btn is-icon",
										title: tr(t, "picker.editPath"),
										"aria-label": tr(t, "picker.editPath"),
										onClick: beginEdit
									},
									h(PencilIcon, { size: 14 })
								)
							),
							editing
								? h("input", {
										ref: inputRef,
										className: "dfu-pathInput",
										value: draft,
										spellCheck: false,
										onChange: (event) => {
											setDraft(event.target.value);
										},
										onKeyDown: (event) => {
											if (event.key === "Enter") {
												event.preventDefault();
												submitEdit();
											}
											if (event.key === "Escape") {
												event.preventDefault();
												event.stopPropagation();
												setEditing(false);
											}
										}
									})
								: h(
										"div",
										{ className: "dfu-crumbs" },
										crumbs.length === 0
											? h(
													"span",
													{ className: "dfu-crumb is-current" },
													listing === null ? tr(t, "picker.loading") : tr(t, "picker.home")
												)
											: crumbs.map((crumb, index) =>
													h(
														react.Fragment,
														{ key: crumb.path },
														index === 0
															? null
															: h("span", { className: "dfu-crumbSep", "aria-hidden": "true" }, "/"),
														h(
															"button",
															{
																type: "button",
																className:
																	index === crumbs.length - 1 ? "dfu-crumb is-current" : "dfu-crumb",
																onClick: () => {
																	load(crumb.path);
																}
															},
															crumb.name === "" ? "/" : crumb.name
														)
													)
												)
									)
						),
						h(
							"div",
							{ className: "dfu-dialogBody" },
							error !== ""
								? h("div", { className: "dfu-dirError" }, error)
								: loading && listing === null
									? h("div", { className: "dfu-dirEmpty" }, tr(t, "picker.loading"))
									: visible.length === 0
										? h("div", { className: "dfu-dirEmpty" }, tr(t, "picker.empty"))
										: visible.map((entry) =>
												h(
													"button",
													{
														key: entry.path,
														type: "button",
														className: "dfu-dirRow",
														onClick: () => {
															load(entry.path);
														}
													},
													h("span", { className: "dfu-dirRowGlyph" }, h(FolderIcon, { size: 16 })),
													h("span", { className: "dfu-dirRowName" }, entry.name),
													h("span", { className: "dfu-dirRowChevron" }, h(ChevronIcon, { size: 14 }))
												)
											),
							listing !== null && listing.truncated
								? h("div", { className: "dfu-dirEmpty" }, tr(t, "picker.truncated"))
								: null
						),
						h(
							"div",
							{ className: "dfu-dialogFoot" },
							h(
								"button",
								{
									type: "button",
									className: "dfu-toggle",
									"aria-pressed": showHidden,
									onClick: () => {
										setShowHidden((value) => !value);
									}
								},
								h(
									"span",
									{ className: showHidden ? "dfu-toggleMark is-on" : "dfu-toggleMark" },
									showHidden ? h(CheckIcon, { size: 11, strokeWidth: 2 }) : null
								),
								tr(t, "picker.showHidden")
							),
							h("span", { className: "dfu-spacer" }),
							h(
								"button",
								{
									type: "button",
									className: "dfu-btn is-outline",
									onClick: onClose
								},
								tr(t, "picker.cancel")
							),
							h(
								"button",
								{
									ref: confirmRef,
									type: "button",
									className: "dfu-btn is-primary",
									disabled: current === undefined || current === null || loading,
									onClick: () => {
										onPick(current);
									}
								},
								tr(t, "picker.choose")
							)
						)
					)
				),
				document.body
			);
		}
		//#endregion

		//#region page
		/**
		 * Last confirmed destination folder. The panel unmounts whenever the user
		 * selects another global panel, so page-local state alone would forget the
		 * folder on every round trip; this module-scoped value survives remounts
		 * for the life of the page (not a reload), which is the lifetime the file
		 * list itself has.
		 */
		let rememberedFolder = null;

		/**
		 * The upload page: destination, file intake, and one progress row per file.
		 * @param props - slot props plus this plugin's injected listing call.
		 * @returns the page element.
		 */
		function FileUploadPage(props) {
			const t = props.t ?? props.translate;
			const listDirectory = props.listDirectory;
			const [folder, setFolder] = react.useState(() => rememberedFolder);
			const [picking, setPicking] = react.useState(false);
			const [entries, setEntries] = react.useState([]);
			const [phase, setPhase] = react.useState("idle");
			const [notice, setNotice] = react.useState(null);
			const [dragging, setDragging] = react.useState(false);
			const dragDepth = react.useRef(0);
			const inputRef = react.useRef(null);
			const nextKey = react.useRef(1);
			const runRef = react.useRef({ cancelled: false, controller: null });

			installStyles();

			const patchEntry = react.useCallback((key, patch) => {
				setEntries((current) =>
					current.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry))
				);
			}, []);

			const addFiles = (fileList) => {
				const files = Array.from(fileList ?? []);
				if (files.length === 0) return;
				setNotice(null);
				setEntries((current) => [
					...current,
					...files.map((file) => ({
						key: nextKey.current++,
						file,
						name: file.name,
						size: file.size,
						state: "ready",
						loaded: 0,
						total: file.size,
						error: "",
						savedAs: ""
					}))
				]);
			};

			const settable = entries.filter((entry) => entry.state === "ready" || entry.state === "failed");

			const start = async () => {
				if (phase === "uploading") return;
				if (folder === null || folder === undefined) {
					setNotice({ kind: "error", text: tr(t, "notice.needFolder") });
					return;
				}
				if (settable.length === 0) {
					setNotice({ kind: "error", text: tr(t, "notice.needFiles") });
					return;
				}
				setNotice(null);
				setPhase("uploading");
				const run = { cancelled: false, controller: new AbortController() };
				runRef.current = run;
				let uploaded = 0;
				let attempted = 0;
				for (const entry of settable) {
					if (run.cancelled) break;
					attempted += 1;
					patchEntry(entry.key, { state: "uploading", loaded: 0, error: "" });
					try {
						const result = await uploadFile({
							folder,
							file: entry.file,
							signal: run.controller.signal,
							onProgress: (loaded, total) => {
								patchEntry(entry.key, { loaded, total });
							}
						});
						uploaded += 1;
						patchEntry(entry.key, {
							state: "done",
							loaded: entry.size,
							total: entry.size,
							savedAs: typeof result.name === "string" ? result.name : ""
						});
					} catch (error) {
						if (run.cancelled) {
							patchEntry(entry.key, { state: "ready", loaded: 0 });
							break;
						}
						patchEntry(entry.key, { state: "failed", error: messageOf(error) });
					}
				}
				setPhase("idle");
				if (run.cancelled) {
					setNotice({ kind: "error", text: tr(t, "notice.cancelled") });
					return;
				}
				if (uploaded > 0) {
					setNotice({
						kind: "success",
						text:
							uploaded === attempted
								? tr(t, "notice.uploaded", { count: uploaded, path: folder })
								: tr(t, "notice.partial", { count: uploaded, total: attempted, path: folder })
					});
				}
			};

			const cancel = () => {
				runRef.current.cancelled = true;
				runRef.current.controller?.abort();
			};

			const clear = () => {
				setEntries((current) => current.filter((entry) => entry.state === "uploading"));
				setNotice(null);
			};

			const uploading = phase === "uploading";
			const hasFinished = entries.some((entry) => entry.state === "done" || entry.state === "failed");

			return h(
				"section",
				{
					className: dragging ? "dfu-page is-dragging" : "dfu-page",
					"aria-label": tr(t, "title"),
					"data-dsh-file-upload": "page",
					onDragEnter: (event) => {
						if (uploading || !Array.from(event.dataTransfer?.types ?? []).includes("Files")) return;
						event.preventDefault();
						dragDepth.current += 1;
						setDragging(true);
					},
					onDragOver: (event) => {
						if (uploading || !Array.from(event.dataTransfer?.types ?? []).includes("Files")) return;
						event.preventDefault();
						event.dataTransfer.dropEffect = "copy";
					},
					onDragLeave: () => {
						if (dragDepth.current > 0) dragDepth.current -= 1;
						if (dragDepth.current === 0) setDragging(false);
					},
					onDrop: (event) => {
						event.preventDefault();
						dragDepth.current = 0;
						setDragging(false);
						if (uploading) return;
						addFiles(event.dataTransfer?.files);
					}
				},
				h(
					"div",
					{ className: "dfu-scroll" },
					h(
						"div",
						{ className: "dfu-content" },
						h(
							"div",
							{ className: "dfu-heading" },
							h("h1", null, tr(t, "title")),
							h(
								"div",
								{ className: "dfu-actions" },
								hasFinished && !uploading
									? h(
											"button",
											{
												type: "button",
												className: "dfu-btn is-quiet",
												onClick: clear
											},
											tr(t, "upload.clear")
										)
									: null,
								uploading
									? h(
											"button",
											{
												type: "button",
												className: "dfu-btn is-outline",
												onClick: cancel
											},
											tr(t, "upload.cancel")
										)
									: h(
											"button",
											{
												type: "button",
												className: "dfu-btn is-primary",
												disabled: folder === null || settable.length === 0,
												onClick: () => {
													void start();
												}
											},
											tr(t, "upload.action") +
												(settable.length > 0 ? ` (${String(settable.length)})` : "")
										)
							)
						),
						notice === null
							? null
							: h(
									"div",
									{
										className: notice.kind === "error" ? "dfu-notice is-error" : "dfu-notice is-success",
										role: notice.kind === "error" ? "alert" : "status"
									},
									notice.text
								),
						h(
							"div",
							{ className: "dfu-card" },
							h(
								"div",
								{ className: "dfu-dest" },
								h("span", { className: "dfu-glyphTile" }, h(FolderIcon, { size: 18 })),
								h(
									"span",
									{ className: "dfu-destBody" },
									h("span", { className: "dfu-destLabel" }, tr(t, "destination.label")),
									h(
										"span",
										{
											className: folder === null ? "dfu-destPath is-empty" : "dfu-destPath",
											title: folder === null ? undefined : folder
										},
										folder === null ? tr(t, "destination.empty") : folder
									)
								),
								h(
									"button",
									{
										type: "button",
										className: "dfu-btn is-outline",
										disabled: uploading,
										onClick: () => {
											setPicking(true);
										}
									},
									folder === null ? tr(t, "destination.choose") : tr(t, "destination.change")
								)
							)
						),
						entries.length === 0
							? h(
									"button",
									{
										type: "button",
										className: "dfu-drop",
										disabled: uploading,
										onClick: () => {
											inputRef.current?.click();
										}
									},
									h("span", { className: "dfu-dropGlyph" }, h(PaperclipIcon, { size: 20 })),
									h("span", { className: "dfu-dropTitle" }, tr(t, "files.choose")),
									h("span", { className: "dfu-dropHint" }, tr(t, "files.hint"))
								)
							: h(
									"ul",
									{ className: "dfu-list" },
									entries.map((entry) => {
										const percent =
											entry.total > 0 ? Math.min(100, Math.round((entry.loaded / entry.total) * 100)) : 0;
										const barClass =
											entry.state === "done"
												? "dfu-barFill is-done"
												: entry.state === "failed"
													? "dfu-barFill is-failed"
													: "dfu-barFill";
										const tagClass =
											entry.state === "done"
												? "dfu-tag is-done"
												: entry.state === "failed"
													? "dfu-tag is-failed"
													: entry.state === "uploading"
														? "dfu-tag is-uploading"
														: "dfu-tag";
										const note =
											entry.state === "failed"
												? entry.error
												: entry.state === "done" && entry.savedAs !== "" && entry.savedAs !== entry.name
													? `→ ${entry.savedAs}`
													: "";
										const sizeText =
											entry.state === "uploading"
												? `${formatBytes(entry.loaded)} / ${formatBytes(entry.size)}`
												: formatBytes(entry.size);
										return h(
											"li",
											{ key: entry.key, className: "dfu-row" },
											h("span", { className: "dfu-rowGlyph" }, h(UploadIcon, { size: 16 })),
											h(
												"span",
												{ className: "dfu-rowBody" },
												h(
													"span",
													{ className: "dfu-rowTop" },
													h("span", { className: "dfu-rowName", title: entry.name }, entry.name),
													h("span", { className: "dfu-rowMeta" }, sizeText),
													h("span", { className: tagClass }, tr(t, `state.${entry.state}`))
												),
												entry.state === "uploading" || entry.state === "done" || entry.state === "failed"
													? h(
															"span",
															{ className: "dfu-bar" },
															h("span", {
																className: barClass,
																style: {
																	display: "block",
																	width:
																		entry.state === "done" ? "100%" : `${String(percent)}%`
																}
															})
														)
													: null,
												note !== ""
													? h(
															"span",
															{
																className:
																	entry.state === "failed" ? "dfu-rowNote is-error" : "dfu-rowNote"
															},
															note
														)
													: null
											),
											uploading
												? null
												: h(
														"button",
														{
															type: "button",
															className: "dfu-btn is-icon",
															title:
																entry.state === "failed" ? tr(t, "file.retry") : tr(t, "file.remove"),
															"aria-label":
																entry.state === "failed" ? tr(t, "file.retry") : tr(t, "file.remove"),
															onClick: () => {
																if (entry.state === "failed") {
																	patchEntry(entry.key, {
																		state: "ready",
																		loaded: 0,
																		error: ""
																	});
																} else {
																	setEntries((current) =>
																		current.filter((candidate) => candidate.key !== entry.key)
																	);
																}
															}
														},
														h(CloseIcon, { size: 13 })
													)
										);
									})
								),
						entries.length === 0
							? null
							: h(
									"button",
									{
										type: "button",
										className: "dfu-btn is-quiet",
										disabled: uploading,
										style: { marginTop: "12px" },
										onClick: () => {
											inputRef.current?.click();
										}
									},
									tr(t, "files.choose")
								),
						h("input", {
							ref: inputRef,
							type: "file",
							multiple: true,
							style: { display: "none" },
							onChange: (event) => {
								addFiles(event.target.files);
								event.target.value = "";
							}
						})
					)
				),
				h(FolderPicker, {
					open: picking,
					initial: folder === null ? undefined : folder,
					listDirectory,
					onPick: (path) => {
						rememberedFolder = path;
						setFolder(path);
						setPicking(false);
						setNotice(null);
					},
					onClose: () => {
						setPicking(false);
					},
					t
				})
			);
		}
		//#endregion

		//#region sidebar row
		/**
		 * The paperclip glyph for the global panel row, at the size the sidebar asks for.
		 * @param props - the row's owner share: requested edge and selection state.
		 * @returns the decorative glyph.
		 */
		function FileUploadIcon(props) {
			installStyles();
			const size = typeof props?.size === "number" && props.size > 0 ? props.size : 16;
			return h(PaperclipIcon, { size, strokeWidth: size / 16 });
		}
		//#endregion

		const inject = ["slots", "locale", "uiWorkspace"];

		/**
		 * Register the panel page and its sidebar row.
		 * @param ctx - client context with the slot registry, locale service, and workspace UI.
		 */
		function apply(ctx) {
			const locale = ctx.locale;
			if (locale !== undefined && locale !== null) {
				try {
					locale.register(NS, DICTIONARIES);
				} catch {
					/* Translation is cosmetic; English copy stays. */
				}
			}
			const translate = () => {
				try {
					return locale.bind(NS);
				} catch {
					return undefined;
				}
			};
			ctx.slots.inject("sidebar.panellist", () =>
				ctx.slots.register(
					{
						name: "sidebar.panellist",
						id: PANEL_ID,
						order: PANEL_ORDER,
						locale: NS,
						label: () => tr(translate(), "panel")
					},
					FileUploadIcon
				)
			);
			ctx.slots.inject("main", () =>
				ctx.slots.register(
					{
						name: "main",
						key: PANEL_ID,
						locale: NS,
						inject: () => ({
							listDirectory: (path, signal) => ctx.uiWorkspace.listDirectory(path, signal),
							translate: translate()
						})
					},
					FileUploadPage
				)
			);
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
