---
id: Rule_21
aka: 02-21
name: secret-by-env-name
version: 5
kind: action
from: _Store/01_RULES/Rule_Gate_21_SecretByEnvName @v5 #f937eb440d5f
---
# Rule_Gate_21_SecretByEnvName Secret và connection: chỉ trỏ TÊN biến môi trường

- File tracked (`config/` · `config/*.example.*` · `.env.example`) chỉ trỏ TÊN biến môi trường (vd. `password_env`), không chứa giá trị.
- Giá trị THẬT (mật khẩu · connection thật) ⇒ `.env` / `*.local.*` (gitignore), hoặc vault ⇒ `data/secrets/`.
- KHÔNG commit secret.
- Bí mật thật nằm TRONG cây repo, ở `data/secrets/`, có `.gitignore` chặn; không tạo thư mục bí mật ngoài cây repo. Thứ
  quyết định an toàn là `.gitignore` và phạm vi đồng bộ, không phải vị trí thư mục.
- Không đưa bí mật lên git, kể cả khi đã mã hoá. Trên đĩa, giá trị được khoá bằng cơ chế của hệ điều hành; sang máy khác
  đi qua kênh đồng bộ, không qua git.
- Ngoại lệ buộc nằm ngoài cây (vd con trỏ chỉ nơi đặt dữ liệu) ⇒ ghi rõ ở hiến pháp của repo; ngoại lệ không chứa bí mật.
- Phép kiểm: cổng `guard`.

## Ví dụ

- Tình huống: một job cần mật khẩu để kết nối cơ sở dữ liệu nguồn.
- ✗ Sai: ghi thẳng chuỗi kết nối có mật khẩu vào file config được commit; hoặc tạo một thư mục "két" nằm ngoài repo cho chắc.
- ✓ Đúng: file config chỉ ghi `password_env: DB_SOURCE_PASSWORD`; giá trị thật nằm trong `.env` hoặc `data/secrets/` đã bị `.gitignore` chặn; sang máy khác đi qua kênh đồng bộ, không qua git.
