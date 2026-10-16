---
id: Rule_45
aka: 02-45
name: ask-before-other-repo
version: 3
kind: action
---
# Rule_Gate_45_AskBeforeOtherRepo Cần đụng dự án khác thì dừng và hỏi trước

- Thấy cần đụng dự án hoặc thư mục khác ⇒ dừng, hỏi trước. Câu hỏi nêu rõ định làm gì, ở đâu, vì sao.
- Chỉ làm khi được chấp thuận trong phiên.
- Lý do: nơi khác có thể đang có agent hoặc phiên khác làm việc; đụng chéo gây xung đột dữ liệu.
- Phép kiểm: cổng `guard`.

## Ví dụ

- Tình huống: để hoàn thành báo cáo, agent cần sửa một file cấu hình nằm ở repo khác.
- ✗ Sai: sửa luôn rồi báo sau "đã sửa giúp bên kia".
- ✓ Đúng: dừng, hỏi một câu nêu rõ định sửa gì, ở đâu, vì sao; chỉ làm khi được đồng ý trong phiên.
