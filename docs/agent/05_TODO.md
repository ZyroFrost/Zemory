<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

## 🔴 BÀN GIAO 2026-08-29 — ĐỌC TRƯỚC

**Trạng thái lúc chốt (ĐO):** zemory **2.10.0** đã push (`0e0f322`), cây sạch. Gate đầy đủ 890/890 · conform ✓ · phục hồi
backup ok (đo trước hai đợt UI cuối; hai đợt đó chạy cổng vùng đụng 49–62/… xanh, chưa chạy gate đầy đủ lại — **phiên sau:
tắt daemon → `npm run check`** như thường lệ). Kho v25 · 2.729 phiên · 317.969 tin. **DESKTOP-PFB157K còn bản cũ** — bên
đó: bấm chip cập nhật (xanh/cam ở chân rail) → *Cập nhật ngay*, hoặc `zemory selfupdate`. Khe `chatgpt` main là vỏ rỗng
(khe 2 mới sống) — vô hại, dọn khi tiện. Chi tiết mọi việc đã làm: `06_CHANGES [2026-08-29]` + `[2026-08-29b]`.

*(Ba mục bàn giao 28/08 đã ĐÓNG 2026-08-29 — xem `06_CHANGES [2026-08-29]`: "hai cửa sổ" gốc là probe đóng
tab lúc đăng nhập · tài khoản công ty `huy.nguyen@sasin.vn` đã nối ở khe main, zyrofrost ở khe 2.)*

### Một đề xuất ĐÃ TRÌNH, user CHƯA gật — không tự làm, không phải việc mở
Lọc "phiên bấm nhầm" (vài ký tự · chat sai phiên): đề xuất luật cơ học gắn cờ `junk` (KHÔNG xoá) + agent đang chạy
duyệt như `promote`, không LLM trong lõi (HP điều 6); bước đầu là ĐO đếm ứng viên trên 2.771 phiên, chưa viết gì.
*(Ba đề xuất còn lại — trang "✓ Đã liên kết" · xoá 3 profile trống · gộp 3 root đổi tên — user gật 2026-08-29 và đã
làm, xem `06_CHANGES [2026-08-29]`.)*

## 🔵 BÀN GIAO 2026-08-27 (phiên tối) — ĐỌC MỤC NÀY TRƯỚC

**5 mục mở**: 2 việc user GIAO cho phiên sau (bàn kỹ rồi mới làm) + 3 tool MCP. Trạng thái dưới đây là ĐO.

### Hai việc USER GIAO 2026-08-27 — CHƯA BÀN CHI TIẾT, phiên sau bàn trước rồi mới đụng
- [ ] **Đặt tên chuẩn lại các bộ `docs_template/`** theo prefix số (`01_` · `02_` …) và tên đúng chuẩn —
      hiện 5 bộ tên rời (`app` · `nonapp` · `adapt` · `cowork` · `cowork_global_memory`). Nguyên văn user:
      *"đặt tên chuẩn lại các bộ template, phân theo số prefix 01_ 02_ này kia … chi tiết qua session sau
      sẽ bàn rõ"*. Đụng: `adopt.ts` (`TEMPLATE_DIR` + profile → thư mục), `standard-parity`/`template-parity`
      test, `04_SKILLS`/`AGENTS` trỏ đường, bootstrap cowork.
      **User nhắc lại 2026-08-28 tối** (*"cái này cũng cần làm"*) — vẫn mở, vẫn 5 bộ tên rời trên đĩa.
      Chưa bàn được hôm nay vì cả phiên dồn cho panel Nguồn + tự kéo web; phiên sau mở bằng câu hỏi
      SƠ ĐỒ TÊN trước (số thứ tự theo gì: theo loại project · theo mức độ · theo thứ tự đọc?).
