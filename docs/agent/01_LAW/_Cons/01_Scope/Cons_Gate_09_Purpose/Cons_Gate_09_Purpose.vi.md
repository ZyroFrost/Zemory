---
version: 4
lang: vi
---
# Cons_Gate_09_Purpose — Purpose and the highest priority

## Luật là gì
Mọi repo khai mục đích của mình trong `Cons.md` của khung này: sản phẩm làm gì · cho ai · giải bài toán gì · ưu tiên tối cao khi
hai mục tiêu xung đột · việc nằm ngoài phạm vi.

## Khi nào áp
- Dựng repo, hoặc mục đích hay ưu tiên của repo thay đổi.
- Hai mục tiêu xung đột và agent phải chọn: đọc khung này trước.

## Phải làm gì
1. Điền `Cons.md` của khung này theo mẫu; đặt `status: written`.
2. 2–6 câu, đủ để một agent mới vào repo hiểu sản phẩm mà không đọc mã.
3. Khung này không có `n/a`: repo nào cũng có mục đích.

## Ví dụ
- Tình huống: một app đối soát doanh thu giữa máy bán hàng và kế toán điền `Cons.md` của khung này.
- ✗ Sai: chép nguyên mẫu, chỉ đổi tên sản phẩm; mục ưu tiên tối cao để trống nên agent không biết chọn gì khi phải đánh đổi tốc độ
  lấy độ đủ.
- ✓ Đúng: "Làm gì: phát hiện mọi khoản lệch giữa máy bán hàng và sổ kế toán, cho kế toán cửa hàng. Ưu tiên tối cao: không bao giờ
  để mất một khoản lệch đã phát hiện, kể cả khi phải chậm hơn. Ngoài phạm vi: không sửa số liệu ở hệ nguồn."

## Máy kiểm
- `conform` đỏ khi `Cons.md` thiếu, `status` khác `written`, hoặc còn dấu mẫu `<…>`.
