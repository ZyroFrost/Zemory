---
id: Rule_26
aka: 02-26
name: vi-diacritics
version: 9
kind: content
---
# Rule_Gate_26_ViDiacritics Docs viết tiếng Việt có dấu

- Docs (`docs/agent` · `docs/plan`) và thân `SKILL.md` viết tiếng Việt có dấu.
- Nhóm ngôn ngữ (`Rule_Gate_26_ViDiacritics` · `Rule_Gate_66_PartNames` · `Rule_Gate_27_SpecVoice` · `Rule_Gate_29_CodeEnglish` · `Rule_Gate_30_AsciiNames` · `Rule_Keys_31_TextCorrect`) là mặc định của bộ chuẩn. Bỏ hay nới vế nào ⇒ ghi quyết định vào `01_CONSTITUTION` (giữ vế nào, bỏ vế nào, vì sao). Agent không tự nới, không tự siết; chưa có quyết định ⇒ theo mặc định.
- Vế giữ kể cả khi nới hết: không viết tiếng Việt mất dấu — không dùng dấu thì viết tiếng Anh.
- Phép kiểm: cổng `guard`.

## Ví dụ

- Tình huống: một phiên agent ghi thêm một mục vào sổ việc của repo.
- ✗ Sai: viết "kiem tra lai so lieu thang 9" — không dấu, người đọc phải đoán nghĩa.
- ✓ Đúng: viết "kiểm tra lại số liệu tháng 9"; không gõ được dấu thì viết bằng tiếng Anh.
