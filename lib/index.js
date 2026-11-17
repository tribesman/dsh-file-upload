/**
 * @dsh-plugins/file-upload — host half.
 *
 * One authenticated POST route writes the bytes a browser sends into a folder
 * the operator picked on the Host:
 *
 *   POST /api/file-upload/write?dir=<absolute folder>&name=<file name>
 *
 * The route lives on `ctx.connection.fetch`, the exact-route registry behind
 * the shared `/api` fence, so only the browser (or API) Peer that holds this
 * Harness's signed credential reaches it: an unauthenticated request is
 * answered by Connection before this handler runs, and a request from a
 * foreign principal is refused there too. The plugin registers no raw web
 * server path, so it adds nothing to the surface that a stale page could still
 * reach after the session cookie expires.
 *
 * The body streams straight to a sibling temp file in the destination folder
 * and is renamed into place only after the last byte arrived, so an aborted or
 * failed upload never leaves a half-written file under the real name. The
 * configured `conflict` policy decides what a taken name means; the default
 * keeps the existing file and lands the new one beside it as `name (1).ext`.
 */

import { randomUUID } from "node:crypto";
import { open, rename, rm, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, join } from "node:path";

/** Exact Fetch route the browser half posts to. */
const ROUTE_PATH = "/api/file-upload/write";

/** Prefix of the sibling temp file that receives a body in flight. */
const TEMP_PREFIX = ".dsh-upload-";

/** Default ceiling for one uploaded file: 1 GiB. */
const DEFAULT_MAX_FILE_BYTES = 1024 * 1024 * 1024;

/** Hard ceiling the configuration may raise `maxFileBytes` to: 16 GiB. */
const HARD_MAX_FILE_BYTES = 16 * 1024 * 1024 * 1024;

/** Largest accepted `name` query value, in UTF-8 bytes (most filesystems' limit). */
const MAX_NAME_BYTES = 255;

/** Refusal carrying the HTTP status the route answers with. */
class WriteRefusal extends Error {
	/**
	 * @param {number} status - HTTP status for the refusal.
	 * @param {string} code - stable, machine-readable reason.
	 * @param {string} message - operator-facing explanation.
	 */
	constructor(status, code, message) {
		super(message);
		this.name = "WriteRefusal";
		this.status = status;
		this.code = code;
	}
}

/** Platform-aware "one fixed location" check for an operator-supplied folder. */
function isFullyQualified(path) {
	if (typeof path !== "string" || path === "" || path.includes("\0")) return false;
	if (!isAbsolute(path)) return false;
	if (process.platform !== "win32") return true;
	// Node accepts rooted drive-less forms (`\foo`, `/foo`) as absolute, yet they
	// resolve against the process's current drive; a wire value must not.
	return /^[A-Za-z]:[\\/]/.test(path) || path.startsWith("\\\\");
}

/**
 * Validate the two query coordinates into one concrete target.
 * @param {URLSearchParams} query - request query string.
 * @returns {{ folder: string, name: string }} absolute folder and a bare file name.
 * @throws {WriteRefusal} when either coordinate is unusable.
 */
function parseTarget(query) {
	const folder = query.get("dir");
	const name = query.get("name");
	if (!isFullyQualified(folder)) throw new WriteRefusal(400, "folder-invalid", "The destination folder must be an absolute path.");
	if (typeof name !== "string" || name === "") throw new WriteRefusal(400, "name-invalid", "A file name is required.");
	if (name.includes("\0") || basename(name) !== name || name === "." || name === ".." || name.trim() === "") {
		throw new WriteRefusal(400, "name-invalid", "The file name must not contain a path.");
	}
	if (Buffer.byteLength(name, "utf8") > MAX_NAME_BYTES) {
		throw new WriteRefusal(400, "name-invalid", `The file name must be at most ${MAX_NAME_BYTES} bytes.`);
	}
	return { folder, name };
}

/** True when one path names something that already exists. */
async function taken(path) {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

/**
 * Choose the name the bytes land under, per the configured conflict policy.
 * @param {string} folder - destination folder.
 * @param {string} name - requested file name.
 * @param {"rename" | "overwrite"} conflict - policy for a taken name.
 * @returns {Promise<string>} the name to write.
 */
async function chooseName(folder, name, conflict) {
	if (!(await taken(join(folder, name)))) return name;
	if (conflict === "overwrite") return name;
	const extension = extname(name);
	const stem = name.slice(0, name.length - extension.length);
	for (let copy = 1; copy < 1000; copy += 1) {
		const candidate = `${stem} (${String(copy)})${extension}`;
		if (!(await taken(join(folder, candidate)))) return candidate;
	}
	throw new WriteRefusal(409, "name-exhausted", "Too many copies of this name already exist in the folder.");
}

/**
 * Operator-facing text for one filesystem failure. Node's own message carries the
 * temp-file path and the syscall, which the browser has no use for; the errno
 * code stays, because it is what an operator searches for.
 * @param {unknown} error - the value a filesystem call threw.
 * @returns {string} the message the browser shows.
 */
function describeWriteFailure(error) {
	const code = error !== null && typeof error === "object" && typeof error.code === "string" ? error.code : undefined;
	const known = {
		EACCES: "The destination folder is not writable.",
		EPERM: "The destination folder is not writable.",
		EROFS: "The destination is read-only.",
		ENOENT: "The destination folder disappeared before the file was written.",
		ENOSPC: "The destination has no free space.",
		ENAMETOOLONG: "The file name is too long for the destination.",
		EMFILE: "The Host is out of file handles; try again."
	};
	const message = code !== undefined && known[code] !== undefined ? known[code] : "The file could not be written.";
	return code === undefined ? message : `${message} (${code})`;
}

/** JSON body for one route reply. */
function json(status, value) {
	return new Response(JSON.stringify(value), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store",
			"x-content-type-options": "nosniff"
		}
	});
}

