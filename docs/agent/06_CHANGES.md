<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

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

## [2026-08-01] — Chốt GUIDE.docx để gửi ra ngoài + đẩy bản chuẩn lên remote

Bố cục lại theo user: bảng thuật ngữ lên **mục 1** (giải thích trước khi vào hướng dẫn), mẹo
mở rộng đôn từ mục 12 lên **mục 3** ngay sau phần hướng dẫn, mục 3–11 lùi số — đổi ở **cả ba
nơi**: tiêu đề thật, dòng mục lục (dời trọn đoạn nên neo nhảy vẫn đúng), và **5 dẫn chiếu
"mục N"** trong thân bài. Phần đổi phiên rút **5 đoạn → 2**.

- **SỬA MÔ TẢ SAI về mức nỗ lực.** Bản cũ viết *"Max = ultracode + xhigh"* (tôi viết theo lời
  user, user viết theo tooltip). Dò lại tài liệu chính thức: **ngược** — ultracode gửi `xhigh`
  (nhãn UI *Extra*) rồi thêm phần điều phối nhiều agent, và là **một DÒNG RIÊNG** trong menu
  `/effort`, không dính `max`. `high` mới là mặc định thật (*"đặt high == không đặt gì"*), còn
  `max` thì chính Anthropic cảnh báo *"diminishing returns · prone to overthinking"* và chỉ áp
  cho phiên hiện tại. Đã **gỡ mọi con số chi phí**: không có hệ số chính thức nào cho
  high→xhigh→max hay ultracode; mấy con 7x/4x/15x ngoài kia là của thứ khác. Thay bằng cách
  kiểm được: chạy thử một thư mục trước rồi mới mở rộng.
- **Lỗi trình bày đã trả giá:** **14 dấu `**` gõ lẫn vào thân run** (trong `.docx` in đậm là
  THUỘC TÍNH của run — gõ `**` là Word in ra dấu sao; 6 dấu trong số đó đã lọt sang bản user
  mở ở lượt trước) · 8 đoạn in đậm **ngược vai** (thân đậm, dẫn thường) · 8/12 ảnh để
  `<w:spacing/>` rỗng nên chữ dính sát · 4 chỗ ép mục lớn sang trang để lại lỗ **78% · 97% ·
  44% · 70%**. Đo phần trống từng trang **phải loại vùng chân trang**, không thì trang nào
  cũng ra 0% trống — phép đo đầu tiên của tôi dính đúng bẫy này.
- **Chặn việc gửi, phát hiện đúng lúc:** link trong GUIDE trỏ vào GitHub, mà remote đang **cũ
  hơn 27 commit** — CEO dán câu lệnh sẽ dựng ra bộ CŨ (19 dòng manifest, không có `04_SKILLS`,
  không có `write-docx`), lệch hẳn tài liệu đang đọc. User cho phép push; đẩy 3 commit
  (`dd6c541..86dbf33`). Kiểm lại bằng lần tải **phá cache**: 24 dòng manifest, có `03_STRUCTURE`
  · `04_SKILLS` · `write-docx`, trần archive **40.000 ký tự**. Link trong tài liệu giờ đúng bộ.
- `cowork.7z` đã verify **59/59 mục · CRC GUIDE trùng byte**, nhưng user chốt **chỉ gửi GUIDE**
  (agent tự tải về dựng) ⇒ file nén **KHÔNG commit** — nó là bản render, không phải nguồn.

## [2026-07-31b] — Bộ Cowork: 03/04 vào bộ · GUIDE đồng bộ · audit toàn diện 8 lỗi (user duyệt 2026-08-01)

Gộp hai đợt đã xong từ 31/07 mà còn treo chờ duyệt.

