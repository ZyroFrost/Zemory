---
version: 8
lang: vi
---
# Rule_Keys_06_HandoffInline — A text sent once is printed in the answer, not saved as a file

## Luật là gì
Văn bản gửi người khác một lần (bàn giao, memo, báo cáo, prompt, ghi chú cho repo hay phòng khác) in nguyên khối trong câu trả
lời. Repo chỉ giữ thứ nó chạy hoặc thứ định nghĩa việc nó chạy.

## Khi nào áp
- Agent viết một văn bản gửi một lần cho người, repo hay phòng khác.

## Phải làm gì
1. In nguyên khối trong câu trả lời, sẵn để chép.
2. Không ghi vào `tasks/`, không đính kèm file.
3. Dài tới mức khó đọc trong chat ⇒ hỏi có lưu thành file không.
4. Phép thử thứ repo giữ: spec · model · script · cấu hình · sổ · mẫu dùng lại. Văn bản gửi một lần không thuộc loại nào trong đó.

## Ví dụ
- Tình huống: agent cần nhờ nhóm dữ liệu bổ sung hai cột cho một bảng.
- ✗ Sai: tạo file yêu cầu trong thư mục việc của repo rồi bảo người dùng mở file đó ra gửi.
- ✓ Đúng: in nguyên khối lời nhờ trong câu trả lời để người dùng chép gửi; quá dài thì hỏi có muốn lưu thành file không.

## Máy kiểm
- Nhắc theo từ khoá: lời yêu cầu soạn tin, memo hay prompt cho người khác thì hiện luật này.
