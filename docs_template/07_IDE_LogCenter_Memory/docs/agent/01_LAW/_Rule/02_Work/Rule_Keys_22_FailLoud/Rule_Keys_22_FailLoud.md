---
id: Rule_22
aka: 02-22
name: fail-loud
version: 9
kind: judgment
code: 02_Work
from: _Store/01_LAW/_Rule/02_Work/Rule_Keys_22_FailLoud @v9 #c9997deffed7
---
# Rule_Keys_22_FailLoud — A failure must show

## What
A failure is never hidden: a dead background process takes its surface down with it or shows a visible error; a stage that dies
stops the chain with a non-zero exit; a half-written product is a failure and is not delivered.

## When
- Building or running a background process · launcher · multi-step pipeline · scheduled job · script · tool window.

## Do
1. Background dies ⇒ the surface that depends on it stops too, or shows a visible error; never an empty shell that looks alive.
2. A stage dies midway ⇒ exit code ≠ 0 and the stage is named. A readiness check fails ⇒ stop the chain; never export a file with
   numbers missing.
3. A product written halfway ⇒ treat it as a failure; do not deliver it.

## Example
- Situation: a multi-stage pipeline exports a report; the data-pull stage dies midway.
- ✗ Wrong: the later stages still run, export a file with missing numbers, exit with 0, and the tool window still says "running".
- ✓ Right: the chain stops at once, exits non-zero, the message names the broken stage; the half-written file is not delivered.

## Check
- Keyword reminder: a request about a pipeline, job, background run, hang or crash shows this law; the rest is judgment.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_01_DoneMeansRun` — a half-done run is not done · chạy dở không phải xong
