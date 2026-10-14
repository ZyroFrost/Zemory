---
id: 02-74
name: clean-root
version: 1
kind: judgment
applies: [NonApp]
---
# 02-74 Gốc repo chỉ chứa thứ công cụ ép

- Gốc repo CHỈ chứa file mà CÔNG CỤ ÉP phải nằm đó: `AGENTS.md` · `CLAUDE.md` · `README.md` · `LICENSE` · `.gitignore` · `.gitattributes` · `.claude/` · `.github/` · `.vscode/` · `.idea/`.
- Mọi thứ khác PHẢI có folder: launcher → `bin/` · script → `scripts/` · config → `config/`.
- Lý do: gốc là chỗ DUY NHẤT không ai sở hữu, nên rác rơi vào đó không ai nhận (vd file rỗng do `.cmd` redirect nhầm nằm ở gốc rồi lọt vào git).
- Đánh đổi có ý thức: gõ `bin\<tên> pull` thay vì `<tên> pull`.
