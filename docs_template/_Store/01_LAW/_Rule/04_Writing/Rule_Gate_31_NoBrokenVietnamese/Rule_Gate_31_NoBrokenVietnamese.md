---
id: Rule_31
aka: 02-31
name: no-broken-vietnamese
version: 10
kind: content
code: 04_Writing
---
# Rule_Gate_31_NoBrokenVietnamese — No Vietnamese without diacritics, no broken encoding

## What
No file holds Vietnamese written without its diacritics, and no file holds broken encoding (mojibake). Write Vietnamese with full
diacritics, or write English.

## When
- Writing any file: docs · plans · comments · test names · machine-generated strings · settings · ledgers · commit messages.

## Do
1. Vietnamese ⇒ full diacritics; cannot type them ⇒ write English.
2. No mojibake (`Ã¡` · `â€` · `ï»¿`). Seen ⇒ read the file again as UTF-8.
3. Exempt: names given by another system (source columns · API fields · source file names), kept character for character.
4. This holds even when a repo relaxes the language articles of its constitution.

## Example
- Situation: a session adds an item to the TODO ledger.
- ✗ Wrong: write "kiem tra lai so lieu thang 9".
- ✓ Right: write "kiểm tra lại số liệu tháng 9"; unable to type diacritics ⇒ write it in English.

## Check
- The guard blocks a new line of Vietnamese without diacritics in `.md` files, code comment lines and commit messages. A line is
  caught when it has at least one syllable that is surely Vietnamese (`khong` · `duoc` · `nguoi` …) or four function words (`va` ·
  `cua` · `cho` …), so a short phrase of words that are also English, or a proper name, can slip through.
- Comments with diacritics in code are blocked by `Rule_Gate_29_CodeLanguage`.
- Whole-repo scan (strings in code and other files included): `node .claude/skills/harness-audit/scripts/lang-scan.mjs .`. How to
  measure and the false-alarm traps: `.claude/skills/harness-audit/SKILL.md` faces 11 · 12.

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

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_Audit` — the language scan · máy soi ngôn ngữ
- Related · Liên quan: `Rule_Gate_29_CodeLanguage` — the language of code · ngôn ngữ của mã
