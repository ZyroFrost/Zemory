---
version: 58
lang: vi
---

# app-sneat-glass — bố cục Sneat mặc dáng Glass

> Skill KIỂU ghép từ hai skill: `app-sneat` giữ bố cục của bộ Sneat đúng như bộ có; `app-glass` giữ dáng; skill này giữ những gì
> riêng chỗ ghép cần. Mỗi luật đến từ một lần người yêu cầu sửa và có phép kiểm máy trong `scripts/sneat_glass_check.mjs` (tên
> trong ngoặc vuông); bài kiểm trình duyệt của repo chạy nó trên mọi trang. Luật nào trang không tự chứng minh được qua DOM thì
> là một phép đo của bài kiểm trình duyệt, liệt kê ở §6.

## 0. Chọn kiểu

- Repo khai `{"style": "SneatGlass"}` ở `frontend/config/ui.json`; theo `app-sneat` cho bố cục, `app-glass` cho dáng, và skill
  này ở chỗ ba cái gặp nhau. Trên bề mặt kiểu này, luật ở đây thắng hai skill kia.

## 1. Thanh trang — hai cụm không bao giờ chạm nhau

- **Mọi thẻ trang mang một thanh, một kiểu dáng**, ở hàng 2 của thanh trên (§2b), chia hai cụm:
  - **nút riêng của trang** xếp từ TRÁI: thứ trang hiện cạnh tên (ai đang trực tuyến), thao tác chính (nút thêm);
  - **cụm tìm** đứng ở mép PHẢI, luôn liền nhau theo thứ tự: các bộ lọc đã ghim lên thanh (§5), nút lọc, ô lọc, nút kiểu
    xem (danh sách · thẻ, hoặc các kiểu riêng của trang). [bar-anchor]
- Cụm tìm lấy phần còn lại của dòng; các bộ lọc ghim co lại (cắt bằng "…") trước khi chạm tới cụm trái; hai cụm không bao giờ
  đè nhau; ghim bộ lọc không làm cụm trái xê dịch. [bar-anchor] [filter-row]
- **Mọi nút công cụ riêng của trang là nút có khung** (v41): ở cụm trái mỗi nút mang khung của nút lọc - cao bằng thanh, có nền hoặc viền, bo
  góc theo kit, sáng màu nhấn khi bật, lún khi bấm - không bao giờ là icon trơ; nút có màu (nút thêm) giữ màu, cùng chiều cao.
  Khung tự cho nút thường kiểu này. [tool-framed] Mọi nút của cụm trái, cả nút thêm, cao bằng bộ lọc bên phải, lệch tối đa
  1 px (v42). [tool-framed]
