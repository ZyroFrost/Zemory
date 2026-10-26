---
id: Slot_155
name: db
version: 4
path: _DB_<Hệ>/
scope: layout
---
# Db_155_Db db — the data repo of one system

## Role

`Workspace\Company\<Org>\_DB_<System>\` is the repo of ONE data system shared in the organisation: schemas, named queries, data loading
tasks, documents about the sources. The leading `_` says it is shared by the whole organisation, not owned by one department.

## Three kinds — each assembles a different frame

| kind | example | frame assembled | role in the organisation |
|---|---|---|---|
| data warehouse (DW) | `_DB_Warehouse` | `Struc_Repo_WorkspaceManager` | manages the department repos (is the `owner` of `Dept_<Code>`), provides `data` to the departments |
| the data system of an application (business source: ERP, POS…) | `_DB_Erp` | `Struc_Repo_AppData` | provides `app-data` to the application; its `owner` must be the repo that manages the application (`Struc_Repo_SystemManager`) |
| log centre | `_DB_Log` | `Struc_Repo_LogCenter` | provides `log`; has no `owner` |

An organisation has exactly ONE data warehouse (the provider of `data`) and exactly ONE log centre (the provider of `log`) — the law "each service role
has one provider" of `Struc_Region_Company`. The data system of an application: one repo per application. An organisation with no data warehouse has its managing repo at
`_WorkspaceManager\` (WorkspaceManager_171) instead.

## May hold / may not hold

- Holds: schemas · named queries · data loading and cleaning tasks · documents describing the sources.
- Not here: a department's reports (in that department's `Dept_<Code>\`) · application code (in `_Project\<Group>\<repo>\`) ·
  large raw data pulled in (it lives in the database, not in the repo).

## Naming

`_DB_<System>`: the fixed prefix `_DB_`, the system name in PascalCase, no diacritics, no spaces: `_DB_Warehouse` · `_DB_Erp` · `_DB_Log`.

## Check

- `zemory conform --layout <drive>\Workspace\Company\<Org>`: a folder matching neither `_DB_<System>` nor any other slot is treated as an
  unknown folder (`unknown-folder`).
- `zemory conform` run INSIDE the repo: an application's data system missing `owner` (when the organisation already has a repo managing the application), an `owner`
  that does not manage `app-data` — red.