- **`03_STRUCTURE` + `04_SKILLS` vào bộ cowork** — giữ đúng cấu trúc 6 file như bản gốc, chỉ
  đổi vai: `03` trỏ sang skill `structure` và giữ **§2 = TỪ ĐIỂN dữ liệu** (ship rỗng), `04` là
  sổ đăng ký. Manifest `BOOTSTRAP.md` **22 → 24 hàng**, số dòng đọc bằng script chứ không gõ tay.
  Dựng thử một cài đặt từ đầu rồi chạy `check_install.py` → **24/24, exit 0**.
- **GUIDE.docx đồng bộ với bộ file thật** (7 sửa) + mục mới **"Canh chỗ nhớ còn lại — `/context`"**
  kèm ảnh thật, ngưỡng 95% thì ghi sổ rồi đổi phiên; thêm hai đường thêm quy trình (kho Directory
  + nhờ soạn) và luật *"sai lặp lại → cho vào LUẬT"*.
- **Audit toàn diện trước khi giao — 8 lỗi thật, đã sửa hết:** `README` thiếu hẳn quy trình
  `write-docx` (liệt kê 10/11) và thiếu `03`/`04` trong bảng vai trò · `BOOTSTRAP` ghi "mười một
  quy trình" rồi ngay dòng dưới "mười cái đó" · bảo đăng ký skill ở MỘT chỗ trong khi luật đòi
  HAI · `02_RULES` bỏ sót `04` trong chuỗi đồng bộ · **overview đọc lúc nào: ba file nói ba kiểu**
  · **luật dọn `05_TODO` là luật CHẾT** (bước trước đã xoá hết mục đã xong, bước sau lại bảo
  archive chính chúng) · câu dán khởi động khác nhau giữa `README` và `BOOTSTRAP`.
  Đo lại sau sửa: `check_install` 24/24 · `check_structure` **đỏ đúng chỗ rồi xanh** (đột biến) ·
  47/47 test của 4 bộ liên quan · gate toàn repo 422/422 · `conform` ✓.

## [2026-07-31] — PHASE 3: kiến trúc skill của cowork áp lên CẢ hai bản chính (app + nonapp)

> 🔄 **Supersede:** thay quyết định *"chuẩn mới áp cho COWORK THÔI, không đụng bản gốc"* (`archive/06_CHANGES` 2026-07-29) và *"luật đọc 3 file chỉ áp dụng với cowork thôi, hệ non-app với app vẫn đọc full docs"* (29/07) — **user chốt làm trọn 31/07** sau khi bản cowork chạy ổn và đo được mức nạp nhẹ hơn ~69%. Hai test khoá hai chiều trong `bootstrap-manifest.test.mjs` được nới theo, KHÔNG xoá: chúng đổi từ *"cowork-only"* sang *"cả ba bộ cùng một kiến trúc, mỗi bộ một biến thể"*.

- **Playbook rời khỏi `04_SKILLS`.** Mỗi quy trình thành `.claude/skills/<tên>/SKILL.md` tự chứa,
  có frontmatter `name` + `description` ⇒ harness tự nạp theo mô tả, không chờ ai nhớ mở file.
  `04_SKILLS` còn lại **sổ đăng ký mỏng** (một dòng một skill + luật dùng) và **ra khỏi bộ ĐỌC HẾT**.
- **`03_STRUCTURE` giữ vai chuẩn cấu trúc** (code `structure-tree`/`conform` đọc nó) và bản nonapp
  **nhận thêm §Từ điển dữ liệu** — nhà DUY NHẤT của định nghĩa metric/cột. `docs/dictionary.md`
  bị **cấm**; mọi dẫn chiếu tới nó trong template đã đổi về `03_STRUCTURE`.
- **`session-close` Bước 4 — TỰ DỌN** có ở cả ba bộ (trước chỉ cowork). Bản app/nonapp trước đây
  phó mặc cho `zemory archive`, mà lệnh đó chỉ chạy khi có người nhớ gõ.
