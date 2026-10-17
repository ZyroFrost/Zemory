---
id: Rule_31
aka: 02-31
name: no-broken-vietnamese
version: 7
kind: content
from: _Store/01_LAW/_Rule/Rule_Gate_31_NoBrokenVietnamese @v7 #d7219e97adcc
---
# Rule_Gate_31_NoBrokenVietnamese Không tiếng Việt mất dấu, không lỗi mã hoá

- Không có tiếng Việt mất dấu ở bất cứ file nào (docs · plan · chú thích · tên test · chuỗi sinh máy · cấu hình · sổ): viết tiếng Việt có dấu hoặc tiếng Anh.
- Không mojibake (`Ã¡` · `â€` · `ï»¿`).
- Miễn: tên do bên khác đặt (cột nguồn · trường API · tên file nguồn) giữ từng ký tự.
- Vế này giữ kể cả khi repo nới các điều ngôn ngữ trong hiến pháp.
- Lối đúng: viết lại bằng tiếng Việt có dấu hoặc tiếng Anh · gặp mojibake thì đọc lại file bằng đúng mã UTF-8.
- Phép kiểm: guard chặn dòng thêm mới có tiếng Việt mất dấu trong file `.md`, dòng comment trong mã và lời commit; một dòng bị bắt khi có ít nhất một âm tiết chắc chắn là tiếng Việt (`khong` · `duoc` · `nguoi` …) hoặc bốn hư từ (`va` · `cua` · `cho` …), nên cụm ngắn toàn từ trùng tiếng Anh hay tên riêng có thể lọt. Comment có dấu trong mã do `Rule_Gate_29_CodeLanguage` chặn. Soát cả repo (gồm chuỗi trong mã và file khác): `node .claude/skills/harness-audit/scripts/lang-scan.mjs .`. Cách đo và bẫy báo oan: `.claude/skills/harness-audit/SKILL.md` mặt 11 · 12.

## Ví dụ

- Tình huống: một phiên ghi thêm một mục vào sổ việc.
- ✗ Sai: viết "kiem tra lai so lieu thang 9".
- ✓ Đúng: viết "kiểm tra lại số liệu tháng 9"; không gõ được dấu thì viết tiếng Anh.
