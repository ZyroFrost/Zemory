---
id: Struc_Disk_Data
name: disk-data
version: 5
scope: disk
---
# Struc_Disk_Data

## Role

The frame of the owner's data: ONE folder tree that holds everything a person makes, collects, installs and keeps. On Windows
the tree starts at the root of the data drive (`D:\`); on Linux at one data folder (`~/data`). The system drive (`C:\`) does not
use this frame and holds nothing of the owner's except what the operating system forces there (see "The system drive").

This frame is the default HS offers to every set, not a mandate. An owner may rename, drop or add folders, split the tree over
any number of drives, or replace the frame outright; the check then reports against the owner's own HS. Whatever the owner
changes, the two laws below still hold — they are what makes a structure a structure.

## Law 1 — one thing, one place

Every item has exactly ONE place in the tree. A structure where an item fits two places, or none, is wrong, and the fix is to
change the QUESTIONS of the structure, never to force the item.

- Each level of the tree asks exactly one sorting question; its sub-folders are the answers.
- The answers exclude each other and cover everything: every item gets exactly one answer.
- A question is answered by a FACT that can be checked, never by an intention. Facts: "has a commit of mine" · "has a camera's
  EXIF" · "a folder `Study\X` exists" · "a client ordered it" · "the original still exists elsewhere". Not facts: "made to learn
  or to use", "kept for fun".
- When several facts are true, they are taken IN ORDER and the first true one wins. The order is written once and every slot it
  touches repeats the same order — no slot keeps an exception the other side does not know.
- An item that changes state has a written move with its tool: still learning → finished ⇒ `Library\`; a study project becomes a
  product ⇒ `zemory project move` to `Apps\`; an original retired ⇒ `Archive\`.

## Law 2 — place by nature, point by purpose

An item is placed by WHAT IT IS, whatever it is used for: code ⇒ `Workspace\`, a program ⇒ `Software\`, learning material ⇒
`Study\`. A place that needs it for its purpose holds a shortcut or a link, not the item. Code of others is always in
`Workspace\External\` even when it was cloned to learn from; a program that serves learning is still in `Software\`; a game tool
is a program, in `Software\Game\`.

A purpose decides the place ONLY where the order below says so explicitly: game items (step 8) and the owner's avatar collection
(step 11).

## The drive level — one question chain, the first true answer wins

Ask the questions in this order; the item goes to the first one that is true.

| step | the fact | goes to |
|---|---|---|
| 0 | not sorted yet: gathered from anywhere, waiting to be sorted | `Downloads\` (Downloads_168) |
| 1 | made by a recovery tool | `Recovery\` (Recovery_153) |
| 2 | a copy whose original still exists elsewhere | `Backup\` (Backup_165) |
| 3 | a project or an old version no longer used, kept as the only copy (finished learning goes to step 10, not here) | `Archive\` (Archive_166) |
| 4 | an AI model file | `_Models\` (Models_167) |
| 5 | settings or keys a PROGRAM or an AGENT reads by itself | `_ConfigVault\<tool>\` (ConfigVault_151) |
| 6 | a program — installer, installed copy, its own data — games, launchers and game tools included, and a program's output buffer | `Software\` (Software_147) |
| 7 | code or a repo, or work done for an organisation | `Workspace\` (Workspace_143) |
| 8 | a game save, a screen capture or clip of a game, a collected game clip, a game guide | `Game\` (Game_164) |
| 9 | material being learned now: lectures, a course downloaded to study, notes | `Study\` (Study_160) |
| 10 | knowledge kept to look up after learning it | `Library\` (Library_163) |
| 11 | pictures gathered to use on the owner's own profiles (avatars) | `Documents\Profile\Personal\Avatar\` (Documents_152) |
| 12 | photos or videos of people taken with the owner's or the family's camera | `Memories\` (Memories_161) |
| 13 | papers and records a PERSON reads | `Documents\` (Documents_152) |
| 14 | everything else: entertainment collected | `Media\` (Media_162) |

Worked examples:

| item | first true step | place |
|---|---|---|
| a course video downloaded to study | 9 | `Study\Self\<Field>\` |
| the same course after finishing, kept to look up | 10 | `Library\<Field>\` |
| a game's save folder | 8 | `Game\Saves\<Game>\` |
| a mod manager | 6 | `Software\Game\<Tool>\` |
| a screen recorder's capture folder on a fast SSD | 6 (its output buffer) | `Software\Screen_Record\<App>\Data\` — moved home once sorted |
| a clip of a game session, sorted | 8 | `Game\Media\<Game>\` |
| a library cloned from the web to learn from | 7 | `Workspace\External\<repo>\` (Study links to it) |
| the password list of the owner's web accounts | 13 | `Documents\Profile\Personal\Secret\` |
| an SSH key | 5 | `_ConfigVault\ssh\` |
| a contract with the owner's employer | 13 | `Documents\Profile\Company\<Org>\` |
| design files made for a past employer | 7 | `Workspace\Company\<Org>\<work folder>\` |

## The tree

The four branches below are a way to LOOK at the tree, not questions to sort by: "made · collected · installed · kept" cannot
place a game save or a downloaded course. Sorting always uses the chain above.

```
<data root>\
├── Downloads\        not sorted yet — the raw layer everything passes through (Downloads_168)
├── _ConfigVault\     shared store of the machine: settings and keys programs read (ConfigVault_151)
├── _Models\          shared store of the machine: AI model files (Models_167)
│  ① made by the owner
├── Workspace\        code, repos, work for organisations (Workspace_143) → Struc_Region_Workspace
├── Study\            material being learned (Study_160)
├── Memories\         photos and videos of people (Memories_161)
├── Documents\        papers a person reads: Profile\Personal · Profile\Company\<Org> · Family (Documents_152)
│  ② collected
├── Game\             saves, captures and clips, guides — never programs (Game_164)
├── Library\          knowledge kept to look up (Library_163)
├── Media\            entertainment collected (Media_162)
│  ③ installed
├── Software\<Group>\[<Vendor>\]<App>\{Setup,App,Data}   every program, games included (Software_147–150)
│  ④ kept
├── Backup\  Archive\  Recovery\                         (Backup_165 · Archive_166 · Recovery_153)
```

A top-level folder starting with `_` is a shared store of the whole machine (many programs and repos point into it, the owner
never works inside it); there are two, `_ConfigVault\` and `_Models\`.

## One logical tree, many storage places — suggested, not required

The tree is ONE logical tree, whatever number of drives a machine has. Each block of data lives for real in exactly one storage
place; every other place that needs it holds only a link point. An owner with one drive needs none of this, and may link any
folder to any drive.

Five laws, when the tree is split over several places:
1. Each folder is exactly one of three kinds: real on this place · real on another place (a link point here) · split (its
   children are real in different places).
2. Never link a block when some child of it lives somewhere else; split that block and link each child.
3. A split folder holds no loose file; only a `_README.md` at its root, one copy in each place, saying what lives where.
4. A tool that scans the tree walks every storage place but skips every link point, so each file is seen once.
5. Global Memory resolves a path to its real place before it writes.

| storage place | link |
|---|---|
| internal drive | a junction on Windows (`mklink /J`), a symlink on Linux; no bind mount |
| external drive | a fixed drive letter, or the drive mounted on a folder |
| NAS | a symlink to the network path (`mklink /D`); a junction cannot point at a network share |
| cloud drive | mounted at one fixed point; a live database is NEVER on the cloud side |

Example — a main data drive `D:` and a fast SSD `H:` holding the models, the game saves and WSL's virtual disk:

```
D:\                                        H:\
├── _Models\  ──────── junction ─────────► ├── _Models\         (real here)
├── Game\  ─────────── junction ─────────► ├── Game\            (real here)
├── Software\  (split)                     └── Software\  (split)
│   ├── _README.md                             ├── _README.md
│   ├── Dev\ …          (real on D:)           └── System\Microsoft\WSL\  (split)
│   └── System\Microsoft\WSL\  (split)             ├── _README.md
│       ├── _README.md                             └── Data\        (real here: Ubuntu\ext4.vhdx)
│       ├── Setup\  App\  (real on D:)
│       └── Data\  ──── junction ──────────► H:\Software\System\Microsoft\WSL\Data\
└── Workspace\ …        (real on D:)
```

Each split folder carries a `_README.md` on both drives (law 3); the check reads it as the sign of a split program and does not
ask `H:\…\WSL\` for its `Setup\` and `App\`. Usual drive roles: the main data drive holds the whole tree · a second data drive
holds blocks moved off it (large media, archive) · a fast SSD holds what needs speed (games, models, virtual disks) and is backed
up elsewhere · the system drive and cloud drives are not part of the tree.

## The system drive

`C:\` holds the operating system and only what a program forces there: `C:\Program Files\WSL` · `C:\Program Files\Docker` (the
program folder in `Software\` still keeps `Setup\` and `Data\`) · `%USERPROFILE%\.wslconfig` · tool homes (`.claude` · `.codex` ·
`.docker` · `.ssh` · `.cache` · `.lmstudio` · `%APPDATA%\Code`) · `%USERPROFILE%\.zemory\location.json`. `HOME` stays the
operating system's default; it is never pointed at a folder of the data drive. A tool home that grows large is moved by the tool's
own setting or by a junction; keys and settings go to `_ConfigVault\<tool>\` (ConfigVault_151, which also has the steps for undoing
a `HOME` set to the data drive).

## Building or changing a structure — the procedure

Whoever adds a slot, changes a slot or builds a new tree does these steps, in order:
1. Write the ONE sorting question of the level, and its answers (the sub-folders).
2. Check the answers exclude each other and cover everything.
3. Make each answer a checkable fact; rewrite any answer that is an intention.
4. Where several facts can be true at once, write their order; copy the same order into every slot it touches.
5. Write the move for each item that changes state, naming the tool that does it.
6. Try the structure on the REAL items of every drive before writing it down: list each item and the place it gets. An item with
   0 or 2+ places ⇒ change the questions, not the item.
7. Write into each slot its question and a "not here ⇒ goes to" list; whatever a machine can check goes into `zemory conform`.

## Rules

- The data root holds no loose file. Windows system folders (`System Volume Information`, `$RECYCLE.BIN`) are left alone.
- `_` at the root marks only the two shared stores.
- `Downloads\` is the only place for unsorted items; no other folder keeps an inbox.
- Measure the drive's free space before every large write (installing, building an image, copying data) and after it.

## Check

`zemory conform --layout <data root>` reds: a loose file at the root (`loose-file`) · a top-level folder with no slot
(`unknown-folder`) · a repo outside `Workspace\` (`repo-outside-workspace`) · a group in `Software\` outside Software_148 or a part
in `Game\` outside Game_164 (`unknown-value`) · a program without `Setup\`, `App\` or `Data\` (`program-incomplete`) · a study
project with no matching `Study\` folder (`study-unmatched`). It goes on into `Workspace\` and each organisation. Law 1's question
chain and the five laws of a split tree are judged by the owner where no check exists.
