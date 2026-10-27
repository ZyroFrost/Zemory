---
version: 9
lang: vi
---
# Struc_Region_Workspace

`Workspace/` của ổ dữ liệu (`Struc_Disk_Data`) chứa mọi repo của người dùng, chia ba vùng. Chuẩn này không ráp vào repo nào: nó
khai ba vùng và hai loại quan hệ giữa các repo. Bên trong một tổ chức theo `Struc_Region_Company`. Vai của một repo nằm trong
template repo đó ráp theo, không nằm ở đây.

## Cây

```
Workspace/
├── Company/<Tổ chức>/            repo của một tổ chức (Company_144) → Struc_Region_Company
├── Personal/[<Nhóm>/]<repo>/     repo cá nhân (Personal_145)
└── External/<repo>/              clone của bên ngoài, chỉ đọc, không ráp HS (External_146)
```

- Phép kiểm: `zemory conform --layout <Workspace>` — thư mục lạ ở cấp 1 · repo đặt thẳng dưới `Company/` · repo đã ráp HS
  nằm trong `External/`.

## Vai nằm trong template

- Mỗi template repo (`Struc_Repo_*`) khai trong `structure.json` một khối `role`: tên vai · nó quản template nào (`manages`) ·
  nó thuộc quyền template nào (`managed_by`) · luật tổng quản (`owner`: `required` · `optional` · `none`) · dịch vụ nó cung
  cấp cho cụm (`provides`).
- Repo chọn template là biết vai và nhiệm vụ của mình; marker không khai vai.
- Slot của một dịch vụ chung (ví dụ bộ mail chung) chỉ có trong template cung cấp dịch vụ đó; repo dùng dịch vụ không giữ bản riêng.

Vai của tám template repo hiện có (đọc từ `structure.json › role` của từng template):

| template | vai | quản | thuộc quyền | `owner` | cung cấp | ví dụ repo |
|---|---|---|---|---|---|---|
| `Struc_Repo_WorkspaceManager` | `workspace-manager` | `dept` | — | không có | `data` · `workspace-values` · `mail` | kho dữ liệu `_DB_Warehouse` |
| `Struc_Repo_Dept` | `dept` | — | `workspace-manager` | bắt buộc | — | `Dept_FIN` |
| `Struc_Repo_SystemManager` | `system-manager` | `app` · `app-data` | — | không có | `gateway` · `sign-in` | `_Project\ERP\_Hub` |
| `Struc_Repo_App` | `app` | — | `system-manager` | tuỳ chọn | — | `_Project\ERP\AcmeFlow` |
| `Struc_Repo_AppData` | `app-data` | — | `system-manager` | bắt buộc | `app-data` | `_DB_Erp` |
| `Struc_Repo_LogCenter` | `log-center` | — | — | không có | `log` | `_DB_Log` |
| `Struc_Repo_Reference` | `reference` | — | — | không có | `glossary` · `legacy` · `design` (tuỳ repo) | `_Glossary` · `_Legacy` · `_Design` |
| `Struc_Repo_NonApp` | `non-app` | — | — | tuỳ chọn | — | repo cá nhân không phải ứng dụng |

Bảng này chép từ khai báo của template để người đọc tra nhanh; nguồn sự thật là `structure.json` của từng template — sửa
vai thì sửa ở đó rồi sửa bảng này cho khớp.

## Hai loại quan hệ

- **Tổng quản (`owner`) — đường liền, đúng một.** Tổng quản quyết khung và chuẩn của repo nó quản. Repo cấp cao nhất không có tổng
  quản. Hai repo không bao giờ cùng là tổng quản của một repo.
- **Dịch vụ (`uses`) — đường chấm, theo mảng.** Repo dùng dịch vụ của repo khác trong đúng một mảng (dữ liệu · log · mail · khuôn ·
  thuật ngữ …). Bên cung cấp chỉ có tiếng nói trong mảng đó.
- Hai bên nói khác nhau: trong mảng dịch vụ bên cung cấp thắng; mọi chuyện khác tổng quản thắng.

## Khai trong marker của repo

```
"owner": "<tên thư mục repo tổng quản>",
"uses": { "data": "<repo>", "mail": "<repo>", "log": "<repo>", "design": "<repo>", "glossary": "<repo>" }
```

Ví dụ hoàn chỉnh — `docs\.harness.json` của repo phòng tài chính `Dept_FIN` trong tổ chức Acme:

```
"owner": "_DB_Warehouse",
"uses": { "data": "_DB_Warehouse", "design": "_Design", "glossary": "_Glossary" }
```

Đọc ra: kho dữ liệu `_DB_Warehouse` là tổng quản của phòng (đường liền) và đồng thời cấp số liệu cho phòng (đường chấm); phòng
lấy khuôn báo cáo và tài nguyên giao diện từ `_Design` và thuật ngữ từ `_Glossary`.

- `owner`: theo luật `owner` của template; bỏ trống khi template khai `none`.
- `uses`: mỗi mảng trỏ đúng một repo.
- Repo không ráp template nào (khách ngoài, ví dụ một app của bên cung cấp) không khai gì; không ai quản nó.
- Phép kiểm (conform `region-links`): mỗi tên trỏ tới một repo có thật trong cụm · template của tổng quản quản được template của repo
  này · luật `owner` của template được giữ · repo được `uses` có template cung cấp đúng mảng đó. Repo được trỏ chưa ráp template
  nào ⇒ nhắc, chưa đỏ.

## Ranh giới giữa các repo của cụm

- Báo cáo của mọi phòng đọc kho dữ liệu của tổng quản, không trỏ thẳng nguồn của hệ nghiệp vụ.
- Repo cùng một tổng quản không trỏ đường dẫn sang nhau, chỉ nêu TÊN repo. Hai repo cần cùng một thứ ⇒ thứ đó lên tổng quản trước;
  trùng giữa hai repo thì mỗi bên giữ bản chạy độc lập.
- Repo ↔ tổng quản của nó: trỏ được cả hai chiều. Phụ thuộc lúc chạy (mã đọc file của tổng quản) đi qua biến cấu hình hoặc cơ chế
  triển khai của tổng quản, không viết cứng đường dẫn rải trong mã.
- Bộ nhớ chung của các repo trong cụm: thao tác bộ nhớ khớp ĐÚNG `project_root` của repo đang làm, không khớp tiền tố.
