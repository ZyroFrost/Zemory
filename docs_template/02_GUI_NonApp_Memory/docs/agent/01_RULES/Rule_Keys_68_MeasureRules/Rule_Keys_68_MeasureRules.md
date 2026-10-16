---
id: Rule_68
aka: 02-68
name: measure-rules
version: 4
kind: judgment
from: _Store/01_RULES/Rule_Keys_68_MeasureRules @v4 #8c24f0e77f96
---
# Rule_Keys_68_MeasureRules Ba luật đo

- Probe tự dựng phải sao chép đủ tham số của thước chính thức.
- N phép thử cùng hỏng theo một hướng ⇒ nghi thước trước, không nghi N thiết kế.
- Số đo phải khớp chi phí vật lý của việc đó. Nhanh bất thường (ví dụ nhúng ONNX xong trong vài chục ms) là xanh giả cho tới khi chứng minh được điều ngược lại.

## Ví dụ

- Tình huống: agent viết một script kiểm nhanh để xem bản sửa tìm kiếm có tốt hơn không.
- ✗ Sai: script dùng tham số khác bộ đo chính thức, chạy xong trong vài chục mili giây với việc lẽ ra mất vài giây, rồi báo "đã cải thiện".
- ✓ Đúng: chép đủ tham số của bộ đo chính thức; thấy nhanh bất thường thì coi là chưa đo được; nhiều phép thử cùng hỏng một kiểu thì kiểm lại thước trước.
