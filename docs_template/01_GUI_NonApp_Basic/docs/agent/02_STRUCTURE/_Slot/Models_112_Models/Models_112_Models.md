---
id: Slot_112
aka: 03-112
name: models
version: 5
path: models/
checked: [Models_142_Database, Scripts_128_Scripts, Data_101_Models]
from: _Store/02_STRUCTURE/_Slot/Models_112_Models @v5 #06469457fa37
---
# Models_112_Models models — deliverable data: the model layer, or the build chain of one database

## Role

The data deliverable of a project. It takes one of two shapes, chosen by the kind of project:
- **Model layer** — a semantic / transform layer: dbt models · tabular `.bim` · DAX model.
- **Database chain** — the scripts that build and change the ONE database the repo owns, flat in `models/`.

Deliverable ◆ — a NON-APP repo keeps at least one deliverable folder: `reports/` | `models/` | `content/` | `design/`, chosen by
the kind of project.

## Database chain

- `NN_<slug>.sql` — the number is the run order, consecutive. Running the files in order from the smallest rebuilds the database
  from nothing in one pass.
- Every file is safe to run again (`IF NOT EXISTS` · `CREATE OR ALTER` · `CREATE OR REPLACE`) and never deletes data on a rerun.
- `README.md` — run order, how each step is measured, traps already met.
- The repo owns two databases or more ⇒ one folder per database, every one of them including the first (`Models_142_Database`).

## May not hold

The script that RUNS the chain, or sets up the machine the database lives on (→ `scripts/`) · run logs (→ `data/`) · secrets
(→ `.env`, `data/secrets/`) · data · AI model weights (→ `Data_101_Models`).

## Naming

dbt imposes the name `models/`. Chain files: `NN_<slug>.sql`, English ASCII, lower-case slug.

## Check

No machine check yet.
