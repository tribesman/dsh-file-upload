# @dsh-plugins/file-upload

A **paperclip row under Automation tasks** in the [DSH](https://github.com/deepseek-ai/deepseek-harness)
web sidebar that opens an upload page: choose a folder on the Host the same way
the workspace dialog does, pick several files at once, and watch each one
upload with its own progress bar.

## Why

DSH can move bytes *out* of the workspace ([`@dsh-plugins/file-download`](https://github.com/tribesman/dsh-file-download))
and it stages browser attachments for one prompt, but there was no way to put
several existing files into a folder on the server without a shell on the Host.
This plugin adds that verb, in the place the other global panels live.

## Where it appears

| Place | What |
| --- | --- |
| Left sidebar | An **Upload file** row with a paperclip glyph, directly under **Automation tasks** (`order: 11`) |
| Main column | The upload page, opened by selecting that row |

Everything on the page is one flow:

1. **Destination folder** — *Choose folder* opens an in-app dialog driven by the
   Host's own directory listing (`ctx.uiWorkspace.listDirectory`, the same
   primitive behind **Select Workspace Directory**): breadcrumb jumps, a
   click-to-edit path, hidden-folder toggle, and a *Choose this folder* verdict.
   The folder list comes from the Host, so it works from a remote browser where
   no OS chooser exists.
2. **Choose files** — the page's file picker accepts several files at once, and
   files dropped anywhere on the page join the same queue.
3. **Upload files** — the queue runs one file at a time; each row shows the
   sent-bytes counter, a progress bar, and a state tag. A failed row keeps its
   message and offers **Retry**; **Cancel upload** stops the queue and leaves the
   remaining rows ready.

## How it works

**Host half** — one authenticated streaming route on the shared `/api` fence:

```
POST /api/file-upload/write?dir=<absolute folder>&name=<file name>
content-type: application/octet-stream
```

It sits on `ctx.connection.fetch`, so Connection admits the request against the
browser's signed Harness credential before this handler runs: an unauthenticated
request never reaches it, and only the owner Peer is served. Both coordinates are
validated (an absolute, existing directory; one bare file name with no
separator), and the body streams straight into a sibling
`.dsh-upload-<uuid>.part` file that is renamed into place only after the last
byte arrived — an aborted or failed upload leaves nothing behind under the real
name.

**Browser half** — a hand-written lazy-CJS bundle that requires only the
shell-seeded baseline (`react`, `react-dom`). It registers two contributions:
the `sidebar.panellist` row and the `main` panel keyed the same way, which is the
whole contract the sidebar needs to select it. The plain `XMLHttpRequest` on the
page thread is what makes the per-file progress real: `xhr.upload.onprogress`
reports bytes the browser has actually handed to the socket.

## Install

The package is a **bundle** (`dsh.bundle.patch`), so Plugin Manager can install
and update it as one row:

```bash
# from a checkout — links this directory, edits stay live
dsh plugin --profile web add /path/to/dsh-file-upload

# or from the git remote
dsh plugin --profile web add "git+https://github.com/tribesman/dsh-file-upload.git"
```

Either path may also be taken from the UI: **Plugins → Add plugin**.

Without `dsh` on the `PATH`, symlink the checkout into the profile and add the
row by hand:

```yaml
# $DSH_HOME/profiles/web/cordis.patch.yml
- insert:
    - id: file-upload
      name: '@dsh-plugins/file-upload'
```

```bash
ln -s /path/to/dsh-file-upload \
  "$DSH_HOME/profiles/web/node_modules/@dsh-plugins/file-upload"
```

Restart the harness once so a newly added Loader row composes. On a live
instance an inserted row mounts without a restart.

Check it works: the sidebar grows **Upload file** right under **Automation
tasks**, the page lists the Host home folder, and a finished upload lands in the
folder you picked:

```bash
ls -l "/the/folder/you/chose"
```

## Configuration

Both knobs live in the plugin row's `config`, so the profile's patch layer keeps
them across upgrades:

```yaml
- id: file-upload
  name: '@dsh-plugins/file-upload'
  config:
    maxFileBytes: 1048576      # default 1073741824 (1 GiB), 1024 … 16 GiB
    conflict: overwrite        # default "rename"
```

| Field | Default | Meaning |
| --- | --- | --- |
| `maxFileBytes` | `1073741824` | Inclusive ceiling for one file; a larger body is refused with `413` and nothing is stored |
| `conflict` | `"rename"` | What a taken name means: `rename` keeps the existing file and lands the new one as `name (1).ext`; `overwrite` replaces it |

The row declares its schema as a hand-written Standard Schema, so the values above
are validated when the plugin activates and a bad one fails the row with an error.
Plugin Manager reads only native Schemastery graphs, so its configuration form
reports this row's schema as unsupported and offers no fields: set the values in
the patch, as shown above.

## Security notes

- The route is an **exact route on the `/api` Connection fence**, not a raw web
  server path, so it requires the browser's signed session cookie and serves only
  the owner Peer. It also adds no Host/Origin relaxation of its own.
- The route writes wherever the authenticated operator points it, with the
  permissions of the DSH process — the same reach the workspace directory picker
  and the `bash` tool already have. The destination must already exist; the
  plugin does not create folders.
- The browser names a folder and a file name, never a path inside one: the name
  is `.`-free and separator-free, so a request cannot escape the chosen folder.
- Temp files are created next to their target and removed on failure or
  cancellation; nothing is left under the final name unless every byte arrived.

## Known limitations

- One upload queue per page visit: the list is page-local, and leaving the page
  mid-upload keeps the transfer running (the Host finishes the file) but forgets
  the rows.
- No folder creation in the picker and no resume: a failed upload restarts from
  the first byte.
- The picker lists folders only, and cut levels report `truncated` rather than
  paging.

## Development

```bash
npm test        # node --test: 22 cases over the route and the bundle
npm run check   # syntax gate on both halves
```

The Host tests drive the route through real `Request`/`Response` objects and a
real temp directory, so they cover the byte path, the conflict policies, the size
ceiling, cancellation, and the failure text without a harness. The browser tests execute the bundle
in a VM with a stub React and DOM, so they need neither a harness nor a browser.

## Files

| Path | Role |
| --- | --- |
| `lib/index.js` | Host half: the streaming write route and its config schema |
| `lib/client.js` | Browser half: lazy-CJS bundle, sidebar row, page, folder dialog |
| `cordis.patch.yml` | Bundle patch: the one Host row |
| `locale/*.json` | Plugin Manager display title and description |
| `icon.svg` | The paperclip tile icon |
| `test/host.test.mjs` | Route behaviour: statuses, policies, ceiling, cancellation, failure text |
| `test/client.test.mjs` | Bundle contract: row shape, order, dictionaries, stylesheet |

## License

MIT.
