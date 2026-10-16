---
id: Rule_28
aka: 02-28
name: output-i18n
version: 6
kind: judgment
from: _Store/01_RULES/Rule_Keys_28_OutputI18n @v6 #779aad18b284
---
# Rule_Keys_28_OutputI18n Chuỗi UI · CLI · script phụ: tiếng Anh hoặc i18n đủ hai bộ từ điển

- Chuỗi UI · output CLI · output script phụ: tiếng Anh, hoặc i18n đủ hai bộ từ điển (song ngữ, đổi qua nút setting).
- 0 chuỗi hardcode: mọi chuỗi người dùng thấy đi qua i18n.
- Thuật ngữ kỹ thuật, chuyên ngành giữ nguyên, không dịch (tên công nghệ · API · metric · viết tắt kỹ thuật; vd. FTS5 · vector · embed · token).
- Cổng chất lượng i18n: slot `Frontend_137_UiDictionary` (từ điển UI, nhóm D).

## Ví dụ

- Tình huống: thêm một nút mới trên giao diện và một dòng thông báo cho lệnh dòng lệnh.
- ✗ Sai: gõ thẳng nhãn tiếng Việt vào mã giao diện; lệnh in "Đã đồng bộ xong" ra terminal.
- ✓ Đúng: nhãn nút đi qua khoá i18n có đủ hai bộ từ điển; lệnh kỹ thuật in tiếng Anh ("Sync complete"); thuật ngữ như token, vector giữ nguyên.
