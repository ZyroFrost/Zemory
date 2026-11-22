---
id: Rule_48
aka: 02-48
name: tieu-de-phien
version: 1
kind: content
---
# Rule_Gate_48_TieuDePhien Tiêu đề phiên:

- `02-48` **Tiêu đề phiên:** khuôn `<Repo>_<Brand>_<d-m-yyyy>` — `<Repo>` = tên thư mục repo HIỆN TẠI đúng hoa thường; `<Brand>` = HÃNG/nền của agent (`Claude`, `Codex`, `Gemini` …), KHÔNG phải tên model (`Opus`, `Sonnet` sai); ngày = ngày mở phiên, không đệm số 0 (`Zemory_Claude_7-10-2026`); chủ đề chèn TRƯỚC ngày (`<Repo>_<Brand>_<ChuDe>_<d-m-yyyy>`); phiên thứ 2, 3 trong ngày thêm đuôi `_<số>` SAU ngày (`…_7-10-2026_2`). **Agent tự đặt tiêu đề lúc mở phiên** (skill `session-open`): `zemory peers --fix --session <CLAUDE_CODE_SESSION_ID> --apply` — dựng tiêu đề từ repo + ngày mở phiên, bỏ qua tiêu đề thừa kế sau `/clear`; tiêu đề đã đúng khuôn và đúng ngày thì giữ. User vẫn đổi tay được (`/rename` đổi thêm tên nhắn tin). Phiên chưa có tiêu đề = **chưa dùng**. Bộ kiểm: `zemory peers --all --check` chấm MỌI phiên trên máy, kể cả phiên đã đóng (khuôn lệch · ngày lệch quá 1 ngày so với ngày mở phiên); `zemory peers --fix` in kế hoạch đặt lại, `--apply` mới ghi — **chỉ chạy khi user bảo**: phiên user đặt tên riêng chưa theo khuôn là quyết định của user. Agent thấy tiêu đề phiên của CHÍNH mình lệch khuôn thì nhắc user MỘT lần. <!-- gate: hook:rule-reminders -->
