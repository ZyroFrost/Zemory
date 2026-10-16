---
id: Rule_58
aka: 02-58
name: outside-guard
version: 2
kind: action
from: _Store/01_RULES/Rule_Gate_58_OutsideGuard @v2 #5e4d5750586f
---
# Rule_Gate_58_OutsideGuard Chốt máy cho việc NGOÀI project

- Guard chặn bốn nhóm hành động ra ngoài project:
  1. **Ghi ra đường TUYỆT ĐỐI ngoài repo** — Write/Edit · `>`/`>>` · `cp`/`mv`/`robocopy` · `mkdir`/`New-Item`/`Set-Content`/`Out-File`/`tee`/`touch` · trình thông dịch chạy lệnh ghi.
     - Miễn: thư mục tạm của OS (scratchpad) · `~/.claude` · `/dev/null` · `/tmp` · `NUL` · các đường khai ở khoá marker `allowedRoots`.
     - Tên 8.3 và dạng `/d/…` của Git Bash được quy về một cách viết trước khi so.
  2. **SQL bắt máy chủ ghi file** — `BACKUP … TO DISK` · `RESTORE … FROM DISK` / `WITH MOVE` · `CREATE DATABASE … FILENAME`.
  3. **SQL đổi cấu hình máy chủ** — `sp_configure` / `RECONFIGURE` · linked server · `CREATE/DROP/ALTER DATABASE`. Marker khai `allowedSqlServers` ⇒ chặn thêm mọi máy chủ ngoài danh sách (`sqlcmd -S` · `-ServerInstance` · `Server=` / `Data Source=`).
  4. **Lệnh chạy trên MÁY KHÁC** (`ssh` · `Invoke-Command -ComputerName` / `-Session` · `Enter-PSSession` · `psexec` · `winrs`) mà payload tạo · xoá · đổi: thư mục/file · task Scheduler (`Register-`/`Unregister-ScheduledTask` · `schtasks /create`) · dịch vụ (`sc create` · `Set-Service`) · registry · gói cài · SQL thuộc nhóm 2–3. Chép LÊN máy khác bằng `scp`/`rsync` cũng bị chặn. Lệnh chỉ đọc (`Get-*` · `ls` · `SELECT`) cho qua.
- Nhóm 2–3 chỉ soi khi lệnh là `sqlcmd`/`osql`/`bcp`/`Invoke-Sqlcmd` hoặc trình thông dịch; lệnh chỉ nhắc chữ (`grep` · `git log`) cho qua.
- Một cờ chung cho cả bốn nhóm: `.allow-outside`.
- Giới hạn: guard KHÔNG thấy đường/SQL dựng lúc chạy, nằm trong biến hay trong file script (`sqlcmd -i x.sql` · `python job.py` · script có sẵn trên máy kia như `ssh <máy> powershell -File x.ps1`), và đường tương đối sau khi `cd` ra ngoài. Luật chữ về phạm vi project (`Rule_Gate_44_OpenFolderOnly`–`Rule_Gate_47_OtherRepo`) vẫn là tầng quyết định.
- Phép kiểm: cổng `guard`.
