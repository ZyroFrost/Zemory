---
id: Rule_34
aka: 02-34
name: docs-follow-change
version: 7
kind: judgment
code: 01_Harness
---
# Rule_Gate_34_DocsFollowChange — Docs change in the same change as the thing they describe

## What
When something changes, every doc that describes it changes in the same change. A doc that is wrong is worse than a doc that is
missing, because people trust it.

## When
- A change touches something a doc describes: code, a report, a task, a structure, a design, a guide shown in the product.

## Do
1. In the same change, update every doc that describes the thing: the plan when a design changes, `05_CHANGES` once the change is
   confirmed, `04_TODO` under `Rule_Gate_38_TodoDoor`, the guide shown in the product.
2. Edit the `.md` file itself, in its right role; a search index (if any) is rebuilt from the files, never written back.
3. The repo's harness copy is not the repo's doc to edit: a change to a law, slot or skill goes through
   `Rule_Gate_83_HarnessFromStore`.
4. End of session: go through the list in `Skill_Harness_SessionClose`.

## Example
- Situation: a report app has a "Guide" page listing the kinds of alerts; the agent just removed one kind in the code.
- ✗ Wrong: change only the code; the guide still says "9 kinds", people look for the one that is gone and think the app is broken.
- ✓ Right: in the same change, update the guide page and write the changelog entry.

## Check
- conform reds a folder tree that differs from the repo's assembled structure; the other points are judgment.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_SessionClose` — the end-of-session checklist · bảng soát cuối phiên
- Related · Liên quan: `Rule_Gate_38_TodoDoor` — the TODO ledger · sổ việc
- Related · Liên quan: `Rule_Gate_83_HarnessFromStore` — the harness copy is not edited in the repo · bản harness không sửa trong repo
