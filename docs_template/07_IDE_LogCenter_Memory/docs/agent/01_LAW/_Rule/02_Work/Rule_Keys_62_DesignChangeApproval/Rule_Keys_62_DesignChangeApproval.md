---
id: Rule_62
aka: 02-62
name: design-change-approval
version: 15
kind: judgment
code: 02_Work
from: _Store/01_LAW/_Rule/02_Work/Rule_Keys_62_DesignChangeApproval @v15 #2d9016998b27
---
# Rule_Keys_62_DesignChangeApproval — Changing the look of something others use: show it first

## What
A change to the shape of something other people use is proposed and approved before it is built. A layout already settled does
not move on its own. Fixing a technical fault needs no approval.

## When
- Changing the shape of: a UI (layout · size · frame · colour · theme · component shape · adding or removing an element · style ·
  order) · a report or dashboard layout, the choice of chart, the presentation theme · a delivered template.
- A design suggestion comes from a skill of `type: design`.

## Do
1. Show a concrete proposal, or a draft / picture, and wait for approval.
2. A settled layout does not change: no moving positions or order on your own.
3. No need to show: fixing a technical fault (misaligned · overflowing · broken) · filling numbers into an existing template.
4. The given direction leaves design details open ⇒ show options for the open part. A suggestion from a design skill is shown,
   never applied on its own.
5. Concrete conventions: `Skill_Dev_AppDesign` · `Skill_PBI_Base` (the skills the repo carries) · the conventions slot
   and the UI name dictionary.

## Example
- Situation: the agent is asked to put the new month's numbers into a sales dashboard.
- ✗ Wrong: while there, turn the bar chart into a pie and rearrange the tiles because it looks nicer; viewers used to the old
  layout can't find their numbers.
- ✓ Right: fill the numbers into the template; an idea for a new layout is shown as an option and changed only once approved.

## Check
- Keyword reminder: a request about UI, layout, colour, dialog, chart and the like shows this law; the rest is judgment.

## Links · Liên kết
- Implements · Thi hành: `Skill_Dev_AppDesign` — the app design standard · chuẩn thiết kế app
- Implements · Thi hành: `Skill_PBI_Base` — the report design standard · chuẩn thiết kế báo cáo
- Implements · Thi hành: `Skill_PBI_White` — the White design standard a report keeps once approved · chuẩn thiết kế White report giữ sau khi duyệt
- Related · Liên quan: `Rule_Gate_63_SkillTrigger` — a design skill only suggests · skill thiết kế chỉ gợi ý
