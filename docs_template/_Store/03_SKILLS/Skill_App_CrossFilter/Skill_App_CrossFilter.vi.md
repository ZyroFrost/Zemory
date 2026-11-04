---
version: 2
lang: vi
---

# app-cross-filter — các hình của một trang báo cáo lọc lẫn nhau

> Skill CHỨC NĂNG dùng chung cho mọi app có trang báo cáo, kiểu nào cũng vậy (`app-sneat-glass`, `app-glass` ...). Skill nói một
> cú bấm trên chart làm phần còn lại của trang thay đổi ra sao, và khuôn markup mà phép kiểm máy đọc. Mỗi luật có phép kiểm trong
> `scripts/crossfilter_check.mjs` (tên trong ngoặc vuông); bài kiểm trình duyệt của repo chạy nó trên mọi trang báo cáo.

## 1. Một lựa chọn cho mỗi trang

- Một trang báo cáo giữ MỘT lựa chọn: với mỗi trường (một "chiều": nhà hàng, giờ, món, quản lý ...) là các giá trị đã chọn. Mọi
  hình của trang đọc nó; sang trang khác hoặc đổi kỳ thì bắt đầu rỗng.
- **Bấm một điểm dữ liệu là chỉ chọn điểm đó**, thay cả lựa chọn cũ; bấm lại điểm duy nhất đang chọn thì bỏ.
- **Ctrl / Cmd / Shift + bấm thêm hoặc bớt** điểm đó và giữ phần các hình khác đã chọn.
- **Enter hoặc Space** trên một điểm đang được trỏ làm như bấm; mọi điểm tới được bằng Tab. [cf-points]
- **Esc** (khi không có hộp thoại hay popover nào mở) và một **nút xoá lọc** bỏ cả lựa chọn. [cf-interaction]

## 2. Những gì đi theo lựa chọn

- **Mọi hình khác** chỉ giữ những dòng khớp mọi trường đã chọn mà nó có. Một trường mà dữ liệu của hình không có thì không lọc gì
  ở hình đó (như hai bảng không có quan hệ trong model): hình không bao giờ bị ép về rỗng.
- **Hình vừa được bấm không bị lọc theo trường của chính nó**: giữ mọi điểm, điểm được chọn sáng, các điểm khác mờ đi.
  [cf-interaction]
- **Ô KPI và bảng đi theo** lựa chọn. Một KPI mà trình duyệt không tính lại được (không có dòng dữ liệu) thì hiện số của server cho
  đúng thành phần được chọn khi chỉ chọn một (chỉ số theo từng thành phần), không thì hiện số toàn trang - không bao giờ cộng tỷ lệ
  sai.
- **Giá trị đã chọn hiện thành chip** cạnh tên trang, mỗi trường một chip có nút bỏ riêng, rồi đến nút xoá lọc. [cf-interaction]

## 3. Khuôn markup

- Một điểm dữ liệu mang `data-cf-dim` (trường) · `data-cf-value` (giá trị) · `aria-pressed` (đang chọn) · `role="button"` ·
  `tabindex="0"` · một tên đọc được (`title` hoặc `aria-label`). Điểm bị mờ mang class `cf-dim`, điểm được chọn `cf-picked`.
  [cf-points]
- Chip nằm trong `#cf-chips`; nút xoá lọc là `#cf-clear`.
- Một trang báo cáo có điểm dữ liệu ở ít nhất hai hình; chỉ một hình thì không có gì để lọc. [cf-visuals]

## 4. Cách dựng

- Phần logic chọn là hàm thuần, có test: `pick(selection, field, value, additive)` · `filterRows(rows, selection, fields, except)`
  · `isPicked`. Các hình và KPI đọc dòng đã lọc; không hình nào giữ lựa chọn riêng.
- Công thức KPI ở MỘT chỗ (chỉ số của server); bản tính lại ở trình duyệt lặp đúng công thức đó, ghi rõ trong chú thích, và đổi
  trong cùng một lần đổi.
- Màu của trạng thái chọn / mờ là token của kiểu (`--g-accent`), chuyển động dừng khi người dùng bật giảm chuyển động.

## 5. Kiểm

- Bài kiểm trình duyệt của repo import `scripts/crossfilter_check.mjs`, chạy mọi luật `RULES` trên mọi trang báo cáo, rồi chạy
  `INTERACTION` (có chờ) một lần mỗi trang: bấm một điểm và đòi điểm đó sáng, các điểm cùng trường mờ, chip hiện và ít nhất một
  hình hay KPI KHÁC đổi; bấm lần hai thì bỏ; Esc thì bỏ. Nó chạy `SELF_TEST` trước: trang tốt phải qua và trang lỗi phải trượt mọi
  luật, để chứng minh phép kiểm đỏ được.
- Test đơn vị của repo phủ `pick` và `filterRows`, mỗi trường hợp mới được chứng minh đỏ bằng cách làm hỏng hàm nó canh.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — hành vi của một loại hình được duyệt trước khi chép · the behaviour of a kind of visual is approved before it is ported
