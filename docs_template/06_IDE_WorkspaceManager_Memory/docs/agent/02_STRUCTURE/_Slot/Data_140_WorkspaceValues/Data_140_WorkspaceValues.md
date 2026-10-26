---
id: Slot_140
name: workspace-values
version: 8
path: data/region/
checked: [Data_094_Data, Config_075_Config]
from: _Store/02_STRUCTURE/_Slot/Data_140_WorkspaceValues @v8 #e429c751130a
---
# Data_140_WorkspaceValues workspace-values — the group's real values

- Role: `data/region/values.json` — the real values the whole group shares, only in the workspace manager template
  (`Struc_Repo_WorkspaceManager`). Git does not track `data/`. Tools and skills name only the KEY, never copy a value;
  a department repo reads it through `scripts/region_values.py` (finding the manager through `owner` in the marker).
- Not `Data_094_Data` (the repo's own real data): the group's values have rules of their own — only the manager template has them, every repo
  of the group reads them through `owner` (never copies), and a tool may only name the KEY.
- A key missing ⇒ the tool falls back to a neutral default (an empty list, a path that does not exist) and the related gate reports it missing; no tool
  fills in a company value on its own.
- Shared keys:

| key | what it is |
|---|---|
| `warehouse_server` · `warehouse_db` | the data warehouse's server string (the gateway matches it letter for letter) and the database name |
| `theme_file` · `icons_dir` · `template_report` · `glossary_dir` | report theme · icon library · original template · terms table — paths; the theme, icons and template live in the organisation's `_Design\` (Design_172), the terms table in the manager |
| `design_values` | the group's table of design values: colour codes by role, frame measures, measurements on the original page, logo — a path in the manager (design law: `Skill_PBI_Base`) |
| `dept_codes` · `acronyms` | the department codes · business acronyms kept upper-case in titles |
| `legacy_sources` | sources, sites, folders, keys of the old system that models and tasks must not read |
| `card_icons` | KPI card key → icon name, merged onto the default set of `card_icons.py` |
| `vm_ssh_alias` · `vm_run_dir` · `vm_work_dir` · `sharepoint_site` | the server that runs tasks and where results are delivered |
| `acronym_origin` · `not_acronyms` | the origin of each acronym (with its source) · upper-case words that are not acronyms |
| `query_app` · `query_row_cap` | the read-only query tool the agent uses to explore (name, how to call it) · the row cap per call |
| `query_client_dir` · `query_python` · `query_vault_file` · `query_warehouse_id` | the query tool's client folder · a python that can import that client · the account file name in each repo's vault (`data/secrets/vault/`) · the DW's `db_id` in the tool — `scripts/query.py` of `Skill_Task_Pull` reads these keys |
| `superseded_facts` | facts of the group that changed: `[{ old, now, roles?, level?, files? }]` — a server renamed, an app replaced, a root folder moved. `level: "advisory"` = the name lives on in history, only a reminder · `files: "prose"` = only instructional text (`.md`) is checked, not task code. `zemory conform` › `superseded-fact` reports every place the repo's text still says `old`; `zemory sync` puts it in the repo's ledger. A fact of the group changes ⇒ add one row here, never edit each repo by hand |
| `mail_signature` · `mail_cc` · `shared_mailbox` · `shared_mailbox_signature` | the default signature and Cc of report mail; the shared mailbox and its signature |
