---
id: Slot_146
name: external
version: 3
path: External/<repo>/
scope: layout
---
# External_146_External external — code of others

## Role

`Workspace\External\` holds code written by SOMEONE ELSE, whatever it was cloned for: to read, to learn from, to try (step 2 of
`Workspace_143`). Learning material that needs it links here instead of holding a copy. Examples:
`D:\Workspace\External\some-library\` · `D:\Workspace\External\vendor-sdk\`.

## Rules — read only, no exceptions

- Do NOT assemble HS into a clone (no `zemory init`, no `docs\.harness.json`).
- Do NOT edit the clone, do NOT run a writing zemory command with the working folder inside it.
- To use a part: copy it into a repo of the owner (`Personal\` or `Company\<Org>\`) and work there.
- To change it and contribute back: fork it; a fork with commits of the owner is the owner's code ⇒ `Personal\`.

## Naming

The repo's own name as on its page, case and dashes kept: `some-library`.

## Check

`zemory conform --layout <drive>\Workspace` names (`assembled-external`, advice) every clone in `External\` holding
`docs\.harness.json`.
