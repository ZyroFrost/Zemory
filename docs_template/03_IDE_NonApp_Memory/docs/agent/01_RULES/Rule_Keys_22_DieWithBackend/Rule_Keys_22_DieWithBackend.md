---
id: Rule_22
aka: 02-22
name: die-with-backend
version: 4
kind: judgment
applies: [NonApp]
from: _Store/01_RULES/Rule_Keys_22_DieWithBackend @v4 #02e60d6dad3a
---
# Rule_Keys_22_DieWithBackend Bề mặt phụ thuộc tiến trình nền phải chết theo nền

- Phạm vi: launcher đang chờ · pipeline nhiều bước · job theo lịch · cửa sổ tool.
- Nền chết ⇒ bề mặt dừng theo hoặc báo lỗi thấy được; không để vỏ rỗng trông như đang chạy.
- Stage chết giữa chừng ⇒ mã thoát ≠ 0, nêu tên chặng.
- Cổng readiness hỏng ⇒ dừng chuỗi, không xuất file thiếu số.
- Deliverable ghi dở ⇒ coi là lỗi.

## Ví dụ

- Tình huống: pipeline nhiều chặng xuất báo cáo; chặng kéo dữ liệu chết giữa chừng.
- ✗ Sai: các chặng sau vẫn chạy, xuất ra file báo cáo thiếu số, mã thoát 0, cửa sổ tool vẫn hiện "đang chạy".
- ✓ Đúng: chuỗi dừng ngay, mã thoát khác 0, thông báo nêu đúng tên chặng hỏng; file ghi dở bị coi là lỗi, không giao đi.
