---
id: Rule_31
aka: 02-31
name: no-broken-vietnamese
version: 6
kind: content
---
# Rule_Gate_31_NoBrokenVietnamese Không tiếng Việt mất dấu, không lỗi mã hoá

- Không có tiếng Việt mất dấu ở bất cứ file nào (docs · plan · chú thích · tên test · chuỗi sinh máy · cấu hình · sổ): viết tiếng Việt có dấu hoặc tiếng Anh.
- Không mojibake (`Ã¡` · `â€` · `ï»¿`).
- Miễn: tên do bên khác đặt (cột nguồn · trường API · tên file nguồn) giữ từng ký tự.
- Vế này giữ kể cả khi repo nới các điều ngôn ngữ trong hiến pháp.
- Lối đúng: viết lại bằng tiếng Việt có dấu hoặc tiếng Anh · gặp mojibake thì đọc lại file bằng đúng mã UTF-8.
- Phép kiểm: guard chặn dòng thêm mới có tiếng Việt mất dấu trong docs harness (`docs/agent` · `docs/plan` · thân skill); comment có dấu trong mã bị `Rule_Gate_29_CodeLanguage` chặn. Mã và các file khác: máy soi `node .claude/skills/harness-audit/scripts/lang-scan.mjs .` (không chặn lúc ghi). Cách đo và bẫy báo oan: `.claude/skills/harness-audit/SKILL.md` mặt 11 · 12.

## Ví dụ

- Tình huống: một phiên ghi thêm một mục vào sổ việc.
- ✗ Sai: viết "kiem tra lai so lieu thang 9".
- ✓ Đúng: viết "kiểm tra lại số liệu tháng 9"; không gõ được dấu thì viết tiếng Anh.
