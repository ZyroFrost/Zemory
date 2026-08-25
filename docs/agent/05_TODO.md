<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

## 🔵 BÀN GIAO 2026-08-25 (phiên chiều) — ĐỌC MỤC NÀY TRƯỚC

**SỔ TRỐNG — 0 mục mở.** Dưới đây là TRẠNG THÁI đã ĐO, để phiên sau khỏi đo lại.

### Phiên này làm gì (số đo đầy đủ: `06_CHANGES` từ `[2026-08-25d]` xuống `[2026-08-25b1]`)
Push **2.6.0** rồi **2.7.0**. Ba việc lớn, cả ba đều sinh từ **một lượt diễn tập phục hồi**:
- **Diễn tập phục hồi LẦN ĐẦU** (`plan/18 §4b`) — dựng kho từ kênh chung: đường lùi CÒN SỐNG, và
  nó **bắt được lỗ chở vector**: kho dựng ra thiếu ~22.000 vector ⇒ máy nhận phải nhúng lại ~12 giờ.
- **Vá lỗ đó** (`embedFrontierId` — tin và vector đi cùng chuyến) + **lệnh bù**
  `zemory memory vectors-catchup` (nối thêm, KHÔNG ghi đè). Đã chạy thật: kênh thiếu
  **16.624 → 3** vector (3 cái là tin daemon nhúng sau lúc đo).
- **Hàng đợi ghi kho chung** (`plan/08 §8c`) — user bác vế cũ *"tranh chấp thì báo, không cố
  chống"*: nay ĐỢI tới lượt · nhịp tim 30 s · kiểm hai đầu quanh lúc nối · merge ra NGOÀI khoá.
  Kèm phát hiện lớn: `mergeContainer` cũ chép lại **cả container mỗi lượt sync** (2,4 GB / ~1 giờ
  chỉ để kết luận "không có gì mới") — nay chữ ký khối đọc tại chỗ.

Ngoài ra: soát plan bằng CODE ⇒ **8 dòng "chưa làm" hoá ra đã xong** · đo A/B lớp gộp trên 108
nhãn ⇒ **giữ mặc định BẬT**, bác vế "nghiêng về tắt" của `plan/19`.

### Trạng thái máy lúc chốt (ĐO, không nhớ)
- **zemory 2.7.0** trên `origin/main` (`09ddc24`). Cây làm việc sạch sau commit.
- **Gate: `813/813 · 0 fail · 0 skipped` · `EXIT=0`** · `conform` ✓ · `todo verify` ✓.
- **Daemon TẮT** — tắt để build được (`clean` không xoá được `dist/` khi daemon đang chạy từ đó).
  Bật lại: `zemory ui --no-window`. Autostart đang BẬT nên nó cũng tự lên khi đăng nhập lại.
- Kho local: **299.180 tin** · ~284,5k vector · phủ 92%.
- Kho chung: **31 khối · 1.764 MB**, đã đủ vector (nghiệm thu độc lập: còn thiếu **3**).

### Việc đầu tiên của phiên sau
1. **Bật lại daemon** nếu chưa lên.
2. **Chạy `zemory memory sync` một lượt** — lượt 16:28 hôm nay nối khối xong nhưng **chết trước khi
   ghi watermark** (ổ G treo 2 phút, `UNKNOWN: unknown error, write`), nên máy này sẽ **gửi lại
   khối ~9 MB đó**. Merge idempotent ⇒ không sai dữ liệu, chỉ phí băng thông một lần.
3. Nhân lượt đó **đo tốc độ sync** — số cũ: 2,4 GB đọc / ~1 giờ. Cửa-chặn-rẻ phải kéo nó xuống
   còn vài phút. **CHƯA có phép đo sạch nào trên kênh thật** vì lượt đo bị Drive treo cắt ngang.

### Bẫy đã trả giá trong phiên này — đừng dẫm lại
· **Gate bị cắt 4 LẦN** (2 lần tôi tự dừng để sửa code · 1 lần môi trường · 1 lần preflight chặn vì
  daemon tự bật chạy embed). Số dở dang **không phải kết quả**: có lượt 386 ✔ mà không có `EXIT=`.
  Cách đúng: phóng gate dạng **mồ côi** qua `.vbs` rồi canh dòng `EXIT=` trong log.
· **Đột biến TRƯỢT regex ⇒ test vẫn xanh** = xanh giả. Phải đọc bản dịch thật rồi cắt theo DÒNG.
· **Cổng có thể là TRANG TRÍ mà vẫn xanh**: ca "cửa chặn rẻ" bản đầu không phân biệt được "bỏ qua"
  với "chép ra rồi mới bỏ qua" — chỉ lộ khi chạy đột biến. Phải trưng cờ ra kết quả mới đo được.
· **Bẫy escape qua shell, dính 2 lần nữa**: `"C:\p"` thành `"C:\p"` (lint bắt, test vẫn chạy vì JS
  nuốt `\p`) và **bash nuốt phần trong dấu huyền** khi ghi docs qua `node -e` (mất 3 từ). Sửa file
  bằng công cụ sửa file, và **quét lại** thay vì nhìn mắt.
· **Test gọi `syncDrive` mà quên cô lập HOME** ⇒ đi quét transcript THẬT, treo hơn 8 phút.
· **Ca test có thể TREO thay vì đỏ** — treo trong gate tệ hơn đỏ. Ca chờ-khoá phải gắn `timeout`.

