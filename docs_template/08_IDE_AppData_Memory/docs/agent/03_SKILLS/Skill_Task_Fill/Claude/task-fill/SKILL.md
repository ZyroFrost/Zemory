---
id: Skill_Task_Fill
aka: fill
name: task-fill
version: 11
type: process
description: Fill a blank template with real numbers and export the finished deliverable (report, sheet, document). Use when a template exists and the data is ready, or when asked to produce, generate, or make a report from existing figures. Vietnamese triggers - "làm báo cáo", "điền số vào mẫu", "xuất báo cáo", "đổ số liệu", "lên report", "ra file cuối".
from: _Store/03_SKILLS/Skill_Task_Fill @v11 #56ea0ee6dec5
---

# fill — fill a template, export the deliverable

> Trigger: an empty template exists + the figures are ready → export the deliverable/exports. Slots: `02_STRUCTURE`.

## Procedure

1. **Take the template from `templates/`** (the EMPTY copy). **NEVER edit the original template** — work on a copy.
2. **Pour in the figures** from `data/` · `measures/` · `queries/` into the right cells/sheets, by the **definitions in the constitution frame
   `Cons_Gate_12_SourceOfTruth`** (section Definitions) and the computation in the repo's own skill (`Skill_Own_<Name>`) — that is the
   **source of truth** for a metric, so it is not filled a different way each time.
3. **Export:**
   - the main copy to hand over → the deliverable folder (`reports/` · `models/` · `content/`)
   - a copy that can be rendered again → `exports/` (gitignored)
   Keep the task's naming convention: `YYYYMMDD_..._REPORT.xlsx` — **a business name, NO stage number
   prefix**.
4. **Check before reporting done:** open the exported file, check a few anchor cells against the source. A measurement
   not cross-checked is not a fact yet (`Rule_Keys_11_VerifyClaims`).

## The important boundary

| Work | Done on your own? |
|---|---|
| Filling figures into an existing template | ✅ go ahead |
| Adding/removing columns · changing a chart · changing the layout · changing the theme | ❌ **PROPOSE FOR APPROVAL FIRST** (`Rule_Keys_62_DesignChangeApproval`) |

Changing the **shape/layout** of a deliverable is a PRESENTATION decision, not a technical one — the people
receiving the report are used to the old layout. Need a chart idea → look for references, then **propose**, never apply it on your own.

## Forbidden

- Overwriting the original template file.
- Changing a metric's formula away from its definition (`Cons_Gate_12_SourceOfTruth`) because it "seems more reasonable".
- Reporting "done" before opening the file and looking at it.
