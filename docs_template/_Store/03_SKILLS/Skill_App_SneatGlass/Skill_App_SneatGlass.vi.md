---
version: 11
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

- Từ khổ máy tính bảng trở lên, cửa sổ không bao giờ cuộn. Trang có nhiều thẻ thì cột trang cuộn dưới thanh trên bằng kính:
  thanh đứng yên, nằm đè lên thứ trượt bên dưới, phía trên thanh không hiện gì - các thẻ trượt xuống dưới thanh, không bao giờ bị
  cắt ở mép dưới của thanh. [frame]
- Trang có nội dung là một thẻ trang thì thẻ lấp đầy vùng đó và cuộn BÊN TRONG thẻ: thanh công cụ của thẻ (hàng 2) và hàng tiêu
  đề bảng luôn ghim, như khung Glass. Khung con trong thân thẻ không làm ô cuộn riêng, trừ khi chính nó ghim thứ gì (ma trận ghim
  cột đầu theo chiều ngang). [frame]
- Trên điện thoại, cửa sổ cuộn và thanh trên dính (sticky).

## 2b. Thanh trên và thương hiệu — giống nhau ở mọi app của hệ

- **Lời chào mở đầu thanh trên,** ngày nằm dưới lời chào và vùng này phải đủ rộng để đọc; ô tìm nằm giữa, dãy nút (ngôn ngữ ·
  theme · kính · app · chuông · tài khoản) nằm bên phải. [crumbs]
- **Đường dẫn mở đầu dòng thứ nhất của panel trang, nằm dưới thanh trên:** tên hệ trước (SasinONE, trang chủ của hub), rồi tới
  app - hoặc, trong hub, nhóm của trang (Quản trị) - rồi tới trang. Mọi nấc trừ nấc cuối đều bấm về trang của nó; nấc cuối là
  trang đang mở, không phải liên kết (`aria-current="page"`); nấc nào sẽ mở đúng trang đang hiện thì chỉ là chữ. Nấc cuối đã là
  tên trang nên panel không lặp lại cùng tên đó thành một title bên dưới. Dải ngang thứ hai dưới thanh app giữ đường dẫn bên trái
  và thanh công cụ trang (thao tác · tìm kiếm · bộ lọc · kiểu xem) CÙNG HÀNG bên phải; ở trang tổng quan nhiều thẻ, nó là một
  panel riêng và phải neo lại khi các thẻ cuộn. [crumbs]
- **Tên hệ trên menu là SasinONE với ONE màu đỏ Sasin dùng chung,** trong cả hai theme. [brand-one-red]
- **Dưới SasinONE,** dòng nhỏ chỉ ghi tên app đang mở: Dashboard ở Dashboard, Trung tâm ở SasinONE.
  Dòng này giữ nguyên khi chuyển trang trong app; đường dẫn trong panel trang ghi tên trang. [brand-area]
- **Chữ phân nhóm trong menu mở cách vạch ngang ngắn ít nhất 8 px.** [menu-header-gap]

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
- **Trang đăng nhập giữ dáng riêng nhưng dùng font và cỡ chữ đọc được của app:** font token, nhãn và ô nhập 16 px (ô dưới 16 px
  làm điện thoại tự phóng to trang khi chạm vào), chữ ghi chú từ 14 px.
- **Danh sách cuộn không bao giờ ép co các dòng** (dropdown, danh sách trong hộp thoại): dòng của một cột flex có giới hạn chiều
  cao giữ nguyên chiều cao (`flex-shrink: 0`), không dòng nào đè dòng sau; danh sách chừa rãnh cho thanh cuộn. [list-rows]
- **Menu thu gọn canh giữa:** huy hiệu và mọi icon nằm trên đường giữa của rail; chữ thương hiệu không chừa chỗ phía sau.
  [folded-centre]
- **Không có nút giả:** nút nào cũng làm được việc - một liên kết dáng nút không bao giờ trỏ về trang đang mở; mục nào sẽ trỏ
  như vậy (thông báo về trang chủ) thì nhận đúng việc nó muốn (mở app đó, lật thẻ đó) hoặc không có nút. [real-actions]
- **Mọi bảng dữ liệu giữ chức năng kéo đổi độ rộng cột:** mỗi ô tiêu đề có tay kéo `col-resize` nhìn thấy được ở kiểu xem danh
  sách; độ rộng là cài đặt của người đó. Port thì mang theo cả CSS của tay kéo. [resize]
