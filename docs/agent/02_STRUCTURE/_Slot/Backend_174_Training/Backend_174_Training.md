---
id: Slot_174
name: training
version: 1
path: backend/src/training/
checked: [Backend_002_Backend, Backend_007_Src, Backend_022_Ai, Backend_025_Evals, Backend_027_Pipelines, Backend_049_Test]
from: _Store/02_STRUCTURE/_Slot/Backend_174_Training @v1 #44e96ab81190
---
# Backend_174_Training training — the code that trains the repo's own models

## Role

The pipeline that makes a model of the repo's own from labelled data: pull the examples, label them, fit (pick thresholds or
learn weights), export the result where the running app reads it. One model = one sub-folder; its steps are numbered in the
order they run. The data and the results of a run live in `Data_175_Training`, never here.

- Not `Backend_002_Backend` · `Backend_007_Src`: those hold all the server code; this child slot has rules of its own — it
  never runs inside the app, it must encode with the app's own code path, and its data lives in `Data_175_Training`.
- Not `Backend_022_Ai`: `ai/` calls a model while the app runs (the provider, the adapter); this slot makes a model and never
  runs inside a request.
- Not `Backend_025_Evals`: `evals/` measures a model on a labelled corpus and gives a score; training calls it to judge a fit,
  and owns the fitting and the export that `evals/` never does.
- Not `Backend_027_Pipelines`: `pipelines/` moves and transforms data in fixed steps; a training step fits parameters from the
  data, so running it again on new labels gives a different model.
- Not `Backend_049_Test`: a test passes or fails on fixed input; training produces an artefact.

## Inside

```
backend/src/training/
└── <model>/
    ├── 01_pull.*      the examples, from the repo's own source
    ├── 02_label.*     draft labels for a person to review
    ├── 03_train.*     the fit: thresholds or weights, judged through evals/
    └── 04_export.*    the chosen result, written where the running app reads it
```

- Kind of file: the repo's own code language.
- Sub-folder names: the model's name; step files keep the two-digit stage prefix.
- Never inside: data, labels, vectors, weights, run reports (→ `Data_175_Training`); a model downloaded from someone else
  (→ `Data_101_Models`).
- Points at no child slot.

## Rules

- The training run encodes with the same code path the running app uses; a second path gives vectors the trained thresholds
  or weights do not fit.
- Export writes only the chosen result, with the encoding profile and the hash of the labelled set it came from; the running
  app ignores a result whose profile differs from its own and falls back to its baseline.
- A step that reads labelled data reads it from `Data_175_Training`; nothing private is written into the repo's tracked files.

## Example

A repo trains the classifier of its reminder doors: `backend/src/training/prompt-gates/01_pull.ts` pulls the messages people sent to
its agents, `03_train.ts` picks one threshold per door on the train split and scores the holdout through
`backend/src/evals/`, `04_export.ts` writes the thresholds into each door's config.

## Check

- `zemory conform` accepts `backend/src/training/` in a repo assembled from `Struc_Repo_App`.
- The model's export step names the profile and the labelled-set hash in what it writes.
