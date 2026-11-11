---
version: 10
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
- **Esc** (khi không có hộp thoại hay popover nào mở) và nút **Xoá lọc** của bộ lọc trang bỏ cả lựa chọn. [cf-interaction]
- **Mọi phần của một hình đều là điểm** (v3), như Power BI: đoạn cột chồng, chấm trên đường, thanh, cột, lát, mục chú
  giải, dòng bảng. Hình gồm các chỉ số đặt cạnh nhau (`data-rp-free`) không có trường nên được miễn. [cf-every-mark]
- **Mọi mục chú giải (legend) là một bộ lọc thật của thanh trang** (v4): legend theo giá trị một trường (một chuỗi: năm, kênh, xếp loại) là các điểm trên
  trường đó (`data-cf-dim`), và trường đó có bộ lọc trên thanh trang - một bộ lọc: bấm mục thì bộ lọc đặt giá trị đó, nút lọc đếm,
  đặt bộ lọc thì mục sáng còn mục khác mờ, Xoá lọc hay bấm lần hai thì bỏ. Legend theo CHỈ SỐ (năm nay / năm trước, doanh thu /
  chỉ tiêu) là ô "Chỉ số" của trang (`data-cf-dim="measure"`, bộ lọc `measure`): bấm thì chỉ số đó sáng trên mọi chart của trang,
  chuỗi khác mờ, không lọc dòng nào; Xoá lọc thì bỏ. (v5) mục nào cũng bấm được, kể cả đường của cả chuỗi (chọn trên ô Chỉ số): bấm thì đường hay chuỗi đó sáng, còn lại mờ.
  [cf-legend-filter] [cf-legend-click]
- **Legend đứng một hàng** (v5): các chip chung một hàng, không xuống hàng, chữ trong một chip cũng không; legend dài hơn đầu panel thì chart
  chiếm cả hàng. Danh sách dọc của donut không phải legend chip. [cf-legend-one-line]
- **Thanh trang và các lựa chọn là một, cả hai chiều** (v5): mọi trường mà visual của trang chọn được (trục, cột, legend) có slicer trên thanh; đặt slicer thì
  các điểm khớp sáng, điểm khác mờ, như bấm chart thì slicer đổi. [filter-one] [cf-filter-to-chart]
- **Bộ lọc là cài đặt của người dùng** (v5): cái người dùng đặt trên một trang (slicer, lựa chọn, token kỳ) lưu vào cài
  đặt của họ trong hệ (`Config_UserSetting`, `<app>.filters` theo đường trang, kỳ lưu bằng token tương đối), nạp khi mở app và ghi
  sau mỗi lần đổi - trang mở lại như lúc rời đi, ở máy nào cũng vậy. Phép kiểm trình duyệt của app chứng minh (đặt, tải lại, vẫn còn).

## 2. Những gì đi theo lựa chọn

- **Mọi hình khác** chỉ giữ những dòng khớp mọi trường đã chọn mà nó có. Một trường mà dữ liệu của hình không có thì không lọc gì
  ở hình đó (như hai bảng không có quan hệ trong model): hình không bao giờ bị ép về rỗng.
- **Hình vừa được bấm không bị lọc theo trường của chính nó**: giữ mọi điểm, điểm được chọn sáng, các điểm khác mờ đi.
  [cf-interaction]
- **Ô KPI và bảng đi theo** lựa chọn. Một KPI mà trình duyệt không tính lại được (không có dòng dữ liệu) thì hiện số của server cho
  đúng thành phần được chọn khi chỉ chọn một (chỉ số theo từng thành phần), không thì hiện số toàn trang - không bao giờ cộng tỷ lệ
  sai.
- **Giá trị đã chọn hiện trên bộ lọc DUY NHẤT của trang** (v3): ô lọc của trường đó trên thanh trang giữ giá trị và nút lọc đếm nó; đặt ô lọc đó thì các hình lọc y như
  vậy. Không có dãy chip thứ hai. [filter-one] [cf-interaction]

## 3. Khuôn markup

- Một điểm dữ liệu mang `data-cf-dim` (trường) · `data-cf-value` (giá trị) · `aria-pressed` (đang chọn) · `role="button"` ·
  `tabindex="0"` · một tên đọc được (`title` hoặc `aria-label`). Điểm bị mờ mang class `cf-dim`, điểm được chọn `cf-picked`.
  [cf-points]
- Mỗi trường mà một hình lọc theo là một ô lọc của thanh trang: `data-filter-id` = trường (một điểm đứng trên hai trường ghi
  `data-cf-dim="month|grade"` và `data-cf-value="T3|A"`); nút lọc `#filter-toggle` đếm chúng ở `.filter-count`. [filter-one]
- Một trang báo cáo có điểm dữ liệu ở ít nhất hai hình; chỉ một hình thì không có gì để lọc. [cf-visuals] Trang chỉ có một ma trận (visual dữ liệu duy nhất là
  bảng) thì không có gì để lọc chéo: luật này và hai phép bấm thử đứng ngoài; một chart đứng một mình vẫn đỏ (v10).

## 4. Cách dựng

- Phần logic chọn là hàm thuần, có test: `pick(selection, field, value, additive)` · `filterRows(rows, selection, fields, except)`
  · `isPicked`. Các hình và KPI đọc dòng đã lọc; không hình nào giữ lựa chọn riêng.
- Công thức KPI ở MỘT chỗ (chỉ số của server); bản tính lại ở trình duyệt lặp đúng công thức đó, ghi rõ trong chú thích, và đổi
  trong cùng một lần đổi.
- Màu của trạng thái chọn / mờ là token của kiểu (`--g-accent`), chuyển động dừng khi người dùng bật giảm chuyển động.

## 5. Kiểm

- Bài kiểm trình duyệt của repo import `scripts/crossfilter_check.mjs`, chạy mọi luật `RULES` trên mọi trang báo cáo, rồi chạy
  `INTERACTION` (có chờ) một lần mỗi trang: bấm một điểm và đòi điểm đó sáng, các điểm cùng trường mờ, chip hiện và ít nhất một
  hình hay KPI KHÁC đổi, ô lọc của trường có mặt và được đếm; bấm lần hai thì bỏ; Esc thì bỏ. Rồi `EVERY_CLICK` (có chờ): ở
  mỗi hình, bấm một điểm làm một hình khác đổi và bấm lần hai đưa trang về như cũ - điểm không lọc gì thì không phải điểm. Rồi
  `LEGEND_CLICK` (có chờ): bấm mục legend đầu thì bộ lọc của trường đó trên thanh trang hiện mục ấy và nút lọc đếm thêm một; bấm lần
  hai thì bỏ. Nó chạy `SELF_TEST` trước: trang tốt phải qua và trang lỗi phải trượt mọi
  luật, để chứng minh phép kiểm đỏ được.
- Test đơn vị của repo phủ `pick` và `filterRows`, mỗi trường hợp mới được chứng minh đỏ bằng cách làm hỏng hàm nó canh.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — hành vi của một loại hình được duyệt trước khi chép · the behaviour of a kind of visual is approved before it is ported
