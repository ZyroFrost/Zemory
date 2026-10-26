---
id: Skill_PBI_Pbip
name: pbi-pbip
version: 28
type: process
aka: pbip
checked: [Rule_Gate_84_PbipOpenCheck, Skill_PBI_White, Rule_Keys_87_NoSilentBlankPage]
description: Edit a Power BI .pbip/PBIR report by writing its JSON directly - pages, visuals, bookmarks, buttons, icons, the coordinate grid - without breaking the file; the model diagram standard and the static gate. Use whenever a .pbip report is built or changed, a tab or bookmark is added, an icon or the grid is fixed, or Desktop reports issues. Vietnamese triggers - "sửa report", "sửa pbix", "dựng dashboard", "thêm tab", "gắn bookmark", "đổi icon", "căn lưới", "mở Desktop kiểm".
installs: [scripts/pbi_gate.py, scripts/fix_literal_type.py, scripts/add_filter_set.py, scripts/pbi_diagram.py, scripts/diagram_order.js, scripts/package.json, scripts/rename_reports.py]
from: _Store/03_SKILLS/Skill_PBI_Pbip @v28 #ebda669d131c
---

# Editing `.pbip` without breaking the file

> This file says **HOW TO OPERATE**. The **DESIGN** rules (colour table · the 5 grid · icon colours · `visualLink`
> in `visualContainerObjects` · slicers with the header off) are in `Skill_PBI_Base` `reference/design.md`,
> icons in the region's icon library (`icons_dir`). Touching the design → open that file first.

## 0. THE FOUR KINDS OF PBI FILE — different rules, do not mix them up

The folder name declares the kind (`Skill_PBI_Base` `reference/naming.md`):
```
folder    <DEPT>_<no>_<FUNCTION>[-<Tier>]_<IP|DR>_<Kind>            ABC_02_STORE-REPORT-AM_DR_White · ABC_03_INCOME-STATEMENT-OM_IP_Red
file      <DEPT>_<no>_<FUNCTION>[-<Tier>]_<Live|Scheduled>[_V<n>]    ABC_02_STORE-REPORT-AM_Live  (= the name on the Service, ASCII only)
IP = Import (including copies connected straight to a model on the Service, like Legacy: always _IP_Legacy) -> Scheduled · DR = DirectQuery -> Live
Kind ∈ {Legacy · Classic · White · Red}   Tier ∈ {AM · OM} OPTIONAL - only when the report is split by job title, NO 'All'
```
The folder and the file share the function part (`STORE-REPORT-AM`): `_` separates the parts, the function in CAPITALS with words joined by `-`, the tier is
the last word of the function. The folder adds the load-mode code and then the kind at the end; the file replaces those two parts with the load-mode suffix.
Design variants (Legacy/Classic/White/Red) **with the same load mode** share one file name ⇒ publishing overwrites exactly one item.
An important report keeps **two parallel copies with different load modes** — a `Live` copy and a backup `Scheduled` copy (with the DW down the figures of the
last refresh can still be viewed): the same number, different suffixes ⇒ two items on the web. Two copies with the same number **and** the same load mode needing to live side
by side on the Service ⇒ the file adds `_V<n>` (`ABC_02_STORE-REPORT-AM_Live_V2`); without that need there is no `_V<n>`.
The `file-name` gate checks both moulds and that the file name follows from the folder (`_IP` ↔ `Scheduled`, `_DR` ↔ `Live`); a folder matching
no mould is RED. The `storage-mode` gate checks that `IP`/`DR` match the model's real load mode. Scripts find files by **extension**
(`*.Report`), never by a hard-coded name.
Renaming old folders to this mould: `python scripts/rename_reports.py` (a dry run, printing every move and every file to edit) then
`--apply` (`git mv` per folder, editing every place naming the old name — including keys in `config/pbi-gate.json`). Close Desktop first.
Renaming a FILE (adding `_V<n>`, changing the function) = renaming the item on the Service — both the Report and the Semantic model — BEFORE the next publish
(`Skill_PBI_Base` `reference/naming.md` §3).
> 🔄 The 19/10 folders replace the mould `<DEPT>_<no><IP|DR>_<Function>[<Tier>]_<Kind>` (`ABC_02DR_StoreReportAM_Mix`); the kind `Mix` →
> `White`, `Main` → `Red`. Replacing the first version of 05/10 `<DEPT>-<no>-<FUNCTION>[-<Tier>]-<Live|Scheduled>` (separators reversed), the file mould of 04/10 `<DEPT>-<no>-<Function>[<Tier>]-<Live|Refresh>` and of 28/09 `<DEPT>-<no><IP|DR>-<Function>[<Tier>]`
> (27/09: `<DEPT>-<no>-<Function>[<Tier>]-<Vietnamese name>`).
**Read that token BEFORE editing anything** — four kinds, four rule sets, applying the wrong one breaks exactly what must be kept.

