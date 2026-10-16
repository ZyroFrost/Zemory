---
id: Cons_5
aka: 01-5
name: one-name-dictionary
version: 5
kind: judgment
applies: [App, NonApp]
---
# Cons_Core_05_OneNameDictionary Một concern một tên — có từ điển định danh, không trộn hai ngôn ngữ

- Chốt bảng tên nghiệp vụ → định danh trong code. Đổi tên thì đổi hết một lượt rồi chạy kiểm.
- Lý do: trộn tên dẫn tới hai hàm cùng việc khác tên, rồi hai hành vi khác nhau.

> Điều GỢI Ý: đưa ra một lần lúc dựng repo. Giữ thì nó là điều của hiến pháp repo; không cần thì xoá folder này — `sync` không thêm lại và không sửa điều hiến pháp.

## Ví dụ

- Tình huống: Một app đối soát có khái niệm "khoản lệch". Có chỗ trong code gọi nó là `lech`, chỗ khác gọi là `gap`.
- ✗ Sai: Mỗi lần sửa lại đặt thêm một tên theo thói quen. Dần dần có hai hàm cùng tính "lệch" theo hai cách, và một loại cảnh báo lưu bằng tên cũ hiện ra dưới dạng mã thô.
- ✓ Đúng: Chốt một bảng từ điển, ví dụ lệch → `gap`, bù → `credit`. Khi đổi tên thì đổi một lượt cả code lẫn dữ liệu đã lưu, rồi chạy kiểm và tìm lại xem còn sót tên cũ không.
