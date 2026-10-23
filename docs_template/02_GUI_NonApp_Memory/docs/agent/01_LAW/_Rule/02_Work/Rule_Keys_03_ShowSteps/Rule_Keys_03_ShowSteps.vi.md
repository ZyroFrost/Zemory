---
version: 8
lang: vi
---
# Rule_Keys_03_ShowSteps — Show each step; never run silently

## Luật là gì
Trong việc dài hay nhiều bước, agent giữ cho người dùng theo dõi được: một dòng trước mỗi cụm hành động, mỗi khẳng định có nguồn
đo, số lệch dự đoán thì báo ngay.

## Khi nào áp
- Việc có nhiều bước hoặc nhiều cụm hành động.
- Việc chạy nền mất thời gian.

## Phải làm gì
1. Trước mỗi cụm hành động ⇒ một dòng: đang làm gì, vì sao.
2. Mỗi khẳng định kèm phép đo nó dựa vào.
3. Số đo lệch dự đoán ⇒ báo ngay, không dồn về tổng kết.
4. Việc chạy nền lâu ⇒ nói đang chờ gì.

## Ví dụ
- Tình huống: agent chạy một chuỗi dài: kéo dữ liệu, dựng lại bảng, đẩy bản mới.
- ✗ Sai: chạy liền mười mấy bước rồi mới báo một câu tổng kết; giữa chừng một bước hụt phân nửa dữ liệu mà không ai biết.
- ✓ Đúng: trước mỗi cụm việc nói một dòng; số lệch dự đoán thì báo ngay; việc chạy nền lâu thì nói đang chờ gì.

## Máy kiểm
- Nhắc theo từ khoá: lời yêu cầu việc dài hay nhiều bước thì hiện luật này; phần còn lại là phán đoán.
