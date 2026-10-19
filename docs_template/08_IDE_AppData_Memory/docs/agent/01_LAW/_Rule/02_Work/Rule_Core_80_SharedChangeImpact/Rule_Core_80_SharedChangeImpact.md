---
id: Rule_80
name: shared-change-impact
version: 4
kind: judgment
code: 02_Work
from: _Store/01_LAW/_Rule/02_Work/Rule_Core_80_SharedChangeImpact @v4 #101833982393
---
# Rule_Core_80_SharedChangeImpact — Changing something shared: name and handle every place that uses it

## What
Before changing something shared, the agent lists every place that uses it and what the change does to each one, and handles all
of them. Fixing one place that uses a source and leaving the others is a fault.

## When
- About to change something shared: a data source, a table, a query, a function, a UI component, a setting, a template.
- One source feeds several branches (files, tables, models).

## Do
1. List every place that uses the thing and the effect on each, before the change. The proposal carries that list.
2. Handle every place on the list. A source that feeds several branches: one branch written while another is still not fed ⇒
   the work is not done, even if the written branch is right.
3. Several places use one file: one fix of the file is enough, but each dataset / model still needs its own refresh.
4. The list cannot be completed ⇒ say which part could not be traced, before the change.

## Example
- Situation: one source table feeds three reports; the agent is asked to change how one column is calculated for report A.
- ✗ Wrong: change the column in the source table to suit report A; the other two reports quietly change their numbers.
- ✓ Right: list the three reports that use the column and how each number would change, show it, then change; if only A needs the
  new calculation, give A its own column.

## Check
- Judgment; where the CLI is present, `zemory graph` finds the places that use it. A harness part has its own list: `zemory impact <part>`
  (`Rule_Gate_83_HarnessFromStore`).

## Luật là gì
Trước khi sửa một thứ dùng chung, agent liệt kê mọi nơi đang dùng nó và tác động lên từng nơi, rồi xử đủ tất cả. Sửa một nơi dùng
mà bỏ các nơi khác cùng nguồn là lỗi.

## Khi nào áp
- Sắp sửa một thứ dùng chung: nguồn dữ liệu, bảng, câu truy vấn, hàm, thành phần giao diện, cấu hình, mẫu.
- Một nguồn đổ vào nhiều nhánh (file, bảng, model).

## Phải làm gì
1. Liệt kê mọi nơi đang dùng và tác động lên từng nơi, trước khi sửa. Đề xuất sửa phải kèm danh sách đó.
2. Xử đủ mọi nơi trong danh sách. Một nguồn đổ vào nhiều nhánh: ghi một nhánh mà còn nhánh chưa đổ ⇒ việc chưa xong, dù nhánh
   vừa ghi đúng.
3. Nhiều nơi dùng chung một file: sửa file một lần là đủ, nhưng mỗi dataset / model vẫn phải làm mới riêng.
4. Không liệt kê được đủ ⇒ nói rõ phần nào chưa dò được, trước khi sửa.

## Ví dụ
- Tình huống: một bảng nguồn nuôi ba báo cáo; agent được giao đổi cách tính một cột cho báo cáo A.
- ✗ Sai: sửa cột trong bảng nguồn cho khớp báo cáo A; hai báo cáo kia lặng lẽ đổi số.
- ✓ Đúng: liệt kê ba báo cáo đang dùng cột đó và số sẽ đổi ra sao ở từng báo cáo, trình rồi mới sửa; nếu chỉ A cần cách tính mới
  thì tách cột riêng cho A.

## Máy kiểm
- Phán đoán; có CLI thì `zemory graph` tra nơi dùng. Phần harness có danh sách riêng: `zemory impact <phần>`
  (`Rule_Gate_83_HarnessFromStore`).

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_83_HarnessFromStore` — impact of a harness part across repos · tác động của một phần harness lên các repo
- Related · Liên quan: `Rule_Gate_35_OneHome` — one source, many places that use it · một nguồn, nhiều nơi dùng
