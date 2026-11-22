---
id: Rule_55
aka: 02-55
name: zemory-hook-guard
version: 1
kind: content
---
# Rule_Gate_55_ZemoryHookGuard `zemory hook guard`

- `02-55` **`zemory hook guard`** sinh bộ chốt vào `<nhà harness>/hooks/` từ marker (`protected` / `secretNames`): `policy.json` · `guard.cjs` (PreToolUse, chặn TRƯỚC khi chạm đĩa/mạng) · `precommit-guard.cjs` (chặn secret vào staging). Lệnh **tự cắm** guard vào `.claude/settings.json` › PreToolUse (matcher đủ `Write|Edit|MultiEdit|NotebookEdit|Read|Bash|PowerShell`, giữ hook khác) và cắm `pre-commit` khi repo chưa có — guard là CHUẨN, không phải tuỳ chọn (user chốt 2026-10-07; câu cũ "tool không tự cắm" đã thay từ 3.7.5). Pre-commit riêng của repo thì để yên và báo. `zemory gates --all` · chip **Cổng repo** đo mọi repo có THẬT SỰ chạy guard · pre-commit · đủ hàng §Cổng cho hiến pháp. Flag `.allow-*` = user duyệt **MỘT VIỆC**: guard cho qua rồi **đóng dấu** `ZEMORY-USED <vân tay lệnh> <thời điểm>` vào chính file flag — **KHÔNG xoá ngay**, vì hook `PreToolUse` chỉ nói *cho qua* chứ không biết lệnh có thật sự chạy (một tầng khác của host chặn lại là flag mất oan — đo 2026-08-20 lúc push 2.0.0). Trong **90 giây**, ĐÚNG lệnh đó thử lại được; xin việc KHÁC hoặc quá hạn ⇒ **thu hồi**, phải xin lại. *(Câu cũ "dùng một lần tự xoá" sai hành vi thật và đã làm một agent tưởng có lỗ, suýt ghi lỗ ma vào chuẩn dùng chung — sửa 2026-08-26.)* Nhóm secret KHÔNG có flag. `zemory doctor` nhắc khi repo khai `protected` mà chưa sinh chốt. <!-- gate: guard -->
- `02-71` Ship trong template app/nonapp/adapt (`02_RULES §Guardrail lớp ①` của từng bộ) — và **từ 2026-08-10 ship cả cho cowork**. <!-- gate: test:template-parity -->
  > 🔄 **Đảo vế cũ** *"bộ cowork CỐ Ý không mang — không bảo đảm có CLI lẫn hook PreToolUse"*. Vế đó chỉ đúng MỘT NỬA: đo lại thì `guard.cjs` dùng **thuần `node:fs`+`node:path`**, CLI chỉ cần lúc SINH chứ không cần lúc CHẠY ⇒ ship **bản đã sinh sẵn** là hết phụ thuộc CLI. Chỉ còn phụ thuộc hook của host, mà thiếu hook thì file nằm im **vô hại** và ăn ngay ngày host có — tốt hơn hẳn không ship gì. Lý do đảo (user chốt): bộ cowork **phụ thuộc hoàn toàn vào luật chữ**, mà chữ thì **agent quên được**. Bộ cowork nhận `hooks/guard.cjs` + `policy.json` với `protected_write = data/*/01_raw · docs/agent`.
