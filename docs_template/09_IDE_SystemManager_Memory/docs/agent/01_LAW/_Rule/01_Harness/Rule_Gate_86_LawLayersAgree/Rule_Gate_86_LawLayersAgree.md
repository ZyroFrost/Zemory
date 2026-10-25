---
id: Rule_86
name: law-layers-agree
version: 3
kind: action
code: 01_Harness
checked: [Rule_Gate_35_OneHome, Rule_Gate_83_HarnessFromStore, Rule_Keys_80_SharedChangeImpact]
from: _Store/01_LAW/_Rule/01_Harness/Rule_Gate_86_LawLayersAgree @v3 #c0ffe5b49c02
---
# Rule_Gate_86_LawLayersAgree — The layers of law never contradict each other, and stay linked

## What
A rule lives on three layers: the law or constitution frame (HS) states the duty · the repo's `Cons.md` states the repo's own
decision · a skill teaches how to carry it out. A lower layer never says the opposite of a higher one, and every layer names the
others it is tied to.

## When
- Writing or editing a law, a frame, a `Cons.md` or a skill.
- Two layers are seen to say different things.

## Do
1. Order: constitution frame and law > the repo's `Cons.md` > skill. A `Cons.md` never loosens the duty of its frame; a skill
   never teaches against the law it implements.
2. A contradiction found ⇒ the lower layer is fixed to follow the higher, or a change of the higher layer is proposed through HS
   (`Rule_Gate_83_HarnessFromStore`).
3. Links are written in the body: a law or frame ends with `## Links · Liên kết` (`Implements` · `Repo declares` · `Related`); a
   skill names the laws it carries out in `## Implements`. Both directions agree.
4. Changing one layer ⇒ check every layer linked to it (`zemory impact <part>` lists them).

## Example
- Situation: the law on secrets says values never enter git; a department's skill says "keep the password in `config.json` for the
  scheduled job".
- ✗ Wrong: follow the skill because it is more specific; the password goes into git.
- ✓ Right: the law wins; the skill is fixed to read the value from `data/secrets/`, and the fix goes through HS.

## Check
- `conform` and the HS test: every name in `## Links` and `## Implements` is a living part, and both directions match.
- `conform`: a section of the frame that the repo's `Cons.md` dropped or left with a template mark `<…>` is red.
- The app shows the same findings (it uses the conform engine).

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_Conform` — the check that finds broken links and contradictions · phép kiểm tìm liên kết gãy và mâu thuẫn
- Related · Liên quan: `Rule_Gate_83_HarnessFromStore` — fixing a higher layer goes through HS · sửa tầng trên đi qua HS
- Related · Liên quan: `Rule_Gate_35_OneHome` — one home for each piece · mỗi nội dung một nhà
- Related · Liên quan: `Rule_Keys_80_SharedChangeImpact` — changing a shared part · sửa phần dùng chung
