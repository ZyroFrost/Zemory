---
id: Slot_146
name: external
version: 2
path: External/<repo>/
scope: layout
---
# External_146_External external — clone của bên ngoài

## Vai trò

`Workspace\External\` chứa mã do NGƯỜI KHÁC viết, clone về để đọc, tham khảo cách làm, hoặc chạy thử. Ví dụ:
`D:\Workspace\External\some-library\` (một thư viện mã nguồn mở), `D:\Workspace\External\vendor-sdk\` (bộ SDK của một hãng).

## Luật — chỉ đọc, không có ngoại lệ

- KHÔNG ráp HS vào clone (không chạy `zemory init` trong đó, không tạo `docs\.harness.json`).
- KHÔNG sửa mã của clone, KHÔNG chạy lệnh ghi của zemory với thư mục làm việc ở trong clone.
- Muốn dùng một phần: chép phần cần sang repo của mình (`Personal\` hoặc `Company\<Tổ chức>\`) rồi làm ở đó.
- Muốn sửa và đóng góp ngược lại: fork thành repo của mình, đặt ở `Personal\`, không sửa trong `External\`.
- Không chứa repo của chính người dùng hay của tổ chức.

## Khuôn tên

Giữ nguyên tên repo gốc như trên trang của nó (kể cả chữ thường, dấu gạch): `some-library`, không đổi thành `SomeLibrary`.

## Phép kiểm

`zemory conform --layout <ổ>\Workspace` báo (`assembled-external`, mức khuyên) mọi clone trong `External\` có
`docs\.harness.json` — tức đã bị ráp HS.
