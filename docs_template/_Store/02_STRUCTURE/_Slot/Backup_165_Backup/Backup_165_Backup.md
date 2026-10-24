---
id: Slot_165
name: backup
version: 1
path: Backup/<Source>/
scope: layout
---
# Backup_165_Backup backup — copies of data whose original lives elsewhere

## Role

`<data root>\Backup\` holds COPIES: data whose original still lives somewhere else (a phone, a chat app, another folder of the
tree), kept so it survives when the original is lost. Branch ④ of `Struc_Disk_Data`. The difference with `Archive\`
(Archive_166): an archived item is the only copy left; a backup is never the only copy. The machine's recovery images go to
`Recovery\` (Recovery_153).

## Inside

One folder per source, then one folder per device or app.

| example | holds |
|---|---|
| `Backup\Phone\<device>\` | what was copied off a phone that is NOT photos or videos: contacts, messages, app data, documents. The phone's photos and videos go to `Memories\` |
| `Backup\Chat\<app>\` | an export of a chat app's data |
| `Backup\Data\<block>\` | a backup copy of a block of branch ① (Workspace, Study, Memories, Documents) while no other storage place holds one |

## Rules

- Never the only copy: if the original is gone and the copy must be kept, it is an archive ⇒ move it to `Archive\`.
- Each backup folder is named after what it copies; a newer copy of the same source replaces the older one, or carries its day
  in the folder name (`Pixel7 2025-10-01`).
- `Backup\` holds no copy of the Global Memory database: GM is one file and has its own sync.
- No loose file at the `Backup\` level or at a source level.

## Naming

Source PascalCase: `Phone` · `Chat` · `Data`. A device or app as it is called: `Pixel7` · `Telegram`.

## Sync

Not in git. A backup on the same drive as its original protects against deletion, not against losing the drive: move it to
another storage place when one exists.

## Check

`zemory conform --layout <data root>` accepts `Backup\` as a top-level folder and reds a repo inside it
(`repo-outside-workspace`). The inside has no other machine check.
