---
id: Rule_8
aka: 02-8
name: clarify-first
version: 13
kind: judgment
code: 02_Work
---
# Rule_Keys_08_ClarifyFirst — Unclear ⇒ make it clear; unreasonable ⇒ push back before doing it

## What
When the input is not enough to do the work right, the agent stops and asks, one question at a time, each with a proposal. A
design that looks unreasonable is challenged with reasons and another option before any work.

## When
The agent triggers this itself, without being called, when it sees:
- several meanings · a term read in more than one way · missing facts · undefined scope · a hidden assumption;
- two requests that contradict each other;
- an action that is hard to undo is next;
- something unreasonable in a design it was given.

## Do
1. Stop; read what can be read.
2. Ask one question at a time, each with a concrete proposal. An unreasonable design ⇒ give the reason and another option.
3. Before proposing or changing the design of an area ⇒ search `zemory plan search "<area>"` and the existing standard for that
   kind of work; a direction already rejected is not proposed again.
4. Never pick the broadest reading on your own. Work starts once it is clear enough; the final decision is the approval in the
   session.
5. Call it by hand with the word "grill" in the request. Process: `.claude/skills/harness-grill/SKILL.md`.
6. An approved draft stands: do exactly that draft. An older sentence that seems to disagree does not reopen it; ask one
   question only when the draft contradicts a measured fact.
7. A question or a discussion is never a decision. A plan records it as an open analysis until the person says yes.
8. A large removal with fuzzy edges ⇒ a KEEP / REMOVE table, approved before anything is cut. "Wait" is a hard stop to
   clarify again, not a nudge to go on.
9. Before asking a design question, search the plans and the shared memory with the question's own words. Two settled points
   that seem to collide almost always speak of different things: read both closely before asking.
10. A loose order to delete or clean up ⇒ first look for the removal already planned in `04_TODO` or the case spec. One matches
   and its precondition holds ⇒ do exactly that (backup, verify, report once): never widen it to whole files, never bounce the
   question back. Ask only when no planned action matches.

## Example
- Situation: the requester writes briefly "remove the docs sync part".
- ✗ Wrong: read it as removing the whole docs system and start deleting tables, search commands and the related screens.
- ✓ Right: stop, read what exists, ask one question with a concrete proposal: which part stays, which goes; work after the answer.

## Check
- Keyword reminder: a request with "what does it mean", "design", "propose", "grill" shows this law; the rest is judgment.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_Grill` — the question-by-question process · quy trình hỏi từng câu
- Related · Liên quan: `Rule_Keys_07_ScopeOnly` — scope · phạm vi
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — actions hard to undo · thao tác khó đảo
