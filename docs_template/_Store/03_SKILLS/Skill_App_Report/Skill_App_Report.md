---
id: Skill_App_Report
name: app-report
version: 42
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
  ratio takes 1 as its threshold; a share takes neither colour. No third "nearly" band, no fixed grey %. A % in brackets with no sign of its own ("(5,8)%", the person's negatives in brackets) is negative (v23, 16/11). So is any figure in brackets, with or without a minus inside: `(132) lỗi`, `(-43,2) pp` (v24, 18/11). [rp-pct-color]
- **A card whose figure is itself a ratio** (% target, % margin) shows its change in percentage points: `+2,5 pp MoM`,
  never a second %. [rp-pct-pp]

## 2. Cards

- **A card row holds only cards** - no chart, no table in it - **at least four**, every card with its % line. [rp-cards]
  (v28, 19/11, Dashboard Cons_Gate_102 §18: "mỗi trang có ít nhất 4 card") A page short of four tops them up, in this order:
  figures its own charts and tables read, with their filters kept; then figures of the other pages of the same board that
  the board has already loaded. A card that would show only "—" is dropped. Not for an export page (one table, no cards) or a
  board whose owner settled its own cards (the repo declares it). This replaces the rule of v27 that dropped a row of one to
  three new cards.
- **The card row stands alone on its line** (v10): no
  chart, donut or table beside it in the same row of the grid - a chart of the same figures goes on the row below. [rp-cards-apart]
- **A card row over a row of as many panels is in line with them** (v15): each card is as wide as the panel under it, edges
  within 2 px, also when a panel takes more room for its table - the cards follow the panels' widths (layout px: a frame that
  zooms scales a rect, not a width it is given). [rp-cards-aligned]
- **A card is as tall as what it holds** (v10): never pulled to the height of a block beside it -
  at most 1.6 times its lines and padding, measured on what the card draws (v11: a Sneat card's `.card-body` stretches
  with the card). [rp-card-fit]
- **Too many cards for one line split top and bottom into even lines** (v11): the cards keep their size and design - never
  squeezed narrower than 140 px to keep one line; the lines are even (8 → 4 + 4, 15 → 8 + 7, 7 → 4 + 3) and no card stands
  alone on a line. [rp-cards-wrap]
- **A figure card wears the tinted fill of its tone** (v12): every
  card of a card row carries `data-tone` (card *i* → slot *i* of the theme) and is filled with a pastel of it - the slot colour
  at a low alpha (`--tone-bg`), the figure in the text colour, the icon in the full slot colour - in both themes. Never the bare
  glass of the frame, never white, never the tone as a stripe or a border on one side; the frame keeps the fill of a card with
  `data-tone`. Locked by `Rule_Gate_98_FigureCardTone` (its hook blocks the style that takes the fill off). [rp-card-tone]
- **A figure is never rounded to 0 with a unit** (v10: a Group Size of 1,75 read "0 k"): a value below the unit
  shows in a smaller unit or in full; `0 k` · `0 tr` · `0 tỷ` never appear. A true zero (its `data-rp-raw` is 0) stays in the unit the person chose (v24, 18/11). [rp-figure-scale]
- **A figure that fits one line never wraps** (v25, 18/11: "88.76 %" broke in two beside a bar with room to spare): a
  data label, the value of a bar, a card figure and a table number stand on one line; a bar chart gives up bar length so its
  figures fit (the value column as wide as the longest figure, `white-space: nowrap`). Only a name wraps, to two lines at most.
  A name clamped to two lines (`-webkit-line-clamp`, or a box that hides its overflow) counts the lines it shows, not the
  lines the clamp hides (v33, Dashboard 20/11). [rp-figure-one-line]
- **A card title fits its card;** a long one is abbreviated (the qualifying clause dropped, the full meaning in the page's
  glossary), never by shrinking the font of one card - the titles of a row share one size, and so do the figures.
  [rp-card-label]
- Figures on cards take the theme's colour slots in order (card *i* → slot *i*).

- **A card's figure never runs past its edge** (v13): a figure that is words (a store's name) shrinks with the
  card's width and ends in "…" when still too long; a card of one store shows its short name, the full name in its tip, never
  again on the line below. [rp-card-no-overflow]

## 3. Chart colours and labels

