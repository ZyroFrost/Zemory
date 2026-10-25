---
id: Slot_157
name: template
version: 3
path: _<Công cụ>_Template/
scope: layout
---
# Template_157_Template template — the shared report template

## Role

`Workspace\Company\<Org>\_<Tool>_Template\` keeps the original shared report TEMPLATE of one reporting (BI) tool in the
organisation: layout, colours, logo, sample pages, standard measure tables. Every department building a new report takes the template from here. This is the
provider of the `template` role, assembled from the frame `Struc_Repo_Reference`.

Example: `D:\Workspace\Company\Acme\_PBI_Template\` holds Acme's Power BI template file (`.pbit`) and theme file (`.json`).

## Rules

- One template folder per reporting tool; a department keeps NO template copy of its own in its repo. Changing the template means changing it here;
  every department uses the new copy.
- A folder SYNCED by Syncthing, NOT a git repo: no `git init`, no push.
- Holds only the tool's template files. Not reports filled with figures (a report belongs to the department repo).

## Naming

`_<Tool>_Template`: the tool's short name in CAPITALS between `_` and `_Template`: `_PBI_Template` (Power BI) · `_TBL_Template` (Tableau).

## Check

`zemory conform --layout <drive>\Workspace\Company\<Org>` checks the folder name matches `_<Tool>_Template`. No machine check yet
for what is inside.
