---
id: Slot_149
name: program
version: 1
path: Software/<Nhóm>/[<Hãng>/]<Ứng dụng>/
scope: layout
---
# Software_149_Program program — một phần mềm

- Vai trò: mọi thứ của MỘT phần mềm, chia ba phần theo vòng đời:
  - `App/` — bản chạy tại chỗ: thư mục cài (khi bộ cài cho chọn) hoặc bản portable.
  - `Data/` — dữ liệu riêng của phần mềm mà nó cho đặt chỗ: ổ ảo (vhdx), cache, dữ liệu nội bộ. Ví dụ: ổ ảo của WSL, dữ liệu
    engine container.
  - `Setup/` — bộ cài gốc (một tệp `.exe`/`.msi`/`.zip`, bản mới nhất đã dùng).
  - Có phần nào thì tạo phần đó; phần mềm chỉ có bộ cài thì chỉ có `Setup/`.
- Được chứa / không chứa:
  - Cấp `<Hãng>/` chen giữa khi một hãng có nhiều phần mềm cùng nhóm (`System/<Hãng>/<Ứng dụng>/Data`).
  - Không chứa: cấu hình và khoá của người dùng (`AppConfig/`) · tài liệu làm việc · repo.
- Khuôn tên: tên phần mềm như hãng viết, bỏ dấu cách (`PowerBI` · `VSCode` · `7-Zip`); hãng PascalCase.
- Đồng bộ: không. `Data/` có thể rất lớn — ổ ảo phải có trần dung lượng, và đo chỗ trống của ổ trước mỗi việc ghi lớn.
