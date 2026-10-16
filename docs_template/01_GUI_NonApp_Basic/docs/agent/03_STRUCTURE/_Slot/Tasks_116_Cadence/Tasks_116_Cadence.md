---
id: Slot_116
aka: 03-116
name: cadence
version: 4
path: tasks/<cadence>/
from: _Store/03_STRUCTURE/_Slot/Tasks_116_Cadence @v4 #ada3cb906648
---
# Tasks_116_Cadence cadence — case định kỳ

- Vai trò:
  - Case ĐỊNH KỲ / tự động (report tuần, target quý). Data thật → `data/<case>/` (mirror ĐÚNG TÊN).
  - Pipeline ở `tasks/<tên>/pipeline/`, launcher ở `bin/<tên>.cmd`.
- Được chứa / không chứa: Không chứa: file định kỳ quăng vào `data/adhoc/` — cái gì thuộc deliverable định kỳ phải ở `tasks/<task>/` + `data/<task>/`.
- Khuôn tên: Tên thường, không số. Khuôn `<MÃ_PHÒNG>_<NHỊP>_<TênViệc>` là quy ước của từng repo, chuẩn không ép.
