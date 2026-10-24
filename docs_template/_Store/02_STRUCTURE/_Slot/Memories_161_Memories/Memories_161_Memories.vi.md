---
version: 1
lang: vi
---
# Memories_161_Memories memories — ảnh và video người dùng tự chụp

## Vai trò

`<gốc dữ liệu>\Memories\` chứa ảnh và video người dùng (hoặc gia đình người dùng) tự chụp: chuyến đi, sự kiện gia đình, đời sống
hằng ngày. Nhánh ① của `Struc_Disk_Data`: đây là bản gốc, mất là không lấy lại được. Ảnh người khác làm (hình nền, ảnh tải về)
không phải kỷ niệm: chúng vào `Media\Image\` (Media_162).

## Bên trong

```
Memories\
└── <Năm>\
    ├── <YYYY-MM-DD Sự kiện>\    một sự kiện: ảnh và video để chung
    └── <YYYY-MM>\               những thứ của tháng đó không thuộc sự kiện nào
```

Ví dụ thật:

```
Memories\2025\
├── 2025-04-30 Beach Trip\      IMG_0012.jpg · IMG_0013.heic · VID_0014.mp4
├── 2025-09-02 Family Dinner\   …
└── 2025-07\                    ảnh lẻ của tháng 7
```

## Luật

- Gom theo thời gian và sự kiện, KHÔNG chia theo loại file: ảnh và video của một sự kiện nằm chung một thư mục. Không tách
  `Photos\` và `Videos\`.
- Thư mục sự kiện bắt đầu bằng ngày đầu tiên dạng `YYYY-MM-DD`, rồi một tên ngắn; sự kiện kéo dài nhiều ngày giữ ngày đầu.
- Giữ nguyên tên file của máy chụp; không đổi tên file.
- Không có thư mục chờ xếp: thứ mới từ điện thoại vào thẳng năm và tháng của nó, hoặc vào thư mục sự kiện.
- Không có file lẻ ở cấp `Memories\` hay ở cấp năm.

## Khuôn tên

Năm `2025`; tháng `2025-07`; sự kiện `2025-04-30 Beach Trip` (ở đây được có dấu cách giữa ngày và tên, để tên đọc như tiêu đề).

## Đồng bộ

Không vào git. Bản gốc: giữ ít nhất một bản sao lưu ở một nơi lưu khác (ổ thứ hai, hoặc sao lưu đám mây).

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` nhận `Memories\` là thư mục cấp 1 hợp lệ. Khuôn tên năm và sự kiện chưa có phép kiểm
máy; người dùng tự giữ.
