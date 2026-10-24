---
version: 1
lang: vi
---
# Study_160_Study study — thứ người dùng đang học

## Vai trò

`<gốc dữ liệu>\Study\` chứa tài liệu của thứ người dùng ĐANG học: bài giảng, slide, bài tập, ghi chép, bản ghi của một khoá
học. Nhánh ① của `Struc_Disk_Data`: ghi chép và bài làm của chính người dùng nằm ở đây, là bản gốc. Học xong một môn mà chỉ còn
giữ để tra, môn đó dời sang `Library\` (Library_163).

## Bên trong

Hai loại, mỗi loại một thư mục:

| thư mục | chứa | ví dụ thật |
|---|---|---|
| `School\<Trường>\<Môn>\` | một môn học ở trường phổ thông hoặc đại học, mỗi môn một thư mục | `Study\School\OpenUniversity\Statistics\` |
| `Self\<Mảng>\` | tự học: khoá học online, một cuốn sách đang làm theo, lộ trình chứng chỉ | `Study\Self\DataEngineering\` · `Study\Self\Japanese\` |

Thư mục một môn chia theo nhu cầu, ví dụ `Lectures\` · `Exercises\` · `Notes\` · `Exams\`.

## Luật

- Mã chạy được đặt ở `Workspace\`, không đặt ở đây: repo bài tập, đồ án môn học, notebook có chạy thì nằm ở
  `Workspace\Personal\StudyProjects\<Môn>\` (Personal_145), đặt cùng tên với thư mục môn ở đây để tìm thấy cùng nhau. Tài liệu
  chỉ đọc hoặc xem thì ở lại `Study\`.
- Môn đã học xong, giữ để tra ⇒ dời cả thư mục sang `Library\<Mảng>\`. Môn đã học xong, không còn gì đáng giữ ⇒ xoá, hoặc dời
  vào `Archive\Study\...` nếu vẫn phải giữ.
- Không có file lẻ ở cấp `Study\`, `School\` hay `Self\`.

## Khuôn tên

PascalCase, không dấu cách: `OpenUniversity` · `Statistics` · `DataEngineering`. Tên trường và tên môn theo cách người dùng gọi.

## Đồng bộ

Không vào git. Ghi chép của người dùng là bản gốc: sao lưu như phần còn lại của nhánh ①.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` nhận `Study\` là thư mục cấp 1 hợp lệ. Bên trong `Study\` chưa có phép kiểm máy; người
dùng tự giữ hai loại ở trên.
