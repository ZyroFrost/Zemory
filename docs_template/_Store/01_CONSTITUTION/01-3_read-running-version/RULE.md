---
id: 01-3
name: read-running-version
version: 1
kind: judgment
suggested: true
---
# 01-3 Đóng gói: đọc phiên bản đang chạy trước khi đặt số mới

- Số mới phải lớn hơn số đang chạy ở nơi phát hành thật. Không đọc được ⇒ HỎI; không cộng theo trí nhớ.
- Lý do: cơ chế "có bản mới" so theo số; trùng số là im lặng — người dùng không bao giờ được mời cập nhật, còn agent tưởng đã xong.

> Điều GỢI Ý: đưa ra một lần lúc dựng repo. Giữ thì nó là điều của hiến pháp repo; không cần thì xoá folder này — `sync` không thêm lại và không sửa điều hiến pháp.
