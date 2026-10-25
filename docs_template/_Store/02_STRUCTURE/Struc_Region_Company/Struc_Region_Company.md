---
id: Struc_Region_Company
name: region-company
version: 4
scope: region
---
# Struc_Region_Company

## Role

The frame of ONE organisation, laid on `Workspace\Company\<Org>\`. Everything the owner does for that organisation sits here: its
repos, each by role, and its non-repo work folders. Relations between the repos (`owner` · `uses`) and the role table of each set
follow `Struc_Region_Workspace`.

## The question of this level

| the fact | goes to |
|---|---|
| a repo of one department | `Dept_<CODE>\` (Dept_154) — set by Struc_Repo_Dept |
| a repo of a data system: warehouse · an app's data · log centre | `_DB_<System>\` (Db_155) — Struc_Repo_WorkspaceManager · AppData · LogCenter |
| the shared business glossary (a synced folder) | `_Glossary\` (Glossary_156) |
| a shared report template of one tool (a synced folder) | `_<Tool>_Template\` (Template_157) |
| old work kept read only | `_Legacy\<Source>\` (Legacy_158) |
| an internal app or a vendor's app | `_Project\<Group>\<repo>\` (Project_159) |
| the owner's papers with this organisation: contract, review, handover, logo, company profile, passwords of its systems | `_Profile\` (Profile_170) |
| any other WORK folder that is not a repo: designs, drawings, an old project's files | `<Work>\`, named after the work (no `_`, no `Dept_`) |

```
Workspace\Company\Acme\
├── Dept_FIN\  Dept_LOG\
├── _DB_Warehouse\  _DB_Log\
├── _Glossary\  _PBI_Template\  _Legacy\OldServer\
├── _Project\ERP\_Hub\  _Project\ERP\AcmeFlow\
└── Designs\  Drawings\                 work folders, not repos
```

## Rules

- A name starting with `_` is SHARED by the whole organisation; `Dept_` is ONE department's. A work folder takes neither prefix.
- A repo always takes a role above; a repo named like a work folder is reported. A folder named with `Dept_` or `_` must match its
  role (`Dept_` + an UPPER-CASE code).
- Each service role (`data` · `log` · `glossary` · `template`) has exactly one provider in the organisation.
- The owner's papers with the organisation live HERE, in `_Profile\` (block law of `Struc_Disk_Data`); papers used for any
  organisation (CV, identity) ⇒ `Documents\Profile\`.
- No loose file at the organisation level.

## Check

- `zemory conform --layout <drive>\Workspace\Company\<Org>` reds a repo that matches no role and a `Dept_`/`_` folder outside its
  role (`unknown-folder`), a department code that is not UPPER-CASE included. A non-repo folder without a prefix is a work folder
  and passes.
- `zemory conform` run INSIDE each repo checks its relations (`owner` · `uses`, see `Struc_Region_Workspace`).
- "One provider per service role" has no machine check yet.
