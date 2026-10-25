---
version: 5
lang: vi
---
# Documents_152_Documents documents — giấy tờ của chính chủ máy, dùng cho mọi tổ chức

## Vai trò

`<gốc dữ liệu>\Documents\` là bước 13 của chuỗi câu hỏi cấp ổ (`Struc_Disk_Data`): giấy tờ và hồ sơ mà NGƯỜI đọc, không thuộc riêng
tổ chức nào. Theo luật khối, thứ thuộc về MỘT tổ chức — hợp đồng, đánh giá, bàn giao, logo, hồ sơ công ty, mật khẩu hệ thống của công
ty — nằm trong khối của tổ chức đó, `Workspace\Company\<Tổ chức>\_Profile\` (Profile_170). Cấu hình hay khoá mà chương trình hoặc agent
tự đọc không phải giấy tờ ⇒ `_ConfigVault\` (bước 5).

## Câu hỏi của cấp này

| sự thật | đặt ở |
|---|---|
| về chủ máy, dùng cho bất kỳ tổ chức nào | `Profile\` — `Identity\` (giấy tờ định danh, ảnh thẻ) · `Avatar\` · `CV\` · `Secret\` (bí mật cá nhân) |
| về gia đình chủ máy (gia phả, hồ sơ gia đình) | `Family\` |

```
Documents\
├── Profile\   Identity\ · Avatar\ · CV\ · Secret\
└── Family\
```

## Luật

- Không có thư mục `Company` ở đây: giấy tờ của một tổ chức ⇒ `Workspace\Company\<Tổ chức>\_Profile\`.
- `Profile\Secret\` chứa bí mật cá nhân mà NGƯỜI đọc (mật khẩu web, cụm từ ví). Theo luật cấm đồng bộ của `_ConfigVault`: KHÔNG BAO GIỜ
  vào git, KHÔNG nằm trong thư mục đồng bộ (Syncthing), KHÔNG nằm trong thư mục sao lưu đám mây (Drive).
- Chương trình tìm thấy ở đây (phần mềm gia phả, một `.exe`) ⇒ `Software\`; font tải về ⇒ `Software\Fonts\`.
- Bên trong mỗi thư mục chia tiếp tuỳ nhu cầu; không có file lẻ ở cấp `Documents\` hay `Profile\`.

## Khuôn tên

Tiếng Anh, PascalCase, không dấu cách: `Identity` · `Avatar` · `CV` · `Secret` · `Family`.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` báo đỏ (`unknown-value`) thư mục trong `Documents\` ngoài `Profile` và `Family`, và repo nằm
trong nó (`repo-outside-workspace`). Chưa có phép kiểm máy cho bí mật lọt vào thư mục đồng bộ.
