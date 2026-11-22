---
id: Rule_25
aka: 02-25
name: rule
version: 1
kind: content
---
# Rule_Gate_25_Rule 

02-25 SQL — 1 CÁCH         mặc định store/queries.* (gom, đặt tên, gọi theo tên; domain-first ⇒ <domain>/store/queries.*); resources/sql/ CHỈ khi cố ý tách file .sql. KHÔNG rải inline. ① TRƯỚC khi viết SQL tra store/queries — có câu chuẩn thì GỌI LẠI theo tên · ② chưa có thì THÊM MỘT câu có tên vào đó, không viết tại chỗ · ③ bản thừa sẵn có phải DỌN. Code chạy dạng CHUỖI (worker eval) không import được ⇒ truyền câu có tên qua workerData. Repo có nợ cũ ⇒ cổng ratchet: số SQL viết tại chỗ chỉ được GIẢM (zemory: `sql-one-way.test`, plan/27 §2g) <!-- gate: guard -->