- **Trần archive đổi ĐƠN VỊ: ký tự, không phải dòng.** Đo 31/07: `05_TODO` của repo này
  **33,8 tok/dòng** ⇒ trần 300 dòng ≈ **10.155 tok** cho một file *luôn được nạp*, tức nặng hơn cả bộ
  docs đầy đủ mà kiến trúc mới vừa thay thế. Dòng ở sổ dày gấp ~3 dòng code nên đếm dòng là đo sai thứ.
- **Code phải đi kèm, không thì báo tính năng sai:** `checks.ts` (probe `grill`) và `conform` luật ④
  (roster ↔ section) trước đây chỉ biết hình dạng "playbook inline trong `04_SKILLS`" — nay nhận **cả
  hai** hình dạng, nên project cũ chưa migrate vẫn xanh.

## [2026-07-30d] — LỖI THẬT: daemon KHÔNG hề scan. UI hứa "scan → embed → digest", code làm 2/3

Gate 367 → **372** · `conform` ✓ · đột biến **8/8**.

- **Con bug.** `jobs/scheduler.ts` chỉ có `embedTick` + `syncTick`. **Không có bước `scan`.** Trong khi
  UI cam kết ở HAI chỗ (`mem.schedulerD` và panel `f.doc.scheduler`): *"daemon tự chạy scan → embed →
  digest"*. Hệ quả: daemon bật, khoẻ, mà **không tin nào được nạp tự động** — máy đứng ở *+2.722 tin
  mới* trong UI. User báo là "lỗi quét web"; lỗ thật nằm ở đây.
- **Sửa:** thay `embedTick` bằng **chuỗi `maintainTick`** chạy tuần tự `scan → embed → digest`, mỗi
  bước một tiến trình riêng (việc nặng không được lên event loop của daemon — bug 2026-07-21), và
  **MỘT job token cho cả chuỗi** để CLI không chen vào giữa. Backoff của vector backlog **chỉ** được
  bỏ qua bước embed, **không** chặn scan — chặn scan là quay lại đúng con bug. Nhịp 10 phút.
- **Gate mới `scheduler-contract` (5 test)** canh đúng khe đã vỡ: *UI hứa bước nào thì scheduler phải
  spawn bước đó* · chuỗi phải tuần tự · đúng 1 token và release trong `finally` · backoff không chặn
  scan · guard nhường quyền ghi còn đủ. **Đột biến 8/8**, gồm cả ca "UI âm thầm hạ lời hứa xuống 2 bước".
- **Hai test đầu của tôi YẾU, đột biến bắt được:** ① `await runStep(` chỉ cần có *một chỗ* là xanh, nên
  đổi một lần gọi thành `void` vẫn lọt → giờ **đếm**: mọi lần gọi phải được await. ② `s.includes("cliHoldsWrite()")`
  xanh nhờ dòng `import`, nên gỡ guard vẫn lọt → giờ soi **đúng câu điều kiện thoát sớm** của `maintainTick`.
- **TỰ SỬA một khẳng định sai của tôi:** tôi nói *"digest cũng chưa bao giờ chạy tự động"*. **Sai** —
  `session_digest` có đủ **1.225 dòng**, kể cả phiên đang chạy, `updated_at` mới hôm nay. Chỗ tôi hiểu
  nhầm: `memory digest <session>` cần **ID ĐẦY ĐỦ**; tôi tra bằng tiêu đề người-đặt (`Zemory_Claude_28-7-
  2026_CoworkCEO`) và bằng tiền tố (`0b2dc2bd`) nên cả hai đều không ra. Scheduler thiếu bước digest là
  đúng, nhưng bằng chứng tôi nêu thì sai.
- **Cowork KHÔNG vào Global Memory** — `memory hosts` cho 6 nguồn (`chatgpt-web` · `claude-code` ·
  `claude-web` · `codex` · `lmstudio` · `continue`), **không có cowork**. `scan-web` *có* platform
  `claude` (→ `claude.ai`, source `claude-web`, adapter riêng) nhưng lane đó chỉ có **2 phiên / 6 tin**.
  ⇒ **mọi quyết định bàn trong phiên Cowork là không tra lại được**, phải chốt lại bằng file trong repo.
