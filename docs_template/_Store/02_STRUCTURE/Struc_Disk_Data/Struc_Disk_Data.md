---
id: Struc_Disk_Data
name: disk-data
version: 4
scope: disk
---
# Struc_Disk_Data

## Role

The frame of the owner's data: ONE folder tree that holds everything a person makes, collects, installs and keeps. On Windows
the tree starts at the root of the data drive (`D:\`); on Linux at one data folder (`~/data`). The system drive (`C:\`) does not
use this frame and holds nothing of the owner's except what the operating system forces there (see "The system drive" below).

This frame is the default HS offers to every set, not a mandate. An owner may rename, drop or add top-level folders, split the
tree over any number of drives, or replace the frame outright; the check then reports against the owner's own HS.

A new machine is laid out in this order: lay out this frame ⇒ inside `Workspace\` lay out `Struc_Region_Workspace` ⇒ inside
each `Workspace\Company\<Org>\` lay out `Struc_Region_Company` ⇒ last, each repo gets the set of its role.

## The tree — four branches and two shared stores

Every top-level folder without `_` belongs to exactly one of four branches. The branch says where a new thing goes: ask first
"did I make it, did I collect it, did I install it, or is it a copy kept for safety?"

A top-level folder WITH `_` is a shared store of the whole machine: many programs and repos point into it, the owner never puts
work of their own there, and each has its own rule on sync. It is the same meaning `_` has at the organisation level
(`_Hub`, `_DB_Warehouse`: one place that many members use). There are two: `_ConfigVault\` and `_Models\`.

```
<data root>\
│  SHARED STORES OF THE MACHINE — many programs and repos point into them
├── _ConfigVault\<tool>\  every tool's settings and keys: configs\ · credentials\ · cache\ (ConfigVault_151)
├── _Models\<engine>\     the one model store every AI app points to (Models_167)
│
│  ① MADE BY THE OWNER — the originals; losing them cannot be undone
├── Workspace\        every repo, no repo anywhere else (Workspace_143) → Struc_Region_Workspace
├── Study\            what the owner is learning: school subjects, self-study fields (Study_160)
├── Memories\         the owner's own photos and videos, by year and event (Memories_161)
├── Documents\        personal papers: identity, contracts, CV, records (Documents_152)
│
│  ② COLLECTED — made by others, kept by the owner; can be fetched again, at a cost
├── Media\            films, clips, music, images, comics (Media_162)
├── Library\          knowledge kept for reference: books, papers, finished courses (Library_163)
├── Game\             installed games, their saves, their media, their tools (Game_164)
│
│  ③ INSTALLED AND RUN — the machine's programs
├── Software\         every program of the machine (Software_147)
│   ├── <Group>\      one of the fourteen groups of Software_148
│   │   └── [<Vendor>\]<App>\   one program, ALWAYS with Setup\ · App\ · Data\ (Software_149)
│   └── Drivers\<Device>\       driver packs, not programs (Software_150)
│
│  ④ KEPT FOR SAFETY OR RETIRED
├── Backup\           copies of data whose original lives elsewhere: phone, chat apps (Backup_165)
├── Archive\          retired items kept as the only copy: closed projects, old versions (Archive_166)
└── Recovery\         the machine's own recovery images (Recovery_153)
```

Which place, in doubt:

| the thing | goes to | why |
|---|---|---|
| a course the owner is taking now | `Study\Self\<Field>\` | still learning |
| the same course, finished and kept to look things up | `Library\<Field>\` | reference only |
| code written while learning, that runs | `Workspace\Personal\StudyProjects\...\<repo>\` | runs ⇒ Workspace |
| photos from a trip | `Memories\<year>\<YYYY-MM-DD Trip>\` | made by the owner |
| wallpapers downloaded from the web | `Media\Image\` | collected |
| a phone's contacts and app data, copied off the phone | `Backup\Phone\<device>\` | a copy; the phone holds the original |
| a repo closed for good | `Archive\Workspace\...\<repo>.zip` | retired, only copy |
| WSL's virtual disk | `Software\System\Microsoft\WSL\Data\<Distro>\` | data of a program |
| a language model file | `_Models\<engine>\` | shared by AI apps |
| an SSH key, a tool's token | `_ConfigVault\<tool>\credentials\` | shared, secret |

There is no `Runtime\` and no `Image\` at the top level: runtimes (WSL, Docker) are programs in `Software\`; images are
`Media\Image\` (collected) or `Memories\` (made by the owner).

## One logical tree, many storage places — suggested, not required

The tree above is ONE logical tree, whatever number of drives a machine has. Each block of data lives for real in exactly one
storage place (main data drive, a second data drive, a fast SSD, an external drive, a NAS); every other place that needs it holds
only a link point to it. Opened from any drive, the owner sees the same tree. This is the layout HS suggests; an owner with one
drive needs none of it, and an owner may link any folder to any drive.

Five laws, when the tree is split over several places:
1. Each folder is exactly one of three kinds: real on this place · real on another place (a link point here) · split (its
   children are real in different places).
2. Never link a block when some child of it lives somewhere else; split that block and link each child.
3. A split folder holds no loose file; only a `_README.md` at its root, one copy in each place, saying what lives where.
4. A tool that scans the tree walks every storage place but skips every link point, so each file is seen once.
5. Global Memory resolves a path to its real place before it writes.

The link for each kind of storage place:

| storage place | link |
|---|---|
| internal drive | a junction on Windows (`mklink /J`), a symlink on Linux; no bind mount |
| external drive | a fixed drive letter, or the drive mounted on a folder |
| NAS | a symlink to the network path (`mklink /D`); a junction cannot point at a network share |
| cloud drive | mounted at one fixed point; a live database is NEVER on the cloud side |

Known snags: a link point dies when its storage place is unplugged; some tools delete through a link point; a deep tree can hit
the Windows path-length limit.

Example — a main data drive `D:` and a fast SSD `H:` that holds the games, the models and WSL's virtual disk:

```
D:\                                        H:\
├── _Models\  ──────── junction ─────────► ├── _Models\         (real here)
├── Game\  ─────────── junction ─────────► ├── Game\            (real here: Installed\ · Saves\ · Media\ · Tools\)
├── Software\  (split)                     └── Software\  (split)
│   ├── _README.md                             ├── _README.md
│   ├── Dev\ …          (real on D:)           └── System\Microsoft\WSL\  (split)
│   └── System\Microsoft\WSL\  (split)             ├── _README.md
│       ├── _README.md                             └── Data\        (real here: Ubuntu\ext4.vhdx)
│       ├── Setup\  App\  (real on D:)
│       └── Data\  ──── junction ──────────► H:\Software\System\Microsoft\WSL\Data\
└── Workspace\ …        (real on D:)
```

`_Models\` and `Game\` are whole blocks, so each is one junction. `Software\` is split (law 1): some of its children are real on
`D:`, one is real on `H:`. `WSL\` is split too, so only `Data\` is linked (law 2). Each split folder carries a `_README.md` on
both drives saying which child lives where (law 3); the check reads that file as the sign of a split program and does not ask
`H:\…\WSL\` for its `Setup\` and `App\`.

The roles a machine's drives usually take:
- main data drive — holds the whole tree; every block is real here unless it is moved out.
- second data drive — the same tree, holding the blocks moved off the main drive (large media, archive).
- fast SSD — blocks that need speed: games, models, virtual disks, training data. Treated as replaceable: what lives only there
  is backed up elsewhere.
- system drive `C:` — not part of the tree.
- cloud drive (Google Drive, OneDrive) — not part of the tree; a mount point for a backup copy at most.

## The system drive

`C:\` holds the operating system and only what a program forces there. Do not create the owner's folders on it. The usual
forced items:

| item | why it stays on C: |
|---|---|
| `C:\Program Files\WSL` · `C:\Program Files\Docker` | the installer gives no choice of place (Software_149 exception); the program folder in `Software\` still keeps `Setup\` and `Data\` |
| `%USERPROFILE%\.wslconfig` | WSL reads it from there only |
| tool homes: `%USERPROFILE%\.claude` · `.codex` · `.docker` · `.ssh` · `.cache` · `.lmstudio` · `%APPDATA%\Code` | the tool reads its home from there |
| `%USERPROFILE%\.zemory\location.json` | the one file zemory reads before it knows where anything else is; it points at the Global Memory folder |

`HOME` stays the operating system's default (`%USERPROFILE%`); it is never pointed at a folder of the data drive. A tool home
that grows large (a model cache, a package cache) may be moved: set the tool's own setting to a place in the tree
(`_Models\lmstudio\`), or replace the folder on `C:` with a junction to that place. Keys and settings the owner carries to a new
machine go to `_ConfigVault\<tool>\` (ConfigVault_151, which also has the steps for undoing a `HOME` set to the data drive).

## Rules

- The data root holds no loose file. Everything sits in one of the folders of the tree (Windows system folders such as
  `System Volume Information` and `$RECYCLE.BIN` are left alone).
- `_` at the root marks only the two shared stores; no other top-level folder starts with `_`.
- Repos live only in `Workspace\`. Programs live only in `Software\`. Tool settings and keys live only in `_ConfigVault\`. Model
  files live only in `_Models\`.
- EVERY program folder in `Software\<Group>\` (except `Drivers\` and `Fonts\`) holds `Setup\` · `App\` · `Data\` — the full rule,
  steps and exceptions are in `Software_149_Program`.
- A program's virtual disks and large data sit in that program's `Data\`, with a size cap. Measure the free space of the drive
  before every large write (installing a program, building an image, copying data) and after it.

## Steps — laying out a machine

1. Pick the main data drive; create the top-level folders that the owner has data for (no empty folders for branches with nothing
   in them).
2. Move each existing folder to its place using the table "Which place, in doubt"; reinstall programs into `Software\` per
   `Software_149_Program`.
3. Move tool settings and keys into `_ConfigVault\` and `HOME` back to its default in ONE pass (ConfigVault_151): changing
   `HOME` changes where many tools read at once.
4. If a block must live on another drive (speed, size), make it real there and link it back, following the five laws.
5. Run `zemory conform --layout <data root>` on each drive that holds a part of the tree, until it reports nothing.

## Check

`zemory conform --layout <data root>` reds: a loose file at the root (`loose-file`) · a top-level folder with no slot
(`unknown-folder`) · a repo outside `Workspace\` (`repo-outside-workspace`) · a group in `Software\` outside Software_148
(`unknown-value`) · a program without `Setup\`, `App\` or `Data\` (`program-incomplete`). It goes on into `Workspace\` and each
organisation. The five laws of a split tree have no machine check yet; the owner keeps them.
