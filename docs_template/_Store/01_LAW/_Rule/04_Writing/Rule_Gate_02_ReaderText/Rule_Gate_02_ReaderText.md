---
id: Rule_2
aka: 02-2
name: reader-text
version: 10
kind: action
code: 04_Writing
---
# Rule_Gate_02_ReaderText — Text for readers

## What
Reports, e-mails, delivered documents and UI text are written for the person who receives them: plain sentences, business words,
enough to read on their own. Never the harness voice.

## When
- Writing a report · an e-mail · a delivered document · text on a UI or a report page.

## Do
1. Write for the receiver. No harness voice: no commands, no capitals for emphasis, no internal terms.
2. Labels the reader sees (UI · report page · column title · chart caption) use business words, not table · column · internal
   code names. Exception: a place that shows the technical side on purpose (a query viewer · a column description box).
3. Enough to read: tables have column titles · pictures have captions · each number has its unit and period · one term, one name
   (`Rule_Gate_35_OneHome`).
4. Open the writing-style skill before writing: `.claude/skills/doc-write-style/SKILL.md`.

## Example
- Situation: the agent writes the weekly report e-mail to the head of another department, with a table of numbers.
- ✗ Wrong: whole sentences in capitals for emphasis, column titles that are database column names, numbers without unit or period.
- ✓ Right: open the writing-style skill first, write normal sentences, business words for column titles, unit and period on each
  number.

## Check
- A hook reminds to read the skill at the first write of a delivered text in a session.
- The read-first latch asks for the skill before a mail script runs.

## Luật là gì
Báo cáo, email, tài liệu giao đi và chữ trên giao diện viết cho người nhận: câu thường, từ nghiệp vụ, tự đọc hiểu được. Không bao
giờ mang giọng harness.

## Khi nào áp
- Viết báo cáo · email · tài liệu giao đi · chữ trên giao diện hay trang báo cáo.

## Phải làm gì
1. Viết cho người nhận. Không giọng harness: không câu mệnh lệnh, không viết hoa để nhấn, không thuật ngữ nội bộ.
2. Nhãn người đọc thấy (giao diện · trang báo cáo · tiêu đề cột · chú thích biểu đồ) dùng từ nghiệp vụ, không dùng tên bảng · cột
   · mã nội bộ. Ngoại lệ: chỗ cố tình phơi phần kỹ thuật (ô xem câu truy vấn · hộp mô tả cột).
3. Đủ để đọc: bảng có tiêu đề cột · hình có chú thích · mỗi số có đơn vị và kỳ · một thuật ngữ một tên (`Rule_Gate_35_OneHome`).
4. Mở skill văn phong trước khi viết: `.claude/skills/doc-write-style/SKILL.md`.

## Ví dụ
- Tình huống: agent soạn email báo cáo tuần gửi trưởng một phòng ban khác, kèm bảng số.
- ✗ Sai: viết hoa cả câu để nhấn, tiêu đề cột là tên cột trong cơ sở dữ liệu, số không ghi đơn vị và kỳ.
- ✓ Đúng: mở skill văn phong trước, viết câu thường, tiêu đề cột bằng từ nghiệp vụ, mỗi số ghi đơn vị và kỳ.

## Máy kiểm
- Hook nhắc đọc skill ở lần ghi văn bản giao đi đầu tiên của phiên.
- Chốt read-first đòi đọc skill trước khi chạy script gửi mail.

## Links · Liên kết
- Implements · Thi hành: `Skill_Doc_WriteStyle` — the writing-style rules · luật văn phong
- Related · Liên quan: `Rule_Gate_27_HarnessLanguage` — the harness voice that stays out of reader text · giọng harness không vào văn bản cho người đọc
- Related · Liên quan: `Rule_Gate_35_OneHome` — one term, one name · một thuật ngữ một tên
