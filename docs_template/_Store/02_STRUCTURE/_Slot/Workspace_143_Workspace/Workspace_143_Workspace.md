---
id: Slot_143
name: workspace
version: 2
path: Workspace/
scope: layout
---
# Workspace_143_Workspace workspace — mọi repo của người dùng

## Vai trò

`<ổ dữ liệu>\Workspace\` là thư mục DUY NHẤT trên ổ được chứa repo. "Repo" ở đây là thư mục có `.git\`, hoặc thư mục đã
ráp HS (có `docs\.harness.json`). Một repo nằm ở bất kỳ chỗ nào khác trên ổ (trong `Software\`, `Documents\`, ở gốc ổ…) là
lệch chuẩn và phải dời vào đây.

## Cây — đúng ba vùng, không gì khác

```
Workspace\
├── Company\<Tổ chức>\…     repo của một tổ chức (Company_144) — bên trong theo khung Struc_Region_Company
├── Personal\[<Nhóm>\]<repo>\   repo của chính người dùng (Personal_145)
└── External\<repo>\        clone của bên ngoài, chỉ đọc (External_146)
```

Ví dụ thật:
- `D:\Workspace\Company\Acme\Dept_FIN\` — repo của phòng tài chính tổ chức Acme.
- `D:\Workspace\Personal\MyTool\` — một công cụ của chính người dùng.
- `D:\Workspace\External\some-library\` — thư viện của người khác clone về để đọc.

## Luật

- Cấp `Workspace\` chỉ có ba thư mục `Company\` · `Personal\` · `External\`. Không có repo đặt thẳng ở đây, không có file lẻ,
  không có thư mục thứ tư.
- Không chứa: bản cài phần mềm (để ở `Software\`) · cấu hình và khoá công cụ (`AppConfig\`) · tài liệu cá nhân (`Documents\`).
- Phân biệt ba vùng theo CHỦ của repo: tổ chức ⇒ `Company\`; chính người dùng (kể cả dự án làm chung với nhóm ngoài tổ chức)
  ⇒ `Personal\`; người khác viết, mình chỉ đọc ⇒ `External\`.
- Tên `Workspace` viết đúng như vậy (W hoa, phần còn lại thường) trên mọi máy, kể cả máy Linux.

## Đồng bộ

Thư mục `Workspace\` KHÔNG đồng bộ nguyên khối. Mỗi repo tự đi đường của nó: git cho mã · Syncthing cho thư mục dữ liệu chung
(ví dụ `_Glossary\`) · kênh zemory cho tài liệu harness.

## Phép kiểm

`zemory conform --layout <gốc ổ>` (hoặc `zemory conform --layout <ổ>\Workspace`): thư mục lạ ở cấp `Workspace\`
(`unknown-folder`) · repo đặt thẳng dưới `Company\` (`repo-under-company`) · HS ráp vào một clone trong `External\`
(`assembled-external`) · repo nằm ngoài `Workspace\` (`repo-outside-workspace`, khi kiểm từ gốc ổ).
