---
id: Slot_6
aka: 03-6
name: plan
version: 6
path: docs/plan/
from: _Store/02_STRUCTURE/_Slot/Docs_006_Plan @v6 #f77e103cb351
---
# Docs_006_Plan plan — specs / plans by section

- Role:
  - ★ Specs/plans by section — FLAT; EVERY `.md` is indexed.
  - A plan holds only specs: no work items (work ⇒ `04_TODO`, by `Rule_Gate_38_TodoDoor`), no laws (an invariant ⇒ the repo's `01_LAW/_Cons`, written once approved; the plan only refers to it).
  - A plan keeps only the current settled direction and the points still open; a change of direction ⇒ edit in place, the history and the reason go to `05_CHANGES`.
  - Nothing machine-generated writes into a plan (tables of contents · catalogues · lookup tables a build produces ⇒ a file beside the source that produces them, the plan links to it). Hand-drawn diagrams, structure tables and `mermaid` blocks are the core of a plan: keep them.
  - `00_overview.md` = the default OVERVIEW of every app (purpose · features · ideas · non-goals). Detailed specs from `01_*` on, numbered upwards.
  - NON-APP repo: a long defect/spec of one case → `docs/plan` (one of the 3 exceptions allowed outside `tasks/<case>/`).
- Cap: one spec about 1,000 lines (key `thresholds.plan_spec_lines`) — whoever edits a spec reads it whole. `docs/plan` as a whole has no cap: no session reads the whole folder; a spec is looked up with `plan search`, or by opening exactly the `plan/NN §section` a gate or hook message points to. The `validate` gate errors on a machine-generated block and warns when a spec passes the cap. Trimming a plan: skill `harness-plan-trim`.
- May hold / may not hold: Holds: flat `NN_name.md` files, no sub-folders.
- Naming: `NN_name.md` — `NN` two digits, `00` = overview; a name of several words joined by `_`.
