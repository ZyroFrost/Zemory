---
version: 11
lang: vi
---
# Rule_Gate_31_NoBrokenVietnamese — No Vietnamese without diacritics, no broken encoding

## Luật là gì
Không file nào chứa tiếng Việt mất dấu, và không file nào chứa lỗi mã hoá (mojibake). Viết tiếng Việt có đủ dấu, hoặc viết tiếng
Anh.

## Khi nào áp
- Viết bất kỳ file nào: docs · plan · comment · tên test · chuỗi máy sinh · cấu hình · sổ · lời commit.

## Phải làm gì
1. Tiếng Việt ⇒ đủ dấu; không gõ được dấu ⇒ viết tiếng Anh.
2. Không mojibake (`Ã¡` · `â€` · `ï»¿`). Gặp ⇒ đọc lại file bằng đúng mã UTF-8.
3. Miễn: tên do hệ khác đặt (cột nguồn · trường API · tên file nguồn), giữ từng ký tự.
4. Luật này giữ kể cả khi repo nới các điều ngôn ngữ trong hiến pháp.

## Ví dụ
- Tình huống: một phiên ghi thêm một mục vào sổ việc.
- ✗ Sai: viết "kiem tra lai so lieu thang 9".
- ✓ Đúng: viết "kiểm tra lại số liệu tháng 9"; không gõ được dấu thì viết bằng tiếng Anh.

## Máy kiểm
- Guard chặn dòng thêm mới có tiếng Việt mất dấu trong file `.md`, dòng comment trong mã và lời commit. Một dòng bị bắt khi có ít
  nhất một âm tiết chắc chắn là tiếng Việt (`khong` · `duoc` · `nguoi` …) hoặc bốn hư từ (`va` · `cua` · `cho` …), nên cụm ngắn toàn
  từ trùng tiếng Anh hay tên riêng có thể lọt.
- Comment có dấu trong mã do `Rule_Gate_29_CodeLanguage` chặn.
- Soát cả repo (gồm chuỗi trong mã và file khác): `node .claude/skills/harness-audit/scripts/lang-scan.mjs .`. Cách đo và bẫy báo
  oan: `.claude/skills/harness-audit/SKILL.md` mặt 11 · 12.
