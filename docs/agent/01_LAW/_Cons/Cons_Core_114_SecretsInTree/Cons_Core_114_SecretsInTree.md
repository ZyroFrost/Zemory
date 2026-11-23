---
id: Cons_114
aka: 01-14
name: secrets-in-tree
version: 1
kind: content
---
# Cons_Core_114_SecretsInTree Bí mật sống TRONG cây repo — "ngoài git" KHÔNG phải "ngoài repo".

**Bí mật sống TRONG cây repo — "ngoài git" KHÔNG phải "ngoài repo".** Chìa (`share.key`) · `.env` · két · sổ đăng ký · profile trình duyệt nằm ở `<repo>/data/` (thư mục MÁY NÀY, không đi đâu; slot chuẩn cho bí mật: `data/secrets/`); **kho bộ nhớ** (`global_memory.db` + `channel/` + `files/`) nằm ở `<repo>/global-memory/` (thứ đi sang máy kia qua kênh — `plan/25 §1`, sửa 2026-10-14). Cả hai **KHÔNG rải sang ổ hệ thống**; ngoại lệ DUY NHẤT là `~/.zemory/location.json` — con trỏ nói kho nằm đâu (để cạnh kho thì thành vòng luẩn quẩn) và nó KHÔNG chứa bí mật. Nằm trong repo KHÔNG có nghĩa được đi theo repo: cấm **① git** (`.gitignore` + gate `no-data-in-git` canh) · **② mọi nguồn online/đám mây** — kể cả kênh *backup máy* của trình đồng bộ, không riêng kênh mình chủ động (đo 2026-08-05: Google Drive Computers-backup đã cuốn cả `global_memory.db` lẫn `share.key` lên mây dạng TRẦN) · **③ đẩy sang VM/máy đích** khi deploy (chở CODE; chìa do người mang tay). — *Thứ quyết định an toàn là **gitignore + phạm vi đồng bộ**, KHÔNG phải vị trí thư mục. Hiểu lệch "để ngoài git" thành "để ngoài repo" đẻ ra thư mục bí mật lạc bên ngoài chuẩn (một repo app 05/08), còn để kho trong vùng đồng bộ thì hỏng kho thật (03/08 + 04/08). Nguồn: user chốt 2026-08-05 bên một repo app (HP điều 3 của repo đó) rồi chốt lại cho zemory cùng ngày; đã ship thành §Điều khoản GỢI Ý trong `docs_template/*/01_CONSTITUTION`.*

- **Chốt máy:** nhánh secret của guard · precommit · `doctor` › home (`~/.zemory` chỉ `location.json`)
