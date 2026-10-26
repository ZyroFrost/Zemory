---
version: 9
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

## Bên trong

```
_ConfigVault\
├── README.md          sổ DUY NHẤT của két (xem dưới)
├── ssh\               config · khoá · known_hosts — để phẳng, vì ssh đọc một thư mục
├── git\  vpn\  zemory\
├── sql\credentials\   login SQL mà chương trình và agent dùng: MỘT logins.env, mỗi máy chủ một khối, mỗi login hai dòng
└── <công cụ>\         một hai tệp thì để thẳng; nhiều loại ⇒ configs\ · credentials\ · cache\
```

- Két là nhà DUY NHẤT của mọi thông tin đăng nhập vào một hệ thống mà chương trình hay agent dùng, mọi repo trên máy dùng chung
  (`Rule_Gate_21_WhatEntersGit` bước 3a). Config của repo ghi tên login và máy (`logcentral_reader` trên `db-main`), không ghi
  giá trị; script đọc lúc chạy và không in ra. Bí mật riêng của sản phẩm một repo vẫn ở `data/secrets/` của repo đó.
- Một mục đăng nhập chỉ chứa bí mật; ai giữ, được làm gì, repo nào dùng thì ghi ở bảng của công cụ đó trong README.

- `configs\` — thiết lập (đọc được, không bí mật) · `credentials\` — khoá, token, mật khẩu · `cache\` — thứ công cụ tự dựng lại, kể cả
  log của nó; xoá đi không mất gì.
- `ssh\` để phẳng: ssh đọc `config`, các khoá và `known_hosts` từ một thư mục. Vì vậy khoá ssh ở lại đây kể cả khi nó mở máy chủ
  của MỘT tổ chức — ngoại lệ duy nhất của luật khối trong `Struc_Disk_Data`; README ghi khoá nào thuộc tổ chức nào.
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
- Login SQL nằm trong MỘT tệp `sql\credentials\logins.env`, không tách tệp theo máy chủ: mỗi MÁY CHỦ THẬT một khối `#`, trong đó
  mỗi login hai dòng `<MÁY>_<TÊN>_ID=<login>` (ghi sẵn) và `<MÁY>_<TÊN>_PASS=`. `<MÁY>` là tên máy, `<TÊN>` là tên login, cả hai viết
  hoa, dấu chấm và gạch ngang thành gạch dưới (`DB_MAIN_LOGCENTRAL_READER_ID=logcentral_reader` · `DB_MAIN_LOGCENTRAL_READER_PASS=`),
  nên một tên login ở hai máy vẫn là hai khoá. Ngoài ra chỉ có chú thích `#`. Người dán mật khẩu vào sau dấu `=` của dòng `_PASS`.
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
