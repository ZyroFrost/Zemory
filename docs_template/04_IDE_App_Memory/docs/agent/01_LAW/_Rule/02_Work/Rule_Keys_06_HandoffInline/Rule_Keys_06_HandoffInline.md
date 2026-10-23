---
id: Rule_6
aka: 02-6
name: handoff-inline
version: 8
kind: judgment
code: 02_Work
from: _Store/01_LAW/_Rule/02_Work/Rule_Keys_06_HandoffInline @v8 #aca5af4d5b59
---
# Rule_Keys_06_HandoffInline — A text sent once is printed in the answer, not saved as a file

## What
A one-time text for someone else (a handover, memo, report, prompt or note for another repo or department) is printed whole in
the answer. The repo keeps only what it runs or what defines what it runs.

## When
- The agent writes a text that goes to another person, repo or department once.

## Do
1. Print the whole text in the answer, ready to copy.
2. Do not write it into `tasks/` and do not attach a file.
3. Too long to read comfortably in the chat ⇒ ask whether to save it as a file.
4. Test for what the repo keeps: a spec · model · script · setting · ledger · reusable template. A one-time text is none of these.

## Example
- Situation: the agent needs the data team to add two columns to a table.
- ✗ Wrong: create a request file in the repo's task folder and tell the requester to open it and send it.
- ✓ Right: print the whole request in the answer so the requester can copy and send it; if it is very long, ask whether to save it.

## Check
- Keyword reminder: a request to write a message, memo or prompt for someone else shows this law.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_02_ReaderText` — how a text for readers is written · cách viết văn bản cho người đọc
