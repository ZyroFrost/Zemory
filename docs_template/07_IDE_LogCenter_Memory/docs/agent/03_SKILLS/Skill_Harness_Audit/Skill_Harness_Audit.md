---
id: Skill_Harness_Audit
aka: audit
name: harness-audit
version: 19
type: process
description: Run a full review of the project across every dimension, verifying each finding against real files before reporting it. Use only when explicitly asked for a thorough audit, or before a major milestone such as a release or a large batch of changes. This is not a quick check. Vietnamese triggers - "audit toàn diện", "soi hết", "kiểm tra toàn bộ", "rà lại hết", "review tổng thể".
from: _Store/03_SKILLS/Skill_Harness_Audit @v19 #1374494f06f5
---

# audit — a full review

> Trigger: asked for **"a full audit" / "look at everything"** · before a big milestone (release · a merge commit) ·
> after a round changing many files. This is NOT a small check: the phrase means running **every aspect** of the
> profile — **12 aspects** for APP, **11 aspects** for NON-APP — **never cut short for speed**.
>
> **Why the NON-APP version differs from the APP one:** a non-app project develops no app — no endpoints, no
> FE↔BE, no code test suite. Carrying the app version over makes a BI project run `npm run check` and inspect
> `FE ↔ BE`, i.e. **gates that can never fire** (rule 4: worse than none). But **the four SURVIVAL
> aspects are kept whole** — a non-app still has connection strings, still has scheduled pipelines, still hands text to
> readers.

**Rule 1 — a green gate is NOT evidence.** It proves only *that what the check looks at is right*,
not that it looks at what is running. The APP case: a whole UI test suite anchored to a replaced copy, the gate 100%
green while the running surface had **0 tests**. The classic non-app case: a script runs with **exit 0** while the file
comes out **empty** — the gate green, the product broken. So always ask (for APP it is aspect ④): *which FILE is this
check / test reading?*

**Rule 2 — VERIFY each finding before writing it.** Compare with the REAL file before calling it "a bug". One round
dropped 5 suspicions because measuring again proved them wrong, and 2 rounds had the checker raise false alarms (48 then 13 items). One wrong finding ruins
trust in the whole table.

**Rule 3 — every figure must be MEASURED.** No inference, no recollection. Not measurable ⇒ write plainly
**"not measured"**.

**Rule 4 — ask of each check in reverse: *"what makes it go RED?"*** No answer ⇒ that check cannot fire,
and a check that cannot fire is worse than none (it issues a guarantee without ever having looked).

**Rule 5 — MEASURE TWO WAYS, by different mechanisms.** A measurement not cross-checked is not yet a fact
(`Rule_Keys_11_VerifyClaims`). Four forms already paid for: a tool **broken silently** returning empty (a wrong flag ⇒ a false negative ⇒
believed "clean") · **false alarms** from loose comparison (not telling upper/lower case apart) · **a criterion that sounds reasonable but is wrong
in essence** (a foreign key pointing short ⇒ believed orphaned, nearly deleting live data) · **the ledger saying something other than the code**.
Cross-checking = changing the tool · changing the counting direction · or calling the real surface (DB ↔ API).

**Rule 6 — MUTATE (BREAK ON PURPOSE) before trusting a check.** Do not stop at rule 4's answer on paper:
**break exactly what it guards** (edit the code the test guards · change a figure in the source · delete a required
line · rename a column) and run again — it must go RED. It survives ⇒ that check guards somewhere else,
or a copy of the logic elsewhere carries the load. Remember to restore what you broke. Measured: **2/4
mutations SURVIVED** — one test never reached the dangerous branch, one test was **carried by a copy of the logic
elsewhere**. Both stayed green throughout and inspected nothing.

**Rule 7 — EVERY GATE MUST BE MEASURED WITH NEGATIVE CASES TOO.** Running only the *must block* cases does not tell whether the gate **blocks
WRONGLY**, and blocking wrongly is the shortest road to *"a noisy gate ⇒ an ignored gate"* — breaking with your own hands
what you are building. Measured on the guardrails: a table of 28 cases is worth something **only thanks to its 6 *must let through* cases**;
without them a hand-tightening had broken the gate while still believing it was doing well.

