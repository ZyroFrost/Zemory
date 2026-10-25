---
version: 3
lang: vi
---
# Media_162_Media media — giải trí sưu tầm

## Vai trò

`<gốc dữ liệu>\Media\` là bước CUỐI (14) của chuỗi câu hỏi cấp ổ (`Struc_Disk_Data`): đồ giải trí người khác làm, giữ để xem, nghe
hoặc đọc. Nó chỉ nhận món khi không bước nào trước đó đúng. Theo thứ tự của chuỗi: ảnh/clip quay màn hình game hay clip game sưu tầm
⇒ `Game\` (bước 8) · ảnh gom để dùng cho hồ sơ của chủ máy ⇒ `Documents\Profile\Avatar\` (bước 11) · ảnh và video quay người
bằng máy ảnh của chủ máy hay gia đình ⇒ `Memories\` (bước 12).

## Bên trong — bốn loại, danh sách cố định

| thư mục | chứa | ví dụ thật |
|---|---|---|
| `Video\Movie\` | phim lẻ và phim bộ | `Media\Video\Movie\Interstellar (2014)\` |
| `Video\Clip\` | video ngắn: bài nói, MV, clip đã lưu | `Media\Video\Clip\Conference Talks\` |
| `Music\` | nhạc, theo nghệ sĩ hoặc album | `Media\Music\<Nghệ sĩ>\<Album>\` |
| `Image\` | ảnh sưu tầm: hình nền, ảnh tham khảo, tranh | `Media\Image\Wallpapers\` |
| `Comic\` | truyện tranh và manga, mỗi bộ một thư mục | `Media\Comic\<Bộ truyện>\` |

## Luật

- Món do AI sinh theo cùng thứ tự như mọi món (`Struc_Disk_Data`, "Do AI sinh"); muốn tách riêng ở đây thì thêm cấp con tuỳ chọn
  `AI\` bên trong một thư mục chủ đề (`Media\Image\Funny\AI\`).
- Cấp đầu chỉ có `Video` · `Music` · `Image` · `Comic`; trong `Video\` chỉ có `Movie\` và `Clip\`.
- Không có file lẻ ở cấp `Media\` hay ở cấp loại; mỗi tựa, mỗi bộ hoặc mỗi nghệ sĩ một thư mục.
- Media nặng: là khối đầu tiên nên dời sang ổ dữ liệu thứ hai, rồi nối về theo năm luật của `Struc_Disk_Data`.

## Khuôn tên

Tên tựa đúng như khi phát hành, phim kèm năm trong ngoặc: `Interstellar (2014)`.

## Đồng bộ

Không vào git, không đồng bộ: tải lại được.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` nhận `Media\` là thư mục cấp 1 hợp lệ. Bốn loại chưa có phép kiểm máy.
