---
id: Rule_6
aka: 02-6
name: handoff-inline
version: 7
kind: judgment
code: 02_Work
---
# Rule_Keys_06_HandoffInline — A text sent once is printed in the answer, not saved as a file

## What
A one-time text for someone else (a handover, memo, report, prompt or note for another repo or department) is printed whole in
the answer. The repo keeps only what it runs or what defines what it runs.

## When
- The agent writes a text that goes to another person, repo or department once.

## Do
1. Print the whole text in the answer, ready to copy.
2. Do not write it into `tasks/` and do not attach a file.
3. Too long to read comfortably in the chat ⇒ ask whether to save it as a file.
4. Test for what the repo keeps: a spec · model · script · setting · ledger · reusable template. A one-time text is none of these.

## Example
- Situation: the agent needs the data team to add two columns to a table.
- ✗ Wrong: create a request file in the repo's task folder and tell the requester to open it and send it.
- ✓ Right: print the whole request in the answer so the requester can copy and send it; if it is very long, ask whether to save it.

## Check
- Keyword reminder: a request to write a message, memo or prompt for someone else shows this law.

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

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_02_ReaderText` — how a text for readers is written · cách viết văn bản cho người đọc
