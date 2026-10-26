---
id: Slot_154
name: dept
version: 5
path: Dept_<Mã>/
match: ^Dept_[A-Z]{2,4}$
scope: layout
---
# Dept_154_Dept dept — the repo of one department

## Role

`Workspace\Company\<Org>\Dept_<Code>\` is the repo holding the work of ONE department: its reports, consolidated figures, and recurring tasks
(weekly, monthly). Each department has exactly one repo. The repo assembles HS by the frame `Struc_Repo_Dept`.

Examples: `D:\Workspace\Company\Acme\Dept_FIN\` (finance) · `D:\Workspace\Company\Acme\Dept_LOG\` (logistics).

## Relations with other repos — declared in the department repo's `docs\.harness.json`

- `owner` — REQUIRED: the folder name of the repo that manages the organisation's departments, i.e. the repo assembling the frame `Struc_Repo_WorkspaceManager`
  (role `workspace-manager`). In an organisation that repo is the data warehouse (DW). Example `"owner": "_DB_Warehouse"`. One name only.
  While the organisation has no repo assembling that frame, `conform` only reminds, it does not block yet.
- `uses` — the repos providing the services the department uses, by kind. A department reading figures from the data warehouse ⇒
  `"uses": { "data": "_DB_Warehouse" }`. The repo named must assemble a frame that provides exactly that kind: `data` is provided by
  `Struc_Repo_WorkspaceManager`.
- Not to be confused with the repo managing applications (`Struc_Repo_SystemManager`, e.g. `_Project\ERP\_Hub\`): that repo manages apps and the apps'
  data systems, NOT departments, so it can never be a department's `owner`.
- A department manages no other repo.

## Rules

- A department keeps NO copy of a source system's data: figures are read through the `_DB_<System>` repo it `uses`, tables are never copied into the department repo.
- A department keeps NO private copy of the shared report template: the template comes from the organisation's `_Design\<Tool>_Template\`, logos and icons from `_Design\Assets\` (Design_172): a report copies the files it uses into its own place and commits them.
- A department repo's git is a backup on the machine (`git: local` in the frame): it has a commit history, NO remote, no push.

## Naming

`Dept_<Code>`, the department code in CAPITALS, 2 to 4 letters, no digits, no hyphens: `Dept_FIN` · `Dept_LOG` · `Dept_SAL`. Off the pattern
(`Dept_finance`, `Dept_Fin`, `Dept_FINANCE`) is off-standard.

## Check

- `zemory conform --layout <drive>\Workspace\Company\<Org>`: a department folder off the naming pattern is treated as an unknown folder
  (`unknown-folder`).
- `zemory conform` run INSIDE the department repo: `owner` missing while the organisation has a group manager, an `owner` that is not the group
  manager, `uses.data` pointing at a repo that does not provide `data` — each is red.
