---
version: 16
lang: vi
---
# ConfigVault_151_ConfigVault configvault — két chứa thiết lập và khoá công cụ của cả máy

## Vai trò

`<gốc dữ liệu>\_ConfigVault\` là bước 5 của chuỗi câu hỏi cấp ổ (`Struc_Disk_Data`) và là nơi chứa dùng chung của cả máy: thiết lập và
khoá mà CHƯƠNG TRÌNH hoặc AGENT tự đọc. Mọi chương trình và repo cần khoá hay thiết lập đều trỏ vào đây. Mỗi công cụ một thư mục
`_ConfigVault\<công cụ>\`, để máy mới chỉ cần mang đúng thư mục này, và một luật loại trừ giữ mọi bí mật ngoài git, ngoài đồng bộ và
ngoài sao lưu đám mây.

Sự thật tách nó với `Documents\`: AI ĐỌC. Chương trình hoặc agent tự đọc ⇒ ở đây. Người mở ra đọc (danh sách mật khẩu web, cụm từ ví)
⇒ `Documents\Profile\Secret\`.

## Hai cấp

Luật khối của `Struc_Disk_Data` chọn KHỐI trước: bí mật của một tổ chức thuộc khối tổ chức đó, thiết lập công cụ của máy hay chủ máy thuộc
máy. Vì vậy két có hai cấp, CÙNG một cây bên trong, cộng với cấp repo:

| Cấp | Chỗ | Chứa |
|---|---|---|
| máy | `<gốc dữ liệu>\_ConfigVault\` | công cụ của chính máy và chủ máy: `zemory\` · `git\` (danh tính cá nhân) · cache công cụ · `ssh\config` gốc (mỗi tổ chức một dòng `Include`) · `known_hosts` · khoá ssh cá nhân |
| tổ chức | `Workspace\Company\<Tổ chức>\_ConfigVault\` | mọi bí mật các repo và app của tổ chức dùng chung: `sql\` · `api\` · `mail\` · `windows\` · `tls\` · `certs\<repo>\` · `vpn\` · `ssh\` (khoá + `config` các máy của tổ chức) |
| repo | `.env` ở gốc repo (`Root_093_Env`) | bí mật dạng chữ của riêng repo đó |

- Máy chỉ thuộc MỘT tổ chức (máy chủ, VM của tổ chức đó) có một két ở gốc dữ liệu (`E:\_ConfigVault` · Linux `~/data/_ConfigVault`): ở đó
  khối máy CHÍNH là khối tổ chức.
- Tên luôn là `_ConfigVault`; đường dẫn nói là của ai (như `_Profile` trong khối tổ chức). Không bao giờ `_ConfigVault_<Tổ chức>`.
- Tìm két, một luật cho mọi máy: `CONFIGVAULT_DIR` nếu đặt, không thì `_ConfigVault` gần nhất có bí mật (`sql\` · `api\` · `mail\`) đi NGƯỢC
  từ repo lên, không thì gốc dữ liệu Linux. Két máy không có thư mục bí mật nên bị bỏ qua; nó ở lại gốc ổ vì launcher Python suy ra gốc
  dữ liệu từ nó.
- Bản thân `Workspace\Company\<Tổ chức>\` không bao giờ là thư mục đồng bộ (chỉ từng repo bên trong được là): két tổ chức không bao giờ đi
  qua công cụ đồng bộ, git hay thư mục cloud; sang máy khác bằng `scp`.
- Mỗi két có README riêng: README két máy ghi công cụ của máy, README két tổ chức ghi login, app, hộp thư, máy và mục nào chở tới máy nào.

## Bên trong

```
_ConfigVault\
├── README.md          sổ DUY NHẤT của két (xem dưới)
├── ssh\               cấp máy: config gốc (Include theo tổ chức) · known_hosts · khoá cá nhân;
│                      cấp tổ chức: khoá + config các máy của tổ chức đó
├── git\  vpn\  zemory\
├── sql\configs\       connections.json: sổ kết nối CHUNG của máy (máy · CSDL · địa chỉ · driver · tài khoản MÁY NÀY dùng cho CSDL
│                      đó) — không bí mật, ngoài git vì có địa chỉ nội bộ
├── sql\credentials\   login SQL mà chương trình và agent dùng: MỘT logins.env, mỗi máy chủ một khối, mỗi login hai dòng
├── api\credentials\   bí mật của app · API · webhook: MỘT services.env
├── mail\configs\      mailboxes.json · recipients.json — sổ mail của mọi repo (bên dưới), dữ liệu liên lạc, không bí mật
├── mail\credentials\  mật khẩu các hộp thư gửi: MỘT smtp.env
├── windows\credentials\  tài khoản Windows của các máy (credential của bộ lập lịch hay dịch vụ chạy dưới tên nó): MỘT logins.env
├── tls\               chứng chỉ nhiều repo hay nhiều máy cùng dùng
├── certs\<repo>\      bí mật dạng FILE của riêng một repo (chứng chỉ · khoá .pvk / .pem · file token)
└── <công cụ>\         một hai tệp thì để thẳng; nhiều loại ⇒ configs\ · credentials\ · cache\
```

- Luật đứng sau: thứ nhiều repo hay app cùng dùng có MỘT nhà chung và MỘT tên; chỉ thứ thuộc một repo mới ở lại repo đó. CODE dùng
  chung có một nguồn ở HS và tới từng repo bằng `zemory sync`; DỮ LIỆU, THIẾT LẬP và BÍ MẬT dùng chung nằm ở đây, mọi repo đọc tại chỗ.
- Két là nhà DUY NHẤT của mọi bí mật dạng env mà chương trình hay agent dùng — login SQL, bí mật app và API, tài khoản mail, chứng
  chỉ dùng chung — và của sổ kết nối chung, cho mọi repo và app trên máy (`Rule_Gate_21_WhatEntersGit` bước 3a). Không repo, không
  app nào giữ bản riêng, và không repo nào giữ chuỗi kết nối hay biến riêng cho nó (`<HỆ>_CONN` bỏ): code hỏi `vault_conn.py` (skill `Skill_Task_VmAutomation`)
  `conn(<máy>, <csdl>)`, bộ đọc dựng từ thư mục này, không in bí mật. Ở lại repo chỉ có `.env` (`Root_093_Env`, chỗ riêng DUY NHẤT; file bí mật riêng ⇒ `certs\<repo>\`): bí mật nghiệp vụ một phòng
  dùng riêng (mật khẩu file của phòng đó) hoặc khoá chỉ sản phẩm của repo đó dùng. App giữ bản phía máy chủ ở dạng niêm (systemd
  credential trên máy Linux) là giữ BẢN SAO: nguồn là két.
- MỘT két chủ: máy trạm của người vận hành. Máy chạy tự động hoá giữ bản sao chỉ các mục nó cần, CÙNG cây và cùng tên khoá; khác
  nhau ở nội dung (sổ của máy trạm ghi tài khoản agent chỉ đọc, sổ của máy chạy task ghi tài khoản task). Bảng trong README ghi
  mục nào chở lên máy nào; bản sao chở bằng ssh (`scp`), không qua công cụ đồng bộ. Đổi mật khẩu = đổi ở két chủ rồi chở lại lên
  các máy README ghi.
- Sổ mail, `mail\configs\`, là nhà DUY NHẤT của mọi hộp thư và mọi người nhận của mọi repo — không repo nào giữ danh sách mail,
  danh bạ hay mật khẩu hộp thư riêng. Hai file, đọc tại chỗ (dữ liệu liên lạc: ngoài git và ngoài đồng bộ, như phần còn lại
  của két):
  - `mailboxes.json` — các hộp thư gửi hoặc của một người (support · hộp thư đứng tên nhân viên): địa chỉ · người giữ · phòng ban ·
    chức vụ · dùng để làm gì · tên khoá mật khẩu của nó trong `mail\credentials\smtp.env`.
  - `recipients.json` — mọi nơi nhận mail: từng cửa hàng và từng người nhận của các task, mỗi dòng có địa chỉ · tên · phòng ban ·
    chức vụ · mã cửa hàng nếu là cửa hàng · các nhóm nó thuộc.
  - Task gọi hộp thư và nhóm theo khoá; không bao giờ chép địa chỉ hay mật khẩu vào repo. Thêm hoặc sửa hộp thư hay người nhận đi
    qua phiên của repo giữ giá trị của cụm (tổng quản).
- Một mục đăng nhập chỉ chứa bí mật; ai giữ, được làm gì, repo nào dùng thì ghi ở bảng của công cụ đó trong README.

- `configs\` — thiết lập (đọc được, không bí mật) · `credentials\` — khoá, token, mật khẩu · `cache\` — thứ công cụ tự dựng lại, kể cả
  log của nó; xoá đi không mất gì.
- `ssh\`: cấp máy giữ `config` gốc mà ssh đọc và `known_hosts`; máy và khoá của mỗi tổ chức nằm trong két tổ chức đó, kéo vào bằng
  một dòng `Include <két tổ chức>/ssh/config` (`IdentityFile` đọc khoá ở đâu cũng được). Người gọi chỉ dùng alias.
- `location.json` của zemory được đọc ở `%USERPROFILE%\.zemory\location.json`; thư mục đó được là junction trỏ vào
  `_ConfigVault\zemory\`. File chỉ trỏ tới thư mục Global Memory và không chứa bí mật.

## Khuôn tên

- `_ConfigVault` viết đúng như vậy. Thư mục công cụ viết thường, đúng tên lệnh của nó: `git` · `ssh` · `vpn` · `rclone`.
- Alias ssh đặt theo VAI của máy: `<tổ chức>-<vai>` (`acme-dev` · `acme-central` · `acme-log`). Nơi gọi chỉ dùng alias, không bao giờ
  ghi tên file khoá.
- File khoá đặt theo MÁY THẬT: `id_<loại>_<tên máy viết thường>` (`id_ed25519_server-dev` · `id_ed25519_acme-data`). Tên máy phải đo,
  không nhớ: `ssh <alias> hostname`. Máy đổi tên ⇒ đổi tên khoá, alias giữ nguyên.
- Tài khoản của NGƯỜI dùng dấu chấm: `tên.họ` (`jane.doe`). Tài khoản chương trình hay agent dùng GẠCH DƯỚI,
  `<phân hệ>_<vai>`: `svc_agent` trên máy chủ · `datawarehouse_agent` · `erp_agent` · `logcentral_reader`. Dấu chấm phải bọc trong
  mọi câu lệnh (`[ ]` trên SQL Server, `" "` trên PostgreSQL) và `adduser` của Debian/Ubuntu từ chối nó; gạch dưới chạy mọi nơi
  không phải bọc. Tên file dùng gạch dưới hoặc gạch ngang.
- MỘT khuôn cho mọi khoá trong két: `<MÁY>_<CSDL>_<TÀI-KHOẢN>_<LOẠI>`, viết hoa. Phân khúc nối bằng `_`; chữ trong cùng một phân khúc
  nối bằng `-` (dấu chấm hay gạch dưới bên trong tên thành `-`), nên một khoá tách ngược ra được bốn câu trả lời:
  - `MÁY` — tên máy THẬT, đo (`SELECT SERVERPROPERTY('MachineName')` · `hostname`), không nhớ; dịch vụ đám mây thì là tên dịch vụ
    (`M365` · `SHOPAPI` · `SMTP-OFFICE365`).
  - `CSDL` — tên cơ sở dữ liệu thật; dịch vụ không phải SQL thì là tài nguyên trong dịch vụ (tenant · shop · app).
  - `TÀI-KHOẢN` — login, app hay hộp thư (`jane.doe` ⇒ `JANE-DOE` · `logcentral_reader` ⇒ `LOGCENTRAL-READER`).
  - `LOẠI` — `ID` (tên tài khoản, ghi sẵn) · `PASS` · `TOKEN` · `SECRET` · `TENANT`.
  Ví dụ: `DB-MAIN_ACME-WAREHOUSE_LOGCENTRAL-READER_ID` · `DB-MAIN_ACME-WAREHOUSE_LOGCENTRAL-READER_PASS` ·
  `POS-DB02_POSDATA_JANE-DOE_PASS` · `M365_ACME-COM_SYNC-APP_SECRET`. Một login mở hai CSDL là hai khoá. Tài khoản Windows
  của một máy lấy `WINDOWS` làm phân khúc thứ hai: `DB-MAIN_WINDOWS_JANE-DOE_PASS`. Khoá hộp thư đọc từ địa chỉ:
  phần trước `@` là tài khoản, tên miền là tài nguyên ⇒ `SMTP-OFFICE365_<DOMAIN>_<MAILBOX>_PASS`.
- Khoá két chỉ bộ đọc két đọc, không bao giờ thành biến môi trường, nên dấu `-` trong khoá an toàn. Tên viết đủ, không viết tắt
  (`DATA-WAREHOUSE`, không `DW`); tên do hệ thống đặt (CSDL, máy) giữ đúng như hệ thống viết.
- Sổ `sql\configs\connections.json` đặt khoá mỗi mục là `<MÁY>/<CSDL>` (tên thật) với `address` · `driver` · `options` · `account`
  (tài khoản máy này dùng mặc định cho CSDL đó).
- Mỗi tệp có một khối `#` cho mỗi MÁY hay DỊCH VỤ THẬT (`# ===== <máy> (<địa chỉ>) — <engine> · <phục vụ gì> =====`), một dòng
  `# <tài khoản> — <được làm gì>` trước mỗi tài khoản, rồi các dòng của nó. Ngoài ra chỉ có chú thích `#`. Người dán bí mật vào sau
  dấu `=`.
