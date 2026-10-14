---
id: 02-55
name: hook-guard
version: 1
kind: action
generated: [guard.cjs, policy.json, precommit-guard.cjs, 02-59_read-first.cjs]
---
# 02-55 Một cửa cho mọi cổng

- `zemory hook guard` sinh vào folder này: `policy.json` (dựng từ `.harness.json`) · `guard.cjs` (PreToolUse, chặn TRƯỚC khi
  hành động chạm đĩa hoặc mạng) · `precommit-guard.cjs` (chặn bí mật vào staging). Không sửa tay các file này.
- `.claude/settings.json` có MỘT lệnh cho PreToolUse, trỏ vào `guard.cjs` này, matcher đủ
  `Write|Edit|MultiEdit|NotebookEdit|Read|Bash|PowerShell`; hook khác của repo giữ nguyên. Pre-commit cắm khi repo chưa có;
  pre-commit riêng của repo thì để yên và báo.
- `guard.cjs` nạp `hook.cjs` của mọi folder luật trong `01_CONSTITUTION/` và `02_RULES/`; luật nào khai `native` trong
  `gate.json` thì dòng đó nằm trong `permissions.deny` của `.claude/settings.json`.
- Chặn = quyết định JSON `permissionDecision: "deny"` trên stdout, cộng mã thoát 2.
- Cờ `.allow-*` = phê duyệt cho MỘT việc, nằm ở `docs/.harness-state/` (không vào git). Guard cho qua rồi đóng dấu
  `ZEMORY-USED <vân tay lệnh> <thời điểm>` vào chính file cờ; trong 90 giây đúng lệnh đó thử lại được; việc khác hoặc quá hạn
  ⇒ thu hồi. Nhóm bí mật không có cờ.
- Phép kiểm: `zemory gates` đo guard có thật sự được cắm và chạy; `zemory doctor` nhắc khi repo chưa sinh chốt.
