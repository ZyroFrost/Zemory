---
id: Rule_2
aka: 02-2
name: reader-text
version: 7
kind: action
from: _Store/01_RULES/Rule_Gate_02_ReaderText @v7 #7e2b0a5549c7
---
# Rule_Gate_02_ReaderText Văn bản đưa người đọc theo bộ luật văn phong

- Báo cáo · email · tài liệu giao đi viết cho người nhận.
- Không mang giọng harness: không câu mệnh lệnh, không viết hoa để nhấn giọng, không thuật ngữ nội bộ.
- Luật văn phong: `.claude/skills/doc-write-style/SKILL.md`.
- Phép kiểm: cổng `guard`.

## Ví dụ

- Tình huống: Agent soạn email báo cáo tuần gửi trưởng phòng ban khác.
- ✗ Sai: Email viết hoa cả câu để nhấn, dùng ký hiệu nội bộ như mã luật, tên lệnh, kèm mấy cụm từ sáo nghe rõ giọng máy.
- ✓ Đúng: Mở bộ luật văn phong trước khi viết, viết câu thường, dùng từ người nhận hiểu, chỉ nêu việc đã làm và con số, đọc lại theo danh sách cấm rồi mới gửi.
