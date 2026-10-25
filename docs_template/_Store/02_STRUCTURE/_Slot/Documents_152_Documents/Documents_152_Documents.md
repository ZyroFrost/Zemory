---
id: Slot_152
name: documents
version: 5
path: Documents/<DocKind>/
values: [Profile, Family]
scope: layout
---
# Documents_152_Documents documents — the owner's own papers, used across organisations

## Role

`<data root>\Documents\` is step 13 of the drive's question chain (`Struc_Disk_Data`): papers and records a PERSON reads that belong
to no single organisation. By the block law, anything that belongs to ONE organisation — a contract, a review, a handover, a logo,
a company profile, a password of the company's systems — lives in that organisation's block, `Workspace\Company\<Org>\_Profile\`
(Profile_170). Settings or keys a program or an agent reads by itself are not papers ⇒ `_ConfigVault\` (step 5).

## The question of this level

| the fact | goes to |
|---|---|
| about the owner, used for any organisation | `Profile\` — `Identity\` (identity papers, ID photos) · `Avatar\` · `CV\` · `Secret\` (personal secrets) |
| about the owner's family (family tree, family records) | `Family\` |

```
Documents\
├── Profile\   Identity\ · Avatar\ · CV\ · Secret\
└── Family\
```

## Rules

- No `Company` folder here: papers of one organisation ⇒ `Workspace\Company\<Org>\_Profile\`.
- `Profile\Secret\` holds personal secrets a PERSON reads (web passwords, wallet phrases). It follows the sync ban of `_ConfigVault`:
  NEVER in git, NEVER in a synced folder (Syncthing), NEVER in a cloud backup folder (Drive).
- A program found here (a family-tree program, an `.exe`) ⇒ `Software\`; a downloaded font ⇒ `Software\Fonts\`.
- Inside each folder, sub-folders as the owner needs; no loose file at the `Documents\` or `Profile\` level.

## Naming

English, PascalCase, no spaces: `Identity` · `Avatar` · `CV` · `Secret` · `Family`.

## Check

`zemory conform --layout <data root>` reds (`unknown-value`) a folder in `Documents\` other than `Profile` and `Family`, and a repo
inside (`repo-outside-workspace`). No machine check yet for a secret leaking into a synced folder.
