---
id: Skill_App_SneatGlass
name: app-sneat-glass
version: 56
type: process
checked: [Skill_App_Sneat, Skill_App_Glass, Skill_App_Base, Design_172_Design, Skill_App_Shell, Skill_App_ShellUse]
installs: [scripts/sneat_glass_check.mjs]
description: The Sneat-Glass kind of an app surface - the Sneat layout (skill app-sneat) wearing the Glass look (skill app-glass) - plus the rules this mix needs of its own - one page toolbar, the frame that stays put, the dialog sizes, the layout settings, the glass controls. Use when a repo declares {"style": "SneatGlass"} in frontend/config/ui.json, or when building or fixing such a surface. Vietnamese triggers - "sneat glass", "kiểu sneat-glass", "thanh lọc", "bộ lọc trang", "neo khung", "cỡ hộp thoại", "bố cục rộng", "bố cục gọn".
---

# app-sneat-glass — the Sneat layout with the Glass look

> A KIND skill made of two: `app-sneat` holds the layout of the Sneat kit as the kit has it; `app-glass` holds the look; this
> skill holds what the mix needs of its own. Each rule came from a correction of the requester and has its machine check in
> `scripts/sneat_glass_check.mjs` (named in brackets), which the repo's browser test runs on every page; a rule a page cannot
> show by its DOM alone is a probe of the browser test, named in §6.

## 0. Choosing the kind

- A repo declares `{"style": "SneatGlass"}` in `frontend/config/ui.json`; it follows `app-sneat` for the layout and `app-glass`
  for the look, and this skill where the three meet. A rule here beats the other two on such a surface.

## 1. The page bar — two groups that never meet

