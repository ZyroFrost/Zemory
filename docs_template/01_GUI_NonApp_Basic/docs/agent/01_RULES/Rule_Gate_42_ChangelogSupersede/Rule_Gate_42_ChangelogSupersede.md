---
id: Rule_42
aka: 02-42
name: changelog-supersede
version: 3
kind: content
from: _Store/01_RULES/Rule_Gate_42_ChangelogSupersede @v3 #be52a733e69b
---
# Rule_Gate_42_ChangelogSupersede Entry đảo hoặc thay quyết định cũ

- Entry đảo hoặc thay một quyết định cũ ⇒ mở đầu bằng dòng
  `> 🔄 **Supersede:** thay [YYYY-MM-DDx] — "[đề mục]" — [lý do].`
- Nêu đúng khoá ngày của entry bị thay; máy nối bằng khoá đó để gắn nhãn "ĐÃ BỊ THAY" cho entry cũ.
- Ngày có nhiều entry mà không rõ khoá ⇒ bỏ qua, không đoán.
- Không sửa, không xoá entry cũ. Tuỳ chọn: thêm `> ⤴ Đã bị thay bởi [ngày].` vào entry cũ.
- Phép kiểm: cổng `validate`.

## Ví dụ

- Tình huống: hôm nay nhóm bỏ cách tính chiết khấu đã chốt trong một entry trước.
- ✗ Sai: viết entry mới mô tả cách tính mới mà không nhắc gì tới entry cũ, hoặc sửa thẳng entry cũ.
- ✓ Đúng: entry mới mở đầu bằng dòng Supersede nêu đúng khoá ngày của entry cũ và lý do; entry cũ giữ nguyên, máy tự gắn nhãn "đã bị thay".
