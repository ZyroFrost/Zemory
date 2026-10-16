---
id: Rule_47
aka: 02-47
name: other-repo
version: 7
kind: action
---
# Rule_Gate_47_OtherRepo Đứng trong repo tham khảo thì chỉ đọc

- Lệnh `zemory` ghi theo cwd (`init` · `sync` · `reindex` · `archive` · `memory scan`). Chạy ở repo khác là ghi vào repo đó và DB của nó.
- cwd là repo đang tham khảo ⇒ không chạy lệnh `zemory` nào có ghi.
- Lấy chuẩn ⇒ đọc `docs_template/` (không phải `docs/` riêng của repo nguồn), rồi chạy lệnh ở repo của mình.
- Phép kiểm: cổng `guard`.
