---
id: Slot_171
name: workspace-manager
version: 1
path: _WorkspaceManager/
scope: layout
checked: [Db_155_Db, Project_159_Project, Profile_170_Profile]
---
# WorkspaceManager_171_WorkspaceManager workspace-manager — the managing repo of an organisation with no data warehouse

## Role

`Workspace\Company\<Org>\_WorkspaceManager\` is the repo managing the organisation's repos when the organisation runs no data
warehouse — no database work, no app of its own, for example a group of document or report repos. It sits at the same level as
`_DB_<System>\` and is assembled with the same frame, `Struc_Repo_WorkspaceManager`: it is the `owner` of the `Dept_<Code>\` repos, keeps
the group's values (`Data_140_WorkspaceValues`) and the shared mail set (`Config_139_Mail`), and changes the shared standard in HS.

Khác Db_155_Db: the data warehouse repo `_DB_<System>\` holds the managing role only together with a database (schemas, loading tasks);
`_WorkspaceManager\` holds the managing role without one, so it provides no `data` service.

## When to use it

1. Does the organisation have a data warehouse repo (`_DB_<System>\` with the frame `Struc_Repo_WorkspaceManager`)?
   - Yes ⇒ that repo is the manager; do not create `_WorkspaceManager\`.
   - No ⇒ the managing repo is `_WorkspaceManager\`, created when the first department repo needs an `owner`.
2. Later the organisation starts a data warehouse ⇒ keep `_WorkspaceManager\` as the manager and let the new `_DB_<System>\` be a data
   repo (`Struc_Repo_AppData` or a plain DW without managing), or move the managing role in one batch (`Skill_Harness_RepoMove`). Never
   two managers at once.

## May hold / may not hold

- Holds: the group's values · the shared mail set · the documents and skills of the group · the standard the department repos follow.
- Not here: a department's reports (`Dept_<Code>\`) · application code (`_Project\<Group>\<repo>\`) · the owner's papers with the
  organisation (`_Profile\`).

## Naming

Exactly `_WorkspaceManager` — one per organisation, no suffix.

## Check

- `zemory conform --layout <drive>\Workspace\Company\<Org>`: `_WorkspaceManager\` is a known slot; a folder named like it with another spelling is
  an unknown folder (`unknown-folder`).
- `zemory conform` run INSIDE the department repos checks that their `owner` names the managing repo.
- "One manager per organisation" (`Struc_Region_Company`, one provider per service role) is judged by the owner; no machine check yet.
