---
id: Slot_122
aka: 03-122
name: queries
version: 3
path: queries/
---
# Slot_Queries_122_Queries queries — SQL/DAX/M đặt tên dùng chung

- Vai trò:
  - SQL / DAX / M đặt tên, gọi theo tên — không rải inline (đối xứng `store/queries.*` của hệ APP).
  - Query check NHIỀU case dùng chung → `queries/check_*.sql` (ngoại lệ của luật 1 case 1 folder).
  - Phải tính đúng như từ điển dữ liệu; thấy lệch ⇒ BÁO, không tự sửa.
- Được chứa / không chứa: Không chứa: query chỉ một case dùng (→ `tasks/<case>/check_*.sql`).
