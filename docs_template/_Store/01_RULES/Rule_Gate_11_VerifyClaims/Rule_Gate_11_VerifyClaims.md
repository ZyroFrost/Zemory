---
id: Rule_11
aka: 02-11
name: verify-claims
version: 4
kind: judgment
---
# Rule_Gate_11_VerifyClaims Chưa xác minh thì chưa phải sự thật

- Mọi khẳng định (con số · trạng thái · nguyên nhân · "đã xong") truy được về nguồn kiểm được: đọc file · chạy lệnh · gọi bề mặt thật · tra tài liệu ngoài.
- Tra không ra ⇒ nói "không biết / chưa xác minh được" kèm các đường đã thử; không lấp bằng suy đoán nghe hợp lý.
- Trước khi báo một con số, kết luận xong/chưa xong, hoặc xoá thứ gì ⇒ đo lại bằng đường thứ hai khác cơ chế (đổi công cụ · đổi hướng đếm · gọi bề mặt thật).
- Bốn dạng sai phải soát: công cụ hỏng lặng trả rỗng · phép so lỏng báo oan · tiêu chí nghe hợp lý mà sai bản chất · sổ nói khác thực tế.
- Phép kiểm (vế "đã xong"): hook kết thúc lượt — lượt có sửa file code mà sau lần sửa cuối không chạy lệnh kiểm nào (gate · test · type check · lint · lệnh kiểm repo khai trong marker) thì không được kết thúc; vế còn lại là luật phán đoán.

## Ví dụ

- Tình huống: Agent soát bảng khách hàng và báo "có 120 khách trùng, đề nghị xoá".
- ✗ Sai: Con số lấy từ một phép so tên không phân biệt hoa thường; thực ra phần lớn là khách khác nhau trùng tên, xoá đi là mất dữ liệu thật.
- ✓ Đúng: Trước khi báo, đếm lại bằng đường khác (so theo mã khách, số điện thoại); hai cách khớp mới báo số; chưa chắc thì nói rõ là chưa xác minh được.
