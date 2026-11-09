---
id: Skill_App_Report
name: app-report
version: 13
type: process
checked: [Skill_App_Base, Skill_App_CrossFilter, Skill_App_SneatGlass, Skill_PBI_White, Skill_PBI_Base]
installs: [scripts/report_layout_check.mjs]
description: The report pages of an app - what a page of figures, charts and tables must look like, carried over from the Power BI White standard (skill pbi-white) so a board rebuilt from a report keeps its readers' habits - percentages with their period and up/down colour, card rows, chart colours and labels, one table style, no table for little information, no sideways scroll, even rows, no empty space, short tab names, a glossary per page, and parity with the report it replaces. Use when building, porting or fixing a report page or a dashboard board of an app, or when a Power BI report is rebuilt as an app page. Vietnamese triggers - "trang báo cáo", "bảng dashboard", "dựng lại pbi", "chuẩn pbi white cho app", "card kpi", "bảng ma trận", "bố cục chart", "bảng giải thích".
---

# app-report — the report pages of an app

> A FUNCTION skill shared by every app with report pages, whatever its kind (`app-sneat-glass`, `app-glass` …), next to
> `app-cross-filter` (how the visuals filter each other). Its rules are the reading rules of the Power BI White standard
> (`pbi-white` §4–§5r, settled with the owner over many rounds), restated for a web page; the Power BI file mechanics
> (bookmarks, JSON keys, Desktop saves, the 5 px coordinate grid) stay in `pbi-white`. Each rule has its check in
> `scripts/report_layout_check.mjs` (named in brackets), which the repo's browser test runs on every report page; the
> markup the checks read is in §9.

## 1. Percentages

- **Every % names what it is compared with** - the period (MoM · WoW · QoQ · YoY · LMTD) or the base (vs chỉ tiêu · của
  tổng …) - in its own text, or, for a share, in its visual's title. A bare `55,7%` is wrong. A page on the running month
  compares the month to date with the same days of the month before (LMTD), never half a month with a whole one.
  [rp-pct-period]
- **Every % is declared** a direction or a share: `up` (rising is good) · `down` (rising is bad: voids, costs, refunds) ·
  `share` (a part of a total, no good or bad). Undeclared ⇒ red. [rp-pct-declared]
- **Two colours only, by the declared direction:** good green, bad red (a `down` figure is red when it rises); a target
  ratio takes 1 as its threshold; a share takes neither colour. No third "nearly" band, no fixed grey %. [rp-pct-color]
- **A card whose figure is itself a ratio** (% target, % margin) shows its change in percentage points: `+2,5 pp MoM`,
  never a second %. [rp-pct-pp]

## 2. Cards

- **A card row holds only cards** - no chart, no table in it - **at least four**, every card with its % line. A page whose
  own new cards would be one to three drops the row; cards carried over from the report being replaced are kept and topped
  up to four with figures the page already reads. [rp-cards]
- **The card row stands alone on its line** (v10, user 08/11: "nó không được nằm trong chỗ card, nó phải nằm riêng ra"): no
  chart, donut or table beside it in the same row of the grid - a chart of the same figures goes on the row below. [rp-cards-apart]
- **A card is as tall as what it holds** (v10, user 08/11: "card dài sọc"): never pulled to the height of a block beside it -
  at most 1.6 times its lines and padding, measured on what the card draws (v11: a Sneat card's `.card-body` stretches
  with the card). [rp-card-fit]
- **Too many cards for one line split top and bottom into even lines** (v11, user 08/11: "quá nhiều card thì phải chia hàng
  ra, ko dc cả nùi", "chia trên dưới làm đôi, giữ đúng size và thiết kế card"): the cards keep their size and design - never
  squeezed narrower than 140 px to keep one line; the lines are even (8 → 4 + 4, 15 → 8 + 7, 7 → 4 + 3) and no card stands
  alone on a line. [rp-cards-wrap]
- **A figure card wears the tinted fill of its tone** (v12, the user 09/11: "cái này là skill, nên có hook cho skill"): every
  card of a card row carries `data-tone` (card *i* → slot *i* of the theme) and is filled with a pastel of it - the slot colour
  at a low alpha (`--tone-bg`), the figure in the text colour, the icon in the full slot colour - in both themes. Never the bare
  glass of the frame, never white, never the tone as a stripe or a border on one side; the frame keeps the fill of a card with
  `data-tone`. Locked by `Rule_Gate_98_FigureCardTone` (its hook blocks the style that takes the fill off). [rp-card-tone]
- **A figure is never rounded to 0 with a unit** (v10, user 08/11: a Group Size of 1,75 read "0 k"): a value below the unit
  shows in a smaller unit or in full; `0 k` · `0 tr` · `0 tỷ` never appear. [rp-figure-scale]
- **A card title fits its card;** a long one is abbreviated (the qualifying clause dropped, the full meaning in the page's
  glossary), never by shrinking the font of one card - the titles of a row share one size, and so do the figures.
  [rp-card-label]
- Figures on cards take the theme's colour slots in order (card *i* → slot *i*).

- **A card's figure never runs past its edge** (v13, the user 09/11): a figure that is words (a store's name) shrinks with the
  card's width and ends in "…" when still too long; a card of one store shows its short name, the full name in its tip, never
  again on the line below. [rp-card-no-overflow]

