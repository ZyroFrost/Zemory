---
id: Slot_166
name: archive
version: 2
path: Archive/<Origin>/
scope: layout
---
# Archive_166_Archive archive — retired items kept as the only copy

## Role

`<data root>\Archive\` is step 3 of the drive's question chain (`Struc_Disk_Data`): a project or an old version no longer used, kept
as the ONLY copy left (its original was moved here). The difference with `Backup\` (step 2) is a fact: a backup's original still
exists elsewhere. Knowledge finished learning is not archived: it goes to `Library\` (step 10).

## Inside

An item keeps the path it had in the tree, under the name of the top-level folder it came from:

| it was at | archived at |
|---|---|
| `Workspace\Personal\Apps\OldTool\` | `Archive\Workspace\Personal\Apps\OldTool.zip` |
| `Software\Office\FoxitReader\Setup\` (an old installer) | `Archive\Software\Office\FoxitReader\Setup\` |
| `Backup\Phone\OldPhone\` whose phone is gone | `Archive\Backup\Phone\OldPhone\` |

## Steps — archiving an item

1. Create its old path under `Archive\<top-level folder>\`.
2. A repo: pack the whole folder, `.git\` included, into `<repo>.zip` (an unpacked repo outside `Workspace\` is reported).
3. Anything else: move the folder there.
4. Delete it from its old place: archiving is a move.

## Rules

- The first level holds only names of top-level folders of the tree. No loose file at the `Archive\` level.
- Archive is large and rarely read: a good block for a second data drive, linked back.

## Sync

Not in git. The only copy: keep a backup on another storage place.

## Check

`zemory conform --layout <data root>` accepts `Archive\` and reds an unpacked repo inside it (`repo-outside-workspace`).
