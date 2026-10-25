---
id: Skill_PBI_Red
name: pbi-red
version: 6
aka: pbi-main
replaces: [Skill_PBI_Main]
type: process
description: Build the RED copy (named Main before 2026-10-19) of a Power BI report - the warehouse model and the NEW design to the region's standard, with no old copy to cite. Use whenever a report is designed from scratch, the official copy replaces the old system, or the full design standard is applied to a file. Not when the old design is kept (pbi-classic or pbi-white). Vietnamese triggers - "bản red", "bản main", "dựng report mới", "thiết kế mới theo chuẩn", "bản chính thức".
---

# The `Red` kind — a NEW design on the DW, the full standard applied

> 🔴 **`Red` = DW + a new design, the official copy** (`Skill_PBI_Base` `reference/naming.md`).
> It differs from the other three in exactly one point: **there is no "old copy" to point to.** `Classic` and `White` are both
> allowed to keep things that look off-standard because the old copy did it; here **there is no such exception**.

## 1. This file does NOT copy the standard — it only says where the standard lives

The design rules are a **shared** asset; their home is in the `region manager repo`. Copying them here makes a
second copy, and copies drift — the price was paid: a copy of the colour table carried two codes that were
dead and wandered around **for a whole month** after they were replaced.

| Need | Open |
|---|---|
| Colour table · theme · icons · clickable buttons · slicers | `Skill_PBI_Base` `reference/design.md` §1–§2 |
| Measure structure, folders by page, the `#/%/~` prefixes, `Parameter_*` tables | `Skill_PBI_Base` `reference/model.md` |
| The spacing numbers, the 5 grid, the white frame | `Skill_PBI_Base` `reference/design.md` §3 |
| An existing UI frame — swap only the data | `Skill_PBI_Base` `reference/design.md` §3.5 |
| Editing a `.pbip` without breaking the file | `.claude/skills/pbi-pbip/SKILL.md` |
| Image and theme assets | the `assets/` folder of the region's manager repo (`theme_file` · `icons_dir` in the region values) |

## 2. Four things missed most often — listed here because they break SILENTLY

- 🔴 **A slicer's `header.show` not declared is ON by default.** Searching for `"show": true`, finding 0 results and
  thinking it is off is wrong — it must be declared **explicitly** `false`. A real case: **22/22 slicers** caught, while
  `title.show` was already `false`, so a quick look made it seem done.
- 🔴 **A `visualLink` at the wrong level makes the button silent** — the key must sit in `visual.visualContainerObjects.visualLink`, not in
  `visual.visualLink`. At the wrong level Power BI still opens the file, says nothing, and the click does nothing. A `shape` carrying `visualLink` at the right level
  is clickable (measured on a real Red report: `BG_UserGuide`).
- 🔴 **A visual brought over from a template inherits every default of the template**, even those with no line
  in the JSON. Most often: `ThemeDataColor` `ColorId: 7, Percent: 0.2` ⇒ **pale grey text while the JSON is still
  valid**. Write text colours as plain codes.
- 🔴 **Dragging by hand in Desktop produces decimals** (`50.23255813953489`). After dragging, snap to multiples
  of 5 every `x·y·width·height` of **every** object.

## 3. Real pages, not sample pages

🔴 **The real file holds only REAL pages** (design.md §3.4). The template ships 5 demo pages
(`Sales Overview` · `Payment & Channel` · `Customer Analysis` · `Product Performance` ·
`Regional Insights`) — **none of them is real**. Look at them in the original template, never leave them in the file.

It follows: **the navigation column has exactly as many buttons as there are real pages**, laid out from the first slot, in
`pageOrder` order, slot `i` at `y = (i−1) × 60`. Dropping a page ⇒ **move the remaining pairs up**, never leave an empty slot
above — a button's coordinates are an **address by page order**, not a fixed position.

## 4. Renaming in the model — the acceptance gate is DAX that really runs

🔴 **Reading the file proves nothing** (model.md §7). After every rename of a table/column/measure:

```
TMSCHEMA_MEASURES   State = 1 toan bo
EVALUATE ROW("v",[<tung measure>])   chay TUNG cai, 0 loi
```

*A real case: one pass reported "0 missing references · Desktop opens clean" while **23 measures were broken** — the static gate
only reads `column` lines, and the Desktop opening only ran 3 measures.*

⚠ A `DATATABLE` table takes its column names from **the strings in `DATATABLE`**, not from the `column` lines — a
blind rename eats into the strings and produces oddly named columns the static gate does not see.

## 5. Acceptance

```
model   1 #Measure table · letter folders by page · #/%/~ prefixes · separate Parameter_* tables
design  every colour code in the group's colour table · 5 grid · 5 gap · buttons 60 apart
     grep -rhoP '#[0-9A-Fa-f]{6}' <Name>.Report/definition | sort -u
     -> a subset of the colour table (except the theme file, where colours are declared)
     0 slicers with the header on · 0 visualLink sitting on a shape
DAX  every measure State = 1 AND runs to a result
REAL open Desktop, NO "report has issues" dialog, then LOOK with your own eyes
```

🔴 The last item **cannot be automated**, and it is the only item that proves anything.