- **Every chart marks its series and takes its colours from the theme sequence,** continuing the sequence within a view;
  **no two charts of one view share the main colour.** Comparison series (LY · LM · LMTD · target) are grey shades.
  A chart stacked by a field it keys in its own legend wears that field's colours; a point of two fields
  (`data-cf-dim="group|method"`) counts when the legend keys either (v20). [rp-chart-colour]
- **Data labels have no box behind them; every % label is bold.** Every chart shows its numbers (`app-sneat-glass`
  [chart-labels]). [rp-label]

- **Every data mark tells what it stands for when pointed at** (a bar, a stacked part, a dot, a slice), with its value, as
  Power BI does - through the frame's tooltip (`data-tip`, several lines with `\n`), never the browser's plain
  `title`. [rp-tooltip]

- **A chart with a legend of a field is stacked by that legend** (v13): its columns or
  bars are cut by the legend's values in the report's colours, every part wide enough (6 % of the length) carries its own
  number, the total at the end of the bar or the top of the column. A legend of measures (Revenue · EBITDA side by side) is no
  field: its columns are grouped, the number over each (v16). [rp-stacked-labels] Charts stacked by the same field wear that field's fixed colours on every chart of the page (one colour per
  value, as a grade A/B/C/D) - two of them sharing a colour is right; a chart of one series still takes its own main colour.
- **The numbers of a chart never cover each other** (v13; every chart of every board, v19 - 14/11: "số không được đè
  nhau… nếu trùng phải có line trỏ vào cách xa ra 1 tí giống pbi"): no two data labels of a visual overlap - a line's figure
  over a combo's columns included; a label that would cover another moves away from its point, up first, down when the top has
  no room, with a thin leader (`data-rp-leader`) from the label to its point, as Power BI does; a label takes its series'
  colour. A label the app hides to keep the others apart (visibility hidden, opacity 0) is not drawn and not counted (v20).
  Two labels are compared by the shape drawn - a slanted figure as turned, never its upright box: two slanted figures side by
  side keep apart when their lines do (v34, Dashboard 20/11). [rp-labels-apart]
- **No text stands upright** (v19, 14/11: "cấm dựng đứng"): a figure or a name too long for its room slants at 45°,
  never 90° - no `writing-mode: vertical-*`, no rotation of a text near a quarter turn; a column too narrow even for a slanted
  figure keeps it in its tip. [rp-no-upright]
- **The names of an axis never cover each other** (v28, 19/11, Dashboard Cons_Gate_102 §16), on every chart. The ladder,
  the first that fits: one line across → slanted 45° → wrapped across, three lines at most → wrapped and slanted → the chart
  grows wider and scrolls sideways (its width capped, app-base). Once it scrolls a long name slants too; still too close,
  only every k-th name is written and the ones left out are in the tip. A name never makes its column wider. [rp-axis-labels]
- **Columns never touch** (v28, §17): the columns of one group take 70 % of the group's room; a tight chart makes its
  columns thinner, never closer. [rp-bar-gap]
- **The figures over the columns never stack** (v28, §17): a figure that would cover one already shown is hidden and stays
  in the tip (a hidden label is not counted, rp-labels-apart). The test uses the drawn shape of the text - a slanted figure is
  compared as turned - and runs again when the chart turns to slanted names and when the columns have finished growing.
  [rp-bar-values-apart]
- **A tip says one fact a line, "Field: Value"** (v13): `Tháng: T3` · `Xếp loại: C` · `Số NH: 15` · `Tỷ lệ: 36%`,
  every number in full (244.008.536.989), never cut to tỷ / tr / k; % and points keep their form. The check reads a value that is a figure; a name from the data ("Voucher: HN - Giải khát chỉ 9k") is not judged (v20, Dashboard 15/11). [rp-tip-field-value]
- **A tooltip names every entry of its legend** (v22, 16/11): a chart whose legend names two series or more (a combo, grouped
  or stacked columns, several lines) gives every mark of one axis point the same tip - the point, then each legend entry
  "Name: value" in the legend's order, as a Power BI combo tooltip. A legend of the categories on the axis (one mark each) is
  not judged. [rp-tip-all-legend]
- **The numbers follow the person's number size** (v22, 16/11): Settings > Numbers > Number size (`--num-scale` on `<html>`,
  at the three levels) sizes the numbers of a table (`data-rp-num`) and the labels of a chart (`data-rp-label`) alike; a chart
  that places its labels apart counts with the scaled size. The figure in the middle of a donut is the chart's own KPI and keeps
  its size, as KPI cards do. [rp-num-size]