## APP — 12 aspects, run all
*(The first 6 aspects are the original ones, inspecting *"is the software RIGHT"*. **Aspects 7–10** were added after looking back at **every REAL
incident** of one repo and asking *"which aspect should have caught it"* — the finding: **every heaviest incident fell
into the area the 6 old aspects never looked at**, because they belong to *"does the software SURVIVE"*: loss · leaks ·
silent death · not portable. **Aspect 11** was added because the nine before it all inspect the MACHINE, none inspects what
**THE READER** receives. **Aspect 12** was added because aspect 11 inspects the words people read, none inspects the language of
the CODE itself — file names · identifiers · comments.)*
1. **Gate & lint** — `npm run check` (or the repo's gate command, declared in the `repoGates` key of `docs/.harness.json`). **STOP the daemon/background processes first**,
   or heavy tests fight over RAM and go red at random in unrelated places.
2. **Standard & docs** — `zemory conform` · `zemory validate` · doc length vs the thresholds (`zemory archive`
   when over) · whether the TODO still holds items already done but not closed.
3. **Architecture** — exports nobody calls · **DUPLICATE SOURCES** (the same truth in ≥2 places ⇒ it will certainly
   drift) · files/folders outside the standard · whether writes to source files are atomic.
4. **FE ↔ BE** — every endpoint has a caller & the reverse · i18n complete both ways · dead CSS/ids ·
   **whether test anchors point at the running file**.
5. **Real data** — `integrity_check` · coverage (index/vector/digest) · orphan rows · size.
6. **The live surface** — call the REAL endpoints (return code + time) · open the app and **look with your own eyes**. Inference
   from code cannot replace looking: once the endpoint was green, the gate green, and the UI still wrong. **A return code
   is not looking**: open the main screens and dialogs, READ the content (column counts · labels · warning
   bands) — many audit rounds reported clean while the main dialog showed the wrong columns and a false warning.
7. **Secrets & spread** — secrets in the tree **AND in the git HISTORY** (not only HEAD: a key once leaked is
   leaked **forever**, deleting it at HEAD cannot take back what was already pushed) · large files/binaries slipped into git · **ways
   out** wider than `git push`: cloud sync folders · the *machine backup* channel of the sync tool (one the
   owner did NOT turn on deliberately) · the target machine at deploy · key file permissions. No old aspect looked
   here, while this is where loss **CANNOT be undone** — wrong once and it is over.
8. **Dependencies & licences** — whether new dependencies/models have compatible licences (an architectural invariant
   requires the review, and no gate checks it yet) · the lockfile matches · dead dependencies · **does a rebuild from a CLEAN CLONE
   run** (something that runs only on a machine already holding the stuff cannot be called buildable). Scan **THE WHOLE
   TREE**, not only direct dependencies — a bad licence deep down still ships with the product. A measuring trap: `OR`
   and `AND` in a licence expression **do not mean the same** (`OR` = one valid branch is enough · `AND` = EVERY branch must be
   valid), splitting them with one pattern misses things.
9. **Integrity & concurrency** — whether the write gate / write lock still **REALLY REFUSES** (a correct lock whose caller
   ignores the refusal still leaks) · whether a second writer has the data store open · whether transactions are
   atomic · **A REAL RESTORE TEST** of a backup into a temp place, then COUNT — *"the data is healthy"* DIFFERS from *"it can
   be rebuilt"*, and the carrying channel can silently drop the most expensive layer with no gate going red.
   **Shared state OUTSIDE the repo** (an exchange folder between machines) leaves every code check blind: list
   it with the AGE of each file — an old declaration left behind is enough to produce wrong columns and false warnings across many audit rounds;
   files too old move to a storage place (`retired/`).
   With it: run the `sync-path/` skill.
10. **Background operation & guardrails** — are the background processes still alive · is there a heartbeat/log enough to trace when one
   freezes · does the surface **DIE WITH the background** (an empty shell is the worst failure: it does not report
   an error, it **LIES**, and the owner has no way to tell it from really running) · **run the guardrail
   matrix** — does a blocking gate really block, something measurable only by RUNNING, not by reading code
   (must-block cases **+ must-let-through cases**, rule 7).
11. **WORDS & THE READER'S SURFACE** — **the NORM is in `Rule_Gate_02_ReaderText` · `Rule_Gate_31_NoBrokenVietnamese`** (*the words people read must be complete and
   correct*, 4 constraints, shipped in EVERY harness set). Here is only **how to MEASURE**. Five checks, each must print
   *how much was scanned* so it is not falsely green:
   · **missing Vietnamese diacritics** in docs · **spelling** (repeated adjacent words · mojibake);
   · **captions/labels** — interactive elements have a programmatically readable label, pictures have `alt`;
   · **both language ends** — strings in code (`.js`) *and* text directly in HTML/markup (text nodes +
     `title`/`placeholder`/hint); keys complete in both dicts; dead keys removed;
   · **UI ↔ code** — the edges of the graph's `api` seam compare the routes the FE calls with the real BE routes (use the graph,
     not the eye); `zemory graph path <FE> <BE>` to trace the path when in doubt.

   ⚠ **FOUR OF THESE FIVE CHECKS RAISE FALSE ALARMS WHEN DONE NAIVELY — the first measuring round was almost all wrong:**
   · *missing diacritics*: the list must hold ONLY words whose undiacritised form **is not a valid word** (`khong`
     `duoc` `cua`…). Putting in `minh` · `nhanh` · `song` gives false alarms — they are written without diacritics anyway
     («chứng minh»). The first version: **63 hits, 0 real**.
     Always exempt `skills/write-docx/references/*` — deliberately written as ASCII without diacritics (Python code in command
     blocks; the 18 hits measured there are NOT errors).
   · *repeated words*: JS's `\b` is **ASCII**, Vietnamese letters count as non-word characters ⇒ «chứng ngại» gets cut
     into `ng`+`ng` and reported as a repeat (128 false hits). Use the `\p{L}` class + **exclude reduplication** («song
     song» · «luôn luôn» · «bắt đầu đầu trang») and remember that stripping code/paths can **glue two
     identical words side by side** («scan known/deep scan»). After the fix: 15 hits, checked by hand
     **still 0 real** ⇒ this check is NOT yet precise enough to be a gate, only for inspecting by hand.
   · *mojibake* (UTF-8 read as Latin-1): `Â.`/`Ã.` also hits valid Vietnamese letters (ĐÂY · NGÃ) — 192
     false hits. The right pattern: `[ÃÂ][-¿]` · `â€` · `ï»¿` · `U+FFFD`. And **strings inside
     backticks must be exempted**: a file TEACHING about mojibake (`Rule_Gate_31_NoBrokenVietnamese` itself) gives sample examples ⇒ a naive detector raises
     false alarms on exactly the document that defines it (measured: 6/245 hits, 0 real).
   · *captions*: the label often sits in a **CHILD tag** (`<a><span>…</span></a>`) or in a wrapping `<label>`
     ⇒ reading only the text right after the opening tag gives 20 false cases.
   · *both languages*: Vietnamese text in HTML is **RIGHT** when the element has an i18n hook (`data-i18n`,
     `-title`, `-ph`, `-hint`) — the translation overwrites it at run time. Only places **missing the hook** are errors.
     And an i18n key passed through a VARIABLE (`doc:'f.doc.x'` then `t(item.doc)`) is NOT a dead key:
     scan every literal, not only `t('…')` — the first version raised **46 dead keys** falsely, the real count was **0**.
   · *dead endpoints*: DYNAMICALLY assembled routes (`post('/set-'+name)`) make every `/set-*` look dead;
     and endpoints **the CLI calls over HTTP** have no caller in the FE. Count all three sources (static FE ·
     dynamic prefixes · tests/CLI) before concluding.

