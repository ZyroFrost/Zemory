---
id: Cons_15
name: data-lifecycle
version: 4
kind: content
code: 02_Data
frame: true
---
# Cons_Gate_15_DataLifecycle — The life of data

## What
Every repo states in the `Cons.md` of this frame which data may be deleted, which is only archived and never deleted, which tables
are append-only, what may be cached and when it expires, and how long each kind of data is kept.

## When
- The product keeps data.
- The agent is about to delete, clean up or cache data.

## Do
1. Fill the four sections of `Cons.md`: never deleted · append-only · cache · how long kept.
2. Keeps no data ⇒ `status: n/a` with the reason.

## Example
- Situation: a data warehouse loaded from several source systems fills the `Cons.md` of this frame.
- ✗ Wrong: nothing about deleting is declared; the agent clears an old table "nobody uses" with a delete and three years of history
  are gone.
- ✓ Right: "Data is never deleted, only archived. Log tables are append-only. Only raw data of closed periods is cached; interpreted
  results are never cached."

## Check
- `conform` reds when `Cons.md` is missing, unwritten, or a template mark `<…>` is left.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — deleting needs approval · xoá phải được duyệt
- Related · Liên quan: `Cons_Gate_14_Access` — how long personal data is kept · dữ liệu cá nhân giữ bao lâu