- **A colour on a number says its level, never decoration** (v13, as Power BI's conditional formatting): one scale of levels for the whole app, good to bad -
  green · yellow · orange · red; a grade A/B/C/D takes the same scale; the stripes of a table never paint over a cell coloured by
  its value; no purple or info colour stands for a level. [rp-value-colour]
- **A % against a target is graded on its real value** (v13): < 40 % red · 40 to < 70 % orange · 70 to < 100 % yellow · 100 % and more
  green - four colours, never two. [rp-target-graded]

## 4. Tables

- **One style for every table:** header row bold on its own fill, rows alternating, the total row bold, horizontal lines
  only; a % column coloured by its own measure (§1); heat maps (intensity colour) are kept. Column headers are reader's words,
  never field names (`chi_tieu`, `StoreName2`). [rp-table-style]
- **A table is not for little information:** one row ⇒ a card with several values; one dimension with six values or fewer
  (and no column field) ⇒ a chart, measures of other units in its tooltip (v11), also when it has several measures. A table
  that is a visual of the report it rebuilds (`data-pbi-visual` on it or a parent) stays a table, however few groups - the
  report is read as it is (v35, 20/11, Dashboard Cons_Gate_102 §1; replaces v11's "also when the report drew it as a
  table"); a one-row table is a card all the same. A detail table (one row per record) is exempt; a table of few groups is
  never declared one. [rp-table-few]
- **Nothing scrolls sideways inside its frame, and no table spills out of its panel** (column widths are measured at first draw, so headers may wrap; a phone scrolls a data grid inside its frame, app-base M5). A table spread over periods shows only the latest ones (the window follows
  the page filter); columns are as wide as their longest figure, all fitting the frame; figures that still do not fit switch
  to millions with one decimal. Scrolling down is normal. A table's own sideways box (`table-boxed` of app-sneat-glass) is no
  scroll while the table fits it: only a table wider than its panel, or a box whose content runs past it, breaks this rule (v13).
  [rp-no-side-scroll] A page of one matrix (its only data visual a table - a P&L of twelve months, as the report's own page) scrolls
  it sideways inside its own frame, never spilling out of its panel (v16).
- **The numbers of a table follow the person's number format** (v9): Settings > Numbers of the family frame (unit, decimals, rounding, separator, negatives),
  kept on `<html data-num-format>`. Each number cell says what it is (`data-rp-num` = `money` · `count` · `pct`) and its value
  (`data-rp-raw`), and shows exactly that format (the frame's `fmtNum`); a negative in red carries `text-danger`. As the frame 1.33.6 writes it (v24, 18/11): an amount under the chosen unit steps down to the unit it fills (275.000 in `tr` reads `275 N`), the bracket form keeps its minus `(-132)`, and a count whole by rule (people) carries `data-rp-whole` and shows no decimals. Charts and
  KPI cards keep their own form. [rp-num-format]
- **A table shows ten rows at least** and scrolls the rest inside its own frame, staying on the page beside the other visuals
  (v7); ten rows as drawn - a row of two lines is taller - never a fixed height. [rp-table-rows-cap] The only table of its page takes the page height, in a frame that really scrolls (v16).
  Ten rows is the floor, not the ceiling: a table that still scrolls takes the screen left below its page, down to the screen's
  bottom - rows never scroll above empty screen (v17, 14/11). A visual below the table keeps it at ten rows.
- **How a table fits its panel** (v15, the means of rp-no-side-scroll): tight cell padding for a table wider than its panel at
  the kit's; the row measured once, its tables given the width they need only while every panel of the row still fits it (a
  donut or chart keeps 15rem), else the report's shares stand; a header wraps between words, never inside one; a matrix whose
  column field has more than 24 values (80 stores as columns) turns over, those values becoming its rows, its colours with them;
  a table the report draws across 60 % of its page or more keeps a row of its own.
- **No blank column** (v15): a matrix shows no column whose figures are all blank, as Power BI shows no member without data (as
  no blank row). [rp-blank-cols]
- **A header is never a field name** (v15): CamelCase (`StoreName2`, `ShortName`) or a copy number (`Vị Trí1`) reads the
  page's name of the field. [rp-header-words]
- **A sentence is never a table cell** (v15): a text measure with no field (a conclusion, a commentary) is wrapped text in its
  panel. [rp-sentences] A text measure that writes a number (a count, a % under a switch) is that number in the person's format.
- **A figure sorts by its value** (v16): a figure written with a unit (`2,8 tỷ`, `15 tr`, `3k`) is no number to a sort that reads
  the text; the cell carries its value (`data-sort-value`, plain digits, no separator). A total row stands outside the body
  that is sorted (`tfoot`): it stays last whatever the order. [rp-sort-value] A click on a header sorts the column and moves no
  panel's width: what widens a panel for its table is only what the table runs past its box, never the table's own width
  stretched to the panel (that grows on every resize, a ratchet). [SORT_PROBE]

## 5. Layout

- **Visuals of the same kind and fields** (differing only by a filter) **sit in one row,** the same height, the width split
  evenly. [rp-same-row] Each one the whole row (a time series per P&L line) stands one under the other (v16).
- **A line too tight splits into even lines of the same content** (v25, 18/11: five line charts at 340 px cut their
  titles and put the legend beside the title on two panels, under it on three): when one line would squeeze a panel under about
  400 px, or its title or legend no longer fits its head line, the visuals take even lines - 5 = 3 + 2, 6 = 3 + 3 - none alone on
  a line, each line split evenly over the same width. [rp-same-row] On one line every panel keeps its whole title, its legend at
  one height and its plot on one top and one bottom (2 px). [rp-row-squeeze]
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

- **A page keeps its size** (v15): never scaled down to fit the screen (no transform scale on the page or a block of it); a
  page taller than the screen scrolls. One page a tab or every page one after the other are views; neither shrinks. [rp-no-page-scale]

- **A board leaves no hole** (v13): short charts stack in one column beside a tall one, a long list (Top 10) stands
  half a row and two blocks tall; every column of a row reaches the row's foot. [rp-no-hole]
- **A chart fills its panel to the bottom** (v16): a panel stretched by a taller neighbour of its row (a table) grows its plot -
  the columns stand on the panel's foot, a line spreads over the height; the plot's own height is its floor, never its size.
  [rp-plot-fills]
- **A ranking bar gives its names room** (v13): the name column is 30 to 40 % of the bar's width, two lines at
  most (the full name in the tip), never a long bar beside a name on six lines. [rp-rank-name]
- **Every chart can be enlarged alone** (v13, as Power BI's focus mode): a button (`.rp-focus-btn`) on each chart
  and donut, as tall as a legend chip and on its line; pressed, the chart takes the place of the board's other visuals -
  the board's width, from under the page bar to the foot of the window - solid, on the focus layer (`--z-focus`, skill app-sneat-glass §2c): above
  the page and the AI chat, under every floating layer - menus, popovers, tips and dialogs stay over it (v40) - and never over the menu or the top bar (v38, the requester 25/11: a first try that covered the whole window was wrong);
  pressed again or Escape, the page comes back as it was. [rp-focus] [rp-focus-cover: FOCUS_PROBE presses each enlarge
  button, measures where the visual stands, what stands over it and its fill, then presses Escape] **Enlarged is never blank** (v28, 19/11, Dashboard
  Cons_Gate_102 §19): every chart, table, card and text panel keeps its whole content in focus. [rp-focus-whole]
- **A department's list of reports is rows the width of the page** (v13): each
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
- **The title and the legend share the head by length** (v28, 19/11, Dashboard Cons_Gate_102 §7), never a fixed half: the
  title takes its own width on one line and the legend the rest. Only when both cannot stand on one line does the legend take a
  line of its own, and then the title may run to two lines at most. The legend is never cut or covered; a wider panel measures
  again from the start, and a panel 0 px wide is not measured. [rp-title-legend]
- **An abbreviation is in capitals or written out** (v28, §9): NQ, EBITDA - never half way ("Nq", "Ebitda"). The app keeps
  one list of its codes, and every label, title and tip reads from it. [rp-abbr-caps]

## 7. Glossary

- **Each report page has its own glossary** (behind a button, never pinned on the page) that names every word the reader
  sees: titles, column and axis names, card titles. An abbreviation is written with its original once (`TC (Transaction
  Count): số hoá đơn`), looked up in the company's terms, then the old system's dictionary, then the DW docs, then the
  measure itself - never invented. One definition per line. Explanations of a figure live there, not in a frame on the page.
  [rp-glossary]
- **A report page has one view: no list / grid switch** on its bar - a report is read one way, and a switch
  only takes room. The page declares it (`views={false}` on the family's frame), and the frame then draws no switch.
  [rp-no-view-switch]

## 8. Rebuilding a report

> 🔄 v26 (18/11) replaces v11, where the White version was the report being replaced.
- **The content of every report is its Classic version** (v26, 18/11: "dùng classic từ đầu"): pages, visuals,
  figures and order follow the Classic report. The White version is no source any more; this skill keeps from it only the way
  a page is set out neatly (§1-7: card rows, even splits, the reading rules). Parity keeps what Classic shows, in the form this
  skill gives it: a card row topped up to four (§2), a small table drawn as a chart (§4).
- **The board keeps its own structure** (v26): pages and tabs follow the structure the app's board already has; no tabs cut
  the way the White report cut them.
- **Every page and every visual of the report being replaced is present**, in its order. A visual dropped on purpose, or
  waiting for a source the DW does not have yet, is declared in the board's parity list with its reason; the repo's test
  compares that list with the report's visuals (both ways).
- **The figures match the report:** each measure is rebuilt from its formula and reconciled against the report's own numbers,
  part by part; a planned difference (a part the report left blank) is declared with the reason.
- What the owner adjusted in the report stays as the owner left it; a settled layout moves only with approval
  (`Rule_Keys_62_DesignChangeApproval`).

- **A report card on a catalog page** lists its pages in as many even columns as its width holds at its longest page name with
  room (v37, the requester 25/11 through Dashboard: use the room the screen leaves, never two columns in a wide card): every column
  one width, no page name cut, and no room left for one more column while pages remain - one column width for every card of
  the page, so their columns line up, measured at the page's longest page name, not each card's (v39) (`data-rp-card-pages`), and, once built, turns by a
  button at its top right (`data-rp-card-flip`) to the state of its numbers (`data-rp-card-status`): normal, a period with no
  numbers yet, a read that failed with the last good read, not read yet; the time of the update, the period, how long it read,
  how often it refreshes. Only the content turns; the card's glass stands still (v7). [rp-card-pages-even]
  [rp-card-status]

- **A card total of the report uses the measure of its chart** (v13): a chain figure that the report draws from the
  same measure as a chart (the chain's score = the trend line) is computed as that chart is; a count of stores (passed, grade D,
  grade A) keeps each store's own score; the report's DAX is copied as it is, its averaging over rows included - the app never
  "fixes" the report. Judged when the page is shown.
- **A figure off the report is traced by its sources first** (v13): a difference with Power BI is compared source
  by source (the datalake table and the file the report reads) before the app is changed.
- **A day's sales count closed days only** (v13): a figure by sale day reads only the days whose books are closed
  (`Dim_Date.IsSaleDayClosed = 1`), as the report does.
- **Each visual is drawn as its kind** (v15): a scatter chart as dots (X, Y, Size), a 100 % stacked chart as parts of 100 %
  with each part's %, a pie with only a Legend field as a slice per legend value - never grouped columns or an empty panel for a
  kind not built yet (that visual waits, declared, rp-parity).

## 9. The markup contract

| Attribute | On | Meaning |
|---|---|---|
| `data-rp-page` (`data-rp-dept`) | the page root | a report page (its department code, for [rp-page-name]); required on every page with data points, the scope of [rp-marked] (icons under 40 px are not visuals) |
| `data-rp-visual` = `chart` · `donut` · `table` · `cards` | each visual | what the block is; every `.card` holding svg / a table / data points carries it [rp-marked] |
| `data-rp-title` | the visual's title | [rp-title] [rp-glossary] |
| `data-rp-glossary` | the page's glossary, behind its button | [rp-glossary] |
| `data-rp-fields` | a visual | its field set: same kind + same fields ⇒ one row [rp-same-row] |
| `data-rp-axis="column"` · `data-rp-body` | a column chart · its plot | [rp-baseline] [rp-fill] |
| `data-rp-mark` (`data-rp-compare`, `data-rp-value`) | each bar / slice / point | a series mark (a comparison series; its value) |
| `data-rp-item` · `data-rp-topn` · `data-rp-rows` | items · a Top N visual · the count that exists | [rp-topn] |
| `data-rp-label` | a data label | [rp-label] [rp-bar-values-apart] |
| `data-rp-tick` | each name of an axis (v29) | drawn shapes apart [rp-axis-labels] |
| `data-rp-pct` = `up` · `down` · `share` | each % (card line, label, cell) | [rp-pct-*] |
| `data-rp-target` = the % (as 85) | a % against a target | its band colour [rp-target-graded] |
| `data-rp-cf` = `good` · `ok` · `warn` · `bad` | a value coloured by its level | one colour per level [rp-value-colour] |
| `.rp-focus-btn` · `.bar-name` | a chart's enlarge button · a ranking bar's name | [rp-focus] [rp-rank-name] |
| `aria-pressed="true"` on `.rp-focus-btn` · `data-rp-focused` | the visual in focus (v29) | never blank [rp-focus-whole] |
| `data-rp-cards-own` | the page root (v29) | the owner settled the cards: no top-up to four [rp-cards] |
| `data-tone` = a slot of the theme | each figure card | its pastel fill [rp-card-tone] |
| `data-rp-dims` · `data-rp-rows` · `data-rp-detail` · `data-rp-total` | a table · its total row | [rp-table-few] [rp-table-style] |
| `data-pbi-visual` (on the visual or a parent) | the visual is one of the report it rebuilds: a table of few groups stays a table (v35) | [rp-table-few] |
| `data-rp-glossary` (`data-rp-common`) · `data-rp-term` | the glossary · each line | [rp-glossary] |
| `data-rp-num` = `money` · `count` · `pct` · `data-rp-raw` | a number cell of a table · its raw value | [rp-num-format] |
| `data-rp-id` | a cell or column of codes (an employee's 03163) | not a number [rp-num-format] |
| `data-rp-unit` = `bn` · `m` · `k` | a money cell of a column held in one unit (v33): under the person's `auto` it stands in that unit, never stepping down (-770000 in `m` = -0,8 tr); a unit the person chose wins | [rp-num-format] [num-format-works] |
| `data-rp-name` | a cell holding the name of one thing from the data (a material "Thớt nhựa (…), 25cm, cái") | one fact: its commas are no list [one-fact] (v20) |

Cards use the four typography roles of `app-sneat-glass` (`kpi-title` · `kpi-main` · `kpi-percentage` · `kpi-secondary`).

## 10. Check

- The repo's browser test imports `scripts/report_layout_check.mjs` and evaluates every `RULES` entry on every report page
  (every view and tab), at a desktop and a phone width and in both themes. It runs `SELF_TEST` first: the good page passes
  every rule and the faulty page fails each, so every rule is proven red. A rule added here adds its entry there in the same
  change.
- `SORT_PROBE` (v16, async) is run by the same test on each report page at a desktop width: it clicks the header of a figure
  column three times (asc, desc, none) and fails when the column did not sort or a panel grew wider. It is proven red on the
  two faults it was made for (no sort value; a width ratchet) by running it on the page with each fault put back.
- `FOCUS_PROBE` (v29, async) is run by the same test on each report page at a desktop width: it presses every enlarge
  button in turn, runs [rp-focus-whole] on the visual in focus, and presses it again. The seven rules of v28 have their gates
  since v29: [rp-cards] (a page of charts with no card row, a card of only "—"), [rp-axis-labels] (`data-rp-tick`),
  [rp-bar-gap], [rp-bar-values-apart], [rp-focus-whole], [rp-title-legend] (v30-32: the room is the head's line, short of the
  enlarge button's column on whatever line it stands and 8 px before it), [rp-abbr-caps] (the trade's codes, plus the terms of
  3 to 5 capitals in the page's glossary, checked on words that start with a capital); the shapes of slanted text are
  compared as turned.
- **A board is not done until this check is green on its pages** (v15, `Rule_Gate_01_DoneMeansRun`): a count of the visuals
  drawn is not the check. The repo's test runs one board alone (`--only <path prefix>`) while it is being built.
- Not measured by the machine yet (judged when the page is shown): chart width by groups, a donut kept in its row, a tab
  added only for load, colours by meaning.

## Implements · Thi hành luật
- `Rule_Gate_98_FigureCardTone` — a figure card wears the tinted fill of its tone · thẻ chỉ số mang nền tô màu theo tông
- `Rule_Keys_62_DesignChangeApproval` — a report layout is approved before it is built or changed · bố cục báo cáo được duyệt trước khi dựng hay đổi
