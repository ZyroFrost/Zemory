---
version: 4
lang: vi
---
# Workspace_143_Workspace workspace — code, repo và việc cho tổ chức

## Vai trò

`<gốc dữ liệu>\Workspace\` là bước 7 của chuỗi câu hỏi cấp ổ (`Struc_Disk_Data`): code hoặc repo, hoặc việc làm cho một tổ chức.
Repo là thư mục có `.git\`, hoặc thư mục đã ráp HS (`docs\.harness.json`). Repo nằm ở bất kỳ chỗ nào khác trên ổ là lệch chuẩn và
phải dời vào đây.

## Câu hỏi của cấp này — đáp án đúng đầu tiên thắng

| bước | sự thật | đặt ở |
|---|---|---|
| 1 | việc làm cho một tổ chức (công ty đã hoặc đang làm, khách của việc freelance) — cả repo lẫn thư mục công việc không phải repo | `Company\<Tổ chức>\` (Company_144) |
| 2 | code do người khác viết — luôn luôn, kể cả clone về để học (bản fork có commit của chủ máy là code của chủ máy: bước 3) | `External\<repo>\` (External_146) |
| 3 | còn lại: code của chính chủ máy | `Personal\<Loại>\…` (Personal_145) |

```
Workspace\
├── Company\<Tổ chức>\…   việc cho một tổ chức (Company_144) — bên trong theo khung Struc_Region_Company
├── External\<repo>\      code của người khác, chỉ đọc (External_146)
└── Personal\<Loại>\…     code của chính chủ máy: StudyProjects · Games · Apps (Personal_145)
```

## Luật

- Cấp `Workspace\` chỉ có `Company\` · `External\` · `Personal\`: không repo đặt thẳng ở đây, không file lẻ, không thư mục thứ tư.
- Không chứa: bản cài phần mềm (`Software\`) · thiết lập và khoá công cụ (`_ConfigVault\`) · giấy tờ về chủ máy hay về một tổ chức
  (`Documents\Profile\`).
- Tên `Workspace` viết đúng như vậy trên mọi máy, kể cả máy Linux.

## Đồng bộ

`Workspace\` không đồng bộ nguyên khối. Mỗi repo tự đi đường của nó: git cho mã · Syncthing cho thư mục dữ liệu chung (`_Glossary\`)
· kênh zemory cho tài liệu harness.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` (hoặc `<ổ>\Workspace`): thư mục không thuộc vùng nào (`unknown-folder`) · repo đặt thẳng dưới
`Company\` (`repo-under-company`) · HS ráp vào một clone trong `External\` (`assembled-external`) · thư mục dưới `Personal\` ngoài
các loại của nó (`unknown-value`) · repo nằm ngoài `Workspace\` (`repo-outside-workspace`, khi kiểm từ gốc ổ).
