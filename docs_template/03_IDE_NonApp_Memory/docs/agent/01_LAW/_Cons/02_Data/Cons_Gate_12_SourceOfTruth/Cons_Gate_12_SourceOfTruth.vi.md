---
version: 6
lang: vi
---
# Cons_Gate_12_SourceOfTruth — The source of truth

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
3. Thuật ngữ mà repo khác làm chủ nghĩa thì không định nghĩa lại: dòng đó ghi tên repo làm chủ (DW giữ cấu trúc thì trỏ mỗi chỉ số
   nghiệp vụ về phòng làm chủ nó). Repo chỉ giữ cấu trúc thì ghi rõ như vậy ở mục này.
4. Không giữ và không đọc dữ liệu nào ⇒ `status: n/a` kèm lý do.

## Ví dụ
- Tình huống: một app đối soát doanh thu điền `Cons.md` của khung này.
- ✗ Sai: không nói nguồn nào là gốc; khi hai nguồn lệch, agent lấy bản lưu dự phòng vì nó nhanh hơn, và báo cáo sai cả tuần.
- ✓ Đúng: "Gốc: dữ liệu máy bán hàng. Khi lệch: nguồn thật thắng bản dự phòng; bản dự phòng chỉ dùng khi nguồn thật không có. Phải
  khớp: doanh thu ở ba hệ bằng nhau, so theo mã hoá đơn, không theo số tiền. Định nghĩa: Doanh thu thuần — doanh thu sau chiết
  khấu, trước VAT — `NetRevenue`."

## Máy kiểm
- `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.
