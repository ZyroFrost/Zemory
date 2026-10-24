---
id: Slot_161
name: memories
version: 2
path: Memories/<Year>/<Event>/
scope: layout
---
# Memories_161_Memories memories — photos and videos of people

## Role

`<data root>\Memories\` is step 12 of the drive's question chain (`Struc_Disk_Data`): photos and videos of PEOPLE taken with the
owner's or the family's camera (a phone counts) — trips, family events, everyday life. These are originals and cannot be fetched
again. In the order of the chain, earlier steps win: a screen capture of a game is not a memory ⇒ `Game\` (step 8); pictures
gathered for the owner's profiles ⇒ `Documents\Profile\Personal\Avatar\` (step 11). The fact that tells a memory from a collected
picture is the file itself: a camera's EXIF (maker, model, time taken).

## Inside

```
Memories\
└── <Year>\
    ├── <YYYY-MM-DD Event>\      one event: photos and videos together
    └── <YYYY-MM>\               items of that month that belong to no event
```

Real example: `Memories\2025\2025-04-30 Beach Trip\` holding `IMG_0012.jpg` · `VID_0014.mp4`.

## Rules

- Group by time and event, NOT by file type: no `Photos\` and `Videos\` split.
- An event folder starts with its first day as `YYYY-MM-DD`, then a short name.
- Keep the camera's file names.
- No inbox: unsorted items wait in `Downloads\`.
- No loose file at the `Memories\` level or at a year level.

## Sync

Not in git. Originals: keep at least one backup copy on another storage place.

## Check

`zemory conform --layout <data root>` accepts `Memories\` as a top-level folder. The year and event naming has no machine check yet.
