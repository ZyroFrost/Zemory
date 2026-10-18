---
id: Rule_4
aka: 02-4
name: scratch-files
version: 8
kind: judgment
code: 03_Safety
from: _Store/01_LAW/_Rule/03_Safety/Rule_Gate_04_ScratchFiles @v8 #b94c102f9576
---
# Rule_Gate_04_ScratchFiles File tạm có đường chết

- Thứ tạo ra để làm việc mà không phải sản phẩm giao đi (script dò · dữ liệu đo · dữ liệu trung gian · model tải về · ảnh chụp · bản nháp · bản thử · bản sao để so) nằm trong thư mục nháp của phiên, ngoài repo.
- Buộc phải ghi trong repo (công cụ ép đường dẫn · script cần cwd) ⇒ đặt tên `_scratch_*`, xoá trong cùng lượt; lệnh xoá đi qua `Rule_Gate_10_DestructiveOps`.
- Thêm pattern vào `.gitignore` không tính là đã dọn: file vẫn nằm trên đĩa và vẫn lớn lên.
- Dùng xong một file tạm ⇒ xoá ngay. Trần: một phiên giữ tối đa 5 file tạm cùng lúc; sắp vượt ⇒ xoá file cũ trước khi tạo file mới. Thứ giữ lại phải nhỏ và nói rõ giữ vì gì.
- Mã tạo thư mục tạm (test · script · công cụ) ⇒ tự xoá ở `finally`/`after`, kể cả khi lỗi hay bị huỷ. Bộ chạy test gom thư mục tạm của mọi tiến trình con vào một thư mục cha của lượt chạy và xoá khi xong. Phép kiểm: số thư mục trong thư mục tạm của hệ thống trước và sau một lượt chạy bằng nhau.
- Lối đúng: xoá file nháp đã dùng xong rồi tạo file mới · file buộc nằm trong repo thì đặt tên `_scratch_*` và xoá trong lượt.
- Phép kiểm: hook chặn tạo file mới trong thư mục nháp của phiên khi thư mục đó đã có 5 file (không có cờ vượt); pre-commit chặn `_scratch_*`.

## Ví dụ

- Tình huống: một phiên thử nghiệm mô hình, tải mô hình về, chụp ảnh màn hình, xuất vài bảng số đo để so.
- ✗ Sai: để mọi thứ lại "biết đâu cần", hoặc thêm thư mục vào `.gitignore` cho `git status` sạch; vài tuần sau ổ đĩa đầy mà không ai biết các file đó đến từ đâu.
- ✓ Đúng: mọi file tạm nằm trong thư mục nháp của phiên, dùng xong file nào xoá ngay file đó, giữ tối đa năm file cùng lúc.
