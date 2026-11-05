---
id: Slot_173
name: shell
version: 1
path: frontend/shell/
checked: [Frontend_003_Frontend, Frontend_061_Components, Frontend_064_Layouts, Frontend_062_Styles]
from: _Store/02_STRUCTURE/_Slot/Frontend_173_Shell @v1 #dfba9df446d5
---
# Frontend_173_Shell shell — the frame every app of a system wears

## Role

The one copy of the frame shared by every app of an app system: the top bar, the menu, the page bar, the filters, the table
behaviour, the dialogs, the toasts, the settings every person keeps, and the reading of the system's one session. It lives in the
system-manager repo only (`Struc_Repo_SystemManager`), which builds it and publishes numbered builds through the gateway; every app
of the system mounts a build at the number it pins and hands the frame its own parts (its menu, its pages, its additions).

- Not `Frontend_003_Frontend` (the repo's own interface): this layer has rules of its own — only the system-manager template
  carries it; the other apps of the system never hold a copy and never edit it, they use its published build at the number they
  pin; it imports nothing of the repo's own interface, and that interface reaches it only through its one entry.
- Not `Frontend_061_Components` · `Frontend_064_Layouts` · `Frontend_062_Styles`: each of those holds one kind of file of one app;
  this is one package of several kinds (components, layouts, styles, a dictionary, the client to the system's own API) that every
  app of the system shares.

## Inside

```
frontend/shell/
├── index.ts      the one entry: everything an app may use is exported here; the styles are imported here, in order
├── config.ts     the contract an app hands the frame (menu, page names, crumbs, pages, its additions)
├── components/   layouts/   hooks/   util/   styles/   locales/
└── client.*      the calls to the system's own API (session, settings, notifications)
```

- Kind of file: interface code (`.ts` · `.tsx` or plain modules), stylesheets, the frame's own dictionary.
- Sub-folders take the names of the child slots of the interface (components · layouts · hooks · util · styles · locales) — no
  new names; they hold the frame's files only.
- Never inside: a page of an app, a call to an app's own API, an app's words.
- Points at no child slot.

## Rules

- One entry, both ways: an app imports the frame only through its entry (an alias such as `@<system>/shell`), never a file
  inside it; the frame imports nothing of the app, only packages, itself and the repo's shared assets (`Frontend_060_Assets`). The
  repo's build runs a check that reds a crossing either way.
- Published by number: each build is served at a path carrying its number and kept for good; an app pins one number in its own
  config and moves to a newer one on purpose, after its own browser test. There is no "latest".
- The contract an app hands the frame changes with the frame's number: a new hook or element = the middle number, a fix = the
  last.
- How the frame looks and behaves is the kind's skill the system declares (`Skill_App_SneatGlass`) — not written here.

## Example

The system-manager repo `AcmeONE` keeps its frame in `frontend/shell/` and its own pages in `frontend/src/`; its pages import from
`@acme/shell` only. It publishes the frame's build `1.0.0`; the app `AcmeReport` pins `1.0.0`, mounts the frame and hands it its
menu built from its own boards.

## Check

- `zemory conform` accepts `frontend/shell/` in a repo assembled from `Struc_Repo_SystemManager`, and reports it as off the
  standard anywhere else.
- The repo's own boundary check (in its build) reds an app file reaching inside the frame and a frame file importing the app.
