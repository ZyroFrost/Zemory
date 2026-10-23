---
id: Slot_144
name: company
version: 2
path: Company/<Tổ chức>/
scope: layout
---
# Company_144_Company company — repo của một tổ chức

## Vai trò

`Workspace\Company\` chứa repo của các tổ chức mà người dùng làm việc cho (công ty, khách hàng). MỖI tổ chức có ĐÚNG MỘT
thư mục riêng `Workspace\Company\<Tổ chức>\`, và mọi repo của tổ chức đó nằm bên trong thư mục này, xếp theo khung
`Struc_Region_Company` (phòng ban `Dept_<Mã>\` · hệ dữ liệu `_DB_<Hệ>\` · dự án `_Project\` · thuật ngữ `_Glossary\` · khuôn
báo cáo `_<Công cụ>_Template\` · lưu trữ `_Legacy\`).

## Ví dụ

```
Workspace\Company\
├── Acme\                  tổ chức thứ nhất
│   ├── Dept_FIN\          repo phòng tài chính
│   ├── _DB_Warehouse\     repo kho dữ liệu
│   └── _Project\ERP\AcmeFlow\
└── Globex\                tổ chức thứ hai — cây riêng, không trộn với Acme
```

## Luật

- Cấp `Company\` chỉ có thư mục tổ chức. Một repo đặt thẳng dưới `Company\` (`Workspace\Company\AcmeFlow\`) là sai: nó phải
  nằm trong thư mục của tổ chức sở hữu nó (`Workspace\Company\Acme\_Project\ERP\AcmeFlow\`).
- Một repo thuộc đúng một tổ chức. Làm cho hai tổ chức thì là hai repo, mỗi repo ở thư mục tổ chức của nó.
- Không chứa repo cá nhân (`Personal\`) hay clone của bên ngoài (`External\`).

## Khuôn tên

Tên ngắn của tổ chức, PascalCase, không dấu, không dấu cách: `Acme` · `Globex`. Cùng một tổ chức thì cùng một tên trên mọi máy.

## Phép kiểm

`zemory conform --layout <ổ>\Workspace`: repo đặt thẳng dưới `Company\` (`repo-under-company`); bên trong mỗi tổ chức, thư mục
không thuộc vai nào của `Struc_Region_Company` (`unknown-folder`).
