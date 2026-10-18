---
id: Rule_80
name: shared-change-impact
version: 3
kind: judgment
code: 02_Work
from: _Store/01_LAW/_Rule/02_Work/Rule_Core_80_SharedChangeImpact @v3 #52dc8fab995c
---
# Rule_Core_80_SharedChangeImpact Sửa thứ dùng chung thì nêu và xử đủ mọi nơi dùng

- Thứ dùng chung (nguồn dữ liệu · bảng · câu truy vấn · hàm · thành phần giao diện · cấu hình · mẫu) sắp bị sửa ⇒ trước khi sửa, liệt kê mọi nơi đang dùng nó và tác động lên từng nơi.
- Đề xuất sửa phải kèm danh sách đó. Sửa một nơi dùng mà bỏ nơi khác cùng nguồn là lỗi.
- Một nguồn đổ vào nhiều nhánh (file · bảng · model): ghi một nhánh mà còn nhánh chưa đổ ⇒ việc chưa xong, dù nhánh vừa ghi đúng.
  Nhiều nơi dùng chung một file thì sửa một lần là đủ, nhưng mỗi dataset / model vẫn phải làm mới riêng.
- Không liệt kê được đủ ⇒ nói rõ phần nào chưa dò được trước khi sửa.
- Phép kiểm: phán đoán; khi có CLI, `zemory graph` tra nơi dùng.

## Ví dụ

- Tình huống: một bảng nguồn nuôi ba báo cáo; agent được giao đổi cách tính một cột cho báo cáo A.
- ✗ Sai: sửa cột trong bảng nguồn cho khớp báo cáo A; hai báo cáo kia lặng lẽ đổi số.
- ✓ Đúng: liệt kê ba báo cáo đang dùng cột đó và số sẽ đổi ra sao ở từng báo cáo, trình rồi mới sửa; nếu chỉ A cần cách tính mới thì tách cột riêng cho A.