12. **THE LANGUAGE OF THE CODE** — **the NORM is in `Rule_Gate_29_CodeLanguage` · `Rule_Gate_31_NoBrokenVietnamese`** (a shared law of every app). Four checks,
   **how to measure + false-alarm traps + baseline figures in [`references/lang.md`](references/lang.md)**; the machine runs:
   `node .claude/skills/harness-audit/scripts/lang-scan.mjs . [--all]` — it prints *how much was scanned* so a clean round
   is not read as "nothing inspected".
   · **Ⓐ file · folder names** ASCII English only · **Ⓑ identifiers** (variables · constants · functions · classes · types ·
     config keys) ASCII English only — **comments in English too** (`Rule_Gate_29_CodeLanguage`);
   · **Ⓒ absolutely NO undiacritised Vietnamese ANYWHERE** — plans · docs · comments · test names ·
     machine-generated strings: either English or Vietnamese WITH diacritics, there is no third choice;
   · **Ⓓ UI in both languages** — balance the vi↔en dicts (one side missing makes the translate function silently fall back to the source language,
     NO error fires) · keys used but not declared · dead keys · Vietnamese text in markup missing an i18n hook.
     (The *reader* side of both languages stays in aspect ⑪; here is the **key counting** side.)
   ⚠ **Three traps, all measured:** ① not stripping comments/strings before scanning ⇒ both false alarms and
   **misses** (the first round: 4 false hits, 9 real identifiers missed) · ② English–Vietnamese homographs (`do · so · can ·
   ten · van`) falsely catch whole plain English sentences · ③ a label in a CHILD tag of an element that ALREADY has an i18n hook
   (2/2 false hits).

