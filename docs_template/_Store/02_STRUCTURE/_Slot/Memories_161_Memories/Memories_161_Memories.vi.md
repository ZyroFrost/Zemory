---
version: 4
lang: vi
---
# Memories_161_Memories memories — ảnh và video về con người

## Vai trò

`<gốc dữ liệu>\Memories\` là bước 12 của chuỗi câu hỏi cấp ổ (`Struc_Disk_Data`): ảnh và video về CON NGƯỜI chụp bằng máy của
chủ máy hoặc của gia đình (điện thoại cũng tính) — chuyến đi, sự kiện gia đình, đời thường. Đây là bản gốc, không tải lại được.
Theo thứ tự của chuỗi, bước trước thắng: ảnh chụp màn hình game không phải kỷ niệm ⇒ `Game\` (bước 8); ảnh gom để dùng cho hồ sơ
của chủ máy ⇒ `Documents\Profile\Avatar\` (bước 11). Sự thật phân biệt kỷ niệm với ảnh sưu tầm nằm ở chính file: EXIF của máy
chụp (hãng, đời máy, thời điểm chụp).

## Bên trong — chủ đề ở ngoài, thời gian ở trong

```
Memories\
├── Events\                     sự kiện của chính đời chủ máy, không gắn với một nhóm người
│   └── <YYYY-MM>_<Sự-kiện>\    ví dụ 2024-05_Concert — ảnh và video chung một chỗ
├── Family\<Gia-đình>\          một gia đình
├── Friends\<Nhóm>\             một nhóm bạn (một lớp, một câu lạc bộ, một đội)
├── Me\[<Mảng>\]                riêng chủ máy
├── Work\<Tổ-chức>\             đồng nghiệp và sự kiện công việc của một tổ chức
└── <Chủ-đề>\                   một đề tài chủ máy giữ nhiều ảnh (món ăn, một sở thích, một nơi hay lui tới)
```

- Cấp 1 là CHỦ ĐỀ — ảnh nói về ai hay về gì. Các chủ đề trên là bộ thường dùng; chủ máy được thêm chủ đề, và khi đó ghi nó vào slot
  này (mỗi đề tài một tên, giống nhau trên mọi máy).
- Cấp 2, khi chủ đề có nhiều đối tượng (nhiều gia đình, nhóm, tổ chức), là AI: mỗi gia đình, nhóm hay tổ chức một thư mục.
- Thời gian nằm BÊN TRONG, là tiền tố của thư mục sự kiện: `<YYYY-MM>_<Sự-kiện>\`, hoặc `<YYYY-MM-DD>_<Sự-kiện>\` khi cần ngày. Ảnh
  không thuộc sự kiện nào thì để thẳng trong thư mục chủ đề hay đối tượng.
- Một sự kiện giữ cả ảnh LẪN video trong một thư mục: một chuyến đi vừa có clip vừa có ảnh, nên kỷ niệm không bao giờ chia theo loại
  file (cách chia đó là của `Media\`, Media_162).

Ví dụ thật: `Memories\Friends\College\2023-07_Graduation\` chứa `IMG_0012.jpg` · `VID_0014.mp4`.

## Luật

- Thứ do AI tạo đi theo đúng thứ tự như mọi món (`Struc_Disk_Data`, "Made by AI"); muốn tách riêng ở đây thì thêm thư mục con tuỳ
  chọn `AI\` bên trong thư mục sự kiện — ảnh AI chỉ là kỷ niệm khi nó về người của chủ máy và được giữ như kỷ niệm.
- Xếp theo chủ đề và sự kiện, KHÔNG theo loại file: không chia `Photos\` và `Videos\`.
- Thư mục sự kiện mở đầu bằng thời gian (`YYYY-MM` hoặc `YYYY-MM-DD`), một dấu gạch dưới, rồi tên ngắn.
- Giữ nguyên tên file của máy chụp.
- Không có hộp chờ: đồ chưa xếp nằm ở `Downloads\`; công cụ sắp xếp đọc từ đó.
- Không có file lẻ ở cấp `Memories\`.
- Thư mục chỉ có khi có thứ để chứa (`Struc_Disk_Data` §Luật): không có thư mục chủ đề hay đối tượng rỗng.

## Đồng bộ

Không vào git. Bản gốc: giữ ít nhất một bản sao lưu ở nơi lưu khác.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` nhận `Memories\` là thư mục cấp 1. Cách đặt tên chủ đề và sự kiện chưa có phép kiểm máy.