🔴 **Each kind has ITS OWN SKILL — this file only gives the shared OPERATIONS, not each kind's rules.**
Once the kind is known, **open its skill** before doing anything:

| | `Legacy` | `Classic` | `White` | `Red` |
|---|---|---|---|---|
| What it is | the old system's ORIGINAL file, copied in | DW + the **OLD** design — a replica to MEASURE the DW | DW + **Red** header/colours + **Legacy** layout | DW + the **NEW** design — the official copy |
| The model reads | old sources | DW | DW | DW |
| May be edited | **NO** — read and `diff` only | model by the standard · UI kept as the old copy | frame by the standard · block positions as the old copy | everything by the standard |
| Standard ↔ old copy conflict | — | **the UI wins** | **the standard wins** | there is no old copy |
| Acceptance | `md5` matching the original | **FIGURES compared with the old system, a FULL scan** | the static gate set + open Desktop and look | the standard checks + open Desktop and look |
| Skill | `pbi-legacy/` | `pbi-classic/` | `pbi-white/` | `pbi-red/` |

⚠ **The two "conflict" cells are opposite, and that is where they are most often mixed up:** `Classic` exists to MEASURE the DW so
the words the reader sees must be exactly the old copy's; `White` exists to put on the new frame so on a contradiction it follows the standard.

⚠ **A difference often forgotten: the 15-code colour table and the 5 grid do NOT apply to `Classic`** (it replicates the old layout —
seeing something ugly ⇒ REPORT it, do not reshape it), but **DO apply to `White`** (the 5 grid is one of the four clauses defining it).

### `Legacy` — read only
Kept byte for byte; it is **the only reference point** proving the `Classic` copy has not drifted. To read the model part convert
`.pbix` → `.pbip` on **a copy**, never touching the original. Close every Desktop session before converting (§1).

### `Classic` — TWO LAYERS OF NAMES, the place most often mixed up
- 🔴 **Inside the model by the NEW STANDARD:** table · column · measure · measure folder names — things only the builder sees.
  Apply `Skill_PBI_Base` `reference/model.md` in full: one `#Measure` table, folders lettered by page (`A.` shared, 27/09), the `#/%/~` prefixes, separate `Parameter_*` tables.
- 🔴 **The words THE READER SEES follow THE OLD COPY:** row/column labels on visuals, titles, slicer labels — kept as the old wording,
  even when they look "off-standard". A conflict between the two layers ⇒ **THE UI WINS**.
  *A real case, the department repo 19/09: three rows `MCP = COL+COGs+SEMI` · `PROFIT = SALE - MCP` · `Thực hiện Ebitda` — the raw names
  in the DB are `MCP`/`Thực hiện EBITDA`/`StoreEbitda`. Renaming them by the DB makes the replica differ from the old copy in exactly the three rows
  the reader sees ⇒ KEEP the old labels.*
- ⚠ **The 15-code colour table and the 5 grid do NOT apply** to this kind — it replicates the old layout. Seeing something ugly ⇒ **REPORT** it, do not reshape it.
- 🔴 **A table header colour must have a Legacy source:** a `columnHeaders`/`rowHeaders` `backColor` hard-coded on a Classic table must
  equal exactly the colour of the same (page, visual) on the Legacy side. A page Legacy does not have has no colour to borrow — a deliberate borrowing (a colour
  the owner settled) is declared in `config/pbi-gate.json` › `color_borrowed` › `<folder>` › `<visual id>`: the reason. Gate `header-color`
  (runs only when Legacy already has a `.Report`; a Legacy still only `.pbix` is skipped, not judged).
- The build procedure + the static checks + the three figures to report: the **`pbi-classic`** skill.

### `White` — DW + the `Red` identity frame + the `Legacy` layout
Rules and procedure: the **`pbi-white`** skill.
A table declared in `matrix_exempt` (deliberately long, with a reason) is exempt from the `header-wrap` gate too, not only `matrix-scroll` /
`table-overflow`; the repo's column-widening tool (`mix_builder --grow-to-fit`) must skip them to keep the column widths the owner set.

### `Red` — the full standard applied, no exception
model.md measure structure · design.md §3.4 the two title areas · design.md §1 and §3 colours, theme, spacing, the 5 grid ·
design.md §3.5 an existing frame with only the data swapped. There is no "old copy" to cite: this is a new design.

