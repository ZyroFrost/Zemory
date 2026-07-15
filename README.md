<div align="center">

# zemory

**Local context & memory governance for coding agents — one CLI, one SQLite brain.**

Zemory captures every coding‑agent session into a single local brain, gives each
project a self‑healing docs harness, and lets you recall anything across tools,
projects, and machines — all offline, with no model API calls.

![Node](https://img.shields.io/badge/node-%E2%89%A520-3c873a)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![License](https://img.shields.io/badge/license-Apache--2.0-blue)
![Status](https://img.shields.io/badge/status-alpha-orange)
![Local‑only](https://img.shields.io/badge/data-local--only-6f42c1)

![zemory cockpit](frontend/assets/cockpit.png)

</div>

---

## Table of contents

- [Why zemory](#why-zemory)
- [Highlights](#highlights)
- [Quickstart](#quickstart)
- [The cockpit (UI)](#the-cockpit-ui)
- [Core concepts](#core-concepts)
- [CLI reference](#cli-reference)
- [Web‑chat capture](#web-chat-capture)
- [Scoped sync & recall](#scoped-sync--recall)
- [Cross‑machine sync](#cross-machine-sync)
- [Privacy & retention](#privacy--retention)
- [Development](#development)
- [Architecture & safety model](#architecture--safety-model)
- [Roadmap](#roadmap)
- [License](#license)

---

## Why zemory

Coding agents (Claude Code, Codex, Continue, LM Studio, and web chats like
ChatGPT) each keep their own memory in their own place. Across a week you lose
track of *what you decided, why a fix worked, or where a session ran* — and every
project's rules/TODO/changelog quietly drift out of sync with the code.

Zemory fixes both halves:

- **One global brain.** Every agent session on your machine is ingested into a
  single local SQLite database you can search by keyword or meaning — across
  every project and machine.
- **One per‑project harness.** A small, standard set of docs (rules, TODO,
  changelog, numbered plans) that the working agent keeps aligned with the code.

It is **local‑only** and **never calls a model API** — the "intelligence" is the
agent already driving your terminal; zemory gives it durable memory and a
disciplined workspace.

---

## Highlights

| | |
|---|---|
| 🧠 **Global brain** | Every Claude / Codex / Continue / LM Studio session in one local SQLite DB, deduped and searchable. |
| 🔎 **Hybrid recall** | FTS5 keyword (word **+ Vietnamese trigram**) fused with a local vector index (EmbeddingGemma via Transformers.js — no Python/GPU), with optional cross‑encoder rerank. |
| 🌐 **Web‑chat capture** | Pull your **ChatGPT web** history into the brain via a login‑once browser window — no password ever touches zemory. |
| 🧭 **Provenance lanes** | Every session is stamped with `origin` (local/web), `host` (machine), and `source` (agent). Filter, roll up, and **exclude** lanes you don't want. |
| 🪪 **Project harness** | A shared standard (`docs-template/`) the agent adapts into each project: rules ↔ TODO ↔ changelog ↔ numbered plans, kept in sync. |
| 🔐 **Cross‑machine sync** | Merge machines through an **encrypted bundle** on a Drive folder — additive, never destructive, provenance preserved. |
| 🖥️ **Live cockpit** | A local web cockpit: recall, source tree, harness, scan, and one‑click sync. |
| 🔌 **MCP server** | Expose recall to any MCP client (`brain_search`, `brain_show`, `plan_search`, `plan_show`). |
| 🕵️ **Privacy tools** | Forget, re‑redact, back up, and restore — all local, all reversible where it matters. |

---

## Quickstart

Zemory is installed **once per machine** and shared by every project. It is not
on a public npm registry yet — install from this repo:

```bash
git clone <this-repo>
cd zemory
npm install
npm run build
npm install -g .          # exposes the global `zemory` command (or: npm link)

zemory brain scan         # ingest existing agent transcripts on this machine
zemory hook install       # auto-capture new Claude/Codex sessions (0 tokens)
zemory brain embed --all  # build the semantic vector index (enables hybrid recall)
zemory doctor             # verify everything is green
```

Because `npm install -g .` links the repo, a later `npm run build` updates the
global `zemory` command in place — no reinstall needed.

**Add a docs harness to a project (optional):**

```bash
cd your-project
zemory init && zemory docs sync && zemory doctor
```

Any project can query the shared brain even with no harness; `zemory init` only
adds the curated rules/TODO/changelog/plan docs.

---

## The cockpit (UI)

```bash
zemory ui
```

Starts a local server on `http://127.0.0.1:<port>` and opens a desktop app
window (Edge/Chrome). It has three columns:

- **Project harness** (left) — the **shared standard** (from `docs-template/`)
  plus the selected project's own docs; **Run** restructures a project to the
  standard, **+ Add** targets a new project folder. Live capability checks below.
- **Recall** (center) — search past sessions; toggle Hybrid / Rerank; filter by
  time, role, origin (Local/Web), and agent; preview a thread inline.
- **Global memory** (right) — totals and a **Sources tree** (Local → machine →
  agent, Web → platform) where you **untick a lane to leave it out of sync +
  recall**, plus scan, capture coverage, and cross‑machine **Sync**.

Panel sizes you drag are persisted (in `~/.zemory/config.json`) and restored on
reopen. Generated markdown files are mirrors — edit content through the `zemory
plan` / `changelog` / `docs` commands, not by hand.

---

## Core concepts

### The brain (global memory)

One SQLite database at `~/.zemory/global_memory.db` (override with
`GLOBAL_MEMORY_DB`). `zemory brain scan` ingests agent transcripts incrementally
and idempotently; the Stop hooks keep it current with zero extra tokens. Messages
are deduped, secret‑redacted, and summarized into per‑session digests for cheap
recall.

### Provenance & origin

Every session carries `origin` (`local` = agent transcripts on disk, `web` =
captured web chat), `host` (the producing machine), and `source` (the tool). This
is what powers filtering, per‑machine rollups, and scoped sync — with **one
column, not a second store**.

### Recall (hybrid)

Recall fuses two FTS5 streams (word + trigram, so Vietnamese and substrings work)
with a local vector stream via Reciprocal Rank Fusion, blended with a recency
signal. Cross‑encoder rerank is opt‑in. Every added stage **fails open** — if the
model is unavailable, recall degrades to keyword FTS instead of breaking.

### The harness (standard + per‑project)

`docs-template/` is the **shared standard** shipped with zemory — the canonical
rules and the *method* for storing them. Installing the harness into a project is
not a blind copy: zemory scaffolds the **structure**, and the working agent reads
the standard and **adapts it to the project** (gather & number plans, keep
rules ↔ TODO ↔ changelog ↔ plan in sync). Project‑specific content (TODO,
changelog) is never copied from another project.

---

## CLI reference

```text
# Brain
zemory brain scan [--deep]              Ingest agent transcripts (deep = walk the disk)
zemory brain scan-web [--limit N]       Capture ChatGPT web chat (login-once browser)
zemory brain search "q" [--all]         Recall (this project | everywhere)
zemory brain search "q" --rerank        Recall with cross-encoder rerank
zemory brain embed --all                Build/refresh the semantic vector index
zemory brain scope [exclude|include]    Provenance tree; exclude a lane from sync+recall
zemory brain hosts                      Sessions by machine -> agent -> project
zemory brain digest <session>           Show a session's summary digest
zemory brain sync --dir <folder>        Cross-machine sync via a Drive folder
zemory brain export / import [--merge]  Encrypted bundle out / in (merge = additive)
zemory brain forget / redact / backup   Privacy & retention (see below)

# Harness & docs
zemory init | sync                      Scaffold / gap-fill the project harness
zemory doctor                           Verify docs, providers, capabilities
zemory validate                         Lint the docs harness (links, length, supersede)
zemory plan ls | search | show | set    DB-backed plans (mirror renders automatically)
zemory changelog add "title"            Add + render a changelog entry
zemory docs ls | sync | render          Manage DB-source docs

# Interfaces
zemory ui                               Live cockpit
zemory mcp                              MCP stdio server for recall tools
```

---

## Web‑chat capture

Web chats (ChatGPT, later Gemini / Claude.ai) live on the server — there is no
file on disk for `brain scan` to read. Zemory captures them with a
**browser‑connector**:

```bash
zemory brain scan-web                    # opens a login-once window; log in ONCE
zemory brain scan-web                    # re-run: pulls + ingests (origin=web)
zemory brain scan-web --limit 5          # pull just the newest 5 (quick verify)
```

Zemory opens a dedicated browser profile (`~/.zemory/browser/chatgpt`), you log
in on the real site (id/password/2FA go to OpenAI, **never** to zemory), and
zemory drives that logged‑in tab over CDP to read the site's own conversation API
— running inside the real browser so it passes Cloudflare. Pulls are **batched
and resume‑safe** (a dropped connection reconnects; a crash keeps what was
already ingested) and paced to ease rate limits. Captured chats land in the same
brain under `origin=web` and are fully searchable.

> ⚠️ Captured conversation files contain real personal data and are **never
> committed** — only the code and docs live in this repo.

---

## Scoped sync & recall

Some lanes are shared or noisy and you don't want them in your personal brain's
sync or recall. Tick them off in the cockpit's **Sources** tree, add a rule for
lanes not captured yet ("+ Add rule"), or use the CLI:

```bash
zemory brain scope                        # show the Local/Web × machine × agent tree
zemory brain scope exclude --source codex # leave codex out of sync + recall
zemory brain scope exclude --origin web   # leave all web chat out
zemory brain scope include --source codex # undo
```

Exclusion is a **filter, not a delete** — the data stays in the local DB; it is
simply left out of exported bundles, incoming merges, and recall results. It
serves both the harness (clean provenance, no cross‑project mixing) and token
economy (less irrelevant memory pulled into a prompt).

---

## Cross‑machine sync

Each machine keeps its own local `global_memory.db`. To share, sync an
**encrypted bundle** through a cloud‑Drive folder — never put the live SQLite
file in a synced folder (a WAL DB synced by a cloud client corrupts).

```bash
# one-time: a LOCAL Drive path (Google Drive/OneDrive) + the same share/share.key on each machine
zemory brain sync --dir "G:\My Drive\Global Memory"
zemory brain embed --all                 # vectorize newly merged messages
```

`brain sync` exports this machine's bundle (`global_memory.<host>.zemory.enc`)
and merges every other machine's bundle it finds. Merge is **additive**: nothing
is overwritten, each session keeps the `host` that produced it (see `zemory brain
hosts`), and re‑merging the same bundle adds zero. The brain itself never lives in
git — a fresh clone starts empty; populate it with `scan` + `sync`.

---

## Privacy & retention

```text
zemory brain backup [out.db]             Raw local SQLite backup
zemory brain restore <backup.db> --force Restore a raw backup (renames the old DB aside)
zemory brain forget --project .          Dry-run forget for the current project
zemory brain forget --session <id> --force
zemory brain redact --force              Re-apply secret redaction to old rows
```

`forget` is a dry‑run unless `--force`, and always backs up before deleting. It
removes rows from zemory's derived brain + vector index; it does not delete the
agent's original transcript files. Anyone who can read the share key can decrypt
the bundles.

---

## Development

```bash
npm install
npm run check         # strict typecheck + lint + tests (temp SQLite DBs)
npm pack --dry-run
```

- `backend/src/` is 100% first‑party code; external libs/models are called, not vendored. Layout follows the standard in `docs/agent/03_STRUCTURE.md`.
- Docs live in the DB and render to markdown mirrors — edit via commands.
- Tests run against throwaway databases; no network anywhere.

---

## Architecture & safety model

- **Local‑only storage; zemory never calls a model API.** The driving agent is
  the intelligence; zemory is memory + harness.
- **One source of truth.** Project docs live in the DB; search indexes are
  derived lenses that can be dropped and rebuilt.
- **One capability = one slot = one provider** (a registry rejects conflicts).
- **Tool is separate from data.** The zemory binary reads a project's docs; it
  does not live inside the project.
- **Non‑destructive by default.** Generated mirrors never overwrite an existing
  DB source; merges are additive; plan mutations are scoped to the active project.

---

## Roadmap

- Full‑account ChatGPT backfill acceptance on a live account (pacing + resume).
- Scoped exclusion at ingest time (`scan` / `scan-web`), not just sync + recall.
- Gemini and Claude.ai web capture behind the same browser‑connector.
- Extending semantic retrieval beyond agent memory to first‑party data/knowledge.
- Code‑map (AST) indexing with import‑graph / blast‑radius awareness.

---

## License

Licensed under **Apache‑2.0**.

<div align="center">
<sub>Built for agents that should remember. Local‑first, no model API, one brain.</sub>
</div>