## ⭐ NGÃ RẼ RECALL — "còn cách nào nữa không" (dựng 2026-08-23 để trả lời câu user sẽ hỏi)

> Xếp theo **dư địa đo được**, không theo cảm giác. Ba thứ đã LOẠI bằng số ở cuối — đừng đề xuất lại.

*(Mục ① CỔNG "KHÔNG BIẾT" đã ĐÓNG 2026-08-24 — đo xong, qua cổng, **user chốt BẬT MẶC ĐỊNH**;
xem `06_CHANGES [2026-08-24i]` + `plan/17 §1.3b`. Hai hướng BỊ BÁC bằng số, đừng đề xuất lại:
`margin` là gánh nặng · độ đồng thuận giữa lane cộng thêm đúng số không. Còn hở có chủ đích:
4/28 ca âm vẫn lọt ở dải 0,806–0,839 — bịt nốt phải hạ θ xuống mức bắt đầu ăn vào câu thật.)*

## 📌 Việc còn MỞ tách ra từ các khối đã đóng (tách 2026-08-23 lúc chốt phiên)

> Bốn mục dưới đây nằm LẪN trong ba section `## ✅` đã xong. Archive cả khối là **nuốt việc**, nên
> tách ra đây rồi mới dời phần đã xong đi. Ngữ cảnh gốc của từng mục vẫn tra được ở
> `archive/05_TODO.md` (`zemory plan search`).

*(Mục "ÁP CHUẨN MỚI LÊN TOÀN BỘ REPO CŨ" đã ĐÓNG 2026-08-24 — chạy xong cả 9 repo, xem
`06_CHANGES [2026-08-24e]`. Ghi chú còn giá trị: 2 dòng đăng ký skill (`04_SKILLS`+`AGENTS`)
sync KHÔNG tự thêm (file-wins) — `conform` bên đó sẽ nhắc, agent bên đó tự thêm.)*

## 🆕 Phát sinh 2026-08-07 tối (sau release 1.2.0) — 4 việc

  ✅ **ĐÃ CHẠY 2026-08-15** — gate đầy đủ **670/670 pass · 0 fail · 0 skipped**, tức 5 file đó
  đều chạy thật (không ca nào bị `skipIfBusy` bỏ qua).
  ~~**CHẠY 5 FILE TEST CÒN MÙ sau khi embed xong:** `embed` · `rerank` · `vectors` ·~~
  `memory-search` · `digest`. Ba lượt audit hôm nay CỐ Ý bỏ chúng để không tranh CPU với job
  embed (đo thật: bench chạy song song làm embed tụt về 0 chunk/30 s). Ghi ra đây để **không ai
  đọc "audit xanh" thành "đã soi hết"** — vùng này chưa được soi trong cả ba lượt.
  Chạy CÙNG DỊP hai lượt bench, không cần lượt audit riêng.
*(Biển cấm "separator của index" đã DỜI về nhà vĩnh viễn 2026-08-24 — `02_RULES §Luật khi VIẾT`,
dòng `Separator của INDEX`. Nó là LUẬT nổ lúc viết code, không phải việc chưa làm, nên không còn
chiếm một dòng `[ ]` mà mọi phiên phải đọc rồi soát lại.)*
*(Mục "Cổng bundle ĐÃ RỜI KHỎI MÁY chưa" đã ĐÓNG 2026-08-24 — build xong `uplinkguard`, xem
`06_CHANGES [2026-08-24f]`. Bài học giữ lại: chữ trong log client — `user-paused`, "Syncing is
paused" — KHÔNG đủ kết luận; thứ đáng tin là HÀNG ĐỢI + ĐỊNH DANH trong sổ của client.)*
## Quyết định mở / cần chốt
*(Mục "Zemory tự đổi model/agent theo việc lớn·nhỏ" đã ĐÓNG 2026-08-24 — **user chốt BỎ**, theo
hướng (b): để CLI/agent tự lo, zemory không đụng. Nguyên văn lý do, giữ vì nó là một RANH GIỚI
kiến trúc chứ không phải một cái tick: *"second brain nó phải nằm bên project A.I Center; t sợ mở
quá nhiều ở zemory thì nó ko còn là hệ RAG nữa, nó thành AI ops"*. Ai định mở lại hướng này thì
đọc câu đó trước.)*

## Phase 2 — Năng lực nặng
*(Mục #12 "Memory promotion" đã ĐÓNG 2026-08-24 — `zemory memory promote` ship đúng cơ chế đã
hình dung: phát hiện lặp → xếp hạng → trình user, user gật agent mới ghi; xem `06_CHANGES
[2026-08-24h]`. Việc dùng nó là NGHI THỨC định kỳ: chạy `promote`, duyệt danh sách với user.)*
*(Mục #13 "Quét & ingest BỘ NHỚ CURATED" đã ĐÓNG 2026-08-24 — adapter `claude-code-memory`
ship, 3 câu "Cần chốt" chốt bằng thiết kế có lý do, xem `06_CHANGES [2026-08-24g]`. Vế còn để
ngỏ có chủ đích: Codex/Cursor adapter khi có nhu cầu · global `~/.claude/CLAUDE.md` · recall
xếp curated cao hơn — vế cuối phải qua corpus có nhãn, để cặp với #12.)*
