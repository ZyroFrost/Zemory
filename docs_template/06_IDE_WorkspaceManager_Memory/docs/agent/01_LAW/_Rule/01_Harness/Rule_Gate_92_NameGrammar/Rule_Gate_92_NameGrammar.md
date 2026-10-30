---
id: Rule_92
name: name-grammar
version: 2
kind: action
code: 01_Harness
checked: [Rule_Gate_29_CodeLanguage, Rule_Gate_85_ProposeChecked, Root_136_Principles, Skill_Harness_Structure]
from: _Store/01_LAW/_Rule/01_Harness/Rule_Gate_92_NameGrammar @v2 #6f2b18339f9a
---
# Rule_Gate_92_NameGrammar — Every name on HS follows a declared pattern

## What
Every thing that carries a name on HS follows one pattern from the table below: shelf · layer · chapter · part · folder and file
inside a part · set · the `name:` field. A name no pattern covers is not invented: the person who gave the task fixes the pattern
first. The table is the one source; the machine reads the same table from `backend/src/docs/harness-names.ts`, and the two agree.

## When
- Creating, renaming or moving a part, or a folder or file inside a part.
- Adding a shelf, a layer, a chapter, a skill family or a set.
- Writing the `name:` field of a part.

## Do
1. Look up the table. The thing has a pattern ⇒ name it by that pattern.
2. No pattern fits ⇒ stop, propose a name built on the closest pattern, and ask the person who gave the task to fix it. Once
   fixed, the pattern is added to this table and to `harness-names.ts` in the same change.
3. Every name we choose is plain ASCII English (`Rule_Gate_29_CodeLanguage`). A name forced by a tool or an operating system is
   kept exactly as the tool writes it.

### Pattern table
| Thing | Pattern |
|---|---|
| shelf | `NN_<UPPER>`: `01_LAW` · `02_STRUCTURE` · `03_SKILLS` |
| inner layer of a shelf | `_<Word>`: `_Rule` · `_Cons` · `_Slot` · `_Host` |
| file or folder at the HS root | `README.md` · `source.json` · `04_TODO.md` · `05_CHANGES.md` · `Archive/` — nothing else |
| chapter of rules · of constitution frames | `NN_<Name>`: `01_Harness`…`05_Domain` · `01_Scope`…`04_Security` |
| rule · constitution frame | `Rule_<Gate\|Keys\|Core>_NN_<Name>` · `Cons_<Gate\|Keys\|Core>_NN_<Name>`; a repo's own article numbers from 101 |
| structure | `Struc_<Repo\|Region\|Disk>_<Name>` |
| slot | `<Area>_NNN_<Name>`; area = the first segment of the slot's path, a file at the root = `Root` |
| skill | `Skill_<Family>_<Name>`; family = the kind of product the skill makes: `Doc` · `Harness` · `Task` · `PBI` · `App` · `Db` · `Frame` · `Own` |
| host | `_Host/<GUI\|IDE\|CLI>` |
| set | `<NN>_<Host>_<Structure>_<Tier>` |
| `<Name>` inside a part name | PascalCase ASCII; may open with a digit of the thing it names (`01Raw`) |
| `name:` field | kebab-case; the slot of one file = the file's own name (`.env`) |
| skill name on a host | kebab-case forced by Agent Skills (`doc-write-docx`), generated from the part name |
| files of a part | `<Part>.md` · `<Part>.vi.md` · `gate.json` · `hook.cjs` · `Cons.md` (constitution frame) |
| folder inside a part | plural when it holds many things of one kind (`scripts/` · `references/` · `tests/`); singular for one concept or layer (`seed/`) |
| other file or folder inside a part | lower case ASCII English, several words joined by `_` (`edit_traps.md` · `lang_scan.mjs`) |
| name forced by a tool or OS | kept as the tool writes it (`node_modules` · `Documents` · `package.json`) |

## Example
- Situation: a skill needs a folder for its sample answer files and a helper script that checks page breaks.
- ✗ Wrong: `reference/page-break-check.py` — a folder of many files in the singular, words joined by `-`.
- ✓ Right: `references/` and `scripts/page_break_check.py`.
- Situation: a new kind of part, "playbook", has no pattern.
- ✗ Wrong: create `Playbook_Sales_Onboard` and carry on.
- ✓ Right: stop; propose a skill of family `Task` named for the onboarding (closest pattern) or a new pattern, and wait until it is fixed.

## Check
- HS test: every part name parses against `harness-names.ts`; a name that does not is red.
- HS test: every folder and file inside a part matches a line of the table; a name that does not is red.
- The table here and `harness-names.ts` list the same patterns (one source, two views).

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_29_CodeLanguage` — names are ASCII English · tên viết tiếng Anh ASCII
- Related · Liên quan: `Rule_Gate_85_ProposeChecked` — a new part names what it was weighed against · phần mới nêu thứ đã đối chiếu
- Related · Liên quan: `Root_136_Principles` — the naming principles inside a repo · nguyên tắc đặt tên trong repo
- Implements · Thi hành: `Skill_Harness_Structure` — how to propose a name · cách đề xuất tên
