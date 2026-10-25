---
version: 6
lang: vi
---
# Data_131_Case case — data làm việc của một case

- Vai trò:
  - Data làm việc của từng case, gitignore.
  - Xếp file theo thứ tự, câu đầu trúng là dừng: ① chính repo này đã gửi hay đẩy nó lên đích? ⇒ `03_output` · ② nhận từ
    ngoài và repo này chưa gửi lại (kể cả file người tiền nhiệm đã gửi) ⇒ `01_raw` · ③ pipeline sinh, không ai ngoài thấy ⇒
    `02_processing`. "Xoá đi có dựng lại được không" không phải tiêu chí: bản đã gửi dựng lại được vẫn là `03_output`.
  - Thư mục của một chặng được tạo khi file đầu tiên của nó tới, không bao giờ trước đó (`Struc_Disk_Data` §Luật: thư mục chỉ có khi có thứ
    để chứa — `data/` nằm ngoài git cũng không đổi điều đó). File chưa có chỗ thì xếp theo thứ tự ở trên ngay lúc nó tới, nên không có gì
    bị quăng bừa.
  - Nằm riêng khỏi `tasks/<case>/` là ngoại lệ có chủ đích (file nặng).
- Được chứa / không chứa: CHỈ 3 CHẶNG, mỗi chặng khi có file: `01_raw/` · `02_processing/` · `03_output/`.
- Khuôn tên: Mirror ĐÚNG TÊN `tasks/<case>/`.
