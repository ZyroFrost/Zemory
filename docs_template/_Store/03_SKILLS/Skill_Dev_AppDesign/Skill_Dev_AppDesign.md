---
id: Skill_Dev_AppDesign
aka: app-design
name: dev-app-design
version: 22
type: process
installs: [scripts/ui_check.mjs]
checked: [Rule_Gate_35_OneHome, Skill_Dev_DbDesign, Struc_Repo_SystemManager, Struc_Repo_AppData]
description: Chuẩn thiết kế của một APP do repo này dựng — FE (bề mặt người dùng) và BE (tiến trình, tài nguyên). Mở khi đụng bất kỳ bề mặt nào của app, hoặc khi thêm/đổi một tiến trình nền.
---

# app-design — the APP design standard (FE + BE)

> **A DESIGN STANDARD, not a clause of law.** It describes how an app **should be built**; off-standard
> ⇒ fix it to the standard, not "weigh it up". This part is not in `01_LAW/_Rule`; `01_LAW/_Rule` only
> keeps one line pointing to this skill.

Applies to the **APP** profile. The NON-APP profile has no UI surface ⇒ read only §BE.

---

## FE — the surface people use

### F0. MINIMALISM IS THE PRIORITY RULE — read BEFORE every other FE rule

**The default of every element on a surface is NOT HAVING IT.** Anything wanting to be there must answer:
*what does the person using the app do with it?* No answer ⇒ **drop it**, never "keep it there to be complete".

**This rule stands ABOVE the other F rules.** When an F rule says *"must have X"* and nobody uses X, F0
wins: do not add X and then cite the rule. The other F rules say *"if it exists, how it must be"* —
they are not a list of things to build.

**The five things most often added in excess:**

| excess | why it is excess | example |
|---|---|---|
| **a rank label stuck on EACH item** of a list | repeats the same information N times, cluttering exactly the row people must choose from | each chip in a chip row wearing its rank label |
| **a legend** for symbols | takes a title row forever to explain something learnt at a glance | `★ = required · opt = created when there is a concern` on a card title |
| **a count** beside a card title | the list itself already says how many | `19 files` beside a list name |
| **a label repeating the current choice** | the lit chip/tab already says it | the selected item's name repeated beside the file name |
| **a "required"/"default" badge** nobody can click | it is decorative text, not a control | the same legend example above |

**The test before adding anything:** ① can the existing thing be **removed** · ② can it be **merged** into a place that already
exists · ③ **without it, which task does the person using the app get wrong**. No answer to ③ ⇒ **DO NOT ADD**.
*(The same three-question mould as the door of `Rule_Gate_38_TodoDoor` — there against a swelling LEDGER, here against a swelling
SURFACE. The same illness: piling on for safety, then everyone has to read it forever.)*

**A piece of information appears EXACTLY ONCE on a screen** (an extension of §F6, stricter): F6 forbids the same figure
living on two SCREENS; F0 forbids it living in two places on the SAME screen. An item's rank is said in the description line of the
selected item — not stuck on the chip, not repeated beside the title.

⚠ **This is where agents go wrong again and again**, so said plainly: the natural tendency when building a surface is *adding to
make it clear*. It does not make it clearer — it makes the person using the app read more to find what they need. **Adding an
element adds something everyone has to skip, forever.**

### F0b. ONE FUNCTION — ONE FRAME, ONE CSS SET

**The same function must have the same shape everywhere: the same frame, the same CSS set, the same button position,
the same label.** Never a different style per screen.

**An example of drift:** two search boxes on one screen — one tab has a text button `Tìm ✦` (accent colour), the other
has an icon button `↻` (outlined). The person using the app reads them as two different things while both are *"type to search"*.

- **Different BEHAVIOUR is no reason for a different SHAPE.** One box runs on click, one runs on typing —
  that is a detail underneath; the surface must still be the same frame. A difference must come from **the person using the app
  needing to tell them apart**, not from code convenience.
- **Things that are NOT the same function must NOT share a frame.** A `↻` button (rescan data from disk) is
  a COMPLETELY different action from searching — sitting in the search box only because the space was free. Separate it.
- **How: one shared CSS class + one markup mould**, declared once. A third search box reuses
  that mould, NOT copy-then-edit — copying is how two copies start drifting.
- **The check:** count the markup/CSS variants of the same function. `> 1` is drift, unless a reason the
  person using it needs to tell them apart can be named.

### F0c. EVERY CONTROL ON ONE ROW HAS THE SAME HEIGHT

