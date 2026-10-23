---
id: Rule_61
aka: 02-61
name: hook-safety-net
version: 8
kind: judgment
code: 01_Harness
---
# Rule_Keys_61_HookSafetyNet — A hook is a safety net, not the one who decides

## What
The text of a law decides; a hook only catches what slips. A hook that lets something through does not make it allowed, and a
hook that blocks is not a puzzle to get around.

## When
- A hook passes or blocks an action.
- A one-use flag `.allow-*` is about to be created.

## Do
1. Passed by a hook ≠ allowed: an action that cannot be undone still needs the requester's approval first.
2. Blocked ⇒ ask the requester; never look for another way that the hook does not see.
3. A flag `.allow-*` lets exactly one approved action through: create it only after the requester clearly approved in this session,
   and never reuse it for anything else. Secrets have no flag.

## Example
- Situation: the agent wants to drop a temporary table; the first delete command is blocked, another way is not.
- ✗ Wrong: switch to the way that is not blocked and drop it, or create the flag on its own.
- ✓ Right: ask the requester first, blocked or not; once approved, create the flag for that one command.

## Check
- Keyword reminder: a request about getting around a hook or making a flag shows this law. No machine can see intent; the agent
  keeps the rest.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — actions that cannot be undone · thao tác không đảo được
- Related · Liên quan: `Rule_Gate_79_HarnessEdit` — the flag for harness edits · cờ sửa harness
