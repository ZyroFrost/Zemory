<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

**0 mục `[ ]` đang mở.** Lịch sử việc đã xong đã dời sang `archive/05_TODO.md` ngày 2026-08-31
(tra bằng `zemory plan search`) — sổ này chỉ chứa việc PHẢI LÀM, không chứa ghi chú "đã đóng".

## BÀN GIAO 2026-09-03 — trạng thái ĐO lúc chốt

**Gate 1030/1030 · 0 fail.** Chưa push, chưa bump version — `2.13.1` vẫn là bản trên kênh.
Đã sửa 4 lỗi + help thiếu 7 lệnh + `plan/00` tự đá nhau; chi tiết `06_CHANGES [2026-09-03]`.

🔴 **KÊNH CHUNG ĐANG THIẾU KHÚC 1 — và CỐ Ý chưa sửa. Đọc hết trước khi định "dọn cho gọn".**
Hiện trạng đo 2026-09-03: `global_memory.enc` **0 byte** · `.002.enc` 37 khối · `bak.enc` 48 khối /
2,22 GB · thêm một file `global_memory.enc.broken-0byte-20260903` (0 byte, tôi dời sang, chờ user
quyết xoá).
· **Không mất dữ liệu, hệ chạy bình thường:** `syncDrive` quét MỌI `*.enc` kể cả `bak.enc` ⇒ hai máy
  vẫn hội tụ; recall/scan/embed/backup đều xanh. Thứ hỏng chỉ là hai công cụ CHẨN ĐOÁN.
· **Vì sao chưa sửa:** máy `DESKTOP-PFB157K` đang chạy bản **< 2.11.0**, còn nguyên tự-động-gộp ở
  **48 khối** (`MAIN_COMPACT_CHUNKS`, bỏ ở `69b89d2`) **và** còn nguyên lỗi EXDEV. Lượt sửa kênh
  19:06Z đặt đúng 48 khối vào khúc 1 ⇒ chạm đúng ngưỡng ⇒ máy kia gộp bằng code lỗi và phá lại
  (bằng chứng: `bak.enc` mtime 01:56Z — chỉ nhánh gộp ghi file đó; `.002.enc` KHÔNG bị xoá vì bản
  cũ không biết khúc ≥2 tồn tại; khoá kênh mang `host: DESKTOP-PFB157K`, `beat:true`).
· **Nghịch lý phải nhớ:** khúc 1 đang 0 khối nên ngưỡng 48 KHÔNG chạm được ⇒ trạng thái trông-như-
  hỏng này đang KHOÁ cái bẫy lại. Sửa kênh trước khi máy kia update = tự gỡ chốt.
· **Thứ tự đúng:** ① `zemory selfupdate` trên `DESKTOP-PFB157K` → ② rename `bak.enc` →
  `global_memory.enc` → ③ `zemory memory vectors-catchup --dry-run` xác nhận. Không gấp.

### 🔴 LUẬT KHÔNG TỰ LAN ĐƯỢC — `sync` là GAP-FILL (đo 2026-09-04)
`sync_all.ps1 -Apply` chỉ chạy `zemory sync` ở từng repo, mà `sync` **chỉ bổ file còn THIẾU**
(`adopt.ts:115` `if (!existsSync(abs)) return …`) — nó **không bao giờ ghi đè** `02_RULES` ·
`03_STRUCTURE` đã có (đúng FILE WINS, HP điều 3). ⇒ **Sửa một dòng luật trong template chỉ tới
được repo MỚI; repo đang có sẽ KHÔNG BAO GIỜ nhận.** Chỉ file hoàn toàn mới (một skill mới) mới
thật sự tới đích.
· `DEPT_STANDARD §5` của `_DWC` đang khai *"template harness đẩy bằng `sync_all.ps1`"* — câu đó
  **gây hiểu sai** vì nghĩa gap-fill. Sửa nó là sửa file repo đó khai `protected` ⇒ **chờ user**.
· Đợt 2026-09-04 vì vậy phải **sửa TAY từng repo**: luật `protected`-trỏ-vào-thứ-chỉ-đọc **14/17**
  · luật config-của-một-case (non-app) **11/11**. Ba repo thiếu (`SasinHarvest` · `SasinHub` ·
  `SasinInfra`) **không có mục `§Guardrail`** nên không có nhà cho luật, và cả ba khai
  `protected: []` nên luật không có gì để cai — cố ý bỏ, không phải sót.
· ⚠ **Các sửa đó CHƯA COMMIT ở 14 repo**: mọi repo đều đang có 1–31 file việc dở khác, chèn một
  dòng của mình vào bộ thay đổi của người khác là sai. File đã ghi; phiên của từng repo commit
  cùng việc của nó.

