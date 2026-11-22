---
id: Rule_49
aka: 02-49
name: nhan-agent-o-repo-khac
version: 1
kind: content
---
# Rule_Gate_49_NhanAgentORepoKhac Nhắn agent ở repo khác (user chốt 2026-10-07):

- `02-49` **Nhắn agent ở repo khác (user chốt 2026-10-07):** chỉ nhắn phiên đang chạy có **tiêu đề chuẩn** `<Repo>_<Brand>_<d-m-yyyy>` (tiêu đề đặt lúc mở phiên — `02-48`). Repo có nhiều phiên ⇒ chọn phiên có **ngày trong tiêu đề mới nhất**; bằng ngày ⇒ phiên hoạt động gần nhất. Phiên **chưa có tiêu đề** (`Untitled` — Claude Code tự mở khi bật lại máy, chưa dùng) ⇒ **CẤM** nhắn. ⚠ Tiêu đề KHÔNG phải địa chỉ gửi: `ListAgents` chỉ in tên nhắn tin tự sinh (`dept-gro-b2`), nên trước MỖI lần gửi chạy **`zemory peers`** (bảng repo → địa chỉ → tiêu đề, ★ = phiên được nhắn) rồi gửi tới địa chỉ có ★; repo không có ★ ⇒ KHÔNG gửi, báo user đặt tiêu đề. Trả lời tin đến ⇒ dùng đúng địa chỉ `from` (`uds:…`). Chốt máy: hook cấp user `zemory hook send-guard` chặn gửi tới phiên không có ★ và chỉ ra địa chỉ đúng. *(Đo 07/10: 10 phiên sống, 9 mang tên nhắn tin tự sinh dù user đã đặt tiêu đề; 3 phiên chưa từng dùng.)* <!-- gate: hook:send-guard -->