- **Every page card carries one bar of one design** in row 2 of the top bar (§2b), in two groups:
  - the **page's own tools** stand from the LEFT: what the page shows beside its name (who is online), its main action (the
    add button);
  - the **seek group** stands at the RIGHT end, always side by side in this order: the filters pinned on the bar (§5), the
    filter button, the filter box, the view switch (list · grid, or the page's own views). [bar-anchor]
- The seek group takes the rest of the line and its pinned filters shrink (ending in "…") before it would reach the left
  group; the two never overlap; pinning a filter never moves the left group. [bar-anchor] [filter-row]
- **Every button of the page's own tools is a framed button** (v41): in the left group each button wears the filter button's frame - the toolbar
  height, a fill or an edge, the kit radius, the accent when on, a press that gives - never a bare icon; a coloured button
  (the add button) keeps its colour at the same height. The frame gives a plain button this look by itself. [tool-framed]
  Every button of the left group, the add button too, stands at the height of the filters on the right, within 1 px (v42). [tool-framed]
- **Every control of the bar is ONE size, locked** (v43: the "+" stood 38 px beside pinned filters of 34 px,
  "phải khóa lại chính xác size"): the page's tools and the "+", every pinned filter, the filter button, the filter box and the
  view switch are drawn at `--tool-h` (38 px, set once on `.page-toolbar`) within 1 px; a button carrying only an icon is a
  square of it. No style rule of the frame or of an app writes a number for the height of a control of the bar, or for an icon
  button's width - `Rule_Gate_97_BarOneSize` blocks it as it is written; the size changes only through `--tool-h`. [bar-one-size]
- **Both ends of each row keep the same room** (v42): row 1 and the page bar - from the left edge to the first
  control as from the last control to the right edge, within 2 px. [bar-ends-even]
- **Row 1's buttons are framed** (v42): the apps and the
  bell are squares with the bar's frame (fill, edge, kit radius) at the search box's height; open, lit as the filter button.
  [head-framed] **The right of row 1 is one group, one third of the bar** (v51): the search and the actions stand
  together at the end of row 1, exactly a third of the top bar wide (the search takes what the buttons leave), every part
  apart from the next by the page bar's own gap - never a wider gap before the search. [row1-end]
  **The crumbs are parted by the kit's chevron,** never a typed "/" ("cái path nên thành >"). [crumb-chevron]
- **What is chosen is lit, the rest wears the grey frame** (v42): every tab of a row is framed at rest; the chosen tab, the chosen view of
  the switch and a tool that is on are filled with the accent (white words), and a light runs across the one just chosen,
  once (FX: sheen; off with the pointer effects and with reduced motion). [chosen-lit] **The menu row of the page on screen
  keeps the template's own chosen look** (v50): it stands on the white glass pill (the glass-strong colour), its words the text colour, its icon the accent -
  never the accent fill of a chosen tab. [menu-pill-glass]
- A page with one view (every report) shows no switch at all (a faded switch only took room on the bar); a switch, when shown, has two views or more. A page with no filter yet still shows the filter button, turned off.
  [toolbar] A switch that is on does what it says: the list view shows rows (a table, sortable by its headers where it helps -
  status, latency), the grid view cards; a page of cards (a launcher) gets a real list view, never a switch that changes
  nothing. [view-real]
- **One design:** box, filter button and view switch have the same height, corner radius, glass fill and edge; the view
  switch is one group; never a Sneat button beside a Glass box. The chosen view is lit in the accent, and so is the filter
  button while its popover is open. [toolbar]
- **The filter box keeps its width on focus** - the focus lights its border, never grows it (a box that grows runs out of its
  panel) - and keeps room for its icon (Sneat narrows a focused field's padding; the surface pins the start padding).
  [search-steady] [toolbar]

## 2. The frame stays put (`app-base` F21 in this kind)

- From a tablet up the window never scrolls. A page of several cards scrolls the page column under the glass top bar: the
  bar stays where it is, lies over what passes under it, and nothing shows above it - cards slide under the bar, never get
  cut at its lower edge. [frame]
- A page whose content is one page card fills that area and scrolls INSIDE the card: the page bar (row 2 of the top bar) and
  its table's header row stay pinned, as in the Glass shell. A frame inside the card body is never a scroll box of its own
  unless it pins something itself (a matrix whose first column pins sideways). [frame]
- **A table page: the card fills, the table scrolls inside - settled** (v46, for every app of
  the family): a page of a table or a matrix is one page card that fills the frame (`fill`, the default), its table scrolling
  inside it with the header row and the first column pinned and the page bar always there; a page never scrolls its whole
  column for a table. Only a board of several cards (an overview of figures and charts) scrolls the column, and a board stands
  as the system manager's own overview of figures: the same page bar, no page card round it, each card its own glass straight on the wallpaper, apart
  by the kit's row gutters (the frame's `board`, v49).
  The room for the data comes from row 1 folding (`head_fold` Most room, §2b), never from scrolling the whole page. The
  table is level with the page bar: its first column's text starts where the bar's tools start (.75rem from the card edge).
  The table of a table page stands straight in the page card's body, never wrapped in an inner card; a table in a panel of a
  board (an inner card) keeps that card's 1rem inset (v47, Dashboard 09/11). [table-edges] [card-inset]
- **The tab panel of the sibling pages** (v46, Dashboard 08/11 - "khu vực tab phải là khu vực tách rời, ko
  được load lại… gần như là panel khung dòng thứ 3… nó cũng phải neo"): an app that groups many pages under one menu row turns
  on the frame's tab panel (`pageHead`); it stands above the page and outside it - moving between its tabs changes only the
  page - pinned at the top; it is the top of the page card, the same glass block, parted from the page by a faint dashed line,
  never a panel apart (v48); low
  and tight, never wider than the card; one even space between its tabs, equal to its room at the ends ("phải cách bằng với
  padding 2 đầu chứ"); the page on screen is lit by a
  pill sliding from the tab before; tabs that do not fit one row go under "Thêm (n)", the page on screen always on the row
  (never tabs on three lines). [page-tabs] **One setting for how the pages of a group are seen** (v56), Settings > Layout:
  One page per tab (the default, for a new person on every screen) · Long scroll (every page of the group on one long page,
  only in an app that has one) · No tabs; the long page and no tabs show no strip - a long page needs no tabs, and an app never
  keeps its own switch for it on the page bar. [page-view-scroll] **The strip is the top bar's third row** (v50, v56): it pins
  right UNDER the top bar, never at the scroll box's top behind it (a board once lost its strip under the bar), docked on row 2
  with no gap whether row 1 shows or folds - one block, the bar's lower corners and the strip's upper ones square, a faint
  dashed line between - on screen with nothing over it; the one gap left is the block's to the page (a strip standing apart
  made the gap over it and the gap under it unequal). [tabs-dock] Over a board the strip ends the block, its lower corners
  rounded (v52); over a page card its lower corners join the card. [tabs-round] **The tabs are one cluster, led by a grip**
  (v56: a report of few pages lost a whole row to its strip): left automatic (the default) the cluster stands in row 2 - between
  the page's tools and the seek group, touching neither, one framed group at the bar's one height - when every tab fits there
  with room to spare, else as row 3; it moves back only when it no longer fits, never flipping on a few pixels. The person drags
  it by its grip onto row 2 or under the bar to pin it there (a setting of theirs; Settings > Layout puts it back on automatic);
  pinned to row 2 with too little room, the tabs left over go under "Thêm (n)". A phone keeps row 3. [tabs-cluster]
- **The whole app scales to the window from one design canvas** (v50): signed in, the page is drawn on 1920 x 1080 and zoomed to min(width/1920,
  height/1080), never above 1 nor below 0.7, so dragging the window never re-flows the layout; a phone (768 px and less) is
  never zoomed. Each person turns it off in Settings > Layout (Scale to the screen: fit the window | 100%). Under the zoom,
  window heights and widths come from the frame's --app-h / --app-w (never vh / vw), and a size or place written from a
  measure on screen (a dropdown, a popover, a tip, a menu, a pill, a drag) is divided by the zoom - the frame exports
  uiZoom / toPage for an app's own code. A checker measures the design's px: it turns the scale off
  (localStorage sasinShell.scale = off) before the page loads. [ui-scale]
- **A period the page always holds is never counted as a filter** (v52): the filter
  button counts only what the person set - a fixed period or business day (`fixed`, `data-fixed` on its field) is never part
  of the count, nor lit as set. [filter-count-fixed]
- **A tip shows one line per fact, at the page's size** (v51): each line of a `data-tip`
  (`\n`) is one line of the tip and never wraps; the box is as wide as its longest line (up to the window, placed back inside
  it); its words are the page's size (.875rem), never smaller; a number in a tip is written whole. [tip-lines]
- **Every table stands in a sideways scroll box of its own** (v51: a widened column
  ran a table out of its panel): a table of a page card, a board card or a dialog sits in its own box that scrolls sideways
  (`.table-responsive`, or the page card's body), inside its card; a column widened past the card scrolls there, never spills
  out of the card. A box that CAN scroll is no scrolling: only content wider than its box is (v52, an app of the family read
  this rule as at odds with the report rule against sideways scroll - they hold together: every table boxed, none spilling).
  [table-boxed]
- **A list longer than the screen stands in one screen** (v55, every app of the family): a table taller than the room under
  the top bar (`--table-room`) scrolls inside a box at most that tall, its header row pinned at the box's top - the body of a
  page card that fills the frame, or a box of its own (a panel, a journal); never the page column scrolling the whole list,
  never a box as tall as its list. The frame gives this itself: in a fill card each box of its own holding a table is a list
  window as tall as the card body on screen at most (`.list-window`, `--card-room`), on a page that does not fill the table
  window (1.13.1) - an app writes no cap of its own. Read once the page has drawn its tables. [list-one-screen]
- **Every stop of the path is a page** (v53): every node of the menu is a page - a leaf the app's page, a branch (a
  department, a group of reports, a group inside it) the list of what it holds, a row the width of the page per part with its
  pages spread across it. The app gives a branch its own list page (`to` of the row, of a `toggle` group); without one the frame
  draws it at `/~/<keys>`, its crumbs the branches down to it. In the menu the words of a row with sub-rows open its list page,
  its chevron only folds or unfolds, hovering the row unfolds its tree (leaving folds it, the branch of the page on screen
  stays); folded, the icon opens the page. The crumbs, the menu and the list page read one tree. [nav-stops]
- On a phone the window scrolls and the top bar is sticky.

## 2b. The top bar — one glass head of two rows, the same in every app of the family

- **One glass block, two rows, no gap:** row 1 (56 px) is the family's bar, row 2 (44 px) the page's bar, a hairline between
  them. **Whether row 1 folds is the person's setting** (v45), Settings > Layout > "Thu gọn hàng 1
  khi cuộn" (`head_fold`): **Fixed** (the default) - row 1 always shown; **Most room** - scrolling down the page's own scroll
  folds row 1 away so only the page bar stays on top and the page takes its room, scrolling up or reaching the top brings it
  back, and while it is folded a button at the end of the page bar (the bar's one size) opens it by hand, the next scroll down
  folding it again. The page's own scroll is the window, the page column, the page card's body, a box marked
  `data-page-scroll`, and on a page that fills the frame the table's own scroll box in the card body when at least half its
  height; a small box inside the page (a log at its foot, a list in a dialog) never folds row 1 (v42, Reconcile 07/11). One
  scroll only: the header row, a pinned first column and the page bar always stay. A page with no bar of its own shows row 1 only. [crumbs] [frame] The head grows with its two rows - never the kit's fixed
  `block-size: 4rem` that the page bar spills out of - and the page starts below it, nothing of the page under the bar.
  [head-whole]
- **Row 1 gives its room to the crumbs:** the crumbs from its start, then the one search right beside the buttons at its end,
  and the buttons are only apps · bell · account. No day and time. A phone drops the crumbs from row 1. [crumbs] The family,
  the app and the page on screen always read whole; only the layers between them shrink to "…" and show their whole name on
  hover. [crumbs-whole]
- **The crumbs are family / app / [group] / page:** a small app is `<family> / <app> / <page>`; the system-manager is
  itself an app, the hub (`<family> / Hub / Administration / Users`). The second crumb is the app named under the family name
  in the menu. Every layer before the current page is a link to that layer's home (the family's and the hub's home is the
  launcher, a group's its first page) - even when that home is the page on screen; only the current page is plain text
  (`aria-current="page"`); no title repeats the last crumb. [crumbs]
- **The account menu is the kit's:** its heading is the greeting on ONE line ("Good evening, <name>") with the role under it;
  then My profile, Settings, the quick settings - language (VI · EN), light / dark, the glass switch - and Sign out. The
  greeting never takes room in row 1. [crumbs] [bar-switches]
- **The version of the open app stands at the foot of the menu** (`v<M.m.p>`, read from the app's health), hidden while the
  menu is folded; never in row 1.
- **A page bar carries no tab of the app's own to a page of the menu:** the pages of an app are found in the menu; the page
  bar's left group is the page's tools (its main action, a switch, the cross-filter chips). Only the frame's tab cluster may
  stand in row 2 (v56, [tabs-cluster]). [tabs-in-menu]
- **A name a person reads carries no record code before it:** the menu, the crumbs and the card titles say the name
  ("Internal Control Report"), never the code first ("IC_02 …") - the code is an identifier. [no-code-prefix]
- **The menu brand shows the app's name with its accent part (`.text-primary`, the end of the name) in the shared brand
  colour token `--g-brand`,** in both themes; the app defines the token. [brand-one-red]
- **The family wallpaper tone is red, white and black, white the most** (v43): the family's brand tone (named by the frame in `data-wall-brand` on `<html>`) in both themes: the
  large blob a a white light, the large blob b black (charcoal on the light theme), the brand colour (`--g-brand`) only in the
  small middle blob c, smaller and fainter than the others; the tone's swatch in Settings shows the same three. [wall-brand]
- **Under the family name,** the small line names only the app currently open (`data-app-name` of the menu): the dashboard
  app's name in the dashboard app, the hub's own name in the hub. It stays fixed while moving between that app's pages; the
  crumbs name the current page. [brand-area]
- **A menu group label clears its short divider line** by at least 8 px while the menu is open. [menu-header-gap]
- **A group of the menu is a layer of the crumbs, never a heading in the page:** a department or an area the menu groups pages
  under is one layer of the crumbs (`<family> / <app> / <group> / ... / <page>` - several group layers when the menu nests them),
  its own page lists what it holds, and every page under it shows it in its crumbs. A page card never repeats a group's name as
  a heading over its content; an inner card's own title is its own name. [group-in-crumbs]

## 3. Dialogs — exactly S / M / L (`app-base` F2 in this kind)

- A dialog is a `<dialog>` holding the kit's `modal-content`, size class `sz-s` · `sz-m` · `sz-l`: `width: min(P vw, P vh × 16/9)`
  and `aspect-ratio: 16 / 9`, P = 40 / 60 / 90. No `min-width`, no `max-height` that bends it; the body scrolls inside; switching a
  tab never moves or resizes the frame. Full screen on a phone. [dialog-size]

## 4. Layout settings (the kit's customizer)

- Settings › Layout, for every person, saved as their UI setting: **content width** wide (the default: the content fills the frame,
  `app-base` F22) or compact (the kit's container width); **menu** expanded or collapsed (the round button on the menu saves the
  same setting). [wide]

## 5. Controls and effects

- **Corners are rounded lightly, as the kit has them:** cards, fields, buttons and menus `.375rem`, dialogs and large frames
  `.5rem`, never more - except a shape round on purpose (a pill, a circle: its radius reaches half its height). [radius-kit]
- **A select opens a glass menu,** never the browser's own list: it springs in, is opaque, marks the chosen item, keeps the
  keyboard (arrows, Enter, Escape) and fires `change`. Inside an open dialog the menu joins the dialog (the top layer).
- **No per-cell hover squares:** in card view a card is one panel; the kit's `table-hover` paints each cell and is turned off
  there. [card-hover]
- **Effect elements carry no browser decoration:** a pill made of a list item has `list-style: none`; close buttons sit inside the
  row they close. An element an effect puts into a control (a ripple ring) is placed out of the flow by the kind's own CSS -
  one effect per control, never a former kind's effect whose CSS is gone (its ring then sat in the flow and grew every button
  it was pressed in). The browser test presses each dialog button with the real pointer and measures it while held (§6).
- **A floating menu over a glass card** (a row's dots menu, a select's menu, a filter's list) is placed on `<body>` (or the open
  dialog): a card with `backdrop-filter` becomes the box a fixed menu is placed in.
- **Every effect of the Glass template** keeps its `FX:` marker in the code (`app-glass`); the cards of a page rise in one after
  another when it shows (FX: reveal).
- **Scrollbars are the Glass template's** on every scroll box (12 px, a soft rounded track, the accent gradient thumb inset by
  a transparent border), never the browser's default; no rule sets `scrollbar-color` or `scrollbar-width` (Chromium then drops
  the template's parts). [scrollbar]
- **A pinned header row or column is the card's glass, clear through:** with glass on it paints nothing of its own - no fill,
  no blur layer (a layer inside a glass card only blurs the card's white: a white band; a table cell cannot carry a
  `backdrop-filter` anyway). The rows that scroll under a pinned header are CUT at its lower edge instead: the table body is
  clipped from the scroll offset (`clip-path: inset(var(--st) 0 0 0)`, `--st` set from the scroll box's `scrollTop`), so
  nothing reads through its titles. A pinned FIRST COLUMN is cut the same way sideways: each other cell clips what lies under
  the column (`clip-path: inset(0 0 0 max(0px, --sl + --fw - --x))` from the box's sideways offset, the column's width and the
  cell's left). With glass off a pinned cell carries the solid fill. [pin-cover]
- **The vertical scrollbar starts under the pinned header:** the scroll box carries the header's height (`--th`) as its
  scrollbar track's top margin, so neither the thumb nor the rows reach up beside the titles. (Probe of the browser test, §6.)
- **The glass switch sits in the account menu** beside light / dark, on while glass is on. [bar-switches]
- **What a page card holds keeps the kit inset:** the first inner card (a panel, a figure card, a tile) starts at least 1rem
  inside the page card body - below its top edge and within its sides - never flush; a plain table may run edge to edge.
  [card-inset]
- **Only the kit's controls, one font:** every control is `form-control` · `form-select` · `form-check-input`, every dialog label
  `form-label` · `form-check-label`, forms on the kit's grid (`row g-*` · `col-*`), the token font everywhere - svg text and numbers too - and
  that font really LOADED: the app ships the font file itself (a font only named falls back to the system font unseen); no class
  of a former kind survives a port. A switch keeps a gap to its label. [kit-controls] [switch-gap]
- **The sign-in page keeps its own look but the app's font and reading size:** the token font, labels and fields 16 px (a
  field under 16 px makes a phone zoom the page on focus), notes 14 px or more. Sizes are measured as shown: a page drawn on a
  fixed canvas and zoomed to fit sets every size as a floor on screen (size × 1/zoom, never below the written size); the check
  multiplies the font size by `currentCSSZoom`.
- **A scrolling list never squeezes its rows** (a dropdown, a dialog list): the rows of a height-limited flex column keep
  their height (`flex-shrink: 0`), none overlaps the next; the list keeps a scrollbar gutter. [list-rows]
- **The folded menu is centred:** the badge, its brand row and every icon on the rail's centre line, within 1 px; the brand row
  is the rail's width while folded, never the kit's own (v43: the badge stood 6 px right of the icons); the brand
  word leaves no room behind. Each folded row is a square, so the lit pill on it is a square too (v44). [folded-centre]
- **The folded rail is slim and its badge whole** (v41; v43): 64 px (4rem), not the kit's 84; the badge 28 px at least, inside the rail, uncut, in its own shape - never
  squeezed or stretched. [rail-slim]
- **No fake button:** every button does something - a link styled as a button never points at the page already open; an
  item that would (a notification about the home page) gets the action it means (open that app, turn that card) or none.
  [real-actions]
- **Every data table keeps column resize,** both ways: a visible `col-resize` handle per header cell in list view; the widths
  are a UI setting of the person. A resizable table lays out by its set widths (`table-layout: fixed`, text longer than its
  column ending in "…"), so a column narrows as well as it widens, down to 48 px - the automatic layout keeps a column as wide
  as its longest line. Widths are measured on the layout (`offsetWidth`), never the painted page (a page rising in is scaled);
  a drag starts from the width drawn now and is followed on the window until the button is up (a handle drawn anew mid-drag
  must not end it); the handles carry no listeners of their own - one listener on the document takes every handle and each
  table keeps its widths on itself (a handle left from an earlier install, its listeners removed, never started a drag), and a press is taken by where
  it is - within 8 px of the right edge of a header cell - not by its target (another element may hold the pointer);
  header cells drawn anew get their handles back. A port carries the handles' CSS too. [resize] (The drag
  itself is a probe of the browser test, §6.)
- **Every chart shows its numbers,** as a report does: a value on each bar, data labels on a line (every point when they fit,
  else the highest, the lowest and the last), the share of each donut part beside its value. [chart-labels]
- **A touch screen changes the theme at once:** the theme-reveal circle (a view transition) runs only for a fine pointer;
  on a coarse pointer the page repaints directly, since phone browsers can keep the old snapshot on screen while the
  setting is saved. The phone's browser bar (`theme-color`) follows the theme.
- **The page declares its colour scheme** (`<meta name="color-scheme" content="light dark">`, `html { color-scheme }` = the
  theme), so the forced dark mode of a phone browser leaves the person's theme alone. [color-scheme]
- **The kit's icons:** ship only the icons the code names (a generated subset of the kit's icon CSS, checked by the build), not the
  whole set. Every icon of the shell - top bar, menu, command palette, page bar, menus - comes from the kit's icon set
  (`bx-…`), the page's icon the same in the menu and the palette; no emoji or typed sign stands in for one. [kit-icons]
- **Every figure card shows a percentage:** the change against the period before - WoW / MoM / QoQ by the range chosen, red
  when it falls - or the share the figure holds (people who signed in of the open person accounts, the top app's share of
  sign-ins); one second line may hold one more fact (agents apart from people). [kpi-pct]
- **The four Insights figures are distinct:** the account figure splits its main line into two halves, person accounts and
  agent accounts, each with its count and, on the percentage line under it, its share of their combined active total (the two
  shares add to 100%); the fourth figure reports apps used, its share of enabled apps and the enabled-app total, never repeats
  the sign-in comparison. [insights-kpis]
- **Every Insights figure has four typography roles in this order:** card title, main content, percentage, secondary content.
  Main content is larger than the title; percentage is stronger and differently coloured than secondary content. In the
  account figure each count is main content and the account-kind label beside it takes the secondary role, so a half never
  outgrows a narrow card. [kpi-type]
- **Figure cards on one row keep their lines level:** main line, percentage line and secondary line start at the same height
  in every card of the row, measured on the layout (a card rising in or leaning under the pointer does not count), and no
  line is wider than its card. [kpi-align]
- **The pointer effects can be turned off:** Settings › Appearance switches the light spot, sheen, tilt and ripple off for the
  person (UI setting `fx`, kept with their other UI settings; `html.fx-off`); the glass panels stay. The light spot under the
  pointer also has a switch of its own (UI setting `spot`, `html.spot-off`): off, the cards still lean.
- **Filters are report slicers, for fields of few values only:** a pick list (multi-pick with select all and clear, or a single
  pick) holds 10 values at most - status, kind, app, role, level, action; a column of dates gets a date range (from - to). The
  main records of a page (people, addresses, departments, heads) are found with the search box, never listed in a filter. A
  filter that is set is marked (`.filter-field.on`, its APPLIED value). A filter's list hangs on `<body>` under its control,
  like every menu over a glass card. [filter-set] An ordered time axis (the months of a year, quarters) is no list of records:
  it keeps all its values and is declared so (`data-filter-kind="period"`); a period the page always holds (from - to, never
  empty) is never marked set (`.on`) and is never cleared by Clear.
- **The filter button always opens its popover;** the person pins each filter on the bar or keeps it there. The popover's
  head is ONE line (v41: a tick per filter ate the popover's room): the pinned filters as chips (x unpins one), Pin
  all and Unpin all as two icons at its end; each filter in the popover carries its pin on its own label line, adding no
  height [pins-slim]; then every filter not pinned; it keeps one fixed width
  (22rem) whatever is pinned. The pins are the person's UI setting `filter_pins` (a JSON map page path → filter ids), so they
  hold in every app; a page with no pins of its own follows the UI setting `filters` (`bar` pins all, `popover` none). A
  phone keeps every filter in the popover. A pinned or unpinned filter FLIES from where it stood to its new place (FX: flip:
  its start noted before the pin, kept until it has moved - the bar's row comes one render after the first pin). Pinned
  filters stand against the filter button on the bar's one line, each one control carrying its label ("Role: All") at its
  standard width (12rem) at most, shrinking together, never pushed out, never a second line. [filter-row] [bar-anchor]
- **The popover fits the window and runs on Apply:** it never runs off the screen - its pins and filters scroll inside it
  (a body with its own scrollbar, its height set from where it opens), and its foot stays in sight at its bottom with Clear
  filters beside Apply. A filter changed in the popover is a DRAFT (`.filter-field.pending`): the rows do not move until
  Apply runs every draft at once (its count on the button: "Apply (2)"); closing the popover drops the draft. A pinned filter
  on the bar filters at once. [filter-pop] [filter-count]
- **The filter count and the X:** the filter button counts the filters that are set (applied, not drafts); while one is set
  the bar shows the X that clears them, beside the filter button - with filters pinned or all in the popover. [filter-count]
  A value the page always holds (the period of a report: a from and a to date that are never empty) is never counted as a set
  filter and Clear leaves it: a page just opened, nothing applied, shows no count and no X; pressing the X sets the count to 0,
  takes the X away and changes what the page shows - an X that changes nothing is a fake button (the probes of §6).
- **Every filter is cut where the rows are limited:** a list the server sends with a row limit (the newest N rows of a log)
  is filtered by the server's query, BEFORE the limit - each filter (period, app, level, account kind, actions, day range,
  text) goes to the query; cut in the browser over the newest rows, a filter of earlier days or a rare value finds nothing.
- **Every date follows the person's date format:** a date the surface shows or takes (a cell, a filter, a calendar) follows
  the family setting `date_format` (`vn` dd/mm/yyyy, `us` mm/dd/yyyy) and the app's language - the app's own date field and
  calendar (week from Monday), never the browser's date input, which follows the browser's locale. [date-format]
- **A date range offers its relative periods, as Power BI's relative date filter** (v51): beside its two dates every range has
  the quick picks This month · Last month · This year. The value is the TOKEN, not two dead dates: "this month" is the month of
  the last day the data has (today when the page has no such day), this and last month whole calendar months, this year Jan 1
  to Dec 31; the control names it ("Tháng này (11/2026)"); the app keeps the token in the person's settings, so the page opens
  on the newest month the next time; a newer last day moves the period with it. [date-relative] The three quick picks are
  one group of the frame's switch (v56) - grey glass framed at rest, the chosen one in the accent fill with the sheen, as the
  view switch, never the outlined accent button - spanning the row of the two dates in three equal parts. [date-quick-even]
- **A person reads names, never codes:** a pick list, a filter, a badge or an action name shows the name of a value from the
  dictionaries, never its stored code (`data_query`, `login_ok`); a code outside the list reads as "Other action". The action
  codes are the family's closed list (the app contract of the family database): the app keeps that list with a name for each code in every
  language, and a static test checks the list covers the contract when the contract is on the machine. [no-raw-code]
- **The status dot is whole:** an online avatar's dot sits on its edge, and no box around it - a button or a menu row that
  clips for its ripple - cuts it. A count on a button (the bell's unread, `.badge-notifications` or `data-count-badge`) stands
  whole out of it the same way (v33: the count was cut inside the bell's round button). [dot-whole]
- **An avatar stands inside the box that holds it:** a box never smaller than its avatar - a fixed 100 px box held a 120 px
  profile avatar, which ran over the gap into the name (v35). An avatar stack, overlapping on purpose, is left out.
  [box-holds]
- **A chosen tab is a filled pill, as in Sneat:** a row of tabs (`.nav-pills`, a tablist) shows its chosen tab with its own fill
  or the sliding pill under it - never bare words standing loose on the page (v35). The family frame fills a `.nav-pills` row with no pill of its own. [tab-pill]
- **Every page has its row-2 panel** - the page's own bar (`page-toolbar`) under the top bar: row 2 of the compact frame
  (`#page-bar`), or the page's first card in the classic frame. A page that is not one page card fills it with the frame's
  `PageToolbar({start, tools})` - its tabs or its main action from the left, its seek tools from the right; row 2 is never
  left empty (v36). [page-bar]
- **A row of tabs never stands loose in the page:** it is in the page bar (row 2), in a card or in a dialog (v36:
  the profile settings tabs stood loose under the bar). [tabs-in-panel]
- **Help opens from one place:** the frame's Help page (the menu's Help) of two tabs - General, the frame's own (an AI helper comes
  there later), and the app's own guide, named after the app, given in `config.help` (sections with the pages they explain; the
  section of the page in view is chosen). The page bar carries no help or guide button of its own; a link inside a page may open
  a section with `openHelp` / `sasinShell.openHelp` (v39; shell 1.10.0). [help-in-menu]
- **The controls of one row stand on one line:** every button, field, pick list, tab and search box side by side in one row -
  the page bar, a card or panel head, any row of the page, a dialog - shares its vertical centre (within 3 px); a row is the
  outermost flex row the controls sit in, so a group of fields and a group of buttons in one head are one row (v38, Reconcile
  07/11: the fault sat in a panel head inside the page, outside the bar). An app's own old CSS (a `.card button` rule of a former sign-in card,
  heavier than `.btn`) must not push one down - keep such CSS in a lower `@layer` (v37, Reconcile 07/11: the bar's buttons
  stood 16 px low and the check read green). [bar-aligned]
