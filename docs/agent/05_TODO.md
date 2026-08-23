<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

## 🔵 BÀN GIAO 2026-08-24 — ĐỌC MỤC NÀY TRƯỚC

**VIỆC ĐẦU TIÊN của phiên sau — user chốt 2026-08-24, chạy theo ĐÚNG thứ tự:**
1. **PUSH 2.4.0** (user đã chốt số): kiểm cây sạch (gate lượt cuối **777/777 · 0 fail · 0
   skipped**, `conform` ✓, `validate` 0 vượt trần) → bump `package.json` 2.3.0→2.4.0 → commit
   (5 commit cũ + toàn bộ 2 ngày công việc) → cờ `.allow-push` một-lần → push.
2. **ÁP CHUẨN 8 REPO — MỘT LẦN** (mục dưới): từng repo `zemory sync` → `zemory hook guard` →
   `zemory doctor`; báo bảng kết quả. Từ đó về sau các repo TỰ NHẬN qua chấm than update.
3. **Cổng "bundle đã rời khỏi máy"** (user gật 24/08 — mục dưới).
4. **#13 ingest bộ nhớ CURATED** trước, rồi **#12 memory promotion** (cặp 2.5).

**Trạng thái máy lúc chốt (đo thật):** daemon **pid 22572 · 2.3.0 · --no-window** · 4 công tắc
`autostart/autosync/scheduler/realtime` **đều BẬT** · kho **289.886 tin · 2.339 phiên · 2.321 MB ·
schema v22** (trigram nay phủ `tool_result`) · vector 274.564 · remaining 2.098 (scheduler tự lượm)
· Drive pending 583, lastPush 23/08 18:39 · **5 commit chưa lên remote + 56 file đang sửa (CHƯA
commit — phần của mốc 2.4.0)** · backup trước migration v22 còn ở `data/backups/`.

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

- [ ] **① CỔNG "KHÔNG BIẾT" — lỗ lớn nhất còn lại, và độc lập model.** Đo lại hôm nay ở **cả 4 ô**:
  **0/18 ca âm bị chặn · 40,0 kết quả/câu · điểm đầu 0,0289–0,0292** (ngang ca dương) ⇒ hệ trả 40 kết
  quả tự tin cho câu nó KHÔNG có đáp án. `plan/17 §1.3` đã trượt cổng với `θ+margin` (chặn 5/8 + 4/10).
  **Nợ chặn nó đã bớt một nửa:** §4.2 đòi lớp nhãn `keyword` — nay **12 → 23 nhãn**. Còn §4.1 (bộ âm
  GIỮ RIÊNG rộng hơn). Hướng chưa thử: chấm bằng **ĐỘ ĐỒNG THUẬN giữa ba lane** thay vì khoảng cách
  riêng lane vector.
## 📌 Việc còn MỞ tách ra từ các khối đã đóng (tách 2026-08-23 lúc chốt phiên)

> Bốn mục dưới đây nằm LẪN trong ba section `## ✅` đã xong. Archive cả khối là **nuốt việc**, nên
> tách ra đây rồi mới dời phần đã xong đi. Ngữ cảnh gốc của từng mục vẫn tra được ở
> `archive/05_TODO.md` (`zemory plan search`).

- [ ] **ÁP CHUẨN MỚI LÊN TOÀN BỘ REPO CŨ — MỘT LẦN, SAU KHI REPO NÀY HOÀN CHỈNH (user chốt 2026-08-24).** Điều kiện chạy: sổ này dọn xong + bản 2.4 đã push. Khi đó chạy cho CẢ 8 repo một lượt: `zemory sync` → `zemory hook guard` → `zemory doctor`. Từ đó về sau các repo TỰ NHẬN mọi thay đổi qua chấm than update (tem kênh chung + `zemory selfupdate` + hook nhắc 1 lần/phiên) — không phải áp tay lại nữa. *(Gộp luôn mục "báo các repo sinh lại guard" — cùng một chuyến.)*
  gap-fill file thiếu) → `zemory hook guard` (2 đợt vá 20/08: PowerShell + `.git/`-path + `*.env`) →
  `zemory doctor` (tự kêu nếu guard còn lỗi thời). Repo CÙNG máy làm được NGAY (CLI là junction);
  máy kia chờ push. ⚠ 2 dòng đăng ký skill (`04_SKILLS`+`AGENTS`) sync KHÔNG tự thêm (file-wins) —
  `conform` bên đó sẽ nhắc, agent bên đó tự thêm. Không tự sang sửa (`02_RULES §Phạm vi`).

