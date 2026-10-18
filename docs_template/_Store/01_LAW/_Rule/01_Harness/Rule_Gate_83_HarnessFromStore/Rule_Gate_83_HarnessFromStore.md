---
id: Rule_83
name: harness-from-store
version: 2
kind: action
code: 01_Harness
---
# Rule_Gate_83_HarnessFromStore Repo dùng harness, không sở hữu harness — mọi thay đổi đi qua zemory

- Harness của repo: `docs/agent/01_LAW` (luật chung · hiến pháp, gồm cả điều riêng) · `02_STRUCTURE` (slot, cấu trúc) ·
  `03_SKILLS` và bản dựng skill trong `.claude/skills`. Repo dùng harness, không sở hữu: không phiên nào làm việc trong repo được
  tạo, sửa, xoá hay bãi bỏ một file ở đó. Sổ việc `04_TODO.md` · `05_CHANGES.md` là của repo, ghi bình thường.
- Harness được làm ở kho của zemory (`docs_template/_Store`) rồi áp xuống mọi repo bằng `zemory sync --standard --apply`.
- Repo cải tiến được một phần (luật · skill · slot) ⇒ gửi đề xuất cho phiên zemory: phần nào, đổi gì, vì sao. Cải tiến dùng được
  cho nơi khác thì lên kho, mọi repo nhận qua sync. Phần chỉ đúng với một repo thì thành phần riêng của repo đó, do zemory ghi
  sau khi người dùng duyệt.
- Trước khi sửa hay bãi bỏ một phần của kho ⇒ zemory chạy `zemory impact <phần>`: liệt kê mọi repo đang mang phần đó và trạng
  thái bản sao (`current` · `behind` · `edited` · `absent`). Bản sửa phải dùng được cho mọi repo trong danh sách.
- Một repo không theo được bản sửa, hoặc vẫn cần nội dung sắp bãi bỏ ⇒ repo đó đề xuất một phần riêng (với luật: một điều hiến pháp
  `Cons_<Core|Gate>_<1NN>_<Name>`) giữ phần khác biệt; người dùng duyệt, zemory ghi, rồi kho mới sửa hay bãi bỏ.
- Bãi bỏ giữ số và ghi *bãi bỏ*; sync đưa trạng thái đó xuống mọi repo.
- Phép kiểm: guard của repo chặn mọi Write / Edit trong harness, không có cờ vượt (repo zemory, nơi giữ kho, không bị chặn) ·
  conform `harness-edited-here` đỏ khi bản sao một phần của kho khác bản lúc ráp · `zemory impact` thoát 1 khi còn repo sửa
  bản sao tại chỗ.

## Ví dụ

- Tình huống: phiên của repo phòng ban thêm được một bước hay vào skill dựng báo cáo.
- ✗ Sai: sửa thẳng skill trong `.claude/skills` hay `docs/agent/03_SKILLS` của repo — các phòng khác không bao giờ có bước đó,
  và lần sync sau bản chép lệch khỏi kho.
- ✓ Đúng: gửi đề xuất cho phiên zemory; zemory chạy `zemory impact`, đưa bước đó lên skill ở kho, rồi sync xuống mọi repo.
