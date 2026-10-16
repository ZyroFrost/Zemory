---
id: Rule_60
aka: 02-60
name: protected-readonly-only
version: 2
kind: judgment
from: _Store/01_RULES/Rule_Core_60_ProtectedReadonlyOnly @v2 #af96cb6241f2
---
# Rule_Core_60_ProtectedReadonlyOnly `protected` chỉ trỏ vào thứ chỉ đọc

- Khoá `protected` chỉ trỏ vào thứ chỉ đọc: đầu vào gốc `data/*/01_raw` · hiến pháp · két bí mật.
- Không trỏ vào sản phẩm repo đang xây: cổng kêu ở mọi lượt sửa thường ngày sẽ bị bỏ qua.
- Chống sửa nhầm sản phẩm bằng git.
