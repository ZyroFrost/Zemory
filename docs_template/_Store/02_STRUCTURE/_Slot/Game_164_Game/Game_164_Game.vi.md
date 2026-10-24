---
version: 2
lang: vi
---
# Game_164_Game game — phần không phải chương trình của game

## Vai trò

`<gốc dữ liệu>\Game\` là bước 8 của chuỗi câu hỏi cấp ổ (`Struc_Disk_Data`): file lưu game, ảnh và clip quay màn hình game, clip
game sưu tầm, hướng dẫn chơi. Bản thân game, launcher và công cụ game là chương trình ⇒ `Software\Game\` (bước 6). Đồ game được đặt
theo mục đích một cách có chủ ý: clip game sưu tầm là kiến thức chơi game, nên nằm ở đây, không ở `Media\`.

## Bên trong — ba phần, danh sách cố định

| thư mục | chứa | ví dụ thật |
|---|---|---|
| `Saves\<Game>\` | file lưu, hoặc thư mục lưu mà game cho chọn chỗ | `Game\Saves\Hollow Knight\` |
| `Media\<Game>\` | ảnh chụp và clip quay màn hình lúc chủ máy chơi, và clip game sưu tầm của người khác | `Game\Media\Hollow Knight\` |
| `Guides\` | kiến thức chơi game: hướng dẫn, bản đồ, ghi chú build | `Game\Guides\Hollow Knight\` |

## Luật

- Chỉ ba phần trên. Game đã cài, thư viện của launcher, trình quản lý mod, giả lập, trainer ⇒ `Software\Game\<…>\`.
- Thư mục ghi clip của phần mềm quay màn hình còn đang chờ xếp là `Data\` của chương trình đó (Software_149); clip game đã xếp thì
  vào đây.
- Video quay NGƯỜI bằng máy ảnh là kỷ niệm ⇒ `Memories\`, kể cả khi mọi người đang chơi game.
- File lưu là bản gốc không tải lại được: sao lưu `Game\Saves\` khi `Game\` chỉ nằm trên một SSD có thể thay.
- Không có file lẻ ở cấp `Game\` hay ở cấp phần.

## Khuôn tên

Tên game đúng như khi phát hành: `Hollow Knight`. Tên phần viết đúng `Saves` · `Media` · `Guides`.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` báo đỏ (`unknown-value`) mọi thư mục trong `Game\` không phải một trong ba phần.
