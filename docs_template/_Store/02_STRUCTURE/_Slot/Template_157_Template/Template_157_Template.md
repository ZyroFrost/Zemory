---
id: Slot_157
name: template
version: 4
path: <Công cụ>_Template/
scope: layout
---
# Template_157_Template template — the shared report template

## Role

`Workspace\Company\<Org>\_Design\<Tool>_Template\` keeps the original shared report TEMPLATE of one reporting (BI) tool in the
organisation: layout, theme, sample pages, standard measure tables. Every department building a new report takes the template from
here. It lives inside the organisation's shared design folder `_Design\` (`Design_172_Design`), next to the interface assets the
template uses (logos, icons: `_Design\Assets\`); `_Design\` provides the `design` role.

Example: `D:\Workspace\Company\Acme\_Design\PBI_Template\` holds Acme's Power BI template file (`.pbit`) and theme file (`.json`).

## Rules

- One template folder per reporting tool; a department keeps NO template copy of its own in its repo. Changing the template means
  changing it here; every department uses the new copy.
- Synced with `_Design\` by Syncthing, NOT a git repo: no `git init`, no push.
- Holds only the tool's template files. Not reports filled with figures (a report belongs to the department repo), not logos or
  icons (they are `_Design\Assets\`, one set for apps and reports).

## Naming

`<Tool>_Template`: the tool's short name in CAPITALS before `_Template`, inside `_Design\`: `PBI_Template` (Power BI) ·
`TBL_Template` (Tableau). No `_` in front: it is a child inside the `_Design\` block (`Struc_Disk_Data` law 3).

## Check

`zemory conform --layout <drive>\Workspace\Company\<Org>` accepts `_Design\` at the organisation level. No machine check yet for
what is inside.
