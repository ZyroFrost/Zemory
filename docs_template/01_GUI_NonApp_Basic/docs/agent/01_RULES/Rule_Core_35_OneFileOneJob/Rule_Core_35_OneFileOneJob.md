---
id: Rule_35
aka: 02-35
name: one-file-one-job
version: 5
kind: judgment
from: _Store/01_RULES/Rule_Core_35_OneFileOneJob @v5 #ee822069923d
---
# Rule_Core_35_OneFileOneJob Mỗi file harness một việc, không lặp nội dung file khác

- Vai trò: `01` hiến pháp · `02` luật làm việc · `03` chuẩn cấu trúc (chỗ để file + từ điển) · `04` sổ đăng ký skill · `05` backlog · `06` changelog · `.claude/skills/` quy trình (playbook).
- Một nội dung sống ở một nhà; nơi khác dẫn chiếu (link + số hiệu), không chép lại.
- Hồ sơ NON-APP: từ điển dữ liệu có một nhà duy nhất: khuôn ở slot `Docs_138_DataDictionary`, giá trị ở `03_STRUCTURE/INDEX.md` của repo.

## Ví dụ

- Tình huống: thêm quy ước đặt tên thư mục cho repo.
- ✗ Sai: chép nguyên quy ước vào cả file luật, file cấu trúc và một skill — vài tuần sau ba bản nói ba kiểu.
- ✓ Đúng: quy ước nằm ở một file đúng vai (file cấu trúc); chỗ khác chỉ ghi link + số hiệu.
