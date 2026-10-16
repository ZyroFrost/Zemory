---
id: Rule_25
aka: 02-25
name: sql-one-way
version: 5
kind: content
from: _Store/01_RULES/Rule_Gate_25_SqlOneWay @v5 #f7eaa6013d92
---
# Rule_Gate_25_SqlOneWay SQL · DAX · M: một cách, gom một chỗ, gọi theo tên

- Nơi đặt mặc định:
  - App: `store/queries.*` (domain-first ⇒ `<domain>/store/queries.*`); `resources/sql/` CHỈ khi cố ý tách file `.sql`.
  - Non-app: SQL · DAX · M gom vào `queries/` hoặc `measures/` (đối xứng `store/queries` của app).
- Mỗi câu có tên, gọi theo tên. KHÔNG viết rải inline tại chỗ.
- Trình tự khi cần một câu:
  1. TRƯỚC khi viết, tra kho câu có tên — có câu chuẩn thì GỌI LẠI theo tên.
  2. Chưa có ⇒ THÊM MỘT câu có tên vào kho, không viết tại chỗ.
  3. Bản thừa sẵn có ⇒ DỌN.
- Code chạy dạng CHUỖI (worker eval) không import được ⇒ truyền câu có tên qua `workerData`.
- Repo có nợ cũ ⇒ cổng ratchet: số câu SQL viết tại chỗ chỉ được GIẢM.
- Phép kiểm: cổng `guard`.

## Ví dụ

- Tình huống: cần đếm đơn hàng theo cửa hàng cho một báo cáo mới.
- ✗ Sai: viết thẳng câu `SELECT … GROUP BY` ngay trong hàm báo cáo, trong khi kho câu đã có một câu gần giống — giờ hai bản sẽ lệch nhau khi sửa.
- ✓ Đúng: tra kho câu có tên trước; có thì gọi lại theo tên, chưa có thì thêm một câu có tên vào kho rồi gọi; bản trùng cũ thì dọn.