## 3. Chart colours and labels

- **Every chart marks its series and takes its colours from the theme sequence,** continuing the sequence within a view;
  **no two charts of one view share the main colour.** Comparison series (LY · LM · LMTD · target) are grey shades.
  [rp-chart-colour]
- **Data labels have no box behind them; every % label is bold.** Every chart shows its numbers (`app-sneat-glass`
  [chart-labels]). [rp-label]

- **Every data mark tells what it stands for when pointed at** (a bar, a stacked part, a dot, a slice), with its value, as
  Power BI does (user 05/11) - through the frame's tooltip (`data-tip`, several lines with `\n`), never the browser's plain
  `title`. [rp-tooltip]

- **A chart with a legend of a field is stacked by that legend** (v13, the user 09/11: "chart lẻ phải có số theo lẻ"): its columns or
  bars are cut by the legend's values in the report's colours, every part wide enough (6 % of the length) carries its own
  number, the total at the end of the bar or the top of the column. [rp-stacked-labels] Charts stacked by the same field wear that field's fixed colours on every chart of the page (one colour per
  value, as a grade A/B/C/D) - two of them sharing a colour is right; a chart of one series still takes its own main colour.
- **The numbers of a line chart never cover each other** (v13, the user 09/11: "số bị đè lên nhau"): no two data labels of a
  visual overlap; a label takes its series' colour. [rp-labels-apart]
- **A tip says one fact a line, "Field: Value"** (v13, the user 09/11): `Tháng: T3` · `Xếp loại: C` · `Số NH: 15` · `Tỷ lệ: 36%`,
  every number in full (244.008.536.989), never cut to tỷ / tr / k; % and points keep their form. [rp-tip-field-value]
