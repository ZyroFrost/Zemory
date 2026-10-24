---
version: 5
lang: vi
---
# Models_112_Models models — deliverable dữ liệu: tầng model, hoặc chuỗi dựng một cơ sở dữ liệu

## Vai trò

Deliverable dữ liệu của một dự án. Có một trong hai dạng, chọn theo loại dự án:
- **Tầng model** — tầng semantic / transform: model dbt · tabular `.bim` · model DAX.
- **Chuỗi cơ sở dữ liệu** — chuỗi script dựng và đổi cấu trúc của MỘT cơ sở dữ liệu repo nắm, đặt phẳng trong `models/`.

Deliverable ◆ — repo NON-APP giữ ít nhất một thư mục deliverable: `reports/` | `models/` | `content/` | `design/`, chọn theo loại
dự án.

## Chuỗi cơ sở dữ liệu

- `NN_<slug>.sql` — số là thứ tự chạy, liền nhau. Chạy lần lượt từ số nhỏ nhất thì dựng lại được cơ sở dữ liệu từ con số không
  trong một lượt.
- Mỗi file chạy lại vô hại (`IF NOT EXISTS` · `CREATE OR ALTER` · `CREATE OR REPLACE`) và không xoá dữ liệu khi chạy lại.
- `README.md` — thứ tự chạy, cách đo từng bước, bẫy đã gặp.
- Repo nắm từ hai cơ sở dữ liệu trở lên ⇒ mỗi cơ sở dữ liệu một thư mục, kể cả cái đầu tiên (`Models_142_Database`).

## Không chứa

Script CHẠY chuỗi, hay dựng máy mà cơ sở dữ liệu nằm trên đó (→ `scripts/`) · log chạy (→ `data/`) · bí mật (→ `.env`,
`data/secrets/`) · dữ liệu · trọng số model AI (→ `Data_101_Models`).

## Khuôn tên

dbt ép tên `models/`. File trong chuỗi: `NN_<slug>.sql`, tiếng Anh ASCII, slug viết thường.

## Phép kiểm

Chưa có phép kiểm máy.
