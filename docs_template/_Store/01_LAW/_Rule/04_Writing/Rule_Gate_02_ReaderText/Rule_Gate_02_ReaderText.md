---
id: Rule_2
aka: 02-2
name: reader-text
version: 11
kind: action
code: 04_Writing
---
# Rule_Gate_02_ReaderText — Text for readers

## What
Reports, e-mails, delivered documents and UI text are written for the person who receives them: plain sentences, business words,
enough to read on their own. Never the harness voice.

## When
- Writing a report · an e-mail · a delivered document · text on a UI or a report page.

## Do
1. Write for the receiver. No harness voice: no commands, no capitals for emphasis, no internal terms.
2. Labels the reader sees (UI · report page · column title · chart caption) use business words, not table · column · internal
   code names. Exception: a place that shows the technical side on purpose (a query viewer · a column description box).
3. Enough to read: tables have column titles · pictures have captions · each number has its unit and period · one term, one name
   (`Rule_Gate_35_OneHome`).
4. Open the writing-style skill before writing: `.claude/skills/doc-write-style/SKILL.md`.

## Example
- Situation: the agent writes the weekly report e-mail to the head of another department, with a table of numbers.
- ✗ Wrong: whole sentences in capitals for emphasis, column titles that are database column names, numbers without unit or period.
- ✓ Right: open the writing-style skill first, write normal sentences, business words for column titles, unit and period on each
  number.

## Check
- A hook reminds to read the skill at the first write of a delivered text in a session.
- The read-first latch asks for the skill before a mail script runs.

## Links · Liên kết
- Implements · Thi hành: `Skill_Doc_WriteStyle` — the writing-style rules · luật văn phong
- Related · Liên quan: `Rule_Gate_27_HarnessLanguage` — the harness voice that stays out of reader text · giọng harness không vào văn bản cho người đọc
- Related · Liên quan: `Rule_Gate_35_OneHome` — one term, one name · một thuật ngữ một tên
