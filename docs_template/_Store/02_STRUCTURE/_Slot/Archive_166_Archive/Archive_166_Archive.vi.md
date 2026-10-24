---
version: 1
lang: vi
---
# Archive_166_Archive archive — thứ đã nghỉ, giữ làm bản duy nhất

## Vai trò

`<gốc dữ liệu>\Archive\` chứa thứ người dùng không còn dùng nhưng vẫn giữ: dự án đã đóng, bộ cài cũ của một phần mềm, môn học đã
xong mà ghi chép còn đáng giữ. Nhánh ④ của `Struc_Disk_Data`. Thứ trong archive là bản DUY NHẤT còn lại (bản gốc đã dời vào đây);
đó là chỗ khác với `Backup\` (Backup_165), nơi chứa bản sao.

## Bên trong

Mỗi thứ giữ đúng đường dẫn nó từng có trong cây, đặt dưới tên thư mục cấp 1 nó đến từ đó, để tìm lại theo chỗ nó từng nằm.

| từng nằm ở | archive ở |
|---|---|
| `Workspace\Personal\OldTool\` | `Archive\Workspace\Personal\OldTool.zip` |
| `Study\School\OpenUniversity\Statistics\` | `Archive\Study\School\OpenUniversity\Statistics\` |
| `Software\Office\FoxitReader\Setup\` (một bộ cài cũ) | `Archive\Software\Office\FoxitReader\Setup\` |

## Các bước — đưa một thứ vào archive

1. Tìm đường dẫn của thứ đó trong cây; tạo đúng đường đó dưới `Archive\<thư mục cấp 1>\`.
2. Repo: nén cả thư mục, gồm `.git\`, thành một file `<repo>.zip` rồi đặt file vào đó. Repo không nén nằm ngoài `Workspace\` bị
   phép kiểm cây báo.
3. Thứ khác: dời thư mục vào đó.
4. Xoá thứ đó ở chỗ cũ: đưa vào archive là dời, không phải chép.

## Luật

- Cấp đầu chỉ chứa tên các thư mục cấp 1 của cây (`Workspace` · `Study` · `Software` …).
- Không có file lẻ ở cấp `Archive\`.
- Archive nặng và ít khi mở: là khối tốt để dời sang ổ dữ liệu thứ hai, rồi nối về.

## Khuôn tên

Giữ nguyên tên thứ đó từng có; không đổi tên gì.

## Đồng bộ

Không vào git. Bản duy nhất: giữ một bản sao lưu ở nơi lưu khác.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` nhận `Archive\` là thư mục cấp 1 hợp lệ và báo đỏ repo không nén nằm trong nó
(`repo-outside-workspace`).
