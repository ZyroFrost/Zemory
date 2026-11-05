---
version: 1
lang: vi
---
# Frontend_173_Shell shell — khung mọi app của một hệ cùng mang

## Vai trò

Bản duy nhất của khung mọi app trong một hệ app dùng chung: thanh trên, menu, thanh trang, bộ lọc, cách bảng chạy, hộp thoại,
toast, các cài đặt của mỗi người, và việc đọc phiên duy nhất của hệ. Nó chỉ nằm ở repo quản hệ (`Struc_Repo_SystemManager`): repo
đó build nó và phát các bản có số qua cổng điều hướng; mỗi app của hệ gắn bản có số nó ghim và đưa cho khung phần riêng của mình
(menu, trang, phần thêm).

- Khác `Frontend_003_Frontend` (giao diện riêng của repo): lớp này có luật riêng — chỉ template quản hệ mang nó; các app khác của hệ
  không giữ bản chép và không sửa, chỉ dùng bản phát ở số chúng ghim; nó không import gì của giao diện riêng của repo, còn giao diện
  đó chỉ đi vào nó qua một cửa.
- Khác `Frontend_061_Components` · `Frontend_064_Layouts` · `Frontend_062_Styles`: mỗi slot đó giữ một loại file của một app; đây là
  một gói gồm nhiều loại (component, layout, style, từ điển, client gọi API riêng của hệ) mà mọi app của hệ dùng chung.

## Bên trong

```
frontend/shell/
├── index.ts      cửa duy nhất: mọi thứ app được dùng xuất ở đây; style nạp ở đây, đúng thứ tự
├── config.ts     hợp đồng app đưa cho khung (menu, tên trang, đường dẫn, trang, phần thêm)
├── components/   layouts/   hooks/   util/   styles/   locales/
└── client.*      lời gọi API riêng của hệ (phiên, cài đặt, thông báo)
```

- Loại file: code giao diện (`.ts` · `.tsx` hoặc module thuần), stylesheet, từ điển riêng của khung.
- Thư mục con lấy tên các slot con của giao diện (components · layouts · hooks · util · styles · locales) — không đặt tên mới; chỉ
  chứa file của khung.
- Không bao giờ ở đây: trang của một app, lời gọi API riêng của một app, chữ riêng của một app.
- Không trỏ tới slot con nào.

## Quy tắc

- Một cửa, cả hai chiều: app chỉ import khung qua cửa của nó (một alias như `@<system>/shell`), không bao giờ một file bên trong;
  khung không import gì của app, chỉ gói npm, chính nó và tài nguyên dùng chung của repo (`Frontend_060_Assets`). Build của repo chạy
  một phép kiểm báo đỏ khi vượt ranh giới ở chiều nào.
- Phát theo số: mỗi bản build được phục vụ ở đường mang số của nó và giữ mãi; app ghim một số trong config của nó và chủ động lên số
  mới sau khi chạy phép kiểm trình duyệt của chính nó. Không có "latest".
- Hợp đồng app đưa cho khung đổi theo số của khung: thêm hook hay thẻ = số giữa, sửa lỗi = số cuối.
- Khung trông và chạy thế nào là skill của kiểu hệ khai (`Skill_App_SneatGlass`) — không viết ở đây.

## Ví dụ

Repo quản hệ `AcmeONE` giữ khung ở `frontend/shell/` và trang riêng ở `frontend/src/`; trang của nó chỉ import từ `@acme/shell`. Nó
phát bản khung `1.0.0`; app `AcmeReport` ghim `1.0.0`, gắn khung và đưa cho khung menu dựng từ các bảng của nó.

## Phép kiểm

- `zemory conform` nhận `frontend/shell/` ở repo ráp từ `Struc_Repo_SystemManager`, và báo lệch chuẩn ở mọi nơi khác.
- Phép kiểm ranh giới riêng của repo (trong build) báo đỏ file app với vào trong khung và file khung import app.