/** Failure body in the shape the browser half parses. */
function failure(status, code, message) {
	return json(status, { ok: false, error: { code, message } });
}

/**
 * Drain one request body into `path`, counting bytes and enforcing the ceiling.
 * @param {ReadableStream<Uint8Array> | null} body - request body stream.
 * @param {string} path - temp file to create.
 * @param {number} maxBytes - inclusive byte ceiling.
 * @param {AbortSignal} signal - the request's cancellation signal.
 * @returns {Promise<number>} bytes written.
 */
async function drainIntoFile(body, path, maxBytes, signal) {
	if (body === null) throw new WriteRefusal(400, "body-missing", "The request carried no file body.");
	const handle = await open(path, "wx");
	const reader = body.getReader();
	let bytes = 0;
	try {
		while (true) {
			signal.throwIfAborted();
			const chunk = await reader.read();
			if (chunk.done) break;
			bytes += chunk.value.byteLength;
			if (bytes > maxBytes) {
				throw new WriteRefusal(413, "file-too-large", `The file is larger than the ${String(maxBytes)}-byte limit.`);
			}
			await handle.write(chunk.value);
		}
	} finally {
		reader.releaseLock();
		await handle.close();
	}
	return bytes;
}

/**
 * Build the Fetch handler this plugin registers on the shared API channel.
 * @param {{ maxFileBytes: number, conflict: "rename" | "overwrite" }} options - resolved configuration.
 * @returns {(request: Request) => Promise<Response>} the route implementation.
 */
export function createWriteRoute(options) {
	const { maxFileBytes, conflict } = options;
	return async function writeRoute(request) {
		if (request.method !== "POST") {
			return new Response(null, { status: 405, headers: { allow: "POST" } });
		}
		const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
		if (mediaType !== "application/octet-stream") {
			return failure(415, "content-type", "The body must be sent as application/octet-stream.");
		}
		let target;
		try {
			target = parseTarget(new URL(request.url).searchParams);
		} catch (error) {
			return refusalResponse(error);
		}
		const { folder, name } = target;
		let details;
		try {
			details = await stat(folder);
		} catch {
			return failure(400, "folder-missing", "The destination folder does not exist.");
		}
		if (!details.isDirectory()) return failure(400, "folder-not-directory", "The destination is not a folder.");

		const temp = join(folder, `${TEMP_PREFIX}${randomUUID()}.part`);
		try {
			const finalName = await chooseName(folder, name, conflict);
			const finalPath = join(folder, finalName);
			const bytes = await drainIntoFile(request.body, temp, maxFileBytes, request.signal);
			await rename(temp, finalPath);
			return json(200, { ok: true, path: finalPath, name: finalName, bytes });
		} catch (error) {
			await rm(temp, { force: true }).catch(() => {});
			if (error instanceof WriteRefusal) return refusalResponse(error);
			if (request.signal.aborted) return failure(499, "cancelled", "The upload was cancelled.");
			return failure(500, "write-failed", describeWriteFailure(error));
		}
	};
}

/** Turn one thrown refusal, or any other error, into its reply. */
function refusalResponse(error) {
	if (error instanceof WriteRefusal) return failure(error.status, error.code, error.message);
	return failure(500, "write-failed", describeWriteFailure(error));
}

/** Cordis config schema: a hand-written Standard Schema, so no dependency is needed. */
export const Config = {
	"~standard": {
		version: 1,
		vendor: "dsh-file-upload",
		validate(value) {
			const input = value ?? {};
			if (typeof input !== "object" || input === null || Array.isArray(input)) {
				return { issues: [{ message: "config must be an object" }] };
			}
			const issues = [];
			const maxFileBytes = input.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
			if (!Number.isSafeInteger(maxFileBytes) || maxFileBytes < 1024 || maxFileBytes > HARD_MAX_FILE_BYTES) {
				issues.push({ message: `maxFileBytes must be an integer between 1024 and ${String(HARD_MAX_FILE_BYTES)}` });
			}
			const conflict = input.conflict ?? "rename";
			if (conflict !== "rename" && conflict !== "overwrite") {
				issues.push({ message: 'conflict must be "rename" or "overwrite"' });
			}
			if (issues.length > 0) return { issues };
			return { value: { maxFileBytes, conflict } };
		}
	}
};

/** The route needs Connection's exact-route registry, and nothing else. */
export const inject = ["connection"];

/**
 * Register the write route for as long as this plugin is loaded.
 * @param {object} ctx - Host context carrying the Connection service.
 * @param {{ maxFileBytes: number, conflict: "rename" | "overwrite" }} config - resolved configuration.
 */
export function apply(ctx, config) {
	const { maxFileBytes = DEFAULT_MAX_FILE_BYTES, conflict = "rename" } = config ?? {};
	ctx.effect(
		() => {
			const dispose = ctx.connection.fetch.register({
				path: ROUTE_PATH,
				methods: ["POST"],
				requestBody: "streaming",
				fetch: createWriteRoute({ maxFileBytes, conflict })
			});
			return () => {
				void dispose();
			};
		},
		"file-upload: streaming write route"
	);
}

/** Coordinates the browser half and the tests share. */
export const ROUTE = ROUTE_PATH;

/** Test hook: the failure-text mapping the route uses. */
export const describeWriteFailureForTest = describeWriteFailure;
