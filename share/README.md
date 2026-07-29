# Zemory Shared Memory Bundle

> ⛔ **2026-07-29 — bundle KHÔNG còn đi qua git.** Repo này là **PUBLIC**
> (`ZyroFrost/Zemory`), nên `.gitignore` nay chặn **mọi** `*.enc` kể cả bundle của chính
> repo; dòng ngoại lệ `!share/global_memory.zemory.enc` (thêm 2026-07-10) đã bị gỡ.
> Luật: **git chứa SOURCE, không chứa DATA.** Gate `no-data-in-git.test.mjs` khoá lại.
>
> Bundle vẫn export/import bình thường — chỉ **chuyển qua kênh khác** (Drive · USB · SMB),
> không commit. Lệnh y hệt bên dưới, chỉ khác nơi đặt file.
>
> ✅ **2026-07-29 — chìa đã XOAY và ra khỏi git.** `share/share.key` nay **gitignored**
> (dòng ngoại lệ `!share/share.key`, thêm `98bc126` 2026-07-01, đã gỡ), chìa mới sinh bằng
> `zemory memory share-key --force` (32 byte random, base64, mode 0600). Kiểm thật: bundle
> tạo bằng chìa MỚI **giải mã được** bằng chìa mới và **bị từ chối** bằng chìa cũ
> (*"unable to authenticate data"*).
>
> ⚠ **Chìa CŨ phải coi như đã lộ vĩnh viễn** — nó nằm trong lịch sử **đã push** của một repo
> PUBLIC, xoá khỏi HEAD không xoá khỏi lịch sử. Không viết lại lịch sử vì **chưa `.enc` nào
> từng vào git** (`git log --all -- 'share/*.enc'` rỗng) ⇒ chìa cũ không mở được gì đang công khai.
>
> 📋 **Việc của bạn:** copy `share/share.key` sang các máy khác qua **Drive / password manager**
> (không qua git, không dán vào chat). Máy nào còn chìa cũ sẽ không import được bundle mới.

Files:

- `global_memory.zemory.enc` — bundle `global_memory.db` đã mã hoá. **Gitignored** — sinh
  ra rồi chuyển tay, không commit.
- `share.key` — chìa giải mã bundle. Đang trong git (xem cảnh báo trên).

Sinh bundle mới (đừng sửa tay file `.enc`):

```powershell
node dist\cli.js memory export share\global_memory.zemory.enc --key-file share\share.key --force
```

Khôi phục ở máy tin cậy khác — **chép `.enc` sang bằng Drive/USB trước**, rồi:

```powershell
npm ci
npm run build
node dist\cli.js memory import share\global_memory.zemory.enc --key-file share\share.key --force
node dist\cli.js memory info
```

Trước khi export bundle mới, tuỳ chọn quét riêng tư:

```powershell
node dist\cli.js memory redact --force
node dist\cli.js memory forget --project "D:\some\project"   # dry-run
node dist\cli.js memory forget --project "D:\some\project" --force
node dist\cli.js memory export share\global_memory.zemory.enc --key-file share\share.key --force
```

`forget` chỉ đổi DB/vector index dẫn xuất của zemory; KHÔNG xoá file transcript gốc của agent.
