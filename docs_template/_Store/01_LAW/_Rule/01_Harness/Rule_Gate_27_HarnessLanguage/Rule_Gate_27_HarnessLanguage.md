---
id: Rule_27
aka: 02-27
name: harness-language
version: 18
kind: judgment
code: 01_Harness
---
# Rule_Gate_27_HarnessLanguage — How harness docs are written, and the words they use

## What
Harness docs (laws, constitution frames, slots, skills, `docs/plan/`) are written in English first with a Vietnamese version
right below, in a plain specification voice, with one fixed word for each thing. They never quote a person or date a decision.

## When
- Writing or editing any harness doc.
- Naming a harness thing in any text an agent reads.

## Do
1. Write each law in two languages in the same file: English first (agents read it), Vietnamese below (people read it). Both
   carry the same sections and the same number of steps.
2. Write a law in five parts: What · When · Do · Example (✗ wrong / ✓ right, with real names and numbers) · Check (what the
   machine blocks, or "no machine check, the agent keeps it"). Short sentences; explain an internal term the first time.
3. Before finishing a law, read it again as a newcomer and solve its example; misread ⇒ rewrite.
4. No quotes of what someone said, no decision dates, no personal names or e-mails, no paths carrying a person's name. Words,
   dates and incidents go to `05_CHANGES` and Global Memory.
5. Use the words of the table below; never "kho" alone — write DW or HS.

| Word | Means |
|---|---|
| HS (harness store) | `docs_template/_Store` in zemory — the only place laws, frames, slots, structures and skills are made |
| DW | the region's data warehouse ("kho dữ liệu") |
| set | a folder `docs_template/0N_*` assembled from HS |
| part | one folder on HS: a law, a frame, a slot, a structure or a skill |
| law | a part in `01_LAW/_Rule`, shared by every repo of a set |
| frame | a part in `01_LAW/_Cons` that makes a repo declare one kind of invariant in its `Cons.md` |
| code of law · chapter | the folder grouping laws (`01_Harness` …) · frames (`01_Scope` …) by subject |
| ledger | `04_TODO.md` · `05_CHANGES.md` — the repo's memory, not harness |
| owner | the repo that decides the frame and standard of another repo (`Struc_Region_Workspace`) |
| query set · icon library · glossary | named queries · the region's icons · the region's business glossary |
| stock ("tồn kho" · "nhập kho" · "kho hàng") | goods in a stockroom — business words, not the DW |

## Example
- Situation: a new law is added after a data-loss incident.
- ✗ Wrong: the law retells the incident, quotes what the person said with the date, and names the warehouse with a word that
  could also mean HS.
- ✓ Right: the law states When · Do · Check in both languages and says "fix the table in DW"; the story, the words and the date go
  to the changelog.

## Check
- A hook blocks, in new lines of a harness doc: a quote of a person, a decision date, an e-mail, a path with a person's name.
- The same hook blocks the word "kho" alone in new lines of EVERY prose file the repo writes — harness docs, plans, the two
  ledgers, case specs, READMEs (archive and attic excepted): write DW or HS. It passes "kho dữ liệu" and the stockroom
  words "tồn kho" · "nhập kho" · "xuất kho" · "kiểm kho" · "kho hàng".
- Broken Vietnamese (no diacritics) is blocked by `Rule_Gate_31_NoBrokenVietnamese`.
- A store check reds a law that lacks a language, a section, or has a different number of steps between the two versions.
- The voice itself is judgment.

## Luật là gì
Docs harness (luật, khung hiến pháp, slot, skill, `docs/plan/`) viết tiếng Anh trước, bản tiếng Việt ngay dưới, giọng đặc tả rõ
ràng, mỗi thứ một chữ cố định. Không trích lời ai, không ghi ngày chốt.

## Khi nào áp
- Viết hoặc sửa bất kỳ docs harness nào.
- Gọi tên một thứ của harness trong bất kỳ văn bản nào agent đọc.

