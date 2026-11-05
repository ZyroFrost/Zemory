---
id: Slot_175
name: training
version: 1
path: data/training/
checked: [Data_094_Data, Data_096_Cache, Data_101_Models, Data_131_Case, Backend_025_Evals]
---
# Data_175_Training training — the data and results of training a model

## Role

What `Backend_174_Training` reads and writes for each model: the labelled examples, the intermediate files of a run, and the
results of every run. Gitignored and kept on the machine that trains; the result the running app uses leaves through the
model's export step, never by carrying this folder.

- Not `Data_094_Data`: that is the parent of every machine-local runtime folder; this child has rules of its own — a
  protected stage of reviewed labels and a fixed three-stage layout per model.
- Not `Data_096_Cache`: a cache is rebuilt on demand and nobody reviews it; the reviewed labels here are a person's work and
  cannot be rebuilt.
- Not `Data_101_Models`: `data/models/` holds weights downloaded from someone else; this holds what the repo itself trains.
- Not `Data_131_Case`: a case is the working data of one task of a case-based repo; this is the data of one model of an app.
  The three stages are the same on purpose.
- Not `Backend_025_Evals`: that slot is the code that measures; the scores it writes for a training run land here.

## Inside

```
data/training/
└── <model>/                    the same name as backend/src/training/<model>/
    ├── 01_raw/                 the pulled examples and the REVIEWED labels — a person's work, read-only once written
    ├── 02_processing/          vectors, draft labels, the train / holdout split — delete freely, a rerun rebuilds it
    └── 03_output/run-<time>/   the result and the score report of each run — kept for comparison
```

- Kind of file: data files (`.json` · `.jsonl` · `.csv`), never code.
- A stage folder is created when its first file arrives, never before.
- Never inside: code (→ `Backend_174_Training`); anything the running app reads directly.

## Rules

- `01_raw` is protected: declare `data/training/*/01_raw` in the marker's `protected` key.
- The examples are words real people wrote: the folder never enters git and never leaves the machine through a sync of the repo.
- A run reads its labelled set from `01_raw` and records the set's hash in its report, so two runs on different labels are
  never compared as if equal.

## Example

`data/training/prompt-gates/01_raw/corpus.json` holds 1,200 messages, each with the doors a reviewer confirmed;
`03_output/run-2026-11-06T10-00/` holds the threshold of each door and the precision, recall and F1 of the regex and of the
classifier on the holdout.

## Check

- `zemory conform` accepts `data/training/` in a repo assembled from `Struc_Repo_App`, and reports a code file inside it.
- `git check-ignore data/training` answers yes.
