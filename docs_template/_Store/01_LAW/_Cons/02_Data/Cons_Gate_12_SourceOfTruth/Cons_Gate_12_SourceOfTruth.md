---
id: Cons_12
name: source-of-truth
version: 4
kind: content
code: 02_Data
frame: true
---
# Cons_Gate_12_SourceOfTruth — The source of truth

## What
Every repo states in the `Cons.md` of this frame which data is the origin, which source wins when two disagree, which layers are
derived (rebuilt, never edited by hand), which sources must match and how they are compared, and what its business terms mean.

## When
- The product reads or keeps data.
- Two sources give different numbers.
- A business term (a measure, a status, a period) is defined or its meaning changes.

## Do
1. Fill the sections of `Cons.md`: origin · when they disagree · derived · must match · definitions (a table: term · meaning ·
   identifier).
2. Definitions: one line per business term — the term · what it means · the identifier it maps to (`Rule_Gate_35_OneHome`). How
   it is calculated, reconciled and its traps go into the repo's own skill, linked both ways.
3. Keeps and reads no data ⇒ `status: n/a` with the reason.

## Example
- Situation: a revenue reconciliation app fills the `Cons.md` of this frame.
- ✗ Wrong: no origin is named; when two sources disagree the agent takes the backup copy because it is faster, and the report is
  wrong for a week.
- ✓ Right: "Origin: point-of-sale data. When they disagree: the live source wins over the backup; the backup is used only when the
  live source is missing. Must match: revenue in the three systems is equal, compared by invoice number, not by amount.
  Definitions: Net revenue — revenue after discounts, before VAT — `NetRevenue`."

## Check
- `conform` reds when `Cons.md` is missing, unwritten, or a template mark `<…>` is left.

## Luật là gì
Mọi repo khai trong `Cons.md` của khung này: dữ liệu nào là gốc, nguồn nào thắng khi hai nguồn lệch, lớp nào là dẫn xuất (dựng lại,
không sửa tay), các nguồn nào phải khớp và so theo cách nào, và các thuật ngữ nghiệp vụ của repo nghĩa là gì.

## Khi nào áp
- Sản phẩm đọc hay giữ dữ liệu.
- Hai nguồn cho ra hai số khác nhau.
- Một thuật ngữ nghiệp vụ (chỉ số, trạng thái, kỳ) được định nghĩa hoặc đổi nghĩa.

## Phải làm gì
1. Điền các mục của `Cons.md`: gốc · khi lệch · dẫn xuất · phải khớp · định nghĩa.
2. Định nghĩa: mỗi thuật ngữ nghiệp vụ một dòng — thuật ngữ · nghĩa · định danh nó ánh xạ tới (`Rule_Gate_35_OneHome`). Cách tính,
   cách đối chiếu và bẫy của nó nằm ở skill riêng của repo, liên kết hai chiều.
3. Không giữ và không đọc dữ liệu nào ⇒ `status: n/a` kèm lý do.

## Ví dụ
- Tình huống: một app đối soát doanh thu điền `Cons.md` của khung này.
- ✗ Sai: không nói nguồn nào là gốc; khi hai nguồn lệch, agent lấy bản lưu dự phòng vì nó nhanh hơn, và báo cáo sai cả tuần.
- ✓ Đúng: "Gốc: dữ liệu máy bán hàng. Khi lệch: nguồn thật thắng bản dự phòng; bản dự phòng chỉ dùng khi nguồn thật không có. Phải
  khớp: doanh thu ở ba hệ bằng nhau, so theo mã hoá đơn, không theo số tiền. Định nghĩa: Doanh thu thuần — doanh thu sau chiết
  khấu, trước VAT — `NetRevenue`."

## Máy kiểm
- `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_35_OneHome` — one term, one name · một thuật ngữ một tên
- Related · Liên quan: `Cons_Gate_15_DataLifecycle` — how long data lives · dữ liệu sống bao lâu
