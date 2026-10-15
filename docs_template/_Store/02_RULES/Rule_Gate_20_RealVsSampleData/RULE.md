---
id: Rule_20
aka: 02-20
name: real-vs-sample-data
version: 2
kind: action
applies: [NonApp]
---
# Rule_Gate_20_RealVsSampleData Dữ liệu thật tách khỏi dữ liệu mẫu

- Nguồn / extract THẬT ⇒ `data/` (gitignore, theo máy).
- Mẫu nhỏ đủ mở được sản phẩm giao đi (deliverable) ⇒ `fixtures/` (tracked).
- Phép kiểm: cổng `guard`.
