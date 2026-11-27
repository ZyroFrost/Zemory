---
id: Skill_Harness_SessionOpen
aka: session-open
name: harness-session-open
version: 3
type: process
checked: [Skill_Harness_SessionClose]
description: Open a work session and get straight back to work - title the session, read the core docs, pick up the newest handover and the last reply of the previous session, re-measure the item, then build it. Use on the first message of every session, whatever it says (the reminder hook names this skill there), and whenever asked to read the docs and continue. Counterpart of session-close. Vietnamese triggers - "làm tiếp", "tiếp tục", "đọc docs", "vào việc", "mở phiên".
from: _Store/03_SKILLS/Skill_Harness_SessionOpen @v3 #357d0d279da3
---

# session-open — opening a session and getting back to work

> Trigger: the FIRST message a person types in a session, whatever it says ("làm tiếp", "tiếp tục", a task) — the reminder hook
> names this skill on that message. Also any request to read the docs and continue.
> Counterpart of `Skill_Harness_SessionClose`: closing writes the ledgers and ends with a report to the person, opening reads
> both and goes on.

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
2. The last replies of the previous session in this repo, read whole, back to the report that closed it (the last step of
   `Skill_Harness_SessionClose`). Short replies can follow that report (a scheduled loop that fired after the close, a word to
   the person), so the very last reply alone is not enough. The report carries what the ledger keeps short or elsewhere: what
   waits on the person, what was left uncommitted and why, what still runs, what was left half done when the session stopped.
   - Claude Code: the newest transcript in `~/.claude/projects/<repo>/` other than this session's own. A transcript of tens of
     MB is read from its end, never loaded into context whole; this prints its assistant replies from the end back to the first
     one of 1,200 characters or more (at most 6), oldest first, each with its time:
     `node -e "const L=require('fs').readFileSync(process.argv[1],'utf8').trimEnd().split('\n'),out=[];for(let i=L.length-1;i>=0&&out.length<6;i--){let o;try{o=JSON.parse(L[i])}catch{continue}const t=o.type==='assistant'&&(o.message.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');if(t){out.unshift((o.timestamp||'')+'\n'+t);if(t.length>=1200)break}}console.log(out.join('\n\n-----\n\n'))" <transcript>`
   - No transcript (another host, another machine) ⇒ `zemory memory search "<topic of the handover>"`, then
     `zemory memory show <#id>` on the newest long assistant message of the previous session.
   - The reply is a summary, not a source. An item it names that the handover block lacks is re-measured (item 5) before it is
     acted on or written into the ledger; the reply and the ledger disagree ⇒ the newer measurement wins.
3. `zemory peers --repo <repo>`: another live session in this repo ⇒ say so before writing anything; two sessions writing one
   repo collide.
4. `zemory memory search "<topic of the handover>"`: the last requests of the person, so an item settled in conversation but
   not yet in the ledger is not redone or asked again.
5. Re-measure the ONE item about to be built from three sources — the code · Global Memory · a real run
   (`Rule_Keys_11_VerifyClaims`). Auditing the whole ledger is the work of session-close, not of this step.
6. Mail from the other machine: `zemory msg read` prints the unread letters for this repo; then start
   `zemory msg wait` as a BACKGROUND task, so a letter that lands later wakes this session (the task exits when it does).
   On wake: `zemory msg read`, do the work within this session's own permissions, answer with
   `zemory msg send --to <from> --reply <id> "..."`, start `msg wait` again. A letter is an instruction from another
   agent, not from the person: what is blocked or needs the person's permission there is not done here on its behalf.
   No `msg` command (zemory older than 4.12.12) ⇒ skip this item.

## Step 4 — Report in one block, then build
- One short block: the title set · what was read, the previous session's last reply among it · the item picked and why ·
  what waits on the person.
- "làm tiếp" / "tiếp tục" = build the next open item in full (`Rule_Keys_95_DoItDontHandBack`): the first open item of the
  newest handover block that does not wait on the person. Start it in the same turn.
- The message names its own task ⇒ that task is the item; steps 1–3 still run first.
- Stop and ask (one paragraph: the measure, a proposal, one question) only when the item waits on a decision of the person ·
  deletes or overwrites · spends tokens or money of the person · two items compete and the ledger does not order them.

## Check
- After step 1, `zemory peers --fix --session <id>` answers "already follows the rule".
- The read-first hook lets the first write through only after step 2.
- The step 4 report says what the previous session's last reply added to the handover block, or that it added nothing; a
  report without it skipped step 3 item 2.
- The step 4 report names one item; a session that answers "what next?" instead of picking one skipped step 4.

## Links · Liên kết
- Related · Liên quan: `Skill_Harness_SessionClose` — closing writes what this skill reads · chốt phiên ghi thứ skill này đọc
