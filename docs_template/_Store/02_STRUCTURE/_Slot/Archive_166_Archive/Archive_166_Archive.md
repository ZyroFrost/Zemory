---
id: Slot_166
name: archive
version: 3
path: Archive/<Origin>/
scope: layout
---
# Archive_166_Archive archive — retired items kept as the only copy

## Role

`<data root>\Archive\` is step 3 of the drive's question chain (`Struc_Disk_Data`): an item the owner has CONFIRMED is almost never
used any more, closed away here and kept in case a problem comes up. It is the ONLY copy left: the item was taken out of its old
place. The difference with `Backup\` (step 2) is a fact: a backup's original still exists elsewhere. Knowledge finished learning
is not archived: it goes to `Library\` (step 10).

Packing to save space is NOT archiving. A packed item is still itself and stays in the place of its block, packed: a finished
capstone kept small ⇒ `Workspace\Personal\StudyProjects\School\<School>\<Subject>\<name>.tar.gz`, not `Archive\`.

## Inside

An item keeps the path it had in the tree, under the name of the top-level folder it came from:

| it was at | archived at |
|---|---|
| `Workspace\Personal\Apps\OldTool\` | `Archive\Workspace\Personal\Apps\OldTool.zip` |
| `Software\Office\FoxitReader\Setup\` (an old installer) | `Archive\Software\Office\FoxitReader\Setup\` |
| `Backup\Phone\OldPhone\` whose phone is gone | `Archive\Backup\Phone\OldPhone\` |

## Steps — archiving an item

0. Ask the owner about THIS item: is it almost never used any more, and is this the only copy? Only a yes moves it. The agent
   never moves an item into `Archive\` on its own, and never in bulk: many items that look old are still in use.
1. Create its old path under `Archive\<top-level folder>\`.
2. A repo: pack the whole folder, `.git\` included, into `<repo>.zip` (an unpacked repo outside `Workspace\` is reported).
3. Anything else: move the folder there.
4. Delete it from its old place: archiving is a move.

## Rules

- The first level holds only names of top-level folders of the tree. No loose file at the `Archive\` level.
- Nothing enters `Archive\` without the owner's yes for that item (step 0). An agent that finds an item it thinks is retired
  lists it and asks; it does not move it.
- Archive is large and rarely read: a good block for a second data drive, linked back.

## Sync

Not in git. The only copy: keep a backup on another storage place.

## Check

`zemory conform --layout <data root>` accepts `Archive\` and reds an unpacked repo inside it (`repo-outside-workspace`).
