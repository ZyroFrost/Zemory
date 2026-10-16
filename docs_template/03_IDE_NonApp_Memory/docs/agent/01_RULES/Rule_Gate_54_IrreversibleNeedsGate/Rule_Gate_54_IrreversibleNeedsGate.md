---
id: Rule_54
aka: 02-54
name: irreversible-needs-gate
version: 3
kind: content
from: _Store/01_RULES/Rule_Gate_54_IrreversibleNeedsGate @v3 #f218ed50c81e
---
# Rule_Gate_54_IrreversibleNeedsGate Luật không đảo được phải có chốt máy

- Luật mà vi phạm là KHÔNG đảo được (secret vào commit · ghi vào đường cấm · `git push` chưa xin) ⇒ không được chỉ có chữ gác; phải có chốt máy chặn lúc xảy ra.
- Lý do: chữ là tầng quan sát, phát hiện SAU, không ngăn được lúc xảy ra. Một dòng cấm trong văn bản không ngăn được secret lên remote.
- Repo kiểu ADAPT (áp chuẩn lên repo có sẵn): điều này càng nặng, vì `docs/` hay thư mục dữ liệu thường là của team khác; ghi nhầm một lần là đụng đồ của người khác.
- Phép kiểm: cổng `gates`.

## Ví dụ

- Tình huống: repo có luật bằng chữ "không commit mật khẩu", agent tạo nhánh mới và gom mọi file để commit.
- ✗ Sai: tin vào dòng chữ cấm; file chứa mật khẩu lọt vào commit và lên remote.
- ✓ Đúng: luật loại này phải kèm chốt máy (hook trước khi ghi, pre-commit) chặn ngay lúc file bí mật vào staging.