**Buttons · chips · selects · search boxes standing on one row are the same height — no exception.** Whichever one
cannot go below a certain size, **every other one takes that size as the standard**, rather than letting it
stick out.

🔴 **Fix it by HEIGHT, not by padding + font.** This is where everyone goes wrong the first time:
`<select>` is an **operating-system** control, with the same `padding` and the same `font-size` it still comes out a different height from a
`<div>`. Measured with all three sharing padding/font: chip **28.7px** · select **26.0px** — still
off. The only sure way is declaring `height` + `box-sizing:border-box` directly from **one shared
variable**.

- **One variable, every control.** `--ctl-h` (and `--ctl-fs` · `--ctl-px` · `--ctl-r`) declared in one place; buttons,
  chips, selects, search boxes all take from it. Edit one place and the whole row follows — no way left for them
  to drift again.
- **A new kind of control is added to that list**, never with its own padding.
- **Measure by MACHINE, and measure THE RIGHT THING.** `getBoundingClientRect().height` on **the frame element itself**,
  not the `<input>` inside it — measuring the wrong thing gave 18.7px and led to a wrong conclusion.
  The check: max − min on each row ≤ 0.6px.

### F1. Adjacent panels MUST be resizable
**EVERY area with ≥2 adjacent panels MUST have resize handles adjusting their size — NO exception.** Constraints: **① REALLY free** — a seam must control a REAL layout variable (dragging changes it), "decorative" seams are FORBIDDEN (a hard `2fr`/`1fr` column = dragging changes nothing = WRONG). **② A 2D layout → drag in both directions** (2 panels side by side = a VERTICAL seam adjusting the width; 2 panels top-bottom = a HORIZONTAL seam adjusting the height; a 2×2 grid = both). Never only one direction. **③ ONE shared engine** — every seam goes through THE SAME mechanism (1 init function + 1 handle kind + data-driven variables/clamps), NOT a hard-coded `if(type===…)` branch per place (that is the source of "patch here, leak there"). A new seam = declaring data, NOT copying logic. **④ Saved + restored** exactly across sessions (server config, like dialogs). **⑤ Reset (double-click) to the default.** Min/max thresholds follow each panel's minimum content, NO magic numbers scattered around.

**⑥ THE DIVIDER RUNS THE FULL HEIGHT OF THE AREA — the default, not an option.** Two panels are almost never the same height, so a divider with only `align-self:stretch` stops at the bottom of the SHORTER panel and looks like a line falling short mid-page. The divider is **the boundary of the AREA**, not a panel's border — it must run the whole area however long either side is.
· How: force the grid row to the grid's height (`grid-template-rows:minmax(0,1fr)` on the resizable grid class), **keep** `align-items:start` so panels still take their content height — stretch the divider, not the panels.
· **Put it in the SHARED layer, do not patch each screen**: the same lesson as "sections must have dividers" — patching only the frame just criticised brings the bug back in the next frame.
· Accepted by EYE, not by a gate: a gate reads the class but does not see how long the divider is.

### F2. Dialogs / modals
ONLY 3 sizes S/M/L, all 3 the SAME STANDARD SCREEN RATIO **16:9** (a balanced landscape frame like the screen, NOT a tall dangling box). **Each size = a % of the APP FRAME in BOTH directions** (16:9), the formula `width: min(Pvw, calc(Pvh*16/9))` + `aspect-ratio:16/9` ⇒ exactly P% on a 16:9 screen, smaller (never overflowing) on screens of other ratios: **S 40% · M 60% · L 90%** (Settings = L). 3 sizes = 3 SCALES of the same ratio; S not enough → choose M/L, **still exactly 16:9, NEVER distorted**. **THE FRAME NEVER JUMPS with the content** (switching a Settings tab and the frame swells/shrinks = WRONG); overflow → scroll INSIDE the dialog (`overflow:auto` on the body, the body being a grid/flex child needs `min-height:0` to scroll). NO fixed-Nvh (produces distorted tall boxes), NO random/dynamic resizing/chaotic reflow. Layout state the person using the app adjusts (resize/position/size) must be SAVED + restored exactly. Tokens/sizes in `frontend/styles/`. **ESC ALWAYS closes the top dialog** (every overlay/popup registers 1 global keydown; ESC closes ONE layer per press in visually-topmost order) + clicking the backdrop also closes — EXCEPT a dialog running an uncancellable task (e.g. a sync in progress), which blocks both ESC and the backdrop until done.

