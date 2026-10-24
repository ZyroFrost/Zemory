---
version: 3
lang: vi
---
# Software_147_Software software — mọi chương trình của máy

## Vai trò

`<gốc dữ liệu>\Software\` là bước 6 của chuỗi câu hỏi cấp ổ (`Struc_Disk_Data`): chương trình — bộ cài, bản cài, dữ liệu riêng —
kể cả game, launcher, công cụ game, và thư mục đệm đầu ra của chương trình. Đây là chỗ DUY NHẤT cho chương trình: máy mới dựng lại
mọi chương trình bằng cách đi qua cây này.

```
Software\
└── <Nhóm>\                        một trong mười lăm nhóm của Software_148 (AI · Dev · Game · Office …)
    └── [<Hãng>\]<Ứng dụng>\       một chương trình, LUÔN đủ Setup\ · App\ · Data\ (Software_149)
```

Ví dụ thật: `D:\Software\Dev\Microsoft\VSCode\{Setup, App, Data}` · `D:\Software\Game\Steam\{Setup, App, Data}` (thư viện game là
`Data\` của launcher).

## Luật

- Mọi chương trình có bộ cài cho chọn chỗ đều cài vào `Software\<Nhóm>\[<Hãng>\]<Ứng dụng>\App\`.
- Chương trình bị ép cài vào ổ hệ thống vẫn có thư mục ở đây, đủ ba phần (`Software_149_Program`, ngoại lệ 1).
- Cấp `Software\` chỉ có các nhóm của `Software_148_Group`: không chương trình nằm thẳng ở đây, không file lẻ, không repo, không giấy
  tờ.
- Chương trình tìm thấy ở chỗ khác (trong `Documents\`, `Study\`, `Game\`) dời về đây (luật 2 của `Struc_Disk_Data`).

## Đồng bộ

Không vào git, không đồng bộ: bản cài là của từng máy, bộ cài tải lại được.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>`: nhóm ngoài Software_148 (`unknown-value`) · chương trình thiếu một trong ba phần
(`program-incomplete`) · repo nằm trong `Software\` (`repo-outside-workspace`).
