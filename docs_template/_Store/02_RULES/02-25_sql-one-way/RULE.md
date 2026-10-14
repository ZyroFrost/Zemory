---
id: 02-25
name: sql-one-way
version: 1
kind: content
applies: [App]
---
# 02-25 SQL — một cách

- Câu SQL nằm ở `store/queries.*` (tổ chức theo domain: `<domain>/store/queries.*`), mỗi câu một tên, nơi dùng gọi theo
  tên. `resources/sql/` chỉ dùng khi cố ý tách file `.sql`.
- Trước khi viết SQL: tra `store/queries`. Có câu chuẩn ⇒ gọi lại theo tên. Chưa có ⇒ thêm MỘT câu có tên vào đó, không
  viết tại chỗ.
- Bản trùng sẵn có phải dọn về một câu có tên.
- Mã chạy dạng chuỗi (worker eval) không import được ⇒ truyền câu có tên qua `workerData`.
- Repo còn nợ cũ ⇒ cổng ratchet: số SQL viết tại chỗ chỉ được giảm.
- Phép kiểm: hook chặn lúc ghi khi một Write/Edit thêm chuỗi SQL viết tại chỗ ngoài `store/`. Hook chỉ chạy khi repo đã có
  ít nhất một file `store/queries.*`.
