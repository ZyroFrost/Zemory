---
id: Rule_27
aka: 02-27
name: harness-language
version: 13
kind: judgment
from: _Store/01_LAW/_Rule/Rule_Gate_27_HarnessLanguage @v13 #c9e8642bee38
---
# Rule_Gate_27_HarnessLanguage Ngôn ngữ và văn phong của docs harness

- Docs harness (`docs/agent` · `docs/plan` · thân skill) viết tiếng Việt có dấu.
- Văn phong đặc tả: câu mệnh lệnh ngắn, thuật ngữ chính xác, khuôn điều kiện → hành vi → phép kiểm. Không khẩu ngữ · cảm thán · kể chuyện.
- Không trích lời gốc của yêu cầu, không ghi ngày chốt; lời gốc, bối cảnh, sự cố nằm ở `05_CHANGES` và Global Memory.
- Lối đúng: bỏ lời trích, ngày chốt, tên người khỏi docs harness; chuyển sang `05_CHANGES`.
- Phép kiểm: hook chặn lời trích · ngày chốt · email · đường dẫn mang tên người trong docs harness; tiếng Việt mất dấu bị chặn theo `Rule_Gate_31_NoBrokenVietnamese`; giọng văn là phán đoán.

## Ví dụ

- Tình huống: thêm một luật mới sau một sự cố mất dữ liệu.
- ✗ Sai: ghi vào luật đoạn kể lại sự cố, kèm câu trích lời người giao việc và ngày chốt.
- ✓ Đúng: luật chỉ ghi điều kiện → hành vi → phép kiểm; câu chuyện, lời gốc và ngày để ở changelog.
