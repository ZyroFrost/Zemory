---
id: Slot_153
name: recovery
version: 2
path: Recovery/
scope: layout
---
# Recovery_153_Recovery recovery — bản khôi phục máy

## Vai trò

`<ổ dữ liệu>\Recovery\` là chỗ của ảnh khôi phục hệ điều hành và bản sao lưu cả máy do CÔNG CỤ HỆ THỐNG tạo ra (công cụ khôi
phục của Windows, của hãng máy). Trên nhiều máy, thư mục này do chính hệ thống tạo sẵn.

## Luật

- Chỉ chứa thứ do công cụ khôi phục ghi. Người dùng và agent KHÔNG đặt tài liệu, repo, bản cài hay bất cứ thứ gì khác vào đây.
- Không đổi tên, không dời, không xoá nội dung bên trong bằng tay — mất nó là mất đường khôi phục máy.
- Không đồng bộ, không vào git.

## Khuôn tên

`Recovery`, cố định, viết đúng như vậy.

## Phép kiểm

`zemory conform --layout <gốc ổ>` kiểm `Recovery` là thư mục hợp lệ ở gốc ổ và báo repo nằm trong nó (`repo-outside-workspace`).
