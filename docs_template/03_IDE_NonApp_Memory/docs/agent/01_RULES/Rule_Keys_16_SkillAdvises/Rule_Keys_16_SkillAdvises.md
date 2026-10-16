---
id: Rule_16
aka: 02-16
name: skill-advises
version: 4
kind: judgment
from: _Store/01_RULES/Rule_Keys_16_SkillAdvises @v4 #414e21356169
---
# Rule_Keys_16_SkillAdvises Skill là tham khảo cho khuyến nghị, không tự áp

- Trước việc skill phủ (thiết kế hoặc nắn UI · dataviz cho báo cáo · review chất lượng · …) ⇒ đọc skill, rút khuyến nghị (nên theo · đang kẹt · nên chuẩn hoá), trình rồi mới làm.
- Với app: đổi giao diện vẫn theo `Rule_Keys_62_UiDesignApproval`; có ý tưởng UI mới ⇒ soi skill để gợi ý lại.
- Quy trình: `04_SKILLS` §1.

## Ví dụ

- Tình huống: Agent đọc một skill thiết kế biểu đồ trước khi làm báo cáo quý.
- ✗ Sai: Áp ngay bảng màu và kiểu biểu đồ trong skill cho toàn bộ báo cáo, khác hẳn mẫu phòng ban đang dùng.
- ✓ Đúng: Rút ra vài khuyến nghị (nên theo, chỗ đang vướng, chỗ nên chuẩn hoá), trình người giao việc, làm phần được duyệt.
