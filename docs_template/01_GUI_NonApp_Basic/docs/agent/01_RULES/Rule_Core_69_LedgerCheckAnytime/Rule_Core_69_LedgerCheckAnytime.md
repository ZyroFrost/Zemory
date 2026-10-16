---
id: Rule_69
aka: 02-69
name: ledger-check-anytime
version: 3
kind: judgment
from: _Store/01_RULES/Rule_Core_69_LedgerCheckAnytime @v3 #dc1f083ac151
---
# Rule_Core_69_LedgerCheckAnytime Soát sổ lúc chốt phiên theo `Rule_Keys_12_TodoRecheck`

- Soát hoặc ghi `05_TODO` · `06_CHANGES` · plan lúc chốt phiên ⇒ áp `Rule_Keys_12_TodoRecheck`.
- `Rule_Keys_12_TodoRecheck` áp mọi lúc, không riêng lúc chốt phiên.

## Ví dụ

- Tình huống: giữa phiên, người dùng hỏi "sổ việc còn gì chưa làm?".
- ✗ Sai: đọc sổ rồi liệt kê lại nguyên văn, để dành việc kiểm cho lúc chốt phiên.
- ✓ Đúng: đo lại từng mục ngay lúc đó bằng mã, lịch sử phiên và chạy thật; mục nào đã xong thì đóng, mục nào không xác minh được thì nói rõ.
