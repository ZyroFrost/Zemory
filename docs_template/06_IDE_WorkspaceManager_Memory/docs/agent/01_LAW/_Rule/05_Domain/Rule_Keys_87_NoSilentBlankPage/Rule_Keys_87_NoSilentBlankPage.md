---
id: Rule_87
name: no-silent-blank-page
version: 1
kind: action
code: 05_Domain
checked: [Rule_Keys_22_FailLoud, Rule_Gate_84_PbipOpenCheck]
from: _Store/01_LAW/_Rule/05_Domain/Rule_Keys_87_NoSilentBlankPage @v1 #eecb5554fae0
---
# Rule_Keys_87_NoSilentBlankPage — A report page never goes blank from its own default filters without a check catching it

## What
A page's own default filters (a slicer's baked-in selection) must never intersect to zero rows against each other. When one
slicer defaults to a fixed value or range and another defaults to a moving one ('Current Year' / 'Current Month' / 'Current
Week'), the fixed one goes stale over time and the page silently shows no data — no error anywhere, only a reader finding a
blank page. The static gate must catch this before it reaches a reader.

## When
- Building or editing the default selection of a slicer on a White / Red report page.
- Merging a page's slicers into another page (a slicer's own default travels with it).
- Running the static gate on a White / Red report.

## Do
1. A slicer's own default is a FIXED value or range (a date literal, a specific name) ⇒ check every other slicer on the same
   page for a MOVING default ('Current Year' / 'Current Month' / 'Current Week' or the like); a fixed default next to a moving
   one is a defect, not a design choice — drop the fixed default, or drop the slicer if it only carries one.
2. Merging pages ⇒ carry over content, never a hidden slicer's stale default; re-check every moved slicer against the
   receiving page's own defaults.
3. The static gate's `stale-default` check must run on every White / Red report before it is called built; its failure blocks
   the gate the same as a file-breaking error.

## Example
- Situation: a page is assembled from two merged pages; one brings a hidden DateKey slicer defaulting to a fixed March 2025
  range, the other's own Year/Month slicers default to 'Current Year'/'Current Month'.
- ✗ Wrong: ship it; the intersection is empty from April 2025 onward and every visual on the page shows no data, found only
  by a reader screenshotting a blank page months later.
- ✓ Right: the `stale-default` check in `scripts/pbi_gate.py` catches the conflict at build time; drop the fixed-range
  slicer before publishing.

## Check
- `scripts/pbi_gate.py`'s `check_stale_default_filter` (the `stale-default` check) runs on every White report's static layer
  and fails when a page carries both a fixed-default slicer and a moving-default slicer.

## Luật là gì
Bộ lọc mặc định của chính một trang (lựa chọn khai sẵn trong slicer) không bao giờ được giao nhau ra rỗng. Một slicer mặc định
giá trị/khoảng CỐ ĐỊNH đứng cùng trang với một slicer khác mặc định giá trị DI ĐỘNG ('Current Year' / 'Current Month' /
'Current Week') thì cái cố định sẽ cũ dần theo thời gian và trang lặng lẽ hiện rỗng — không có lỗi nào hiện ra, chỉ có người
đọc thấy trang trống. Cổng máy tĩnh phải bắt được lỗi này trước khi tới tay người đọc.

## Khi nào áp
- Dựng hay sửa lựa chọn mặc định của một slicer trên trang White / Red.
- Gộp slicer của một trang vào trang khác (mặc định của slicer đi theo nó).
- Chạy cổng tĩnh trên report White / Red.

## Phải làm gì
1. Mặc định của một slicer là giá trị/khoảng CỐ ĐỊNH ⇒ kiểm mọi slicer khác trên cùng trang xem có mặc định DI ĐỘNG
   ('Current Year' / 'Current Month' / 'Current Week' hay tương tự) không; mặc định cố định đứng cạnh mặc định di động là
   lỗi, không phải lựa chọn thiết kế — bỏ mặc định cố định, hoặc bỏ cả slicer nếu nó chỉ mang mỗi việc đó.
2. Gộp trang ⇒ mang theo nội dung, không mang theo mặc định cũ của một slicer ẩn; kiểm lại từng slicer vừa dời so với mặc
   định của chính trang nhận.
3. Phép kiểm `stale-default` của cổng tĩnh phải chạy trên mọi report White / Red trước khi gọi là xong; lỗi của nó chặn cổng
   như một lỗi làm hỏng file.

## Ví dụ
- Tình huống: một trang được ráp từ hai trang gộp lại; một trang mang theo slicer DateKey ẩn mặc định khoảng cố định
  tháng 3/2025, trang kia có Year/Month mặc định 'Current Year'/'Current Month'.
- ✗ Sai: giao đi; từ tháng 4/2025 trở đi phần giao nhau rỗng, mọi visual trên trang hiện không có dữ liệu, chỉ phát hiện khi
  người đọc chụp màn hình trang trống nhiều tháng sau.
- ✓ Đúng: phép kiểm `stale-default` trong `scripts/pbi_gate.py` bắt lỗi ngay lúc dựng; bỏ slicer mặc định khoảng cố định
  trước khi publish.

## Máy kiểm
- `check_stale_default_filter` (phép kiểm `stale-default`) của `scripts/pbi_gate.py` chạy trong lớp tĩnh của mọi report
  White và báo lỗi khi một trang vừa có slicer mặc định cố định vừa có slicer mặc định di động.

## Links · Liên kết
- Implements · Thi hành: `Skill_PBI_Pbip` — the stale-default check and how to fix it · phép kiểm stale-default và cách sửa
