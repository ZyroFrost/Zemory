---
id: Rule_29
aka: 02-29
name: code-language
version: 12
kind: judgment
code: 04_Writing
from: _Store/01_LAW/_Rule/04_Writing/Rule_Gate_29_CodeLanguage @v12 #7ae4989356c5
---
# Rule_Gate_29_CodeLanguage — Code and names are written in English

## What
Code, scripts, pipelines and measures are written in English: comments, docstrings, technical logs, CLI output. Identifiers and
names are ASCII English. Text rendered for readers and names given by another system are not translated.

## When
- Writing or editing code · a script · a pipeline · a measure.
- Naming a variable · constant · function · class · type · parameter · config/JSON key · test · file · folder · git branch.

## Do
1. Comments · docstrings · technical logs · output of the CLI and helper scripts ⇒ English. One file, one language. Commit
   messages: English, or Vietnamese with full diacritics.
2. Identifiers and names ⇒ ASCII English.
3. Not translated: strings rendered for readers (UI labels · report labels · table/column descriptions generated into docs) · names
   given by another system (source columns · API fields · source file names), kept character for character · domain terms.
4. Old Vietnamese comments: fix them while touching that file; no mass translation round.

## Example
- Situation: editing a revenue function in a data-load script.
- ✗ Wrong: add the comment "tinh doanh thu theo thang", name a file `thieu-dong-dim.csv`, rename the source column `Ma_KH` to
  `customer_code` because it looks nicer.
- ✓ Right: comment "Compute monthly revenue", file `missing-dim-row.csv`; the column named by the source system stays as is.

## Check
- A hook blocks a new comment line with Vietnamese, and a new file name or identifier that is not ASCII English.
- Whole-repo scan: `node .claude/skills/harness-audit/scripts/lang-scan.mjs .`

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_31_NoBrokenVietnamese` — Vietnamese, when written, has its diacritics · tiếng Việt đã viết thì đủ dấu
- Related · Liên quan: `Rule_Gate_27_HarnessLanguage` — the language of harness documents · ngôn ngữ của tài liệu harness
