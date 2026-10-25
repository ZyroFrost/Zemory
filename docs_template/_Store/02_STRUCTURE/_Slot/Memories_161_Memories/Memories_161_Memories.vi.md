---
version: 3
lang: vi
---
# Memories_161_Memories memories — ảnh và video quay người

## Vai trò

`<gốc dữ liệu>\Memories\` là bước 12 của chuỗi câu hỏi cấp ổ (`Struc_Disk_Data`): ảnh và video quay NGƯỜI bằng máy ảnh của chủ máy
hay của gia đình (điện thoại cũng tính) — chuyến đi, sự kiện gia đình, đời sống hằng ngày. Đây là bản gốc, mất là không lấy lại
được. Theo thứ tự của chuỗi, bước trước thắng: ảnh quay màn hình game không phải kỷ niệm ⇒ `Game\` (bước 8); ảnh gom để dùng cho hồ
sơ của chủ máy ⇒ `Documents\Profile\Avatar\` (bước 11). Sự thật phân biệt kỷ niệm với ảnh sưu tầm nằm ngay trong file: EXIF
của máy chụp (hãng, đời máy, giờ chụp).

## Bên trong

```
Memories\
└── <Năm>\
    ├── <YYYY-MM-DD Sự kiện>\    một sự kiện: ảnh và video để chung
    └── <YYYY-MM>\               những thứ của tháng đó không thuộc sự kiện nào
```

Ví dụ thật: `Memories\2025\2025-04-30 Beach Trip\` chứa `IMG_0012.jpg` · `VID_0014.mp4`.

## Luật

- Món do AI sinh theo cùng thứ tự như mọi món (`Struc_Disk_Data`, "Do AI sinh"); muốn tách riêng ở đây thì thêm cấp con tuỳ chọn
  `AI\` bên trong một thư mục sự kiện — ảnh AI chỉ là kỷ niệm khi nó là người của chủ máy và được giữ làm kỷ niệm.
- Gom theo thời gian và sự kiện, KHÔNG chia theo loại file: không tách `Photos\` và `Videos\`.
- Thư mục sự kiện bắt đầu bằng ngày đầu tiên dạng `YYYY-MM-DD`, rồi một tên ngắn.
- Giữ nguyên tên file của máy chụp.
- Không có hộp chờ: đồ chưa xếp nằm ở `Downloads\`.
- Không có file lẻ ở cấp `Memories\` hay ở cấp năm.

## Đồng bộ

Không vào git. Bản gốc: giữ ít nhất một bản sao lưu ở nơi lưu khác.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` nhận `Memories\` là thư mục cấp 1 hợp lệ. Khuôn tên năm và sự kiện chưa có phép kiểm máy.
