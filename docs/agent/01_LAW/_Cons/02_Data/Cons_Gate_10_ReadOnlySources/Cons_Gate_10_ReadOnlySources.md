---
id: Cons_10
name: read-only-sources
version: 6
kind: content
code: 02_Data
frame: true
from: _Store/01_LAW/_Cons/02_Data/Cons_Gate_10_ReadOnlySources @v6 #7b679f5748ab
---
# Cons_Gate_10_ReadOnlySources — Outside sources are read-only

## What
Every repo lists in the `Cons.md` of this frame each outside system the product reads (database · API · shared folder · mailbox ·
service), how it may read it, and any write exception. Outside sources are read, never written, except where listed.

## When
- The product starts reading a new outside system, or changes how it reads one.
- The agent is about to write to an outside system: check the exceptions here first.

## Do
1. Fill the source table of `Cons.md`: name · kind · allowed way of reading. A database server is named in the `Server` column.
2. A write exception has an owner and a narrow scope: exactly one area, exactly one kind of action.
3. Reads no outside system ⇒ `status: n/a` with the reason.
4. A repo that reads many tables keeps a map for people at `docs/plan/01_source_map.md`: server · database · table or view · who
   loads it and how often · the last freshness measured · which other report or branch it still feeds. Each line carries a
   measured number or date, or says "not probed". The map is not merged with `sources/`: `sources/` is what the machine pulls
   (editing it changes the numbers), the map changes no run.

## Example
- Situation: an app that gathers documents from the company's shared drive fills the `Cons.md` of this frame.
- ✗ Wrong: write "read sources only" without naming which sources or with what rights; a month later the agent adds a feature that
  writes back to the shared drive because nothing forbids it.
- ✓ Right: "Shared drive: read only, with the application's rights. Mailbox: read only, with the signed-in person's rights. Write
  exception: exactly one folder for copies, owned by IT; create new files only, never edit or delete."

## Check
- `conform` reds when `Cons.md` is missing, unwritten, or a template mark `<…>` is left.
- The guard reads the `Server` column as the servers SQL may reach (`allowedSqlServers`).

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — original inputs are read-only · đầu vào gốc chỉ đọc
- Related · Liên quan: `Cons_Gate_11_WriteBoundary` — where the product may write · sản phẩm được ghi vào đâu
