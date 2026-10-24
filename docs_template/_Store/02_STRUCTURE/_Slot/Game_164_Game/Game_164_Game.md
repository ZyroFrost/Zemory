---
id: Slot_164
name: game
version: 1
path: Game/<GamePart>/
values: [Installed, Saves, Media, Tools]
scope: layout
---
# Game_164_Game game — installed games, saves, media and tools

## Role

`<data root>\Game\` holds everything of the owner's games in one block, so the block can move to a fast SSD as a whole and be
linked back (the five laws of `Struc_Disk_Data`). Branch ② of `Struc_Disk_Data`. A game launcher itself (Steam, Epic) is a
program: it lives in `Software\Utility\<Launcher>\` (Software_148); only its game library goes here.

## Inside — four parts, a fixed list

| folder | holds | real example |
|---|---|---|
| `Installed\` | installed games, and each launcher's library folder | `Game\Installed\SteamLibrary\` · `Game\Installed\Hollow Knight\` |
| `Saves\<Game>\` | save files copied out of a game, or the save folder a game lets the owner choose | `Game\Saves\Hollow Knight\` |
| `Media\<Game>\` | screenshots and clips of play | `Game\Media\Hollow Knight\` |
| `Tools\<Tool>\` | mods, mod managers, trainers, emulators | `Game\Tools\ModOrganizer\` |

## Steps — installing a game

1. A launcher game: in the launcher, add a library folder at `Game\Installed\<Launcher>Library\` and install there.
2. A game without a launcher: install into `Game\Installed\<Game>\`.
3. If the game lets the owner choose where saves go, choose `Game\Saves\<Game>\`; if not, copy its saves there for backup.

## Rules

- Only the four parts above at the first level, written as in the table.
- No loose file at the `Game\` level or at a part level.
- Saves are the only part that cannot be fetched again: back up `Game\Saves\` when `Game\` lives only on a replaceable SSD.

## Naming

A game's name as it is published: `Hollow Knight`. A launcher library `SteamLibrary` · `EpicLibrary`. Parts exactly
`Installed` · `Saves` · `Media` · `Tools`.

## Sync

Not in git, not synced. `Saves\` is backed up.

## Check

`zemory conform --layout <data root>` accepts `Game\` as a top-level folder. The four parts have no machine check yet; the owner
keeps them.
