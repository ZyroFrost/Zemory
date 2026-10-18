---
id: Cons_9
name: purpose
version: 2
kind: content
code: 01_Scope
frame: true
---
# Cons_Gate_09_Purpose Mục đích và ưu tiên tối cao

- Repo phải khai trong `Cons.md` của khung này: sản phẩm làm gì · cho ai · giải bài toán gì · ưu tiên tối cao khi hai mục tiêu xung đột · việc nằm ngoài phạm vi.
- Viết 2–6 câu, đủ để một agent lạ hiểu sản phẩm mà không đọc mã.
- Khung này không có lối `n/a`: repo nào cũng có mục đích.
- Lối đúng: viết `Cons.md` theo mẫu, đặt `status: written`.
- Phép kiểm: `conform` đỏ khi `Cons.md` thiếu, `status` khác `written`, hoặc còn dấu mẫu `<…>`.

## Ví dụ

- Tình huống: một app đối soát doanh thu giữa máy bán hàng và kế toán viết `Cons.md` cho khung này.
- ✗ Sai: chép nguyên mẫu, chỉ đổi tên sản phẩm; mục ưu tiên tối cao để trống nên agent không biết chọn gì khi phải đánh đổi tốc độ lấy độ đủ.
- ✓ Đúng: "Làm gì: phát hiện mọi khoản lệch giữa máy bán hàng và sổ kế toán, cho kế toán cửa hàng. Ưu tiên tối cao: không bao giờ để mất một khoản lệch đã phát hiện, kể cả khi phải chậm hơn. Ngoài phạm vi: không sửa số liệu ở hệ nguồn."
