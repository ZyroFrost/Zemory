---
id: Struc_Disk_Data
name: disk-data
version: 3
scope: disk
---
# Struc_Disk_Data

## Vai trò

Khung của MỘT ổ dữ liệu: gốc ổ (`D:\`) trên Windows, hoặc một thư mục dữ liệu (`~/data`) trên Linux. Ổ hệ thống (`C:\`) không
dùng khung này và không chứa gì của người dùng ngoài những gì hệ điều hành ép. Mỗi thư mục cấp 1 có đúng một vai.

Máy mới dựng ổ theo thứ tự: ráp khung này ⇒ trong `Workspace\` ráp `Struc_Region_Workspace` ⇒ trong mỗi
`Workspace\Company\<Tổ chức>\` ráp `Struc_Region_Company` ⇒ cuối cùng mỗi repo nhận bộ mẫu theo vai của nó.

## Cây

```
<ổ dữ liệu>\
├── Workspace\                     MỌI repo, không repo nào nằm ngoài (Workspace_143) → Struc_Region_Workspace
├── Software\                      MỌI phần mềm của máy (Software_147)
│   ├── <Nhóm>\                    một trong mười bốn nhóm: AI · 3D · CAD · Image_2D · Video · Screen_Record · Audio ·
│   │   │                          Office · Dev · Network · System · Utility · Drivers · Fonts (Software_148)
│   │   └── [<Hãng>\]<Ứng dụng>\   một phần mềm, LUÔN đủ ba thư mục con (Software_149):
│   │       ├── Setup\             bộ cài gốc, giữ nguyên tên tệp (kèm crack, key nếu có)
│   │       ├── App\               bản đã cài — chạy bộ cài thì chọn đường này — hoặc bản portable
│   │       └── Data\              dữ liệu riêng: ổ ảo, cache, workspace, database (để trống nếu không có)
│   └── Drivers\<Thiết bị>\        gói driver, không theo khuôn ba thư mục (Software_150)
├── AppConfig\<công cụ>\           cấu hình và khoá của từng công cụ: configs\ · credentials\ · cache\ (AppConfig_151)
├── Documents\<mảng>\              tài liệu cá nhân (Documents_152)
└── Recovery\                      bản khôi phục máy (Recovery_153)
```

Ví dụ thật một phần mềm đúng chuẩn trên ổ này:

```
D:\Software\System\Microsoft\WSL\
├── Setup\    wsl_x64.msi
├── App\      (đường cài đã chọn)
└── Data\     ext4.vhdx  (ổ ảo của Ubuntu, có trần dung lượng)
```

## Luật

- Gốc ổ không có file lẻ. Mọi thứ nằm trong một trong năm thư mục trên (thư mục hệ thống của Windows như
  `System Volume Information`, `$RECYCLE.BIN` để yên).
- Repo chỉ nằm trong `Workspace\`. Phần mềm chỉ nằm trong `Software\`. Cấu hình và khoá của công cụ chỉ nằm trong
  `AppConfig\`. Không có ngoại lệ.
- MỌI thư mục phần mềm trong `Software\<Nhóm>\` (trừ `Drivers\` và `Fonts\`) có đủ `Setup\` · `App\` · `Data\` — luật đầy đủ,
  các bước làm và ngoại lệ ở `Software_149_Program`.
- Ổ ảo và dữ liệu lớn của phần mềm nằm ở `Data\` của chính phần mềm đó, có trần dung lượng. Đo chỗ trống của ổ trước mỗi
  việc ghi lớn (cài phần mềm, dựng image, chép dữ liệu) và sau khi làm xong.

## Phép kiểm

`zemory conform --layout <gốc ổ>` báo đỏ: file lẻ ở gốc (`loose-file`) · thư mục lạ ở cấp 1 (`unknown-folder`) · repo ngoài
`Workspace\` (`repo-outside-workspace`) · nhóm lạ trong `Software\` (`unknown-value`) · phần mềm thiếu `Setup\`, `App\` hoặc
`Data\` (`program-incomplete`). Lệnh này cũng đi tiếp vào `Workspace\` và từng tổ chức.
