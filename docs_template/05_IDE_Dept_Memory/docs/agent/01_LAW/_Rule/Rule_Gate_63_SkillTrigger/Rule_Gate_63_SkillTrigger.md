---
id: Rule_63
aka: 02-63
name: skill-trigger
version: 6
kind: action
from: _Store/01_LAW/_Rule/Rule_Gate_63_SkillTrigger @v6 #d7da8bdb1b86
---
# Rule_Gate_63_SkillTrigger Việc trúng trigger của skill thì mở skill trước

- Việc khớp trigger (`description`) của một skill trong repo ⇒ đọc trọn skill đó trước khi làm, rồi làm theo. Không làm theo trí nhớ về skill.
- Skill quy trình (bước bắt buộc) ⇒ áp đủ bước. Skill gợi ý thiết kế ⇒ rút khuyến nghị, trình theo `Rule_Keys_62_DesignChangeApproval`.
- Lối đúng: Read trọn skill câu chặn nêu.
- Phép kiểm: read-first đòi đọc skill ở các cửa máy đoán được (`gate.json › read` của skill: ghi `frontend/` ⇒ app-design · chạy script gửi mail ⇒ write-style).

## Ví dụ

- Tình huống: agent được giao đổ số tháng vào mẫu báo cáo định kỳ; repo có skill điền mẫu.
- ✗ Sai: làm theo trí nhớ của lần trước, bỏ bước đối chiếu tổng với nguồn; báo cáo gửi đi lệch số.
- ✓ Đúng: mở skill điền mẫu, làm đủ các bước, kể cả bước đối chiếu tổng, rồi mới gửi.
