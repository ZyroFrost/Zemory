---
id: Rule_20
aka: 02-20
name: real-vs-sample-data
version: 3
kind: action
applies: [NonApp]
from: _Store/01_RULES/Rule_Gate_20_RealVsSampleData @v3 #51e87e232296
---
# Rule_Gate_20_RealVsSampleData Dữ liệu thật tách khỏi dữ liệu mẫu

- Nguồn / extract THẬT ⇒ `data/` (gitignore, theo máy).
- Mẫu nhỏ đủ mở được sản phẩm giao đi (deliverable) ⇒ `fixtures/` (tracked).
- Phép kiểm: cổng `guard`.

## Ví dụ

- Tình huống: Agent làm báo cáo nhân sự từ file trích xuất lương của cả công ty.
- ✗ Sai: Để file trích xuất thật trong thư mục được git theo dõi; một lần commit là bảng lương đi lên kho mã.
- ✓ Đúng: File thật nằm trong `data/` (bị bỏ qua, chỉ ở máy mình); repo chỉ giữ một bộ mẫu vài dòng dữ liệu giả trong `fixtures/` đủ để mở báo cáo.
