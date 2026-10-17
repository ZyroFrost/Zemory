---
id: Host_GUI
name: host-gui
version: 2
kind: host
---
# GUI Hệ GUI — agent chạy trong một app đứng riêng

- Phạm vi: agent chạy trong một app desktop riêng, mở dự án bằng cách chọn folder trong app. Đặt theo loại môi trường; app
  mới cùng loại vào hệ này, không thêm hệ.
- Mở dự án: tạo project → thêm folder dự án → cho phép lệnh trong folder đó → chọn model → dán câu bootstrap của bộ.
- Chat chạy trong máy ảo của app không gọi được lệnh trên máy thật: không ráp bộ Memory từ đó; chỉ đọc Global Memory qua
  MCP (`zemory setup mcp`).
- Bộ ráp được: bộ Basic (không cần cài zemory); bộ Memory khi máy đã cài zemory.
- Kiểm môi trường (doctor):
  - quyền gốc `permissions.deny` / `ask` trong `.claude/settings.json` chặn được trên máy trống, không cần runtime;
  - hook Node chỉ chạy khi máy có Node — thiếu Node thì host cho qua mà không báo ⇒ bộ Basic không chở hook Node;
  - hook chặn bằng JSON `permissionDecision: "deny"`; mã thoát 2 chỉ là đường phụ (máy không có Git thì mã thoát 2 không chặn).
