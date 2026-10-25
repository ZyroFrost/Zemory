---
version: 5
lang: vi
---
# Company_144_Company company — công việc của một tổ chức

## Vai trò

`Workspace\Company\` là workspace chung của MỌI tổ chức chủ máy đã và đang làm việc cho, từ quá khứ tới tương lai: công ty và khách
của việc freelance. Mỗi tổ chức có ĐÚNG MỘT thư mục `Workspace\Company\<Tổ chức>\`; mọi việc của nó nằm bên trong, theo khung
`Struc_Region_Company` — repo theo vai, và thư mục công việc không phải repo (thiết kế, bản vẽ, dự án cũ).

Việc freelance có thư mục tổ chức riêng, `Workspace\Company\Freelance\`. Freelance là việc làm CHO một người hay một khách ngoài
mọi công ty, có lấy tiền hay không: báo cáo làm hộ một người bạn là freelance. Mỗi người nhận một thư mục, `Freelance\<Người nhận>\`,
chứa việc đúng như nó là — một repo, hoặc file rời (đề bài, ảnh mẫu, file yêu cầu, báo cáo cuối). Cách chia bên trong thư mục của
một người nhận để chủ máy tự quyết.

## Ví dụ

```
Workspace\Company\
├── Acme\                  một công ty
│   ├── Dept_FIN\          repo của một phòng ban
│   ├── _DB_Warehouse\     repo DW
│   └── Designs\           thư mục công việc không phải repo
├── Globex\                một công ty cũ — cây riêng, không trộn với Acme
└── Freelance\             việc cho người ngoài mọi công ty, có lấy tiền hay không
    └── <Người nhận>\       mỗi người hay mỗi khách một thư mục: một repo, hoặc file rời
```

## Luật

- Cấp `Company\` chỉ có thư mục tổ chức. Repo đặt thẳng dưới `Company\` là sai: dời nó vào thư mục của tổ chức sở hữu nó.
- Một món thuộc một tổ chức. Làm cho hai tổ chức là hai món, mỗi món ở thư mục tổ chức của nó.
- GIẤY TỜ của chủ máy với tổ chức (hợp đồng, đánh giá, bàn giao, logo, hồ sơ công ty, mật khẩu hệ thống của nó) cũng nằm ở đây, theo
  luật khối: `Workspace\Company\<Tổ chức>\_Profile\` (Profile_170).
- Không chứa: code của chính chủ máy (`Personal\`) · code của người khác (`External\`) · giấy tờ dùng cho mọi tổ chức (CV, định danh)
  ⇒ `Documents\Profile\`.

## Khuôn tên

Tên ngắn của tổ chức, PascalCase, không dấu cách: `Acme` · `Globex`. Cùng một tổ chức thì cùng một tên trên mọi máy.

## Phép kiểm

`zemory conform --layout <ổ>\Workspace`: repo đặt thẳng dưới `Company\` (`repo-under-company`); bên trong mỗi tổ chức, các phép kiểm
của `Struc_Region_Company`.
