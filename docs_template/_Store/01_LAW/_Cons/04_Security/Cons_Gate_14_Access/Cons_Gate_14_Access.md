---
id: Cons_14
name: access
version: 4
kind: content
code: 04_Security
frame: true
---
# Cons_Gate_14_Access — Access and security

## What
Every repo states in the `Cons.md` of this frame who may use the product, at which layer rights are guarded, what happens when no
right is declared (block or allow), the secrets the system uses (NAMES only, never values), the personal data it keeps and how it
is protected, and whether the product is open to a network or runs only on the machine. Personal data of the people who use it (identity ·
contact · financial) is never stored or sent in clear text.

## When
- The product gets people who sign in, rights, secrets or personal data, or opens to a network.
- The agent adds a feature that writes, or a field that holds personal data.

## Do
1. Fill the sections of `Cons.md`: who uses it · guarded at · secrets (names) · personal data · network scope.
2. Secrets: one row per secret: its NAME (`Name`), the file-name pattern it lives in (`File`, for example `*.sec`), its use;
   the value lives in `data/secrets/` (`Rule_Gate_21_WhatEntersGit`).
3. Personal data: which fields · encrypted with what · where the key lives. Keeps none ⇒ write `none` with the reason.
4. Nobody signs in and no secrets ⇒ `status: n/a` with the reason.

## Example
- Situation: an internal app with viewers and editors fills the `Cons.md` of this frame.
- ✗ Wrong: write only "role-based rights"; the agent adds a new write feature and hides the button from viewers, but the server
  still accepts writes from them; customer phone numbers sit in clear text in a table.
- ✓ Right: "Guarded at the server, block by default: a new write feature blocks viewers until it is declared allowed. Hiding a
  button is not security. Personal data: `phone` · `email` encrypted with AES-256-GCM, key in the vault, rotated every 90 days."

## Check
- `conform` reds when `Cons.md` is missing, unwritten, or a template mark `<…>` is left.
- The guard reads the `File` column of the secrets table as secret file names (`secretNames`): such a file never enters a
  commit.

## Luật là gì
Mọi repo khai trong `Cons.md` của khung này: ai được dùng sản phẩm, gác quyền ở lớp nào, mặc định khi chưa khai quyền (chặn hay
cho), bí mật hệ dùng (chỉ TÊN, không giá trị), dữ liệu cá nhân repo giữ và cách bảo vệ, và sản phẩm có mở ra mạng hay chỉ chạy
trên máy. Dữ liệu cá nhân của người dùng (định danh · liên lạc · tài chính) không bao giờ lưu hay truyền dạng rõ.

## Khi nào áp
- Sản phẩm có người dùng, quyền, bí mật hay dữ liệu cá nhân, hoặc mở ra mạng.
- Agent thêm một chức năng ghi, hoặc một trường giữ dữ liệu cá nhân.

## Phải làm gì
1. Điền các mục của `Cons.md`: người dùng · gác ở · bí mật (tên) · dữ liệu cá nhân · phạm vi mạng.
2. Bí mật: mỗi bí mật một dòng: TÊN (`Name`), mẫu tên file chứa nó (`File`, ví dụ `*.sec`), công dụng; giá trị nằm ở
   `data/secrets/` (`Rule_Gate_21_WhatEntersGit`).
3. Dữ liệu cá nhân: trường nào · mã hoá bằng gì · khoá ở đâu. Không giữ ⇒ ghi `không có` kèm lý do.
4. Không có người dùng và bí mật nào ⇒ `status: n/a` kèm lý do.

## Ví dụ
- Tình huống: một app nội bộ có người xem và người sửa điền `Cons.md` của khung này.
- ✗ Sai: chỉ ghi "phân quyền theo vai trò"; agent thêm chức năng ghi mới và ẩn nút với người xem, nhưng máy chủ vẫn nhận lệnh ghi
  từ họ; số điện thoại khách nằm dạng rõ trong bảng.
- ✓ Đúng: "Gác ở máy chủ, mặc định chặn: chức năng ghi mới chặn người xem tới khi được khai cho phép. Ẩn nút không tính là bảo mật.
  Dữ liệu cá nhân: `phone` · `email` mã hoá AES-256-GCM, khoá ở két, xoay 90 ngày."

## Máy kiểm
- `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.
- Guard đọc cột `File` của bảng bí mật làm danh sách tên file bí mật (`secretNames`): file đó không bao giờ vào commit.

## Links · Liên kết
- Implements · Thi hành: `Skill_Dev_DbDesign` — how a column is encrypted, the library, key rotation · cách mã hoá cột, thư viện, xoay khoá
- Related · Liên quan: `Rule_Gate_21_WhatEntersGit` — where secret values live · giá trị bí mật nằm đâu
- Related · Liên quan: `Cons_Gate_15_DataLifecycle` — how long personal data is kept · dữ liệu cá nhân giữ bao lâu
