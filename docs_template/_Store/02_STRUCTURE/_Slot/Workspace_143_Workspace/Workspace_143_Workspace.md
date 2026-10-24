---
id: Slot_143
name: workspace
version: 4
path: Workspace/
scope: layout
---
# Workspace_143_Workspace workspace — code, repos and work for organisations

## Role

`<data root>\Workspace\` is step 7 of the drive's question chain (`Struc_Disk_Data`): code or a repo, or work done for an
organisation. A repo is a folder with `.git\`, or a folder HS was assembled into (`docs\.harness.json`). A repo anywhere else on
the drive is off-standard and moves here.

## The question of this level — the first true answer wins

| step | the fact | goes to |
|---|---|---|
| 1 | work done for an organisation (an employer past or present, a client of freelance work) — repos and non-repo work folders | `Company\<Org>\` (Company_144) |
| 2 | code written by someone else — always, even when it was cloned to learn from (a fork with commits of the owner is the owner's code: step 3) | `External\<repo>\` (External_146) |
| 3 | everything else: the owner's own code | `Personal\<Kind>\…` (Personal_145) |

```
Workspace\
├── Company\<Org>\…       work for an organisation (Company_144) — inside, the frame Struc_Region_Company
├── External\<repo>\      code of others, read only (External_146)
└── Personal\<Kind>\…     the owner's own code: StudyProjects · Games · Apps (Personal_145)
```

## Rules

- The `Workspace\` level holds only `Company\` · `External\` · `Personal\`: no repo straight here, no loose file, no fourth folder.
- Not here: program installs (`Software\`) · tool settings and keys (`_ConfigVault\`) · papers about the owner or an organisation
  (`Documents\Profile\`).
- `Workspace` is written exactly so on every machine, Linux included.

## Sync

`Workspace\` is not synced as a block. Each repo goes its own way: git for code · Syncthing for shared data folders (`_Glossary\`)
· the zemory channel for harness docs.

## Check

`zemory conform --layout <data root>` (or `<drive>\Workspace`): a folder of no region (`unknown-folder`) · a repo straight under
`Company\` (`repo-under-company`) · HS assembled into a clone in `External\` (`assembled-external`) · a folder under `Personal\`
outside its kinds (`unknown-value`) · a repo outside `Workspace\` (`repo-outside-workspace`, from the drive root).
