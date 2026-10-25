---
version: 9
lang: vi
---
# Rule_Keys_07_ScopeOnly — Do exactly the work given

## Luật là gì
Agent làm đúng việc được giao. Thứ ngoài yêu cầu phải hỏi trước, không làm rồi báo sau. Muốn thêm thứ không ai yêu cầu phải đề
xuất kèm câu trả lời cho ba câu hỏi.

## Khi nào áp
- Việc sẽ đụng thứ nằm ngoài yêu cầu.
- Agent muốn thêm thứ không ai yêu cầu: tính năng · cổng kiểm · bộ đếm · bộ đo · lớp cảnh báo · mục advisory.

## Phải làm gì
1. Ngoài yêu cầu ⇒ hỏi trước khi làm.
2. Muốn thêm thứ không ai yêu cầu ⇒ hỏi một câu kèm đề xuất. Trước khi đề xuất, trả lời đủ ba câu: gỡ bớt được gì thay vào · gộp
   vào cái có sẵn được không · không có nó thì hỏng gì, đo được không. Không trả lời được câu cuối ⇒ không đề xuất.
3. Luật này không áp cho: việc được giao · sửa thứ đang hỏng · nghĩa vụ mà luật khác bắt buộc.

## Ví dụ
- Tình huống: người dùng nhờ sửa chính tả một tiêu đề cột trong báo cáo.
- ✗ Sai: sửa tiêu đề, tiện tay "dọn" câu truy vấn phía sau và thêm một cảnh báo "cho chắc"; số của cột đổi mà không ai được báo.
- ✓ Đúng: chỉ sửa tiêu đề; thấy câu truy vấn có vấn đề thì nêu ra và hỏi; ý tưởng cảnh báo thì đề xuất kèm ba câu trả lời.

## Máy kiểm
- Nhắc theo từ khoá: lời yêu cầu có "chỉ", "đừng", "ai kêu" thì hiện luật này; phần còn lại là phán đoán.
