---
id: Cons_3
aka: 01-3
name: read-running-version
version: 5
kind: judgment
applies: [App]
from: _Store/02_CONSTITUTION/Cons_Core_03_ReadRunningVersion @v5 #47077bdecdb6
---
# Cons_Core_03_ReadRunningVersion Đóng gói: đọc phiên bản đang chạy trước khi đặt số mới

- Số mới phải lớn hơn số đang chạy ở nơi phát hành thật. Không đọc được ⇒ HỎI; không cộng theo trí nhớ.
- Lý do: cơ chế "có bản mới" so theo số; trùng số là im lặng — người dùng không bao giờ được mời cập nhật, còn agent tưởng đã xong.

> Điều GỢI Ý: đưa ra một lần lúc dựng repo. Giữ thì nó là điều của hiến pháp repo; không cần thì xoá folder này — `sync` không thêm lại và không sửa điều hiến pháp.

## Ví dụ

- Tình huống: Một app desktop tự báo "có bản mới" bằng cách so số phiên bản. Agent vừa sửa xong và chuẩn bị đóng gói.
- ✗ Sai: Agent nhớ lần trước là 1.6.0 nên tự cộng lên 1.6.1, trong khi 1.6.1 đã được phát hành từ trước. Gói mới trùng số, máy người dùng không thấy thông báo, còn agent tưởng đã xong.
- ✓ Đúng: Trước khi đóng gói, đọc số đang chạy ở nơi phát hành thật (thư mục dùng chung, file version) rồi đặt số lớn hơn. Không đọc được thì hỏi, không đoán.