## 🆕 Phát sinh 2026-08-07 tối (sau release 1.2.0) — 4 việc

  ✅ **ĐÃ CHẠY 2026-08-15** — gate đầy đủ **670/670 pass · 0 fail · 0 skipped**, tức 5 file đó
  đều chạy thật (không ca nào bị `skipIfBusy` bỏ qua).
  ~~**CHẠY 5 FILE TEST CÒN MÙ sau khi embed xong:** `embed` · `rerank` · `vectors` ·~~
  `memory-search` · `digest`. Ba lượt audit hôm nay CỐ Ý bỏ chúng để không tranh CPU với job
  embed (đo thật: bench chạy song song làm embed tụt về 0 chunk/30 s). Ghi ra đây để **không ai
  đọc "audit xanh" thành "đã soi hết"** — vùng này chưa được soi trong cả ba lượt.
  Chạy CÙNG DỊP hai lượt bench, không cần lượt audit riêng.
- [ ] **(ĐỪNG "dọn cho đẹp") Index lưu đường theo separator của OS**, không phải posix: 23 doc
  row của repo này đều dạng `docs\agent\…`, và mọi chỗ TRA cũng ghép bằng `join`. Đợt vét 07/08
  từng "chuẩn hoá" sang `/` và hậu quả đo được: `plan ls` im lặng báo "index rỗng" dù chỉ mục
  đủ, và lần `reindex` sau sẽ đẻ doc row TRÙNG. Chuyển sang posix là một **MIGRATION riêng**
  (phải đổi cả index cũ + mọi chỗ tra trong cùng bước), không phải việc dọn dẹp lẻ.

## 📌 Cowork — còn treo

- [ ] **(USER GẬT 2026-08-24 — làm phiên sau) Cổng "bundle ĐÃ RỜI KHỎI MÁY chưa", đừng chỉ kiểm "đã ghi file".**
  Sự cố 2026-08-11: client đồng bộ kẹt hàng đợi ⇒ bundle nằm im trong thư mục Drive, **hai gói
  317 MB kẹt từ 08/08 (3 ngày)** và bản bàn giao 1,63 GB cũng vậy — trong khi `memory sync` lần nào
  cũng báo "đã xuất" thành công. Máy kia không nhận được gì suốt thời gian đó và **không cổng nào đỏ**.
  **Đo được bằng máy:** sổ của client giữ hàng đợi thao tác + định danh mục; mục chưa lên mây mang
  định danh **cục bộ** (tiền tố `local-`) và **kích thước phía máy chủ = 0**. Đề xuất: thêm một check
  cạnh `storage-safety`/`cloudguard` — bundle mang định danh cục bộ quá N phút ⇒ **báo đỏ**, kèm số
  mục đang kẹt và mục cũ nhất. Cùng doctrine "máy canh, đừng dựa agent nhớ".
  ⚠ **Ràng buộc:** chỉ ĐỌC sổ của client, tuyệt đối không sửa/xoá trạng thái của nó; và phải chịu
  được ca không tìm thấy sổ (fail-open — điều 9), vì đường dẫn/định dạng của client có thể đổi.
  *(Bài học kèm theo: dấu `user-paused` và dòng "Syncing is paused" trong nhật ký client **KHÔNG**
  đủ để kết luận đang bị dừng — tôi đã kết luận sai từ đúng hai dấu hiệu đó, trong khi hàng đợi vẫn
  tự rút hết sau khi khởi động lại client. Thứ đáng tin là **hàng đợi + định danh**, không phải chữ
  trong log.)*