- Nạp bù bằng tay: `memory scan` → **+107 tin / 2 phiên** (1.225 phiên · 189.885 tin). *Con số +2.722
  của UI thì tôi **chưa giải thích được** — không đo lại được sau khi đã scan; chưa kết luận.*
- **`claude-web` đứng ở 6 tin: KHÔNG phải scanner hỏng.** Chạy thật `scan-web --platform claude`:
  đăng nhập OK, pull 2/2, và nó tự báo *"enumerated **2 loose** conversation(s)"*. Chỗ vỡ ở
  `PLATFORMS.claude` — **thiếu `projectsExpr` + `projectConvsExpr`**, nên khối enumerate project ở
  `scanweb.ts:525` (`if (p.projectConvsExpr && …)`) **luôn false**. Comment ngay đó đã cảnh báo
  *"A Project's chats are NOT in the loose list"*.
- **Dò endpoint thật (CDP in-page, chỉ GET) — số liệu đã chốt trong `05_TODO`:** `…/projects` **200**
  (len 1) ⇒ vá được · `chat_conversations` chở sẵn **`project_uuid`** ⇒ gán nhãn project không cần
  endpoint thứ hai · `cowork_sessions` · `tasks` · `sync/mcp` **404 cả ba** ⇒ **phiên Cowork không phơi
  qua claude.ai**, vá Project cũng không lấy được Cowork. Kèm một bẫy: account có **2 org** (`chat` và
  `api`), scanner đang lấy `o[0]` — phải chọn theo caps `chat`. **Chưa sửa code**, để phiên sau làm với
  đủ số đo; thiếu authen thì **hỏi user** chứ không lặng lẽ bỏ qua.

## [2026-07-30c] — Đọc lại TOÀN BỘ GUIDE.docx: 5 chỗ lệch · mục lục tự hiện · ngắt trang chọn theo ĐO

`bootstrap-manifest` 8/8 · `conform` ✓. User yêu cầu soát cả file; đọc hết rồi đối chiếu với
manifest · bảng tra chuẩn · docs Anthropic.

- **Guide hứa chắc hơn bằng chứng.** Mục 3 + mục 4 ghi *"Tự nhận việc theo mô tả — ✔ có sẵn"* và
  *"Cowork dùng được **hết** những thứ ở Lớp 2"*. Nhưng `AGENTS.md` **trong cùng bộ** lại rào: *"Chạy
  trong **Claude Code**: skill được harness tự nạp theo `description`; bảng này là đường dự phòng khi
  cơ chế đó không có"* — và help center Anthropic chỉ mô tả đường cài skill **ở cấp tài khoản**
  (upload `.zip`), không trang nào nói Cowork nạp skill từ thư mục đã gắn. Đã hạ giọng guide cho khớp
  bằng chứng: tự đọc bối cảnh thì **có** (ảnh phiên cho thấy Cowork nhận `CLAUDE.md` làm Instructions),
  còn cách LẤY quy trình thì nêu rõ có đường dự phòng là bảng tra.
- **Bỏ "trên máy bạn"** ở mục 3 + mục 5: help center nói việc chạy trên máy chủ Anthropic, còn đo của
  chính repo lại thấy sandbox đọc được filesystem host — **hai nguồn ngược nhau, chưa phân xử được**
  nên không khẳng định. *(Câu "kho dữ liệu trên máy bạn" ở phần ② thì GIỮ — kho nhớ zemory thật sự nằm
  trên máy.)*
- **`docs/dictionary.md` vẽ như file mặc định nhưng manifest KHÔNG có** — BOOTSTRAP không tạo nó.
  Người dùng dựng xong sẽ thấy thiếu và tưởng hỏng. Đánh dấu `[tuỳ]` tại chỗ trong cây mục 7.
