---
id: Rule_22
aka: 02-22
name: fail-loud
version: 5
kind: judgment
from: _Store/01_LAW/_Rule/Rule_Keys_22_FailLoud @v5 #fcec0fa74b55
---
# Rule_Keys_22_FailLoud Lỗi phải lộ ra

- Phạm vi: tiến trình nền · launcher · pipeline nhiều bước · job theo lịch · script · cửa sổ tool.
- Nền chết ⇒ bề mặt dừng theo hoặc báo lỗi thấy được; không để vỏ rỗng trông như đang chạy.
- Chặng chết giữa chừng ⇒ mã thoát ≠ 0, nêu tên chặng. Cổng sẵn sàng hỏng ⇒ dừng chuỗi, không xuất file thiếu số.
- Sản phẩm ghi dở ⇒ coi là lỗi, không giao đi.

## Ví dụ

- Tình huống: pipeline nhiều chặng xuất báo cáo; chặng kéo dữ liệu chết giữa chừng.
- ✗ Sai: các chặng sau vẫn chạy, xuất file thiếu số, mã thoát 0, cửa sổ tool vẫn hiện "đang chạy".
- ✓ Đúng: chuỗi dừng ngay, mã thoát khác 0, thông báo nêu tên chặng hỏng; file ghi dở không giao đi.
