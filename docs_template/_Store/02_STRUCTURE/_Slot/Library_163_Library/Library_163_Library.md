---
id: Slot_163
name: library
version: 1
path: Library/<Field>/
scope: layout
---
# Library_163_Library library — knowledge kept for reference

## Role

`<data root>\Library\` holds knowledge the owner keeps to look things up, not to learn now: books, papers, documentation, cheat
sheets, finished courses. Branch ② of `Struc_Disk_Data`. The line with `Study\` (Study_160): still learning it ⇒ `Study\`; only
looking things up in it ⇒ `Library\`.

## Inside

One folder per field; inside a field, one folder per title or source.

| example | holds |
|---|---|
| `Library\DataEngineering\Designing Data-Intensive Applications\` | a book (PDF, EPUB) |
| `Library\Statistics\Intro to Statistics\` | a finished course moved from `Study\` |
| `Library\Excel\CheatSheets\` | reference sheets |

## Rules

- Only material made by others, or the owner's finished course material kept to look up. Work in progress belongs to `Study\` or
  `Workspace\`.
- No loose file at the `Library\` level; every item sits in a field.
- A field name matches the field name used in `Study\Self\`, so a course moves across without renaming.

## Naming

Field PascalCase, no spaces: `DataEngineering` · `Statistics`. A title as it is published.

## Sync

Not in git, not synced: it can be fetched again.

## Check

`zemory conform --layout <data root>` accepts `Library\` as a top-level folder. The inside has no machine check; the owner keeps it.
