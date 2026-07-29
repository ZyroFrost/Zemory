---
name: pull
description: Fetch fresh data from a source (SQL, VM, web, API) into the project so a deliverable can be built. Use when the deliverable needs newer numbers, when a scheduled task starts, or when the user asks to refresh, download, or retrieve source data. Vietnamese triggers - "kéo dữ liệu", "lấy số mới", "tải data về", "cập nhật nguồn", "pull dữ liệu", "làm mới số liệu".
---

# pull — kéo dữ liệu từ nguồn

> Trong pipeline đánh số: cổng **`00_ready.py`** kiểm nguồn sẵn sàng (exit 0/1) TRƯỚC, rồi **`01_pull.py`** mới kéo. Launcher `<tên> auto` tự chạy gate → pull nếu đủ điều kiện.

## Quy trình

1. **Đọc `sources/`** — định nghĩa nguồn (M · connection spec · SQL kéo). Credential lấy từ `.env` hoặc `config/`.
   **KHÔNG BAO GIỜ nhập mật khẩu vào công cụ.** Nguồn là web → mượn phiên đã đăng nhập trên trang thật.
2. **Kéo raw về `data/extract/`** (gitignore). Đặt tên theo **nguồn + ngày**.
   Có rate-limit → pace/backoff. Phải **resume-safe**: đứt giữa chừng thì kéo tiếp được, không phải làm lại từ đầu.
3. **KHÔNG commit file kéo về** — nặng và có thể chứa dữ liệu cá nhân.
4. **Ghi lại lần kéo** (nguồn · phạm vi · số dòng) vào `05_TODO.md` hoặc spec của task, để truy được sau.

## Cấm

- **Lỗi nguồn → BÁO, tuyệt đối đừng bịa số.** Thiếu quyền → HỎI user.
- Kéo về rồi commit thẳng lên git.
- Hardcode connection string trong script — luôn trỏ tên biến môi trường.
- Tự ý mở rộng phạm vi kéo ("tiện tay lấy luôn cả năm") khi chỉ được yêu cầu một kỳ.
