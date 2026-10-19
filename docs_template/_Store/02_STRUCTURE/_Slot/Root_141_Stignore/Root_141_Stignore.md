---
id: Slot_141
aka: 03-141
name: .stignore
version: 2
path: .stignore
checked: [Root_085_Gitignore, Data_102_Secrets, Data_095_State]
---
# Root_141_Stignore .stignore — what Syncthing never carries to another machine

- Vai trò: danh sách Syncthing không chở sang máy khác (VM, máy thứ hai) cho repo được đồng bộ bằng Syncthing. Khác
  `Root_085_Gitignore`: `.gitignore` giữ thứ ngoài git, `.stignore` giữ thứ ngoài đường đồng bộ — một file không vào git vẫn
  có thể bị Syncthing chở đi, và ngược lại.
- Nguyên tắc: **chỉ chở thứ automation dùng.** Thư mục repo trên máy chạy task (VM) vẫn giữ để chạy task, nhưng chỉ nhận đúng
  phần các task của nó cần; report Power BI, tài sản thiết kế, tài liệu, bản lưu cũ ở lại máy trạm. *(Đo trên một VM khi còn
  chở cả repo: `reports` 10,5 GB + `.stversions` 24,9 GB của chúng, ổ còn 27,8 GB.)*
- Hai phần, theo thứ tự trong file (Syncthing lấy mẫu KHỚP ĐẦU TIÊN):
  1. **Không bao giờ chở**, kể cả bên trong thư mục được chở — viết tay, bắt buộc có:
     - `docs/.harness-state` — trạng thái guard riêng từng máy (cờ một lần, vết đọc): chở sang máy kia thì cờ tạo ở máy này mở
       quyền ghi ở máy kia.
     - `data` · `exports` · `.vault` · `*.local.*` — dữ liệu chạy, bản xuất, két, cấu hình theo máy (`Data_102_Secrets`).
     - thứ sinh tại chỗ: `__pycache__` · `.venv` · `node_modules` · `.stversions` (đánh dấu `(?d)` để Syncthing xoá được khi dọn).
  2. **Danh sách cho phép — MÁY SINH, không sửa tay**: khối `zemory:stignore-allow` cuối file do `zemory sync` viết lại mỗi
     lượt từ mọi `tasks/*/vm_deploy.json` · `pipelines/*/vm_deploy.json` (mục `files` · `needs` · `secrets` · `wrapper` · `check`,
     cộng chính thư mục manifest, cộng đường `../<repo này>/…` mà manifest của repo anh em cần) — mỗi mục một dòng `!/<mục>`,
     dòng cuối `*` chặn phần còn lại. Thêm task mới lên VM ⇒ sync tự mở thư mục nó cần; không ai thêm dòng tay.
- Không còn chặn đường cờ của harness file cũ (thư mục hooks cạnh docs): cờ đã dời sang `docs/.harness-state`.
- Phía VM: tắt File Versioning của Syncthing cho các folder repo — mỗi lần lưu đè một file, bản cũ nằm lại trong `.stversions`.
- Syncthing không đồng bộ chính file này. Đầu GỬI (máy trạm) quyết thứ gì đi; đầu nhận giữ cùng nội dung để đối chiếu.
- Máy kiểm: `conform` › `slot-gate` đỏ khi `.stignore` có mà thiếu một dòng bắt buộc, thiếu khối cho phép, hoặc còn đường cũ;
  `zemory sync` viết khối và đưa phần còn lệch vào sổ việc của repo. Repo không có `.stignore` (không đồng bộ bằng Syncthing)
  không bị báo.
