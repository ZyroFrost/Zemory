---
name: fill
description: Fill a blank template with real numbers and export the finished deliverable (report, sheet, document). Use when a template exists and the data is ready, or when the user asks to produce, generate, or make a report from existing figures. Vietnamese triggers - "làm báo cáo", "điền số vào mẫu", "xuất báo cáo", "đổ số liệu", "lên report", "ra file cuối".
---

# fill — điền mẫu, xuất sản phẩm

## Quy trình

1. **Lấy file mẫu từ `templates/`** (bản TRỐNG). **KHÔNG sửa template gốc** — làm việc trên bản sao.
2. **Đổ số** từ `data/` · `measures/` · `queries/` vào đúng ô/sheet, theo **`docs/agent/03_STRUCTURE.md` §2 (Từ điển dữ liệu)** — định nghĩa metric ở đó là **nguồn sự thật**, chống mỗi lần điền một kiểu.
3. **Xuất ra:**
   - bản chính đem giao → thư mục deliverable (`reports/` · `models/` · `content/`)
   - bản render lại được → `exports/` (gitignore)
   Giữ tên theo convention của task: `YYYYMMDD_..._REPORT.xlsx` — **tên nghiệp vụ, KHÔNG prefix số stage**.
4. **Đối chiếu trước khi báo xong:** mở file vừa xuất ra, kiểm vài ô mốc so với nguồn. Một phép đo chưa kiểm chéo thì chưa phải sự thật (`02_RULES §Hành xử`).

## Ranh giới quan trọng

| Việc | Được tự làm? |
|---|---|
| Điền số vào mẫu có sẵn | ✅ cứ làm |
| Thêm/bớt cột · đổi biểu đồ · đổi layout · đổi theme | ❌ **TRÌNH USER TRƯỚC** |

Đổi **hình hài** sản phẩm giao đi là quyết định TRÌNH BÀY, không phải việc kỹ thuật — người nhận báo cáo quen mắt với bố cục cũ. Cần ý tưởng biểu đồ → tham khảo rồi **đề xuất**, không tự áp.

## Cấm

- Sửa đè lên file template gốc.
- Tự đổi công thức metric khác với `03_STRUCTURE` §2 vì "thấy hợp lý hơn".
- Báo "xong" khi chưa mở file ra nhìn.
