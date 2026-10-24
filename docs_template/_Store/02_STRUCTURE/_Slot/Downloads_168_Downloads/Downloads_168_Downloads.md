---
id: Slot_168
name: downloads
version: 1
path: Downloads/
scope: layout
---
# Downloads_168_Downloads downloads — the raw layer: not sorted yet

## Role

`<data root>\Downloads\` holds items gathered from anywhere that are NOT SORTED yet: the browser's downloads, files copied off a
phone or a USB drive, a dump from an old machine. It is step 0 of the drive's question chain (`Struc_Disk_Data`): an item is here
only until someone answers the chain for it. It is the raw layer the whole tree is fed from, not an inbox of one slot.

## Rules

- Every other folder of the tree keeps no inbox: an item that is not sorted is in `Downloads\`, nowhere else.
- Sorting an item = walking the question chain of `Struc_Disk_Data` and moving it to the first true answer.
- Inside, any layout the owner likes (by source, by date); nothing here is checked.
- Point the browser's download folder here (`D:\Downloads\`), not to `%USERPROFILE%\Downloads` on the system drive.

## Not here ⇒ goes to

Everything that has been sorted: its place in the chain. A copy whose original exists ⇒ `Backup\`; a retired original ⇒ `Archive\`.

## Sync

Not in git, not synced.

## Check

`zemory conform --layout <data root>` accepts `Downloads\` as a top-level folder and reds a repo inside it
(`repo-outside-workspace`). The inside is not checked.
