---
id: Rule_79
name: harness-edit-needs-approval
version: 2
kind: action
from: _Store/01_RULES/Rule_Gate_79_HarnessEditNeedsApproval @v2 #e32156eefa82
---
# Rule_Gate_79_HarnessEditNeedsApproval Sửa bộ docs harness phải được người dùng cấp quyền

- Bộ docs harness gồm: luật (`01_RULES`) · hiến pháp (`02_CONSTITUTION`) · cấu trúc (`03_STRUCTURE`) · skill (`04_SKILLS`) ·
  mọi file khác trong folder harness (kể cả hook nằm trong folder luật) · `docs/plan/` · cửa vào `AGENTS.md` / `CLAUDE.md` · kho linh kiện
  `docs_template/_Store/` của repo mang kho.
- Tạo · sửa · xoá · dời bất kỳ thứ gì trong bộ đó ⇒ chỉ làm khi người dùng đã cho phép đúng việc đó trong phiên.
- Agent không tự tạo luật, điều hiến pháp, slot, skill, kệ hay lớp mới; không tự gộp, bãi bỏ hay đổi số một linh kiện.
  Thấy cần ⇒ đề xuất, chờ duyệt.
- Câu agent tự viết vào plan hay luật không phải quyết định của người dùng; không được dùng nó làm căn cứ cho việc sửa khác.
- Chốt máy: guard chặn mọi lần ghi (Write · Edit · lệnh shell · script) vào bộ docs harness khi chưa có cờ dùng một lần
  `.allow-docs-write`; cờ chỉ tạo khi người dùng đã cho phép.

## Ví dụ

- Tình huống: agent thấy bộ chuẩn "nên có" thêm một kệ để chứa file khởi đầu của một bộ.
- ✗ Sai: tạo kệ mới, dời vài luật vào Archive cho gọn, ghi lý do vào plan rồi báo đã làm theo plan.
- ✓ Đúng: thử xếp vào linh kiện có sẵn; vẫn cần thêm thì đề xuất và chờ duyệt; chỉ sửa bộ docs harness khi người dùng đã cho phép đúng việc đó trong phiên.