- [ ] **Cấu trúc lại TÊN + BỐ CỤC toàn bộ folder phòng ban** — user nghĩ theo hướng `Agent_FIN` · `Agent_IT`…
      thay `PBI_*`, và *"phân lại toàn bộ cấu trúc folder"*. Nguyên văn: *"việc này cũng sẽ bàn với session
      mới"*. Đụng registry project của daemon (16 đường tuyệt đối), `project_root` trong kho (recall theo dự
      án), graph cache, `docs/.harness.json` từng repo. Là việc đổi tên hàng loạt ngoài repo ⇒ `02_RULES
      §Phạm vi project`: từng bước hỏi trước.

### Phiên này làm gì (số đo: `06_CHANGES [2026-08-27b]` · plan `08 §8b` · `18 §4`)
Audit 11 mặt → 3 lỗ blocking vá xong (con maintain chạy mù · kênh thiếu 16.405 vector · bản trùng NULL) ·
**schema v23 `vec_shipped`** · gate chạy trong **lồng Job Object 4 GB + ưu tiên thấp**, 12 file nặng từng ca
một tiến trình (7 phút thay 42). Commit `2993d77` + phần gate/2.8.0 (xem `git log`).

### Trạng thái máy lúc chốt (ĐO)
- **zemory 2.8.0** (bump, chờ push). Gate trong lồng: **845/845 · 0 fail · 537 s**; đỉnh cả cây chạm 4.096 —
  đang đo đỉnh từng ca để biết ca nào sát mép (`memory-privacy` · `vecship-chunks` · `vector-write-atomic`).
- Kho local **308.014 tin · 2.626 phiên**, schema **v23**, `vec_shipped` 283.766. Kênh Drive: 2 khối (baseline
  DESKTOP 1,8 GB + khối bù 49 MB), dry-run bù **thiếu 0**. **DESKTOP-PFB157K còn 2.7.0** — pull + build bên đó,
  kho nó mang 10.271 bản trùng NULL (merge bên nhận nay khử được).
- Daemon: phải **tắt** khi chạy gate (preflight chặn); bật lại bằng `wscript …\Startup\zemory.vbs`.

*(Mục "Bộ ba tool điều khiển qua MCP" đã ĐÓNG 2026-08-28 — `memory_jobs` · `memory_scan` ·
`memory_embed` ship đủ, 17 tool trên bề mặt MCP. Xem `06_CHANGES [2026-08-28]`. Hai vế của
thiết kế gốc phải SỬA khi làm, giữ lại vì chúng là bài học: ① `schedulerChildRunning`/
`syncJobRunning` là biến trong bộ nhớ DAEMON nên tiến trình MCP đọc luôn ra `false` — phải hỏi
qua `/automation`, và daemon im thì trả `unknown` chứ không trả `false` · ② `vectorRemaining()`
đo được **15,7 s** trên kho thật nên không đặt được ở đường mặc định — đọc cache của daemon
(107 ms), `deep:true` mới đếm thẳng.)*

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
· **(tối) Bộ đo `Get-Process node | Measure-Object -Sum` NHIỄM** worker của file trước chưa thoát — báo 1,9 GB
  cho file thật 58 MB. Đo RAM từng file/ca chỉ tin `gate-cage.ps1` (Job Object đếm đúng cây).
· **(tối) Tắt arena ONNX làm RAM phình NHANH HƠN** (12 GB/125 s vs 6 GB/18 phút) — knob nghe hợp lý, đo ra sai hướng.
· **(tối) Escape inline (`node -e`, heredoc) nuốt backslash → regex thành byte thô, script đột biến chết lúc nạp**
  mà đầu ra bị `tail` cắt nên tưởng đã vá. Vá nhiều dòng = Write script ra file rồi `node <file>`.
· **(tối) Cổng partition soi CHỮ trong test bắt oan 11 file** chỉ *nhắc* API graph; phải đối chiếu **số đo** —
  nay có `LIGHT_DESPITE_MATCH` kèm MB, cổng canh ba chiều.

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
