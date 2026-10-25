---
id: Skill_Harness_PlanTrim
aka: plan-trim
name: harness-plan-trim
version: 11
type: process
description: Trim the specs in docs/plan when they grow past the cap, WITHOUT losing ideas — back up, draft outside the repo, have an independent reviewer restore every lost idea against the original and the code, then apply. Use when `zemory validate` warns that a spec or docs/plan is over the line cap, or when asked to shorten, trim or tidy the plans. Vietnamese triggers - "gọt plan", "dọn plan", "plan dài quá", "rút gọn plan", "plan vượt trần", "plan quá trần".
---

# plan-trim — trimming a plan over its cap without losing ideas

> The law is in `Docs_006_Plan` (the bullet **A PLAN STAYS TIGHT**): a plan keeps the settled direction + the open points, history
> goes to `05_CHANGES`, one spec's cap is watched by `zemory validate` (`docs/plan` as a whole has no cap). This skill is only **how to do it**.
> Measured on two real trims: one review pass caught ~120 lost ideas; another pass (four specs) restored ~140 ideas
> and caught 5 places where a spec said the opposite of the code.

## When to use
- `zemory validate` reports `plan: N spec(s) over … lines`.
- Asked to trim / tidy / shorten the plans.
- **Trim only specs OVER the cap.** A spec under the cap stays as it is — trimming for looks trades the risk of losing ideas for nothing.

## What an "idea" is — the thing that must NOT be lost
A decision + its reason in one sentence · a settled rule and the original sentence that settled it · a number that justifies a decision
or a rejection · a trap (`⚠` · `🔴` · "trap") · a dropped option (`Dropped` · `REJECTED` · "do not propose again" — compressed to ONE
line: what was dropped + why; they stop a later agent proposing it again) · protocol/format facts the code relies on · acceptance
gates and NEGATIVE cases · open / unmeasured points · section numbers (`§N`) other files refer to.
**Not an idea** (may be cut): the story of how a session got there · the same fact told in a second place (keep
one home, the other points to it) · an intermediate number the file itself marks as replaced.
**Hand-drawn diagrams** (folder trees · tables · `mermaid`) are the core of a plan — keep them; compress the words around them, never delete them.

## Procedure

**1. Back the original up BEFORE touching anything.** Copy `docs/plan/*.md` as they are into `docs/archive/plan-<YYYY-MM-DD>/`,
check each file matches byte for byte. Without the original, lost ideas cannot be checked.

**2. Find the section numbers others refer to.** `grep -rn "plan/NN §" docs backend` (and the repo's code folders). Every heading
referred to keeps its number and name.

**3. Write the draft OUTSIDE the repo.** One draft per spec, in the session's scratch folder. Handing it to a subagent:
say clearly **write only the draft, never edit a file in the repo** — editing paragraph by paragraph makes the read-before-write gate treat
each edit as "someone else's edit", and every agent in the session gets blocked again and again.

**4. An INDEPENDENT review pass — required, never skipped.** Another agent (not the draft's writer) reads the original and the draft
WHOLE, section by section:
- list each idea the draft dropped and put it back, compressed;
- **check against the code** every claim of state (on / built / not done) — the original may be older than
  the code, the draft may have inferred things; write what the code really says;
- check every place the draft's writer added or inferred something, keep what is right, drop what is wrong.

**5. Do not cheat the measure.** The cap is measured in lines at the repo's normal width (~130 characters). Wrapping long lines to hit the line
count is not really tighter — the content is the same, only harder to read. Measure the characters too, to know the draft really shrank.

**6. Cannot reach the cap without losing ideas ⇒ STOP at the honest level and propose.** Report the real line count + which ideas would have to
go to press further; propose raising the cap (key `thresholds.plan_spec_lines`) or splitting the spec if
it carries two different problems. **The approver decides** — never drop ideas to reach a number, never change the cap on your own.

**7. Apply.** Replace the file in the repo with the reviewed copy. Overwriting a whole file needs approval (the guard flag
`.allow-overwrite`) — ask first, remove the flag right after. Keep the original file's line endings.

**8. Read the final copy WHOLE again** (the last review, and the read-before-write gate asks for the replaced file again), then run
`zemory paths check` (0 newly dead paths) and `zemory validate`.

**9. Write `05_CHANGES`:** which spec, lines before/after, how many ideas the review restored, where it was corrected to match the
code, the path of the original copy.

## Traps met
- The draft adds a "✅ state" or a new summary section on its own — the review must check it, never take it as is.
- A spec describes a design (a new table, a half-run stage) the code built differently — the trim is the moment to make it match the code.
- A spec full of measurement tables (each decision is a measurement) cannot go low — the tables are the evidence against
  proposing it again; that is a reason to propose raising the cap, never a reason to delete the tables.
