# zemory

Local context and memory governance for coding agents. Zemory keeps project
rules, plans, TODOs, changelog entries, and cross-agent session recall behind
one CLI and one SQLite brain.

## Status

Alpha. Implemented: the global brain, hybrid FTS/vector recall with optional
cross-encoder rerank, DB-backed project docs, health checks, Claude/Codex
capture hooks, per-machine session provenance, cross-machine sync via encrypted
bundles (`brain sync` / `import --merge`), the live cockpit UI, and the local MCP
recall server. Output compression was explored and then dropped from scope — it
did not yield reasonable net savings on a subscription; the design notes stay
under `docs/plan` and the code under `attic/`.

## Install

Not published to a public npm registry — install from this repo, once per
machine:

```bash
git clone <this-repo>
cd zemory
npm install
npm run build
npm install -g .        # exposes the global `zemory` command (or: npm link)

zemory brain scan       # ingest existing agent transcripts on this machine
zemory hook install     # auto-capture new Claude/Codex sessions (0 tokens)
zemory doctor

# Optional per-project docs harness:
cd your-project
zemory init && zemory docs sync && zemory doctor
```

`npm install -g .` links the repo, so a later `npm run build` updates the global
`zemory` command in place — no reinstall needed.

Zemory is installed once at machine scope. Any project can query the shared
global brain, even if that project has no `docs/.harness.json`. Per-project
`zemory init` only adds the curated docs/plan/changelog harness.

## Open the Cockpit (UI)

Run this from any terminal:

```bash
zemory ui
```

It starts a local server on `http://127.0.0.1:<port>` and auto-opens a desktop
app window (Edge or Chrome). If no browser is found it prints the URL — open it
manually in any browser. Press `Ctrl+C` in the terminal to stop it.

The cockpit has three columns: **Project** (pick a project, read its harness
docs), **Recall** (search past sessions, filter by time/type/agent, open a full
session), and **Global memory** (totals, per-machine and per-agent breakdown,
scan, and the Drive **Sync** button).

Project docs stay in `docs/`; session recall is stored locally in
`~/.zemory/global_memory.db`, or at `GLOBAL_MEMORY_DB` when that environment variable is
set. Generated markdown files are mirrors: update content through `zemory plan`,
`zemory changelog`, and `zemory docs` commands.

## Core Commands

```text
zemory ui                          Live memory cockpit (opens a browser app window)
zemory doctor                      Verify docs, providers, and capabilities
zemory brain scan                  Ingest supported agent transcripts
zemory brain search "query"        Recall this project
zemory brain search "query" --all  Recall across every project
zemory brain search "q" --rerank   Recall with cross-encoder rerank (sharper top-k)
zemory brain embed --all           Build the semantic (vector) index for hybrid recall
zemory brain hosts                 Sessions by machine -> agent -> project
zemory brain sync                  Sync memory across machines via a linked Drive folder
zemory mcp                         Run MCP stdio server for local recall tools
zemory plan search "query"         Search DB-backed plans
zemory changelog add "title"       Add and render a changelog entry
zemory hook install                Install automatic Claude/Codex capture
```

Recall is hybrid by default: FTS5 keyword (word + Vietnamese trigram) fused with
a local vector index (EmbeddingGemma via Transformers.js, no Python/GPU). Run
`zemory brain embed --all` once to build the vector index; cross-encoder rerank
is opt-in (`--rerank`, the `Rerank` toggle in the UI, or `ZEMORY_RERANK=1`).

## Sharing Memory Across Machines

Each machine keeps its own local `global_memory.db`. To share, sync an
**encrypted bundle** through a cloud-Drive folder and merge it — never put the
live DB file in the synced folder (a WAL SQLite synced by a cloud client
corrupts and loses writes).

One-time per machine: install Google Drive for Desktop (or OneDrive) so the
shared folder is a LOCAL path (e.g. `G:\My Drive\Global Memory`), and make sure
the same `share/share.key` exists on every machine.

```bash
# Link the folder once (or paste the path in `zemory ui`), then:
zemory brain sync --dir "G:\My Drive\Global Memory"
```

`brain sync` exports this machine's bundle (`global_memory.<host>.zemory.enc`)
into the folder and merges every OTHER machine's bundle it finds there. Run
`zemory brain embed --all` afterwards to vectorize the newly merged messages.

Manual equivalent:

```powershell
zemory brain export "G:\My Drive\Global Memory\global_memory.$env:COMPUTERNAME.zemory.enc" --key-file share\share.key
# on the other machine, once the folder has synced:
zemory brain import --merge "G:\My Drive\Global Memory\global_memory.<other>.zemory.enc" --key-file share\share.key
zemory brain embed --all
```

`--merge` is additive: it never overwrites, and each session keeps the `host`
that produced it (see `zemory brain hosts`). Plain `zemory brain import` (no
`--merge`) REPLACES the whole DB instead, backing up the old one to `.bak-*`.

Memory itself is NOT stored in this repo — it travels only through the Drive
folder above. A fresh clone starts with an empty brain; populate it with
`zemory brain scan` and `zemory brain sync` (or `import --merge`).
Security note: anyone who can read the share key can decrypt the bundles.

## Privacy And Retention

```text
zemory brain backup [out.db]          Raw local SQLite backup
zemory brain restore <backup.db>      Restore a raw local backup with --force
zemory brain forget --project .       Dry-run forget for the current project
zemory brain forget --session <id> --force
zemory brain redact --force           Re-apply secret redaction to old rows
```

`forget` is a dry-run unless `--force` is present and creates a local backup
before deleting rows. It deletes from zemory's derived brain DB and vector index;
it does not delete the original agent transcript files.

## Development

```bash
npm install
npm run check
npm pack --dry-run
```

`npm run check` runs strict TypeScript validation, a clean build, and integration
tests against temporary SQLite databases.

## Safety Model

- Local-only storage; zemory does not call a model API.
- One configured provider per capability slot.
- Generated mirrors never overwrite an existing DB source during routine sync.
- Plan mutations are scoped to the active project.
- Changelog archiving remains queryable in SQLite and creates no second store.

Licensed under Apache-2.0.