### Việc CHỜ USER quyết (KHÔNG phải việc mở — đừng tự làm)
· **`selfupdate` máy `DESKTOP-PFB157K`** — điều kiện tiên quyết của mọi bước sửa kênh.
· **Xoá hay giữ** `global_memory.enc.broken-0byte-20260903` (0 byte) trên kênh.
· **Xoá hay giữ** hai bản backup tay `premigrate.db` + `premove2-…db` (**5,2 GB**) trong
  `data/backups` — vòng dọn CỐ Ý không đụng thứ người/agent đỗ lại.
· **Advisory audit #4–#10 đã TRÌNH, user chưa chọn** — nêu tên để phiên sau khỏi đo lại: 2 cổng
  chỉ regex trên CHUỖI SOURCE (`daemon-liveness` · `dash-cache-stamp`) + `webLaneSessionOnDisk`
  chưa có ca nào · 2 endpoint không ai gọi (`POST /sync` · `GET /nav-cost`) · `graph export` thiếu
  `type` và cả tầng chuẩn · `gate-cage.ps1` in mojibake kép (file không BOM, PS 5.1 đọc theo ANSI) ·
  `plan/13 §0b.1` số node đã cũ (khai `hp_dieu ×13`, thực tế **16**; 288 node → **460**).

### Bẫy đã trả giá trong phiên 2026-09-03 — đừng dẫm lại
· **Fixture lệch production ĐÚNG chiều có ý nghĩa.** Cổng `--compact` cũ đặt thư mục Drive trong
  `tempDir()` ⇒ cùng volume ⇒ nhánh EXDEV **không tồn tại trong test**, xanh vĩnh viễn. Tôi tái
  phạm cùng họ ngay trong phiên: ca ③ dùng `rmSync` (khúc BIẾN MẤT) trong khi thực địa là khúc
  RỖNG — gate xanh 4/4, đột biến 3/3 đỏ, mà **vô dụng trên kênh thật**. Thứ bắt được nó không phải
  gate, là lượt chạy trên sự cố thật.
· **Số quá đẹp = nghi thước, không nghi hệ.** Probe đếm export chết trả **721/721 = 100%** — do
  heredoc ăn một tầng backslash làm `\b` thành ký tự BACKSPACE. Sanity-anchor bắt được; đo lại còn 13.
· **"Đường thứ hai" phải KHÁC CƠ CHẾ, không phải suy diễn từ cùng công cụ.** Tôi suy *"6.310 ⇒ kênh
  đủ"* rồi nói ra như khẳng định — sai, vì `vectors-catchup` không đo độ đầy của kênh.
· **`npm run build` khi có job đang chạy bằng `dist/`** — cùng họ với bẫy "gọi dist khi gate chạy"
  đã ghi, chiều ngược lại. Lần này may là job còn đang chờ khoá nên không chết.
· **Heredoc/`${}` trong script sinh code**: `${ c: number }` bị Node hiểu thành substitution; quote
  lồng nhau vỡ. Vá nhiều dòng ⇒ dùng `Edit`, đừng qua shell.

## BÀN GIAO 2026-09-02 — trạng thái ĐO lúc chốt

> ⤴ **KHỐI LỊCH SỬ — trạng thái HIỆN HÀNH ở khối 2026-09-03 bên trên.** Giữ lại vì mục *"Bẫy đã trả
> giá"* còn nguyên giá trị. Mục *"Việc CHỜ USER"* của khối này **đã gộp lên khối mới** — đọc khối
> mới, đừng đọc hai chỗ rồi tưởng là hai danh sách khác nhau.

**Đã push:** `2.13.0` (đợt web-connect) → **`2.13.1`** (đợt AUDIT + chốt phiên, user chốt số).
Changelog `[2026-09-02f]` … `[2026-09-02m]`, phần cũ đã vào `archive/06_CHANGES.md`.

**Đợt `2.13.1` gồm:** thứ tự nguồn mượn (phiên nền > SSO) · bug chữ `{b}` lòi ra UI ·
`restoreProfile` phá đích trước khi kiểm · vòng dọn sắp xoá phiên cuối cùng của khe · cache dashboard
tự sát (đóng dấu lúc VÀO) · doctor phán daemon chết khi nó đang chạy · `isolated_pct` đo số-file-test
thay vì code-chết (+ sàn đếm) · khe `need-login` treo vĩnh viễn dù đã đăng nhập · backup `keep 5→3`.

**Gate đầy đủ lần cuối:** xem commit của `2.13.1`. Nghiệm thu sống trước khi push: daemon `2.13.1`,
`graph fitness` **PASS** (`isolated_pct 0,9%`), doctor backup ✓ và **hết** dòng "daemon KHÔNG chạy".

### Trạng thái web lúc chốt (ĐO 2026-09-02)
**5/6 hàng khe `connected`.** Còn **`chatgpt` (main) `need-login`** — phiên lưu duy nhất của nó khoá
theo Edge (ABE, không mở được dưới Brave). Hàng đó nay mang ĐỒNG THỜI `canBorrow via=sso` (Chrome có
phiên Google ⇒ login một chạm) **và** `borrowBlocked: Brave` (đóng Brave rồi Mượn ⇒ vào THẲNG).
Hai đường, đều là LẦN CUỐI vì profile nay bền (`restoreShelvedSession`).
⚠ Prompt 2FA Google không tới điện thoại user là đường Google→thiết bị, ngoài tầm zemory.

