---
id: Skill_Dev_AssetsPull
name: dev-assets-pull
version: 1
type: process
installs: [scripts/assets_pull.mjs]
checked: [Skill_Dev_AppDesign, Skill_PBI_Base, Skill_Task_Pull]
description: Take the organisation's shared logos, icons, backgrounds, images, fonts and colours from `_Design\Assets\` into this repo as committed copies, and check the copies still match the source. Use when an app needs a logo or icon, when the shared design changed, or before a release. Vietnamese triggers - "lấy logo", "lấy icon", "cập nhật logo", "bộ icon", "tài nguyên giao diện", "assets chung".
---

# dev-assets-pull — copies of the shared design

Why a part of its own: `Skill_Dev_AppDesign` says how an app's surfaces look, not where the shared files come from ·
`Skill_PBI_Base` builds reports · `Skill_Task_Pull` fetches DATA from a source. None takes interface files from `_Design\`.

## When

- An app needs a logo, an icon, a background, a font or a colour the organisation already has.
- `_Design\Assets\` changed (a new logo, a new icon set) and the repo should follow.
- Before a release: the copies must match the source.

## The source and the copies

- The source is the organisation's `Workspace\Company\<Org>\_Design\Assets\<Kind>\` (slot `Design_172_Design`), the ONE place a
  shared logo, icon or colour is changed.
- The repo keeps COPIES in its own slot `frontend/assets/<kind>/` (`Frontend_060_Assets`) and COMMITS them, so it builds and
  runs alone, with no path out of the repo. Its asset layout does not change; its own files (not in the source) are never
  touched.
- Kind map: `Logo` → `logo/` · `Icon` → `icons/` · `Background` → `backgrounds/` · `Image` → `images/` · `Font` → `fonts/` ·
  `Color` → `color/`. A file under `frontend/assets/<kind>/` whose path also exists under the source kind is a copy; no list of
  copies is kept.

## Steps

1. Take a file the app does not have yet: `node scripts/assets_pull.mjs --add Logo/<file>` (the path inside `_Design\Assets\`).
2. Bring every copy up to the source: `node scripts/assets_pull.mjs`.
3. Wire the check into the repo's gate: in `package.json`, `npm run check` runs `node scripts/assets_pull.mjs --check`, which
   exits 1 when a copy differs from the source.
4. Commit the copies with the change that needs them.

The script finds the source in this order: `--source <dir>` · the environment variable `ZEMORY_DESIGN_DIR` · the first
`_Design` folder above the repo that holds `Assets\`. A machine without the source (a build server) gets a notice and exit 0:
the committed copies build the app.

## Rules

- Never edit a copy. A wrong logo or icon is fixed in `_Design\Assets\`, then pulled.
- Never point the app at `_Design\` at build or run time.
- A file the app alone uses stays in the repo; it does not go to `_Design\` unless a second repo or a report needs it.

## Example

`_Design\Assets\Logo\Acme.png` changed. In the app repo `AcmeFlow`: `node scripts/assets_pull.mjs` updates
`frontend/assets/logo/Acme.png`, leaves `frontend/assets/logo/AcmeFlow.png` (the app's own) alone, and `npm run check` is green
again.

## Check

`node scripts/assets_pull.mjs --check` green: every copy matches the source.

## Implements · Thi hành luật
- `Rule_Gate_35_OneHome` — one source for a shared logo, icon or colour; every repo copies from it, none keeps its own edit · một
  nguồn cho logo, icon, màu dùng chung; mọi repo chép từ đó, không repo nào tự sửa bản của mình
