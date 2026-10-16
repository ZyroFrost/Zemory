---
id: Rule_31
aka: 02-31
name: text-correct
version: 5
kind: judgment
from: _Store/01_RULES/Rule_Keys_31_TextCorrect @v5 #a324437f56a1
---
# Rule_Keys_31_TextCorrect Chữ người đọc thấy phải đủ và đúng

- Phạm vi: chữ người dùng đọc trong app và chữ trong sản phẩm giao đi.
- ① Có dấu, đúng chính tả. Không có tiếng Việt mất dấu ở bất cứ file nào (plan · docs · chú thích · tên test · chuỗi sinh máy · JSON cấu hình): chỉ tiếng Anh hoặc tiếng Việt có dấu — ngại encoding thì viết tiếng Anh. Không mojibake (`Ã¡` · `â€` · `ï»¿`).
- ② Chú thích đủ: bảng có tiêu đề cột · hình có chú thích · mỗi số có đơn vị và kỳ.
- ③ Một thuật ngữ một tên xuyên suốt (đối chiếu từ điển dự án nếu có).
- App: nhãn đủ · song ngữ đủ hai đầu · UI khớp mã ⇒ `.claude/skills/dev-app-design/SKILL.md` §F4 / §F7.
- Cách đo và bẫy báo oan: `.claude/skills/harness-audit/SKILL.md` (mặt 11 · 12).

## Ví dụ

- Tình huống: giao một báo cáo tháng có bảng và biểu đồ cho phòng kinh doanh.
- ✗ Sai: tiêu đề cột bị lỗi mã hoá thành `Doanh thu thÃ¡ng`, biểu đồ không chú thích, con số không ghi đơn vị và kỳ; cùng một chỉ số chỗ gọi "doanh số", chỗ gọi "doanh thu".
- ✓ Đúng: chữ có dấu đúng, không ký tự lỗi; bảng có tiêu đề cột, hình có chú thích, mỗi số ghi đơn vị và kỳ; một thuật ngữ một tên xuyên suốt.
