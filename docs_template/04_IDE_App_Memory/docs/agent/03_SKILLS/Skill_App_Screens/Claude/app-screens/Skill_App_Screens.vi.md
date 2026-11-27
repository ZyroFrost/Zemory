---
version: 1
lang: vi
---

# app-screens — một danh sách cỡ màn hình cho mọi app

> Thi hành `Rule_Gate_78_ScreenSizes`. Danh sách nằm ở `scripts/screens.mjs`, được cài vào mọi repo app; trang này nói lại bằng
> lời. Một cỡ màn mà trang cần nhưng danh sách chưa có thì thêm vào danh sách trên HS (version + 1) để mọi app cùng nhận -
> không bao giờ viết riêng trong một app hay một bộ kiểm.

## 1. Các cỡ màn

| Mã | Màn hình | Cỡ màn (px CSS) | Tỉ lệ | Vùng trang (view) | Bắt buộc |
|---|---|---|---|---|---|
| D1 | Màn FHD 100 % | 1920 × 1080 | 16:9 | 1920 × 950 | ✓ |
| D2 | Laptop FHD 125 % (laptop văn phòng phổ biến nhất) | 1536 × 864 | 16:9 | 1536 × 730 | ✓ |
| D3 | Laptop FHD 150 % | 1280 × 720 | 16:9 | 1280 × 590 | |
| D4 | Laptop HD | 1366 × 768 | 16:9 | 1366 × 640 | ✓ |
| D5 | Laptop 16:10 | 1440 × 900 | 16:10 | 1440 × 770 | |
| D6 | MacBook 14 inch | 1512 × 982 | 3:2 | 1512 × 900 | |
| D7 | Màn QHD 100 % | 2560 × 1440 | 16:9 | 2560 × 1310 | |
| D8 | Màn siêu rộng FHD | 2560 × 1080 | 21:9 | 2560 × 950 | |
| D9 | Màn siêu rộng QHD | 3440 × 1440 | 21:9 | 3440 × 1310 | ✓ |
| T1 | Tablet ngang | 1180 × 820 | 10:7 | 1180 × 760 | |
| T2 | Tablet dọc | 820 × 1180 | 7:10 | 820 × 1110 | ✓ |
| P1 | Điện thoại (iPhone 12-16) | 390 × 844 | 9:19.5 | 390 × 664 | ✓ |
| P2 | Điện thoại (Android phổ biến) | 360 × 800 | 9:20 | 360 × 690 | |
| P3 | Điện thoại lớn | 430 × 932 | 9:19.5 | 430 × 750 | |
| P4 | Điện thoại xoay ngang | 844 × 390 | 19.5:9 | 844 × 340 | ✓ |

- **Cỡ màn** là màn hình tính bằng px CSS theo mức phóng của hệ điều hành: laptop 1920 × 1080 để 125 % là 1536 × 864.
- **Vùng trang** là phần CSS thấy trong cửa sổ trình duyệt mở toàn màn: cỡ màn trừ các thanh của trình duyệt (khoảng 130 px trên
  máy tính, 80 px với Safari trên Mac, 180 px trên điện thoại khi hiện thanh). Bộ kiểm đặt vùng trang, không đặt cỡ màn.
- **Bắt buộc** là 7 cỡ mọi bộ kiểm trình duyệt của app phải đo trước khi gọi một bản là đạt. Bộ kiểm còn thời gian thì đo đủ 15.

## 2. Cửa sổ được bố cục nào

**Trang app trong khung** (`layoutOf(w, h)`):
- Rộng 768 px trở xuống ⇒ lớp điện thoại: không co giãn, cỡ chạm, hộp thoại toàn màn (skill app-base, phần điện thoại).
- Rộng hơn ⇒ trang vẽ trên khung 1920 × 1080 rồi co theo cửa sổ: zoom = min(w / 1920, h / 1080), giữ trong 0,7 tới 1. Khung
  chiếm phần còn lại của cửa sổ (w / zoom × h / zoom): cửa sổ rộng hay cao thì có thêm chỗ, trang không bị kéo giãn.

**Trang một cảnh toàn màn** - trang đăng nhập, màn chờ của launcher, bảng treo tường (`layoutOf(w, h, 'scene')`):
- Từ 900 × 560 trở lên và ngang gấp 1,2 lần dọc trở lên ⇒ khung 1920 × 1080, zoom = min(w / 1920, h / 1080) không chặn. Chữ to
  lên trên màn nhỏ để còn đọc được: `--up` = `textUpOf(w, h)` = kẹp(1, 1 / zoom, 1,5), các hộp chứa chữ to theo.
- Còn lại ⇒ một cột cuộn dọc: màn dọc, cửa sổ hẹp, điện thoại xoay ngang.

## 3. Trang phải giữ được gì trên mọi cỡ

- Không bị cắt, không phần nào đè phần nào, trang không cuộn ngang (bảng rộng thì cuộn trong khung của nó).
- Chữ hiện ra màn không dưới 12 px (đã tính zoom); nút không thấp hơn 32 px trên máy tính, 44 px trên điện thoại.
- Màn 21:9 giữ nội dung đúng cỡ khung ở giữa, hai bên là hình nền; màn cao thì các hàng có thêm chỗ.
- Cỡ viết bằng px của khung (zoom lo phần còn lại); hộp theo cỡ cửa sổ đọc `--app-w` / `--app-h` của khung, không dùng `vw` /
  `vh` trần (skill app-shell-use).

## 4. Bộ kiểm trình duyệt

```js
import {REQUIRED_SCREENS, metricsOf} from './screens.mjs';
for (const s of REQUIRED_SCREENS) {
  await cmd('Emulation.setDeviceMetricsOverride', metricsOf(s));   // vùng trang, mobile cho điện thoại
  // vẽ mọi trang, cả hai tông; một lỗi ghi tên cỡ màn: s.id + ' ' + s.view.join('x')
}
```

- Không bao giờ tự đặt một danh sách cỡ riêng, không dùng `--widths`: thiếu cỡ nào thì thêm vào danh sách.
- `node scripts/screens.mjs --list` in bảng kèm bố cục mỗi cỡ nhận; `--required` in 7 vùng trang; `--json` in tất cả.
- `scripts/ui_check.mjs` (skill app-base) đo các cỡ bắt buộc trừ khi cấu hình của nó tự ghi widths.

## Thi hành luật
- `Rule_Gate_78_ScreenSizes` — danh sách, luật chọn bố cục và các cỡ bộ kiểm phải đo
