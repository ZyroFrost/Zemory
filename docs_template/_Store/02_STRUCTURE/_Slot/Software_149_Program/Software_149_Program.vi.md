---
version: 5
lang: vi
---
# Software_149_Program program — một phần mềm

## Vai trò

Mỗi phần mềm có ĐÚNG MỘT thư mục riêng. Mọi thứ thuộc về phần mềm đó nằm trong thư mục này: bộ cài, bản đã cài, và dữ liệu riêng
của nó. Nhìn vào một thư mục là biết đủ ba thứ của phần mềm, và máy mới dựng lại được phần mềm đó chỉ từ thư mục này.

## Luật bắt buộc — không có ngoại lệ nào ngoài ba ngoại lệ ghi bên dưới

Thư mục phần mềm CHỈ chứa các thư mục con `Setup/` · `App/` · `Data/` (cộng `_README.md` của phần mềm tách nhỏ). Mỗi thư mục con
chỉ có khi có thứ để chứa: phần mềm không có dữ liệu riêng thì không có `Data/`, phần mềm không giữ bộ cài thì không có `Setup/`.
Thiếu một thư mục con là đúng chuẩn; thư mục con rỗng thì sai — chủ máy mở vào chỉ thấy trống. Sai chuẩn là có thứ nằm ngoài ba
thư mục đó: một file hay một thư mục nằm thẳng trong thư mục phần mềm.

| thư mục con | chứa gì | ví dụ thật |
|---|---|---|
| `Setup/` | bộ cài gốc đúng như đã tải về, giữ nguyên tên tệp; kèm crack, key, tệp kích hoạt nếu có | `Software\Dev\Microsoft\VSCode\Setup\VSCodeUserSetup-x64-1.106.0.exe` |
| `App/` | bản đã cài (đường cài khi chạy bộ cài) hoặc bản portable | `Software\Dev\Microsoft\VSCode\App\` (chứa `Code.exe`) |
| `Data/` | dữ liệu riêng mà phần mềm cho chọn chỗ: ổ ảo, cache, workspace, database, log | `Software\System\Microsoft\WSL\Data\Ubuntu\ext4.vhdx` · `Software\Dev\Database\MongoDB\Data\db\` |

Ví dụ một thư mục phần mềm đúng chuẩn:

```
Software\Dev\Database\MongoDB\
├── Setup\    mongodb-windows-x86_64-8.0.4-signed.msi
├── App\      (đường cài đã chọn khi chạy bộ cài: bin\mongod.exe …)
└── Data\     db\  ·  log\
```

Ví dụ phần mềm KHÔNG có dữ liệu riêng — không có `Data/`:

```
Software\Utility\7-Zip\
├── Setup\    7z2409-x64.exe
└── App\      7z.exe · 7zFM.exe …
```

## Các bước

**Cài một phần mềm mới:**
1. Tạo `Software\<Nhóm>\[<Hãng>\]<Ứng dụng>\Setup\` rồi tải bộ cài vào đó, giữ nguyên tên tệp.
2. Chạy bộ cài; ở bước chọn thư mục cài, chọn đúng `…\<Ứng dụng>\App\`.
3. Phần mềm có tuỳ chọn đặt dữ liệu (ổ ảo, workspace, database) ⇒ chọn `…\<Ứng dụng>\Data\`. Không có tuỳ chọn đó ⇒ không có
   `Data\`.

**Phần mềm đã cài sẵn ở chỗ khác:**
- Bản portable (chép đi là chạy): dời thẳng cả thư mục vào `App\`.
- Bản cài qua bộ cài (registry và shortcut đã ghi đường cũ): KHÔNG dời tay — gỡ ra rồi cài lại theo các bước trên. Làm dần, phần
  mềm nào dùng tới thì làm phần mềm đó; bộ cài của nó thì dời vào `Setup\` ngay.

## Ngoại lệ

1. **Bộ cài không cho chọn chỗ** (ép cài vào ổ hệ thống, ví dụ một số bản của Docker Desktop, driver của hãng máy): cài vào chỗ
   bộ cài chọn; thư mục phần mềm có `Setup\` giữ bộ cài, không có `App\`, và chỉ có `Data\` nếu phần mềm cho dời dữ liệu ra.
2. **Phần mềm tách ra hai ổ** (năm luật của `Struc_Disk_Data`): thư mục của nó có ở mỗi ổ, mỗi bên giữ các phần nằm thật ở đó
   cùng một `_README.md` ghi phần nào nằm ở đâu. Ví dụ: `H:\Software\System\Microsoft\WSL\` chỉ có `_README.md` và `Data\`.
3. **Thư mục không phải phần mềm:** nhóm `Drivers\` và `Fonts\` chứa gói driver và gói phông (Software_150); chúng không có
   bản cài.

## Được chứa / không chứa

- Có cấp `<Hãng>\` chen giữa khi một hãng có nhiều phần mềm trong cùng nhóm: `Software\Dev\Microsoft\VSCode\` ·
  `Software\Dev\Microsoft\SQLServer\`. Hãng chỉ có một phần mềm trong nhóm thì bỏ cấp hãng: `Software\Utility\7-Zip\`.
- Không chứa: thiết lập và khoá của chủ máy (để ở `_ConfigVault\<công cụ>\`) · tài liệu làm việc (`Documents\`) · repo
  (`Workspace\`) · file model (`_Models\`).
- Thư mục cài toàn cục của trình quản lý gói là `Data\` của runtime đó: `npm config set prefix
  D:\Software\Dev\NodeJS\Data\npm-global`, để mọi CLI cài bằng `npm -g` nằm ở đó và chỉ thư mục đó nằm trên `PATH`. CLI cài
  bằng bộ cài riêng thì có thư mục phần mềm riêng (`Software\AI\Anthropic\ClaudeCode\`).
- THƯ MỤC ĐỆM ĐẦU RA của một chương trình — chỗ nó ghi ra trước khi chủ máy xếp kết quả (thư mục ghi clip của phần mềm quay màn hình
  trên ổ nhanh) — là `Data\` của chính chương trình đó, nối sang ổ nhanh theo năm luật của `Struc_Disk_Data`; món đã xếp thì dời
  về chỗ của nó (clip game ⇒ `Game\Media\`).

## Khuôn tên

Tên phần mềm viết như hãng viết, bỏ dấu cách: `PowerBI` · `VSCode` · `7-Zip` · `LMStudio`. Tên hãng PascalCase: `Microsoft` ·
`JetBrains`. Ba thư mục con viết đúng hoa thường: `Setup` · `App` · `Data`.

## Đồng bộ

Không vào git, không đồng bộ: bản cài là của từng máy, bộ cài tải lại được. `Data\` có thể rất lớn (ổ ảo hàng chục GB) — ổ ảo
phải đặt trần dung lượng, và đo chỗ trống của ổ trước mỗi việc ghi lớn.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` báo đỏ (`program-stray`) mọi thư mục phần mềm chứa thứ gì ngoài `Setup\`, `App\`, `Data\`
và `_README.md`, kèm tên thứ nằm lạc. Thiếu một thư mục con không bao giờ bị báo. Không kiểm `Drivers\` và `Fonts\`.
