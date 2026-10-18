---
id: Cons_13
name: architecture
version: 3
kind: content
code: 03_System
frame: true
from: _Store/01_LAW/_Cons/03_System/Cons_Gate_13_Architecture @v3 #dc7f10c349ac
---
# Cons_Gate_13_Architecture — Architecture

## What
Every repo states in the `Cons.md` of this frame the layers of its product, the calls allowed between them, and the boundaries no
call may cross.

## When
- The product has running code, and a layer is added or a new call between layers is about to be written.

## Do
1. Fill the two sections of `Cons.md`: the layers · not to be crossed.
2. The product has no running code ⇒ `status: n/a` with the reason.

## Example
- Situation: a web app with a UI, a server and a database fills the `Cons.md` of this frame.
- ✗ Wrong: no boundary is declared; a new screen sends a query straight from the UI to the database "to be quick".
- ✓ Right: "Layers: UI → server → database. Not to be crossed: the UI never sends a raw query; it sends only a query name and its
  parameters."

## Check
- `conform` reds when `Cons.md` is missing, unwritten, or a template mark `<…>` is left.

## Luật là gì
Mọi repo khai trong `Cons.md` của khung này: các lớp của sản phẩm, đường gọi được phép giữa các lớp, và ranh giới không lời gọi nào
được vượt.

## Khi nào áp
- Sản phẩm có mã chạy, và sắp thêm một lớp hay viết một đường gọi mới giữa các lớp.

## Phải làm gì
1. Điền hai mục của `Cons.md`: các lớp · không được vượt.
2. Sản phẩm không có mã chạy ⇒ `status: n/a` kèm lý do.

## Ví dụ
- Tình huống: một app web có giao diện, máy chủ và cơ sở dữ liệu điền `Cons.md` của khung này.
- ✗ Sai: không khai ranh giới; một màn mới gửi thẳng câu truy vấn từ giao diện xuống cơ sở dữ liệu "cho nhanh".
- ✓ Đúng: "Các lớp: giao diện → máy chủ → cơ sở dữ liệu. Không được vượt: giao diện không bao giờ gửi câu truy vấn thô; chỉ gửi
  tên truy vấn và tham số."

## Máy kiểm
- `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.

## Links · Liên kết
- Implements · Thi hành: `Skill_Dev_AppDesign` — how the layers of an app are built · cách dựng các lớp của app
- Related · Liên quan: `Rule_Gate_35_OneHome` — queries are called by name · truy vấn gọi theo tên
