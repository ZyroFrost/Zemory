---
version: 1
lang: vi
---
# Backup_165_Backup backup — bản sao của dữ liệu mà bản gốc nằm chỗ khác

## Vai trò

`<gốc dữ liệu>\Backup\` chứa BẢN SAO: dữ liệu mà bản gốc vẫn nằm ở chỗ khác (điện thoại, app chat, một thư mục khác của cây), giữ
để còn khi bản gốc mất. Nhánh ④ của `Struc_Disk_Data`. Khác với `Archive\` (Archive_166): thứ trong archive là bản duy nhất còn
lại; bản sao lưu không bao giờ là bản duy nhất. Ảnh khôi phục của máy vào `Recovery\` (Recovery_153).

## Bên trong

Mỗi nguồn một thư mục, rồi mỗi thiết bị hoặc mỗi app một thư mục.

| ví dụ | chứa |
|---|---|
| `Backup\Phone\<thiết bị>\` | những gì chép ra từ điện thoại mà KHÔNG phải ảnh hay video: danh bạ, tin nhắn, dữ liệu app, tài liệu. Ảnh và video của điện thoại vào `Memories\` |
| `Backup\Chat\<app>\` | bản xuất dữ liệu của một app chat |
| `Backup\Data\<khối>\` | bản sao lưu một khối của nhánh ① (Workspace, Study, Memories, Documents) khi chưa có nơi lưu nào khác giữ nó |

## Luật

- Không bao giờ là bản duy nhất: bản gốc mất rồi mà vẫn phải giữ bản sao ⇒ đó là archive, dời vào `Archive\`.
- Mỗi thư mục sao lưu đặt theo tên thứ nó sao; bản mới hơn của cùng nguồn thay bản cũ, hoặc ghi ngày vào tên thư mục
  (`Pixel7 2025-10-01`).
- `Backup\` không chứa bản sao nào của database Global Memory: GM là một file và có đường đồng bộ riêng.
- Không có file lẻ ở cấp `Backup\` hay ở cấp nguồn.

## Khuôn tên

Nguồn PascalCase: `Phone` · `Chat` · `Data`. Thiết bị hoặc app theo tên gọi của nó: `Pixel7` · `Telegram`.

## Đồng bộ

Không vào git. Bản sao lưu nằm cùng ổ với bản gốc chỉ chống xoá nhầm, không chống mất ổ: có nơi lưu khác thì dời sang đó.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` nhận `Backup\` là thư mục cấp 1 hợp lệ và báo đỏ repo nằm trong nó
(`repo-outside-workspace`). Bên trong không có phép kiểm máy nào khác.
