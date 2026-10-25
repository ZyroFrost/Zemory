---
id: Skill_Task_Case
aka: case
name: task-case
version: 13
type: process
description: >
  Mở, đóng hoặc mở lại một CASE trong tasks/<case>/ (chuẩn 1 case = 1 folder của hệ
  NON-APP). Dùng khi có một vấn đề mới cần điều tra, khi quay lại một vấn đề đã xử,
  hoặc khi được yêu cầu đóng/mở lại một case. Cụm hay gặp: "mở case", "lưu thành task",
  "task mới", "đóng case", "mở lại case", "vụ này lưu ở đâu".
---

# case — opening · closing · reopening a case

> The slot standard + the 1-case-1-folder rule: slot `Tasks_115_Tasks` `tasks/` · `Tasks_117_Case` `tasks/<case>/` · `Data_131_Case` `data/<case>/` (+ the definition in the HP frame `Cons_Gate_12_SourceOfTruth`). The soul of the pattern: every problem is
> a LINE OF WORK returned to many times — everything of it must sit in ONE place, open one folder and it is all there.
>
> Department repos: case name, cadence, task name, file names, names of handed-out copies ⇒ [`reference/naming.md`](reference/naming.md) · the declaration block at the top of
> `spec.md` and closing a case ⇒ [`reference/spec-block.md`](reference/spec-block.md).

## Before opening a new case — CHECK WHETHER IT EXISTS

Read `content/README.md` (the case INDEX) + the *"calls the case"* column (when to enter this case) in the cases'
specs. A problem on the same topic as an old case → **reopen that case, do NOT create a new one**. Creating another = knowledge
split in two, exactly what this rule exists to block. **The INDEX check is required, always** — skipping it
entirely when opening a new case is a mistake already met for real.

🔴 **Filing a STRAY FINDING into a case → SEARCH GLOBAL MEMORY FIRST, do not guess from the file name.**
`zemory memory search "<keyword>" --all` → find **the session that produced it** → file it by **THE TOPIC
of that session**. The typical case: a finding sitting in folder X filed as "the X matter" by the folder
name — the wrong topic reported 3 turns in a row; the real origin was a completely different line of work. **A file name says where it
SITS, not which WORK it belongs to.**

## OPENING a case

1. `tasks/<case_name>/` — **a PLAIN name, UNNUMBERED**, recurring cases included. The naming convention belongs to the
   repo (e.g. one estate uses `<DEPT CODE>_<CADENCE>_<TaskName>` like `IT_Weekly_Inventory`); the standard does not force a
   name, it only forces **no sequence number**. ⚠ The old clause *"an `NN_` number for recurring cases"* is repealed: a number on a case name
   is a dead number (cases do not run in order, adding/dropping renumbers the whole run) and it gets confused with the STAGE numbers
   in the case's `pipeline/`, which carry real meaning.
2. `spec.md` **written BEFORE investigating**, with all 5 items: **Status** · **Calls the case** *(what you say to get here)* ·
   **File index** · **Open work** · **§Reopen the case when**.
3. Investigate → findings `<date>_<slug>.md` · fix scripts `<date>_<slug>.sql` (**PROPOSED**, the person with rights runs them
   — never executed on an outside source on your own) · private queries `check_*.sql`. Real data →
   `data/<case_name>/` (gitignore, **mirrored with the SAME NAME**, split into 3 stages by slots `Data_132_01Raw`…`Data_134_03Output`). Each stage
   folder is created when its first file arrives (`Data_131_Case`).
4. Update the INDEX `content/README.md`; a new metric (if any) → the data dictionary in `02_STRUCTURE`;
   a long defect/spec (if any) → `docs/plan/`. These three are **the 3 exceptions** allowed to sit outside the
   case folder.

**Owner and moving a case.**
- The owner-code prefix on a case name is the owner, not reconsidered: moving work between repos takes exactly the folders carrying
  that department's prefix, without opening the content to judge again.
- Attaching a code for the FIRST time (or the current code declares itself temporary): the owning department is the department that ORDERED it — the side raising
  the need and accountable for the work handed out. The RECEIVER does not decide the owner. Whose business the content talks about is never a basis.
  Three different questions, not mixed; the ordering clause opens no way to reconsider a prefix attached officially.
- Moving is cutting, not copying: the original disappears in the same turn (case + `data/<case>/`), the INDEX on the other side records the move, every reference
  to the old path is fixed — two live copies is a forbidden state. Exception: a shared `.sql` file or script is COPIED, so the other side still
  runs.
- A move keeps the name. Renaming a case declares the old name in `spec.md` (`reference/naming.md` §3).

## CLOSING a case

Sync the whole spec in the same turn, not just flip the status mark: `reference/spec-block.md` §Closing a case.


Change the Status → `🟢 CLOSED <date>` + write **why it was closed** (patched / decided not to fix /
not a defect). **Open work must NOT be deleted** — turn it into *"parked proposals"* with the
condition to pull them out again. ⚠ Work **not finished and outside the case's scope** is marked clearly **"NOT closed
 with it"** and pushed to `04_TODO` — closing a case must not swallow work still owed.

## REOPENING

Read `§Reopen the case when` first — it already records the signs to watch for. Change the Status back to
`🟡 OPEN`, **append new findings at the END** (do NOT edit/delete old findings — they are the historical record),
state clearly where this time differs from the last.

## No drafts

- Edit the real file directly (report · task · spec); the safety point is git — commit the current state BEFORE editing. Do not copy a report,
  folder or file out as a copy "to try", inside or outside the repo, without the requester's consent.
- No draft of any kind in the repo: folders `_sbx_*` · `_tmp*` · `*_check` · `*_test` · `*_copy` · files `*_draft.*` · copies of a report ·
  self-built sample reports. `data/` holds only `data/<case>/` · `data/extract/` · `data/adhoc/` (+ `data/logs/` of machine-run tasks).
- A tool that MUST have a copy ⇒ ask the requester first; the copy goes in a SHORT folder at the drive root, outside every repo, deleted when the run ends.
  Do not use `%TEMP%` for reports: PBIR paths exceed MAX_PATH, Desktop and `tar` cut files silently.
- A run's drafts in `02_processing/` are the pipeline's intermediate files, not hand drafts.

## Invariant

Opening exactly **1 folder** must show everything: *what is known · what was patched · what is still owed*.
Finding a case's file lost in another slot → bring it back (`git mv`), except the 3 exceptions above.