- Mục 1 Cách 2 thiếu **lời dặn thường trực** trong danh sách "project thêm gì" — mà Instructions đúng
  là thứ `BOOTSTRAP §Giai đoạn 4` dùng. Đã bù. Mục 9 thêm `docs_visual/` cho khớp bảng tra `structure §3`.
- `BOOTSTRAP §Giai đoạn 4.3` viết lại cho hết mâu thuẫn với guide: nêu rõ Cowork **tự đọc** `CLAUDE.md`,
  nhưng cơ chế đó **chưa có tài liệu chính thức** nên dán thêm vào lời dặn thường trực là **đường chắc**
  — dán trùng thì vô hại, thiếu thì mất hợp đồng nạp.
- **Sửa xong phải ĐO LẠI trang**, vì đổi nội dung là đổi phân trang: render lại ⇒ **11 trang, 0 vi phạm
  giữa bài** (trống nhiều nhất 29% ở trang 10) ⇒ không phải tối ưu lại ngắt trang.
- Tự gây rồi tự bắt: lúc gỡ `dictionary.md` tôi để `plan/` thành nhánh cuối (`└──`) trong khi nó vẫn
  còn con ⇒ **vỡ ký hiệu cây**; và đặt `docs/dictionary.md` vào cây mục 9 thì sai chỗ lẫn lệch cột. Đã
  trả về đúng chỗ.
- **Kiểm được và ĐÚNG, không sửa:** *"giảm khoảng 70%"* — đo thật phần ngoài bộ đọc mỗi phiên chiếm
  **79%** dung lượng (14.660 / 71.214 B) ⇒ 70% là nói dè. Mục lục 11 dòng khớp 11 tiêu đề · bảng mục 8
  đủ 11 dòng khớp tiêu đề "Mười một" và ô *"11 quy trình sẵn dùng"* ở mục 4 · cây mục 7 đủ 11 quy trình
  · con trỏ *"(xem mục 7)"* đúng · 4 ảnh nút + 3 sơ đồ đúng mục.

## [2026-07-30b] — ONLYOFFICE bẻ phẳng 8 BẢNG mà tôi không thấy · skill `ghi file Word` cho cả 4 nơi

Gate **367/367** · `conform` ✓ (skill 6 → **7**).

- **Hồi quy im lặng, và phép kiểm của tôi mù đúng chỗ đó.** User mở `GUIDE.docx` bằng ONLYOFFICE Desktop
  rồi lưu lại → **8 bảng thành 0**, mọi ô bị bẻ thành đoạn thường; kèm bóc lớp `<w:sdt>` bọc mục lục,
  đổi `styleId` thành số, đảo thứ tự thuộc tính `<w:pgSz>`. Tôi đã đối chiếu và tuyên bố *"chữ chỉ khác
  đúng phần sửa, style vẫn giải ra Heading 1/2, TOC còn"* — **đúng từng vế nhưng bỏ sót cái chính**: chữ
  trong ô bảng cũng là đoạn văn, nên so bằng *văn bản đoạn* thì bảng mất mà số liệu vẫn khớp. **Không hề
  đếm `<w:tbl>`.**
- **Khôi phục bằng ghép nguyên khối `<w:tbl>` từ bản trong git** — bảng không tham chiếu style nào (viền ·
  độ rộng đều inline) nên ghép sang bản đã bị ONLYOFFICE đánh số lại `styleId` vẫn chạy. Dò vị trí bằng
  cách khớp **dãy đoạn đã bị bẻ**: cả 8 bảng đều khớp **đúng một chỗ**, không chồng nhau.
- **Một bẫy regex làm phép kiểm báo lệch giả:** ô bảng rỗng viết dạng tự đóng `<w:t xml:space="preserve"/>`,
  mà `<w:t(?:\s[^>]*)?>` khớp nhầm nó thành thẻ mở rồi **nuốt XML** tới `</w:t>` kế tiếp. Chốt `(?<!/)`.
