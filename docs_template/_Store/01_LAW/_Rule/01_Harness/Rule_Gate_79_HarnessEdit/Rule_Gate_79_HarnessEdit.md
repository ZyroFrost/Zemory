---
id: Rule_79
name: harness-edit
version: 7
kind: action
code: 01_Harness
---
# Rule_Gate_79_HarnessEdit — Changing HS needs the requester's approval; a law whose breach cannot be undone needs a machine check

## What
HS (`docs_template/_Store`) and the harness files no other law covers (`docs/plan/`, `AGENTS.md`, `CLAUDE.md`) change only when
the requester has approved that very change in the session. This holds for the session of every repo, not the zemory one alone:
a repo changes a shared part on HS itself (`Rule_Gate_83_HarnessFromStore` step 3a), and asks first. Inside a repo, the four
harness folders follow `Rule_Gate_83_HarnessFromStore`: the repo never changes its copies.

## When
- An agent is about to create, edit, delete or move anything in HS, in `docs/plan/`, or in `AGENTS.md` / `CLAUDE.md`.
- A new law is written whose breach cannot be undone.

## Do
1. Change those files only after the requester approved that exact change in this session.
2. Never create, merge, retire or renumber a law, article, slot, skill, shelf or layer on your own; ask one question with a
   proposal, and do not park the proposal in a ledger to wait.
3. A sentence an agent wrote into a plan or a law is not the requester's decision; never use it as the ground for another change.
4. A law whose breach cannot be undone (a secret in a commit, a write to a forbidden path, an unrequested push) gets a machine
   check that blocks it when it happens; text alone is not enough. How to choose and build the check: `Skill_Harness_RuleGate`.

## Example
- Situation: an agent thinks HS "should" have one more shelf for a set's starter files.
- ✗ Wrong: create the shelf, move a few laws into the archive for tidiness, note the reason in the plan, then report it as done
  "according to the plan".
- ✓ Right: try the parts that exist first; still needed ⇒ propose and wait; change HS only once the requester approved that change.

## Check
- The guard blocks every write into HS and the other harness files above without the one-use flag `.allow-docs-write`; the
  flag is created only when the requester has approved.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_RuleGate` — choosing and building a machine check · chọn và dựng chốt máy
- Related · Liên quan: `Rule_Gate_83_HarnessFromStore` — the repo side of the harness · phía repo của harness
- Related · Liên quan: `Rule_Keys_61_HookSafetyNet` — a flag allows one approved change only · một cờ chỉ cho qua đúng một việc đã duyệt
