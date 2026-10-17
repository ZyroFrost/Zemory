---
id: Rule_3
aka: 02-3
name: show-steps
version: 5
kind: judgment
from: _Store/01_LAW/_Rule/Rule_Keys_03_ShowSteps @v5 #4c0f1470733c
---
# Rule_Keys_03_ShowSteps Hiện từng bước, không chạy im lặng

- Trước mỗi cụm hành động ⇒ nói một dòng: đang làm gì, vì sao.
- Mỗi khẳng định kèm nguồn đo.
- Số đo lệch dự đoán ⇒ báo ngay, không dồn về tổng kết.
- Việc chạy nền lâu ⇒ báo đang chờ gì.

## Ví dụ

- Tình huống: agent chạy một chuỗi dài: kéo dữ liệu, dựng lại bảng, đẩy bản mới.
- ✗ Sai: chạy liền mười mấy bước rồi mới báo một câu tổng kết; giữa chừng một bước hụt phân nửa dữ liệu mà không ai biết.
- ✓ Đúng: trước mỗi cụm việc nói một dòng đang làm gì; số lệch dự đoán thì báo ngay; việc chạy nền lâu thì báo đang chờ gì.
