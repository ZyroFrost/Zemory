---
id: Slot_141
aka: 03-141
name: .stignore
version: 1
path: .stignore
checked: [Root_085_Gitignore, Data_102_Secrets, Data_095_State]
---
# Root_141_Stignore .stignore — what Syncthing never carries to another machine

- Vai trò: danh sách Syncthing không chở sang máy khác (VM, máy thứ hai) cho repo được đồng bộ bằng Syncthing. Khác
  `Root_085_Gitignore`: `.gitignore` giữ thứ ngoài git, `.stignore` giữ thứ ngoài đường đồng bộ — một file không vào git vẫn
  có thể bị Syncthing chở đi, và ngược lại.
- Bắt buộc chặn:
  - `docs/.harness-state` — trạng thái guard riêng từng máy (cờ một lần, vết đọc): chở sang máy kia thì cờ tạo ở máy này mở
    quyền ghi ở máy kia.
  - `data` · `exports` · `.vault` · `*.local.*` — dữ liệu chạy, bản xuất, két, cấu hình theo máy (`Data_102_Secrets`).
  - thư mục sinh tại chỗ: `__pycache__` · `.venv` · `node_modules` · `.stversions` (đánh dấu `(?d)` để Syncthing xoá được khi dọn).
- Không còn chặn đường cờ của harness file cũ (thư mục hooks cạnh docs): cờ đã dời sang `docs/.harness-state`.
- Syncthing không đồng bộ chính file này ⇒ sửa ở CẢ HAI đầu, cùng nội dung; bản trong git để đối chiếu.
- Máy kiểm: `conform` › `slot-gate` đỏ khi `.stignore` có mà thiếu một dòng bắt buộc hoặc còn đường cũ; `zemory sync` đưa vào
  sổ việc của repo. Repo không có `.stignore` (không đồng bộ bằng Syncthing) không bị báo.
