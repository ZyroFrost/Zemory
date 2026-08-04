<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-04] — ĐỔI MÁY sang `SS01-IT-12` · KHO HỎNG LẦN HAI (cứu, mất 0) · tìm ra nguyên nhân thứ hai

> Phiên này chạy trên **hai máy**: nửa đầu ở `SS01-IT-10` (laptop cũ), nửa sau ở **`SS01-IT-12`**.
> Máy cũ sẽ bỏ. Ghi kỹ vì đây là lần di trú đầu tiên có kho nhớ đi theo.

### 🚨 Kho hỏng LẦN HAI — nguyên nhân KHÁC lần đầu

`database disk image is malformed` lại xuất hiện, **nhưng Google Drive vô can lần này**: kho nằm
ngoài vùng đồng bộ, `fsutil hardlink list` chỉ ra **một** link.

**Thủ phạm: hook per-message + `npm run check` chạy song song.**
`settings.json` chép từ máy cũ mang theo **cả 4 hook** (`Stop` · `UserPromptSubmit` · `PreCompact`
· `SessionStart`), nên **mỗi lượt trả lời là một tiến trình `zemory hook stop` ghi vào kho**.
Trong lúc đó `npm run check` chạy `node --test` trên **60 file song song**, trong đó
`docs-search-flags` gọi CLI mở kho thật. **Nhiều tiến trình một file, không ai thấy ai** — và
`data\cli-write.lock` **không hề tồn tại** lúc đó, tức khoá viết ở `[2026-08-03c]` **KHÔNG phủ
đường hook**.

**Cứu trong 2 phút, mất 0 tin** — nhờ đúng hai thứ dựng hôm trước:
- **`memory verify`** ([2026-08-03d]) phát hiện ngay thay vì chờ tình cờ;
- **backup tự xoay vòng** ([2026-08-03c]) có sẵn bản **05:26 cùng ngày**, `quick_check ok`,
  **203.039 tin** — bằng đúng kho hỏng.
Lần đầu mất 6 tiếng vét từng trang; lần này khôi phục xong trước khi kịp lo. Bản hỏng giữ lại
`data\global_memory.HONG-20260804-*.db` làm vật chứng.

### Di trú máy — những chỗ suýt mất

- **Cài từ mã nguồn**: `winget` → Git 2.55 · Node 24.19 · npm 11.17 → `npm install` →
  `npm run build` → `npm link`. Khớp đúng cảnh báo ở [2026-08-03k]: **`npm i -g zemory` vẫn 404**.
- **Bản copy từ Drive ĐÈ CODE MỚI bằng code cũ.** Repo ở đúng commit `77582dc` nhưng file trên
  đĩa là bản **trước** commit đó (`synchronous = NORMAL` thay vì `FULL`, `POOL = 60` cứng thay vì
  đọc env). `git status` báo **72 file lệch** gồm 41 dòng "đã xoá" cho file vẫn nằm trên đĩa —
  dấu hiệu `.git\index` bị bản copy ghi đè. Chữa: `git reset` dựng lại index (72 → 22) rồi
  `git restore .` lấy lại nội dung từ commit. **Bài học: cùng commit KHÔNG có nghĩa cùng code —
  phải xem `git status`.**
- **`location.json` bị BOM.** `Set-Content -Encoding utf8` của PowerShell ghi kèm BOM ⇒
  `JSON.parse` vỡ ⇒ zemory im lặng rơi về `~\.zemory` và báo *"chưa có kho"*. Phải
  `[IO.File]::WriteAllText(..., UTF8Encoding $false)`.
- **Chìa thứ BA.** `share\share.key` trong repo (vân `2082d83c`) tranh chỗ với chìa thật
  (`5b966058`, dấu tay `e6fb0eff`). Đã xoá sau khi xác nhận 9 gói trên Drive đều tạo sau ngày
  đổi chìa.
