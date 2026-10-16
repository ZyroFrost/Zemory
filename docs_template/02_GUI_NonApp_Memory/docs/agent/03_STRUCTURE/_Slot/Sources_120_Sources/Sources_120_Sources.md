---
id: Slot_120
aka: 03-120
name: sources
version: 4
path: sources/
from: _Store/03_STRUCTURE/_Slot/Sources_120_Sources @v4 #d37b28930ce5
---
# Sources_120_Sources sources — định nghĩa nguồn

- Vai trò:
  - ĐỊNH NGHĨA nguồn: Power Query (M) · connection spec · SQL kéo nguồn — chỗ automation KÉO đọc. Dùng chung nhiều case.
  - KÉO (pull): đọc `sources/` → kéo raw về `data/extract/`.
- Được chứa / không chứa: Trỏ secret bằng TÊN env, không chứa secret thật. Không chứa config của một case (→ gốc `tasks/<case>/`).
- Khuôn tên: Tên `sources/` — không dùng `src` hay `raw`.
