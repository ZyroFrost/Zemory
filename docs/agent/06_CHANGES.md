<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-02h] — Nạp bộ nhớ chuyển sang PER-MESSAGE · đồng hồ context · lưới sau khi nén

> 🔄 **Supersede:** thay [2026-07-30d] — "daemon KHÔNG hề scan" — ở phần NHỊP: chuỗi nền
> vẫn còn nhưng thôi làm đường nạp chính. User chốt: *"nhịp 10' là lần đó chưa xét kỹ — mỗi
> 1 mes phải tự đưa lên luôn mới đúng"*.

- **Vì sao đổi (số, không phải cảm tính):** poll trả tiền theo THỜI GIAN — 6 lần scan/giờ kể
  cả máy rảnh, 1,8–7,2s/lần — và vẫn trễ tới 10 phút. Hook trả theo CÔNG VIỆC: không tin thì
  0 chạy, có tin thì **~320ms** cả tiến trình (việc thật 5–71ms). Rẻ hơn, lại tươi hơn.
- **`scanOneFile`** nạp đúng MỘT transcript từ `transcript_path` của host, bỏ hẳn khâu
  discover. Không nhận diện được đường ⇒ trả "không nhận", **KHÔNG** lặng lẽ rơi về quét cả
  kho. Write-gate bận ⇒ bỏ qua ngay (chờ là ~125s/lượt), lưới bù lượm.
- **Bốn móc, mỗi cái một vai:** `Stop` nạp mỗi lượt · `UserPromptSubmit` im tuyệt đối tới
  95% rồi **chốt sổ + cảnh báo MỘT lần/phiên** · `PreCompact` nạp nốt trước khi nén ·
  `SessionStart` **chỉ** nói khi `source=compact` — auto-inject đầu tiên của hệ: một thẻ
  795 B, đúng sự kiện agent vừa mất trí nhớ, không phải memory mỗi prompt (điều 8).
- **Scheduler teo thành LƯỚI BÙ** (10' → 30'): embed · digest sweep · quét vét nguồn không
  hook · poll chiều import. Drive giữ nguyên nhịp 30' hai chiều theo user chốt.
- **Ba lỗi THẬT bắt được lúc chạy bề mặt sống, không phải khi đọc code:** ① hook hét
  **"Context ~295%"** (transcript ghi `claude-opus-5` ⇒ tính theo 200k trong khi phiên chạy
  1M) — nay `windowFor` **tự sửa**: phiên không thể vượt cửa sổ của chính nó nên số >100% là
  bằng chứng giả định sai ⇒ nâng bậc; vượt cả bậc cao nhất ⇒ IM thay vì hét bậy. ②
  `readStdin` cắm `setTimeout(800)` **không `unref`** ⇒ mỗi lần gọi hook chờ thừa 800ms. ③
  `memory_doctor` gọi thật mất **48s** ⇒ tách cờ `deep` (lượt nhanh **186ms**, khai `notProbed`).
- **CLI tách lối tắt cho `hook`** (nạp động) — 400ms → **232–320ms**; lệnh khác giữ đường cũ.
- **F1/F4 của audit sáng nay** xử luôn: doctor probe đúng thứ nó hứa · gom 5 bản so-path về
  `core/config::projectKey` (`graph-memory` CỐ Ý giữ riêng: id node dùng `/`, đã ghi rõ).
- **Một test của tôi XANH GIẢ, tự bắt bằng đột biến:** F1 chỉ soi CHỮ trong source nên gỡ
  hẳn hai key khỏi vòng probe vẫn xanh — viết lại thành kiểm hành vi.

- **Cảnh báo là một lần mỗi CHU KỲ ĐẦY, không phải mỗi phiên** (user hỏi "lâu lâu bị nén dù
  chưa tới hạn" ⇒ đo 30 lần nén thật trên máy: **27 auto · 3 manual**; p50 nén ở
  **1.000.183** token nhưng có ca auto ở **711.803** và thấp nhất **342.068**; **7/19 phiên
  bị nén >1 lần**, cá biệt **6 lần**). Vậy hai điều: ① ngưỡng 95% KHÔNG phải lưới duy nhất —
  `PreCompact` chạy cho cả nén tay lẫn nén tự động nên không phụ thuộc lúc nào nổ; ② cờ
  "đã cảnh báo" nay được XOÁ khi nén, nếu không thì từ lần nén thứ hai trở đi im lặng.

