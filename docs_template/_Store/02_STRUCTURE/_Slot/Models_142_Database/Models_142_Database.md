---
id: Slot_142
aka: 03-142
name: database
version: 2
path: models/<database>/
checked: [Models_112_Models, Data_101_Models, Tasks_117_Case, Scripts_128_Scripts]
---
# Models_142_Database database — chuỗi đổi cấu trúc của MỘT cơ sở dữ liệu

- Slot TUỲ CHỌN, không template nào bật sẵn. Mặc định repo APP-DATA giữ MỘT cơ sở dữ liệu chung cho cả hệ app ⇒ `models/`
  phẳng (`Models_112_Models`). Chỉ dùng slot này khi repo quản từ hai cơ sở dữ liệu trở lên; lúc đó mọi cơ sở dữ liệu, kể cả cái
  đầu, mỗi cái một folder.
- Vai trò: mỗi cơ sở dữ liệu repo quản có MỘT folder dưới `models/`, giữ chuỗi script dựng và đổi cấu trúc của riêng cơ sở dữ
  liệu đó — mỗi cái một chuỗi đánh số riêng, không trộn.
- Được chứa / không chứa:
  - `NN_<slug>.sql` — số = thứ tự chạy, liền nhau, đếm riêng trong từng folder; mỗi file chạy lại vô hại · `README.md` — thứ tự
    chạy, phép đo, bẫy đã gặp của cơ sở dữ liệu này.
  - Không chứa: script chạy chuỗi (→ `scripts/`, một script nhận tên folder) · log chạy (→ `data/`) · bí mật (→ `.env`,
    `data/secrets/`) · dữ liệu.
- Khuôn tên: cơ sở dữ liệu chung của cả hệ app ⇒ `_` + tên, đứng đầu danh sách; cơ sở dữ liệu riêng của một app ⇒ đúng tên
  app. Tiếng Anh ASCII.
- Khác `Models_112_Models`: slot đó là cả tầng model của một dự án (dbt · tabular · DAX), nằm phẳng; slot này chia `models/`
  theo cơ sở dữ liệu đích — mỗi folder một chuỗi đánh số riêng và một đích chạy riêng.
- Khác `Data_101_Models`: trọng số model AI trong `data/`, không vào git; ở đây là script cấu trúc, có vào git.
- Khác `Tasks_117_Case`: case là một mạch việc; folder này là một cơ sở dữ liệu, sống suốt đời cơ sở dữ liệu đó.
- Khác `Scripts_128_Scripts`: script ở đó CHẠY chuỗi; folder này chỉ GIỮ chuỗi.
- Máy kiểm: chưa có.
