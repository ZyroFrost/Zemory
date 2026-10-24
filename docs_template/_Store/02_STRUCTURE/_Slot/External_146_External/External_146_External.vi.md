---
version: 3
lang: vi
---
# External_146_External external — code của người khác

## Vai trò

`Workspace\External\` chứa code do NGƯỜI KHÁC viết, clone về để làm gì cũng vậy: để đọc, để học, để chạy thử (bước 2 của
`Workspace_143`). Tài liệu học cần nó thì trỏ vào đây, không giữ một bản chép. Ví dụ: `D:\Workspace\External\some-library\` ·
`D:\Workspace\External\vendor-sdk\`.

## Luật — chỉ đọc, không có ngoại lệ

- KHÔNG ráp HS vào clone (không `zemory init`, không `docs\.harness.json`).
- KHÔNG sửa clone, KHÔNG chạy lệnh ghi của zemory với thư mục làm việc ở trong clone.
- Muốn dùng một phần: chép phần đó sang repo của chủ máy (`Personal\` hoặc `Company\<Tổ chức>\`) rồi làm ở đó.
- Muốn sửa và đóng góp ngược lại: fork; bản fork có commit của chủ máy là code của chủ máy ⇒ `Personal\`.

## Khuôn tên

Giữ nguyên tên repo như trên trang của nó, kể cả chữ thường và dấu gạch: `some-library`.

## Phép kiểm

`zemory conform --layout <ổ>\Workspace` nêu tên (`assembled-external`, mức khuyên) mọi clone trong `External\` có `docs\.harness.json`.
