---
version: 1
lang: vi
---
# Rule_Gate_78_ScreenSizes — Mọi app dựng cho một danh sách cỡ màn và được kiểm trên đó

## Luật là gì
Các app của một hệ dùng chung một danh sách cỡ màn (skill app-screens, `scripts/screens.mjs`): 15 cỡ từ màn 21:9 tới điện thoại
xoay ngang, mỗi cỡ có kích thước, tỉ lệ và vùng trang mà trình duyệt chừa lại. Trang được bố cục cho mọi cỡ trong danh sách theo
một luật - khung 1920 × 1080 co theo cửa sổ, lớp điện thoại từ 768 px trở xuống, một cột cho trang một cảnh khi cửa sổ dọc hay
nhỏ - và bộ kiểm trình duyệt đo 7 cỡ bắt buộc của danh sách. Bộ kiểm không bao giờ đo một danh sách cỡ của riêng nó: các danh
sách riêng lệch dần giữa các app, và cỡ màn không ai ghi chính là chỗ vỡ.

## Khi nào
- Viết hay sửa code đặt cỡ trang trình duyệt (`setDeviceMetricsOverride`, viewport, `--widths`).
- Chạy deploy của một app mang khung.
- Dựng bố cục phụ thuộc cửa sổ: co giãn, điểm gãy, trang toàn màn.

## Làm
1. Lấy cỡ từ danh sách: `import {REQUIRED_SCREENS, metricsOf} from './screens.mjs'`, vùng trang của mỗi cỡ làm cỡ trang,
   `mobile` cho điện thoại. Bộ kiểm còn thời gian thì lấy đủ `SCREENS`.
2. Danh sách thiếu một cỡ ⇒ thêm vào danh sách trên HS (skill app-screens, version + 1) để mọi app cùng nhận.
3. Bố cục trang theo luật của danh sách (`layoutOf`, skill app-screens §2) và giữ §3 trên mọi cỡ: không cắt, không đè, không
   cuộn ngang, chữ hiện ra màn từ 12 px trở lên.

## Lối đúng
- Bị chặn khi viết bộ kiểm tự đặt cỡ trang ⇒ import `REQUIRED_SCREENS` và `metricsOf` từ `screens.mjs` rồi lặp qua các cỡ; ghi
  lỗi theo mã của cỡ màn.

## Ví dụ
- Tình huống: bộ kiểm trình duyệt của một app bán hàng chỉ vẽ trang ở 1440 × 900 và 390 × 844.
- ✗ Sai: giữ hai cỡ đó; laptop 1366 × 768 của quản lý cửa hàng cắt mất thanh lọc, màn 21:9 kéo giãn các thẻ, không bộ kiểm nào
  thấy.
- ✓ Đúng: bộ kiểm import `REQUIRED_SCREENS` và vẽ mọi trang trên 7 cỡ; thanh lọc bị cắt hiện đỏ ở D4 trước khi bản được gọi là đạt.

## Kiểm
- Hook chặn một lần Write hay Edit trong repo app (có `frontend/config/shell.json`, hoặc `frontend/shell/` của khung) thêm vào
  code (chú thích không tính) một dòng đặt cỡ trang trình duyệt bằng số - `setDeviceMetricsOverride`, `setViewport`,
  `--window-size`, `defaultViewport`, `--widths`, `widths: [...]` - vào một file không lấy danh sách (`screens.mjs`,
  `REQUIRED_SCREENS`, `SCREENS`). Các script dùng chung (`screens`, `sneat_glass_check`, `report_layout_check`, `ui_check`) và
  các thư mục harness không bị đọc.
- Chạy deploy của một app mà bộ kiểm trình duyệt (những gì script deploy chạy, sâu ba tầng) không lấy danh sách, hoặc truyền
  `--widths`, bị chặn một lần mỗi phiên như lời nhắc; chạy lại thì qua, trong lúc các app chuyển dần sang danh sách. `zemory
  conform` (`rule-conform`, chỉ báo) nêu mọi script deploy như vậy theo hiện trạng repo.
- Hook lỗi thì cho qua.

## Liên kết
- Thi hành: `Skill_App_Screens` — danh sách và luật chọn bố cục
- Liên quan: `Rule_Gate_76_DeployChecksFrame` — deploy chạy bộ kiểm của khung
- Liên quan: `Skill_App_Base` — lớp điện thoại và bộ đo
