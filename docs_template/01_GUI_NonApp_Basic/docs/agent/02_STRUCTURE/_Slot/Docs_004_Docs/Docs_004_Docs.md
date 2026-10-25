---
id: Slot_4
aka: 03-4
name: docs
version: 8
path: docs/
from: _Store/02_STRUCTURE/_Slot/Docs_004_Docs @v8 #9b5eaabe6079
---
# Docs_004_Docs docs — the documentation harness

- Role:
  - ★ The harness: the `.md` FILE is the SOURCE; the DB is only a derived INDEX — the file wins.
  - Documents / rules / plans → `docs/`, editing the `.md` FILE directly.
  - Identical in APP and NON-APP repos: the same zemory commands, the agent navigates a non-app repo exactly like an app.
  - NON-APP repo: business definitions are in the constitution frame `Cons_Gate_12_SourceOfTruth` (section Definitions), how they are computed in the repo's own skill `Skill_Own_<Name>` — no `docs/dictionary.md`.
    Terms another repo owns (a department's measures seen from the DW) only point at that repo; a repo that only keeps a DB structure keeps the structure dictionary
    in its own skill, pointing at the machine-built catalogue, never copying business definitions.
- May hold / may not hold:
  - Holds: `agent/` (★) · `plan/` (★) · `archive/` (harness history: old ledgers, retired copies, the old file-based harness — looked up with `zemory changelog search` / `plan search`, not read every session) · `.harness.json` (★, the marker: the project has the harness wired).
  - Not here: visual views for people (→ `docs_visual/`) · public pictures/media (→ `docs_public/`) · `docs/dictionary.md` (NON-APP repo).