## Quyết định mở / cần chốt
- [ ] **(Ý tưởng user 2026-07-23) Zemory tự đổi model/agent Claude theo việc lớn·nhỏ để tiết kiệm chi phí.** *(Soát 2026-08-02 — tiền đề đã đổi: điều 6 nay là "**HẠN CHẾ** gọi LLM" (`2026-08-02b`), KHÔNG còn "KHÔNG BAO GIỜ". Vế **không proxy model API** thì GIỮ NGUYÊN, mà model-routing đúng là chạm vế đó ⇒ vẫn cần user chốt, nhưng lý do chặn hẹp hơn trước.)* Đây là đổi BẢN CHẤT zemory (bộ nhớ thụ động → lớp điều khiển agent), không phải chi tiết nhỏ. User đã chọn: CHỈ ghi ý tưởng, KHÔNG code, chờ chốt hiến pháp trước khi làm gì tiếp. 3 hướng đã trình: (a) sửa hiến pháp mở khe cho model-routing (thay đổi tầng cao nhất) · (b) để CLI/agent tự quản (Claude Code đã có setting chọn model riêng, zemory không đụng vào) · (c) (chưa trình) zemory chỉ ĐO/GỢI Ý tín hiệu độ lớn task (vd token ước tính, số file đụng) qua UI/API cho AGENT tự quyết — vẫn 0-LLM vì zemory không tự gọi/đổi model, chỉ cung cấp số đo.
## Phase 2 — Năng lực nặng
- [ ] **Memory promotion (episodic → curated learned-rule) — Ý TƯỞNG rõ (2026-07-18):** episodic memory đã bắt HẾT correction/decision qua các phiên → **nguyên liệu thô đã sẵn trong zemory**. THIẾU cái CẦU: zemory tự **phát hiện correction/decision LẶP LẠI** trong episodic → **ĐỀ XUẤT** nâng thành **memory-luật bền** (constitution/rules/1 memory doc) — **có review, user duyệt, KHÔNG auto-summary thành nguồn thứ hai** (điều 3). Cơ chế hình dung: quét episodic tìm pattern lặp (theme/correction) → xếp hạng theo tần suất → trình user *"correction X lặp N lần, nâng thành rule?"* → user gật mới ghi. Hiện đang để Claude-Code `memory/` gánh TAY. **Đây là "gap thật" duy nhất so với harness pattern 3-trụ** (trụ ② memory); trụ ③ (subagent/critic) zemory CỐ TÌNH bỏ (điều 6 — agent tự orchestrate, Claude auto-spawn subagent rồi).
- [ ] **(user nêu 2026-07-23 — ĐỀ XUẤT capability mới) Quét & ingest BỘ NHỚ CURATED của agent** (Claude Code `~/.claude/projects/<proj>/memory/*.md`+`MEMORY.md`; Codex/Cursor tương tự). **Bổ trợ TRỰC TIẾP** memory-promotion ở trên: thay vì zemory TỰ chưng cất (rủi ro auto-summary — điều 3/6), **ingest cái agent ĐÃ chưng cất sẵn** = fact cao-tín-hiệu, 0 LLM. Là adapter capture MỚI (như web-capture): đọc thư mục memory của host → ingest **read-only** (KHÔNG ghi ngược — điều 3/10) · stamp provenance riêng (`source=<agent>-memory`, `kind=curated` — tách lane khỏi episodic transcript, scope-tree lọc được) · **redact lúc ingest** (điều 7) · dedup + re-ingest khi file đổi (source_sig, giống scanweb full-replace) · recall xếp cao hơn (đã distilled). **Cần chốt:** ① `kind=curated` cột mới hay origin lane? ② map path Claude `<url-encoded-proj>` → project · global `CLAUDE.md`/`MEMORY.md` gắn `--all` · ③ adapter nào trước (Claude Code có cấu trúc rõ nhất). Ghi episodic vẫn giữ; đây THÊM lớp curated-external.
