---
id: Rule_11
aka: 02-11
name: verify-claims
version: 10
kind: judgment
code: 02_Work
from: _Store/01_LAW/_Rule/02_Work/Rule_Keys_11_VerifyClaims @v10 #f020ccd8b8d0
---
# Rule_Keys_11_VerifyClaims — Not verified is not a fact

## What
Every claim (a number · a state · a cause · whether something was done) traces back to a source that can be checked: reading a
file · running a command · calling the real surface · looking up an outside document. What cannot be traced is said to be
unverified, never filled in by guessing.

## When
- About to state a number, a conclusion, a cause, or that something was done.
- About to delete something.
- About to list, report or ask about an item in a ledger (`04_TODO` · plan · changelog).

## Do
1. Trace each claim to a source that can be checked. Not found ⇒ say "not verified" with the ways already tried.
2. Before reporting a number, a conclusion, or deleting ⇒ measure again by a second way with a different mechanism (another tool ·
   counting the other way · the real surface).
3. Look out for four kinds of error: a broken tool that quietly returns empty · a loose comparison that cries wolf · a criterion
   that sounds right but is wrong in substance · a ledger that says something other than reality.
4. Measuring tools: a home-made measure copies every parameter of the official one; several tests failing the same way ⇒ suspect
   the measure first; the number must fit the physical cost of the work — suspiciously fast is a false green until shown otherwise.
5. Work · faults · decisions from another session ⇒ search the decision history before claiming: with the CLI `zemory` ⇒
   `zemory memory search "<q>" --all`; without it ⇒ `docs/archive/`. Search the exact question being answered. Never write or
   claim from a summary or an unchecked subagent result.
6. A ledger item is a claim of state. Before listing, reporting or asking about one ⇒ measure it again with all three sources:
   code/files · decision history · a real run. Applies at all times, not only at session close. Three agree ⇒ conclude; they
   differ ⇒ the newer wins; one source out of reach ⇒ write "not verified", never assume "not done". An item untouched for more
   than 7 days ⇒ suspect it. Asking again about something already settled is a fault.
7. Checking a file, a deliverable or a table ⇒ read EVERY cell, row and column of the range concerned by machine (the whole used
   range, from the first pass), never a sample. A statement sent out of the repo (a mail, a report) is copied from the scan output
   and names the column and row; a sentence that does not trace to a line of that output is not written.

How to measure, false-alarm traps: `.claude/skills/harness-audit/SKILL.md`. The ledger measure (with the CLI): `zemory todo verify`.

## Example
- Situation: the agent checks the customer table and reports "120 duplicate customers, propose deleting".
- ✗ Wrong: the number comes from a name comparison that ignores case; most are different customers with the same name, deleting
  them loses real data.
- ✓ Right: count again another way (customer code, phone number); report the number only when both ways agree; unsure ⇒ say it is
  not verified.

## Check
- Keyword reminder: a request about what is left, an earlier session, a report or an audit shows this law. The ledger measure:
  `zemory todo verify`.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_Audit` — how to measure and the false-alarm traps · cách đo và bẫy báo oan
- Related · Liên quan: `Rule_Gate_01_DoneMeansRun` — done is measured · xong là đã đo
- Related · Liên quan: `Rule_Gate_38_TodoDoor` — the ledger items · các mục trong sổ việc
