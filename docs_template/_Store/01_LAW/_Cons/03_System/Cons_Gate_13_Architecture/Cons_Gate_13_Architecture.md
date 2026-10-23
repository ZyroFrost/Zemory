---
id: Cons_13
name: architecture
version: 4
kind: content
code: 03_System
frame: true
---
# Cons_Gate_13_Architecture — Architecture

## What
Every repo states in the `Cons.md` of this frame the layers of its product, the calls allowed between them, and the boundaries no
call may cross.

## When
- The product has running code, and a layer is added or a new call between layers is about to be written.

## Do
1. Fill the two sections of `Cons.md`: the layers · not to be crossed.
2. The product has no running code ⇒ `status: n/a` with the reason.

## Example
- Situation: a web app with a UI, a server and a database fills the `Cons.md` of this frame.
- ✗ Wrong: no boundary is declared; a new screen sends a query straight from the UI to the database "to be quick".
- ✓ Right: "Layers: UI → server → database. Not to be crossed: the UI never sends a raw query; it sends only a query name and its
  parameters."

## Check
- `conform` reds when `Cons.md` is missing, unwritten, or a template mark `<…>` is left.

## Links · Liên kết
- Implements · Thi hành: `Skill_Dev_AppDesign` — how the layers of an app are built · cách dựng các lớp của app
- Related · Liên quan: `Rule_Gate_35_OneHome` — queries are called by name · truy vấn gọi theo tên
