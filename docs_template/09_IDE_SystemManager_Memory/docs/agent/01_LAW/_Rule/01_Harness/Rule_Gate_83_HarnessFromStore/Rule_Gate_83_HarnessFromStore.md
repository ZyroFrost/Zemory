---
id: Rule_83
name: harness-from-store
version: 9
kind: action
code: 01_Harness
from: _Store/01_LAW/_Rule/01_Harness/Rule_Gate_83_HarnessFromStore @v9 #49f06cb69c60
---
# Rule_Gate_83_HarnessFromStore — A repo uses the harness, it does not own it

## What
The harness of a repo — its laws, constitution frames, structure slots and skills — is made in the harness store (HS) of zemory
and copied into the repo. The repo uses its copy; it never changes it. The repo only fills in the blanks a frame leaves for it.

## When
- An agent working in a repo wants to change a file under `docs/agent/01_LAW`, `docs/agent/02_STRUCTURE`, `docs/agent/03_SKILLS`
  or `.claude/skills`.
- A repo needs a law, slot or skill that is missing, wrong, or different for it.

## Do
1. Daily work reads the repo's own copy of the harness; HS is read only when a change is to be proposed.
2. Fill what a frame leaves blank, in the repo: the `Cons.md` of a constitution frame, a repo skill built on the skill frame
   (`Skill_Own_<Name>`), the values of the marker keys. Never add, remove or rename a section of a frame.
3. Need a change? Find the part on HS first (`Rule_Gate_85_ProposeChecked`), then propose it to the requester:
   a. the part is wrong or missing for every repo that uses it ⇒ propose fixing the shared part on HS; zemory runs
      `zemory impact <part>`, the requester approves, zemory changes HS and syncs it down to every repo;
   b. only this repo needs it different ⇒ a part of its own: an article of its own constitution goes in
      `01_LAW/_Cons/Cons_<Gate|Keys|Core>_1NN_<Name>/` (numbered from 101, no `from:` line); the repo writes it once the requester
      approves the article in the session (one-use flag `.allow-docs-write`). A copy of a shared part is never edited here.
4. A frame that lacks a section the repo needs ⇒ propose adding the section to the frame on HS (as in step 3).
5. Retiring a part keeps its number and marks it retired; sync carries that state to every repo.
6. The ledgers (`04_TODO.md`, `05_CHANGES.md`) are the repo's memory, not harness: the repo writes them, under
   `Rule_Gate_38_TodoDoor` for new TODO items.

## Example
- Situation: the OPS session finds a better step for the skill that builds a report.
- ✗ Wrong: edit `.claude/skills/pbi-white/SKILL.md` in the OPS repo. The other departments never get the step, and the next sync
  meets a copy that differs from HS.
- ✓ Right: check on HS whether every department building that report needs the step. Yes ⇒ send the proposal to the zemory
  session; zemory runs `zemory impact Skill_PBI_White`, adds the step to the skill on HS once the requester approves, and syncs it to
  every repo.

## Check
- The repo's guard blocks every Write / Edit under the four harness folders, no flag; a fill of a frame passes when the frame's
  sections stay as they are; an article of the repo's own (`Cons_*_1NN`, no `from:`) passes with the requester's one-use flag
  `.allow-docs-write`. The zemory repo, which holds HS, is not blocked.
- conform `harness-edited-here`: a copy that differs from what was assembled is red.
- `zemory impact <part>` lists every repo carrying the part and its state (`current` · `behind` · `edited` · `absent`); exit 1
  while a copy is edited in a repo.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_Reshape` — applying HS to a repo · áp HS xuống một repo
- Related · Liên quan: `Rule_Gate_85_ProposeChecked` — searching HS before proposing · dò HS trước khi đề xuất
- Related · Liên quan: `Rule_Gate_79_HarnessEdit` — changing HS itself needs the requester's approval · sửa chính HS cần người dùng cho phép
