---
id: Rule_1
aka: 02-1
name: second-machine
version: 7
kind: action
from: _Store/01_RULES/Rule_Gate_01_SecondMachine @v7 #9be4bc7841d3
---
# Rule_Gate_01_SecondMachine Xong là có đường sang máy thứ hai, đã đo

- Thứ vừa dựng (lớp lưu · chỉ mục · bí mật · tài sản giao đi) phải khai được đường sang máy khác, và đường đó phải được đo.
- Chưa khai đường hoặc chưa đo ⇒ việc còn dở, kể cả khi cổng xanh.
- Quy trình: `.claude/skills/harness-sync-path/SKILL.md`.
- Phép kiểm: cổng `guard`.

## Ví dụ

- Tình huống: Một phiên agent dựng xong lớp chỉ mục tìm kiếm trên máy làm việc chính, cổng kiểm xanh, báo "xong".
- ✗ Sai: Máy thứ hai kéo về thì có dữ liệu nhưng tìm kiếm không chạy, vì gói chuyển không chở chỉ mục và không ai thử mở ở đầu nhận.
- ✓ Đúng: Trước khi báo xong, khai rõ chỉ mục đi sang máy kia bằng đường nào (git, gói mã hoá, dựng lại tại chỗ), rồi giải gói ra chỗ tạm và đếm đủ từng lớp như bên nhận sẽ đọc.
