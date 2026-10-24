---
version: 2
lang: vi
---
# Archive_166_Archive archive — thứ đã nghỉ, giữ làm bản duy nhất

## Vai trò

`<gốc dữ liệu>\Archive\` là bước 3 của chuỗi câu hỏi cấp ổ (`Struc_Disk_Data`): dự án hoặc phiên bản cũ ngừng dùng, giữ làm bản DUY
NHẤT còn lại (bản gốc đã dời vào đây). Khác với `Backup\` (bước 2) ở một sự thật: bản sao lưu thì bản gốc còn ở nơi khác. Kiến thức
học xong không vào archive: nó vào `Library\` (bước 10).

## Bên trong

Mỗi thứ giữ đúng đường dẫn nó từng có trong cây, dưới tên thư mục cấp 1 nó đến từ đó:

| từng nằm ở | archive ở |
|---|---|
| `Workspace\Personal\Apps\OldTool\` | `Archive\Workspace\Personal\Apps\OldTool.zip` |
| `Software\Office\FoxitReader\Setup\` (một bộ cài cũ) | `Archive\Software\Office\FoxitReader\Setup\` |
| `Backup\Phone\OldPhone\` mà điện thoại không còn | `Archive\Backup\Phone\OldPhone\` |

## Các bước — đưa một thứ vào archive

1. Tạo đường dẫn cũ của nó dưới `Archive\<thư mục cấp 1>\`.
2. Repo: nén cả thư mục, gồm `.git\`, thành `<repo>.zip` (repo không nén nằm ngoài `Workspace\` bị báo).
3. Thứ khác: dời thư mục vào đó.
4. Xoá ở chỗ cũ: đưa vào archive là dời.

## Luật

- Cấp đầu chỉ chứa tên các thư mục cấp 1 của cây. Không có file lẻ ở cấp `Archive\`.
- Archive nặng và ít khi mở: khối tốt để dời sang ổ dữ liệu thứ hai, rồi nối về.

## Đồng bộ

Không vào git. Bản duy nhất: giữ một bản sao lưu ở nơi lưu khác.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` nhận `Archive\` và báo đỏ repo không nén nằm trong nó (`repo-outside-workspace`).
