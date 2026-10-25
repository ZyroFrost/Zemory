---
id: Slot_128
aka: 03-128
name: scripts
version: 8
path: scripts/
checked: [Models_112_Models, Models_142_Database, Tasks_118_Pipeline]
---
# Scripts_128_Scripts scripts — automation: pull / fill / upload, and setting up the repo's own machine

## Role

- **Automation of the three moves**: pull · fill · publish/upload — THIN scripts the agent calls, shared by many cases.
  Publish / refresh automation lives here; the rendered output goes to `exports/`.
  - The AGENT does the three moves; zemory only remembers and keeps discipline (it indexes the work done into Global Memory),
    never calls an LLM by itself, never fetches a file by itself. Each move = a thin script here + a playbook in
    `.claude/skills/task-pull/` · `fill/` · `upload/` (registered in `03_SKILLS`); the playbook holds the recipe: which source to
    pull, which template to fill, where to push.
  - PULL: read `sources/` → raw into `data/extract/`; credentials come from `.env` / `config/`, a password is never typed into
    zemory (web source: borrow the logged-in session of the real page). FILL: `templates/` + numbers from `data/` / `measures/` →
    `reports/` or `exports/`. UPLOAD: push the deliverable / exports to the destination (BI workspace · Drive · SharePoint) through
    `scripts/` or the upload stage of a pipeline.
- **Setting up and running the repo's own machine or service**: one-time or rare scripts that install or configure what the
  repo runs on (a database server, a data disk, a service), or that run the `models/` chain. Rules:
  - check before changing: every step looks at the current state first, so a second run skips what is done;
  - fail loud: the first failing step stops the run with a non-zero exit;
  - no secret and no internal address inside the file: passed at run time, or read from `.env` / `data/secrets/`;
  - the file says how to run it (where, as whom) in its header.
- Every automatic move can be traced (task / run → `05_CHANGES` / `04_TODO`).
- **Shared code of the repo's cases**: a module the pipelines of several cases import (a mail transport, a vault reader) lives
  here too, once; a case's `common.py` imports it through the repo root, never a copy inside the case.
- A script several REPOS run is a script of an HS skill (`installs:`), put here by `zemory sync`: edit it on HS, not in the copy.
- Clean repo root: scripts go to `scripts/`.

## May not hold

Code cloned from outside (→ `external/`) · a script of a single case (→ `tasks/<case>/pipeline/`) · the database chain itself
(→ `models/`; the script here only RUNS it).

## Check

No machine check yet.
