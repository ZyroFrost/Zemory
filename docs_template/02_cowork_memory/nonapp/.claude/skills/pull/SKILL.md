---
name: pull
description: Fetch fresh data from a source (SQL, VM, web, API) into the project so a deliverable can be built. Use when the deliverable needs newer numbers, when a scheduled task starts, or when the user asks to refresh, download, or retrieve source data. Vietnamese triggers - "kéo dữ liệu", "lấy số mới", "tải data về", "cập nhật nguồn", "pull dữ liệu", "làm mới số liệu".
---

# pull — kéo nguồn về

> Kích hoạt: cần đưa data mới từ nguồn (SQL/VM/web/API) về để làm deliverable. `03_STRUCTURE §5`.
> Trong **pipeline đánh số**: cổng **`00_ready.py`** kiểm nguồn sẵn sàng (exit 0/1) TRƯỚC, rồi **`01_pull.py`** kéo. Launcher `<tên> auto` tự chạy gate → pull nếu đủ; hoặc `<tên> pull` chạy thẳng stage 01.

1. Đọc **`sources/`** (định nghĩa M/connection/SQL) + credential từ **`.env`/`config/`** — **KHÔNG nhập password vào zemory**; nếu nguồn là web thì mượn phiên đã login trên trang thật.
2. Kéo raw về **`data/extract/`** (gitignore) — đặt tên theo nguồn + ngày. Pace/backoff nếu API có rate-limit; **resume-safe** (kéo tiếp được sau khi đứt).
3. **KHÔNG commit** file kéo về (PII/nặng). Ghi lại lần kéo (nguồn · phạm vi · số dòng) vào task/`05_TODO` để truy được.
4. Lỗi nguồn → BÁO, đừng bịa số; thiếu quyền → HỎI user.
