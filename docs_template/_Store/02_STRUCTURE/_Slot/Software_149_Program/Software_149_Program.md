---
id: Slot_149
name: program
version: 2
path: Software/<Nhóm>/[<Hãng>/]<Ứng dụng>/
scope: layout
---
# Software_149_Program program — một phần mềm

## Vai trò

Mỗi phần mềm có ĐÚNG MỘT thư mục riêng. Mọi thứ thuộc về phần mềm đó nằm trong thư mục này: bộ cài, bản đã cài, và dữ liệu
riêng của nó. Nhìn vào một thư mục là biết đủ ba thứ của phần mềm, và máy mới dựng lại được phần mềm đó chỉ từ thư mục này.

## Luật bắt buộc — không có ngoại lệ

Thư mục của MỌI phần mềm LUÔN có đủ ba thư mục con `Setup/` · `App/` · `Data/`. Thiếu một trong ba là sai chuẩn, kể cả khi
phần đó chưa có gì để bỏ vào: khi ấy vẫn tạo thư mục, để trống.

| thư mục con | chứa gì | ví dụ thật |
|---|---|---|
| `Setup/` | bộ cài gốc đúng như đã tải về, giữ nguyên tên tệp; kèm crack, key, tệp kích hoạt nếu có | `Software\Dev\Microsoft\VSCode\Setup\VSCodeUserSetup-x64-1.106.0.exe` |
| `App/` | bản đã cài (đường cài khi chạy bộ cài) hoặc bản portable | `Software\Dev\Microsoft\VSCode\App\` (chứa `Code.exe`) |
| `Data/` | dữ liệu riêng mà phần mềm cho chọn chỗ: ổ ảo, cache, workspace, database, log | `Software\System\Microsoft\WSL\Data\ext4.vhdx` · `Software\Dev\Database\MongoDB\Data\db\` |

Ví dụ một thư mục phần mềm đúng chuẩn:

```
Software\Dev\Database\MongoDB\
├── Setup\    mongodb-windows-x86_64-8.0.4-signed.msi
├── App\      (đường cài đã chọn khi chạy bộ cài: bin\mongod.exe …)
└── Data\     db\  ·  log\
```

Ví dụ phần mềm KHÔNG có dữ liệu riêng — `Data/` vẫn có, để trống:

```
Software\Utility\7-Zip\
├── Setup\    7z2409-x64.exe
├── App\      7z.exe · 7zFM.exe …
└── Data\     (trống)
```

## Cách làm từng bước

**Cài một phần mềm mới:**
1. Tạo `Software\<Nhóm>\[<Hãng>\]<Ứng dụng>\` cùng đủ ba thư mục con `Setup\` · `App\` · `Data\`.
2. Tải bộ cài vào `Setup\`, giữ nguyên tên tệp.
3. Chạy bộ cài; ở bước chọn thư mục cài, chọn đúng `…\<Ứng dụng>\App\`.
4. Phần mềm có tuỳ chọn đặt dữ liệu (ổ ảo, workspace, database) ⇒ chọn `…\<Ứng dụng>\Data\`.

**Phần mềm đã cài sẵn ở chỗ khác:**
- Bản portable (chép đi là chạy): dời thẳng cả thư mục vào `App\`.
- Bản cài qua bộ cài (registry và shortcut đã ghi đường cũ): KHÔNG dời tay — gỡ ra rồi cài lại theo các bước trên. Làm dần,
  phần mềm nào dùng tới thì làm phần mềm đó; bộ cài của nó thì dời vào `Setup\` ngay.

**Ngoại lệ — bộ cài không cho chọn chỗ** (ép cài vào ổ hệ thống, ví dụ một số bản của Docker Desktop, driver của hãng máy):
cài vào chỗ bộ cài chọn; thư mục phần mềm vẫn có đủ ba thư mục con — `Setup\` giữ bộ cài, `App\` để trống, `Data\` chứa dữ
liệu nếu phần mềm cho dời dữ liệu ra.

## Được chứa / không chứa

- Có cấp `<Hãng>\` chen giữa khi một hãng có nhiều phần mềm trong cùng nhóm: `Software\Dev\Microsoft\VSCode\` ·
  `Software\Dev\Microsoft\SQLServer\`. Hãng chỉ có một phần mềm trong nhóm thì bỏ cấp hãng: `Software\Utility\7-Zip\`.
- Không chứa: cấu hình và khoá của người dùng (để ở `AppConfig\<công cụ>\`) · tài liệu làm việc (`Documents\`) · repo
  (`Workspace\`).
- Nhóm `Drivers\` và `Fonts\` không theo khuôn ba thư mục này: chúng chứa gói driver và gói phông, không có bản cài.

## Khuôn tên

Tên phần mềm viết như hãng viết, bỏ dấu cách: `PowerBI` · `VSCode` · `7-Zip` · `LMStudio`. Tên hãng PascalCase: `Microsoft` ·
`JetBrains`. Ba thư mục con viết đúng hoa thường: `Setup` · `App` · `Data`.

## Đồng bộ

Không vào git, không đồng bộ: bản cài là của từng máy, bộ cài tải lại được. `Data\` có thể rất lớn (ổ ảo hàng chục GB) — ổ
ảo phải đặt trần dung lượng, và đo chỗ trống của ổ trước mỗi việc ghi lớn.

## Phép kiểm

`zemory conform --layout <gốc ổ>` báo đỏ (`program-incomplete`) mọi thư mục phần mềm thiếu `Setup\`, `App\` hoặc `Data\`, kèm
tên thư mục còn thiếu.
