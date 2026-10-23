---
id: Slot_148
name: group
version: 1
path: Software/<Nhóm>/
values: [AI, Dev, Drivers, Network, Office, System, Utility]
scope: layout
---
# Software_148_Group group — nhóm phần mềm

- Vai trò: chia phần mềm theo việc nó làm, để tìm được bằng mắt và dựng lại máy theo nhóm.
- Được chứa / không chứa:
  - Bảy nhóm cố định:
    - `AI` — trợ lý và công cụ AI (ứng dụng chat, agent, CLI của mô hình).
    - `Dev` — công cụ lập trình (trình soạn mã, CSDL, runtime, container).
    - `Drivers` — gói driver thiết bị (`Software_150_Drivers`).
    - `Network` — trình duyệt, VPN, điều khiển từ xa, đồng bộ tệp, nhắn tin.
    - `Office` — văn phòng, bảng tính, BI.
    - `System` — công cụ của hệ điều hành và của hãng máy (ảo hoá, cập nhật, màn hình phụ, ổ mạng).
    - `Utility` — nén/giải nén, gõ tiếng Việt, tiện ích nhỏ, game launcher.
  - Không chứa: nhóm thứ tám. Phần mềm không vừa nhóm nào ⇒ `Utility`.
- Khuôn tên: đúng bảy tên trên, PascalCase như liệt kê.
