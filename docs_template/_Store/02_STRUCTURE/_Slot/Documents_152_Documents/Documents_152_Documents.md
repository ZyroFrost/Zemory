---
id: Slot_152
name: documents
version: 4
path: Documents/<DocKind>/
values: [Profile, Family]
scope: layout
---
# Documents_152_Documents documents — papers a person reads

## Role

`<data root>\Documents\` is step 13 of the drive's question chain (`Struc_Disk_Data`): papers and records a PERSON opens and reads.
Settings or keys a program or an agent reads by itself are not papers ⇒ `_ConfigVault\` (step 5). The avatar collection is step 11
and lives here too, in `Profile\Personal\Avatar\`.

## The question of this level

| the fact | goes to |
|---|---|
| about the owner, tied to one organisation (contract, review, handover, logo, company profile — papers about or from it) | `Profile\Company\<Org>\` |
| about the owner otherwise | `Profile\Personal\` — `Identity\` (identity papers, ID photos) · `Avatar\` · `CV\` · `Secret\` |
| about the owner's family (family tree, family records) | `Family\` |

```
Documents\
├── Profile\
│   ├── Personal\   Identity\ · Avatar\ · CV\ · Secret\
│   └── Company\<Org>\
└── Family\
```

There is ONE `Company` folder in the whole tree for papers (`Documents\Profile\Company\<Org>\`) and ONE for work
(`Workspace\Company\<Org>\`); the fact that splits them: a person reads it ⇒ here; it is work done for the organisation ⇒ Workspace.

## Rules

- `Profile\Personal\Secret\` holds secrets a PERSON reads (web passwords, wallet phrases). It follows the sync ban of
  `_ConfigVault`: NEVER in git, NEVER in a synced folder (Syncthing), NEVER in a cloud backup folder (Drive).
- A program found here (a family-tree program, an `.exe`) ⇒ `Software\`; a downloaded font ⇒ `Software\Fonts\`.
- Work for an organisation (designs, code, project files) ⇒ `Workspace\Company\<Org>\`.
- Inside each folder, sub-folders as the owner needs; no loose file at the `Documents\` or `Profile\` level.

## Naming

English, PascalCase, no spaces. The organisation's name as in `Workspace\Company\`.

## Check

`zemory conform --layout <data root>` reds (`unknown-value`) a folder in `Documents\` other than `Profile` and `Family`, and a repo
inside (`repo-outside-workspace`). No machine check yet for a secret leaking into a synced folder.
