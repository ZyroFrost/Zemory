---
id: Skill_Harness_Reconcile
aka: reconcile
name: harness-reconcile
version: 13
type: process
description: Bring a project folder back in line with the standard when files have drifted into the wrong places, or when adopting an existing messy folder. Produces a proposal table - never moves anything on its own. Use when taking over an unfamiliar folder, or when asked to reorganise, tidy up, or restructure. Vietnamese triggers - "sắp xếp lại", "dọn lại thư mục", "nắn về chuẩn", "folder đang lộn xộn", "áp chuẩn vào dự án có sẵn".
from: _Store/03_SKILLS/Skill_Harness_Reconcile @v13 #b97525939c15
---

# reconcile — bringing folders back onto the standard

> Trigger (`Root_136_Principles` item Reconcile): a RARE flow, only when tidying a repo/folder not yet on the standard.
> **The supreme rule of this skill: PROPOSE, DO NOT ACT ALONE.** `zemory validate`/`zemory structure` (or
> `scripts/check_structure.py` of the `structure` skill) only **POINT OUT** the drift (advisory) — **the agent moves
> things itself, the tool does NOT auto-move**. **A large restructure / hard to undo → ASK FIRST** (`Rule_Gate_10_DestructiveOps`, `Rule_Gate_50_Git`).

## A. Drifted docs (duplicate · surplus · misplaced docs)

1. Look for duplicate/surplus `.md` files in `docs/`. **Read the file BEFORE deciding** — do not delete by name
   (`zemory plan search` when you need to search by content).
2. Merge stray todos → `04_TODO.md` (merging what ALREADY exists is tidying, not creating — the door `Rule_Gate_38_TodoDoor`
   only blocks items the agent invents). Drop duplicate/outdated copies: **delete the `.md` file directly** (file
   wins) — **ASK first when the doc still holds real content** (the NO DELETING ON YOUR OWN rule); after deleting the file,
   `zemory reindex` refreshes the search index.
3. Gather every plan doc / design doc (a `planning` folder, plan docs lost at the root/`docs`) into `docs/plan/`,
   named `NN_name.md` numbered (`00_overview` → `01_` …). A plan **holds only specs**, todos go to `04_TODO`.

## B. Drifted folder structure

1. **Inventory first, touch nothing.** `zemory validate` — see which layer is missing / misplaced / lacks a
   deliverable (advisory, fixes nothing). For each group of files write: extension · count · size · where it
   sits · most recently edited file. Print the **INVENTORY TABLE**.
2. Map each group onto the right slot with the routing table (`02_STRUCTURE/INDEX.md`; a kit with the `structure`
   skill uses that skill's routing table) — by the project's profile:
   - **APP** (frame `backend/` · `frontend/` · `docs/`):
     - own code → `backend/` (Python `backend/<pkg>/` · Node `backend/src/`); shared BE↔FE → `backend/src/shared/`.
     - UI/assets → `frontend/`. An outside repo cloned → `external/`. Old sources / code replaced during a refactor →
       `attic/` (tracked backup, for rollback). Runtime (`.db`/logs/cache) + secrets (`.key`/bundle) →
       `data/` (gitignore). Files a tool forces to the root (`.github/` · `.env` + `.env.example` · Docker/`.spec`) → leave at the root.
     - **Do NOT force a `test/`** — only when there is logic core that breaks quietly. Only 4 roles are required:
       `backend(code)` · `frontend` · `docs` · `AGENTS.md`.
   - **NON-APP** (non-app frame):
     - products handed out → `reports/`|`models/`|`content/`|`design/`.
     - ask one question first (slot `Tasks_115_Tasks`): does it belong to ONE case or is it shared? Of one case (spec · SQL · config · findings
       · `pipeline/`) → `tasks/<case>/`. Shared by two cases or more: source definitions → `sources/` · DAX → `measures/` ·
       named SQL/M → `queries/`.
     - cases (recurring and on request) → `tasks/<DEPT CODE>_<CADENCE>_<TaskName>/`, unnumbered; real data → `data/<case>/`
       (gitignore). One-off loose files → `data/adhoc/`. Fill-in templates → `templates/`.
     - raw pulled / extracts → `data/extract/` (gitignore). Renders → `exports/` (gitignore).
       Secrets → `.env`/`config/*.local.*` (gitignore).
     - **Only 3 roles are required:** `docs` · `AGENTS.md` · ≥1 deliverable. Do NOT force `backend/`+`frontend/`
       (a non-app has no app code).
3. Print the **DRIFT TABLE**:

   | file / group | sits in | should be in | why |
   |---|---|---|---|

   The "why" column must cite the exact routing line, **never something general**.
4. **Move only after a nod for EACH ITEM.** **KEEP the history — use `git mv` (when it is a git repo), NOT copy then delete.**
5. After moving: **fix imports / entries / paths** to match (needs judgment) — non-app: paths in
   `scripts/` · `sources/` · connections → **verify**: an APP by running the app itself; a NON-APP by opening the
   deliverable / running a trial refresh.
6. Done → update the `README` + write an entry in `05_CHANGES.md` (edit the file directly, after approval).

## Automatic checks

`zemory validate` / `zemory structure`, or `scripts/check_structure.py` of the `structure` skill, point
out the drift. They **only report**, they never move — and a `review` item is not an error, only a sign the machine does not
know which slot that folder belongs to.

## End-to-end recipe ("install the harness + bring this project onto the standard")

- **APP:** `zemory init` (when there is no harness yet) → `zemory structure` (see the TARGET: layout + routing) +
  `zemory validate` (see where it drifts) → read `02_STRUCTURE` section Folder tree (the line-by-line tree) + section
  Routing → do **A** then **B** above → verify by running the app → update README + changelog
  (after approval).
- **NON-APP:** `zemory init --non-app` (when there is no harness yet) → `zemory structure` (see the TARGET) +
  `zemory validate` (see where it drifts) → read `02_STRUCTURE` section Folder tree + section Routing → do **A**
  then **B** → verify (open the deliverable / refresh) → update README + changelog (after approval).

Large work / hard to undo: ASK first.

## Forbidden

- Moving/deleting on your own because it "is clearly in the wrong place".
- Creating empty folders to complete the standard set.
- Deleting a folder only because the checker says so, without opening it to look.
