---
id: Skill_PBI_Classic
name: pbi-classic
version: 7
type: process
description: Build the CLASSIC copy of a Power BI report - keep the OLD design exactly, move only the model onto the warehouse: map tables to Dim_*/Fact_*, port measures, rebind visuals, then MEASURE how far the numbers match the old one. Use whenever an old dashboard moves onto the warehouse, the old report serves as the warehouse's test, or the question is what the warehouse still lacks. Not for a new design. Vietnamese triggers - "bản classic", "tái tạo dashboard cũ", "đổi model sang DW", "so số với bản cũ", "kho còn thiếu gì".
from: _Store/03_SKILLS/Skill_PBI_Classic @v7 #2dc4c78f7358
---

# The `Classic` kind — the OLD design kept as is, only the model layer moved to the DW

> 🔴 **`Classic` = the OLD design running on the NEW data.** The name is a term already used in the estate
> (`ABC_IncomeStatementClassic`) — **do not read it as "the new copy"**. The new design is a DIFFERENT
> artifact, living side by side without overwriting; mixing the two loses the only reference point for comparison.
>
> This file says **HOW TO BUILD THE CLASSIC COPY**. Operating on `.pbip` files (bookmarks · buttons · icons · the grid) is in the
> **`pbi-pbip`** skill; the DESIGN rules are in `Skill_PBI_Base` `reference/design.md`.
> It differs from `pbi-pbip` in this: `pbi-pbip` edits a report that IS yours, this file **moves someone else's report
> onto another data base without being allowed to change its shape**.

## 0. Why it is done this way — read before discussing options

The old copy is **the ONLY reference point for comparison**. Keeping the design and swapping only the data layer makes every cell that differs
come down to exactly one cause: **the DW**. Changing the design at the same time throws that reference away, and afterwards nobody
can prove whether a figure is wrong because of the DW or because of the redraw.

⇒ **The most valuable output is NOT the report** — it is **the list of what the DW still lacks**, exposed because
the report asks for things the DW cannot answer.

## 1. Things NOT to do

- **Do NOT change the design.** Coordinates · font sizes · layout · page order stay as they are. Seeing something ugly ⇒ **REPORT** it
  (`Skill_PBI_Base` `reference/design.md` §3.5). The standard's 5 grid and colour table **do not apply** to the replica.
- **Do NOT invent figures.** Where the DW cannot answer yet, leave it **empty with a note**, never replaced by an estimate.
  *The old copy paid for exactly this: `[COGs_PnL] = TotalSale × 0.39` — an estimated ratio with a name that sounds
  real, and someone went looking for costs in it.*
- 🔴 **Do NOT force the DW into the old table shapes.** Writing `CASE WHEN`/`UNION ALL` to mould `Fact_*` into exactly the old table
  frame makes **the check meaningless**: tweaking things at random leaves checking the DW with no purpose. **Pull the source tables directly**
  and join through keys.
- 🔴 **Do NOT "standardise" the words THE READER SEES.** The `Classic` copy runs **two layers of names**:
  **inside the model** (tables · columns · measures · folders) by **the new standard**; **labels on visuals, titles, slicer
  labels** keep **the old wording**. On conflict ⇒ **THE UI WINS** — changing a label to be "standard" makes the replica
  differ from the old copy exactly where people look. The comparison table of the four file kinds `Legacy`/`Classic`/`White`/`Red`:
  the `pbi-pbip` skill §0.

## 1b. 🔴 DELETE THE OLD MODEL COMPLETELY BEFORE BUILDING — not tidied afterwards

Applies to **every tier reading the DW**: `Classic` · `White` · `Red`. Not the `Legacy` tier — it *is* the old system's copy.

```
WRONG: switch the source table by table -> tables nobody uses are LEFT BEHIND
RIGHT: DELETE EVERY table reading the old system -> only then pull the DW tables in
```

**Check #7 in §4 (*"the model still reads an old-system source"*) is THE GOAL OF THE WHOLE ROUND, not one
item in a list.** A table still pointing at a source declared in `legacy_sources` means the replica
**has not left the old system**, so it cannot prove what it exists to prove.

🔴 **"No visual uses it" is NOT a reason to keep it.** That is exactly the excuse that really happened
(a Classic report): 6 old-system tables + 2 SharePoint tables were kept because of
0 visuals, the model still loaded green, Desktop said nothing — and the owner had to find it themselves when opening the table
list to look. **The machine does not catch it, only human eyes do** ⇒ it must be a rule, not a habit.

