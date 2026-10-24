---
id: Slot_162
name: media
version: 1
path: Media/<MediaKind>/
values: [Video, Music, Image, Comic]
scope: layout
---
# Media_162_Media media — films, clips, music, images and comics made by others

## Role

`<data root>\Media\` holds media the owner collected: made by others, kept to watch, listen to or read. Branch ② of
`Struc_Disk_Data`: it can be fetched again, at a cost. The owner's own photos and videos are not media: they go to `Memories\`
(Memories_161). Media of a game (screenshots, clips of play) goes to `Game\Media\` (Game_164).

## Inside — four kinds, a fixed list

| folder | holds | real example |
|---|---|---|
| `Video\Movie\` | films and series | `Media\Video\Movie\Interstellar (2014)\` |
| `Video\Clip\` | short videos: talks, music videos, saved clips | `Media\Video\Clip\Conference Talks\` |
| `Music\` | music, by artist or album | `Media\Music\<Artist>\<Album>\` |
| `Image\` | collected images: wallpapers, reference pictures, artwork | `Media\Image\Wallpapers\` |
| `Comic\` | comics and manga, one folder per series | `Media\Comic\<Series>\` |

## Rules

- Only the four kinds `Video` · `Music` · `Image` · `Comic` at the first level; inside `Video\`, only `Movie\` and `Clip\`.
- No loose file at the `Media\` level or at a kind level; inside a kind, one folder per title, series or artist.
- Media is large: it is the first block to move to a second data drive, linked back per the five laws of `Struc_Disk_Data`.

## Naming

A title as it is published, with the year in brackets for films: `Interstellar (2014)`. Kind folders exactly as in the table.

## Sync

Not in git, not synced: it can be fetched again.

## Check

`zemory conform --layout <data root>` accepts `Media\` as a top-level folder. The four kinds have no machine check yet; the owner
keeps them.
