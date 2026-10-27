---
version: 3
lang: vi
---
# Struc_Repo_SystemManager

Chuẩn cấu trúc của repo quản một hệ app: mọi slot của `Struc_Repo_App` (khai `extends`). Slot riêng của vai đo khi ráp repo
đầu tiên theo template này.

## Vai

- Quản: repo theo `Struc_Repo_App` và `Struc_Repo_AppData`.
- Không thuộc quyền repo nào (đỉnh của hệ app).
- Bản thân nó là một app: chỉ phục vụ phần hệ dùng chung (`Rule_Keys_90_AppFamilyContract` bước 4–5) — không bao giờ phục vụ trang hay
  API nghiệp vụ của một app.
- Cấp cho cả hệ:
  - `gateway` — địa chỉ duy nhất của hệ: reverse proxy chuyển mỗi đường dẫn tới cổng riêng của app đó, và bảng app làm nguồn cho nó
    (id · đường dẫn · cổng · mã app · đường health). Bảng là một file config của repo này; cấu hình proxy sinh từ bảng, không sửa tay
    trên máy.
  - `sign-in` — trang đăng nhập duy nhất và phiên duy nhất của hệ, màn quản trị tài khoản, vai theo từng app, phiên và log vận hành
    của mọi app.
- **Giá trị thật của hệ viết một lần ở đây** (`_Store/README.md` §8.3): tên cookie phiên, mã các app, đường đăng nhập, số giờ hết hạn
  phiên, dải cổng — trong hiến pháp của repo này (điều riêng từ 101) và bảng app. `Cons_Gate_14_Access` của mỗi app trỏ về đây và chỉ
  thêm phần riêng của nó.
- **Đổi chuẩn chung là việc của repo này.** Quy tắc áp cho mọi app của hệ (luật · skill · slot) ⇒ repo này sửa trong HS rồi chạy
  `zemory sync`; `conform` của từng app bắt chỗ còn lệch. Không nhắn từng app sửa tay, không để app đổi trước chuẩn.
- **Một lần `zemory sync` ở repo này phủ mọi repo nó quản** — cùng cơ chế với `Struc_Repo_WorkspaceManager`: repo này trước, rồi từng
  repo có vai nằm trong `role.manages` và marker khai `owner` là tên repo này. Mỗi repo ráp theo `kit` của chính nó. Repo đang có phiên
  agent làm dở ⇒ chờ phiên đó commit rồi mới sync.

## App dùng dịch vụ thế nào

- App khai `owner` = tên repo này trong marker, và `uses` `gateway` và `sign-in` = repo này.
- Cần một đường dẫn hay cổng sau gateway, một bộ vai khác mặc định, một app mới ⇒ nhắn phiên của repo này; app không sửa bảng app hay
  cấu hình proxy (`Rule_Gate_44_RepoScope`).
- Cách app đọc phiên chung và trả lời người chưa có phiên: `Skill_Dev_AppDesign` › "An app of a family".
