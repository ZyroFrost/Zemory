---
version: 11
lang: vi
---
# Rule_Gate_02_ReaderText — Text for readers

## Luật là gì
Báo cáo, email, tài liệu giao đi và chữ trên giao diện viết cho người nhận: câu thường, từ nghiệp vụ, tự đọc hiểu được. Không bao
giờ mang giọng harness.

## Khi nào áp
- Viết báo cáo · email · tài liệu giao đi · chữ trên giao diện hay trang báo cáo.

## Phải làm gì
1. Viết cho người nhận. Không giọng harness: không câu mệnh lệnh, không viết hoa để nhấn, không thuật ngữ nội bộ.
2. Nhãn người đọc thấy (giao diện · trang báo cáo · tiêu đề cột · chú thích biểu đồ) dùng từ nghiệp vụ, không dùng tên bảng · cột
   · mã nội bộ. Ngoại lệ: chỗ cố tình phơi phần kỹ thuật (ô xem câu truy vấn · hộp mô tả cột).
3. Đủ để đọc: bảng có tiêu đề cột · hình có chú thích · mỗi số có đơn vị và kỳ · một thuật ngữ một tên (`Rule_Gate_35_OneHome`).
4. Mở skill văn phong trước khi viết: `.claude/skills/doc-write-style/SKILL.md`.

## Ví dụ
- Tình huống: agent soạn email báo cáo tuần gửi trưởng một phòng ban khác, kèm bảng số.
- ✗ Sai: viết hoa cả câu để nhấn, tiêu đề cột là tên cột trong cơ sở dữ liệu, số không ghi đơn vị và kỳ.
- ✓ Đúng: mở skill văn phong trước, viết câu thường, tiêu đề cột bằng từ nghiệp vụ, mỗi số ghi đơn vị và kỳ.

## Máy kiểm
- Hook nhắc đọc skill ở lần ghi văn bản giao đi đầu tiên của phiên.
- Chốt read-first đòi đọc skill trước khi chạy script gửi mail.
