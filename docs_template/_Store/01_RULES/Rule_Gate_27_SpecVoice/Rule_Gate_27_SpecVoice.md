---
id: Rule_27
aka: 02-27
name: spec-voice
version: 11
kind: judgment
---
# Rule_Gate_27_SpecVoice Văn phong harness là đặc tả kỹ thuật

- Phạm vi: hiến pháp · luật · cấu trúc · plan · skill.
- Viết câu mệnh lệnh ngắn, thuật ngữ chính xác, theo khuôn điều kiện → hành vi → phép kiểm.
- Không khẩu ngữ · cảm thán · hội thoại · kể chuyện.
- Không trích lời gốc của yêu cầu, không ghi ngày chốt. Lời gốc, bối cảnh, sự cố nằm ở `06_CHANGES` và Global Memory.

## Ví dụ

- Tình huống: thêm một luật mới sau một sự cố mất dữ liệu.
- ✗ Sai: ghi vào luật đoạn kể lại sự cố, kèm câu trích lời người giao việc và ngày chốt.
- ✓ Đúng: luật chỉ ghi điều kiện → hành vi → phép kiểm bằng câu mệnh lệnh ngắn; câu chuyện, lời gốc và ngày để ở changelog.
