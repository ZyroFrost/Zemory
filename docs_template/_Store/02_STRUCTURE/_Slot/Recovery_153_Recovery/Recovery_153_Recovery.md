---
id: Slot_153
name: recovery
version: 3
path: Recovery/
scope: layout
---
# Recovery_153_Recovery recovery — machine recovery images

## Role

`<data drive>\Recovery\` is the place of operating-system recovery images and whole-machine backups made by a SYSTEM TOOL (the recovery tool
of Windows, of the machine maker). On many machines the system itself creates this folder.

## Rules

- Holds only what a recovery tool writes. Neither the owner nor an agent puts documents, repos, installed copies or anything else here.
- Never renamed, moved, or its content deleted by hand — losing it loses the way to recover the machine.
- Not synced, not in git.

## Naming

`Recovery`, fixed, spelled exactly so.

## Check

`zemory conform --layout <drive root>` checks `Recovery` is a valid folder at the drive root and reports a repo inside it (`repo-outside-workspace`).
