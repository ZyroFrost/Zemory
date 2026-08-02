<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

## 📌 Cowork — còn treo
- [~] **Đường TẢI vẫn chưa test — test 1 đi vòng qua nó.** Phiên Cowork thật đầu tiên (2026-07-28,
  repo `vietnam_34_provinces_grdp_dashboard` clone vào `D:\Zyro\Tool\test`) **không dùng URL**: agent
  phát hiện máy có sẵn bản chuẩn ở `D:\Zyro\Tool\Zemory\docs_template\nonapp`, **tự đối chiếu số dòng
  8/8 rồi chép thẳng từ đĩa** — một lối BOOTSTRAP chưa hề khai. Đó là lối rẻ nhất và nó tự kiểm trước
  khi chép, nên đã **khai chính thức thành "lối 0"** (kèm bắt buộc đối chiếu số dòng — bỏ bước đó thì
  có nguy cơ chép nhầm bản cũ).
  - **ĐÃ CÓ SỐ THẬT (2026-07-30, user chụp lại phiên trên thư mục `test2` trắng — không có bản local nên
    rơi đúng vào đường mạng):** `curl` thẳng tới `raw.githubusercontent.com` **BỊ CHẶN** — sandbox chỉ ra
    được miền Anthropic, đúng như BOOTSTRAP §1a dự đoán. **Lối 1 (tool lấy nội dung web của Cowork) CHẠY**:
    agent tự chuyển sang lối đó và ghi ra file theo từng lô (5 → 4 → 2 …), panel file hiện `AGENTS.md` ·
    `CLAUDE.md` · `01_CONSTITUTION` · `02_RULES` · `05_TODO` · `06_CHANGES` · `00_overview` · 2 `SKILL.md` ·
    `conventions.md` · `check_structure.py`. ⇒ **Thứ tự lối trong BOOTSTRAP là đúng, và máy sếp sẽ dựng được.**
    *(Bằng chứng là ảnh chụp phiên, không phải tôi tự chạy — và phiên đó chụp lúc còn đang chạy Giai đoạn 1,
    CHƯA thấy BÁO CÁO CUỐI nên chưa kết luận là dựng trọn bộ 19 file + `check_install.py` xanh.)*
  - **Đã biết thêm (đo được từ chính phiên đó):** sandbox Cowork **ĐỌC được filesystem của host** — nó đọc
    thẳng `D:\Zyro\Tool\Zemory`. Khớp tài liệu sandbox của Claude Code (*"Read access covers the entire
    filesystem"*). Ghi vào không rõ, chưa thử.
  - **Agent tự áp `02_RULES §Phạm vi project` đúng chỗ:** dừng lại hỏi trước khi ghi harness vào cây git
    public của user, dù không ai nhắc. Luật đó ăn.
- [ ] **NHẬP CHÌA VÀO MÁY THỨ HAI** (việc của user — agent không làm được, và không nên làm được).
  Chìa mới dấu tay `e6fb0eff` ở `<thư mục DB>/share.key` (`zemory memory key path`). Ở máy kia:
  `zemory memory key set` (dán chìa, đọc stdin) → `zemory memory key show` phải ra **cùng dấu tay** → `zemory memory sync`.
  **Cho tới lúc đó máy kia còn chìa cũ**, nên lần sync tiếp theo của nó sẽ đẩy **một bundle chìa-cũ** lên Drive —
  nhận ra bằng file `global_memory.<host-máy-kia>.*.enc` mới xuất hiện. Chìa cũ (`41d88e4d`) nằm trong lịch sử git
  **đã push** ⇒ lộ vĩnh viễn; không viết lại lịch sử vì chưa `.enc` nào từng vào git. Nền tảng: `plan/16_share_key`.

## 📌 Bàn giao 2026-07-28 — việc còn lại
- [~] **`claude-web` — ĐÃ SỬA 2026-07-30, chờ user duyệt để ghi `06_CHANGES`.**
  > 🔄 **Bác bỏ chẩn đoán cũ của chính mục này** (*"MẤT TRẮNG chat trong Project vì thiếu
  > `projectConvsExpr`"*). Sai. Đo hai đường trước khi sửa: ① item của
  > `…/<org>/chat_conversations` mang `project_uuid` **không null**; ② so TẬP id với
  > `…/<org>/projects/<pid>/conversations` ⇒ **`projectIdsMissingFromLoose: []`**. Tức danh sách
  > phẳng của claude.ai **đã chứa cả chat trong Project** — khác ChatGPT, nơi comment
  > *"A Project's chats are NOT in the loose list"* mới đúng. Tài khoản này **thật sự chỉ có 2 hội
  > thoại / 1 project**, nên "2 phiên · 6 tin" là con số ĐÚNG, không phải triệu chứng.
  > ⇒ **KHÔNG thêm `projectConvsExpr` cho claude** — nó chỉ kéo về đúng những id đã có (`CLAUDE_LIST`
  > có comment ghi rõ + test khoá, để phiên sau khỏi "vá" lại).

  **Ba lỗi THẬT tìm được khi đo, đã sửa:**
  1. **`o[0]` làm org** — account có 2 org (`chat`·`claude_max` và `api`·`api_individual`); máy này
     tình cờ đúng. Nay chọn theo caps `chat`; không org nào có caps `chat` ⇒ **báo lỗi rõ**, không im
     lặng dùng org rỗng (biểu hiện y hệt "chưa đăng nhập").
  2. **Khoá resume hardcode `chatgpt-`** trong khi adapter claude ghi `claudeweb-<uuid>` ⇒ resume chết
     lặng, **mỗi lần chạy kéo lại toàn bộ tài khoản**. Nay `Platform.sessionPrefix`, test so PARITY với
     id adapter thật sinh ra. *(Đo trên DB thật: 2 phiên đều mang tiền tố `claudeweb-`.)*
  3. **`project_root` là uuid thô** — payload CHI TIẾT (`?tree=True…`) có `project_uuid` nhưng
     `project: null`; chỉ danh sách phẳng mới có `project:{name}`. Nay `CLAUDE_PROJECTS` map uuid→tên +
     sidecar `_projects.json` (dùng chung `readProjectMap` với ChatGPT). **Đo sau khi chạy thật:
     `019f68e1-…` → `VU-Project`.**

  **Cowork vẫn KHÔNG lấy được qua đường này** — `cowork_sessions` · `tasks` · `sync/mcp` đều **404**
  (đo 2026-07-30). Vá Project không đổi điều đó; đừng hứa ngược lại.
- [~] **Hết hạn xác thực khi scan web → HỎI + mở cửa sổ (user giao 2026-07-30) — ĐÃ LÀM, chờ duyệt.**
  Trước: `need-login` là ngõ cụt — in *"a browser window is open at …"* **kể cả khi không mở cửa sổ nào**
  (chỉ mở khi cổng debug chết), và hết hạn GIỮA run thì mọi hội thoại còn lại đếm thành `failed`, log
  trông y như bị rate-limit. Nay: `awaitLogin()` mở cửa sổ **trước** rồi mới hỏi, kiểm lại auth sau mỗi
  câu trả lời; giữa run cứ **3 lần fail liên tiếp** thì hỏi lại site xem còn đăng nhập không — mất phiên
  thì lưu phần đã kéo, hỏi, đăng nhập xong **chạy tiếp tại chỗ**. Không TTY (daemon/pipe) ⇒ mở cửa sổ rồi
  báo `need-login` + exit 1, **không treo** chờ câu trả lời không ai gõ được.
- [~] **UI: nút Quét giờ kéo được web + hỏi đăng nhập (user báo 2026-07-30: *"bấm scan nó ra mới nhưng
  vẫn ko lấy từ web dc, cũng ko hề hỏi authen"*) — ĐÃ LÀM, chờ duyệt.**
  **Nguyên nhân:** cả hai nút (`scan`·`deepscan`) POST `/memory-scan` → `scan()` = **chỉ đọc đĩa**. UI
  **chưa bao giờ** có đường quét web ⇒ không lấy được web, và cũng không có chỗ nào để hỏi authen. Bản
  sửa CLI trước đó đúng nhưng nằm sai bề mặt.
  **Thiết kế user chốt:** *gộp vào nút Quét sẵn có + công tắc bật/tắt, nhớ qua phiên* (không đẻ nút mới).
  ⇒ `getScanWeb()` mặc định **TẮT** · `/memory-scan?web=1` · `/memory-scan-web?platform=` (nút "chạy tiếp"
  sau khi đăng nhập) · `/set-scan-web` · công tắc `data-auto="scanweb"`.
  **Vì sao UI không hỏi trực tiếp trong lúc quét:** giữ request HTTP mở để chờ người đăng nhập là treo
  daemon ⇒ server chạy **không tương tác**, chỉ MỞ cửa sổ rồi trả `need-login`; chỗ HỎI nằm ở dialog UI.
  CLI vẫn hỏi ngay tại terminal (có TTY).
  **Scheduler nền KHÔNG kéo web** (test khoá) — 10 phút một lần tự mở trình duyệt là hành vi không ai xin.
  **Đo bề mặt sống:** `POST /memory-scan` trả `web: [{chatgpt: need-login}, {claude: done · skipped 2}]`,
  và cửa sổ đăng nhập chatgpt **mở thật** (pid 7440, đúng thời điểm quét).
  **Còn lại:** phiên **chatgpt-web hết hạn trên máy này** — user cần đăng nhập lại một lần trong cửa sổ đó
  thì lane 30.913 tin mới nhận tiếp được (claude.ai không cần, cookie profile còn sống).
- [ ] **KHÔNG lấy cookie từ trình duyệt chính (user hỏi 2026-07-30) — giữ nguyên quyết định cũ.**
  Đã xác minh từ `plan/07 §5`: copy cookie/DPAPI từ profile Edge có sẵn bị **App-Bound Encryption** +
  guard chặn; vượt được chỉ bằng cách tiêm vào tiến trình trình duyệt (kiểu malware) và phá điều 7. Cookie
  **đã tự dùng lại** trong profile RIÊNG của zemory (`data/browser/<nền>`) — hỏi đăng nhập chỉ xảy ra khi
  chính cookie đó hết hạn. Ghi lại đây để phiên sau khỏi thử lại đường đã chết.

## 🔓 COWORK ĐỌC ĐƯỢC — công thức đã đo xong 2026-07-31, chỉ còn viết adapter
> 🔄 **Đảo kết luận cũ.** `06_CHANGES [2026-07-30d]` ghi *"phiên Cowork không phơi qua claude.ai"*
> vì 3 endpoint đoán mò (`cowork_sessions` · `tasks` · `sync/mcp`) đều 404. **Sai vì đoán sai chỗ:**
> Cowork KHÔNG nằm dưới `/api/organizations/…` mà ở **`/v1/code/sessions`**. Tìm ra bằng cách cắm móc
> vào `fetch` của trang rồi mở thật một phiên (`Page.addScriptToEvaluateOnNewDocument` để móc sống qua
> lần tải lại) — đoán URL 6 lần đều trượt, móc một lần là ra.

**Công thức (đã gọi thật, 200):**
```
GET /v1/code/sessions?tags=cowork-remote&limit=100&include_trigger_sessions=true   → {data[], resume_token}
GET /v1/code/sessions/<cse_id>/events?limit=500                                    → {data[], resume_cursor}
headers BẮT BUỘC (thiếu ⇒ 400, kể cả khi đã đăng nhập):
  anthropic-version: 2023-06-01 · anthropic-beta: ccr-byoc-2025-07-29
  anthropic-client-feature: ccr · anthropic-client-platform: web_claude_ai
  x-organization-uuid: <org có caps 'chat'>
```
**Shape:** session `{id: cse_… , title, created_at, last_event_at, status, user_message_count, tags}` ·
event `{event_id, event_type, created_at, sequence_num, payload}`. Đo trên phiên *"Claude-swap setup"*:
**218 event** → `user` 30 (payload.message.content là **CHUỖI**) + `assistant` 50 (content là **MẢNG block**
`{text}`) = **80 tin thật**; phần còn lại (`system` 61 · `control_request/response` 36 · `env_manager_log` 26
· `result` · `active_goal` · `prompt_suggestion` · `rate_limit_event`) là điều khiển/log.

- [~] **Lane `claude-cowork` — ĐÃ BUILD + chạy thật 2026-07-31, chờ user duyệt để ghi `06_CHANGES`.**
  Làm đúng như ghi chú: **lane phụ của `PLATFORMS.claude`** (`Platform.sub`), chung cửa sổ · chung cổng
  9223 · chung phiên đăng nhập — KHÔNG đẻ `PLATFORMS` thứ ba. Adapter `adapters/cowork.ts`
  (`source=claude-cowork`, origin `web`, `coworkweb-<cse_id>`), đã đăng ký trong `allAdapters()`.
  **Đo bề mặt sống:** `Claude-swap setup` → **63 tin** trong bộ nhớ, nội dung + vai + thời gian đúng.
  - **BẪY đã trả giá — `resume_token`/`resume_cursor` KHÔNG phải con trỏ trang.** Truyền lại vào
    `/v1/code/sessions` là endpoint chuyển sang **long-poll và không bao giờ trả về**: lần chạy đầu treo
    **25 phút, CPU chỉ 10 giây**, không lỗi không log. Nay gọi MỘT lần, không phân trang.
  - **Kèm sửa lớp dưới:** `Cdp.evaluate` giờ **có hạn giờ 90s** rồi NÉM. Trước đó `awaitPromise` chờ vô
    hạn nên một expr treo là treo cả tiến trình — lỗi này không riêng Cowork, mọi nền đều dính.
  - **Tiêu đề phải lấy từ DANH SÁCH**: `GET /v1/code/sessions/<id>` KHÔNG trả `title` (đo: chỉ có
    `response_shape`), nên phiên vào bộ nhớ không tên nếu không dập nhãn từ list.
  - Còn lại: danh sách mới lấy **1 trang (limit=100)** — tài khoản >100 phiên Cowork thì cần tìm cách
    phân trang THẬT (không phải resume_token). Chưa có tài khoản nào để đo.

- [ ] **CHƯA LẤY ĐƯỢC 3 phiên Cowork user CẦN — nằm ở TÀI KHOẢN CLAUDE KHÁC (hoãn, user chốt
  2026-07-31: *"fix app zemory lấy dc cowork thì sẽ fix sau"*).**
  Ba phiên cần: **Harness AI frameworks comparison** · **Bootstrap setup** · **Vietnam 34 provinces
  GRDP dashboard**. Đã loại trừ mọi khả năng khác bằng đo, KHÔNG phải đoán:

  | Đo (2026-07-31) | Kết quả |
  |---|---|
  | `/v1/code/sessions` × 7 giá trị `tags` (`cowork-remote`·`cowork-local`·`cowork`·`product:*`·`config:*`·`claude-code`·`code`) | đều **1 phiên** |
  | thử **cả 2 org** của tài khoản | org caps `chat`: 1 phiên · org caps `api`: **403** |
  | tra 2 tiêu đề trong TOÀN BỘ GM | không có (chỉ ra chỗ agent *nói về* chúng) |
  | Claude Desktop lưu cục bộ trên máy | **không tồn tại** thư mục nào |

  ⇒ chúng không thuộc `huy.nguyen@sasin.vn`. **Hạ tầng đã sẵn** (khe tài khoản: profile riêng + cổng
  riêng, quét lặp qua mọi khe, nút ＋ trong bảng Liên kết; khe `claude-2` đã tạo, cửa sổ đứng ở
  `claude.ai/login`). **Việc còn lại của USER:** đăng nhập tài khoản chứa 3 phiên đó vào cửa sổ khe 2 →
  app tự kiểm 5s/lần rồi tự kéo (cả chat lẫn Cowork).

- [ ] **CÂU HỎI đang chờ chính 3 phiên đó trả lời — bộ chuẩn Cowork có bị CẮT QUÁ TAY?**
  Nguyên văn user (`GM #2136043`, 2026-07-30): *"bộ cowork rút gọn là lúc t làm việc bên cowork của
  claude, bên đó bàn là để **tiết kiệm token khi load**, mới loại bỏ khá nhiều, vì **cowork ko có bộ não
  global như hệ claudecode** nên nó ko chứa nhiều thông tin để nén dc… nhưng **tui ko nghĩ là nó lại cắt
  quá nhiều như vậy**… t cần bạn tra gm để kiểm tra **đã nói gì và đã quyết định ntn**"*.
  **Nghi vấn cụ thể nhất:** bộ cowork **không có `03_STRUCTURE`** (chỉ `01_CONSTITUTION`·`02_RULES`·
  `05_TODO`·`06_CHANGES` — đo `GM #2136037`), trong khi user khẳng định (`#2136034`) *"logic ban đầu của
  tui chính là để 03 làm luôn công việc của dictionary… ý định ban đầu là hợp nhất vào 1 file"* và 03
  vốn **vừa là cây thư mục vừa là mô tả từng dòng** (`#2136039`·`#2136041`).
  ⇒ Cần **quyết định gốc** (cắt gì · vì sao) để chấm "cắt này có lý do token thật hay quá tay".
  *(2026-07-31: user sẽ COPY THẲNG nội dung từ Cowork sang thay vì chờ capture.)*

## 📐 Đối chiếu bộ COWORK vs bộ ĐẦY ĐỦ (đo 2026-07-31) — 2 việc
> Nền quyết định (GM `#2131427`, user 29/07): *"dùng harness zemory **ko có nghĩa là toàn bộ**… kết hợp
> với harness của chính claude… **vẫn đủ ý, đủ luật của zemory** và **cắt nhỏ lại phù hợp cho memory
> ngắn hạn của claude**… nếu cần thì sẽ **bổ sung thêm phần template cowork lại**"*.
>
> **Kết quả đối chiếu — phần lớn KHÔNG mất, chỉ đổi nhà:** `03_STRUCTURE` (130 dòng) → skill
> `structure/` (SKILL 97 + conventions 129 + `check_structure.py` 227) — **nhiều hơn bản gốc**, giữ đủ
> cây-có-mô-tả + routing + dòng `docs/dictionary.md`. `04_SKILLS` (233) → 13 skill nạp on-demand.
> Changelog/supersede → `session-close` Bước 3. Global Memory-verify → `session-close` Bước 1 **có rào
> 🖥️ "chỉ khi có zemory CLI"**. Bộ cowork còn SỬA một lỗi của template gốc: `audit` bỏ 3 mặt app-only
> (`npm run check` · FE↔BE · `integrity_check`) vốn không áp được cho non-app.

- [ ] **`docs_template/cowork.7z` đang nằm trong repo mà chưa bị gitignore.** Nó là bản RENDER
  (1,6 MB nhị phân), luật của chính bộ chuẩn xếp loại này vào `exports/` + gitignore. Hiện chỉ
  đang không-add bằng tay — lần commit sau ai đó `git add -A` là nó lên remote. Chọn một: thêm
  `*.7z`/`*.zip` vào `.gitignore`, hoặc dời file ra ngoài repo.

- [ ] **RERANK: bật mặc định hay không — HP điều 12 đang chặn, cần user chốt.**
  Trạng thái thật (đo 2026-08-02): rerank **đang BẬT** cho máy này (`data/config.json` có
  `"rerank": true`) — không hề bị auto-disable. Cái tắt là **mặc định trong code**
  (`getRerankSetting()` chỉ bật khi config ghi rõ `true`), nên mất/reset `data/config.json`
  (máy mới, clone lại không kèm `data/`) là rerank âm thầm tắt mà không ai biết.
  - Lý do lịch sử đã YẾU đi: 28/07 đo 4.616 ms vs 29.304 ms (**6,3×**); **02/08 đo lại: 4,8 s vs
    9,9 s (2,1×)**.
  - Nhưng `HP điều 12` đòi **thắng net trên corpus có nhãn** mới được bật mặc định, và corpus gate
    hiện **bão hoà**: FTS 0% · hybrid **100% (8/8)** · rerank 100% — không thể thắng net.
  - Hai đường ra: ① **dựng corpus nhãn lớn/nhiễu hơn** rồi chạy gate thật (đúng đường, `plan/05`
    dòng 73 đã ghi sẵn ý này); ② user **chốt miễn điều 12 cho lớp này**, tôi ghi supersede rồi đổi
    mặc định. KHÔNG tự làm ② — sửa hiến pháp là quyền user.

## 🔌 Đối chiếu engram (audit 2026-08-02) — 6 việc, xếp theo giá trị đo được
> Nền: engram 22 tool MCP · zemory 8. Đã map: 6 cái có tương đương · **9 cái KHÔNG áp dụng**
> (`mem_save`/`update`/`session_*`/`suggest_topic_key` — trí nhớ engram do agent tự viết, zemory
> nạp transcript tự động + lấy file docs làm nguồn ⇒ thêm đường ghi cho agent là mở đường ghi
> thứ hai vào lớp dẫn xuất, phạm điều 3). Sáu cái dưới là phần THIẾU THẬT.
> ⚠ Mọi mục ở đây chỉ áp cho hệ **app + non-app**. **Cowork KHÔNG dùng được MCP** — nó chạy
> trong máy ảo riêng, không với tới `zemory` trên máy thật (`BOOTSTRAP §Bối cảnh`).

- [ ] **① Cài "Memory Protocol" khi `setup mcp` — giá trị cao nhất.** engram không chỉ khai server:
  nó nhét luôn lời dặn *khi nào gọi trí nhớ* vào file chỉ dẫn của từng agent (`GEMINI.md` ·
  `global_rules.md` · `QWEN.md` · steering của Kiro), cộng hooks + compaction recovery; riêng
  Claude Code là **plugin marketplace**. zemory hiện **chỉ khai server** (đo: 0 dòng cài chỉ dẫn).
  Hệ quả: với Cursor/Windsurf/Qwen thì tool **có mà agent không biết lúc nào gọi** — `AGENTS.md`
  chỉ ăn với agent chịu đọc nó. Đây là thứ biến 8 tool từ "có" thành "được dùng".
- [ ] **② `mem_judge`/`mem_compare` — xung đột ở TẦNG TRÍ NHỚ.** zemory nay đánh dấu được quyết
  định đã bị đảo (4 link tất định trong changelog), nhưng hai bản ghi trong kho nói ngược nhau thì
  vẫn nằm im cạnh nhau. **Vừa được mở đường**: HP điều 6 đã nới (2026-08-02b) nên phán bằng model
  là hợp lệ — nhưng phải theo thứ tự ①script → ②agent liên kết → ③model.
- [ ] **③ `merge_projects` — gộp dự án bị tách tên.** zemory **đã dính đúng bệnh này**: `D:\` vs
  `d:\` từng tách index làm đôi (24 dòng một bên, 15 dòng mồ côi bên kia), vá bằng `normalizeRoot`
  nhưng **không có công cụ gộp phần đã lỡ tách**. Cần: gộp theo khoá chuẩn hoá, in bảng trước khi
  làm, và KHÔNG xoá dòng gốc.
- [ ] **④ `memory_doctor` qua MCP** — chẩn đoán chỉ-đọc hiện chỉ có ở CLI, agent không gọi được.
  Rẻ: bọc `gatherStatus()` như đã bọc `memoryInfo()` cho `memory_stats`.
- [ ] **⑤ `pin`/`unpin`** — cột `sessions.project_pinned` **đã có sẵn trong schema**, chưa phơi ra
  đường nào. Ghim một phiên để nó nổi lên đầu `memory_context`.
- [ ] **⑥ Transport HTTP** — engram có `serve :7437`, zemory chỉ stdio. Chặn đúng ca agent chạy
  trong Docker/máy ảo không spawn được tiến trình host.

- [ ] **Ba agent chưa khai tự động được** (đã nêu tên trong `setup mcp`, không im lặng bỏ qua):
  `codex` (cấu hình **TOML**, cần bộ ghi riêng) · `opencode` (khoá `mcp`, khuôn entry `type: local`)
  · `pi` (nối bằng plugin package, không qua file MCP).

## 🔬 Audit 2026-07-27 — còn 1 finding
- [~] **5 export mồ côi — NỐI 4, CÒN 1.** `embedProbe`+`embedDims` → check `vector` THẬT · `rerankProbe` → check `rerank` THẬT (trước đây hai mục này chỉ hiện trạng thái theo CÔNG TẮC, tức báo "on" kể cả khi model không tải nổi) · `schedulerChildRunning` → cờ `embedRunning` trong `/automation` (đúng thứ đã làm mọi endpoint chậm 2–9× mà UI im lặng). **Còn `resolveDocPath`**: là guard bảo mật trùng Ý với đoạn inline ở `readDoc` (`ui.ts:496`) nhưng KHÁC ngữ nghĩa resolve — gộp là refactor guard bảo mật, không phải dọn dẹp, nên để riêng.

## 🧹 Từ đợt P2/P3 + Graph Engineering — còn mở
- [ ] **Edge id chưa ai TIÊU THỤ.** Mới có phía phát (payload `/code-graph`). Bước sau: cho agent dẫn `edge:<id>` trong khẳng định, rồi thêm phép đo "cạnh được dẫn có thật không" (metric *cited-edge validity*).
- [ ] Đã đối chiếu bản "Graph Engineering" (user gửi 2026-07-27) với graph mình. **Khoảng trống lớn nhất còn lại: KHÔNG có phía WRITE** — worker đọc được graph nhưng không publish phát hiện ngược lại kèm `run_id`/provenance; và **không có lớp công việc** (không node `AgentRun`/`Claim`/`Evaluation`). Chấm theo thước của tài liệu, zemory đạt *artifact · source · graph path*, thiếu *objective · plan · evaluator decision · execution record*. **KHOAN xây** — chính tài liệu cảnh báo "đừng thêm knowledge graph chỉ vì hệ có agent"; graph hiện đang kiếm đủ tiền nuôi thân ở vai cấu trúc + định tuyến.
- [ ] **`04_SKILLS` phình 92 → 203 dòng** (+121%) — file tự khai guardrail "KHÔNG BAO GIỜ phình". Thêm skill nữa thì phải tách sang `external/skills/`.

**🚫 ĐÃ LOẠI — false-positive (giữ lại để phiên sau khỏi báo lại)**
`/set-` "404" = chuỗi động `'/set-'+nm` · `data-act="recall"`/`sysrecheck` "không handler" = có, qua `closest('[data-act=…]')` · `share/share.key` committed = **KHÔNG còn là false-positive** — repo hoá PUBLIC nên giả định "keep repo private" mà quyết định đó dựa vào đã sai; chìa đã xoay + gỡ khỏi git 2026-07-29 · `/cockpit` "gãy" = không gãy (lúc đo daemon đang tắt) · `/nav-cost` `/gate-acquire` `/gate-release` `/sync` `/migrate` "dead" = CLI/surface khác dùng.

## ⭐ Ưu tiên kế tiếp
> Toàn bộ diễn biến UI refactor (VÒNG 1–11, plan 15, 5 quyết định) đã XONG và dời sang `archive/05_TODO.md` + `06_CHANGES`. Dưới đây chỉ còn thứ chưa chốt.

**CÒN TREO từ đợt UI refactor:**
- [ ] **user duyệt mắt bản 5 màn** → OK thì ghi `06_CHANGES` + commit (4 file: `app.html` · `app.js` · `app.css` · docs).
- [ ] **`/session-raw` (đọc transcript gốc) — CHƯA làm, chờ user quyết**: chỉ bù được **4,18%** tin bị clip + khối `thinking` bị bỏ lúc ingest; và với session **sync từ máy khác thì file không có ở máy này** (`ingest_state` toàn đường `C:\Users\Zyro\...`) ⇒ phải fail-open về DB. ROI thấp, nêu ra để user chốt chứ không tự làm.
- [ ] `adapters` — slot chính thức trong `03` hay domain-internal (allowlist).
- [ ] **model-routing theo task** — idea-only, ĐỤNG điều 6, chờ chốt hướng (KHÔNG tự mở điều 6).
- [ ] **Nợ nhỏ:** daemon exit-1 (hộp đen đã cắm, chờ repro) · tách `app.js` sâu theo concern (khi `cockpit.html` nghỉ hưu) · Start Menu icon = **user sign-out/in** (file đã đúng).

**🔥 VIỆC KẾ TIẾP:**
- [~] **(user giao 2026-07-16) SasinFlow — UI 1 file HTML quá bự — ĐÃ KHẢO SÁT + CÓ PHƯƠNG ÁN, CHỜ USER DUYỆT ĐỂ TÁCH CODE (làm BÊN repo SasinFlow):** survey xong (07-16/18): `frontend/index.html` = **5.150 dòng** (JS ~4.020/307 func = 78% · 127 `onclick=` inline · CSS ~680 · HTML ~430). Phình vì **JS logic**, KHÔNG phải ảnh (0 base64, 1 SVG inline, 2 CSS url). **Assets đã ĐÚNG CHỖ, không cần fix:** logo UI → `frontend/assets/logo.png` · icon .exe (`sasin.ico`, `.spec` đọc) + icon tray/desktop (`sasin_icon.png`, `desktop.py` pystray) → `backend/resources/packaging/`. Hạ tầng sẵn sàng tách (FastAPI `StaticFiles` mount + `.spec` bundle nguyên folder → KHÔNG ràng buộc single-file). **Phương án 4 bước:** CSS ra `styles/` → cắt JS thành nhiều `<script src>` GIỮ global scope → gỡ inline `onclick=` → nâng ES module. Convention **"UI no-build"** + phân biệt 3-vai-trò-icon đã vào `03_STRUCTURE §5` (2026-07-18). **CÒN LẠI: user gật → tách code (repo SasinFlow, KHÔNG phải ở đây; cross-project).**
- [~] **Đo tốc độ embed/ngày — VẪN CHƯA có số ngày-thường sạch.** Mẫu cũ (07-12, mega-session) = 41 msg/phút, lệch. Rebuild plan 12 (27 giờ, 94k message tồn đọng) cho thấy tốc độ dao động 40–380 msg/phút tùy độ dài message, nhưng đó là backlog dồn cục, KHÔNG phải nhịp ingest hằng ngày. Việc còn lại: sau 1 ngày dùng bình thường (không rebuild), chạy `zemory memory embed --all` + bấm giờ cho SỐ MESSAGE MỚI TRONG NGÀY ĐÓ để ra phút/ngày thật; nếu >20 phút → cân nhắc q4 dtype (hỏi user). **(2026-07-17) ĐO THẬT xong:** backlog 10291 → `memory embed --all` clear HẾT (remaining 0, +10433 vector, 21 pass, ~10834s ≈ 3h) ⇒ **~57–58 msg/phút** (256d · gemma q8 · CPU máy này). Tổng index 109.366 vector. **VẪN CÒN:** đây là backlog-rate; số **ngày-thường** (chỉ msg mới 1 ngày, chạy cuối ngày) mới chốt được q4 — ở ~58/min thì ngưỡng ">20 phút" ⇔ >~1160 msg mới/ngày.
- [ ] **(chờ user, việc ở repo khác) SasinFlow còn tồn đọng 9 entry changelog:** 9 entry 07-14→07-16 chỉ nằm trong `.md`, DB không có (tôi xóa khi khôi phục theo lệnh user). Với code mới **không mất được nữa** (CRLF đã vá + render salvage). Theo **FILE WINS**: 9 entry đã nằm trong `.md` (nguồn) nên coi như đủ; DB chỉ là index search, dựng lại từ file khi cần. (`docs sync` đã gỡ 2026-07-16.) KHÔNG tự sửa repo đó (`02_RULES §Phạm vi project`).
- [ ] F2. (TẦM NHÌN, sau core) Mở RAG sang **data chính** (ngoài memory agent): retriever **đa-store + `kind`**, chung model + retriever, DB tách được. Ý tưởng user — plan 05 §4.F.
- [ ] (Nếu cần quên tuyệt đối) Source-transcript privacy/tombstone: xóa/redact transcript gốc của agent host hoặc ghi tombstone chống whole-file adapter re-ingest lại dữ liệu đã quên.
- [ ] (TẦM NHÌN, tuỳ chọn — không bắt buộc v1) Session digest **B agent-authored**: khi recall chạm phiên, agent hiện tại đọc transcript viết đè `kind=agent` (có anchor). Bỏ B1 "agent tự viết lúc kết thúc". KHÔNG để zemory tự gọi LLM API. Spec: `docs/plan/06_digest.md`.
- [ ] **(user nêu 2026-07-20 — ĐỀ XUẤT KIẾN TRÚC, chờ chốt) Skill CHUNG vs skill RIÊNG từng repo.** User: *"skill đang tính chung như Claude skill chứ không tính riêng cho từng repo — skill chung nằm ở rule tổng 02, skill riêng ở 04?"* Vấn đề THẬT: 04_SKILLS hiện ship 3 skill generic (grill · chốt phiên · reconcile) giống nhau mọi repo, KHÔNG có ranh giới với skill riêng repo tự thêm — sync/gap-fill không phân biệt được, người đọc không biết cái nào là chuẩn. **Phản biện của agent (chờ user chốt):** KHÔNG dời skill chung về `02_RULES` — 02 vừa được dọn sạch playbook (2026-07-18, single-responsibility: 02 = luật + trigger, 04 = kho playbook); dời ngược = tái phạm. Đề xuất thay thế: **giữ 04 làm kho duy nhất, phân 2 TẦNG trong file** — `## Skill chuẩn (ship từ docs_template — nguồn là template, repo không sửa tay)` vs `## Skill riêng của <PROJECT>` (repo tự thêm); template `docs_template/agent/04_SKILLS.md` là NGUỒN của tầng chuẩn (đúng vai trò "chuẩn chung" user muốn), sync gap-fill chỉ đắp tầng chuẩn. Cần chốt: dời về 02 (ý user) hay 2-tầng trong 04 (đề xuất) → mới sửa template + adopt.

## 🔥 Từ chốt sổ 2026-07-21 — làm trước
- [~] **DAEMON THOÁT exit 1 KHÔNG LOG (2026-07-21, thấy 1 lần) — ĐÃ CẮM HỘP ĐEN 2026-07-22, chờ repro để chẩn gốc.** Nghi **crash NATIVE** (better-sqlite3/onnxruntime segfault — bỏ qua handler JS) HOẶC stderr detached không capture. **Đã làm:** `backend/src/logging/daemon-log.ts` — `daemonLog()` ghi `~/.zemory/logs/daemon.log` (mirror stderr) cho mọi lifecycle (up/shutdown/exit/uncaught/unhandled) + `armCrashReport()` bật `process.report` (reportOnFatalError + reportOnUncaughtException) → dump JSON **stack native** cạnh log. `ui.ts` arm ngay khi thắng port. **CÒN LẠI:** chờ lần daemon chết tiếp theo → đọc `daemon.log` + `report.*.json` để chẩn gốc; nếu tái hiện được thì chạy foreground + ép embed↔sync xen kẽ.
- [ ] **(ĐỀ XUẤT — chờ user) Tách "lưu đầy" khỏi "index đầy".** +231 MB chủ yếu do FTS trigram index nuốt cả tool-dump 50 KB — mà tìm trigram trong dump máy thì giá trị recall thấp. Đúng mô hình user mô tả (*"1 lớp full đầy đủ, 1 lớp lọc"*): giữ `messages` ĐẦY làm nguồn, nhưng **lớp DẪN XUẤT (FTS/vector) chỉ index phần đáng tìm** — vd bỏ qua block > N KB hoặc bỏ tool-dump khỏi trigram. Cần đo trước: FTS chiếm bao nhiêu trong 231 MB đó.

## 🧩 Graph — phase sau
- [ ] **Phase D** (tsserver/pyright → cạnh `resolved`) — HOÃN theo decision rule (đếm câu hỏi "sửa X đụng ai" trượt trong 2–4 tuần). **MCP mirror** `graph_neighbors`/`graph_impact` — CHƯA wire (`mcp.ts` 0 match `graph`). Schema-change policy cho `graph.json` v2 — chưa viết.
- [ ] **(ĐỀ XUẤT — chờ user chốt, gợi ý từ Grapuco 2026-07-22) Hạng cạnh CONTRACT / BE↔FE seam — hấp thụ "cái mạnh nhất" của Grapuco theo đúng kiểu đã làm với CALM.**
  **Bối cảnh:** bài FB nhóm giới thiệu **Grapuco** (SaaS): AST toàn codebase → dependency/call/module graph + flow · **phát hiện phần bị ảnh hưởng khi API/schema/function đổi** · context cho agent qua MCP · chat-with-codebase · security scan · recommendation+priority. Bài toán nó nhắm = **2 người vibecode BE/FE lệch nhau**: BE thêm field / đổi schema → FE chưa cập nhật; FE đổi luồng đăng ký → BE giữ business rule cũ. User muốn hấp thụ **đúng phần mạnh nhất** (contract-impact BE↔FE) vào graph zemory, **KHÔNG** lấy phần LLM (chat/security/recommend — trái điều 6).
  **Insight then chốt (vì sao zemory hợp hơn Grapuco):** Grapuco phải **ĐOÁN** kiến trúc từ code trần; zemory **ĐỌC VAI TRÒ đã khai trong chuẩn 03** → suy cạnh khai báo mà không cần đoán. **Chuẩn 03 chính là "hệ nối" để graph nhìn được luồng BE↔FE** — đây là lợi thế không đối xứng, thứ Grapuco không có.
  **Cạnh mới cần thêm (hạng KHAI BÁO, 0-LLM, fail-open — mở rộng plan 13 §4, KHÔNG tạo capability mới, đúng điều 4/13):**
   - `frontend/api/` → `backend/src/api/` : seam FE-gọi-BE (slot-level, tất định từ 03 §4).
   - `backend/src/contracts/` (OpenAPI/proto/GraphQL-SDL) → node `endpoint` + `schema.field`, cạnh `field → endpoint → handler`.
   - `backend/src/store/` + `migrations/` → node `schema.field` (điểm BE đổi field).
   - `backend/src/shared/` (type dùng chung BE↔FE) → cạnh **`resolved`** khi 2 bên import chung type.
   - Ghép chuỗi: `store.field → contract.endpoint → frontend/api call → component/test` ⇒ `graph impact <field>` trả về **FE nào gãy** khi BE đổi field.
  **TRẦN — GHI RÕ để agent sau KHÔNG tưởng graph fix triệt để (3 tầng, theo điều 13):**
   1. Luồng **KHAI BÁO** (import · slot-seam · **contract typed**) → tự động, `resolved`/`declared`. Chuẩn 03 + typed contract cho không phần này.
   2. Luồng **SUY LUẬN** (FE gọi `fetch('/api/x')` chuỗi viết tay, KHÔNG codegen) → chỉ `inferred`/`textual`, **GẮN NHÃN**, KHÔNG giả dạng chắc chắn. Đây là **TRẦN, bằng Grapuco** — chuẩn 03 thu hẹp chỗ tìm chứ **không xoá được** việc phải match URL.
   3. Luồng **NGỮ NGHĨA** (business rule · thứ tự bước đăng ký · field giờ bắt buộc) → **NGOÀI TẦM MỌI GRAPH, mãi mãi**. Đây chính là lý do "vá BE/FE hoài không hết": đang lấy công cụ CẤU TRÚC đánh vào bài toán NGỮ NGHĨA. Grapuco cũng không giải được lớp này dù marketing gộp chung.
  **"Fix triệt để" KHÔNG bằng graph (ghi để khỏi kỳ vọng ảo — bài học plan 13 §7 counterfactual):** đòn thật cho tầng 1 = **contract-first + codegen 2 đầu** (OpenAPI→openapi-typescript/orval · tRPC share type trực tiếp · GraphQL-codegen) → **`tsc` biến drift thành LỖI COMPILE** (khoá cứng, không phải "phát hiện sau"). Tầng runtime/một-phần-ngữ-nghĩa = **contract test (Pact/consumer-driven)**. Graph = **KÍNH SOI** blast-radius; codegen+tsc = **KHOÁ CỨNG**. Repo chưa có typed contract → **việc số 1 là dựng contract, KHÔNG phải graph**.
  **Điều kiện để graph mạnh THẬT:** repo phải (a) bám chuẩn 03 để đọc vai + (b) có typed contract để field-level lên `resolved`. Thiếu (b) → phần BE↔FE field-level chỉ `inferred`, không hơn Grapuco.
  **Protocol đo Grapuco TRƯỚC khi tin/hấp thụ (như đã đo CALM plan 13 §9 — KHÔNG tin marketing):** Grapuco là SaaS, không có code để mổ ⇒ **dùng thử trên 1 repo BE/FE THẬT**, **cắm 1 drift đã biết** (đổi tên/xoá 1 field schema), đo: (i) có chỉ ĐÚNG FE component/call/test đụng không · (ii) có báo NHẦM (false-positive) không · (iii) xuyên HTTP boundary nó match `resolved` hay chỉ đoán chuỗi. Lưu ý: tracing xuyên HTTP boundary là chỗ mấy tool này hay RÒ nhất; con số kiểu "29–241×" (CALM) là so với đọc-cả-file, KHÔNG phải so grep.
  **KHÔNG hấp thụ (trái điều 6 — zemory 0-LLM):** chat-with-codebase · security scan · recommendation LLM.
  **Chỗ sẽ code khi user chốt:** thêm parser contract (OpenAPI/GraphQL) + resolver FE-call vào graph engine (`backend/src/memory/graph*.ts`), hạng cạnh mới trong `graph export` (bump schema v3), `graph impact` in thêm seam BE↔FE (kèm nhãn confidence). Cross-repo (BE repo + FE repo tách) join bằng contract làm khoá qua `graph export --all`. Sau khi user duyệt design đủ sâu → graduate spec sang **plan 13 §4** (plan = spec đã chốt; TODO chỉ giữ đề xuất).

## 🧠 Kho skill vendored — còn mở
- [ ] **`ui-ux-pro-max` mới VENDOR + INDEX, chưa có ca ÁP DỤNG thật nào** — chưa dùng nó thiết kế/nắn UI nào của zemory.
- [ ] **Cấu trúc `external/skills/` — user để ngỏ:** giữ 1 tầng `skills/` (kho enumerate được) hay **phẳng** `external/<repo>/` (đúng luật "đừng tạo cấu trúc chưa có nhu cầu" vì hiện `external/` chỉ có skill). Đổi = 1 lệnh `mv` + 3 dòng docs.
- [ ] **`.claude/skills/` wrapper** (bản gọi-được cho Claude Code) — user: "backup phụ, có hay không cũng được". Chưa làm.
- [ ] **Lệnh `zemory skill add <repo-url>`** (clone vào kho đúng khuôn) — ý tưởng nêu ra, chưa quyết.
- [ ] **Skill chung vs riêng 2 tầng** (mục ở §Ưu tiên kế tiếp) — mô hình vendored đã trả lời phần lớn; cần rà lại mục đó xem còn gì.

## Quyết định mở / cần chốt
- [ ] **`01_CONSTITUTION`: KHÔNG gộp §Mục đích với §Điều khoản (user hỏi, agent trả lời 2026-07-26 — chờ user xác nhận đóng).** Đã đo: riêng zemory có **45 cạnh `references` trỏ vào `hp:N`**, cộng SasinHarvest 14 + SasinFlow 11 ⇒ **~70 trích dẫn "điều N" xuyên docs**. Gộp = đánh số lại = **hỏng cả 70 trích dẫn**, và `06_CHANGES` cấm sửa entry lịch sử nên không vá ngược được. Hai mục cũng khác BẢN CHẤT: §Mục đích định nghĩa zemory LÀ GÌ (+ phi-mục-tiêu), §Điều khoản là luật ĐÁNH SỐ được trích dẫn khắp nơi. **Nỗi lo "gộp sợ tràn/bể UI" không được giải bằng việc gộp** — độ dài file y nguyên; thứ thật sự trị là lớp graph vừa dựng (điều N thành node, có legend + bộ lọc + bấm nhảy) thay cho việc cuộn một file dài. *(Bẫy parse hai-list-đánh-số đã trị bằng cắt đúng section — không phải lý do để gộp.)*
- [ ] **(Ý tưởng user 2026-07-23) Zemory tự đổi model/agent Claude theo việc lớn·nhỏ để tiết kiệm chi phí.** ĐỤNG THẲNG **điều 6 hiến pháp** ("zemory KHÔNG BAO GIỜ tự gọi LLM / không proxy model API" — trí tuệ là agent lái terminal, zemory chỉ là bộ nhớ + kỷ luật). Đây là đổi BẢN CHẤT zemory (bộ nhớ thụ động → lớp điều khiển agent), không phải chi tiết nhỏ. User đã chọn: CHỈ ghi ý tưởng, KHÔNG code, chờ chốt hiến pháp trước khi làm gì tiếp. 3 hướng đã trình: (a) sửa hiến pháp mở khe cho model-routing (thay đổi tầng cao nhất) · (b) để CLI/agent tự quản (Claude Code đã có setting chọn model riêng, zemory không đụng vào) · (c) (chưa trình) zemory chỉ ĐO/GỢI Ý tín hiệu độ lớn task (vd token ước tính, số file đụng) qua UI/API cho AGENT tự quyết — vẫn 0-LLM vì zemory không tự gọi/đổi model, chỉ cung cấp số đo.
- [ ] **(Graph — plan 13 §8) Loại lỗi nào build TRƯỚC?** Đã trình 8 loại; user CHƯA chọn. Ba nhóm: (a) link gãy + orphan (docs, rẻ, làm ngay được) · (b) **blast-radius** "sửa X đụng ai" (cần đọc import code) · (c) traceability "requirement nào chưa có test". Prototype 2026-07-18 đã chứng minh (b) chạy được: code-graph 55 module/154 import, tìm ra **orphan thật `core/index.ts`** (barrel 0 ai import), fan-in `memory/db.ts`=18.
- [ ] **(Graph) Độ mịn + overlay:** v1 dừng ở file hay kéo tới hàm (AST)? overlay "semantic neighbor" (từ vector sẵn) làm v1 hay phase 2? *(đề xuất: v1 không AST, chỉ cạnh khai báo)*
- [ ] **(plan 14 §7) Chưa chốt:** tray bằng gì trên Node · write-gate phủ lệnh nào trước · autostart per-OS làm sao · graph cache để trong DB hay file JSON · chu kỳ auto-sync.
- [ ] RAG còn cần chốt khi mở rộng sang **data chính**: chunk doc dài cho docs/knowledge/code; data chính dùng chung `global_memory.db` (cột `kind`) hay store tách rồi fuse.

## Việc cần xác minh thực tế
- [ ] **`##` heading của doc plan bị parse thành changelog entry (`date=NULL`).** Đo 2026-07-29: `PBI_SasinFlow_Maintain` có 6 entry `date=NULL` mà body là **bảng SQL của `plan/01_legacy_topology.md`** — ai đó trỏ `importChangelog` vào file không phải changelog, và `parseChangelog` nhận mọi `##` nên nuốt sạch. Root còn sống nên đợt dọn `2026-07-29d` không đụng. **Cần chốt:** `parseChangelog` bỏ qua entry không có `[ngày]`, hay `importChangelog` từ chối file thiếu header `# Change Log`? (Cân nhắc: entry hợp lệ ghi ngày trong title kiểu `## 2026-07-16 — …` cũng ra `date=NULL` — cấm thẳng sẽ mất chúng.)
## Phase 2 — Năng lực nặng
- [ ] **Code map AST + adapter host mới** (Gemini/Antigravity · Cursor · Hermes) — chỉ làm sau khi có fixture dữ liệu THẬT. Gồm luôn: hash incremental + import graph/blast-radius, fallback keyword khi parser thiếu. *(gộp 3 mục trùng nhau 2026-07-28)*
- [ ] **Memory promotion (episodic → curated learned-rule) — Ý TƯỞNG rõ (2026-07-18):** episodic memory đã bắt HẾT correction/decision qua các phiên → **nguyên liệu thô đã sẵn trong zemory**. THIẾU cái CẦU: zemory tự **phát hiện correction/decision LẶP LẠI** trong episodic → **ĐỀ XUẤT** nâng thành **memory-luật bền** (constitution/rules/1 memory doc) — **có review, user duyệt, KHÔNG auto-summary thành nguồn thứ hai** (điều 3). Cơ chế hình dung: quét episodic tìm pattern lặp (theme/correction) → xếp hạng theo tần suất → trình user *"correction X lặp N lần, nâng thành rule?"* → user gật mới ghi. Hiện đang để Claude-Code `memory/` gánh TAY. **Đây là "gap thật" duy nhất so với harness pattern 3-trụ** (trụ ② memory); trụ ③ (subagent/critic) zemory CỐ TÌNH bỏ (điều 6 — agent tự orchestrate, Claude auto-spawn subagent rồi).
- [ ] **(user nêu 2026-07-23 — ĐỀ XUẤT capability mới) Quét & ingest BỘ NHỚ CURATED của agent** (Claude Code `~/.claude/projects/<proj>/memory/*.md`+`MEMORY.md`; Codex/Cursor tương tự). **Bổ trợ TRỰC TIẾP** memory-promotion ở trên: thay vì zemory TỰ chưng cất (rủi ro auto-summary — điều 3/6), **ingest cái agent ĐÃ chưng cất sẵn** = fact cao-tín-hiệu, 0 LLM. Là adapter capture MỚI (như web-capture): đọc thư mục memory của host → ingest **read-only** (KHÔNG ghi ngược — điều 3/10) · stamp provenance riêng (`source=<agent>-memory`, `kind=curated` — tách lane khỏi episodic transcript, scope-tree lọc được) · **redact lúc ingest** (điều 7) · dedup + re-ingest khi file đổi (source_sig, giống scanweb full-replace) · recall xếp cao hơn (đã distilled). **Cần chốt:** ① `kind=curated` cột mới hay origin lane? ② map path Claude `<url-encoded-proj>` → project · global `CLAUDE.md`/`MEMORY.md` gắn `--all` · ③ adapter nào trước (Claude Code có cấu trúc rõ nhất). Ghi episodic vẫn giữ; đây THÊM lớp curated-external.
- [ ] Hook harness cảnh báo vi phạm docs nhưng không tự bypass permission host.

## Phase 3 — UI / mở rộng
- [ ] VS Code status bar chỉ đọc status API chung.
- [ ] Toggle provider/adapter có validation conflict và rollback config.

## 🌐 Web-chat capture (spec: docs/plan/07_web_chat_capture.md)
> Thu hội thoại web vào memory. ChatGPT ✓ · claude.ai ✓. Prototype cũ ở `attic/web-capture/`.
> **Quyết định đã chốt (plan 07 §14):** origin = 1 cột · v2b browser-connector (v1 file fallback) · re-pull full replace idempotent · GPT trước · password KHÔNG nhập vào zemory · KHÔNG commit file data thật (PII).
- [ ] **Gemini** là nền web CUỐI còn thiếu — khung `scan-web --platform` đã phục vụ ChatGPT + Claude.ai, thêm Gemini là dùng lại khung.
