---
id: Rule_30
aka: 02-30
name: dinh-danh-va-ten-file
version: 1
kind: content
---
# Rule_Gate_30_DinhDanhVaTenFile Định danh và tên file: ASCII tiếng Anh

- `02-30` **Định danh và tên file: ASCII tiếng Anh** (comment cũng tiếng Anh: `02-29`). Phủ: biến ·
  hằng · hàm · lớp · kiểu · tham số · khoá config/JSON · tên test · tên file · tên thư mục · tên nhánh git. Cấm cả
  dạng có dấu lẫn Việt mất dấu ghép lại. Miễn trừ: ba thứ ở `02-29` (dữ liệu, không phải định danh). Máy soi:
  `node .claude/skills/audit/scripts/lang-scan.mjs .` <!-- gate: guard -->
