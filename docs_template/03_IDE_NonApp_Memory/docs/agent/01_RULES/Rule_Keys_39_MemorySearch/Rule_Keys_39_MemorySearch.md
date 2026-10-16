---
id: Rule_39
aka: 02-39
name: memory-search
version: 4
kind: judgment
from: _Store/01_RULES/Rule_Keys_39_MemorySearch @v4 #b9fa769064db
---
# Rule_Keys_39_MemorySearch Tra Global Memory cho việc ở phiên khác

- Cần biết một việc · lỗi · quyết định đã xảy ra ở phiên khác ⇒ tra `zemory memory search "<q>" [--all]`.
- Tra đúng câu hỏi đang cần trả lời, không tra bừa.

## Ví dụ

- Tình huống: một bản đồng bộ giữa hai máy lỗi; phiên mới bắt đầu chẩn đoán.
- ✗ Sai: đọc mã và thử lại từ đầu, mất nửa ngày để ra đúng kết luận đã có ở một phiên tuần trước.
- ✓ Đúng: chạy `zemory memory search "<chủ đề>" --all` trước, đọc hit của người giao việc, nêu "đã chốt ở #id", rồi chỉ làm phần mới.
