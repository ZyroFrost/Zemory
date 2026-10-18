---
id: Rule_21
aka: 02-21
name: what-enters-git
version: 10
kind: action
code: 03_Safety
---
# Rule_Gate_21_WhatEntersGit — What never enters git

## What
Three things never go into git: real secrets, real data, and heavy binaries without LFS. Tracked files only name an environment
variable; secrets live in one place inside the repo, `data/secrets/`, blocked by `.gitignore`.

## When
- About to stage or commit a file.
- Writing a setting that needs a password, key or connection string.
- Adding data or a heavy binary file to the repo.

## Do
1. Real secrets (password · key · connection string · vault · `.env`) never go into git, encrypted or not.
2. A tracked file (`config/` · `*.example.*` · `.env.example`) names only the environment variable (for example `password_env`),
   never the value.
3. Secrets live in one place inside the repo tree: `data/secrets/` (the encrypted vault in `data/secrets/vault/`), blocked by
   `.gitignore`. The only exception is `.env` at the root, because tools read it there. No secret folder outside the repo tree:
   safety comes from `.gitignore` and the sync scope, not from location. An exception that must sit outside the tree (for example
   a pointer to where data lives) is written in the repo's constitution and holds no secret.
4. To another machine: secrets go through the sync channel, never through git.
5. Real data (sources · extracts · customer data) never goes into git. The repo keeps only small fake samples, enough to open the
   product. Where: the data and sample slots of `02_STRUCTURE`.
6. Heavy binaries (`.pbix` · `.twb` · `.fig` · `.psd` · models) are not committed directly; they follow the LFS lines in
   `.gitattributes`.

## Example
- Situation: a job needs a password to connect to the source database.
- ✗ Wrong: write the connection string with the password into a committed config file; or make a "vault" folder on another drive
  to be safe.
- ✓ Right: the config says only `password_env: DB_SOURCE_PASSWORD`; the real value sits in `data/secrets/`, blocked by
  `.gitignore`; to another machine it goes through the sync channel.

## Check
- The pre-commit check blocks a file with a secret name (`secretNames`) from being staged, also for commits made by a person.
- A hook blocks a write that puts a secret VALUE into a tracked code or setting file (a literal password · a connection string with
  a password · a private key · a cloud access key); the pre-commit check looks for the same patterns in the staged diff. Passed: a
  value read from an environment variable · a placeholder (`<password>` · `changeme`) · `.env` · `data/secrets/` · `.md` text.
  Test files: one reminder per session (fake passwords are normal). Secrets have no flag.

## Luật là gì
Ba thứ không bao giờ vào git: bí mật thật, dữ liệu thật, và nhị phân nặng không qua LFS. File git theo dõi chỉ ghi tên biến môi
trường; bí mật nằm một chỗ trong repo, `data/secrets/`, có `.gitignore` chặn.

## Khi nào áp
- Sắp stage hay commit một file.
- Viết cấu hình cần mật khẩu, khoá hay chuỗi kết nối.
- Thêm dữ liệu hay file nhị phân nặng vào repo.

## Phải làm gì
1. Bí mật thật (mật khẩu · khoá · chuỗi kết nối · két · `.env`) không lên git, kể cả khi đã mã hoá.
2. File git theo dõi (`config/` · `*.example.*` · `.env.example`) chỉ ghi tên biến môi trường (ví dụ `password_env`), không ghi
   giá trị.
3. Bí mật nằm một chỗ trong cây repo: `data/secrets/` (két mã hoá ở `data/secrets/vault/`), có `.gitignore` chặn. Ngoại lệ duy
   nhất là `.env` ở gốc, vì công cụ đọc ở đó. Không tạo thư mục bí mật ngoài cây repo: an toàn đến từ `.gitignore` và phạm vi đồng
   bộ, không phải vị trí. Ngoại lệ buộc nằm ngoài cây (ví dụ con trỏ chỉ nơi đặt dữ liệu) ghi ở hiến pháp của repo và không chứa
   bí mật.
4. Sang máy khác: bí mật đi qua kênh đồng bộ, không qua git.
5. Dữ liệu thật (nguồn · extract · dữ liệu khách) không lên git. Repo chỉ giữ mẫu nhỏ, giả, đủ để mở sản phẩm. Chỗ đặt: slot dữ
   liệu và slot mẫu của `02_STRUCTURE`.
6. Nhị phân nặng (`.pbix` · `.twb` · `.fig` · `.psd` · model) không commit thẳng; đi theo khai LFS trong `.gitattributes`.

## Ví dụ
- Tình huống: một job cần mật khẩu để kết nối cơ sở dữ liệu nguồn.
- ✗ Sai: ghi thẳng chuỗi kết nối có mật khẩu vào file config được commit; hoặc tạo một thư mục "két" ở ổ khác cho chắc.
- ✓ Đúng: config chỉ ghi `password_env: DB_SOURCE_PASSWORD`; giá trị thật nằm ở `data/secrets/`, `.gitignore` chặn; sang máy khác
  đi qua kênh đồng bộ.

## Máy kiểm
- Pre-commit chặn file mang tên bí mật (`secretNames`) lọt vào staging, kể cả commit do người làm.
- Hook chặn lần ghi đưa GIÁ TRỊ bí mật vào file mã hoặc cấu hình git theo dõi (mật khẩu dạng chữ · chuỗi kết nối kèm mật khẩu ·
  khoá riêng · khoá truy cập đám mây); pre-commit soi cùng các mẫu đó trong phần diff đã stage. Cho qua: giá trị đọc từ biến môi
  trường · chỗ điền mẫu (`<password>` · `changeme`) · `.env` · `data/secrets/` · văn bản `.md`. File test: nhắc một lần mỗi phiên
  (mật khẩu giả là bình thường). Nhóm bí mật không có cờ vượt.

## Links · Liên kết
- Repo declares · Repo khai: `Cons_Gate_14_Access` — the repo declares its secrets and access · repo khai bí mật và quyền truy cập
- Implements · Thi hành: `Skill_Harness_SyncPath` — secrets to a second machine · bí mật sang máy thứ hai
