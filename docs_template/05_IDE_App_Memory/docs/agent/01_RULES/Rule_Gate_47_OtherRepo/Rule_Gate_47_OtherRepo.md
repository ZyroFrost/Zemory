---
id: Rule_47
aka: 02-47
name: other-repo
version: 8
kind: action
from: _Store/01_RULES/Rule_Gate_47_OtherRepo @v8 #77425e492714
---
# Rule_Gate_47_OtherRepo Đứng trong repo tham khảo thì chỉ đọc

- Lệnh `zemory` ghi theo cwd (`init` · `sync` · `reindex` · `archive` · `memory scan`). Chạy ở repo khác là ghi vào repo đó và DB của nó.
- cwd là repo đang tham khảo ⇒ không chạy lệnh `zemory` nào có ghi.
- Lấy chuẩn ⇒ đọc `docs_template/` (không phải `docs/` riêng của repo nguồn), rồi chạy lệnh ở repo của mình.
- Phép kiểm: cổng `guard`.

## Ví dụ

- Tình huống: agent mở repo chứa bộ chuẩn để học cách làm, rồi muốn áp chuẩn cho dự án của mình.
- ✗ Sai: đứng ngay trong repo chứa chuẩn mà chạy lệnh khởi tạo/đồng bộ — lệnh ghi vào repo chứa chuẩn, không phải dự án của mình.
- ✓ Đúng: chỉ đọc bộ mẫu chung ở repo chứa chuẩn, rồi chuyển về thư mục dự án của mình mới chạy lệnh.