Gate 462 → **475** · `conform` ✓ · đột biến realtime **8/8** đỏ, F1 **2/2**, F4 (phải gỡ cả
hai cơ chế mới đỏ — chúng dự phòng nhau).

## [2026-08-02g] — Chạy engram THẬT (v1.20.0) rồi mới so — hai chỗ hôm nay tôi đo sai

> 🔄 **Supersede:** thay [2026-08-02e] — "Soát sổ: 6 mục chưa làm thực ra đã xong · 3 tiền đề
> sai" — ở đúng một gạch đầu dòng: số tool của engram và chuyện họ có pin hay không.

Tải bản phát hành windows_amd64 (**khớp checksum công bố**), chạy trong HOME sandbox, bơm
JSON-RPC vào `engram mcp` — đúng phép thử đã dùng cho zemory và cho CALM (`plan/13 §9`). Xong
xoá sạch binary + sandbox.

- **Sai 1 — "20 tool": binary trả 22**, có cả `mem_pin`/`mem_unpin` (`DOCS.md` của họ liệt kê
  thiếu). Tôi lấy TÀI LIỆU bên thứ ba làm phép đo rồi gọi là "đo lại". **Sai 2 — "họ không có
  pin": có** ⇒ ⑤ là bám kịp, không phải đi trước. Sổ cũ ghi 22 là đúng.
- **⑥ thì zemory đi trước THẬT, bằng chứng là README của họ:** *"Engram's MCP transport is
  **stdio only** — there is no HTTP or network MCP endpoint."* `serve :7437` là REST cho plugin
  OpenCode/Pi (đo: `/health` 200 · `/mcp` **404**). Ghi chú Docker tôi viết cho `mcp --http`
  trùng điều họ tự thú: loopback ⇒ container không với tới.
- **Lời dặn, đo cạnh nhau:** cùng dùng marker; chạy **3 lần** + chèn chữ user vào giữa ⇒ cả hai
  **1 khối, chữ user còn**. Khác cỡ: engram **3.873 B** (ép gọi `mem_save` sau mỗi việc) ·
  zemory **1.289 B** (chỉ dạy lúc nào ĐỌC). Mô tả có "khi nào gọi": engram **10/22** · zemory **12/12**.
- **Mô hình khác nhau — vòng ghi–đọc:** engram tìm trước khi ghi = *No memories found*, phải
  `mem_save` mới thấy; zemory cùng lúc có sẵn **1.271 phiên · 196.894 tin**, agent **không gọi
  lệnh ghi nào**. Cỡ một kết quả: engram 540 B · zemory 454 B/hit.
- **Ba agent ta chưa khai được thì họ khai được**, và giờ biết hình dạng: `codex` → `config.toml`
  + file chỉ dẫn · `opencode` → plugin `.ts` 21 KB · `pi` → npm. Khoảng cách là thật.
- **Lỗi SỐNG bắt được lúc tra lại sổ vừa ghi:** `changelog search "x" --limit 3` tìm chuỗi
  `"x 3"` (và `plan search` y hệt) — **cùng họ lỗi đã vá sáng nay cho `memory search`, khác bề
  mặt**. Nay dùng chung `positionalArgs`; gate `docs-search-flags` 4 test, đột biến 2 hướng đỏ.

Gate 458 → **462** · `conform` ✓.

## [2026-08-02f] — MCP 8 → 12 tool: đóng hết sáu khoảng trống so với engram

Sáu mục `05_TODO` ghi từ đợt đối chiếu sáng nay, làm trọn trong một lượt.

- **① Lời dặn cài CÙNG `setup mcp`** — khai server chỉ cho agent *có* tool; thứ quyết định nó
  có *gọi* hay không là lời dặn trong file chỉ dẫn thường trực (Cursor `.mdc` kèm
  `alwaysApply` · Windsurf `global_rules.md` · Gemini/Antigravity `GEMINI.md` · Qwen · Kiro).
  Khối có **marker hai đầu** ⇒ chạy lại THAY đúng khối cũ, không đẻ bản thứ hai, không đụng
  chữ user; marker mở-mà-không-đóng thì **DỪNG, không đoán chỗ kết thúc**. Claude Code/Desktop
  cố ý KHÔNG chèn: `AGENTS.md`/`CLAUDE.md` là tài sản harness, và lời dặn đã nằm ở mô tả tool.
