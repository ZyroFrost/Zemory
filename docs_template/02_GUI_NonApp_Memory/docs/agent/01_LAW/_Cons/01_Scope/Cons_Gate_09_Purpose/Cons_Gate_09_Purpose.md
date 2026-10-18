---
id: Cons_9
name: purpose
version: 3
kind: content
code: 01_Scope
frame: true
from: _Store/01_LAW/_Cons/01_Scope/Cons_Gate_09_Purpose @v3 #13cffb853b04
---
# Cons_Gate_09_Purpose — Purpose and the highest priority

## What
Every repo states its purpose in the `Cons.md` of this frame: what the product does · for whom · which problem it solves · the
highest priority when two goals clash · what is out of scope.

## When
- A repo is set up, or its purpose or priority changes.
- Two goals clash and the agent must choose between them: read this frame first.

## Do
1. Fill the `Cons.md` of this frame from its template; set `status: written`.
2. 2–6 sentences, enough for an agent new to the repo to understand the product without reading code.
3. This frame has no `n/a`: every repo has a purpose.

## Example
- Situation: a revenue reconciliation app (point-of-sale against accounting) fills the `Cons.md` of this frame.
- ✗ Wrong: copy the template and change only the product name; the priority stays empty, so the agent cannot choose when it has to
  trade speed for completeness.
- ✓ Right: "Does: finds every gap between the point-of-sale and the accounting books, for store accountants. Highest priority:
  never lose a gap once found, even if slower. Out of scope: never correct numbers in the source systems."

## Check
- `conform` reds when `Cons.md` is missing, its `status` is not `written`, or a template mark `<…>` is left.

## Luật là gì
Mọi repo khai mục đích của mình trong `Cons.md` của khung này: sản phẩm làm gì · cho ai · giải bài toán gì · ưu tiên tối cao khi
hai mục tiêu xung đột · việc nằm ngoài phạm vi.

## Khi nào áp
- Dựng repo, hoặc mục đích hay ưu tiên của repo thay đổi.
- Hai mục tiêu xung đột và agent phải chọn: đọc khung này trước.

## Phải làm gì
1. Điền `Cons.md` của khung này theo mẫu; đặt `status: written`.
2. 2–6 câu, đủ để một agent mới vào repo hiểu sản phẩm mà không đọc mã.
3. Khung này không có `n/a`: repo nào cũng có mục đích.

## Ví dụ
- Tình huống: một app đối soát doanh thu giữa máy bán hàng và kế toán điền `Cons.md` của khung này.
- ✗ Sai: chép nguyên mẫu, chỉ đổi tên sản phẩm; mục ưu tiên tối cao để trống nên agent không biết chọn gì khi phải đánh đổi tốc độ
  lấy độ đủ.
- ✓ Đúng: "Làm gì: phát hiện mọi khoản lệch giữa máy bán hàng và sổ kế toán, cho kế toán cửa hàng. Ưu tiên tối cao: không bao giờ
  để mất một khoản lệch đã phát hiện, kể cả khi phải chậm hơn. Ngoài phạm vi: không sửa số liệu ở hệ nguồn."

## Máy kiểm
- `conform` đỏ khi `Cons.md` thiếu, `status` khác `written`, hoặc còn dấu mẫu `<…>`.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_86_LawLayersAgree` — the filled `Cons.md` keeps every section of the frame · `Cons.md` đã điền giữ đủ mục của khung
