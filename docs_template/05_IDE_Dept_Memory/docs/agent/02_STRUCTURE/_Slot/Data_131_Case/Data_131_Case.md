---
id: Slot_131
aka: 03-131
name: case
version: 5
path: data/<case>/
from: _Store/02_STRUCTURE/_Slot/Data_131_Case @v5 #4e1f30277770
---
# Data_131_Case case — data làm việc của một case

- Vai trò:
  - Data làm việc của từng case, gitignore.
  - Xếp file theo thứ tự, câu đầu trúng là dừng: ① chính repo này đã gửi hay đẩy nó lên đích? ⇒ `03_output` · ② nhận từ
    ngoài và repo này chưa gửi lại (kể cả file người tiền nhiệm đã gửi) ⇒ `01_raw` · ③ pipeline sinh, không ai ngoài thấy ⇒
    `02_processing`. "Xoá đi có dựng lại được không" không phải tiêu chí: bản đã gửi dựng lại được vẫn là `03_output`.
  - Mở case là dựng đủ cả 3 chặng ngay, kể cả đang rỗng: `data/` không vào git nên khung rỗng không làm bẩn repo, còn thiếu khung
    thì file đầu tiên bị quăng bừa. Luật "không folder rỗng" áp cho slot git theo dõi, không áp ở đây.
  - Nằm riêng khỏi `tasks/<case>/` là ngoại lệ có chủ đích (file nặng).
- Được chứa / không chứa: CHIA ĐÚNG 3 CHẶNG: `01_raw/` · `02_processing/` · `03_output/`.
- Khuôn tên: Mirror ĐÚNG TÊN `tasks/<case>/`.
