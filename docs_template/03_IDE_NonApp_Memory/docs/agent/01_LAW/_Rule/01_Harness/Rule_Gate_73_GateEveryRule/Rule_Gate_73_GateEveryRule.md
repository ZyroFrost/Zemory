---
id: Rule_73
aka: 02-73
name: gate-every-rule
version: 4
kind: action
code: 01_Harness
checked: [Skill_Harness_RuleGate, Rule_Keys_61_HookSafetyNet, Rule_Gate_86_LawLayersAgree, Rule_Gate_85_ProposeChecked]
from: _Store/01_LAW/_Rule/01_Harness/Rule_Gate_73_GateEveryRule @v4 #819cab0e2b98
---
# Rule_Gate_73_GateEveryRule — Every law and every slot has a machine check; the text alone is the last layer

## What
Every law (of HS and a repo's own) and every slot has the strongest check the machine can see: a block (hook · gate · conform ·
read) where a breach is visible to a machine, and at least a keyword reminder (`prompt`) where it is not. The text alone is never
the only layer: an agent forgets text, a hook it cannot forget.

## When
- Writing, adopting or editing a law or a slot.
- The requester's message is about a law's topic and no reminder fired.
- A law was broken in the session and no hook said anything.

## Do
1. Classify by the question "when it is broken, what does the machine see?" and build the check (`Skill_Harness_RuleGate` §2–3).
2. The floor: every law's `gate.json` holds at least a `prompt` whose `re` covers how people say it — Vietnamese with and without
   diacritics, English, and the words the requester actually used. A law no word can announce writes `"core": "<why>"` instead;
   that is the only way below the floor.
3. A word the requester used for a law's topic that the reminder missed ⇒ add it to that law's `re` in the same session, with the
   requester's sentence as a `block` case (an HS edit: say it in one line, then add it).
4. A law broken while no hook fired ⇒ before the work is closed, build or tighten its check; the miss is the measurement.
5. A slot: what a machine can see (an item in the wrong place, a part a rule demands) goes into `conform`; the rest the slot's
   `## Check` names as judged by the owner.

## Example
- Situation: the requester writes "đừng đẻ thư mục rỗng nữa"; the law against empty folders exists, but its reminder only knows
  "folder rỗng".
- ✗ Wrong: answer and leave the reminder as it is; the next session misses the same sentence.
- ✓ Right: answer, then add "thư mục rỗng" / "thu muc rong" to the law's `re`, with the requester's sentence as a block case.

## Check
- The HS test: every law has a `gate.json` holding `hook` · `gate` · `conform` · `read` · `prompt`, or a `core` reason.
- The HS test: the number of slots whose check is text only never grows (a ratchet: it may only fall).
- `zemory gates`: a law without its gate mark, a core law that carries one, the core over its cap.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_RuleGate` — how to classify a law and build its check · cách phân loại luật và dựng chốt
- Related · Liên quan: `Rule_Keys_61_HookSafetyNet` — a hook catches, the text decides · hook đỡ, chữ quyết
- Related · Liên quan: `Rule_Gate_86_LawLayersAgree` — the layers stay linked · các tầng luật nối với nhau
