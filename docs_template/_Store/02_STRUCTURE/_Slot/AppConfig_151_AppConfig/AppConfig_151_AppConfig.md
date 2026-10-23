---
id: Slot_151
name: appconfig
version: 2
path: AppConfig/<công cụ>/
scope: layout
---
# AppConfig_151_AppConfig appconfig — cấu hình và khoá của từng công cụ

## Vai trò

`<ổ dữ liệu>\AppConfig\` giữ cấu hình NGƯỜI DÙNG và khoá bí mật của từng công cụ — những tệp mà công cụ cho chọn chỗ đặt. Mỗi
công cụ một thư mục `AppConfig\<công cụ>\`. Gom về một chỗ để khi dựng máy mới chỉ cần mang đúng thư mục này sang.

Ví dụ những gì nằm ở đây:
- `AppConfig\git\` — `.gitconfig` toàn cục (tên, email, alias).
- `AppConfig\ssh\` — khoá SSH và tệp `config`.
- `AppConfig\vpn\` — hồ sơ kết nối VPN.
- `AppConfig\zemory\` — cấu hình máy của zemory, ví dụ `location.json` trỏ tới thư mục GM.

## Cách chia bên trong

Công cụ chỉ có một hai tệp thì để thẳng trong `AppConfig\<công cụ>\`. Công cụ có nhiều loại tệp thì chia ba thư mục con:
- `configs\` — cấu hình (đọc được, không bí mật).
- `credentials\` — khoá, token, mật khẩu.
- `cache\` — thứ công cụ tự dựng lại được, xoá đi không mất gì.

Ví dụ: `D:\AppConfig\agentswitch\configs\profiles.json` · `D:\AppConfig\agentswitch\credentials\tokens.json`.

## Luật về bí mật — không có ngoại lệ

- Nội dung `AppConfig\` KHÔNG BAO GIỜ vào git (kể cả repo riêng tư), KHÔNG nằm trong thư mục đồng bộ (Syncthing) hay thư mục
  sao lưu đám mây (Drive).
- Mang sang máy khác bằng tay, qua đường an toàn (USB của mình, trình quản lý mật khẩu), rồi đặt lại đúng chỗ.

## Không chứa

Bản cài phần mềm (để ở `Software\`) · dữ liệu làm việc và repo (`Workspace\`) · tài liệu cá nhân (`Documents\`).

## Khuôn tên

Tên công cụ viết thường, đúng như tên lệnh của nó: `git` · `ssh` · `vpn` · `zemory`.

## Phép kiểm

`zemory conform --layout <gốc ổ>` kiểm `AppConfig` là một thư mục hợp lệ ở gốc ổ và báo repo nằm trong nó
(`repo-outside-workspace`). Chưa có phép kiểm máy cho việc bí mật lọt vào git hay thư mục đồng bộ — người đặt tệp tự giữ.
