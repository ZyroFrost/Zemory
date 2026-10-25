---
id: Slot_158
name: legacy
version: 3
path: _Legacy/<Nguồn>/
scope: layout
---
# Legacy_158_Legacy legacy — the archive of old work

## Role

`Workspace\Company\<Org>\_Legacy\` keeps as they are the pieces of work done BEFORE the current structure existed: the handover of the person
before, content copied from an old server, code and reports of the old system. The purpose is to look things up again, not to keep working on them.
This is the provider of the `legacy` role, assembled from the frame `Struc_Repo_Reference`.

## How to place it

One folder per SOURCE, named after that source; inside, the tree is kept EXACTLY as received, names with diacritics and spaces included. Example:

```
_Legacy\
├── OldServer\          copied as is from the old server: Reports\ · Queries\ · …
└── PreviousAnalyst\    the handover of the person before, original folder names kept
```

## Rules — read only

- NOTHING inside a source is edited, rearranged or renamed.
- HS is NOT assembled into the sources inside.
- To reuse a part: COPY the part needed into the repo of the right role (e.g. an old query ⇒ `_DB_<System>\`, an old report ⇒
  `Dept_<Code>\`) and work there. The copy in `_Legacy\` stays as it is, as the record.

## Naming

`<Source>` is the name of the person, machine or system the content came from: a server name (`OldServer`, `SRV-BI`), the name of an old unit. Written so
that one look tells where it came from.

## Check

`zemory conform --layout <drive>\Workspace\Company\<Org>` checks `_Legacy` is a valid folder of the organisation. The inside is not
checked for shape (keeping it as it was is the point).
