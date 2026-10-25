---
id: Slot_156
name: glossary
version: 3
path: _Glossary/
scope: layout
---
# Glossary_156_Glossary glossary — the shared terms table

## Role

`Workspace\Company\<Org>\_Glossary\` is the ONE place in the organisation that defines shared terms: business words and
data definitions (field names, how a measure is computed). Every department looks them up here; no department keeps a terms table of its own. This is the
provider of the organisation's `glossary` role, assembled from the frame `Struc_Repo_Reference`.

## The tree

```
_Glossary\
├── Business\     business terms — e.g. what "net revenue" means, from which day a "new customer" counts
└── Data\         data definitions — e.g. which table the field `net_revenue` comes from, how the "retention rate" measure is computed
```

## Rules

- An organisation has exactly ONE `_Glossary\`. A new term is added here, never redefined in a department repo.
- `_Glossary\` is a folder SYNCED by Syncthing (it carries `.stfolder`), NOT a git repo: no `git init`, no push.
- Holds only definitions. No reports, data, code.

## Naming

`_Glossary`, fixed, spelled exactly so. The two sub-folders `Business` · `Data` spelled exactly so.

## Check

`zemory conform --layout <drive>\Workspace\Company\<Org>` checks `_Glossary` is a valid folder of the organisation. No machine check yet
for what is inside.
