---
id: Skill_Task_VmAutomation
name: task-vm-automation
version: 11
type: process
aka: vm-automation
description: Put a periodic task (Daily / Weekly / Monthly) on the VM to RUN BY ITSELF - the vm_deploy.json manifest, the schedule, the Log_JobRun run log, results to the region's SharePoint, the _SharePoint.url shortcut. Use whenever a task goes onto the VM, is automated or scheduled, or its VM run is checked. Vietnamese triggers - "đưa task lên VM", "tự động hoá task", "đặt lịch trên VM", "task chạy trên VM chưa".
installs: [scripts/task_run.py, scripts/make_output_links.py, scripts/move_outputs_to_vm.py]
---

# task-vm-automation — putting a task on automatic runs on the VM

> This skill is the HOME of the laws for tasks run automatically: real inputs and outputs, the new system only, two directions, input/output gates, the slot grid.
> The design of the VM run: the region manager's plan (`docs/plan/22_vm_pipeline_standard.md`). Syncing repos to the VM: the region manager's own
> skill. The split of input roles between departments and the DW (who normalises, who loads, who keeps the business rules): the region manager's constitution.

## Scope — ONLY tasks running on the VM (this is the new standard)

| Kind of work | Input | Result | `data\<task>\` on the working machine |
|---|---|---|---|
| **A recurring task running on the VM** (has `tasks/<task>/vm_deploy.json`) | SharePoint `DataInput` or the DW | SharePoint `DataReport` | `01_raw` + `03_output` = **only `_SharePoint.url`** + `reference/` (the machine and the VM both keep it) · `02_processing` empty (drafts while trying) |
| **A case / one-off work run on the machine** | taken from anywhere, as before | on the machine, as before | all 3 stages `01_raw → 02_processing → 03_output` as before |

## 🔴 No fake flows · no fake Excel

A file (Excel or any other, on `DataInput`/`DataReport`) may exist only when it is **a REAL input** — received from outside the task (a source
system · another person/department sends it · a form the DW built for others to fill in) — or **a REAL output** — another person/department ASKS for it and opens it.
A task **creates no fake input or output**: no Excel holding a rule nobody sends (⇒ data in the DW, §Two directions) · no file exported only for
another task/itself to read back · no push to SharePoint "for show" · no copying DW figures out to a file and loading them back. **Before proposing/creating any file, ask:**
*"Who SENDS it?"* (in) · *"Who ASKS for it and OPENS it?"* (out) — unable to point to a specific person/department outside the task ⇒ do not create it.
(Drafts in `02_processing` and `reference/` do not count.)

## 🔴 Only the new system · never touch the old system

A task's running code reads/writes only: DW tables · the region's SharePoint site (`sharepoint_site`) · `<vm_run_dir>\<Repo>\` · the DW's `.env` keys.
**Forbidden**: every item in `legacy_sources` (the old system's sources, sites, folders, keys) · source servers read directly (the DW's job) · apps running
on the working machine. **Never touch the old system** (read/write/delete nothing there). Retiring something ⇒ remove it — only on the new system (the
department repo + the VM schedule), what is on the old system stays as it is. A table missing ⇒ ask the DW to build it, never route around through the old system.

## Two directions — every recurring task is IN or OUT

**The test:** *"Does this task bring figures INTO the DW or take figures OUT of the DW?"* Declared in the top block of `spec.md`: `direction: in` or `direction: out`.
**One task, one direction** — work doing both is split into two tasks.

| | `direction: in` | `direction: out` |
|---|---|---|
| What it does | a document the department writes → normalised → `DataInput` → the DW loads it | reads the DW → hands out a file/mail |
| Reads from | the submitter's file (SharePoint `DataInput/<DEPT>/<Work>/`) | **DW tables** (prefer prebuilt aggregate tables/views, e.g. `Agg_SaleDaily`) — no old-system source (`IPOS_Stage`, Fast…), no internal app, never re-adding figures the DW already aggregated; a table/column missing ⇒ order it from the DW |
| Declares | `input_url` | `output_url` (`DataReport/<DEPT>/<Work>/`) · no `input_url` when the original figures all come from systems |
| Gate | **`INPUT_CHECK`** before every writing stage (§1 item 6) | **`OUTPUT_CHECK`** before handing out (§1 item 7) |
| Reference files | `data/<Task>/01_raw/reference/` | `data/<Task>/03_output/reference/` |

- **ONE REPORT, ONE MAKER**: the department owning the business meaning of the figure makes the handed-out copy; another department needing it **reuses exactly that file/link**,
  never rebuilds it. E.g. GC (revenue · guest counts by day × restaurant): ABC makes it, XYZ sends the file ABC made.
- **Business rules in the handed-out copy** (the VAT tier of revenue, how GC is counted…): the department decides, the DW applies it in a table/view — never hard-coded in the task's SQL.
  **Excel only when somebody sends it**: a rule nobody sends ⇒ DATA in the DW in exactly the 5 table kinds of the DW constitution (a column on the owning dim ·
  `Bridge_*` effective by date · `_Config`), no invented prefix, the department asks the DW to change it — NEVER a new file to hold the rule; department code reads the rule
  from the DW, never copies the figures.

## Case vs VM task

- A case handing results to OTHER PEOPLE to view ⇒ preferably push the final copy to the department's `DataReport/<DEPT>/…` (the recipient opens one place); the working copy stays on the machine.
- A case **turning recurring** and going onto the VM ⇒ only then does this standard apply: inputs submitted to `DataInput`, declare `input_url` / `output_url`,
  run `move_outputs_to_vm.py`, the machine keeps only shortcuts.
- **`input_url` = where the original figures sit and who submits them — NOT where the task reads from**.
  The original figures are a submitter's file ⇒ declare `input_url` pointing at the source folder on SharePoint, **even when the task reads a DW table** loaded from that file
  (e.g. XYZ `ABC_Daily_StoreInventoryReport` reads `Fact_InventoryDaily`, the original figures = the restaurants' stock-count form). Figures from systems (POS · Fast · CRM)
  ⇒ no `input_url`, `01_raw` EMPTY. Both ⇒ list every source-file folder (` | `). `make_output_links.py` requires only `output_url`.
- **The run log (`task_run.py`) goes into the DB of the repo holding the data the running repo uses:** a `dept` repo → the DW (`WAREHOUSE_CONN`), an
  `app` repo → the `app-data` repo (`APPDATA_CONN`, declared in `uses.app-data` of the marker), a data repo → its own DB; one `task_run.py`
  for every repo, no hand-copied variants. A data repo naming its key differently ⇒ declares in its `.env` `RUNLOG_CONN_KEY=<KEY NAME>`
  (`task_run` reads that key before the default key; on the VM only `.env` travels, so it is declared here, not in the marker) — and both keys go into
  the `.env` of `vm_deploy.json`.
- **The acting repo (`Rule_Keys_90` step 3):** `task_run.py` hands the launcher env `SASIN_REPO` = the folder name of the repo's root
  (`git rev-parse --show-toplevel`, else the folder holding `docs/.harness.json`; plain `[A-Za-z0-9._-]`, at most 64). A task that calls an
  app of the family sends it as header `X-Sasin-Repo`; a task that inserts into the family's operation log itself fills the acting-repo
  column with it. Attribution only, never a permission. A caller that already set `SASIN_REPO` keeps its value.
- **Checking `reference/` on the VM:** `python scripts\move_outputs_to_vm.py --reference` lists the `reference/` files the machine has and the VM lacks or
  holds with different content, exit code 1 when any (no SharePoint login); with `--apply` it copies the missing files, files with different content are not overwritten.
- **Reference files** code/tests need to rebuild the handed-out copy correctly (samples others sent · acceptance baselines) — not inputs of a run ⇒ placed by DIRECTION (05/10):
  samples/baselines of the **OUTPUT** (the mould the recipient sent · the accounting copy to compare the handed-out figures with) ⇒ `data/<Task>/03_output/reference/`; samples/baselines of the
  **INPUT** ⇒ `data/<Task>/01_raw/reference/`. Both: **the machine and the VM both keep them** — the VM is the machine's backup; `reference/` holds only first-time files for
  rebuilding, it does not grow per period like `03_output`/`02_processing`. `move_outputs_to_vm.py` COPIES `reference/` to that exact path on the VM (compared by SHA-256),
  does NOT remove the machine's copy; `make_output_links.py` does not count `reference/` as `EXTRA`. NOT onto SharePoint, no `input_url`. Pushed to `DataInput` by mistake ⇒
  pull it back into `reference/` then remove the copy in `DataInput`.
- **A task only RE-SENDING a file another department makes** (ONE REPORT, ONE MAKER — e.g. XYZ mails exactly the GC file ABC makes): `output_url` = the folder
  `DataReport/<DEPT MAKING THE FILE>/…` (where the real file sits, not your own folder) · `delivers_to: mail` · the task creates NO second copy, pushes NOTHING into another
  department's folder. `move_outputs_to_vm.py` recognises this case itself (`delivers_to: mail` or an `output_url` outside your department's folder) ⇒ leftover `03_output`
  only goes to the VM, not SharePoint.
- 🔴 **Inputs are submitted only at SharePoint `DataInput`** — NEVER drop a file into `01_raw` (machine or VM) and hope the task reads it. `01_raw` is not a
  source: the history of "which run read which figures" = the version history of the file on SharePoint.

## 0. Picture it before doing it

```
working machine  ──Syncthing──▶  VM  <vm_work_dir>\<Repo>\      CARRIES — no task runs here
                                     <vm_run_dir>\<Repo>\     RUNS — same name, same relative path, ONLY the files the task declares
  vm_deploy.ps1 (task \DW_Automation_Deploy, 5 minutes): reads tasks/<Task>/vm_deploy.json → copy · check · replace the running copy
                                                      → REGISTERS the Task Scheduler schedule by the "schedule" key
  each run: scripts\task_run.py wraps the launcher → log data\logs\<task>.log + ONE line into the DW's dbo.Log_JobRun
