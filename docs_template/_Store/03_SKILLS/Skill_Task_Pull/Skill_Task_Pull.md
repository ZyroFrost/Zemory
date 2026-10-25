---
id: Skill_Task_Pull
aka: pull
name: task-pull
version: 11
type: process
installs: [scripts/query.py, scripts/vault.ps1]
description: Fetch fresh data from a source (SQL, VM, web, API) into the project so a deliverable can be built. Use when the deliverable needs newer numbers, when a scheduled task starts, or when asked to refresh, download, or retrieve source data. Vietnamese triggers - "kéo dữ liệu", "lấy số mới", "tải data về", "cập nhật nguồn", "pull dữ liệu", "làm mới số liệu".
---

# pull — pulling data from a source

> Trigger: new data from a source (SQL/VM/web/API) is needed to make a deliverable. Slots: `02_STRUCTURE`.
> In a **numbered pipeline**: the gate **`00_ready.py`** checks the source is ready (exit 0/1) FIRST, then
> **`01_pull.py`** pulls. The launcher `<name> auto` runs the gate → pull when ready; or
> `<name> pull` runs stage 01 directly.

## Procedure

1. **Read the source definition** (M · connection spec · pulling SQL): for ONE case ⇒ in `tasks/<case>/`; shared by two cases or more ⇒
   `sources/` (slot `Tasks_115_Tasks`: ask "one case or shared?" before placing the file). Credentials come from `.env`
   or `config/`. **NEVER type a password into a tool** (`zemory` included). A web source → borrow the
   session already signed in on the real site.
2. **Pull the raw data into `data/extract/`** (gitignored). Name it by **source + date**.
   Rate-limited → pace/back off. It must be **resume-safe**: broken half way, it continues, never
   starting over.
3. **NEVER commit pulled files** — heavy, and they may hold personal data (PII).
4. **Record the pull** (source · scope · row count) in the task's spec or `04_TODO.md`, so it can be traced
   later.

## Exploring data — the agent runs it itself, read only

- Exploring structure, looking things up, reconciling: the agent runs read-only statements itself through the region's query tool (`values.json` › `query_app`),
  never hands SQL to a person to run by hand, never asks for a password (the password is in the vault). A task's run code on the server reads the warehouse through a
  connection variable (`WAREHOUSE_CONN`), not through the exploring tool.
- How to call it — one tool, never another client written on your own: `python scripts\query.py <db_id> "<SELECT …>"` (each result row one
  JSON) · `--map` (the list of `db_id` = `<server>.<DB>`) · `--check` (sign in + `SELECT 1`). The tool reads the client, the python
  and the vault file name from the region's values (`query_client_dir` · `query_python` · `query_vault_file`); the account belongs to THIS repo, in
  `data/secrets/vault/<query_vault_file>` (one department, one account: the app's log records the right department exploring). Never use another repo's
  vault, never copy a password out as text. No vault yet, or it cannot be decrypted ⇒ ask the requester for a temporary password.
- Pass the SQL statement through the tool or a Python script, never join strings through the shell (the `'` is swallowed). A network error (handshake timed out) is
  the network path to the app's server (office LAN or VPN), not an app error.
- One `SELECT` / `WITH` statement, no `;`, no writing keywords. Sources outside the warehouse are read with `WITH (NOLOCK)`.
- The tool returns at most `query_row_cap` rows per call ⇒ split into batches (`OFFSET … FETCH NEXT`), then merge; the last page still full ⇒ the data is not complete,
  no conclusion yet. Without batches, the numbers come out short and nobody notices.
- Never guess server, database or table names: explore, or ask.

## Forbidden

- **A source error → REPORT it, never make numbers up.** Missing permission → ASK, never work around it.
- Pulling, then committing it straight to git.
- Hardcoding a connection string in a script — always point at an environment variable's name.
- Widening the pull on your own ("might as well take the whole year") when only one period was asked for.
