---
version: 2
lang: vi
---

# app-shell — khung duy nhất của hệ, do repo quản hệ giữ và phát

> Repo quản hệ (`Struc_Repo_SystemManager`) giữ khung ở `frontend/shell/` (`Frontend_173_Shell`); mọi app khác của hệ mang một bản
> phát của nó và không tự dựng khung (`Rule_Keys_90_AppFamilyContract` bước 6, phía app: `Skill_App_ShellUse`). Khung trông thế nào
> là skill của kiểu (`Skill_App_SneatGlass`); skill này nói cách giữ, chia và phát khung.

## 1. Cái gì của khung, cái gì của app

| Của khung (một bản, ở đây) | Của app (ở mỗi app) |
|---|---|
| thanh trên hai hàng: đường dẫn, ô tìm, ngày, ngôn ngữ, theme, kính, ứng dụng, chuông, tài khoản | các mục menu, đường dẫn, tên trang của nó |
| menu, việc thu gọn, dòng dưới brand ghi app đang mở | các trang và mọi thứ trong thẻ trang |
| thanh trang: công cụ của trang bên trái, cụm tìm bên phải (nút lọc và popover, ghim, bản nháp và Áp dụng, xoá lọc, ô lọc, nút góc nhìn) | các bộ lọc nó có, giá trị của chúng, góc nhìn và thao tác riêng |
| thẻ trang phủ kín khung, dòng tiêu đề ghim, kéo cột, thanh cuộn dưới tiêu đề | dòng ghim riêng của nó (dòng tổng), nội dung các ô |
| hộp thoại S / M / L, toast, chú thích, tấm tìm kiếm, Cài đặt (giao diện, bố cục) | nội dung hộp thoại, phần nó thêm vào ô tìm và Cài đặt |
| phiên, cài đặt giao diện của mỗi người, dải mất kết nối và dải bản mới, đăng nhập cho mọi app | API riêng, dữ liệu riêng, chữ riêng của nó |

- Một phần hai app cùng cần thì vào khung; một phần chỉ một app cần thì ở app đó. Dời một phần sang chiều nào cũng là đổi hợp đồng
  của khung (§3).

## 2. Một cửa, cả hai chiều

1. Khung là một gói với MỘT cửa (`frontend/shell/index.ts`): mọi thứ app được dùng xuất ở đó, style nạp ở đó theo thứ tự của kit.
   App chỉ import cửa đó (một alias như `@<system>/shell`), không bao giờ một file bên trong khung.
2. Khung không import gì của app mang nó: chỉ gói npm, chính nó và tài nguyên dùng chung của repo. Trang riêng của repo quản hệ cũng
   là một app như các app khác - đi vào khung bằng cùng một cửa.
3. Một phép kiểm trong build của repo báo đỏ khi vượt ranh giới ở chiều nào, có phần tự thử cắm sẵn mỗi chiều một ca; nó chạy trước
   bước kiểm kiểu, nên một chỗ vượt không bao giờ tới được bản build.

## 3. Hợp đồng app đưa cho khung

- App gắn gốc của khung với một đối tượng config; khung không đọc app bằng cách nào khác. Các khoá:
  `area` (tên app dưới brand, khoá riêng của app) · `home` (đầu mọi đường app sở hữu; một liên kết ra ngoài nó thì tải trang đó)
  · `nav` (nhóm và trang người này mở được, mỗi trang kèm class icon của kit) · `title` · `crumbs` ·
  `page` (trang ở một đường) · `redirect` (trang người này không được mở) · `load` (dữ liệu riêng của app mà khung cần: đọc khi đã
  đăng nhập, đọc lại theo nhịp và khi tab được focus) · `health` (đường health riêng của app cho các dải báo) · `login` (chỉ repo quản
  hệ: trang đăng nhập của nó; mọi app khác bỏ trống và được chuyển tới trang đăng nhập chung kèm địa chỉ quay về) · phần app thêm vào
  ô tìm (lệnh, bản ghi, hộp thoại một bản ghi mở ra) và vào Cài đặt (thẻ dưới Bố cục, tab riêng kèm nút ở chân).
