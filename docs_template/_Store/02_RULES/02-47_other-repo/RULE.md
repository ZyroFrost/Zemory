---
id: 02-47
name: other-repo
version: 2
kind: action
---
# 02-47 Đứng trong repo tham khảo thì chỉ đọc

- Lệnh `zemory` ghi theo cwd (`init` · `sync` · `reindex` · `archive` · `memory scan`). Chạy ở repo khác là ghi vào repo đó và DB của nó.
- cwd là repo đang tham khảo ⇒ không chạy lệnh `zemory` nào có ghi.
- Lấy chuẩn ⇒ đọc `docs_template/` (không phải `docs/` riêng của repo nguồn), rồi chạy lệnh ở repo của mình.
- Phép kiểm: cổng `guard`.
