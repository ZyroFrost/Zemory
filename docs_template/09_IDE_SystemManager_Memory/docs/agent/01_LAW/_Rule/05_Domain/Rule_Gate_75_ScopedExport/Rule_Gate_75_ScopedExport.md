---
id: Rule_75
name: scoped-export
version: 1
kind: action
code: 05_Domain
checked: [Skill_App_Export, Skill_App_Base, Rule_Keys_90_AppFamilyContract, Rule_Keys_87_NoSilentBlankPage]
---
# Rule_Gate_75_ScopedExport — Data leaves an app as a file only with a scope, picked columns, a chosen format and a log row

## What
An export is never one click on everything. Every export of an app opens a dialog where the person sets the scope, the period,
the columns, the format and where the file is saved; the backend checks all of it again and writes the log row before the file
leaves the server. A law of its own: `Rule_Keys_90_AppFamilyContract` names the family's log codes but not what may leave an
app, `Skill_App_Base` how a surface is built, `Rule_Keys_87_NoSilentBlankPage` what a page shows when it has nothing; none of
them holds the duty of an export.

## When
- About to build or change an export, a download of a list, a "CSV", "Excel" or "report file" button of an app.
- About to write a backend answer that sends a file (`Content-Disposition: attachment`).

## Do
1. The button opens a dialog, never a file. The dialog shows:
   - the scope: the page's filters or a saved group's - at least one filter, a period counting as one;
   - the period of the data;
   - the columns, picked from ONE fixed list of the app, personal data marked; none personal ticked when it opens;
   - the format: CSV (UTF-8 with a BOM) or Excel (.xlsx);
   - where to save: the browser's "Save as" where it has one, else the browser's downloads;
   - the number of rows before the file is made;
   - the purpose, required when a personal column is picked.
2. The backend refuses, closed on failure: no scope · a column not in the list (a column name never reaches the SQL from the
   request) · a personal column without a purpose · a format not offered · a role below the export's rank.
3. The log row - rows · scope · columns · purpose · format, the app's export code, level warn - is written BEFORE the file leaves;
   a row that cannot be written means no file.
4. The file is built in memory, never kept on the server, sent with `Cache-Control: no-store`, named
   `<app>-<entity>-<yyyymmdd-hhmm>.<ext>`.
5. Tests: rank · no scope · an unknown column · no purpose · the log row first · a failed log gives no file · the column order;
   breaking each condition turns a test red. The browser test opens the dialog from the button.

## Right way
When this rule blocks a file answer: put the export behind the dialog and its checks, and write the log row (the app's export
code) in the same route before the answer - skill `app-export` has the routes, the dialog and the tests.

## Example
- Situation: a members app gets an "Export CSV" button for the marketing team.
- ✗ Wrong: the button downloads every member the page shows, with full phones, even when no filter is set; nothing says what the
  file was for.
- ✓ Right: the button opens a dialog; the person sets a tier and a period, ticks card code, tier and phone, writes "birthday gift
  for VIP", picks Excel, chooses the folder; the file holds 141 rows and the log row names the scope, the three columns and the
  purpose.

## Check
- Hook: a write to a backend source file that adds a file answer (`Content-Disposition: attachment`) to a file where no log call
  stands is blocked; the same answer beside a log call passes.
- Keyword reminder: a request to export, download a list, or make a CSV or Excel file shows this rule.

## Links · Liên kết
- Implements · Thi hành: `Skill_App_Export` — the routes, the dialog and the tests · các route, hộp thoại và test
- Related · Liên quan: `Rule_Keys_90_AppFamilyContract` — the family's log codes · mã log của họ app
