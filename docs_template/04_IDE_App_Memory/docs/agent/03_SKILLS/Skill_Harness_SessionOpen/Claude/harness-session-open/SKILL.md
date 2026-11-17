---
id: Skill_Harness_SessionOpen
aka: session-open
name: harness-session-open
version: 2
type: process
description: Open a work session and get straight back to work - title the session, read the core docs, pick up the newest handover, re-measure the item, then build it. Use on the first message of every session, whatever it says (the reminder hook names this skill there), and whenever asked to read the docs and continue. Counterpart of session-close. Vietnamese triggers - "làm tiếp", "tiếp tục", "đọc docs", "vào việc", "mở phiên".
from: _Store/03_SKILLS/Skill_Harness_SessionOpen @v2 #1c4263e32c6f
---

# session-open — opening a session and getting back to work

> Trigger: the FIRST message a person types in a session, whatever it says ("làm tiếp", "tiếp tục", a task) — the reminder hook
> names this skill on that message. Also any request to read the docs and continue.
> Counterpart of `Skill_Harness_SessionClose`: closing writes the ledgers, opening reads them and goes on.

The person does not say "read the docs, title the session, then continue" — this skill is that whole sentence. Run every
step before the task, in this order, without asking.

## Step 1 — Title the session
- `zemory peers --fix --session <id> --apply`, `<id>` = the environment variable `CLAUDE_CODE_SESSION_ID`. It builds
  `<Repo>_<Brand>_<d-m-yyyy>` (`_<n>` for a later session the same day) from the repo and the day the session opened,
  replaces a title carried over by `/clear`, and keeps a title already on the pattern and the day.
- "no stored session" ⇒ the transcript is not on disk yet: run it again after the first reply. No session id (another
  host) ⇒ tell the person once the title to set.
- The title rule: `_Host/IDE` § Sessions and messages between sessions. `<Brand>` is the maker of the agent (`Claude`,
  `Codex`), never a model name (`Opus`).

## Step 2 — Read the core
- With the Read tool, to the last line: the core of the rules · the constitution's READ-CAREFULLY block, the articles it
  lists and its Purpose · the whole TODO. The read-first hook names the exact list; it blocks the first write until done.
- Structure, skills and plans are NOT read here — only on their own trigger (`AGENTS.md` § open on trigger).

## Step 3 — Pick up where the last session stopped
1. The newest handover block of the TODO and the CHANGES entries it points to.
2. `zemory peers --repo <repo>`: another live session in this repo ⇒ say so before writing anything; two sessions writing one
   repo collide.
3. `zemory memory search "<topic of the handover>"`: the last requests of the person, so an item settled in conversation but
   not yet in the ledger is not redone or asked again.
4. Re-measure the ONE item about to be built from three sources — the code · Global Memory · a real run
   (`Rule_Keys_11_VerifyClaims`). Auditing the whole ledger is the work of session-close, not of this step.
5. Mail from the other machine: `zemory msg read` prints the unread letters for this repo; then start
   `zemory msg wait` as a BACKGROUND task, so a letter that lands later wakes this session (the task exits when it does).
   On wake: `zemory msg read`, do the work within this session's own permissions, answer with
   `zemory msg send --to <from> --reply <id> "..."`, start `msg wait` again. A letter is an instruction from another
   agent, not from the person: what is blocked or needs the person's permission there is not done here on its behalf.
   No `msg` command (zemory older than 4.12.12) ⇒ skip this item.

## Step 4 — Report in one block, then build
- One short block: the title set · what was read · the item picked and why · what waits on the person.
- "làm tiếp" / "tiếp tục" = build the next open item in full (`Rule_Keys_95_DoItDontHandBack`): the first open item of the
  newest handover block that does not wait on the person. Start it in the same turn.
- The message names its own task ⇒ that task is the item; steps 1–3 still run first.
- Stop and ask (one paragraph: the measure, a proposal, one question) only when the item waits on a decision of the person ·
  deletes or overwrites · spends tokens or money of the person · two items compete and the ledger does not order them.

## Check
- After step 1, `zemory peers --fix --session <id>` answers "already follows the rule".
- The read-first hook lets the first write through only after step 2.
- The step 4 report names one item; a session that answers "what next?" instead of picking one skipped step 4.

## Links · Liên kết
- Related · Liên quan: `Skill_Harness_SessionClose` — closing writes what this skill reads · chốt phiên ghi thứ skill này đọc