**Deleting a table means deleting it in SIX places** — miss one and Desktop does not open:
```
tables/<Name>.tmdl            relationships in relationships.tmdl
orphan LocalDateTable         measures using only that table
entries in cultures/*.tmdl    the name in the PBI_QueryOrder annotation of model.tmdl
```

**Acceptance, run before opening Desktop:**
```
grep -lE '<every item of legacy_sources, joined by |>' tables/*.tmdl   ->  MUST BE EMPTY
```
⚠ A frequent false alarm: a kept table name holds a deleted table name as a substring (`DimStore` inside
`DimStore <Company name>`, and `DimStore_<company_name>` in the language schema). Match on **word boundaries**, never
on substrings.

🔴 **Classic takes NO UI-adjusting rule** (Classic keeps the design; a Classic title once had its font / capitalisation changed by the White rules and had to be put back): font, size, alignment, title capitalisation, column widths, colours, layout… stay as in the old copy. Classic changes only the DATA layer (model → DW, measures, join keys). Gate: every White/Red design rule (`title-font` · `title-case` · `row-wrap` · `header-wrap` · `narrow-table` …) skips `_Classic` / `_Legacy`.

🔴 **Tables and joins follow ONLY the DW** *(the DW standard revised 13/10)*: every `Dim_/Fact_/Bridge_/Agg_` of the model is a
DW table WITH THE SAME NAME (no self-built DAX tables, no hand-assembled tables); every relationship follows exactly a foreign key the DW has. The DW lacks a table / key
⇒ ask the DW to add it, NEVER build a stopgap yourself. Applies to Classic · White · Red. Gate `dw-only-tables` (static + dw layers).

⚠ **Desktop generates `LocalDateTable` itself on every refresh** (auto date/time). Harmless with `Import`,
but **`DirectQuery` does not allow it** ⇒ turn auto date/time off before moving tiers.

## 2. The procedure — six steps

```
1. COPY the old copy out of the mirror area   _Legacy is Syncthing RECEIVEONLY:
                                              editing in place gets reverted, always copy out first
2. Save As .pbip                              in .pbix the DAX is XPress9-compressed, the agent is blind (naming.md §5)
3. OPEN the old model                         list: tables · sources · measures · calculated columns · bindings
4. REPLACE the tables                         delete the old tables completely -> pull the DW's source tables DIRECTLY:
                                              Source{[Schema="dbo",Item="<Table>"]}[Data]
5. PORT the measures                          plain DAX on DW tables, keeping EXACTLY the old names when still used
6. RECONNECT the bindings                     every visual.json pointing at the new table/column names
```

📌 **The figures of a real round (2026-09-15, `Store Dashboard Income Statement`)** to know the volume:
11 old tables → **6 DW tables** + 3 relationships · **53 measures → 92** · **319 bindings** over ~100 visual files.

🔴 **A THIN report (connected live to another model) has REPORT-LEVEL measures** in `definition/reportExtensions.json`; visuals point at them
with a `SourceRef` carrying **`"Schema": "extension"`**. Moving those measures into the Classic copy's model means **removing the `Schema` key** in every
reference (hidden tooltip pages included). Kept ⇒ after a refresh the visual reports *"Something's wrong with one or more fields"*, and the **Fix this** button DELETES
the field instead of reconnecting it *(04 IP Classic 17/10: lost 3 columns of "Revenue Yesterday of Store" + the tooltip "Same Store SG LM")*. Gate
`extension-ref`.

🔴 **Step 3 must produce an evidence FILE**, not kept in your head: which source each old table reads · what each measure
computes · which columns are calculated in place. Without this file step 6 does not know where to reconnect, and at the end
of the round the question *"what was not ported"* cannot be answered.

## 3. Three flag columns of the PRESENTATION layer — in the report's model, NOT in the DW

🔴 **The test: *"is this in an Excel file / source server to pull from?"*** No ⇒ it is **presentation
logic**, built in the report's Power Query, **never put into the DW**.

An example that really ran: a flag choosing which rows show · a flag "this row is in the old catalogue" · the row colour ported from the old table's
`Row_Color` column. All three are presentation choices **of one report**, not business facts.

⚠ **The classic case — SUMMARY ROWS.** Old systems often have rows like `MCP` · `PROFIT` · `EBITDA` mixed
into the row catalogue. Searching shows they **exist in no original source** (the ERP's real codes stop at some
level) ⇒ they are **measures, not data rows**. Putting them into the DW dirties the dim shared by
every department. Build them in the report's Power Query, carrying exactly the old codes so the bindings do not break.