- Đường dẫn: khung tự vẽ lớp hệ và lớp app (về `/` và về `home`), giống nhau ở mọi app; `crumbs` của config chỉ đưa các lớp sau đó.
  API của app: khung cấp một client cho mỗi đường gốc (`createClient({base, timeoutMs})`), trả lời 401, 503 "không kiểm được phiên"
  và lỗi theo cùng cách với client của chính khung.
- Chữ: khung mang từ điển riêng; app thêm từ điển của nó một lần lúc nạp, khoá của app thắng khoá của khung, và khoá không có trong
  từ điển nào thì hiện nguyên chuỗi (nhãn đọc từ cơ sở dữ liệu). Hàm dịch của khung kiểm theo kiểu khoá app đưa vào.
- Mock cho phép kiểm trình duyệt do app đăng ký dưới cờ build mock của nó; bản build production của mọi app không mang mock.
- Thẻ cho app không dùng framework của khung (custom element bọc cùng code) nhận đúng các khoá đó dưới dạng thuộc tính, property
  và sự kiện; một mã nguồn, hai cửa.

## 4. Đánh số và phát

1. Khung có số riêng (`M.m.p`), tách khỏi số app của repo quản hệ: thêm khoá, thẻ hay sự kiện = số giữa; sửa lỗi = số cuối; bỏ hay
   đổi tên thứ app đang dùng = số đầu.
2. Một bản build được phục vụ qua gateway ở đường mang số của nó (`/shared/shell/<number>/`) và giữ mãi: deploy không bao giờ xoá một
   số đã phát, nên app ghim số đó không bao giờ vỡ. Không có đường "latest". Trên server, các số nằm ngoài cây code mà deploy thay
   nguyên; một số trong bản mang lên được thêm một lần, không bao giờ bị thay.
   Một số gồm: bản thẻ có framework bên trong (cho app không dùng framework đó) cùng stylesheet · bản component để framework bên ngoài,
   đóng thành gói app cài bằng URL của nó · ghi chú hợp đồng của số đó.
3. Trước khi phát: phép kiểm trình duyệt của repo quản hệ xanh trên mọi trang với đúng bản sắp phát; một trang trống chỉ nạp bản
   build hiện đủ khung (phép kiểm của kiểu chạy trên nó); ghi chú hợp đồng của số đó liệt kê cái gì đổi với app.
4. Sau khi phát: nhắn phiên của mọi app trong hệ (`role.manages`) số mới và việc app phải làm để lên số đó; ghi vào sổ của repo quản
   hệ app nào đang ghim số nào.

## 5. Lỗi một app báo

- App không bao giờ vá khung trong repo của nó. Lỗi được dựng lại trên trang của repo quản hệ trước, sửa ở đây, kiểm bằng phép kiểm
  của kiểu (luật mới đã đo đỏ), phát dưới số mới, rồi app lên số đó.
- Lỗi chỉ hiện với nội dung của một app nghĩa là hợp đồng của khung thiếu (§3): thêm khoá hay chỗ cắm vào khung, không bao giờ một
  nhánh theo tên một app.

## 6. Phép kiểm

- Phép kiểm ranh giới của repo (§2) chạy trong build và build mock.
- Phép kiểm trình duyệt của kiểu (`Skill_App_SneatGlass` §6) chạy trên trang của repo quản hệ và trên trang trống ở §4 bước 3.
- `zemory conform` chỉ nhận `frontend/shell/` ở repo ráp từ `Struc_Repo_SystemManager` (`Frontend_173_Shell`).
- Giữ các số đã phát, sổ số app đang ghim và việc nhắn các app do chủ repo xét.

## Implements · Thi hành luật
- `Rule_Keys_90_AppFamilyContract` — the system's one frame, kept by the system manager · khung duy nhất của hệ, do repo quản hệ giữ