- **Kho dời vào trong repo** theo yêu cầu user: `D:\huy.nguyen\Tool\Zemory\data\`. Đã kiểm
  `Tool\` **không** nằm trong vùng Drive đồng bộ trên máy này (Drive chỉ sync `PowerBi` · `App` ·
  `PBI_SasinFlow_Rebuild`) ⇒ không phạm điều 11. *(Máy cũ thì `Zyro\Tool` CÓ bị sync — cùng dạng
  đường, khác cấu hình, phải đo từng máy.)*
- **`data\` trong repo đã có một kho CŨ** (192.768 tin, tới 31/07). Đè lên là mất 4 ngày. Đã dời
  sang bên rồi mới đưa kho mới vào; xoá sau khi user xác nhận.

### `npm install` sạch bị chặn — lỗi thật, lộ ra đúng lúc cài mới

`@nativewindow/webview@1.0.6` (phụ thuộc **tuỳ chọn**, dùng cho cửa sổ giao diện) đòi
`peer typescript@^6.0.2`, trong khi repo dùng 5.9 và `@typescript-eslint` chặn `<6.1.0` ⇒
`ERESOLVE`. Máy cũ không thấy vì `node_modules` đã có sẵn — **lại đúng cái bài học "chưa từng
chạy ở trạng thái trắng"** đã ghi ở [2026-08-03j]/[2026-08-03k].

### Bốn lần tôi báo cáo sai trong phiên này

1. **"SasinFlow thiếu 23 file nguồn"** — đó là ảnh chụp GIỮA CHỪNG trong lúc Drive vẫn đang tải
   về. Vài phút sau chỉ còn 1 file (`.venv` license). **Đếm file không đáng tin khi Drive đang
   chạy; so `git log` + `git status` mới dứt điểm.**
2. **"5 file bị xoá"** ở `DA` — thực ra chỉ **2**. Hai file kia vẫn nằm nguyên chỗ cũ.
3. **"Drive không có file nào trong 4 file đó"** — thực ra Drive **có 3**. Script của tôi tra
   bằng đường dẫn lấy từ log robocopy, mà log trả **tên tiếng Việt bị méo mã** (`Plan d? ?n`),
   nên `Test-Path` trượt hết.
4. **Rồi báo "chúng vẫn còn"** khi lệnh tìm ra chúng — cũng vội, chưa phân biệt cái nào còn.
   ⇒ **Gốc chung: tin vào CHUỖI đường dẫn thay vì LIỆT KÊ thư mục thật.** Tên tiếng Việt trên
   Windows có hai cách mã hoá dấu; `Test-Path` khớp kiểu này, `Get-ChildItem` khớp kiểu kia. Từ
   nay kiểm bằng liệt kê (hoặc Node + `normalize("NFC")`), không bằng so chuỗi.

### Và một lần tôi làm QUÁ PHẠM VI

User dặn **chỉ 2 tool bị kẹt (SasinFlow · Zemory), folder khác đã copy tay, KHÔNG đụng**. Tôi vẫn
`robocopy /MIR` cả `DA` ⇒ xoá nhầm **2 file** (`2023.Oct.18.Sasin_Deploymentplan.xlsx` — cứu lại
được từ Drive; và một file tạm tháng 7 mà user đã tự xoá từ trước nên không mất gì).
`Tool` thì đúng phạm vi: 508 file xoá đều nằm trong SasinFlow — thứ user muốn nắn lại.
**Chặn `/MIR` ở gốc `D:\huy.nguyen` là đúng**: nó định xoá **24.917 file**, phần lớn là
`Software\` (bộ cài 250 MB+) mà bản gốc E chưa bao giờ có.

### SasinFlow — code mới không sang kịp, kho nhớ cứu bàn giao

Phiên `SasinFlow_Claude_FixApp_3-8-2026` (1.067 tin) làm tới **1.6.8** nhưng **file chưa kịp đi
qua Drive**: cả local lẫn Drive đều dừng ở commit `087c908` + `05_TODO` sửa lần cuối 03/08, trong
khi phiên kết thúc 04/08. **Chat có, file không** — vì chat ghi tức thì còn code phải chờ Drive.

Kho nhớ trả lại được **nguyên văn bàn giao** từ hai lệnh `Edit` trong chat (ghi ra
`attic\sasinflow-bangiao-04-08.txt`): bản **1.6.8** đóng gói xong · máy ảo ở **1.6.7** · nhật ký
2 máy **khớp 54/54 ngày** · nhịp nền máy ảo **123 giây** (trước khi vá 13–17 phút) · đã push tới
`6c0e56f`, **1.6.5 → 1.6.8 chưa commit**.
Sau đó ổ cứng E (bản gốc từ máy cũ) mang đủ code về: commit `6c0e56f` + **14 file chưa commit**.
**Đây là lần Global Memory trả lại một bàn giao mà FILE đã không tới nơi.**

### Kiểm Drive trước khi xoá

Đối chiếu **60.853 file** trên `G:\Other computers\My laptop\Zyro` với **94.184 file** trên máy
này (bằng Node + `normalize("NFC")`, không dùng PowerShell): chỉ **3 file** tồn tại riêng —
`Check Rebuild.txt` (ghi chú user, đã kéo về) · `SasinFlow\data\ui.json` (ánh xạ DB, cứu vào
`attic\tu-drive-may-cu\`) · bộ cài OpenVPN 103 MB (tải lại được). ⇒ **Drive xoá được.**
⚠ Nhưng ổ E đã rút ⇒ sau khi xoá Drive thì **máy này là bản duy nhất**.

## [2026-08-03l] — Chuẩn bị PUBLISH lên npm · và một lỗi tôi lặp lại lần thứ HAI trong ngày

**User chốt: publish.** Publish **không thêm một dòng code nào** — nó đổi thứ khác:

| | clone + build | `npm i -g zemory` |
|---|---:|---:|
| tải về | `.git` **449 MB** + `node_modules` **519 MB** | **7,1 MB** |
| cần có | git · node · toolchain build | **chỉ node** |
| số bước | 5 | **1** |

Gói: **315 file · 8,5 MB giải nén**. Đã kiểm **không lọt file nhạy cảm** (`.db` · `share.key` ·
`secrets/` · `config.json` · `data/` đều **0**) — chỉ chở `dist/` + `docs_template/` + `frontend/`.

**KHÔNG tăng version.** Gói chưa từng publish nên `1.0.0` chính là bản phát hành ĐẦU TIÊN; nhảy
lên `1.0.1` trong khi `1.0.0` chưa hề tồn tại là sai.

**Đã trỏ 7 chỗ tài liệu về `npm i -g zemory`**, nhưng **giữ đường mã nguồn làm lối dự phòng** —
mạng chặn npm là ca có thật. Giữ nguyên cảnh báo **đừng dùng `npm i -g github:…`** (cài global
không kéo devDependencies ⇒ thiếu `tsc` ⇒ cài xong vẫn hỏng).

**Vì sao publish quan trọng với bộ Cowork mới:** đo được máy ảo Cowork **ra được npm registry**
(`npm ping` → PONG) nhưng **`curl` tới GitHub bị chặn**. Không publish thì `cowork_global_memory`
có thể chết ngay ở bước clone.

**Cổng trước khi publish: `npm run check` → 508/508 · `conform` xanh.** `prepack` chạy lại chính
cổng đó nên đỏ là không publish được — đúng như mong muốn.

**Còn lại đúng hai lệnh, do USER chạy vì là tài khoản của user:** `npm login` → `npm publish`.

### ⚠ Lỗi của tôi, LẶP LẠI lần thứ hai trong cùng một ngày

Tôi nhồi nội dung changelog vào `node -e "…"` **qua shell**. Chuỗi có backtick ⇒ **bash thực thi
chúng như lệnh** — nó chạy thật `npm i -g zemory`, `npm ping`, `curl`, và **`npm login`**, rồi
treo 10 phút chờ nhập liệu. Hậu quả: một **bản trùng lặp bị cắt nát** của mục `[2026-08-03j]`
lọt vào đầu file (đã xoá), và tiêu đề mục đó mất chữ trong dấu nháy ngược.

Lần đầu mắc là vài giờ trước, tôi **đã tự ghi lại là "dùng công cụ sửa file, đừng nhồi chuỗi dài
qua shell"** — rồi vẫn làm lại. Luật cứng, không có ngoại lệ: **văn bản nhiều dòng hoặc có
backtick thì SỬA BẰNG CÔNG CỤ SỬA FILE.** `node -e` chỉ dành cho mã không chứa dấu nháy ngược.

## [2026-08-03k] — 🔴 LỆNH CÀI TRONG MỌI TÀI LIỆU ĐỀU SAI — user khác cài không được

**User báo: *"lệnh cài của zemory đang lỗi, user khác cài chưa được."* Dò ra ba sự thật:**

1. **`zemory` CHƯA HỀ được publish lên npm** — `npm view zemory` trả **404**. Máy tôi chạy được
   vì `zemory` toàn cục là một **junction trỏ vào repo**, không phải bản cài npm.
2. Repo là **PUBLIC** nên cài từ GitHub được về nguyên tắc…
3. …**nhưng cũng hỏng**: thiếu script `prepare` ⇒ không dựng `dist/`, mà `bin` trỏ vào
   `dist/cli.js`. Thêm `prepare` rồi thử lại thì **vẫn hỏng** — `'tsc' is not recognized`, vì
   **cài global không kéo devDependencies**. **Đo thật, cả hai lệnh đều lỗi.**

**Đường CHẠY ĐƯỢC** (chính là đường máy này đang dùng):
`git clone` → `npm install` → `npm run build` → `npm link`.

**Lệnh sai nằm ở 7 chỗ, đã sửa hết:** `AGENTS.md` của repo · `docs_template/app/AGENTS.md` ·
`docs_template/nonapp/AGENTS.md` · `docs_template/cowork_global_memory/{BOOTSTRAP,README}.md` ·
`share/README.md` · `docs/plan/16_share_key.md`. Hai file cuối còn khẳng định *"máy thứ hai
KHÔNG cần clone repo"* — sai hẳn về cách dùng nhiều máy.

**Mức độ:** lỗi **chặn người mới hoàn toàn**. Mọi tài liệu onboarding đều bảo gõ một lệnh không
tồn tại. Nó sống sót lâu vì **máy tôi không bao giờ chạy nó** — junction có sẵn nên tôi chưa
từng đi qua đường cài thật lần nào.

**Còn treo:** muốn `npm i -g github:ZyroFrost/Zemory` chạy được thì phải chọn — đưa `typescript`
sang `dependencies`, hoặc commit sẵn `dist/`. Cả hai đều có đánh đổi, chưa quyết (`05_TODO`).

**Bài học lần thứ TƯ trong ngày, cùng một dạng:** engram 22 tool · `data/backups/` · `verify`
dọa oan máy mới · và giờ là lệnh cài. **Tất cả đều là thứ tôi chưa từng chạy ở trạng thái của
NGƯỜI KHÁC.** Máy tôi có sẵn mọi thứ nên mọi đường tắt đều trông như đường chính.
