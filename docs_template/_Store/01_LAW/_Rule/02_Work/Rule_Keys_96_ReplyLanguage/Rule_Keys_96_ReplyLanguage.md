---
id: Rule_96
name: reply-language
version: 1
kind: judgment
code: 02_Work
checked: [Rule_Gate_29_CodeLanguage, Rule_Gate_27_HarnessLanguage]
---
# Rule_Keys_96_ReplyLanguage — Reply in the person's language, the whole turn

## What
Everything the agent says to the person is in the language the person writes in: the final reply, the progress lines between
commands, the descriptions of commands, the visible reasoning. A long run of work, or an English commit message just written,
does not switch the language.

## When
- Every reply and every progress line of a session.

## Do
1. Reply in the person's language. Kept in English: command names, file names, code, commit messages (their own law),
   technical CLI and log output (`Rule_Gate_29_CodeLanguage`).
2. Before sending, read the first sentence: in the wrong language ⇒ rewrite the whole reply.
3. Progress lines, command descriptions and visible reasoning follow the same language as the reply.

## Example
- Situation: a long batch ends with an English commit; the person writes Vietnamese.
- ✗ Wrong: the closing report in English.
- ✓ Right: the closing report in Vietnamese; the commit message stays English.

## Check
- Reminder door (prompt hook): the person pointing at the wrong language fires the reminder once per session.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_29_CodeLanguage` — code, CLI and logs stay English · mã, CLI và log giữ tiếng Anh
- Related · Liên quan: `Rule_Gate_27_HarnessLanguage` — how harness docs are written · cách viết docs harness