## NON-APP — 11 aspects, run all
*(The first 5 aspects inspect *"is the work RIGHT"*. **Aspects 6–9** were added after looking back at **every REAL incident** of one
repo and asking *"which aspect should have caught it"* — the finding: **every heaviest incident fell into the area the old
aspects never looked at**, because they are of a completely different kind: *"does the work SURVIVE"* — loss · leaks ·
silent death · not portable. **Aspect 10** was added because the nine before it all inspect the MACHINE, none inspects what
**THE READER** receives — and in a non-app project *the product handed out IS the reader's words*, so it is the
heaviest aspect, not a side one.)*

> A set without the `zemory` CLI: the commands `zemory conform` / `zemory validate` in aspects 1–2 are replaced by the set's standard
> check script (`python .claude/skills/harness-structure/scripts/check_structure.py .`, the `conform` skill), plus
> measuring by hand the length of `04_TODO`/`05_CHANGES` against the 300-line threshold and which changelog entry exceeds the 30-line cap.

1. **The project's gates** — run every gate the repo has: `zemory conform` · `zemory validate` · the structure check
   script · **the launcher's readiness gate** (`<name> auto` must return an exit code ≠ 0 when a condition is missing).
   A repo with **no runnable gate at all** — that IS the first finding, not a reason to skip this aspect.
2. **Standard & docs** — `zemory conform` · `zemory validate` · doc length vs the thresholds (`zemory archive`
   when over) · whether the TODO still holds items done but not closed · docs repeating each other's content.
3. **Structure & DUPLICATE SOURCES** — the same truth in **≥2 places** ⇒ it will certainly drift. Inspect:
   files/folders outside the standard · scripts/queries nobody calls · the same query copied in two places · **a metric
   definition in ≥2 places** (the data dictionary in `02_STRUCTURE` is the ONLY home — is there a stray
   `docs/dictionary.md`, a metric defined in the dictionary but computed differently in `measures/`, or a formula
   copied into several measures) · does each case have **a mirror with the same name** (`tasks/<case>/` ↔
   `data/<case>/`) · whether writes to source files are atomic.
4. **Data & the 3 stages** — does anyone WRITE into `01_raw/` (it is **READ ONLY**) · do intermediate files carry
   the stage number prefix · does the final deliverable sit in `03_output/` with a business name · is `data/adhoc/`
   used for **recurring** work (it is only for throwaway loose files) · size · litter copies.
