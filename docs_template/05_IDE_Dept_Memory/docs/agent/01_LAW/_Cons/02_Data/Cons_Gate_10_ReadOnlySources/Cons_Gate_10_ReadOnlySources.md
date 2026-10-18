---
id: Cons_10
name: read-only-sources
version: 4
kind: content
code: 02_Data
frame: true
from: _Store/01_LAW/_Cons/02_Data/Cons_Gate_10_ReadOnlySources @v4 #692736b9b916
---
# Cons_Gate_10_ReadOnlySources — Outside sources are read-only

## What
Every repo lists in the `Cons.md` of this frame each outside system the product reads (database · API · shared folder · mailbox ·
service), how it may read it, and any write exception. Outside sources are read, never written, except where listed.

## When
- The product starts reading a new outside system, or changes how it reads one.
- The agent is about to write to an outside system: check the exceptions here first.

## Do
1. Fill the source table of `Cons.md`: name · kind · allowed way of reading. A database server is named in the `Server` column.
2. A write exception has an owner and a narrow scope: exactly one area, exactly one kind of action.
3. Reads no outside system ⇒ `status: n/a` with the reason.

## Example
- Situation: an app that gathers documents from the company's shared drive fills the `Cons.md` of this frame.
- ✗ Wrong: write "read sources only" without naming which sources or with what rights; a month later the agent adds a feature that
  writes back to the shared drive because nothing forbids it.
- ✓ Right: "Shared drive: read only, with the application's rights. Mailbox: read only, with the signed-in person's rights. Write
  exception: exactly one folder for copies, owned by IT; create new files only, never edit or delete."

## Check
- `conform` reds when `Cons.md` is missing, unwritten, or a template mark `<…>` is left.
- The guard reads the `Server` column as the servers SQL may reach (`allowedSqlServers`).

## Luật là gì
Mọi repo liệt kê trong `Cons.md` của khung này từng hệ bên ngoài mà sản phẩm đọc (cơ sở dữ liệu · API · thư mục dùng chung · hộp
thư · dịch vụ), cách đọc được phép, và ngoại lệ ghi nếu có. Nguồn ngoài chỉ được đọc, không bao giờ bị ghi, trừ chỗ đã khai.

## Khi nào áp
- Sản phẩm bắt đầu đọc một hệ ngoài mới, hoặc đổi cách đọc.
- Agent sắp ghi vào một hệ ngoài: xem ngoại lệ ở đây trước.

## Phải làm gì
1. Điền bảng nguồn trong `Cons.md`: tên · loại · cách đọc được phép. Máy chủ cơ sở dữ liệu ghi ở cột `Server`.
2. Ngoại lệ ghi phải có chủ và phạm vi hẹp: đúng một vùng, đúng một loại thao tác.
3. Không đọc hệ ngoài nào ⇒ `status: n/a` kèm lý do.

## Ví dụ
- Tình huống: một app tổng hợp tài liệu từ ổ chia sẻ của công ty điền `Cons.md` của khung này.
- ✗ Sai: ghi "chỉ đọc nguồn" mà không nêu nguồn nào, đọc bằng quyền gì; một tháng sau agent thêm chức năng ghi ngược lên ổ chia sẻ
  vì không thấy chỗ nào cấm.
- ✓ Đúng: "Ổ chia sẻ: chỉ đọc qua quyền ứng dụng. Hộp thư: chỉ đọc qua quyền người đăng nhập. Ngoại lệ ghi: đúng một thư mục lưu
  bản sao, bộ phận IT làm chủ; chỉ tạo file mới, không sửa, không xoá."

## Máy kiểm
- `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.
- Guard đọc cột `Server` làm danh sách máy chủ SQL được phép (`allowedSqlServers`).

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — original inputs are read-only · đầu vào gốc chỉ đọc
- Related · Liên quan: `Cons_Gate_11_WriteBoundary` — where the product may write · sản phẩm được ghi vào đâu
