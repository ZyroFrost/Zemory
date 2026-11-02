---
id: Skill_App_Sneat
name: app-sneat
version: 1
type: process
checked: [Skill_App_Glass, Skill_App_Base, Design_172_Design]
description: The Sneat kind of an app surface - the Sneat admin layout (menu, navbar, cards, tables, dialogs) wearing the Glass look, inside one shell shared by every app of a family. Use when a repo declares {"style": "Sneat"} in frontend/config/ui.json, or when building, porting or fixing a Sneat surface, its template, its shell or its menus. Vietnamese triggers - "kiểu sneat", "khung sneat", "mẫu sneat", "template sneat", "menu theo app", "trang chủ launcher".
from: _Store/03_SKILLS/Skill_App_Sneat @v1 #5fdb06914438
---

# app-sneat — the Sneat kind of an app surface

> A KIND skill beside `app-glass`: `app-base` holds what every app follows; this skill holds what makes a surface Sneat. The
> layout is Sneat's; the look (the `--g-` tokens, the glass panels and every `FX:` effect) is the Glass kind's, taken from the
> approved Glass template, never copied here. Each rule below came from a correction of the requester and carries its check.

## 0. Choosing the kind

- A repo declares `{"style": "Sneat"}` in `frontend/config/ui.json`. The Glass look is part of the kind: a Sneat surface without
  the glass tokens and effects is not finished.
- A rule of this skill that contradicts `app-glass` wins on a Sneat surface (the page filter box of §3); the Glass rules it does
  not repeat still hold for the look.

## 1. The source of the kind

- **Where the templates live.** The template a requester brings is kept untouched and read-only in the design repo, one folder per
  kit (`Web_Template/Sneat/Sneat_Form_Original/`, `Web_Template/Glass/…`): the design folder holds kit folders only. The working copy
  is tried in the repo's `docs_visual/<kit>/`, beside a verbatim copy of the kit's own pages for comparison; the approved copy goes
  back to the design repo. Check: `Web_Template` has only kit folders; every file of a `*_Form_Original` folder is read-only.
- **Build on the kit's own markup.** Every page is the kit's markup for that kind of page (`tables-basic`, the dashboard cards,
  `ui-modals`, `pages-account-settings-*`) with the product's words and data; no invented structure. Before showing it, shoot the kit
  page and the product page at the same width. Check: the frame measures match (menu and navbar size, body font size, row height).
- **A paid template is reference only.** A licensed template ("all rights reserved", "buy this template") is kept as screenshots and
  notes of its effects; what is chosen is written again in our own code. Check: its folder holds no `.js`/`.css` of theirs.
- **A showcase page.** The working copy carries one page showing every effect of the kind running, each under its `FX:` marker, the
  ones not built yet marked so; colour tones are chosen in Settings > Appearance, not on that page. Check: every `FX:` marker of the
  Glass template appears on the page.

## 2. The shell of the family — one shell, one menu per app

The way suites work (Odoo, SAP Fiori launchpad, Microsoft 365): a shell shared by every app, the open app's own menu, an app switcher.
Never the pages of every app in one menu: the menu grows without end, rights tangle, and the system-manager would have to know every
app's pages.

- **Top bar, the same markup in every app:** left - the greeting over today's date; centre - the one search (§3); right, in this
  order - language · light/dark · the app switcher (a grid: every app the person may open, the system-manager first, "all apps" last) ·
  the bell · the account (My profile · Settings · Change password · Sign out). The list comes from the system-manager's app table
  through its API, one source for the switcher and the home page. The bar stays put while the page scrolls (sticky). Check: the bar's
  markup is identical in every app; its top edge does not move on scroll.
- **Left menu = the open app's pages only**, Sneat's flat menu (single items, then one header per group); its brand shows the open
  app's square logo and name. The logo keeps its size and place when the menu collapses; only the name hides. Check: no item of
  another app; the logo's position is equal in both states.
- **The collapse button** is Sneat Pro's round accent button on the menu's right edge, a chevron inside, ringed in the page colour;
  on a desktop it folds the menu to its icons, hovering the folded rail opens it over the page, the choice is kept. Check: the
  button shows a visible chevron; folded width ≈ 84 px, hover width = open width.
- **Home = the launcher:** the grid of the person's apps with their health, and what needs their attention. The former apps page
  becomes it; an "Open" button leads into the app. Check: the first menu item of the system-manager is the home page.
- **No sign-in page in the kit:** every app signs in through the system-manager's page. Check: no login file in the kit.
- **No button without a working function; every control has one home** (Settings lives in the account menu, not also in the bar or
  the rail). Check: every button and link of the bar and the menu has a handler or a target.

## 3. Search

- **The header search** is a dialog laid out like Sneat Pro's: a flat input with `[esc]` and the close button in the search row; empty,
  it shows up to four suggestion groups of up to four items in two columns (pages · administration · commands · apps); typing turns it
  into results grouped by kind, arrows and Enter move and run. Never one long flat list. Check: empty search = ≤ 4 groups × ≤ 4 items.
- **A long list carries its own small filter box** beside the filter button in its card header (people, logs, sessions, runs): the
  header search jumps, this box filters the rows as one types. Short pages have none. Check: typing in the box hides the rows that do
  not match.

## 4. Content

- **A card or a cell holds one fact per line.** A list of things is never pushed into a card line or a table cell: show the count
  ("2 dashboards") as a link that opens the table of those things. Check: no card line or cell holds more than one badge or name.
- **Tables follow `tables-basic`:** a person is avatar + name over the username; actions are the dots menu; a long text cell stays on one
  line, cut with an ellipsis, the whole text in its tooltip; rows never wrap. Check: every row has the same height; a clipped cell's
  `title` holds the whole text.
- **Vietnamese keeps its own case:** no `text-transform: capitalize` on labels or tabs (Sneat capitalises pill tabs for English).
  Check: no text element computes to `capitalize`.

## 5. Controls

- **A select opens a glass menu,** never the browser's own list: it springs in, is opaque, marks the chosen item, and keeps the
  keyboard (arrows, Enter, Escape). Choosing fires `change`. Check: a click on a select opens the glass menu and no native picker.
- **Effect elements carry no browser decoration:** a sliding pill made of a list item has `list-style: none`; a toast's close button
  sits in its header row; the search's close button sits in the search row. Check: the pill computes `list-style-type: none`; the close
  buttons lie inside their boxes.

## 6. Check

- The repo's browser test opens every page of the working copy at 1440 and 390 in both themes: no JS error, no sideways scroll, and
  the checks named above. A rule added to this skill adds its check to that test in the same change.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — the look of a kind is approved on its template before it is ported · kiểu được duyệt trên template trước khi chép sang app