🔬 **Shared rules for all four, no kind exempt:** every measure in `#Measure` · separate tables prefixed
`Parameter_` · **renaming anything in the model makes the acceptance gate running REAL DAX on the engine** —
`TMSCHEMA_MEASURES` must be `State = 1` throughout and `EVALUATE ROW(...)` for each measure without errors. Reading the file
proves nothing (model.md §7).

## 1. The procedure — no step skipped

```
1. CLOSE Desktop    while open = it keeps the old copy, saving over the one just edited
2. edit the JSON
3. OPEN Desktop again  <- THE LAST STEP. Once open, NO more editing of files
4. READ the dialog "Your report has issues that could not be resolved"
5. capture with PrintWindow, LOOK with your own eyes
```

🔴 **Opening Desktop again is THE LAST STEP — editing files after it opens loses the work.** Desktop keeps the old copy in
memory; the owner pressing Save *or* Refresh makes it overwrite your whole round of edits. More edits needed ⇒ **close it again from
step 1**. *(The price paid 2026-09-10: a whole commit lost — 4 charts had to be patched again.)*
🔴 **When the owner has Saved, that Save must survive — the agent never loses it.** Before EVERY time the agent writes into a report:
① close Desktop with `CloseMainWindow()` (a save-prompt dialog appears ⇒ STOP, tell the owner) · ② `git add reports/<folder>` — snapshot
exactly the copy on disk, including every file Desktop just wrote · ③ edit ON TOP OF that copy. Forbidden on a folder with files not yet in git: copying/rebuilding the report
from another copy over it · `git checkout`/`restore`/`stash`/`reset` · closing Desktop choosing *Don't save* while the owner still has unfinished edits. Gate
`user-save` is red when a report folder has files changed on disk that are not yet in git.
🔴 **After EVERY time the owner Saves in Desktop, check the PAGE DEFAULTS again**: Desktop writes *the state
being viewed* as the default ⇒ the page opens on the wrong tab, sometimes **with all 3 red bars showing**. Fix it by **applying
the state of the tab-1 bookmark itself** as the default, never declaring it by hand. It also writes `activePageName` =
the page being viewed ⇒ check `pages/pages.json`.

**The PAGE DEFAULT check — run for each page, not only for bookmarks:**
```
exactly 1 red bar showing · exactly 1 label in the open style · exactly 1 content block
every overlay (User_Guide · Filter · Glossary · on-state button groups) isHidden = true
```
⚠ **The rule "close Desktop before editing" is NOT enough** — it blocks the direction *the agent overwriting Desktop*, while the direction
*Desktop overwriting the design* nobody watches. Paid for twice in one session (2026-09-10): the panel
`User Guide` open at Save time ⇒ its group became `isHidden = None` ⇒ **whoever opens the report gets covered by the panel
at once**; and the tab strip went haywire — all 3 red bars showing, the card row hidden, the content that of tab 2.

🔴 **"Valid JSON" proves nothing** — invented keys and values that do not exist are all syntactically valid.
The issues dialog is the real gate: it names exactly **the wrong property name** and **the exact file** holding it.
⚠ Do not replace step 4 by counting windows — the app always has an extra secondary window named `Microsoft Power BI Desktop`.

## 1b. A MODEL READING THE DW — DirectQuery, the right gateway string, runs on the web

```
tables taken from the DW's SQL   mode: directQuery     (Import only for tables NOT in the DW:
                                                         #Measure · Parameter_* DATATABLE · calculated tables)
server string                    Sql.Database("<warehouse_server>", "<warehouse_db>", ...)
                                 <- the gateway compares the server string LETTER FOR LETTER; written differently (machine name, missing port) = the web reports a source error
old-system sources               0 places: every source declared in `legacy_sources`
```
- 🔴 Nobody builds Import files in practice (24/09): Import eats the machine's RAM and needs refreshing by hand. Gate
  `dw-model` reports red a table reading SQL with `mode: import`, a wrong server string, or an old-system source string still present.
- 🔴 **DAX must run on the web**: DirectQuery on the Service blocks intermediate results **> 1,000,000 rows**.
  `SUMX(SUMMARIZE(Fact_Sale, TransactionID, …))` passes in Desktop but breaks on the web ⇒ rewrite it with a DW
  column (`#Discount Amount = SUM(Fact_Sale[NetDiscount])`, TransactionID is unique). The static gate cannot measure
  this ⇒ publish a trial then open each page.
- ⚠ An old `.pbi/cache.abf` **hides** a mode change: the sign is a DQ table returning figures older than the DW ⇒ rename the cache and reopen.
- 🔴 **No trial copies** *(`Skill_Task_Case` §No drafts — replacing the old rule "copies go in `data/_sbx_*`")*: edit
  the real file directly, the safety point is git. A tool that must have a copy ⇒ ask the owner first and place it in a SHORT folder at the drive root outside every
  repo, deleted when done — ⚠ never `%TEMP%`: MAX_PATH is exceeded, `tar`/Desktop cut files **silently** (an extract missing visuals without an error).
