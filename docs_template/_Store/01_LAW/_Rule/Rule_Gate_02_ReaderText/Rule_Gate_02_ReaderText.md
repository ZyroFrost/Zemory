---
id: Rule_2
aka: 02-2
name: reader-text
version: 8
kind: action
---
# Rule_Gate_02_ReaderText Văn bản cho người đọc

- Báo cáo · email · tài liệu giao đi · chữ trên giao diện viết cho người nhận.
- Không mang giọng harness: không câu mệnh lệnh, không viết hoa để nhấn, không thuật ngữ nội bộ.
- Nhãn người đọc thấy (giao diện · trang báo cáo · tiêu đề cột · chú thích biểu đồ) dùng từ nghiệp vụ, không dùng tên bảng · cột · mã nội bộ. Ngoại lệ: chỗ cố tình phơi kỹ thuật (ô xem câu truy vấn · hộp chú thích cột).
- Đủ để đọc được: bảng có tiêu đề cột · hình có chú thích · mỗi số có đơn vị và kỳ · một thuật ngữ một tên (`Rule_Gate_35_OneHome`).
- Luật văn phong: `.claude/skills/doc-write-style/SKILL.md`.
- Phép kiểm: hook nhắc đọc skill ở lần ghi văn bản giao đi đầu phiên; read-first đòi đọc skill khi chạy script gửi mail.

## Ví dụ

- Tình huống: agent soạn email báo cáo tuần gửi trưởng phòng ban khác, kèm bảng số.
- ✗ Sai: viết hoa cả câu để nhấn, tiêu đề cột ghi tên cột trong cơ sở dữ liệu, số không ghi đơn vị và kỳ.
- ✓ Đúng: mở bộ luật văn phong trước, viết câu thường, tiêu đề cột bằng từ nghiệp vụ, mỗi số ghi đơn vị và kỳ.
