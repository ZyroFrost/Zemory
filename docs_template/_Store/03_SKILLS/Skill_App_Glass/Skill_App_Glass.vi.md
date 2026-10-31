---
version: 3
lang: vi
---

# app-glass — kiểu Glass của bề mặt app

> Skill KIỂU, theo khuôn các kiểu Power BI: `app-base` giữ những gì mọi app phải theo dù trông thế nào; skill này chỉ giữ thứ làm
> nên bề mặt Glass. Nó gọi tên khoá token và các hiệu ứng; giá trị thật nằm ở template đã duyệt và ở `frontend/styles/` của repo,
> không chép vào đây.

## 0. Chọn kiểu

- Repo có UI khai ĐÚNG MỘT kiểu ở `frontend/config/ui.json`: `{"style": "Glass"}`. Không khai ⇒ không skill kiểu nào áp, chỉ
  `app-base`.
- Kiểu mới (một dáng khác) là một skill mới `Skill_App_<Kiểu>` cạnh skill này, cùng các mục; một repo không trộn hai kiểu trên một
  bề mặt.
- Hướng kiểu chốt TRƯỚC khi viết mã: bề mặt dựng "để trang trí sau" rơi về dáng chung chung và phải làm lại.

## 1. Nguồn của kiểu

- Template Glass đã duyệt nằm trong repo thiết kế của tổ chức (slot `Design_172_Design`, `Web_Template/`). Đó là nguồn DUY NHẤT
  của mọi giá trị token và mọi hiệu ứng; app đang chạy chép từ đó, không chép từ bản của app khác.
- Repo giữ token và hiệu ứng đã chép ở `frontend/styles/` (một file cho kiểu, vd `glass.css`), CSS của trang ở file riêng. Hai app
  lệch nhau ⇒ cả hai đối chiếu với template, không đối chiếu với nhau.
- Đổi dáng thì sửa template trước, duyệt (`Rule_Keys_62_DesignChangeApproval`), rồi mới chép sang.

## 2. Token — các khoá một bề mặt Glass mang

Mọi màu, cỡ, đường cong và thời lượng là một biến CSS tiền tố `--g-`, khai một lần ở `:root`; giá trị viết thẳng trong một luật
CSS là lỗi (`app-base`, token). Mỗi theme khai lại TRỌN bộ.

| nhóm | khoá | luật |
|---|---|---|
| nền và chữ | `--g-bg` · `--g-text` · `--g-muted` | tương phản chữ trên lớp kính đạt WCAG AA ở cả hai theme |
| lớp kính | `--g-glass` · `--g-glass-strong` · `--g-edge` · `--g-edge-soft` · `--g-dim` | lớp đậm là thứ panel rơi về khi tắt blur |
| độ sâu | `--g-shadow` · `--g-blur` | mỗi tầng nổi một token bóng; blur chỉ qua token |
| nhấn và trạng thái | `--g-accent` · `--g-accent-2` · `--g-good` · `--g-warn` · màu thương hiệu | màu trạng thái không kiêm màu nhấn (`app-base` F11) |
| hình nền | `--g-blob-a` · `--g-blob-b` · `--g-blob-c`, mỗi giá trị `data-wall` một bộ tông | tông mặc định là của thương hiệu; các tông khác là lựa chọn |
| chữ | `--g-font` (một họ phông, có phông hệ thống dự phòng) + một thang cỡ | một trang không dùng họ phông thứ hai |
| chuyển động | `--g-spring` · `--g-out` (hai đường cong) | thời lượng trong dải 0,2–0,8 s của template |

- **Sáng và tối:** `[data-theme="light"]` khai lại mọi khoá nền, kính, độ sâu, nhấn và trạng thái; khoá thiếu ở một theme sẽ hiện
  giá trị của theme kia — đo cả hai.
- **Khoảng cách, bo góc, mật độ** theo thang của template; giá trị mới thì vào thang, không dùng số lẻ một lần.

## 3. Hiệu ứng

Template gắn mỗi hiệu ứng một dấu `FX:`; bản chép giữ dấu đó để so hai bên từng dòng.

