---
id: Rule_7
aka: 02-7
name: scope-only
version: 9
kind: judgment
code: 02_Work
from: _Store/01_LAW/_Rule/02_Work/Rule_Keys_07_ScopeOnly @v9 #f5682f197cf0
---
# Rule_Keys_07_ScopeOnly — Do exactly the work given

## What
The agent does what was asked. Anything beyond it is asked first, never done and reported after. Adding something nobody asked
for needs a proposal that answers three questions.

## When
- The work would touch something outside the request.
- The agent wants to add something nobody asked for: a feature · a check gate · a counter · a measure · a warning layer · an
  advisory item.

## Do
1. Outside the request ⇒ ask before doing it.
2. Want to add something unasked ⇒ ask one question with the proposal. Before proposing, answer all three: what can be removed
   instead · can it join something that exists · what breaks without it, and can that be measured. No answer to the last ⇒ do
   not propose.
3. Not covered by this law: the work given · fixing something broken · a duty another law requires.

## Example
- Situation: the requester asks to fix a typo in one column title of a report.
- ✗ Wrong: fix the title and, while there, "clean up" the query behind it and add a warning "to be safe"; the column's numbers
  change and nobody is told.
- ✓ Right: fix only the title; a problem seen in the query is raised with a question; the warning idea is proposed with the three
  answers.

## Check
- Keyword reminder: a request that says "only", "don't", "nobody asked" shows this law; the rest is judgment.

## Links · Liên kết
- Related · Liên quan: `Rule_Keys_08_ClarifyFirst` — ask when the scope is unclear · hỏi khi phạm vi chưa rõ
- Related · Liên quan: `Rule_Keys_81_FollowExistingPattern` — raise a problem in an old pattern, do not change it · nêu vấn đề của khuôn cũ, không tự đổi
