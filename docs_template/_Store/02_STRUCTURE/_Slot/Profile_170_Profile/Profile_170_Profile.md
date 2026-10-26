---
id: Slot_170
name: profile
version: 2
path: _Profile/
scope: layout
---
# Profile_170_Profile profile — the owner's papers with one organisation

## Role

`Workspace\Company\<Org>\_Profile\` holds the papers that tie the owner to THIS organisation, by the block law of `Struc_Disk_Data`
(a thing goes in the smallest block that holds everything using it): the employment contract, probation and yearly reviews,
handover notes, the company profile, the passwords of the organisation's systems. Moved to another
place they get lost; here they sit with everything else of that organisation and leave with it.

## Inside

As the owner needs, for example:

```
_Profile\
├── Contract\      employment contract, appendices
├── Review\        probation report, yearly reviews
├── Handover\      handover notes when joining or leaving
├── Brand\         company profile, brand guide (the logo files themselves live in _Design\Assets\Logo\)
└── Secret\        passwords of the organisation's systems a person reads
```

## Rules

- Logos, icons, colours and templates the repos use are not papers ⇒ `_Design\` (Design_172), the one source the repos copy from.
- Only papers tied to this ONE organisation. Papers used for any organisation (CV, identity, avatar, personal secrets) ⇒
  `Documents\Profile\`.
- Not a repo: no `.git\`, no HS assembled into it.
- `Secret\` follows the sync ban of `_ConfigVault`: never in git; `_Profile\` is excluded from any synced folder of the organisation
  (add it to the `.stignore` of the folder Syncthing shares).
- Keys and settings a PROGRAM reads (ssh keys, tokens) are not papers ⇒ `_ConfigVault\` (ssh reads one folder for every host).

## Naming

`_Profile` exactly, one per organisation.

## Check

`zemory conform --layout <drive>\Workspace\Company\<Org>` accepts `_Profile\` at the organisation level.
