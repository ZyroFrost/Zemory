---
id: Skill_Dev_DbDesign
name: dev-db-design
version: 3
type: process
description: Design or change tables in a database or data warehouse - one fact in one table, dimensional modelling, and a review of the whole schema before any new table or column. Use whenever a table, column, view or key is about to be created or changed. Vietnamese triggers - "tạo bảng", "thêm cột", "thiết kế bảng", "sửa schema", "mô hình dữ liệu", "dim", "fact".
from: _Store/03_SKILLS/Skill_Dev_DbDesign @v3 #f0847ec5b8fd
---

# dev-db-design — thiết kế bảng và cột

> Tên bảng, tên cột, nguồn nào ghi vào đâu là của từng repo (hiến pháp `01_LAW/_Cons`: khung kiến trúc, ranh giới ghi,
> nguồn sự thật). Skill này giữ cách làm chung.

## 1. Trước khi tạo một bảng hay cột mới

- Rà toàn hệ: thông tin đó đã có ở bảng nào chưa (tra danh mục bảng · `INFORMATION_SCHEMA` · từ điển dữ liệu của repo).
  Có rồi ⇒ dùng lại, không tạo bản thứ hai (`Rule_Gate_35_OneHome`).
- Dò luật và hiến pháp của repo: quy cách tên, ranh giới ghi, đường đổi cấu trúc.
- Đề xuất kèm lý do và nơi dùng; được duyệt mới tạo. Đổi bảng đang có nơi dùng ⇒ liệt kê nơi dùng trước (`Rule_Core_80_SharedChangeImpact`).

## 2. Nguyên tắc mô hình chiều

- Một thông tin sống ở đúng một bảng. Bảng chiều (dim) giữ thuộc tính của một thực thể và là nhà duy nhất của các
  thuộc tính đó; bảng sự kiện (fact) chỉ giữ khoá tới các chiều và các số đo.
- Mỗi bảng sự kiện khai rõ độ hạt (một dòng là gì). Không trộn hai độ hạt trong một bảng.
- Chiều dùng chung giữa nhiều bảng sự kiện là cùng một bảng, cùng khoá.
- Khoá thay thế (surrogate) cho bảng chiều; khoá nghiệp vụ giữ làm cột riêng.
- Số đo cộng được ở bảng sự kiện; tỉ lệ và trung bình tính lúc truy vấn, không lưu sẵn.
- Thuộc tính đổi theo thời gian: chọn cách giữ lịch sử (ghi đè hay thêm dòng có hiệu lực từ–đến) và ghi vào từ điển.

- Tên trong kho dùng chung: bảng `Dim_*` · `Fact_*` · `Bridge_*` (schema `dbo`), object vận hành `_<Tên>`, cột tiếng Anh sạch.
  Kho là tài sản chung của mọi phòng: bảng thêm cho một phòng vẫn theo đúng chuẩn này.

## 3. Đổi cấu trúc

- Đổi cấu trúc chỉ qua đường repo đã khai (thư mục mô hình + script), không sửa tay trên máy chủ.
- Câu đổi cấu trúc, đổi quyền, sửa dữ liệu chạy khi người dùng ra lệnh.
- Sau khi đổi: đo lại số dòng và đối chiếu với nguồn, bằng số (`Rule_Gate_01_DoneMeansRun`).
