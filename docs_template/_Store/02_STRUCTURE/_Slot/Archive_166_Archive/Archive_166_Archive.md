---
id: Slot_166
name: archive
version: 1
path: Archive/<Origin>/
scope: layout
---
# Archive_166_Archive archive — retired items kept as the only copy

## Role

`<data root>\Archive\` holds items the owner no longer uses but keeps: a closed project, an old installer of a program, a finished
subject with notes worth keeping. Branch ④ of `Struc_Disk_Data`. An archived item is the ONLY copy left (its original was moved
here); that is the difference with `Backup\` (Backup_165), which holds copies.

## Inside

An item keeps the path it had in the tree, under the name of the top-level folder it came from, so it is found again by where it
used to be.

| it was at | archived at |
|---|---|
| `Workspace\Personal\OldTool\` | `Archive\Workspace\Personal\OldTool.zip` |
| `Study\School\OpenUniversity\Statistics\` | `Archive\Study\School\OpenUniversity\Statistics\` |
| `Software\Office\FoxitReader\Setup\` (an old installer) | `Archive\Software\Office\FoxitReader\Setup\` |

## Steps — archiving an item

1. Find the item's path in the tree; create the same path under `Archive\<top-level folder>\`.
2. A repo: pack the whole folder, `.git\` included, into one file `<repo>.zip` and put the file there. An unpacked repo outside
   `Workspace\` is reported by the layout check.
3. Anything else: move the folder there.
4. Delete the item from its old place: archiving is a move, not a copy.

## Rules

- The first level holds only names of top-level folders of the tree (`Workspace` · `Study` · `Software` …).
- No loose file at the `Archive\` level.
- Archive is large and rarely read: a good block to move to a second data drive, linked back.

## Naming

The names the item had; nothing is renamed.

## Sync

Not in git. The only copy: keep a backup on another storage place.

## Check

`zemory conform --layout <data root>` accepts `Archive\` as a top-level folder and reds an unpacked repo inside it
(`repo-outside-workspace`).
