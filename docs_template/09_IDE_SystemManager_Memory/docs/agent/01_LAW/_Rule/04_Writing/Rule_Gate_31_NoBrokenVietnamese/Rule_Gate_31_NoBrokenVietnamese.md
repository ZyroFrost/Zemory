---
id: Rule_31
aka: 02-31
name: no-broken-vietnamese
version: 11
kind: content
code: 04_Writing
from: _Store/01_LAW/_Rule/04_Writing/Rule_Gate_31_NoBrokenVietnamese @v11 #dcf02098c2b1
---
# Rule_Gate_31_NoBrokenVietnamese — No Vietnamese without diacritics, no broken encoding

## What
No file holds Vietnamese written without its diacritics, and no file holds broken encoding (mojibake). Write Vietnamese with full
diacritics, or write English.

## When
- Writing any file: docs · plans · comments · test names · machine-generated strings · settings · ledgers · commit messages.

## Do
1. Vietnamese ⇒ full diacritics; cannot type them ⇒ write English.
2. No mojibake (`Ã¡` · `â€` · `ï»¿`). Seen ⇒ read the file again as UTF-8.
3. Exempt: names given by another system (source columns · API fields · source file names), kept character for character.
4. This holds even when a repo relaxes the language articles of its constitution.

## Example
- Situation: a session adds an item to the TODO ledger.
- ✗ Wrong: write "kiem tra lai so lieu thang 9".
- ✓ Right: write "kiểm tra lại số liệu tháng 9"; unable to type diacritics ⇒ write it in English.

## Check
- The guard blocks a new line of Vietnamese without diacritics in `.md` files, code comment lines and commit messages. A line is
  caught when it has at least one syllable that is surely Vietnamese (`khong` · `duoc` · `nguoi` …) or four function words (`va` ·
  `cua` · `cho` …), so a short phrase of words that are also English, or a proper name, can slip through.
- Comments with diacritics in code are blocked by `Rule_Gate_29_CodeLanguage`.
- Whole-repo scan (strings in code and other files included): `node .claude/skills/harness-audit/scripts/lang-scan.mjs .`. How to
  measure and the false-alarm traps: `.claude/skills/harness-audit/SKILL.md` faces 11 · 12.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_Audit` — the language scan · máy soi ngôn ngữ
- Related · Liên quan: `Rule_Gate_29_CodeLanguage` — the language of code · ngôn ngữ của mã
