---
id: Rule_22
aka: 02-22
name: die-with-backend
version: 3
kind: judgment
applies: [NonApp]
from: _Store/01_RULES/Rule_Keys_22_DieWithBackend @v3 #ce5503e5999a
---
# Rule_Keys_22_DieWithBackend Bề mặt phụ thuộc tiến trình nền phải chết theo nền

- Phạm vi: launcher đang chờ · pipeline nhiều bước · job theo lịch · cửa sổ tool.
- Nền chết ⇒ bề mặt dừng theo hoặc báo lỗi thấy được; không để vỏ rỗng trông như đang chạy.
- Stage chết giữa chừng ⇒ mã thoát ≠ 0, nêu tên chặng.
- Cổng readiness hỏng ⇒ dừng chuỗi, không xuất file thiếu số.
- Deliverable ghi dở ⇒ coi là lỗi.
