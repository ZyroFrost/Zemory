---
id: Rule_3
aka: 02-3
name: show-steps
version: 8
kind: judgment
code: 02_Work
from: _Store/01_LAW/_Rule/02_Work/Rule_Keys_03_ShowSteps @v8 #8d942cd3c575
---
# Rule_Keys_03_ShowSteps — Show each step; never run silently

## What
During a long or multi-step job the agent keeps the requester able to follow: one line before each batch of actions, a source for
each claim, a gap from the expected number reported at once.

## When
- A job of several steps or batches of actions.
- A background run that takes a while.

## Do
1. Before each batch of actions ⇒ one line: what is being done and why.
2. Each claim carries the measurement it rests on.
3. A number different from what was expected ⇒ report it now, not in the final summary.
4. A long background run ⇒ say what is being waited for.

## Example
- Situation: the agent runs a long chain: pull data, rebuild a table, push the new version.
- ✗ Wrong: run a dozen steps in a row and only then give one summary line; halfway one step loses half the data and nobody knows.
- ✓ Right: one line before each batch; a number off from the expected is reported at once; a long background run says what it
  waits for.

## Check
- Keyword reminder: a request for a long or multi-step job shows this law; the rest is judgment.

## Links · Liên kết
- Related · Liên quan: `Rule_Keys_11_VerifyClaims` — the source behind each claim · nguồn đo của mỗi khẳng định
