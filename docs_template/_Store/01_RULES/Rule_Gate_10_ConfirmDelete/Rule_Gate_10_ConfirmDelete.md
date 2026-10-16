---
id: Rule_10
aka: 02-10
name: confirm-delete
version: 3
kind: action
---
# Rule_Gate_10_ConfirmDelete Thao tác xoá phải được xác nhận trước

- Xoá file · code · hàm · lệnh · chức năng · sản phẩm giao đi (deliverable · measure) · script · nội dung docs · thư mục đều coi là bất khả đảo.
- Trước khi xoá ⇒ nêu đối tượng và lý do, chờ chấp thuận rồi mới làm; không tự xoá rồi báo sau.
- Thứ dư thừa hoặc không còn dùng ⇒ đề xuất, không tự xoá.
- Bổ sung · mở rộng không cần xác nhận; xoá · thu hẹp luôn cần.
- Bãi bỏ một luật ⇒ giữ số, ghi *bãi bỏ*.
- Chốt máy: guard chặn mọi lệnh xoá file trong repo (`rm` · `del` · `Remove-Item` · `git rm` · xoá trong script) và mọi lần sửa làm mất một số luật trong `01`/`02`, khi chưa có cờ `.allow-delete`; thư mục tạm được miễn.

## Ví dụ

- Tình huống: Agent dọn một thư mục báo cáo và thấy ba file có vẻ không còn ai dùng.
- ✗ Sai: Xoá luôn ba file rồi ghi vào báo cáo cuối "đã dọn file thừa"; một trong số đó là bản gốc mà phòng khác vẫn mở hằng tuần.
- ✓ Đúng: Liệt kê ba file kèm lý do nghĩ là thừa, chờ người giao việc đồng ý từng file rồi mới xoá.
