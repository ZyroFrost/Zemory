---
id: Cons_16
name: dependencies
version: 2
kind: content
code: 03_System
frame: true
---
# Cons_Gate_16_Dependencies Phụ thuộc và môi trường

- Repo phải khai trong `Cons.md` của khung này: nền tảng hoặc nhà cung cấp bắt buộc · thành phần không có mã nguồn · máy dùng chung và giới hạn tài nguyên · hệ cũ còn chạy song song và quan hệ với hệ mới.
- Không có phụ thuộc đáng kể ⇒ `status: n/a` kèm lý do.
- Lối đúng: viết `Cons.md` theo mẫu, hoặc ghi `status: n/a` kèm lý do.
- Phép kiểm: `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.

## Ví dụ

- Tình huống: một kho dữ liệu mới thay hệ báo cáo cũ viết `Cons.md` cho khung này.
- ✗ Sai: không khai quan hệ với hệ cũ; agent cho hệ mới đọc số từ hệ cũ để "đỡ nạp lại", hai hệ dính nhau và không tắt được hệ cũ.
- ✓ Đúng: "Hệ cũ: giữ nguyên làm bản dự phòng tới khi hệ mới chạy ổn đủ một năm; hệ mới không bao giờ đọc dữ liệu từ hệ cũ, hệ cũ chỉ dùng để đối chiếu. Máy chủ dùng chung: đo dung lượng trống trước mỗi lần nạp lớn."
