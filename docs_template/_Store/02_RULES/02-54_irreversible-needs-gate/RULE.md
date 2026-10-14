---
id: 02-54
name: irreversible-needs-gate
version: 1
kind: content
---
# 02-54 Luật không đảo được phải có chốt máy

- Luật mà vi phạm là KHÔNG đảo được (secret vào commit · ghi vào đường cấm · `git push` chưa xin) ⇒ không được chỉ có chữ gác; phải có chốt máy chặn lúc xảy ra.
- Lý do: chữ là tầng quan sát, phát hiện SAU, không ngăn được lúc xảy ra. Một dòng cấm trong văn bản không ngăn được secret lên remote.
- Repo kiểu ADAPT (áp chuẩn lên repo có sẵn): điều này càng nặng, vì `docs/` hay thư mục dữ liệu thường là của team khác; ghi nhầm một lần là đụng đồ của người khác.
- Phép kiểm: cổng `gates`.
