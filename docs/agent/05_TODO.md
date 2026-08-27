<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

## 🔵 BÀN GIAO 2026-08-27 — ĐỌC MỤC NÀY TRƯỚC

**1 mục mở** (§Bộ tool điều khiển, cuối khối này). Dưới đây là TRẠNG THÁI đã ĐO.

### Phiên này làm gì (số đo: `06_CHANGES [2026-08-27]` · thiết kế: `plan/20`)
**Phát hiện lớn: Cowork ĐỌC ĐƯỢC kho chung qua MCP.** Vế cũ *"Cowork không dùng được MCP"* nằm
trong code là SAI, và nó sai vì **một lỗi đường dẫn**: bản Claude Desktop cài từ Microsoft Store
(MSIX) chuyển hướng AppData, nên `setup mcp` dò ở `%APPDATA%\Claude\` thì thấy trống và báo
"chưa cài" trên chính máy đang chạy Desktop. Từ lỗi đó đẻ ra cả một bộ template riêng cho máy ảo.
- Vá `mcpsetup.ts` (glob tiền tố `Claude_`, ưu tiên trước `%APPDATA%`) + `harness.ts`.
- Nắn `cowork_global_memory/BOOTSTRAP.md`: §0 tự cài Node/git thay vì bỏ cuộc · §4 hỏi nguồn +
  `scan-web` · §4b `embed` BẮT BUỘC · **§5b nối MCP + nghiệm thu** (trước thiếu hẳn).

### Trạng thái máy lúc chốt (ĐO)
- **zemory 2.7.2**. Gate đầy đủ gần nhất **835/835 · 0 fail · EXIT=0** (chạy trước khi sửa docs).
- Kho local **~304k tin**. Desktop đã nối MCP: config ở
  `…\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json`
  (có `.bak-20260827-001214` để lùi).
- Đã commit + push trong phiên (xem `git log`).

### Việc đầu tiên của phiên sau
**Dựng bộ ba tool điều khiển zemory qua MCP** — user chốt khung: *"mọi chức năng đã có sẵn trên
zemory hết rồi, MCP chỉ là điều khiển và quản lý"*. Không đẻ chức năng mới, chỉ mở cửa:

- [ ] `memory_scan { deep?, web?, platform? }` — gọi `scan()` + `scanWebPlatforms()` sẵn có; trả
      số phiên/tin, hoặc `need-login` (đừng đứng im, phải nói cửa sổ đang chờ).
- [ ] `memory_embed {}` — **khởi động rồi TRẢ NGAY**, không chờ. ~58 tin/phút nên 1.000 tin ≈ 17
      phút; lời gọi MCP không sống tới đó.
- [ ] `memory_jobs {}` — zemory đang làm gì · còn bao nhiêu chờ nhúng · ai giữ khoá · daemon sống
      không. Bốn nguồn ĐÃ CÓ: `vectorRemaining` · `schedulerChildRunning` · `syncJobRunning` ·
      `cliWriteHolder`. Đây là tool đáng giá nhất — chính phiên này đã phải tự đi đo tay ba lần.

Cả ba đi qua write-gate; đang có job khác ghi thì trả *"đang bận"* thay vì tranh khoá.

### Bẫy đã trả giá trong phiên này — đừng dẫm lại
· **ĐỌC KỸ MỤC ĐÍCH TRƯỚC KHI BÀN GIẢI PHÁP.** Tôi hiểu sai bối cảnh bộ cowork **ba lần** (tưởng
  dựng trong máy ảo · tưởng máy đích đã có zemory · tưởng người dùng phải tự cài Node) trong khi
  chính file ghi rõ *"để agent đọc và thi hành"* và đối tượng là **người không rành kỹ thuật**.
· **Một dòng khẳng định sai sống lâu hơn bug.** *"Cowork không dùng được MCP"* viết cùng lúc với
  lỗ đường dẫn, không ai thử lại, và nó lái cả một kiến trúc đi sai suốt 3 tuần.
· **Bản MSIX chuyển hướng AppData** — mọi phép dò cấu hình app Store phải tính tới
  `%LOCALAPPDATA%\Packages\<gói>\LocalCache\Roaming\`.
· **Preflight chặn gate khi daemon đang chạy job** — tắt daemon trước `npm run check`, và nhớ
  daemon **tự bật lại** theo autostart.

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
