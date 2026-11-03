---
id: Skill_App_SneatGlass
name: app-sneat-glass
version: 2
type: process
checked: [Skill_App_Sneat, Skill_App_Glass, Skill_App_Base, Design_172_Design]
installs: [scripts/sneat_glass_check.mjs]
description: The Sneat-Glass kind of an app surface - the Sneat layout (skill app-sneat) wearing the Glass look (skill app-glass), as SasinONE runs it - plus the rules this mix needs of its own - one page toolbar, the frame that stays put, the dialog sizes, the layout settings, the glass controls. Use when a repo declares {"style": "SneatGlass"} in frontend/config/ui.json, or when building or fixing such a surface. Vietnamese triggers - "sneat glass", "kiểu sneat-glass", "thanh lọc", "bộ lọc trang", "neo khung", "cỡ hộp thoại", "bố cục rộng", "bố cục gọn".
---

# app-sneat-glass — the Sneat layout with the Glass look

> A KIND skill made of two: `app-sneat` holds the layout of the Sneat kit as the kit has it; `app-glass` holds the look; this
> skill holds what the mix needs of its own. Each rule came from a correction of the requester and has its machine check in
> `scripts/sneat_glass_check.mjs` (named in brackets), which the repo's browser test runs on every page.

## 0. Choosing the kind

- A repo declares `{"style": "SneatGlass"}` in `frontend/config/ui.json`; it follows `app-sneat` for the layout and `app-glass`
  for the look, and this skill where the three meet. A rule here beats the other two on such a surface.

## 1. The page toolbar — one design, always all three

- **Every page card carries the same toolbar** in its header, right side: the small filter box (filters the rows as one types;
  the header search jumps), the filter button (its popover holds the filters), the view switch (list · grid, or the page's own
  views). A page with one view still shows the switch, turned off; a page with no filter yet still shows the button, turned off.
  [toolbar]
- **One design:** the three have the same height, corner radius, glass fill and edge; the view switch is one group; never a Sneat
  button beside a Glass box. [toolbar]
- **The chosen view is lit** in the accent, and so is the filter button while its popover is open. [toolbar]
- **The box keeps room for its icon** when focused: Sneat narrows a focused field's padding for its thicker border, so the
  surface pins the start padding. [toolbar]

## 2. The frame stays put (`app-base` F21 in this kind)

- From a tablet up the window never scrolls: the top bar stays where it is and only the area under it scrolls, so nothing slides
  up behind the bar. [frame]
- A page whose content is one page card fills that area and scrolls INSIDE the card: the card's toolbar (row 2) and its table's
  header row stay pinned, as in the Glass shell. A frame inside the card body is never a scroll box of its own unless it pins
  something itself (a matrix whose first column pins sideways). [frame]
- On a phone the window scrolls and the top bar is sticky.

## 3. Dialogs — exactly S / M / L (`app-base` F2 in this kind)

- A dialog is a `<dialog>` holding the kit's `modal-content`, size class `sz-s` · `sz-m` · `sz-l`: `width: min(P vw, P vh × 16/9)`
  and `aspect-ratio: 16 / 9`, P = 40 / 60 / 90. No `min-width`, no `max-height` that bends it; the body scrolls inside; switching a
  tab never moves or resizes the frame. Full screen on a phone. [dialog-size]

## 4. Layout settings (the kit's customizer)

- Settings › Layout, for every person, saved as their UI setting: **content width** wide (the default: the content fills the frame,
  `app-base` F22) or compact (the kit's container width); **menu** expanded or collapsed (the round button on the menu saves the
  same setting). [wide]

## 5. Controls and effects

- **A select opens a glass menu,** never the browser's own list: it springs in, is opaque, marks the chosen item, keeps the
  keyboard (arrows, Enter, Escape) and fires `change`. Inside an open dialog the menu joins the dialog (the top layer).
- **No per-cell hover squares:** in card view a card is one panel; the kit's `table-hover` paints each cell and is turned off
  there. [card-hover]
- **Effect elements carry no browser decoration:** a pill made of a list item has `list-style: none`; close buttons sit inside the
  row they close.
- **A floating menu over a glass card** (a row's dots menu, a select's menu) is placed on `<body>` (or the open dialog): a card
  with `backdrop-filter` becomes the box a fixed menu is placed in.
- **Every effect of the Glass template** keeps its `FX:` marker in the code (`app-glass`); the cards of a page rise in one after
  another when it shows (FX: reveal).
- **Scrollbars are the Glass template's** on every scroll box (12 px, a soft rounded track, the accent gradient thumb inset by
  a transparent border), never the browser's default; no rule sets `scrollbar-color` or `scrollbar-width` (Chromium then drops
  the template's parts). [scrollbar]
- **Pinned cells are glass:** with glass on, a pinned header row or pinned column is translucent and blurred, never an opaque
  band; it turns solid only with the glass switch off. [see-through]
- **The glass switch sits in the top bar** beside light / dark, lit while glass is on (the Glass rail's switch, moved into the
  bar). [bar-switches]
- **Only the kit's controls, one font:** every control is `form-control` · `form-select` · `form-check-input`, every dialog label
  `form-label` · `form-check-label`, forms on the kit's grid (`row g-*` · `col-*`), the token font everywhere; no class of a
  former kind survives a port. A switch keeps a gap to its label. [kit-controls] [switch-gap]
- **Every data table keeps column resize:** a visible `col-resize` handle per header cell in list view; the widths are a UI
  setting of the person. A port carries the handles' CSS too. [resize]
- **Every chart shows its numbers,** as a report does: a value on each bar, data labels on a line (every point when they fit,
  else the highest, the lowest and the last), the share of each donut part beside its value. [chart-labels]
- **The page declares its colour scheme** (`<meta name="color-scheme" content="light dark">`, `html { color-scheme }` = the
  theme), so the forced dark mode of a phone browser leaves the person's theme alone. [color-scheme]
- **The kit's icons:** ship only the icons the code names (a generated subset of the kit's icon CSS, checked by the build), not the
  whole set.

## 6. Check

- The repo's browser test imports `scripts/sneat_glass_check.mjs` and evaluates every `RULES` entry on every page, and every
  `DIALOG_RULES` entry on every dialog it opens, at a desktop and a phone width, once the opening transitions have settled. A rule
  added here adds its entry there in the same change; each new entry is proven red by breaking what it guards - with code
  that still builds: the test rebuilds before it runs, so a failed build never leaves it checking an old bundle.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — the look of a kind is approved on its template before it is ported · kiểu được duyệt trên template trước khi chép sang app
