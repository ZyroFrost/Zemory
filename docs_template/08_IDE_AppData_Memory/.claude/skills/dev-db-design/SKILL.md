---
id: Skill_Dev_DbDesign
name: dev-db-design
version: 7
type: process
description: Design or change tables in a database or data warehouse - one fact in one table, dimensional modelling, and a review of the whole schema before any new table or column. Use whenever a table, column, view or key is about to be created or changed. Vietnamese triggers - "tạo bảng", "thêm cột", "thiết kế bảng", "sửa schema", "mô hình dữ liệu", "dim", "fact".
from: _Store/03_SKILLS/Skill_Dev_DbDesign @v7 #61fa9fd82ae9
---

# dev-db-design — designing tables and columns

> Table names, column names, which source writes where belong to each repo (constitution `01_LAW/_Cons`: the architecture frame, the write boundary,
> the source of truth). This skill keeps the shared way of working.

## 1. Before creating a new table or column

- Survey the whole system: is that information already in some table (look up the table catalogue · `INFORMATION_SCHEMA` · the repo's data dictionary).
  Already there ⇒ reuse it, never make a second copy (`Rule_Gate_35_OneHome`).
- Look up the repo's laws and constitution: naming, the write boundary, the path for structure changes.
- Propose it with the reason and where it is used; create it only once approved. Changing a table that is in use ⇒ list where it is used first (`Rule_Keys_80_SharedChangeImpact`).

## 2. Principles of dimensional modelling

- One piece of information lives in exactly one table. A dimension table (dim) keeps the attributes of one entity and is the only home of those
  attributes; a fact table keeps only the keys to the dimensions and the measures.
- Each fact table declares its grain (what one row is). Never mix two grains in one table.
- A dimension shared by several fact tables is the same table, with the same key.
- Surrogate keys for dimension tables; the business key is kept as a separate column.
- Additive measures in the fact table; ratios and averages are computed at query time, never stored.
- Attributes that change over time: choose how history is kept (overwrite, or add a row with valid-from–to) and write it in the dictionary.

- Names in the shared warehouse: tables `Dim_*` · `Fact_*` · `Bridge_*` (schema `dbo`), operational objects `_<Name>`, clean English columns.
  The warehouse is shared by every department: a table added for one department still follows this standard exactly.

## 3. Changing structure

- Structure changes only through the path the repo declared (the model folder + scripts), never by hand on the server.
- Statements that change structure, change permissions or fix data run on the requester's order.
- After the change: count the rows again and reconcile with the source, in numbers (`Rule_Gate_01_DoneMeansRun`).

## Implements · Thi hành luật
- `Cons_Gate_11_WriteBoundary` — how structure changes are written and run · cách viết và chạy thay đổi cấu trúc
- `Cons_Gate_14_Access` — how a column of personal data is encrypted and its key rotated · cách mã hoá cột dữ liệu cá nhân và xoay khoá
