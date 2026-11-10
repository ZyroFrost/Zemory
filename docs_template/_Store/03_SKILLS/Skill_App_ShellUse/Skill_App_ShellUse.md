---
id: Skill_App_ShellUse
name: app-shell-use
version: 7
type: process
checked: [Skill_App_Base, Skill_App_SneatGlass, Skill_App_Shell, Rule_Keys_90_AppFamilyContract, Frontend_173_Shell]
description: Wear the system's frame in an app of the system - pin a published build, hand it the app's config, build only page content, and ask the system manager for anything of the frame. Use in an app of a system (role app, owner a system-manager) when its surface is built or changed, when it moves onto the frame or to a newer build, or when something of the frame looks wrong. Vietnamese triggers - "gắn khung", "dùng khung chung", "lên bản khung", "ghim khung", "vùng trang", "lỗi khung".
---

# app-shell-use — an app wears the system's frame, it never builds one

> The frame (top bar, menu, page bar, filters, table behaviour, dialogs, toasts, settings, session) is kept by the system manager
> (`Skill_App_Shell`, `Frontend_173_Shell`) and published as numbered builds. An app of the system pins one build, hands it its
> config and builds only what is inside its pages (`Rule_Keys_90_AppFamilyContract` Do 6). The look of both is the kind's skill
> (`Skill_App_SneatGlass`).

## 1. What the app never builds

- A top bar, a menu, a page bar, a filter popover, a column-resize handle, a pinned header, a dialog frame, a toast, a settings
  dialog, a sign-in page, a session check in the browser — each of these is the frame's. The app's own copy, old or new, is removed
  when the app moves onto the frame.
- Something of the frame looks or behaves wrong ⇒ message the system manager's session with the page, the width, the theme and
  what was expected; never patch it in the app, not even "for now". The fix comes as a new build of the frame (§2).
- Something the app needs is missing from the frame ⇒ ask the system manager for a key or an element (`Skill_App_Shell` §3);
  never draw it beside the frame.

## 2. Pin a build

1. `frontend/config/shell.json` holds the number the app wears: `{"version": "<M.m.p>"}`. The app loads the build from the
   gateway path of that number (`/shared/shell/<number>/`), never a "latest".
2. Moving to a newer number is a change of the app on purpose: read the number's contract notes, change what they ask, run the
   app's browser test (§6), then release the app with the new number in its changelog.
3. The app's ledger names the number it wears.

## 3. Mount it and hand it the config

- An app on the frame's framework imports the frame's root and its parts from the frame's ONE entry; an app without a framework
  or a build step loads the build's module and stylesheet with plain tags and uses the frame's elements. Both take the same keys.
- The config (`Skill_App_Shell` §3): `area` (the app's own key for its name) · `home` (the start of every path the app owns,
  `/<app>/`) · `nav` · `title` · `crumbs` (only the layers AFTER the system and the app - the frame draws those two) · `page` ·
  `redirect` · `load` (the app's own data the frame needs - a menu built from the app's list, the person's role in the app; a 403
  there is "no role in this app", shown by the app's page, never a redirect to sign-in) · `health` (the app's own health path,
  answering `{"version": "<M.m.p>"}` with no session) · the app's commands and records for the search · the app's cards and tabs
  for Settings. No `login`: a person without a session is sent to the shared sign-in and comes back to the same page.
- The app's API is called through the frame's client for it (`createClient` with the app's base and the time its slowest answer
  needs): a 401 goes back to sign-in, a 503 "cannot check the session" shows the lost-server banner; the app keeps no 401 handling
  of its own.
- Labels: a dictionary key of the app (added once at start) or text read from the database as it is. The app never copies a key
  of the frame into its dictionary and never redefines one: an app key wins, so an app key `brandName` would rename the whole
  system.

## 4. The page area — what a page builds

