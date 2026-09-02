<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

**0 mục `[ ]` đang mở.** Lịch sử việc đã xong đã dời sang `archive/05_TODO.md` ngày 2026-08-31
(tra bằng `zemory plan search`) — sổ này chỉ chứa việc PHẢI LÀM, không chứa ghi chú "đã đóng".

## BÀN GIAO 2026-09-02 — trạng thái ĐO lúc chốt

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
