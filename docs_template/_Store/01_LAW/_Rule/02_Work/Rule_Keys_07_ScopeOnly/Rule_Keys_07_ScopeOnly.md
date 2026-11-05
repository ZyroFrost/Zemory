---
id: Rule_7
aka: 02-7
name: scope-only
version: 10
kind: judgment
code: 02_Work
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
4. Never add a constraint, a guard or a refusal the person did not set to something the person drives; a choice that looks
   risky is said once, the person decides. Before writing "X cannot be used because Y", read the code that decides Y.
5. A request with a clear width ("all", "the whole X", "every repo") is done at that width; narrowing it is proposed with a
   measurement, never done silently.
6. "Not related, remove it" ⇒ cut it in that turn and clean fully: the code, the keys of both dictionaries, the test anchors,
   any text still promising it. Explaining the mechanism, renaming it or proposing a replacement is not the answer.
7. Verify · audit · "can this case be closed" ⇒ measure, report, stop. A defect found while measuring is reported with its
   measurement and severity; it is fixed only when the person says so.

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
