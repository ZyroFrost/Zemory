---
id: Rule_65
aka: 02-65
name: raw-input-readonly
version: 3
kind: action
applies: [NonApp]
from: _Store/01_RULES/Rule_Gate_65_RawInputReadonly @v3 #8c24cf552a06
---
# Rule_Gate_65_RawInputReadonly Đầu vào gốc chỉ đọc

- `data/<task>/01_raw/` là bản GỐC được gửi tới hoặc kéo từ nguồn ⇒ KHÔNG sửa, KHÔNG ghi đè, KHÔNG xoá.
- Trung gian `02_processing/` ⇒ xoá thoải mái, dựng lại được.
- Bản giao đi `03_output/` ⇒ giữ để đối chiếu.
- Ba chặng có ba vòng đời khác nhau, nên tách thư mục. Chỉ `01_raw` bất khả đảo: trung gian mất thì chạy lại; đầu vào mất là mất hẳn, phải xin lại bên gửi.
- Phép kiểm: cổng `guard`.

## Ví dụ

- Tình huống: bên kinh doanh gửi file Excel doanh số tháng, agent thấy vài cột sai định dạng.
- ✗ Sai: sửa thẳng vào file gốc trong thư mục đầu vào rồi lưu đè.
- ✓ Đúng: giữ nguyên file gốc; chép sang thư mục xử lý để làm sạch; bản giao đi để ở thư mục đầu ra cho đối chiếu.
