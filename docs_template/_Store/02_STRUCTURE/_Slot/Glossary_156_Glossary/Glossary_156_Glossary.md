---
id: Slot_156
name: glossary
version: 2
path: _Glossary/
scope: layout
---
# Glossary_156_Glossary glossary — bảng thuật ngữ chung

## Vai trò

`Workspace\Company\<Tổ chức>\_Glossary\` là nơi DUY NHẤT trong tổ chức định nghĩa thuật ngữ dùng chung: từ ngữ nghiệp vụ và
định nghĩa dữ liệu (tên trường, cách tính chỉ số). Mọi phòng ban tra ở đây; không phòng nào giữ bảng thuật ngữ riêng. Đây là
nơi cung cấp vai `glossary` của tổ chức, ráp khung `Struc_Repo_Reference`.

## Cây

```
_Glossary\
├── Business\     thuật ngữ nghiệp vụ — ví dụ "doanh thu thuần" nghĩa là gì, "khách hàng mới" tính từ ngày nào
└── Data\         định nghĩa dữ liệu — ví dụ trường `net_revenue` lấy từ bảng nào, chỉ số "tỉ lệ giữ chân" tính ra sao
```

## Luật

- Một tổ chức có đúng MỘT `_Glossary\`. Thuật ngữ mới thêm vào đây, không viết lại định nghĩa trong repo phòng ban.
- `_Glossary\` là thư mục ĐỒNG BỘ bằng Syncthing (có dấu `.stfolder`), KHÔNG phải repo git: không `git init`, không push.
- Chỉ chứa định nghĩa. Không chứa báo cáo, dữ liệu, mã.

## Khuôn tên

`_Glossary`, cố định, viết đúng như vậy. Hai thư mục con `Business` · `Data` viết đúng như vậy.

## Phép kiểm

`zemory conform --layout <ổ>\Workspace\Company\<Tổ chức>` kiểm `_Glossary` là thư mục hợp lệ của tổ chức. Chưa có phép kiểm
máy cho nội dung bên trong.
