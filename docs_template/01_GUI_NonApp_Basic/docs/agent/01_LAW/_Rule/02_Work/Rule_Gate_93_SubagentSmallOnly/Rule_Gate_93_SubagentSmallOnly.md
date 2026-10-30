---
id: Rule_93
name: subagent-small-only
version: 1
kind: action
code: 02_Work
checked: [Rule_Keys_07_ScopeOnly, Rule_Keys_11_VerifyClaims, Rule_Keys_03_ShowSteps]
from: _Store/01_LAW/_Rule/02_Work/Rule_Gate_93_SubagentSmallOnly @v1 #8f2db440c6e6
---
# Rule_Gate_93_SubagentSmallOnly — The main session does the work; a subagent takes only a small errand

## What
The session the person talks to does the work itself. A subagent (the Agent tool, a background agent, a workflow) takes only a
small errand that costs few tokens and needs no large context. A subagent never re-reads what the main session has already
loaded: templates, standards, specs, large files. Re-reading them costs the whole context again, and the person waits with no
progress shown.

## When
- Before starting a subagent, a background agent or a workflow.

## Do
1. Ask first: does the errand need many files read, a file read whole, or a long brief to be understood? Yes ⇒ do it in the main
   session.
2. A subagent is fit for: one lookup with a known target · one command whose output is long and only its conclusion is needed ·
   independent small checks that do not need what the main session holds.
3. The brief of a subagent names the target and the question only; it never asks the subagent to read standards, templates or
   specs the main session already has.
4. The person asks for a subagent or a workflow by name for a large job ⇒ it may run once: one-use flag `.allow-agent`, created
   only after that request in the session.

## Example
- Situation: a UI port of an approved template; the main session has already read the 180 KB template and the design standard.
- ✗ Wrong: start a background agent whose brief names 18 files and asks it to port stage 1 — it re-reads the template and the
  standard and runs for an hour while nothing shows.
- ✓ Right: the main session ports stage 1 itself, showing each step; a subagent at most measures one page with the checker and
  returns the count.

## Check
- Guard hook: a call of `Agent` · `Task` · `Workflow` whose brief names 5 files or more, asks for files to be read whole, or is
  4,000 characters or longer is blocked; the one-use flag `.allow-agent` lets one through.
- The guard matcher covers `Agent|Task|Workflow` (`zemory doctor` reds a repo whose host wiring misses them).
- Gate examples in `gate.json` replay a large brief (blocked) and a small errand (passes).

## Links · Liên kết
- Related · Liên quan: `Rule_Keys_07_ScopeOnly` — only the task given · chỉ làm đúng việc được giao
- Related · Liên quan: `Rule_Keys_11_VerifyClaims` — a subagent's result is checked before it is used · kết quả của subagent phải kiểm trước khi dùng
- Related · Liên quan: `Rule_Keys_03_ShowSteps` — the work shows its steps · làm việc phải hiện từng bước
