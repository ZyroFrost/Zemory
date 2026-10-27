---
id: Skill_Harness_SessionClose
aka: session-close
name: harness-session-close
version: 20
type: process
description: Close out a work session correctly - route everything that happened into the right file so the next session can pick up where this one stopped. Use when asked to write things down, log progress, wrap up, or when the context is running out or the session is about to switch. Vietnamese triggers - "note lại", "docs lại", "ghi sổ", "chốt phiên", "sắp hết context", "đổi session", "mở phiên mới", "tổng kết lại".
from: _Store/03_SKILLS/Skill_Harness_SessionClose @v20 #3d1c2cc926ca
---

# session-close — closing a session / writing the ledgers

> Trigger (a hard rule, `Rule_Keys_11_VerifyClaims`): a request to "note it down" · "write the docs" · "write the ledger" ·
> "close the session" · "context running out / switching session / opening a new session" — or any wording that means
> **closing this session's books so the next session can read on**.

**NEVER write docs from a summarised memory.** Writing from a summary = losing detail, and what is lost is always
what the next session needs most.

**Global Memory is the session's REAL SOURCE — the memory in context is NOT.** When the context is summarised/
trimmed, the session's details are still WHOLE in episodic memory (the DB); what you "remember" in context has been
cut. This is the ROOT of "switching sessions loses/skews things". So **every time you write docs / audit / report — above
all when SWITCHING SESSION — you MUST search Global Memory + compare with the REAL code / deliverable / pipeline / files
to verify BEFORE asserting anything.**

> **No `zemory` CLI** (no Global Memory): re-reading the current session is the only source — all the more reason to
> write early, do not let it drift. The `zemory …` steps below are done by hand following the rule that comes with them.

## Step 0 — SEARCH GLOBAL MEMORY + VERIFY (required, NOT skipped, done BEFORE Step 1)

0. **`zemory memory scan` BEFORE `digest`** — the RUNNING session is not in GM until it is scanned;
   skipping this makes `digest` return partial/empty and the start of the session already compressed out of context is lost for good.
   Scanned and GM still lacks it ⇒ read the session's original transcript directly (Claude Code:
   `~/.claude/projects/<repo>/<session>.jsonl`). *Measured: skipping this step, a decision settled mid-session
   fell out, the ledger kept only words from a few minutes earlier — words that very decision had replaced.*
1. `zemory memory digest <session>` + `zemory memory search "<session topic>" [--all]` → rebuild the FULL
   work/changes/decisions/errors of the session, including the parts that drifted out of context.
2. **Verify each item about to go into docs against the REAL SOURCE** = GM (what was really done/said/decided) +
   the REAL code / deliverable / measure / pipeline / files (re-read the relevant lines/places). Only items that SURVIVE
   verification get written; an unverified claim = NOT written.