- **An avatar keeps its square:** in any row - a page, the top bar, the menu, a dropdown - a kit avatar stands `flex-shrink-0`
  beside text that may be long, and the text block shrinks and ends in "…"; a long name never squeezes the avatar. [avatar-square]
- **The look is the person's across the family:** the UI settings that shape the shared surface - theme, language, date
  format, glass and blur, the pointer effects and light, the filter layout and pins, content width and menu - are kept once,
  as the person's settings of the system-manager in the family database, and every app of the family reads and writes them
  there, so a choice made in one app holds in all of them.
- **Every control names itself on hover:** a control that shows no text of its own (an icon button, a switch, an avatar)
  carries its name (`data-tip`, else `aria-label` or `title`); pointing at it or reaching it with the keyboard shows that name
  in one tip on `<body>`, under the control and inside the window - a tip drawn inside the control is clipped by it. A
  shortened text shows its whole text the same way. [control-name]
- **The top bar's menus open whole:** no part of the bar clips its overflow while its menus can open (language, app switcher,
  bell, account); a bar that folds away clips only while folded.
- **A new build is announced:** the app reads the server's version with its health probe; a version other than the one the
  tab loaded shows a banner with a reload button (unsaved changes asked about first), so no one keeps working on an old bundle.
- **An account list shows the account kind** (person · agent) as its own column with its own filter, and the account editor
  sets it; the sessions and the log filter by it too; figures about people count people only. A profile is a person's page:
  it shows no account kind.
