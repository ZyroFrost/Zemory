# Zemory Shared Memory Bundle

> ⛔ **2026-07-29 — bundle KHÔNG còn đi qua git.** Repo này là **PUBLIC**
> (`ZyroFrost/Zemory`), nên `.gitignore` nay chặn **mọi** `*.enc` kể cả bundle của chính
> repo; dòng ngoại lệ `!share/global_memory.zemory.enc` (thêm 2026-07-10) đã bị gỡ.
> Luật: **git chứa SOURCE, không chứa DATA.** Gate `no-data-in-git.test.mjs` khoá lại.
>
> Bundle vẫn export/import bình thường — chỉ **chuyển qua kênh khác** (Drive · USB · SMB),
> không commit. Lệnh y hệt bên dưới, chỉ khác nơi đặt file.
>
> ⚠ **`share.key` vẫn đang được commit** (từ `98bc126`, 2026-07-01, theo yêu cầu chủ repo
> lúc repo còn dự tính để private). Repo nay PUBLIC ⇒ **chìa đó phải coi như đã lộ**. Xoá
> khỏi HEAD KHÔNG xoá khỏi lịch sử. Việc cần làm còn treo ở `05_TODO`: **xoay chìa mới ·
> `git rm --cached share/share.key` · gitignore · đưa chìa qua kênh khác**. Giảm nhẹ: chưa
> có `.enc` nào từng vào git (`git log --all -- 'share/*.enc'` rỗng) ⇒ hiện lộ *chìa*, chưa lộ *khoá*.

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
