---
id: Rule_90
name: app-family-contract
version: 1
kind: judgment
code: 05_Domain
checked: [Rule_Gate_35_OneHome, Rule_Core_80_SharedChangeImpact, Skill_Dev_AppDesign, Skill_Dev_DbDesign, Skill_Task_VmAutomation, Struc_Repo_SystemManager, Struc_Repo_AppData]
---
# Rule_Keys_90_AppFamilyContract — An app of a family uses the family's one database, its one admin screen and its log codes

## What
Apps that belong to one family (repos with role `app`, managed by a `system-manager`, using an `app-data` repo) share three
things and never build their own copy: the family's one transactional database, the system manager's one admin screen for roles,
and the operation-log codes kept by the `app-data` repo.

Why a law of its own: `Rule_Gate_35_OneHome` asks for one home per thing but names no home across the repos of a family;
`Skill_Dev_AppDesign` and `Skill_Dev_DbDesign` teach how, not this duty; the structures `Struc_Repo_SystemManager` and
`Struc_Repo_AppData` declare the roles but give them no duty toward each other.

## When
- Building or changing an app of a family: a table it needs, sign-in, roles, an admin screen, logging.
- Someone proposes a database of its own for one app, or an admin screen inside one app.

## Do
1. Data lives in the family's one database, kept by the `app-data` repo. An app gets no database of its own, a large app included:
   all databases of the family sit on one server, so a split adds work and no resilience (resilience is a second server). A new
   table or column ⇒ ask the `app-data` repo; the app never changes structure (`Cons_Gate_11_WriteBoundary`).
2. Identity is shared: one account per person for every app. Roles are per app (one role per person per app). Roles of every app
   are granted from the `system-manager`'s one admin screen, one role column per app; an app builds no admin screen of its own.
3. Every app writes each event of six groups as one row of the family's operation log: sign-in · end of session · access denied ·
   account and role changes · free-form data queries · settings that affect other users. Codes and levels come from the
   `app-data` repo's contract table; a code not in it ⇒ ask that repo to add it first. Never log passwords, tokens or connection
   strings; a person not yet signed in is NULL, not an empty string.

## Example
- Situation: a new reporting app needs its viewers' roles and wants to record who opened which board.
- ✗ Wrong: give the app its own database with a `users` table, an admin page to grant roles, and log codes made up on the spot.
- ✓ Right: add one app row in the family's database, have the roles granted on the `system-manager`'s admin screen, and log
  sign-in, denials and role changes with the `app-data` repo's codes; viewing a board is not logged.

## Check
- Keyword reminder: a request about an app's own database, an admin screen, roles or the operation log shows this law; the rest
  is judgment.

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

## Links · Liên kết
- Implements · Thi hành: `Skill_Dev_AppDesign` — how an app of a family is built · cách dựng một app của hệ
- Repo declares · Repo khai: `Cons_Gate_11_WriteBoundary` — the app writes data only, never structure · app chỉ ghi dữ liệu, không ghi cấu trúc
- Related · Liên quan: `Rule_Gate_35_OneHome` — one thing, one home · một thứ một nhà
