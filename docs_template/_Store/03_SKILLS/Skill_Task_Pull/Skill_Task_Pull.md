---
id: Skill_Task_Pull
aka: pull
name: task-pull
version: 6
type: process
description: Fetch fresh data from a source (SQL, VM, web, API) into the project so a deliverable can be built. Use when the deliverable needs newer numbers, when a scheduled task starts, or when asked to refresh, download, or retrieve source data. Vietnamese triggers - "kéo dữ liệu", "lấy số mới", "tải data về", "cập nhật nguồn", "pull dữ liệu", "làm mới số liệu".
---

# pull — kéo dữ liệu từ nguồn

> Kích hoạt: cần đưa data mới từ nguồn (SQL/VM/web/API) về để làm deliverable. Slot: `02_STRUCTURE`.
> Trong **pipeline đánh số**: cổng **`00_ready.py`** kiểm nguồn sẵn sàng (exit 0/1) TRƯỚC, rồi
> **`01_pull.py`** mới kéo. Launcher `<tên> auto` tự chạy gate → pull nếu đủ điều kiện; hoặc
> `<tên> pull` chạy thẳng stage 01.

## Quy trình

1. **Đọc `sources/`** — định nghĩa nguồn (M · connection spec · SQL kéo). Credential lấy từ `.env`
   hoặc `config/`. **KHÔNG BAO GIỜ nhập mật khẩu vào công cụ** (kể cả `zemory`). Nguồn là web → mượn
   phiên đã đăng nhập trên trang thật.
2. **Kéo raw về `data/extract/`** (gitignore). Đặt tên theo **nguồn + ngày**.
   Có rate-limit → pace/backoff. Phải **resume-safe**: đứt giữa chừng thì kéo tiếp được, không phải
   làm lại từ đầu.
3. **KHÔNG commit file kéo về** — nặng và có thể chứa dữ liệu cá nhân (PII).
4. **Ghi lại lần kéo** (nguồn · phạm vi · số dòng) vào spec của task hoặc `04_TODO.md`, để truy được
   sau.

## Dò dữ liệu — agent tự chạy, chỉ đọc

- Dò cấu trúc, tra cứu, đối chiếu: agent tự chạy câu chỉ-đọc qua công cụ truy vấn của vùng (`values.json` › `query_app`), không
  đưa SQL cho người dùng chạy tay, không xin mật khẩu (mật khẩu nằm ở két). Mã chạy của task trên máy chủ đọc kho bằng biến
  kết nối (`WAREHOUSE_CONN`), không qua công cụ dò.
- Một câu `SELECT` / `WITH`, không `;`, không từ khoá ghi. Nguồn ngoài kho đọc kèm `WITH (NOLOCK)`.
- Công cụ trả tối đa `query_row_cap` dòng một lượt ⇒ chia lô (`OFFSET … FETCH NEXT`) rồi gộp; trang cuối vẫn đầy ⇒ dữ liệu chưa đủ,
  không kết luận. Không chia lô thì số ra thiếu mà không ai thấy.
- Không đoán tên máy chủ, cơ sở dữ liệu, bảng: dò, hoặc hỏi.

## Cấm

- **Lỗi nguồn → BÁO, tuyệt đối đừng bịa số.** Thiếu quyền → HỎI, không tự xoay.
- Kéo về rồi commit thẳng lên git.
- Hardcode connection string trong script — luôn trỏ tên biến môi trường.
- Tự ý mở rộng phạm vi kéo ("tiện tay lấy luôn cả năm") khi chỉ được yêu cầu một kỳ.
