---
id: Cons_16
name: dependencies
version: 3
kind: content
code: 03_System
frame: true
from: _Store/01_LAW/_Cons/03_System/Cons_Gate_16_Dependencies @v3 #a9a20f7ec04c
---
# Cons_Gate_16_Dependencies — Dependencies and environment

## What
Every repo states in the `Cons.md` of this frame the platforms or vendors it must use, the parts it has no source code for, the
shared machines it runs on and their limits, and any old system still running beside it and how the two relate.

## When
- A platform, vendor or closed component is added or replaced.
- The product runs on a shared machine.
- A new system replaces an old one that keeps running for a while.

## Do
1. Fill the four sections of `Cons.md`: required · no source code · shared environment · old system.
2. No real dependency ⇒ `status: n/a` with the reason.

## Example
- Situation: a new data warehouse that replaces an old reporting system fills the `Cons.md` of this frame.
- ✗ Wrong: the relation with the old system is not declared; the agent lets the new system read numbers from the old one "to save a
  reload", the two become tied and the old one can never be switched off.
- ✓ Right: "Old system: kept as a backup until the new one has run well for a full year; the new system never reads from the old,
  the old one is only used to compare. Shared server: measure free space before each large load."

## Check
- `conform` reds when `Cons.md` is missing, unwritten, or a template mark `<…>` is left.

## Luật là gì
Mọi repo khai trong `Cons.md` của khung này: nền tảng hay nhà cung cấp bắt buộc, thành phần không có mã nguồn, máy dùng chung mà
sản phẩm chạy trên đó và giới hạn của nó, và hệ cũ còn chạy song song cùng quan hệ giữa hai hệ.

## Khi nào áp
- Thêm hay thay một nền tảng, nhà cung cấp, thành phần đóng.
- Sản phẩm chạy trên máy dùng chung.
- Một hệ mới thay hệ cũ mà hệ cũ còn chạy một thời gian.

## Phải làm gì
1. Điền bốn mục của `Cons.md`: bắt buộc · không có mã nguồn · môi trường dùng chung · hệ cũ.
2. Không có phụ thuộc đáng kể ⇒ `status: n/a` kèm lý do.

## Ví dụ
- Tình huống: một kho dữ liệu mới thay hệ báo cáo cũ điền `Cons.md` của khung này.
- ✗ Sai: không khai quan hệ với hệ cũ; agent cho hệ mới đọc số từ hệ cũ để "đỡ nạp lại", hai hệ dính nhau và không tắt được hệ cũ.
- ✓ Đúng: "Hệ cũ: giữ làm bản dự phòng tới khi hệ mới chạy ổn đủ một năm; hệ mới không bao giờ đọc dữ liệu từ hệ cũ, hệ cũ chỉ dùng
  để đối chiếu. Máy chủ dùng chung: đo dung lượng trống trước mỗi lần nạp lớn."

## Máy kiểm
- `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.

## Links · Liên kết
- Related · Liên quan: `Cons_Gate_12_SourceOfTruth` — the old system is not a source · hệ cũ không phải nguồn
