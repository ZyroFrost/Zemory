---
version: 7
lang: vi
---

# app-shell-use — app mang khung của hệ, không bao giờ tự dựng khung

> Khung (thanh trên, menu, thanh trang, bộ lọc, cách bảng chạy, hộp thoại, toast, cài đặt, phiên) do repo quản hệ giữ
> (`Skill_App_Shell`, `Frontend_173_Shell`) và phát thành các bản có số. Một app của hệ ghim một bản, đưa config của nó cho khung và
> chỉ dựng phần bên trong trang (`Rule_Keys_90_AppFamilyContract` bước 6). Cả hai trông thế nào là skill của kiểu
> (`Skill_App_SneatGlass`).

## 1. Những gì app không bao giờ dựng

- Thanh trên, menu, thanh trang, popover bộ lọc, tay kéo cột, dòng tiêu đề ghim, khung hộp thoại, toast, hộp Cài đặt, trang đăng
  nhập, việc kiểm phiên trong trình duyệt — mỗi thứ đó là của khung. Bản riêng của app, cũ hay mới, bị gỡ khi app lên khung.
- Một thứ của khung trông hay chạy sai ⇒ nhắn phiên của repo quản hệ kèm trang, độ rộng, theme và điều mong đợi; không bao giờ vá
  trong app, kể cả "tạm thời". Bản sửa tới dưới dạng một bản build mới của khung (§2).
- App cần một thứ khung chưa có ⇒ xin repo quản hệ một khoá hay một thẻ (`Skill_App_Shell` §3); không bao giờ vẽ nó cạnh khung.

## 2. Ghim một bản

1. `frontend/config/shell.json` giữ số app đang mang: `{"version": "<M.m.p>"}`. App nạp bản build từ đường gateway của số đó
   (`/shared/shell/<number>/`), không bao giờ một "latest".
2. Lên số mới hơn là một thay đổi có chủ đích của app: đọc ghi chú hợp đồng của số đó, sửa những gì nó yêu cầu, chạy phép kiểm trình
   duyệt của app (§6), rồi phát bản app với số mới ghi trong sổ thay đổi.
3. Sổ của app ghi số khung nó đang mang.

## 3. Gắn khung và đưa config

- App dùng framework của khung import gốc khung và các phần từ MỘT cửa của khung; app không có framework hay bước build nạp module và
  stylesheet của bản build bằng thẻ thường và dùng các thẻ của khung. Cả hai nhận cùng các khoá.
- Config (`Skill_App_Shell` §3): `area` (khoá riêng của app cho tên nó) · `home` (đầu mọi đường app sở hữu, `/<app>/`) · `nav` ·
  `title` · `crumbs` (chỉ các lớp SAU hệ và app - hai lớp đó khung tự vẽ) · `page` · `redirect` · `load` (dữ liệu riêng của app mà
  khung cần - menu dựng từ danh sách của app, vai của người này trong app; 403 ở đó là "không có vai trong app này", do trang của app
  hiện, không bao giờ chuyển về đăng nhập) · `health` (đường health riêng của app, trả `{"version": "<M.m.p>"}` không cần phiên) ·
  lệnh và bản ghi của app cho ô tìm · thẻ và tab của app cho Cài đặt. Không có `login`: người chưa có phiên được chuyển tới trang đăng
  nhập chung và quay lại đúng trang.
- API của app gọi qua client khung tạo cho nó (`createClient` với đường gốc của app và thời gian câu trả lời chậm nhất cần): 401 về
  đăng nhập, 503 "không kiểm được phiên" hiện dải mất kết nối; app không tự xử 401.
- Nhãn: một khoá trong từ điển của app (thêm một lần lúc nạp) hoặc chữ đọc nguyên từ cơ sở dữ liệu. App không bao giờ chép khoá của
  khung vào từ điển của nó và không bao giờ đặt lại một khoá của khung: khoá của app thắng, nên một khoá `brandName` của app sẽ đổi tên
  cả hệ.

## 4. Vùng trang — trang dựng gì

- Khung đưa mỗi trang một chỗ trong thẻ trang, ở light DOM (class của kiểu và token của khung chạm tới được). Thẻ phủ kín khung, cuộn
  bên trong, ghim dòng tiêu đề và cho kéo cột - trang chỉ vẽ một bảng thường với class của kiểu là có đủ. Một dòng riêng của trang cần
  luôn trong tầm nhìn (dòng tổng) do trang tự ghim.
