<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

## 🔵 BÀN GIAO 2026-08-24 — ĐỌC MỤC NÀY TRƯỚC

**Kế hoạch user chốt 2026-08-24 ("chạy toàn bộ") — ①② ĐÃ XONG 24/08 (xem `06_CHANGES
[2026-08-24e]`), còn lại theo thứ tự:**
1. ~~PUSH 2.4.0~~ ✅ (commit `4761125`, gate 777/777, đã lên `origin/main`).
2. ~~ÁP CHUẨN 8 REPO~~ ✅ (thực đo 9 repo stale, cả 9 xong; `/harness-updates` trả `stale: []`).
3. ~~Cổng "bundle đã rời khỏi máy"~~ ✅ (`uplinkguard` — 9/9 test, đột biến 2 hướng đỏ, chạy
   thật khớp chéo; xem `06_CHANGES [2026-08-24f]`).
4. ~~#13 ingest bộ nhớ CURATED~~ ✅ + ~~#12 memory promotion~~ ✅ (`zemory memory promote`,
   chạy thật ra 15 đề xuất — xem `06_CHANGES [2026-08-24g]` + `[2026-08-24h]`).
5. **Cổng "KHÔNG BIẾT"** (⭐ bên dưới) — đợt đo riêng trên bản sao, đề xuất đã được user gật
   ("còn lại làm theo đề xuất", cuối phiên 23–24/08).

**Trạng thái máy sau mốc 2.4.0 (đo 24/08):** daemon **pid 9500 · 2.4.0 · --no-window** · 4 công
tắc `autostart/autosync/scheduler/realtime` **đều BẬT** · cây git SẠCH, đồng bộ `origin/main` ·
backup trước migration v22 còn ở `data/backups/`.

**Phiên 23–24/08 làm gì** (số đo: `06_CHANGES [2026-08-23d]`→`[2026-08-24d]`): luật §Sổ việc
(cửa VÀO + cửa RA, ship 4 bộ template) · chấm than update CẤP MÁY (tem `version.json` trên kênh
chung + `zemory selfupdate`) · `/memory-status` sang tiến trình con (**chứng minh: lạnh 17,66 s
mà `/ping` 0,03 s**) · `doctor` 3 mức backup · cờ lạ trên `embed/scan/digest` bị từ chối ·
**migration v22** trigram nhận lại `tool_result` (A/B trên bản sao: MRR lớp đó 0,060→0,167, prose
y nguyên, giá +262 MB/+23 % độ trễ — user chốt) · cổng vòng-khép-kín cửa sổ phụ (ca 717) · guard
xoá quét theo SEGMENT · cổng nội dung `policy.json` cowork · cổng quét LỊCH SỬ git · `--no-window`
· ô "cách nói khác" (chỉ hiện khi Tìm sâu) · graph thấy import động · **tổng dọn sổ 89 mục → 7**.

⚠ **Bẫy đã trả giá phiên này — đừng dẫm lại:**
· **PowerShell gọi QUA bash ⇒ `$p` bị bash nuốt ⇒ kill "thành công" GIẢ** — thao tác tiến trình
  đi thẳng tool PowerShell, đừng lồng trong bash.
· **Test xanh vì lý do khác, HAI lần:** kho `.db` rỗng làm lệnh chết trước khi tới chốt ·
  `skipIfBusy` thiếu `await` làm mọi ca thoát 26 ms. Chữa: đối chiếu THỜI GIAN CHẠY với công việc
  đáng lẽ phải tốn (đã thành luật đo ③, `02_RULES §Hành xử`).
· **Escape trong TEMPLATE LITERAL thiếu một lớp ⇒ guard.cjs sinh ra VỠ SYNTAX, chặn TẤT** — lộ
  ngay vì `rm build.log` cũng bị chặn; sửa gì trong `guard-gen.ts` phải `node --check` bản sinh.
· **Hai gate `npm run check` chạy CHỒNG nhau ⇒ vectors.test OOM đỏ giả** — gate chạy MỘT MÌNH.
· **Thông báo nền báo "exit 0" trong khi log ghi fail** — chỉ tin số trong log, không tin banner.


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
