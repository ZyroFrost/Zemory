---
id: Struc_Region_Workspace
name: region-workspace
version: 2
scope: region
checked: [Struc_Repo_Dept]
---
# Struc_Region_Workspace

Workspace là tên chung của cả cụm: một thư mục chứa nhiều repo của cùng một tổ chức. Chuẩn này không ráp vào repo nào. Nó khai cụm
là gì và hai loại quan hệ giữa các repo. Vai của một repo nằm trong template repo đó ráp theo, không nằm ở đây.

## Vai nằm trong template

- Mỗi template repo (`Struc_Repo_*`) khai trong `structure.json` một khối `role`: tên vai · nó quản template nào (`manages`) ·
  nó thuộc quyền template nào (`managed_by`) · luật tổng quản (`owner`: `required` · `optional` · `none`) · dịch vụ nó cung
  cấp cho cụm (`provides`).
- Repo chọn template là biết vai và nhiệm vụ của mình; marker không khai vai.
- Slot của một dịch vụ chung (ví dụ kho mail) chỉ có trong template cung cấp dịch vụ đó; repo dùng dịch vụ không giữ bản riêng.

## Hai loại quan hệ

- **Tổng quản (`owner`) — đường liền, đúng một.** Tổng quản quyết khung và chuẩn của repo nó quản. Repo cấp cao nhất không có tổng
  quản. Hai repo không bao giờ cùng là tổng quản của một repo.
- **Dịch vụ (`uses`) — đường chấm, theo mảng.** Repo dùng dịch vụ của repo khác trong đúng một mảng (dữ liệu · log · mail · khuôn ·
  thuật ngữ …). Bên cung cấp chỉ có tiếng nói trong mảng đó.
- Hai bên nói khác nhau: trong mảng dịch vụ bên cung cấp thắng; mọi chuyện khác tổng quản thắng.

## Khai trong marker của repo

```
"owner": "<tên thư mục repo tổng quản>",
"uses": { "data": "<repo>", "mail": "<repo>", "log": "<repo>", "template": "<repo>", "glossary": "<repo>" }
```

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