| hiệu ứng | làm gì | luật |
|---|---|---|
| hình nền | các mảng màu mờ sau khung, trôi chậm | cố định, nằm sau mọi thứ, không bắt cú bấm |
| kính | panel trong mờ với `backdrop-filter` blur và đường viền | đọc được trên mọi tông hình nền, cả hai theme |
| pill · công tắc | vệt sáng chạy theo hàng tab · nút bật tắt | một engine cho mọi pill |
| tooltip · popover · toast | các lớp nổi | popover ĐỤC (`app-base` F18); toast không che nút điều khiển |
| route · reveal · ripple · progress | đổi trang · nội dung hiện vào · phản hồi khi bấm · thanh tải | ngắn; không làm chậm thao tác |

- **Chuyển ĐỦ mọi hiệu ứng của mẫu - không cái nào được mất.** Bảng trên chỉ kể hiệu ứng của khung; mẫu còn nhiều hơn
  (biểu đồ, thấu kính, nghiêng, bảng lệnh, dòng thời gian...), và mỗi cái chuyển sang kèm dấu `FX:` đặt trên chính đoạn mã
  mang nó. Không chuyển một cái là một quyết định: ghi ở `frontend/config/ui.json` `fx_dropped` kèm lý do và ai duyệt; ngoài
  ra không tính. Hiệu ứng thuộc một trang thì chuyển cùng trang đó, không để "làm sau" mà thiếu dòng khai ấy.
- **Công tắc solid:** một thiết lập nhìn thấy được tắt blur (`html.solid`): panel lấy `--g-glass-strong` (tối: một màu đục), không
  `backdrop-filter`. Máy yếu và máy điều khiển từ xa dùng nó; lưu như mọi thiết lập UI (`app-base` F8).
- **Giảm chuyển động:** dưới `@media (prefers-reduced-motion: reduce)` mọi hiệu ứng có chuyển động ở trên (trôi · pill · route ·
  reveal · ripple · toast trượt · tooltip nhấc) dừng hoặc đổi tức thì. Mỗi file hiệu ứng một khối phủ hết; hiệu ứng thêm sau được
  thêm vào khối đó trong cùng lượt sửa.
- **Ảnh được cung cấp** (logo, hình) giữ màu gốc trên nền kính (`app-base` F20): không blend mode, không filter.
- **Icon:** một bộ icon, một độ dày nét và một thang cỡ cho cả app; nút chỉ có icon vẫn mang nhãn (`app-base` F4 ②).

- **Selector hiệu ứng chỉ thuộc một thành phần.** Chấm nhấp nháy của avatar dùng `.ava.online::before/::after`,
  không dùng selector `.online` chung: ở SasinONE selector chung vẽ chấm xanh của trạng thái ứng dụng lên nút Mở.
  Giữ nguyên hoạt ảnh gốc nhưng giới hạn selector. Cổng trình duyệt kiểm trạng thái không phải avatar không có
  pseudo-element đó và nút thao tác nằm trọn trong thẻ (`app-base` F23).

## 4. Phép kiểm

- `scripts/fx_check.mjs` (skill này cài) kê mọi dấu `FX:` của mẫu ghi ở `frontend/config/ui.json`
  (`{"style": "Glass", "template": "<đường>"}`) và mọi dấu trong `frontend/src`: hiệu ứng của mẫu mà app không mang và chưa
  khai bỏ kèm lý do là đỏ (exit 1); dòng khai bỏ thiếu lý do, hoặc khai bỏ một hiệu ứng thật ra đã chuyển, cũng đỏ.
  `--self-test` xét sáu ca dựng sẵn. Dấu chứng minh đã chuyển, không chứng minh hiệu ứng chạy: bài kiểm trình duyệt của repo đo
  từng hiệu ứng đang chạy.
- `scripts/ui_check.mjs` của `app-base` chạy trên mọi trang, mọi bề rộng, cả hai theme và khi bật công tắc solid.
- Mọi khoá `--g-` dùng trong luật CSS đều được khai ở `:root` và khai lại ở `[data-theme="light"]` ở chỗ template có khai: so hai
  danh sách khoá của file kiểu trong repo với của template.
- `prefers-reduced-motion`: mở app khi bật thiết lập đó của hệ thống; không gì trôi, trượt hay nảy. Duyệt bằng MẮT, chưa có mã máy
  kiểm.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — the look of a kind is approved in the template before it is ported · kiểu được duyệt trên template trước khi chép sang app
