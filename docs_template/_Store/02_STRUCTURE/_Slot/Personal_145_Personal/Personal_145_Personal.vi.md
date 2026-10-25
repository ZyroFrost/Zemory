---
version: 6
lang: vi
---
# Personal_145_Personal personal — code của chính chủ máy, chia theo loại

## Vai trò

`Workspace\Personal\` chứa code mà CHÍNH chủ máy làm chủ (bước 3 của `Workspace_143`). Mọi repo nằm dưới MỘT thư mục loại, để nhìn
vào `Personal\` là phân biệt được bài tập với sản phẩm.

## Câu hỏi của cấp này — đáp án đúng đầu tiên thắng

| bước | sự thật | đặt ở | bên trong |
|---|---|---|---|
| 1 | nó làm cho một môn chủ máy đang hoặc đã học: tồn tại thư mục `Study\X`, hoặc — không giữ học liệu nào — thư mục môn có `_README.md` ghi tên khoá học | `StudyProjects\` | soi gương `Study\`: `School\<Trường>\<Môn>\<repo>\` · `Self\<Mảng>\<repo>\`; dự án giữ ở dạng nén là `<tên>.tar.gz` · `.zip` · `.7z` ngay chỗ đó |
| 2 | game chủ máy tự phát triển | `Games\` | `<repo>\` |
| 3 | còn lại | `Apps\` | `[<Dự án>\]<repo>\` — có cấp dự án khi một dự án có từ hai repo |

Ví dụ thật: `Workspace\Personal\StudyProjects\School\OpenUniversity\Databases\finance-tracker\` (và có
`Study\School\OpenUniversity\Databases\`) · `Workspace\Personal\Games\PixelRunner\` · `Workspace\Personal\Apps\BudgetTracker\`.

## Luật

- Đúng ba loại, cấp này bắt buộc: không repo hay thư mục nào nằm thẳng dưới `Personal\`, không có loại thứ tư.
- `StudyProjects\X` cần có `Study\X`, hoặc — khi không giữ học liệu nào — một `_README.md` trong `StudyProjects\X` ghi trường và
  khoá học. Không có cả hai ⇒ repo đó không phải dự án học ⇒ bước 2 hoặc 3. Không bao giờ tạo `Study\X` rỗng cho qua phép kiểm
  (`Struc_Disk_Data` §Luật: thư mục chỉ có khi có thứ để chứa).
- Dự án học được giữ ở dạng NÉN cho đỡ tốn chỗ (`<tên>.tar.gz` · `.zip` · `.7z`, gồm cả `.git\`): nó vẫn là chính dự án đó và nằm
  đúng chỗ của nó, cạnh các repo cùng môn. Nén không phải archive (Archive_166).
- Thư mục dùng chung của nhiều repo cùng loại nằm cạnh chúng, tên có `_`: `Apps\_Prompt\` chứa prompt hai app cùng mảng dùng. Nó
  không phải repo.
- App giữ đầu ra nó làm ra ngay trong repo của nó, ở `workspaces/<tên>/` (mỗi đơn vị đầu ra một thư mục, đồ dùng chung có tên `_`,
  gitignore) — không bao giờ để ở nơi chứa ngoài repo.
- Dự án học lên đời thành sản phẩm ⇒ `zemory project move` sang `Apps\` (giữ lịch sử Global Memory).
- Thư mục repo đặt đúng tên trên remote; thư mục lệch tên thì đổi bằng `zemory project move <cũ> <mới>` khi chủ máy quyết; trước đó
  được phép lệch.
- Không có file lẻ ở cấp `Personal\` hay ở cấp loại.

## Không thuộc đây ⇒ đi đâu

Việc cho một tổ chức, kể cả freelance ⇒ `Company\<Tổ chức>\` · code của người khác ⇒ `External\` · tài liệu học chỉ đọc hoặc xem ⇒
`Study\`.

## Phép kiểm

`zemory conform --layout <ổ>\Workspace` báo đỏ (`unknown-value`) mọi thư mục nằm thẳng dưới `Personal\` không phải một trong ba loại.
Kiểm từ gốc ổ thì báo đỏ thêm (`study-unmatched`) mọi `StudyProjects\School\<Trường>\<Môn>\` hay `Self\<Mảng>\` không có thư mục
tương ứng dưới `Study\` mà cũng không có `_README.md` của riêng nó.
