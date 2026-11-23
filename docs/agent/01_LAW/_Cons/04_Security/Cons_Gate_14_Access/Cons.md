---
frame: Cons_Gate_14_Access
status: written
---
# Truy cập và bảo mật

## Người dùng
Một người dùng, chủ máy — toàn quyền trên GM của mình. Agent trên máy — đọc qua CLI và MCP; ghi vào harness theo guard.

## Gác ở
Guard PreToolUse của host (`Rule_Gate_55_ZemoryHookGuard`) và pre-commit · mặc định chặn với `protected`, file bí mật ở bảng dưới
và lệnh xoá.

## Bí mật (tên)

| Name | File | Dùng để làm gì |
|---|---|---|
| share.key | `share.key` | chìa mã hoá và giải mã khối GM đi giữa các máy; nằm ở `data/` của máy (hoặc `share/`), không vào git |
| Khối mã hoá | `*.enc` | GM đã mã hoá trên đường đi và trong thư mục kênh chung |
| GM | `global_memory*.db` | Global Memory, mang nội dung mọi phiên chat |
| ZEMORY_SHARE_KEY | — (biến môi trường của máy) | thay cho file share.key khi không có file |

## Dữ liệu cá nhân
Nội dung các phiên chat — mã hoá AES-256-GCM khi rời máy — khoá là share.key ở `data/` của máy. Thứ có dạng mật khẩu, token bị redact
ngay lúc ghi nhận (điều 7).

## Phạm vi mạng
Chỉ máy cục bộ: daemon và MCP nghe ở `127.0.0.1`. Ra ngoài chỉ có: đường nối giữa các máy đã ghép đôi (dữ liệu đã mã hoá) · máy chủ
dò toàn cầu (chỉ địa chỉ) · thư mục kênh chung trên Drive (khối đã mã hoá).
