---
id: Slot_75
aka: 03-75
name: config
version: 2
path: config/
from: _Store/03_STRUCTURE/_Struc_Slot/Slot_Config_075_Config @v2 #8aca0f5a1e5a
---
# Slot_Config_075_Config config — file config operator tự sửa

- Vai trò:
  - File config OPERATOR tự sửa (YAML/TOML): profile kết nối, server list; hệ NON-APP: profile workspace/connection. Là config DÙNG CHUNG cấp repo.
  - Profile kết nối remote server: `config/servers.yaml` + `.env` (`password_env`). Nối DB: profile ở đây. Policy file phân quyền do operator sửa ở đây.
  - Một trong 6 loại non-code (config = file operator). Gốc repo sạch: config → `config/`.
- Được chứa / không chứa:
  - `*.example.*` — template TRACKED, trỏ secret bằng TÊN env.
  - `*.yaml` bản THẬT → gitignore (`password_env` → `.env`).
  - `*.local.*` — override theo máy → gitignore.
  - Không chứa: config của MỘT case (→ gốc `tasks/<case>/`) · config code (→ `backend/src/config/`).
