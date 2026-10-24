---
id: Slot_161
name: memories
version: 1
path: Memories/<Year>/<Event>/
scope: layout
---
# Memories_161_Memories memories — the owner's own photos and videos

## Role

`<data root>\Memories\` holds the photos and videos the owner (or the owner's family) took: trips, family events, everyday life.
Branch ① of `Struc_Disk_Data`: these are originals and cannot be fetched again. Images made by others (wallpapers, downloaded
pictures) are not memories: they go to `Media\Image\` (Media_162).

## Inside

```
Memories\
└── <Year>\
    ├── <YYYY-MM-DD Event>\      one event: photos and videos together
    └── <YYYY-MM>\               items of that month that belong to no event
```

Real example:

```
Memories\2025\
├── 2025-04-30 Beach Trip\      IMG_0012.jpg · IMG_0013.heic · VID_0014.mp4
├── 2025-09-02 Family Dinner\   …
└── 2025-07\                    loose photos of July
```

## Rules

- Group by time and event, NOT by file type: the photos and videos of one event sit in the same folder. No `Photos\` and
  `Videos\` split.
- An event folder starts with its first day as `YYYY-MM-DD`, then a short name; an event spanning days keeps its first day.
- Keep the camera's file names; do not rename the files.
- No inbox folder: new items from a phone go straight to their year and month, or to an event folder.
- No loose file at the `Memories\` level or at the year level.

## Naming

Year `2025`; month `2025-07`; event `2025-04-30 Beach Trip` (a space between the date and the name is allowed here, so the
name reads like a title).

## Sync

Not in git. Originals: keep at least one backup copy on another storage place (a second drive or a cloud backup).

## Check

`zemory conform --layout <data root>` accepts `Memories\` as a top-level folder. The year and event naming has no machine check
yet; the owner keeps it.
