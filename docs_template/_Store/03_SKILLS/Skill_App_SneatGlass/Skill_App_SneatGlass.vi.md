---
version: 3
lang: vi
---

# app-sneat-glass — bố cục Sneat mặc dáng Glass

> Skill KIỂU ghép từ hai skill: `app-sneat` giữ bố cục của bộ Sneat đúng như bộ có; `app-glass` giữ dáng; skill này giữ những gì
> riêng chỗ ghép cần. Mỗi luật đến từ một lần người yêu cầu sửa và có phép kiểm máy trong `scripts/sneat_glass_check.mjs` (tên
> trong ngoặc vuông); bài kiểm trình duyệt của repo chạy nó trên mọi trang.

## 0. Chọn kiểu

- Repo khai `{"style": "SneatGlass"}` ở `frontend/config/ui.json`; theo `app-sneat` cho bố cục, `app-glass` cho dáng, và skill
  này ở chỗ ba cái gặp nhau. Trên bề mặt kiểu này, luật ở đây thắng hai skill kia.

## 1. Thanh công cụ của trang — một kiểu, luôn đủ ba

- **Mọi thẻ trang mang cùng một thanh công cụ** ở đầu thẻ, bên phải: ô lọc nhỏ (lọc dòng ngay khi gõ; ô tìm ở thanh trên để
  nhảy), nút bộ lọc (bảng bật ra chứa các bộ lọc), nút chọn kiểu xem (danh sách · thẻ, hoặc các kiểu riêng của trang). Trang chỉ
  có một kiểu xem vẫn hiện nút, ở trạng thái tắt; trang chưa có bộ lọc vẫn hiện nút bộ lọc, ở trạng thái tắt. [toolbar]
- **Một kiểu dáng:** ba thứ cùng chiều cao, cùng bo góc, cùng nền kính và viền; nút kiểu xem là một nhóm; không bao giờ để nút
  kiểu Sneat cạnh ô kiểu Glass. [toolbar]
- **Kiểu xem đang chọn sáng màu nhấn**, nút bộ lọc cũng sáng khi bảng của nó đang mở. [toolbar]
- **Ô lọc giữ chỗ cho icon** khi đang gõ: Sneat thu lề trong của ô đang focus để bù viền dày, nên bề mặt ghim lề đầu. [toolbar]

## 2. Khung đứng yên (`app-base` F21 trong kiểu này)

- Từ khổ máy tính bảng trở lên, cửa sổ không bao giờ cuộn: thanh trên đứng yên, chỉ vùng dưới nó cuộn, nên không có gì trượt lên
  sau thanh trên. [frame]
- Trang có nội dung là một thẻ trang thì thẻ lấp đầy vùng đó và cuộn BÊN TRONG thẻ: thanh công cụ của thẻ (hàng 2) và hàng tiêu
  đề bảng luôn ghim, như khung Glass. Khung con trong thân thẻ không làm ô cuộn riêng, trừ khi chính nó ghim thứ gì (ma trận ghim
  cột đầu theo chiều ngang). [frame]
- Trên điện thoại, cửa sổ cuộn và thanh trên dính (sticky).

## 3. Hộp thoại — đúng S / M / L (`app-base` F2 trong kiểu này)

- Hộp thoại là một `<dialog>` chứa `modal-content` của bộ, lớp cỡ `sz-s` · `sz-m` · `sz-l`: `width: min(P vw, P vh × 16/9)` và
  `aspect-ratio: 16 / 9`, P = 40 / 60 / 90. Không `min-width`, không `max-height` làm méo; thân cuộn bên trong; đổi tab không bao
  giờ làm khung dời chỗ hay đổi cỡ. Trên điện thoại thì đầy màn hình. [dialog-size]

## 4. Cài đặt bố cục (bộ chỉnh của Sneat)

- Cài đặt › Bố cục, cho mọi người, lưu thành cài đặt giao diện của người đó: **độ rộng nội dung** rộng (mặc định: nội dung lấp
  đầy khung, `app-base` F22) hoặc gọn (bề rộng container của bộ); **menu** mở rộng hoặc thu gọn (nút tròn trên menu lưu cùng một
  cài đặt đó). [wide]

## 5. Điều khiển và hiệu ứng

- **Ô chọn mở menu kính,** không bao giờ mở danh sách của trình duyệt: bật ra, đặc, đánh dấu mục đang chọn, giữ bàn phím (mũi tên,
  Enter, Escape) và phát `change`. Trong một hộp thoại đang mở, menu nằm trong hộp thoại (lớp trên cùng).
