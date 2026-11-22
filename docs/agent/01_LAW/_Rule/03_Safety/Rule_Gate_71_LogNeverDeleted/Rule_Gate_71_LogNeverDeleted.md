---
id: Rule_71
name: log-never-deleted
version: 2
kind: action
code: 03_Safety
checked: [Rule_Gate_10_DestructiveOps, Rule_Gate_04_ScratchFiles]
from: _Store/01_LAW/_Rule/03_Safety/Rule_Gate_71_LogNeverDeleted @v2 #813606796187
---
# Rule_Gate_71_LogNeverDeleted — A log is never deleted; old log is only compressed

## What
Every log is kept: an app's log files, a log table in a database, a server's system log, the history of runs, the record of
operations, the log lines a page shows from memory. Nobody deletes, empties, truncates or rotates away a log, an administrator
included, with or without approval. Old log that takes room is compressed, never thrown away.

## When
- About to delete, move away or empty a log file or a log folder.
- About to write SQL that deletes, truncates or drops rows or a table of a log.
- About to set up log rotation or a retention limit (logrotate, journald, an app's own log files).
- About to build a delete button, command or API route on a log.
- The person asks for a log to be deleted or cleared.

## Do
1. No button, command or API route deletes a log; a log page only reads.
2. A log table only grows: no UPDATE, DELETE, TRUNCATE or DROP on it, and the app's login is denied them; a wrong line is
   corrected by a new line that says so.
3. A log needs room ⇒ compress it: gzip a closed file, page compression or a compressed partition of a table, journald with
   `Compress=yes` and no vacuum. Rotation keeps every file (logrotate `rotate -1` with `compress`); no size or age limit that
   drops lines.
4. A log kept only in memory, or in a place that drops old lines by itself ⇒ write it also to a place that keeps it.
5. The person asks for a log to be deleted ⇒ name this law and offer to compress it.
6. A file that is not a log (a scratch output, a test report) is not named `*.log`, so it can be cleaned up
   (`Rule_Gate_04_ScratchFiles`).

## Example
- Situation: the Logs page of an app has a "Clear log" button, and the server's journal drops old lines when it is full.
- ✗ Wrong: keep the button for administrators and set `SystemMaxUse=500M` so the disk never fills.
- ✓ Right: remove the button and its DELETE route; write the app's lines to a log table that only grows; compress old journal
  files instead of capping the journal.

## Check
- Guard hook, no flag gets past it: a shell command that deletes or empties a log (`rm` · `del` · `Remove-Item` · `unlink` ·
  `git rm` · `truncate` · `Clear-Content` on a `*.log` file, a `logs/` folder or `/var/log/`), `journalctl --vacuum-*`, or SQL
  `DELETE` · `TRUNCATE` · `DROP TABLE` on a log table (`Log_*`, `*_log`) is blocked.
- The same hook blocks a file edit that adds such SQL, a DELETE route on a log path, a journald limit (`SystemMaxUse` ·
  `SystemMaxFiles` · `MaxRetentionSec` · `RuntimeMaxUse` · `RuntimeMaxFiles`) or a logrotate count or age (`rotate N` with N ≥ 0 ·
  `maxage`). Test files are not judged: a test may show that the store refuses a delete.
- Passed: compressing (`gzip`, `DATA_COMPRESSION`), reading, appending, `DENY DELETE ON` a log table, a trigger that refuses a
  delete, deleting a file that is not a log.
- Gate examples in `gate.json` replay each blocked kind and each passed kind.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — deleting anything else needs approval · xoá thứ khác thì cần duyệt
- Related · Liên quan: `Rule_Gate_04_ScratchFiles` — a scratch file is not named like a log · file nháp không đặt tên như log
