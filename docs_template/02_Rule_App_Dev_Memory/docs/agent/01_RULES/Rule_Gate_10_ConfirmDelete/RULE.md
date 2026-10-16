---
id: Rule_10
aka: 02-10
name: confirm-delete
version: 2
kind: action
from: _Store/01_RULES/Rule_Gate_10_ConfirmDelete @v2 #cef3ee96e524
---
# Rule_Gate_10_ConfirmDelete Thao tác xoá phải được xác nhận trước

- Xoá file · code · hàm · lệnh · chức năng · sản phẩm giao đi (deliverable · measure) · script · nội dung docs · thư mục đều coi là bất khả đảo.
- Trước khi xoá ⇒ nêu đối tượng và lý do, chờ chấp thuận rồi mới làm; không tự xoá rồi báo sau.
- Thứ dư thừa hoặc không còn dùng ⇒ đề xuất, không tự xoá.
- Bổ sung · mở rộng không cần xác nhận; xoá · thu hẹp luôn cần.
- Bãi bỏ một luật ⇒ giữ số, ghi *bãi bỏ*.
- Chốt máy: guard chặn mọi lệnh xoá file trong repo (`rm` · `del` · `Remove-Item` · `git rm` · xoá trong script) và mọi lần sửa làm mất một số luật trong `01`/`02`, khi chưa có cờ `.allow-delete`; thư mục tạm được miễn.
