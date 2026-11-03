---
version: 1
lang: vi
---

# app-sneat — kiểu Sneat của bề mặt app

> Skill KIỂU, đứng cạnh `app-glass`: `app-base` giữ những gì mọi app phải theo; skill này giữ thứ làm nên bề mặt Sneat. Bố cục là
> của Sneat; dáng (token `--g-`, bảng kính và mọi hiệu ứng `FX:`) là của kiểu Glass, lấy từ template Glass đã duyệt, không chép vào
> đây. Mỗi luật dưới đây đến từ một lần người yêu cầu sửa và mang phép kiểm của nó.

## 0. Chọn kiểu

- Repo khai `{"style": "Sneat"}` ở `frontend/config/ui.json`. Dáng Glass là một phần của kiểu: bề mặt Sneat thiếu token kính và
  hiệu ứng là chưa xong.
- Luật của skill này trái với `app-glass` thì luật này thắng trên bề mặt Sneat (ô lọc của trang ở §3); các luật Glass không nhắc
  lại ở đây vẫn giữ cho phần dáng.

## 1. Nguồn của kiểu

- **Template nằm ở đâu.** Template người yêu cầu đưa được giữ nguyên, chỉ đọc, trong repo thiết kế, mỗi bộ một folder
  (`Web_Template/Sneat/Sneat_Form_Original/`, `Web_Template/Glass/…`): folder thiết kế chỉ chứa folder bộ. Bản làm việc thử trong
  `docs_visual/<bộ>/` của repo, cạnh một bản chép y nguyên các trang của bộ để so; bản đã duyệt quay về repo thiết kế. Phép kiểm:
  `Web_Template` chỉ có folder bộ; mọi file trong folder `*_Form_Original` là chỉ đọc.
- **Dựng trên chính markup của bộ.** Mỗi trang là markup của bộ cho loại trang đó (`tables-basic`, thẻ dashboard, `ui-modals`,
  `pages-account-settings-*`) với chữ và dữ liệu của sản phẩm; không chế cấu trúc. Trước khi đưa xem, chụp trang của bộ và trang sản
  phẩm cùng một khổ. Phép kiểm: số đo khung khớp (cỡ menu và thanh trên, cỡ chữ thân, chiều cao dòng).
- **Template trả phí chỉ để tham khảo.** Template có giấy phép ("all rights reserved", "buy this template") chỉ giữ ảnh chụp và ghi
  chú hiệu ứng; cái được chọn viết lại bằng mã của mình. Phép kiểm: folder của nó không có `.js`/`.css` của họ.
- **Trang trưng bày.** Bản làm việc có một trang chạy mọi hiệu ứng của kiểu, mỗi cái dưới dấu `FX:` của nó, cái chưa làm được đánh
  dấu; tông màu chọn ở Cài đặt › Giao diện, không chọn trên trang đó. Phép kiểm: mọi dấu `FX:` của template Glass có trên trang.

## 2. Khung của cả hệ — một khung, mỗi app một menu

Cách các bộ phần mềm làm (Odoo, SAP Fiori launchpad, Microsoft 365): một khung chung cho mọi app, menu riêng của app đang mở, một
nút chuyển app. Không bao giờ dồn trang của mọi app vào một menu: menu dài mãi, quyền rối, và system-manager phải biết hết trang của
từng app.

- **Thanh trên, cùng một markup ở mọi app:** trái - lời chào trên ngày hôm nay; giữa - ô tìm duy nhất (§3); phải, đúng thứ tự - ngôn
  ngữ · sáng/tối · lưới chuyển app (mọi app người đó được mở, system-manager đứng đầu, "tất cả ứng dụng" cuối) · chuông · tài khoản
  (Hồ sơ của tôi · Cài đặt · Đổi mật khẩu · Đăng xuất). Danh sách lấy từ bảng app của system-manager qua API, một nguồn cho nút chuyển
  app và trang chủ. Thanh đứng yên khi trang cuộn (sticky). Phép kiểm: markup thanh giống hệt ở mọi app; mép trên không dời khi cuộn.
- **Menu trái = chỉ các trang của app đang mở**, menu phẳng của Sneat (mục đơn, rồi mỗi nhóm một tiêu đề); phần thương hiệu hiện logo
  vuông và tên của app đang mở. Logo giữ cỡ và chỗ khi menu thu gọn; chỉ tên ẩn đi. Phép kiểm: không có mục của app khác; vị trí logo
  bằng nhau ở hai trạng thái.
