---
id: Rule_10
aka: 02-10
name: destructive-ops
version: 6
kind: action
code: 03_Safety
from: _Store/01_LAW/_Rule/03_Safety/Rule_Gate_10_DestructiveOps @v6 #63e7ec34965e
---
# Rule_Gate_10_DestructiveOps Thao tác phá dữ liệu phải được xác nhận; đầu vào gốc chỉ đọc

- Xoá file · code · hàm · lệnh · chức năng · sản phẩm giao đi (deliverable · measure) · script · nội dung docs · thư mục đều coi là bất khả đảo.
- Ghi đè cái đang có cũng là xoá: thêm chức năng ⇒ mở rộng cái cũ, không thay cái cũ; chỉ thay khi yêu cầu nói rõ.
- Trước khi xoá hoặc ghi đè ⇒ nêu đối tượng và lý do, chờ chấp thuận rồi mới làm; không làm rồi báo sau.
- Thứ dư thừa hoặc không còn dùng ⇒ đề xuất, không tự xoá. Bổ sung · mở rộng không cần xác nhận; xoá · thu hẹp luôn cần.
- Đầu vào gốc nhận từ bên ngoài (file được gửi tới · bản kéo từ nguồn) ⇒ chỉ đọc: không sửa, không ghi đè, không xoá; làm sạch trên bản chép. Mất đầu vào là mất hẳn, phải xin lại bên gửi. Chỗ đặt đầu vào gốc và bản trung gian: slot của `02_STRUCTURE`.
- Bãi bỏ một luật ⇒ giữ số, ghi *bãi bỏ*.
- Chốt máy: guard chặn lệnh xoá file trong repo (`rm` · `del` · `Remove-Item` · `git rm` · xoá trong script) và lần sửa làm mất số luật, khi chưa có cờ `.allow-delete`; thư mục tạm được miễn. Đầu vào gốc: khoá `protected` của marker (glob, ví dụ `data/*/01_raw`).

## Ví dụ

- Tình huống: bên kinh doanh gửi file Excel doanh số tháng có vài cột sai định dạng; trong thư mục còn ba file cũ có vẻ không ai dùng.
- ✗ Sai: sửa thẳng file gốc rồi lưu đè, xoá luôn ba file cũ và ghi "đã dọn file thừa"; một file là bản phòng khác vẫn mở hằng tuần.
- ✓ Đúng: chép file gốc sang chỗ xử lý để làm sạch, giữ nguyên bản gốc; liệt kê ba file cũ kèm lý do, chờ đồng ý từng file rồi mới xoá.
