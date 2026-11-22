---
version: 6
lang: vi
---
# Data_099_Tmp tmp — file tạm

## Vai trò

`data/tmp/` chứa thứ mã của chính repo tạo ra trong chốc lát rồi bỏ: file nháp của một lượt chạy, bản tải về đang giải nén, và
thư mục tạm của test của repo. Thư mục tạm của test thuộc về repo mà nó kiểm, không thuộc TEMP hệ thống của máy (trên Windows
đó là ổ C:, và tên tài khoản dài biến nó thành đường 8.3 làm hỏng phép ghi-đọc đường dẫn).

## Bên trong

```
data/tmp/
├── <công cụ>-<mục đích>/   thư mục nháp của một lượt chạy, mã tạo ra nó tự xoá (finally / after)
└── <runner>-test/run-*/    mỗi lượt test một thư mục: TEMP, TMP, TMPDIR của mọi test trỏ vào đây
```

## Luật

- Không giữ gì ở đây: mã ghi thư mục nào thì xoá nó khi xong, kể cả khi lỗi; runner dọn các thư mục lượt bỏ dở (cũ hơn thời gian
  một lượt có thể chạy) trước khi bắt đầu.
- Không bao giờ vào git: `data/` bị ignore ở gốc repo (`/data/`).
- Lượt test chạy ở đây phải giữ fixture khỏi repo bao quanh: runner đặt `GIT_CEILING_DIRECTORIES` và trần của harness
  (`ZEMORY_PROJECT_CEILING`) bằng thư mục lượt, để project giả không leo lên marker hay `.git` của chính repo.
- Không phải cache: thứ dựng lại và dùng lại thì vào `data/cache/` (Data_096_Cache).

## Kiểm

Một lượt test xong, `data/tmp/<runner>-test/` không còn thư mục lượt nào cũ hơn tuổi dọn.
