---
id: 02-22
name: die-with-backend
version: 1
kind: judgment
applies: [NonApp]
---
# 02-22 Bề mặt phụ thuộc tiến trình nền phải chết theo nền

- Phạm vi: launcher đang chờ · pipeline nhiều bước · job theo lịch · cửa sổ tool.
- Nền chết ⇒ bề mặt dừng theo hoặc báo lỗi thấy được; không để vỏ rỗng trông như đang chạy.
- Stage chết giữa chừng ⇒ mã thoát ≠ 0, nêu tên chặng.
- Cổng readiness hỏng ⇒ dừng chuỗi, không xuất file thiếu số.
- Deliverable ghi dở ⇒ coi là lỗi.
