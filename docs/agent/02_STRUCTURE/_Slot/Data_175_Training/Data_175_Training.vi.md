---
version: 1
lang: vi
---
# Data_175_Training training — dữ liệu và kết quả huấn luyện model

## Vai trò

Thứ `Backend_174_Training` đọc và ghi cho mỗi model: câu mẫu có nhãn, file trung gian của một lượt chạy, và kết quả của mọi
lượt. Nằm ngoài git, ở lại máy huấn luyện; kết quả app đang chạy dùng thì đi ra qua bước xuất của model, không bao giờ bằng
cách chở thư mục này.

- Khác `Data_094_Data`: slot đó là cha của mọi thư mục runtime theo máy; slot con này có luật riêng — một chặng được bảo vệ
  chứa nhãn đã duyệt và bố cục ba chặng cố định cho mỗi model.
- Khác `Data_096_Cache`: cache dựng lại khi cần và không ai duyệt; nhãn đã duyệt ở đây là công của người, không dựng lại được.
- Khác `Data_101_Models`: `data/models/` chứa trọng số tải về của bên khác; đây chứa thứ repo tự huấn luyện.
- Khác `Data_131_Case`: case là dữ liệu làm việc của một việc trong repo theo case; đây là dữ liệu của một model của app. Ba
  chặng giống nhau là chủ ý.
- Khác `Backend_025_Evals`: slot đó là mã đo; điểm nó ghi cho một lượt huấn luyện nằm ở đây.

## Bên trong

```
data/training/
└── <model>/                    cùng tên với backend/src/training/<model>/
    ├── 01_raw/                 câu mẫu đã lấy và nhãn ĐÃ DUYỆT — công của người, ghi xong là chỉ đọc
    ├── 02_processing/          vector, nhãn nháp, chia train / holdout — xoá thoải mái, chạy lại dựng lại
    └── 03_output/run-<thời điểm>/   kết quả và báo cáo điểm của từng lượt — giữ để đối chiếu
```

- Loại file: file dữ liệu (`.json` · `.jsonl` · `.csv`), không bao giờ là mã.
- Thư mục chặng chỉ tạo khi có file đầu tiên, không tạo trước.
- Không bao giờ chứa: mã (→ `Backend_174_Training`); thứ app đang chạy đọc trực tiếp.

## Luật

- `01_raw` được bảo vệ: khai `data/training/*/01_raw` vào khoá `protected` của marker.
- Câu mẫu là lời người thật viết: thư mục không bao giờ vào git và không rời máy qua việc đồng bộ repo.
- Một lượt đọc bộ có nhãn từ `01_raw` và ghi mã băm của bộ đó vào báo cáo, để hai lượt trên hai bộ nhãn khác nhau không bao giờ
  bị so như nhau.

## Ví dụ

`data/training/prompt-gates/01_raw/corpus.json` chứa 1.200 tin nhắn, mỗi tin kèm các cửa người duyệt đã xác nhận;
`03_output/run-2026-11-06T10-00/` chứa ngưỡng của từng cửa và precision, recall, F1 của regex và của bộ phân loại trên phần
holdout.

## Kiểm

- `zemory conform` nhận `data/training/` ở repo ráp từ `Struc_Repo_App`, và báo một file mã nằm trong đó.
- `git check-ignore data/training` trả lời có.
