---
version: 1
lang: vi
---
# Rule_Keys_96_ReplyLanguage — Trả lời bằng ngôn ngữ của người dùng, suốt cả lượt

## Luật là gì
Mọi thứ agent nói với người dùng đều bằng ngôn ngữ người dùng viết: câu trả lời cuối, dòng báo tiến độ giữa các lệnh, mô tả lệnh,
phần suy nghĩ hiển thị. Một chuỗi việc dài, hay một commit message tiếng Anh vừa viết, không làm đổi ngôn ngữ.

## Khi nào áp
- Mọi câu trả lời và mọi dòng tiến độ của phiên.

## Phải làm gì
1. Trả lời bằng ngôn ngữ của người dùng. Giữ tiếng Anh cho: tên lệnh, tên file, mã, commit message (luật riêng của nó), chữ CLI và
   log kỹ thuật (`Rule_Gate_29_CodeLanguage`).
2. Trước khi gửi, đọc câu đầu: sai ngôn ngữ ⇒ viết lại cả câu trả lời.
3. Dòng tiến độ, mô tả lệnh và phần suy nghĩ hiển thị theo cùng ngôn ngữ với câu trả lời.

## Ví dụ
- Tình huống: một đợt việc dài kết thúc bằng commit tiếng Anh; người dùng viết tiếng Việt.
- ✗ Sai: báo cáo cuối bằng tiếng Anh.
- ✓ Đúng: báo cáo cuối bằng tiếng Việt; commit message vẫn tiếng Anh.

## Máy kiểm
- Cửa nhắc (hook prompt): người dùng chỉ ra sai ngôn ngữ thì nhắc luật một lần mỗi phiên.

## Liên kết
- Liên quan: `Rule_Gate_29_CodeLanguage` — mã, CLI và log giữ tiếng Anh
- Liên quan: `Rule_Gate_27_HarnessLanguage` — cách viết docs harness
