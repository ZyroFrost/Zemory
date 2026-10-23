---
version: 9
lang: vi
---
# Rule_Gate_63_SkillTrigger — Work that matches a skill opens the skill first

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
