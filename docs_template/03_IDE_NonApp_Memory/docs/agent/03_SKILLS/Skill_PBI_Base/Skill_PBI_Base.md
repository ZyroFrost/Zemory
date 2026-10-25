---
id: Skill_PBI_Base
name: pbi-base
version: 10
type: process
installs: [scripts/pbi_engine_query.ps1]
aka: dev-pbi
replaces: [Skill_Dev_Pbi]
description: Build or change a BI report - layout and chart choice, measures and queries kept in one named store, and the report file handled as a heavy binary. Use whenever a report, dashboard, measure or visual is created or changed. Vietnamese triggers - "báo cáo", "dashboard", "biểu đồ", "measure", "DAX", "Power Query", "pbix".
from: _Store/03_SKILLS/Skill_PBI_Base @v10 #d00e955cfc18
---

# pbi-base — building and editing BI reports

> Changing the layout, charts or theme of a report in use ⇒ propose first (`Rule_Keys_62_DesignChangeApproval`). Filling figures into an
> existing template: go ahead. A repo with its own, more detailed report skill ⇒ follow that skill; this skill is the floor.

## 1. Layout and charts

- Keep the settled layout; a new page or tile follows the pattern of the existing pages (`Rule_Core_81_FollowExistingPattern`).
- Choose a chart by its question: comparing groups ⇒ column/bar · a trend over time ⇒ line · a composition of few parts ⇒ stacked column
  or pie (a few parts at most) · detail to look up ⇒ table.
- Each visual has a title saying what it answers; each number has a unit and a period; labels in business words (`Rule_Gate_02_ReaderText`).
- A new chart idea ⇒ draw recommendations, propose the options; never apply on your own.

## 2. Measures and queries

- A report's DAX · M · SQL are gathered in the repo's store of statements (`queries/` · `measures/`), each named, called by name; never scattered
  inside each visual (`Rule_Gate_35_OneHome`). A statement only ONE case uses ⇒ `tasks/<case>/check_*.sql`; `queries/` keeps only statements two
  cases or more use (slot `Queries_122_Queries`).
- Changing a shared measure ⇒ list every visual and report using it before the change (`Rule_Core_80_SharedChangeImpact`).
- After the change: refresh the data and reconcile the totals with the source, in numbers (`Rule_Gate_01_DoneMeansRun`).

## 3. Report files

- `.pbix` is a heavy binary: it goes through LFS by `.gitattributes`, never committed straight (`Rule_Gate_21_WhatEntersGit`).
- Real data stays outside git; the repo keeps only a sample small enough to open the report.

## 4. The Power BI report standard of a department repo

A department repo builds Power BI reports on the DW in four kinds (`Legacy` · `Classic` · `White` · `Red`, skill `pbi-pbip` §0). The
shared standard of the four kinds is in the three files below; each kind's skill states only its own part and points back here.

| Need | Open |
|---|---|
| folder and file names · report numbers · renaming · one report per folder · `.pbip` · dropping the old system | `reference/naming.md` |
| `#Measure` · measure folders by page · measure names · `Parameter_*` · the DW's Kimball · the two name layers of `Classic` | `reference/model.md` |
| colours · interactions · icons · slicers · the 5 grid · frames · the title band · building on an existing frame | `reference/design.md` |

The group's real values (colour codes, theme, icons, original template, DW server, old-system sources) live in the manager; the standard files only name the key
in the group's values.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — the report design standard whose suggestions are shown first · chuẩn thiết kế báo cáo mà gợi ý phải trình trước