- ⚠ **Scan visual references BEFORE deleting a table** (`Entity` in every `visual.json` + page filters) —
  deleting `Fact_PromotionActualItem` without scanning broke a report page.
- ⚠ A Desktop holding the file getting Save pressed **overwrites** every edit on disk — check the processes before editing.

🔴 **Calculated columns on a DirectQuery table accept only functions translatable to SQL**:
`CONTAINSROW` (also `x IN <table variable>`), `ISERROR`, `FIND` are all blocked — the column goes into an error state (`State = 5`),
columns depending on it `State = 7`, visuals empty while the static gate sees nothing. `IN {"a","b"}` with a fixed literal list
works. **String-parsing logic goes into the partition's SQL** (wrapping the old query as a subquery + `CROSS APPLY` + `CASE`),
the model column becomes a data column `sourceColumn`, keeping its `lineageTag`. A real case: `Dim_ProfitLossLine[LineLevel]`
of `ABC_02` Classic/White. Check: `SELECT [ExplicitName],[State],[ErrorMessage] FROM $SYSTEM.TMSCHEMA_COLUMNS WHERE [State] <> 1`.

## 1c. 🔴 THE MODEL DIAGRAM STANDARD — laid out like server cabling

Applies to **every report, every tier** (Legacy converted to `.pbip` · Classic · White · Red). Sample: `ABC_02_STORE-REPORT-AM_DR_White`.
**The tool:** `python scripts/pbi_diagram.py <report folder>` (add `--dry` for a preview) — reads the model, classifies by itself,
lays out by exactly the rules below, writes `diagramLayout.json` (one tab "All tables"). Each report's own tiers are chosen in
`config/pbi-diagram.json`. The `diagram` gate of `pbi_gate.py` watches it.

> The connecting lines are laid out like electrical cabling: bundled, then fanning out close to where they land; bundled but side by side, never
> overlapping, and no table may cover them — connected the way server infrastructure is cabled.

**How Power BI draws lines (measured 27/09):** a line leaves from the **edge** of a card facing the other card, runs at that height, then turns into the target
card. A card standing in the path makes the line run under it. The file stores only card positions, **not lines** ⇒ every rule about lines
is achieved by laying out the cards.

```
                      column 1 ........................... column 9   column 10
top tier     facts, BOTTOM-ALIGNED (long cards reach up; loose tables fill the space above short cards)    #Measure
             ─────────────── 180 px cable tray ───────────────                                        (a column of its own,
middle tier  dims, CENTRE-ALIGNED  (short dims in the middle, long dims to both edges)                 the full height of the diagram)
             small facts tucked under small dims with no line going down
             ─────────────── 180 px cable tray ───────────────
bottom tier  facts, TOP-ALIGNED (long cards reach down; lookup tables right under their fact;
             loose tables fill the space under short cards)
```

1. **Cards long enough to show every column**: height = 80 + 26 × (columns + measures), rounded up to the 20 grid — bottoms/tops perfectly straight
   (rounding the position without rounding the height staggers the edges by up to 19 px). Width 234.
2. **At most 13 columns** for connected tables *(9 → 13 on 29/09, the owner chose to raise the cap rather than cut tables: the StoreReport model has 13 sales facts — hourly agg, electricity cost, two cost-of-goods tables shared with the monthly agg)* *(too wide to see the whole screen without zooming; 8 → 9 on 28/09 when the L4L agg table became the 9th sales
   fact)*. `#Measure` is always the longest ⇒ **a last column
   of its own, the full height of the diagram** — exactly the structure of the owner's original copy.
3. **Three tiers, aligned on the trays:** top facts bottom-aligned, dims centred, bottom facts top-aligned ⇒ both cable trays always stay clear however
   tall or short the cards are. Only TWO fact rows (right above/below the dims): a third fact row forces lines through the middle row.
3b. **The top tray 320 px** (measured to the TALLEST dim), the bottom tray 180 px. Dims keep **their own height**, centred.
   ⚠ *Tried and dropped (27/09):* stretching every middle dim to the same height ⇒ the horizontal turning segments crowd at one height, overlapping
   (the lines still a mess); a 180 px top tray ⇒ the lines of 8 dims squeezed. The "3-tier trial" (tray 320) is the copy the owner praised.
