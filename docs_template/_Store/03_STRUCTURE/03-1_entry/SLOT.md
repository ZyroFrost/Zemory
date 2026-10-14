---
id: 03-1
name: entry
version: 1
path: AGENTS.md
---
# 03-1 Cửa vào harness

- `AGENTS.md` ở gốc repo: mô tả repo + chỉ đường vào `docs/` (chuẩn liên công cụ agents.md).
- `CLAUDE.md` ở gốc repo: chỉ một dòng `@AGENTS.md` — host đọc `CLAUDE.md`, không tự đọc `AGENTS.md`; thiếu file này thì
  cửa vào không tự nạp.
- Phép kiểm: `zemory conform` đỏ khi thiếu một trong hai file, hoặc `CLAUDE.md` không nạp `@AGENTS.md`.
