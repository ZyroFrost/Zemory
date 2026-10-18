---
id: Rule_62
aka: 02-62
name: design-change-approval
version: 12
kind: judgment
code: 02_Work
from: _Store/01_LAW/_Rule/02_Work/Rule_Keys_62_DesignChangeApproval @v12 #3a4ce20e345d
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
5. Concrete conventions: `.claude/skills/dev-app-design/SKILL.md` · `.claude/skills/pbi-base/SKILL.md` · the conventions slot
   and the UI name dictionary.

## Example
- Situation: the agent is asked to put the new month's numbers into a sales dashboard.
- ✗ Wrong: while there, turn the bar chart into a pie and rearrange the tiles because it looks nicer; viewers used to the old
  layout can't find their numbers.
- ✓ Right: fill the numbers into the template; an idea for a new layout is shown as an option and changed only once approved.

## Check
- Keyword reminder: a request about UI, layout, colour, dialog, chart and the like shows this law; the rest is judgment.

## Luật là gì
Đổi hình hài thứ người khác đang dùng thì trình và được duyệt trước khi dựng. Bố cục đã chốt không tự dời. Sửa lỗi kỹ thuật không
cần duyệt.

## Khi nào áp
- Đổi hình hài của: giao diện (layout · kích thước · khung · màu · theme · hình dạng component · thêm/bớt phần tử · style · thứ
  tự) · bố cục báo cáo hay dashboard, chọn biểu đồ, theme trình bày · mẫu giao đi.
- Một gợi ý thiết kế đến từ skill `type: design`.

## Phải làm gì
1. Trình đề xuất cụ thể, hoặc bản nháp / ảnh, rồi chờ duyệt.
2. Bố cục đã chốt không đổi: không tự dời vị trí hay thứ tự.
3. Không cần trình: sửa lỗi kỹ thuật (lệch · tràn · hỏng) · điền số theo mẫu có sẵn.
4. Hướng được giao còn hở chi tiết thiết kế ⇒ trình phương án cho phần hở. Gợi ý từ skill thiết kế thì trình, không tự áp.
5. Quy ước cụ thể: `.claude/skills/dev-app-design/SKILL.md` · `.claude/skills/pbi-base/SKILL.md` · slot quy ước và từ điển tên UI.

## Ví dụ
- Tình huống: agent được giao cập nhật số tháng mới vào một dashboard bán hàng.
- ✗ Sai: tiện thể đổi biểu đồ cột thành biểu đồ tròn và sắp lại các ô vì thấy đẹp hơn; người xem quen bố cục cũ không tìm ra số.
- ✓ Đúng: điền số theo mẫu; có ý tưởng đổi bố cục thì trình phương án, được duyệt mới đổi.

## Máy kiểm
- Nhắc theo từ khoá: lời yêu cầu nói tới giao diện, bố cục, màu, dialog, biểu đồ… thì hiện luật này; phần còn lại là phán đoán.

## Links · Liên kết
- Implements · Thi hành: `Skill_Dev_AppDesign` — the app design standard · chuẩn thiết kế app
- Implements · Thi hành: `Skill_PBI_Base` — the report design standard · chuẩn thiết kế báo cáo
- Related · Liên quan: `Rule_Gate_63_SkillTrigger` — a design skill only suggests · skill thiết kế chỉ gợi ý
