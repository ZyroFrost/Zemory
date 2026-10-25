---
id: Slot_136
aka: 03-136
name: principles
version: 12
kind: guide
path: .
---
# Root_136_Principles principles — the general principles of the structure standard

- Two standards, chosen by the KIND of project — settled BEFORE folders are reshaped; the agent asks, never guesses (`AGENTS.md` §Vào việc):
  - APP: has RUNNING code we develop (UI / server / CLI) — scaffolded with `zemory init`.
  - NON-APP: the project is a PRODUCT / an ASSET (BI/report · data · docs-only · design); the agent only reads · searches · pulls · fills · exports FILES, opening a `.pbix` to look into it or pouring figures into a template included — scaffolded with `zemory init --non-app`.
  - Boundary: a UI/dashboard in the deliverable does NOT make the project an app; only developing & maintaining an app (running code) does.
  - Both kinds SHARE the `docs/` + `AGENTS.md` harness: the same engine, the same zemory commands, the agent navigates the same way.
- Described by ROLE, not tied to a framework → the APP kind applies to Web / Desktop / CLI / AI / Data / Monorepo, the NON-APP kind to BI / data / docs-only / design, with almost no change of structure.
- ONE NAME for each concern. A framework/tool's name is followed only when it FORCES it — as Docker forces `Dockerfile` at the root:
  - APP: Next `pages/`, Django `models/` · `migrations/`, Rails `app/models`.
  - NON-APP: Power BI Project `.pbip` · `.Report/` · `.SemanticModel/`, dbt `models/`.
- A DOUBLE purpose: a tidy structure + a navigation INDEX — an agent reading the standard points STRAIGHT at the folder to change, without grepping the whole repo (fast + saves tokens).
- INDEX = a NAME DICTIONARY to LOOK UP, NOT a list of folders to create. A folder is created ONLY when there is a real concern/file; never a batch of empty folders to complete a set; no concern → no folder. A typical project shows only 4–10 slots (APP) / 3–8 slots (NON-APP).
- Source = INPUT = git tracked. Output = gitignored:
  - APP: output / runtime / secrets.
  - NON-APP: source = source definitions · measures · fill templates · deliverables · specs; output = REAL heavy files / PII / pulled in / rendered (`data/` · `exports/` · `.env`).
- REQUIRED roles; everything else is `[opt]`, created WHEN there is a concern:
  - APP = 4: `backend/(code)` · `frontend/` (if there is a UI) · `docs/` · `AGENTS.md`. The single-language UI exception (server-side rendering) leaves 3: backend(code) + docs + AGENTS.
  - NON-APP = 3: `docs/` · `AGENTS.md` · ≥1 DELIVERABLE folder (`reports/` | `models/` | `content/` | `design/`, chosen by kind); no `backend/` + `frontend/`.
- Legend of the markers in the tree: `★` = required · `[opt]` = created when there is a concern · `(manifest)` = a standard tool file (APP) · `◆` = deliverable, ≥1 (NON-APP). The tree is split in bands: ① TRACKED (sources + manifests/definitions/deliverables) · ② ROOT places the tools force · ③ GITIGNORED. The APP kind further splits `backend/src/` into the bands inbound edge · outbound edge · processing · platform/cross-cutting · shared/contracts.
- Two ways to arrange code (APP kind only) — the same ONE slot dictionary, only the nesting differs; pick one per app, never mixed at will:
  - LAYER-FIRST (the default — a small app / CRUD / few domains): slots sit flat right under `src/` → `src/{api, services, store, ai, validators, …}`.
  - DOMAIN-FIRST (an app with clearly separate domains): each domain is `src/<domain>/`, nesting inside exactly the slots it needs → `src/<domain>/{store, services, ai, io, validators, …}`. Example: `src/<domain-A>/` (store = db · services = business logic · ai = model/adapter · io = import/export) · `src/<domain-B>/` (only the slots that domain needs: services · validators · search) · `src/core/` the composition root (registry/router/runtime — wiring, no business logic) · `src/modules/` providers per capability · surfaces: commands (cli) · api/ui (server), thin entries that only wire into the domain.
  - Rules for BOTH shapes: cross-cutting slots (`core` · `auth` · `vault` · `config` · `logging` · `audit` · `errors` · `i18n` · `update` · `migrations` · `shared` · `util`) are ALWAYS at the root level of `src/`, never nested or copied inside a domain · inside a domain only slots from the SAME dictionary, no new names · THIN surfaces/entries: CLI → `commands/`, HTTP → `api/`, WS → `realtime/`, UI → `frontend/`, holding no business logic.
  - NON-APP kind: the children of `tasks/` · `pipelines/` · `data/` are free under the standard; the opposite rule of the APP kind (inside a domain only dictionary slots) still holds.
