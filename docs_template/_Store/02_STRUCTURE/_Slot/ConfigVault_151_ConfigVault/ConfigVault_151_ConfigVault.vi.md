---
version: 4
lang: vi
---
# ConfigVault_151_ConfigVault configvault — két chứa thiết lập và khoá công cụ của cả máy

## Vai trò

`<gốc dữ liệu>\_ConfigVault\` là nơi chứa dùng chung của cả máy (dấu `_` của `Struc_Disk_Data`): giữ thiết lập CHỦ MÁY và khoá bí
mật của mọi công cụ, và mọi phần mềm, mọi repo cần khoá hay thiết lập đều trỏ vào đây. Mỗi công cụ một thư mục
`_ConfigVault\<công cụ>\`. Gom về một chỗ để dựng máy mới chỉ cần mang đúng thư mục này, và để một luật loại trừ giữ mọi bí mật
ngoài git, ngoài đồng bộ và ngoài sao lưu đám mây.

Ví dụ những gì nằm ở đây:
- `_ConfigVault\git\` — `.gitconfig` toàn cục (tên, email, alias).
- `_ConfigVault\ssh\` — khoá SSH và tệp `config`.
- `_ConfigVault\vpn\` — hồ sơ kết nối VPN.
- `_ConfigVault\rclone\` — `rclone.conf` chứa các remote của ổ đám mây.
- `_ConfigVault\npm\` — `.npmrc` chứa token của registry.

`location.json` của zemory được đọc ở `%USERPROFILE%\.zemory\location.json`, trước khi zemory biết mọi thứ khác nằm đâu: đường đó
phải luôn dùng được. Thư mục của nó được là một junction trỏ vào `_ConfigVault\zemory\` (bước 3 bên dưới); bản thân file chỉ trỏ
tới thư mục Global Memory và không chứa bí mật.

## Cách chia bên trong

Công cụ chỉ có một hai tệp thì để thẳng trong `_ConfigVault\<công cụ>\`. Công cụ có nhiều loại tệp thì chia ba thư mục con:
- `configs\` — thiết lập (đọc được, không bí mật).
- `credentials\` — khoá, token, mật khẩu.
- `cache\` — thứ công cụ tự dựng lại được, xoá đi không mất gì.

Ví dụ: `D:\_ConfigVault\agentswitch\configs\profiles.json` · `D:\_ConfigVault\agentswitch\credentials\tokens.json`.

## Các bước — dời thiết lập của một công cụ về đây

1. Tạo `_ConfigVault\<công cụ>\`.
2. Công cụ có thiết lập hoặc biến môi trường cho chỗ đặt cấu hình (`GIT_CONFIG_GLOBAL`, `RCLONE_CONFIG`, `NPM_CONFIG_USERCONFIG`)
   ⇒ trỏ nó vào thư mục mới rồi dời tệp sang.
3. Không có ⇒ dời tệp sang rồi thay chỗ cũ bằng junction (thư mục) hoặc symlink (tệp) trỏ tới chỗ mới
   (`mklink /J "%USERPROFILE%\.ssh" "D:\_ConfigVault\ssh"`).
4. Chạy công cụ một lần, kiểm nó đọc được thiết lập.

## Các bước — gỡ một HOME đang trỏ vào ổ dữ liệu

Máy có `HOME` trỏ vào một thư mục của ổ dữ liệu (nên nhiều công cụ để `.ssh`, `.gitconfig`, `.npmrc`, `.cache`, `AppData` ở đó)
được trả về trong CÙNG MỘT đợt, vì đổi `HOME` là đổi chỗ đọc của mọi công cụ đó cùng lúc:
1. Liệt kê các thư mục và tệp của công cụ trong thư mục `HOME` hiện tại.
2. Thiết lập và khoá (`.ssh`, `.gitconfig`, `.npmrc`, token của công cụ) ⇒ dời từng thứ vào `_ConfigVault\<công cụ>\` theo các
   bước trên.
3. Cache và trạng thái công cụ tự dựng lại (`.cache`, trạng thái của trình soạn mã) ⇒ để công cụ dựng lại dưới thư mục nhà mặc
   định, hoặc dời cái lớn vào `Data\` của phần mềm đó rồi nối về.
4. Gỡ biến `HOME` đã đặt (biến môi trường của người dùng Windows), đăng xuất rồi đăng nhập lại, chạy từng công cụ đã liệt kê một
   lần để kiểm nó đọc được thiết lập.
5. Thư mục `HOME` cũ giờ không còn tệp của công cụ; dời nó về chỗ của nó trong cây, hoặc xoá khi chủ máy đồng ý.

## Luật về bí mật — không có ngoại lệ

- Nội dung `_ConfigVault\` KHÔNG BAO GIỜ vào git (kể cả repo riêng tư), KHÔNG nằm trong thư mục đồng bộ (Syncthing) hay thư mục
  sao lưu đám mây (Drive).
- Mang sang máy khác bằng tay, qua đường an toàn (USB của mình, trình quản lý mật khẩu), rồi đặt lại đúng chỗ.

## Không chứa

Bản cài phần mềm (để ở `Software\`) · file model (`_Models\`) · dữ liệu làm việc và repo (`Workspace\`) · tài liệu cá nhân
(`Documents\`).

## Khuôn tên

`_ConfigVault` viết đúng như vậy. Thư mục công cụ viết thường, đúng như tên lệnh của nó: `git` · `ssh` · `vpn` · `rclone` · `npm`.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` nhận `_ConfigVault` ở gốc dữ liệu và báo đỏ repo nằm trong nó (`repo-outside-workspace`).
Chưa có phép kiểm máy cho việc bí mật lọt vào git hay thư mục đồng bộ — người đặt tệp tự giữ.