### Việc CHỜ USER (không phải việc mở — đừng tự làm)
· **Hai bản backup làm tay** `premigrate.db` + `premove2-…db` (**5,2 GB**) — vòng dọn CỐ Ý không
  đụng thứ người/agent đỗ lại; xoá hay giữ là quyết định của user.
· **Sự kiện thứ BA cho diễn tập phục hồi** (*sau lượt gộp container `since=0`*) — `plan/18 §4c` nêu
  khe hở này nhưng thêm nó là **thêm luật**, chờ user chốt.

### Bẫy đã trả giá trong phiên này — đừng dẫm lại
· **QUÊN BẬT LẠI UI sau khi tắt daemon để chạy gate** — user phải nhắc ba lần, lần cuối là bực. Luật
  đã có từ lâu. Bật lại là **phần cuối bắt buộc** của mọi lượt đụng code, không phải bước tuỳ chọn.
· **Vá một bề mặt, quên bề mặt kia.** `/connections` và `scope.ts` cùng trả lời *"khe còn nối không"*;
  vá một bên là hộp chi tiết hiện `Link: linked` ngay trên `need-login`. Nguồn TRÙNG thì sớm muộn cũng
  lệch ⇒ rút thành MỘT hàm (`webLaneLinked`) + cổng cấm bên nào tự phán lại.
· **Phép cổng soi CHỮ trên CẢ FILE bắt oan chú thích** — mắc **HAI LẦN** cùng phiên (`AppActivate`,
  `cookies: -1`): chuỗi bị cấm nằm trong comment giải thích VÌ SAO không dùng nó. Bỏ comment trước khi soi.
· **Cổng thành XANH GIẢ sau khi đổi code**: `assert.match(/zN\(tot\)/)` vẫn xanh vì chuỗi đó chuyển vào
  tooltip — nó không còn canh gì mà vẫn phát ra lời bảo đảm. Đổi hành vi thì phải soát lại cổng của nó.
· **Đột biến KHÔNG ÁP ĐƯỢC = KHÔNG PHẢI bằng chứng.** Hai lượt "fail 0" của tôi là do neo lệch (ký tự
  `⟳` ghi thật, không phải escape `\u27f3`), không phải do cổng bắt được.
· **Heredoc ăn một tầng backslash — lần thứ BA trong phiên.** Regex thành rác, file test lỗi cú pháp.
  Vá nhiều dòng = `Write` script ra file rồi `node <file>`, dùng `String.raw` cho regex.
· **Đừng gọi `node dist/cli.js …` khi gate đang chạy** — gate làm `clean && tsc`, dist bị xoá giữa chừng,
  lệnh chết với lỗi chẳng liên quan. ⚠ **DẪM LẠI 2026-09-02**: chạy `npm run build` song song với gate
  ⇒ gate chết **exit 255**, im lặng, không một dòng lỗi (lồng RAM `gate-cage` giết cả cây; các gate
  trước đã đo đỉnh 3.3/4 GB = 81%, cộng thêm một `tsc` là vượt trần). Gate đang chạy = **KHÔNG chạy gì**.
· **Ngưỡng PHẦN TRĂM vô nghĩa trên mẫu bé** — siết trần `isolated_pct` 30%→4% làm đỏ oan fixture repo
  3 file (1 cô lập = 33%). Mọi cổng dạng tỉ lệ phải có SÀN SỐ ĐẾM (cùng doctrine `ABSTAIN_MIN_VECTORS`).
· **Đóng dấu cache lúc XONG, không lúc VÀO** — mốc-vào làm hàng cache sinh ra đã quá hạn khi thời gian
  tính vượt TTL, tức cache chết đúng trên kho lớn nơi nó tồn tại để bảo vệ.
· **`AppActivate(pid)` KHÔNG nâng được cửa sổ Chromium** — nó tự sinh cây tiến trình nên pid ta spawn
  không sở hữu cửa sổ. Đường đúng: `Page.bringToFront` của CDP.
· **`webAuth` là lần KIỂM, `webPull` là lần KÉO** — hai sổ khác nhau, và cái mới hơn mới là sự thật.

### Một đề xuất ĐÃ TRÌNH, user CHƯA gật — không tự làm, không phải việc mở
Lọc "phiên bấm nhầm" (vài ký tự · chat sai phiên): đề xuất luật cơ học gắn cờ `junk` (KHÔNG xoá) + agent đang chạy
duyệt như `promote`, không LLM trong lõi (HP điều 6); bước đầu là ĐO đếm ứng viên trên 2.771 phiên, chưa viết gì.
*(Ba đề xuất còn lại — trang "✓ Đã liên kết" · xoá 3 profile trống · gộp 3 root đổi tên — user gật 2026-08-29 và đã
làm, xem `06_CHANGES [2026-08-29]`.)*
