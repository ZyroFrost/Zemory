---
id: 02-30
name: ascii-names
version: 1
kind: content
---
# 02-30 Định danh và tên file: ASCII tiếng Anh

- Định danh và tên file chỉ dùng ASCII tiếng Anh; trong mã chỉ chú thích được viết tiếng Việt.
- Phủ: biến · hằng · hàm · lớp · kiểu · tham số · khoá config/JSON · tên test · tên file · tên thư mục · tên nhánh git.
- Cấm cả dạng tiếng Việt có dấu lẫn tiếng Việt mất dấu ghép lại.
- Miễn trừ: ba thứ ở `02-29` (dữ liệu, không phải định danh).
- Máy soi: `node .claude/skills/audit/scripts/lang-scan.mjs .`
- Phép kiểm: cổng `guard`.