- **Trang bảng: thẻ lấp đầy, bảng cuộn bên trong** (v3 - đã chốt cho cả hệ, app-sneat-glass §2): không bao giờ
  đổi trang bảng sang cuộn cả cột để lấy chỗ; để `fill` bật và để người dùng thu hàng 1 (Cài đặt > Bố cục > "Thu gọn hàng 1 khi
  cuộn"). Board nhiều thẻ dùng `board` của khung (React `PageCard board`, DOM `DomPage.board`): thanh
  trang giữ nguyên, không thẻ trang bọc board, các thẻ đứng thẳng trên nền (v4). Nhiều trang dưới một hàng menu: bật dải tab của khung (`pageHead: true`),
  không bao giờ tự vẽ tab; dải tự neo dưới thanh trên và tự dính lên hàng 2 khi hàng 1 thu (v5) - trang không dời hay che nó.
- **Cả app co giãn theo cửa sổ** (v5, app-sneat-glass §2 [ui-scale]): khung zoom trang vẽ trên 1920 x 1080 cho vừa cửa
  sổ. Trang không bao giờ lấy cỡ từ `vh` / `vw` hay `innerHeight` / `innerWidth`: dùng `var(--app-h)` / `var(--app-w)`, và cỡ
  hay vị trí ghi từ số đo trên màn hình (rect, vị trí con trỏ, kéo) đi qua `toPage(px)` của khung (hoặc chia `uiZoom()`) - cả hai
  có trên `window.sasinShell`. Bộ co giãn cũ riêng của app (zoom hay transform trên trang) bị gỡ khi app lên khung.
- Bộ lọc: trang khai các bộ lọc nó có (chọn một · chọn nhiều · ngày · khoảng ngày · số · custom - ô trang tự vẽ, cho kiểu khung chưa
  có). Khoảng ngày của báo cáo đưa khung `latest` (ngày cuối có dữ liệu) và lưu token `relative` mà `onChange` trả (tháng này · tháng
  trước · năm nay) vào cài đặt của người dùng, không lưu hai ngày (v6, app-sneat-glass [date-relative]). Bộ lọc trong popover là bản nháp tới khi người dùng bấm Áp dụng; bộ lọc ghim trên thanh lọc ngay; trang nhận mỗi giá trị khi nó
  có hiệu lực, rồi gọi API của nó. Trang báo có bao nhiêu bộ lọc đang đặt và cách xoá hết; một giá trị trang luôn có (kỳ) không bao giờ
  được đếm. Ô lọc: khung đưa cho trang mỗi lần chữ đổi và không tự lọc trang; trang lọc thứ nó hiện - tại chỗ, hoặc gọi API của nó
  (chờ người dùng gõ xong là việc của trang).
- Công cụ của trang đứng bên trái thanh trang (thao tác chính, một công tắc như luồng trực tiếp); các góc nhìn của nó (hai cách trở lên
  để xem cùng các bản ghi) vào nút chuyển góc nhìn bên phải, mỗi góc nhìn thật sự đổi thứ được hiện.
- Hộp thoại và toast: trang xin khung một hộp thoại cỡ S, M hay L và đưa nội dung; kết quả thao tác là toast qua khung. Không bao giờ
  một khung `<dialog>` hay một dòng báo trong luồng trang của riêng app.
- Cài đặt giao diện của người dùng mà trang giữ (góc nhìn, độ rộng cột, ghim) lưu qua khung, vào cài đặt chung của hệ, không bao giờ
  trong chỗ lưu riêng của app.
- Thông báo người dùng cần thấy đi vào chuông duy nhất của hệ qua luồng thông báo của repo quản hệ (xin repo quản hệ thêm loại); app
  không vẽ chuông riêng.

## 5. Chữ và dữ liệu

- API của app chỉ trả dữ liệu của app; phiên, người dùng và cài đặt của họ đến từ API của repo quản hệ, do khung đọc. 401 từ API của
  app do khung xử lý (về đăng nhập); 503 "không kiểm được" giữ trang kèm dải mất kết nối (`Skill_App_Base` › "An app of a family").
- Từ điển của app chỉ giữ khoá của app, đủ cả hai thứ tiếng.

## 6. Phép kiểm

- Phép kiểm trình duyệt của app chạy luật và bộ đo của kiểu (`Skill_App_SneatGlass` §6) trên mọi trang của app CÓ gắn khung đã ghim,
  ở một độ rộng máy bàn và một độ rộng điện thoại, cả hai theme; xanh trước mỗi lần phát. Phép kiểm đo px thiết kế: đặt
  `localStorage sasinShell.scale = off` trước khi trang tải (v5).
- Build của app hỏng khi thiếu `frontend/config/shell.json` hoặc nó ghi một số gateway không phục vụ.
- Một phần của khung bị app tự dựng lại (§1) do chủ repo xét; luật của kiểu bắt phần lớn trên trang.

## Implements · Thi hành luật
- `Rule_Keys_90_AppFamilyContract` — an app wears the system's one frame at the number it pins · app mang khung duy nhất của hệ ở bản nó ghim
