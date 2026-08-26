<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

## 🔵 BÀN GIAO 2026-08-26 (chiều) — ĐỌC MỤC NÀY TRƯỚC

**1 mục mở** (§Bảng kê 2 tháng thử việc, cuối file). Dưới đây là TRẠNG THÁI đã ĐO, không phải nhớ.

### Phiên này làm gì (số đo đầy đủ: `06_CHANGES [2026-08-26b]` · thiết kế: `plan/08 §8d`)
Vá **sync chịu được cú CHẬP của ổ đám mây**, sau khi soi docs bắt được lượt auto-sync đang đỏ:
- **Chiều GHI** — số khối ĐẾM ĐƯỢC phán thành/bại, không phải ngoại lệ; retry 3 lần có cắt về
  chiều dài cũ; watermark nhích ngay khi khối chứng minh được có mặt.
- **Chiều ĐỌC** — `withDriveRetry` bọc `extractChunk`, nhận nhóm mã chập, không nhận `ENOENT`.
- **Quan sát** — stderr của con sync thôi bị vứt; log phân biệt được thành/bại.
- **Trả nợ vector kênh chung**: đẩy 2.790 vector / 12,5 MB, nghiệm thu 3 phép khác cơ chế.

### Trạng thái máy lúc chốt (ĐO)
- **zemory 2.7.1** (bump lúc push, user chốt) · gate **830/830 · 0 fail · 0 skipped · EXIT=0**.
  `npm test` nay chạy `--test-concurrency=4` — 12 tiến trình song song đã làm tràn RAM hai lần.
- Kênh chung **42 khối · 1.934.599.820 byte** · `vectors-catchup --dry-run` ra **thiếu 0**.
- Kho local **301.513 tin · 287.096 vector** (phủ 99,4%, 768d). Daemon chạy, autostart + autosync BẬT.
- 30,4 MB khối trùng (#30≡#31 · #37≡#39) **cố ý để yên** — ngưỡng gộp tự động 48 khối, nay 42.

### Bẫy đã trả giá trong phiên này — đừng dẫm lại
· **`✕ another background job is writing the memory` KHÔNG phải lỗi sync.** Đó là WRITE GATE chạy
  đúng (embed đang giữ token). Lỗi thật nằm ở `/sync-status`, và nó bị câu kia che mất.
· **Ổ đám mây ném lỗi GIẢ.** `UNKNOWN` là mã libuv khi Windows đưa mã nó không map nổi. Khối vẫn
  nằm đủ trên kênh dù `appendFileSync` đã ném. Đo trạng thái đĩa, đừng tin lời ngoại lệ.
· **Gate `npm test` chạy song song theo số CPU (12 tiến trình / 113 file).** Nhóm nạp ONNX vì vậy
  lúc thì tràn RAM (máy 15,7 GB), lúc thì dồn vào một tiến trình chạy 11 phút. Chạy gate lúc máy
  còn bận là tự chuốc — đã làm tràn RAM của user hai lần.
· **`.CPU` trong PowerShell đọc lại giá trị SỐNG mỗi lần truy cập** ⇒ `$p.CPU - $p.CPU` luôn ra 0,
  và tôi đã báo nhầm một tiến trình đang chạy là "treo". Lấy hai mẫu vào hai biến rồi mới trừ.
· **Cổng bắt 3 lỗi trong chính bản vá** — lần thử cuối không cắt · `throw` thiếu `cause` · dòng
  `[sync]` đáng giữ nhất bị điều kiện "chỉ giữ khi hỏng" vứt (nó chỉ hiện ở lượt THÀNH CÔNG).

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

## 🆕 Phát sinh 2026-08-07 tối (sau release 1.2.0) — **0 việc mở**

*(Mục "CHẠY 5 FILE TEST CÒN MÙ" đã ĐÓNG 2026-08-15 — gate đầy đủ **670/670 · 0 fail · 0 skipped**,
tức cả 5 file đó chạy thật. Dời nguyên văn sang `archive/05_TODO.md` ngày 2026-08-25 khi audit bắt
được nó vẫn nằm trong sổ: `zemory archive` KHÔNG nhặt được vì nó viết dạng gạch ngang chứ không
phải ô `[x]`/`✅` ở đầu mục. Bài học còn giá trị: **"audit xanh" ≠ "đã soi hết"** — ba lượt audit
07/08 cố ý bỏ nhóm test nhúng để không tranh CPU với job embed, và điều đó phải được NÓI RA.)*
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

## 📋 BẢNG KÊ 2 THÁNG THỬ VIỆC — user giao 2026-08-26

- [ ] **Dựng bảng kê ĐẦY ĐỦ mọi việc user đã làm từ 29/06/2026 → nay**, phủ **cả hệ CŨ lẫn hệ MỚI**.
  Việc này KHÔNG liên quan tới bản thân app zemory — nó là **phép dùng** Global Memory đúng lý do
  hệ này tồn tại (HP điều 1: agent nhớ được việc phiên trước thay vì bắt user kể lại).

  **Nguồn — Global Memory là nguồn CHÍNH, không phải trí nhớ phiên:**
  · `zemory memory search "<chủ đề>" --all` (xuyên project VÀ xuyên máy — kho có 3 host:
    `SS01-IT-12` · `SS01-IT-10` · `DESKTOP-PFB157K`, và cả `chatgpt-web` từ 02/2025).
  · `zemory memory digest <session>` cho từng phiên trong dải ngày — digest là lớp mỏng, đọc
    trước rồi mới đào xuống tin thật bằng anchor (điều 8).
  · Đối chiếu **`06_CHANGES` + `archive/06_CHANGES` của TỪNG repo** — mỗi repo có changelog riêng,
    và `zemory changelog search` phủ cả tầng archive.
  · Git log của từng repo (ngày + tên commit) làm đường đo THỨ HAI cho phần có code.

  **Phạm vi repo đã biết** (rà lại bằng registry, đừng tin danh sách này là đủ): 9 repo `PBI_*`
  (`HR · IC · IT · MKT · OPS · PUR · SALE · SasinFlow_Maintain · SasinFlow_Rebuild`) ·
  `SasinFlow` · `SasinHarvest` · `SasinInfra` · `OpenRCA_3BoysAI` · `zemory`.

  **Ràng buộc khi làm:**
  · **Chia rõ HỆ CŨ vs HỆ MỚI** — user nêu đích danh hai nhóm này.
  · Mỗi mục phải có **ngày + nguồn tra được** (id tin GM · khoá ngày changelog · hash commit).
    Việc không truy được về nguồn ⇒ ghi "chưa xác minh được", KHÔNG bịa cho đủ (điều 12).
  · Đây là **văn bản đưa người đọc** (hồ sơ đánh giá thử việc) ⇒ áp `.claude/skills/write-style/`.
  · Đọc ra file, KHÔNG nhét vào docs harness của zemory — nó không phải tài sản của repo này.
    Hỏi user muốn đặt ở đâu trước khi ghi.

  **Bẫy đã biết:** dải 29/06 → nay nằm vắt qua **nhiều máy**; phiên trên `SS01-IT-10` và
  `DESKTOP-PFB157K` chỉ có trong kho nếu đã sync về — kiểm `memory scope ls` trước khi kết luận
  "tháng đó không làm gì".
