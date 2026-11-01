---
id: Rule_83
name: harness-from-store
version: 13
checked: [Rule_Gate_79_HarnessEdit, Rule_Gate_85_ProposeChecked, Rule_Gate_61_HookSafetyNet]
kind: action
code: 01_Harness
from: _Store/01_LAW/_Rule/01_Harness/Rule_Gate_83_HarnessFromStore @v13 #279f9499e684
---
# Rule_Gate_83_HarnessFromStore — A repo uses its copy of the harness; a shared change is made on HS by the repo that needs it

## What
The harness of a repo — its laws, constitution frames, structure slots and skills — is made in the harness store (HS) of zemory
and copied into the repo. The repo never edits its copy: an edit made there never reaches another repo, and the next sync meets
a copy that differs from HS. A change every repo needs is made on HS itself, by the session of the repo that needs it, once the
requester approves; it is never left for the zemory session to do. The repo fills in the blanks a frame leaves for it.

## When
- An agent working in a repo wants to change a file under `docs/agent/01_LAW`, `docs/agent/02_STRUCTURE`, `docs/agent/03_SKILLS`
  or `.claude/skills`.
- A repo needs a law, slot or skill that is missing, wrong, or different for it.

## Do
1. Daily work reads the repo's own copy of the harness; HS is read when a change is to be made.
2. Fill what a frame leaves blank, in the repo: the `Cons.md` of a constitution frame, a repo skill built on the skill frame
   (`Skill_Own_<Name>`), the values of the marker keys. Never add, remove or rename a section of a frame. Every change to a
   `Cons.md` — a ban, a loosening, a lesson in the ledger — is written out to the requester with the requester's own sentence it
   comes from, and made only once they approve it in the session (one-use flag `.allow-docs-write`); an agent never writes a
   law of its own making into the constitution.
3. Need a change? Find the part on HS first (`Rule_Gate_85_ProposeChecked`), then:
   a. the part is wrong or missing for every repo that uses it ⇒ ask the requester (one question with the change written out,
      `Rule_Gate_79_HarnessEdit`). Approved ⇒ this repo's session, not the zemory session:
      1. edits the part on HS (`docs_template/_Store` in the zemory clone) and raises its `version`;
      2. runs `zemory impact <part>` to list every repo that carries it;
      3. runs `zemory sync` in this repo: it rebuilds every set folder that fell behind HS, then brings this repo up;
      4. runs `zemory sync` in every other repo the impact listed, and messages the sessions open in them
         (`Rule_Gate_89_MessageOnlyWithWork`);
      5. commits the part together with the set folders the sync rebuilt, in the zemory repo.
   b. only this repo needs it different ⇒ a part of its own: an article of its own constitution goes in
      `01_LAW/_Cons/Cons_<Gate|Keys|Core>_1NN_<Name>/` (numbered from 101, no `from:` line); the repo writes it once the requester
      approves the article in the session (one-use flag `.allow-docs-write`). A copy of a shared part is never edited here.
4. A frame that lacks a section the repo needs ⇒ add the section to the frame on HS, as in step 3a.
5. Retiring a part keeps its number and marks it retired; sync carries that state to every repo.
6. The ledgers (`04_TODO.md`, `05_CHANGES.md`) are the repo's memory, not harness: the repo writes them, under
   `Rule_Gate_38_TodoDoor` for new TODO items.
7. The direction of work: a manager may do work for the repos under it; a repo does not hand its own harness work upward.
   zemory is the top manager (it holds HS and the sync), so:
   a. a repo session never asks the zemory session to change a part, a repo's constitution, or to run a sync for it; it does
      step 3a itself;
   b. the zemory session that receives such a request declines it and names the part, file and line the requesting repo
      changes itself. A report of a fault in zemory's code (a check that judges wrong, a command that breaks) is not such a
      request: zemory fixes its code.

## Example
- Situation: the OPS session finds a better step for the skill that builds a report.
- ✗ Wrong: edit `.claude/skills/pbi-white/SKILL.md` in the OPS repo — the other departments never get the step, and the next
  sync meets a copy that differs from HS. Also wrong: send the step to the zemory session and wait for it to change HS.
- ✓ Right: check on HS whether every department building that report needs the step. Yes ⇒ ask the requester; approved ⇒ the
  OPS session adds the step to `Skill_PBI_White` on HS with `version` +1, runs `zemory impact Skill_PBI_White`, runs `zemory sync`
  in OPS (the sets carrying the skill are rebuilt first), then in each department repo the impact listed, messages the open
  department sessions, and commits the skill with the rebuilt sets in zemory.

## Check
- The repo's guard blocks every Write / Edit under the four harness folders, no flag; a fill of a frame keeps the frame's
  sections as they are and passes only with the requester's one-use flag `.allow-docs-write`; an article of the repo's own (`Cons_*_1NN`, no `from:`) passes with the requester's one-use flag
  `.allow-docs-write`. A write into HS needs that flag too (`Rule_Gate_79_HarnessEdit`).
- conform `harness-edited-here`: a copy that differs from what was assembled is red.
- The send guard (`zemory hook send-guard`, on `SendMessage`) blocks a message to the zemory session that asks it to change a
  part or to sync: a part name (`Rule_` · `Cons_` · `Skill_` · `Struc_` · a slot `Xxx_NNN_Name` · `HS`) together with a word of
  change (sửa · đổi · thêm · bỏ · gộp · cập nhật · edit · change · add · remove · merge · update), or a sync asked of it (sync
  giùm / hộ / giúp · nhờ sync). Blocked: `Cần Zemory: sửa Skill_Task_Case…`. Passed: `Cần Zemory: conform báo sai ở
  case-checks.ts`, a reply by `uds:` address, every message the zemory session sends down.
- `zemory impact <part>` lists every repo carrying the part and its state (`current` · `behind` · `edited` · `absent`); exit 1
  while a copy is edited in a repo.
- `zemory sync` rebuilds every set folder behind HS before it assembles the repo, and says which; the gate's "every set folder
  is up to date with the store" is red while a set is behind.
- Two syncs never write one folder at once: the set rebuild and each repo pass hold a lock in `.harness-state/`; a sync that
  meets another one writing waits, then stops and names the holder, writing nothing.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_Reshape` — applying HS to a repo · áp HS xuống một repo
- Related · Liên quan: `Rule_Gate_85_ProposeChecked` — searching HS before changing it · dò HS trước khi sửa
- Related · Liên quan: `Rule_Gate_79_HarnessEdit` — changing HS itself needs the requester's approval · sửa chính HS cần người dùng cho phép
- Related · Liên quan: `Rule_Gate_89_MessageOnlyWithWork` — messaging the repos that must sync · nhắn các repo phải sync