- **A colour on a number says its level, never decoration** (v13, the user 09/11: "màu theo tỉ lệ, chứ có phải làm cho đẹp đâu…
  mọi chart đều phải có quy chuẩn", as Power BI's conditional formatting): one scale of levels for the whole app, good to bad -
  green · yellow · orange · red; a grade A/B/C/D takes the same scale; the stripes of a table never paint over a cell coloured by
  its value; no purple or info colour stands for a level. [rp-value-colour]
- **A % against a target is graded on its real value** (v13, the user 09/11: "màu nên phân cấp, cam vàng đỏ xanh, ko có 2 màu ntn,
  nên phân theo % thật"; the bands set by the user): < 40 % red · 40 to < 70 % orange · 70 to < 100 % yellow · 100 % and more
  green - four colours, never two. [rp-target-graded]

## 4. Tables

- **One style for every table:** header row bold on its own fill, rows alternating, the total row bold, horizontal lines
  only; a % column coloured by its own measure (§1); heat maps (intensity colour) are kept. Column headers are reader's words,
  never field names (`chi_tieu`, `StoreName2`). [rp-table-style]
- **A table is not for little information:** one row ⇒ a card with several values; one dimension with six values or fewer
  (and no column field) ⇒ a chart, measures of other units in its tooltip (v11, user 08/11: "bảng nào nhỏ ko đáng là matrix
  thì dùng dạng chart khác") - also when the report being replaced drew it as a table, and also when it has several
  measures. A detail table (one row per record) is exempt; a table of few groups is never declared one. [rp-table-few]
- **Nothing scrolls sideways inside its frame, and no table spills out of its panel** (column widths are measured at first draw, so headers may wrap; a phone scrolls a data grid inside its frame, app-base M5). A table spread over periods shows only the latest ones (the window follows
  the page filter); columns are as wide as their longest figure, all fitting the frame; figures that still do not fit switch
  to millions with one decimal. Scrolling down is normal. A table's own sideways box (`table-boxed` of app-sneat-glass) is no
  scroll while the table fits it: only a table wider than its panel, or a box whose content runs past it, breaks this rule (v13).
  [rp-no-side-scroll]
- **The numbers of a table follow the person's number format** (v9, user 06/11: "setting 1 lần sẽ cho hiện ở cái báo cáo
  dashboard hết… chỉ lấy của table"): Settings > Numbers of the family frame (unit, decimals, rounding, separator, negatives),
  kept on `<html data-num-format>`. Each number cell says what it is (`data-rp-num` = `money` · `count` · `pct`) and its value
  (`data-rp-raw`), and shows exactly that format (the frame's `fmtNum`); a negative in red carries `text-danger`. Charts and
  KPI cards keep their own form. [rp-num-format]
- **A table shows ten rows at most** and scrolls the rest inside its own frame, staying on the page beside the other visuals
  (v7, user 06/11: "có giới hạn bao nhiêu dòng, rồi phần còn lại cho scrollbar tự động trong chính dashboard đó").
  [rp-table-rows-cap]

## 5. Layout

- **Visuals of the same kind and fields** (differing only by a filter) **sit in one row,** the same height, the width split
  evenly. [rp-same-row]
- **An even split is absolutely even** - two blocks meant to be equal never differ by a few pixels (325 + 330). [rp-even-split]
- **A chart is as wide as its number of groups** (about 60 px a group); short charts stand side by side; a chart with little
  in it (one series, a few points, a donut of a few slices) is small - at most half the view - and a donut sits in one row,
  never stretched into a column. A long chart (28 groups or more) takes the full width and never scrolls by itself.
- **No column chart leaves more than 30 % of its width empty** once full of data (its columns span 70 % of the plot; a ranked bar list is exempt); a view leaves no hole. Short of content ⇒ propose
  more blocks to the owner, never inflate a chart. [rp-fill]
- **Top / Bottom N shows exactly N** (ties broken), as vertical columns. [rp-topn]
- **No column of an amount points below its axis:** draw the loss as a positive figure, the sign kept in its label. A % may
  be negative. [rp-no-negative-bars]
- **The columns of the charts of one row stand on one line** (the same axis-label room). [rp-baseline]

- **A board leaves no hole** (v13, the user 09/11): short charts stack in one column beside a tall one, a long list (Top 10) stands
  half a row and two blocks tall; every column of a row reaches the row's foot. [rp-no-hole]
- **A ranking bar gives its names room** (v13, the user 09/11): the name column is 30 to 40 % of the bar's width, two lines at
  most (the full name in the tip), never a long bar beside a name on six lines. [rp-rank-name]
- **Every chart can be enlarged alone** (v13, the user 09/11, as Power BI's focus mode): a button (`.rp-focus-btn`) on each chart
  and donut, as tall as a legend chip and on its line; pressed, the chart takes the page body, the others hide, the page bar
  stays; pressed again or Escape, the page comes back. [rp-focus]
- **A department's list of reports is rows the width of the page** (v13, the user 09/11 through an app of the family): each
  report card of a catalog page is a row as wide as its page, its pages spread across that width - never a card in a narrow
  column. [rp-catalog-rows]

## 6. Tabs, names, titles

- **A tab is added only for load** - the content does not fit a view without breaking §4–§5; never to split by topic. Every
  tab is full; two sparse tabs merge under one short word. A tab label is at most 10 characters and shows in full.
  [rp-tab-label]
- **Page and tab names** carry no department code and no word Report / Dashboard / Báo cáo; a board with one page names it
  Tổng quan (Overview). [rp-page-name]
- **Every visual has a title,** aligned left, one size on the page; legends at the top left (a donut's beside it).
  [rp-title]

## 7. Glossary

- **Each report page has its own glossary** (behind a button, never pinned on the page) that names every word the reader
  sees: titles, column and axis names, card titles. An abbreviation is written with its original once (`TC (Transaction
  Count): số hoá đơn`), looked up in the company's terms, then the old system's dictionary, then the DW docs, then the
  measure itself - never invented. One definition per line. Explanations of a figure live there, not in a frame on the page.
  [rp-glossary]
- **A report page has one view: no list / grid switch** on its bar (user 06/11) - a report is read one way, and a switch
  only takes room. The page declares it (`views={false}` on the family's frame), and the frame then draws no switch.
  [rp-no-view-switch]

## 8. Rebuilding a report

- **The report being replaced is its Power BI White version** (v11, user 08/11: "pbi classic là cái ban đầu… white mới là cái
  đã sắp lại rồi"): the classic report is only the first draft; pages, visuals and order follow White, and the classic is
  read only for a page White does not have. Parity keeps what White shows, in the form this skill gives it: a card row
  topped up to four (§2), a small table drawn as a chart (§4).
- **Every page and every visual of the report being replaced is present**, in its order. A visual dropped on purpose, or
  waiting for a source the DW does not have yet, is declared in the board's parity list with its reason; the repo's test
  compares that list with the report's visuals (both ways).
- **The figures match the report:** each measure is rebuilt from its formula and reconciled against the report's own numbers,
  part by part; a planned difference (a part the report left blank) is declared with the reason.
- What the owner adjusted in the report stays as the owner left it; a settled layout moves only with approval
  (`Rule_Keys_62_DesignChangeApproval`).

- **A report card on a catalog page** lists its pages in two even columns (`data-rp-card-pages`) and, once built, turns by a
  button at its top right (`data-rp-card-flip`) to the state of its numbers (`data-rp-card-status`): normal, a period with no
  numbers yet, a read that failed with the last good read, not read yet; the time of the update, the period, how long it read,
  how often it refreshes. Only the content turns; the card's glass stands still (v7, user 06/11). [rp-card-pages-even]
  [rp-card-status]

- **A card total of the report uses the measure of its chart** (v13, the user 09/11): a chain figure that the report draws from the
  same measure as a chart (the chain's score = the trend line) is computed as that chart is; a count of stores (passed, grade D,
  grade A) keeps each store's own score; the report's DAX is copied as it is, its averaging over rows included - the app never
  "fixes" the report. Judged when the page is shown.
- **A figure off the report is traced by its sources first** (v13, the user 09/11): a difference with Power BI is compared source
  by source (the datalake table and the file the report reads) before the app is changed.
- **A day's sales count closed days only** (v13, the user 09/11): a figure by sale day reads only the days whose books are closed
  (`Dim_Date.IsSaleDayClosed = 1`), as the report does.

## 9. The markup contract

| Attribute | On | Meaning |
|---|---|---|
| `data-rp-page` (`data-rp-dept`) | the page root | a report page (its department code, for [rp-page-name]); required on every page with data points, the scope of [rp-marked] (icons under 40 px are not visuals) |
| `data-rp-visual` = `chart` · `donut` · `table` · `cards` | each visual | what the block is; every `.card` holding svg / a table / data points carries it [rp-marked] |
| `data-rp-title` | the visual's title | [rp-title] [rp-glossary] |
| `data-rp-fields` | a visual | its field set: same kind + same fields ⇒ one row [rp-same-row] |
| `data-rp-axis="column"` · `data-rp-body` | a column chart · its plot | [rp-baseline] [rp-fill] |
| `data-rp-mark` (`data-rp-compare`, `data-rp-value`) | each bar / slice / point | a series mark (a comparison series; its value) |
| `data-rp-item` · `data-rp-topn` · `data-rp-rows` | items · a Top N visual · the count that exists | [rp-topn] |
| `data-rp-label` | a data label | [rp-label] |
| `data-rp-pct` = `up` · `down` · `share` | each % (card line, label, cell) | [rp-pct-*] |
| `data-rp-target` = the % (as 85) | a % against a target | its band colour [rp-target-graded] |
| `data-rp-cf` = `good` · `ok` · `warn` · `bad` | a value coloured by its level | one colour per level [rp-value-colour] |
| `.rp-focus-btn` · `.bar-name` | a chart's enlarge button · a ranking bar's name | [rp-focus] [rp-rank-name] |
| `data-tone` = a slot of the theme | each figure card | its pastel fill [rp-card-tone] |
| `data-rp-dims` · `data-rp-rows` · `data-rp-detail` · `data-rp-total` | a table · its total row | [rp-table-few] [rp-table-style] |
| `data-rp-glossary` (`data-rp-common`) · `data-rp-term` | the glossary · each line | [rp-glossary] |
| `data-rp-num` = `money` · `count` · `pct` · `data-rp-raw` | a number cell of a table · its raw value | [rp-num-format] |

Cards use the four typography roles of `app-sneat-glass` (`kpi-title` · `kpi-main` · `kpi-percentage` · `kpi-secondary`).

## 10. Check

- The repo's browser test imports `scripts/report_layout_check.mjs` and evaluates every `RULES` entry on every report page
  (every view and tab), at a desktop and a phone width and in both themes. It runs `SELF_TEST` first: the good page passes
  every rule and the faulty page fails each, so every rule is proven red. A rule added here adds its entry there in the same
  change.
- Not measured by the machine yet (judged when the page is shown): chart width by groups, a donut kept in its row, a tab
  added only for load, colours by meaning.

## Implements · Thi hành luật
- `Rule_Gate_98_FigureCardTone` — a figure card wears the tinted fill of its tone · thẻ chỉ số mang nền tô màu theo tông
- `Rule_Keys_62_DesignChangeApproval` — a report layout is approved before it is built or changed · bố cục báo cáo được duyệt trước khi dựng hay đổi
