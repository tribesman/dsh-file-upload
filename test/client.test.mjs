import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const SOURCE = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");

/**
 * Execute the lazy-CJS bundle the way the shell does: the script only
 * registers a factory; materialization happens on first import.
 * @param activeLocale - locale the stub translator resolves.
 */
function load(activeLocale = "en") {
	let registration;
	const styles = [];
	const dictionaries = new Map();
	const react = {
		createElement: (type, props, ...children) => ({ type, props, children }),
		Fragment: "Fragment",
		useState: (initial) => [initial, () => {}],
		useEffect: () => {},
		useRef: (initial) => ({ current: initial }),
		useCallback: (callback) => callback
	};
	const document = {
		baseURI: "http://127.0.0.1:3079/",
		head: {
			appendChild: (element) => {
				styles.push(element);
			}
		},
		body: {},
		getElementById: (id) => styles.find((element) => element.id === id) ?? null,
		createElement: (tag) => {
			const element = { tag, dataset: {}, textContent: "", id: "" };
			return element;
		},
		addEventListener: () => {},
		removeEventListener: () => {}
	};
	const sandbox = {
		window: {
			__ModuleLoader__: {
				load: (value) => {
					registration = value;
				}
			}
		},
		document,
		location: { origin: "http://127.0.0.1:3079" },
		URL,
		URLSearchParams,
		AbortController,
		XMLHttpRequest: function XMLHttpRequest() {},
		DOMException,
		Promise,
		setTimeout,
		clearTimeout,
		console
	};
	vm.createContext(sandbox);
	vm.runInContext(SOURCE, sandbox);
	assert.ok(registration, "the bundle registers a factory");
	const module = registration.factory((specifier) => {
		if (specifier === "react") return react;
		if (specifier === "react-dom") return { createPortal: (element) => element };
		throw new Error(`unexpected require: ${specifier}`);
	});

	const slotInjections = [];
	const context = {
		locale: {
			register: (ns, dicts) => {
				dictionaries.set(ns, dicts);
				return () => {};
			},
			bind: (ns) => (key) => dictionaries.get(ns)?.[activeLocale]?.[key] ?? key
		},
		slots: {
			inject: (name, callback) => {
				const disposer = callback();
				slotInjections.push({ name, dispose: disposer });
				return () => {};
			},
			register: (options, component) => {
				return { options, component };
			}
		},
		uiWorkspace: {
			listDirectory: async () => ({ path: "/", home: "/root", crumbs: [], entries: [], truncated: false })
		}
	};
	return { module, context, dictionaries, slotInjections, styles };
}

test("the bundle registers the package factory id", () => {
	const { module } = load();
	assert.equal(typeof module.apply, "function");
	assert.deepEqual(Array.from(module.inject), ["slots", "locale", "uiWorkspace"]);
});

test("apply registers the localized dictionaries", () => {
	const { module, context, dictionaries } = load();
	module.apply(context);
	const dicts = dictionaries.get("file-upload");
	assert.ok(dicts, "the plugin owns the file-upload namespace");
	assert.equal(dicts.en.panel, "Upload file");
	assert.equal(dicts.ru.panel, "Загрузить файл");
	for (const locale of ["en", "ru", "zh", "ja", "es", "fr", "de", "pt"]) {
		assert.ok(dicts[locale], `missing ${locale} dictionary`);
		assert.equal(typeof dicts[locale]["upload.action"], "string");
	}
});

test("the sidebar row sits under Automation tasks and selects the page", () => {
	const { module, context, slotInjections } = load();
	module.apply(context);
	const names = slotInjections.map((entry) => entry.name);
	assert.deepEqual(names, ["sidebar.panellist", "main"]);
	const row = slotInjections[0].dispose.options;
	assert.equal(row.id, "file-upload");
	assert.equal(row.order, 11, "Automation tasks registers order 10");
	assert.equal(row.locale, "file-upload");
	assert.equal(typeof slotInjections[0].dispose.component, "function");
	const panel = slotInjections[1].dispose.options;
	assert.equal(panel.key, row.id, "the row id is the main slot key");
	assert.equal(typeof slotInjections[1].dispose.component, "function");
	assert.equal(typeof panel.inject().listDirectory, "function");
});

test("the row label follows the active locale", () => {
	const en = load("en");
	en.module.apply(en.context);
	assert.equal(en.slotInjections[0].dispose.options.label(), "Upload file");
	const ru = load("ru");
	ru.module.apply(ru.context);
	assert.equal(ru.slotInjections[0].dispose.options.label(), "Загрузить файл");
});

test("the injected listing call reaches the workspace service", async () => {
	const calls = [];
	const { module, context, slotInjections } = load();
	context.uiWorkspace.listDirectory = async (path, signal) => {
		calls.push({ path, signal });
		return { path: "/srv", home: "/root", crumbs: [], entries: [], truncated: false };
	};
	module.apply(context);
	const injected = slotInjections[1].dispose.options.inject();
	const controller = new AbortController();
	await injected.listDirectory("/srv", controller.signal);
	assert.equal(calls.length, 1);
	assert.equal(calls[0].path, "/srv");
	assert.equal(calls[0].signal, controller.signal);
});

test("the page and row draw their own stylesheet once", () => {
	const { module, context, slotInjections, styles } = load();
	module.apply(context);
	const row = slotInjections[0].dispose.component;
	row({ size: 16, active: false });
	row({ size: 16, active: true });
	assert.equal(styles.length, 1, "the stylesheet is installed once");
	assert.match(styles[0].textContent, /\.dfu-page\{/);
	assert.doesNotMatch(styles[0].textContent, /#dsw-icon-/, "no host sprite reference");
});
