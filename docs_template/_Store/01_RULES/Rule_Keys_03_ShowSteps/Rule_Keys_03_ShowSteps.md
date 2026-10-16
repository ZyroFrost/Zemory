---
id: Rule_3
aka: 02-3
name: show-steps
version: 4
kind: judgment
---
# Rule_Keys_03_ShowSteps Hiện từng bước, không chạy im lặng

- Trước mỗi cụm hành động ⇒ nói một dòng: đang làm gì, vì sao.
- Mỗi khẳng định kèm nguồn đo.
- Số đo lệch dự đoán ⇒ báo ngay, không dồn về tổng kết.
- Việc chạy nền lâu ⇒ báo đang chờ gì.

## Ví dụ

- Tình huống: Agent chạy một chuỗi dài: kéo dữ liệu, dựng lại bảng, đẩy bản mới.
- ✗ Sai: Chạy liền mười mấy bước rồi mới báo một câu tổng kết; giữa chừng một bước hụt phân nửa dữ liệu mà không ai biết.
- ✓ Đúng: Trước mỗi cụm việc nói một dòng đang làm gì; đo xong thấy số lệch dự đoán thì báo ngay; việc chạy nền lâu thì báo đang chờ gì.