- General naming:
  - Slot names in LOWER case; file + folder names of several words → UNDERSCORE `_` (`docs_visual` · `docs_template` · `NN_name.md`), no hyphens/camelCase.
  - EVERY file/folder name we choose is written in pure ASCII English — no local language (with or without diacritics), no characters outside ASCII. The content inside still follows `Rule_Gate_31_NoBrokenVietnamese`; this rule is only about NAMES. Why: names are typed again in commands · imports · links · URLs; diacritics break with the encoding, and look-alike characters (Cyrillic `с` vs Latin `c`) kill a reference invisibly. NON-APP: applies to case names (`tasks/<case>/`) and pipeline stage names too — the places most often named in the local language.
  - LEAVE ALONE names that are not ours: names a tool/npm forces (`package-lock.json` · `.github/` · `docker-compose.yml`), vendor code (`external/`), third-party runtime data, existing files from a vendor (`TargetAll.xlsx` · `..._REPORT.xlsx` · `.pbix` · `.Report/` · `.SemanticModel/`).
  - Names follow the stack (APP): Python `backend/<pkg>/` vs Node `backend/src/` — only the LAYER changes with the language, never the name of a concern.
- Tools force the root (APP): EVERY config a tool reads from the root — `.<tool>/` folders (`.github` · `.vscode` · `.claude` · `.serena`) + `*.config.*` files · `.<tool>rc` · `.editorconfig` · `.npmrc` · `.dockerignore` · `.nvmrc` · `.env.example` · `tsconfig` · `eslint` · `requirements.txt` · `vite/next/tailwind/jest/playwright.config.*` · `.gitlab-ci.yml` · `Dockerfile` · `docker-compose.yml` · `*.spec` · `Makefile`/`justfile` · `.husky/` — LEFT ALONE; a refactor never moves / clears / hard-lists them (an OPEN list). NON-APP kind: the list of files allowed at the root is the `Root_*` slots (the `conform` gate).
- 6 KINDS of non-code: `assets` = media · `resources` = packaged, tracked · `config` = operator files · `data` = runtime, gitignored · `external` = outside code · `attic` = backup.
- 3 kinds of connection (APP): `api/` = what we OPEN (inbound EDGE) · `integrations/` = outside SERVICES (SaaS) · `store/` = the DATABASE (remote/cloud/local); `external/` = their code cloned in. Call direction: `integrations/` = out · `frontend/client/` = back to our own BE. ONE name never carries both directions.
- Cross-cutting must be CLEAR: EVERY concern that runs across (encryption · authz · logging · audit · errors · cache · i18n…) has a place + a kind in the standard so an audit/refactor sees it and nothing slips. A concern missing → REPORT it so it is added to the standard.
- Monorepo (APP): several apps → `apps/<app>/` + `packages/<lib>/` (+ `packages/contracts` for several clients), each by the standard tree.
- Laws that fire while WRITING code (which `conform` cannot check) live in `01_LAW/_Rule/` (`Rule_Gate_21_WhatEntersGit` · `Rule_Gate_35_OneHome` · `Rule_Gate_29_CodeLanguage`), not in the structure standard.
- NON-APP kind: 0 UI rules. Presenting a deliverable (report/chart layout) is a PRESENTATION decision — proposed for approval first (`Rule_Keys_62_DesignChangeApproval`), how to build it in the `pbi-base` skill; not an app UI rule.
- Scope:
  - The APP standard applies to most apps (UI + server side): WebView2 desktop, web apps, tools with a cockpit, AI projects, monorepos; layer-first or domain-first by the number of domains.
  - The NON-APP standard applies to BI/report (Power BI/Tableau), data/analytics (dbt/warehouse), docs-only, design/brand, structured research/notebooks.
  - NOT forced (their own conventions, only noted as out of scope): pure libraries/SDKs (no UI) · native mobile (Gradle/Xcode) · ML/notebooks · game engines (Unity/Unreal) · browser extensions. Under the NON-APP standard, an app with running code → the APP standard.
- Reconcile — bringing a drifted repo back to the standard: a RARE flow; the full procedure (drifted docs · drifted folder structure · an end-to-end recipe) is in `.claude/skills/harness-reconcile/SKILL.md`. `zemory validate`/`structure` only POINT AT the drift (advisory); the agent reshapes with `git mv` (keeping history), zemory never auto-moves; breaking a large structure / something hard to undo → ask FIRST (`Rule_Gate_10_DestructiveOps`, `Rule_Gate_50_Git`).
