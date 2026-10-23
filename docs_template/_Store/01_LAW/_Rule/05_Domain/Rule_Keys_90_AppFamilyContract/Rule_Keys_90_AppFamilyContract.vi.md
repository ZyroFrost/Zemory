---
version: 2
lang: vi
---
# Rule_Keys_90_AppFamilyContract — An app of a family uses the family's one database, its one admin screen and its log codes

## Luật là gì
Các app cùng một hệ (repo vai `app`, do một `system-manager` quản, dùng một repo `app-data`) dùng chung ba thứ và không tự làm bản
riêng: một DB giao dịch của cả hệ, một màn quản trị của system-manager để cấp vai, và bộ mã log vận hành do repo `app-data` giữ.

Vì sao thành luật riêng: `Rule_Gate_35_OneHome` đòi mỗi thứ một nhà nhưng không chỉ nhà nào giữa các repo của một hệ;
`Skill_Dev_AppDesign` và `Skill_Dev_DbDesign` dạy cách làm, không đặt nghĩa vụ này; `Struc_Repo_SystemManager` và
`Struc_Repo_AppData` khai vai nhưng không giao nghĩa vụ giữa các vai.

## Khi nào áp
- Dựng hay sửa một app của hệ: bảng nó cần, đăng nhập, vai, màn quản trị, ghi log.
- Có người đề xuất DB riêng cho một app, hoặc màn quản trị nằm trong một app.

## Phải làm gì
1. Dữ liệu nằm trong một DB của cả hệ, do repo `app-data` giữ. App không có DB riêng, kể cả app lớn: mọi DB của hệ ở cùng một máy
   chủ nên tách chỉ thêm việc, không thêm sức chịu lỗi (chịu lỗi là máy chủ thứ hai). Cần bảng hay cột mới ⇒ hỏi repo `app-data`;
   app không bao giờ đổi cấu trúc (`Cons_Gate_11_WriteBoundary`).
2. Danh tính dùng chung: mỗi người một tài khoản cho mọi app. Vai theo từng app (mỗi người một vai trong mỗi app). Vai của mọi app
   cấp từ một màn quản trị của `system-manager`, mỗi app một cột vai; app không dựng màn quản trị riêng.
3. Mọi app ghi mỗi sự kiện thuộc sáu nhóm thành một dòng log vận hành của hệ: đăng nhập · kết thúc phiên · bị từ chối truy cập ·
   đổi tài khoản và vai · truy vấn dữ liệu tự do · đổi cài đặt ảnh hưởng người khác. Mã và mức lấy từ bảng hợp đồng của repo
   `app-data`; mã chưa có ⇒ xin repo đó thêm trước. Không ghi mật khẩu, token, chuỗi kết nối; người chưa biết là NULL, không phải
   chuỗi rỗng.

## Ví dụ
- Tình huống: một app báo cáo mới cần vai cho người xem và muốn ghi ai mở bảng nào.
- ✗ Sai: cho app một DB riêng có bảng `users`, một trang quản trị để cấp vai, và mã log tự đặt tại chỗ.
- ✓ Đúng: thêm một dòng app trong DB của hệ, cấp vai trên màn quản trị của `system-manager`, ghi log đăng nhập, bị từ chối, đổi vai
  bằng mã của repo `app-data`; lượt mở bảng thì không ghi.

## Máy kiểm
- Nhắc theo từ khoá: lời yêu cầu về DB riêng của app, màn quản trị, vai hay log vận hành thì hiện luật này; phần còn lại là phán đoán.
