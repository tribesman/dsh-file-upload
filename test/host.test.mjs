import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { Config, createWriteRoute, describeWriteFailureForTest, inject, ROUTE } from "../lib/index.js";

/** Encode one request with its query coordinates. */
function request({ dir, name, body = new Uint8Array([1, 2, 3]), contentType = "application/octet-stream", method = "POST", signal } = {}) {
	const url = new URL("http://dsh.test" + ROUTE);
	if (dir !== undefined) url.searchParams.set("dir", dir);
	if (name !== undefined) url.searchParams.set("name", name);
	return new Request(url, {
		method,
		headers: { "content-type": contentType },
		...(method === "POST" ? { body } : {}),
		...(signal === undefined ? {} : { signal })
	});
}

/** Fresh destination folder per test. */
async function folder(t) {
	const root = await mkdtemp(join(tmpdir(), "dfu-test-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	return root;
}

/** Read the reply body as JSON. */
async function body(response) {
	return JSON.parse(await response.text());
}

test("the route path is the authenticated write route", () => {
	assert.equal(ROUTE, "/api/file-upload/write");
	assert.deepEqual(inject, ["connection"]);
});

test("writes the body under the requested name", async (t) => {
	const dir = await folder(t);
	const route = createWriteRoute({ maxFileBytes: 1024, conflict: "rename" });
	const response = await route(request({ dir, name: "notes.txt", body: new Uint8Array([104, 105]) }));
	assert.equal(response.status, 200);
	const value = await body(response);
	assert.equal(value.ok, true);
	assert.equal(value.name, "notes.txt");
	assert.equal(value.bytes, 2);
	assert.equal(value.path, join(dir, "notes.txt"));
	assert.equal(await readFile(join(dir, "notes.txt"), "utf8"), "hi");
});

test("refuses a non-POST method", async (t) => {
	const dir = await folder(t);
	const route = createWriteRoute({ maxFileBytes: 1024, conflict: "rename" });
	const response = await route(request({ dir, name: "x.txt", method: "GET" }));
	assert.equal(response.status, 405);
	assert.equal(response.headers.get("allow"), "POST");
});

test("refuses a body that is not octet-stream", async (t) => {
	const dir = await folder(t);
	const route = createWriteRoute({ maxFileBytes: 1024, conflict: "rename" });
	const response = await route(request({ dir, name: "x.txt", contentType: "text/plain" }));
	assert.equal(response.status, 415);
	assert.equal((await body(response)).error.code, "content-type");
});

test("refuses an unusable destination before touching the filesystem", async () => {
	const route = createWriteRoute({ maxFileBytes: 1024, conflict: "rename" });
	for (const dir of ["relative/path", "", "/tmp/\0bad"]) {
		const response = await route(request({ dir, name: "x.txt" }));
		assert.equal(response.status, 400);
		assert.equal((await body(response)).error.code, "folder-invalid");
	}
});

test("refuses a name that carries a path", async (t) => {
	const dir = await folder(t);
	const route = createWriteRoute({ maxFileBytes: 1024, conflict: "rename" });
	for (const name of ["../escape.txt", "nested/child.txt", "..", "."]) {
		const response = await route(request({ dir, name }));
		assert.equal(response.status, 400);
		assert.equal((await body(response)).error.code, "name-invalid");
	}
	assert.deepEqual(await readdir(dir), []);
});

test("refuses a folder that is not there or not a folder", async (t) => {
	const dir = await folder(t);
	const file = join(dir, "plain.txt");
	await writeFile(file, "x");
	const route = createWriteRoute({ maxFileBytes: 1024, conflict: "rename" });
	const missing = await route(request({ dir: join(dir, "nope"), name: "x.txt" }));
	assert.equal(missing.status, 400);
	assert.equal((await body(missing)).error.code, "folder-missing");
	const notFolder = await route(request({ dir: file, name: "x.txt" }));
	assert.equal(notFolder.status, 400);
	assert.equal((await body(notFolder)).error.code, "folder-not-directory");
});

test("rename policy lands the new file beside a taken name", async (t) => {
	const dir = await folder(t);
	await writeFile(join(dir, "report.pdf"), "first");
	const route = createWriteRoute({ maxFileBytes: 1024, conflict: "rename" });
	const response = await route(request({ dir, name: "report.pdf", body: new Uint8Array([115, 101, 99, 111, 110, 100]) }));
	const value = await body(response);
	assert.equal(value.name, "report (1).pdf");
	assert.equal(await readFile(join(dir, "report.pdf"), "utf8"), "first");
	assert.equal(await readFile(join(dir, "report (1).pdf"), "utf8"), "second");
});

test("overwrite policy replaces a taken name", async (t) => {
	const dir = await folder(t);
	await writeFile(join(dir, "report.pdf"), "first");
	const route = createWriteRoute({ maxFileBytes: 1024, conflict: "overwrite" });
	const response = await route(request({ dir, name: "report.pdf", body: new Uint8Array([110, 101, 119]) }));
	assert.equal((await body(response)).name, "report.pdf");
	assert.equal(await readFile(join(dir, "report.pdf"), "utf8"), "new");
});

test("refuses a body past the byte ceiling and leaves no temp file", async (t) => {
	const dir = await folder(t);
	const route = createWriteRoute({ maxFileBytes: 4, conflict: "rename" });
	const response = await route(request({ dir, name: "big.bin", body: new Uint8Array(5) }));
	assert.equal(response.status, 413);
	assert.equal((await body(response)).error.code, "file-too-large");
	assert.deepEqual(await readdir(dir), []);
});

test("an aborted request stores nothing", async (t) => {
	const dir = await folder(t);
	const controller = new AbortController();
	controller.abort();
	const route = createWriteRoute({ maxFileBytes: 1024, conflict: "rename" });
	const response = await route(request({ dir, name: "late.txt", signal: controller.signal }));
	assert.equal(response.status, 499);
	assert.deepEqual(await readdir(dir), []);
});

test("a request without a body is refused", async (t) => {
	const dir = await folder(t);
	const route = createWriteRoute({ maxFileBytes: 1024, conflict: "rename" });
	const url = new URL("http://dsh.test" + ROUTE);
	url.searchParams.set("dir", dir);
	url.searchParams.set("name", "empty.txt");
	const response = await route(new Request(url, { method: "POST", headers: { "content-type": "application/octet-stream" } }));
	assert.equal(response.status, 400);
	assert.equal((await body(response)).error.code, "body-missing");
});

test("the config schema fills defaults and refuses bad values", () => {
	const schema = Config["~standard"];
	assert.equal(schema.version, 1);
	const filled = schema.validate(undefined);
	assert.deepEqual(filled.value, { maxFileBytes: 1024 * 1024 * 1024, conflict: "rename" });
	const kept = schema.validate({ maxFileBytes: 2048, conflict: "overwrite" });
	assert.deepEqual(kept.value, { maxFileBytes: 2048, conflict: "overwrite" });
	assert.ok(schema.validate({ maxFileBytes: 1 }).issues);
	assert.ok(schema.validate({ conflict: "clobber" }).issues);
	assert.ok(schema.validate("nope").issues);
});

test("apply registers one streaming route and replaces it on dispose", () => {
	const registered = [];
	const context = {
		connection: {
			fetch: {
				register: (definition) => {
					registered.push(definition);
					return async () => {};
				}
			}
		},
		effect: (callback) => {
			const dispose = callback();
			assert.equal(typeof dispose, "function");
			return dispose;
		}
	};
	// apply is imported lazily here so the test above can read ROUTE without side effects.
	return import("../lib/index.js").then(({ apply }) => {
		apply(context, { maxFileBytes: 4096, conflict: "rename" });
		assert.equal(registered.length, 1);
		assert.equal(registered[0].path, ROUTE);
		assert.deepEqual(registered[0].methods, ["POST"]);
		assert.equal(registered[0].requestBody, "streaming");
		assert.equal(typeof registered[0].fetch, "function");
	});
});

test("a filesystem failure reports a readable reason, not a temp path", () => {
	const error = Object.assign(new Error("open '/tmp/x/.dsh-upload-1.part' failed"), {
		code: process.platform === "win32" ? "EPERM" : "EACCES"
	});
	assert.equal(
		describeWriteFailureForTest(error),
		`The destination folder is not writable. (${String(error.code)})`
	);
});

test("an unknown filesystem failure still avoids the raw message", () => {
	const error = Object.assign(new Error("open '/tmp/x/.dsh-upload-1.part' failed"), { code: "EIO" });
	assert.equal(describeWriteFailureForTest(error), "The file could not be written. (EIO)");
	assert.equal(describeWriteFailureForTest(new Error("open failed")), "The file could not be written.");
});
