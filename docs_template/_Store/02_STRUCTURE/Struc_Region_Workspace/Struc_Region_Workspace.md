---
id: Struc_Region_Workspace
name: region-workspace
version: 8
scope: region
checked: [Struc_Repo_Dept]
---
# Struc_Region_Workspace

The data drive's `Workspace/` (`Struc_Disk_Data`) holds every repo of the owner, in three regions. This standard is assembled into no repo: it
declares the three regions and the two kinds of relation between repos. Inside an organisation, `Struc_Region_Company` applies. A repo's role lives in the
template that repo assembles, not here.

## The tree

```
Workspace/
├── Company/<Org>/                the repos of one organisation (Company_144) → Struc_Region_Company
├── Personal/[<Group>/]<repo>/    personal repos (Personal_145)
└── External/<repo>/              outside clones, read only, no HS assembled (External_146)
```

- Check: `zemory conform --layout <Workspace>` — an unknown folder at level 1 · a repo straight under `Company/` · a repo with HS assembled
  inside `External/`.

## The role lives in the template

- Each repo template (`Struc_Repo_*`) declares a `role` block in `structure.json`: the role name · which templates it manages (`manages`) ·
  which template it belongs to (`managed_by`) · the manager rule (`owner`: `required` · `optional` · `none`) · the services it provides
  to the group (`provides`).
- A repo that picks a template knows its role and duties; the marker does not declare a role.
- The slot of a shared service (e.g. the shared mail set) is only in the template providing that service; a repo using the service keeps no copy of its own.

The roles of the eight existing repo templates (read from each template's `structure.json › role`):

| template | role | manages | belongs to | `owner` | provides | example repo |
|---|---|---|---|---|---|---|
| `Struc_Repo_WorkspaceManager` | `workspace-manager` | `dept` | — | none | `data` · `workspace-values` · `mail` | the data warehouse `_DB_Warehouse` |
| `Struc_Repo_Dept` | `dept` | — | `workspace-manager` | required | — | `Dept_FIN` |
| `Struc_Repo_SystemManager` | `system-manager` | `app` · `app-data` | — | none | — | `_Project\ERP\_Hub` |
| `Struc_Repo_App` | `app` | — | `system-manager` | optional | — | `_Project\ERP\AcmeFlow` |
| `Struc_Repo_AppData` | `app-data` | — | `system-manager` | required | `app-data` | `_DB_Erp` |
| `Struc_Repo_LogCenter` | `log-center` | — | — | none | `log` | `_DB_Log` |
| `Struc_Repo_Reference` | `reference` | — | — | none | `glossary` · `legacy` · `design` (by repo) | `_Glossary` · `_Legacy` · `_Design` |
| `Struc_Repo_NonApp` | `non-app` | — | — | optional | — | a personal repo that is not an application |

This table is copied from the templates' declarations for quick lookup; the source of truth is each template's `structure.json` — change a
role there, then make this table match.

## Two kinds of relation

- **Manager (`owner`) — a solid line, exactly one.** The manager decides the frame and the standard of the repos it manages. A top-level repo has no
  manager. Two repos are never both the manager of one repo.
- **Service (`uses`) — a dotted line, by area.** A repo uses another repo's service in exactly one area (data · log · mail · design ·
  terms …). The provider has a say only in that area.
- When the two disagree: within the service area the provider wins; in everything else the manager wins.

## Declared in the repo's marker

```
"owner": "<folder name of the manager repo>",
"uses": { "data": "<repo>", "mail": "<repo>", "log": "<repo>", "design": "<repo>", "glossary": "<repo>" }
```

A complete example — the `docs\.harness.json` of the finance department repo `Dept_FIN` in the organisation Acme:

```
"owner": "_DB_Warehouse",
"uses": { "data": "_DB_Warehouse", "design": "_Design", "glossary": "_Glossary" }
```

Read as: the data warehouse `_DB_Warehouse` is the department's manager (solid line) and also supplies its figures (dotted line); the department
takes its report template and interface assets from `_Design` and its terms from `_Glossary`.

- `owner`: by the template's `owner` rule; left empty when the template declares `none`.
- `uses`: each area points at exactly one repo.
- A repo assembling no template (an outsider, e.g. a vendor's app) declares nothing; nobody manages it.
- Check (conform `region-links`): each name points at a real repo in the group · the manager's template can manage this repo's template ·
  the template's `owner` rule is kept · a repo named in `uses` has a template providing exactly that area. A repo pointed at that has assembled no template yet
  ⇒ a reminder, not red yet.

## Boundaries between the repos of a group

- Every department's reports read the manager's data warehouse, never pointing straight at a business system's source.
- Repos under the same manager never point paths at each other, only name the repo. Two repos needing the same thing ⇒ it moves up to the manager first;
  something duplicated between two repos is kept as an independently running copy on each side.
- A repo ↔ its manager: may point both ways. A run-time dependency (code reading a file of the manager) goes through a config variable or the manager's
  deployment mechanism, never a path hard-coded across the code.
- The group's shared memory: memory operations match EXACTLY the `project_root` of the repo being worked on, never a prefix.
