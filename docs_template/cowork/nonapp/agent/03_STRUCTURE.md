<!-- zemory template · hệ NON-APP — bản Cowork. File này KHÔNG chép lại cây thư mục:
     cây + bảng routing + quy ước đặt tên sống ở `.claude/skills/structure/` (một nội
     dung một nhà). Ở đây chỉ có: file này để làm gì, và TỪ ĐIỂN DỮ LIỆU của dự án.
     Ship RỖNG phần từ điển — dự án tự điền. -->
# <PROJECT> — Cấu trúc & Từ điển

> Mở khi: **cần đặt · tạo · dời file**, hoặc cần **định nghĩa một metric/cột**.
> KHÔNG cần đọc mỗi phiên.

## 1. Chuẩn thư mục ở đâu

Cây thư mục, bảng tra **"cần gì → để đâu"**, quy ước đặt tên và script kiểm:
→ **`.claude/skills/structure/`** (`SKILL.md` · `reference/conventions.md` · `scripts/check_structure.py`).

Ba vai trò **BẮT BUỘC** của một dự án non-app: `docs/` · `AGENTS.md` · **≥1 thư mục sản phẩm**
(`reports/` | `models/` | `content/` | `design/`). Mọi slot khác chỉ tạo **khi có file thật** —
**KHÔNG tạo thư mục rỗng** cho đủ bộ.

**File này là INDEX phải KHỚP thư mục thật:** thêm/đổi/dời slot → cập nhật ở đây **trong cùng thay đổi
đó**. Index lệch thực tế = tra sai, và không cổng nào bắt được.

## 2. Từ điển dữ liệu — metric · cột · thuật ngữ

> **Đây là nhà DUY NHẤT của từ điển.** KHÔNG tạo `docs/dictionary.md` — một dự án chỉ có một từ điển,
> và nó nằm ở đây, cạnh từ điển tên-chỗ ở §1. Hai thứ đó cùng trả lời một câu hỏi: *"cái này gọi là gì,
> và ở đâu"*.
>
> Định nghĩa ghi ở đây là **NGUỒN SỰ THẬT**: `measures/` · `queries/` · file điền số đều phải tính đúng
> như mô tả. Thấy công thức thực tế khác mô tả ⇒ **BÁO**, không tự sửa bên nào.

| Tên | Định nghĩa | Công thức / nguồn | Ghi chú |
|---|---|---|---|
| *(chưa có — điền khi dự án có metric đầu tiên)* | | | |

**Quy ước:** một dòng một khái niệm · tên viết đúng như trên sản phẩm giao đi · đổi định nghĩa là **đổi
số liệu** ⇒ ghi `06_CHANGES` và nói rõ ảnh hưởng tới bản đã phát hành.
