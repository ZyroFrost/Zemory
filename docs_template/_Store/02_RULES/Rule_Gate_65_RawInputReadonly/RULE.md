---
id: Rule_65
aka: 02-65
name: raw-input-readonly
version: 2
kind: action
applies: [NonApp]
---
# Rule_Gate_65_RawInputReadonly Đầu vào gốc chỉ đọc

- `data/<task>/01_raw/` là bản GỐC được gửi tới hoặc kéo từ nguồn ⇒ KHÔNG sửa, KHÔNG ghi đè, KHÔNG xoá.
- Trung gian `02_processing/` ⇒ xoá thoải mái, dựng lại được.
- Bản giao đi `03_output/` ⇒ giữ để đối chiếu.
- Ba chặng có ba vòng đời khác nhau, nên tách thư mục. Chỉ `01_raw` bất khả đảo: trung gian mất thì chạy lại; đầu vào mất là mất hẳn, phải xin lại bên gửi.
- Phép kiểm: cổng `guard`.