- **Đo thêm, có ích về sau:** bản ONLYOFFICE **không có gì nằm giữa các đoạn** (1 khoảng = header XML),
  còn bản gốc có **178 khoảng / 45,7 KB** (bảng · `<w:sdt>`). ⇒ các script trước của tôi dựng lại file
  bằng `head + join(đoạn) + tail` **không đánh rơi gì**, nhưng cách đó chỉ an toàn khi đã ĐO như vậy.
- **Skill `ghi file Word (.docx)` — user yêu cầu, áp cả 4 nơi.** Cowork: `.claude/skills/write-docx/SKILL.md`
  (114 dòng, chuẩn Agent Skills) + dòng trigger trong `AGENTS.md` + dòng manifest #20 trong `BOOTSTRAP.md`.
  Repo + template app/nonapp: section inline trong `04_SKILLS.md`. Nội dung là thứ hôm nay trả giá mới có:
  cấm mở file giao đi bằng editor khác rồi lưu · sửa theo từng RUN · ảnh phải khớp 3 tầng · khổ chữ đọc từ
  `sectPr` theo TÊN thuộc tính · bẫy `<w:t/>` · cấm nối đoạn để dựng lại file · **bảng kiểm 11 mục** chạy
  sau mỗi lần sửa · mục lục là field, nhắc user bấm F9.
  Bản template viết **trắng** (không nêu tên dự án); bản repo dẫn sự cố có ngày.
- Thêm dòng vào `AGENTS.md` làm số dòng lệch manifest ⇒ gate đỏ ngay, đã cập nhật 42 → 43. Đúng vai của gate.

## [2026-07-30a] — GUIDE.docx hết ảnh giữ chỗ: 3 ảnh THẬT · hai HƯỚNG VÀO · một câu dán · bỏ duyệt từng lệnh

`bootstrap-manifest` 8/8 · `conform` ✓. User chụp ảnh, tôi ráp — **tôi không tự chụp được UI Claude Desktop**
(thử `PrintWindow` + tự động chuột đều tắc, một lần còn chụp trúng thứ không được phép).

- **Luật ảnh, user chốt: CHỈ chụp bước phải BẤM NÚT.** Phần trợ lý hỏi–đáp thì UI tự hiện, người dùng tự
  trả lời — chụp vào là thừa. Tôi áp luật này quá rộng, gỡ luôn ảnh bước "dán câu lệnh"; user chỉ lại: ô
  chat **có nút gửi** nên vẫn thuộc diện chụp. Đã đưa ảnh thật vào. Guide còn **0 giữ chỗ**: 4 ảnh nút
  (Create new project · Add a folder · menu Auto · ô chat đã dán prompt) + 3 sơ đồ.
- **"Dựng lần đầu" là hai HƯỚNG VÀO, không phải hai bước** (user chốt): *Cách 1 — Tạo project* · *Cách 2 —
  Gắn thẳng thư mục*. Không dán nhãn "nên dùng" cái nào: thứ duy nhất phân biệt chúng là ghi nhớ xuyên
  phiên + tác vụ định kỳ, cái đó tuỳ dự án. **Tôi đã sai một nhịp ở đây** — tự nắn thành 2 bước và xoá
  hẳn đường project khi user mới chỉ HỎI; đã dựng lại.
- **Hai câu lệnh gộp thành MỘT**, hết chỗ điền tay. Kèm đó sửa một lỗi thật của bản cũ: câu ① chỉ đường
  bằng path trên máy, nhưng Cowork **chỉ đọc được thư mục ĐÃ GẮN** ⇒ path ngoài đó là ngõ cụt. Và URL cũ
  bị ngắt giữa dòng (`docs_template/` | `cowork/…`) — dán vào chat là đứt link.
- **Câu dán không được mở bằng tên công cụ**: Cowork sinh tên phiên từ câu đầu, nên bản trước làm phiên
  tên thành *"Zemory framework setup"* — tên CÔNG CỤ, không phải việc của user. Lỗi ở câu tôi viết.
