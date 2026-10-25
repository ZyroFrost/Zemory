---
version: 5
lang: vi
---
# Tasks_117_Case case — hồ sơ một case

- Vai trò:
  - Mỗi vấn đề là một mạch việc quay lại nhiều lần — case theo YÊU CẦU (điều tra · sự cố · dim phải chăm đi chăm lại), ngang hàng case định kỳ.
  - `spec.md` = SỔ SỐNG: trạng thái · cách gọi case · mục lục · việc mở · mở lại khi nào.
  - Case ĐÓNG mở lại được — folder là hồ sơ sống, không xoá.
  - Data thật → `data/<case>/` (gitignore, mirror ĐÚNG TÊN). Khác `data/adhoc/`: adhoc là file một lần, throwaway, không có spec.
- Được chứa / không chứa:
  - `spec.md` · findings / bằng chứng / số đo `<ngày>_<slug>.md` · fix script ĐỀ XUẤT `<ngày>_<slug>.sql` (người vận hành tự chạy) · query check CHỈ case này dùng `check_*.sql` · `pipeline/`.
  - Config của MỘT case (mẫu `*.example.*` tracked + bản thật `*.local.*` gitignore) nằm ở GỐC `tasks/<case>/` — không vào `pipeline/` (chỗ đó chỉ chứa script có số chặng; `NN_` chỉ giữ được nghĩa khi không có gì khác nằm cùng) và không vào `config/` cấp repo (slot đó dành cho config dùng chung); để ở slot dùng chung thì không ai biết nó thuộc việc nào.
  - Không chứa: data thật (→ `data/<case>/`).
- Khuôn tên: Tên thường, không số, tiếng Anh ASCII. Findings: `<ngày>_<slug>.md`; query riêng: `check_*.sql`.
