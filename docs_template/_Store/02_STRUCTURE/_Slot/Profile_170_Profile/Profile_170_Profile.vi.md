---
version: 2
lang: vi
---
# Profile_170_Profile profile — giấy tờ của chủ máy với một tổ chức

## Vai trò

`Workspace\Company\<Tổ chức>\_Profile\` chứa giấy tờ gắn chủ máy với CHÍNH tổ chức này, theo luật khối của `Struc_Disk_Data` (một thứ
nằm ở khối nhỏ nhất chứa mọi thứ dùng nó): hợp đồng lao động, báo cáo thử việc và đánh giá hằng năm, biên bản bàn giao, hồ sơ
công ty, mật khẩu các hệ thống của tổ chức. Đem sang chỗ khác là lạc; ở đây chúng nằm cùng mọi thứ khác của tổ chức và đi theo nó.

## Bên trong

Tuỳ nhu cầu, ví dụ:

```
_Profile\
├── Contract\      hợp đồng lao động, phụ lục
├── Review\        báo cáo thử việc, đánh giá hằng năm
├── Handover\      biên bản bàn giao khi vào hoặc nghỉ
├── Brand\         hồ sơ công ty, quy chuẩn nhận diện (tệp logo nằm ở _Design\Assets\Logo\)
└── Secret\        mật khẩu các hệ thống của tổ chức mà người đọc
```

## Luật

- Chỉ giấy tờ gắn với MỘT tổ chức này. Giấy tờ dùng cho mọi tổ chức (CV, định danh, avatar, bí mật cá nhân) ⇒ `Documents\Profile\`.
- Không phải repo: không `.git\`, không ráp HS vào.
- `Secret\` theo luật cấm đồng bộ của `_ConfigVault`: không bao giờ vào git; `_Profile\` bị loại khỏi mọi thư mục đồng bộ của tổ chức
  (thêm vào `.stignore` của thư mục Syncthing chia sẻ).
- Khoá và thiết lập mà CHƯƠNG TRÌNH đọc (khoá ssh, token) không phải giấy tờ ⇒ `_ConfigVault\` (ssh đọc một thư mục cho mọi máy).

## Khuôn tên

`_Profile` viết đúng như vậy, mỗi tổ chức một thư mục.

## Phép kiểm

`zemory conform --layout <ổ>\Workspace\Company\<Tổ chức>` nhận `_Profile\` ở cấp tổ chức.