- **Thêm bước "Bỏ bước duyệt từng lệnh"** — user chốt khuyến nghị **Skip all approvals**, vì thứ bắt trợ
  lý dừng lại hỏi là LUẬT trong bộ chuẩn chứ không phải mức duyệt. Cảnh báo giữ ở mức "cân nhắc", kèm
  một dữ kiện: luật chỉ ràng được **sau khi** bộ chuẩn dựng xong — lần chạy đầu thư mục còn trắng.
- **Ảnh: rộng = khổ chữ, cao theo tỷ lệ gốc.** Bản user tự phóng bị 16.34 cm (tràn khổ chữ 15.92) và tỷ lệ
  1.80 trong khi ảnh gốc 1.52 (kéo dẹt). Khổ chữ **đọc từ `sectPr`**, không ghim số — ONLYOFFICE đảo thứ
  tự thuộc tính `pgSz`, đọc theo vị trí là sai (tôi sập đúng lỗi đó một lần).
- Giữ bản đóng gói ONLYOFFICE của user thay vì revert: đã đối chiếu với bản trong git — chữ chỉ khác đúng
  phần sửa, style vẫn giải ra `Heading 1/2`, TOC còn, hai part bị bỏ (`comments.xml` · `docProps/custom.xml`)
  đều **RỖNG**. Sửa docx theo **từng run** nên viền/nền khối lệnh không vỡ.

## [2026-07-30] — Luật "chưa xác minh thì chưa phải sự thật": NỚI bullet cũ tại chỗ, không đẻ luật trùng

Gate 366 → **367** · `conform` ✓ · đột biến **6/6**.

- **Lỗ hổng thật, do chính tôi để lộ ra.** Luật cũ (`MỘT PHÉP ĐO CHƯA ĐƯỢC KIỂM CHÉO…`) chỉ phủ **con số**,
  nên mọi khẳng định **phi-số** lọt hết: tôi đoán trạng thái một cửa sổ (nói "đang thu nhỏ" trong khi user
  đã bấm tắt), đoán một cú click đã ăn (thực ra `SetForegroundWindow` trả `False` — Windows khoá
  foreground), đoán chỗ hỏng của parser. Ba lần đoán, ba lần sai, không lần nào chạm luật.
- **Sửa TẠI CHỖ, không thêm bullet** (user: *"ko thêm nhiều luật trùng nhau"*). Cùng một bullet, nới đầu:
  phủ **mọi khẳng định** (trạng thái hệ thống · nguyên nhân · "đã xong chưa") · mỗi khẳng định phải truy
  được về **nguồn kiểm được** · **tra không ra ⇒ nói thẳng "không biết"** kèm đã thử đường nào. Phần đuôi
  (kiểm chéo bằng đường thứ hai khác cơ chế trước khi báo số / kết luận xong / xoá) giữ nguyên.
- Áp cho **cả 4 bản**: repo + `docs_template/{app,nonapp,cowork/nonapp}`. Bản repo kèm 3 ví dụ có ngày;
  bản template viết trắng (chỉ nguyên tắc + dạng lỗi) theo luật template không nêu tên dự án cụ thể.
- **Gate khoá HAI đầu** (`read-set-contract`): mỗi file phải có **đúng 1** bản luật · **0** vết bản cũ hẹp
  hơn · đủ 3 vế bắt buộc. Đột biến: gỡ luật · bỏ vế "nói KHÔNG BIẾT" · bỏ vế "nguồn kiểm được" · thu hẹp
  lại còn con số · **đẻ bản trùng** · template mất luật → **6/6 bị bắt**.
- Kéo theo: manifest `BOOTSTRAP.md` ghi `02_RULES` = 64 dòng, file thật thành 65 → `bootstrap-manifest` đỏ.
  Đã cập nhật. Số dòng lệch làm **mọi lần dựng Cowork báo ✗ oan** trên file đúng.
