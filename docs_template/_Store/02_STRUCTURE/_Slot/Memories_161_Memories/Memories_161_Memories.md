---
id: Slot_161
name: memories
version: 4
path: Memories/<Topic>/[<Who>/][<YYYY-MM>_<Event>/]
scope: layout
---
# Memories_161_Memories memories — photos and videos of people

## Role

`<data root>\Memories\` is step 12 of the drive's question chain (`Struc_Disk_Data`): photos and videos of PEOPLE taken with the
owner's or the family's camera (a phone counts) — trips, family events, everyday life. These are originals and cannot be fetched
again. In the order of the chain, earlier steps win: a screen capture of a game is not a memory ⇒ `Game\` (step 8); pictures
gathered for the owner's profiles ⇒ `Documents\Profile\Avatar\` (step 11). The fact that tells a memory from a collected
picture is the file itself: a camera's EXIF (maker, model, time taken).

## Inside — the subject outside, the time inside

```
Memories\
├── Events\                     an event of the owner's own life, not tied to one circle of people
│   └── <YYYY-MM>_<Event>\      e.g. 2024-05_Concert — photos and videos together
├── Family\<Family>\            one family
├── Friends\<Group>\            one circle of friends (a class, a club, a team)
├── Me\[<Part>\]                the owner alone
├── Work\<Org>\                 colleagues and work events of one organisation
└── <Topic>\                    a subject the owner keeps many pictures of (food, a hobby, a place visited often)
```

- Level 1 is the SUBJECT — who or what the pictures are about. The topics above are the usual set; the owner may add a topic, and
  it is then written into this slot (one name per subject, the same on every machine).
- Level 2, where the subject has several (families, circles, organisations), is WHO: one folder per family, group or organisation.
- The time sits INSIDE, as the prefix of an event folder: `<YYYY-MM>_<Event>\` or `<YYYY-MM-DD>_<Event>\` when the day matters. A
  picture of no particular event stays straight in its subject or person folder.
- One event keeps its photos AND videos in one folder: a trip is both clips and pictures, so memories are never split by file type
  (that split belongs to `Media\`, Media_162).

Real example: `Memories\Friends\College\2023-07_Graduation\` holding `IMG_0012.jpg` · `VID_0014.mp4`.

## Rules

- AI-made items follow the same order as any item (`Struc_Disk_Data`, "Made by AI"); to keep them apart here, add the optional
  sub-folder `AI\` inside an event folder — an AI image is a memory only if it is of the owner's people and kept as one.
- Group by subject and event, NOT by file type: no `Photos\` and `Videos\` split.
- An event folder starts with its time (`YYYY-MM` or `YYYY-MM-DD`), an underscore, then a short name.
- Keep the camera's file names.
- No inbox: unsorted items wait in `Downloads\`; a sorting tool reads them from there.
- No loose file at the `Memories\` level.
- A folder exists only when it holds something (`Struc_Disk_Data` §Rules): no empty topic or person folder.

## Sync

Not in git. Originals: keep at least one backup copy on another storage place.

## Check

`zemory conform --layout <data root>` accepts `Memories\` as a top-level folder. The topic and event naming has no machine check yet.
