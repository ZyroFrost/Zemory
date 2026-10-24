---
version: 4
lang: vi
---
# Struc_Disk_Data

## Vai trò

Khung dữ liệu của chủ máy: MỘT cây thư mục chứa mọi thứ một người tự làm, sưu tầm, cài đặt và cất giữ. Trên Windows cây bắt đầu
ở gốc ổ dữ liệu (`D:\`); trên Linux ở một thư mục dữ liệu (`~/data`). Ổ hệ thống (`C:\`) không dùng khung này và không chứa gì
của chủ máy ngoài những gì hệ điều hành ép (xem "Ổ hệ thống" bên dưới).

Khung này là mặc định HS đưa cho mọi bộ mẫu, không phải bắt buộc. Chủ máy được đổi tên, bỏ hay thêm thư mục cấp 1, chia cây ra
bao nhiêu ổ cũng được, hoặc thay hẳn khung khác; phép kiểm khi đó chấm theo HS của chính chủ máy.

Máy mới dựng theo thứ tự: ráp khung này ⇒ trong `Workspace\` ráp `Struc_Region_Workspace` ⇒ trong mỗi
`Workspace\Company\<Tổ chức>\` ráp `Struc_Region_Company` ⇒ cuối cùng mỗi repo nhận bộ mẫu theo vai của nó.

## Cây — bốn nhánh và hai nơi chứa dùng chung

Mỗi thư mục cấp 1 KHÔNG có `_` thuộc đúng một trong bốn nhánh. Nhánh cho biết một thứ mới đặt ở đâu: hỏi trước "thứ này tôi tự
làm, tôi sưu tầm, tôi cài để chạy, hay là bản sao cất cho an toàn?"

Thư mục cấp 1 CÓ `_` là nơi chứa dùng chung của cả máy: nhiều phần mềm và repo trỏ vào, chủ máy không đặt việc của mình ở đó, và
mỗi nơi có luật đồng bộ riêng. Đây đúng là nghĩa của `_` ở cấp tổ chức (`_Hub`, `_DB_Warehouse`: một chỗ nhiều thành viên cùng
dùng). Có hai nơi: `_ConfigVault\` và `_Models\`.

```
<gốc dữ liệu>\
│  NƠI CHỨA DÙNG CHUNG CỦA MÁY — nhiều phần mềm và repo trỏ vào
├── _ConfigVault\<công cụ>\  thiết lập và khoá của mọi công cụ: configs\ · credentials\ · cache\ (ConfigVault_151)
├── _Models\<engine>\        nơi chứa model duy nhất, mọi app AI trỏ vào (Models_167)
│
│  ① CHỦ MÁY TỰ LÀM — bản gốc; mất là không lấy lại được
├── Workspace\        mọi repo, không repo nào nằm chỗ khác (Workspace_143) → Struc_Region_Workspace
├── Study\            thứ đang học: môn ở trường, mảng tự học (Study_160)
├── Memories\         ảnh và video tự chụp, theo năm và sự kiện (Memories_161)
├── Documents\        giấy tờ cá nhân: định danh, hợp đồng, CV, hồ sơ (Documents_152)
│
│  ② SƯU TẦM — người khác làm, chủ máy giữ; tải lại được nhưng tốn công
├── Media\            phim, clip, nhạc, ảnh, truyện tranh (Media_162)
├── Library\          kiến thức giữ để tra: sách, bài báo, khoá học đã học xong (Library_163)
├── Game\             game đã cài, file lưu, ảnh/clip, công cụ của game (Game_164)
│
│  ③ CÀI ĐẶT VÀ VẬN HÀNH — phần mềm của máy
├── Software\         mọi phần mềm của máy (Software_147)
│   ├── <Nhóm>\       một trong mười bốn nhóm của Software_148
│   │   └── [<Hãng>\]<Ứng dụng>\   một phần mềm, LUÔN đủ Setup\ · App\ · Data\ (Software_149)
│   └── Drivers\<Thiết bị>\        gói driver, không phải phần mềm (Software_150)
│
│  ④ CẤT CHO AN TOÀN HOẶC ĐÃ NGHỈ
├── Backup\           bản sao của dữ liệu mà bản gốc nằm chỗ khác: điện thoại, app chat (Backup_165)
├── Archive\          thứ đã nghỉ, giữ làm bản duy nhất: dự án đã đóng, phiên bản cũ (Archive_166)
└── Recovery\         ảnh khôi phục của chính máy (Recovery_153)
```

Phân vân đặt đâu:

| thứ cần đặt | đặt ở | vì sao |
|---|---|---|
| khoá học đang theo | `Study\Self\<Mảng>\` | còn đang học |
| cũng khoá đó, học xong, giữ để tra lại | `Library\<Mảng>\` | chỉ để tra |
| mã viết trong lúc học, chạy được | `Workspace\Personal\StudyProjects\...\<repo>\` | chạy được ⇒ Workspace |
| ảnh một chuyến đi | `Memories\<năm>\<YYYY-MM-DD Chuyến đi>\` | chủ máy tự chụp |
| hình nền tải trên mạng | `Media\Image\` | sưu tầm |
| danh bạ và dữ liệu app chép ra từ điện thoại | `Backup\Phone\<thiết bị>\` | bản sao; điện thoại giữ bản gốc |
| một repo đã đóng hẳn | `Archive\Workspace\...\<repo>.zip` | đã nghỉ, bản duy nhất |
| ổ ảo của WSL | `Software\System\Microsoft\WSL\Data\<Distro>\` | dữ liệu của một phần mềm |
| một file model ngôn ngữ | `_Models\<engine>\` | các app AI dùng chung |
| khoá SSH, token của một công cụ | `_ConfigVault\<công cụ>\credentials\` | dùng chung, bí mật |

Không có `Runtime\` và `Image\` ở cấp 1: runtime (WSL, Docker) là phần mềm trong `Software\`; ảnh là `Media\Image\` (sưu tầm)
hoặc `Memories\` (tự chụp).

## Một cây logic, nhiều nơi lưu — gợi ý, không bắt buộc

Cây trên là MỘT cây logic, máy có bao nhiêu ổ cũng vậy. Mỗi khối dữ liệu nằm thật ở đúng một nơi lưu (ổ dữ liệu chính, ổ dữ liệu
thứ hai, SSD nhanh, ổ ngoài, NAS); mọi nơi khác cần nó chỉ có một điểm nối trỏ tới. Mở từ ổ nào, chủ máy cũng thấy cùng một cây.
Đây là cách HS gợi ý; chủ máy có một ổ thì không cần phần này, và được nối bất kỳ thư mục nào sang bất kỳ ổ nào.

Năm luật, khi cây chia ra nhiều nơi lưu:
1. Mỗi thư mục thuộc đúng một trong ba loại: thật ở nơi này · thật ở nơi khác (ở đây chỉ là điểm nối) · tách nhỏ (các thư mục con
   của nó nằm thật ở những nơi khác nhau).
2. Không nối một khối khi có thư mục con của nó nằm nơi khác; tách nhỏ khối đó rồi nối từng con.
3. Thư mục tách nhỏ không chứa file lẻ; chỉ có một `_README.md` ở gốc của nó, mỗi nơi lưu một bản, ghi phần nào nằm ở đâu.
4. Công cụ quét cây đi qua mọi nơi lưu nhưng bỏ qua mọi điểm nối, để mỗi file chỉ được thấy một lần.
5. Global Memory giải đường dẫn về vị trí thật trước khi ghi.

Dây nối theo từng loại nơi lưu:

| nơi lưu | cách nối |
|---|---|
| ổ trong máy | junction trên Windows (`mklink /J`), symlink trên Linux; không dùng bind mount |
| ổ ngoài | gán chữ ổ cố định, hoặc gắn ổ vào một thư mục |
| NAS | symlink tới đường mạng (`mklink /D`); junction không trỏ được tới thư mục chia sẻ trên mạng |
| ổ đám mây | mount vào một điểm cố định; database đang chạy KHÔNG BAO GIỜ nằm ở phía đám mây |

Vướng đã biết: rút nơi lưu ra thì điểm nối chết; vài công cụ xoá xuyên qua điểm nối; cây lồng sâu dễ chạm giới hạn độ dài đường
dẫn của Windows.

Ví dụ — ổ dữ liệu chính `D:` và một SSD nhanh `H:` giữ game, model và ổ ảo của WSL:

```
D:\                                        H:\
├── _Models\  ──────── junction ─────────► ├── _Models\         (thật ở đây)
├── Game\  ─────────── junction ─────────► ├── Game\            (thật ở đây: Installed\ · Saves\ · Media\ · Tools\)
├── Software\  (tách nhỏ)                  └── Software\  (tách nhỏ)
│   ├── _README.md                             ├── _README.md
│   ├── Dev\ …          (thật ở D:)            └── System\Microsoft\WSL\  (tách nhỏ)
│   └── System\Microsoft\WSL\  (tách nhỏ)          ├── _README.md
│       ├── _README.md                             └── Data\        (thật ở đây: Ubuntu\ext4.vhdx)
│       ├── Setup\  App\  (thật ở D:)
│       └── Data\  ──── junction ──────────► H:\Software\System\Microsoft\WSL\Data\
└── Workspace\ …        (thật ở D:)
```

`_Models\` và `Game\` là khối nguyên, mỗi khối một junction. `Software\` là thư mục tách nhỏ (luật 1): vài thư mục con nằm thật ở
`D:`, một con nằm thật ở `H:`. `WSL\` cũng tách nhỏ, nên chỉ `Data\` được nối (luật 2). Mỗi thư mục tách nhỏ có một `_README.md`
ở cả hai ổ ghi phần nào nằm ở đâu (luật 3); phép kiểm đọc file đó là dấu hiệu của một phần mềm tách nhỏ và không đòi
`H:\…\WSL\` phải có `Setup\` và `App\`.

Vai thường gặp của các ổ trong một máy:
- ổ dữ liệu chính — giữ toàn bộ cây; khối nào chưa dời đi thì nằm thật ở đây.
- ổ dữ liệu thứ hai — cùng cây đó, giữ các khối dời khỏi ổ chính (media lớn, archive).
- SSD nhanh — khối cần tốc độ: game, model, ổ ảo, dữ liệu huấn luyện. Coi là thay được: thứ chỉ nằm ở đó phải có bản sao lưu ở
  nơi khác.
- ổ hệ thống `C:` — không thuộc cây.
- ổ đám mây (Google Drive, OneDrive) — không thuộc cây; nhiều nhất là điểm mount cho một bản sao lưu.

## Ổ hệ thống

`C:\` chứa hệ điều hành và chỉ những gì phần mềm ép đặt ở đó. Không tạo thư mục của chủ máy trên ổ này. Những thứ thường bị ép:

| thứ | vì sao nằm ở C: |
|---|---|
| `C:\Program Files\WSL` · `C:\Program Files\Docker` | bộ cài không cho chọn chỗ (ngoại lệ của Software_149); thư mục phần mềm trong `Software\` vẫn giữ `Setup\` và `Data\` |
| `%USERPROFILE%\.wslconfig` | WSL chỉ đọc nó ở đó |
| thư mục nhà của công cụ: `%USERPROFILE%\.claude` · `.codex` · `.docker` · `.ssh` · `.cache` · `.lmstudio` · `%APPDATA%\Code` | công cụ đọc thư mục nhà của nó ở đó |
| `%USERPROFILE%\.zemory\location.json` | file duy nhất zemory đọc trước khi biết mọi thứ khác nằm đâu; nó trỏ tới thư mục Global Memory |

`HOME` giữ mặc định của hệ điều hành (`%USERPROFILE%`); không bao giờ trỏ nó vào một thư mục của ổ dữ liệu. Thư mục nhà của công
cụ phình to (cache model, cache gói) được phép dời: đặt thiết lập của chính công cụ trỏ vào một chỗ trong cây (`_Models\lmstudio\`),
hoặc thay thư mục trên `C:` bằng một junction trỏ tới chỗ đó. Khoá và thiết lập chủ máy mang sang máy mới thì để ở
`_ConfigVault\<công cụ>\` (ConfigVault_151, có cả các bước gỡ một `HOME` đang trỏ vào ổ dữ liệu).

## Luật

- Gốc dữ liệu không có file lẻ. Mọi thứ nằm trong một thư mục của cây (thư mục hệ thống của Windows như
  `System Volume Information`, `$RECYCLE.BIN` để yên).
- `_` ở gốc chỉ đánh dấu hai nơi chứa dùng chung; không thư mục cấp 1 nào khác bắt đầu bằng `_`.
- Repo chỉ nằm trong `Workspace\`. Phần mềm chỉ nằm trong `Software\`. Thiết lập và khoá của công cụ chỉ nằm trong
  `_ConfigVault\`. File model chỉ nằm trong `_Models\`.
- MỌI thư mục phần mềm trong `Software\<Nhóm>\` (trừ `Drivers\` và `Fonts\`) có đủ `Setup\` · `App\` · `Data\` — luật đầy đủ, các
  bước và ngoại lệ ở `Software_149_Program`.
- Ổ ảo và dữ liệu lớn của phần mềm nằm ở `Data\` của chính phần mềm đó, có trần dung lượng. Đo chỗ trống của ổ trước mỗi việc ghi
  lớn (cài phần mềm, dựng image, chép dữ liệu) và sau khi làm xong.

## Các bước — dựng cây cho một máy

1. Chọn ổ dữ liệu chính; tạo các thư mục cấp 1 mà chủ máy có dữ liệu (nhánh chưa có gì thì không tạo thư mục rỗng).
2. Dời từng thư mục đang có về chỗ của nó theo bảng "Phân vân đặt đâu"; cài lại phần mềm vào `Software\` theo
   `Software_149_Program`.
3. Dời thiết lập và khoá của công cụ vào `_ConfigVault\` và trả `HOME` về mặc định trong CÙNG MỘT đợt (ConfigVault_151): đổi
   `HOME` là đổi chỗ đọc của nhiều công cụ cùng lúc.
4. Khối nào phải nằm ở ổ khác (vì tốc độ, vì dung lượng) thì đặt thật ở đó rồi nối về, theo năm luật.
5. Chạy `zemory conform --layout <gốc dữ liệu>` trên mỗi ổ giữ một phần của cây, tới khi không còn báo gì.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` báo đỏ: file lẻ ở gốc (`loose-file`) · thư mục cấp 1 không có slot (`unknown-folder`) ·
repo ngoài `Workspace\` (`repo-outside-workspace`) · nhóm trong `Software\` ngoài Software_148 (`unknown-value`) · phần mềm thiếu
`Setup\`, `App\` hoặc `Data\` (`program-incomplete`). Lệnh đi tiếp vào `Workspace\` và từng tổ chức. Năm luật của cây chia nhiều
nơi lưu chưa có phép kiểm máy; chủ máy tự giữ.
