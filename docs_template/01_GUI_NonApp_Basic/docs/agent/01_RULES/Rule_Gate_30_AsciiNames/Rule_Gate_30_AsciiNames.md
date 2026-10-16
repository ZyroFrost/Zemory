---
id: Rule_30
aka: 02-30
name: ascii-names
version: 10
kind: content
from: _Store/01_RULES/Rule_Gate_30_AsciiNames @v10 #5e40e14d431e
---
# Rule_Gate_30_AsciiNames Định danh và tên file: ASCII tiếng Anh

- Định danh và tên file chỉ dùng ASCII tiếng Anh; trong mã chỉ chú thích được viết tiếng Việt.
- Phủ: biến · hằng · hàm · lớp · kiểu · tham số · khoá config/JSON · tên test · tên file · tên thư mục · tên nhánh git.
- Cấm cả dạng tiếng Việt có dấu lẫn tiếng Việt mất dấu ghép lại.
- Miễn trừ: ba thứ ở `Rule_Gate_29_CodeEnglish` (dữ liệu, không phải định danh).
- Máy soi: `node .claude/skills/harness-audit/scripts/lang-scan.mjs .`
- Phép kiểm: cổng `guard`.