- Tài khoản agent trên máy chủ: MỘT tài khoản chung `svc_agent`, không đặt theo hãng; mỗi agent đăng nhập bằng khoá ssh riêng, chú
  thích khoá là tên agent, để log ssh của máy chủ biết agent nào vào; gỡ một agent = gỡ khoá của nó.

## Luật

- Chỉ thiết lập và khoá. Log của công cụ vào `cache\` của nó; bản sao lưu (`*.bak`, `*.old`, `*.pre-*`) thì xoá, không giữ ở đây.
  Công cụ tự ghi log ở một chỗ cố định ngoài `cache\` thì để nguyên.
- Khoá không còn `Host` nào dùng thì gỡ, và gỡ nửa công khai của nó khỏi các máy từng giữ.
- MỘT `README.md` ở gốc két, không README nào khác bên trong: với mỗi công cụ, chứa gì · nối bằng gì (biến môi trường hay junction) ·
  các bước dựng lại trên máy mới; với ssh, bảng alias · máy thật · địa chỉ · tài khoản đăng nhập · khoá · shell. Không ghi lịch sử hay ngày tháng —
  lịch sử ở Global Memory.
- Nội dung `_ConfigVault\` KHÔNG BAO GIỜ vào git (kể cả repo riêng tư), KHÔNG nằm trong thư mục đồng bộ (Syncthing) hay thư mục sao
  lưu đám mây (Drive). Mang sang máy khác bằng tay, qua đường an toàn.

## Các bước — dời thiết lập của một công cụ về đây

1. Tạo `_ConfigVault\<công cụ>\`.
2. Công cụ có thiết lập hoặc biến môi trường cho chỗ đặt cấu hình (`GIT_CONFIG_GLOBAL`, `RCLONE_CONFIG`, `NPM_CONFIG_USERCONFIG`) ⇒
   trỏ nó vào thư mục mới rồi dời tệp. Không có ⇒ dời tệp rồi thay chỗ cũ bằng junction (thư mục) hoặc symlink (tệp):
   `mklink /J "%USERPROFILE%\.ssh" "D:\_ConfigVault\ssh"`.
3. Chạy công cụ một lần, kiểm nó đọc được thiết lập; thêm dòng của công cụ vào `README.md`.

## Các bước — gỡ một HOME đang trỏ vào ổ dữ liệu

Làm trong MỘT đợt, vì đổi `HOME` là đổi chỗ đọc của mọi công cụ cùng lúc:
1. Liệt kê các tệp của công cụ trong thư mục `HOME` hiện tại.
2. Thiết lập và khoá ⇒ dời từng thứ vào `_ConfigVault\<công cụ>\` theo các bước trên.
3. Cache và trạng thái công cụ tự dựng lại ⇒ để công cụ dựng lại dưới thư mục nhà mặc định, hoặc dời cái lớn vào `Data\` của chương
   trình đó.
4. Gỡ biến `HOME` đã đặt (biến môi trường của tài khoản), đăng xuất rồi đăng nhập lại, chạy từng công cụ đã liệt kê một lần.
5. Thư mục `HOME` cũ giờ không còn tệp của công cụ; dời nó về chỗ của nó trong cây, hoặc xoá khi chủ máy đồng ý.

## Không thuộc đây ⇒ đi đâu

Bản cài chương trình ⇒ `Software\` · file model ⇒ `_Models\` · dữ liệu riêng của chương trình (database, workspace) ⇒ `Data\` của chương
trình đó · bí mật người đọc ⇒ `Documents\Profile\Secret\` · repo ⇒ `Workspace\`.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` nhận `_ConfigVault` và báo đỏ repo nằm trong nó (`repo-outside-workspace`). Chưa có phép kiểm
máy cho bí mật lọt vào git hay thư mục đồng bộ, hay cho khuôn tên ở trên.
