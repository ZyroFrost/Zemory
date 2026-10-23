---
version: 5
lang: vi
---
# Rule_Core_80_SharedChangeImpact — Changing something shared: name and handle every place that uses it

## Luật là gì
Trước khi sửa một thứ dùng chung, agent liệt kê mọi nơi đang dùng nó và tác động lên từng nơi, rồi xử đủ tất cả. Sửa một nơi dùng
mà bỏ các nơi khác cùng nguồn là lỗi.

## Khi nào áp
- Sắp sửa một thứ dùng chung: nguồn dữ liệu, bảng, câu truy vấn, hàm, thành phần giao diện, cấu hình, mẫu.
- Một nguồn đổ vào nhiều nhánh (file, bảng, model).

## Phải làm gì
1. Liệt kê mọi nơi đang dùng và tác động lên từng nơi, trước khi sửa. Đề xuất sửa phải kèm danh sách đó.
2. Xử đủ mọi nơi trong danh sách. Một nguồn đổ vào nhiều nhánh: ghi một nhánh mà còn nhánh chưa đổ ⇒ việc chưa xong, dù nhánh
   vừa ghi đúng.
3. Nhiều nơi dùng chung một file: sửa file một lần là đủ, nhưng mỗi dataset / model vẫn phải làm mới riêng.
4. Không liệt kê được đủ ⇒ nói rõ phần nào chưa dò được, trước khi sửa.

## Ví dụ
- Tình huống: một bảng nguồn nuôi ba báo cáo; agent được giao đổi cách tính một cột cho báo cáo A.
- ✗ Sai: sửa cột trong bảng nguồn cho khớp báo cáo A; hai báo cáo kia lặng lẽ đổi số.
- ✓ Đúng: liệt kê ba báo cáo đang dùng cột đó và số sẽ đổi ra sao ở từng báo cáo, trình rồi mới sửa; nếu chỉ A cần cách tính mới
  thì tách cột riêng cho A.

## Máy kiểm
- Phán đoán; có CLI thì `zemory graph` tra nơi dùng. Phần harness có danh sách riêng: `zemory impact <phần>`
  (`Rule_Gate_83_HarnessFromStore`).
