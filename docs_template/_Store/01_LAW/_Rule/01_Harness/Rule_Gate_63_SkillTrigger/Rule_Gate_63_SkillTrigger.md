---
id: Rule_63
aka: 02-63
name: skill-trigger
version: 8
kind: action
code: 01_Harness
---
# Rule_Gate_63_SkillTrigger — Work that matches a skill opens the skill first

## What
When a task matches the trigger of a skill in the repo, the agent reads the whole skill before working and follows it, by the
skill's type: every step of a `process` skill is due; a `design` skill only suggests and its suggestion is shown first.

## When
- A task matches the `description` (trigger) of a skill in the repo.

## Do
1. Read the whole skill before starting; never work from memory of it.
2. Look at the skill's header `type:`. `process` ⇒ do every step. `design` ⇒ draw a recommendation and show it before applying
   it (`Rule_Keys_62_DesignChangeApproval`).
3. Read the repo's copy of the skill (`.claude/skills/<name>/SKILL.md`), not HS.

## Example
- Situation: the agent fills the monthly numbers into a regular report template; the repo has a fill skill (`type: process`).
- ✗ Wrong: work from last time's memory and skip the step that checks the total against the source; the report goes out wrong.
- ✓ Right: open the fill skill, do every step including the total check, then send.

## Check
- The read-first latch asks for the skill at the doors a machine can see (`gate.json › read` of the skill: writing under
  `frontend/` ⇒ the app-design skill; running a mail script ⇒ the write-style skill).
- The store reds a skill whose header has no `type:` or a value other than `process` / `design`.

## Luật là gì
Khi việc khớp trigger của một skill trong repo, agent đọc trọn skill đó trước khi làm và làm theo, tuỳ loại skill: skill
`process` thì làm đủ mọi bước; skill `design` chỉ gợi ý, và gợi ý phải trình trước.

## Khi nào áp
- Việc khớp `description` (trigger) của một skill trong repo.

## Phải làm gì
1. Đọc trọn skill trước khi bắt đầu; không làm theo trí nhớ về skill.
2. Xem `type:` ở header của skill. `process` ⇒ làm đủ mọi bước. `design` ⇒ rút khuyến nghị và trình trước khi áp
   (`Rule_Keys_62_DesignChangeApproval`).
3. Đọc bản skill của repo (`.claude/skills/<tên>/SKILL.md`), không đọc HS.

## Ví dụ
- Tình huống: agent đổ số tháng vào mẫu báo cáo định kỳ; repo có skill điền mẫu (`type: process`).
- ✗ Sai: làm theo trí nhớ của lần trước, bỏ bước đối chiếu tổng với nguồn; báo cáo gửi đi lệch số.
- ✓ Đúng: mở skill điền mẫu, làm đủ các bước, kể cả bước đối chiếu tổng, rồi mới gửi.

## Máy kiểm
- Chốt read-first đòi đọc skill ở các cửa máy nhận ra được (`gate.json › read` của skill: ghi dưới `frontend/` ⇒ skill thiết kế
  app; chạy script gửi mail ⇒ skill văn phong).
- Kiểm tra của HS báo đỏ skill mà header không có `type:` hoặc giá trị khác `process` / `design`.

## Links · Liên kết
- Related · Liên quan: `Rule_Keys_62_DesignChangeApproval` — showing a design suggestion first · trình gợi ý thiết kế trước
- Related · Liên quan: `Rule_Gate_59_ReadFirst` — the read-first latch · chốt đọc trước khi ghi