- **The person's pages, after the kit:** My profile (the kit's user-profile page: a header card with a banner, the avatar
  rising into it and apart from the name, the name and its facts under the banner, an edit button on one line; an About card
  and an activity timeline at the same height, the apps named, never their codes) and Profile settings (the kit's
  account-settings page: tabs Account and Security; the person edits name and email, the sign-in name is the admin's; the
  password change). The avatar and banner pictures are files kept outside the code, the family database holding only what
  points to them.

## 5b. Menus, tables, accordions (v29)

- **The menu scrolls inside itself** when its rows are taller than the window; the brand and the collapse button stay.
  [menu-scroll] **Rows with sub-rows fold** by their chevron (`menu-toggle` with `aria-expanded`), the branch of the page on
  screen open. [menu-fold] **Every name stays inside the menu** - a long one ends in "…" and shows whole on hover; the round
  collapse button on the edge holds no name. [menu-fits] **The pages of one group wear different icons**, each chosen for
  what the page shows. [menu-icons-distinct]
- **Every data table resizes and sorts:** a table with a header row and rows of data carries the resize handles and sorts by
  its headers (`aria-sort`), whatever it is called; a help dialog of keys is exempt, and so is a table or header the page
  marks `data-sort="off"`. [table-resize-every] [table-sort]
