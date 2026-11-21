---
id: Skill_App_Export
name: app-export
version: 1
type: process
checked: [Skill_App_Base, Skill_App_Report, Skill_App_CrossFilter, Skill_Db_Base]
description: Export data of an app as a file the safe way - a dialog with the scope (filters, a period), the columns picked from one fixed list (personal ones marked), the format (CSV or Excel), the place to save (the browser's Save as), the row count first and the purpose for personal data; the backend checks it all again and logs the export before the file leaves. Use when building or changing any export, download of a list, CSV or Excel button of an app. Vietnamese triggers - "xuất csv", "xuất excel", "xuất file", "tải danh sách", "export", "tải về".
---

# app-export — data leaves an app as a file, scoped, chosen and logged

> Carries out `Rule_Gate_75_ScopedExport`. A part of its own: `Skill_App_Base` says how a surface is built, `Skill_App_Report`
> how a report page reads, `Skill_App_CrossFilter` how its visuals filter each other, `Skill_Db_Base` how tables are shaped -
> none of them says what may leave the app as a file, who chose it, and what the log keeps.

## 1. One list of the columns
- The backend holds ONE list of what an export may carry: key → (the SQL of the column, personal data or not). The file shows
  the columns in the list's order, whatever order the request names them in.
- A key the request names that is not in the list is refused (422). The SQL of a column comes only from the list, never from
  the request.
- `GET /api/export/columns` answers the list (key, personal) for the dialog; the dialog's words for each key are the app's.

## 2. Three routes
- `GET /api/export/columns` - the list.
- `POST /api/<entity>/export/preview` - the number of rows the scope holds; refused without a scope.
- `POST /api/<entity>/export` - body: the filters by the names the page's API takes · `columns` · `purpose` · `format` (`csv` ·
  `xlsx`) · the saved group it came from, if any.
- Every route checks the role's rank on the server (the export is the rank the app's constitution names).

## 3. The checks of the export route, in this order
1. Rank, else 403.
2. A scope: at least one filter; a period counts as one. None ⇒ 422 `export.no_filter` - never the whole table in one click.
3. Columns: at least one, every one in the list ⇒ else 422.
4. A personal column picked ⇒ a purpose of 5 to 200 characters, else 422.
5. The format offered (`csv`, `xlsx`), else 422.
6. Read the rows; write the log row (the app's export code, level warn, Detail `<rows> · <scope> · cols <keys> · purpose <text>
   · <format>`); a log row that cannot be written ⇒ 503, no file.
7. Build the file in memory: CSV in UTF-8 with a BOM (Excel reads accented names); Excel as one sheet in a write-only workbook,
   the header row frozen, numbers as numbers and days as dates. Answer with `Content-Disposition: attachment;
   filename="<app>-<entity>-<yyyymmdd-hhmm>.<ext>"` and `Cache-Control: no-store`. Nothing is written to the server's disk.

## 4. The dialog
- Opened by the page's export button (its id is the browser test's handle) or a saved group's row menu; never a file on the
  first click.
- Drawn OUTSIDE the page card: a date field of the frame inside the page card registers itself as a filter of the page bar and
  shows a pin.
- Its sections, one divider between each: the scope in words (changed on the page bar, not in the dialog) · the period (two day
  fields of the frame) · the columns as check boxes in groups, personal ones with a badge, none personal ticked at first · the
  purpose, shown when a personal column is ticked · the format (Excel or CSV) and where the file goes · the row count.
- Export opens the browser's "Save as" first (`showSaveFilePicker`, Edge and Chrome), on the click itself, before the file is
  made; cancelling it stops everything - nothing read, nothing logged. A browser without it gets the file in its downloads,
  and the dialog says so.
- The export button stays off until the scope, a column and (for a personal column) the purpose are there.

## 5. Tests
- The backend's tests: each rank · no scope · no column · an unknown column · a personal column without a purpose · a format not
  offered · the log row written first with its Detail · a log that fails gives 503 and no file content · the column order · an
  Excel file read back (numbers, days, the header).
- Break each check in turn: a test goes red; put it back: green.
- The browser test opens the dialog from the export button and measures it with the dialog rules.

## Implements · Thi hành luật
- `Rule_Gate_75_ScopedExport` — the dialog, the routes and the checks of an export · hộp thoại, route và phép kiểm của một lần xuất
