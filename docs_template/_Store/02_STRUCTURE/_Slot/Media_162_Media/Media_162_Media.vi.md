---
version: 1
lang: vi
---
# Media_162_Media media — phim, clip, nhạc, ảnh và truyện tranh do người khác làm

## Vai trò

`<gốc dữ liệu>\Media\` chứa media người dùng sưu tầm: người khác làm, giữ để xem, nghe hoặc đọc. Nhánh ② của `Struc_Disk_Data`:
tải lại được, nhưng tốn công. Ảnh và video người dùng tự chụp không phải media: chúng vào `Memories\` (Memories_161). Media của
một game (ảnh chụp, clip lúc chơi) vào `Game\Media\` (Game_164).

## Bên trong — bốn loại, danh sách cố định

| thư mục | chứa | ví dụ thật |
|---|---|---|
| `Video\Movie\` | phim lẻ và phim bộ | `Media\Video\Movie\Interstellar (2014)\` |
| `Video\Clip\` | video ngắn: bài nói, MV, clip đã lưu | `Media\Video\Clip\Conference Talks\` |
| `Music\` | nhạc, theo nghệ sĩ hoặc album | `Media\Music\<Nghệ sĩ>\<Album>\` |
| `Image\` | ảnh sưu tầm: hình nền, ảnh tham khảo, tranh | `Media\Image\Wallpapers\` |
| `Comic\` | truyện tranh và manga, mỗi bộ một thư mục | `Media\Comic\<Bộ truyện>\` |

## Luật

- Cấp đầu chỉ có bốn loại `Video` · `Music` · `Image` · `Comic`; trong `Video\` chỉ có `Movie\` và `Clip\`.
- Không có file lẻ ở cấp `Media\` hay ở cấp loại; trong một loại, mỗi tựa, mỗi bộ hoặc mỗi nghệ sĩ một thư mục.
- Media nặng: là khối đầu tiên nên dời sang ổ dữ liệu thứ hai, rồi nối về theo năm luật của `Struc_Disk_Data`.

## Khuôn tên

Tên tựa đúng như khi phát hành, phim kèm năm trong ngoặc: `Interstellar (2014)`. Thư mục loại viết đúng như bảng.

## Đồng bộ

Không vào git, không đồng bộ: tải lại được.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` nhận `Media\` là thư mục cấp 1 hợp lệ. Bốn loại chưa có phép kiểm máy; người dùng tự giữ.
