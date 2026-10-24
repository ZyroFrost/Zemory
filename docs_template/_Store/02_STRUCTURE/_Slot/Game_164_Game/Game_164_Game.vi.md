---
version: 1
lang: vi
---
# Game_164_Game game — game đã cài, file lưu, ảnh/clip và công cụ

## Vai trò

`<gốc dữ liệu>\Game\` chứa mọi thứ về game của người dùng trong một khối, để cả khối dời được sang SSD nhanh rồi nối về (năm luật
của `Struc_Disk_Data`). Nhánh ② của `Struc_Disk_Data`. Bản thân trình chạy game (Steam, Epic) là một phần mềm: nằm ở
`Software\Utility\<Trình chạy>\` (Software_148); chỉ thư viện game của nó nằm ở đây.

## Bên trong — bốn phần, danh sách cố định

| thư mục | chứa | ví dụ thật |
|---|---|---|
| `Installed\` | game đã cài, và thư mục thư viện của từng trình chạy | `Game\Installed\SteamLibrary\` · `Game\Installed\Hollow Knight\` |
| `Saves\<Game>\` | file lưu chép ra từ game, hoặc thư mục lưu mà game cho chọn chỗ | `Game\Saves\Hollow Knight\` |
| `Media\<Game>\` | ảnh chụp và clip lúc chơi | `Game\Media\Hollow Knight\` |
| `Tools\<Công cụ>\` | mod, trình quản lý mod, trainer, giả lập | `Game\Tools\ModOrganizer\` |

## Các bước — cài một game

1. Game có trình chạy: trong trình chạy, thêm thư mục thư viện ở `Game\Installed\<Trình chạy>Library\` rồi cài vào đó.
2. Game không có trình chạy: cài vào `Game\Installed\<Game>\`.
3. Game cho chọn chỗ lưu ⇒ chọn `Game\Saves\<Game>\`; không cho chọn ⇒ chép file lưu vào đó để sao lưu.

## Luật

- Cấp đầu chỉ có bốn phần trên, viết đúng như bảng.
- Không có file lẻ ở cấp `Game\` hay ở cấp phần.
- File lưu là phần duy nhất không tải lại được: sao lưu `Game\Saves\` khi `Game\` chỉ nằm trên một SSD có thể thay.

## Khuôn tên

Tên game đúng như khi phát hành: `Hollow Knight`. Thư viện của trình chạy `SteamLibrary` · `EpicLibrary`. Tên phần viết đúng
`Installed` · `Saves` · `Media` · `Tools`.

## Đồng bộ

Không vào git, không đồng bộ. `Saves\` được sao lưu.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` nhận `Game\` là thư mục cấp 1 hợp lệ. Bốn phần chưa có phép kiểm máy; người dùng tự giữ.
