---
id: Rule_38
aka: 02-38
name: todo-door
version: 13
kind: action
code: 01_Harness
from: _Store/01_LAW/_Rule/01_Harness/Rule_Gate_38_TodoDoor @v13 #aed92a87d715
---
# Rule_Gate_38_TodoDoor — The TODO ledger: the way in and the way out

## What
`04_TODO` holds only work that cannot be done right now. An agent never adds an item on its own: it asks first. A finished item
leaves the ledger in the same turn. This is the only law about the TODO ledger; other files point here.

## When
- An agent is about to add an item to `04_TODO`.
- An item in `04_TODO` is finished.

## Do
1. Work within reach ⇒ do it now and write `05_CHANGES`; do not park it in `04_TODO`.
2. Want a new item? Ask one question with the proposal; write it only once approved (then create the flag `.allow-todo`). A
   proposal never waits in the ledger.
3. An item is finished ⇒ in the same turn: measure it again (`Rule_Keys_11_VerifyClaims`), write `05_CHANGES`, remove it from
   `04_TODO` or mark it done for `zemory archive`.
4. Done marks the machine moves: `- [x]` · `- ✅` · `N. [x]` · a heading `## [x]` (the whole block moves when no `[ ]` / `[~]`
   is left inside). Another way of writing "done" is invisible to the machine.
5. `zemory archive` at session close is the last net, not the place to pile up finished items.
6. The block between `<!-- zemory:standard-todo:start` and `<!-- zemory:standard-todo:end -->` is written by `zemory sync` from
   `zemory conform`: what still keeps the repo off its standard. The machine rewrites it every run and removes it once the repo
   is clean. The agent never edits it: it fixes the repo, then runs `zemory sync`.

## Example
- Situation: the manager has just settled a new rule; writing it into the law file takes a few minutes.
- ✗ Wrong: add "put into the law later" to the TODO ledger and report done; the ledger grows and the rule has no effect.
- ✓ Right: do it now (with the approval `Rule_Gate_79_HarnessEdit` asks for), write the changelog; the ledger keeps only work
  that truly cannot be done in time.

## Check
- The guard blocks a new open item in `04_TODO` without the flag `.allow-todo`.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_SessionClose` — closing items and archiving at session end · đóng mục và dời sổ cuối phiên
- Related · Liên quan: `Rule_Keys_11_VerifyClaims` — an item is a claim to measure · mục trong sổ là khẳng định phải đo
