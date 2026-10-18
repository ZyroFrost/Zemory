---
id: Cons_15
name: data-lifecycle
version: 3
kind: content
code: 02_Data
frame: true
from: _Store/01_LAW/_Cons/02_Data/Cons_Gate_15_DataLifecycle @v3 #9ebd989a1b91
---
# Cons_Gate_15_DataLifecycle — The life of data

## What
Every repo states in the `Cons.md` of this frame which data may be deleted, which is only archived and never deleted, which tables
are append-only, what may be cached and when it expires, and how long each kind of data is kept.

## When
- The product keeps data.
- The agent is about to delete, clean up or cache data.

## Do
1. Fill the four sections of `Cons.md`: never deleted · append-only · cache · how long kept.
2. Keeps no data ⇒ `status: n/a` with the reason.

## Example
- Situation: a data warehouse loaded from several source systems fills the `Cons.md` of this frame.
- ✗ Wrong: nothing about deleting is declared; the agent clears an old table "nobody uses" with a delete and three years of history
  are gone.
- ✓ Right: "Data is never deleted, only archived. Log tables are append-only. Only raw data of closed periods is cached; interpreted
  results are never cached."

## Check
- `conform` reds when `Cons.md` is missing, unwritten, or a template mark `<…>` is left.

## Luật là gì
Mọi repo khai trong `Cons.md` của khung này: dữ liệu nào được xoá, dữ liệu nào chỉ được lưu trữ (archive) và không bao giờ xoá,
bảng nào chỉ ghi thêm, được cache gì và hết hạn khi nào, mỗi loại dữ liệu giữ bao lâu.

## Khi nào áp
- Sản phẩm giữ dữ liệu.
- Agent sắp xoá, dọn hay cache dữ liệu.

## Phải làm gì
1. Điền bốn mục của `Cons.md`: không bao giờ xoá · chỉ ghi thêm · cache · thời hạn giữ.
2. Không giữ dữ liệu nào ⇒ `status: n/a` kèm lý do.

## Ví dụ
- Tình huống: một kho dữ liệu nạp từ nhiều hệ nguồn điền `Cons.md` của khung này.
- ✗ Sai: không khai gì về xoá; agent dọn một bảng cũ "không ai dùng" bằng lệnh xoá, mất lịch sử ba năm.
- ✓ Đúng: "Không bao giờ xoá dữ liệu, chỉ archive. Bảng nhật ký chỉ ghi thêm. Chỉ cache dữ liệu thô của kỳ đã chốt; không bao giờ
  cache kết quả đã diễn giải."

## Máy kiểm
- `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — deleting needs approval · xoá phải được duyệt
- Related · Liên quan: `Cons_Gate_14_Access` — how long personal data is kept · dữ liệu cá nhân giữ bao lâu