4. **Within a tier:** the order with the fewest crossing lines (ELK Layered when `scripts/node_modules/elkjs` exists — `cd scripts && npm
   install`; otherwise barycenter), then **the tallest cards to both edges**, short cards to the middle — long cards at the edges block nobody's
   lines.
5. **More than 8 facts for one row:** facts connecting only the central dim + one small dim with no line going down are **tucked under that small
   dim**, staggered so the horizontal lines to the central dim do not cross (White: `Fact_PromotionTarget`,
   `Fact_PromotionMetricTarget`).
6. **Lookup tables** (one-sided, used by one fact only): right under the fact in the bottom tier / right above the fact in the top tier, within the 13 columns.
7. **Loose tables** (no relationship — `Parameter_*`): fill the gaps INSIDE the grid (above short top-tier cards, below short bottom-tier
   cards), never standing far from the main area. The main connected area sits at the top, close to the origin.
8. ⚠ **The model view draws lines SLOWLY**: a DirectQuery model shows lines only ~2 minutes after loading. Do not conclude "relationships lost" early — check
   the DMV `TMSCHEMA_RELATIONSHIPS`.
9. ⚠ **Hand-written many-to-many relationships:** no repo has a copy written by Desktop to copy the mould from ⇒ go through the bridge table with `TREATAS` in
   the measure (`pbi-white` §5p), the DW still keeps the bridge table intact.
10. **Tried and dropped (27/09):** every dim in one row + every fact in one row (lines running under dims) · a dim spine column on the left (tidy lines
    but too wide) · `pbi-model-layout` (facts in one vertical column — too tall) · vertical ELK (too tall) · plain ELK (diagonal lines, square cards
    of one size). SSMS's "Arrange Tables" algorithm has no published code.

- Desktop must be closed while the tool runs; reopen it and wait for the lines. The file is CRLF, indented by 2 spaces.
- The `diagram` gate: missing nodes · overlaps · off the 20 px grid · more than 13 columns · `#Measure` not alone in the last column or not
  the full height of the diagram. The White copy reports red; other tiers warn until reshaped.

## 2. Layout & coordinates

```
<Name>.Report/definition/
  report.json               report-level filterConfig · resourcePackages (declaring EACH image)
  pages/pages.json          pageOrder · activePageName
  pages/<pageId>/page.json  displayName · width · height
  pages/<pageId>/visuals/<visualName>/visual.json
  bookmarks/<id>.bookmark.json + bookmarks.json
<Name>.SemanticModel/definition/tables/*.tmdl
```

🔴 `position` is a coordinate **RELATIVE to the parent group** — the real place needs the whole parent chain added up.
**A group** = a `visual.json` with `visualGroup: {displayName, groupMode}`; `groupMode` accepts only
`ScaleMode` or `ScrollMode`.

## 3. Bookmarks — a snapshot of the WHOLE PAGE, and a SYSTEM

```
explorationState.sections.<pageId>.visualContainers       EACH LEAF visual
explorationState.sections.<pageId>.visualContainerGroups  EACH group, the parent-child tree through "children"
options.targetVisualNames   [] = the whole page · [id,...] = SCOPED
options.suppressData        true = display only, filters not used
```

🔴 A visual **not named** in a bookmark **keeps its current state** — the root of "tabs stuck together".
🔴 Declaring `isHidden` for a **group** does not replace declaring each **leaf visual**; both must be declared.
🔴 An `activeSection` pointing at another page makes the bookmark **switch pages** — the root of "clicking a tab jumps pages".
🔴 **Editing one bookmark means checking ALL of them again and syncing.** The `*_Main` snapshots of the template frame are an OLD
state — after a layout change they must be regenerated, or the Refresh button rebuilds a dead layout.

