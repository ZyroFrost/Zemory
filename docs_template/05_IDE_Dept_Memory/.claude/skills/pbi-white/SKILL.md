---
id: Skill_PBI_White
name: pbi-white
version: 17
aka: pbi-mix
replaces: [Skill_PBI_Mix]
type: process
checked: [Rule_Keys_62_DesignChangeApproval, Skill_PBI_Base, Skill_PBI_Pbip]
description: Build the WHITE copy (named Mix before 2026-10-19) of a Power BI report - warehouse model, the Red header and colours, the Legacy layout and navigation, the 5 px grid over the whole file. Use whenever an old dashboard keeps the reading habits of its users but gets the new identity frame. Not for a number-matching copy (pbi-classic) nor a new design (pbi-red). Vietnamese triggers - "bản white", "bản mix", "giữ bố cục cũ nhưng header mới", "trộn hai bản", "header neo khi cuộn".
installs: [scripts/mix_palette.py, scripts/card_icons.py, scripts/matrix_fit.py]
from: _Store/03_SKILLS/Skill_PBI_White @v17 #0bf4dcaceb95
---

# The `White` kind — the OLD layout, the NEW identity frame, running on the DW

> 🔴 **`White` (named `Mix` before 19/10) = the third value of the DESIGN KIND token (`Skill_PBI_Base` `reference/naming.md`).**
> Four clauses: **DW** + **header/colours by `Red`** + **layout & navigation by `Legacy`** + **the 5 grid
> over the whole file**. The other three: `Legacy` untouched · `Classic` keeps the old design AS IS to measure figures ·
> `Red` a completely new design. `White` is the only copy **mixing on purpose** ⇒ also the only copy with two
> rule sets pulling in opposite directions.

## 0a. 🔴 WHAT THE OWNER HAS ADJUSTED MUST NOT BE TOUCHED

> What the owner has saved stays as it is; fix only what the owner names, never "fix" on your own what the owner changed.

- **Edit only exactly what the owner names.** No "standardising in passing" of the things around it.
- Bulk sweeps (`change every title`, `reset every coordinate`) **very easily overwrite what the owner just adjusted** —
  before sweeping, ask: *has the owner just touched this group?*
- 🔴 **NEVER `Stop-Process -Force` a Desktop session.** Only `CloseMainWindow()`. It cannot exit
  (a save-prompt dialog is open) ⇒ **STOP and tell the owner** — that dialog is the very evidence
  **there are unsaved changes**. The price paid: a force-kill lost a legend edit the owner was in the middle of,
  and the owner then believed the agent had reversed the design on its own.

## 0. The boundary: which part follows which copy

🔴 **TWO REFERENCE MOULDS, DO NOT MIX THEM**:

