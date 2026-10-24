---
version: 1
lang: vi
---
# Library_163_Library library — kiến thức giữ để tra

## Vai trò

`<gốc dữ liệu>\Library\` chứa kiến thức người dùng giữ để tra lại, không phải để học bây giờ: sách, bài báo, tài liệu kỹ thuật,
bảng tra nhanh, khoá học đã học xong. Nhánh ② của `Struc_Disk_Data`. Ranh giới với `Study\` (Study_160): còn đang học ⇒ `Study\`;
chỉ tra lại ⇒ `Library\`.

## Bên trong

Mỗi mảng một thư mục; trong một mảng, mỗi tựa hoặc mỗi nguồn một thư mục.

| ví dụ | chứa |
|---|---|
| `Library\DataEngineering\Designing Data-Intensive Applications\` | một cuốn sách (PDF, EPUB) |
| `Library\Statistics\Intro to Statistics\` | một khoá học đã xong, dời từ `Study\` sang |
| `Library\Excel\CheatSheets\` | bảng tra nhanh |

## Luật

- Chỉ chứa tài liệu người khác làm, hoặc tài liệu khoá học đã xong của người dùng giữ để tra. Việc đang làm dở thuộc `Study\`
  hoặc `Workspace\`.
- Không có file lẻ ở cấp `Library\`; mọi thứ nằm trong một mảng.
- Tên mảng trùng với tên mảng dùng trong `Study\Self\`, để một khoá học dời sang mà không phải đổi tên.

## Khuôn tên

Mảng PascalCase, không dấu cách: `DataEngineering` · `Statistics`. Tên tựa đúng như khi phát hành.

## Đồng bộ

Không vào git, không đồng bộ: tải lại được.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` nhận `Library\` là thư mục cấp 1 hợp lệ. Bên trong chưa có phép kiểm máy; người dùng tự giữ.
