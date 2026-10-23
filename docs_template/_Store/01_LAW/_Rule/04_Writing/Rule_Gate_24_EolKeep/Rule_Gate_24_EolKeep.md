---
id: Rule_24
aka: 02-24
name: eol-keep
version: 11
kind: content
code: 04_Writing
---
# Rule_Gate_24_EolKeep — Keep the line endings when editing a file

## What
An edited file keeps its line endings (CRLF stays CRLF). Edits are made piece by piece, never by reading the whole file and
writing it all back.

## When
- Editing a file that exists.
- A machine builds a file from other files.
- A file's line endings are found mixed or off.

## Do
1. The repo's line endings are fixed in `.gitattributes` (the root slot of `02_STRUCTURE`).
2. Not fixed there ⇒ an edited file keeps its own line endings, and the edit is made piece by piece.
3. Never read the whole file and write it all back: that changes the whole file (every line in the diff, blame lost) and drops what
   another session just inserted.
4. A file built from another takes the line endings of its source.
5. Endings already off ⇒ convert once, in a separate labelled commit, proved by an empty `git diff --ignore-cr-at-eol`; never
   convert back.

## Example
- Situation: two sessions edit the same standard file that uses Windows line endings.
- ✗ Wrong: the second session reads the whole file from an old copy and writes over it; the diff shows the whole file changed and
  three lines the other session just added are gone.
- ✓ Right: edit only the piece that needs it, keeping the existing line endings.

## Check
- The guard blocks a write that turns CRLF into LF.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — overwriting is destroying · ghi đè là phá dữ liệu
