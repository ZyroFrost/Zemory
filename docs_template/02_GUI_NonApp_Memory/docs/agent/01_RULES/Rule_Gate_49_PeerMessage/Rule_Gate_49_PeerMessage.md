---
id: Rule_49
aka: 02-49
name: peer-message
version: 3
kind: action
from: _Store/01_RULES/Rule_Gate_49_PeerMessage @v3 #3f6174aef337
---
# Rule_Gate_49_PeerMessage Nhắn agent ở phiên hoặc repo khác

- Áp khi môi trường cho phép nhắn tin giữa các phiên.
- Chỉ nhắn phiên đang chạy có tiêu đề chuẩn `<Repo>_<Model>_<d-m-yyyy>` (tiêu đề đặt cho phiên).
- Repo có nhiều phiên ⇒ chọn phiên có ngày trong tiêu đề mới nhất; bằng ngày ⇒ phiên hoạt động gần nhất.
- Phiên chưa có tiêu đề (`Untitled`, phiên tự mở khi khởi động lại máy, chưa dùng) ⇒ cấm nhắn.
- Tiêu đề KHÔNG phải địa chỉ gửi: danh sách agent (`ListAgents`) chỉ in tên nhắn tin tự sinh. Trước MỖI lần gửi ⇒ chạy `zemory peers` (bảng repo → địa chỉ → tiêu đề, ★ = phiên được nhắn) rồi gửi tới địa chỉ có ★.
- Repo không có ★, hoặc không tra được `zemory peers` ⇒ không gửi; báo lại rằng phiên đích cần được đặt tiêu đề.
- Trả lời tin đến ⇒ dùng đúng địa chỉ `from` của tin (`uds:…`).
- Phép kiểm: hook cài ở mức toàn máy `zemory hook send-guard` chặn gửi tới phiên không có ★ và chỉ ra địa chỉ đúng.

## Ví dụ

- Tình huống: agent kho dữ liệu cần báo cho agent của phòng kế toán rằng bảng nguồn đã đổi cột.
- ✗ Sai: gửi tới phiên đầu tiên thấy trong danh sách, kể cả phiên trống chưa có tiêu đề.
- ✓ Đúng: chạy lệnh tra phiên, gửi tới phiên được đánh dấu là phiên mới nhất có tiêu đề chuẩn của repo đó; không có phiên nào hợp lệ thì không gửi và báo cần đặt tiêu đề.