- The frame hands each page a place in the page card, in the light DOM (the kind's classes and the frame's tokens reach it). The
  card fills the frame, scrolls inside, pins its header row and resizes its columns - the page renders a plain table with the
  kind's classes and gets all of that. A row of the page's own that must stay in sight (a totals row) is pinned by the page.
- **A table page: the card fills, the table scrolls inside** (v3 - settled for the family, app-sneat-glass
  §2): never turn a table page into a whole-column scroll to win room; leave `fill` on and let the person fold row 1 (Settings
  > Layout > "Thu gọn hàng 1 khi cuộn"). A board of several cards takes the frame's `board` (React `PageCard board`, DOM `DomPage.board`):
  the page bar stays, no page card wraps the board, its cards stand straight on the wallpaper (v4). Many pages under one menu row:
  turn on the frame's tab panel (`pageHead: true`), never draw tabs of your own; it pins under the top bar and docks on row 2
  when row 1 folds by itself (v5) - the page never moves or covers it.
- **The whole app scales to the window** (v5, app-sneat-glass §2 [ui-scale]): the frame zooms the page drawn on
  1920 x 1080 to the window. A page never sizes anything from `vh` / `vw` or `innerHeight` / `innerWidth`: it takes
  `var(--app-h)` / `var(--app-w)`, and a size or place it writes from a measure on screen (a rect, a pointer position, a drag)
  goes through the frame's `toPage(px)` (or divides by `uiZoom()`) - both on `window.sasinShell` too. An old scaler of the
  app's own (a zoom or transform on the page) is removed when the app takes the frame.
- Filters: the page declares the filters it offers (pick · several · date · date range · number · custom - a control the page
  draws itself, for a mix the frame has no kind for). A date range of a report gives the frame `latest` (the data's last day)
  and keeps the `relative` token its `onChange` hands (this month · last month · this year) in the person's settings, never
  the two dates (v6, app-sneat-glass [date-relative]). A filter in the popover is a draft until the person presses Apply; a filter
  pinned on the bar filters at once; the page receives each value when it takes effect, then asks its own API. The page reports
  how many filters are set and how to clear them; a value the page always holds (the period) is never counted. The filter box:
  the frame hands the page every change of its text and never filters the page itself; the page filters what it shows - on
  screen, or by asking its API (waiting for the typing to pause is the page's).
- The page's tools stand at the left of the page bar (its main action, a switch such as a live feed); its views (two or more ways
  to show the same records) go to the view switch at the right, each view really changing what is shown.
- Dialogs and toasts: the page asks the frame for a dialog of size S, M or L and gives its content; results of actions are
  toasts through the frame. Never a `<dialog>` frame or a notice in the page flow of the app's own.
- The person's UI settings the page keeps (its view, its column widths, its pins) are saved through the frame, under the shared
  settings of the system, never in the app's own storage.
- Notifications the person should see go to the system's one bell through the system manager's notification feed (ask the system
  manager for the kind); the app draws no bell of its own.

## 5. Words and data

- The app's API answers only the app's data; the session, the person and their settings come from the system manager's API, read by
  the frame. A 401 from the app's API is handled by the frame (back to sign-in); a 503 "cannot check" keeps the page with the
  lost-server banner (`Skill_App_Base` › "An app of a family").
- The app's dictionary holds only the app's keys, both languages complete.

## 6. Check

- The app's browser test runs the kind's rules and probes (`Skill_App_SneatGlass` §6) on every page of the app WITH the pinned
  frame mounted, at a desktop and a phone width, in both themes; green before each release. It measures the design's px: it sets
  `localStorage sasinShell.scale = off` before the page loads (v5).
- The app's build fails when `frontend/config/shell.json` is missing or names a number the gateway does not serve.
- A part of the frame rebuilt in the app (§1) is judged by the owner; the kind's rules catch most of it on the page.

## Implements · Thi hành luật
- `Rule_Keys_90_AppFamilyContract` — an app wears the system's one frame at the number it pins · app mang khung duy nhất của hệ ở bản nó ghim
