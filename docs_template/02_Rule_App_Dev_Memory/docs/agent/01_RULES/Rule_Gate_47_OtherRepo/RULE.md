---
id: Rule_47
aka: 02-47
name: other-repo
version: 6
kind: action
from: _Store/01_RULES/Rule_Gate_47_OtherRepo @v6 #e3e2a5cff54b
---
# Rule_Gate_47_OtherRepo Đứng trong repo tham khảo thì chỉ đọc

- Lệnh `zemory` ghi theo cwd (`init` · `sync` · `reindex` · `archive` · `memory scan`). Chạy ở repo khác là ghi vào repo đó và DB của nó.
- cwd là repo đang tham khảo ⇒ không chạy lệnh `zemory` nào có ghi.
- Lấy chuẩn ⇒ đọc `docs_template/` (không phải `docs/` riêng của repo nguồn), rồi chạy lệnh ở repo của mình.
- Phép kiểm: cổng `guard`.
