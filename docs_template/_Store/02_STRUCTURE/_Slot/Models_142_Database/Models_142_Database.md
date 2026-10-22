---
id: Slot_142
aka: 03-142
name: database
version: 1
path: models/<database>/
checked: [Models_112_Models, Data_101_Models, Tasks_117_Case, Scripts_128_Scripts]
---
# Models_142_Database database — chuỗi đổi cấu trúc của MỘT cơ sở dữ liệu

- Vai trò: trong repo APP-DATA (`Struc_Repo_AppData`), mỗi cơ sở dữ liệu repo quản có MỘT folder dưới `models/`, giữ chuỗi
  script dựng và đổi cấu trúc của riêng cơ sở dữ liệu đó. Repo quản nhiều cơ sở dữ liệu của cùng một hệ app (lõi dùng chung, và
  cơ sở dữ liệu riêng của app nếu app có) ⇒ mỗi cái một chuỗi đánh số riêng, không trộn.
- Có từ cơ sở dữ liệu ĐẦU TIÊN, không đợi cái thứ hai: thêm cơ sở dữ liệu sau không phải dời file và sửa mọi đường đang trỏ.
- Được chứa / không chứa:
  - `NN_<slug>.sql` — số = thứ tự chạy, liền nhau, đếm riêng trong từng folder; mỗi file chạy lại vô hại · `README.md` — thứ tự
    chạy, phép đo, bẫy đã gặp của cơ sở dữ liệu này.
  - Không chứa: script chạy chuỗi (→ `scripts/`, một script nhận tên folder) · log chạy (→ `data/`) · bí mật (→ `.env`,
    `data/secrets/`) · dữ liệu.
- Khuôn tên: cơ sở dữ liệu lõi dùng chung của cả hệ app ⇒ `_` + tên (`_AppCore`), đứng đầu danh sách; cơ sở dữ liệu riêng
  của một app ⇒ đúng tên app (`SasinFlow`). Tiếng Anh ASCII.
- Khác `Models_112_Models`: slot đó là cả tầng model của một dự án (dbt · tabular · DAX), nằm phẳng; slot này chia `models/`
  theo cơ sở dữ liệu đích — mỗi folder một chuỗi đánh số riêng và một đích chạy riêng.
- Khác `Data_101_Models`: trọng số model AI trong `data/`, không vào git; ở đây là script cấu trúc, có vào git.
- Khác `Tasks_117_Case`: case là một mạch việc; folder này là một cơ sở dữ liệu, sống suốt đời cơ sở dữ liệu đó.
- Khác `Scripts_128_Scripts`: script ở đó CHẠY chuỗi; folder này chỉ GIỮ chuỗi.
- Máy kiểm: chưa có.