**The standard tree** (the region's original mould (`template_report`) — 5 pages × 6 states):

| Bookmark | Panels | Content / tab |
|---|---|---|
| `<Page>_Main` (= the Refresh button) | **all closed** | **KEEPS the tab being viewed** · only puts filters back to default · **with** data |
| `<Page>_Open<Panel>` | only that panel open | **untouched** · `suppressData: true` |
| `<Page>_CloseHidden` | all closed | **untouched** |
| `<Page>_ClearFilter` | keeps Filter open | scoped to exactly the slicers, **with** data |
| `<Page>_Tab<N>` | *(inside the snapshot)* | **SNAPSHOT OF THE WHOLE PAGE** — `targetVisualNames: []` |

**Scope so states ADD rather than MULTIPLY**: 3 tabs × 5 panels without scoping become
16 bookmarks; with scoping 6 bases + 3 tabs = 9.

🔴 **THE `Refresh` BUTTON MUST NOT CHANGE THE TAB/PAGE BEING VIEWED** *(correcting the very
`<Page>_Main` row in the table above, the old version said "back to default")*. The common UI standard: Refresh reloads the data,
**without** moving the place the reader stands. ⇒ The Refresh bookmark must **scope OUT** the tab strip · the content
block · the card row; it covers only the slicers and the overlays. *(Measured after the fix: scope 81 visuals, 41 excluded.)*
⚠ **Why the original mould was not wrong yet still led astray:** the original mould points Refresh at
`<Page>_Main` correctly on all 5/5 pages — **but the mould has NO tabs**, so "reset the whole page" there had no
tab to jump. Adding tabs inside a page produces a side effect the mould never had to account for.
⚠ **`Refresh` and `Clear All Filters` are now THE SAME action, on purpose** — the filter panel is an overlay so pressing
`Clear` requires the panel *to be open*, pressing `Refresh` requires it *to be closed*. One action with two
entries is normal, not a duplicate to remove.
⚠ **A bookmark button CANNOT reload data** — a real refresh is the schedule on the Service or the Refresh button
on the Desktop ribbon. Do not write a User Guide promising too much.

🔴 **A TAB BOOKMARK IS A SNAPSHOT OF THE WHOLE PAGE (`targetVisualNames: []`), NOT scoped** — with
`suppressData: true` so filters are untouched. This is **the OPPOSITE clause** to "scope so states ADD"
right above: scoping is for *panels*, while *tabs* must snapshot the whole page. *A real case 2026-09-09: 3
tab bookmarks scoped to 37 visuals ⇒ the `Glossary` panel was not in the snapshot so opening it on any tab made it **follow
to every tab**, covering the whole content area.*

🔴 **DECLARE EVERY LEVEL OF NESTED GROUPS IN BETWEEN, not only the parent group + leaf visuals.** For **every** hidden group, **EVERY
descendant** — leaves **and** child groups — must be present in `visualContainerGroups` **and** in
`targetVisualNames`. *A real case: the card row of `MCP Report` has 12 leaves **+ 4 child groups**; the bookmark declared the
parent group and all 12/12 leaves but left out the 4 child groups ⇒ they kept their visible state and **dragged the whole card cluster into view**
on tabs 2 and 3.*

🔴 **COPYING A BOOKMARK TO ANOTHER PAGE MUST POINT THE NAVIGATION BLOCK BACK — both the icon AND the background shape.**
```
in the bookmarks of page X:  BT_Page_X_On shown · every other BT_Page_*_On HIDDEN
                             every other BT_Page_*_Off SHOWN
                             declare EVERY shape carrying a background · show exactly ONE · the same y as the _On icon
```
*A real case: **10/21** bookmarks of `ABC_IncomeStatement` lit page 1's icon while they
belonged to two other pages ⇒ opening Glossary/Guide/Filter there made **the highlight jump back to page 1**. The three bookmarks
`_Main` were right, so opening the file and looking showed nothing wrong.*
⚠ **The BACKGROUND SHAPE clause is where the old check table fell short** — after fixing the icon part the owner still reported the bug (there was
a check table and it was still wrong): pages 1·2 each had **two** background shapes (`WhiteBG_Page` + a leftover `WhiteBackground`),
**10/22** bookmarks declared `1/2` and declared the WRONG one ⇒ the highlight **slid down to the next icon cell**, sometimes
**two cells lit at once**. Settled by **deleting the extra shape** so each page has exactly one.

🔴 **THE NAVIGATION BUTTON COLUMN: NUMBER OF BUTTONS = NUMBER OF REAL PAGES, LAID OUT FROM THE FIRST SLOT, ORDER = `pageOrder`.**
```
n real pages  ->  n pairs of buttons BT_Page_<X>_On/_Off ; pair i (by pageOrder) at  y = (i-1)*60
                  the WhiteBG_Page highlight at the same y as the button of the page BEING VIEWED
                  the Page_Button group (n-1)*60 + 50 tall        (1 page => 1 button at y=0, group 50 tall)
```
Dropping a page (or splitting out a one-page thin report) ⇒ **drop that page's button pair, move the remaining pairs up to the
slots above**, remove the dropped visuals from **EVERY** bookmark of the page, and shrink the group by the formula. An empty slot above
a button is **a layout bug**, never excused as "keeping the coordinates": a button's coordinates are **an address by page order**,
when the pages change the address changes with them — the same doctrine as the measure folder numbers (model.md §2).
*A real case 2026-09-17: `ABC_IncomeStatement_AM` split out one page, dropped exactly the 4 buttons of the two other pages but left
the MCP button in slot 3 (`y=120`) with two empty slots above it — rejected: with only 1 page the button must move up to the top.*
**Machine check:** take the `y` of the `_Off` buttons in `Page_Button`, sorted ascending, must be `0 · 60 · 120 …` continuous
and **number of buttons = number of pages in `pages.json`**; `WhiteBG_Page` at the same `y` as the `_On` button showing.

🔴 **THE TAB STRIP HAS TWO LABEL SHAPES PER TAB — switching tabs must flip BOTH, plus the red bar.** Tell them apart by
`bold`: the copy with only `bold=true` is the **open** style, the copy also having `false` is the **not open** style.
**The check:** each tab bookmark has exactly **one** label in the open style and exactly **one** red bar showing, both
at the same `x`. *A real case: leaving out 3/12 parts of the strip ⇒ switching to tab 2 while tab 1 **still carried the bold
open-style label**, two tabs both looking active.*

## 4. Silent traps — symptom → cause

| What you see | Why | Do it right |
|---|---|---|
| Desktop asks to install a custom visual, the box is empty | the `visualType` does not exist (`stackedColumnChart`) | a stacked column is `columnChart`; for odd names read `Report/Layout` of a real running `.pbix`, never guess |
| The file does not open, issues name a key | an invented key (`wordWrap` in `title`) | use only keys seen working in the file itself |
| The file does not open, a TMDL error | an edit anchored on ONE line ⇒ the previous measure loses properties, the new measure gets two `formatString`/`lineageTag` | anchor on **the whole block** of the measure + its properties; `lineageTag` unique across the file |
| "TMDL Format Error … InvalidLineType – Unexpected line type: Other!" (17/10, 04 IP Classic) | a measure written `measure 'X' = CALCULATE(` then continued on the next line | a multi-line formula **starts on the line BELOW** `=` (indented 3 tabs); a one-line one may sit right after `=` — gate `tmdl-multiline` blocks opening the file |
| A picture does not show | the PNG copied but not declared | add `{name, path, type:"Image"}` to `resourcePackages` |
| A run of empty columns | `Columns.showAll: true` shows periods without figures too | turn it off on **the column axis**; keep it on **the row axis** so every row shows even at 0 |
| Every point piled in one place, labels `0.2M` | an `int64` period column read as **a continuous number scale** | `objects.categoryAxis[0].properties.axisType = 'Categorical'` |
| A meaningless `Total` row | the matrix adds up rows of different natures by itself | turn off `subTotals` · `rowTotal` · `columnTotal` |
| An axis label repeating the block title | turning off `valueAxis.show` does **not** turn off the axis title | add `showAxisTitle = false` |
| A visual flying out of its frame | relative coordinates of another page used | compute **absolute** then subtract the parent group offset |
| Title text off between pages while the measured `position` is **the same** | the shapes' `padding` differ — it is not in `position` so **the 5-grid gate does not see it** | copy the WHOLE title block of the source page; figures + the diff test: the region's design standard §Title strip |
| A time axis showing `202601` | **the key column** (`YearMonth`) used as the label | a label column `PeriodLabel` `MM/YYYY` + **`sortByColumn: YearMonth`**; scan THE WHOLE report, not only the open page — the region's design standard §Time axis labels |
| Just added a column to a dim, the chart is **empty** + banner *"incomplete or no data"* | an **Import** model: the new column is not in the cache yet | press Refresh once. This is a CORRECT middle step, do not diagnose it as a bug and fix it backwards |
| A whole page empty of figures after merging pages, still empty after refreshing (21/10, 01 White Overview) | a hidden slicer carried a FIXED default date range, intersecting to nothing with the Year/Month slicers defaulting to 'Current Year'/'Current Month' | drop the fixed default or the whole slicer; the static gate `stale-default` (`check_stale_default_filter`, `Rule_Keys_87_NoSilentBlankPage`) blocks it before it reaches readers |
| A matrix column showing one LETTER per line (21/10, 01 White Dayofweek) | the matrix has the total row on; the outermost row column is sized by the longest name in the DW (45px), not re-measured for the 'Grand Total' Desktop adds for the total row (~94px) | widen `columnWidth` to exactly the caption text; the static gate `subtotal-width` (`Rule_Keys_88_MatrixCaptionFit`) blocks it before it reaches readers |

## 5. The two toggle panels — which holds what

```
Glossary   label "Thuật ngữ"  -> abbreviations · metric definitions · calculation FORMULAS
User Guide label "Hướng dẫn"  -> what the page is for · how to read each block · warnings when reading figures
```

🔴 The source of terms is the region's terminology library (`glossary_dir`). A panel only **extracts** the words that page uses, it **never** becomes
a second table — metric definitions have their own home in `03_STRUCTURE §7` (HP article 13). The `.md` is the source,
the `.html`/`.pdf` beside it is the render.
🔴 **LABEL LANGUAGE: FOLLOWS THE BUTTON SET ALREADY IN THAT VERY FILE, not a default.**
*(replacing the old sentence "the labels readers see are in Vietnamese")* `ABC_IncomeStatement` has
14 English tooltip buttons, inserting a Vietnamese label makes them clash side by side at once. **The buttons OPENING a panel use
PLAIN NOUNS** (`Glossary` · `Filters Panel` · `User Guide`), only close/clear buttons use verbs
(`Close Filter` · `Clear All Filters`). Objects are always in English (`BT_Glossary_On/_Off`).

**User Guide — the STANDARD callout set, copied as is into every PBI**:
```
Filter button      Click this button to open the hidden filter panel
Refresh button     Click this button to reset to default view
Glossary button    Click this button to open the Glossary and see how each figure is calculated
User Guide button  Click this button to open the User Guide and learn how to navigate and use the
                   dashboard effectively!
page name          This is the page name. When you use the navigation panel to move between pages,
                   the name of the selected page will appear here.
charts             You can click on any chart to filter the data
closing line       Click anywhere on the blank area to close
Navigation Panel   Use the panel on the left to navigate between key sections of the dashboard.
                   Click an icon to explore each topic in detail.
Tab Panel          Switch the view inside this page - you do not leave the page.
```
### The ON/OFF table of the button set — declared IN FULL for EVERY bookmark of the page

🔴 **A two-state button = 1 OPEN button + 1 GROUP holding (the ON button + the highlight).** Leaving out **the wrapping group** makes
clicking the button **make it disappear entirely** instead of switching to the on state.

| Part | `_Main` | `_OpenGlossary` | `_OpenUserGuide` | `_OpenFilter` | `_ClearFilter` | `_CloseHidden` | `_Tab<N>` |
|---|---|---|---|---|---|---|---|
| `BT_<Panel>_Off` (the OPEN button) | shown | **hidden** | shown | shown | shown | shown | shown |
| `BT_<Panel>_On` (the wrapping GROUP) | hidden | **shown** | hidden | hidden | hidden | hidden | hidden |
| leaves in the group (`BT_Open<Panel>_On` + highlight) | hidden | **shown** | hidden | hidden | hidden | hidden | hidden |
| the matching panel | hidden | **shown** | hidden | hidden | hidden | hidden | hidden |
| the `Filter` group | hidden | hidden | hidden | **shown** | **shown** | hidden | hidden |
| one-state buttons (`BT_OpenGuide` · `BT_OpenFilter`) | shown in EVERY bookmark |

**The check, runnable by script:** for each bookmark of the page, `the OPEN button` and `the ON-state GROUP`
must be **opposite**, and `the ON GROUP` must **equal** the state of the matching panel. **No cell may be
left UNDECLARED.**
*A case paid for 2026-09-10:* the group `BT_Glossary_On` was undeclared in **5/5** panel bookmarks; the page default
left the group `hidden` so the two leaves inside, though declared `shown`, still did not show ⇒ clicking `Glossary` **lost the button itself**.
⚠ **Buttons INSIDE a panel need no separate declaration** — `BT_CloseFilter`/`BT_ClearFilter` already follow the panel
group; declaring them `shown` while the parent group is hidden is harmless.

🔴 **Block titles (`Navigation Panel` · `Tab Panel`) and the final call-to-action line are `bold` + `#c51e24`**,
the body plain; each paragraph separated by an empty paragraph.
⚠ **The `Tab Panel` callout goes ONLY on pages with a real tab strip.** On a page without tabs it is an empty shell.
⚠ **Do NOT list page names in the Navigation Panel.** The template frame ships the 5 names of the demo copy
(`Sales Overview` · `Payment & Channel` · `Customer Analysis` · `Product Performance` ·
`Regional Insights`) — **none of these pages is real**, and a hard-coded list is wrong as soon as the pages change.

## 6. Reusable code snippets

[`reference/snippets.md`](reference/snippets.md) — absolute coordinates · walking the group tree · building complete
bookmarks · the clickable button mould · closing/opening Desktop · capturing with `PrintWindow` · reading an old `.pbix` with `zipfile`.

## Implements · Thi hành luật
- `Rule_Gate_84_PbipOpenCheck` — the report gate and how to fix what it finds · cổng báo cáo và cách sửa lỗi nó tìm ra
- `Rule_Keys_87_NoSilentBlankPage` — the stale-default check and how to fix it · phép kiểm stale-default và cách sửa
- `Rule_Keys_88_MatrixCaptionFit` — the subtotal-width check and how to fix it · phép kiểm subtotal-width và cách sửa
