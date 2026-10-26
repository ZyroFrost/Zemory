---
id: Slot_172
name: design
version: 1
path: _Design/
scope: layout
checked: [Template_157_Template, Profile_170_Profile, Assets_127_Assets, Frontend_060_Assets]
---
# Design_172_Design design — the organisation's shared design

## Role

`Workspace\Company\<Org>\_Design\` is the ONE source of everything visual the organisation's repos share: the report template of
each reporting tool, and the interface assets (logos, icons, backgrounds, images, fonts, colours). Apps and reports of every
department use it, so by the block law of `Struc_Disk_Data` (law 3) it sits at the organisation level, under a `_` name. This is
the provider of the `design` role, assembled from the frame `Struc_Repo_Reference`.

Why a part of its own: `Template_157` holds the template of ONE reporting tool, not interface assets for apps · `Profile_170` is
the owner's papers, excluded from sync · `Assets_127` and `Frontend_060` are slots INSIDE one repo, the place a copy lands, not
the source the copies are taken from.

## Inside

Children by KIND, the first letter upper case, no `_` inside the block. Create a folder only when it holds a file.

```
_Design\
├── PBI_Template\      the Power BI report template and its theme (Template_157)
├── <Tool>_Template\   the template of another reporting tool, beside it (Template_157)
└── Assets\
    ├── Logo\          the organisation's logo, the logo of each app
    ├── Icon\          the full icon set, for apps and reports alike
    ├── Background\
    ├── Image\
    ├── Font\
    └── Color\         colour files (.json)
```

## Rules

- The ONLY source. A logo, icon, colour or template is changed here and nowhere else; a repo never edits its copy.
- A repo COPIES the files it uses into its own slot and COMMITS the copies, so the repo builds and runs on its own: no path out
  of the repo at build or run time. The repo's own asset layout does not change: an app keeps `frontend/assets/<kind>/`
  (`Frontend_060_Assets`), a report keeps its tool's place (Power BI: `StaticResources`), a file of the repo's own that the
  source does not hold is left alone.
- The copy is taken and checked by the skill `Skill_Dev_AssetsPull`: a file of `frontend/assets/<kind>/` with the same name as a
  file of `_Design\Assets\<Kind>\` is a copy (Logo → `logo/` · Icon → `icons/` · Background → `backgrounds/` · Image →
  `images/` · Font → `fonts/` · Color → `color/`); no list of copies is kept beside them.
- A folder SYNCED by Syncthing, NOT a git repo: no `git init`, no push. One per organisation.
- Not here: a report filled with figures (it belongs to the department repo) · the owner's papers with the organisation
  (`_Profile\`, Profile_170).

## Naming

`_Design` exactly. A template folder: `<TOOL>_Template`, the tool's short name in capitals (`PBI_Template` · `TBL_Template`).
Asset kinds: `Logo` · `Icon` · `Background` · `Image` · `Font` · `Color`.

## Example

`D:\Workspace\Company\Acme\_Design\Assets\Logo\Acme.png` is the organisation's logo. The app repo `AcmeFlow` copies it to
`frontend/assets/logo/Acme.png`, keeps `frontend/assets/logo/AcmeFlow.png` (its own, not in the source) untouched, and its
`npm run check` reds when `Acme.png` differs from the source.

## Check

- `zemory conform --layout <drive>\Workspace\Company\<Org>` accepts `_Design\` at the organisation level.
- In a repo: `node scripts/assets_pull.mjs --check` (installed by `Skill_Dev_AssetsPull`) reds a copy that differs from the source.
