---
id: Slot_142
aka: 03-142
name: database
version: 3
path: models/<database>/
checked: [Models_112_Models, Data_101_Models, Tasks_117_Case, Scripts_128_Scripts]
---
# Models_142_Database database — the structure-change series of ONE database

- An OPTIONAL slot, no template turns it on. By default an APP-DATA repo keeps ONE database shared by the whole app system ⇒ a flat `models/`
  (`Models_112_Models`). Use this slot only when the repo manages two databases or more; then every database, the first one included,
  gets a folder of its own.
- Role: each database the repo manages has ONE folder under `models/`, holding the series of scripts that build and change the structure of that
  database alone — each its own numbered series, never mixed.
- May hold / may not hold:
  - `NN_<slug>.sql` — the number = the run order, consecutive, counted per folder; each file is harmless to run again · `README.md` — the run
    order, the measurements, the traps met with this database.
  - Not here: the script that runs the series (→ `scripts/`, one script taking the folder name) · run logs (→ `data/`) · secrets (→ `.env`,
    `data/secrets/`) · data.
- Naming: the database shared by the whole app system ⇒ `_` + name, first in the list; a database of one app ⇒ exactly the app's
  name. ASCII English.
- Not `Models_112_Models`: that slot is a project's whole model layer (dbt · tabular · DAX), flat; this slot splits `models/`
  by target database — each folder its own numbered series and its own run target.
- Not `Data_101_Models`: AI model weights in `data/`, outside git; here are structure scripts, in git.
- Not `Tasks_117_Case`: a case is a line of work; this folder is a database, living as long as that database.
- Not `Scripts_128_Scripts`: a script there RUNS the series; this folder only KEEPS it.
- Machine check: none yet.
