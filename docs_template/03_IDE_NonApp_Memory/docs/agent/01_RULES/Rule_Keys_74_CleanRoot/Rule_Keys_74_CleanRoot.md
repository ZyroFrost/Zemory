---
id: Rule_74
aka: 02-74
name: clean-root
version: 4
kind: judgment
applies: [NonApp]
from: _Store/01_RULES/Rule_Keys_74_CleanRoot @v4 #097538739640
---
# Rule_Keys_74_CleanRoot Gốc repo chỉ chứa thứ công cụ ép

- Gốc repo CHỈ chứa file mà CÔNG CỤ ÉP phải nằm đó: `AGENTS.md` · `CLAUDE.md` · `README.md` · `LICENSE` · `.gitignore` · `.gitattributes` · `.claude/` · `.github/` · `.vscode/` · `.idea/`.
- Mọi thứ khác PHẢI có folder: launcher → `bin/` · script → `scripts/` · config → `config/`.
- Lý do: gốc là chỗ DUY NHẤT không ai sở hữu, nên rác rơi vào đó không ai nhận (vd file rỗng do `.cmd` redirect nhầm nằm ở gốc rồi lọt vào git).
- Đánh đổi có ý thức: gõ `bin\<tên> pull` thay vì `<tên> pull`.

## Ví dụ

- Tình huống: agent viết thêm một script khởi chạy và một file cấu hình cho repo báo cáo.
- ✗ Sai: đặt cả hai thẳng ở gốc repo cho tiện gõ lệnh.
- ✓ Đúng: script khởi chạy vào `bin/`, script xử lý vào `scripts/`, cấu hình vào `config/`; gốc chỉ giữ các file mà công cụ bắt buộc phải nằm ở đó.