- **Mọi control của thanh cùng MỘT cỡ, khoá cứng** (v43: nút "+" cao 38 px cạnh bộ lọc ghim 34 px, "phải khóa lại
  chính xác size"): công cụ của trang và nút "+", mọi bộ lọc ghim, nút lọc, ô tìm và nút đổi kiểu xem vẽ ra đúng `--tool-h`
  (38 px, đặt một lần trên `.page-toolbar`), lệch tối đa 1 px; nút chỉ có icon là ô vuông cỡ đó. Không luật style nào của khung
  hay của app ghi số cho chiều cao một control của thanh, hay bề rộng một nút icon - `Rule_Gate_97_BarOneSize` chặn ngay lúc ghi;
  cỡ chỉ đổi qua `--tool-h`. [bar-one-size]
- **Hai đầu mỗi hàng chừa bằng nhau** (v42): hàng 1 và thanh trang - từ mép trái tới control đầu bằng từ control
  cuối tới mép phải, lệch tối đa 2 px. [bar-ends-even]
- **Nút hàng 1 có khung** (v42): nút ứng dụng và chuông là
  ô vuông mang khung của thanh (nền, viền, bo góc kit), cao bằng ô tìm; khi mở thì sáng như nút lọc. [head-framed] **Bên phải hàng 1 là một
  nhóm, đúng một phần ba thanh** (v51): ô tìm và các nút đứng chung ở cuối hàng 1, rộng đúng một phần ba thanh trên cùng (ô tìm lấy phần
  các nút để lại), mọi phần cách phần kế bằng đúng khoảng cách của thanh trang - không bao giờ khe rộng hơn trước ô tìm. [row1-end]
  **Đường
  dẫn ngăn bằng mũi tên của kit,** không bao giờ là "/" gõ tay ("cái path nên thành >"). [crumb-chevron]
- **Cái đang chọn thì sáng, phần còn lại mang khung xám** (v42): mọi tab trong hàng có khung khi chưa chọn; tab đang chọn, kiểu xem đang
  chọn và công cụ đang bật được tô màu nhấn (chữ trắng), và một vệt sáng chạy qua cái vừa chọn,
  một lần (FX: sheen; tắt theo hiệu ứng con trỏ và chế độ giảm chuyển động). [chosen-lit] **Hàng menu của trang đang mở giữ đúng kiểu chọn của mẫu** (v50): đứng trên viên kính trắng (màu glass-strong), chữ màu chữ thường,
  icon màu nhấn - không bao giờ tô màu nhấn như tab đang chọn. [menu-pill-glass]
- Trang chỉ có một kiểu xem (mọi trang báo cáo) không hiện nút kiểu xem (nút mờ chỉ chiếm chỗ trên thanh); nút kiểu xem, khi có, có từ hai kiểu trở lên. Trang chưa có bộ lọc vẫn hiện nút lọc, ở trạng thái tắt.
  [toolbar] Nút đang bật thì làm đúng việc nó nói: dạng danh sách hiện dòng (một bảng, sắp được theo tiêu đề cột khi có ích -
  trạng thái, độ trễ), dạng thẻ hiện thẻ; trang toàn thẻ (trang chọn app) có dạng danh sách thật, không bao giờ để nút bấm mà
  không đổi gì. [view-real]
- **Một kiểu dáng:** ô lọc, nút lọc và nút kiểu xem cùng chiều cao, cùng bo góc, cùng nền kính và viền; nút kiểu xem là một
  nhóm; không bao giờ để nút kiểu Sneat cạnh ô kiểu Glass. Kiểu xem đang chọn sáng màu nhấn, nút lọc cũng sáng khi popover của
  nó đang mở. [toolbar]
- **Ô lọc giữ nguyên bề rộng khi được focus** - focus chỉ làm sáng viền, không giãn ô (ô giãn ra thì tràn khỏi panel) - và giữ
  chỗ cho icon (Sneat thu lề trong của ô đang focus; bề mặt ghim lề đầu). [search-steady] [toolbar]

## 2. Khung đứng yên (`app-base` F21 trong kiểu này)

- Từ khổ máy tính bảng trở lên, cửa sổ không bao giờ cuộn. Trang có nhiều thẻ thì cột trang cuộn dưới thanh trên bằng kính:
  thanh đứng yên, nằm đè lên thứ trượt bên dưới, phía trên thanh không hiện gì - các thẻ trượt xuống dưới thanh, không bao giờ bị
  cắt ở mép dưới của thanh. [frame]
- Trang có nội dung là một thẻ trang thì thẻ lấp đầy vùng đó và cuộn BÊN TRONG thẻ: thanh trang (hàng 2 của thanh trên) và hàng
  tiêu đề bảng luôn ghim, như khung Glass. Khung con trong thân thẻ không làm ô cuộn riêng, trừ khi chính nó ghim thứ gì (ma trận
  ghim cột đầu theo chiều ngang). [frame]
- **Trang bảng: thẻ lấp đầy, bảng cuộn bên trong - đã chốt** (v46, cho mọi app của hệ): trang của
  một bảng hay ma trận là một thẻ trang lấp đầy khung (`fill`, mặc định), bảng cuộn bên trong với hàng tiêu đề và cột đầu ghim,
  thanh trang luôn có; trang không bao giờ cuộn cả cột vì một bảng. Chỉ board nhiều thẻ (tổng quan số liệu và biểu đồ) mới cuộn
  cả cột, và board đứng như trang Thống kê của repo quản hệ: cùng thanh trang, không thẻ trang bọc ngoài, mỗi thẻ là một tấm kính
  riêng đứng thẳng trên nền, cách nhau bằng khoảng hàng của kit (`board` của khung, v49). Chỗ cho dữ liệu đến từ việc thu hàng 1 (`head_fold` Tối đa chỗ, §2b), không bao giờ từ cuộn cả trang.
  Bảng thẳng hàng với thanh trang: chữ cột đầu bắt đầu đúng chỗ công cụ của thanh bắt đầu (.75rem từ mép thẻ). Bảng của trang
  bảng nằm thẳng trong thân thẻ trang, không bao giờ bọc trong thẻ con; bảng trong panel của board (một thẻ con) giữ lề 1rem của
  thẻ đó (v47, Dashboard 09/11). [table-edges] [card-inset]
- **Dải tab các trang cùng nhóm** (v46, Dashboard 08/11 - "khu vực tab phải là khu vực tách rời, ko được load lại…
  gần như là panel khung dòng thứ 3… nó cũng phải neo"): app gom nhiều trang dưới một hàng menu thì bật dải tab của khung
  (`pageHead`); dải nằm trên trang và ngoài trang - đổi tab chỉ đổi trang - neo trên đầu; dải là phần trên của thẻ trang, cùng
  một khối kính, ngăn với trang bằng một đường kẻ mờ, không bao giờ thành panel rời (v48); thấp và gọn, không bao giờ rộng hơn thẻ; mọi tab cách nhau đúng một khoảng,
  bằng lề hai đầu dải ("phải cách bằng với padding 2 đầu chứ"); tab của trang đang mở sáng nhờ viên trượt từ tab trước; tab không vừa một dòng gom vào
  "Thêm (n)", tab đang mở luôn trên dòng (không để tab xuống 3 dòng). [page-tabs] **Một cài đặt cho cách xem các trang cùng
  nhóm** (v56), Cài đặt > Bố cục: Tab từng trang (mặc định, cho người mới ở mọi màn hình) · Cuộn dài (mọi trang của nhóm nối thành
  một trang dài, chỉ ở app có kiểu này) · Không tab; cuộn dài và không tab đều không hiện dải - trang dài không cần tab, và app
  không giữ nút chuyển riêng cho việc này trên thanh trang. [page-view-scroll] **Dải là hàng 3 của thanh trên** (v50, v56): dải
  neo ngay DƯỚI thanh trên cùng, không bao giờ neo ở đỉnh khung cuộn sau lưng thanh (trang board từng mất dải dưới thanh), dính
  lên hàng 2 không khe dù hàng 1 hiện hay thu - một khối, góc dưới của thanh và góc trên của dải vuông, giữa là line đứt mờ - luôn
  thấy được, không gì đè lên; khe duy nhất còn lại là từ khối tới trang (dải đứng riêng làm khe trên và khe dưới dải không đều).
  [tabs-dock] **Các tab là một cụm, đầu cụm là tay nắm** (v56: báo cáo ít trang mất trọn một hàng cho dải tab): để tự động (mặc
  định), cụm đứng ở hàng 2 - giữa công cụ của trang và cụm tìm, không chạm bên nào, một nhóm có khung cao bằng cỡ chung của thanh
  - khi mọi tab vừa ở đó và còn dư chỗ, không thì thành hàng 3; chỉ quay lại khi không còn vừa, không bao giờ nhảy qua lại vì vài
  px. Người dùng kéo tay nắm thả lên hàng 2 hoặc xuống dưới thanh để ghim cụm ở đó (cài đặt của họ; Cài đặt > Bố cục đưa về tự
  động); ghim ở hàng 2 mà thiếu chỗ thì tab dư vào "Thêm (n)". Điện thoại giữ hàng 3. [tabs-cluster] Mỗi người kéo một tab thả
  vào chỗ khác để đổi thứ tự các tab của nhóm; thứ tự là của họ, giữ riêng từng nhóm, Cài đặt > Bố cục đưa mọi nhóm về thứ tự
  menu (v58). [tabs-reorder] **Hàng 2 chia khu, ở mọi app** (v58): nút của trang, rồi thông tin - chữ và số về trang, trong
  `.page-info` - rồi cụm tab khi nó đứng ở hàng 2, mỗi khu cách khu trước bằng khe của hàng và một vạch ngăn mờ; không chữ nào nằm
  lẫn giữa các nút. [bar-zones]
- **Mọi điểm dừng của đường dẫn là một trang** (v53): mọi nút của menu là một trang - lá là trang của app, nhánh (phòng ban, nhóm
  báo cáo, nhóm con) là danh sách những gì nó chứa, mỗi phần một dòng rộng bằng trang, các trang của nó trải đều. App đưa nhánh
  trang danh sách riêng (`to` của hàng, của nhóm `toggle`); không có thì khung tự vẽ ở `/~/<khoá>`, đường dẫn là các nhánh xuống tới
  nó. Trên menu bấm chữ hàng có hàng con thì mở trang danh sách, mũi tên chỉ gập/mở, rê chuột lên hàng thì bung cây (rời chuột thì
  gập, nhánh của trang đang mở thì giữ); menu thu gọn thì bấm icon mở trang. Đường dẫn, menu và trang danh sách đọc chung một cây.
  [nav-stops] Trên một board, dải là phần cuối của khối thanh, hai góc dưới bo (v52); trên thẻ trang thì hai góc dưới nối vào thẻ. [tabs-round]
- **Kỳ trang luôn giữ không bao giờ được đếm là một bộ lọc** (v52): nút lọc chỉ đếm cái người
  dùng đặt - kỳ hay ngày làm việc cố định (`fixed`, `data-fixed` trên ô của nó) không bao giờ vào số đếm, cũng không sáng như đã đặt.
  [filter-count-fixed]
- **Ô gợi ý một dòng một thông tin, cỡ chữ của trang** (v51): mỗi dòng của `data-tip` (`\n`) là một dòng của ô
  gợi ý và không bao giờ xuống dòng; hộp rộng theo dòng dài nhất (tối đa bằng cửa sổ, đặt lại vào trong cửa sổ); chữ cỡ của trang
  (.875rem), không nhỏ hơn; số trong ô gợi ý viết đủ. [tip-lines]
- **Mọi bảng đứng trong một hộp cuộn ngang của riêng nó** (v51: kéo rộng một cột làm bảng tràn ra
  khỏi panel): bảng trong thẻ trang, thẻ board hay hộp thoại nằm trong hộp riêng cuộn ngang được (`.table-responsive`, hoặc thân
  thẻ trang), bên trong thẻ của nó; cột kéo rộng quá thẻ thì cuộn trong hộp đó, không bao giờ tràn ra ngoài thẻ. Hộp CÓ THỂ cuộn
  không phải là cuộn: chỉ nội dung rộng hơn hộp mới là cuộn (v52: một app tưởng luật này đá với luật báo cáo cấm cuộn ngang - hai
  luật đi cùng nhau: bảng nào cũng có hộp, không bảng nào tràn). [table-boxed]
- **Danh sách dài hơn màn hình chỉ chiếm một màn hình** (v55, mọi app của hệ): bảng cao hơn khoảng trống dưới thanh trên
  (`--table-room`) cuộn trong một hộp cao tối đa bằng khoảng đó, hàng tiêu đề neo ở đầu hộp - thân thẻ trang lấp khung, hoặc
  hộp riêng (một panel, một nhật ký); không bao giờ để cột trang cuộn cả danh sách, không bao giờ có hộp cao bằng cả danh sách.
  Khung tự lo việc này: trong thẻ lấp khung, mỗi hộp riêng chứa bảng là một cửa sổ danh sách cao tối đa bằng phần thân thẻ đang
  hiện (`.list-window`, `--card-room`); trang không lấp khung thì dùng cửa sổ bảng (1.13.1) - app không tự viết giới hạn riêng.
  Đọc sau khi trang đã vẽ xong các bảng. [list-one-screen]
- **Cả app co giãn theo cửa sổ từ một khuôn thiết kế** (v50): đã đăng nhập, trang vẽ trên 1920 x 1080 rồi zoom = min(rộng/1920, cao/1080), không quá 1, không dưới
  0,7, nên kéo cửa sổ không làm bố cục xô lệch; điện thoại (768 px trở xuống) không co. Mỗi người tắt được ở Cài đặt › Bố cục
  (Tỉ lệ theo màn hình: tự co giãn | 100%). Dưới zoom, chiều cao/rộng cửa sổ lấy từ --app-h / --app-w của khung (không dùng
  vh / vw), và cỡ hay vị trí ghi từ số đo trên màn hình (dropdown, popover, tip, menu, viên chọn, kéo) chia cho zoom - khung
  xuất uiZoom / toPage cho code riêng của app. Bộ soi đo px thiết kế: tắt co giãn (localStorage sasinShell.scale = off) trước
  khi trang tải. [ui-scale]
- Trên điện thoại, cửa sổ cuộn và thanh trên dính (sticky).

## 2b. Thanh trên — một khối kính hai hàng, giống nhau ở mọi app của hệ

- **Một khối kính, hai hàng, không khe hở:** hàng 1 (56 px) là thanh chung của hệ, hàng 2 (44 px) là thanh của trang, giữa hai
  hàng là một vạch mảnh. **Hàng 1 có thu lại hay không là cài đặt của từng người** (v45), Cài đặt > Bố
  cục > "Thu gọn hàng 1 khi cuộn" (`head_fold`): **Cố định** (mặc định) - hàng 1 luôn hiện; **Tối đa chỗ** - cuộn xuống ở
  cuộn của chính trang thì hàng 1 thu lại, chỉ còn thanh trang dính trên cùng và trang lấy chỗ của nó, cuộn lên hay về đầu trang
  thì hàng 1 hiện lại; khi hàng 1 đang thu, cuối thanh trang có một nút (cỡ chung của thanh) để mở lại bằng tay, lần cuộn xuống
  sau lại thu. Cuộn của chính trang là cửa sổ, cột trang, thân thẻ trang, hộp khai `data-page-scroll`, và trên trang lấp đầy
  khung thì hộp cuộn riêng của bảng trong thân thẻ khi cao ít nhất nửa thân thẻ; một hộp nhỏ bên trong trang (nhật ký ở chân,
  danh sách trong hộp thoại) không bao giờ thu hàng 1 (v42, Reconcile 07/11). Chỉ một lần cuộn: hàng tiêu đề, cột đầu ghim và
  thanh trang luôn đứng yên. Trang không có thanh riêng thì chỉ có hàng 1. [crumbs] [frame] Đầu trang lớn theo hai hàng của nó - không bao giờ giữ
  `block-size: 4rem` cố định của bộ mẫu để thanh trang tràn ra ngoài - và trang bắt đầu dưới nó, không phần nào của trang nằm dưới
  thanh. [head-whole]
- **Hàng 1 nhường chỗ cho đường dẫn:** đường dẫn từ đầu hàng, rồi ô tìm duy nhất đứng sát dãy nút ở cuối, và dãy nút chỉ còn app ·
  chuông · tài khoản. Không có ngày giờ. Điện thoại bỏ đường dẫn khỏi hàng 1. [crumbs] Lớp hệ, lớp app và trang đang xem luôn đọc
  đủ; chỉ các lớp ở giữa co lại thành "…" và hiện đủ tên khi rê chuột. [crumbs-whole]
- **Đường dẫn là hệ / app / [nhóm] / trang:** app nhỏ là `<hệ> / <app> / <trang>`; bản thân system-manager cũng là một app, là
  hub (`<hệ> / Hub / Quản trị / Người dùng`). Nấc thứ hai là app được ghi dưới tên hệ trong menu. Mọi lớp trước trang hiện tại
  đều là liên kết về trang đầu của lớp đó (trang đầu của hệ và của hub là trang chọn app, của một nhóm là trang đầu của nhóm) -
  kể cả khi trang đầu đó chính là trang đang mở; chỉ trang hiện tại là chữ thường (`aria-current="page"`); không title nào lặp
  lại nấc cuối. [crumbs]
- **Menu tài khoản theo bộ mẫu:** tiêu đề của nó là lời chào trên MỘT dòng ("Chào buổi tối, <tên>"), dưới là vai; rồi Hồ sơ của
  tôi, Cài đặt, các cài đặt nhanh - ngôn ngữ (VI · EN), sáng / tối, công tắc kính - rồi Đăng xuất. Lời chào không bao giờ chiếm chỗ
  ở hàng 1. [crumbs] [bar-switches]
- **Số phiên bản của app đang mở nằm ở chân menu** (`v<M.m.p>`, đọc từ health của app), ẩn khi menu thu gọn; không bao giờ ở hàng 1.
- **Thanh trang không có tab riêng của app tới một trang của menu:** các trang của app tìm trong menu; cụm trái của thanh trang là
  công cụ của trang (thao tác chính, một công tắc, các chip lọc chéo). Chỉ cụm tab của khung được đứng ở hàng 2 (v56,
  [tabs-cluster]). [tabs-in-menu]
- **Tên người dùng đọc không mang mã bản ghi phía trước:** menu, đường dẫn và tiêu đề thẻ ghi tên ("Internal Control Report"), không
  bao giờ ghi mã trước ("IC_02 …") - mã là định danh. [no-code-prefix]
- **Tên app ở menu có phần nhấn (`.text-primary`, cuối tên) mang token màu thương hiệu chung `--g-brand`,** ở cả hai theme; app
  tự định nghĩa token. [brand-one-red]
- **Hình nền của hệ là ba màu đỏ, trắng, đen, trắng nhiều nhất** (v43): tông thương hiệu của hệ (khung ghi tên nó ở `data-wall-brand` trên `<html>`), ở cả hai giao diện: mảng
  lớn a là ánh trắng, mảng lớn b là đen (xám than ở giao diện sáng), màu thương hiệu (`--g-brand`) chỉ ở mảng nhỏ c giữa màn
  hình, nhỏ và nhạt hơn hai mảng kia; ô mẫu của tông này trong Cài đặt cũng đúng ba màu đó. [wall-brand]
- **Dưới tên hệ,** dòng nhỏ chỉ ghi app đang mở (`data-app-name` của menu): tên app dashboard trong app dashboard, tên riêng của
  hub trong hub. Dòng này giữ nguyên khi đi giữa các trang của app đó; đường dẫn ghi trang hiện tại. [brand-area]
- **Nhãn nhóm của menu cách vạch ngăn ngắn** ít nhất 8 px khi menu mở. [menu-header-gap]
- **Một nhóm của menu là một lớp của đường dẫn, không bao giờ là tiêu đề trong trang:** phòng ban hay khu vực mà menu gom trang vào là
  một lớp của đường dẫn (`<family> / <app> / <group> / ... / <page>` - nhiều lớp nhóm khi menu lồng nhiều tầng), trang riêng của nhóm
  liệt kê những gì nó chứa, và mọi trang thuộc nhóm hiện nhóm đó trong đường dẫn. Thẻ trang không bao giờ lặp tên nhóm thành tiêu đề
  trên nội dung; tiêu đề của một thẻ con là tên riêng của thẻ đó. [group-in-crumbs]

## 3. Hộp thoại — đúng S / M / L (`app-base` F2 trong kiểu này)

- Hộp thoại là một `<dialog>` chứa `modal-content` của bộ mẫu, lớp cỡ `sz-s` · `sz-m` · `sz-l`: `width: min(P vw, P vh × 16/9)` và
  `aspect-ratio: 16 / 9`, P = 40 / 60 / 90. Không `min-width`, không `max-height` làm méo khung; thân cuộn bên trong; đổi tab không
  làm khung dời hay đổi cỡ. Toàn màn trên điện thoại. Mở xong, hộp thoại kết thúc hiệu ứng mở ở đúng cỡ: hộp đứng yên mà vẫn
  thu nhỏ là chưa nhận trạng thái đã mở, và được gọi đúng tên như vậy (v57). [dialog-size]

## 4. Cài đặt bố cục (bộ tuỳ chỉnh của bộ mẫu)

- Cài đặt › Bố cục, cho mọi người, lưu thành cài đặt giao diện của họ: **bề rộng nội dung** rộng (mặc định: nội dung lấp khung,
  `app-base` F22) hoặc gọn (bề rộng container của bộ mẫu); **menu** mở hoặc thu (nút tròn trên menu lưu cùng cài đặt). [wide]

## 5. Control và hiệu ứng

- **Góc bo nhẹ, như bộ mẫu:** thẻ, ô nhập, nút và menu `.375rem`, hộp thoại và khung lớn `.5rem`, không bao giờ hơn - trừ hình
  cố ý tròn (viên thuốc, hình tròn: bán kính tới nửa chiều cao). [radius-kit]
- **Ô chọn mở menu kính,** không bao giờ là danh sách của trình duyệt: bật ra có lò xo, nền đặc, đánh dấu mục đang chọn, giữ bàn
  phím (mũi tên, Enter, Escape) và bắn `change`. Trong hộp thoại đang mở, menu vào cùng lớp với hộp thoại (top layer).
- **Không có ô vuông khi rê từng ô:** ở dạng thẻ, một thẻ là một panel; `table-hover` của bộ mẫu tô từng ô nên bị tắt ở đó.
  [card-hover]
- **Phần tử hiệu ứng không mang trang trí của trình duyệt:** viên thuốc làm từ mục danh sách có `list-style: none`; nút đóng nằm
  trong hàng nó đóng. Phần tử mà một hiệu ứng chèn vào control (vòng gợn sóng) được CSS của chính kiểu này đặt ra ngoài luồng -
  mỗi control một hiệu ứng, không bao giờ để sót hiệu ứng của kiểu cũ mà CSS đã mất (vòng khi đó nằm trong luồng và làm to mọi
  nút bị bấm). Bài kiểm trình duyệt bấm từng nút của hộp thoại bằng con trỏ thật và đo nó khi đang giữ (§6).
- **Menu nổi trên thẻ kính** (menu ba chấm của hàng, menu của ô chọn, danh sách của bộ lọc) đặt trên `<body>` (hoặc hộp thoại đang
  mở): thẻ có `backdrop-filter` trở thành khung chứa của menu fixed.
- **Mọi hiệu ứng của template Glass** giữ dấu `FX:` trong code (`app-glass`); các thẻ của trang lần lượt hiện lên khi trang mở
  (FX: reveal).
- **Thanh cuộn là của template Glass** ở mọi ô cuộn (12 px, rãnh bo mềm, con trượt chuyển màu nhấn lùi vào bằng viền trong
  suốt), không bao giờ là mặc định của trình duyệt; không luật nào đặt `scrollbar-color` hay `scrollbar-width` (Chromium khi đó
  bỏ các phần của template). [scrollbar]
- **Hàng tiêu đề hay cột ghim là kính của thẻ, trong suốt:** khi bật kính nó không tự tô gì - không màu nền, không lớp làm mờ
  (lớp nằm trong thẻ kính chỉ làm mờ màu trắng của thẻ: thành dải trắng; vả lại ô bảng không mang được `backdrop-filter`). Thay
  vào đó các dòng cuộn dưới hàng tiêu đề ghim bị CẮT ở mép dưới của nó: thân bảng được cắt theo độ cuộn
  (`clip-path: inset(var(--st) 0 0 0)`, `--st` lấy từ `scrollTop` của ô cuộn), nên không gì hiện xuyên qua chữ tiêu đề. Khi tắt
  kính, ô ghim mang nền đặc. Cột ĐẦU ghim được cắt cùng cách theo chiều ngang: mỗi ô khác cắt phần nằm dưới cột đó
  (`clip-path: inset(0 0 0 max(0px, --sl + --fw - --x))` theo độ cuộn ngang của ô cuộn, bề rộng cột và vị trí trái của ô). [pin-cover]
- **Thanh cuộn dọc bắt đầu dưới hàng tiêu đề ghim:** ô cuộn mang chiều cao hàng tiêu đề (`--th`) làm lề trên của rãnh thanh
  cuộn, nên cả con trượt lẫn các dòng đều không lên tới cạnh chữ tiêu đề. (Phép đo của bài kiểm trình duyệt, §6.)
- **Công tắc kính nằm trong menu tài khoản** cạnh sáng / tối, bật khi kính đang bật. [bar-switches]
- **Những gì thẻ trang chứa giữ lề của bộ mẫu:** thẻ con đầu tiên (một panel, một thẻ số liệu, một ô) bắt đầu cách ít nhất 1rem bên
  trong thân thẻ trang - dưới mép trên và trong hai mép bên - không bao giờ dính sát; một bảng thường được chạy mép tới mép.
  [card-inset]
- **Chỉ control của bộ mẫu, một phông:** mọi control là `form-control` · `form-select` · `form-check-input`, mọi nhãn trong hộp thoại
  là `form-label` · `form-check-label`, form trên lưới của bộ mẫu (`row g-*` · `col-*`), phông token ở mọi nơi - cả chữ và số trong
  svg - và phông đó thật sự ĐÃ TẢI: app tự mang file phông (phông chỉ được gọi tên sẽ lặng lẽ rơi về phông hệ thống); không lớp
  nào của kiểu cũ sống sót qua lần chép. Công tắc giữ khoảng cách với nhãn. [kit-controls] [switch-gap]
- **Trang đăng nhập giữ dáng riêng nhưng theo phông và cỡ đọc của app:** phông token, nhãn và ô nhập 16 px (ô dưới 16 px làm điện
  thoại phóng to trang khi focus), ghi chú từ 14 px. Cỡ được đo như khi hiện: trang vẽ trên khung cố định rồi phóng cho vừa thì
  mọi cỡ là mức sàn trên màn (cỡ × 1/zoom, không dưới cỡ đã viết); phép kiểm nhân cỡ chữ với `currentCSSZoom`.
- **Danh sách cuộn không bóp dòng** (menu thả, danh sách trong hộp thoại): các dòng của cột flex bị giới hạn chiều cao giữ chiều
  cao của chúng (`flex-shrink: 0`), không dòng nào đè dòng sau; danh sách giữ rãnh thanh cuộn. [list-rows]
- **Menu thu gọn nằm giữa:** huy hiệu, hàng thương hiệu và mọi icon trên đường giữa của rail, lệch tối đa 1 px; khi thu gọn,
  hàng thương hiệu rộng đúng bằng rail, không giữ bề rộng riêng của kit (v43: huy hiệu lệch phải 6 px so với icon);
  chữ thương hiệu không để lại khoảng trống. Mỗi hàng khi thu gọn là một ô vuông, nên ô sáng của mục đang chọn cũng vuông (v44). [folded-centre]
- **Menu thu gọn là thanh mảnh, huy hiệu nguyên vẹn** (v41; v43): 64 px (4rem), không phải 84 của kit; huy hiệu ít nhất 28 px, nằm trong thanh, không bị cắt, đúng hình của
  nó - không bị bóp hay kéo giãn. [rail-slim]
- **Không có nút giả:** mọi nút đều làm một việc - liên kết mang dáng nút không bao giờ trỏ về trang đang mở; mục nào sẽ làm vậy
  (thông báo về trang chủ) thì nhận đúng thao tác nó muốn nói (mở app đó, lật thẻ đó) hoặc không có thao tác. [real-actions]
- **Mọi bảng dữ liệu giữ việc đổi độ rộng cột,** cả hai chiều: mỗi ô tiêu đề có tay kéo `col-resize` nhìn thấy được ở dạng danh
  sách; độ rộng là cài đặt giao diện của người dùng. Bảng đổi được độ rộng dàn theo độ rộng đã đặt (`table-layout: fixed`, chữ
  dài hơn cột kết thúc bằng "…"), nên cột thu nhỏ được như khi kéo rộng, tới 48 px - kiểu dàn tự động giữ cột rộng bằng dòng chữ
  dài nhất của nó. Độ rộng đo trên bố cục (`offsetWidth`), không bao giờ trên trang đang vẽ (trang đang hiện lên bị thu phóng);
  cú kéo bắt đầu từ độ rộng đang vẽ và được theo dõi trên cả cửa sổ cho tới khi nhả chuột (tay kéo bị vẽ lại giữa chừng không
  được làm dừng cú kéo); tay kéo không mang trình nghe riêng - một trình nghe trên document nhận mọi tay kéo và mỗi
  bảng tự giữ độ rộng của nó (tay kéo còn lại từ lần gắn trước, đã mất trình nghe, không bao giờ bắt đầu được cú kéo), và cú bấm được nhận theo vị
  trí - trong 8 px sát mép phải của ô tiêu đề - không theo target của sự kiện (phần tử khác có thể đang giữ con trỏ); ô
  tiêu đề bị vẽ lại được gắn lại tay kéo. Lần chép mang theo cả CSS của tay kéo. [resize] (Bản thân cú
  kéo là phép đo của bài kiểm trình duyệt, §6.)
- **Mọi biểu đồ hiện số của nó,** như báo cáo: giá trị trên từng cột, nhãn số trên đường (mọi điểm khi đủ chỗ, không thì điểm cao
  nhất, thấp nhất và cuối), tỉ phần của từng phần bánh cạnh giá trị. [chart-labels]
- **Màn cảm ứng đổi theme ngay:** vòng tròn hiện theme mới (view transition) chỉ chạy với con trỏ tinh; với con trỏ thô trang vẽ
  lại thẳng, vì trình duyệt điện thoại có thể giữ ảnh cũ trên màn trong lúc lưu cài đặt. Thanh trình duyệt của điện thoại
  (`theme-color`) theo theme.
- **Trang khai bảng màu của nó** (`<meta name="color-scheme" content="light dark">`, `html { color-scheme }` = theme), để chế độ tối
  ép buộc của trình duyệt điện thoại không đụng tới theme của người dùng. [color-scheme]
- **Icon của bộ mẫu:** chỉ mang các icon code có gọi tên (một tập con sinh ra từ CSS icon của bộ mẫu, bản build kiểm), không mang
  cả bộ. Mọi icon của khung - thanh trên, menu, bảng lệnh, thanh trang, các menu - lấy từ bộ icon của bộ mẫu (`bx-…`), icon của
  trang giống nhau ở menu và bảng lệnh; không emoji hay ký tự gõ nào thay cho icon. [kit-icons]
- **Mọi thẻ số liệu có một phần trăm:** mức đổi so với kỳ trước - WoW / MoM / QoQ theo khoảng đã chọn, đỏ khi giảm - hoặc tỉ phần
  con số chiếm (người đã đăng nhập trên số tài khoản người đang mở, tỉ phần lượt đăng nhập của app đứng đầu); một dòng phụ có thể
  thêm một thông tin (agent tách khỏi người). [kpi-pct]
- **Bốn số liệu Thống kê khác nhau:** số liệu tài khoản chia dòng chính làm hai nửa, tài khoản người và tài khoản agent, mỗi nửa
  có số đếm và, ở dòng phần trăm bên dưới, tỉ phần của nó trên tổng hoạt động của cả hai (hai tỉ phần cộng lại 100%); số liệu thứ
  tư báo số app đã dùng, tỉ phần trên số app đang bật và tổng số app đang bật, không lặp lại phép so lượt đăng nhập.
  [insights-kpis]
- **Mỗi số liệu Thống kê có bốn vai chữ theo thứ tự:** tên thẻ, nội dung chính, phần trăm, nội dung phụ. Nội dung chính lớn hơn
  tên thẻ; phần trăm đậm hơn và khác màu với nội dung phụ. Ở số liệu tài khoản, mỗi số đếm là nội dung chính và nhãn loại tài
  khoản bên cạnh mang vai phụ, nên một nửa không bao giờ lớn quá thẻ hẹp. [kpi-type]
- **Các thẻ số liệu cùng hàng giữ dòng ngang nhau:** dòng chính, dòng phần trăm và dòng phụ bắt đầu cùng độ cao ở mọi thẻ của
  hàng, đo trên bố cục (thẻ đang hiện lên hay đang nghiêng theo con trỏ không tính), và không dòng nào rộng hơn thẻ. [kpi-align]
- **Hiệu ứng con trỏ tắt được:** Cài đặt › Giao diện tắt đốm sáng, ánh lướt, nghiêng và gợn sóng cho người dùng (cài đặt giao
  diện `fx`, lưu cùng các cài đặt khác; `html.fx-off`); các panel kính vẫn giữ. Đốm sáng dưới con trỏ còn có công tắc riêng (cài
  đặt `spot`, `html.spot-off`): tắt nó thì các thẻ vẫn nghiêng.
- **Bộ lọc là slicer của báo cáo, chỉ cho trường ít giá trị:** danh sách chọn (chọn nhiều có chọn tất cả và bỏ chọn, hoặc chọn
  một) tối đa 10 giá trị - trạng thái, loại, app, vai, mức, hành động; cột ngày dùng khoảng ngày (từ - đến). Bản ghi chính của
  trang (người, địa chỉ, phòng ban, đầu mối) tìm bằng ô tìm, không bao giờ liệt kê trong bộ lọc. Bộ lọc đang đặt được đánh dấu
  (`.filter-field.on`, theo giá trị ĐÃ ÁP DỤNG). Danh sách của bộ lọc treo trên `<body>` dưới control của nó, như mọi menu trên
  thẻ kính. [filter-set] Một trục thời gian có thứ tự (các tháng trong năm, các quý) không phải danh sách bản ghi: nó giữ đủ mọi giá
  trị và được khai như vậy (`data-filter-kind="period"`); một kỳ trang luôn có (từ - đến, không bao giờ trống) không bao giờ được đánh
  dấu đã đặt (`.on`) và không bao giờ bị Xoá lọc xoá.
- **Nút lọc luôn mở popover;** người dùng ghim từng bộ lọc lên thanh hoặc để nó trong popover. Đầu popover chỉ là MỘT dòng (v41: mỗi bộ lọc một ô tick chiếm chỗ của popover): các bộ lọc đã ghim thành chip (dấu x bỏ ghim từng cái), Ghim tất
  cả và Bỏ ghim tất cả là hai icon cuối dòng; mỗi bộ lọc trong popover mang nút ghim ngay trên dòng nhãn của nó, không thêm
  chiều cao [pins-slim]; rồi mọi bộ lọc chưa ghim; popover giữ một bề rộng cố định (22rem) dù ghim gì. Ghim
  là cài đặt giao diện `filter_pins` của người dùng (một map JSON đường dẫn trang → id bộ lọc), nên giữ ở mọi app; trang chưa có
  ghim riêng theo cài đặt `filters` (`bar` ghim tất cả, `popover` không ghim). Điện thoại giữ mọi bộ lọc trong popover. Bộ lọc
  được ghim hay bỏ ghim BAY từ chỗ cũ tới chỗ mới (FX: flip: chỗ xuất phát ghi lại trước khi ghim, giữ tới khi nó đã dời - hàng
  ghim xuất hiện một lần vẽ sau lần ghim đầu). Bộ lọc ghim đứng sát nút lọc trên một dòng của thanh, mỗi cái là một control mang
  nhãn của nó ("Vai: Tất cả"), tối đa bề rộng chuẩn (12rem), co lại cùng nhau, không bị đẩy ra ngoài, không bao giờ thành dòng
  thứ hai. [filter-row] [bar-anchor]
- **Popover vừa cửa sổ và lọc khi bấm Áp dụng:** nó không bao giờ tràn khỏi màn hình - danh sách ghim và bộ lọc cuộn bên trong
  (thân có thanh cuộn riêng, chiều cao tính từ chỗ nó mở ra), và chân popover luôn hiện ở đáy với Xoá lọc cạnh Áp dụng. Bộ lọc đổi
  trong popover là BẢN NHÁP (`.filter-field.pending`): các dòng không đổi cho tới khi Áp dụng chạy mọi bản nháp cùng lúc (số bản
  nháp hiện trên nút: "Áp dụng (2)"); đóng popover thì bỏ bản nháp. Bộ lọc ghim trên thanh lọc ngay. [filter-pop] [filter-count]
- **Số đếm bộ lọc và nút X:** nút lọc đếm các bộ lọc đang đặt (đã áp dụng, không tính bản nháp); khi có bộ lọc đang đặt, thanh
  hiện nút X để xoá chúng, cạnh nút lọc - dù bộ lọc đang ghim hay nằm cả trong popover. [filter-count]
  Một giá trị trang luôn có (kỳ của báo cáo: ngày từ và ngày đến không bao giờ trống) không bao giờ được đếm là bộ lọc đã đặt và Xoá
  lọc giữ nguyên nó: trang vừa mở, chưa áp gì, không có số đếm và không có nút X; bấm X thì số về 0, X mất và thứ trang hiện thay đổi -
  một nút X không đổi gì là nút giả (các bộ đo ở §6).
- **Mọi bộ lọc cắt ở nơi dòng bị giới hạn:** danh sách server gửi về có giới hạn dòng (N dòng mới nhất của nhật ký) thì lọc bằng
  câu truy vấn của server, TRƯỚC giới hạn - mỗi bộ lọc (khoảng thời gian, app, mức, loại tài khoản, hành động, khoảng ngày, chữ)
  đi vào câu truy vấn; lọc trên trình duyệt trong các dòng mới nhất thì bộ lọc ngày cũ hay giá trị hiếm không ra gì.
- **Mọi ngày theo định dạng ngày của người dùng:** ngày mà bề mặt hiện hay nhận (một ô, một bộ lọc, một lịch) theo cài đặt chung
  `date_format` (`vn` dd/mm/yyyy, `us` mm/dd/yyyy) và ngôn ngữ của app - ô ngày và lịch riêng của app (tuần bắt đầu từ thứ Hai),
  không bao giờ là ô ngày của trình duyệt, vốn theo locale của trình duyệt. [date-format]
- **Khoảng ngày có các kỳ tương đối, như bộ lọc ngày tương đối của Power BI** (v51): cạnh hai ô ngày, mọi khoảng ngày có nút chọn nhanh Tháng
  này · Tháng trước · Năm nay. Giá trị là TOKEN, không phải hai ngày chết: "tháng này" là tháng của ngày cuối có dữ liệu (hôm nay nếu
  trang không có ngày đó), tháng này và tháng trước là trọn tháng lịch, năm nay từ 1/1 tới 31/12; ô hiện tên kỳ ("Tháng này
  (11/2026)"); app lưu token vào cài đặt của người dùng, nên lần sau mở trang là tháng mới nhất; ngày cuối có dữ liệu mới hơn thì
  kỳ dời theo. [date-relative] Ba nút chọn nhanh là một nhóm nút chuyển của khung (v56) - kính xám có khung khi chưa chọn, nút đang
  chọn tô màu nhấn có vệt sáng, như nút kiểu xem, không bao giờ là nút viền màu nhấn - trải hết hàng của hai ô ngày, ba phần bằng
  nhau. [date-quick-even]
- **Người dùng đọc tên, không đọc mã:** danh sách chọn, bộ lọc, nhãn hay tên hành động hiện tên của giá trị lấy từ từ điển, không
  bao giờ hiện mã lưu (`data_query`, `login_ok`); mã ngoài danh sách đọc là "Hành động khác". Mã hành động là danh sách đóng của
  hệ (hợp đồng app của DB hệ): app giữ danh sách đó, mỗi mã có tên ở mọi ngôn ngữ, và một phép kiểm tĩnh đối chiếu danh sách với
  hợp đồng khi hợp đồng có trên máy. [no-raw-code]
- **Chấm trạng thái nguyên vẹn:** chấm của avatar trực tuyến nằm trên mép nó, và không khung nào bao quanh - nút hay dòng menu cắt
  tràn vì hiệu ứng gợn sóng - cắt mất chấm. Con số trên một nút (số tin chưa đọc của chuông, `.badge-notifications` hoặc `data-count-badge`)
  cũng nằm trọn, lòi ra ngoài nút như vậy (v33: con số bị cắt trong nút tròn của chuông). [dot-whole]
- **Ảnh đại diện nằm trong khung bọc nó:** khung không được nhỏ hơn ảnh - khung cố định 100 px bọc ảnh hồ sơ 120 px, ảnh
  tràn qua khoảng cách, dính vào tên (v35). Chồng ảnh (cố ý chồng lên nhau) được miễn. [box-holds]
- **Tab đang chọn là một ô có nền, như Sneat:** hàng tab (`.nav-pills`, tablist) hiện tab đang chọn bằng nền của chính nó
  hoặc ô trượt bên dưới - không để chữ trơn nằm lẻ trên trang (v35). Khung chung tự tô nền cho hàng `.nav-pills` không có ô trượt riêng. [tab-pill]
- **Trang nào cũng có panel hàng 2** - thanh riêng của trang (`page-toolbar`) dưới thanh đầu: hàng 2 của khung gọn
  (`#page-bar`), hoặc card đầu tiên của trang ở khung cổ điển. Trang không phải một page card thì lấp hàng 2 bằng
  `PageToolbar({start, tools})` của khung - tab hoặc hành động chính từ trái, công cụ tìm lọc từ phải; không bao giờ để
  trống hàng 2 (v36). [page-bar]
- **Hàng tab không nằm trơ trong trang:** nó ở thanh trang (hàng 2), trong một card hoặc trong hộp thoại (v36:
  tab của cài đặt hồ sơ nằm trơ dưới thanh). [tabs-in-panel]
- **Trợ giúp mở từ một chỗ:** trang Trợ giúp của khung (mục Trợ giúp ở menu) có hai tab - Chung, của khung (sau này đặt trợ lý AI
  ở đây), và hướng dẫn riêng của app, mang tên app, khai trong `config.help` (các mục kèm trang mà mục đó nói về; mở ở trang nào
  thì chọn mục của trang đó). Thanh trang không có nút trợ giúp hay hướng dẫn riêng; liên kết trong trang có thể mở một mục bằng
  `openHelp` / `sasinShell.openHelp` (v39;
  khung 1.10.0). [help-in-menu]
- **Các ô trong một hàng thẳng một đường:** mọi nút, ô nhập, ô chọn, tab và ô tìm đứng cạnh nhau trong một hàng - thanh
  trang, đầu card hay panel, mọi hàng trong trang, hộp thoại - có chung tâm dọc (lệch tối đa 3 px); một hàng là hàng flex
  ngoài cùng chứa chúng, nên nhóm ô nhập và nhóm nút trong cùng một đầu panel vẫn là một hàng (v38, Reconcile 07/11: lỗi nằm ở
  đầu một panel trong trang, ngoài thanh trang). CSS cũ của app (luật `.card button` của thẻ đăng nhập cũ, nặng hơn `.btn`)
  không được đẩy một ô xuống - để CSS đó trong một `@layer` thấp hơn (v37, Reconcile 07/11: các nút của thanh thấp 16 px mà
  kiểm vẫn xanh). [bar-aligned]
- **Avatar giữ đúng hình vuông:** trong mọi hàng - trang, thanh trên, menu, menu thả xuống - avatar của bộ mẫu đứng `flex-shrink-0`
  cạnh chữ có thể dài, khối chữ co lại và kết bằng "…"; một tên dài không bao giờ ép bẹp avatar. [avatar-square]
- **Giao diện là của người dùng trên cả hệ:** các cài đặt giao diện tạo nên bề mặt chung - theme, ngôn ngữ, định dạng ngày, kính
  và độ mờ, hiệu ứng con trỏ và đốm sáng, kiểu bộ lọc và ghim, bề rộng nội dung và menu - lưu một lần, là cài đặt của người dùng
  ở system-manager trong DB của hệ, và mọi app của hệ đọc và ghi ở đó, nên chọn ở một app là đúng ở mọi app.
- **Mọi control tự xưng tên khi trỏ vào:** control không có chữ riêng (nút icon, công tắc, avatar) mang tên của nó (`data-tip`,
  không thì `aria-label` hay `title`); trỏ vào hay tới nó bằng bàn phím thì tên đó hiện trong một chú thích duy nhất trên `<body>`,
  dưới control và trong cửa sổ - chú thích vẽ bên trong control bị nó cắt. Chữ bị rút gọn hiện chữ đầy đủ cùng cách. [control-name]
- **Menu của thanh trên mở nguyên vẹn:** không phần nào của thanh cắt tràn khi menu của nó có thể mở (ngôn ngữ, chuyển app, chuông,
  tài khoản); thanh thu lại chỉ cắt khi đang thu.
- **Bản build mới được báo:** app đọc phiên bản của server qua phép đo health; phiên bản khác với bản tab đã tải thì hiện băng
  thông báo có nút tải lại (hỏi trước nếu có thay đổi chưa lưu), để không ai làm tiếp trên bản cũ.
- **Danh sách tài khoản hiện loại tài khoản** (người · agent) thành cột riêng với bộ lọc riêng, và trình sửa tài khoản đặt nó;
  phiên đăng nhập và nhật ký cũng lọc theo nó; số liệu về người chỉ đếm người. Hồ sơ là trang của một người: không hiện loại
  tài khoản.
- **Trang của người dùng, theo bộ mẫu:** Hồ sơ của tôi (trang user-profile của bộ mẫu: thẻ đầu có ảnh nền, avatar nhô lên ảnh
  nền và tách khỏi tên, tên và các thông tin nằm dưới ảnh nền, nút sửa trên một dòng; thẻ Giới thiệu và dòng thời gian hoạt động
  cao bằng nhau, app ghi bằng tên, không bằng mã) và Cài đặt hồ sơ (trang account-settings của bộ mẫu: tab Tài khoản và Bảo mật;
  người dùng sửa họ tên và email, tên đăng nhập là của quản trị viên; đổi mật khẩu). Ảnh đại diện và ảnh nền là file giữ ngoài
  code, DB của hệ chỉ giữ thông tin trỏ tới chúng.

## 5b. Menu, bảng, accordion (v29 - nâng lên từ một app của hệ)

- **Menu tự cuộn bên trong** khi các dòng cao hơn cửa sổ; brand và nút thu gọn đứng yên. [menu-scroll] **Dòng có dòng con
  thì gập/mở** bằng mũi tên (`menu-toggle` mang `aria-expanded`), nhánh chứa trang đang xem thì mở. [menu-fold] **Mọi tên nằm
  gọn trong menu** - tên dài cắt bằng "…" và hiện đủ khi trỏ vào; nút tròn thu gọn ở mép không mang tên. [menu-fits] **Các
  trang của một nhóm mang icon khác nhau**, mỗi icon chọn theo thứ trang đó hiện. [menu-icons-distinct]
- **Mọi bảng dữ liệu kéo giãn cột được và sắp xếp được:** bảng có dòng tiêu đề và dòng dữ liệu thì có tay kéo cột và sắp theo
  tiêu đề (`aria-sort`), dù tên gì; hộp trợ giúp phím tắt được miễn, bảng hay cột trang khai `data-sort="off"` cũng vậy.
  [table-resize-every] [table-sort]
- **Accordion trong thẻ trang thì phẳng** - không nền, không bo góc, không khe, giữa các mục có vạch kẻ - và **mũi tên của nó
  đọc được** (tương phản tối thiểu 3:1 với thẻ). [accordion-flat] [chevron-visible]
- **Không gì của thanh đầu trang lòi ra mép trái hay phải** (một nút của thanh trang ở 390 px). [head-whole]

- **Hộp thoại, menu và popover có nền đục** ở mọi giao diện, kính bật hay tắt - trang phía sau không bao giờ đọc xuyên qua
  (`app-base` F18 kèm phép kiểm máy). [surface-opaque]
- **Chỗ trống và chỗ chờ dùng một mẫu chung**: nằm giữa nơi chúng đứng - chỗ trống có icon tròn, tiêu đề và gợi ý
  (`Empty` của khung, `sasinShell.empty`); chỗ chờ là spinner lớn của bộ mẫu, chữ chỉ cho trình đọc màn hình (`Loading`,
  `sasinShell.loading`). Không bao giờ để một dòng chữ trơ như "không có dòng khớp" hay "đang tải". [state-template]

- **Trường nhiều giá trị là slicer có ô tìm** (`data-searchable`; v31): nhà hàng, món, nhân viên mà báo cáo lọc chéo
  nằm trên bộ lọc duy nhất của trang; ô chọn thường vẫn tối đa 10 giá trị. [filter-set]
- **Thanh đầu trang chỉ có crumb và các nút** - không có dòng ngày rời bên cạnh; kỳ mà trang đang giữ do bộ lọc của nó nói. [bar-no-extra-text]
- **Mọi dòng của bảng đã cuộn tới đều được vẽ** - chỉ các dòng nằm dưới đầu bảng ghim của chính nó, hoặc sau dòng chân ghim ở đáy (dòng TỔNG, v32; ghim trên ô, trên dòng hay trên `tfoot`, v40, Reconcile 07/11: dòng TỔNG ghim trên dòng bị tính là một dòng chưa vẽ), được miễn (một bảng
  giữa trang mất mấy dòng đầu). Phép đo động: `PROBES` của script kiểm, chạy có chờ trên mọi trang có bảng; đo bên trong khung cuộn riêng của bảng, không tính thanh cuộn, và
  trả lại mọi khung đã cuộn (v34, Reconcile 06/11: lưới trong khung con bị tính là chưa vẽ, một khung bị lệch đẩy avatar ra
  ngoài). [rows-painted] Các dòng trôi xuống dưới đầu bảng ghim bị cắt tại đó, trong mọi khung cuộn (v32). [head-clear] Các
  dòng trôi ra sau dòng chân ghim ở đáy bị cắt tại mép trên của nó, và thanh cuộn dọc của khung chạy giữa đầu bảng ghim và chân
  ghim (v33, phép đo động). [foot-clear]

## 6. Kiểm

- Bài kiểm trình duyệt của repo import `scripts/sneat_glass_check.mjs` và chạy mọi mục `RULES` trên mọi trang, mọi mục
  `DIALOG_RULES` trên mọi hộp thoại nó mở, ở một khổ máy tính và một khổ điện thoại, cả hai theme, sau khi các hiệu ứng mở đã
  dừng, với giả lập focus bật (tab chạy nền không khớp `:focus`). Luật thêm ở đây thì thêm mục của nó ở đó trong cùng thay đổi;
  mỗi mục mới được chứng minh đỏ bằng cách làm hỏng thứ nó canh - với code vẫn build được: bài kiểm build lại trước khi chạy, nên
  build hỏng không bao giờ để nó kiểm một bundle cũ.
- Thứ DOM không chứng minh được là phép đo của bài kiểm trình duyệt, mỗi phép được chứng minh đỏ cùng cách:
  - **thanh cuộn dưới tiêu đề:** chụp dải ở mép phải ô cuộn (`Page.captureScreenshot`) khi ô ở đầu, đọc màu con trượt ngay dưới
    tiêu đề, và không điểm ảnh nào của cột thanh cuộn cạnh tiêu đề được mang màu đó (đảo overflow của ô trước, để luật vừa đổi
    hiện ra);
  - **kéo cột:** con trỏ thật (`Input.dispatchMouseEvent`) kéo một tay kéo rộng thêm 80 px và hẹp đi 200 px trên vài bảng, và cột
    được kiểm THEO ĐỘ RỘNG VẼ RA (bề rộng `th`) so với độ rộng đã đặt; ô tiêu đề bị vẽ lại phải có lại tay kéo và kéo được;
  - **đường bay khi ghim:** ghi lại `Element.animate` - bộ lọc vừa ghim xuất phát bên dưới chỗ của nó trên thanh, bộ lọc vừa bỏ ghim
    xuất phát bên trên chỗ của nó trong popover;
  - **bản nháp:** hai lựa chọn trong popover giữ nguyên các dòng và số đếm cho tới khi bấm Áp dụng, lúc đó cả hai cùng chạy;
  - **cú bấm:** mỗi nút có chữ của hộp thoại, khi bấm bằng con trỏ thật và đang giữ, vẫn giữ cỡ của nó;
  - **lần mở sạch:** mỗi trang mở trong hồ sơ chưa áp gì không có số đếm bộ lọc và không có nút X (kỳ trang luôn có không phải bộ
    lọc); nơi nút X hiện sau khi đặt một bộ lọc, bấm nó thì số về 0, X mất và các dòng đang hiện thay đổi.

## 7. Ai dựng phần nào trong một hệ

Trong một hệ, khung là MỘT gói do system-manager giữ (`frontend/shell/`, `Frontend_173_Shell`) và phát theo số
(`Rule_Keys_90_AppFamilyContract` bước 6). Luật của skill này áp trên mọi trang của mọi app; ai dựng từng phần:

| Phần (mục) | Ai dựng |
|---|---|
| đầu trang hai hàng (§2b), menu, đường dẫn, menu tài khoản, dòng thương hiệu | khung (`Skill_App_Shell`) |
| thanh trang và cụm tìm của nó (§1), popover bộ lọc, ghim, bản nháp và xoá lọc (§5), ô lọc, nút góc nhìn | khung; trang đưa bộ lọc, công cụ và góc nhìn của nó |
| khung đứng yên, thẻ trang phủ kín khung, dòng tiêu đề ghim, kéo cột, thanh cuộn dưới tiêu đề (§2, §5) | khung; trang chỉ vẽ một bảng thường |
| hộp thoại S / M / L (§3), toast, chú thích duy nhất (§5), Cài đặt và cài đặt bố cục (§4) | khung; trang đưa nội dung cho hộp thoại |
| nội dung một trang: thẻ, dòng, ô, biểu đồ, tên, ngày, dòng ghim riêng của nó | app (`Skill_App_ShellUse`) |

Một app chuyển sang kiểu này, theo thứ tự:
1. Khai `{"style": "SneatGlass"}` ở `frontend/config/ui.json`; `zemory sync` mang về skill này, `app-sneat`, `app-glass`,
   `app-shell-use` và `scripts/sneat_glass_check.mjs`.
2. Ghim một bản khung đã phát và gắn nó với config của app (`Skill_App_ShellUse` §2–3); gỡ mọi phần khung riêng của app - app không
   bao giờ dựng một phần mà bảng trên giao cho khung.
3. Dựng mọi trang danh sách thành nội dung trang (`Skill_App_ShellUse` §4): bộ lọc khai báo, mỗi giá trị nhận khi nó có hiệu lực
   (khi Áp dụng trong popover, ngay lập tức trên thanh), cắt bởi
   server ở nơi dòng bị giới hạn; công cụ và góc nhìn đưa cho thanh trang.
4. Chạy phép kiểm: bài kiểm trình duyệt của app import `RULES` và `DIALOG_RULES`, chạy chúng trên mọi trang và hộp thoại CÓ gắn khung,
   ở một khổ máy tính và một khổ điện thoại, cả hai theme, và chạy các phép đo của §6; xanh trên mọi trang trước lần phát hành đầu
   của app trong kiểu này.
5. Báo system-manager khi app đã chạy trên đường dẫn của nó, để bảng app và cổng điều hướng của hệ dẫn tới nó.

Repo không thuộc hệ nào tự dựng khung theo §1–§5, lấy frontend của system-manager làm mẫu sống.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — the look of a kind is approved on its template before it is ported · kiểu được duyệt trên template trước khi chép sang app
- `Rule_Gate_97_BarOneSize` — every control of the page bar is the bar's one size · mọi control của thanh trang cùng một cỡ
- `Rule_Keys_90_AppFamilyContract` — in a family, the frame of this kind is built once by the system-manager · trong một hệ, khung của kiểu này do repo quản hệ dựng một lần
