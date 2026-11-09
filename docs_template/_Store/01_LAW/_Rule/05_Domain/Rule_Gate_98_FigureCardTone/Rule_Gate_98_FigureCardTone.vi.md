---
version: 1
lang: vi
---
# Rule_Gate_98_FigureCardTone — A figure card wears the tinted fill of its tone

## Luật là gì
Trên trang báo cáo của app kiểu Sneat hoặc Glass, mọi thẻ chỉ số (`.kpi-card` trong hàng thẻ) mang một tông (`data-tone`, một
ô màu của theme, thẻ thứ *i* → ô *i*) và được tô bằng tông đó: màu pastel - màu ô ở độ đậm thấp (`--tone-bg`) - chữ màu chữ
thường, icon màu ô đậm. Không bao giờ là kính trơn của khung, không màu trắng, không chỉ hiện tông bằng một vạch hay viền một
bên (user 09/11, qua một app trong hệ: kính của khung từng đè mất nền riêng của thẻ chỉ số, "cái này là skill, nên có hook
cho skill").

## Khi nào áp
- Viết hay sửa một luật style (`.css` · `.scss` · `.less`) có selector kết thúc ở thẻ chỉ số (`.kpi-card`, thẻ `[data-tone]`)
  trong repo mà `frontend/config/ui.json` khai kiểu Sneat hoặc Glass.
- Thêm một thẻ chỉ số vào trang báo cáo.

## Làm
1. Thẻ mang `data-tone="<ô>"`; style của nó lấy `background: var(--tone-bg)` (hoặc màu ô pha nhạt thành pastel), ở cả hai theme.
2. Tông không bao giờ là viền: không vạch `border-left` / `border-top`, không chỉ viền màu.
3. Khung giữ nền của thẻ có `data-tone` (kính của khung chỉ phủ thẻ không có tông); app không tăng độ mạnh selector để giành lại.
4. Luật chung `rp-card-tone` của `scripts/report_layout_check.mjs` (skill app-report) chạy trên mọi trang báo cáo trong phép
   kiểm trình duyệt của repo: mọi thẻ chỉ số có tông và nền tô màu.

## Ví dụ
- Tình huống: thẻ của một board doanh thu được làm "nhẹ" bằng một vạch màu bên trái.
- ✗ Sai: `.kpi-card { background: transparent; border-left: 4px solid var(--tone); }` - thẻ đọc như kính của trang, tông chỉ
  là một đường mảnh.
- ✓ Đúng: `.kpi-card[data-tone] { background: var(--tone-bg); }`, màu ô ở độ đậm thấp; số màu chữ thường, icon màu ô.

## Kiểm
- Hook chặn lần ghi file style thêm, dưới selector kết thúc ở thẻ chỉ số, một nền none, transparent, trắng hay kính trơn
  (`var(--g-glass…)`), hoặc một viền màu một bên. Cho qua: nền tô màu (`var(--tone-bg)`, `rgba()` của một màu, `color-mix()`) ·
  luật cho phần bên trong thẻ (tiêu đề, số, dòng %, icon) · hover · viền đặt `0` / `none` · repo kiểu khác · khai báo đã có sẵn.
  Hook lỗi thì cho lần ghi qua.
- Thứ hook không thấy (style inline, thẻ vẽ bằng script, kính riêng của khung) thì luật chung `rp-card-tone` bắt trên trang đã vẽ.

## Links · Liên kết
- Implements · Thi hành: `Skill_App_Report` — the figure cards of a report page · thẻ chỉ số của trang báo cáo
- Related · Liên quan: `Rule_Gate_97_BarOneSize` — a style rule of the kind locked by a hook · luật style của kiểu bị khoá bằng hook
