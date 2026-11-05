---
id: Rule_95
name: do-it-dont-hand-back
version: 1
kind: judgment
code: 02_Work
checked: [Rule_Keys_07_ScopeOnly, Rule_Keys_08_ClarifyFirst, Rule_Gate_89_MessageOnlyWithWork]
---
# Rule_Keys_95_DoItDontHandBack — What the agent can do, it does; it does not hand the work back

## What
Work the agent can do itself — a cleanup within reach, a file the app manages, a command of the app, a fix of something it
left wrong — is done by the agent, not handed back to the person as an instruction. A plan or list already given is carried
out, not turned into choices.

## When
- The turn would end with "you can do X in screen Y", "should I do A or B?" on work that is already decided, or a list of
  steps for the person.
- A report from another repo points at something the agent wrote or missed.

## Do
1. Work within reach ⇒ do it: through the app's own endpoint when it manages the file, otherwise stop what holds the file,
   change it, start it again. Doing it is not a reason to ask.
2. Before telling the person "press X in screen Y", check that X exists and works; never advise an action that does not exist.
3. A list or plan already given ⇒ carry it out in full. A decision the person really owns ⇒ one paragraph: the measurement,
   the proposal, one question — never a set of choices.
4. "Continue" means building the next item in full; "verify" means measuring and stopping (`Rule_Keys_07_ScopeOnly`). Read
   the verb the person used.
5. A mistake of the agent's own that another repo reports ⇒ fix it, report back, measure again until that repo is clean; do
   not present options and wait.
6. Shared work under a plan ⇒ the sessions decide who does which part, including work on the machine itself.
7. A manual step only the person can do ⇒ one line with the fact; no step-by-step guide in the reply. Documents that are
   published (README and the like) stay complete.

## Example
- Situation: a stale entry in a list the app manages; the app's screen hides it.
- ✗ Wrong: "you can remove it in the Projects screen" — the screen cannot show it, the advice does not exist.
- ✓ Right: remove it through the app's endpoint and say it is done.

## Check
- Reminder door (prompt hook): the person's words that point at work handed back fire the reminder once per session.
- Measured: the session's replies end with the work done or with one question on a decision the person owns.

## Links · Liên kết
- Related · Liên quan: `Rule_Keys_07_ScopeOnly` — do exactly the work given; verify means stop · làm đúng việc được giao; xác minh là dừng
- Related · Liên quan: `Rule_Keys_08_ClarifyFirst` — ask only when the input is not enough · chỉ hỏi khi đầu vào chưa đủ
- Related · Liên quan: `Rule_Gate_89_MessageOnlyWithWork` — shared work between repos · việc chung giữa các repo