5. **The product handed out — OPEN IT AND LOOK** — open exactly the deliverable file (`.xlsx`/`.pbix`/`.docx`) **with your own
   eyes**: figures poured into the right cells, sheets/pages not empty, the right reporting period, formulas without `#REF!`, a few
   reference figures matching the source, the right dates, the copy at the target being the newest. Inference from the script
   CANNOT replace opening the file: a script exiting 0 while the file comes out empty is a real case; once every check
   was green and the report still displayed wrongly.
6. **Secrets & spread** — secrets in the tree **AND in the git HISTORY** (not only HEAD: a key once leaked is
   leaked **forever**, deleting it at HEAD cannot take back what was already pushed) · large files/binaries slipped into git · **ways
   out** wider than `git push`: cloud sync folders · the *machine backup* channel of the sync tool (one the
   owner did NOT turn on deliberately) · the target machine at deploy · key file permissions. This is where loss
   **CANNOT be undone** — wrong once and it is over.
7. **Dependencies & rebuilding** — do the packages/libraries the scripts use have compatible licences · does the dependency
   declaration file (`requirements`/lock) match what is installed · packages declared that nobody imports ·
   **does a rebuild from a CLEAN CLONE run** (something that runs only on a machine already holding the stuff cannot be called
   buildable — and for a non-app ask too: does a blank machine have the driver/ODBC/fonts to open the source).
   Scan **THE WHOLE TREE**, not only direct dependencies. A measuring trap: `OR` and `AND` in a licence expression
   **do not mean the same** (`OR` = one valid branch is enough · `AND` = EVERY branch must be valid).
8. **Integrity & recovery** — do two pipeline runs at the same time fight over the same file (without a lock
   the later run overwrites the earlier one, silently) · are deliverables written **atomically** (write a temp file
   then rename — NEVER leave a half-written copy that looks finished) · **A REAL RESTORE TEST**: rebuild
   a deliverable from `01_raw` (or from a backup) into **a temp place** then **COUNT** — *"the data is still
   there"* DIFFERS from *"it can be rebuilt"*, and the carrying channel can silently drop the most expensive layer with no gate
   going red. With it: run the `sync-path/` skill.
9. **Background operation & guardrails** — are the background processes still alive · is there a heartbeat/log enough to trace when one
   freezes · does the surface **DIE WITH the background** (an empty shell is the worst failure: it does not report
   an error, it **LIES**, and the owner has no way to tell it from really running) · **run the guardrail
   matrix** — does a blocking gate really block, something measurable only by RUNNING, not by reading code
   (must-block cases **+ must-let-through cases**, rule 7).