### F3. A surface dies with its background
**Every surface depending on a background process (app window · tab · panel · waiting CLI) MUST detect the background dying and DIE WITH IT — or report a VISIBLE error. NEVER leave an empty shell looking alive.** The typical case: the background process dies while the window stays open — every button sends requests into nothing, the "syncing…" spinner turns FOREVER, the person using the app reads it as "stuck" and waits for hours while NOTHING is running. An empty shell is the WORST failure — it does not report an error, it LIES, and the person using the app has no way to tell it from really running. How: a periodic heartbeat to the background; deliberate tolerance (count only AFTER the background has been seen alive at least once, and only N CONSECUTIVE missed beats conclude — a background busy for one beat ≠ a dead background); after N beats close/report. Symmetric with the fail-open rule: a broken secondary layer falls back to the layer below **and says so**, never pretends to still run.

### F4. Words the person using the app reads
- **TECHNICAL prose, not spoken prose.** A label is a short sentence stating a behaviour. No storytelling, no emphasis
  with CAPITALS, no exclamations.
- **NO internal notes on the interface**: measurement dates, the version number of a fix, variable names, technical
  reasons. *(An example error: a label giving the date and place of a test measurement.)*
- **NO internal terms** where the person using the app has to decide (`WAL`, `.bak`, `watermark`) — unless
  the person using the app needs it to choose.
- **A cap of ~120 characters** per description label. Longer means explaining, not labelling.
- **Both languages COMPLETE AT BOTH ENDS**, including text sitting directly in markup (`title`/`placeholder`/text nodes).
- **② COMPLETE labels, machine-readable.** Every interactive element (button · input · select · link) has a label **tools can read**: text content, or `aria-label`/`title`/`placeholder`; pictures have `alt`. A bare icon button without a label is **missing something**, not "clean".
- **③ Both languages COMPLETE AT BOTH ENDS.** The "0 hard-coded strings" clause applies to **text sitting directly in HTML/markup too**, not only strings in code: text nodes and also `title`/`placeholder`/hints need a matching i18n hook, every key must exist in **both** dicts. Text of one language in markup without a hook = the person using the app switches language and **still sees the old one**, with no error firing.

### F5. Moving a surface means checking BOTH ENDS again
A surface always carries assumptions about its container. Moving it to another container without checking again is a recurring bug
(measured **four times in one session**):

| old assumption | how it breaks after the move |
|---|---|
| `min-width:auto` of flex/grid | long strings push the panel to **overflow sideways** |
| flex children can shrink | long content gets **squeezed, text overlapping** |
| `gap` handled by the parent grid | inside a tab it **sticks together as one block** |
| `flex:1` on a button (narrow column) | on a wide screen the button **runs the whole page** |

And **the GIVING side must tidy too**: pulling a column out of a grid without editing `grid-template-columns` leaves
an empty column + an orphan resize handle. The check: **number of tracks = 2 × (number of handles) + 1**.

### F6. One content, ONE HOME on the surface
The same setting must not have two places to adjust it; the same figure must not show on two screens. Two
copies always drift apart, and the person using the app does not know which one is right.

### F7. The UI must MATCH THE CODE — checked with the graph, not the eye
Whatever the surface calls must really exist, and the reverse: the edges of the graph's `api` seam compare the routes the FE calls with the real BE routes ⇒ ① the FE calling a route that does not exist = a broken UI · ② an endpoint nobody calls = a dead surface. This is a MACHINE-CHECKABLE test, so there is no reason for it to live only in someone's head.

### F8. Where UI settings live
shipped defaults → `frontend/config/` (tracked); the copy the person using the app adjusts at run time → `data/settings/` (gitignore).

### F9. Sections must BE VISIBLE — dividers + spacing
Several sections stacked with only a small title line read as **one block of text**; the person using the app
cannot see these are different groups. Each section needs **a divider** and **breathing space**, in the same
mould as the existing settings rows (one bottom line per row).

- The FIRST section has no top divider — it sits right under the panel title, an extra line makes two lines stuck together.
- This bug **recurs**: every new panel forgets it, while the old panels did it right.
  Building a new panel ⇒ COPY the mould of a running panel, never retype from scratch.
- **Write the rule for EVERY frame holding sections, never tied to one panel.** Patching only the place just criticised brings the bug
  back in the next panel. Measured: after patching one panel, a rescan still found **4 other frames** with
  ≥2 sections and no divider.