- **Không tô ô vuông khi rê chuột từng ô:** ở kiểu xem thẻ, một thẻ là một bảng; `table-hover` của bộ tô từng ô nên phải tắt ở
  đó. [card-hover]
- **Phần tử hiệu ứng không mang trang trí của trình duyệt:** pill làm từ mục danh sách có `list-style: none`; nút đóng nằm trong
  hàng mà nó đóng.
- **Menu nổi trên thẻ kính** (menu ba chấm của dòng, menu của ô chọn) đặt trên `<body>` (hoặc hộp thoại đang mở): thẻ có
  `backdrop-filter` trở thành hộp mà menu `fixed` bị đặt vào.
- **Mọi hiệu ứng của template Glass** giữ dấu `FX:` trong code (`app-glass`); các thẻ của trang lần lượt nổi lên khi trang hiện
  (FX: reveal).
- **Thanh cuộn là của template Glass** ở mọi ô cuộn (12 px, rãnh tròn mờ, tay cầm gradient màu nhấn lùi vào bằng viền trong
  suốt), không bao giờ để mặc định của trình duyệt; không luật nào đặt `scrollbar-color` hay `scrollbar-width` (Chromium sẽ bỏ
  phần của template). [scrollbar]
- **Ô ghim cũng là kính:** khi bật kính, hàng tiêu đề hay cột được ghim trong như các ô bên cạnh (nhiều nhất một phần mười màu
  nền) và có làm mờ, ở CẢ HAI theme - một dải chỉ hiện ở theme sáng vẫn là dải; chỉ đặc khi tắt kính. [see-through]
- **Nút bật/tắt kính nằm trên thanh trên** cạnh nút sáng/tối, sáng khi kính đang bật (nút của rail Glass, dời vào thanh).
  [bar-switches]
- **Chỉ điều khiển của bộ, một font:** mọi điều khiển là `form-control` · `form-select` · `form-check-input`, mọi nhãn trong hộp
  thoại là `form-label` · `form-check-label`, form dựng trên lưới của bộ (`row g-*` · `col-*`), font token ở mọi nơi - cả chữ trong svg và các con số - và
  font đó phải được NẠP thật: app tự gửi kèm file font (font chỉ được gọi tên sẽ rơi về font hệ thống mà không ai thấy); không lớp
  nào của kiểu cũ còn sót sau khi port. Công tắc luôn cách chữ một khoảng. [kit-controls] [switch-gap]
- **Mọi bảng dữ liệu giữ chức năng kéo đổi độ rộng cột:** mỗi ô tiêu đề có tay kéo `col-resize` nhìn thấy được ở kiểu xem danh
  sách; độ rộng là cài đặt của người đó. Port thì mang theo cả CSS của tay kéo. [resize]
- **Mọi biểu đồ hiện đủ số,** như một báo cáo: số trên mỗi cột, nhãn số trên đường (mọi điểm khi đủ chỗ, không thì điểm cao nhất,
  thấp nhất và điểm cuối), tỉ lệ của từng phần donut cạnh giá trị. [chart-labels]
- **Trang khai colour scheme của nó** (`<meta name="color-scheme" content="light dark">`, `html { color-scheme }` = theme), để
  chế độ tối ép buộc của trình duyệt điện thoại không đè lên theme của người dùng. [color-scheme]
- **Icon của bộ:** chỉ gửi những icon code gọi tới (một bản con sinh ra từ CSS icon của bộ, build tự kiểm), không gửi cả bộ.

## 6. Kiểm

- Bài kiểm trình duyệt của repo nhập `scripts/sneat_glass_check.mjs`, chạy mọi mục `RULES` trên mọi trang và mọi mục
  `DIALOG_RULES` trên mọi hộp thoại nó mở, ở một khổ máy tính và một khổ điện thoại và ở cả hai theme, sau khi hiệu ứng mở đã xong. Thêm luật vào
  đây thì thêm mục tương ứng trong cùng một lần sửa; mỗi mục mới phải được chứng minh đỏ bằng cách làm hỏng thứ nó canh - với
  code vẫn build được: bài kiểm build lại trước khi chạy, để một lần build hỏng không bao giờ khiến nó kiểm một bản cũ.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — the look of a kind is approved on its template before it is ported · kiểu được duyệt trên template trước khi chép sang app
