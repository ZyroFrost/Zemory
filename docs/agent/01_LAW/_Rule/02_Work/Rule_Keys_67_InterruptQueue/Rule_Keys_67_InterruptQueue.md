---
id: Rule_67
aka: 02-67
name: interrupt-queue
version: 8
kind: judgment
code: 02_Work
from: _Store/01_LAW/_Rule/02_Work/Rule_Keys_67_InterruptQueue @v8 #41f3d9a53b2a
---
# Rule_Keys_67_InterruptQueue — A request that cuts in waits its turn

## What
A new request that arrives in the middle of a task does not cancel the task. The agent notes it in one line, finishes the
current task (or reaches a safe point), then turns to the new one.

## When
- The requester sends a new request while a task is still running.

## Do
1. Acknowledge the new request in one line.
2. Finish the current task, or bring it to a safe point (nothing half-written, the gate not left mid-run), then start the new one.
3. Exception: the requester says stop, drop it, or do the new one first ⇒ do as told.
4. Never fold two tasks into one edit. Never cut the current task short to get to the new one sooner.

## Example
- Situation: the agent is halfway through reconciling the monthly numbers when the requester writes "remember to rename the column in
  the weekly report".
- ✗ Wrong: drop the reconciliation to rename the column, or do both at once and rush the reconciliation.
- ✓ Right: say it is noted, finish the reconciliation, then rename the column; unless the requester says stop or do the new one first.

## Check
- Keyword reminder: a message that adds a task mid-way shows this law; the rest is judgment.

## Links · Liên kết
- Related · Liên quan: `Rule_Keys_07_ScopeOnly` — one task, its own scope · mỗi việc đúng phạm vi của nó
