---
id: Skill_App_Shell
name: app-shell
version: 1
type: process
checked: [Skill_App_SneatGlass, Skill_App_Base, Skill_App_Release, Rule_Keys_90_AppFamilyContract, Frontend_173_Shell]
description: Build, change and publish the frame every app of a system wears - the one copy of the top bar, menu, page bar, filters, tables, dialogs and toasts kept in the system-manager repo (frontend/shell/) and published as numbered builds the apps pin. Use in a system-manager repo when the frame is changed, a part moves between the frame and an app, an app reports a fault of the frame, or a build of the frame is published. Vietnamese triggers - "khung chung", "khung chuẩn", "gói khung", "phát khung", "bản khung", "sửa khung".
---

# app-shell — the system's one frame, kept and published by the system manager

> The system-manager repo (`Struc_Repo_SystemManager`) keeps the frame in `frontend/shell/` (`Frontend_173_Shell`); every other
> app of the system wears a published build of it and builds no frame of its own (`Rule_Keys_90_AppFamilyContract` Do 6, the
> app side: `Skill_App_ShellUse`). How the frame looks is the kind's skill (`Skill_App_SneatGlass`); this skill is how it is
> kept, shared and published.

## 1. What is the frame's, what is the app's

| The frame's (one copy, here) | The app's (in each app) |
|---|---|
| top bar of two rows: crumbs, search, date, language, theme, glass, apps, bell, account | its menu entries, its crumbs, its page names |
| the menu, its folding, the brand line naming the open app | its pages and everything inside the page card |
| the page bar: page tools at the left, the seek group at the right (filter button and popover, pins, draft and Apply, clear, filter box, view switch) | the filters it offers, their values, its own views and actions |
| the page card that fills the frame, the pinned header row, column resize, the scrollbar under the header | rows of its own that pin (a totals row), the content of its cells |
| dialogs S / M / L, toasts, tips, the search sheet, Settings (appearance, layout) | the content of its dialogs, its additions to the search and to Settings |
| the session, the person's UI settings, the lost-server and new-version banners, sign-in for every app | its own API, its own data, its words |

- A part two apps both need goes into the frame; a part one app needs stays in that app. Moving a part either way is a change
  of the frame's contract (§3).

## 2. One entry, both ways

1. The frame is one package with ONE entry (`frontend/shell/index.ts`): everything an app may use is exported there, the styles
   are imported there in the kit's order. An app imports only that entry (an alias such as `@<system>/shell`), never a file
   inside the frame.
2. The frame imports nothing of the app that wears it: only packages, itself and the repo's shared assets. The system manager's
   own pages are an app like the others - they reach the frame by the same entry.
3. A check in the repo's build reds a crossing either way and has a self-test that plants one of each; it runs before the
   type check, so a crossing never reaches a build.

## 3. The contract an app hands the frame

- The app mounts the frame's root with one config object; the frame never reads the app any other way. Its keys:
  `area` (the app's name under the brand) · `nav` (the groups and pages this person may open, each with the kit's icon class) ·
  `title` · `crumbs` · `page` (the page at a path) · `redirect` (a page this person may not open) · `load` (the app's own data the
  frame needs: read when signed in, again on a timer and on focus) · `health` (the app's own health path for the banners) ·
  `login` (only the system manager: its sign-in page; every other app leaves it out and is sent to the shared sign-in with the
  address to come back to) · the app's additions to the search (commands, records, the dialog a record opens) and to Settings
  (cards under Layout, tabs of its own with their footer button).
- Words: the frame ships its own dictionary; an app adds its own once at start, an app key wins over a frame key, and a key
  found in no dictionary shows as written (a label read from the database). The frame's translate is typed by the keys the app
  hands it.
- A browser-test mock is registered by the app under its mock-build flag; the production build of every app carries no mock.
- An element for apps without the frame's framework (custom elements over the same code) exposes the same keys as attributes,
  properties and events; one source, two doors.

## 4. Numbering and publishing

1. The frame has its own number (`M.m.p`), apart from the system manager's app number: a new key, element or event = the middle
   number; a fix = the last; removing or renaming something an app uses = the first.
2. A build is served through the gateway at a path carrying its number (`/shared/shell/<number>/`) and kept for good: a deploy
   never removes a published number, so an app pinned to it never breaks. There is no "latest" path.
3. Before publishing: the system manager's own browser test is green on every page with the build it is about to publish; a
   blank page that loads only the build shows the whole frame (the kind's checks run on it); the contract notes of the number
   list what changed for apps.
4. After publishing: message the session of every app of the system (`role.manages`) with the number and what an app must do
   to move to it; record which number each app pins in the system manager's ledger.

## 5. A fault an app reports

- An app never patches the frame in its own repo. A fault is reproduced on the system manager's pages first, fixed here, checked
  by the kind's check (a new rule proven red), published under a new number, and the app moves to it.
- A fault that shows only with one app's content means the frame's contract misses something (§3): add the key or the slot to the
  frame, never a branch for one app's name.

## 6. Check

- The repo's boundary check (§2) runs in its build and its mock build.
- The kind's browser check (`Skill_App_SneatGlass` §6) runs on the system manager's pages and on the blank page of §4 step 3.
- `zemory conform` accepts `frontend/shell/` only in a repo assembled from `Struc_Repo_SystemManager` (`Frontend_173_Shell`).
- Keeping published numbers, the ledger of pinned numbers and messaging the apps are judged by the owner.

## Implements · Thi hành luật
- `Rule_Keys_90_AppFamilyContract` — the system's one frame, kept by the system manager · khung duy nhất của hệ, do repo quản hệ giữ