- **Mọi biểu đồ hiện đủ số,** như một báo cáo: số trên mỗi cột, nhãn số trên đường (mọi điểm khi đủ chỗ, không thì điểm cao nhất,
  thấp nhất và điểm cuối), tỉ lệ của từng phần donut cạnh giá trị. [chart-labels]
- **Màn hình cảm ứng đổi theme ngay:** vòng tròn mở theme (view transition) chỉ chạy với chuột; với ngón tay, trang vẽ lại
  thẳng, vì trình duyệt điện thoại có thể giữ ảnh chụp cũ trên màn hình trong khi cài đặt đã lưu. Thanh trình duyệt điện thoại
  (`theme-color`) đổi theo theme.
- **Trang khai colour scheme của nó** (`<meta name="color-scheme" content="light dark">`, `html { color-scheme }` = theme), để
  chế độ tối ép buộc của trình duyệt điện thoại không đè lên theme của người dùng. [color-scheme]
- **Icon của bộ:** chỉ gửi những icon code gọi tới (một bản con sinh ra từ CSS icon của bộ, build tự kiểm), không gửi cả bộ.
- **Mọi thẻ số liệu hiện một tỉ lệ %:** mức đổi so với kỳ trước - WoW / MoM / QoQ theo khoảng thời gian đang chọn, màu đỏ khi
  giảm - hoặc tỉ trọng con số đó chiếm (số người đã đăng nhập trên số tài khoản người đang mở, phần đăng nhập của app dẫn đầu);
  thêm được một dòng thứ hai cho một ý nữa (agent tách riêng khỏi người). [kpi-pct]
- **Tắt được hiệu ứng theo chuột:** Cài đặt › Giao diện tắt đốm sáng, ánh lướt, nghiêng và gợn cho người đó (cài đặt giao diện
  `fx`, lưu cùng các cài đặt giao diện khác; `html.fx-off`); các tấm kính vẫn giữ.
- **Báo khi có bản build mới:** app đọc phiên bản của server qua lần dò health; phiên bản khác với bản mà tab đã nạp thì hiện
  thanh báo kèm nút tải lại (có thay đổi chưa lưu thì hỏi trước), để không ai làm việc tiếp trên bản cũ.
- **Danh sách tài khoản hiện loại tài khoản** (người · agent) thành một cột riêng có bộ lọc riêng, hộp sửa tài khoản đặt được
  loại; số liệu về người chỉ đếm người.

- **Bốn thẻ số liệu Insights phải khác nhau:** thẻ tài khoản có hai dòng User và Agent, mỗi dòng hiện số lượng và tỷ trọng
  trong tổng tài khoản hoạt động của hai loại (hai tỷ trọng cộng lại bằng 100%);
  thẻ thứ tư hiện số app có sử dụng, tỷ lệ trên app đang bật và tổng app đang bật, không lặp lại so sánh lượt đăng nhập.
  Panel trang riêng được neo, breadcrumb nằm trái còn tìm app và lọc kỳ nằm phải trên cùng một hàng desktop. [insights-kpis] [crumbs]
- **Mỗi thẻ Insights có bốn vai chữ theo thứ tự cố định:** title của card, nội dung chính, tỷ lệ %, nội dung phụ. Nội dung
  chính lớn hơn title; tỷ lệ đậm hơn và khác màu nội dung phụ. Trong card tài khoản, cả nhãn User/Agent lẫn con số đều dùng
  vai nội dung chính. [kpi-type]

## 6. Kiểm

- Bài kiểm trình duyệt của repo nhập `scripts/sneat_glass_check.mjs`, chạy mọi mục `RULES` trên mọi trang và mọi mục
  `DIALOG_RULES` trên mọi hộp thoại nó mở, ở một khổ máy tính và một khổ điện thoại và ở cả hai theme, sau khi hiệu ứng mở đã xong. Thêm luật vào
  đây thì thêm mục tương ứng trong cùng một lần sửa; mỗi mục mới phải được chứng minh đỏ bằng cách làm hỏng thứ nó canh - với
  code vẫn build được: bài kiểm build lại trước khi chạy, để một lần build hỏng không bao giờ khiến nó kiểm một bản cũ.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — the look of a kind is approved on its template before it is ported · kiểu được duyệt trên template trước khi chép sang app
