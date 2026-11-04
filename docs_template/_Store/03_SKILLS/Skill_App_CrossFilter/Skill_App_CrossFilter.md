---
id: Skill_App_CrossFilter
name: app-cross-filter
version: 1
type: process
checked: [Skill_App_Base, Skill_App_SneatGlass, Skill_PBI_Base]
installs: [scripts/crossfilter_check.mjs]
description: Cross-filtering between the visuals of one report page, as Power BI does it - a click on a data point (a bar, a column, a donut part, a table row) filters every other visual, table and KPI of the page; Ctrl adds points; the clicked visual only dims; chips show what is picked; Escape clears. Use when building or fixing a report page of an app (charts, KPI tiles, tables over the same facts), or when a chart is asked to "filter the others". Vietnamese triggers - "lọc chéo", "bấm chart lọc", "chart lọc lẫn nhau", "liên kết chart", "filter như PBI", "cross filter", "bấm vào cột lọc".
---

# app-cross-filter — the visuals of a report page filter each other

> A FUNCTION skill shared by every app with report pages, whatever its kind (`app-sneat-glass`, `app-glass` ...). It says how a
> click on a chart moves the rest of the page, and the markup contract the machine check reads. Each rule has its check in
> `scripts/crossfilter_check.mjs` (named in brackets), which the repo's browser test runs on every report page.

## 1. One selection per page

- A report page keeps ONE selection: for each field (a "dimension": store, hour, dish, manager ...) the values picked on it. Every
  visual of the page reads it; a new page or a new period starts empty.
- **A click on a data point picks only that point**, replacing the whole selection; a click on the only picked point clears it.
- **Ctrl / Cmd / Shift + click adds or removes** the point and keeps what other visuals picked.
- **Enter or Space** on a focused point does the same as a click; every point is reachable by Tab. [cf-points]
- **Escape** (when no dialog or popover is open) and a **clear button** remove the whole selection. [cf-interaction]

## 2. What follows a selection

- **Every other visual** keeps only the rows that match every picked field it carries. A field a fact does not carry filters
  nothing in that visual (as a missing relationship in a model): it is never forced to empty.
- **The clicked visual is not filtered by its own field**: it keeps all its points, the picked ones lit, the others dimmed.
  [cf-interaction]
- **KPI tiles and tables follow** the selection. A KPI the client cannot recompute (its rows are not sent) shows the server's
  value for the picked member when exactly one is picked (a per-member measure), else the page total - never a wrong sum of rates.
- **The picked values show as chips** beside the page name, one per field, each with its own remove button, then the clear
  button. [cf-interaction]

## 3. The markup contract

- A data point carries `data-cf-dim` (the field) · `data-cf-value` (the value) · `aria-pressed` (picked) · `role="button"` ·
  `tabindex="0"` · a readable name (`title` or `aria-label`). A dimmed point carries the class `cf-dim`, a picked one `cf-picked`.
  [cf-points]
- The chips sit in `#cf-chips`; the clear button is `#cf-clear`.
- A report page has data points in at least two visuals; one visual alone has nothing to filter. [cf-visuals]

## 4. Building it

- The selection logic is pure and unit-tested: `pick(selection, field, value, additive)` · `filterRows(rows, selection, fields,
  except)` · `isPicked`. The visuals and the KPIs read the filtered rows; no visual keeps a selection of its own.
- The KPI formulas stay in ONE home (the server's measures); a client recomputation repeats the same formula, says so in its
  comment, and is changed in the same change.
- Colours of the picked / dimmed states are tokens of the kind (`--g-accent`), and motion stops under reduced motion.

## 5. Check

- The repo's browser test imports `scripts/crossfilter_check.mjs`, evaluates every `RULES` entry on every report page, then runs
  `INTERACTION` (awaited) once per page: it clicks a point and expects the point lit, its siblings dimmed, the chips shown and
  at least one OTHER visual or KPI changed; a second click clears; Escape clears. It runs `SELF_TEST` first: the good page must
  pass and the faulty page must fail every rule, so the check is proven red.
- The repo's unit tests cover `pick` and `filterRows`, each new case proven red by breaking the function it guards.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — the behaviour of a kind of visual is approved before it is ported · hành vi của một loại hình được duyệt trước khi chép