3. **CHECKING `04_TODO` = MEASURING AGAIN, NOT reading and copying** (`Rule_Keys_11_VerifyClaims`, a rule applying **AT ALL TIMES** —
   closing a session is only one case; it fires too when mid-session someone says *"check the todo"* · *"what is still not
   done"*): each item is **A CLAIM ABOUT STATE**, and a claim must trace back to a checkable source
   — the `.md` file is the source of the CONTENT, **not the source of the truth**. **THREE SOURCES, run ALL
   THREE for EVERY item — never pick the source by the kind of item**:
   ① **code / source** (grep/count · open the file/figures and count) ·
   ② **Global Memory / decision history** (`memory search --all`, filter messages in the `user` role — decisions
   often sit in another session, even **another repo**; with no CLI read `archive/`) ·
   ③ **a real run** (call the endpoint · query the live source · open the app and look · read the log of the running process ·
   open the handed-out copy itself and look with your own eyes · refresh the data and compare figures).
   Conclude only when **all three agree**; they differ ⇒ **the newer one wins** (a decision HAS AN EXPIRY, it can be
   superseded by the work done after it). A source that cannot be reached ⇒ write "not verifiable" with the sources
   tried, do NOT default to "not done", do NOT take the other 2 sources as enough. **An item untouched for more than 7 days
   = SUSPECT.** **Asking again about something settled is an ERROR**, not caution. *Measured: checking 58 items found
   11 wrong (~19%)* — items already built still carrying `[ ]`, items the agent made up after seeing a symptom and declaring a cause.
3b. **CHECK THE WHOLE LEDGER, NOT ONLY THE NEWEST BLOCK.** Every block — including the handover blocks of earlier sessions
   ("▶ NEXT SESSION READ FIRST…") and blocks weeks old — each item compared with `05_CHANGES` +
   `archive/05_CHANGES` (`zemory changelog search`) and GM (`zemory memory search --all`, filter messages in the `user`
   role). Done ⇒ **mark it in EXACTLY the form the machine picks up** (Step 3); the whole block done ⇒ change its title to
   `## [x] …`. A handover block of an earlier session: the session RECEIVING it closes it once checked — still-open items move to
   the NEW handover block, the old block becomes `## [x]` (by hand: move it into the archive) — handover blocks never pile
   on each other. *Measured: one ledger of 1,328 lines carried more than 10 handover blocks nobody had closed.*
4. **Apply it ALSO to audits / bug reports:** every finding must be compared with the REAL code/files + GM before being called
   "a real bug" — most false positives come from reading code without context or not knowing a historical
   decision. A typical trap: an old file name in an OLD changelog entry is **A HISTORICAL RECORD**, NOT a
   broken link to fix (fixing it = breaking the supersede rule); an English string (the original language) can be **a technical
   term KEPT AS IS**, NOT an i18n leak; figures in an old report can be a snapshot
   right at that moment. Do NOT trust a subagent's result you have not checked again yourself.

## Step 1 — RE-READ ALL the sources BEFORE writing

1. **The FULL current session** — re-read from the START of the conversation, including the parts summarised/drifted out of context
   (use `zemory memory digest <session>` / `memory search` to dig them back). Extract: what was DONE · what was CHANGED
   · what was DECIDED · what is still UNFINISHED · which BUGS were found and not fixed.
2. **The FULL `docs/plan/*`** — every file, to know whether the work just done touched/drifted from any spec (metric
   definitions: look at the HP frame `Cons_Gate_12_SourceOfTruth`, section Definitions).
3. **The FULL `docs/agent/*`** — `01_LAW/_Cons` · `01_LAW/_Rule` · `02_STRUCTURE` · `03_SKILLS` ·
   `04_TODO` · `05_CHANGES`, to know which places must be updated and not write what already exists twice.
4. **The FULL spec of EVERY case/task touched in the session** (e.g. `tasks/<case>/spec.md`) — both the body and the declaration
   block at the top of the file (`status` · `updated` · `evidence` · `run_at`…). A case's own decisions
   live there, NOT in `docs/plan`. *Measured: skipping this file ⇒ the spec still said "pipeline not built" after
   the pipeline had run, kept a cancelled schedule table, named the wrong machine.*

## Step 2 — route each thing to the right file, MISSING NOTHING

| Arising in the session | Written to |
|---|---|
| Work done / code changed / product (deliverable · measure · pipeline) changed | `05_CHANGES.md` (after approval) **and removed from** `04_TODO.md` |
| Unfinished work (IN PROGRESS, already reported) | `04_TODO.md` — marked `[~]`, **how far it got, what the next step is** |
| Work ARISING / ideas for the next session | **REPORT it in the session, ask before writing** — the door is `Rule_Gate_38_TodoDoor`. No nod ⇒ no line |
| Design / decision changed (including metric definitions) | `docs/plan/NN_*.md` · metric definitions → HP frame `Cons_Gate_12_SourceOfTruth` section Definitions, how to compute → a skill of its own `Skill_Own_<Name>` (+ supersede in the changelog when reversing an old decision) |
| A decision / state of ONE case | that case's spec (e.g. `tasks/<case>/spec.md`) — body + declaration block (`updated` changes in the same turn); an old sentence replaced gets edited/struck, NEVER two contradicting sentences alive together |
| A law / own invariant arising | **ASK at once in the session**, a nod ⇒ write it straight into the right home (`01`/`02`) — do NOT edit `01_LAW/_Cons/` yourself, and do NOT park it in `04_TODO` awaiting approval |

**The "miss nothing" standard:** every piece of work DONE in the session must be findable in `05_CHANGES` **or**
`04_TODO` — no work lives only in a head and dies with the session. Wrong diagnoses · dead ends · things
tried and not finished **must be written too** (so the next session does not crash into the same place): merged into **the CHANGES entry of
that very work** (a line or two "ruled out X because Y"), NOT a separate `04_TODO` item. *"Miss nothing" is about
work DONE — it is NOT a licence to write everything thought of into the ledger; the ledger's door is
`Rule_Gate_38_TodoDoor`.*

## Step 2b — changelog format

- Newest at **the top**, right after the header. Format: `## [YYYY-MM-DD] — title`.
- **Reversing an old decision?** The entry opens with
  `> 🔄 **Supersede:** thay [YYYY-MM-DDx] — "[heading]" — [reason].`
  That clause must name **EXACTLY the date key of the entry replaced** (date + suffix letter, just as in its
  heading) — the machine links only with that key, and once linked whoever lands on the OLD entry sees the label
  “⚠ ĐÃ BỊ THAY”. Written without a date ⇒ a dead decision still shows as alive (`Docs_005_Agent`).
  A bare date when that day has several entries ⇒ **ignored**, not guessed. **Never edit/delete an old entry.**
- **An entry that reports a fix names its lesson** (`Rule_Gate_91_LessonsFirst`): `L-<n>` from the ledger
  `Cons_Gate_17_LessonsLedger`, or the line `không có bài học: <lý do>` when new code cannot bring the fault back. In a repo that
  carries the ledger frame the guard blocks the entry otherwise.
- **A SHORT entry — a cap of ~30 lines (a rule, not a suggestion).** An entry needs only three things: **what changed · why ·
  the measurement**. Design details → `docs/plan/`; a narrative of the process → drop it. *The reason is arithmetic: the
  active area is only ~180 lines, four 50-line entries take it all, so long writing makes the archive mechanism itself
  meaningless.*

## Step 3 — TIDY the two ledger files YOURSELF (required, do not wait for someone to remember the command)

The two ledger files **grow forever**, and the standard requires reading `04_TODO` at the start of every session. Untidied, every
session must load the whole history again — the longer in use, the more it costs, until there is no room left for real work.

Run `zemory archive` right after writing. It does two DIFFERENT things, matching each file's nature — do not
apply one threshold to both:

- **`04_TODO.md` — NO threshold.** Every finished item — mark `[x]` **or** `✅`, `archive` accepts both
  (a version knowing only `[x]` once made the command **never pick up a single item** in a repo writing `✅`, while
  the ledger swelled to 2,327 lines and the command reported *"nothing to do"* every time) — moves to
  `docs/archive/04_TODO.md` at once, because a finished item is **misplaced from the second it is finished** —
  nothing to do with the file being long or short. (Measured: guarding by a size threshold is why 107 finished items stayed
  behind taking **46%** of a file loaded in EVERY session.) Open items `[ ]`/`[~]` stay in full.
  **The mark forms the machine moves (zemory ≥ 3.6.0):** lines `- [x]` · `- ✅` · `N. [x]`, and blocks titled `## [x]`
  (moving the WHOLE block up to the next title of the same level). `✅` on a numbered item / title, and a closed block still
  holding `[ ]`/`[~]` inside, the machine ONLY REPORTS (the *"NOT moved"* list), never moves — `✅` is often used to
  decorate a block still owing work. Read each reported line: really done ⇒ change it to `[x]` and run again. "Done" written
  another way (struck `~~…~~`, the word DONE in a paragraph) the machine does NOT see. **Reconciliation:** the number of items
  just closed in Step 0.3b must equal the number `archive` reports moved; the report list must come to 0 and the number of
  handover blocks `archive` counts must come to 1 (only this session's block) — off ⇒ fix the marks/close the blocks and run
  again; NEVER treat "nothing to do" as clean.
- **`05_CHANGES.md` — capped.** The **oldest** entries move to `archive/05_CHANGES.md`, keeping the newest
  in place. The threshold is declared in `docs/.harness.json` (`thresholds.changes_lines`/`changes_keep`).

**Copy WORD FOR WORD, NEVER summarise** — the archive layer is for LOOKING UP AGAIN, not for compressing; both layers are
reindexed so an item just moved can be found at once (`zemory changelog search` · `zemory memory search`).

**Cannot run `zemory`?** Do it by hand following the two rules above, target `docs/archive/<file name>.md`
(created when missing), then report how many items were moved:

- `04_TODO.md` — NO threshold to wait for. Finished items move WORD FOR WORD to the archive at once; tidy also items **cancelled
  / postponed indefinitely** + old notes; open items stay **in full**. The file still big because too much work is open
  ⇒ **REPORT it to cut scope**, do NOT delete work yourself.
- `05_CHANGES.md` — capped by **SIZE, not line count.** Count with `wc -c`; past **40,000
  characters** (~10k tokens) move the **oldest** entries out, keeping about **25,000 characters** of the newest. *Why
  not count lines: ledger lines vary a lot in density (measured 20–34 tokens/line) so "300 lines" can be
  6k or 10k tokens — counting lines measures the wrong thing.*

## Step 3b — SWEEP THE LITTER (required; the `01_LAW/_Rule` rule *".gitignore HIDES, it does not TIDY"*)

Closing a session is the ONLY place sure to run at the end of a session, so the sweep sits here. Three checks, print the numbers
before concluding — silence does not count as clean:

- **① stray files at the root + leftover scratch files:** list untracked files OUTSIDE the valid gitignored paths
  (`data/` · `exports/` · the secret safe), and EVERY file matching `_scratch_*` · `.tmp*` wherever it is. Any ⇒ delete
  (ask first when a file looks like a product), NEVER leave "tidy later".
- **② are gitignored folders swelling:** measure the size of each data folder; past the threshold the repo set itself
  (suggested default **2 GB**) ⇒ REPORT with the 3 biggest subfolders. This is exactly the place that swallowed **3 GB** (a venv of
  13,830 files + a 1.34 GB `.rar` duplicating the extracted folder beside it) without any gate seeing it, because it
  sat under a gitignored path.
- **③ executable files at the repo root:** `.cmd`/`.sh`/`.bat` at the root ⇒ off-standard, they belong in `bin/`
  (`02_STRUCTURE` section *Clean repo root*). Measured for real: the launcher-at-the-root mechanism produced 5 empty 0-byte files,
  2 of them slipped into git.

Suggested commands (Windows PowerShell — adapt to the repo):
```
git status --porcelain | Select-String '^\?\?'          # ① stray files
Get-ChildItem -Recurse -File -Filter '_scratch_*'        # ① leftover scratch
Get-ChildItem data -Directory | ForEach-Object { '{0,8:N0} MB  {1}' -f ((Get-ChildItem $_ -Recurse -File | Measure-Object Length -Sum).Sum/1MB), $_.Name }
Get-ChildItem -File | Where-Object Extension -in '.cmd','.bat','.sh'   # ③ root
```

## Last step

`zemory validate` (reads the files directly — only green counts as closed) → REPORT. **Never `git push` on your own**
(`Rule_Gate_50_Git`).

## The documents that go with a change (`Rule_Gate_34_DocsFollowChange`)

| Changed | Must be edited in the same change |
|---|---|
| work in the ledger | `04_TODO`: close or add items by `Rule_Gate_38_TodoDoor` |
| anything confirmed | `05_CHANGES`: one entry, the mould in slot `Docs_005_Agent` |
| structure (slots) | proposed to HS (`Rule_Gate_83_HarnessFromStore` · `Rule_Gate_85_ProposeChecked`); `02_STRUCTURE/INDEX.md` is regenerated by the machine on sync |
| business definitions | HP frame `Cons_Gate_12_SourceOfTruth` (section Definitions) · how to compute: a skill of its own `Skill_Own_<Name>` |
| skills (added · removed) | shared skill: proposed to HS · own skill: folder `03_SKILLS/Skill_Own_<Name>/`; `03_SKILLS/INDEX.md` is regenerated by the machine on sync |
| design | the spec in `docs/plan` (edited in place to the new direction) |
| a feature with a guide inside the product | the product's guide page |

After editing an `.md`, for `plan search` · `changelog search` to see it at once ⇒ `zemory reindex` (rebuilds the index from the
files, never writes back to the files).

## Implements · Thi hành luật
- `Rule_Gate_34_DocsFollowChange` — the documents brought up to date before the session ends · tài liệu được cập nhật trước khi hết phiên
- `Rule_Gate_38_TodoDoor` — closing finished items and archiving the ledger · đóng mục đã xong và dời sổ
- `Rule_Gate_91_LessonsFirst` — the changelog entry of a fix names its lesson · mục changelog của lần sửa nêu bài học
