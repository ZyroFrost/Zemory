---
id: Rule_35
aka: 02-35
name: one-home
version: 9
kind: judgment
code: 01_Harness
from: _Store/01_LAW/_Rule/01_Harness/Rule_Gate_35_OneHome @v9 #d5bf4ead9d6d
---
# Rule_Gate_35_OneHome — One thing, one home

## What
Each thing exists once: one copy of a piece of content, one name for a concept, one screen for a function, one named query for a
calculation. Everything else points to it.

## When
- Adding anything: a file, a name, a screen, a query, a section of text.
- Seeing the same thing in two places.

## Do
1. Look for what exists first; reuse it. Nothing fits ⇒ add one copy in the right home. A duplicate found ⇒ propose removing it.
2. Names: one concept, one name, across code, data, docs and deliverables. Business names map to identifiers in the repo's own
   place for them (the constitution frame `Cons_Gate_12_SourceOfTruth`). Renaming ⇒ rename code and stored data in one pass, then
   search for the old name.
3. A key unique only inside one unit (a document number each store numbers on its own) is not a key of the whole system:
   joining on it alone multiplies rows across units. Add the unit to the key, or name the combined key.
4. Names given by another system (its tables, columns, source files) stay as they are; this law covers what the repo names: its
   measures, the columns of its deliverables, case names, slot names.
5. Content: each piece lives in one file of the right role; other places link to it with its number, never copy it.
6. Screens: one function, one screen (or report page) plus filters. A filter only chooses rows, never changes the calculation;
   a new way of calculating ⇒ its own screen.
7. Queries (SQL · DAX · M): each has a name, sits in the repo's query set (a structure slot) and is called by name, never written
   inline. A repo with old inline queries only lowers their count.

## Example
- Situation: a reconciliation app has an "Invoice details" screen; a view of invoices by hour is needed.
- ✗ Wrong: draw a new table with its own query; weeks later the two tables count "unsigned invoices" differently for the same
  store and day.
- ✓ Right: reuse the table and add an hour filter; the calculation stays, the query is called by name from the query set.

## Check
- A hook blocks a new inline SQL query when the repo declares a query set; the other points are judgment.

## Luật là gì
Mỗi thứ chỉ tồn tại một lần: một bản cho một nội dung, một tên cho một khái niệm, một màn cho một chức năng, một câu truy vấn có
tên cho một cách tính. Mọi chỗ khác trỏ về đó.

## Khi nào áp
- Thêm bất cứ thứ gì: file, tên, màn hình, câu truy vấn, đoạn văn.
- Thấy cùng một thứ ở hai nơi.

## Phải làm gì
1. Tìm cái đã có trước; có thì dùng lại. Không có ⇒ thêm một bản ở đúng nhà. Thấy bản trùng ⇒ đề xuất dọn.
2. Tên: một khái niệm một tên, xuyên suốt mã, dữ liệu, tài liệu, bản giao. Tên nghiệp vụ ánh xạ sang định danh ở chỗ riêng của
   repo cho việc đó (khung hiến pháp `Cons_Gate_12_SourceOfTruth`). Đổi tên ⇒ đổi một lượt cả mã lẫn dữ liệu đã lưu, rồi tìm tên cũ.
3. Một mã chỉ duy nhất trong một đơn vị (số chứng từ mỗi cửa hàng tự đánh) không phải khoá của cả hệ: join theo riêng nó là nhân
   dòng chéo đơn vị. Thêm đơn vị vào khoá, hoặc đặt tên cho khoá đã ghép.
4. Tên do hệ khác đặt (bảng, cột, file nguồn của họ) giữ nguyên; luật này áp cho thứ repo tự đặt tên: measure, cột của bản giao,
   tên case, tên slot.
5. Nội dung: mỗi nội dung sống ở một file đúng vai; chỗ khác dẫn link kèm số hiệu, không chép lại.
6. Màn hình: một chức năng một màn (hoặc trang báo cáo) cộng bộ lọc. Bộ lọc chỉ chọn dòng, không đổi cách tính; cách tính mới ⇒
   màn riêng.
7. Truy vấn (SQL · DAX · M): mỗi câu có tên, nằm trong bộ câu truy vấn của repo (một slot cấu trúc), gọi theo tên, không viết tại
   chỗ. Repo có câu viết tại chỗ từ trước thì chỉ được giảm số đó.

## Ví dụ
- Tình huống: app đối soát có màn "Chi tiết hóa đơn"; cần thêm màn xem hóa đơn theo giờ.
- ✗ Sai: vẽ bảng mới với truy vấn riêng; vài tuần sau hai bảng đếm "hóa đơn chưa ký" ra hai số khác nhau cho cùng cửa hàng, cùng
  ngày.
- ✓ Đúng: dùng lại bảng cũ, thêm bộ lọc theo giờ; cách tính giữ nguyên, truy vấn gọi theo tên từ bộ câu truy vấn.

## Máy kiểm
- Hook chặn câu SQL mới viết tại chỗ khi repo khai bộ câu truy vấn; các ý khác là phán đoán.

## Links · Liên kết
- Related · Liên quan: `Cons_Gate_12_SourceOfTruth` — where the repo names its business terms · nơi repo định nghĩa tên nghiệp vụ
- Related · Liên quan: `Rule_Gate_85_ProposeChecked` — searching before adding a part · dò trước khi thêm phần
