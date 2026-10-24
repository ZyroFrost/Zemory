---
version: 4
lang: vi
---
# Documents_152_Documents documents — giấy tờ người đọc

## Vai trò

`<gốc dữ liệu>\Documents\` là bước 13 của chuỗi câu hỏi cấp ổ (`Struc_Disk_Data`): giấy tờ và hồ sơ mà NGƯỜI mở ra đọc. Cấu hình hay
khoá mà chương trình hoặc agent tự đọc không phải giấy tờ ⇒ `_ConfigVault\` (bước 5). Bộ sưu tập avatar là bước 11 và cũng nằm ở đây,
trong `Profile\Personal\Avatar\`.

## Câu hỏi của cấp này

| sự thật | đặt ở |
|---|---|
| về chủ máy, gắn với một tổ chức (hợp đồng, đánh giá, bàn giao, logo, hồ sơ công ty — giấy tờ về hoặc của tổ chức đó) | `Profile\Company\<Tổ chức>\` |
| về chủ máy, còn lại | `Profile\Personal\` — `Identity\` (giấy tờ định danh, ảnh thẻ) · `Avatar\` · `CV\` · `Secret\` |
| về gia đình chủ máy (gia phả, hồ sơ gia đình) | `Family\` |

```
Documents\
├── Profile\
│   ├── Personal\   Identity\ · Avatar\ · CV\ · Secret\
│   └── Company\<Tổ chức>\
└── Family\
```

Cả cây có MỘT thư mục `Company` cho giấy tờ (`Documents\Profile\Company\<Tổ chức>\`) và MỘT cho công việc (`Workspace\Company\<Tổ
chức>\`); sự thật tách chúng: người đọc ⇒ ở đây; là việc làm cho tổ chức ⇒ Workspace.

## Luật

- `Profile\Personal\Secret\` chứa bí mật mà NGƯỜI đọc (mật khẩu web, cụm từ ví). Theo luật cấm đồng bộ của `_ConfigVault`: KHÔNG BAO GIỜ
  vào git, KHÔNG nằm trong thư mục đồng bộ (Syncthing), KHÔNG nằm trong thư mục sao lưu đám mây (Drive).
- Chương trình tìm thấy ở đây (phần mềm gia phả, một `.exe`) ⇒ `Software\`; font tải về ⇒ `Software\Fonts\`.
- Việc làm cho một tổ chức (thiết kế, code, file dự án) ⇒ `Workspace\Company\<Tổ chức>\`.
- Bên trong mỗi thư mục chia tiếp tuỳ nhu cầu; không có file lẻ ở cấp `Documents\` hay `Profile\`.

## Khuôn tên

Tiếng Anh, PascalCase, không dấu cách. Tên tổ chức giống trong `Workspace\Company\`.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` báo đỏ (`unknown-value`) thư mục trong `Documents\` ngoài `Profile` và `Family`, và repo nằm
trong nó (`repo-outside-workspace`). Chưa có phép kiểm máy cho bí mật lọt vào thư mục đồng bộ.
