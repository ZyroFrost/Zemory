---
id: Rule_55
aka: 02-55
name: hook-guard
version: 3
kind: action
generated: [guard.cjs, policy.json, precommit-guard.cjs, 02-59_read-first.cjs]
---
# Rule_Gate_55_HookGuard Bộ chốt máy `zemory hook guard`

- `zemory hook guard` sinh bộ chốt vào `<nhà harness>/hooks/` (harness dạng file) từ marker `.harness.json` (khoá `protected` · `secretNames`):
  - `policy.json` — luật đã dịch từ marker.
  - `guard.cjs` — hook `PreToolUse`, chặn TRƯỚC khi hành động chạm đĩa hoặc mạng.
  - `precommit-guard.cjs` — chặn secret lọt vào staging; phủ cả commit do người làm.
- Harness dạng thư mục: `guard.cjs` nằm trong thư mục của luật `Rule_Gate_55_HookGuard`, và cờ `.allow-*` nằm ở `docs/.harness-state/`.
- Guard là CHUẨN, không phải tuỳ chọn. Lệnh tự cắm guard vào `.claude/settings.json` › `PreToolUse` với matcher đủ `Write|Edit|MultiEdit|NotebookEdit|Read|Bash|PowerShell`, giữ nguyên mọi hook khác của repo.
- Pre-commit cũng tự cắm: repo chưa có `pre-commit` ⇒ lệnh tạo hook gọi `precommit-guard.cjs` (theo `core.hooksPath` nếu repo khai). Repo đã có pre-commit riêng ⇒ để yên, báo ra, thêm dòng gọi guard bằng tay.
- Cờ `.allow-*` cho việc được duyệt một lần: xem `Rule_Gate_56_AllowFlagOnce`. Nhóm secret không có cờ.
- Phép kiểm:
  - `zemory doctor` báo ĐỎ khi guard chưa cắm hoặc matcher thiếu công cụ; nhắc khi repo khai `protected` mà chưa sinh chốt.
  - `zemory gates --all` (và chip **Cổng repo** trên giao diện) đo mọi repo có THẬT SỰ chạy guard · pre-commit · đủ hàng §Cổng của hiến pháp.