| Question | Open which file |
|---|---|
| **How tabs work** — bookmarks flipping states, `_On`/`_Off` buttons, the red bar | **`Red`** (`ABC_03_INCOME-STATEMENT-OM_IP_Red`) |
| **Naming · selection group structure · bookmark names** | **`Ori`** (the region's original mould, `template_report`) |

Taking the wrong source gives a copy resembling neither — `Red` has real tabs but group names by its own
business; `Ori` has a strict naming standard but **no** tabs.

| Aspect | Follows |
|---|---|
| Data source | **DW** |
| Header strip, logo, colour table, theme | **`Red`** — strip `1280x50`, logo `150x50`, design.md §3.4 |
| Positions of content blocks, page order, how pages are split | **`Legacy`** — readers are used to it |
| Coordinate grid | **the 5 grid over the whole file**, applied to blocks copied from Legacy too |
| Left nav column | **DROPPED**, function buttons moved up into the header |

🔴 **On conflict THE IDENTITY FRAME wins, not the old UI** — **the opposite** of `Classic` (there *"the UI
wins"* because it is a replica for measuring figures). Mixing up these two rules builds a copy resembling neither.

## 1. 🔴 CAN THE HEADER BE ANCHORED — decided FIRST, because it determines the whole file

**Power BI has NO pin / sticky / freeze for objects on the canvas.** Measured 2026-09-22 on the PBIR of 4
reports: only two keys sound similar and **are not** — `lockAspect` (locks a **picture's** ratio) and
`pinKeyFieldsToTop` (pins key columns **inside** a matrix). No key pins a visual on the canvas.

⇒ **The original mould's header looks anchored only because its canvas is exactly `720` — nothing to scroll.**
A canvas `> 720` makes **the whole canvas scroll**, the header drifting with it.

**Two ways, NO third:** ① **keep the page tall** — the header drifts away, the filters must move to the native
`Filters pane` (§2), not be rebuilt · ② **a 720 canvas + split into tabs** — the header stays still, the self-built panels
still work, but **everything is rebuilt**, 2–5 tabs per page.
🔴 **Settle it with the owner BEFORE touching the file** — one real AM report comes to **≈26 tabs**, splitting wrong breaks it 26 times.

## 2. The native Filters pane — the ONLY surface that can be anchored

Keeping the page tall, the filters **can still** be anchored: the `Filters pane` **is not on the canvas**, it is chrome
outside the report frame — bookmarks can control it, it is formatted per page, colours declared through the theme
(`outspacePane` + `filterCard`). ⚠ `Lock filter` = **locks editing**, NOT anchoring.
⚠ **Publish-to-web does not show this pane.**

## 3. The group tree — copied from the original mould, NOT built flat

🔴 **The most expensive error of the first White copy: building FLAT** — one page had **39 objects sitting straight at page level**,
while the region's original mould (`template_report`) has **exactly 4 root groups** on every page.

```
Filter      0,0   1280x720   BG_Filter + Filter_Panel(850,0 370x720)
User_Guide  0,0   1280x720   BackGround + 6 callout groups
Background  5,0   1275x721   Title(55,0 750x70) + Button(0,10 1265x700) + BG Chart
Chart      70,80  1210x631   Card(0,0 810x120, 3 cardVisual) + Map + areaChart + Bottom
```

**The `White` copy applies it exactly, except two places:** `Background` at `0,0 1280x720` (the original mould is offset `x=5` to leave room
for the nav column — White drops that column) · `Background > Button` keeps only the function buttons on the header, no `BT_Page_*`.

🔴 **`position` is a coordinate RELATIVE to the parent group.** Wrapping a group around visuals already placed without subtracting
the offset makes **the content fly outside the group box**. A real case: a group at `y=135` holding children at `y=-65` ⇒ three KPI cards
rendered at `y=235`, **in the middle of the chart area**, while the group frame still looked right — the owner described it as
*"the dashboard jumping all over"*. **Check:** `x,y ≥ 0` and `x+w ≤ W(parent)` and `y+h ≤ H(parent)`.

## 3b. THE HEADER SPACING FORMULA — computed from the TEXT, never a fixed frame

🔴 **Do not keep a fixed frame and append the page name after it** — short text leaves a blank patch, long text
overflows. A real case: the `REVENUE` frame fixed at `360` while the text was only `~111` wide ⇒ **249px of dead space** on
8/9 pages; `ABC OPERATION` given a `1310` frame **overflowed the whole 1280 canvas**.

```
k  (CALIBRATED for the header's BOLD font, factor 1.271 on the old table):
     UPPER .839 · lower .661 · space .356 · digit .763 · '&' .991

W_text(t, size) = size × Σ k(character)
w(frame)        = grid5( W_text + padding.left + padding.right )
x(next frame)   = x(previous frame) + w(previous frame)     <- APPENDED RIGHT AFTER, no gap added

grid5(x) = 5 × ceil((x − 1) / 5)       <- up to the 5 grid, a 1px TOLERANCE
```

**Calibrated from ONE real measurement point of the owner (2026-09-24):** `STORE REPORT` · `24` · bold ·
`padding 20+20` · the owner dragged the frame to **`270`** ⇒ the text width `= 230` ⇒ `Σk = 230/24 = 9.583`,
while the old table gave `7.54` ⇒ **factor `1.271`**. The old table computed **27% short** because the header uses **a bold
font**. Checked again: `STORE REPORT → 270` ✓ (exactly the owner's number) · `Monthly Report ABC → 210, x=435`.

🔴 **The breathing gap between two frames is ALREADY in `padding.right`** — do not add another `3 × fontSize`,
adding it makes the page name drift far away. The owner settled it: the page name is appended right after.

🔴 **The page-name frame is NEVER smaller than its text** *(the header showed `Daily &`)*: `grid5` has a −1 px tolerance, so the text
`Daily & Hourly`, 160.1 px wide, sat in a 160 frame ⇒ Desktop wrapped the line, losing `Hourly`. The page-name frame (no padding) rounds up
WITHOUT tolerance: `5 × ceil(text / 5)`. Gate `header-text` is red when the frame < the text.

🔴 **Round UP, never to the nearest.** 1px short cuts the text (`STORE R…` · `Monthly Report`
losing the word `ABC`); 4px extra nobody sees. The 1px tolerance avoids jumping a whole step for nothing.

🔴 **ADD THE FRAME'S REAL PADDING, never a constant `+20`.** The report-name frame has
`padding.left 20 + right 20 = 40`. The old formula wrote `+20` ⇒ **40px** short ⇒ `STORE REPORT`
(text `181` wide) put in a `200` frame, leaving only `160` for the text ⇒ **cut to `STORE R…`**.
Paid for 2026-09-24. The right numbers: frame `220` · page name `x=440`, frame `165` · the `Title` group `605`.

⚠ **The gate finds these two frames by STRUCTURE, not by name** (the two text shapes in the `Title` group,
ordered by `x`) — because for a shape with its title on, `title.text` is the displayed text itself, renaming the report
loses the trace. The gate's first round reported falsely green for exactly this reason.

🔴 **CHANGING THE HEADER TEXT = BOTH CLAUSES MUST RUN AGAIN.** Changing `REVENUE→STORE REPORT` without widening
the frame and **without pushing the page name along** cuts the text to `STORE …` and the page name sits on top of it.
Hit 2026-09-24 — the formula **was right there above** and still not applied.
⇒ There is now a **`header-text` gate** in §7 recomputing it; no longer relying on memory.

The numbers settled for page 1: `STORE REPORT` (24) → frame `200` · `Monthly Report ABC` (17) → `x=420`,
frame `185` · the `Title` group `605` wide.

**The basis — 6 measurement points, two independent sources:** 5 pages of the original mould (`fontSize 16`, measured spacing
`47.4 ≈ 2.96 × 16`) + the owner's own adjusted copy (`REVENUE`, `fontSize 24`, spacing `78.6 ≈ 3.27 × 24`) ⇒ the constant
**3 × fontSize**. The formula reproduces the original mould within **±12px**, the owner's copy within **±7px**.

## 3c. PAGE NAMES · BOOKMARK NAMES · THE SELECTION TREE — the original mould's standard

**Page names** — Title Case, with spaces, **no words glued together, no ALL CAPS**:
the original mould's `Sales Overview` · `Payment & Channel` · `Product Performance`.
Fixed: `MonthlyReport ABC→Monthly Report ABC` · `ABC OPERATION→ABC Operation` ·
`DSR SYSTEM CURRENT MONTH→DSR System Current Month`.
⚠ **The file name already carries the `_AM` suffix** ⇒ **do not repeat "for AM" in page names**.

🔴 **A page name must say WHAT the page IS**. Generic names by department
or unit are forbidden (`Phòng Kinh Doanh`, `ABC`, `Report`, `Dashboard`, `Page 1`): whoever opens the file already knows whose department
it is. A page name states the content: `Tổng Quan` · `Weekly Report ABC` · `Combo 69K`. Gate `page-name`.

**Bookmark names** — the original mould: `<PageKey>_<Action>`, 6 per page, grouped by page:
`_Main` · `_OpenUserGuide` · `_OpenFilter` · `_OpenInsights` · `_CloseHidden` · `_ClearFilter`.
The White copy adds a **page sequence number** prefix: `01_Monthly_OpenFilter` · `08_Operation_CloseHidden`.
🔴 **The number = the page's REAL position among the shown pages, no phantom numbers**: 15 pages means 01…15, exactly
the order of `pages.json`. Adding, deleting or reordering pages ⇒ **renumber every bookmark**; a deleted page ⇒ **delete its
bookmarks** and move the pages below up a number. The command `mix_builder.py --renumber-bookmarks` (also orders `bookmarks.json` by page);
the builder takes the number from the page's position itself (the `key` in the spec carries no number). Gate `bm-number`.
📌 Caught 27/09: 11/15 pages still carried Legacy numbers (`07_Hourly` on page 4, `23_MCP` on page 15) after 8 pages were deleted.
⚠ The original mould has a typo `Overview_OpenFIlter` — **do not copy it**.

### The selection tree — PACKAGING and NAMING

🔴 **EVERY dashboard must have ITS OWN BACKGROUND SHAPE.** Never the visual's own `background` —
only a separate shape can be edited. One dashboard = **one group** of: **the background + the main visual + every button/loose piece
serving it**. A KPI card is a dashboard too: its group is **background + card + percentage**. A visual in a group with a `BG_` sets
`visualContainerObjects.background.show = false` — its own background (the theme colour darkened 10%, `#FAFAFA`…) covers the frame, and that block
comes out a different colour from the blocks beside it. Gate `own-background` (the `dashboard` gate only counts the `BG_`).

🔴 **Every name in Selection follows exactly one form: `<FeatureKind>_<Name>`.**

| | Form | Example |
|---|---|---|
| **group** | the plain name of the entity | `Revenue` · `OldStore` · `Tab1_TongQuan` |
| **leaf** | `<Kind>_<Name>` | `Card_Revenue` · `BG_Revenue` · `Pct_RevenueOfTarget` |

The prefixes in use: `BG_` background · `Card_` KPI card · `Pct_` loose percentage · `Chart_` chart ·
`BT_` button · `Text_` text/label · `Slicer_` filter · `Logo_` · `Line_`. On/off pairs add the suffix
`_On` / `_Off`, **with the same name root**: `BT_Glossary_Off` ↔ `BT_Glossary_On`.

🔴 **ABBREVIATIONS NEED A THRESHOLD**: abbreviate only when **the original word is ≥ 6 characters** and
**≥ 3 characters are saved**. Saving fewer ⇒ write it in full.

| Short | Original | Saved | |
|---|---|---|---|
| `BG` | Background | 8 | ✅ |
| `BT` | Button | 4 | ✅ |
| `Pct` | Percent | 4 | ✅ |
| `TXT` | Text | **1** | ⛔ → `Text_` |
| `IMG` | Image | 2 | ⛔ → `Image_` |
| `LBL` | Label | 2 | ⛔ → `Label_` |

> Text and txt differ by one character, there is no point abbreviating — `TXT_ → Text_` had to be fixed.

⚠ **THIS RULE APPLIES TO THE LARGE GROUP STRUCTURE, not to labels inside a group** *(the owner clarified
2026-09-24)*. Text sitting **inside** a group that is **a label for the reader** stays large and plain:
`Year` · `Area Manager` · `FILTERS PANEL` in `Filter_Panel`, the report name/page name in `Title`.
For them `title.text` **is the text the owner sees** — renaming it to `Text_AreaManager` makes the filter panel
show exactly that text. The gate exempts them by **structure** (children of `Filter_Panel` and `Title`), not by
a hard-coded list.

⛔ **No spaces · no hyphens · no ALL CAPS** (abbreviations ≤3 characters such as `TC` `TA` `GA` `GC`
are allowed). A whole batch had to be fixed: `Tab1 - Tong Quan→Tab1_TongQuan` · `BG Title→BG_Header` ·
`FILTERS PANEL→TXT_FilterPanel` · `Old Store→OldStore` · `Area Manager→TXT_AreaManager`.

> 🔴 **This is a rule the owner stated from the start that I did not apply** — waiting to be shown each place before fixing.
> Once there is a structure, **apply it to the WHOLE page at once**, never name things at whim and wait to be caught.

🔴🔴 **BEFORE RENAMING: check whether the title is ON or OFF.** In Power BI, the name shown in Selection and
the title shown on the canvas are **THE SAME field** `visualContainerObjects.title.text`.

| `title.show` | what `title.text` is | Can it be renamed |
|---|---|---|
| `false` | **only the Selection label** | ✅ rename freely |
| `true` | **the text SHOWING on screen** | ⛔ renaming = changing the text the owner sees |

Paid for 2026-09-24: renaming a whole page for "the right structure" ⇒ the header showed `TXT_ReportType` instead of
`REVENUE`, the filter panel showed `TXT_Year` instead of `Year`. **19 visuals had to be restored.**

⚠ A side trap — **the default of `show` when NOT declared differs by visual kind**:
`shape` · `image` · `textbox` ⇒ title **OFF**; while **charts ⇒ title ON**. So for a chart, writing an extra
`"show": false` "for tidiness" **turns the title off**, and deleting `show` **turns it back on**. Do not use a blind
`setdefault` on this field.

✅ **To have BOTH a standard name and the right text on a shape:** put the text in `objects.text` (like the tab strip), then
`title.show=false` + `title.text=<Standard_Name>`.

🔴 **A CHART SHOWING ITS TITLE: KEEP THE ORIGINAL TEXT, THE NEW GROUP CARRIES THE STANDARD NAME**
> Groups keep the standard names; the files inside keep their original names.

- **Groups** (`visualGroup`) follow the standard name form in the table above — this is where Selection is read.
- **Leaf visuals showing a title** take back exactly the `title` field of the Legacy copy: fixed text stays
  as it is, **dynamic titles from measures** (the Monthly page: `~Report Titile` · `~Lfl Titile` …) take the expression
  already reconnected to the DW model from the `Classic` copy with the same visual id. The font still follows §4g.
- **Legacy has the title OFF ⇒ White has it OFF too** — the original Weekly page uses AXIS titles (`categoryAxis.titleText`,
  red text under the chart) as labels; turning the title on gives two labels on top of each other.
- Paid for 2026-09-24→26: 27 charts of Monthly · Weekly · Daily Sales showed `Chart_RevenueByDay`…
  The `title-original` gate of `scripts/pbi_gate.py` now reports red when a showing title carries a Selection prefix.

⚠ **A background that is a `shape` declares `outline.show=false` explicitly** — not declaring it leaves Power BI to decide, and
the owner will ask who asked for a border.

- **With tabs, everything changing with a tab must sit INSIDE that tab's group.** Whatever below changes with the tab
  belongs to the tab group, never outside it. *(The card row does NOT change with the tab ⇒ it sits outside the tab groups.)*
- The tab name = **exactly the tab card's label**.

## 3d. BOOKMARKS — the backend must match the original mould, NOT "Selected visuals"

**`targetVisualNames` has TWO uses, chosen by the job — leaving it empty is not always right.**
Measured on `Red` 2026-09-24:

| Bookmark kind | `targetVisualNames` | Why |
|---|---|---|
| **tab** (`_Tab1_…`) | **`[]` empty** ⇒ applies to THE WHOLE PAGE | switching tabs also closes the open panel |
| **panel** (`_OpenFilter` · `_OpenGlossary` · `_CloseHidden`) | **a list of ids** | opening the funnel **must not** blow away the selected tab |
| **a sub-view** inside a block (e.g. switching the chart in `RevenueTrend`) | **the list of ids of exactly that block** | pressing the button **must not** touch anything outside the block |

🔴🔴 **`targetVisualNames: []` with an `explorationState` NOT holding every visual = visuals get eaten.**
Empty means *apply to the whole page*, so Power BI applies the bookmark's snapshot to **every** visual —
whatever is not in the snapshot gets reset. A real case 2026-09-24: two chart-switching bookmarks left
`[]` but listed only **19/75** visuals ⇒ the owner reported that switching tabs back lost a chart and one bookmark did not save every
card.
**The rule: with `[]`, `explorationState` must hold EVERY leaf visual of the page. Otherwise declare
`targetVisualNames` as a list.** The `bm-complete` gate in §7 watches exactly this.

⚠ **Hiding a group means declaring EVERY CHILD GROUP inside hidden too**, or the group tree says "shown"
while the leaf list says "hidden" — a contradiction, and which one Desktop follows is luck.

⚠ That list **holds group ids too**, not only leaf visuals (measured on `MCPReport_OpenFIlter`).

🔴 **The target list works ONLY with `options.applyOnlyToTargetVisuals = true`**.
Bookmark schema 2.1.0: *"Only applies changes to selected visuals when the bookmark was captured."* Without this flag
Power BI applies the snapshot to **the whole page**, so clicking the funnel on tab 2 jumps the page back to the tab at capture time. The Red mould also
lacks the flag (0 bookmarks in any repo have it) ⇒ do not copy the mould on this point. The builder writes the flag for every bookmark with
a list; the command `--scope-bookmarks` fixes existing bookmarks. Gate `bm-scope`.

🔴 **No slicer may show `(Blank)`** *(design.md §2.4)*. Every column
a slicer shows gets a visual-level filter **"is not blank"**: `Not (<column> = null)`, exactly the mould Desktop writes (taken from the slicer
`IsCurrentYear` of Classic). Measured 27/09 on the DW, after the filter `BusinessUnit = Southern`: 16/23 columns feeding slicers had
`(Blank)` — 4 southern stores not yet assigned an Area Manager (292 ADV · 172 THĐ · 334 TL10 · 594CMT8), the rest phantom blank
rows from facts carrying codes not in the dim. No empty strings, only nulls. The filter sits on the slicer so it does **not**
remove those stores' figures from the charts. Command `--no-blank`, gate `slicer-blank`.

🔴 **A slicer showing NUMBERS stored as TEXT needs a numeric sort column** *(the Week box showed `27, 28, 29, 3, 30` — the slicer's counter
could not order two-digit numbers)*. Labels like `CurrentWeek` / `27` sit in a text column so Power BI sorts them as text. Add a hidden numeric column
computed in the SQL partition of `Dim_Date` **by exactly the condition producing the label** (special labels = 0, the rest = the week number) then declare
`sortByColumn` — each label exactly one number, so it is valid even though the column repeats across years. Done: `IsCurrentWeek → IsCurrentWeekSort`,
`SortWeekToDate → SortWeekToDateSort` (4 ABC models, Classic + White sharing the backend). Numbers with a leading zero (`MonthNumber` `01`)
do not need it. Gate `slicer-sort` on the engine layer: reads the real values of every text column feeding a slicer without a `sortByColumn`;
≥ 2 numeric values whose text order ≠ numeric order ⇒ red (tested red 01/10: caught exactly the 2 columns above, `IsCurrentMonth` not falsely reported).

🔴 **The filter panel keeps Ori's REFRESH BUTTON** *(the filter lost the original refresh button from Ori)*:
the image `BT_ClearFilter` in `Filter_Panel`, placed at `240,20` size `40x40` (the title's right corner), icon `refresh_2_white`,
tooltip `Clear All Filters`, pointing at the bookmark `<NN_Page>_ClearFilter`. That bookmark **captures only the Data** of the panel's
slicers (`suppressDisplay` + `applyOnlyToTargetVisuals`, targets = every slicer of the panel) ⇒ clicking puts the slicers back to
the page's defaults (Year = Current Year, the rest All), **the tab unchanged, the filter panel still open**. Slicer states are written
by Desktop's mould: a visual filter (`howCreated 1`) + the slicer's selection as a `Categorical` filter (`howCreated 0`,
no `filter` = nothing selected). The button follows the `FILTERS PANEL` title in every other bookmark of the page.
Command `mix_builder.py --clear-filter` (rebuilding a page runs it); gate `clear-filter` watches **every report with
a filter panel, every tier** — XYZ's files show it when the gate runs.

🔴 **Everything in the filter panel sits ABOVE the background `BG_FilterPanel` (z = 0)** *(the first filter box lost its label — 60 labels/boxes/buttons
on 15 pages had z ≤ the background, and with equal z Desktop draws at random)*. Command `--panel-title` sets the background to z = 0; gate `panel-title`.

🔴 **The big title `FILTERS PANEL` must sit ABOVE the filter panel background**: the Red copy places it at `y=20`,
`z` higher than `BG_FilterPanel`, left margin 10. White had `z=0` under a background at `z=2000` so opening the filter panel lost the text. Command
`--panel-title`, gate `panel-title`. The Weekly mould has been fixed so rebuilt pages copy it right.

🔴 **Selection boxes (slicers) follow exactly ONE style, the Red copy's** *(the filters did not match the new colours, nor each
other)*: box background `#E8E8E8`, text `#2D2D2D`, frame `#E8E8E8`. The Legacy colours (`#ECDBDD` pink,
`#AC222C` red, `#558563` green, `#F3CAE4` of MCP) all dropped. Command `--slicers`, gate `slicer-style`.
🔴 **Every word of the frame is ENGLISH, only the data is Vietnamese** *(everything standardised to English, because the DW delivers
its data in English too; only the content inside is Vietnamese, columns are standard English)*: page names, tab names, visual
titles, column / legend names, measure folders; data values (item names, team names 'Sale Nhà Hàng') stay as they are. Short names, nouns, no
verbs ("Bán ..."), stating exactly the page's purpose. Gate `ui-english` (checks page + tab names now; titles / columns: round 2).
🔴 **Filter boxes turn OFF the slicer header** *(the filters broke and could not be used)*: `objects.header.show false`. With the header on in a 40 px box
only the header text line remains ("Month", "Year"), the dropdown pushed out, clicking selects nothing — the box's name is the job of the label above. Command
`--slicers`, gate `slicer-style` (tested red 12/10: 14 boxes of DR White). A slicer copied from Legacy keeps a `header` block with font/colour but NO `show` ⇒ ON by default, the field name printed a second time in the box: gate `slicer-header`.
🔴 **A comparison month = ONE "Compare With" slicer on `Parameter_Date[Year Month]`** *(13/10: with two year selection boxes, which one
do you choose? it reads as from year to year)*: Legacy's Year + Month slicer pair reads as "from … to …" ⇒ merged into one, keeping the selected
month; the comparison columns are named by it (`Compare Month` · `% Revenue Compare` · `Change` · `% Change`, NOT `Base`/`Variance`). Two slicers
on the same column each filtering its own chart (01 Total Bill On Month) ⇒ named after the chart (`Month A`/`Month B`), never two boxes with the same name. Gates
`compare-month` + `slicer-unique` (two boxes with the same shown name, or the same column name in two tables, are red).
🔴 **Filter panel slicers follow each other at a fixed step of 65 px** (label 20 + box 40 + gap 5) *(13/10, 01 Product: the new filter
had an empty row)*: dropping / merging a slicer pulls the boxes below up, never leaving an empty row. Gate `filter-rows`.
🔴 **A "not blank" filter on a NUMBER column excludes only `null`** *(13/10)*: the two Kimball labels `'Unknown'`/`'Not Applicable'` are TEXT — put on a number column
(Year) they make a dead slicer "CONTAINSROW does not support comparing values of type Text with values of type Integer". `not_blank_filter`
reads the column type from the model; gate `literal-type` blocks every filter value of a type other than the column's (text on numbers, the number `5L` on a text column `'05'`), in both the `In` form and
the comparison form `Not(column = 'Unknown')`. Bulk fix: `scripts/fix_literal_type.py` (dry run first, `--apply` writes).
🔴 **No data visual is hidden in EVERY state while its background frame shows** — an empty frame, the reader sees "a missing
dashboard". A visual follows exactly the state of the `BG_` in the same group in each bookmark. Gate `dead-visual`.
🔴 **Every table / matrix fills its frame: Auto-size behaviour = Grow to fit** *(compared with the total size of the group holding it)*:
`columnHeaders.autoSizeColumnWidth true` + `columnAdjustment 'growToFit'` (the mould read from Desktop itself) — Desktop widens the columns to fill
the frame with however many data columns appear; never set widths by hand (a Month × Channel matrix: the DW has 5 channels, this period 3 channels have figures ⇒ counting columns
first is wrong). Command `mix_builder.py --grow-to-fit`, gate `narrow-table`. Exception: tables measured on the engine with `matrix_fit.py` (auto-size off + a width for every measure, §5l-quinquies) — `narrow-table` · `header-wrap` skip them, the engine-layer gate `matrix-fit` holds them.
🔴 **Changing the header text (report name / page name) ⇒ run `--fit-header` again** *('Franchise' cut to 'Fra' on many pages — renaming in place kept the frame of the old name 'NQ', 40 px)*: the report-name frame = grid5(text + margins), the page name appended right after, the Title group ending at the end of the page name, the page-name frame = text + 20 px (`NAME_SLACK` — Desktop leaves space inside a text frame; 14/10 a frame tight to the text, 100 px, showed 'Overvie', 120 px showed it all). Gate `header-text` runs on EVERY page (before only on strict pages ⇒ slipped through) and reports when the Title group touches the tab strip.
🔴 **A long column header ⇒ 2 lines, the formula switches by itself** *(a title that long must be cut into 2 lines … in every table, any table
with long titles switches formula automatically)*: Grow to fit puts EVERY header on ONE line (an item name 300 px for one column). A table with a header > 150 px
(`HEADER_WRAP`) ⇒ auto-size off, fixed widths by `pbi_gate.column_plan`: a header > 80 px = half the text + 20 (2 lines), measures ≥ 70,
the item-name column keeps its existing width (default 400 — names in the DW run to ~700 px, wrapping by themselves); a total short of the frame is widened evenly to fill it.
A matrix with a Columns field (headers taken from data) stays Grow to fit. The same command `--grow-to-fit` picks the formula; gate `header-wrap`
(tested red 14/10: the E-Commerce Conversion table).
🔴 **Long item names ⇒ the name column = half the longest name + 20, 2 lines** *(long product names should be split in two, halved so they do not push the other columns too wide)*: the longest name measured from the DW (reading the Dim's column directly, only rows with `IsActive = 1` when the Dim has that column — 19/10: filtering through the fact hung the DW for over 30 minutes on `Fact_SaleDetail` and held locks blocking the load job), at the font size of rowHeaders; > 300 px (`ROW_WRAP`) ⇒ write `columnWidth` for the name column — Grow to fit still keeps the written width. **Every text column fits exactly, no slack** *(a column must not have slack, it must fit the text exactly — an 8-character code column was 366 px)*: = max(the longest text in the DW, the header) + 20; only a **Stepped** matrix layout (levels stacked in one column) shares one width — Tabular / Outline give each field its own column. The same command `--grow-to-fit`; gate `row-wrap` (dw layer) reports both slack and shortfall.
🔴 **Two lines = split by WORD, never 3 lines, never cutting inside a word** *('Month Numbe r' … two lines spilling into 3 is not allowed … never leave a line holding a single letter)*: the 2-line width = `pbi_gate.wrap_width` — the split point between two words giving the shortest longest line, never smaller than the longest word (a raw half of the text gives 3 lines / cuts 'Numbe·r'); data names measured on the 30 longest names in the DW (including every name as long as the 30th — a plain TOP 30 picks differently each round, flipping the gate red/green). A matrix with a Columns field: that field's name shows in the CORNER cell above the LAST row column ⇒ that column also holds this name; give it a readable label (`MonthNumber` ⇒ `Month`). Gates `header-wrap` · `row-wrap`.
🔴 **Visual titles: ONE font, ONE way of writing** *(where is the bold check on titles? missed again — and no mixing of ALL CAPS and capitalised words at random, the one standard is a capitalised caption)*: font **Segoe UI Semibold** 12, left-aligned (no font declared = the theme's plain Segoe ⇒ a thin title); text **capitalising the first letter of each word**, no word in CAPITALS except business abbreviations (`TITLE_ACRO`: NQ · DT · B2B · POS · VAT · MTD …), English connecting words (by · vs · of …) in lower case; the terms `Sell In` / `Sell Out` stay as they are. Command `mix_builder.py --title-style`. Gates `title-font` + `title-case` (White/Red — NOT Classic, see pbi-classic) — **the same names, the same logic as the department repo** (ABC has had them since 12–13/10) so that when ABC merges the standard there are not two rules doing the same job.
🔴 **A matrix taking its column headers from data is 2 lines too** *(this page must follow the 2-line standard — why are the columns so long?)*: a field in Columns with long names (items…) ⇒ the number columns' width = the longest name in the DW split into 2 lines by word + 20, divided evenly among the number columns under one header, each column ≥ 70; short names (months, days, codes) stay Grow to fit. `--grow-to-fit`, gate `row-wrap` (dw layer).
🔴 **Measure columns (numbers, %) of a table with a column field: fit exactly the longest bold text, one shared width, headers wrapping to 2 lines by themselves** *(21/10, measured on a table the owner adjusted by hand: 72.7 px = the longest bold text of the Total row `17,638M` 54.7 px + padding 18)*: numbers and % in cells never wrap; a long header (`% Sell In / Sell Out` 116 px on one line) wraps to 2 lines so the whole table narrows, never a reason to widen the column; every measure column of a table has the same width (difference ≤ 4 px). Gate `measure-fit` watches both directions on columns with a fixed width: smaller than the minimum for the format (`999.99%` for %, `9,999M` for numbers, bold text + 18; real cells are longer than this, never shorter) or differing by more than 4 px ⇒ red. Columns without a set width the gate skips (Grow to fit, or adjusted by hand in Desktop); widths adjusted by hand stay as they are.
🔴 **Column headers taken from data: ONE shared width, balanced over 2 lines** *(group the two lines so they are about equally long)*: Power BI keeps ONE width per value column for every member (Desktop stores `columnWidth` per measure, not per member) ⇒ each name cannot be balanced. The figures of this kind of column are usually short (NQ items: the largest 78,303 = 59 px) so the header takes extra lines instead of stretching the column *(the column width was absurdly long … with small figures there is no need for long titles — chosen at most 3 lines: 270 → 195 px)*. The standard = `balanced_width`: the smallest width at which every name fits `MEMBER_MAX_LINES` = 4 lines (≤ 2% may take 5; 3 lines still leave the width too wide), never narrower than the longest word, never under 70; measured on EXACTLY the names the visual shows (DAX `FILTER(VALUES(field), NOT ISBLANK(measure))` through `scripts/pbi_engine_query.ps1`). Command `mix_builder.py --member-width` (the report must be open in Desktop); the dw-layer gate only blocks the range 70 … enough for every name in the DW. Do not report a figure estimated from a sample (14/10: a sample of 200 names gave 230, the real set of 248 names gave 265).
🔴 **A detail table is not squeezed for charts with little information** *(3 charts … while the table below gets squeezed small? that makes no sense, why not split it out)*: a page with number cards + several charts + one big detail table ⇒ split into tabs (Summary = cards + charts, Detail = the table the full height of the tab; `card_tabs: (0)`, the view-switching button kept inside the table block through `switch_block`). The tab area is 675 tall.
🔴 **Field parameters: `groupByColumn` + the selected values must be real** *("Something's wrong with one or more fields ... Parameter_PhanTichTheo" and then an empty table)*: the display column of the parameter table carries `relatedColumnDetails / groupByColumn: 'Parameter Fields'` (missing ⇒ Missing_References); renaming the measure table (`Measure` → `#Measure`) means fixing the filter box values + the preselecting bookmarks too (`'''Measure''[Số lượng]'` → `'#Measure'[…]`) — an odd value selects no field, the number boxes go empty. Gates `param-groupby` · `param-value` (tested red 14/10: 7 places in Franchise White). A technical error ⇒ fix Classic too.
🔴 **The Overview page always comes first**: a report with an `Overview` page has it as page 1 (and the opening page). Changing the page order ⇒ run `--measure-folders` + `--renumber-bookmarks`. Gate `overview-first`.
🔴 **Tab names capitalise the first letter of EVERY word** *(no mixing of 'Tổng quan' with 'Nhân Viên' at random)*: `Sales Rep` · `Monthly` ·
`Items` — the tab, its copy in bookmarks, the Glossary line and `mix_specs` carry the same text. Capitals are wider ⇒ measure the tab widths again. Gate `tab-case`.
🔴 **A word belongs to a PAGE or a TAB, never both** *(the Overview page had an Overview tab — the word overview needed a ruling: page
or tab; settled: Overview is a PAGE)*: the first tab of every page = `Summary`; a tab name never equals any page name (case-
insensitive). Gate `tab-page-name`.
🔴 **Order: the sort field must be inside the visual itself; category bar charts sort from largest to smallest** *(it must be ordered
from high to low)*: changing a chart's measure changes its `sortDefinition` too — a sort by a measure no longer in the chart makes Desktop drop
the sort, the bars come out jumbled. Gate `sort-order`.
🔴 **Revenue against target = 3 columns SIDE BY SIDE, the same width: `-VAT` · `+VAT` · `Target`** *(a stacked "Revenue + Shortfall" column was tried and
dropped — one column like that looks even smaller … each chart 3 columns, the sizes must be equal; column names by the business, "+VAT" and
"-VAT" for brevity)*: `lineClusteredColumnComboChart`, Y = `#Revenue Net` / `#Revenue With VAT` / `Target`. The target NEVER stacks
on revenue (a stacked column adds two figures that cannot be added). Gate `target-stack`.
🔴 **Charts on one row = the same column width, the same legend** *(the horizontal size of the columns must be consistent)*: the same `categoryAxis.innerPadding`,
the legend on or off for all. An axis that is on but has text in the background colour (white) is turned off. Gates `row-uniform` · `axis-invisible`.
🔴 **Block titles made of textboxes: top/bottom padding = 0, height ≥ 1.5 × the font size** *(a title must have no padding on top … the end of the title
had a grey lump)*: a textbox's default padding pushes the text down ⇒ 12pt in 25 px gets its lower half cut and shows a grey scrollbar at the end of the box.
Set `visualContainerObjects.padding` top/bottom/left/right `0D`; 12pt ≥ 24 px · 11pt ≥ 22 px. Gate `title-padding` (textboxes < 40 px).
🔴 **Legend / series names = the field NAME, NO explanation in parentheses** *(nobody asked for the legend to open parentheses … explaining is
what the Glossary button already does)*: `Sell In (Bán NQ)` → `Sell In`. The explanation lives in the Glossary. Gate `legend-plain`.
🔴 **Number labels do NOT overlap** *(do not let figures overlap like this)*: a column/bar chart needs (width − 50) ÷ (groups × series with labels) ≥ 52 px
per label. Not enough room ⇒ labels for ONE series (the actual / main figure), the other series `showSeries false` (still with columns + tooltips) — no squeezing the text,
no rotating. Gate `label-overlap` (tested red 12/10: 3 quarterly charts 281 px + Sell In 360 px).
🔴 **ONE size, NO header bar, NO nested frames** *(errors everywhere: clicking makes it get covered, the box sizes are wrong … hovering
makes all the text disappear)*: measured 01/10 White AM had **9 styles across 77 boxes** — text 9 / 10 / 13 /
14 / default, a 93% transparent background frame around a smaller box, `visualHeader` on (hovering lays the header bar over the text).
The standard: `items.textSize 10D` (Red's default) · `visualContainerObjects.background.show false` · `visualHeader.show false` ·
border `#E8E8E8` 1 px · `pendingChangesIcon` off. The same command `--slicers`, the same gate `slicer-style` (tested red: 77/77 → 0).

🔴 **ONE SHARED FILTER SET, SYNCED BY PERIOD KIND** *(should the filters be one shared set for every page and tab? a filter per page
is confusing → chosen "a shared set + sync", scope "by period kind")*:
- **The order on every page:** `Year` · `Month` · `Area Manager` · `District` · `StoreName` · `Channel`, then the page's own boxes (Week,
  Day, Metric, programme, MonthNumber…). A page without some period drops that box, keeping the order of the rest.
- **Location boxes** (`AreaManagerShortName` · `District` · `ShortName` · `ChannelGroup+ChannelNameStandard`) are on **every page with
  a filter panel** — missing ⇒ copied from the box with the same field on Monthly, selection dropped. Exempt with a reason: `Channel` on MCP and Power Consumption
  (P&L, electricity cost: no channel dimension). Equivalent fields count as present, not synced: `Dim_Store.AreaManager` (MCP),
  `ChannelType+ChannelName` (DSR).
- 🔴 **Every fixed, low-cardinality classifying dimension by which the page's figures can be cut has a filter box** — a text column of a Dim with 2–40 business
  values in the DW (not counting `null` / `'Unknown'` / `'Not Applicable'` / `'#NA'`), not a technical column (codes, tax, accounts,
  status, contacts, notes). The department declares its own set in `filter_set` (`config/pbi-gate.json`) after the location keys; a low-cardinality column
  not taken has its reason written. Before placing a box, measure which facts of the page it reaches (relationships + the measures' DAX): a box filtering only
  part of the figures without saying so is wrong. Same meaning as an existing box ⇒ keep the existing one, change its label + attach the sync, never a second box. The machine does it:
  `scripts/add_filter_set.py`. The machine watches: gate `filter-set`; a whole-repo scan: `pbi_gate.py --audit`.
- 🔴 **Every filter box allows multiple values and has a "Select all" row** (`objects.selection.selectAllCheckboxEnabled = true`, no
  `singleSelect` / `strictSingleSelect`) — a box without a way to select everything leaves the reader stuck on one choice; period boxes (Year / Month) still preselect
  `Current Year` / `Current Month`. The only exemption: field parameters (`Parameter_*`, one field at a time). Gate `select-all`.
- 🔴 **One filter box = ONE way of grouping** — a box's values must not be values of another box in the shared set (a Team Leader box listing the channel
  "E-Commerce" among people's names mixes two groupings). Fixed in the data: each column keeps one grouping (channels in the channel column, team leaders only
  people); values that must stay but do not belong to the box (members with no rows) are declared `exclude` for the box's item in `filter_set`,
  with the reason — `scripts/add_filter_set.py` puts them into the box's "not blank" filter and into every bookmark capturing the box. Gate `filter-mixed` (dw layer,
  compared with the `filter_set` vocabulary of the whole repo).
- **Syncing** = `visual.syncGroup {groupName: 'FilterSet_<Key>', fieldChanges: true, filterChanges: true}` (the mould Desktop writes,
  13 Combo/other boxes). `Month` is **only** on monthly pages (Monthly · Daily · Product · Product Mix · Operation · DSR) — NOT
  added to Weekly / Executive: Month defaults to `Current Month`, forced onto Weekly it leaves Weekly only the weeks of that month. Promotion /
  Combo / MCP pages keep their own period boxes (`DateKey`, `MonthNumber`, `Year`) at the end, not synced with Year/Month.
- 🔴 **The month box: select `Current Month`, NEVER a fixed month · Monthly stands OUTSIDE the sync group** *(after
  looking up the common practice)*. A Power BI slicer "sticks" to its value at Save: the Save of 04/10 02:20 wrote `'09'` ⇒ 6 pages of White AM stood on month 9.
  The column `Dim_Date.IsCurrentMonth` labels the month with the latest sales (`MaxSale`) with the text `Current Month` ⇒ selecting that label makes the page roll over
  to the new month by itself. The **Monthly** page by Legacy **selects no month** (4 monthly charts show the whole year) so it is **not** in
  `FilterSet_Month` — syncing would make it take a month from another page. The exemption list: `pbi_gate.FILTER_UNSYNCED` (one source,
  `scripts/add_filter_set.py` reads it back). Gate `filter-set`: a synced month box other than `'Current Month'` ⇒ red · Monthly still synced or
  preselected ⇒ red (negative test 05/10: planted 3 ⇒ exactly 3 red). Ori has no "current" (a date-range slicer `Between`); the **Date Picker** slicer
  (GA 08/2026, anchored "Last date") is a direction to try later — the owner builds a sample in Desktop first; it cannot do ABC's Friday weeks.
- 🔴 **'Current …' is the NEWEST period in the list — the box's label and its filter use ONE SHARED date anchor.** A period box with a member
  'Current Month' / 'Current Year' / 'Current Week' has no other member holding a date after the last date of the member
  'Current …' (under the box's own visual-level filter). The typical failure: the label 'Current Month' computed from one anchor (the month closed in the books)
  while the flag column filtering the box (`Flag_is_use`, `DateWithSale`…) is computed from another (the largest month with figures) ⇒ the box shows 'Current Month' and
  still has a month after it — meaningless. Fix: the label and the flag take the SAME anchor expression (in the SQL partition or one column).
  Wanting to open on a period other than the newest by default is a presentation decision, ask the owner — never split the anchor. Gate `slicer-current`
  (engine layer): for each box on the date table, count members other than 'Current …' with `MAX(date)` > the last date of 'Current …' ⇒ > 0 is red.
  Use `MAX`, not `MIN`: a month member merges several years ('10' = 10/2025 + 10/2026), the first date hides the part beyond.
- **One geometry:** label 20 + box 40, a step of 65 from `y = 65` ⇒ at most **10 boxes**. The old copy shrank boxes by the number of boxes (`step − 30`): Product
  with 10 boxes had 34 px while a page with 6 boxes had 50 — exactly what the owner called "the box sizes are wrong".
- 🔴 **A label must belong to the box right under it** *(Daily's Day box sat under the label "Area Manager")*. `--filter-set` added location boxes
  **without labels**, then `panel_layout` paired labels by position ⇒ the old labels slid onto the next box: Combo "Monthnumber" over the Area
  Manager box, Power "StoreName" over District, Promotion "DISCOUNTNAME" over Channel (11 labels across two Whites). Gate `panel-label`: a label
  must match the box's field name (or an equivalent name in `PANEL_ALIASES`: Month ~ IsCurrentMonth, Area Manager ~ AreaManagerShortName…).
  Adding a box ⇒ **add its label at the same time**.
- Operation once had **two Week boxes** (`SortWeekToDate` filtering Week + WoW, `IsCurrentWeek` filtering only WoW) ⇒ keep `SortWeekToDate`.
- **The machine does it:** `scripts/add_filter_set.py` (adds box + label + syncGroup, fixes bookmarks) → rebuild the page (the builder orders by `filter_rank`) or
  `--panel-layout` for pages without a spec (Monthly). **The machine watches:** gate `filter-set` (missing box · wrong order · not synced ·
  a box other than 40 px). Tested red 01/10: AM 145 / OM 180 errors → 0.
- ⚠ A trap paid for while doing it: changing the label height made the builder unable to find the label mould on Weekly (`StopIteration`) ⇒ every page
  built after Weekly broke silently, because the bulk command only filtered "Error" lines. In a bulk run, **count the pages built**.
`options.suppressData = true` for every bookmark that only switches showing/hiding.

🔴 **The old rule saying "a hidden PARENT group makes a bookmark opening its child pointless" — MEASURED AGAIN, IT IS WRONG.**
`Red` does exactly that and still works: the group `Tab2` `isHidden=true`, its children `isHidden=true` too,
the bookmark `MCP_Tab2` turns the **children** on and **does not touch the group** in `visualContainers`.
The reason: **groups have their own place in a bookmark** — see `visualContainerGroups` in §5b. Whichever group closes/opens
is declared there; `isHidden` in `visual.json` is only the state at save time, not a shackle.

## 3e. TABS — copying the original mould's "page switch button"

> Replaces §5 below for *how to build*: the real mould was found, no longer "self-built".

**Position:** tabs sit **in the header**, anchored **from the RIGHT**, right next to the ⓘ button. Measured on the AM copy: the ⓘ button
(`BT_OpenGuide`) at `x=1195` ⇒ the last tab ends at `1180` (gap `15`).

**The original mould — each page switch button is 2 stacked images + 1 background shape:**
```
image BT_<Name>_Off              the normal state
image BT_<Name>_On    <- action  the selected state
shape tabRoundTopCorners 55x50  a rounded background, SHOWN only on the selected tab
   tileShape = 'tabRoundTopCorners'
   tabRoundCornerTop = 0 · tabRoundCornerTopRight = 1 · tabRoundCornerBottom = 20
   fill    = ONE coloured item (NO second item 'show:false')
   outline = show:false
   vcObjects = only title + lockAspect  ->  NO 'background'
```

🔴 **Three things making a tab "ignore shape edits", all three paid for:**
1. `objects.fill` with **a second item `show:false`** ⇒ the shape is **invisible**, rounded corners or not.
2. `visualContainerObjects.background.show = true` ⇒ you are looking at **the container's RECTANGULAR background**,
   it **does not follow the tab shape** — no amount of corner rounding helps.
3. Setting both `tabRoundCorner* = 100` **and** `tabCutCornerSnipSize = 999` ⇒ the two properties fight.

**The owner's design intent (2026-09-23):** the **open** tab is painted **the same colour as the content area background** to give the
feeling that the tab wraps the part below; **off** tabs are a little lighter.

⚠ The label text goes in the shape's `objects.text` (centred), **not** in `visualContainerObjects.title`
— so it follows the tab shape. (`title.text` is for **the name shown in Selection**, see §3c.)

### 3e-bis. WHITE TABS — the standard the owner adjusted and SAVED *(2026-09-24)*

**Tabs have ONLY TEXT, never an image.** The owner fixed it in Desktop and saved, and exactly that copy
is the standard:

```
shape  tileShape='tabRoundTopCorners' · Top=25 · TopRight=20 · Bottom=0
text   fontSize 12 · bold · centred        <- "large text"
ON  (open)    background ThemeDataColor(0, -0.1)  ~ #E6E6E6, THE SAME as the page background #E8E8E8
              text ThemeDataColor(1,  0)           = #2D2D2D
              y=0 · h=45 · padding.top=5   <- sticking up higher, as if attached to the content area
OFF (off)     background ThemeDataColor(0, -0.2)  ~ #CCCCCC
              text ThemeDataColor(1,  0.4)         = dark grey      <- the owner calls it "dark grey"
              y=5 · h=40 · padding.top=0
```

🔴 **Each tab is TWO stacked shapes `_On` / `_Off`**, both pointing at **the same** tab bookmark; the bookmark
flips which one shows. A bookmark **cannot capture colours**, so changing colours by state **has only this way**.

🔴 **THE INVARIANT: each `_On`/`_Off` pair has EXACTLY ONE showing.** Both showing makes the owner
see **two tabs on at once** — exactly the bug the owner once reported. The page default: **tab 1 `_On` shown, tab 1
`_Off` hidden, tab 2 `_On` hidden, tab 2 `_Off` shown.**

🔴 **`<Page>_Main` must MATCH EXACTLY the default tab's bookmark** — it is both "back to the page's original state"
and "tab 1 on". The two differing means after pressing Reset the wrong tab shows.

⚠ **A Save in Desktop FLIPS this pair back.** Desktop writes **the state being viewed** as the page default;
when the owner opens the file without clicking any bookmark all 4 shapes show, one Save and **all 4 go into the file with
a clean `isHidden`**. Hit for real: 4/4 tab shapes back to `isHidden=false`. ⇒ **After each Save by the owner, check
the `_On`/`_Off` pairs again before going on** — never trust that the state you wrote last round is still intact.

🔴 `ThemeDataColor.ColorId`: `0` = `background` · `1` = `foreground` · **`2` = `dataColors[0]`**, `3` = `dataColors[1]` … `9` =
`dataColors[7]`. *(Fixed 01/10 — the old version saying "`2` = secondary background · `3` = `tableAccent`, data colours only from `4`" was WRONG: measured on the
Original sample file, a card with `ColorId 6` shows `#13678A` = `dataColors[4]`; by the old version it should have been the green `#199900`.)* A negative `Percent` = darker, positive = lighter.

## 4. The card row — `cardVisual`, the icon INSIDE the visual

- 🔴 **The icon is a `ResourcePackageItem` pointing at a local PNG — NOT a measure.** The old ledger said it pointed at measures
  of the `~URL_*` family; measured on the original mould that is **wrong**, following the ledger produced 6 useless measures.
- 🔴 **The old `card` and `cardVisual` have DIFFERENT query schemas** — `queryState.Values` ↔ `queryState.Data`.
- ⚠ **Do not lay a separate picture over an old `card`** to fake an icon: the picture is small, off, the label must be built with a separate shape
  because the old `card` draws *figure on top — label below*. Rejected by the owner twice.
- 📌 The full JSON mould + icon size by card size: [`reference/measured.md`](reference/measured.md) §1.

### 4b. CARD DESIGN — simple, NO border

```
card background #FFFFFF        rounded corners 12
border          NONE           (border.color = #FFFFFF, not an accent colour)
page background #E8E8E8        so the cards stand out
icon            INSIDE the card, on the LEFT, ONE colour per card
```

🔴 **Do not add coloured borders on your own.** The first version had `border.color = #C51E24` ⇒ 6 cards with red borders, rejected by the owner.

**Card colours come from THE CLOSED COLOUR TABLE (design.md §1.1), assigned by MEANING, not by eye:**

| Card | HEX | Basis in the table |
|---|---|---|
| Revenue | `#3D7EBF` | series 1 — the **revenue** group |
| Target | `#C51E24` | Primary Red — the accent colour |
| TC | `#2E9C7A` | series 3 |
| TA | `#D2792F` | series 2 |
| GC | `#5A5FA8` | series 4 — a composite indicator |
| GA | `#136C99` | Hierarchy Blue |

⚠ **The colour table is a CLOSED LIST** — a colour missing ⇒ **ASK**, never mix one yourself.

🔴 **AN UNRESOLVED CONFLICT — may the figure in a card be coloured?**
The sample picture the owner gave has **figures coloured by card**. But design.md §1.3 says
*"EVERY text on a light background → `#2D2D2D`, no exception"*. Currently **only the icon is coloured, the figure stays `#2D2D2D`**.
To colour the figures **the standard must first be changed in the region manager repo**, never broken silently.

### 4c. THE `cardVisual` KEY SET — copied whole, a missing cluster makes the layout jump

The mould measured on the standard card of `Red` (`.../b3ad2f4c.../4f2c0e7c73d84cd89db3`). **Without the `layout` cluster
PBI falls back to the default layout** — then editing `value.bold` or the icon position does nothing:

```
objects.layout   [ {style:'Cards'} ,                       <- a NORMAL item
                   {backgroundShow:false, rectangleRoundedCurve:25L}@default ]
objects.spacing  { verticalSpacing: 0L }@default
objects.padding  { paddingSelection: 'Narrow' }@default
objects.label    { show:true, bold:true, position:'aboveValue', fontColor }@default
objects.value    { show:true }  +  { bold, fontSize, fontColor,
                   horizontalAlignment:'left', transparency:0D,
                   textWrap:false, showBlankAs:'No Data' }@default
objects.image    { show, image{name,url:ResourcePackageItem,scaling},
                   position:'Left', size, padding, imageType:'image' }@default
accentBar · grid · divider · referenceLabel{Title,Value}   all show:false@default

visualContainerObjects.padding   { left:10D, top:5D, bottom:5D }   <- NOT 0 on all four sides
visualContainerObjects.visualHeader { show:false }
```

🔴 **`image.imageAreaSize` LIMITS THE WIDTH of the picture column — without it the icon swells over the whole card.**
The White copy's `150×90` card: `imageAreaSize 18L · size 8L · padding 4L`. The icon anchors at the start thanks to
`position:'Left'` **plus** a non-zero `visualContainerObjects.padding.left`.

⚠ The card is only `150` wide ⇒ **every pixel of the picture column eats straight into the label**. A slightly bigger icon cuts `REVENUE`
to `REVE...`. Changing the icon size ⇒ **look at the longest label again** before reporting done.

🔴 **Frame padding 0 on all four sides ⇒ the content sticks to the edges**, looking as if the icon was dropped loose. Red uses
`left 10 / top 5 / bottom 5`.

⚠ **The `%` with the value:** the White copy has the `%` as **a separate old `card`** laid over the card, not a
reference label. To have it *"beside the value"* place it level with the card's value strip
(a `150×90` card ⇒ the `%` at `x=95 y=50 w=52 h=22`). **`referenceLabelLayout.position` is not yet used for
a "beside" style** — across all 4 reports of the repo only the value `'below'` could be read, no real file yet
proves the name of the other value, and **guessing value names is exactly the habit that breaks files**.

### 4d. THE KPI CARD MOULD — measured on a sample the owner BUILT THEMSELVES *(2026-09-24)*

The owner built the `Revenue` group in Desktop and saved it ⇒ **that is the mould, copied for the other 5 cards**.
Child coordinates are **relative to the group**:

```
group  <Name>                x=X y=0  w=150.47759000734754 h=105.28655400440853 z=2000
  Card_<Name>  cardVisual   x=0 y=0  w=150.47759000734754 h=90.28655400440853  z=2000
  Pct_<...>    card (old)   x=5 y=70 w=100                h=25                 z=1000
  BG_<Name>    shape        x=0 y=15 w=150                h=90.286554004408529 z=0
        tileShape='rectangleRoundedByPixel' · rectangleRoundedCurve=12L
        fill@default = ThemeDataColor(0,0)  (white)
```
⚠ **`Card_` and `BG_` are offset by 15px on the y axis** in the original sample — keep it, do not "straighten" it.
The card row sits in the strip `y=15..105`, matching `RevenueByChannel` beside it.

**Cards NO longer use icons** — `image.show=false`, **keeping the picture object**
so it can be turned back on. Instead **the value's text colour = the old icon's colour**:

| Card | old icon | measured from the PNG | used |
|---|---|---|---|
| Revenue | `kpi_revenue.png` | `#3878B8` | `#3D7EBF` |
| Target | `kpi_target.png` | `#C01820` | `#C51E24` |
| TC | `kpi_tc.png` | `#289878` | `#2E9C7A` |
| TA | `kpi_ta.png` | `#D07828` | `#D2792F` |
| GC | `kpi_gc.png` | `#5858A8` | `#5A5FA8` |
| GA | `kpi_ga.png` | `#106898` | `#136C99` |

The six measured colours **match the closed colour table exactly** in §4b ⇒ no new colours mixed.
🔴 This **breaks design.md §1.3** ("every text on a light background → `#2D2D2D`") — the owner settled it verbally
2026-09-24; **the standard must be changed in the region manager repo**, see §4b.

⚠ A card holds only a label + value + `%`: **the label `label.fontSize=10D` bold `#2D2D2D`**, the value **`18D`** bold
left-aligned, the `%` is **a SEPARATE old `card`** placed under the value — separate so it can be edited.

🔴 **THE CARD FIGURE SIZE = `18D`, SHARED BY EVERY CARD**. The card is `150` wide
but the figure column holds only **~90 px**, because the picture column (`imageAreaSize 18L`) keeps its room even with the picture off.
Measured in bold Segoe UI: at size 20, `78.54K` = 86 px (fits) while `139.04K` = 101 px ⇒ the TA card showed
`139.0…` though the figure was correctly shortened to 2 decimals. Size 18 ⇒ `139.04K` ≈ 91 px.
- Changing the size changes **the whole card row on every page**, never lowering one card alone (a size off from the card beside it).
- Recent Desktop writes only one `imageAreaSize` value, `18L` ⇒ **do not guess another value** to widen the figure column.
- The `kpi-card` gate of `scripts/pbi_gate.py` reports red when `value.fontSize` differs from `18D`.
- **"Card" = a small figure box at the top of the page, NOT a chart**. The size-18 rule applies to
  **old-style cards** too (`card`, named `Card_*`, e.g. the 25-box grid of ABC Operation) — their figure sits in
  `objects.labels.fontSize`. `Pct_*` are old `card`s used as the % line under a card ⇒ **not** applied.

### 4d-bis. 1–3 SELF-MADE CARDS ARE DROPPED · LEGACY CARDS ARE KEPT, TOPPED UP TO 4

> Pages with 2–3 cards serve no purpose, drop the cards — this rule **applies only to NEWLY SELF-MADE cards**.

- **Cards already in Legacy are KEPT.** Rebuilt on the card mould of §4d, using exactly the measures the Classic copy reconnected, then
  **cards added up to a minimum of 4** with indicators that page already reads. Take measures already in the model, preferring a
  value + a `Pct_` period-comparison line pair like the ABC Operation grid.
- **Newly self-made** cards (Legacy has none) on a page with only 1–3 of them ⇒ **delete the whole `Card` group**, the Overview tab back to
  `y=15 h=660`, removed from bookmarks · `visualInteractions` · the Glossary.
- A Legacy card counts as **still present** while its id remains, or its measure (or a measure wrapping it, `= [X]`) shows
  on a card or `Pct_` line on the same page. Dropping one on purpose ⇒ declare it in `dropped_visuals` (§4i).
- 📌 **The 26/09 version applied it wrongly**: it deleted the Legacy cards of Daily Sales (3) · Executive (7) · Product Mix (3), then the model-trimming
  round also deleted `#Count Store This Month` and `%Total Cost Lt`. Rebuilt 27/09: Daily Sales 4 cards · Product Mix
  4 cards · Executive 7 cards, with the builder's `__cards__` item (§8); the two measures copied back word for word from Classic.
- Gates: `few-cards` (a page left with 1–3 cards) + `legacy-parity` (a Legacy card absent without a declared reason).
- 🔴 **EVERY figure box on EVERY page follows the KPI card mould — no old-style `card` grids remain** *(the card structure was not applied
  to every page either — can the checker not find that?)*. Measured 01/10: Operation 25 boxes + Promotion Increase Sale 12 boxes were still old `card`s, background colours
  outside the set (`#2BF23E`, `#730C0C`, `#34C7E1`) — the old gate did not look at the `card` kind. Now built with `__cards__` (a tab may have **several rows**:
  the second row placed at `y = 110`, group ids by `y`):
  - **Operation (the owner chose "2 rows, Gap into the % line")**: row 1 Revenue · Target MTD · Target · FC · ADS · Sale LM; row 2 TC · TA ·
    GC · GA · Same Store. One card per indicator, the % line = vs LMTD / of Target / FC vs LM / vs LY; the 6 absolute Gap cards dropped (read in the
    Month/MoM table); the one-row Same Store table became a card. Under the two rows: the channel donut + revenue by day (moved from the Day tab, that tab dropped).
  - **Promotion Increase Sale (the owner chose "6 promotion cards")**: 6 cards of the promotion part — Sale · TC (of Sales / of TC, shares, not coloured) ·
    TA · GA · GS (vs all = promotion / every bill − 1, a new measure in all 4 models) · GC (of GC). Whole-store figures dropped from the card row.
  - Gate `card-structure`: a `card` (except `Pct_` lines) on a shown page ⇒ red. Tested red on HEAD: 37 boxes → 0.

### 4e. WHICH TAB THE CARD ROW BELONGS TO

**The card row belongs to the "Overview" tab.** The "Detail" tab **has no cards** and takes **the whole** content
area. ⇒ the `Card` group must sit **INSIDE** the `Tab1_TongQuan` group, never outside it.

> This rule **replaces** the sentence of 23/09 *("the card row does NOT change with the tab ⇒ it sits outside the tab groups")*.

🔴 **The cards' 15px offset BREAKS the top edge of a tab without cards.** The `Card_*` box at `y=0` while the background
`BG_*` at `y=15`, so the card box **sticks up 15px above its visible part** and pulls the `Chart` group's edge up to `y=40`,
while the header is `50` tall.

| | edge inside `Chart` | absolute | |
|---|---|---|---|
| `Tab1_TongQuan` (with cards) | `y=0` | `40..715` | ✅ the first 15px are the **invisible** overhang |
| `Tab2_ChiTiet` (no cards) | `y=0` | `40..715` | ⛔ **covers the header** — |
| `Tab2_ChiTiet` fixed | `y=15` | `55..715` | ✅ `660` tall |

`660 = 320 + 20 + 320`, every figure divisible by 5. **A tab without a card row must make up the 15px itself** —
never take the edge of a tab with cards over to it.

**Every card must have a `%` underneath.** Choose the measure by **the DAX read**, not by the name:

| Card | `%` | DAX |
|---|---|---|
| Revenue | `%Revenue of Target` | `[#Total Sale]/[#Switch Target]` — the achievement rate |
| Target | `%Grow Sales of Target` | `[#Total Sale]/[#Switch Target] - 1` — over/under |
| TC · TA · GC · GA | `%Grow <X> vs LMTD` | `[#TM <X> Ld]/[#<X> LMTD Completed Day] - 1` |

⚠ The `%Grow … vs LMTD` family is **the only family covering all 4 indicators** — there is no `%<X> of Target` for
TC/TA/GC/GA. Never invent measure names by a pattern; **open `#Measure.tmdl` and read the DAX before assigning.**

⚠ **Chart title colour: `#2D2D2D`** (design.md §1.3). The Legacy copy uses `#3300FF` — copying it as is
is off-standard; 9 charts had to be fixed.

### 4f. 🔴 THE EVEN 5 GRID — the geometric law of the whole page

**Every gap on the page is exactly `5`. No `10`, no odd numbers.**

🔴 **AN EVEN SPLIT IS ABSOLUTELY EQUAL** *(when top and bottom are split equally the split sizes and positions must
be identical)*. The gap stays `5`; blocks split evenly have **the same size down to every decimal**, even when off the 5 grid:
2 blocks in a tab area 660 tall = `327.5 + 5 + 327.5` · 2 columns over 1270 = `632.5 + 5 + 632.5` · 4 boxes over 1270 = `313.75 × 4`.
**Never round and push the remainder onto one box** (`325 + 5 + 330`, `315 · 315 · 315 · 310`) — that is a difference the eye sees.
Measured 08/10: 33 pairs of `325/330` in ABC's White reports, 4 card rows of `315/310` + 3 pairs at XYZ. The machine watches: the rule `equal-split`; the exception
of `grid5` allows decimals only for a block with siblings of the same size, the block right after it, and what sits inside it.

```
canvas 1280 x 720 · header 0..50
content area   x 5..1275   y 55..715      <- a page margin of 5 on each side
```

| Gap | Equals |
|---|---|
| the outermost page margin | `5` |
| from the bottom of the header to the first block | `5` |
| between any two dashboard blocks | `5` |
| **a chart indented inside its own `BG_` frame** | **`5` on each side** |
| from the right edge of `BG_` to that dashboard's button | `5` |

🔴 **The "margin 10" trap: two nested layers both indented 5.** The `Chart` group is already at `x=5`, a child inside also at `x=5`
⇒ it comes out `10`. **The outer layer keeps the margin, the inner layer starts from `0`.**

**A `BG_` + chart block:** `BG_` at `(0, 0, w, h)`; the chart at `(5, 5, w−10, h−10)`.
A dashboard's buttons anchor at **the top right corner**: `x = w − 5 − button width`, `y = 5`; two buttons side by side `5` apart.

**The settled layout of page 1** (coordinates inside the `Chart` group at `(5,40)`):

```
Tab1_TongQuan (0,0,1270,675)          Tab2_ChiTiet (0,15,1270,660)
  Card            (0,  0,1270,105)      RevenueByStore      (  0,  0,1270,325)
  RevenueTrend    (0,110, 720,250)      RevenueDistribution (  0,330, 560,330)
  ChannelMix    (725,110, 545,250)      ChannelByMonth      (565,330, 705,330)
  OldStore        (0,365,1270,310)
card row: 6 x 150 gap 5  +  pie 340  =  1270
```

### 4g. TITLES AND LEGENDS — one size, all ANCHORED LEFT

```
title  : fontSize 12D · alignment 'left' · fontColor '#2D2D2D'
legend : axis charts 'Top' (anchored left) · donut/pie 'RightCenter'   <- 'TopLeft' is NOT valid
```
⛔ **No centring.** The Legacy copy gives each chart its own size (`9` · `12` · `13` · `17`) and centres them —
copying it as is drifts. 9 charts had to be reshaped.

### 4h. THE REPORT NAME IN THE HEADER follows THE SETTLED FILE NAME

The file is `ABC_02_STORE-REPORT-AM_Live` (Store Report) while the header still says `REVENUE` ⇒ wrong. **Renaming the file means editing the header
text too** — it sits in `visualContainerObjects.title.text` of the shape `TXT_ReportType`. The header takes only the
`<FUNCTION>` part, replacing `-` with spaces (`STORE REPORT`): **no** number, department code, tier or load-mode suffix
`Live`/`Scheduled` in the header (04/10, the file mould settled again 05/10).

### 4i. THE CARD ROW HOLDS ONLY CARDS

The `Card` group holds only **card groups**: a `BG_` background + a `cardVisual` or `Card_*` + a `Pct_` line. A chart, matrix or table
inserted into the card strip is **excess ⇒ dropped**. This decision of the owner **wins over** the complete-Legacy-visuals rule (§5k). A dropped visual
is declared by id in `dropped_visuals` in `config/pbi-gate.json`, **with the reason**; the `legacy-parity` gate skips exactly that id.
- Applied 27/09: Monthly dropped the pie `REVENUE BY CHANNEL` (revenue by channel group) from the card strip. The six cards spread evenly
  across the full width, `205/210` wide alternately, 5 apart. The channel mix can still be read in the `ChannelMix` donut right below.
- Gate `card-row`.

### 4j. EVERY % MUST STATE ITS COMPARISON PERIOD AND HAVE AN UP/DOWN COLOUR

A bare `55.73%` is wrong, because the reader does not know what it is compared with. Missing either of the two things below is wrong.

1. **The comparison period sits in the figure or in the label.** A `Pct_` line under a card has no label ⇒ put the period into the format:
   ```
   formatString: +0.00% "MoM";-0.00% "MoM";0.00% "MoM"
   ```
   **Do not change the source measure's format**: tables and chart axes use it too, changing it makes every cell carry the word `MoM`.
   Make a separate **wrapping measure** for the `Pct_` line, named by model.md §3:
   `%MoM <Indicator> with symbol = [<source measure>]`. Weekly pages use `%WoW …`; target ratios use
   `%<Indicator> vs Target with symbol` or `%<Indicator> of Target with symbol`.
   A page filtering the running month compares **MTD with the same number of days of the previous month (LMTD)**, never half a month with a whole month.
   The model's `%Grow … vs LMTD` measures already compute it that way.
   Old-style `Card_*` cards show the measure name as the label (`%Grow GA vs LMTD`), so the period is already in the label. Table columns and chart
   series likewise: the column name, the series name already state the period.
2. **Colour by direction, REQUIRED.** Up `#00B050`, down `#C51E24`. Painted with **conditional colour on THAT VERY measure**,
   or the measure it wraps: `> 0` green, `< 0` red. Target achievement ratios (`%… of Target`, `%FC vs LM`) take the threshold `1`
   instead of `0`. A % in one fixed colour (grey/black) is forbidden. The two codes `#009900` / `#FF6666` of the old Weekly mould are outside the colour
   table, reshaped and removed from the gate's `PALETTE`.
   - 📌 **An error caught 27/09:** 5 `Pct_` lines of Weekly showed `%Grow … WoW` but were coloured by `%Revenue of Target`.
   - Applies to **text**: `Pct_` lines, the figures of `Card_*` cards, chart data labels, a table's `values.fontColor`.
   - **Only two colours:** the yellow "nearly reached" band of target ratios (`#ACAC04`, `#A38600`, `#F1A1A1`) was removed,
     leaving only the main threshold (reached `≥ 1` green, below red). Pale cell backgrounds in tables (`values.backColor`: `#84F49E`,
     `#EAAEB4`…) turned into **text colours** by the pair above, the backgrounds dropped. Colour-scale backgrounds (`FillRule`, heat maps)
     are not up/down colours ⇒ kept. The builder's `--pct` command (`PCT_TWO_COLORS` in `mix_specs.py`).
   - **Share or cost-ratio %** (part of a total, with no good/bad direction: `%TC of Promotions`,
     `%Total Cost`) are declared in `pct_neutral` in `config/pbi-gate.json`, with the reason. The label must still say what it is a ratio of.

Gates: `pct-period` (a `Pct_` line without a label must have the period word in its format) · `pct-color` (conditional colour, the right measure, the right two codes).

3. **EVERY card in the card row has a % line** *(every card should have a % to be complete)* — a card without
   a `Pct_` line is an incomplete card. A card whose figure is itself a ratio (`% Target`, `% Margin`…) has a % line that is **the change against the previous
   period in PERCENTAGE POINTS**, format `+0.00 "pp MoM"` — never `%` a second time, because `+5.00%` of a ratio reads as
   "up 5 percent of the ratio". The same colour rule as item 2 (> 0 green, < 0 red).
   A figure where RISING is BAD (refunds, costs) has its % line **colours reversed**: up red, down green (`mix_cards.py`: `(measure, label, 'inverse')`).

### 4k. THE COLOUR SET = THE REGION'S THEME (`theme_file`)

> Over 6 rounds of trials on White AM on 30/09: too many dark colours, warm and cool unbalanced → the cards need the full colour set too →
> charts should use a pale set and cards the dark one → is there another set to use for charts → charts should not use
> colours overlapping the green and red tones → a more neutral colour for the columns, a darker green.

| Place | Colour | Rule |
|---|---|---|
| **Figures on cards** | the theme's colour slots in order (= the region theme's `dataColors`) | card *i* → slot *i*, cycling (01/10, replacing set B) |
| **A chart's main columns** | **exactly the `dataColors` sequence of the region's theme (`theme_file`)** | each chart one colour in order, the next chart in the tab continues the sequence; a second main column in the same chart takes the next colour (check which colours the owner's Original sample uses and use exactly that sequence — replacing the neutral sequence) |
| **Comparison periods** (names with LY · LM · LMTD · LW · PY · Last · Target) | `#A2A2A2` (= the region theme's `neutral`), the second comparison period `#595959`; a chart with **3–4 comparison periods** uses `#A2A2A2 · #7F7F7F · #595959 · #3F3F3F` in order (LW·LM·LY·Target all come out `#595959`) — charts with 1–2 comparison periods keep their old colours (`compares_by_count`) | a `%` measure is never a comparison period, even with Target in its name |
| **% lines (Y2)** | the two darkest colours of the region's theme | % labels **bold**, `labelPosition 'Above'`, **no** label box (a box covers the line) |
| **Up / down** | text on a white background (the % line under a card, % matrix columns): `#007A36` / `#C51E24` · **% labels on charts**: bright green `#4ADE80` / `#C51E24` | `#00B050` dropped (2.9:1 on white). Chart labels over the region theme's dark columns: `#007A36` is only 1.2–1.5:1 ⇒ the green % should be paler and brighter; `#4ADE80` 3.6–8.5:1 on dark columns, but only 1.7:1 on white so NOT used for text on white |
| Pies · charts split by channel | the region theme's colours in order · `(Blank)` `#A2A2A2` | = the theme's `dataColors` |

- The region theme's sequence may contain dark greens and teals — use the theme's sequence AS IS (replacing the "charts must not use the green family" rule of the afternoon of 30/09); % labels on charts stay readable thanks to bold bright green `#4ADE80`.
- 🔴 **Sequence colours are written as THEME REFERENCES (`ThemeDataColor`), NOT HEX codes** *(adjusting by hand made the theme's colours
  stop applying … apply the theme's colours exactly like Ori)* — as in the Original sample file. White's theme = the region theme (`dataColors`
  + `good` · `neutral` · `bad`). Card *i* → slot *i* of the theme; charts by slot, continuing the sequence within the tab. Only system
  colours (comparison grey, up/down green/red, matrix headers) are still written as codes. `mix_palette.colour()`; gate `chart-palette` + cards checked to accept only
  `ColorId 2..9`.
- 🔴 **EVERY chart carries the set's colours, no chart left blank** *(every chart must follow the colour codes, you did not apply them
  to all the charts)*. A chart of measures (no splitting field) must declare each series' colour — left blank, Power BI paints theme 1/2 for
  EVERY chart, two charts side by side the same colour. Covering all: kinds with the word `Chart` **and** `treemap` · `funnel` (a treemap puts its splitting field in the role
  `Group`, not `Category`); the measures of **every** measure table (`#Measure.` and `Measure.` of the OM model). Measured 01/10 before
  the fix: 2 Daily treemaps still had Legacy colours (`#4FAEED`, `#AA34BC`…), 6 Power Consumption charts skipped because of `Measure.`. Gate
  `chart-palette` (+ `chart-coloured`: a chart of measures without declared colours ⇒ red).
- 🔴 **DATA LABELS HAVE NO BOX — EVERY % FIGURE IN BOLD** *(there is already a rule against a background behind the %, it covers
  the chart; only bold figures, every % in bold)*. The old rule applied only to Y2 % lines with conditional colour ⇒ 10 label items still had a
  box (the chart's shared `all` item, labels of money series) on Weekly · Daily · Power Consumption. Now: **every** `labels` item of every chart
  `enableBackground false` (removing `backgroundColor`); **every** % series (measures named starting with `%`, in Y · Values · Y2) with labels gets
  `bold true`. Also applied to the `Pct_` lines under cards.
  🔴 **WHERE THE KEYS GO — a repeat offence 01/10, caught by the owner again:** `bold` · `enableBackground` · `labelPosition` are keys of **the whole series** ⇒ they sit in
  the `labels` item whose selector has **only `metadata`** (Desktop writes: bold 37/52, enableBackground 106/124 in this form). The per-point item
  (`data: dataViewWildcard` + `metadata`) **holds only the conditional colour** — putting bold / backgrounds there makes Power BI IGNORE them, the labels lose bold and
  the default box shows again. The error came from the very round moving the colours to per-point (`b3be6525`): 27 % labels per copy. Fixed + the render
  of the Monthly page looked at (bold labels, no box). Gate `pct-label` red when a static key sits in a per-point item. ⚠ % columns in a **matrix** are not bold yet: no Desktop file in the estate writes bold text
  per column (counted 01/10) ⇒ no key to copy yet, NEVER invent one. Gates `label-box` · `pct-bold` (tested red on HEAD: 10 errors → 0).
- Every pair of colours standing in one chart was scored with `validate_palette.js` (the `dataviz` skill); changing colours ⇒ score again, never mix by eye.
- **The machine does it:** `PALETTE` in `mix_specs.py` + `python scripts/mix_palette.py --cards`. **The machine watches** *(01/10: every skill must have
  scripts that detect it all)*: `theme-standard` (the report theme = the region's standard theme) · `chart-palette` (theme slots / colours outside the set, two charts in one tab
  the same colour) · `chart-fill-shape` · `compare-grey` (comparison periods must be grey) · `pct-label` (% labels bold, `Above`, no box) · `pct-color`.
  Negative test 01/10 on a copy: 5/5 deliberately planted errors all caught.
- 🔴 **A ONE-series chart writes its colour in a `dataPoint` item WITHOUT a selector** — attaching `selector.metadata` makes Desktop IGNORE it, painting theme colour 1,
  without a word. Measured on files Desktop wrote itself: a one-column combo uses the selector-less item 15 times; only from 2 measures on the main axis
  does it use `metadata`. Paid for 30/09: 6 charts on the Product page + `REVENUE & TARGET` all one colour. Gate `chart-fill-shape`;
  the same-colour-within-a-tab rule now also considers selector-less items (one-series charts slipped through before).

### 4l. MATRICES — ONE STYLE FOR EVERY TABLE

> The matrices are too ugly, no bold headers, no header colours, no conditional colours — this must all go into the rules and the skill applied to every matrix
> — measured 30/09: 36 matrices of White AM, 2 with bold headers, 24 each with its own header colour, 23 % columns without up/down colours.

| Part | Standard |
|---|---|
| Column headers | background `#44546A`, text `#FFFFFF` **bold**, size `10D`; per-column header colours (Legacy) dropped |
| Row-name column | text `#2D2D2D` on white |
| Values | text `#2D2D2D`, alternating rows `#FFFFFF` / `#F4F6F8` (`backColorPrimary/Secondary`); flat per-column backgrounds dropped, **heat maps (`FillRule`) kept** |
| Total / subtotal | **bold**, background `#E3E8EE` |
| % columns | coloured by THAT VERY measure: up `#007A36`, down `#C51E24`; target achievement ratios threshold `1`. **% columns are recognised by the measure's FORMAT**, not by name (`vsWTDLW` is a %). Shares / costs declared in `pct_neutral` are not coloured |
| Grid | horizontal lines only `#E3E3E3` 1 px, vertical lines dropped |
| **Title** | **like chart titles**: shown, left-aligned, Segoe UI Semibold `12D`, `#2D2D2D`, NO title background (the pink Legacy strip dropped) — the matrices did not follow the same title structure as the charts. The text = the Legacy text when there is one; otherwise a reader's title from the table's fields (`mix_specs.MATRIX_TITLES`, 26 tables) — showing a technical name `Table_…` is FORBIDDEN. The builder's spec gives these tables the name `None`, or a rebuild turns their titles off |

- **Heat maps (intensity colours)** *(the hour × weekday table + time slot × weekday)*: one tone, white →
  the theme's first colour mixed with 45% white (text `#2D2D2D` still 5.3:1 on the darkest cell, so no text colour by value, since there is no Desktop mould
  to copy yet); the scale computed over the WHOLE table; the total row not coloured (`dataViewWildcard matchingOption 1`). Command
  `mix_palette.py --heatmap <pageId> <visualId>…`. Charts are not coloured (column height already shows the intensity).
  🔴 **Colour points in a `FillRule` are BARE `{"Literal": …}` — NOT wrapped in `expr`** *(05/10)*: wrapped as `{"expr": {"Literal": …}}`
  it still DRAWS right, but Desktop **can no longer save** — Save · Save As · Publish die silently, with no message
  (`NullReferenceException` in `GetEnhancedReportDocument`). Two White copies lost Save for a day because of exactly this (`84cb1304`),
  found by bisecting commits in a sandbox. Gate `fillrule-bare` blocks it from now on.
  🔴 **Legacy colour scales DIE SILENTLY:** measured 04/10 each White copy had **56 `FillRule` items** pointing at old field names (`Measure.TotalSale`,
  `Measure.Sale/DateofWeek`…) no longer in the table ⇒ Power BI ignores them, without a word. `--heatmap` drops the dead items of the table it colours.
  The root (measured on 3 copies): Legacy + Classic had 21 dead items already; White added **33** — White's field-reconnecting step changed the scale's `Input` to
  the DW name but NOT `selector.metadata` (Classic changed both). Fixed 04/10 (put every colour back):
  `mix_palette.py --repair-fillrules` — an `Input` that is a field of the table ⇒ the selector points back to it (colours back as in Legacy, 33/copy);
  an `Input` not belonging to the table ⇒ deleted (21/copy, Legacy never showed them either). Gate `fillrule-dead` (negative test: planted 1 ⇒ exactly 1 red).
  ⚠ Renaming a field on a visual renames BOTH the `Input` and the `selector.metadata` of every `FillRule`.
- **The machine does it:** `python scripts/mix_palette.py --matrices` (rerunnable). **The machine watches:** gate `matrix-style` (headers · alternating rows · totals · % columns · titles) + `matrix-grid` (horizontal lines only) + `topn-column` (Top/Bottom N vertical columns) — negative test on an uncoloured White OM: 42 errors.
- 🔴 **Top / Bottom N charts = VERTICAL COLUMNS** (`clusteredColumnChart`), not horizontal bars — this sample should be a vertical chart to show the top 5.
  `python scripts/mix_palette.py --bars-to-columns` (changes `visualType`, keeping the roles + formatting; 12 charts on Product · Product Mix).
  ⚠ A Top 5 showing 1 item is NOT an error when a new month has just started (measured 01/10 morning: 1 invoice that day) — choose the previous month to check.
- Every key is one Desktop writes (`columnHeaders.backColor` 356 times, `values.backColorSecondary` 172, `subTotals.bold` 15…).

- 🔴 **COLUMN NAMES = READER'S WORDS, ENGLISH TITLE CASE** *(settled 13/10: the column names are off-standard and chaotic → English chosen,
  the same voice as visual titles)*: every field showing on a table / matrix / chart (the displayName, or the field name without one) — no underscores
  (`chi_tieu`, `ITEM_NAME`), trailing numbers (`Revenue2`, `StoreName2`), glued words (`StoreName`, `Monthnumber`), ALL-CAPS words that are not business
  abbreviations (`PARENT3NAME`, `DISCOUNT`), a bare `%` / `%1` (it must say % of what: `% Revenue`, `% Ebitda`). Set `displayName` in the projection,
  keeping the measure name. Gate `column-name` (White/Red; Classic keeps the Legacy words). 03 White has set: Line · Code · Cost Line · Store ·
  Actual · % Revenue · Actual LY · Growth LY · Base Month · % Revenue Base · Variance · % Variance · LYTD.
- 🔴 **VARIABLES IN ENGLISH, DATA MAY BE VIETNAMESE** *(settled 18/10)*: measure names are variables ⇒ English, no Vietnamese diacritics
  (`'Doanh Thu Thuần'` ⇒ `Net Revenue`; words the reader needs go in `displayName`) — gate `measure-name` (White/Red). Text shown that is
  data CONTENT stays Vietnamese: a measure counting exactly ONE item (DAX filtering one `ItemID`, e.g. `EcomComboQty_TGVI0087`) carries the item's name
  as its title (`Mì trộn tương đen Super Cay (120gr/gói)`) — `column-name` and `glossary-cover` skip that title.
- 🔴 **EVERY % MUST BE DECLARED: A SHARE or DIRECTIONAL** *(13/10: the % do not have the right green/red for up and down)*: names like `% … of Revenue /
  of Total` do not tell — `%Actual of Revenue` is the share of one P&L line (a column mixing revenue and costs ⇒ no colour), `%Ebitda of
  Revenue` is a profit margin (> 0 green). Shares ⇒ `pct_neutral` (pbi-gate.json), directional ⇒ `PALETTE['pct_threshold']` (mix_specs) —
  % labels on charts may be coloured only when the measure is in this list. Gate `pct-decided` (undeclared ⇒ red; a directional % on Y2 without a label colour rule ⇒ red).

### 4m. ICONS ON KPI CARDS — anchored top right, the figure's colour, a 17.5 px stroke

> The empty space on the right of the card now holds an icon, and the icon part is hard and must be done carefully → corrected the same day: offset 5 only on
> the two top sides, leave space below so the icon anchors to the top right, about 40% smaller, so it never touches the text of row 3.

| Point | Rule | Measured (a card 90 tall) |
|---|---|---|
| Frame | **a square anchored at the TOP RIGHT**, exactly **5 px** from the top and right edges of the card background (`BG_`); the space below left empty | side = 60% of `(height − 10)`, rounded DOWN to the 5 grid ⇒ **45 px**, y 20–65 |
| Not touching text | the % line (row 3, `Pct_`) starts ≥ 5 px below the bottom of the icon; the figure box (`Card_`, row 2) stops 5 px before the icon | `Pct_` y 70 · `Card_` width = `x_icon − 5` |
| Colour | **the colour of the card's own figure** (that card's theme slot) — generated from the black version in the icon library, keeping alpha, named `<icon>_<hex>.png` in the report's `RegisteredResources` | card 1 → theme slot 1 · card 2 → slot 2 … |
| Stroke | EVERY icon on the icon library's common mark **17.0–18.0 px on a 512 image** (`2 × opaque px / outline px`, design.md §2.6) | 11 icons measured 17.3–17.7 |
| Content | one icon saying exactly the indicator, an outline with few strokes, **Tabler (MIT)** | see the table below |

| Card | Icon | | Card | Icon |
|---|---|---|---|---|
| Revenue · Revenue MTD | `cash-banknote` | | GC | `users` |
| Target | `target` | | GA | `user-dollar` |
| TC | `receipt` | | Gap vs LMTD | `arrows-diff` |
| TA | `receipt-dollar` | | COGS · COGS LT | `package` · `packages` |
| ADS | `calendar-dollar` | | Stores | `building-store` |

- **The machine does it:** `python scripts/card_icons.py render` (downloads Tabler 3.19 SVGs, headless Chrome at 512 px, **searches `stroke-width` until it MEASURES
  17.5 ± 0.5** — Tabler's default 2 ⇒ 42.7 px; the 11 icons came out 0.706–0.787), writes the ⬛/🟥/⬜ versions into the icon library (the region value `icons_dir` = the organisation's `_Design\Assets\Icon\`, Design_172) + a
  line in its `README.md`; `MIX_ROOT=<report> python scripts/card_icons.py place` (an image visual `Image_<Key>` in the card group, its id fixed by
  page + key ⇒ a rerun creates nothing extra; every bookmark capturing the card also captures the icon in the same state). A new card ⇒ added to `ICONS`.
- **The machine watches:** gate `card-icon` (missing icon · wrong frame/position · image not registered · a colour other than the figure's · a stroke outside 17–18 px · the % line
  touching the icon · the figure box running under the icon). Negative test: an unplaced White OM ⇒ 26 errors; the old square-frame version ⇒ 32 text boxes running under icons.
- The image visual mould = the mould Desktop writes (`image.sourceFile` + `fit 'Fill'`, the department repo's company logo); gates `card-row` and `bg-inset` exempt
  exactly an `Image_<Key>` beside a `Card_<Key>`.
- ⚠ Not done yet: OLD-STYLE card grids (`card`, without their own `BG_`) on the Operation page (25 boxes) and Promotion Increase Sale (12 boxes).

## 5. The tab strip — the original mould has NONE, so it must be built right

The original mould has no tabs (a 720 canvas fits one screen) ⇒ the rules come from `pbip §3`, three often wrong: **tab bookmarks
capture THE WHOLE PAGE** (`targetVisualNames: []` + `suppressData: true`) · **every nested group in between declared** ·
**each tab has two label shapes plus a red bar**, switching tabs flips all three.

~~🔴 Tab labels are `shape`s, and a `shape` carrying `visualLink` CANNOT be clicked — lay a transparent PNG over it.~~
🔴 **THIS RULE IS WRONG, DROPPED (2026-09-24).** A `shape` carrying `visualLink` **is clickable as normal** — measured on
`Red`: `BG_UserGuide` is a `shape` and carries `visualLink`. My buttons were silent because they were **put in the wrong place**,
see §5b. **No PNG hit area is needed**; the owner said plainly that tabs need no image, only text.

**The content area** = `720 − 50 (header) − 5 − 30 (tab strip) − 5 − card row height`; a `90` card row ⇒ leaves
**530**, a `5` gap between two blocks. The tab-counting formula: [`reference/measured.md`](reference/measured.md) §4.

## 5b. 🔴 THREE ERRORS THAT BREAK THE FILE — all from INVENTED KEYS, Desktop refuses to open *(2026-09-23)*

> **The shared root of all three: writing PBIR fragments by inference instead of copying from a RUNNING file.**
> The JSON is still valid so **no parse gate catches it** — only Desktop does, and by then a round is lost.
> **The rule: every key must be READ from a real file before use. Not seen = does not exist.**

| # | I wrote | Right is | Desktop reports |
|---|---|---|---|
| 1 | `visualContainerObjects` at the **root** of `visual.json` | sits **inside `visual`** | *"additional property … in the root property"* |
| 2 | `singleVisualGroup` in `visualContainers` | groups take their own path: **`visualContainerGroups`** | *"additional property 'singleVisualGroup' …"* (30 errors in one round) |
| 3 | `visual.visualLink` | **`visual.visualContainerObjects.visualLink`** | nothing — **the button is silent, not clickable** |
| 4 | bookmark `$schema` version **1.1.0** | **2.1.0** — exactly the version Desktop writes in that very file | depends on the case |
| 5 | the `objects.layout` cluster missing on a `cardVisual` | `layout.style='Cards'` must be there | nothing — **editing `value.bold` does nothing** |

### 5b-bis. 🔴 "ONLY IN MY FILE" ≠ "I MADE IT UP"

`image.imageAreaSize` and `image.fit` appeared only on the 6 cards of the White copy, not in `Red` —
I concluded I had invented them and **deleted both**. Wrong: **the owner shrank the icons in Desktop**, and Desktop
wrote those two keys. After deleting them the `cardVisual` lost its picture-area limit ⇒ **the icon swelled over the whole card, the label cut
to `REVE...`**. The owner had asked twice to shrink them, and I enlarged them again once.

> **The rule:** an odd key **only this file has** ⇒ ask *"who wrote it?"* before deleting.
> `git log` cannot answer (the file is not committed) ⇒ **ask the owner**. Deleting a key that has an effect
> costs exactly as much as inventing a key that does not exist.
> The second consequence: `fit` **is a real key** of the `image` visual (`fit='Fill'`) **and** of `cardVisual`.
> Comparisons must use the right visual KIND, never blocking blindly by key name.

**The right 2.1.0 bookmark mould — measured on `Red` AND on bookmarks Desktop wrote itself in the White copy:**
```
$schema  .../definition/bookmark/2.1.0/schema.json     <- must equal the version Desktop writes
options  { targetVisualNames: [] | [list], suppressData: true }
explorationState = {
  version: "1.3",  activeSection: "<pageId>",  objects: {},
  sections: { "<pageId>": {
      visualContainers      : { <ONLY LEAF visuals> : { "singleVisual": {
                                   visualType, objects:{},
                                   display:{mode:"hidden"}     <- only when hidden
                              } } },
      visualContainerGroups : { <ONLY page-level GROUPS> : {
                                   isHidden: bool,
                                   children: { <child group>: {...} }   <- NESTED
                              } }
  } }
}
```
🔴 **Leaves and groups must NOT be mixed.** Measured on `MCP_Tab2_NuaDauNam`: `visualContainers` 98 items **all leaves, 0
groups**; the `visualContainerGroups` tree 30 nodes **all groups, 0 leaves**. Only **page-level groups** are outermost keys,
child groups sit in `children`.

⚠ **Turning a whole block on/off is declared in `visualContainerGroups`**, never flipping each leaf — shorter, and
it does not break when a visual is added to the group.

⚠ **Do NOT kill the Power BI Desktop process** — the machine may be refreshing another
file, killing the process loses a long refresh. To close it **list the PIDs + window titles**,
close **exactly the PID holding your file**, and when done **reopen it yourself**.

## 5c. 🔴 TWO FORMATTING ITEMS — writing into the wrong one is "edited but nothing changes" *(2026-09-24)*

Desktop splits each format cluster into **two items** in an array, and **only one item takes effect**:

```
"fill": [
  { "properties": { "show": ... } },                          <- the NORMAL item: on/off only
  { "properties": { "fillColor": ... , "transparency": ... },
    "selector": { "id": "default" } }                         <- the item WITH a selector: THE REAL VALUES
]
```
Measured on `12ce85014a78cb37c098` (the header background, written by Desktop): `show` sits in the normal item, `fillColor` in the item
`selector.id = "default"`. **Writing the colour into the normal item ⇒ Desktop ignores it silently** — exactly what the owner called
*"the wrong colour"* on the tab strip.

✅ **The safe way: write BOTH items with the same value.** Whichever item wins gives one result.

### 5d. A BUTTON'S ON STATE — it must BE VISIBLE

The original mould swaps **pictures** between the two states: `dictionary_3_white.png` (off) ↔ `dictionary_3.png` (on).
The White copy's icon set **has no "on" variant** ⇒ it is marked with **a red frame** on the `_On` button:

```
visualContainerObjects.border = { show:true, color:'#C51E24', width:2D, radius:6D }
```
🔴 **An `_On`/`_Off` pair using THE SAME picture shows no change after clicking** — the owner will report
that the button has no on state. Hit with the Glossary button.

### 5e. 🔁 A RECURRING SIGN: a Desktop Save FLIPS every default state

Each time the owner opens Desktop and Saves, **every `_On`/`_Off` pair and every visual hidden by a sub-view comes back
"shown"**. Hit **twice** in the same day. ⇒ Keep a **reset-to-defaults** step that can run
many times, and run it **before acceptance**; never trust that the state you wrote last round is still intact.

### 5f. ON/OFF BUTTONS — two stacked buttons must MATCH TO THE NUMBER

```
_On and _Off:  x · y · width · height  MUST BE EQUAL
               z(_On) > z(_Off)
               the right edge exactly 5 from the border of its container
```
🔴 **A slight offset makes the click hit the one underneath** ⇒ the symptom *"it turns on but cannot turn off"*.
The only exception: **tab pairs** `BT_Tab<n>_…` — the active tab **sticks up higher** (`y=0 h=45` against
`y=5 h=40`), a design the owner settled. The `On/Off pair` gate skips exactly these pairs.

🔴 **ONE function = ONE button pair. Two pairs doing the same job in two different groups are forbidden.**
A real case: the button closing the funnel had **two copies** — one in the `Filter_Panel` table, one in the `Header` — at
**exactly the same absolute coordinates** `(1235,5,40,40)`. Two layers stacked, which one takes the click depends on the parent groups' z
⇒ clicking could not turn it off. The copy in the panel was deleted, the pair in the header kept.

🔴 **A PURPLE SQUARE IN THE MIDDLE OF A BUTTON = a leftover `tab_transparent_hit_area.png` image.** A relic of the time it was wrongly believed
that a `shape` cannot carry `visualLink`. **A shape can** (measured on `Red`: `BG_UserGuide`).
Seeing an odd box on a button ⇒ find the `image` stacked over it and **delete** it, never adjust colours.

### 5g. CARD LABELS — narrow cards ABBREVIATE as the original does

A card is only `150` wide, long labels **overflow and lose text**: `TOTAL CHECK…` · `GUEST AVG (…`.
The original uses short labels — copy them exactly:

| measure | label |
|---|---|
| `#Total Sale` | `Revenue` |
| `#Switch Target` | `Target` |
| `#TC` · `#TA` · `#GC` · `#GA` | `TC` · `TA` · `GC` · `GA` |

The label sits in `query.queryState.Data.projections[0].displayName`, **not** in `title.text`.

🔴 **THE ALGORITHM: label ≤ card width − 60 px, measured with the real font** *(why is the third card's name so long? an algorithm is needed to
make sure names never overflow the card)*. Measured on a Product Mix render: a `Card_` box of 260 px shows only 205 px of text (`COGS incl. damaged &
packagi…` = 204.9 px Segoe UI bold 10; the full label 210.4) ⇒ the picture column + margins eat 55 px, plus 5 kept. The card width is taken AFTER `card_icons` shrinks the box.
Too long ⇒ `mix_builder.py --card-labels` drops the qualifying clause (`incl. …` · `(…)` · `- …` · `gồm …`), the full meaning goes in the page's Glossary; still long after
dropping the clause ⇒ printed for a PERSON to name it, the machine never invents abbreviations. Gate `card-label` (`pbi_gate.card_label` + `CARD_LABEL_SLACK`).
⚠ The general rule: **a label longer than the card's width is abbreviated as the original does**, never shrinking the font of one
card — shrinking the text makes this card a different size from the others. The **figure** size shared by every card is settled in §4d
(`18D`); changing it again means changing the whole row.

### 5h. LEGENDS — THE OWNER OWNS THEM, THE AGENT MUST NOT WRITE THEM

🔴 **`TopLeft` DOES NOT EXIST in Power BI**. Desktop writes only `Top` · `Bottom` · `Left` · `Right` ·
`TopCenter` · `BottomCenter` · `LeftCenter` · `RightCenter` — counted over every Legacy/Classic/Red file, no file has
`TopLeft`; the agent invented it in `aa676ee`. The consequence: the legend stacked vertically over the axis labels, and each time the owner Saved `Top` (right)
the old gate reported it wrong and the agent "fixed" it back to `TopLeft` ⇒ the legend, though saved, kept disappearing on reopening.
**Anchored left = `Top`** for axis charts · **donut/pie = `RightCenter`**.


> The owner had saved every dashboard's legend to the top left, and the agent kept losing it — it must not be touched again.

The standard is **`Top`** (axis charts) / **`RightCenter`** (donut/pie), but **the agent may ONLY REPORT, never write**. The gate classes legends
as **warnings**, not blocking — blocking would leave the agent stuck, unable to open Desktop yet without the right to fix it.

### 5i. A BUTTON PAIR MUST SHARE A NAME ROOT, or the gate does NOT see it as a pair

The original mould names with mismatched roots: `BT_Glossary_Off` ↔ `BT_OpenGlossary_On`, and `BT_OpenFilter` ↔
`BT_CloseFilter_On`. With the suffixes cut the roots **differ** ⇒ the gate does not pair them ⇒ **both
show without anyone reporting it**, the owner sees red frames on both outer buttons. Renamed to:

```
BT_Glossary_Off / BT_Glossary_On
BT_Filter_Off   / BT_Filter_On
```
⚠ **This is a place DELIBERATELY off the original mould** — the original mould is itself inconsistent in naming (it also has the typo
`Overview_OpenFIlter`). The naming rule `<Kind>_<Name>_<On|Off>` wins.

### 5j. 🔴 THE PAGE DEFAULT: ONLY ONE TAB GROUP MAY SHOW

A correct bookmark **cannot save** this — it is the state **when the file opens**, before anything is clicked.
Both tab groups with `isHidden=false` ⇒ the content of the two tabs drawn on top of each other as one block.
Hiding a tab group **hides everything inside it too**, exactly as `Red` does.

```
Tab1_TongQuan  isHidden = false   (+ every child: shown)
Tab2_ChiTiet   isHidden = true    (+ every child: hidden)
```
⚠ Each Save by the owner in Desktop flips this flag — **run the reset-to-defaults step again before
acceptance**. The `default tab` gate watches exactly that.

## 5k. EVERY PAGE · EVERY VISUAL · ITS OWN GLOSSARY · THE 1280x720 FRAME

> White must follow the new DW standard too, exact against Legacy, copying every page.

- **Every page of Legacy must be in White** (the same page id), **in exactly Legacy's page order**.
  A White page still missing is **copied from the `Classic` copy** (the same DW model, visuals with fields reconnected) then built
  onto the White frame. Hidden pages (tooltips · drill-through · old campaigns) stay as in Classic.
- **Every content visual of Legacy must be present** (compared by id). Legacy cards count by §4d-bis (the id remains, or
  its measure is still on a card on the same page); visuals dropped on purpose are declared in `dropped_visuals` (§4i). Visuals missing because **the DW has no source yet** have their page declared in `known_gaps`
  in `config/pbi-gate.json`, **with the reason** — the gate turns them into warnings; undeclared pages stay red.
  Legacy pages **dropped on purpose** (expired, §5m) are declared in `dropped_pages`, not `known_gaps`.
  Currently dropped: 3 tooltips · `Detail` · `Lucky Wheel` · `Reward On Zalo` · `Thẻ Xuân May Mắn T1/T2`.
- 🔴 **A White copied from the White of ANOTHER report must change its ids by ITS OWN Legacy** *(08/10, White 01 built from White AM)*: the AM and OM
  Legacy **share no visual id at all**, even on identical pages ⇒ the gate saw 11 Legacy pages "lost". Pair each visual with its OM twin
  by kind + field set + title (position decides on ties; pairs with mismatched field names checked by hand), replace the ids in every file of
  `definition` + that report's keys in `pbi-gate.json` (ONLY that report's block — White AM uses shared ids). OM visuals without a twin
  (Legacy's secondary views, e.g. Daily "Detail") are copied from the Classic of the same number then built onto the White frame. The case of 08/10: 167 ids, 2,238 places.
- **Every shown page = `1280x720`**, long content split into tabs (§1 settled the "720 canvas + tabs" way).
- **Each page its own Glossary**, written by `write-style`, saying only what was read from the DAX/fields —
  sentences not yet checked are dropped. Copying another page's Glossary is an error (gate `glossary`).
- **Page names in Title Case, one space**: `Product WHITE → Product Mix` · `Promotion  Increase Sale →
  Promotion Increase Sale`. Reordering pages ⇒ **renumber the bookmark prefixes** by the new order.
- Gates: `canvas` · `legacy-parity` · `glossary` · `few-cards` — run `--page all` to check EVERY shown page strictly.

- 🔴 **The Glossary names EVERY word the reader sees on the page** *(13/10: does the glossary button on each page have a gate checking that it
  explains every word appearing in that page's dashboards?)*: card / chart / table titles, column · axis · legend · tooltip names,
  filter panel labels, and the capitalised words measures print in cells (`STAR` · `HORSE` · `HIGH`…). Everyday words (Store, Month, Revenue… the list
  `GLOSSARY_COMMON`) are exempt; abbreviations must appear exactly as printed. Gate `glossary-cover` (first met: 01 White 16 pages · 02 White 13 · 03 White 5).
  **The Glossary source = `scripts/mix_glossary.py`** (every page of the 3 Whites): edit there then `python scripts/mix_glossary.py --apply <report>`;
  `mix_builder` rebuilding a page reads from there too (the spec is only a fallback) — no more hand edits of `Text_Glossary`.
- 🔴 **Abbreviations are written with the ORIGINAL looked up, once per page** *(13/10: abbreviations must be looked up to their origin and written down,
  with a gate checking this too)*: `TC (Transaction Count): số hoá đơn`, placed in the definition line of the ABBREVIATIONS item. Sources looked up in
  order: the region's business terminology table (`glossary_dir`) → the old system's dictionary (`legacy_sources`) →
  the DW docs (`lineage_catalog`: COL = Cost Of Labor) → the report's own DAX. The dictionary sits in `pbi_gate.ACRONYM_ORIGIN`, each item
  with its source; words without a company source (TA, GA, ADS) follow the F&B industry standard and are reported to the owner. ⚠ The same word with different meanings per department:
  `FC` in Finance reports is Franchise, in operations reports Forecast (`#FC = SUMX(Dim_Store, [#Fore Cast Sale Month])`) — the meaning
  follows the report's DAX. Gate `acronym-origin`: an abbreviation in the Glossary / on the page without its original ⇒ red; a word not yet in
  the dictionary ⇒ red, forcing a lookup first. Each department writes its own Glossary: the department's own abbreviations (NQ, DT, CAM…) are declared in the key
  `acronyms` of `config/pbi-gate.json` (`origin` + `source` naming where it was looked up), not waiting for the region's shared dictionary. Vietnamese sentences on
  a page are prose: the `glossary-cover` gate only requires defining the abbreviations in them, reading whole words (never cutting "Nhiều" into "Nhi").
- 🔴 **One definition, one line** *(14/10: each definition must be on its own line, not lumped together like this)*: each bullet
  of the Glossary holds exactly one sentence of the form `X: …` / `X = …`; an extra explanatory sentence follows right after its definition. An abbreviation already in
  parentheses is not nested in more parentheses: `…, DSR (Daily Sales Report), …`. Gate `glossary-one-def` (`pbi_gate.split_definitions`;
  `06:00` does not count as a definition). The round of 14/10 split 218 lines across 36 pages.
- 🔴 **Explanations live IN the Glossary, not pinned as a frame on the page** *(13/10: explanations should be inside the glossary button)*:
  the REMARKS frame of Product Mix (Star/Horse/Challenge/Dog) moved into the Glossary item "Item grouping", with how Popularity /
  Profitability are computed read from the DAX; the Product Detail table takes the whole tab.
- 🔴 **Words the gate catches get their NAME FIXED first, explained after**: misspelt / glued words / raw field names (`Swith METRIX` ·
  `%GrowvsLW` · `ADS To Archive TG` · `DatePart_Lable` · `PARENT2NAME` · `AMs` · `CapChiTieu`) are `column-name` errors, not words
  needing explanation. New names are read from the DAX: `% Net Sale of Sale` is really `(Net Sale − COGS) / revenue` ⇒ `% Net Margin of Revenue`;
  `Item Cost` is a % ⇒ `% COGS`; `GM` is an amount ⇒ `Margin`. A changed filter panel label sets the same `displayName` for the slicer's field
  (the `panel-label` gate compares the label with that name). `column-name` checks visuals HIDDEN by default too (tab content) — before 13/10 it skipped them
  so ~85 names per White slipped through.

## 5l. 🔴 CHARTS MUST NOT SCROLL BY THEMSELVES · LONG CHARTS TWO TO A TAB, STACKED TOP AND BOTTOM

> Four charts on a page is not allowed when they are long charts; split them two per page, top and bottom; no chart
> may scroll by itself; size them so both the length and height of each chart fit exactly.

**Why a chart scrolls by itself:** the category axis gives each group at least `preferredCategoryWidth` px — **the lowest is
20 px, it cannot go lower** (Desktop has only ever written `20D` · `21D` · `180D`; the Ori file uses `20D`). When
`groups × group width > the plot area` Power BI adds a scrollbar. A continuous numeric axis (`axisType 'Scalar'`
with a numeric field) never scrolls — but for a text field (like `WeekPeriod`) `Scalar` is ignored.

```
groups (upper bound)  weeks 53 · days 31 · stores 50 · hours 24 · months 12 · weekdays 7 · items = the filter's Top N
plot area (horizontal axis) = width - 80 (left axis + margin) - 60 when there is a secondary Y2 axis
plot area (horizontal bars) = height - 60
needed                      = groups x max(20, preferredCategoryWidth)      <= plot area
```
- ⇒ **weekly / daily charts fit only when spread across the FULL width** (`1260`): 53 × 20 = 1060 px.
- **A long chart = ≥ 28 groups.** Each tab **at most 3 long chart blocks** *(raised from 2, by the supreme rule: a chart with only
  one column filling the whole page, two charts with exactly 2 columns taking a whole tab)*, each block **≥ 150 px**, stacked **top and bottom**; the old version
  said 2, each block `1270 × 325/330`
  (a tab with a card row: `280 + 280` under the card row).
- **No 4 large charts in one tab** (blocks ≥ 250 tall) even when the charts are short — split tabs. ⚠ This rule does **not** allow
  splitting into SPARSE tabs: blocks with little content are made SHORT (< 250) and packed into a shared tab — see §5l-bis.
- **Long charts turn on `categoryAxis.concatenateLabels = true`** —
  two-level labels (week number + date range) sit on one line, without breaking words. Command:
  `python scripts/mix_builder.py --concat-long` (turned on for every chart ≥ 28 groups); gate `long-chart` reports when missing.
- A chart saying "Top 5" **without a Top N filter** shows every item and then scrolls (the Legacy copy of Product Mix
  has this error): add a `TopN` filter **copied from a real Top N chart** (the mould on Product `Top 5 Revenue`),
  changing only `OrderBy…Property` to the chart's measure.
- 🔴 **Top / Bottom N must show EXACTLY N** *(bottom 5 showing the full list … what is promised must show 5)*. Power BI's
  TopN filter **keeps ties**: 12 items each sold 1 portion ⇒ "Bottom 5 Bad Selling Product" shows 12.
  **The right way (04/10): KEEP the TopN filter, change only the sort measure** to `~Sort Key <measure> <Asc|Desc>` = the value ± the item's name rank
  (`RANKX(ALL(item), MIN(item))`) × 1E-7 ⇒ no two items with the same key ⇒ exactly N. Command `mix_builder.py --topn-tiebreak` (13 charts/copy).
  ⛔ **A dead end already paid for:** filtering with a measure `TOPN(N, ALLSELECTED(item)…) = 1` (`--topn-exact`, 03/10) made "Bottom 5 Bad
  RevenueProduct" BLANK — `ALLSELECTED` does not see the chart's own filter (item type "Cấp 0 …") so it picked 5 "Cấp 0" items and then the other
  filter removed them all. The TopN filter respects the chart's other filters. `ItemCode` cannot break ties (537 codes / 1627 names, 1681 blank).
  Gate `topn-exact`: TopN sorting by a plain measure ⇒ red · a remaining measure filter `~Top/~Bottom N` ⇒ red · a title promising "Top/Bottom N"
  without a TopN ⇒ red · the title's N ≠ the filter's N ⇒ red. Classic/Legacy exempt (keeping the old behaviour to compare figures).
- 🔴 **COLUMN CHARTS MUST NOT HANG UPSIDE DOWN** *(the chart direction must not be flipped top to bottom)*. Negative numbers on a column/bar axis
  draw columns pointing down (Bottom 5 Bad MarginProduct: gross margin −0.7…−13.4 million). Draw **a positive quantity carrying the right meaning**: the loss
  `#Margin Loss = -[#Total Profit]`, format `-#,0.00;#,0.00;0` ⇒ the columns grow upwards, the labels still carry the minus sign; flip the chart's sort to
  keep the axis order; the Bottom 5 filter still sorts by gross margin. Exempt: `%` measures (negative growth is their meaning).
  Gate `neg-bars` (engine layer): each column/bar chart × amount/quantity measure ⇒ `MINX(<the axis, within exactly the chart's Top/Bottom N>,
  [m])` < 0 ⇒ red.
- Gates: `axis-scroll` (the estimate above) · `long-chart` · `tab-big-charts`. The estimate is **a safe upper bound**; opening
  Desktop is still the final gate — a chart still scrolling is reported, never lowering the group width below 20.
- **Shown pages use `displayOption: FitToWidth`** like page 1 (gate `display-option`). A whole-page scrollbar can also
  come from **a zoomed app window**, not a wrong canvas — measure `page.json` before concluding.

## 5l-bis. 🔴 SPLIT TABS TO LIGHTEN THE LOAD, NOT TO DIVIDE BY NAME — EVERY TAB MUST BE FULL

> Tabs are split to lighten a page crowded with charts, not to divide by name for looks, so a tab must always be full of data
> and charts; only a chart that needs length may take a whole page, every small chart that can be packed in must be packed in to
> optimise · tabs must not be split when each tab holds too little; each tab must be filled with content, no empty space left.

0. 🔴🔴 **THE SUPREME RULE: OPTIMISE THE SPACE — NO EMPTY SPACE, AS FEW TABS AS POSSIBLE** *(plan the space optimally,
   leaving no extra empty space · tabs are limited too, merge tabs together, you are not allowed to spam a pile of tabs each
   holding a little information · shrink the charts and merge them with the tabs that do not hold much)*. Every other layout rule stands
   BEHIND this one. Paid for 01/10: to satisfy "scrolling tables in their own tab" the agent created ~15 more tabs (Daily 6, Product 7, Operation 8, Delivery 6) and
   stretched a daily chart to 465 px to fill a tab. A rule pushing towards sparse tabs ⇒ **ask the owner for the priority order**, never create tabs on your own.
   **The right reading (scrolling a lot and full of information ⇒ its own tab, while charts with little content and lots of empty space
   get merged — there is no contradiction)**:
   - A table **scrolling VERTICALLY a lot** (≥ 1.5 times the frame — 45 stores, 250 items) = full of information ⇒ its own tab (§5l-quater). A table with few rows only scrolling
     sideways (7 indicators × the days) does **not** take a tab: packed in, made exactly as short as its rows.
   - Charts with **little information** — pies / donuts / treemaps with a few slices, charts with 5–17 points, one-series charts — **shrunk and merged** into sparse tabs;
     pies / donuts / treemaps / funnels do NOT count towards the "3 large charts per tab" cap (the `tab-big-charts` gate skips them).
   - Merged by **topic**: Daily & Hourly = Revenue · Transactions · Hour mix (GC/GA by day, by hour, 2 treemaps, the time slot
     table) · By weekday (hour × weekday, channel by weekday, time slot × weekday) · Detail · Store × Hour. Merged 01/10: Product Revenue mix + Profit ·
     Executive Profit + TC&TA + GC&GA ⇒ Indicators · Operation Indicators into Channels · Promotion daily table into Overview · Delivery
     Summary + By day · Power monthly revenue into By month (total: 39 → 32 tabs over 7 pages).
   - A merged page has **a page name saying both** (the Daily page includes Hourly, so why not put both in the name) ⇒
     `Daily & Hourly` (`mix_builder.py --rename-page`).
   🔴🔴 **THE HORIZONTAL direction is where the slack is — charts as wide as their NUMBER OF GROUPS, placed SIDE BY SIDE** *(clearly the dashboard is columns, what is in
   excess is the horizontal direction, not the vertical; you stuffed another chart below, squeezed the height further and left even more horizontal space empty ·
   check the ori file … to see how it is done)*. Measured on the Ori sample file (the region's original mould, `template_report`, reading `Report/Layout`):
   7 weekdays in 170 px × 3 charts side by side · 12 months 590–810 px · ~6 brands 400 px · only the detail table spans the full width ⇒ **~60 px per
   group** (matching the `dataviz` skill: columns ≤ 24 px, the rest breathing space). The formula: `needed = 80 (+60 with a Y2 axis) + groups × 60`;
   a **day** axis (`Dim_Date[Day]`, numeric) is set **continuous** `categoryAxis.axisType 'Scalar'` ⇒ 20 px per day, 31 days fit half a tab, no
   scrolling (`mix_palette.py --scalar-days`; a hierarchical Month > Day axis keeps the category form). A chart wider than 1.25 × needed (floor 320 px) while the tab
   still has other blocks ⇒ WRONG: place it beside another chart. Applied to EVERY page on your own, without waiting for the owner to point at each tab — the `chart-width` gate lists them all
   (02/10: 8 category-day charts, 12 months spread over 1260 on Executive / Monthly / Product Mix / Power, Top 5 625 px, Top 10 1260 px). A 2 × 2 grid
   of half widths does not count as 'large charts' (`tab-big-charts` counts only blocks wider than 640).
   🔴 **The number of groups is the number SHOWN, not the field's upper bound** *(a "… By Month" chart drew 2 columns in
   a block of 2 cells)*: the slicer `IsCurrentMonth` **preselects** a value that filters the chart (no `NoFilter` interaction) ⇒ the month axis has **1**
   group, not 12 (`pbi_gate.month_cut`, applied to `chart-width` + `axis-scroll`). Legacy Monthly selects nothing ⇒ still 12.
   ⚠ Rebuilding a page that drops Legacy's `NoFilter` interaction changes the number of groups silently: Legacy Product WHITE kept the month slicer `NoFilter`
   for the By Month chart (the whole year), Classic + White lost it ⇒ Classic put it back (05/10); for White the owner chose to keep the month filter, the chart shrunk to 1 cell.
   Long item names (combos of 40+ characters) where the gate sees only the number of groups ⇒ declare `chart_width_exempt` in `config/pbi-gate.json` with the reason
   (Bottom 5 Bad Selling 2 cells) — the gate turns it into a warning.
1. **The ONLY reason to add a tab is load**: the content does not fit `1270 × 660` without breaking §5l (charts scrolling by themselves ·
   more than 2 long charts · more than 3 blocks ≥ 250). **Splitting tabs by topic/name for tidiness is WRONG.**
2. **Only LONG charts (§5l, ≥ 28 groups) or tables with really many rows** may take a whole tab. Small charts, tables with a few
   rows, number cards **must be packed together** into one tab until it is full.
3. **Block height by THE AMOUNT OF CONTENT, not by the frame**: a 1–3 row table in a frame 300 tall is empty space. Blocks
   with little content are made short (< 250 does not count as a large chart in the `tab-big-charts` gate) and more blocks are laid in.
4. **Two adjacent tabs both sparse ⇒ MERGE them**, even when the two tabs carry different topics. The merged tab's name is **ONE short word covering
   both**, never joining two names with `&` (`Kênh bán`, not `Người bán & Sàn`).
5. 🔴 **A tab button is at least the text + 15 px wide** *(`Doanh…`, `Cơ cấu…`)* — `Doanh thu` at 79 px in an 85 button gets cut, `Tổng
   quan` at 81 px in a 100 button shows in full. Shrinking `tabw` to fit more tabs is wrong: merge tabs instead of squeezing buttons. Gate `tab-label` measures the real text
   (Segoe UI bold 12).
   🔴 **A tab label is at most 10 characters, spaces included** *(tab names must not be too long, there must be a character
   limit… think of shorter words that still carry the meaning more naturally)*. A bold 12pt tab button is 90–125px wide: `Người bán & Sàn`
   (15) got cut to `Người bán &..`. Measured 29/09: every remaining label of XYZ + ABC ≤ 10. Gate `tab-label`.
6. **The same kind of data uses ONE visual**, never split into visuals by filter value: three identical seller pivots
   differing only by the channel filter ⇒ one pivot with a `Channel` level first; a one-row `Web` table split from the marketplace channel table ⇒ web is one row
   of the channel table. Excess visuals are declared in `dropped_visuals` with the reason. A visual looking like another visual must have **a title saying
   what it is** — column headers are the reader's words (`Trưởng nhóm`, not `LeaderGroup`; `% Target`, not `%`).

7. 🔴 **Charts with LITTLE information do not take a large space** *(the by-day charts hold almost nothing, who would make them
   huge, taking all the space like this)*. A **one-series** chart (one measure, not split, or split by a field that is not time —
   a programme name filtered down to one value is still one series) is **at most half a tab, 330 px** tall; the rest goes to other content. Splitting
   by year (`Dim_Date.*`, Seasonal) or by a field with a fixed list (channel group, AM — `pbi_gate.MULTI_SPLIT`) is several series. A real case: Promotion `Sale of Promotion By Day` 465 px tall after splitting out the table ⇒
   270 px + a Top 10 promotion items by quantity chart below. Gate `chart-size`. ⚠ The "full tab" rule (items 1–3) must **not** be satisfied
   by enlarging charts with little information — short of content ⇒ propose more blocks to the owner, never inflate a chart.

**A real case (XYZ `01DR_Overview_Mix`, the Overview page, 29/09):** the tab `Người bán` (3 tables, the longest 13 rows) and the tab
`Sàn & NQ` (3 tables of 1–3 rows) each more than half empty — both born because an earlier build split out a `Chi tiết` tab to dodge
`tab-big-charts` by keeping every frame 325–660 tall. Merged into `Người bán & Sàn`: 3 seller tables 410 tall +
3 channel tables 245 tall ⇒ 5 tabs down to 4, the gate still green.

🔴 **Placing side by side so that the other chart becomes a blank vertical column is WRONG** *(13/10, 01 Monthly: you stretched the donut vertically over both rows, leaving
the donut group blank)*: the 02/10 version shrank the Old/New Store combo to 860 and stretched the Channel donut into a column 405 × 565 ⇒ the circle
took only the width, half the block blank. Donuts/pies are ROUND ⇒ they sit in ONE row (Monthly: Trend 720 + Donut 545 at 250 tall, the combo 1270 in the row
below, `chart_width_exempt`). Gate `donut-shape`: dropping 60 px of title + legend, the rest taller than its width ⇒ red.

### 5l-ter. 🔴 CHARTS OF THE SAME KIND SIT IN THE SAME ROW

> Suddenly one chart with only 2 columns sat on top while the 3 below, just as similar, were split into 3 — similar charts must sit together
> in one row.

- **The same visual kind + the same field set** (differing only by filter: total · by channel · by region…) ⇒ **one horizontal row**, the same
  `y`; the charts the same height, splitting the width evenly (`(1270 - 5 × (N - 1)) / N`, **keeping the decimals, never rounding, never pushing the
  remainder** — §4f).
  Tables take their height from their row count (§5l-bis item 3) — and when they differ only by filter they are merged into one (§5l-bis item 6).
- Never split a chart onto its own row just because it is "the total": the reader compares charts of the same kind by eye along the row.
- **A real case (XYZ, tab `Theo tháng`, 29/09):** `Doanh Thu Tổng` (Revenue/Target columns + %) on a row 1270 wide, three
  charts NQ · E-Commerce · B2B of the same mould on the row below ⇒ merged into **one row of 4** (`313.75 × 4`; the 29/09 version wrote
  `315 · 315 · 315 · 310` — fixed 08/10 because the last cell was off).

### 5l-quater. 🔴 MATRICES ARE NOT FOR SHOWING LITTLE INFORMATION · NO BLOCK LEFT EMPTY

> Why is there a dashboard with one row? one row needs another chart, nobody uses a matrix for that · a matrix is never used
> to show little information; with only a few legend items people use another chart · it shows almost nothing yet takes a whole tab.... either
> switch to a bigger chart, or add related, more visual charts to fill it.

| Matrix / table showing | Use instead |
|---|---|
| **1 row** (no row/column field; a table of measures only) | a number card — one `cardVisual` with several values |
| **a few groups** (one row field ≤ 6 values, no column field: 4 marketplace channels, 3 teams…) | a chart — columns by group; measures in different units (order counts vs money) go into the tooltip |
| many rows but the block mostly empty (13 rows in a 660 frame) | shrink the block to the rows, the rest holds **a related chart** (e.g. Revenue vs Target by seller) |

- The `Classic` copy does NOT apply it (keeping the old design) — this rule is for the `White` build step: matrices carried over from Legacy are reconsidered by the table above.
- The machine watches: the `matrix-few` rule of `pbi_gate.py` — the static layer catches 1-row matrices, the engine layer counts the real values of the row field (≤ 6 = red).
  The "empty block" part is a judgment (rows × row size depends on the data) — checked by eye when capturing each tab.
- *A real case (XYZ 08/10, Overview White):* `Doanh Thu POS Nhượng Quyền` 1 row × 2 figures in a 360×270 frame → a 2-value card ·
  `E-Commerce Theo Kênh` + `Thực Nhận Và Hoàn Trả Theo Kênh` 4 channels → columns by channel · the tab `Kênh bán` with two matrices of 11–13 rows
  taking the whole 660 → the matrix in the upper half, two bar charts `Doanh Thu Và Target Theo Người Bán` in the lower half.
- **Machine-checkable (not yet in the gate):** within a tab, group visuals by `visualType` + the field set of `queryState` without
  filters; a group present at ≥ 2 different `y` values ⇒ an error. The §5l-bis rule is measured only approximately (engine layer: rows
  returned × ~20 px against the frame height) — the owner considers it an aesthetic rule, so if built it is at warning level.

### 5l-quater. 🔴 TABLES SCROLLING A LOT SIT IN A TAB OF THEIR OWN

> These matrices must be split into 2 separate tabs and cannot be merged because they scroll a lot; everything with a very large scrollbar, above all
> matrices, must sit alone in a tab — Weekly's Detail tab: the store × week table (~40 weeks, 45 stores) and the item ×
> week table packed into one tab.

- A table (`pivotTable` · `tableEx`) whose content is **≥ 1.5 times its frame** in any direction is **the ONLY block of its tab** —
  the frame `(0, 0, 1270, 660)`, the table `(5, 5, 1260, 650)`. This rule **wins over** §5l-bis item 1 (full tabs): a table scrolling a lot may
  take a whole tab even though it looks sparse.
- **Measure:** horizontally = the §5n formula, **do NOT trust a `~Recent` filter** (a measure filter on a matrix does not cut columns — the owner looked at
  Weekly 01/10: ~40 week columns under `~Recent 4 Weeks`; XYZ measured a render with the same conclusion). Vertically = `40 + (rows + 1) × 20` against
  the frame height; rows by the **first-level** row field (pivots open collapsed), the upper-bound table in `pbi_gate.ROWS_N`
  (45 stores · 250 items · 31 days · 53 weeks …).
- Split out, the new tab carries a short label saying its content (`Cửa hàng` · `Món` · `CH × Giờ`), still ≤ 10 characters (§5l-bis item 5).
- Gate `scroll-alone`. Measured 01/10 while building: AM 15 places / OM 19 places over 7–8 pages.

### 5l-quinquies. 🔴 THE PIXEL-READING LAYER — which block is still > 30% EMPTY when full of data

> Add a pixel-reading layer … when a group's background takes more than 30% it counts as empty · a full-week chart must count all
> the maximum weeks of the year. The static gate only estimates from coordinates + group counts; only a rendered image shows how far a chart really fills.

```
python scripts/pbi_pixel.py reports/<report> --user-ok [--page <pageId>] [--tab <text>] [--as-of 2025-12-31]
```
- 🔴 **ASK THE OWNER FIRST, only then run with `--user-ok`** *(the owner never agreed to creating random test files everywhere,
  the owner always has files fixed directly · `Skill_Task_Case` §No drafts)*. This layer must have a copy (pinning the date, changing page states),
  so the copy sits in a SHORT folder at the drive root, OUTSIDE every repo (`D:\_pbx_<pid>` — never `%TEMP%`: MAX_PATH is exceeded, Desktop cuts files
  silently, `pbi-pbip`) and **deletes itself when the run ends** — no more `data/_sbx_px`, no more
  `--reuse-shots`, the `pbi-open-gate` hook exempts no path any more. How: copy the definition + a small `cache.abf` (dropping `*.bak`); each
  page × tab (bookmark `NN_<Page>_Tab<n>_…`, pages without tabs `_Main`) opens Desktop once, applies the tab bookmark as the default
  state, `FitToPage`, adds 2 purple marker cells in two corners to locate the canvas in the image.
- **Brought to CAPACITY by measuring when full, never extrapolating:** the copy pins `Dim_Date.MaxSale` = `--as-of` (default
  31/12/2025) ⇒ every "Current …" slicer gives a complete period: a 31-day month, all 12 months, every week of the year. Every `Current/Last/5Week` flag of
  `Dim_Date` comes from exactly one `MaxSale` expression (measured 02/10, both Whites); measures filtering `< TODAY()` still give the whole old period.
- 🔴 **Changing the SQL text ⇒ Desktop asks "Native Database Query – approve?"** (approved by the exact query text, once per date pin). The dialog
  is HTML, `PrintWindow` captures it BLACK; while it waits for approval every visual spins loading dots forever and the close command hangs too. The tool reads
  the dialog's text through `WM_HTML_GETOBJECT` and **clicks Run only when the text holds exactly its own pinned query** — an unknown query is never approved automatically.
- **"Finished drawing"** = three images in a row with no 10×10 cell changed (comparing the whole canvas average gets fooled by loading dots — paid for 02/10). Closed with
  `CloseMainWindow` + "Don't save" (`GateClose`), never killed.
- **The measurement — ink spread 25 px:** a block = a group with a `BG_` background + at least one chart/table (cards, slicers, buttons do not count). Each ink point
  occupies 25 px around it (half the ~60 px per group step of Ori); background left over is EMPTY. **> 30% ⇒ red**, a crop with the empty part painted red saved
  beside the capture. 🔴 **Do not count raw background:** the breathing space between columns + the part under a line makes EVERY chart red (a full 12-month combo still came out
  67%). Calibrated 02/10 on Monthly: a donut pushed into a corner 57% · a line 32% · a 12-month combo 13%.
- **Four ways of measuring by block kind** (all calibrated on real renders 02/10, each born from a false alarm):
  | Block | Empty = | Why |
  |---|---|---|
  | an axis chart (columns/line/combo) | width no group uses + horizontal bands without ink | the part above low columns / under a line is THE SHAPE of the data (50 stores sorted descending measured by area gave 45%) |
  | a pivot with ≥ 2 row levels (with ⊞ buttons) | only width no column uses | the capacity = when EXPANDED; the height under collapsed rows is room to expand (Combo: 20+ combos × 50 stores) |
  | the rest (donut, pie, treemap, one-level table) | background after ink spread **and open to the block's edge** | closed holes in the ink are part of the drawing — an ideal donut is ~40% empty by itself |
  | **the whole tab** | the content area 1270×660 covered by no block | shrinking frames to their content moves the holes out to the tab — still empty |
- **`B` = a plain white block (> 95% background)**: the tool keeps waiting up to its limit (`--max-wait`) because loading dots are only a few pixels, the image looks "still"
  while a heavy DirectQuery has not drawn yet (COGS 45 stores × 12 months: 99% while loading → 30% when done). Still white at the limit ⇒ reported
  `BLANK` (no figures or not finished loading), NOT merged with layout errors.
- 🔴 **A matrix does NOT stretch its columns to the frame** — a frame wider than the table leaves the right side empty. Fix by widening the columns, never by shrinking the frame
  and leaving a hole: `mix_builder.py --fit-columns <pageId> <visualId>…` (tables without a Columns field, split by the estimate of the gate
  `table_overflow`) · `--fit-values <pageId> <visualId> "<v1>|<v2>…"` (with a Columns field: the value texts taken EXACTLY as on the render,
  the row header column 150 = the `matrix_scroll` convention). Keys Desktop writes: `autoSizeColumnWidth=false` + `columnWidth`.
  The static gate `narrow-table` (a table ~300 px alone in a 1260 frame): a table taking < 60% of its frame
  (frame ≥ 400) ⇒ red. A narrow table scrolling vertically a lot ⇒ **widen the columns, keep it in its own tab** (the owner chose this over merging: merging it beside the by-day table made
  that table lose 12 → 4–8 days).
- **The static gate `tab-hole`** *(why is that one group off like that — DeliveryAM ended at 540 beside a block ending at 660,
  the old gate did not see it)*: within a tab, every 10×10 px cell must be covered by a block (a 5 px gap cannot hold a 10 cell). A tab with a card row is **675** tall,
  the bottom block must reach 675, not 660 — caught the Operation KPI tab in both Whites.
- **The static gate `tab-blank`** (`pbi_gate`): a `_Tab<N>_` bookmark must show at least one content visual of that tab group. Born from an error
  the pixel layer caught 02/10: a `__keep__` block (with sub-view switching) on a non-default tab took its state from the old `_Main` — where
  the whole tab was hidden — so the `Chi tiết` tab of Daily & Hourly opened BLANK, the Revenue / TC&TA buttons hidden too. `mix_builder` now takes that block's default
  state from its first view-switching bookmark.
- One White round ≈ 40 tabs × 2–4 minutes, run in the background; do not minimise the Desktop window being captured (`PrintWindow` does not capture minimised windows).
  Background commands have a 2-hour cap ⇒ split rounds with `--tab "<a>,<b>,…"`; results are read from the run's output (the copy + images deleted when the run ends).
- ⚠ `mix_palette.py` was once NOT idempotent: each run appended another duplicate % colour item (HEAD had as many as 11 copies). Fixed 02/10 + the duplicate
  items cleaned; a second run must give `charts changed: 0`.

- 🔴 **Tables / matrices: columns as wide as their longest figure, the total fitting the frame exactly — NO horizontal scrolling, vertical only** *(14/10: every
  matrix must re-balance its column sizes by itself … the maximum width = the longest figure of that column so it does not wrap … the columns must fit exactly
  the total length … only vertical scrolling allowed)*. The tool `scripts/matrix_fit.py` — measured on the ENGINE, not estimated:
  `measure <report> <plan.json outside the repo> ["Page,Page"]` (Desktop has the file OPEN: rebuilds each table's query with the report / page / visual
  filters + slicer selections, tab content included; takes the longest FORMATTED string of each measure, including total rows /
  columns WHEN the table shows them; total amounts taken ×1.5 because the month is still running) → `apply <plan.json>` (Desktop CLOSED: writes `columnWidth`
  per field + `autoSizeColumnWidth false`; spare room split evenly among the number columns to fit exactly). Does not fit ⇒ **way A (settled
  14/10): figures ≥ 1 million switch to millions with one decimal** (`columnFormatting.labelDisplayUnits 1000000D` + `labelPrecision 1L`, "111.4M").
  ⚠ A matrix with a Columns field: Power BI gives ONE width to every column of one measure ⇒ "each column" = each measure; a column name (Yesterday)
  spanning the measures under it ⇒ split evenly. ⚠ A measure changing by the Metric box (`[~Selected Metric]`) does NOT lock the unit on the column (choosing
  TC would give 0.0M) ⇒ the measure divides ITSELF: `VAR v = SWITCH(...) RETURN IF([~Selected Metric] IN {"Revenue","ADS"}, DIVIDE(v,1000000), v)`
  + `formatStringDefinition = IF(... , "#,0.0""M""", "#,0")` (`~Metrix by Ty Hour`, used only by the matrix). ⛔ Paid for 14/10:
  (a) the thousands-scaling commas `#,0.0,,` Power BI does NOT understand — it prints ",,M" literally; (b) a measure with `formatStringDefinition` MUST drop
  its static `formatString` — keeping both makes Desktop report "Issues were found" and not load the model (gate `measure-format-both`, blocks opening the file);
  (c) never put `///` before `formatStringDefinition`. ⚠ Widths dragged by hand on ONE value (selector `data`: hour 11, 'Mon') override the width
  per field ⇒ `apply` deletes them. ⚠ The number of columns of a Columns field that is not days = every value with figures in 12 months (hours 0
  and 7 come and go: 16 → 18 columns); a ONE-measure matrix shows no measure-name row ⇒ that name does not count for width. Gate
  `matrix-fit` on the engine layer (while the file is open): figures wrapping, a total exceeding the frame, or hand-dragged widths per value left ⇒ red.
  Tested for real 14/10 on 01 Daily & Hourly: 7 tables fitting their frames, the Store × Hour tab with 18 hours not scrolling sideways (pbi_pixel render).
- 🔴 **A view-switching button placed on a table must NOT cover the column header row** *(14/10, Daily & Hourly Detail tab: the button here is broken,
  it covers the matrix)*: a 90 × 30 `BT_` button in the table's header line (~20) ⇒ sticks 10 down into the header. Keep the table frame and the
  button as they are; give the table `visualContainerObjects.padding.top = 15D`. Gate `button-over-table` (a button in the same group, over the table area ⇒ top padding ≥
  button bottom − table top − 20). First caught: 01 Daily 4 tables (`BT_Store*`, `BT_HourWeekday*`), 02 Daily 2 tables.
  ⚠ Column widths the owner drags in Desktop (`columnWidth`) are the owner's decision — `table_overflow` reads the row-field columns too (before
  14/10 it estimated 113 by itself for a Day Part column the owner set to 82, a false scrolling report).
- 🔴 **The column bottoms of charts on one row sit on ONE line** *(13/10, Product Mix: the bottom points of the columns are uneven against
  the other charts, they must all look level)*: axis labels (item names) wrap by each chart's longest name ⇒ each chart
  gets its own label area ⇒ the column bottoms differ (measured 13/10: 318 / 351 / 335 / 388 then 642 / 610 / 576). Fix: (1) every text-axis column chart of a row
  has the same label cap `categoryAxis.maxMarginFactor`, low enough for every name to hit the cap (Product Mix + Product: `20L`; long names cut with "…",
  hover to see in full) — the static gate `axis-cap`; (2) month-axis charts with one-line labels never hit the cap ⇒ shrink the chart height by the
  measurement (245, bottom margin 25) and declare `baseline_align` in `pbi-gate.json` with the measurement — only the bottom margin is exempt; (3) negative-figure charts (Bottom
  Margin = `−Margin`) with items still in profit ⇒ columns plunge below the 0 line, the axis stretches ⇒ draw the columns with `MAX(loss, 0)` (`#Margin Loss Bar`), the real figure in
  the tooltip. Do NOT set `valueAxis.start = 0` by hand: Power BI drops the top margin, the label of the tallest column covers its body.
  The pixel layer measures column bottoms (`baseline`): the lowest line still with column colour (saturated colours; grey text/grid do not count); blocks on one row off
  by > 3 units ⇒ red. `--copy-shots <folder outside the repo>` keeps the images for inspection.

## 5n. 🔴 PIVOT TABLES DO NOT SCROLL SIDEWAYS — SHOW ONLY THE MOST RECENT PERIODS

> This page scrolls endlessly because it goes by week and there are many weeks → way 1 approved.

A table with **columns spread over periods** (53 weeks · 31 days · 12 months · 17 hours) × many indicators is hundreds of columns.
A matrix's column widths are shrunk by Power BI itself, **there is no key forcing them** ⇒ the only way is **fewer periods shown at once**.

```
width needed ~ 150 (row name column) + periods x indicators x 90 px      <= the table width (1260 when spanning the full width)
```
| Tool | When | Command |
|---|---|---|
| a measure `~Recent <N> <Days\|Weeks\|Months>` + a visual filter `= 1` | periods in columns, room for ≥ 1 period | `python scripts/mix_builder.py --recent Weeks 4 <pageId> <visualId>…` |
| `objects.values.valuesOnRow = true` (a key Desktop wrote 127 times) | too many indicators in columns | `--values-on-row <pageId> <visualId>…` |
| swap `Rows` ↔ `Columns` | the other direction has fewer members (weekday × hour) | `--swap-rows-columns <pageId> <visualId>…` |
| exempt, declare `matrix_exempt` in `pbi-gate.json` with the reason | tables for **exporting data** · no tidy way yet (waiting for the owner) | — |

- `~Recent N …` = 1 when the column **HOLDS at least one date within the N periods counted back from the last date with sales within the
  slicer scope** (`ALLSELECTED(Dim_Date)` + `HasSales`) ⇒ by default the newest periods; **choosing another period in the filter panel moves the table
  with it**. 🔴 Never use "the MIN–MAX date range of the cell intersecting the window" *(XYZ caught it 01/10, ABC measured on the engine)*: a column without a year
  (`MonthNumber` `'01'`, `Day` 5) with the filter panel on All spans every year of `Dim_Date` so it always intersects ⇒ White AM with no year/month
  filter: the old formula showed 31/31 days, 12/12 months; the formula `NOT ISEMPTY ( FILTER ( VALUES ( Dim_Date[DateKey] ), … ) )`
  showed 12 days, 1 month. Existing measures: `mix_builder.py --fix-recent`. Weeks run **Friday → Thursday** (`WEEKDAY(…,15)`), never the built-in relative filter (Monday weeks).
  The measure sits in `0. Calculation`, prefix `~` (display control).
- Applied: Weekly 2 tables (4 weeks) · ABC Week Overview (3 weeks) · ABC Month Overview + MoM (the latest month, each table
  spanning the full width, stacked top and bottom) · the ABC by-day table (12 days) · MCP (3 months × 3 indicators) · Promotion 2 tables
  by day (12 / 6 days) · the Hourly weekday × hour table swapped. Exempt: Export Promotion · Hourly store × hour (awaiting a decision).
- **VERTICAL scrolling of a table is normal** (50 stores in a 325 frame). Only **horizontal** scrolling is forbidden.
- Gate `matrix-scroll` (blocking) estimates by the formula above, understanding `~Recent` filters, `valuesOnRow` and `matrix_exempt`.
- 🔴 **A table WITHOUT period columns must not scroll sideways either for being A LITTLE SHORT** *(too long ⇒ allow long
  scrolling, but just a little short ⇒ adjust until the scrollbar disappears, pushing columns, charts or the whole group)*.
  A small overflow ⇒ **widen the frame, move blocks, change the layout** until the scrollbar is gone — never shrink a frame below its content to fit in another block.
  Only REALLY long tables (dozens of columns: the 19-column combo conversion, data-export tables) may scroll, declared in `matrix_exempt` with the reason.
  - Estimating width: each column as wide as the larger of **its header** and **a typical value** (money `#,0` ~11 characters, `%` ~7),
    ~0.73 px × the font size per character + 14 px padding; a stepped row-name column takes the **first-level** name + 12 px per level. A column with a declared
    `columnWidth` takes exactly that number.
  - *A real case XYZ 29/09:* the 5-column marketplace channel table and the web table shrunk to 445 px, the POS table 340 px to fit 3 tables in a row ⇒ all three
    scrolled sideways, the figure `3,006,718,252` wrapped. Fix: the channel table 625 px, POS 625 px (the whole tab laid out again).
  - Gate `table-overflow` (blocking, **an estimate**): red on exactly those 3 faulty tables, no false report on the 3 seller tables at 410 px that still fit.
- 🔴 **After EVERY Desktop Save: `python scripts/mix_builder.py --after-desktop-save`** — reapplies the `_Main`
  state to every page (Save writes the viewed tab as the default, the time on 26/09 flipped 39 Weekly visuals) and sets
  `activePageName` back to the first page. Gates `default-main` · `open-page` report when forgotten.

- **The Hourly store × hour table**: periods cannot be cut (the columns are hours of the day, not periods).
  Keep all 17 hour columns with sales, **each column fixed at 60 px**: `columnHeaders.autoSizeColumnWidth = false` + one
  `columnWidth` for each `HourStart` value (command `--column-width`). 150 + 17 × 60 = 1,170 px ≤ the 1,260 px frame.
  Gate `matrix-scroll` reads the hard-declared widths instead of the estimate of 90 px per column.

## 5m. CUTTING WHAT HAS EXPIRED — pages · tooltips · surplus model

> This is a new design, it does not need what has expired; the surplus DW model no longer used can be cut.

- Hidden pages of **finished campaigns**, **old tooltips**, old drill-throughs ⇒ dropped from White; declared in
  `dropped_pages` in `config/pbi-gate.json` with the reason (the `legacy-parity` gate skips exactly those pages).
- A chart still carrying `visualContainerObjects.visualTooltip.section` pointing at a deleted page ⇒ remove the `visualTooltip` block.
- **Cut the surplus model**: tables/measures no longer used by any visual, filter or measure (followed through the DAX). Deleting a table
  = deleting it in `tables/` · `relationships.tmdl` · `model.tmdl` (`ref table` + `PBI_QueryOrder`) · `cultures`.
  🔴 **Scan references by EVERY `"Property": "<name>"`**, not only `Entity`+`Property` pairs: a **Top N** filter
  calls a measure through **an alias** `SourceRef.Source: "m"` — missing it cuts a measure still in use
  (paid for 26/09: `#Filter Product` · `#Filter Margin Product` · `#Sale Dt`, had to be put back).
  🔴 **`cultures`**: delete the measure's `Entities` item **and** every `Relationships` item whose `Roles…Target.Entity`
  points at the deleted item — leaving them points into nothing.
- **Keep tables sitting on a relationship path between two tables in use** even when nobody names them — cutting them changes the figures.
- Keep the `~Placeholder` measures of the folders of pages still alive (model.md §2).

## 5o. THE MODEL DIAGRAM — by the `pbi-pbip` §1c standard

Run `python scripts/pbi_diagram.py reports/ABC_02_STORE-REPORT-AM_DR_White` (or `mix_builder.py --diagram`). White's tiers are in
`config/pbi-diagram.json`: 8 promotion/campaign facts on top, 8 sales facts at the bottom, 8 dims in the middle, two campaign facts
tucked under `Dim_PromotionMetric`/`Dim_PromotionCampaign`, `#Measure` in the last column (at most 13 table columns, 29/09). Gate `diagram`.

## 5p. THE DW'S AGG TABLES — which measure reads which table *(built by the region manager repo 2026-09-27, applied only to White; Classic keeps the old tables for comparison)*

| Measure | Table | Note |
|---|---|---|
| `#Sale of Promotion` | `Agg_PromotionDaily[Amount]` | day × store × channel × programme |
| `#TC of Promotions` | `Agg_PromotionProgramSetDaily[BillCount]` | the grain by the bill's **combination** of programmes ⇒ selecting several programmes still counts each bill once |
| `#GC of Promotions` | from 01/09/2025 `Agg_PromotionDaily`, before that `Agg_PromotionProgramSetDaily` | the date filtered by the Agg table's own `ShiftDate` column, **not** by `Dim_Date` (overriding the date slicer) |
| `#Total … Treatas` | `VALUES(Agg_PromotionDaily[StoreID])` | |
| `~Quantity of Promotions` | `Agg_SaleDiscountDaily[Quantity]` | |
| `#Revenue Monthly` | `Agg_SaleDetailMonthly[LineAmount]` | **only** pages filtered by year/month/store/channel (Executive) |

- `Dim_DiscountProgram` 1–* `Bridge_DiscountProgramSet` (by `ProgramID`). From the bridge table to `Agg_PromotionProgramSetDaily`
  **no** many-to-many relationship is used: the measure moves the `ProgramSetKey` list with `TREATAS` while `Dim_DiscountProgram`
  is filtered (no repo has a many-to-many relationship written by Desktop to copy the mould from; the before/after figures still match 10/10).
- 🔴 **An empty model view right after opening is normal** *(the owner asked 27/09)*: Desktop draws the lines after the DirectQuery model
  finishes loading (~2 minutes). Check the DMV before concluding a relationship is missing — see `pbi-pbip` §1c item 6.
- 🔴 **`#Revenue` on the monthly table is wrong when the page has a filter below month level.** Product Mix and Product have a time-slot slicer
  (`Fact_Sale[DatePartSale]`) and a day-type slicer (`Fact_SaleDetail[WeekdayType]`), Weekly reads by week ⇒ those three pages keep
  `#Revenue` on `Fact_SaleDetail`. The gate accepts `#Revenue Monthly` in place of `#Revenue` thanks to the key `equivalent_measures`.
- 🔴 **The `Discount` column of `Agg_SaleDiscountDaily` = `-[AmountTotal]`, not `-[Amount]`.** The region manager repo's message said `-[Amount]`
  believing the pivot put `Discount` in rows; in fact the two pivots of the Promotion page put it in **values** (Legacy `Sum(DISCOUNT)`),
  while `Amount` is a one-line discount inside the grain ⇒ adding `-Amount` on the Agg table gives a wrong total.
- `ProgramID` is `int64` in both the dim and the two facts (the `CAST … nvarchar` and the text-forcing step dropped) — the same type as the Agg table.

## 5r. PAGE NAMES CARRY NO DEPARTMENT CODE, NO WORD REPORT / DASHBOARD

> 30/09: with store report already there, now a monthly report too — the page names should all be shortened; the words report and dashboard are excess
> ⇒ the header already says `STORE REPORT`: `Monthly Report → Monthly` · `Weekly Report → Weekly` · `Daily Sales Report → Daily` (pages named by PERIOD like Monthly · Weekly · Hourly, the word Sales dropped too) ·
> `Hourly Report → Hourly` · `Executive Dashboard → Executive` · `MCP Report → MCP` · `Delivery Details Report → Delivery Details` ·
> `Monthly Sales Report By Item → Monthly Sales By Item`. The `page-name` gate is red when a page name still holds `Report` / `Dashboard`.
> ⚠ Dropping / renaming pages shifts the measure folder letters ⇒ `--measure-folders` (fixed 30/09: old folders recognised by page NAME, not by
> letter; an existing placeholder is moved, not declared twice).


The report already belongs to the department ⇒ page names **do not** add `ABC`: `Monthly Report` · `Weekly Report` · `Daily Sales
Report` · `Operation` (not `... ABC`, `ABC Operation`). Short names, saying what the page is. Rename with
`mix_builder.py --rename-page <pageId> "<new name>"` — editing at once `page.json`, the header text (with the frame
width) and the page's lettered measure folder. The `page-name` gate reports red when a page name still holds the department code.

🔴 **A report with only ONE shown page ⇒ that page is named `Overview`, never repeating the report name.** The header already carries the report name; a page name
repeating the same words is empty information. Counted by SHOWN pages (`HiddenInViewMode` does not count). Rename with
`mix_builder.py --rename-page <pageId> "Overview"`, change the `key` in `mix_specs` to `Overview` then rebuild the page (bookmarks
`01_Overview_*`, the measure folder `B. Overview`). The first tab is still `Summary` (`Overview` is a PAGE name, the `tab-page-name` rule).
Gate `single-page-overview` (static layer): a report with one shown page named other than `Overview` ⇒ red.

## 5q. MEASURE FOLDERS CARRY LETTERS, NOT NUMBERS

Power BI sorts folder names as **text**: `1.` `10.` `11.` `2.` … ⇒ page sequence numbers are useless from page 10 on. Switched to letters:
`A. Calculation` (shared) then `B.` … in **exactly the order of the shown pages**, the folder name = **the page name** (`B. Monthly Report
ABC` … `P. MCP Report`). A page without measures keeps its folder with a hidden `~Placeholder <key>` (model.md §2). The folders
of deleted pages (`10. Detail`) go back to `A. Calculation`. Reordering pages ⇒ run `mix_builder.py --measure-folders` again
(the table of old folders → pages in `MEASURE_FOLDER_PAGE`). Gate `measure-folder`. The folder rule: model.md §2.

## 6. Traps already paid for

- 🔴 **Desktop EDITS THE FILE ITSELF on Save** — writes the viewed state as the page default (measured for real: 16
  visuals switched hidden/shown) · tidies resources nobody references (lost the transparent PNG ⇒ the buttons could no longer be clicked) ·
  keeps a filter card but **deletes its value** (`BusinessUnit` lost `'Southern'` ⇒ changing the figures of the whole report, silently).
  Detect it by comparing **SETS** with `git show HEAD:<path>`, never reading a linear `git diff`.
- 🔴 **PBIR and the `.pbix`'s `Report/Layout` are TWO different schemas** — converting by hand breaks the file; copy
  the mould from a PBIR visual **that renders**. **`$schema` must equal the version the file declares.**
- 🔴 **Desktop reporting *"ran out of memory loading the data model"* is NOT a file error** — measure the RAM before
  concluding, never go fixing a file that is right.
- 🔴 **`visualLink` sits in `visual.visualContainerObjects`** (placed in `visual.visualLink` the button is silent); every link must point at
  a bookmark **that exists** (design.md §2.2).
  ⚠ Write files **keeping exactly the EOL on disk** (`Rule_Gate_24_EolKeep`) — Desktop writes PBIR as **CRLF**.

📌 Figures + how to read the dialog when a title is empty: [`reference/measured.md`](reference/measured.md) §2–§3.

## 7. Acceptance

> 🔴 **RUN THE COMMAND, DO NOT READ A CHECKLIST.** Every gate below has become a machine check:
>
> ```
> python scripts/pbi_gate.py reports/<report_name> --page <pageId>     # one page
> python scripts/pbi_gate.py reports/<report_name> --page all          # every shown page (White is here)
> ```
> Only `GATE GREEN` allows opening Desktop. `--page` is a page with the standard fully applied; other pages only warn.
> **Each time the owner has to point out again an error that already has a rule ⇒ add a check to that script**, never only add words
> to this file (`HP article 18`). Prose does not enforce itself — that is why the same error recurs over many rounds.


**The static gates, all run BEFORE opening Desktop — every gate must give 0:**

```
grid5       every x·y·width·height divisible by 5, every object  <- THE 0-5 RULE, over THE WHOLE PAGE
            (taken from the Red set: every number must end in 0 or 5)
group-overflow x,y >= 0 and x+w <= W(parent) and y+h <= H(parent)
root-groups the number of page-level groups = exactly 4
bookmark    no pointing at deleted visuals  ·  $schema the version Desktop writes (2.1.0)
header-text the report-name frame = W_text + 20  ·  x(page name) = x(file name) + W_text + 3 x size
legend      axis charts = 'Top' (anchored left), donut/pie = 'RightCenter'; 'TopLeft' is NOT valid.
            Undeclared = the default 'Top'. Only a WARNING, the agent does not fix it
grid5       every x·y·width·height divisible by 5 — except an EVEN SPLIT giving decimals (327.5 · 632.5 · 313.75): a block with siblings
            of the same size, the block right after it, and what sits inside it (§4f)
equal-split two adjacent blocks in one column / one row differing by <= 5 px = an uneven split (325/330) -> split absolutely evenly
matrix-few  a 1-row matrix -> a number card · one row field with <= 6 values, no column field -> a chart (the engine layer counts) (§5l-quater)
axis-sort   a WeekPeriod axis must declare sortDefinition by WeekFridayStart Ascending
            (WeekPeriod repeats across years so sortByColumn cannot be attached; missing = weeks
            sorted by revenue 19 16 29 38... - caught on the Weekly page 2026-09-25)
bg-inset    inside a dashboard group: the chart indented into its BG by exactly 5 on each side
            the two-layer block like page 2 of the Original template (owner 09/10): the outer frame = BG + Title_ + the child groups (each group
            its own BG); a child group = a Title_ naming the group (or a Card_) above the chart — the chart starts 5 below the title, the other 3 sides 5; NEVER add cards/icons on your own when the owner asks only for titles
bm-orphan   bookmarks not pointing at DELETED visuals
on-off-pair each <Name>_On / <Name>_Off pair has EXACTLY ONE with isHidden=false
            AND matches every number x·y·w·h, AND z(_On) > z(_Off)   (except tab pairs)
bm-main     <Page>_Main must match exactly the default tab's bookmark
bm-complete empty targetVisualNames -> explorationState must hold EVERY leaf visual
            (missing = clicking the button loses visuals)
bm-structure visualContainers holds NO group ids
            visualContainerGroups holds NO leaf ids        <- mixing breaks the file
visual-link points at a bookmark THAT EXISTS
            sits in visual.visualContainerObjects  (NOT visual.visualLink)
kpi-card    a cardVisual MUST have objects.layout.style='Cards'
            (missing -> PBI falls back to the default layout, bold/icon position all ineffective)
images      every ItemName used is declared in report.json, and every declared item has a real file
JSON        every file definition/**/*.json parses
root-keys   visual.json may have only 9 root keys:
            $schema · name · position · visual · visualGroup
            parentGroupName · isHidden · howCreated · filterConfig
```

🔴 **The "root keys" gate was born from a real error (2026-09-23):** placing `visualContainerObjects` at **the root**
of the file instead of inside `visual` ⇒ Desktop refused to open: *"An additional property 'visualContainerObjects' was
included in the root property"*. **The JSON is still valid**, the parse gate does not catch it — only the root-keys gate
catches it. Every format block (`visualContainerObjects` · `objects`) sits **INSIDE `visual`**.

🔴 **The REAL gate is still opening Desktop** — *"valid JSON proves nothing"*: invented keys and values that do not
exist are all syntactically valid. Desktop not yet opened ⇒ **declare plainly NOT YET ACCEPTED**. Opening Desktop is
**the LAST step** — editing files after it opens loses the work (`pbip §1`).

## 8. THE PAGE BUILDER — `scripts/mix_builder.py` + `scripts/mix_specs.py`

> The earlier version sat in a scratch folder and **was lost when the session ended** ⇒ now in `scripts/`, under git.

```
python scripts/mix_builder.py <pageId> [<pageId> ...]
```
- **The frame** (header · filter panel · Glossary · buttons · tab strip) is copied from the standardised **Weekly** page; **the slicers and
  content visuals** of the target page keep their ids, laid out again by `mix_specs.py`.
- Slicers without labels (sitting in the old copy's header strip) ⇒ labels generated from the shown field names, switched to `Dropdown`.
- **Each `BG_` frame wraps exactly ONE visual** indented 5 (gate `bg-inset`); cards (`Card_`) and buttons (`BT_`) are exempt.
  A named visual without a title ⇒ declares `title.show=false` so the technical name does not show.
- Bookmarks regenerated: `Red` · `CloseHidden` · `OpenFilter` · `OpenGlossary` · one per tab —
  tabs/`Red` capture the whole page, overlays are scoped. The page's default state = `Red`.
- **Rerunnable** on an already built page (the old frame is deleted and regenerated). Files are written **exactly the Desktop way**:
  the same EOL, **no** trailing newline — adding one makes every file differ by a fake line.
- Spec support: `('__keep__', pos, groupId)` keeps an existing group AS IS (a card row · a block with a view-switching
  button) · `card_tabs=(0)` a tab with a card row at `(0,0,1270,675)` · `('__loose__', None, [...])` visuals placed directly
  in the tab. The scoped bookmarks of a view-switching block **are kept** (deleted visuals filtered out); the default state
  of a kept group is taken from the **old** `_Main` bookmark, not from the file (a Desktop Save flips the states in the file).
- The frame is found on the Weekly page **by Selection name**, not by id — when Weekly is rebuilt the ids change.
- After building: `pbi_gate --page all` must be green before opening Desktop.
- The item `('__cards__', (0,0,1270,105), tiles)` builds the card row from Weekly's `Revenue` card, each card being
  `(key, label, measure, figure colour, % line measure or None, colour threshold)`. Cards split the width evenly, ids fixed by
  page + key so a rerun creates no new ids (§4d-bis).
- Fix commands by the 27/09 rules, each page's data in `mix_specs.py`:
  ```
  python scripts/mix_builder.py --restore-measures    # copies back wrongly cut measures, word for word from Classic
  python scripts/mix_builder.py --pct                 # wrapping measures with the period word + up/down colours (§4j)
  python scripts/mix_builder.py --drop-visuals        # drops non-card visuals from the card strip (§4i)
  python scripts/mix_builder.py --spread-cards <pageId>   # spreads the cards evenly after dropping
  python scripts/mix_builder.py --diagram             # lays out the model diagram by DIAGRAM_POS (pbip §1c)
  ```
- 🔴 **EDIT THE REAL FILE DIRECTLY, NO trial runs on a copy** *(`Skill_Task_Case` §No drafts — replacing the old rule "try
  on a copy `data/_sbx_<name>`", a rule that produced 11 folders ≈ 2.2 GB nobody reviewed)*. The safety point = git: commit the current state
  (including the owner's Save, §0a) BEFORE running the command, then run directly with `MIX_ROOT=reports/<report>`; broken ⇒
  `git` brings it back. A command sweeping the whole report runs `--dry` (when it has one) first to see the scope.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — the White design standard a report keeps once approved (frame, filters, grid) · chuẩn thiết kế White mà report giữ sau khi được duyệt (khung, bộ lọc, lưới)