## 4. The STATIC checks — run BEFORE opening Desktop

> 🔴 **The rules of a model reading the DW (DirectQuery · the gateway server string `<warehouse_server>` · 0 old-system sources ·
> DAX that runs on the web) are in `pbip §1b`** — the `dw-model` + `file-name` gates of `scripts/pbi_gate.py` run for
> every Classic/White/Red copy.

Every error Desktop once caught produced a check here, so next time it is caught **before** opening:

| # | Checks | Born from |
|--:|---|---|
| 1 | **duplicate measure names IGNORING CASE** | `%COGS of Revenue` clashing with `%Cogs of Revenue` |
| 2 | duplicate column names in one table | — |
| 3 | DAX pointing at a column that does not exist | a value of one column used as the name of another |
| 4 | a `formatString` with quotes **not escaped the TMDL way** | `"TRUE";"TRUE";"FALSE"` broke the file |
| 5 | the report's bindings not matching the model | reconnecting hundreds of references |
| 6 | `cultures` pointing at objects that do not exist | — |
| 7 | the model still reads an old-system source | **the goal of the whole round** |
| 8 | valid JSON | — |

🔴 **The 9th check — A TYPE MISMATCH between two columns compared — THE EIGHT CHECKS ABOVE DO NOT CATCH IT**, because both columns
exist. A real case: `Dim_Date[MonthNumber]` is **text** (`"01".."12"`) while the DW's `ParameterDate[Month]`
is a **number** ⇒ 4 measures broke with *"DAX comparison operations do not support comparing values of
type Text"*. **It shows only when real DAX runs:** open Desktop then connect
`Provider=MSOLAP;Data Source=localhost:<msmdsrv port>`, run `EVALUATE ROW("v",[measure])` for each
measure — whichever throws an error shows at once.

⚠ **A trap of the same family, QUIETER: the value changes while the type does NOT.** The old copy's `Quarter` is `"Q1".."Q4"`, the DW
returns `"1".."4"` — no error at all, only **the words on the slicer change**. It shows only when reading `VALUES(...)` out to compare.
Fixed with a derived column (`QuarterLabel = "Q" & Quarter`), **never editing the words the reader sees**.

## 5. Three figures to report — defined BEFORE doing the work

```
MEASURE COVERAGE   measures ported / total old measures     (ported = runs to a figure, no error)
FIELD COVERAGE     visual fields reconnected / total old fields
FIGURE MATCH       cells matching the old copy / total cells compared
```

- 🔴 **"Ported" ≠ "the right figure".** A measure running to a figure can still be wrong; **the figure match is a separate gate**.
- 🔴 **Cells that cannot be compared (because the DW lacks the source) do NOT count as differing** — put them in a separate group *"not yet
  comparable"* with the reason. Merging them into the differing group ruins the very figure to report.
- 🔴 **SCAN EVERYTHING: every period × every unit × every row** (`Rule_Keys_11_VerifyClaims` step 7), in batches — never sample.
  The data-probing API **cuts at `query_row_cap` rows without saying** (`Skill_Task_Pull`), so without batches the figures come out
  short in silence.

**How to measure the match:** a `FULL OUTER JOIN` of both sides on the same instance, grouped by period key + unit + row, counting the
differing cells. *A real round: `46,764` cells → `46,760` matching, `4` differing — and all 4 were **the old system being wrong**, not the new
copy.*

🔴 **A difference does NOT by default mean you are wrong.** Trace it to the end before concluding: the old copy may be reading a
**frozen** table (loaded once and never again) while the DW reads the live source ⇒ **the DW's figure is more correct**,
and that is a **defect of the old system** to write into the catalogue, not an error to patch until it matches.

## 6. Acceptance

A **page** is done when: every visual has its fields reconnected · every measure runs to a figure · the figures match the old copy, **except**
the cells declared clearly in the *"not yet comparable"* group.
The whole **report** is done when every page shown passes **and** the list of what the DW still lacks has been sent to the repo owning
the DW (`region manager repo`) — that repo keeps the DDL, the department repo only places the request and accepts the result.

⚠ **The replica looks exactly like the old copy but its figures come from the DW** ⇒ the case's `spec.md` **and the report itself**
must say so clearly, or it falls into exactly the trap of *two things different in nature carrying the same name*.
