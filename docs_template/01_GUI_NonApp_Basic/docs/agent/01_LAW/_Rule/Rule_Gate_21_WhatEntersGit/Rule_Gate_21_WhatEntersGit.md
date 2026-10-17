---
id: Rule_21
aka: 02-21
name: what-enters-git
version: 8
kind: action
from: _Store/01_LAW/_Rule/Rule_Gate_21_WhatEntersGit @v8 #a448b04ae83b
---
# Rule_Gate_21_WhatEntersGit Thứ không được vào git

- Bí mật thật (mật khẩu · khoá · connection string · két · `.env`) không lên git, kể cả khi đã mã hoá.
- File tracked (`config/` · `*.example.*` · `.env.example`) chỉ trỏ TÊN biến môi trường (ví dụ `password_env`), không chứa giá trị.
- Bí mật nằm TRONG cây repo ở slot bí mật của `02_STRUCTURE`, có `.gitignore` chặn. Không tạo thư mục bí mật ngoài cây repo: thứ quyết định an toàn là `.gitignore` và phạm vi đồng bộ, không phải vị trí. Ngoại lệ buộc nằm ngoài cây (ví dụ con trỏ chỉ nơi đặt dữ liệu) ⇒ ghi ở hiến pháp của repo; ngoại lệ không chứa bí mật.
- Sang máy khác: bí mật đi qua kênh đồng bộ, không qua git.
- Dữ liệu thật (nguồn · extract · dữ liệu khách) không lên git. Repo chỉ giữ mẫu nhỏ, giả, đủ để mở sản phẩm. Chỗ đặt: slot dữ liệu và slot mẫu của `02_STRUCTURE`.
- Nhị phân nặng (`.pbix` · `.twb` · `.fig` · `.psd` · model) không commit thẳng; đi theo khai LFS trong `.gitattributes`.
- Lối đúng: bỏ file khỏi staging · giá trị thật chuyển sang `.env` hoặc slot bí mật · file tracked chỉ ghi tên biến môi trường.
- Phép kiểm: pre-commit chặn file mang tên bí mật (`secretNames`) lọt vào staging, kể cả commit do người làm. Hook chặn lần ghi đưa GIÁ TRỊ bí mật vào file mã hoặc cấu hình mà git theo dõi (mật khẩu dạng chữ · chuỗi kết nối kèm mật khẩu · khoá riêng · khoá truy cập đám mây); pre-commit soi cùng các mẫu đó trong phần diff đã stage. Cho qua: giá trị đọc từ biến môi trường · chỗ điền mẫu (`<password>` · `changeme`) · `.env` · slot bí mật · văn bản `.md`. File test: chỉ nhắc một lần mỗi phiên (mật khẩu giả là bình thường). Nhóm bí mật không có cờ vượt.

## Ví dụ

- Tình huống: một job cần mật khẩu để kết nối cơ sở dữ liệu nguồn.
- ✗ Sai: ghi thẳng chuỗi kết nối có mật khẩu vào file config được commit; hoặc tạo một thư mục "két" ở ổ khác cho chắc.
- ✓ Đúng: config chỉ ghi `password_env: DB_SOURCE_PASSWORD`; giá trị thật nằm ở slot bí mật trong repo, `.gitignore` chặn; sang máy khác đi qua kênh đồng bộ.
