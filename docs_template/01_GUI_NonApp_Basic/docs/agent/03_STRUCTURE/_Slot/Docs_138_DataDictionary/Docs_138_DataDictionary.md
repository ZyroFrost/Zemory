---
id: Slot_138
aka: 03-138
name: data-dictionary
version: 4
kind: guide
path: docs/agent/03_STRUCTURE/INDEX.md
from: _Store/03_STRUCTURE/_Slot/Docs_138_DataDictionary @v4 #43d306316e87
---
# Docs_138_DataDictionary data-dictionary — từ điển dữ liệu: metric · cột · thuật ngữ

- Vai trò:
  - Nhà DUY NHẤT của từ điển dữ liệu; nằm cạnh từ điển tên slot vì hai thứ cùng trả lời một câu hỏi: cái này gọi là gì, và ở đâu. Tách ra hai file là chắc chắn lệch, mà lệch định nghĩa metric thì số liệu sai chứ không phải tài liệu sai.
  - Định nghĩa ở đây là NGUỒN SỰ THẬT, chống mỗi report tính một kiểu: `measures/` · `queries/` · script điền đều phải tính đúng như mô tả. Thấy công thức thực tế khác mô tả ⇒ BÁO, không tự sửa bên nào.
  - Giá trị do từng repo điền trong `INDEX.md` của chính nó; chuẩn chỉ quy định hình dạng.
- Mỗi mục phải nêu:
  - Tên — viết đúng như trên deliverable giao đi.
  - Định nghĩa.
  - Công thức / nguồn.
  - Ghi chú.
  - Khuôn bảng: `| Tên | Định nghĩa | Công thức / nguồn | Ghi chú |`; khi chưa có metric nào, một dòng giữ chỗ cho tới khi dự án có metric đầu tiên.
- Quy ước:
  - Một dòng một khái niệm.
  - Đổi định nghĩa là đổi SỐ LIỆU ⇒ ghi `06_CHANGES` (supersede nếu đảo định nghĩa cũ) và nêu rõ ảnh hưởng tới bản đã phát hành.
- Được chứa / không chứa: không tạo `docs/dictionary.md` hay từ điển thứ hai — một dự án một từ điển.
