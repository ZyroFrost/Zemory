---
id: Cons_16
name: dependencies
version: 4
kind: content
code: 03_System
frame: true
---
# Cons_Gate_16_Dependencies — Dependencies and environment

## What
Every repo states in the `Cons.md` of this frame the platforms or vendors it must use, the parts it has no source code for, the
shared machines it runs on and their limits, and any old system still running beside it and how the two relate.

## When
- A platform, vendor or closed component is added or replaced.
- The product runs on a shared machine.
- A new system replaces an old one that keeps running for a while.

## Do
1. Fill the four sections of `Cons.md`: required · no source code · shared environment · old system.
2. No real dependency ⇒ `status: n/a` with the reason.

## Example
- Situation: a new data warehouse that replaces an old reporting system fills the `Cons.md` of this frame.
- ✗ Wrong: the relation with the old system is not declared; the agent lets the new system read numbers from the old one "to save a
  reload", the two become tied and the old one can never be switched off.
- ✓ Right: "Old system: kept as a backup until the new one has run well for a full year; the new system never reads from the old,
  the old one is only used to compare. Shared server: measure free space before each large load."

## Check
- `conform` reds when `Cons.md` is missing, unwritten, or a template mark `<…>` is left.

## Links · Liên kết
- Related · Liên quan: `Cons_Gate_12_SourceOfTruth` — the old system is not a source · hệ cũ không phải nguồn