10. **WORDS & THE READER'S SURFACE — the HEAVIEST aspect in a non-app project** (the product handed out is the reader's
   words, not an accessory of an app). The NORM is in `Rule_Gate_02_ReaderText` · `Rule_Gate_31_NoBrokenVietnamese`. Measure: **missing diacritics** · **spelling**
   (repeated adjacent words · mojibake from UTF-8 read as Latin-1) · **labels in the product** (column
   headers · figure captions · charts · pictures with a clear title and **UNIT**; figures with a unit + the period/time point
   alongside) · **CONSISTENT terminology** — one term, one name throughout (the same metric never carries two
   different names across reports — compare with the data dictionary in `02_STRUCTURE`, the only home
   of definitions) · **the words in handed-out files** (sheet names · page titles · captions) — outsiders
   read these, so a word error here costs more than any error in the repo.
   ⚠ **These checks RAISE FALSE ALARMS when done naively:** the undiacritised-word list may only hold words whose undiacritised
   form is NOT valid (`khong` `duoc` `cua`…; `minh`/`nhanh`/`song` have no diacritics anyway) · searching for repeated words must use
   `\p{L}` (JS's `\b` is ASCII) and **exclude reduplication** ("song song" · "luôn luôn") · the mojibake pattern
   `Â.`/`Ã.` also hits valid Vietnamese letters (ĐÂY · NGÃ) — the right pattern is `[ÃÂ][-¿]` · `â€` · `ï»¿` · `U+FFFD`,
   **and strings inside backticks must be exempted**, because the very document naming the mojibake patterns hits itself (measured:
   6/245 files hit, checked by hand **0 real**) · and **names other people gave are NOT errors**: source
   column/sheet names, vendor file names, oddly capitalised business terms — inspect the words in the parts YOU
   wrote, not words you only pass by.

11. **THE LANGUAGE OF THE CODE** — the NORM is in `Rule_Gate_29_CodeLanguage` · `Rule_Gate_31_NoBrokenVietnamese`. The machine runs `node
   .claude/skills/harness-audit/scripts/lang-scan.mjs .`; it prints *how much was scanned* so a clean round is not read
   as "nothing inspected". How to measure + detailed traps: [`references/lang.md`](references/lang.md).
   · **Ⓐ file · folder names** ASCII English only · **Ⓑ identifiers in scripts/pipelines** (variables · functions ·
     intermediate columns you name yourself · config keys) ASCII English only — **comments in English too**
     (`Rule_Gate_29_CodeLanguage`). *Names the SOURCE gave (Excel columns · API fields) stay character for character: they
     are DATA, renaming them makes the loader not find them.*
   · **Ⓒ absolutely NO undiacritised Vietnamese ANYWHERE** — plans · docs · comments · test names ·
     machine-generated strings: either English or Vietnamese WITH diacritics, there is no third choice.
   ⚠ **Two traps already paid for:** ① not stripping comments/strings before scanning ⇒ both false alarms and **misses**
   (one round: 4 false hits while still missing 9 real identifiers) · ② English–Vietnamese homographs (`do · so · can · ten ·
   van`) falsely catch whole plain English sentences.

## Output

A findings table, each item recording *what was measured · the impact · where to fix it*, split into `blocking` (must fix) /
`advisory` (to consider). Work fixed → `05_CHANGES`. **NEW findings and suspicions dropped (with the reason for dropping
them — so the next time nobody digs again): REPORT them in the session, do NOT write them as `04_TODO` items yourself** — only
approved items get written (`Rule_Gate_38_TodoDoor`, the door). A full round produces dozens of advisories; writing
them all stuffs the ledger, and the ledger is loaded in EVERY session.

## Forbidden

- Cutting any aspect for speed.
- Writing unverified findings.
- Reporting "clean" after running only the gate / only the standard check script.

## How to measure — used for `Rule_Keys_11_VerifyClaims` and `Rule_Gate_01_DoneMeansRun`

- **A check must be able to go red.** After writing a test or check (a script · a comparison formula · a figure-comparison table) ⇒ break exactly the
  code or the thing it guards and run again; it does not go red ⇒ fix the check. Two common holes: the check never reaches the dangerous branch;
  a copy of the logic elsewhere carries the load.
- **Three measuring rules.** A self-built measurement copies every parameter of the official gauge. Several trials failing in one direction ⇒ suspect the gauge
  first, not each design. The measured figure must match the physical cost of the work: unusually fast is falsely green until
  proven otherwise.
- **Checking the ledger with three sources**, applied at all times, not waiting for a session close:
  1. source / code: open exactly the file · grep · count exactly the lines/columns · rerun the query; never infer from a description;
  2. decision history: with the CLI ⇒ `zemory memory search --all`, filtering the turns that assign work and approve; without ⇒ read
     `docs/archive/`;
  3. a real run: call the endpoint · the command · the real interface · read the log of the running process · open the handed-out copy itself · refresh the data
     and compare figures.
  Conclude only when all three agree; one source unreachable ⇒ write "not verifiable" with the sources tried. The measuring machine:
  `zemory todo verify` (do the symbols an item names exist · does the item's own measurement still hold · did the source change after the ledger line
  was written; exit ≠ 0 when off).

## Implements · Thi hành luật
- `Rule_Gate_01_DoneMeansRun` — breaking code to see a check go red · phá mã để thấy phép kiểm báo đỏ
- `Rule_Gate_31_NoBrokenVietnamese` — the language scan of a whole repo · máy soi ngôn ngữ cả repo
- `Rule_Keys_11_VerifyClaims` — how to measure and the false-alarm traps · cách đo và bẫy báo oan
