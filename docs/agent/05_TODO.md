<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

## 🔵 BÀN GIAO 2026-08-25 — ĐỌC MỤC NÀY TRƯỚC

**SỔ TRỐNG — 0 mục mở.** Không có việc nào đang dở. Dưới đây là TRẠNG THÁI để phiên sau khỏi đo lại.

### Phiên 24–25/08 đã làm gì (số đo đầy đủ ở `06_CHANGES`, đọc từ `[2026-08-25b]` xuống `[2026-08-24e]`)
Push **2.4.0** rồi **2.5.0** · `uplinkguard` (bundle đã rời máy chưa) · **#13** adapter
`claude-code-memory` (153 fact) · **#12** `zemory memory promote` · cổng **"không biết" mặc định
BẬT** + sàn kích thước · vá 5 lỗ chuẩn thực địa · **gỡ lại luật ⑤** (sai) · thêm `external/` +
pipeline-vào-trong-case cho non-app · **thi hành xuống 14 repo, refactor vật lý 4 repo**.

### Trạng thái máy lúc chốt (ĐO, không nhớ)
- **zemory 2.5.0** trên `origin/main` (`b125975`). Sau đó có **6 file sửa CHƯA commit**:
  `backup-rotate.ts` + test của nó · `03_STRUCTURE` (zemory + app + nonapp) · `06_CHANGES` · `05_TODO`.
- **Gate ĐÃ XANH sau MỌI thay đổi: `803/803 · 0 fail · 0 skipped`** (32 phút, chạy một mình) ·
  `conform` ✓ không lệch chuẩn · `todo verify` ✓ 0 lệch. Tức 6 file kia đã được kiểm, chỉ còn commit.
- Daemon **TẮT** (tắt để chạy gate). Bật lại: `zemory ui --no-window`.
- Kho: **295k tin · 281k vector** · backup 5 bản/10 GB (đúng `keep:5`) · 6 sidecar mồ côi đã dọn.
- **14/14 repo estate đạt chuẩn** (luật + folder + guard glob); `pipelines/` chỉ còn ở
  `PBI_SasinFlow_Rebuild` và đó là ĐÚNG (repo tổ chức theo NGUỒN).
- **KHÔNG commit ở repo nào ngoài zemory** — diff để phiên bên đó xem. Sao lưu:
  `scratchpad/refactor-bak/` · `bak-removed/` · `maintain-bak/` · `launcher-bak/`.

### Việc đầu tiên của phiên sau
1. **Commit 6 file** (gate đã xanh, không phải chạy lại nếu chưa sửa thêm gì). **Hỏi user số
   version** vì lượt này ĐỔI CHUẨN (⑤⑥⑦), không chỉ sửa lỗi — rồi mới push.
2. **`zemory memory scan`** — daemon tắt gần hết phiên nên transcript phiên này chưa vào GM đủ.
3. Bật lại daemon.

### Bẫy đã trả giá — đừng dẫm lại
· **Escape gạch ngược qua heredoc→python: DÍNH 6 LẦN.** `\n` thành xuống dòng thật · `\a`/`\05`
  thành bell/octal · `\x00` thành NUL · `\v` thành 0x0B. Cách đúng: dựng bằng `chr(92)`, hoặc sửa
  bằng công cụ sửa file, **rồi quét lại dải điều khiển**. Phiên PBI_OPS cũng dính y hệt.
· **Banner nền báo "exit 0" mà gate CHƯA HỀ CHẠY** (preflight chặn vì daemon đang embed) — và một
  lần khác banner "exit 0" trong khi log ghi `fail 2`. **Chỉ tin số trong log.**
· **`skipped` KHÔNG phải `pass`** — daemon tự bật lại làm `skipIfBusy` bỏ qua đúng 2 ca cần kiểm.
· **Đột biến trượt regex ⇒ test vẫn xanh** = xanh GIẢ. Phải kiểm đột biến CÓ ÁP ĐƯỢC không.
· **`| Select-Object -First N` cắt pipeline ⇒ node ăn EPIPE ⇒ exit −1 giả.** Dùng `-Last` hoặc `cmd /c`.
· **Ghi file qua tầng text (`utf-8-sig`) làm thêm BOM + đổi line-ending** ⇒ diff phình 2→37 dòng.
  Sửa file người khác thì ghi ở mức **BYTE**.

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
