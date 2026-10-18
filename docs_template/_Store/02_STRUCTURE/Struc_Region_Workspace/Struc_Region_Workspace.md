---
id: Struc_Region_Workspace
name: region-workspace
version: 1
scope: region
checked: [Struc_Repo_Dept]
---
# Struc_Region_Workspace

Chuẩn cấu trúc của một vùng (workspace): thư mục chứa nhiều repo cùng một tổ chức. Chuẩn này không ráp vào repo nào; nó khai
các VAI một repo có thể giữ, ai quản ai, và mảng dịch vụ mỗi vai cung cấp. Tên repo thật của vùng nằm trong marker của từng
repo, không nằm ở đây.

## Hai loại quan hệ

- **Tổng quản (`owner`) — đường liền, đúng một.** Tổng quản quyết khung và chuẩn của repo nó quản (bộ mẫu, giá trị vùng, chuẩn
  báo cáo). Repo cấp cao nhất không có tổng quản. Hai repo không bao giờ cùng là tổng quản của một repo.
- **Dịch vụ (`uses`) — đường chấm, theo mảng.** Repo dùng dịch vụ của repo khác trong đúng một mảng (dữ liệu · log · khuôn ·
  thuật ngữ …). Bên cung cấp chỉ có tiếng nói trong mảng đó.
- Hai bên nói khác nhau: trong mảng dịch vụ (ví dụ định dạng log) bên cung cấp thắng; mọi chuyện khác tổng quản thắng.

## Vai

| Vai (`role`) | Quản (`manages`) | Cung cấp (`provides`) |
|---|---|---|
| `region-manager` | `dept` | `data` · `region-values` |
| `system-manager` | `app` · `app-data` | — |
| `app-data` | — | `app-data` |
| `log-center` | — | `log` |
| `reference` | — | `glossary` · `legacy` · `template` |
| `dept` | — | — |
| `app` | — | — |
| `guest` | — | — |

- `guest`: khách ngoài ghé thăm (vùng `Vendor`): không thuộc hệ thống, không tổng quản, không dùng dịch vụ của vùng, không ai
  quản; conform không đòi quan hệ nào với nó.

Danh sách máy đọc nằm ở `structure.json` cạnh file này.

## Khai trong marker của repo

```
"role": "dept",
"owner": "<repo tổng quản>",
"uses": { "data": "<repo kho dữ liệu>", "log": "<repo log>", "template": "<repo khuôn>", "glossary": "<repo thuật ngữ>" }
```

- `owner`: tên thư mục repo tổng quản; bỏ trống khi repo ở cấp cao nhất.
- `uses`: mỗi mảng trỏ đúng một repo.
- Phép kiểm (conform `region-links`): mỗi tên trỏ tới một repo có thật trong vùng · vai của tổng quản quản được vai của repo
  này · repo được `uses` cung cấp đúng mảng đó · một repo tối đa một tổng quản.

## Ranh giới giữa các repo của vùng

- Báo cáo của mọi phòng đọc kho dữ liệu của vùng, không trỏ thẳng nguồn của hệ nghiệp vụ.
- Repo cùng một tổng quản không trỏ đường dẫn sang nhau, chỉ nêu TÊN repo. Hai repo cần cùng một thứ ⇒ thứ đó lên tổng quản
  trước; trùng giữa hai repo thì mỗi bên giữ bản chạy độc lập.
- Repo ↔ tổng quản của nó: trỏ được cả hai chiều. Phụ thuộc lúc chạy (mã đọc file của tổng quản) đi qua biến cấu hình hoặc cơ
  chế triển khai của tổng quản, không viết cứng đường dẫn rải trong mã.
- Bộ nhớ chung của các repo trong vùng: thao tác bộ nhớ khớp ĐÚNG `project_root` của repo đang làm, không khớp tiền tố.
