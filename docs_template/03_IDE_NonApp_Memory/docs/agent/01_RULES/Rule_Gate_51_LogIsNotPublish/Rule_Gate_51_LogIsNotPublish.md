---
id: Rule_51
aka: 02-51
name: log-is-not-publish
version: 3
kind: action
from: _Store/01_RULES/Rule_Gate_51_LogIsNotPublish @v3 #81976af410e8
---
# Rule_Gate_51_LogIsNotPublish Ghi sổ không phải publish

- Yêu cầu ghi changelog · commit · câu báo "xong rồi" KHÔNG phải là cho phép push.
- Không suy diễn quyền push từ các yêu cầu đó.
- Phép kiểm: cổng `guard`.

## Ví dụ

- Tình huống: người dùng bảo ghi lại thay đổi vào sổ rồi commit.
- ✗ Sai: hiểu "ghi sổ + commit" là đã được phép đẩy, nên push luôn.
- ✓ Đúng: ghi sổ, commit cục bộ, báo xong; push chỉ khi lời yêu cầu có chữ push hoặc tương đương.
