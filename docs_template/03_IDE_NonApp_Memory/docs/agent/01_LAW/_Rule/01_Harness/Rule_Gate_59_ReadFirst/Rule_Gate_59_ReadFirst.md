---
id: Rule_59
aka: 02-59
name: read-first
version: 10
kind: action
code: 01_Harness
generated: [guard.cjs, policy.json, precommit-guard.cjs, 02-59_read-first.cjs]
from: _Store/01_LAW/_Rule/01_Harness/Rule_Gate_59_ReadFirst @v10 #d2aabe511d20
---
# Rule_Gate_59_ReadFirst — Read before the first write

## What
Before the first write of a session, the agent reads in full the laws no machine holds, the repo's filled constitution and the
TODO ledger. Reading a little of a file does not count.

## When
- The first Write / Edit / writing command of a session in a repo.
- A write that needs its own reading: a case file, a new folder, work that matches a skill.

## Do
1. Read in full: the laws of kind `Core` (no hook holds them) in `01_LAW/_Rule`, every filled `Cons.md` and the repo's own
   articles in `01_LAW/_Cons`, and the whole `04_TODO`.
2. Read what the write needs: writing in `tasks/<case>/` ⇒ that case's spec and mail template; creating a folder ⇒ the repo's
   assembled structure (`02_STRUCTURE/INDEX.md`, then the slot); work matching a skill ⇒ that skill (`Rule_Gate_63_SkillTrigger`).
3. `grep`, `head` or skimming is not reading; open the file with Read.

## Example
- Situation: a new session opens a report repo to change the weekly e-mail template.
- ✗ Wrong: open the template and edit it straight away, without the core laws, the constitution, the ledger and the case spec.
- ✓ Right: read what is required and the case spec, then write; without them the write is blocked and the block lists what is
  still missing.

## Check
- The read-first latch blocks the write until everything required is read; there is no flag. How it works (line counts,
  compaction, the marker key `readFirst`, fail-open): the guard notes in `02_STRUCTURE/_Host/IDE`.

## Luật là gì
Trước lần ghi đầu tiên của phiên, agent đọc trọn các luật không có máy giữ, hiến pháp repo đã điền và sổ việc. Đọc một phần file
không tính.

## Khi nào áp
- Lần Write / Edit / lệnh có ghi đầu tiên của phiên trong một repo.
- Lần ghi cần đọc riêng: file của một case, thư mục mới, việc khớp một skill.

## Phải làm gì
1. Đọc trọn: các luật loại `Core` (không hook nào giữ) trong `01_LAW/_Rule`, mọi `Cons.md` đã điền và điều riêng của repo trong
   `01_LAW/_Cons`, và cả `04_TODO`.
2. Đọc thứ lần ghi cần: ghi vào `tasks/<case>/` ⇒ spec và mẫu mail của case đó; tạo thư mục ⇒ cấu trúc đã ráp của repo
   (`02_STRUCTURE/INDEX.md`, rồi tới slot); việc khớp một skill ⇒ skill đó (`Rule_Gate_63_SkillTrigger`).
3. `grep`, `head` hay đọc lướt không tính là đã đọc; mở file bằng Read.

## Ví dụ
- Tình huống: phiên mới mở repo báo cáo, được giao sửa mẫu email gửi hằng tuần.
- ✗ Sai: mở file mẫu rồi sửa ngay, chưa đọc luật lõi, hiến pháp, sổ việc và spec của case.
- ✓ Đúng: đọc đủ phần bắt đọc và spec của case rồi mới ghi; chưa đọc thì lần ghi bị chặn và lời chặn nêu rõ còn thiếu gì.

## Máy kiểm
- Chốt read-first chặn lần ghi tới khi đọc đủ; không có cờ vượt. Cách hoạt động (so theo dòng, nén ngữ cảnh, khoá marker
  `readFirst`, fail-open): ghi chú guard ở `02_STRUCTURE/_Host/IDE`.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_63_SkillTrigger` — opening a skill before the work · mở skill trước khi làm
- Related · Liên quan: `Rule_Gate_86_LawLayersAgree` — the layers read here must agree · các tầng đọc ở đây phải khớp nhau
