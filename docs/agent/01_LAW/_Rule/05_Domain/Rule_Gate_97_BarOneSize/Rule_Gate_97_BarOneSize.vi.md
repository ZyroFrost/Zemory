---
version: 2
lang: vi
---
# Rule_Gate_97_BarOneSize — Every control of the page bar is the bar's one size

## Luật là gì
Trong app kiểu Sneat-Glass, mọi control của thanh trang cao MỘT cỡ: công cụ riêng của trang (nút thêm và dấu "+" của nó), mọi
bộ lọc đã ghim lên thanh, nút lọc, ô tìm và nút đổi kiểu xem. Cỡ đó là `--tool-h` (38 px), đặt một lần trên `.page-toolbar`;
nút chỉ có icon là ô vuông cỡ đó. Không luật style nào được cho control của thanh một cỡ riêng (bộ lọc ghim cao 34 px
cạnh nút "+" 38 px, "phải khóa lại chính xác size").

## Khi nào áp
- Viết hay sửa một luật style (`.css` · `.scss` · `.less`) có selector trỏ tới control của thanh trang, trong repo mà
  `frontend/config/ui.json` khai kiểu Sneat.
- Thêm một công cụ, bộ lọc hay nút vào thanh trang.

## Phải làm gì
1. Control của thanh dùng `height: var(--tool-h)`; nút chỉ có icon thêm `width: var(--tool-h)`. Không bao giờ ghi số
   (`34px`, `2.5rem`).
2. Muốn đổi cỡ thanh thì đổi `--tool-h` trên `.page-toolbar` - mọi control theo.
3. Ô nhập giữ bề rộng riêng (ô tìm, bộ lọc ghim co lại cùng nhau); chỉ chiều cao là của thanh.
4. Luật chung `bar-one-size` của `scripts/sneat_glass_check.mjs` (skill app-sneat-glass) chạy trên mọi trang trong bộ kiểm
   trình duyệt của repo và trong live check: mọi control vẽ ra lệch `--tool-h` tối đa 1 px, mọi nút chỉ icon là ô vuông.

## Ví dụ
- Tình huống: cho bộ lọc ghim thấp hơn để trông nhẹ hơn.
- ✗ Sai: `.filter-row .form-select { height: 34px; }` - nút "+" và nút lọc vẫn 38 px, hàng lệch (khung của một hệ, và mọi app
  mặc bản khung đó).
- ✓ Đúng: `.filter-row .form-select { height: var(--tool-h); }`; nhẹ hơn thì nhờ nền, không nhờ cỡ.

## Máy kiểm
- Hook chặn một lần ghi file style thêm, dưới selector của control thanh trang, chiều cao (hay bề rộng của nút) ghi bằng số
  `px` · `rem` · `em` thay vì `var(--tool-h)`. Cho qua: `var(--tool-h)` và `calc()` của nó · danh sách, popover, icon hay dấu
  bên trong control · bề rộng của ô nhập · repo không phải kiểu Sneat · khai báo đã có sẵn. Hook lỗi thì cho qua.
- Cái hook không thấy (style inline, cỡ đặt bằng script, luật của bộ kit) thì luật chung `bar-one-size` bắt trên trang đã vẽ.

## Links · Liên kết
- Implements · Thi hành: `Skill_App_SneatGlass` — the page bar and its shared rules · thanh trang và luật chung của nó
- Related · Liên quan: `Rule_Keys_90_AppFamilyContract` — the frame is built once by the system-manager · khung do repo quản hệ dựng một lần
