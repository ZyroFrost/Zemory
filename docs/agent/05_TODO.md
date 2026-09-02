<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

**0 mục `[ ]` đang mở.** Lịch sử việc đã xong đã dời sang `archive/05_TODO.md` ngày 2026-08-31
(tra bằng `zemory plan search`) — sổ này chỉ chứa việc PHẢI LÀM, không chứa ghi chú "đã đóng".

## BÀN GIAO 2026-09-02 — trạng thái ĐO lúc chốt

**Đã push:** `2.12.0` (`ec4d33c`) · `2.12.1` (`01d47f1`). **CHƯA push: 11 commit cục bộ** — lượt cuối
(mượn cookie + `bringToFront`) commit 2026-09-02 sau khi gate xanh; **không còn gì chưa commit**.
Version giữ `2.12.1` — user bác việc bump từng đợt nhỏ (*"cái gì up quài"*), luật Version là
release-based, gom vào version kế.

**Gate đầy đủ chạy trọn 2026-09-02 TRÊN đúng phần mượn cookie + `bringToFront`: exit 0 · 0 fail ·
0 skip-vì-bận · conform sạch · todo verify sạch.** (Lượt đầu cùng ngày exit 1 KHÔNG phải test hỏng:
giữa gate có daemon + job `embed --all` đang chạy — ai khởi động chưa xác minh, có thể autostart —
⇒ nhóm nặng skip-vì-bận; tắt cả hai rồi chạy lại là trọn.) `config.ts` sửa dở từ trước hoá ra chỉ là
**1 dòng comment** đổi đường dẫn ví dụ theo vị trí repo mới — đã gộp vào commit này.

### Trạng thái web lúc chốt (ĐO)
Cả **4 khe** `chatgpt` · `chatgpt#2` · `claude` · `claude#2` đang **`need-login`** — gốc: máy đổi trình
duyệt mặc định **Brave → Edge** nên `borrowCookies` dời cả 4 profile sang bên, mất phiên đồng loạt.
Vòng tự kéo **đã thôi đụng** các khe này (máy không được tự bật khung đăng nhập); UI báo *mất kết nối*
kèm nút nối lại ở đúng hàng tài khoản. Đường nhanh nhất để hồi phục: **đóng Brave** → mở hộp
Connection details → **Mượn** (khỏi đăng nhập, khỏi 2FA).

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
