---
id: Rule_59
aka: 02-59
name: read-first
version: 5
kind: action
from: _Store/01_RULES/Rule_Gate_59_ReadFirst @v5 #e26e1fef2238
---
# Rule_Gate_59_ReadFirst Đọc trước khi ghi

- Chốt read-first (sinh vào folder của `Rule_Gate_55_HookGuard`, guard gọi) chặn mọi thao tác ghi (Write/Edit · lệnh shell có ghi) tới khi phiên đã đọc bằng công cụ Read đủ phần bắt đọc khai ở `policy.json › read_first`:
  - các luật `Core` của `01_RULES` (lõi);
  - ở `02_CONSTITUTION`: `PURPOSE.md` và các điều `Core`;
  - cả `05_TODO`.
- File thiếu ranh giới mục ⇒ đòi cả file. File khai mà không tồn tại ⇒ bỏ qua.
- `grep` / `head` / `Get-Content` không tính là đã đọc.
- Chốt so theo nội dung từng dòng: dòng đã thấy (qua Read, hoặc tự ghi bằng Edit/Write) không phải đọc lại. File đổi ngoài Edit/Write ⇒ chỉ đòi đúng các dòng đã đổi; câu chặn ghi số dòng.
- Đòi thêm theo việc:
  - ghi vào `tasks/<case>/` ⇒ `spec.md` · `mail_form.md` của case đó;
  - tạo thư mục mới ⇒ `03_STRUCTURE`;
  - đụng `frontend/` (bộ APP) ⇒ `.claude/skills/dev-app-design/SKILL.md`;
  - chạy script gửi mail ⇒ `.claude/skills/doc-write-style/SKILL.md` (soi nội dung script được chạy, thêm một bước sang script nó gọi).
- Nén context không bắt đọc lại: hook `SessionStart` chèn lại nguyên văn lõi.
- Lệnh đọc Global Memory và dò phiên (`zemory memory …` · `peers` · `graph`) không bị chặn.
- Không có cờ vượt.
- Khai thêm file bắt đọc: khoá marker `readFirst` (bộ không có CLI: sửa thẳng `hooks/policy.json › read_first`).
- Giới hạn: host không ghi transcript ⇒ cho qua (fail-open). Phần đòi theo việc chỉ phủ chỗ máy đoán tất định được; luật chữ vẫn là tầng quyết định.
