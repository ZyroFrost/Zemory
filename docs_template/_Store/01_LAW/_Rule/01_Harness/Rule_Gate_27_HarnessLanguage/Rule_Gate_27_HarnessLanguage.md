---
id: Rule_27
aka: 02-27
name: harness-language
version: 22
kind: judgment
code: 01_Harness
---
# Rule_Gate_27_HarnessLanguage — How harness docs are written, and the words they use

## What
Every harness part (law, constitution frame, slot, structure, skill) has ONE header file `<part>.md` written in English: the
only file an agent reads, and the source of truth. A translation for each language people read sits beside it as its own file
`<part>.<ISO 639-1 code>.md` (`Rule_Gate_27_HarnessLanguage.vi.md`). Harness docs use a plain specification voice and one
fixed word for each thing, and never quote a person or date a decision.

## When
- Writing or editing any harness doc.
- Naming a harness thing in any text an agent reads.

## Do
1. Write the header in English only. People's languages go in translation files beside it, one file per language; a language
   is added by copying the header to `<part>.<code>.md` and translating it. A part with no translation is whole.
2. A translation carries the same sections and the same number of steps as its header, and `version:` equal to the header
   version it was translated from. Change the header first, then bring each translation to that version.
3. Write a law in five parts: What · When · Do · Example (✗ wrong / ✓ right, with real names and numbers) · Check (what the
   machine blocks, or "no machine check, the agent keeps it"). Short sentences; explain an internal term the first time.
4. Before finishing a law, read it again as a newcomer and solve its example; misread ⇒ rewrite.
5. No quotes of what someone said, no decision dates, no personal names or e-mails, no paths carrying a person's name. Words,
   dates and incidents go to `05_CHANGES` and Global Memory.
6. Use the words of the table below; never "kho" alone — write DW or HS.
7. Call a thing that has a name in the system (a role, a command, a part, a key) by its English identifier, in every language:
   `workspace-manager`, `dept`, `zemory sync`. A name is written whole in one language: never a label half English, half
   Vietnamese for a named thing ("repo con"). The prose around it is plain and professional.

| Word | Means |
|---|---|
| HS (harness store) | `docs_template/_Store` in zemory — the only place laws, frames, slots, structures and skills are made |
| DW | the region's data warehouse ("kho dữ liệu") |
| set | a folder `docs_template/0N_*` assembled from HS |
| part | one folder on HS: a law, a frame, a slot, a structure or a skill |
| law | a part in `01_LAW/_Rule`, shared by every repo of a set |
| frame | a part in `01_LAW/_Cons` that makes a repo declare one kind of invariant in its `Cons.md` |
| code of law · chapter | the folder grouping laws (`01_Harness` …) · frames (`01_Scope` …) by subject |
| ledger | `04_TODO.md` · `05_CHANGES.md` — the repo's memory, not harness |
| owner | the repo that decides the frame and standard of another repo (`Struc_Region_Workspace`) |
| `workspace-manager` · `dept` | the roles of a workspace's managing repo and of the department repos it manages (`role.name` of their structures) |
| query set · icon library · glossary | named queries · the region's icons · the region's business glossary |
| stock ("tồn kho" · "nhập kho" · "kho hàng") | goods in a stockroom — business words, not the DW |

## Example
- Situation: a new law is added after a data-loss incident.
- ✗ Wrong: the law retells the incident, quotes what the person said with the date, and names the warehouse with a word that
  could also mean HS.
- ✓ Right: the law's English header states When · Do · Check and says "fix the table in DW", and its `.vi.md` says the same in
  Vietnamese at the same version; the story, the words and the date go to the changelog.
- Situation: the harness is needed in Japanese.
- ✗ Wrong: Japanese text is added under the English inside the header, so every agent read pays for both.
- ✓ Right: `Rule_Gate_27_HarnessLanguage.ja.md` is written beside the header with the same five sections and seven `Do` steps,
  `version:` equal to the header's.

## Check
- The guard blocks an agent's Read of a translation (`<part>.<code>.md` in HS or in any `docs/agent`) and points at the English
  header; opening one to edit it takes the one-use flag `.allow-translation`.
- The HS check reds a header that carries another language's sections, and a translation that lacks a section or has a
  different number of `Do` steps than its header. A translation whose `version:` is behind its header is named (advisory).
- A hook blocks, in new lines of a harness doc: a quote of a person, a decision date, an e-mail, a path with a person's name.
- The same hook blocks the word "kho" alone in new lines of EVERY prose file the repo writes — harness docs, plans, the two
  ledgers, case specs, READMEs (archive and attic excepted): write DW or HS. It passes "kho dữ liệu" and the stockroom
  words "tồn kho" · "nhập kho" · "xuất kho" · "kiểm kho" · "kho hàng".
- The same hook blocks the hybrid labels "repo con" · "repo cha" in new lines of the same files: name the role (`dept`), or say
  what the repo is in one language. The HS gate counts the same words: an HS file may not get worse than HEAD.
- Broken Vietnamese (no diacritics) is blocked by `Rule_Gate_31_NoBrokenVietnamese`.
- The voice itself is judgment.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_31_NoBrokenVietnamese` — Vietnamese with diacritics · tiếng Việt có dấu
- Related · Liên quan: `Rule_Gate_02_ReaderText` — text for readers outside the harness · văn bản cho người đọc ngoài harness
- Related · Liên quan: `Struc_Region_Workspace` — what an owner is · tổng quản là gì
