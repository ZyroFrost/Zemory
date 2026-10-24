---
version: 4
lang: vi
---
# Personal_145_Personal personal — việc của chính chủ máy, chia theo loại

## Vai trò

`Workspace\Personal\` chứa việc mà CHÍNH chủ máy làm chủ: công cụ và sản phẩm tự viết, mã viết trong lúc học, game tự phát triển,
việc nhận làm cho khách bên ngoài, và các kênh của chính chủ máy. Mọi thứ nằm dưới MỘT thư mục loại, để nhìn vào `Personal\` là
biết mỗi thứ là gì — sản phẩm, bài tập hay việc của khách — thay vì ba chục thư mục nằm phẳng cạnh nhau.

## Năm loại — danh sách cố định, cấp này bắt buộc

| loại | chứa | bên trong | ví dụ thật |
|---|---|---|---|
| `Apps\` | công cụ và sản phẩm của chính chủ máy | `[<Dự án>\]<repo>\` — có cấp dự án khi một dự án có từ hai repo | `Workspace\Personal\Apps\BudgetTracker\` · `Workspace\Personal\Apps\HomeLab\{homelab-api, homelab-ui}\` |
| `StudyProjects\` | mã viết để học, chạy được | soi gương `Study\` (Study_160): `School\<Trường>\<Môn>\<repo>\` · `Self\<Mảng>\<repo>\` | `Workspace\Personal\StudyProjects\School\OpenUniversity\Databases\finance-tracker\` |
| `Games\` | game chủ máy tự phát triển (game để chơi nằm ở `Game\`) | `<repo>\` | `Workspace\Personal\Games\PixelRunner\` |
| `Freelance\` | việc nhận làm cho khách bên ngoài, ngoài mọi tổ chức | `<Khách>\` — cả repo LẪN tệp việc không phải repo (bản thiết kế, bản vẽ, bản giao) | `Workspace\Personal\Freelance\ClientA\ShopSite\` · `Workspace\Personal\Freelance\ClientB\house-design.skp` |
| `Social\` | các kênh của chính chủ máy (video, nhạc, bài đăng): công cụ VÀ đầu ra chúng làm ra | `<Nền tảng>\<Kênh>\` — cả repo LẪN đầu ra không phải repo (track, bản dựng, prompt, ảnh) | `Workspace\Personal\Social\Youtube\<Kênh>\_tracks\` · `Workspace\Personal\Social\Facebook\Avatar\` |

## Luật

- Mọi thứ trong `Personal\` nằm trong một trong năm loại; không có repo hay thư mục nào nằm thẳng dưới `Personal\`, và không có
  loại thứ sáu.
- `Apps\`, `StudyProjects\` và `Games\` chỉ chứa repo. `Freelance\` và `Social\` được chứa cả việc không phải repo, vì một việc
  của khách hay một kênh gồm những tệp repo không giữ (một bản vẽ, 40 GB video đã dựng).
- Học: mã chạy được ⇒ `StudyProjects\`; tài liệu chỉ đọc hoặc xem (bài giảng, sách, đề, ghi chú) ⇒ `Study\`; kiến thức giữ để tra
  ⇒ `Library\`. `StudyProjects\X` và `Study\X` dùng cùng một `X`. Đồ án ở trường: mã ⇒
  `StudyProjects\School\<Trường>\<Môn>\<repo>\`; hồ sơ (đề, báo cáo, điểm) ⇒ `Study\School\<Trường>\<Môn>\`.
- Mã của người khác clone về để học ⇒ `StudyProjects\Self\<Mảng>\`; clone về để dùng ⇒ `Workspace\External\`.
- Dự án học lên đời thành sản phẩm ⇒ dời sang `Apps\` bằng `zemory project move` (giữ lịch sử Global Memory).
- Chỉ việc của chính chủ máy. Repo của một tổ chức ⇒ `Company\<Tổ chức>\`.
- Không có file lẻ ở cấp `Personal\` hay ở cấp loại.

## Khuôn tên

- Thư mục loại viết đúng như bảng.
- Thư mục repo đặt đúng tên repo trên remote (`github.com/<tài khoản>/ZFlow` ⇒ `ZFlow\`). Thư mục lệch tên với remote thì đổi
  bằng `zemory project move <cũ> <mới>`, từng repo một, khi chủ máy quyết; trước đó được phép lệch.
- Tên dự án, khách, nền tảng và kênh viết PascalCase, không dấu cách.

## Phép kiểm

`zemory conform --layout <ổ>\Workspace` báo đỏ (`unknown-value`) mọi thư mục nằm thẳng dưới `Personal\` mà không phải một trong
năm loại — kể cả repo đặt thẳng dưới `Personal\`. Các cấp bên trong một loại chưa có phép kiểm máy.
