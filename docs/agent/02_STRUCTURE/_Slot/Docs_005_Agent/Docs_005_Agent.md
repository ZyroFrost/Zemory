---
id: Slot_5
aka: 03-5
name: agent
version: 9
path: docs/agent/
from: _Store/02_STRUCTURE/_Slot/Docs_005_Agent @v9 #24d8899354a0
---
# Docs_005_Agent agent — the core documents for the agent

- Role:
  - ★ `01_LAW/` (shared laws `_Rule/` · the repo's constitution `_Cons/`) · `02_STRUCTURE/` · `03_SKILLS/` · `04_TODO.md` · `05_CHANGES.md`.
  - Each file one role; one piece of content lives in one home, other places refer to it (`Rule_Gate_35_OneHome`):
    - `01_LAW/_Rule` the shared laws · `01_LAW/_Cons` the invariants of the product itself (never in a plan);
    - `02_STRUCTURE` where files go + the name dictionary · `03_SKILLS` work procedures (a law only states the duty and refers here);
    - `04_TODO` open work · `05_CHANGES` the changelog.
  - `02_STRUCTURE/INDEX.md` · `03_SKILLS/INDEX.md`: tables of contents the machine writes at sync from the assembled parts; nobody edits them by hand.
  - Business definitions (measures · states · periods): decided in the constitution frame `Cons_Gate_12_SourceOfTruth` (section Definitions); how to
    compute, how to reconcile, the traps in the repo's own skill (`Skill_Own_<Name>`); a changed definition goes into `05_CHANGES` (a supersede when it reverses
    the old one).
  - `docs/agent/` ≠ `backend/src/agents/`: these are harness docs a coding agent reads; `agents/` is the app's agent code.
- The shape of `05_CHANGES` (gate `validate`):
  - the newest entry goes right after the header, above every older entry; the title is `## [YYYY-MM-DD] — title`;
  - an entry that reverses or replaces an old decision opens with `> 🔄 **Supersede:** replaces [YYYY-MM-DDx] — "[heading]" — [reason].`, naming the exact date key of the replaced entry; an old entry is never edited or deleted;
  - an entry is about 30 lines at most, holding only what changed · why · the measurements; design detail ⇒ the plan.
- May hold / may not hold: Not here: the app's agent code (→ `backend/src/agents/`) · detailed specs (→ `docs/plan/`).
- Naming: Numbered `01_`…`05_`, fixed as above.
