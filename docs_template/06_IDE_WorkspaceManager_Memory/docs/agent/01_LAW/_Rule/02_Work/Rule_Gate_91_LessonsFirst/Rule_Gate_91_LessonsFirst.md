---
id: Rule_91
aka: 02-91
name: lessons-first
version: 3
kind: action
code: 02_Work
checked: [Rule_Gate_01_DoneMeansRun, Rule_Keys_11_VerifyClaims, Rule_Gate_34_DocsFollowChange]
from: _Store/01_LAW/_Rule/02_Work/Rule_Gate_91_LessonsFirst @v3 #cf9590ec079d
---
# Rule_Gate_91_LessonsFirst — A fix is done when its lesson is written

Why a law of its own: `Rule_Gate_01_DoneMeansRun` asks that the fix ran, `Rule_Keys_11_VerifyClaims` that the claim was measured,
`Rule_Gate_34_DocsFollowChange` that the documents follow; none asks whether the same fault can come back through the next piece
of code. That question, and the place its answer is kept, is this law.

## What
A fault whose cause is how code is written or how the system is run is done only when its lesson is in the repo's ledger
(`Cons_Gate_17_LessonsLedger`), with a machine check wherever a machine can see the fault, and the changelog entry of the fix names
that lesson. A fault that new code cannot bring back (a one-off bad record, an outage outside the repo) needs no lesson; the entry
says why.

## When
- A fix is about to be called done.
- A changelog entry about a fault, an incident or a regression is written.
- New code is written in an area the ledger covers.

## Do
1. Ask: can new code, a new job or new data make this fault again? Yes ⇒ it needs a lesson.
2. Add `L-<n>` to the ledger in the same turn as the fix: incident with numbers · kind of mistake · rule for new code · check ·
   where it was fixed.
3. Give it the strongest check that works: a `static` pattern run in the repo's gate · a `runtime` test · `judgment` keywords.
   Only a `judgment` lesson rests on a reader alone.
4. The changelog entry of the fix names `L-<n>`, or carries the line `không có bài học: <lý do>` (`no lesson: <reason>`).
5. Before writing new code in an area, read the ledger's lessons for that area.

## Example
- Situation: the lock of an audit job was split off because it held a lane for 25 minutes, but it still covered the read from
  another server; at 04:00 the lane waited 686 seconds.
- ✗ Wrong: narrow this lock, write "lock narrowed" in the changelog; the next job copies the old lock shape.
- ✓ Right: `L-12 — a lock never covers a read from another server`, check `static`: a pattern finds a remote read inside the lock
  block and reds the gate; the changelog entry says `L-12`.

## Check
- The guard blocks a new changelog entry that reports a fix and names no lesson, in a repo that carries the ledger frame. A fix
  is a fix word (`sửa lỗi` · `fix` · `bug` · `sự cố` · `incident` · `regression` · `hồi quy`), or a line written as *fault ⇒
  what was done* (a fault word such as `lỗi` · `hỏng` · `lệch` · `thiếu` · `trễ` · `hở` · `timeout`, and the arrow `⇒`). A lesson
  is named by `L-<n>` (`L-7` · `L-007`, or `L007` of a ledger numbered before the frame), or by the line `không có bài học:` /
  `no lesson:`.
- `conform` (frame `Cons_Gate_17_LessonsLedger`) reds a missing, unwritten or template ledger.

## Links · Liên kết
- Related · Liên quan: `Cons_Gate_17_LessonsLedger` — the ledger this law writes into · sổ mà luật này ghi vào
- Related · Liên quan: `Skill_Harness_SessionClose` — the changelog step asks for the lesson · bước changelog hỏi bài học
- Related · Liên quan: `Skill_Harness_SyncPath` — a fix found on the way gets its lesson before done · lỗi gặp trên đường phải có bài học trước khi xong