```

| Thing | Sits in | Who looks |
|---|---|---|
| Files submitted (input) | SharePoint `DataLake/DataInput/<DEPT>/…` | the task reads them directly |
| The final result (deliverable) | SharePoint (`sharepoint_site` in the region values)`/<DEPT>/…` — the task pushes it itself (PUT overwrite, versions kept) | the recipient opens it there |
| The task's working data (logs · state · copies of results) | VM `<vm_run_dir>\<Repo>\data\<Task>\…` | VM backup; looked up when needed |
| `data\<Task>\01_raw` · `03_output` on the working machine | **EXACTLY 1 file per folder: `_SharePoint.url`** (plus `reference/` when any — the VM keeps a copy) — `01_raw` points to `DataInput`, `03_output` to `DataReport`; `02_processing` empty. Gate: `zemory conform` › `vm-task-local-data` | click the shortcut to reach the real source / result |

🔴 **"One file per period" is about SHAREPOINT, not the machine.** The task pushes 1 file per run to `DataReport` (e.g. XYZ NQ: `NQ T9-2026.xlsx`,
`NQ T10-2026.xlsx` … side by side) or overwrites 1 file (e.g. XYZ `ABC_SummaryInventoryResult.xlsx`, the history in SharePoint versions). The
`03_output` on the machine is only a WINDOW onto it: one shortcut, nothing more. A TRIAL run on the machine writes into `02_processing\` (or deletes right after
looking) — never left in `03_output`.

**Do NOT sync `data\` in any direction**. A task needing the previous period's figures ⇒ reads them back from SharePoint `DataReport` (it pushed them there itself), never relies on the disk.

## 1. Conditions on the code (fixed before going onto the VM)

1. **Relative paths** from the file's position (`Path(__file__).resolve().parents[…]`) — never hard-coded `D:\<user>\…`. The DW repo = the sibling folder of the region manager repo (the DW's running copy on the VM has `.env` · `config\mail\` · `form_lib`…).
2. **Inputs** are read from SharePoint `DataInput` or the DW — never files on the working machine, never an app running on the working machine (the VM has none), never a local copy.
3. **Outputs**: written to `data\<Task>\03_output\` then pushed to `DataReport/<DEPT>/<Work>/…`. Right after each push, **print one line `OUTPUT_URL: <webUrl>`** — `task_run.py` collects that line into the run ledger.
4. **Mail**: sender + recipients come from the mail vault of the DW repo (`config/mail/mail_vault.json` — `senders[]` · `groups[]`), no address written in code. No group yet ⇒ ask the DW session to add it, the code STOPS with a clear error, never guesses an address.
   🔴 **Mail to a RESTAURANT goes only to the restaurant's mailbox, NO CC to anyone** (the case of 45 mails wrongly CC'd, recalled with Purview). The default of every send command: send ONLY to the person running the trial; a real send needs its own flag (`--send-real` / `live` / `--send`).
5. **Exit code**: 0 = green, non-zero = red. An error midway is never swallowed silently.
6. **The input gate** (a task with `input_url`): the input-check stage runs BEFORE every writing stage, printing
   `INPUT_CHECK: OK|NONE|INVALID · <file> · <detail>` for each input (`task_run.py` collects them into `Log_JobRun`); `INVALID` ⇒ exit ≠ 0,
   nothing written. Reuse the processing stage's reading function; runnable with `--doc <file>` so the agent checks a file BEFORE submitting it to `DataInput`.
   Test red on all 4 layers (missing file · broken file · wrong mould/name · figures not matching) before calling it done. Sample: the department repo's `00_check_input.py`.
7. **The output gate** (a task with `direction: out`): checks BEFORE handing out (push to `DataReport` / send mail) — the period is complete
   (every day · every restaurant) and **the file total = the DW table total for the same period**. Print ONE line `OUTPUT_CHECK: OK|INVALID · <file> · <detail>`
   (`task_run.py` collects it into `Log_JobRun` like `INPUT_CHECK`; look up with `Message LIKE N'%OUTPUT_CHECK: INVALID%'`); `INVALID` ⇒ nothing handed out, exit ≠ 0.
   Test red on at least 2 cases (a period missing a day/restaurant · a total off from the DW) before calling it done.
8. **The target period = the period RIGHT AFTER the one already handed out on `DataReport`**, NOT "the period before today" (measured by XYZ 07/10). That period not closed yet ⇒ exit 0,
   do nothing. Counting from today makes a period with late data get skipped (a weekly report even numbered the next week for late week data).
   Sample: the department repo's `run_weekly.next_week_after` · `run_nq.next_month_after_delivered`.
9. **Due but the data not complete ⇒ search again every 3 hours, over several days, until complete.** Matching `vm_deploy` (one hour per schedule): ONE `daily` schedule, the real launcher
   passes `--retry-hours 3`; within the run, the input/readiness gate red ⇒ sleep 3 hours and search again, up to ~23.5 hours (before the next day's run fires).
   **Repeat only at the GATE** — a stage after the gate failing stops at once (repeating there sends twice / hides the error). Never create hourly `_Retry` tasks.
   `ExecutionTimeLimit` ≥ 24 hours (the `schtasks` default of 72 hours is enough). A run without complete data exits ≠ 0 ⇒ `Log_JobRun` red 0–3 times per period is
   THE GATE BLOCKING CORRECTLY, not a broken task.
10. **The "sent" mark BEFORE uploading**: after the real mail is sent write `data/<Task>/02_processing/_sent_<period>.txt`, only then push to `DataReport`;
    the next run sees the mark ⇒ stops (an upload error is reported for a manual push, NEVER sent again). Without the mark an upload error = the run 3 hours later sends the mail A SECOND TIME.
11. **Failure mail to the operator** (mail the operator when the task fails or lacks data): only on a REAL run reading the DW — a run on sample/test data **does NOT send** (07/10 a trial run of XYZ sent
    mail exactly like the real thing, and the requester thought the task had run itself on the wrong day); only to the task's operator (the department's sender in `mail_vault.json`),
    NO Cc — this is a notice to the person running it, not a report mail. Sent when: (a) a stage exits ≠ 0 · `OUTPUT_CHECK` red · an upload error
    after sending · a crash; (b) data missing — ONE mail per day's firing run (after every 3-hour search is used up), NEVER a mail every 3 hours.
    The sending function **must never raise** (a mail error must not hide the task's exit code).
    **Mail layout** (a short, simple report in an easy-to-read table; a raw log dump was rejected): subject `[<DEPT> task] <task>: <result>`; the body is ONE two-column table, one fact per row — **Task** · **When**
    (time dd/mm/yyyy · machine name) · **Result** · **Not met** (each red check one row, console symbols `❌`/`→` dropped) · **Last log lines** (ONLY
    when the error is not at the gate, ≤ 12 lines, a frame that wraps) · **Next step** · **Log** (the log path on the running machine). No raw log dump.
    Sample: the department repo's `scripts/dw_access.alert` (commit `dd07cc7`; tested red 07/10: the gate missing 1 day ⇒ 1 mail to the operator, 0 files built, exit 1).

## 2. Declared in the department repo (3 places)

**a) `tasks/<Task>/spec.md` — the top block:** **`direction: in|out`** (§Two directions) · `cadence` (Daily/Weekly/Monthly) · `run_at` · **`input_url:`** = the link to the FOLDER holding the submitter's ORIGINAL files on SharePoint, even when the task reads a DW table loaded from that file (left empty only when the original figures all come from systems) · **`output_url:`** = the link to the result FOLDER on SharePoint (several targets: separated by ` | `). E.g.
`output_url: <sharepoint_site>/DataReport/ABC/InventoryResult`

**b) `bin/<Task>.cmd`** — the launcher: relative path `%~dp0..\tasks\<Task>\pipeline`, `set PYTHONUTF8=1`, returns `exit /b %errorlevel%`.

**c) `tasks/<Task>/vm_deploy.json`** — the manifest:
```json
{
  "files": ["bin/<Task>.cmd", "scripts/task_run.py", "tasks/<Task>/pipeline/common.py", "tasks/<Task>/pipeline/run.py"],
  "needs": ["../<region manager repo>/.env", "../<region manager repo>/config/mail/mail_vault.json", "../<region manager repo>/config/mail/mail.env"],
  "schedule": [
    {"task": "<Task>", "launcher": "bin/<Task>.cmd", "args": "live", "daily": "13:00"}
  ]
}
```
- `files`: EVERY file the task needs at run time (code · launcher · `scripts/task_run.py` · config) — one missing and the VM run breaks. Do not declare `data\`, `docs\`, secrets of another repo. Files ending `*.local.*` NEVER go onto the VM (`.stignore`) — do not declare them.
- `needs`: files of ANOTHER repo that must be present in the running copy (usually the DW's).
- `schedule`: the task name = the task folder name (extra runs take a suffix `_Night` / `_Close`…). One of `"daily": "HH:MM"` · `"weekly": {"day": "MON", "at": "HH:MM"}` · `"monthly": {"day": 1, "at": "HH:MM"}` · `"ondemand": true` (07/10: no trigger, runs when clicked — sample `<region manager repo>/tasks/DW_OnDemand_RunModels`).
- `files` accepts the patterns `*` / `?` (07/10, e.g. `"models/*.sql"`) — resolved in the source repo each round. Removing a `schedule` item ⇒ `vm_deploy` writes `ORPHAN` + DISABLES that task (not deleted; deleting is the requester's call).
- 🔴 **THE 30-MINUTE SLOT GRID** (every task of every department spreads from midnight to the end of the day, 30 minutes apart, each task dropped into a slot): run times may only be `HH:00` or `HH:30`, each task ONE slot, never overlapping another department's task. Overlap = the same time, except two weekly schedules on different weekdays or two monthly schedules on different days (a daily schedule holds its slot every day). **The same-chain exception** (overlap is not forbidden for jobs of one chain, e.g. two mails of XYZ and ABC of the same kind may go together): schedules declaring THE SAME `"slot_group": "<chain name>"` may share a slot (e.g. `store_inventory` = the DW's rescue run + the ABC + XYZ mails at 01:00/13:00); different groups or no group still count as overlapping. Machine watch: `vm_deploy` does not register a new/just-changed schedule off the grid or overlapping a slot, writing `!! SLOT … not registered` into `vm_deploy.log` ⇒ choose another slot. **SLOT PRIORITY ORDER** (the ABC/XYZ inventory schedules first, then XYZ and the later schedules): ① tasks tied to a business CUT-OFF TIME in the day — the inventory chain (ABC night 01:00 · ABC close 13:00 · XYZ 13:30, right after the DW's 01:00/13:00 rescue run) · ② other daily tasks · ③ weekly reports · ④ monthly / quarterly. Each department READS the slot table ITSELF and FILLS a free slot ITSELF (scheduling included) — never asks the DW. Wanting the slot of a LOWER-priority task ⇒ message that repo's session directly, the lower-priority repo moves itself (e.g. XYZ Weekly Friday 01:00 → 02:30 to make way for ABC night). NEVER push a higher-priority task. A task reading the stock figures of the rescue run ⇒ placed IN the rescue slot or after, and waits for `_Config.INVENTORY_RescueDoneAt` newer than the slot time before reading (input gate §1 item 6).
**Choose the slot BEFORE declaring:** `python <region manager repo>\scripts\vm_schedule.py` (the table of slots in use by every repo · overlaps · off-grid · free times, read straight from every `vm_deploy.json` — no SSH needed) then `… --check daily 13:30` (or `weekly FRI 02:30` · `monthly 1 02:00`) must give `TRỐNG`. The printed copy the script generates sits in the region manager. Old-system tasks do not count (not touched, to be cut). The old rule "avoid minutes :01/:31" is DROPPED — the old-system task `\Inventory day` was deleted 07/10.
- The real command is prebuilt: `python scripts\task_run.py --task <Task> -- bin\<Task>.cmd <args> >> data\logs\<Task>.log`.
  The log on the VM is always named `data\logs\<task name>.log` (a task registered by hand before the standard may still have a log with another name, e.g. `…_close.log` —
  from the run wrapped by `task_run` on, the log sits under the new name).
- A task registered BY HAND before the standard (same name): declaring `schedule` with the same name makes `vm_deploy` rebuild it from the manifest — one source, never two
  copies. A hand task currently ENABLED stays enabled; to disable it ⇒ the department disables it itself (`Disable-ScheduledTask` over ssh) after the requester's word in the department session.

## 3. A trial run BEFORE going up

1. Run the launcher on the machine in trial mode (mail only to the requester). Read the log: no Traceback, exit code 0. To test the wrapper too,
   `python scripts\task_run.py --task <Task> --no-log -- bin\<Task>.cmd <trial args>` — **`--no-log` is required when trying**: without it,
   the trial writes a line into the REAL `Log_JobRun` under the real task name (the ledger blocks deletion — the trial line stays forever).
   Test with the output going TO A FILE (`… > trial.log`), not only to the screen: a task printing Vietnamese while stdout is a file is a case that often breaks the code page
   (the XYZ trial 04/10 caught it — `task_run` now forces UTF-8; the log file is read as UTF-8).
2. **Print the To/CC list of EACH mail** and compare it with what the requester settled. Not matching ⇒ stop.
3. `python scripts\make_output_links.py` (from the repo root) ⇒ `data\<Task>\03_output\_SharePoint.url` opens the right folder. The script reports `EXTRA`
   when `03_output` still holds files other than the shortcut — **tidying when moving a task onto the VM = MOVING, not deleting** (push to the VM and to SharePoint):
   `python scripts\move_outputs_to_vm.py` (dry run) → `--apply`. Each file: SharePoint (EXACTLY the `output_url` folder — a leftover file is an official handed-out copy in the wrong
   place, not an archive; there is NO `_Archive/`; same name, different content ⇒ NOT overwritten, reports `CONFLICT`, keeps the machine's copy for the requester)
   + the VM (`<vm_run_dir>\<Repo>\data\<Task>\03_output\`; same name, different content ⇒ `__local`), the machine's copy is removed only when both check out.
   Excel is compared by cell values (SharePoint edits Office files on receipt). A task with `delivers_to: mail` or an `output_url` in another department's folder ⇒
   skip the SharePoint step, VM only. `reference/` ⇒ copied to the VM, the machine's copy kept (item Reference files).
4. Commit the department repo (pathspec, only the task's files).

## 4. Going onto the VM — automatic

1. Syncthing carries it to `<vm_work_dir>\<Repo>` (a few tens of seconds). A repo without a Syncthing folder yet ⇒ tell the requester (the server administrator adds the folder).
2. Within ≤ 5 minutes `vm_deploy` copies it to `<vm_run_dir>\<Repo>` and registers the schedule. A NEW task is created **DISABLED**.
3. 🔴 **THE DEPARTMENT DOES IT ITSELF, NEVER ASKS THE DW** (each department manages its own tasks — the old version requiring "ask the DW session … the DW enables the task" was the hole): the department's OWN session (a) reads `<vm_run_dir>\<region manager repo>\data\logs\vm_deploy.log` (the `REGISTERED` / `!! SLOT` / `VALIDATION FAILED` lines of its task) · (b) runs ONE trial on the VM in trial mode (mail only to the operator) · (c) shows the requester the result / trial mail in the department session itself · (d) the requester nods ⇒ the department itself runs `Enable-ScheduledTask -TaskName <Task>` over `ssh <vm_ssh_alias>` (the department repo's one-use `.allow-outside` flag, created after the requester's word) then measures `State = Ready` + `NextRunTime`. Disabling / removing the old hand schedule on the working machine is the department's too. An enabled task stays enabled when its schedule/command is edited later. **The boundary (the DW only handles adding new tables/columns on business request): ask the DW ONLY when the task needs a DW TABLE / COLUMN that does not exist yet.** Trial runs · enabling/disabling · choosing a slot (`vm_schedule.py --check`) · moving a schedule · yielding a slot (message the session of the department holding it directly) · reading `vm_deploy.log` · errors of your own task ⇒ the department does it itself, not through the DW.
4. The first real run: read `dbo.Log_JobRun` (JobName = the task name, StepName `(Task Scheduler outcome)`) — `StatusText` OK, `Message` has `OUTPUT_URL:` + `INPUT_CHECK: OK` (an in task) or `OUTPUT_CHECK: OK` (an out task).

## 5. Checking & looking up

```sql
SELECT TOP 20 JobName, RunAt, DurationSeconds, StatusText, Message
FROM <warehouse_db>.dbo.Log_JobRun WHERE StepName = N'(Task Scheduler outcome)' ORDER BY RunAt DESC;
```
The full log of a run: VM `<vm_run_dir>\<Repo>\data\logs\<Task>.log` · the deploy log: `<vm_run_dir>\<region manager repo>\data\logs\vm_deploy.log`.

## Do not
- Do not register a task by hand with `schtasks` — declare `schedule` in the manifest (one source, the deploy rebuilds it on change).
- Do not let a task read/write `<vm_work_dir>\…` — only `<vm_run_dir>\…`.
- Do not sync `data\`, do not point `03_output` at the OneDrive folder of SharePoint (a trial run on the machine would become a release).
- Do not send for real the first time before printing To/CC and having the requester's word.
- 🔴 Do not propose CREATING a new Excel/sheet (`<DEPT>_<Rule>.xlsx` on `DataInput`) to hold a rule/threshold/code table nobody sends
  (Excel exists only when people send it; what nobody sends is already loaded from the DW). The test: *"Does anybody send a file
  for this rule?"* — yes ⇒ a sheet on `DataInput` (§Two directions) · no ⇒ ask the DW session to keep the rule as DW data — a column on the owning dim · `Bridge_*` · `_Config` (5b; NEVER invent a new prefix like `Rule_`).
  More broadly: no fake input/output at all (§1a, the first item of the skill).
- Do not copy a threshold/rule the DW holds into department code (e.g. `LOOKBACK_DAYS = 184`) — read it from the DW (§Two directions).
- Do not compute the target period from today (§1 item 8) · do not repeat the stages AFTER the gate when searching again (§1 item 9) · do not send a warning mail every 3-hour
  search (§1 item 11) · do not push `DataReport` before writing the "sent" mark (§1 item 10).
