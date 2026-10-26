---
id: Rule_35
aka: 02-35
name: one-home
version: 11
kind: judgment
code: 01_Harness
---
# Rule_Gate_35_OneHome — One thing, one home

## What
Each thing exists once: one copy of a piece of content, one name for a concept, one screen for a function, one named query for a
calculation. Everything else points to it.

## When
- Adding anything: a file, a name, a screen, a query, a section of text.
- Seeing the same thing in two places.

## Do
1. Look for what exists first; reuse it. Nothing fits ⇒ add one copy in the right home. A duplicate found ⇒ propose removing it.
2. Names: one concept, one name, across code, data, docs and deliverables. Business names map to identifiers in the repo's own
   place for them (the constitution frame `Cons_Gate_12_SourceOfTruth`). Renaming ⇒ rename code and stored data in one pass, then
   search for the old name.
3. A key unique only inside one unit (a document number each store numbers on its own) is not a key of the whole system:
   joining on it alone multiplies rows across units. Add the unit to the key, or name the combined key.
4. Names given by another system (its tables, columns, source files) stay as they are; this law covers what the repo names: its
   measures, the columns of its deliverables, case names, slot names.
5. Content: each piece lives in one file of the right role; other places link to it with its number, never copy it.
6. Screens: one function, one screen (or report page) plus filters. A filter only chooses rows, never changes the calculation;
   a new way of calculating ⇒ its own screen.
7. Queries (SQL · DAX · M): each has a name, sits in the repo's query set (a structure slot) and is called by name, never written
   inline. A repo with old inline queries only lowers their count.

## Example
- Situation: a reconciliation app has an "Invoice details" screen; a view of invoices by hour is needed.
- ✗ Wrong: draw a new table with its own query; weeks later the two tables count "unsigned invoices" differently for the same
  store and day.
- ✓ Right: reuse the table and add an hour filter; the calculation stays, the query is called by name from the query set.

## Check
- A hook blocks a new inline SQL query when the repo declares a query set; the other points are judgment.

## Links · Liên kết
- Related · Liên quan: `Cons_Gate_12_SourceOfTruth` — where the repo names its business terms · nơi repo định nghĩa tên nghiệp vụ
- Related · Liên quan: `Rule_Gate_85_ProposeChecked` — searching before adding a part · dò trước khi thêm phần
- Implements · Thi hành: `Skill_Dev_AssetsPull` — one source for shared logos, icons and colours, copied into each repo · một nguồn cho logo, icon, màu dùng chung, chép vào từng repo
