---
version: 7
lang: vi
---
# Rule_Gate_34_DocsFollowChange — Docs change in the same change as the thing they describe

## Luật là gì
Khi một thứ thay đổi, mọi tài liệu mô tả nó đổi trong cùng lần thay đổi đó. Tài liệu sai nguy hơn tài liệu thiếu, vì người đọc
tin nó.

## Khi nào áp
- Một thay đổi đụng tới thứ có tài liệu mô tả: mã, báo cáo, task, cấu trúc, thiết kế, hướng dẫn hiện trong sản phẩm.

## Phải làm gì
1. Trong cùng thay đổi, sửa mọi tài liệu mô tả thứ đó: plan khi đổi thiết kế, `05_CHANGES` khi thay đổi đã được xác nhận,
   `04_TODO` theo `Rule_Gate_38_TodoDoor`, trang hướng dẫn hiện cho người dùng trong sản phẩm.
2. Sửa thẳng file `.md`, đúng file, đúng vai; chỉ mục tìm kiếm (nếu có) dựng lại từ file, không ghi ngược vào file.
3. Bản harness chép về repo không phải tài liệu repo được sửa: đổi luật, slot hay skill đi theo `Rule_Gate_83_HarnessFromStore`.
4. Cuối phiên: đi qua bảng soát trong `Skill_Harness_SessionClose`.

## Ví dụ
- Tình huống: app báo cáo có trang "Hướng dẫn" liệt kê các loại cảnh báo; agent vừa gỡ một loại trong mã.
- ✗ Sai: chỉ sửa mã; trang hướng dẫn vẫn ghi "9 loại", người dùng đi tìm loại đã không còn và nghĩ app lỗi.
- ✓ Đúng: cùng lần sửa đó cập nhật trang hướng dẫn và ghi changelog.

## Máy kiểm
- conform báo đỏ cây thư mục lệch cấu trúc đã ráp của repo; các ý khác là phán đoán.