- **An accordion inside a page card is flat** - no fill, no radius, no gap, a line between items - and **its chevron reads**
  (3:1 against the card at least). [accordion-flat] [chevron-visible]
- **Nothing of the head runs past its left or right edge** (a tool of the page bar at 390 px). [head-whole]

- **A dialog, a menu and a popover are opaque** in every theme, glass on or off - the page never reads through them (`app-base` F18 with its machine check). [surface-opaque]
- **An empty place and a wait wear the one template**: centred where they stand - an empty place a round icon, a
  title and a hint (the frame's `Empty`, `sasinShell.empty`); a wait the kit's large spinner, its words for screen readers only
  (`Loading`, `sasinShell.loading`). Never a lone line of text such as "no matching rows" or "loading". [state-template]

- **A field of many values is a slicer with its find box** (`data-searchable`; v31): the stores, dishes or staff a
  report cross-filters on stand on the page's one filter; a plain pick list still holds 10 values at most. [filter-set]
- **The top bar holds its crumbs and its controls only** - no loose line of dates beside them; a period the page holds is said by
  its filter. [bar-no-extra-text]
- **Every row of a table scrolled into view is drawn** - only the rows under its own pinned header, or behind its footer pinned at the bottom (a TOTAL row, v32; pinned on its cells, its row or the `tfoot`, v40, Reconcile 07/11: a TOTAL pinned on its row read as a row not drawn), are left out (a table
  mid-page lost its first rows). A probe: `PROBES` of the check script, evaluated awaited on every page with a table. It
  measures inside the table's own scrolling frame, its scroll bars left out, and puts back every box it moved (v34, Reconcile
  06/11: a grid in a nested frame read as not drawn, and a box left moved pushed the top bar's avatar out of view).
  [rows-painted] The rows passing under a pinned header are cut there, in any scrolling frame (v32). [head-clear] The rows
  passing behind a footer pinned at the bottom are cut at its upper edge, and the box's vertical scrollbar runs between the
  pinned header and the pinned footer (v33, a probe). [foot-clear]

## 6. Check

- The repo's browser test imports `scripts/sneat_glass_check.mjs` and evaluates every `RULES` entry on every page, and every
  `DIALOG_RULES` entry on every dialog it opens, at a desktop and a phone width and in both themes, once the opening transitions
  have settled, with focus emulation on (a background tab matches no `:focus`). A rule added here adds its entry there in the
  same change; each new entry is proven red by breaking what it guards - with code that still builds: the test rebuilds before
  it runs, so a failed build never leaves it checking an old bundle.
- What the DOM cannot show is a probe of the browser test, each proven red the same way:
  - **the scrollbar under the header:** the strip at the box's right edge is captured (`Page.captureScreenshot`) with the box at
    its top, the thumb's colour read just under the header, and no pixel of the scrollbar column beside the header may carry it
    (the box's overflow toggled first, so a changed rule shows);
  - **the column drag:** a real pointer (`Input.dispatchMouseEvent`) drags a handle 80 px wider and 200 px narrower on several
    tables, and the column is checked AS DRAWN (`th` width) against the width asked for; header cells drawn anew must get their
    handles back and drag;
  - **the flight of a pin:** `Element.animate` is recorded - a pinned filter starts below its place on the bar, an unpinned one
    above its place in the popover;
  - **the draft:** two picks in the popover leave the rows and the count unchanged until Apply, which runs both;
  - **the press:** each text button of a dialog pressed with the real pointer keeps its size while held;
  - **the clean open:** each page opened in a profile with nothing applied shows no filter count and no X (a period the page
    always holds is not a filter); where the X shows after a filter is set, pressing it brings the count to 0, takes the X
    away and changes the rows shown.

## 7. Who builds what in a family

In a family the frame is ONE package kept by the system-manager (`frontend/shell/`, `Frontend_173_Shell`) and published by number
(`Rule_Keys_90_AppFamilyContract` Do 6). The rules of this skill hold on every page of every app; who builds each part:

| Part (section) | Built by |
|---|---|
| the head of two rows (§2b), the menu, the crumbs, the account menu, the brand line | the frame (`Skill_App_Shell`) |
| the page bar and its seek group (§1), the filter popover, pins, draft and clear (§5), the filter box, the view switch | the frame; the page hands its filters, tools and views |
| the frame that stays put, the page card that fills it, the pinned header, column resize, the scrollbar under the header (§2, §5) | the frame; the page renders a plain table |
| dialogs S / M / L (§3), toasts, the one tip (§5), Settings and the layout settings (§4) | the frame; the page gives a dialog its content |
| the content of a page: its cards, rows, cells, charts, names, dates, its own pinned rows | the app (`Skill_App_ShellUse`) |

An app moving onto this kind, in this order:
1. Declare `{"style": "SneatGlass"}` in `frontend/config/ui.json`; `zemory sync` brings this skill, `app-sneat`, `app-glass`,
   `app-shell-use` and `scripts/sneat_glass_check.mjs`.
2. Pin a published build of the frame and mount it with the app's config (`Skill_App_ShellUse` §2–3); remove every part of the
   app's own frame - an app never builds a part the table above gives the frame.
3. Build every list page as page content (`Skill_App_ShellUse` §4): its filters declared, each value taken when it takes effect
   (on Apply in the popover, at once on the bar), cut by the server
   where the rows are limited; its tools and views handed to the page bar.
4. Run the check: the app's browser test imports `RULES` and `DIALOG_RULES` and evaluates them on every page and dialog WITH the
   frame mounted, at a desktop and a phone width in both themes, and runs the probes of §6; green on every page before the app's
   first release in the kind.
5. Tell the system-manager when the app is live on its path, so the family's app table and gateway route it.

A repo outside any family builds the frame itself by §1–§5, with the system-manager's frontend as the living reference.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — the look of a kind is approved on its template before it is ported · kiểu được duyệt trên template trước khi chép sang app
- `Rule_Gate_97_BarOneSize` — every control of the page bar is the bar's one size · mọi control của thanh trang cùng một cỡ
- `Rule_Keys_90_AppFamilyContract` — in a family, the frame of this kind is built once by the system-manager · trong một hệ, khung của kiểu này do repo quản hệ dựng một lần
