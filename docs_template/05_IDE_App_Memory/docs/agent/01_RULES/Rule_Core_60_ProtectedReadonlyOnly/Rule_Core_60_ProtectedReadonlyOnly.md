---
id: Rule_60
aka: 02-60
name: protected-readonly-only
version: 3
kind: judgment
from: _Store/01_RULES/Rule_Core_60_ProtectedReadonlyOnly @v3 #0e639e1e4237
---
# Rule_Core_60_ProtectedReadonlyOnly `protected` chỉ trỏ vào thứ chỉ đọc

- Khoá `protected` chỉ trỏ vào thứ chỉ đọc: đầu vào gốc `data/*/01_raw` · hiến pháp · két bí mật.
- Không trỏ vào sản phẩm repo đang xây: cổng kêu ở mọi lượt sửa thường ngày sẽ bị bỏ qua.
- Chống sửa nhầm sản phẩm bằng git.

## Ví dụ

- Tình huống: nhóm muốn tránh việc agent sửa nhầm file báo cáo chính đang được hoàn thiện hằng ngày.
- ✗ Sai: khai file báo cáo đó vào vùng cấm ghi, rồi lần sửa nào cũng phải xin phép.
- ✓ Đúng: vùng cấm chỉ dành cho thứ chỉ đọc (dữ liệu gốc nhận vào, hiến pháp, két bí mật); chống sửa nhầm sản phẩm thì dựa vào git để xem lại và quay lui.
