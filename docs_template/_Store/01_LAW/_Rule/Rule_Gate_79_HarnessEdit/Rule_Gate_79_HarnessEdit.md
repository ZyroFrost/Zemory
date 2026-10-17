---
id: Rule_79
name: harness-edit
version: 3
kind: action
---
# Rule_Gate_79_HarnessEdit Sửa bộ harness phải được duyệt; luật không đảo được phải có chốt máy

- Bộ harness: `01_LAW` · `02_STRUCTURE` · `03_SKILLS` · mọi file khác trong folder harness (kể cả hook) · `docs/plan/` · `AGENTS.md` / `CLAUDE.md` · kho `docs_template/_Store/` của repo mang kho.
- Tạo · sửa · xoá · dời bất kỳ thứ gì trong bộ đó ⇒ chỉ làm khi người dùng đã cho phép đúng việc đó trong phiên.
- Agent không tự tạo luật · điều hiến pháp · slot · skill · kệ · lớp mới; không tự gộp, bãi bỏ, đổi số. Thấy cần ⇒ hỏi một câu kèm đề xuất; không ghi đề xuất vào sổ chờ duyệt.
- Câu agent tự viết vào plan hay luật không phải quyết định của người dùng; không dùng làm căn cứ cho việc sửa khác.
- Luật mà vi phạm là không đảo được (bí mật vào commit · ghi vào đường cấm · push chưa xin) ⇒ phải kèm chốt máy chặn lúc xảy ra; chữ một mình không đủ. Cách phân loại và dựng chốt: `.claude/skills/harness-rule-gate/SKILL.md`.
- Phép kiểm: guard chặn mọi lần ghi vào bộ harness khi chưa có cờ dùng một lần `.allow-docs-write`; cờ chỉ tạo khi người dùng đã cho phép.

## Ví dụ

- Tình huống: agent thấy bộ chuẩn "nên có" thêm một kệ để chứa file khởi đầu của một bộ.
- ✗ Sai: tạo kệ mới, dời vài luật vào Archive cho gọn, ghi lý do vào plan rồi báo đã làm theo plan.
- ✓ Đúng: thử xếp vào linh kiện có sẵn; vẫn cần thêm thì đề xuất và chờ duyệt; chỉ sửa bộ harness khi người dùng đã cho phép đúng việc đó trong phiên.
