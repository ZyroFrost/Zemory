---
name: fill
description: Fill a blank template with real numbers and export the finished deliverable (report, sheet, document). Use when a template exists and the data is ready, or when the user asks to produce, generate, or make a report from existing figures. Vietnamese triggers - "làm báo cáo", "điền số vào mẫu", "xuất báo cáo", "đổ số liệu", "lên report", "ra file cuối".
---

# fill — điền template, xuất deliverable

> Kích hoạt: có template trống + đã có số → xuất bản deliverable/exports. `03_STRUCTURE §5`.

1. Lấy file mẫu từ **`templates/`** (bản TRỐNG) — KHÔNG sửa template gốc; làm việc trên bản sao.
2. Đổ số từ **`data/`** / **`measures/`** / **`queries/`** vào đúng ô/sheet theo **`03_STRUCTURE` §7 (từ điển dữ liệu)** (định nghĩa metric = nguồn sự thật — chống mỗi lần điền một kiểu).
3. Xuất ra **deliverable** (`reports/…` nếu là bản chính giao đi) hoặc **`exports/`** (bản render). Giữ tên file theo convention của task (`<ngày>_..._REPORT.xlsx`).
4. **Đổi HÌNH HÀI/bố cục** report (thêm/bớt cột, đổi chart, layout) = quyết định TRÌNH BÀY → **trình user trước** (`02_RULES §Hành xử`); điền số theo mẫu có sẵn thì cứ làm.
