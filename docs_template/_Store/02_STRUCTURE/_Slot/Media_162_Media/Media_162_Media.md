---
id: Slot_162
name: media
version: 2
path: Media/<MediaKind>/
values: [Video, Music, Image, Comic]
scope: layout
---
# Media_162_Media media — entertainment collected

## Role

`<data root>\Media\` is the LAST step (14) of the drive's question chain (`Struc_Disk_Data`): entertainment made by others and kept
to watch, listen to or read. It gets an item only when no earlier step is true. In the order of the chain: a game capture or a
collected game clip ⇒ `Game\` (step 8) · pictures gathered for the owner's profiles ⇒ `Documents\Profile\Personal\Avatar\` (step 11)
· photos and videos of people taken with the owner's or the family's camera ⇒ `Memories\` (step 12).

## Inside — four kinds, a fixed list

| folder | holds | real example |
|---|---|---|
| `Video\Movie\` | films and series | `Media\Video\Movie\Interstellar (2014)\` |
| `Video\Clip\` | short videos: talks, music videos, saved clips | `Media\Video\Clip\Conference Talks\` |
| `Music\` | music, by artist or album | `Media\Music\<Artist>\<Album>\` |
| `Image\` | collected images: wallpapers, reference pictures, artwork | `Media\Image\Wallpapers\` |
| `Comic\` | comics and manga, one folder per series | `Media\Comic\<Series>\` |

## Rules

- Only `Video` · `Music` · `Image` · `Comic` at the first level; inside `Video\`, only `Movie\` and `Clip\`.
- No loose file at the `Media\` level or at a kind level; one folder per title, series or artist.
- Media is large: the first block to move to a second data drive, linked back per the five laws of `Struc_Disk_Data`.

## Naming

A title as it is published, the year in brackets for films: `Interstellar (2014)`.

## Sync

Not in git, not synced: it can be fetched again.

## Check

`zemory conform --layout <data root>` accepts `Media\` as a top-level folder. The four kinds have no machine check yet.
