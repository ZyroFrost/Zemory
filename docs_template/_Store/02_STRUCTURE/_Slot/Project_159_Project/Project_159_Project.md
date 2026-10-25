---
id: Slot_159
name: project
version: 3
path: _Project/<Nhóm>/<repo>/
scope: layout
---
# Project_159_Project project — the organisation's projects and applications

## Role

`Workspace\Company\<Org>\_Project\` holds the repos that do NOT belong to one department: the organisation's internal applications, applications built by a
vendor, projects several departments work on. Each repo sits in a group: `_Project\<Group>\<repo>\`.

## The groups

| group | holds | examples |
|---|---|---|
| `ERP\` | internal applications built on the organisation's business system, and the repo that manages them | `_Project\ERP\AcmeFlow\` · `_Project\ERP\_Hub\` |
| `Vendor\` | applications a vendor builds for the organisation; may have no HS assembled when the vendor keeps the code | `_Project\Vendor\CameraAI\` |

## Frames and relations

- An application repo assembles `Struc_Repo_App` (role `app`). `owner` is optional; when declared, it must be the repo that manages applications.
- The repo that manages applications assembles `Struc_Repo_SystemManager` (role `system-manager`), usually named `_Hub`. It manages the `app` repos and the
  applications' data systems (`_DB_<System>` assembling `Struc_Repo_AppData`). It does NOT manage departments — departments belong to the data warehouse
  (`Struc_Repo_WorkspaceManager`).
- The relation is declared in the application repo's own `docs\.harness.json`, e.g. `"owner": "_Hub"`.

## Rules

- The repo of ONE department goes in `Dept_<Code>\`, not in `_Project\`.
- No repo straight under `_Project\`: there is always a group level.

## Naming

Groups in PascalCase (`ERP` · `Vendor`). A repo keeps exactly its name on git.

## Check

- `zemory conform --layout <drive>\Workspace\Company\<Org>` checks `_Project` is a valid folder of the organisation.
- `zemory conform` run INSIDE an application repo: an `owner` declared that is not the repo managing applications — red.
