---
version: 2
lang: vi
---
# Study_160_Study study — tài liệu đang học

## Vai trò

`<gốc dữ liệu>\Study\` là bước 9 của chuỗi câu hỏi cấp ổ (`Struc_Disk_Data`): tài liệu chủ máy ĐANG học — bài giảng, slide, bài
tập, ghi chú, bản ghi, và khoá học tải về để nghiên cứu (khoá học tải về là để học, không phải đồ sưu tầm). Học xong mà chỉ còn
giữ để tra thì dời sang `Library\` (bước 10, Library_163).

## Bên trong — hai loại

| thư mục | chứa | ví dụ thật |
|---|---|---|
| `School\<Trường>\<Môn>\` | một môn học ở trường phổ thông hoặc đại học | `Study\School\OpenUniversity\Statistics\` |
| `Self\<Mảng>\` | tự học: khoá học, một cuốn sách đang làm theo, lộ trình chứng chỉ | `Study\Self\DataEngineering\` |

## Luật

- Code chạy được không nằm ở đây (luật 2, đặt theo bản chất): code của chủ máy cho một môn ⇒
  `Workspace\Personal\StudyProjects\School\<Trường>\<Môn>\<repo>\` hoặc `…\StudyProjects\Self\<Mảng>\<repo>\` — đúng đường dẫn như ở
  đây (Personal_145). Code của người khác cho một môn ⇒ `Workspace\External\<repo>\`; thư mục này trỏ qua.
- Chương trình dùng để học nằm ở `Software\`; hồ sơ đồ án (đề, báo cáo, điểm) ở lại đây.
- Học xong, giữ để tra ⇒ dời cả thư mục sang `Library\<Mảng>\`. Học xong, không còn gì đáng giữ ⇒ xoá.
- Không có file lẻ ở cấp `Study\`, `School\` hay `Self\`.

## Khuôn tên

PascalCase, không dấu cách: `OpenUniversity` · `Statistics` · `DataEngineering`.

## Đồng bộ

Không vào git. Ghi chép của chủ máy là bản gốc: sao lưu.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` nhận `Study\`, và báo đỏ (`study-unmatched`) dự án học dưới
`Workspace\Personal\StudyProjects\` không có thư mục tương ứng ở đây.
