---
id: Skill_Dev_Release
name: dev-release
version: 4
type: process
description: Release a build of an app - pick the version number, read the version that is running, check the tree before pushing, and push with the bump in the same commit. Use whenever a build is about to be pushed or packaged, or a release, publish, bump or deploy is asked for. Vietnamese triggers - "lên version", "phát hành", "đóng gói", "đẩy bản mới", "push bản build".
from: _Store/03_SKILLS/Skill_Dev_Release @v4 #d93068b215eb
---

# dev-release — releasing a build

> Applies when the batch being pushed carries a build (touches `backend/` · `frontend/` · the version file). The right to push still follows
> `Rule_Gate_50_Git`: push only when the request carries a push order.

## 1. Checks before pushing

- Run the repo's gate or lint; red ⇒ stop.
- `git status` lets no real data or secret slip in (`Rule_Gate_21_WhatEntersGit`).
- Go through `04_TODO`: items this batch finished are closed by `Rule_Gate_38_TodoDoor`.

## 2. Choosing the number

- Each release carrying a build is a new number; never release again under an old number, two builds on the same day are two numbers. Other
  machines decide whether to update by comparing numbers: two different builds with the same number ⇒ a machine already on that number does not see the new build.
- The new number is greater than the number running at the real release place: read that number before setting it (the shared folder · the release page ·
  the version file of the running build); unreadable ⇒ ask, never add from memory.
- Choose the column by the work requested, not by the amount of code changed:

| Column | When |
|---|---|
| 1 (major) | touches the structure, or adds a very large feature |
| 2 (minor) | adds or extends a feature |
| 3 (patch) | fixes a bug of an existing feature |

- A run of patches pushed back to back in one batch ⇒ one number for all.
- A batch touching only docs ⇒ push without raising the number: docs produce no build, raising the number announces a new build when there is none.

## 3. Pushing

- Raise the number in the version file (`package.json` · `pyproject.toml` · the platform's file) + commit + push at the same point.
- A fix that only needs to take effect on the machine running it ⇒ rebuilding is enough, no push needed.
- Still ask first: force-push · deleting a tag or branch on the remote.
- Machine check: a guard compares the number in `package.json` with the released number (Node repos); a repo using another version file has no machine
  check yet ⇒ checked by hand in step 2.
