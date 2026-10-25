---
id: Rule_81
name: follow-existing-pattern
version: 5
kind: judgment
code: 02_Work
from: _Store/01_LAW/_Rule/02_Work/Rule_Keys_81_FollowExistingPattern @v5 #723f81c07b2c
---
# Rule_Keys_81_FollowExistingPattern — Adding to something that exists: follow its pattern

## What
Adding to a file, table, folder or series that already exists, the agent copies the shape of the items already there: names,
order, format, way of writing. No new shape beside the old one.

## When
- Adding an item to a file, table, folder or series that already has items.

## Do
1. Read the existing items first.
2. Copy their shape exactly: naming, order, format, way of writing; then fill in the new content.
3. The old shape looks wrong ⇒ say so; do not change it on your own (`Rule_Keys_07_ScopeOnly`).

## Example
- Situation: the agent adds a new report case to a folder that already holds five cases.
- ✗ Wrong: name the folder and files its own way, with a spec built differently from the other five.
- ✓ Right: open an existing case, copy its naming, spec layout and mail template, then fill in the new content.

## Check
- Keyword reminder: a request to add an item to an existing series shows this law; the rest is judgment.

## Links · Liên kết
- Related · Liên quan: `Rule_Keys_07_ScopeOnly` — raise a problem, do not fix it out of scope · nêu vấn đề, không sửa ngoài phạm vi
