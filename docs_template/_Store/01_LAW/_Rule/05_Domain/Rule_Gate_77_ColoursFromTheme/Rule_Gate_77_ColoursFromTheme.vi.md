---
version: 1
lang: vi
---
# Rule_Gate_77_ColoursFromTheme — Mọi màu của app lấy từ token của theme

## Luật là gì
App của một hệ mặc theme của khung: người dùng chọn một tông (Cài đặt) và mọi màu của trang theo tông đó - nút đang bật,
switch đang bật, link, bảng, thanh cuộn. Màu viết cứng (`#hex`, `rgb()`, `rgba()`, `hsl()`) trong stylesheet không bao giờ
theo: tông nào, sáng hay tối, nó cũng giữ nguyên. Vì vậy stylesheet của app, hay của khung, không viết màu cứng: nó dùng token
của khung.

## Khi nào áp
- Viết hoặc sửa một stylesheet (`.css`, `.scss`, `.less`) của app hay của khung.

## Phải làm gì
1. Dùng token: `var(--g-accent)`, `var(--g-accent-2)`, `rgba(var(--g-accent-rgb), .16)`, `var(--g-on-accent)` (chữ trên nền
   màu nhấn), `var(--g-text)`, `var(--g-muted)`, `var(--g-pop)`, `var(--g-solid)`, `rgba(var(--g-shade-rgb), .3)` (bóng),
   `rgba(var(--g-light-rgb), .5)` (ánh sáng), cặp màu trạng thái `--g-good` · `--g-warn` · `--g-danger`.
2. Khung thiếu token cần dùng ⇒ nhờ repo quản hệ thêm vào khung; không bao giờ viết màu cứng trong app.
3. Màu không được theo tông - logo thương hiệu, màu chính thức của nút đăng nhập, trang giữ một kiểu cố định - ghi chú ngay trên
   dòng đó: `/* theme-fixed: <lý do> */`.
4. Dòng khai token (`--x: #…`), ô xem trước ảnh nền của khung (`.sw[data-w]`), mask và `url(#id)` không phải màu của trang,
   cho qua.

## Ví dụ
- Tình huống: một app tô dòng đang chọn.
- ✗ Sai: `tr.on { background: rgba(124, 196, 255, .16); }` - màu xanh gốc, cả khi đang dùng tông đỏ của thương hiệu.
- ✓ Đúng: `tr.on { background: rgba(var(--g-accent-rgb), .16); }` - màu nhấn của tông đang chọn, sáng lẫn tối.

## Máy kiểm
- Hook: lệnh Write hay Edit thêm một dòng có màu cứng vào stylesheet bị chặn, kèm dòng đó và các token nên dùng; dòng có
  `theme-fixed:` cho qua. Dòng có sẵn để yên tới khi bị sửa.
- Test riêng của khung đỏ khi có màu cứng trong stylesheet của khung (đã chứng minh bằng lỗi cài thử); probe chung của kiểu
  giao diện đổi tông trong trình duyệt và đỏ khi bề mặt màu nhấn của trang vẫn giữ một màu.
