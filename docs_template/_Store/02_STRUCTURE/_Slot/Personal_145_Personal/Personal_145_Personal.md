---
id: Slot_145
name: personal
version: 2
path: Personal/[<Nhóm>/]<repo>/
scope: layout
---
# Personal_145_Personal personal — repo cá nhân

## Vai trò

`Workspace\Personal\` chứa repo mà CHÍNH người dùng là chủ: công cụ tự viết, sản phẩm riêng, dự án học tập, và dự án làm
chung với một nhóm bạn bên ngoài mọi tổ chức.

## Hai cách đặt

- Một repo đứng riêng ⇒ đặt thẳng: `Workspace\Personal\<repo>\`. Ví dụ `D:\Workspace\Personal\MyTool\`.
- Nhiều repo cùng một dự án hoặc cùng một nhóm làm chung ⇒ thêm cấp nhóm: `Workspace\Personal\<Nhóm>\<repo>\`. Ví dụ
  `D:\Workspace\Personal\TeamProject\TeamRepo\` và `D:\Workspace\Personal\TeamProject\TeamDocs\`.

## Luật

- Chỉ repo của chính người dùng. Repo của một tổ chức ⇒ `Company\<Tổ chức>\`; mã của người khác clone về để đọc ⇒ `External\`.
- Cấp nhóm chỉ dùng khi có từ hai repo trở lên cùng dự án/nhóm; một repo thì đặt thẳng, không bọc thêm cấp.
- Không có file lẻ ở cấp `Personal\` hay ở cấp nhóm.

## Khuôn tên

Tên repo giữ đúng như trên git (remote). Tên nhóm PascalCase, không dấu, không dấu cách.

## Phép kiểm

Chưa có phép kiểm máy cho bên trong `Personal\`: `zemory conform --layout <ổ>\Workspace` chỉ kiểm rằng `Personal\` là một trong
ba vùng của `Workspace\`. Người (hoặc agent) đặt repo vào đây tự soát theo hai cách đặt ở trên.
