---
id: Slot_1
aka: 03-1
name: entry
version: 6
path: AGENTS.md · CLAUDE.md
from: _Store/02_STRUCTURE/_Slot/Root_001_Entry @v6 #5afce3cdd0ae
---
# Root_001_Entry entry — the harness entry

- Role:
  - `AGENTS.md` (★) is the harness entry: describes the app or product, then points into `docs/`; in a NON-APP repo it states the non-app profile. Follows the cross-tool agents.md convention.
  - `CLAUDE.md` (★) is the second entry: it holds ONLY `@AGENTS.md`. Claude Code reads `CLAUDE.md`, not `AGENTS.md` ⇒ without this file the entry does not load by itself.
  - `AGENTS.md` is one of the 4 required roles of an APP repo (`backend/(code)` · `frontend/` · `docs/` · `AGENTS.md`) and one of the 3 required roles of a NON-APP repo (`docs/` · `AGENTS.md` · ≥1 deliverable).
  - The entry is identical in both kinds: the same engine, the agent navigates the same way.
  - Both files sit at the repo root because the tools force the place; never moved.
- May hold / may not hold:
  - `AGENTS.md`: a description of the app/product + the path into `docs/`.
  - `CLAUDE.md`: one line `@AGENTS.md`, nothing else.