- **Nút thu gọn** là nút tròn màu nhấn của Sneat Pro ở mép phải menu, bên trong có mũi tên, viền màu nền trang; trên máy tính nó gập
  menu còn icon, rê chuột lên thanh đã gập thì menu mở đè lên trang, lựa chọn được nhớ. Phép kiểm: nút có mũi tên nhìn thấy; bề rộng
  khi gập ≈ 84 px, khi rê = bề rộng lúc mở.
- **Trang chủ = launcher:** lưới các app của người đó kèm sức khoẻ, và những việc cần họ chú ý. Trang ứng dụng cũ trở thành trang
  này; nút "Mở" dẫn vào app. Phép kiểm: mục đầu tiên của menu system-manager là trang chủ.
- **Bộ không có trang đăng nhập:** mọi app đăng nhập qua trang của system-manager. Phép kiểm: bộ không có file login.
- **Không có nút nào chưa có chức năng; mỗi điều khiển một chỗ** (Cài đặt nằm trong menu tài khoản, không lặp ở thanh hay menu trái).
  Phép kiểm: mọi nút và liên kết của thanh trên và menu có xử lý hoặc đích.

## 3. Tìm kiếm

- **Ô tìm ở thanh trên** là hộp thoại bố cục như Sneat Pro: ô nhập phẳng, `[esc]` và nút đóng nằm trong hàng tìm; khi trống, hiện tối
  đa bốn nhóm gợi ý, mỗi nhóm tối đa bốn mục, chia hai cột (trang · quản trị · lệnh · app); gõ vào thì thành kết quả nhóm theo loại,
  mũi tên và Enter để chọn và chạy. Không bao giờ là một danh sách phẳng dài. Phép kiểm: ô trống = ≤ 4 nhóm × ≤ 4 mục.
- **Danh sách dài có ô lọc nhỏ của riêng nó** cạnh nút bộ lọc ở đầu thẻ (người dùng, nhật ký, phiên, lần chạy): ô tìm ở thanh trên để
  nhảy, ô này lọc dòng ngay khi gõ. Trang ngắn không có. Phép kiểm: gõ vào ô thì các dòng không khớp ẩn đi.

## 4. Nội dung

- **Một thẻ hay một ô chỉ chứa một thông tin mỗi dòng.** Không nhồi một danh sách vào một dòng thẻ hay một ô bảng: hiện số đếm
  ("2 Dashboard") thành liên kết mở bảng các thứ đó. Phép kiểm: không dòng thẻ hay ô nào chứa quá một nhãn hay một tên.
- **Bảng theo `tables-basic`:** một người là avatar + tên trên tên tài khoản; thao tác là menu ba chấm; ô chữ dài giữ một dòng, cắt
  bằng dấu "…", toàn bộ chữ nằm trong tooltip; dòng không bao giờ xuống hàng. Phép kiểm: mọi dòng cao bằng nhau; ô bị cắt có
  `title` chứa toàn bộ chữ.
- **Tiếng Việt giữ cách viết hoa của nó:** không `text-transform: capitalize` trên nhãn hay tab (Sneat viết hoa tab pill cho tiếng
  Anh). Phép kiểm: không phần tử chữ nào tính ra `capitalize`.

## 5. Điều khiển

- **Ô chọn mở menu kính,** không bao giờ mở danh sách của trình duyệt: menu bật ra, đặc, đánh dấu mục đang chọn, giữ được bàn phím
  (mũi tên, Enter, Escape). Chọn xong thì phát `change`. Phép kiểm: bấm vào ô chọn mở menu kính, không mở bộ chọn gốc.
- **Phần tử hiệu ứng không mang trang trí của trình duyệt:** pill trượt làm từ mục danh sách có `list-style: none`; nút đóng của toast
  nằm trong hàng đầu của nó; nút đóng của ô tìm nằm trong hàng tìm. Phép kiểm: pill tính ra `list-style-type: none`; các nút đóng nằm
  trong hộp của chúng.

## 6. Kiểm

- Bài kiểm trình duyệt của repo mở mọi trang của bản làm việc ở 1440 và 390, cả hai theme: không lỗi JS, không cuộn ngang, cùng các
  phép kiểm nêu trên. Thêm một luật vào skill này thì thêm phép kiểm của nó vào bài kiểm đó trong cùng một lần sửa.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — the look of a kind is approved on its template before it is ported · kiểu được duyệt trên template trước khi chép sang app
