---
version: 4
lang: vi
---
# Cons_Gate_16_Dependencies — Dependencies and environment

## Luật là gì
Mọi repo khai trong `Cons.md` của khung này: nền tảng hay nhà cung cấp bắt buộc, thành phần không có mã nguồn, máy dùng chung mà
sản phẩm chạy trên đó và giới hạn của nó, và hệ cũ còn chạy song song cùng quan hệ giữa hai hệ.

## Khi nào áp
- Thêm hay thay một nền tảng, nhà cung cấp, thành phần đóng.
- Sản phẩm chạy trên máy dùng chung.
- Một hệ mới thay hệ cũ mà hệ cũ còn chạy một thời gian.

## Phải làm gì
1. Điền bốn mục của `Cons.md`: bắt buộc · không có mã nguồn · môi trường dùng chung · hệ cũ.
2. Không có phụ thuộc đáng kể ⇒ `status: n/a` kèm lý do.

## Ví dụ
- Tình huống: một kho dữ liệu mới thay hệ báo cáo cũ điền `Cons.md` của khung này.
- ✗ Sai: không khai quan hệ với hệ cũ; agent cho hệ mới đọc số từ hệ cũ để "đỡ nạp lại", hai hệ dính nhau và không tắt được hệ cũ.
- ✓ Đúng: "Hệ cũ: giữ làm bản dự phòng tới khi hệ mới chạy ổn đủ một năm; hệ mới không bao giờ đọc dữ liệu từ hệ cũ, hệ cũ chỉ dùng
  để đối chiếu. Máy chủ dùng chung: đo dung lượng trống trước mỗi lần nạp lớn."

## Máy kiểm
- `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.
