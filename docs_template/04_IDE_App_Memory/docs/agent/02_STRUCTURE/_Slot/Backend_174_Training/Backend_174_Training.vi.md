---
version: 1
lang: vi
---
# Backend_174_Training training — mã huấn luyện model của chính repo

## Vai trò

Pipeline tạo một model của riêng repo từ dữ liệu có nhãn: lấy câu mẫu, gắn nhãn, huấn luyện (chọn ngưỡng hoặc học trọng số),
xuất kết quả tới chỗ app đang chạy đọc. Một model = một thư mục con; các bước đánh số theo thứ tự chạy. Dữ liệu và kết quả của
một lượt nằm ở `Data_175_Training`, không bao giờ ở đây.

- Khác `Backend_002_Backend` · `Backend_007_Src`: hai slot đó chứa mọi mã phía server; slot con này có luật riêng — không bao
  giờ chạy trong app, phải mã hoá bằng đúng đường mã của app, và dữ liệu của nó nằm ở `Data_175_Training`.
- Khác `Backend_022_Ai`: `ai/` gọi model lúc app chạy (provider, adapter); slot này tạo model và không bao giờ chạy trong một
  request.
- Khác `Backend_025_Evals`: `evals/` đo một model trên corpus có nhãn và cho điểm; huấn luyện gọi nó để chấm một lần fit, và tự
  làm phần fit cùng phần xuất mà `evals/` không làm.
- Khác `Backend_027_Pipelines`: `pipelines/` chuyển và biến đổi dữ liệu theo các bước cố định; một bước huấn luyện học tham số
  từ dữ liệu, nên chạy lại trên nhãn mới cho ra model khác.
- Khác `Backend_049_Test`: test đạt hoặc trượt trên đầu vào cố định; huấn luyện sinh ra một sản phẩm.

## Bên trong

```
backend/src/training/
└── <model>/
    ├── 01_pull.*      lấy câu mẫu từ nguồn của chính repo
    ├── 02_label.*     nhãn nháp để người duyệt
    ├── 03_train.*     huấn luyện: ngưỡng hoặc trọng số, chấm qua evals/
    └── 04_export.*    kết quả được chọn, ghi tới chỗ app đang chạy đọc
```

- Loại file: ngôn ngữ mã của chính repo.
- Tên thư mục con: tên model; file bước giữ tiền tố hai chữ số của chặng.
- Không bao giờ chứa: dữ liệu, nhãn, vector, trọng số, báo cáo lượt chạy (→ `Data_175_Training`); model tải về của bên khác
  (→ `Data_101_Models`).
- Không trỏ tới slot con nào.

## Luật

- Lượt huấn luyện mã hoá bằng đúng đường mã app đang chạy dùng; một đường thứ hai cho ra vector không khớp với ngưỡng hay trọng
  số đã huấn luyện.
- Bước xuất chỉ ghi kết quả được chọn, kèm profile mã hoá và mã băm của bộ có nhãn đã dùng; app đang chạy bỏ qua kết quả có
  profile khác profile của mình và quay về đường nền.
- Bước nào đọc dữ liệu có nhãn thì đọc từ `Data_175_Training`; không ghi gì riêng tư vào file được git theo dõi.

## Ví dụ

Một repo huấn luyện bộ phân loại cho cửa nhắc: `backend/src/training/prompt-gates/01_pull.ts` lấy tin nhắn người gửi cho
agent, `03_train.ts` chọn một ngưỡng cho mỗi cửa trên phần train và chấm phần holdout qua `backend/src/evals/`, `04_export.ts`
ghi ngưỡng vào cấu hình của từng cửa.

## Kiểm

- `zemory conform` nhận `backend/src/training/` ở repo ráp từ `Struc_Repo_App`.
- Bước xuất của model ghi rõ profile và mã băm bộ có nhãn trong thứ nó ghi ra.
