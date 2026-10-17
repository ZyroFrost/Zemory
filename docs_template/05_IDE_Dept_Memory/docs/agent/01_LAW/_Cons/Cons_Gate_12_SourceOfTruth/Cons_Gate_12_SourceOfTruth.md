---
id: Cons_12
name: source-of-truth
version: 1
kind: content
frame: true
from: _Store/01_LAW/_Cons/Cons_Gate_12_SourceOfTruth @v1 #c8a9fd54d67c
---
# Cons_Gate_12_SourceOfTruth Nguồn sự thật

- Repo phải khai trong `Cons.md` của khung này: dữ liệu nào là gốc · nguồn nào thắng khi hai nguồn lệch · lớp nào là dẫn xuất (dựng lại được, không sửa tay) · các nguồn phải khớp nhau theo phép so nào.
- Không giữ hay đọc dữ liệu nào ⇒ `status: n/a` kèm lý do.
- Lối đúng: viết `Cons.md` theo mẫu, hoặc ghi `status: n/a` kèm lý do.
- Phép kiểm: `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.

## Ví dụ

- Tình huống: một app đối soát doanh thu viết `Cons.md` cho khung này.
- ✗ Sai: không nói nguồn nào là gốc; khi hai nguồn lệch, agent lấy bản lưu dự phòng vì nó nhanh hơn, và báo cáo sai cả tuần.
- ✓ Đúng: "Gốc: dữ liệu máy bán hàng. Khi lệch: nguồn thật thắng bản lưu dự phòng; bản dự phòng chỉ dùng khi nguồn thật không có. Phải khớp: doanh thu ở ba hệ bằng nhau, so theo mã hoá đơn, không theo số tiền."
