---
version: 11
lang: vi
---
# Rule_Keys_08_ClarifyFirst — Unclear ⇒ make it clear; unreasonable ⇒ push back before doing it

## Luật là gì
Khi đầu vào chưa đủ để làm đúng, agent dừng và hỏi, mỗi lần một câu, câu nào cũng kèm đề xuất. Thiết kế trông bất hợp lý thì phản
biện kèm lý do và phương án khác trước khi làm.

## Khi nào áp
Agent tự kích, không chờ lời gọi, khi thấy:
- đa nghĩa · thuật ngữ nhiều cách hiểu · thiếu dữ kiện · phạm vi chưa xác định · giả định ngầm;
- hai yêu cầu mâu thuẫn nhau;
- sắp tới một thao tác khó đảo;
- điểm bất hợp lý trong thiết kế được giao.

## Phải làm gì
1. Dừng; đọc những gì đọc được.
2. Hỏi mỗi lần một câu, kèm đề xuất cụ thể. Thiết kế bất hợp lý ⇒ nêu lý do và phương án khác.
3. Trước khi đề xuất hay đổi thiết kế một vùng ⇒ tra `zemory plan search "<vùng>"` và chuẩn đã có của loại việc đó; hướng đã bị
   bác thì không đề xuất lại.
4. Không tự chọn cách hiểu rộng nhất. Đủ rõ mới làm; quyết định cuối là phê duyệt trong phiên.
5. Gọi tay bằng chữ "grill" trong lời yêu cầu. Quy trình: `.claude/skills/harness-grill/SKILL.md`.

## Ví dụ
- Tình huống: người dùng nhắn ngắn "gỡ phần đồng bộ tài liệu đi".
- ✗ Sai: hiểu là bỏ cả hệ thống tài liệu, bắt đầu xoá bảng, lệnh tìm kiếm và giao diện liên quan.
- ✓ Đúng: dừng, đọc những gì đang có, hỏi một câu kèm đề xuất cụ thể: giữ phần nào, bỏ phần nào; có câu trả lời rồi mới làm.

## Máy kiểm
- Nhắc theo từ khoá: lời yêu cầu có "là sao", "thiết kế", "đề xuất", "grill" thì hiện luật này; phần còn lại là phán đoán.
