---
version: 5
lang: vi
---
# Rule_Keys_90_AppFamilyContract — An app of a family uses the family's one database, its one sign-in, its one admin screen and its log codes

## Luật là gì
Các app cùng một hệ (repo vai `app`, do một `system-manager` quản, dùng một repo `app-data`) dùng chung bốn thứ và không tự làm bản
riêng: một DB giao dịch của cả hệ, một đăng nhập của `system-manager`, một màn quản trị của `system-manager` để cấp vai, và bộ mã log
vận hành do repo `app-data` giữ. `system-manager` chỉ giữ phần dùng chung — cổng, đăng nhập, màn quản trị và đường dẫn tới các app;
mỗi app tự phục vụ trang và API của chính nó.

Vì sao thành luật riêng: `Rule_Gate_35_OneHome` đòi mỗi thứ một nhà nhưng không chỉ nhà nào giữa các repo của một hệ;
`Skill_Dev_AppDesign` và `Skill_Dev_DbDesign` dạy cách làm, không đặt nghĩa vụ này; `Struc_Repo_SystemManager` và
`Struc_Repo_AppData` khai vai nhưng không giao nghĩa vụ giữa các vai.

## Khi nào áp
- Dựng hay sửa một app của hệ: bảng nó cần, đăng nhập, vai, màn quản trị, ghi log, trang hay API của nó.
- Có người đề xuất DB riêng cho một app, trang đăng nhập hay màn quản trị nằm trong một app, hoặc đặt trang hay API của một app vào
  trong `system-manager`.

## Phải làm gì
1. Dữ liệu nằm trong một DB của cả hệ, do repo `app-data` giữ. App không có DB riêng, kể cả app lớn: mọi DB của hệ ở cùng một máy
   chủ nên tách chỉ thêm việc, không thêm sức chịu lỗi (chịu lỗi là máy chủ thứ hai). Cần bảng hay cột mới ⇒ hỏi repo `app-data`;
   app không bao giờ đổi cấu trúc (`Cons_Gate_11_WriteBoundary`).
2. Danh tính dùng chung: mỗi người một tài khoản cho mọi app. Vai theo từng app (mỗi người một vai trong mỗi app). Vai của mọi app
   cấp từ một màn quản trị của `system-manager`, mỗi app một cột vai; app không dựng màn quản trị riêng.
   BỘ VAI của mỗi app (tên vai, thứ tự trên màn, nhãn) là một bảng trong DB của hệ, do repo `app-data` giữ; DB từ chối vai không
   thuộc bộ của app. Màn quản trị và mọi app đọc bộ vai từ bảng đó; không bên nào giữ bản chép trong code. App mới hay bộ vai đổi ⇒
   một model của repo `app-data`, không bao giờ là code.
3. Mọi app ghi mỗi sự kiện thuộc sáu nhóm thành một dòng log vận hành của hệ: đăng nhập · kết thúc phiên · bị từ chối truy cập ·
   đổi tài khoản và vai · truy vấn dữ liệu tự do · đổi cài đặt ảnh hưởng người khác. Mã và mức lấy từ bảng hợp đồng của repo
   `app-data`; mã chưa có ⇒ xin repo đó thêm trước. Không ghi mật khẩu, token, chuỗi kết nối; người chưa biết là NULL, không phải
   chuỗi rỗng.
4. Đăng nhập dùng chung: `system-manager` có trang đăng nhập duy nhất của hệ và cấp phiên duy nhất. App đọc phiên đó từ DB của hệ ở
   backend của chính nó, kiểm vai của chính nó ở đó, và chuyển người chưa có phiên sống về trang đăng nhập của `system-manager` kèm
   địa chỉ để quay lại. App không có trang đăng nhập, không cookie phiên riêng, không màn đổi mật khẩu; đăng xuất và đổi mật khẩu đi
   qua `system-manager`.
5. `system-manager` chỉ giữ phần dùng chung: cổng (một địa chỉ, mỗi app một đường dẫn), đăng nhập, màn quản trị và đường dẫn tới các
   app. Mỗi app tự phục vụ frontend và backend của nó dưới đường dẫn của nó; `system-manager` không bao giờ chứa trang hay API nghiệp
   vụ của app, và các app không gọi nhau qua nó. Thứ hai app dùng chung là DB của hệ.

## Ví dụ
- Tình huống: một app báo cáo mới cần vai cho người xem và muốn ghi ai mở bảng nào.
- ✗ Sai: cho app một DB riêng có bảng `users`, một trang quản trị để cấp vai, và mã log tự đặt tại chỗ.
- ✓ Đúng: thêm một dòng app trong DB của hệ, cấp vai trên màn quản trị của `system-manager`, ghi log đăng nhập, bị từ chối, đổi vai
  bằng mã của repo `app-data`; lượt mở bảng thì không ghi.
- Tình huống: một app đồng bộ file chuyển ra sau cổng của hệ mà vẫn còn trang đăng nhập riêng.
- ✗ Sai: giữ trang đăng nhập và cookie riêng, hoặc nhờ `system-manager` phục vụ hộ trang và API của app.
- ✓ Đúng: app bỏ trang đăng nhập, đọc phiên của `system-manager` và kiểm vai của mình ở backend, chuyển người chưa có phiên về trang
  đăng nhập chung kèm địa chỉ quay lại, và vẫn tự phục vụ trang của nó dưới đường dẫn của nó.
- Tình huống: một app chỉ dành cho nhóm IT bỏ vai chỉ-xem, giữ hai vai.
- ✗ Sai: sửa danh sách vai ghi trong code của app và bản chép ghi trong code của `system-manager`; hai bản trôi lệch, màn quản trị
  vẫn cho chọn vai mà app nay từ chối.
- ✓ Đúng: repo `app-data` sửa các dòng của app trong bảng vai của hệ bằng một model; màn quản trị và app cùng đọc bộ vai mới, không
  đổi code.

## Máy kiểm
- Nhắc theo từ khoá: lời yêu cầu về DB riêng của app, đăng nhập riêng hay chung, màn quản trị, vai hay log vận hành thì hiện luật
  này; phần còn lại là phán đoán.
