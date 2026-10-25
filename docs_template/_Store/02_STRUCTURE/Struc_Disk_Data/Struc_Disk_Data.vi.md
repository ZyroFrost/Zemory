---
version: 7
lang: vi
---
# Struc_Disk_Data

## Vai trò

Khung dữ liệu của chủ máy: MỘT cây thư mục chứa mọi thứ một người tự làm, sưu tầm, cài đặt và cất giữ. Trên Windows cây bắt đầu
ở gốc ổ dữ liệu (`D:\`); trên Linux ở một thư mục dữ liệu (`~/data`). Ổ hệ thống (`C:\`) không dùng khung này và không chứa gì
của chủ máy ngoài những gì hệ điều hành ép (xem "Ổ hệ thống").

Khung này là mặc định HS đưa cho mọi bộ mẫu, không phải bắt buộc. Chủ máy được đổi tên, bỏ hay thêm thư mục, chia cây ra bao nhiêu
ổ cũng được, hoặc thay hẳn khung khác; phép kiểm khi đó chấm theo HS của chính chủ máy. Đổi gì thì hai luật dưới đây vẫn giữ —
chúng là thứ làm một cấu trúc thành cấu trúc.

## Luật 1 — một thứ một chỗ

Mỗi món có đúng MỘT chỗ trong cây. Cấu trúc mà một món đặt được ở hai nơi, hoặc không nơi nào, là cấu trúc sai, và cách sửa là
sửa CÂU HỎI của cấu trúc, không bao giờ nắn món cho vừa.

- Mỗi cấp của cây hỏi đúng một câu hỏi xếp; các thư mục con là các đáp án.
- Các đáp án loại trừ nhau và phủ hết: món nào cũng ra đúng một đáp án.
- Câu hỏi được trả lời bằng SỰ THẬT kiểm được, không bao giờ bằng ý định. Sự thật: "có commit của mình" · "có EXIF máy chụp" ·
  "có thư mục `Study\X`" · "có khách đặt" · "bản gốc còn ở nơi khác". Không phải sự thật: "làm để học hay để dùng", "giữ cho vui".
- Nhiều sự thật cùng đúng thì xét THEO THỨ TỰ, sự thật đúng đầu tiên thắng. Thứ tự ghi một lần và mọi slot liên quan ghi lại đúng
  thứ tự đó — không slot nào giữ một ngoại lệ mà phía bên kia không biết.
- Món đổi trạng thái có luật dời ghi kèm công cụ: đang học → học xong ⇒ `Library\`; dự án học thành sản phẩm ⇒ `zemory project move`
  sang `Apps\`; bản gốc nghỉ hưu ⇒ `Archive\`.

## Luật 2 — đặt theo bản chất, trỏ qua theo mục đích

Món được đặt theo NÓ LÀ GÌ, bất kể dùng để làm gì: code ⇒ `Workspace\`, chương trình ⇒ `Software\`, tài liệu học ⇒ `Study\`. Nơi
cần nó cho mục đích của mình thì giữ một shortcut hoặc một điểm nối, không giữ món. Code của người khác luôn ở
`Workspace\External\` kể cả khi clone về để học; chương trình phục vụ việc học vẫn ở `Software\`; công cụ game là chương trình,
ở `Software\Game\`.

Mục đích chỉ quyết định chỗ đặt ở nơi thứ tự dưới đây ghi rõ: đồ game (bước 8) và bộ sưu tập avatar của chủ máy (bước 11).

## Luật 3 — luật khối

Một thứ nằm ở khối NHỎ NHẤT chứa mọi thứ dùng nó. Chỉ một khối dùng ⇒ nằm trong khối đó. Nhiều khối cùng dùng ⇒ lên cấp chung gần
nhất, tên mang `_`. Thứ bị đem ra khỏi khối của nó thì lạc: mật khẩu của một tổ chức dời sang thư mục cá nhân thì không ai làm cho
tổ chức đó tìm thấy.

| thứ cần đặt | ai dùng | đặt ở |
|---|---|---|
| prompt hai app cùng mảng dùng chung | hai repo của `Apps\` | `Workspace\Personal\Apps\_Prompt\` |
| file model mọi app AI đọc | cả máy | `_Models\` ở gốc dữ liệu |
| đầu ra của một app làm kênh | app đó | `workspaces/` trong repo của app (Workspaces_169) |
| hợp đồng, đánh giá, mật khẩu hệ thống của một công ty | công ty đó | `Workspace\Company\<Tổ chức>\_Profile\` (Profile_170) |
| script nhiều case của một repo cùng chạy | repo đó | `scripts/` ở gốc repo (Scripts_128) |
| cùng một script nhiều repo chạy | nhiều repo | script của một skill trên HS, `zemory sync` cài vào từng repo |

Thứ tự áp: luật khối chọn KHỐI, luật bản chất (luật 2) chọn chỗ TRONG khối. Trong một repo, gốc repo là cấp chung và các thư mục cố
định của nó (`scripts/` · `queries/` · `config/` · `data/`) là chỗ dùng chung: không thêm `_` bên trong repo. Một ngoại lệ, vì công cụ
ép: ssh đọc mọi khoá từ một thư mục, nên khoá ssh ở lại `_ConfigVault\ssh\` dù mở máy chủ của tổ chức nào (README của két ghi khoá
nào thuộc tổ chức nào).

### Do AI sinh — tính chất, không phải nơi chốn

"Do AI sinh" mô tả một món; nó không bao giờ là một nhà. Không có thư mục `AI\` ở cấp ổ hay trong `Media\` để gom ảnh AI. Món do
AI sinh đi theo mục đích và khối dùng nó, theo đúng chuỗi câu hỏi như mọi món khác: ảnh làm avatar ⇒ `Documents\Profile\Avatar\` ·
ảnh mẫu cho một thiết kế ⇒ trong dự án thiết kế đó · ảnh hài, ảnh giải trí sưu tầm ⇒ `Media\Image\<chủ đề>\` · ảnh app render ⇒
`workspaces/` của app đó. Chỗ nào cần tách bản AI khỏi bản thường thì thêm MỘT cấp con tuỳ chọn `AI\` ngay tại chỗ đó
(`Media\Image\Funny\AI\` · `Documents\Profile\Avatar\AI\`), viết cùng một tên ở mọi nơi. Phép thử: món do AI sinh có đúng một
chỗ, theo khối dùng nó; `AI\` chỉ xuất hiện như cấp con.

## Cấp ổ — một chuỗi câu hỏi, đáp án đúng đầu tiên thắng

Hỏi theo đúng thứ tự này; món vào bước đầu tiên đúng.

| bước | sự thật | đặt ở |
|---|---|---|
| 0 | chưa xếp: gom từ bất kỳ đâu về, đang chờ xếp | `Downloads\` (Downloads_168) |
| 1 | do công cụ khôi phục tạo ra | `Recovery\` (Recovery_153) |
| 2 | bản sao, bản gốc còn ở nơi khác | `Backup\` (Backup_165) |
| 3 | dự án hoặc phiên bản cũ ngừng dùng, giữ làm bản duy nhất (kiến thức học xong đi bước 10, không vào đây) | `Archive\` (Archive_166) |
| 4 | file model AI | `_Models\` (Models_167) |
| 5 | cấu hình hoặc khoá mà CHƯƠNG TRÌNH hay AGENT tự đọc | `_ConfigVault\<công cụ>\` (ConfigVault_151) |
| 6 | chương trình — bộ cài, bản cài, dữ liệu riêng — kể cả game, launcher, công cụ game, và thư mục đệm đầu ra của chương trình | `Software\` (Software_147) |
| 7 | code hoặc repo, hoặc bất cứ thứ gì thuộc về MỘT tổ chức — việc và giấy tờ của nó | `Workspace\` (Workspace_143) |
| 8 | file lưu game, ảnh/clip quay màn hình game, clip game sưu tầm, hướng dẫn chơi | `Game\` (Game_164) |
| 9 | tài liệu ĐANG học: bài giảng, khoá học tải về để nghiên cứu, ghi chú | `Study\` (Study_160) |
| 10 | kiến thức học xong giữ để tra | `Library\` (Library_163) |
| 11 | ảnh gom để dùng cho hồ sơ của chính chủ máy (avatar) | `Documents\Profile\Avatar\` (Documents_152) |
| 12 | ảnh hoặc video quay NGƯỜI bằng máy ảnh của chủ máy hay của gia đình | `Memories\` (Memories_161) |
| 13 | giấy tờ, hồ sơ mà NGƯỜI đọc, không thuộc riêng tổ chức nào | `Documents\` (Documents_152) |
| 14 | còn lại: giải trí sưu tầm | `Media\` (Media_162) |

Ví dụ giải:

| món | bước đúng đầu tiên | chỗ |
|---|---|---|
| video khoá học tải về để học | 9 | `Study\Self\<Mảng>\` |
| khoá đó sau khi học xong, giữ để tra | 10 | `Library\<Mảng>\` |
| thư mục save của một game | 8 | `Game\Saves\<Game>\` |
| trình quản lý mod | 6 | `Software\Game\<Công cụ>\` |
| thư mục ghi clip của phần mềm quay màn hình, đặt trên SSD nhanh | 6 (đệm đầu ra) | `Software\Screen_Record\<Ứng dụng>\Data\` — xếp xong mới về nhà |
| clip một lượt chơi game, đã xếp | 8 | `Game\Media\<Game>\` |
| thư viện clone từ mạng về để học | 7 | `Workspace\External\<repo>\` (Study trỏ qua) |
| danh sách mật khẩu tài khoản web của chủ máy | 13 | `Documents\Profile\Secret\` |
| khoá SSH | 5 | `_ConfigVault\ssh\` |
| hợp đồng với công ty chủ máy làm việc | 7 | `Workspace\Company\<Tổ chức>\_Profile\` |
| file thiết kế làm cho một công ty cũ | 7 | `Workspace\Company\<Tổ chức>\<thư mục công việc>\` |

## Cây

Bốn nhánh dưới đây là cách NHÌN cây, không phải câu hỏi để xếp: "tự làm · sưu tầm · cài đặt · cất giữ" không xếp được file save
game hay khoá học tải về. Xếp luôn dùng chuỗi câu hỏi ở trên.

```
<gốc dữ liệu>\
├── Downloads\        chưa xếp — tầng thô mọi thứ đi qua (Downloads_168)
├── _ConfigVault\     nơi chứa dùng chung của máy: cấu hình và khoá chương trình đọc (ConfigVault_151)
├── _Models\          nơi chứa dùng chung của máy: file model AI (Models_167)
│  ① chủ máy tự làm
├── Workspace\        code, repo, việc cho tổ chức (Workspace_143) → Struc_Region_Workspace
├── Study\            tài liệu đang học (Study_160)
├── Memories\         ảnh và video quay người (Memories_161)
├── Documents\        giấy tờ của chủ máy dùng cho mọi tổ chức: Profile · Family (Documents_152)
│  ② sưu tầm
├── Game\             save, ảnh/clip, hướng dẫn — không bao giờ là chương trình (Game_164)
├── Library\          kiến thức giữ để tra (Library_163)
├── Media\            giải trí sưu tầm (Media_162)
│  ③ cài đặt
├── Software\<Nhóm>\[<Hãng>\]<Ứng dụng>\{Setup,App,Data}   mọi chương trình, kể cả game (Software_147–150)
│  ④ cất giữ
├── Backup\  Archive\  Recovery\                          (Backup_165 · Archive_166 · Recovery_153)
```

Thư mục cấp 1 bắt đầu bằng `_` là nơi chứa dùng chung của cả máy (nhiều chương trình và repo trỏ vào, chủ máy không làm việc
trong đó); có hai nơi, `_ConfigVault\` và `_Models\`.

## Một cây logic, nhiều nơi lưu — gợi ý, không bắt buộc

Cây là MỘT cây logic, máy có bao nhiêu ổ cũng vậy. Mỗi khối dữ liệu nằm thật ở đúng một nơi lưu; mọi nơi khác cần nó chỉ có một
điểm nối. Chủ máy có một ổ thì không cần phần này, và được nối bất kỳ thư mục nào sang bất kỳ ổ nào.

Năm luật, khi cây chia ra nhiều nơi lưu:
1. Mỗi thư mục thuộc đúng một trong ba loại: thật ở nơi này · thật ở nơi khác (ở đây chỉ là điểm nối) · tách nhỏ (các thư mục con
   nằm thật ở những nơi khác nhau).
2. Không nối một khối khi có thư mục con của nó nằm nơi khác; tách nhỏ khối đó rồi nối từng con.
3. Thư mục tách nhỏ không chứa file lẻ; chỉ có một `_README.md` ở gốc của nó, mỗi nơi lưu một bản, ghi phần nào nằm ở đâu.
4. Công cụ quét cây đi qua mọi nơi lưu nhưng bỏ qua mọi điểm nối, để mỗi file chỉ được thấy một lần.
5. Global Memory giải đường dẫn về vị trí thật trước khi ghi.

| nơi lưu | cách nối |
|---|---|
| ổ trong máy | junction trên Windows (`mklink /J`), symlink trên Linux; không dùng bind mount |
| ổ ngoài | gán chữ ổ cố định, hoặc gắn ổ vào một thư mục |
| NAS | symlink tới đường mạng (`mklink /D`); junction không trỏ được tới thư mục chia sẻ trên mạng |
| ổ đám mây | mount vào một điểm cố định; database đang chạy KHÔNG BAO GIỜ nằm ở phía đám mây |

Ví dụ — ổ dữ liệu chính `D:` và một SSD nhanh `H:` giữ model, save game và ổ ảo của WSL:

```
D:\                                        H:\
├── _Models\  ──────── junction ─────────► ├── _Models\         (thật ở đây)
├── Game\  ─────────── junction ─────────► ├── Game\            (thật ở đây)
├── Software\  (tách nhỏ)                  └── Software\  (tách nhỏ)
│   ├── _README.md                             ├── _README.md
│   ├── Dev\ …          (thật ở D:)            └── System\Microsoft\WSL\  (tách nhỏ)
│   └── System\Microsoft\WSL\  (tách nhỏ)          ├── _README.md
│       ├── _README.md                             └── Data\        (thật ở đây: Ubuntu\ext4.vhdx)
│       ├── Setup\  App\  (thật ở D:)
│       └── Data\  ──── junction ──────────► H:\Software\System\Microsoft\WSL\Data\
└── Workspace\ …        (thật ở D:)
```

Mỗi thư mục tách nhỏ có một `_README.md` ở cả hai ổ (luật 3); phép kiểm đọc file đó là dấu hiệu của phần mềm tách nhỏ và không đòi
`H:\…\WSL\` phải có `Setup\` và `App\`. Vai thường gặp của các ổ: ổ dữ liệu chính giữ cả cây · ổ dữ liệu thứ hai giữ các khối dời
khỏi ổ chính (media lớn, archive) · SSD nhanh giữ thứ cần tốc độ (game, model, ổ ảo) và có bản sao lưu ở nơi khác · ổ hệ thống và
ổ đám mây không thuộc cây.

## Ổ hệ thống

`C:\` chứa hệ điều hành và chỉ những gì phần mềm ép đặt ở đó: `C:\Program Files\WSL` · `C:\Program Files\Docker` (thư mục phần mềm
trong `Software\` vẫn giữ `Setup\` và `Data\`) · `%USERPROFILE%\.wslconfig` · thư mục nhà của công cụ (`.claude` · `.codex` ·
`.docker` · `.ssh` · `.cache` · `.lmstudio` · `%APPDATA%\Code`) · `%USERPROFILE%\.zemory\location.json`. `HOME` giữ mặc định của hệ
điều hành; không bao giờ trỏ vào một thư mục của ổ dữ liệu. Thư mục nhà của công cụ phình to thì dời bằng thiết lập của chính công
cụ hoặc bằng junction; khoá và thiết lập vào `_ConfigVault\<công cụ>\` (ConfigVault_151, có cả các bước gỡ một `HOME` đang trỏ vào
ổ dữ liệu).

## Dựng hoặc sửa một cấu trúc — quy trình

Ai thêm một slot, sửa một slot hay dựng một cây mới thì làm đủ các bước, theo thứ tự:
1. Viết MỘT câu hỏi xếp của cấp đó, và các đáp án (các thư mục con).
2. Kiểm các đáp án loại trừ nhau và phủ hết.
3. Biến mỗi đáp án thành một sự thật kiểm được; đáp án nào là ý định thì viết lại.
4. Chỗ nào nhiều sự thật có thể cùng đúng thì ghi thứ tự của chúng; chép đúng thứ tự đó vào mọi slot liên quan.
5. Ghi luật dời cho mỗi món đổi trạng thái, kèm tên công cụ làm việc đó.
6. Thử cấu trúc trên đồ THẬT của mọi ổ trước khi ghi: liệt kê từng món và chỗ nó ra. Món ra 0 hoặc từ 2 chỗ trở lên ⇒ sửa câu hỏi,
   không nắn món.
7. Ghi vào mỗi slot câu hỏi của nó và danh sách "không thuộc đây ⇒ đi đâu"; phần nào máy kiểm được thì đưa vào `zemory conform`.

## Luật

- Gốc dữ liệu không có file lẻ. Thứ Windows tự đặt ở đó thì để yên: `System Volume Information`, `$RECYCLE.BIN`, `pagefile.sys`,
  `swapfile.sys`, `hiberfil.sys`, `DumpStack.log`, `DumpStack.log.tmp`.
- `_` ở gốc chỉ đánh dấu hai nơi chứa dùng chung.
- `Downloads\` là chỗ duy nhất cho đồ chưa xếp; không thư mục nào khác giữ hộp chờ.
- Đo chỗ trống của ổ trước mỗi việc ghi lớn (cài đặt, dựng image, chép dữ liệu) và sau khi làm xong.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` báo đỏ: file lẻ ở gốc (`loose-file`) · thư mục cấp 1 không có slot (`unknown-folder`) ·
repo ngoài `Workspace\` (`repo-outside-workspace`) · nhóm trong `Software\` ngoài Software_148 hoặc phần trong `Game\` ngoài
Game_164 (`unknown-value`) · phần mềm thiếu `Setup\`, `App\` hoặc `Data\` (`program-incomplete`) · dự án học không có thư mục
`Study\` tương ứng (`study-unmatched`). Lệnh đi tiếp vào `Workspace\` và từng tổ chức. Chuỗi câu hỏi của luật 1 và năm luật của cây
chia nhiều nơi lưu do chủ máy tự soát ở chỗ chưa có phép kiểm.
