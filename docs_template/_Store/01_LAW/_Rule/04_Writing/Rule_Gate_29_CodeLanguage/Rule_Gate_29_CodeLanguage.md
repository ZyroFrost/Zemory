---
id: Rule_29
aka: 02-29
name: code-language
version: 11
kind: judgment
code: 04_Writing
---
# Rule_Gate_29_CodeLanguage — Code and names are written in English

## What
Code, scripts, pipelines and measures are written in English: comments, docstrings, technical logs, CLI output. Identifiers and
names are ASCII English. Text rendered for readers and names given by another system are not translated.

## When
- Writing or editing code · a script · a pipeline · a measure.
- Naming a variable · constant · function · class · type · parameter · config/JSON key · test · file · folder · git branch.

## Do
1. Comments · docstrings · technical logs · output of the CLI and helper scripts ⇒ English. One file, one language. Commit
   messages: English, or Vietnamese with full diacritics.
2. Identifiers and names ⇒ ASCII English.
3. Not translated: strings rendered for readers (UI labels · report labels · table/column descriptions generated into docs) · names
   given by another system (source columns · API fields · source file names), kept character for character · domain terms.
4. Old Vietnamese comments: fix them while touching that file; no mass translation round.

## Example
- Situation: editing a revenue function in a data-load script.
- ✗ Wrong: add the comment "tinh doanh thu theo thang", name a file `thieu-dong-dim.csv`, rename the source column `Ma_KH` to
  `customer_code` because it looks nicer.
- ✓ Right: comment "Compute monthly revenue", file `missing-dim-row.csv`; the column named by the source system stays as is.

## Check
- A hook blocks a new comment line with Vietnamese, and a new file name or identifier that is not ASCII English.
- Whole-repo scan: `node .claude/skills/harness-audit/scripts/lang-scan.mjs .`

## Luật là gì
Mã, script, pipeline và measure viết bằng tiếng Anh: comment, docstring, log kỹ thuật, output CLI. Định danh và tên là ASCII tiếng
Anh. Chữ hiển thị cho người đọc và tên do hệ khác đặt thì không dịch.

## Khi nào áp
- Viết hay sửa mã · script · pipeline · measure.
- Đặt tên biến · hằng · hàm · lớp · kiểu · tham số · khoá config/JSON · test · file · thư mục · nhánh git.

## Phải làm gì
1. Comment · docstring · log kỹ thuật · output của CLI và script phụ ⇒ tiếng Anh. Một file một ngôn ngữ. Commit message: tiếng Anh,
   hoặc tiếng Việt có đủ dấu.
2. Định danh và tên ⇒ ASCII tiếng Anh.
3. Không dịch: chuỗi hiển thị cho người đọc (nhãn giao diện · nhãn báo cáo · mô tả bảng/cột sinh vào docs) · tên do hệ khác đặt
   (cột nguồn · trường API · tên file nguồn), giữ từng ký tự · thuật ngữ chuyên ngành.
4. Comment tiếng Việt cũ: sửa khi đang đụng file đó; không mở đợt dịch hàng loạt.

## Ví dụ
- Tình huống: sửa một hàm tính doanh thu trong script nạp dữ liệu.
- ✗ Sai: thêm comment "tinh doanh thu theo thang", đặt file `thieu-dong-dim.csv`, đổi tên cột nguồn `Ma_KH` thành `customer_code`
  cho đẹp.
- ✓ Đúng: comment "Compute monthly revenue", file `missing-dim-row.csv`; cột do hệ nguồn đặt tên giữ nguyên.

## Máy kiểm
- Hook chặn dòng comment mới có chữ Việt, và tên file hay định danh mới không phải ASCII tiếng Anh.
- Soát cả repo: `node .claude/skills/harness-audit/scripts/lang-scan.mjs .`

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_31_NoBrokenVietnamese` — Vietnamese, when written, has its diacritics · tiếng Việt đã viết thì đủ dấu
- Related · Liên quan: `Rule_Gate_27_HarnessLanguage` — the language of harness documents · ngôn ngữ của tài liệu harness
