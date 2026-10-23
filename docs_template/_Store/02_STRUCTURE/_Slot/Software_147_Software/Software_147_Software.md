---
id: Slot_147
name: software
version: 2
path: Software/
scope: layout
---
# Software_147_Software software — nơi đặt mọi phần mềm của máy

## Vai trò

`<ổ dữ liệu>\Software\` là chỗ DUY NHẤT đặt phần mềm của máy: bộ cài, bản đã cài và dữ liệu riêng của từng phần mềm. Máy mới
dựng lại toàn bộ phần mềm bằng cách đi qua cây này, chạy bộ cài trong `Setup\` của từng phần mềm và chọn đường cài `App\`.

## Cây

```
Software\
└── <Nhóm>\                       một trong mười bốn nhóm của Software_148_Group (AI · Dev · Office …)
    └── [<Hãng>\]<Ứng dụng>\      một phần mềm — LUÔN đủ ba thư mục con (Software_149_Program)
        ├── Setup\                bộ cài gốc, giữ nguyên tên tệp
        ├── App\                  bản đã cài / portable
        └── Data\                 dữ liệu riêng của phần mềm (trống nếu không có)
```

Ví dụ thật: `D:\Software\Dev\Microsoft\VSCode\{Setup, App, Data}` · `D:\Software\System\Microsoft\WSL\{Setup, App, Data}`.

## Luật

- Mọi phần mềm có bộ cài cho chọn chỗ ĐỀU cài vào `Software\<Nhóm>\[<Hãng>\]<Ứng dụng>\App\`, không cài vào ổ hệ thống.
- Phần mềm mà bộ cài ép cài vào ổ hệ thống: vẫn tạo thư mục phần mềm đủ ba thư mục con trong `Software\`; `Setup\` giữ bộ cài,
  `App\` để trống (xem ngoại lệ ở `Software_149_Program`).
- Cấp `Software\` chỉ chứa các thư mục nhóm của `Software_148_Group`. Không có phần mềm nằm thẳng ở `Software\`, không có file
  lẻ, không có repo, không có tài liệu làm việc.
- Tên `Software` cố định, viết đúng như vậy.

## Đồng bộ

Không vào git, không đồng bộ giữa máy: bản cài là của từng máy, bộ cài tải lại được.

## Phép kiểm

`zemory conform --layout <gốc ổ>`: nhóm lạ trong `Software\` (`unknown-value`) · phần mềm thiếu một trong ba thư mục con
(`program-incomplete`) · repo nằm trong `Software\` (`repo-outside-workspace`).
