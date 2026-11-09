---
id: Skill_App_CrossFilter
name: app-cross-filter
version: 5
type: process
checked: [Skill_App_Base, Skill_App_SneatGlass, Skill_PBI_Base]
installs: [scripts/crossfilter_check.mjs]
description: Cross-filtering between the visuals of one report page, as Power BI does it - a click on a data point (a bar, a column, a donut part, a table row) filters every other visual, table and KPI of the page; Ctrl adds points; the clicked visual only dims; chips show what is picked; Escape clears. Use when building or fixing a report page of an app (charts, KPI tiles, tables over the same facts), or when a chart is asked to "filter the others". Vietnamese triggers - "lọc chéo", "bấm chart lọc", "chart lọc lẫn nhau", "liên kết chart", "filter như PBI", "cross filter", "bấm vào cột lọc".
from: _Store/03_SKILLS/Skill_App_CrossFilter @v5 #ce88d52ff5d3
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
- **Escape** (when no dialog or popover is open) and the page filter's **Clear** remove the whole selection. [cf-interaction]
- **Every part of a visual is a point** (v3, user 06/11), as in Power BI: a stacked part, a line dot, a bar, a column, a slice,
  a key entry, a table row. A visual of measures side by side (`data-rp-free`) has no field and is left out. [cf-every-mark]
- **Every legend entry is a real filter of the page bar** (v4, the user 09/11: "mọi legend đều phải là 1 filter thật nối dc vào bộ
  khung filter ở trên, đây cũng là skill hook"): a legend of the values of a field (a series: a year, a channel, a grade) is a
  set of points on that field (`data-cf-dim`), and that field has its filter on the page bar - one filter: a click on an entry
  sets the filter to that value, the filter button counts it, setting the filter lights the entry and dims the others, Clear
  and a second click take it off. A legend of MEASURES (this year / last year, revenue / target) is the page's "Measure" filter
  (`data-cf-dim="measure"`, the filter `measure`): a click keeps that measure lit on every chart of the page and dims the other
  series, it filters no row; Clear takes it off. (v5, the user 09/11: "ít nhất khi bấm legend nó phải hiển thị sáng lên cái line đó
  mới đúng") every entry is clickable, a line of the whole series too (it picks on the Measure filter): a click lights that line or
  series and dims the rest. [cf-legend-filter] [cf-legend-click]
- **A legend stands on one line** (v5, the user 09/11: "legend ko dc xuống hàng ntn, đây là luật, nếu quá dài thì phải là chart
  dài", "kể cả là trong 1 tag"): its chips share one row and never wrap, nor does the text inside one chip; a legend too long for
  the head of its panel makes the chart take the whole row. The vertical key of a donut is no chip legend. [cf-legend-one-line]
- **The page bar and the picks are one, both ways** (v5, the user 09/11: "filter trên và chọn ở dưới luôn phải dính đồng bộ",
  "mỗi trang cần ma trận filter riêng"): every field a visual of the page can pick (an axis, a column, a legend) has its slicer on
  the bar, and setting that slicer lights the matching points and dims the others, as a click on the chart sets the slicer.
  [filter-one] [cf-filter-to-chart]
- **The filters are the person's settings** (v5, the user 09/11): what a person sets on a page (slicers, picks, the period token)
  is saved in their settings of the system (`Config_UserSetting`, `<app>.filters` by page path, the period as its relative token),
  read when the app opens and written after each change - the page opens as they left it, on any machine. The app's own browser
  test proves it (set, reload, still set).

## 2. What follows a selection

- **Every other visual** keeps only the rows that match every picked field it carries. A field a fact does not carry filters
  nothing in that visual (as a missing relationship in a model): it is never forced to empty.
- **The clicked visual is not filtered by its own field**: it keeps all its points, the picked ones lit, the others dimmed.
  [cf-interaction]
- **KPI tiles and tables follow** the selection. A KPI the client cannot recompute (its rows are not sent) shows the server's
  value for the picked member when exactly one is picked (a per-member measure), else the page total - never a wrong sum of rates.
- **The picked values show on the page's ONE filter** (v3, user 06/11: "bấm ở dưới là dùng chính bộ lọc ở trên, không phải thêm
  bộ lọc khác"): the filter of that field on the page bar holds them and the filter button counts them; setting that filter
  filters the visuals the same way. No second row of chips. [filter-one] [cf-interaction]

## 3. The markup contract

- A data point carries `data-cf-dim` (the field) · `data-cf-value` (the value) · `aria-pressed` (picked) · `role="button"` ·
  `tabindex="0"` · a readable name (`title` or `aria-label`). A dimmed point carries the class `cf-dim`, a picked one `cf-picked`.
  [cf-points]
- Each field a visual filters on is a filter of the page bar: `data-filter-id` = the field (a point on two fields says
  `data-cf-dim="month|grade"` and `data-cf-value="T3|A"`); the filter button `#filter-toggle` counts them in `.filter-count`.
  [filter-one]
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
  at least one OTHER visual or KPI changed, the field's page filter present and counted; a second click clears; Escape clears.
  Then `EVERY_CLICK` (awaited): in each visual a click on a point changes another visual and a second click brings the page
  back - a point that filters nothing is no point. Then `LEGEND_CLICK` (awaited): a click on the first legend entry sets its
  field's filter on the page bar to that entry and the filter button counts one more; a second click takes it off. It runs `SELF_TEST` first: the good page must
  pass and the faulty page must fail every rule, so the check is proven red.
- The repo's unit tests cover `pick` and `filterRows`, each new case proven red by breaking the function it guards.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — the behaviour of a kind of visual is approved before it is ported · hành vi của một loại hình được duyệt trước khi chép
