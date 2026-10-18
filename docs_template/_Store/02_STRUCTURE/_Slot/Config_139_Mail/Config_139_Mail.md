---
id: Slot_139
name: mail
version: 1
path: config/mail/
checked: [Config_075_Config, Data_102_Secrets, Backend_020_Notifications]
---
# Config_139_Mail mail — kho mail chung của cụm: danh bạ, người gửi, khoá gửi

- Vai trò: MỘT kho mail cho mọi repo của cụm, chỉ có trong template tổng quản (`Struc_Repo_WorkspaceManager`). Repo phòng ban đọc
  ở đây khi gửi mail, không giữ danh bạ riêng.
  - `mail_vault.json` — danh bạ: `senders[]` (hộp thư gửi · TÊN khoá) · `groups[]` (nhóm nhận) · `stores[]` (địa chỉ từng điểm
    nhận, nếu có). Không chứa mật khẩu. Dữ liệu liên lạc ⇒ ngoài git.
  - Khoá gửi (`SMTP_*`): đích là `data/secrets/` (một chỗ cho bí mật); giữ `config/mail/mail.env` chỉ khi kênh đồng bộ không chở
    được `data/secrets/` tới máy chạy task, và khi đó khai ngoại lệ ở khung `Cons_Gate_14_Access`.
  - `README.md` · `mail_vault.example.json` · `mail.env.example` — khuôn, vào git.
- Thêm hoặc sửa người nhận ⇒ phòng nhắn phiên của tổng quản; agent của tổng quản sửa danh bạ.
- Không chứa: nội dung mail (tiêu đề, thân) — của task phòng sở hữu, ở `tasks/<case>/`.