### F10. Clicking a CARD SELECTS it, it does not OPEN it
Opening at once on a card click makes the person using the app read it as *"jumped to another screen"* — they only meant to select, not
to leave the list. A card in a list: click = mark as selected (it must BE VISIBLE); opening the details goes through
**a separate button** on the card.

⚠ And with a bug report like *"clicking X jumps to Y"*, measure FIRST whether the screen really changes: there may
be no screen-switching command at all, only a detail frame that looks like screen Y. Fixing the NAME when the root is
the BEHAVIOUR never ends however many times it is reported.

---

### F11. One visual channel = ONE rank of information
**Border · background · weight are separate CHANNELS; each channel has only one owning rank.** Two states of different ranks claiming one channel ⇒ **the one declared later wins, the other disappears without any gate reporting it** — and if the two colours are also close (measured: `--primary` #FFD166 vs `--warn` #FBBF24 both as card borders) then even without overwriting, the eye still reads THE SAME meaning ⇒ the person using the app counts 6 "pinned" cards while the system pinned only 2. How: **count how many states claim the same channel, then split them again** — each channel exactly one owner, the third must speak with a text badge. An example split on a card: **pinned = BORDER** (keeping the channel it always had — do not change the reading habit of the people using it), **selected = BACKGROUND**, **off-standard = text badge** (no longer claiming the border). ⚠ Fixing this kind of bug, **do not push the victim to another channel and call it done**: remove exactly the state that intruded, keep the old channel for its old owner. Accept it with FIGURES on the real DOM (`getComputedStyle`), not a screenshot.
· The same family: **state switches must ALWAYS be visible, only actions may hide on hover**. Hiding a whole button cluster with `opacity:0` on the container is a trap — a transparent parent makes its children invisible too, `opacity:1` on a child does NOT save it; hide per button.

### F12. ABSOLUTELY no HORIZONTAL scrollbar
**Narrower ⇒ the content WRAPS, it is not pushed sideways.** Three traps measured, all three of the kind "declare half and the browser fills in the other half":
· **`overflow-y:auto` alone TURNS ON horizontal scrolling too** — CSS forces the other direction from `visible` to `auto`. As soon as one child block is too wide a horizontal bar appears without anyone declaring it. A scroll area must declare **both directions**: `overflow-y:auto;overflow-x:hidden`.
· **`repeat(N,1fr)` is a FIXED number of columns** — cells do not shrink below their minimum content ⇒ the grid is wider than the frame. Use `repeat(auto-fit,minmax(<floor>,1fr))`: wide enough and it is still N columns, narrow and it drops columns itself.
· **A `1fr` track still gets pushed wider by content** — `1fr` is really `minmax(auto,1fr)` and `auto` measures the cell's min-content. A grid cell needs `min-width:0` to shrink.
· Exceptions: **source code** blocks (`pre.code`, `.fpre`) — wrapping code lines changes their meaning, so they keep horizontal scrolling · **data grids
  on phones** (§M5) — scrolling sideways INSIDE the grid's frame, the identity column pinned left; the page still never scrolls sideways.
· Measure by machine, not by looking at screenshots: scan `scrollWidth - clientWidth > 0` on EVERY screen × EVERY sub-tab at a few frame widths (1100 · 900). Tell **`overflow:hidden` + ellipsis** (cuts text, produces NO scrollbar — valid) apart from areas that really scroll.

### F13. Cards: a FIXED ANCHOR, related things STAND TOGETHER
**The button cluster is anchored at the top right — keeping its position however the frame stretches; badges gather into one cluster; related things stand together.** A card has three ranks of content, and each rank is ONE separate ROW, never mixed:
| row | holds | rule |
|---|---|---|
| 1 | identity (icon · name) + **the action button cluster** | `flex-wrap:nowrap` — this row NEVER wraps. Buttons anchored right (`margin-left:auto`, `flex:0 0 auto`); what shrinks is **the name** (`min-width:0` + ellipsis) |
| 2 | **state badges** — all gathered into one cluster, even `gap`, `:empty{display:none}` | may wrap; empty ⇒ disappears, no ghost blank space |
| 3 | secondary figures | — |
· **Why anchor:** letting badges and buttons share one wrapping row makes the buttons get pushed down when the card shrinks and land **in the middle of the card** — the person using the app reads it as "broken", and it really is: a control without a fixed place sits somewhere different at each screen size. Anchor first, shrink after.
· **Spacing from one source only:** a cluster with `gap` does not also get `margin-right` on each badge — two sources adjusting one spacing, and the cluster is no longer even.
· **A PERMANENTLY locked button** (e.g. the app's own root repo) is `disabled` + a `title` saying why, and **blocked in the BACKEND** too — a disabled button is only a reminder, the endpoint can be called from any surface. Do not dim the button: dim means "temporarily unavailable", while this is permanent by design.

### F14. Scroll areas must RESERVE ROOM for the scrollbar
**Every scroll area declares `scrollbar-gutter:stable`; every panel reserves just enough padding so the scrollbar
does not cover the text.** A scrollbar appears at the right edge and **eats into the text** — the last figure of a row gets cut, and
the reader does not know it was cut.
· **Why `scrollbar-gutter` and not only `padding`:** reserving room with padding leaves an extra blank when NOT yet overflowing, and is right
  again when overflowing — two states, two looks. `stable` reserves the room IN ADVANCE, so the content
  **does not jump sideways** exactly when it grows by one line.
· **With breathing space** (`padding-right`): text stopping right at the scrollbar edge still reads as cut.
· **Put it in the SHARED LAYER**, listing every scroll area once. Patching only the panel just criticised makes the next panel
  catch it — the same lesson as §F9 and §F1⑥.
· Measure by machine: for every area with `overflow-y:auto|scroll`, `getComputedStyle` must return
  `scrollbar-gutter: stable`. Headless screenshots **cannot measure** this (`--hide-scrollbars`),
  so inspect the computed CSS, do not trust your eyes on a screenshot.

### F15. FREEZE when off, do not hide — and leave a way to turn it back on
**A feature/channel that is OFF greys out all its panels completely and is not clickable, it does NOT disappear.**
Hiding leaves an unexplained gap: the person using the app does not know what was there, nor
why it went.
· The formula: lower `opacity` **+ `filter:grayscale(1)` + `pointer-events:none`**. It must be FULLY grey —
  lowering opacity alone keeps colour charts reading as alive.
· ⚠ **Always leave a way to turn it back on.** Greying out the configuration box needed to turn it on is **locking yourself out** (example:
  greying out a channel's path box too means after turning the channel off there is nowhere left to type the path).
  List clearly what is exempted, with a gate watching exactly that point.
· ⚠ **A switch must not use the CONFIGURATION itself as its state.** An example error: switching a channel off called
  `/set-<channel>?path=` — i.e. DELETING the path from the config. Turning a feature off must never lose its
  configuration; keep a separate `<feature>On` flag.
· A surface drawn by **several paths** (on load · on refresh) needs the on/off flag present in **every** path,
  or it shows and hides depending on which path comes last. And the setter must clear the dashboard's cache,
  or the switch "toggles without changing".

### F16. TOTAL rows / panels sit BELOW the content
By the spreadsheet standard: a table's total row, a group's total panel always stand after what they add up. A settled layout is not
moved on your own; wanting to change it ⇒ present it for approval first (`Rule_Keys_62_DesignChangeApproval`).

### F17. Navigation groups by TASK; each area has ONE owning page
**The primary rail groups pages by what the person using the app comes to do — overview · opening an app · logs ·
administration, only the groups the product really has.** Each area has one owning page; the overview keeps summary figures
and links to it, never a whole app list or log feed again (§F6 on one screen).
· **Location apart from actions.** A short breadcrumb (product › page, chevron separator) says where you are; the page header
  beside it holds the title and the page's own filters and actions. Narrow ⇒ it wraps (§F12).
· **A compact header stays on ONE row** at every width: secondary filters and actions move into a labelled popover (§F18); one
  search box, always in the same place, searching the current page; the greeting sits beside the account button, which carries
  account settings and sign-out.
· **A long rail:** related admin pages ⇒ a collapsible group in the expanded rail; in the collapsed rail one labelled group icon
  opening a keyboard-reachable menu. Each page keeps its own URL, selected state and unsaved-change guard. On a phone the menu
  stays inside the screen and the bottom tab bar (§M3) stays usable.
· **The shared admin matrix** (person × app, on the `system-manager`): one person = one compact row; the `system-manager` column
  first, then the apps by code; a lower admin scope opens from a small labelled button beside the role, never as extra lines in
  the row; search before filter in its toolbar.
· **Reorganising a template keeps every interactive effect:** list the original's effects before moving anything, then check
  each one on the page that now owns it (§F5).
· Accepted by EYE, not yet by a checker code: U1 and U3 catch overflow and control height, not a header falling to two rows.

### F18. Popovers and menus are OPAQUE
**Every popover and menu has an opaque background in every theme, glass themes included** — text and controls behind it must
not show through. Keep its shadow, layering and opening animation; check light and dark. Accepted by EYE, not yet by a checker
code.

## THE CHECKER — rules that can be measured are checked by the machine

Rules written in a skill do not enforce themselves: a settled rule still gets broken again when no machine watches it.
- Each measurable rule of this skill (F0c control height · F2 dialog sizes · F4 labels and label length · F7 routes · M1–M6) ⇒
  one code in the repo's check script; the build or gate calls that script. The command running the script belongs to the repo, declared in the `repoGates` key of
  `docs/.harness.json` (pre-commit runs it) — not written into this skill's copy (the copy stays identical to HS, `Rule_Gate_83_HarnessFromStore`).
- Exit codes: 0 green · 1 errors (each place printed) · **3 not fully checked** (a layer needing a browser could not run) — never counted as green.
- Frozen old-system files ⇒ a warning with the list of debts, never silent. Exemptions are declared with a reason; an exemption no longer matching anything ⇒ an error.
- Adding a measurable rule to the skill ⇒ adding a code to the checker in the same round. Rules not yet machine-measurable (F0 · F0b) are the approver's work.

### The shared surface check — `scripts/ui_check.mjs`

This skill installs one browser check every app runs, so the rendered page is measured, never judged from a screenshot. It opens every
page at every width in Edge/Chrome (DevTools protocol, headless, **real scrollbars** — `100vw` overflowing by the scrollbar is a bug
to catch) and measures the layout:

| code | rule | breaks when |
|---|---|---|
| U1 | F12 · M1 | the page scrolls sideways, or a phone widens its layout to fit something too wide |
| U2 | F5 · F12 | an element sticks out of the window and is not inside a frame that scrolls or clips it on purpose |
| U3 | F0c | controls on one row differ in height by more than 0.6 px |
| U4 | F0 | dead space: a table fills less than `min_fill` (default 60 %) of its frame's width |
| U5 | F5 · F13 | text overlaps text, or text overlaps a chart (≥ 60×30), in the page flow — a label placed on a chart on purpose (absolute) is not judged |
| U6 | — | a chart frame (`chart` · `bars` · `spark` · `donut` · `ring` · `graph`) has nothing drawn in it |
| U7 | F14 | a scroll area without `scrollbar-gutter: stable` |
| U8 | F4 ② | a control or link without a readable label |
| U9 | F4 ③ | Vietnamese broken into `?` by an encoding (`Th?ng k?`, a `?` shown alone instead of `—`) |

- **Config** `ui_check.json` at the repo root: `url` (the dev server or a `file:///` mock-up) · `pages` (each `{name, hash}` or
  `{name, click: "<selector>"}`) · `widths` (default 1920 · 1440 · 1100 · 900 · 390; ≤ 768 is measured as a phone) · `settle_ms` (wait
  for animations) · `ignore` (selectors never judged: a decorative background, a closed overlay) · `codes` (`{"U4": {"min_fill": 0.5}}`,
  `{"U6": {"off": true}}` — turning a code off is an exemption: write its reason in the repo).
- **Run** `node scripts/ui_check.mjs` (· `--page <name>` · `--widths 1440,390` · `--config <file>`). Wire it into the repo's gate
  (`repoGates`) for every repo with a UI; a change to a surface is not done until it is green at every width.
- **Self-test** `node scripts/ui_check.mjs --self-test` builds a page that breaks every code once and must catch each one — run it
  after changing the script.
- The phone width is emulated directly through DevTools (`Emulation.setDeviceMetricsOverride`), so a 390 frame is exactly 390 — no
  `<iframe>` needed; a page that still reports a frame wider than 390 is the U1 (M1) bug itself.
- A mock-up or a template is checked the same way before it is shown for approval: a measurement that says green is the first
  review, the eye is the second.

## M — PHONE (apps with a phone layout)

Adding a phone rule goes in this order: ① the owner approves one design point · ② it is written as a code in the checker · ③ run on
the unfixed build — it must be red (on a build already passing, break the code to make it red) · ④ fix the interface until green. Only pages with an approved phone layout
enter the phone check list; entering early makes the gate red before there is a design.
- **The desktop build does not change.** The phone layer only ADDS, applied below the breakpoint.
- **The breakpoint ≤ 768 px** (`@media (max-width:768px)`); the whole-page zoom factor does not apply below the breakpoint.
- **M1 — fits the screen.** At 390 px the page is no wider than the screen, no element sticks past the right edge; wide tables scroll INSIDE their
  frame. The trap: a flex child carrying `min-width:auto` = the width of its longest row ⇒ pushes the overflow even when the row scrolls itself — the frame holding a scrolling row needs
  `min-width:0`. Phones WIDEN the layout frame by the overflow ⇒ a reported width larger than 390 is exactly the M1 bug.
- **M2 — no zoom.** The whole-page zoom factor is off below the breakpoint.
- **M3 — the tab bar at the BOTTOM**, each tab an equal share; the desktop keeps the old place.
- **M4 — touch targets ≥ 44 px**: `--ctl-h:44px` below the breakpoint (one variable, as in §F0c).
- **M5 — data grids** keep the table form, scrolling sideways inside their frame, identity columns (code · name) pinned left, an opaque background; a secondary rail beside them
  with no room left ⇒ hidden on phones.
- **M6 — dialogs** are full screen below the breakpoint (the 16:9 frame of §F2 does not fit a portrait screen).
- **Measure at the right size:** headless browsers have a minimum window width (Edge about 500 px) ⇒ capturing or measuring "a 390 window" measures a wider
  layout and then crops it. The checker puts the page in an `<iframe>` of exactly 390 px and refuses to judge (code 3) when the width received differs from 390.
- Outside UI/UX skills give recommendations while designing; what is in force is this section.

## BE — processes & resources

### B1. EVERY process of the app gathers into ONE group — none left out

- An app may spawn many processes (daemon, windows, background jobs, library helpers). In the OS process
  table, **all of them must come under one group bearing the app's name** — no process standing alone with
  the name of the library that spawned it.
- **There must be a register**: each process the app spawns is declared on one line (the name shown · who launches it ·
  how long it lives). Spawning a new process without declaring it in the register = **a shortcoming**, even when it runs right.
- Applies to **old and new processes alike** — a dependency's prebuilt helper must also be renamed/repackaged.
- *The typical case: `tray_windows_release.exe` (the Go helper of `systray2`) stood alone for almost two months,
  while the main process had borne the app's name from the start. Renaming half is worse than not renaming: the
  reader believes everything is gathered.*

### B2. Background processes must not open a console window
Every launch path (shortcut · autostart · self-restart after an update · launch from the UI) must be hidden.
A black window is a technical surface leaking to the person using the app, and **closing it by mistake kills the process**.
Hiding the console **requires** a way to view the log inside the app — otherwise the diagnosis
*"why is it not running"* gets blocked too.

### B3. One writer per data store; several TARGETS ⇒ one ledger per target
Writing to two different data stores is valid. What must be separated is **the progress ledger**: sharing one key
for every target makes whichever target writes first swallow the later target's share, silently and permanently.

### B4. Two kinds of version-up
① AUTOMATIC (the app checks+downloads+applies itself) → `backend/src/update/` (coordinating `attic/`+`dist/`+`migrations/`). ② MANUAL (settle build X, push it to the target machine/VM) → git tag → `dist/` build → `backend/scripts/deploy.*` → back up the running build into `attic/` BEFORE overwriting → roll back if broken. Use the existing infrastructure, NO new concern.

### B5. Deploying is TWO-WAY work
NOT a one-way push. The target machine has the previous backup → verify it matches the local `attic/` BEFORE overwriting (a difference = hand edits outside the flow, investigate first); after deploying pull the just-replaced build back into the local `attic/`. The same principle as the additive merge of data sync.

### B6. Tests — running the app is the main test
NOT required — running the app itself = the test; a test folder only for logic cores that break quietly (search/migration/privacy). FE: e2e/stories co-located or `frontend/test`.

### B7. Version numbering
git=source(tag/branch) · `dist`+Releases=build · `data/snapshots`=data · `migrations`=schema · `05_CHANGES`=log. NO hand-copied `versions/` folder. **RELEASE-BASED bumps: the version number rises only when RELEASING/deploying a build, NOT per commit/per feature; the number is chosen by the table of `Skill_Dev_Release` (semver M.m.p — minor=feature, patch=deployed fix); all work between 2 releases GOES INTO the next version; the number's source = `package.json`(Node)/`__version__`(Py) — 1 place; release notes = `05_CHANGES`.**

## Conventions taken over from merged laws

- **Layout:** a settled layout is invariant (`Rule_Keys_62_DesignChangeApproval`); every TOTAL row and panel sits BELOW the content,
  as in a spreadsheet.
- **Interface words through i18n:** every string the person using the app sees goes through i18n, both dictionaries complete, switched by a setting; no hard-coded
  strings; technical terms kept as they are. The UI dictionary: slot `Frontend_137_UiDictionary`.
- **Layer separation:** the interface only calls the server's API; business logic, queries, calls to outside services sit on the server. The interface sends a query
  name + parameters, never raw query text.
- **An app of a family** (`Rule_Keys_90_AppFamilyContract`): data in the family's shared DB (kept by the `app-data` repo, the app has no DB of its own, no
  DDL) · roles granted on the shared admin screen of `system-manager` (the app builds no admin screen) · logs of six event groups by the codes in the contract
  table of the `app-data` repo.
  - Checking a login session: remember the result of checking a session in app memory for at most 10 seconds, dropped at once on logout · revocation · lock ·
    password change · role change — checking every request with an SQL query makes the DB server carry useless load. A revocation on the shared screen takes effect in the app at most
    one such memory period later.
  - DB connections have a timeout: a hanging connection attempt is abandoned after 60 seconds, at most a few hanging attempts at once; a hanging attempt must not block
    everyone's login until a restart.
  - **Shared sign-in** (law 90 Do 4–5). The family's real names (cookie, app codes, sign-in path, expiry hours) are written once in the `system-manager`
    repo's constitution; the app's own `Cons_Gate_14_Access` points there and adds only what is its own.
    · **Read, never issue:** the `system-manager`'s session cookie reaches the app because the app sits on the same address under its own path. The app reads it
      on its backend and never sets or clears it.
    · **The session check:** the token, looked up in the family DB's session table with the `system-manager`'s app id (looked up by app code once when the
      connection opens, never a hard-coded number), both expiry limits of the `system-manager` (absolute and sliding idle), joined to the account, and the role from
      the role table with THIS app's id. A real lookup touches the last-seen time; the app never deletes a `system-manager` session and never logs its expiry.
    · **The answer:** no cookie · no live session · account locked · temporary password still to change ⇒ page: redirect to the shared sign-in with `next`;
      API: 401 that carries the sign-in address. Live session, no role in this app ⇒ 403 "no access to <app>" — never back to sign-in, or it loops.
      Live session with a role ⇒ through.
    · **`next`** is the full path from the root of the address, the app's own prefix and query included (`/<app>/jobs?id=3`); the redirect points at the
      shared sign-in at the root, not at `/<app>/login` (a base-path layer must not prefix it). The `system-manager` accepts only `next` that starts with one `/`.
    · **Frontend:** a 401 ⇒ go to the address it carries. Sign out ⇒ call the `system-manager`'s sign-out by its absolute path, then go to its sign-in.
      Change of password and profile ⇒ a link to the `system-manager`. The app's header links back to the `system-manager`.
    · **Moving off an own sign-in:** accept the old cookie and the shared one for a while, pass the six checks below, then remove the old path.
    · **Six checks behind the gateway:** ① no cookie ⇒ redirect with the right `next`, API 401 · ② sign in ⇒ back on the same app page · ③ no role ⇒ 403, no
      loop · ④ role removed on the shared admin screen ⇒ refused within one session-memory period · ⑤ sign out from the app ⇒ the `system-manager` asks to sign
      in again · ⑥ account locked ⇒ refused at the next lookup.
- **Security guarded on the server, blocked by default:** a new write function ⇒ blocks every role not declared as allowed; hiding a button in the interface
  does not count as security. Every endpoint returning data stands behind the login layer.
- **Named queries in code run as strings:** a worker loaded with eval cannot import the query library ⇒ pass named queries through
  `workerData` (`Rule_Gate_35_OneHome`).
- **Test temp folders:** the test runner gathers the temp folders of every child process into one parent folder of the run, deleted when
  done, and tidies abandoned runs; the number of folders in the system temp folder before and after a run is equal
  (`Rule_Gate_04_ScratchFiles`).

## Implements · Thi hành luật
- `Cons_Gate_13_Architecture` — how the layers of an app are built · cách dựng các lớp của app
- `Rule_Keys_62_DesignChangeApproval` — the design standard whose suggestions are shown first · chuẩn thiết kế mà gợi ý phải trình trước
- `Rule_Keys_90_AppFamilyContract` — an app of a family: one database, one sign-in, one admin screen, the family's log codes · app của một hệ: một DB, một đăng nhập, một màn quản trị, mã log của hệ
