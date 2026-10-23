---
version: 11
lang: vi
---
# Rule_Gate_04_ScratchFiles — A scratch file has a way out

## Luật là gì
Thứ tạo ra để làm việc mà không giao đi (script dò · dữ liệu đo · dữ liệu trung gian · model tải về · ảnh chụp · bản nháp · bản thử
· bản sao để so) nằm trong thư mục nháp của phiên, ngoài repo, và xoá khi dùng xong. Một phiên giữ tối đa 5 file nháp cùng lúc.

## Khi nào áp
- Sắp tạo một file không thuộc thứ repo giao đi.
- Viết mã (test · script · công cụ) có tạo thư mục tạm.

## Phải làm gì
1. Đặt file trong thư mục nháp của phiên, ngoài repo.
2. Công cụ ép nằm trong repo (đòi đúng đường dẫn · script cần đúng thư mục làm việc) ⇒ đặt tên `_scratch_*` và xoá trong cùng
   lượt; xoá đường `_scratch_*` không cần cờ (`Rule_Gate_10_DestructiveOps`).
3. Công cụ hỏng với đường dài (giới hạn độ dài đường dẫn của Windows cắt file lặng lẽ) ⇒ bản sao được đặt ở thư mục ngắn ở gốc ổ,
   ngoài mọi repo; hỏi trước (`Rule_Gate_44_RepoScope`) và xoá khi xong.
4. Dùng xong một file nháp ⇒ xoá ngay. Sắp vượt 5 ⇒ xoá file cũ trước khi tạo file mới. Thứ giữ lại phải nhỏ và nói rõ giữ vì gì.
5. Thêm pattern vào `.gitignore` không tính là đã dọn: file vẫn nằm trên đĩa và vẫn lớn lên.
6. Mã tạo thư mục tạm đặt tên `_scratch_<tên>-` và tự xoá ở `finally` / `after`, kể cả khi lỗi hay bị huỷ. Bộ chạy test gom thư mục tạm của mọi tiến trình con
   vào một thư mục cha của lượt chạy và xoá khi xong.

## Ví dụ
- Tình huống: một phiên thử nghiệm mô hình: tải mô hình về, chụp ảnh màn hình, xuất vài bảng số đo để so.
- ✗ Sai: để mọi thứ lại "biết đâu cần", hoặc thêm thư mục vào `.gitignore` cho `git status` sạch; vài tuần sau ổ đĩa đầy mà không
  ai biết các file đó đến từ đâu.
- ✓ Đúng: mọi file nháp nằm trong thư mục nháp của phiên, dùng xong file nào xoá ngay file đó, không bao giờ quá năm file cùng lúc.

## Máy kiểm
- Hook chặn tạo file mới trong thư mục nháp của phiên khi thư mục đó đã có 5 file (không có cờ vượt).
- Pre-commit chặn `_scratch_*`.
- Số thư mục trong thư mục tạm của hệ thống trước và sau một lượt chạy test bằng nhau.