- **② `memory_conflicts` — KHÁC engram có chủ đích.** `mem_judge`/`mem_compare` của họ GHI phán
  quyết vào kho; zemory chỉ **ghép cặp nghi ngờ** (cùng chủ đề · có dấu hiệu quyết định · cách
  xa nhau về thời gian) rồi giao agent phán — đúng thứ tự điều 6 (①script → ②agent liên kết) và
  không đổ suy luận ngược vào lớp dẫn xuất (điều 3). Trả thẳng `CANDIDATES ONLY`.
- **③ `project_merge`** tự tìm nhóm bị tách (`D:\` vs `d:\` · gạch cuối), **mặc định dry-run**,
  `apply=true` mới ghi, **không xoá dòng nào** — `cwd` gốc giữ nguyên để truy ngược.
- **④ `memory_doctor`** probe engine THẬT (không đọc công tắc) · **⑤ `session_pin`** dùng cột
  RIÊNG `sessions.pinned` (**schema v20**), lấy bằng truy vấn riêng nên phiên ghim **không tuột
  khỏi cửa sổ 400 dòng** dù rất cũ · **⑥ `zemory mcp --http`** (4445), cùng bộ tool với stdio
  (**gate parity**), guard loopback dùng CHUNG một bản với daemon UI (`util/loopback.ts`).
- **Nói thẳng giới hạn ⑥:** bind loopback nên container Docker **không** với tới nếu không
  `--network host`/map cổng. Bind rộng hơn là mở kho nhớ ra mạng (điều 7) — không làm mặc định.
- **Một test của tôi XANH GIẢ, tự bắt được:** `fetch` không cho ghi đè header `Host`, nên phép
  thử DNS-rebinding chưa hề chạm guard. Viết lại bằng `node:http` mới đỏ được.

Gate 437 → **458** · `conform` ✓ · đột biến phần lời dặn **5/5** đỏ.

## [2026-08-02e] — Soát sổ: 6 mục "chưa làm" thực ra đã xong · 3 tiền đề sai

User yêu cầu kiểm lại mọi mục khai "chưa làm" trước khi làm tiếp. Đo từng cái, không tin sổ.

- **Đã xong mà sổ vẫn ghi nợ (xoá khỏi `05_TODO`):** `04_SKILLS` "phình 92→203 dòng" (file thật
  **43**) · `.claude/skills/` wrapper "chưa làm" (**7 skill có thật**) · "user duyệt bản 5 màn"
  (`plan/15`: xong + duyệt + push 27/07, IA cuối **6 màn**) · `##` heading parse thành changelog
  `date=NULL` (đã vá + có cổng H1 "Change Log") · rerank (mặc định TẮT đã khoá bằng test) ·
  `cowork.7z` (user chốt **xoá**, không gitignore).
- **Tiền đề sai, sửa tại chỗ:** `sessions.project_pinned` **không** tái dụng được cho pin phiên —
  nó là cột chịu lực (`=1` ⇒ scan CẤM ghi đè `project_root`), mượn thì ghim xong là khoá luôn
  đường cập nhật · hai mục còn viện điều 6 bản cũ "KHÔNG BAO GIỜ" (đã nới `2026-08-02b`) ·
  "tách `app.js` khi `cockpit.html` nghỉ hưu" — điều kiện ĐÃ TỚI (`app.js` 196 KB, một file).
- ~~Số nền của chính đợt đối chiếu cũng sai: engram là **20 tool**… và **engram KHÔNG có pin**~~
  → **CÂU NÀY SAI, đã bác ngay trong ngày bằng phép đo tốt hơn — xem `[2026-08-02g]`.** Tôi đọc
  `DOCS.md` của họ rồi gọi đó là "đo lại"; tài liệu của bên thứ ba **không phải** bề mặt chạy
  thật. Sổ cũ ghi 22 là ĐÚNG.
- Vẫn đúng là chưa làm (không đụng): `resolveDocPath` mồ côi · MCP 0 tool graph · scope chưa áp
  lúc ingest · Gemini web · `eid` chưa ai tiêu thụ · `zemory skill add`.

## [2026-08-02d] — `setup mcp` 5 → 8 agent · chọn đường TỰ XÁC MINH thay vì đoán

- **+3 agent** (`qwen` · `kiro` · `antigravity`) và Gemini nhận **hai đường ứng viên** — bản cài
  khác nhau đặt file khác chỗ (`~/.gemini/settings.json` vs `%APPDATA%/gemini/settings.json`).
- **Đường dẫn giờ TỰ XÁC MINH.** Đo: **0/10** đường cấu hình của các agent này tồn tại trên máy
  dev, nên chúng là chỗ ĐOÁN (nguồn: bản cài engram). Luật mới: chỉ chọn đường mà **file hoặc thư
  mục cha có thật** ⇒ sai đường thì cùng lắm không ghi gì, thay vì đẻ file cấu hình ma ở nơi vô
  nghĩa. Agent chưa cài hiện `· chưa cài` kèm đường đã dò.
- **Ba agent KHÔNG khai được thì nêu tên + lý do** (`codex` TOML · `opencode` khoá `mcp` khuôn
  khác · `pi` plugin) thay vì im lặng — im lặng thì user tưởng zemory không hỗ trợ.
- **Ghi chú Cowork ngay trong lệnh:** Cowork không dùng được MCP (máy ảo riêng, không với tới
  `zemory` máy thật) ⇒ `setup mcp` chỉ có nghĩa với app + non-app.
- 6 việc còn thiếu so với engram đã ghi thành mục riêng trong `05_TODO`.

Gate 435 → **437** · `conform` ✓.

## [2026-08-02c] — MCP: 4 → 8 tool · `setup mcp` tự khai vào agent · mô tả tool thành LỜI DẶN

Học từ engram (22 tool) nhưng chỉ lấy phần hợp kiến trúc. Đã đo trước: `zemory mcp` **vốn đã
là MCP server thật** (trả lời `initialize` + `tools/list` bằng đúng phép thử dùng cho engram),
nên thứ thiếu không phải giao thức mà là **bề mặt** và **đường nối**.

- **+4 tool, đều bọc năng lực CÓ SẴN, không đẻ logic mới:** `changelog_search` (kèm cờ
  `supersededBy`) · `memory_context` (bọc `recallCard`) · `project_current` (không bao giờ lỗi)
  · `memory_stats`. Gọi thật qua MCP cả 4 — `changelog_search` trả đúng cờ đã-bị-thay.
- **Vá lỗ tự tạo sáng nay:** nhãn "⚠ ĐÃ BỊ THAY" chỉ chạy được ở CLI, nên **agent qua MCP
  không có cách nào biết một quyết định đã chết** — đúng cái vấn đề cả buổi đi chữa mà bỏ trống
  lối vào chính.
- **`zemory setup mcp [agent]`** — khai zemory vào Claude Code (`.mcp.json` theo project) ·
  Claude Desktop · Cursor · Windsurf · Gemini. Gọi trần thì **chỉ liệt kê**, phải nêu đích danh
  agent mới ghi, vì đây là file NGOÀI project (`02_RULES §Phạm vi`). Ba chốt chặn có test +
  đột biến: giữ nguyên server khác · JSON hỏng thì DỪNG không ghi đè · thiếu thư mục cấu hình
  (agent chưa cài) thì không tự dựng cây thư mục để lại rác.
- **Mô tả tool = LỜI DẶN, không phải nhãn.** engram viết "WHEN TO CALL: after mem_save returns
  judgment_required=true"; zemory viết "Show one plan/doc section by id." — đúng mà vô dụng.
  Trớ trêu: zemory **bắt mọi `SKILL.md` phải có `description` nói dùng-khi-nào**, chỉ quên áp
  cho chính tool của mình. Nay có gate `mcp.test` chặn mô tả kiểu định-nghĩa (đột biến ✓ đỏ).
- **KHÔNG copy 8 tool ghi của engram** (`mem_save`, `mem_update`, `mem_session_*`…): trí nhớ
  engram do agent tự viết, còn zemory nạp transcript tự động và lấy **file docs làm nguồn**.
  Thêm đường ghi cho agent = mở đường ghi thứ hai vào lớp dẫn xuất, phạm điều 3.

Gate 427 → **435** · `conform` ✓.

## [2026-08-02b] — HIẾN PHÁP điều 6: "KHÔNG BAO GIỜ gọi LLM" → "HẠN CHẾ gọi LLM" (user chốt)

> 🔄 **Supersede:** thay [2026-07-25] — "điều 6 khoanh vùng no-LLM" — user chốt 2026-08-02: cấm
> tuyệt đối là hiểu sai ý ban đầu. Lý do thật của luật là **tối ưu token**, không phải chống-LLM.

- **Câu mới, thứ tự ưu tiên rõ:** ① script/luật **tất định** làm được thì SCRIPT LÀM → ② không tất
  định được thì **AGENT LIÊN KẾT** làm (nó đã ở đó, dùng token của phiên đang chạy) → ③ zemory tự
  gọi model **chỉ khi** ①② đều không xong, có ích lợi **đo được** (điều 12), user chốt, và
  **fail-open** khi thiếu model. Giữ nguyên: không proxy model API, không sinh văn bản trong lõi;
  embed/rerank local chỉ *đo nghĩa* nên luôn hợp lệ.
- **Vì sao phải ghi:** quyết định này user đã nói từ lâu nhưng **chưa bao giờ vào văn bản** — tra
  `changelog search` (cả archive) + kho nhớ đều không có. File vẫn ghi "KHÔNG BAO GIỜ", nên mọi
  agent đọc hiến pháp đều áp luật cũ, và chính tôi hôm nay đã viện dẫn nó để bác một đề xuất.
  Đúng dạng "sổ nói khác thực tế" mà `02_RULES` gọi là sai khó phát hiện nhất.
- **Mở ra cái gì:** xử lý xung đột ở TẦNG TRÍ NHỚ (kiểu `mem_judge` của engram) trước đây bị chặn
  thẳng vì cần model phán. Nay hợp lệ nếu qua được thứ tự ①②③.

## [2026-08-02] — Quyết định đã bị đảo nay TỰ NÓI ra · sửa `--limit` nuốt vào truy vấn

Đối chiếu với **engram** (5.8k sao, memory server viết bằng Go, MCP 20 tool) để xem zemory
thiếu gì. Ba đề xuất ban đầu của tôi thì **hai sai tiền đề** — đo lại mới thấy:

- **Trường CHẾT: `supersedes_id` có trong schema và có cả code hiển thị, nhưng KHÔNG ai điền.**
  Đo: 42 entry mang mệnh đề `🔄 Supersede`, **0/204 dòng có link**. Hậu quả đã chứng minh sống:
  tra *"chuẩn mới áp cho cowork thôi"* trả về phán quyết 29/07 y như luật còn sống, trong khi
  31/07 đã lật — phiên sau đọc trúng là làm sai. Nay `linkSupersedes` điền lúc reindex và
  `changelog search` gắn nhãn **⚠ ĐÃ BỊ THAY bởi #id (ngày)** lên entry cũ.
- **Nối CÓ CHỦ ĐÍCH ít, không đoán bừa: 4 link chắc thay vì 42 link nghe-có-lý.** Đo: chỉ 11/42
  mệnh đề nêu ngày, và trích tiêu đề cũ chỉ khớp 2/26 (người viết trích *nội dung* quyết định,
  không trích tiêu đề). Hai chốt chặn đều do **link SAI thật** trong lúc dựng: ngày trần
  `2026-07-29` khi có anh em `29e/29f` từng nối Phase 3 vào nhầm entry; và `29e ↔ 29f` từng
  "thay" lẫn nhau thành vòng tròn. Gate mới `changelog-supersede` 4 test, **đột biến 2/2 đỏ**.
- **Siết cách VIẾT** (`02_RULES §Changelog` + `session-close` cả 4 bộ): mệnh đề supersede phải
  nêu **đúng khoá ngày** của entry bị thay (`2026-07-29l`). Không có khoá thì máy không nối, và
  quyết định chết vẫn hiện như đang sống — luật này mới là thứ làm cơ chế trên có giá trị lâu dài.
- **Lỗi thật: `memory search "x" --limit 3` tìm chuỗi `"x 3"`.** Bộ lọc chỉ bỏ token đứng sau
  `--origin`, nên giá trị của mọi cờ khác lọt vào truy vấn và **âm thầm đổi thứ hạng** — tệ hơn
  bỏ qua cờ, vì kết quả vẫn trông như câu trả lời bình thường. Nay `--limit` chạy đúng.

**Ba thứ tôi ĐÃ ĐỊNH làm mà đo xong thì không cần / chưa nên:**
- *Truy hồi ba lớp* — **đã có sẵn**: CLI trả ~33 token/kết quả rồi trỏ `memory show <id>`; MCP có
  `memory_search` → `memory_show` (có `window` = đúng lớp timeline). Con số "7.082 token/kết quả"
  tôi nêu lúc đầu là đo **độ dài tin thô trong DB**, không phải thứ search trả ra — đo sai chỗ.
- *`topic_key` upsert kiểu engram* — quy sai nguyên nhân: trong 33.717 tin trùng khít, **81% là
  `[tool_result]` boilerplate**, chỉ 18% là nội dung thật. Chỗ đau là **rác tool lọt vào index**
  (đo: ~16% kết quả mỗi truy vấn), cần một cờ dẫn xuất tính lúc nạp — để `05_TODO`, không bolt vội.
- *Bật rerank mặc định* — **HP điều 12 chặn** (chỉ bật mặc định sau khi thắng net trên corpus có
  nhãn). Chạy gate: FTS 0% · **hybrid 100% (8/8)** · rerank 100% — corpus đã bão hoà nên rerank
  KHÔNG thể thắng net ở đó. Chi tiết trong `05_TODO`.

**Lọc boilerplate: dựng xong rồi GỠ.** Đã build đủ (bảng dẫn xuất `boiler` schema v20 +
`rebuildBoiler` trong `scan`/`reindex` + `dropBoilerplate` lọc trước xếp hạng, đánh dấu thật
13.524 tin) rồi **gỡ sạch** vì đo ra **0 lợi ích**: trên 5 truy vấn thật, boilerplate lọt vào
top-10 khi KHÔNG lọc là **0/10 ở cả 5**. Tiền đề "~16% kết quả là rác" của tôi đếm nhầm —
`[tool_result]` không phải boilerplate; soi tay thì 2/3 hit tool_result của `cowork bootstrap`
là nội dung file test THẬT, đúng thứ cần tìm. `HP điều 12` cấm bật mặc định một lớp chưa thắng
net, nên giữ lại là vi phạm chính luật vừa dùng để chặn rerank. Bài học + phân bố đo được ghi ở
`05_TODO` để không ai đề xuất lại mà thiếu bằng chứng.

Gate 423 → **427** · `conform` ✓ · `check_install` cowork 24/24.

## [2026-08-01b] — Chuẩn hoá CHÍNH repo zemory: 7 playbook ra `.claude/skills/`

Repo vừa dạy chuẩn mới xong thì chính nó vẫn chạy chuẩn cũ — `04_SKILLS` 222 dòng playbook
inline nằm trong bộ ĐỌC HẾT. Nay áp đúng thứ Phase 3 đã áp cho hai bản template.

- **7 skill ra file riêng** (`grill` · `session-close` · `reconcile` · `conform` · `audit` ·
  `read-office` · `write-docx`), chép NGUYÊN VĂN + frontmatter, `description` lấy từ bản
  template app nên repo và template cùng một cách gọi. `04_SKILLS` 222 → **53 dòng** sổ đăng ký,
  giữ nguyên phần vendored `ui-ux-pro-max` và tool `markitdown` (HP điều 1/2).
- **`04` ra khỏi ĐỌC HẾT**, `AGENTS.md` có bảng trigger 9 dòng. **Đo: bộ luôn nạp ~25.5k →
  ~20.1k token mỗi phiên (−5.4k, −21%)** — phần bỏ ra không mất, chỉ chuyển sang mở khi trúng việc.
- **`session-close` nhận Bước 3 tự-dọn** (repo có CLI nên giao `zemory archive`): `05_TODO`
  không ngưỡng, `06_CHANGES` theo trần khai trong `.harness.json`.
- **Siết lại phép kiểm đã nới:** `read-set-contract` giờ kiểm CẢ `04_SKILLS` (trước chỉ `03`,
  vì lúc đó repo chưa migrate nên ghim là gate đỏ vô cớ). Đột biến: nhét `04` lại vào dòng
  ĐỌC HẾT ⇒ đỏ; gỡ ra ⇒ xanh.
- Luật ④ của `conform` lần đầu chạy nhánh MỚI trên chính repo này: đối chiếu 3 chiều
  (thư mục ↔ `04` §2 ↔ trigger `AGENTS`) — **✓ không lệch**, và số skill trong `conform` giờ
  đếm từ thư mục thật thay vì đếm heading.

Gate 423/423 · `conform` ✓.
