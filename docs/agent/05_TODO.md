<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

**0 mục `[ ]` đang mở.** Lịch sử việc đã xong đã dời sang `archive/05_TODO.md` ngày 2026-08-31
(tra bằng `zemory plan search`) — sổ này chỉ chứa việc PHẢI LÀM, không chứa ghi chú "đã đóng".

## BÀN GIAO 2026-09-02 — trạng thái ĐO lúc chốt

**Đã push:** tới `2.13.0` — đợt web-connect ĐÓNG. Gồm tính năng mới (Mượn chở phiên SSO · profile
bền tự trả phiên khi đổi trình duyệt) + fix (jar≠phiên · cửa sổ login 1200×900 · `bringToFront` ·
`webLaneLinked`). User chốt số `2.13.0` (minor — có năng lực mới). Changelog: `06_CHANGES`
`[2026-09-02]` … `[2026-09-02e]`.

**Gate đầy đủ:** lượt cuối trước bump exit 0 · 0 fail (2 ca embed skip-vì-bận do autostart bật lại
daemon giữa gate — KHÔNG liên quan thay đổi, đã chạy xanh ở gate liền trước). conform + todo sạch.

### Trạng thái web lúc chốt (ĐO 2026-09-02 sau `restoreShelvedSession` — xem `06_CHANGES [2026-09-02c]`)
**3/4 khe ĐÃ HỒI không cần đăng nhập** (phiên trả về từ bản brave-bak, Brave vẫn đang mở):
`claude` · `claude#2` · `chatgpt#2` đều `connected: true`, đã kéo lại được. **Còn MỘT khe
`chatgpt` (main) `need-login`** — phiên lưu duy nhất của nó khoá theo Edge (ABE, không mở được
dưới Brave). Hai đường, đều là LẦN CUỐI vì profile nay bền: ① đăng nhập tay trong cửa sổ đang mở ·
② đóng Brave ~30 giây → hộp Connection details → **Mượn** (lấy phiên thật từ jar Brave) → mở lại Brave.
⚠ Nhắc lại từ changelog: prompt 2FA Google không tới điện thoại user là đường Google→thiết bị,
ngoài tầm zemory.

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
  lệnh chết với lỗi chẳng liên quan.
· **`AppActivate(pid)` KHÔNG nâng được cửa sổ Chromium** — nó tự sinh cây tiến trình nên pid ta spawn
  không sở hữu cửa sổ. Đường đúng: `Page.bringToFront` của CDP.
· **`webAuth` là lần KIỂM, `webPull` là lần KÉO** — hai sổ khác nhau, và cái mới hơn mới là sự thật.

### Một đề xuất ĐÃ TRÌNH, user CHƯA gật — không tự làm, không phải việc mở
Lọc "phiên bấm nhầm" (vài ký tự · chat sai phiên): đề xuất luật cơ học gắn cờ `junk` (KHÔNG xoá) + agent đang chạy
duyệt như `promote`, không LLM trong lõi (HP điều 6); bước đầu là ĐO đếm ứng viên trên 2.771 phiên, chưa viết gì.
*(Ba đề xuất còn lại — trang "✓ Đã liên kết" · xoá 3 profile trống · gộp 3 root đổi tên — user gật 2026-08-29 và đã
làm, xem `06_CHANGES [2026-08-29]`.)*
