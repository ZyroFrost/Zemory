---
id: Rule_100
name: no-deferral
version: 1
kind: content
code: 02_Work
checked: [Rule_Keys_95_DoItDontHandBack, Rule_Keys_03_ShowSteps, Rule_Gate_61_HookSafetyNet]
---
# Rule_Gate_100_NoDeferral — Given work runs now, in a loop, until it is done; the agent never moves it to a later time

## What
Work the requester gives is done now and worked on without a break until it is measured done. The agent never moves it, on
its own, to a later time: tonight, overnight, after hours, tomorrow, the next run of a scheduled job, the next session. It
never stops to wait for a quiet hour and never turns the work into an appointment. Only the requester sets a later time,
by naming it.

## When
- The agent is about to end a turn with given work left and a time to go on ("tonight", "tomorrow", "the 00:15 run").
- The agent wants to wait for a quiet hour because the work is heavy, the machine is busy or the business is open.
- The agent is about to create a timer, a scheduled task or a ledger item so that given work happens later instead of now.

## Do
1. Work it as a loop in this session: run · measure · fix · run again, until the result is measured done or a real blocker
   stands. "Done" is a measurement, never a promise.
2. Never propose or pick a later time for given work. Load, size, office hours or a busy machine are no reason: run it now,
   in smaller pieces or at a lower priority, and say so.
3. Never schedule given work for later to avoid doing it now (a timer, a scheduled task, a wake-up, a TODO item for "the
   next session"). A recurring job the requester ordered (a daily report at a fixed hour) is the work itself, not a deferral.
4. A long run starts now in the background and is watched: one line per step (`Rule_Keys_03_ShowSteps`); a failure is fixed
   and the run started again from where it failed, until it is done.
5. A real blocker (a permission only the requester gives, a machine that is down, data that does not exist yet) ⇒ one line
   with the measurement, and the rest of the work goes on. A blocker never becomes a date.
6. The requester names a later time ⇒ that time holds, for that work only.

## Example
- Situation: a backfill of 14 months of sales takes about 3 hours and the warehouse serves reports during the day.
- ✗ Wrong: "The backfill is heavy, I will put it in tonight's 00:15 run and check the numbers tomorrow morning." The turn ends,
  nothing runs, and the next morning the requester finds the work not done.
- ✓ Right: start the backfill now, one month per batch at a lower priority, report each month (rows, seconds), fix a failed
  month and run it again, and report the measured total within the session.

## Check
- Stop hook (`hook:stop-evidence`): a reply that moves given work to tonight, overnight, after hours, tomorrow or the next
  run is blocked once per turn with this law, unless the requester's own words in this turn named that time. Code and
  quotes are mentions, not uses.
- Keyword reminder: the requester's words about night, waiting or rescheduling show this law.

## Links · Liên kết
- Related · Liên quan: `Rule_Keys_95_DoItDontHandBack` — work within reach is done, not handed back · việc làm được thì làm, không trả lại
- Related · Liên quan: `Rule_Keys_03_ShowSteps` — a long run shows each step · việc dài báo từng bước
