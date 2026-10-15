---
id: Rule_48
aka: 02-48
name: session-title
version: 2
kind: content
---
# Rule_Gate_48_SessionTitle Tiêu đề phiên

- Khuôn: `<Repo>_<Model>_<d-m-yyyy>`.
  - `<Repo>` = tên thư mục repo hiện tại, đúng hoa thường.
  - `<Model>` = model đang chạy phiên (`Claude`, `Codex`, …).
  - Ngày = ngày mở phiên, không đệm số 0 (`Repo_Claude_7-10-2026`).
  - Có chủ đề ⇒ chèn trước ngày: `<Repo>_<Model>_<ChuDe>_<d-m-yyyy>`.
  - Phiên thứ 2, 3 trong ngày ⇒ thêm đuôi `_<số>` sau ngày (`…_7-10-2026_2`).
- Tiêu đề đặt bằng thao tác đổi tên phiên của môi trường; `/rename` đổi thêm cả tên nhắn tin. Agent không tự đổi tiêu đề.
- Phiên chưa có tiêu đề = phiên chưa dùng.
- Tiêu đề phiên của chính mình lệch khuôn ⇒ nhắc một lần.
- Phép kiểm: `zemory peers --all --check` chấm mọi phiên trên máy, kể cả phiên đã đóng (khuôn lệch · ngày lệch quá 1 ngày so với ngày mở phiên). `zemory peers --fix` in kế hoạch đặt lại; `--apply` mới ghi, và chỉ chạy khi có yêu cầu trong phiên: tiêu đề riêng chưa theo khuôn là lựa chọn có chủ đích, không tự sửa.
- Phép kiểm: cổng `hook:rule-reminders`.
