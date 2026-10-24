---
id: Slot_164
name: game
version: 2
path: Game/<GamePart>/
values: [Saves, Media, Guides]
scope: layout
---
# Game_164_Game game — what of the owner's games is not a program

## Role

`<data root>\Game\` is step 8 of the drive's question chain (`Struc_Disk_Data`): game saves, screen captures and clips of games,
collected game clips, game guides. Games themselves, launchers and game tools are programs ⇒ `Software\Game\` (step 6). Game items
are placed by purpose on purpose: a collected game clip is knowledge of playing, so it is here, not in `Media\`.

## Inside — three parts, a fixed list

| folder | holds | real example |
|---|---|---|
| `Saves\<Game>\` | save files, or the save folder a game lets the owner choose | `Game\Saves\Hollow Knight\` |
| `Media\<Game>\` | screen captures and clips of the owner's play, and game clips collected from others | `Game\Media\Hollow Knight\` |
| `Guides\` | knowledge of playing: guides, maps, build notes | `Game\Guides\Hollow Knight\` |

## Rules

- Only the three parts above. Installed games, launcher libraries, mod managers, emulators, trainers ⇒ `Software\Game\<…>\`.
- A screen recorder's capture folder that is still being sorted is that program's `Data\` (Software_149); a sorted game clip comes
  here.
- A video filmed of PEOPLE with a camera is a memory ⇒ `Memories\`, even when people are playing a game.
- Saves are originals that cannot be fetched again: back up `Game\Saves\` when `Game\` lives only on a replaceable SSD.
- No loose file at the `Game\` level or at a part level.

## Naming

A game's name as it is published: `Hollow Knight`. Parts exactly `Saves` · `Media` · `Guides`.

## Check

`zemory conform --layout <data root>` reds (`unknown-value`) any folder in `Game\` that is not one of the three parts.
