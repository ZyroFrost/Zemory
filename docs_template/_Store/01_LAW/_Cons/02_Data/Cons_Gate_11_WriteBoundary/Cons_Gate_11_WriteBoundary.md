---
id: Cons_11
name: write-boundary
version: 4
kind: content
code: 02_Data
frame: true
---
# Cons_Gate_11_WriteBoundary — The write boundary

## What
Every repo states in the `Cons.md` of this frame where the product may write outside the repo, the one way structure changes
(tables · columns · rights · system settings) go, and which writes run only on the requester's command in the session.

## When
- The product starts writing somewhere new outside the repo.
- The agent is about to change a structure or run a write against a shared system.

## Do
1. Fill the three sections of `Cons.md`: may write to · structure changes only through · runs only on command.
2. Writes nothing outside the repo ⇒ `status: n/a` with the reason.

## Example
- Situation: a repo that manages a database shared by several apps fills the `Cons.md` of this frame.
- ✗ Wrong: no way for structure changes is declared; each app creates its own tables in the shared database, and months later
  nobody knows whose table is whose.
- ✓ Right: "May write to: only this repo's database. Structure changes only through the model folder, run by script after a clean
  syntax check; apps never create or alter tables. Only on command: every structure change, rights change and data fix."

## Check
- `conform` reds when `Cons.md` is missing, unwritten, or a template mark `<…>` is left.

## Links · Liên kết
- Implements · Thi hành: `Skill_Dev_DbDesign` — how structure changes are written and run · cách viết và chạy thay đổi cấu trúc
- Related · Liên quan: `Rule_Gate_44_RepoScope` — SQL that changes a server is leaving the project · SQL đổi máy chủ là ra ngoài dự án