## Phải làm gì
1. Viết mỗi luật bằng hai ngôn ngữ trong cùng một file: tiếng Anh trước (agent đọc), tiếng Việt bên dưới (người dùng đọc). Hai
   bản có cùng các mục và cùng số bước.
2. Viết luật theo năm phần: Luật là gì · Khi nào áp · Phải làm gì · Ví dụ (✗ sai / ✓ đúng, dùng tên thật, số thật) · Máy kiểm
   (máy chặn gì, hoặc "không có máy, agent tự giữ"). Câu ngắn; thuật ngữ nội bộ giải thích ở lần đầu.
3. Trước khi chốt một luật, đọc lại như người mới và tự giải ví dụ; hiểu sai ⇒ viết lại.
4. Không trích lời ai, không ghi ngày chốt, không tên người hay email, không đường dẫn mang tên người. Lời gốc, ngày và sự cố ghi
   ở `05_CHANGES` và Global Memory.
5. Dùng đúng chữ trong bảng dưới; không bao giờ viết "kho" trơn — viết DW hoặc HS.

| Chữ | Nghĩa |
|---|---|
| HS (harness store) | `docs_template/_Store` trong zemory — nơi duy nhất làm luật, khung, slot, structure, skill |
| DW | kho dữ liệu của vùng |
| bộ mẫu | thư mục `docs_template/0N_*` ráp từ HS |
| phần | một thư mục trên HS: luật, khung, slot, structure hoặc skill |
| luật | phần trong `01_LAW/_Rule`, dùng chung cho mọi repo của bộ mẫu |
| khung | phần trong `01_LAW/_Cons`, bắt repo khai một loại bất biến trong `Cons.md` |
| bộ luật · chương | thư mục chia luật (`01_Harness` …) · chia khung (`01_Scope` …) theo chủ đề |
| sổ | `04_TODO.md` · `05_CHANGES.md` — trí nhớ của repo, không phải harness |
| tổng quản | repo quyết khung và chuẩn của repo khác (`Struc_Region_Workspace`) |
| bộ câu truy vấn · thư viện icon · bảng thuật ngữ | các câu truy vấn có tên · icon của vùng · bảng thuật ngữ nghiệp vụ của vùng |
| tồn kho · nhập kho · kho hàng | hàng hoá trong kho hàng thật — từ nghiệp vụ, không phải DW |

## Ví dụ
- Tình huống: thêm một luật mới sau một sự cố mất dữ liệu.
- ✗ Sai: luật kể lại sự cố, trích lời người nói kèm ngày, và gọi DW bằng một chữ cũng có thể hiểu là HS.
- ✓ Đúng: luật ghi Khi nào áp · Phải làm gì · Máy kiểm bằng hai ngôn ngữ và ghi "sửa bảng trên DW"; câu chuyện, lời gốc và ngày để
  ở changelog.

## Máy kiểm
- Hook chặn, trong các dòng mới của docs harness: lời trích của một người, ngày chốt, email, đường dẫn mang tên người.
- Cùng hook đó chặn chữ "kho" đứng trơn trong dòng mới của MỌI file văn xuôi repo viết — docs harness, plan, hai sổ, spec của
  case, README (trừ archive và attic): viết DW hoặc HS. Cho qua "kho dữ liệu" và các từ kho hàng "tồn kho" · "nhập kho" ·
  "xuất kho" · "kiểm kho" · "kho hàng".
- Tiếng Việt mất dấu do `Rule_Gate_31_NoBrokenVietnamese` chặn.
- Kiểm tra của HS báo đỏ luật thiếu một ngôn ngữ, thiếu một mục, hoặc số bước lệch giữa hai bản.
- Giọng văn là phán đoán.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_31_NoBrokenVietnamese` — Vietnamese with diacritics · tiếng Việt có dấu
- Related · Liên quan: `Rule_Gate_02_ReaderText` — text for readers outside the harness · văn bản cho người đọc ngoài harness
- Related · Liên quan: `Struc_Region_Workspace` — what an owner is · tổng quản là gì
