---
id: 03-131
name: case
version: 1
path: data/<case>/
applies: [NonApp]
---
# 03-131 case — data làm việc của một case

- Vai trò:
  - Data làm việc của từng case, gitignore.
  - Phép thử xếp file: xoá đi có dựng lại được không? KHÔNG ⇒ `01_raw` · CÓ, và không ai ngoài thấy ⇒ `02_processing` · CÓ, và đem giao/đẩy đi ⇒ `03_output`.
  - Nằm riêng khỏi `tasks/<case>/` là ngoại lệ có chủ đích (file nặng).
- Được chứa / không chứa: CHIA ĐÚNG 3 CHẶNG: `01_raw/` · `02_processing/` · `03_output/`.
- Khuôn tên: Mirror ĐÚNG TÊN `tasks/<case>/`.
