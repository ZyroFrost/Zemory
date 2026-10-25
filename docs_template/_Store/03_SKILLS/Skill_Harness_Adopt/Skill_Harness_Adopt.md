---
id: Skill_Harness_Adopt
aka: adopt
name: harness-adopt
version: 7
type: process
description: Nhận một repo CÓ SẴN cấu trúc riêng vào harness mà KHÔNG nắn repo — đọc cây thật, đề xuất bảng ánh xạ slot, chờ người duyệt, rồi khoá vào .harness.json. Dùng khi repo là của bên thứ ba / làm nhóm / có CI-import khoá cứng theo tên folder, hoặc khi `conform` báo cấu trúc gốc đã đổi.
---

# Taking in an existing repo (the ADAPT system)

We bend **the harness to the repo**, we do NOT bend the repo. The result of this procedure is **a mapping table
approved by a person and locked** — only from then does `conform` have something to guard.

## ⛔ Three things that break the whole system — read first

1. **Do NOT rename / move / delete any folder of the repo.** Seeing an "ugly" structure → write it into
   `04_TODO`, do not fix it yourself. Renaming a folder breaks imports, CI, pre-commit, and other people's
   documents.
2. **Do NOT lock the table without an approver.** If the standard bends itself to whatever it sees,
   `conform` becomes circular talk — always green, guarding nothing. The approval step IS what turns a
   description into a gate.
3. **Do NOT force a folder into a "nearly right" slot.** No match → put it in `extra`. A wrong mapping is
   worse than no mapping: it makes later agents fix the wrong place and believe they followed the standard.

## Step 1 — ASK: APP or NON-APP?

**DO NOT guess.** The ADAPT system drops only the *forcing of folder names*; it does NOT drop the profile question.

- **APP** — has RUNNING code you develop (UI / server / CLI). Apply the APP system's rules (with UI rules).
- **NON-APP** — a product / asset; the agent only reads · searches · pulls · fills · exports FILES. **0 UI rules**,
  replaced by deliverable / tasks / data rules.

A hybrid repo (with both a research pipeline and an intent to build an app) is **the easiest place to guess wrong** — all the more reason to
ask. Ask one question, wait for the answer, then go on.

## Step 2 — READ the REAL folder tree

Only **level 1 and level 2**. Do not read file contents — recognise roles by name + a few cheap signs:

- a package declaration file at the root (`package.json` · `pyproject.toml` · `go.mod` · `pom.xml`…) → tells the language
- `.github/` · CI config · pre-commit → **hard-locked paths, never touch**
- `.md` files at the root → the repo's own documents, **must not be overwritten**

Write that tree down as it is before interpreting it. A wrong interpretation can still be walked back.

## Step 3 — PROPOSE the mapping table, print it for approval

Print all three parts, unshortened:

```
PROPOSED MAPPING TABLE — not locked, awaiting approval

slot            →  real path        why
<slot>          →  <path/>          <one sentence>
…

extra (the repo has it, the dictionary does not — kept as is):
<path/>        <what it is>          <why it fits no slot>

the harness will ADD (only these paths, nothing else touched):
AGENTS.md · CLAUDE.md · <docs-dir>/agent/ · <docs-dir>/plan/ · .claude/skills/
```

**Handling name clashes** — before printing, check each harness path:

| situation | handling |
|---|---|
| the repo already has `docs/` with its own content | still use `docs/agent/` + `docs/plan/` (subfolders, existing files untouched) — but **say so clearly in the proposal** |
| the repo already has `docs/agent/` or `docs/plan/` | **change the harness path** through `.harness.json` → `"docs": "docs/<other-name>"`. Do NOT overwrite |
| the repo already has `AGENTS.md` / `CLAUDE.md` | **STOP, ask before going on.** This is another agent's signpost file — overwriting it is seizing the navigation |
| the repo already has `.claude/skills/<same name>` | keep the repo's, report it, **do not overwrite** |

**State what you are NOT sure of too.** Folders with vague names (`common/` `misc/` `tmp/` `old/`) → put them in
`extra` with a question mark, for the approver to decide. Guessing and then locking is the surest way to be wrong for a long time.

## Step 4 — Wait for APPROVAL, only then LOCK

Only with approval:

1. Write `docs/.harness.json`:
```jsonc
{
  "profile": "app",            // or "nonapp" — by step 1
  "layout": "foreign",         // REQUIRED: tells conform this is a repo with its own structure
  "docs": "docs/agent",        // change on a clash
  "slots": { "<slot>": "<real/path>" },
  "extra": ["<path/>"]
}
```
2. Fill `02_STRUCTURE/INDEX.md`: the real table + **lock date** + **approver's name**. Remove every template frame.
3. Write one entry in `05_CHANGES`: when the repo was taken in, which profile, how it was mapped, **and the places
   still uncertain**.
4. Run `zemory conform` — it must be green. Red at this moment means the table is wrong; fix the table, do not loosen the gate.

## Later — the original structure changes, `conform` goes red

That is **good news**: someone else's repo will change, and the gate reports it at the right moment. Handling: read the tree again →
update `02_STRUCTURE/INDEX.md` + `.harness.json` → write one `05_CHANGES` line saying how the original structure changed.

**Do not switch the gate off. Do not loosen the table to stop the red.** Loosen it once and from then on the gate means nothing.
