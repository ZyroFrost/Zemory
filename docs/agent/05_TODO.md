<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

## 🚨 DB THẬT BỊ HỎNG 2026-08-03 — ĐÃ PHỤC HỒI ĐỦ, còn treo mỗi nguyên nhân gốc
> Phát hiện lúc chạy bench recall: `database disk image is malformed`. Sáng cùng ngày
> `integrity_check` còn **ok**, nên hỏng xảy ra TRONG hôm nay.
> **Kết quả: mất 0 tin.** Kho hiện có **199.360 tin · 1.272 phiên**, nhiều hơn trước khi hỏng.
> Chi tiết đầy đủ ở `06_CHANGES [2026-08-03b]`.

**Thiệt hại (đo, không đoán):** hỏng nằm ở `messages_fts*` · `section_fts*` · `changelog_fts*`
· `session_digest_fts_tri*` (bảng bóng FTS — 100% dẫn xuất) và chạm cả **bảng nguồn**:
`messages` · `attachment` · `section` · `changelog` · `vec_map`.

**Bản gốc hỏng giữ nguyên 2 bản** ở `data/corrupt-20260803-091106/` — KHÔNG xoá cho tới khi
truy xong nguyên nhân gốc (nó là vật chứng duy nhất).

- [x] **Đã xong:** cứu theo lô-chia-đôi (198.758) → chép 127.700 vector → dựng lại 7/7 FTS →
  `integrity_check: ok` → kiểm nghiệp vụ (FTS ra 31.748 dòng, CLI tìm đủ ba lớp) → đổi chỗ →
  `memory scan` nạp lại 144 tin từ transcript gốc ⇒ **+602 tin, mất 0**.
- [~] **Đang chạy nền:** `memory embed --all` bù **15.718** tin chưa có vector.
- [ ] **TRUY NGUYÊN NHÂN GỐC — chưa kết luận, mới loại trừ được vài đường.**
  - **Đã loại:** đĩa đầy (D: còn **168 GB**) · thư mục đồng bộ đám mây (D: là đĩa cục bộ,
    Drive nằm ở G: — điều 11 không bị vi phạm).
  - **Nghi, chưa chứng minh:** hôm nay là ngày ĐẦU TIÊN chạy **ghi per-message** (hook Stop
    sau mỗi lượt) — tức tiến trình ngắn hạn ghi DB **xen kẽ** daemon + embed nền + script đo.
    `daemon.log` cho thấy **8 lần daemon khởi động trong ~6 giờ ngày 02/08, gần như không lần
    nào tắt sạch** (tôi `Stop-Process -Force` để chạy gate). WAL vốn chịu được kill, nên
    riêng việc kill CHƯA đủ giải thích — nhưng hỏng bắt đầu đúng ở `vec_chunks_rowids` và
    bảng bóng FTS, tức hai cấu trúc do **extension/virtual table** quản lý, không phải B-tree
    thường. Cần xem còn ai mở DB bằng đường khác (`vecConnect` mở READ-WRITE) lúc bị kill.
  - ✅ **ĐÃ ĐỌC CODE, tìm ra HAI khuyết tật THẬT — và đây là bằng chứng, không phải suy đoán:**
    - **① Bộ ba ghi vector KHÔNG nguyên tử (đã sửa).** `vectors.ts` ghi `vec_map` **TRƯỚC**
      vector, `vec_hash` **SAU**, ba lệnh là ba autocommit RỜI. Khớp CHÍNH XÁC với trạng thái
      tìm thấy trong DB hỏng: `vec_map` trỏ tới rowid `vec_chunks` không có, `vec_hash`
      119.784 vs `vec_chunks` 142.840. Bản thân code đã tự thú: comment trong `writeVectorRaw`
      viết *"repair by updating the existing row so backfill can resume **if another writer
      already filled it**"* — tức đường ghi này VỐN đã biết có kẻ ghi song song và chỉ vá tạm.
      ⇒ Đã bọc cả ba vào **một** giao dịch (`insTx`/`copyTx`).
    - **② Write-gate KHÔNG BAO GIỜ TỪ CHỐI ai (chưa sửa).** `acquireCliWrite()` chỉ đặt một
      mốc thời gian và luôn trả `{ok:true, held:true}` — **hai CLI cùng gọi thì cả hai đều
      được "cấp"**. Cổng này một chiều: nó chỉ bảo *scheduler của daemon* nhường, chứ không hề
      loại trừ CLI↔CLI. Tệ hơn: `daemonPort()` trả null khi daemon chết ⇒ **không có cổng
      nào cả**. Ngày 02/08 daemon khởi động 8 lần và gần như không lần nào tắt sạch, trong khi
      hook chạy `scan` mỗi lượt trả lời và tôi gõ `memory embed` bằng tay.
      ⇒ Việc cần làm: đổi `acquireCliWrite` thành khoá THẬT (từ chối khi có người giữ, kèm pid
      + hạn), và đặt marker ra FILE để tiến trình khác thấy được kể cả khi daemon chết.
  - ⚠ **NHƯNG CHƯA GỌI LÀ TÌM RA NGUYÊN NHÂN.** Hai khuyết tật trên giải thích được **lệch
    giữa các bảng vector**; chúng KHÔNG giải thích `database disk image is malformed` ở tầng
    trang đĩa. Muốn kết luận thì phải TÁI HIỆN: ép hai tiến trình ghi `vec_chunks` đồng thời
    rồi kill giữa chừng. Chưa làm được ⇒ vẫn để mở.
  - ⚠ **Phép kiểm mới KHÔNG chứng minh tính nguyên tử — tôi đã thử đột biến và nó vẫn XANH.**
    Gỡ `db.transaction` ra, `vector-write-atomic.test.mjs` vẫn qua: trong một tiến trình không
    bị ngắt, hai lệnh rời vẫn thành công cả hai. Nó chỉ là chốt hồi quy cho lớp lỗi tất định.
    Ghi rõ ở đây để không ai đọc nhầm cổng xanh thành "đã chứng minh".
  - **Chưa xem:** nhật ký sự kiện Windows (lỗi đĩa), và liệu `project_merge apply` hôm qua
    (UPDATE 115 dòng trong một giao dịch) có để lại dấu gì không.
- [x] **TÔI ĐÃ NÓI SAI, tự sửa:** tôi ghi `data/backups/` **RỖNG**. Không đúng — trong đó có
  `global_memory-2026-07-26T12-48-21-379Z.db` (1,12 GB, **171.345 tin · 1.203 phiên**, đọc
  được, `quick_check` chạy). Tôi kết luận "rỗng" từ một lần `ls` sai chỗ và **không kiểm lại**
  trước khi viết vào sổ — đúng cái lỗi mà chính sổ này đã ghi ở mục engram ("tài liệu không
  phải phép đo"). Vậy máy **CÓ** đường lùi, chỉ là cũ 8 ngày (thiếu ~28k tin).
  Cứu + quét lại vẫn là lựa chọn đúng vì nó cho **199.360 tin** — nhiều hơn cả bản trước khi
  hỏng — nhưng lý do phải là "cứu được nhiều hơn", KHÔNG phải "không còn đường nào khác".
- [ ] **Việc còn lại vẫn đúng:** backup đang là chạy tay, lần gần nhất trước sự cố là 26/07
  (8 ngày). Cần **lịch tự động** (`memory backup` định kỳ + dọn bản cũ) để khoảng hở không
  bao giờ dài như vậy nữa. Đã có bản 03/08 sau khi cứu xong.

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

## 🔌 Đối chiếu engram — 6 việc ĐÃ XONG + ghi sổ (`06_CHANGES [2026-08-02f]`/`[g]`, chi tiết ở đó); còn:
> Số nền đo trên BINARY THẬT (engram v1.20.0): engram **22 tool** · zemory **12**. `DOCS.md`
> của họ liệt kê thiếu 2 tool — đọc tài liệu KHÔNG thay được chạy binary. Cowork vẫn ngoài
> phạm vi MCP (máy ảo riêng).

- [ ] **Ba agent chưa khai tự động được** (đã nêu tên trong `setup mcp`, không im lặng bỏ qua):
  `codex` (cấu hình **TOML**) · `opencode` (khuôn entry khác) · `pi` (nối bằng plugin package).
  **Đo trên engram v1.20.0 (2026-08-02) — họ làm được cả ba, và đây là hình dạng cần khớp:**
  `codex` → ghi `%APPDATA%/codex/config.toml` (642 B) + `engram-instructions.md` + prompt phục
  hồi sau nén · `opencode` → `~/.config/opencode/opencode.json` + plugin `engram.ts` **21 KB**
  · `pi` → cài npm `gentle-engram`, cần `pi` trong PATH (thiếu thì lệnh của họ cũng lỗi).
  ⇒ khoảng cách là THẬT, không phải giới hạn của ngành. Rẻ nhất là `codex` (chỉ cần bộ ghi TOML).

## 🧷 Context-guard + realtime capture — ĐÃ BUILD XONG `[2026-08-02h]`; còn 2 việc
- [ ] **Codex chỉ nhận `Stop`** — hệ hook của nó không có `UserPromptSubmit`/`PreCompact`/
  `SessionStart`, nên máy chạy Codex có capture per-message nhưng KHÔNG có đồng hồ context
  lẫn lưới sau nén. Chưa tìm hiểu Codex có sự kiện tương đương không.
- [ ] **Ngưỡng 95% chưa chỉnh được từ UI** (hằng `WARN_AT_PERCENT` trong code). Đợi có ca
  thật muốn đổi rồi hãy phơi ra — thêm một ô cấu hình chưa ai xin là nợ.

<details><summary>Spec gốc (giữ để tra lại lý do từng quyết định)</summary>
> Gốc: đối chiếu "compaction recovery" của engram. **Session-lifecycle KHÔNG làm** (đã có tốt
> hơn, tự động: sessions từ transcript + digest 100%). "Nén từng đoạn hội thoại": digest
> per-phiên ĐÃ CÓ (plan 06, 2026-07-02); compression đúng nghĩa đã BỎ 2026-06-25 (attic/).
> Số đo nền (2026-08-02): usage nằm sẵn trong transcript (`cache_read+cache_create+input` —
> phiên thật đo 439k) · scan incremental cả kho: **7,2s** có tin mới · **1,8s** no-op ·
> **~125s khi embed nền chạy** (tranh CPU + write-gate — hook sẽ timeout, scheduler lượm lại).

- [ ] **① Hook `context-guard` (UserPromptSubmit, Claude Code) — GỘP cảnh báo + lưu (ý user).**
  Đọc `usage` tin cuối transcript phiên hiện tại → % cửa sổ (200k/1M theo model id). Dưới
  ngưỡng ⇒ **im lặng tuyệt đối**. Chạm ngưỡng (mặc định **95%**, config được) ⇒ MỘT phát làm
  cả hai: ingest ngay ĐÚNG file transcript này (đường scan-1-file mới, xem ③) + in 1 dòng:
  *"⚠ context ~95% — phiên đã lưu FULL vào GM. Chốt việc dở/ghi sổ trước khi bị nén; sau nén
  gọi `memory_context`."* Chống spam: **1 lần/phiên** (cờ marker). Verify lúc build: kênh
  hiển thị hook output tới user; công thức % có sai số cache/model.
- [ ] **② Lưới sau nén:** `PreCompact` → scan lần cuối ngay trước nén (đỡ ca compact ập tới
  không qua ngưỡng) · `SessionStart(matcher: compact)` → thẻ phục hồi 1-LẦN (`recallCard` +
  câu "vừa bị nén — kho còn nguyên, tra lại trước khi làm tiếp"). Handler session-start ĐÃ CÓ
  SẴN trong `capture-hook.ts` (opt-in chưa cài) — chỉ thiếu khai matcher. Đây là auto-inject
  đầu tiên của hệ: 1 thẻ nhỏ, đúng 1 lần, đúng sự kiện mất trí nhớ — user đã chốt; ghi
  changelog như diễn giải điều 8 (điều 8 cấm *broad memory mỗi prompt*, không cấm thẻ này).
- [ ] **③ Realtime capture — LÀ ĐƯỜNG NẠP CHÍNH, mặc định BẬT (user chốt lại 2026-08-02:
  *"nhịp 10' là lần đó chưa xét kỹ — mỗi 1 mes phải tự đưa lên luôn mới đúng"*).**
  > 🔄 Đảo thiết kế cũ của chính mục này ("công tắc thứ 4 thêm vào"): realtime **THAY** vai
  > nạp chính của `maintainTick`; hệ nhịp cũ KHÔNG bị xoá mà **teo thành lưới bù** — chỉ giữ
  > cho hai thứ vật-lý-không-per-message-được (embed: load model ONNX vài giây/lần · chiều
  > IMPORT: bundle máy khác trên Drive không có sự kiện để nghe, phải poll) + quét bù nguồn
  > không hook / hook trượt (đo: hook timeout khi embed nền chạy, ~125s).
  **Kiến trúc chốt:**
  - **Nạp:** Stop hook (đã tồn tại: `zemory hook install` → Stop → `scan()`) thành **mặc
    định** — cài trong `init`/`setup`/`doctor` nhắc; mỗi reply ingest **đúng 1 file** từ
    `transcript_path` (đo: cả kho 1,8–7s → 1 file mục tiêu <1s; comment "fast, incremental"
    trong `capture-hook.ts` đang nói quá) + digest regen phiên đó (sẵn có).
  - **Drive sync: GIỮ NGUYÊN poll 30' hai chiều như cũ** (user chốt 2026-08-02 sau khi cân:
    per-message/event-driven chưa đáng đợt này, thủ công thì quên là lệch máy). Event-driven
    debounce theo cụm ghi lại thành nâng-cấp-sau-nếu-cần, KHÔNG làm đợt này.
  - **Vì sao per-message chứ không 5'/10' (số đã đo, ghi để khỏi bàn lại):** poll trả chi phí
    theo THỜI GIAN (6–12 scan/giờ kể cả máy rảnh, 1,8–7s/lần) và vẫn trễ 5–10'; hook trả theo
    CÔNG VIỆC (không tin = 0 chạy, có tin = <1s, mỗi LƯỢT reply 1 lần). 95%/PreCompact không
    thay thế per-message — là tầng CHỐT đi kèm, đỡ ca hook trượt.
  - **Ca write-gate bận (embed nền giữ token chuỗi dài):** hook KHÔNG chờ — bỏ qua nhanh,
    đánh dấu dirty, lưới bù lượm (đo: chờ là 125s/turn, không chấp nhận được).
  - **Lưới bù (scheduler cũ, teo vai):** embed backlog + digest sweep + scan bù (nguồn không
    hook, hook trượt/gate bận) — nhịp giãn được 10'→30'.
  - **UI (user chốt 2026-08-02 — hết câu hỏi treo): realtime TÁCH thành công tắc RIÊNG,
    mặc định BẬT** ("tự sync mes theo máy"); "Tự sync memory" giữ nguyên = Drive poll 30'
    hai chiều; "Scheduler nền" = lưới bù (embed + digest + quét vét). Hai tầng độc lập —
    tắt Drive vẫn nhớ đầy đủ theo máy, tắt realtime rơi về quét bù. Mô tả UI đổi khớp vai
    (UI text discipline — không để mô tả nói "nhịp 10'" khi nạp đã per-message); layout
    cụ thể vẫn trình duyệt lúc build theo luật UI.
  - Gate `scheduler-contract` phải viết lại theo vai mới (UI hứa gì scheduler làm đó).
- [ ] **④ Mảnh luật (mọi agent, kể cả không hook):** +2 câu vào `MEMORY_PROTOCOL` + mô tả
  `memory_context`: *"context vừa bị nén/tóm tắt → gọi memory_context + memory_search dựng
  lại TRƯỚC khi làm tiếp, đừng đoán từ bản tóm tắt."* Cursor/Windsurf/Qwen chỉ nhận mảnh này;
  Cowork ngoài phạm vi.
</details>

## 🔬 Audit 2026-08-03 (6 mặt) — 3 lỗ đã sửa tại chỗ, còn 2 việc CHỜ USER
> Chi tiết + số đo: `06_CHANGES [2026-08-03]`. Sạch: gate 481 · conform · integrity ok ·
> 0 mồ côi · digest 100% · 0 project tách tên · 44/44 neo test sống.

- [~] **RERANK: GIỮ, nhưng phải rẻ đi — đang đo cách cắt (user phản biện đúng 2026-08-03).**
  > 🔄 **Rút lại đề xuất "nên tắt rerank" tôi viết cùng ngày.** Nó dựa vào hai câu chưa đủ:
  > ① *"rerank chưa từng thắng"* — corpus gate chỉ **8 truy vấn** và hybrid đã **8/8**, một
  > corpus BÃO HOÀ thì không thể cho rerank cơ hội thắng; đó là giới hạn của phép đo, không
  > phải bằng chứng rerank vô dụng. ② rerank là **thành phần chuẩn của RAG** (bi-encoder
  > không cho query và doc "nhìn" nhau; cross-encoder thì có) — bỏ nó là bỏ một lớp chất
  > lượng thật để đổi lấy tốc độ.
  **Đã đo (2026-08-03):** chi phí TUYẾN TÍNH theo tổng token — 40 cặp×2000 ký tự **51,6s** ·
  20×2000 **25,5s** · 10×2000 **13,6s** · 40×400 **10,3s**. Ép số luồng ONNX (8) **không
  đổi** (25,6s → 27,9s = nhiễu) ⇒ không phải lỗi cấu hình luồng, mà là giá thật của
  cross-encoder base trên CPU máy này (Ryzen 5 7520U).
  **Bảng đánh đổi (pool đóng băng, 4 truy vấn, tự-kiểm gốc-vs-gốc đạt 3/3 & 5/5):**
  `40×2000` (hiện tại) 31–38s · `20×2000` 23,8s · `40×800` 31,5s · `20×800` **12,4s** ·
  `16×800` 10,7s · `12×600` 8,9s. Đáng chú ý: ở pool 20, cắt 2000→800 ký tự **không đổi độ
  đồng thuận** (1,8/3 · 2,8/5) mà **rẻ đi gần một nửa**.
  **Model nhẹ hơn — đo rồi, CHƯA dùng được:** `ms-marco-MiniLM-L-6-v2` nhanh **6×**
  (3,3s vs 19,6s/truy vấn) và qua được phép thử lẻ tiếng Việt, NHƯNG xếp hạng lệch hẳn bge
  (top-1 **0,3/1** · top-3 **0,5/3**) — nó huấn luyện trên MS MARCO tiếng Anh, kho này chủ
  yếu tiếng Việt ⇒ lệch nhiều khả năng là KÉM đi, không phải khác đi.
  **⚠ GIỚI HẠN của chính phép đo trên — phải nói ra:** "độ đồng thuận với cấu hình hiện tại"
  đo **độ ỔN ĐỊNH, không phải CHẤT LƯỢNG**. Bản 40×2000 không phải chân lý; một thứ tự khác
  chưa chắc tệ hơn. Muốn chốt pool/chars/model thì **phải có corpus có nhãn đủ lớn** — đúng
  đường `plan/05` dòng 73 đã ghi, và đúng đòi hỏi của `HP điều 12`. Trước khi có nó thì
  KHÔNG đổi mặc định dựa trên mấy con số này.
  *(Bài học phép đo: hai bản đầu đều SAI — bản 1 bị daemon ingest làm trôi pool giữa các lần
  đo, bản 2 tính cả truy vấn pool=1 nên top-3 tối đa đã là 1/3. Bản 3 thêm PHÉP TỰ KIỂM
  "gốc vs gốc phải ra 3/3 và 5/5" — đạt — mới tin được số.)*
  **Đã giảm đau mà KHÔNG đụng chất lượng:** rerank thôi chặn đường — MCP mặc định hybrid
  (0,9s), lượt sâu của UI chạy ở tiến trình con. Rerank vẫn còn nguyên, gọi khi cần.

## 🔬 Audit toàn diện 2026-08-02 (Fable, 6 mặt) — F1/F4 ĐÃ SỬA `[2026-08-02h]`, còn F5/F6
> Gate 462/462 · conform ✓ · integrity ok · schema v20 trên DB thật · 0 mồ côi (3 phép đo) ·
> digest 100% · neo test sống 100% · endpoint parity sạch · 15/15 endpoint sống 200.
> Nghi vấn ĐÃ LOẠI (ghi để khỏi đào lại): "daemon crash tái hiện khi audit" — SAI, daemon chết
> vì lệnh đo của tôi (`| Select-Object -First 5` giết native command khi pipeline đủ N object);
> chạy detached thì 15/15 xanh. Hộp đen đúng: không có dòng exit vì bị kill cứng. Con bug
> exit-1 thật (07-21) vẫn CHƯA tái hiện. · "134 export mồ côi" — 133 là interface/type (bề mặt
> kiểu công khai) hoặc dùng nội bộ; chết thật chỉ `resolveDocPath` (đã biết, cố ý giữ).

> **F6 XONG TRỌN** (`[2026-08-02i]`): backend tách hai lớp + UI có chip `🔬 Tìm sâu`.
> Còn để ngỏ, chưa cần: lượt sâu hiện chờ đồng bộ tới 120s rồi mới trả — nếu sau này thấy
> vướng thì đổi sang trả `202` + poll như `/sync-status` (hạ tầng đã có sẵn).

<details><summary>F6 gốc — ĐÃ SỬA phần lõi `[2026-08-02i]`</summary>

> **F1 + F4 đã sửa** — chi tiết ở `06_CHANGES [2026-08-02h]`. (F1 hoá ra còn một tầng nữa:
> probe thật mất **48s** nên tách cờ `deep`; F4 gom về `core/config::projectKey`, riêng
> `graph-memory::norm` giữ lại CÓ CHỦ ĐÍCH vì id node dùng `/`.)

- [ ] Nợ đo lại: vector backlog ~4.6k (embed con bị tôi tắt lúc chẩn đoán — scheduler tự chạy
  lại trong 30') · entry `2026-08-02` 44 dòng > trần 30 (advisory validate, entry đã chốt).

## 🔬 Audit 2026-07-27 — còn 1 finding
- [~] **5 export mồ côi — NỐI 4, CÒN 1.** `embedProbe`+`embedDims` → check `vector` THẬT · `rerankProbe` → check `rerank` THẬT (trước đây hai mục này chỉ hiện trạng thái theo CÔNG TẮC, tức báo "on" kể cả khi model không tải nổi) · `schedulerChildRunning` → cờ `embedRunning` trong `/automation` (đúng thứ đã làm mọi endpoint chậm 2–9× mà UI im lặng). **Còn `resolveDocPath`**: là guard bảo mật trùng Ý với đoạn inline ở `readDoc` (`ui.ts:496`) nhưng KHÁC ngữ nghĩa resolve — gộp là refactor guard bảo mật, không phải dọn dẹp, nên để riêng.

## 🧹 Từ đợt P2/P3 + Graph Engineering — còn mở
- [ ] **Edge id chưa ai TIÊU THỤ.** Mới có phía phát (payload `/code-graph`). Bước sau: cho agent dẫn `edge:<id>` trong khẳng định, rồi thêm phép đo "cạnh được dẫn có thật không" (metric *cited-edge validity*).
- [ ] Đã đối chiếu bản "Graph Engineering" (user gửi 2026-07-27) với graph mình. **Khoảng trống lớn nhất còn lại: KHÔNG có phía WRITE** — worker đọc được graph nhưng không publish phát hiện ngược lại kèm `run_id`/provenance; và **không có lớp công việc** (không node `AgentRun`/`Claim`/`Evaluation`). Chấm theo thước của tài liệu, zemory đạt *artifact · source · graph path*, thiếu *objective · plan · evaluator decision · execution record*. **KHOAN xây** — chính tài liệu cảnh báo "đừng thêm knowledge graph chỉ vì hệ có agent"; graph hiện đang kiếm đủ tiền nuôi thân ở vai cấu trúc + định tuyến.

**🚫 ĐÃ LOẠI — false-positive (giữ lại để phiên sau khỏi báo lại)**
`/set-` "404" = chuỗi động `'/set-'+nm` · `data-act="recall"`/`sysrecheck` "không handler" = có, qua `closest('[data-act=…]')` · `share/share.key` committed = **KHÔNG còn là false-positive** — repo hoá PUBLIC nên giả định "keep repo private" mà quyết định đó dựa vào đã sai; chìa đã xoay + gỡ khỏi git 2026-07-29 · `/cockpit` "gãy" = không gãy (lúc đo daemon đang tắt) · `/nav-cost` `/gate-acquire` `/gate-release` `/sync` `/migrate` "dead" = CLI/surface khác dùng.

## ⭐ Ưu tiên kế tiếp
> Toàn bộ diễn biến UI refactor (VÒNG 1–11, plan 15, 5 quyết định) đã XONG và dời sang `archive/05_TODO.md` + `06_CHANGES`. Dưới đây chỉ còn thứ chưa chốt.

**CÒN TREO từ đợt UI refactor:**
- [ ] **`/session-raw` (đọc transcript gốc) — CHƯA làm, chờ user quyết**: chỉ bù được **4,18%** tin bị clip + khối `thinking` bị bỏ lúc ingest; và với session **sync từ máy khác thì file không có ở máy này** (`ingest_state` toàn đường `C:\Users\Zyro\...`) ⇒ phải fail-open về DB. ROI thấp, nêu ra để user chốt chứ không tự làm.
- [ ] `adapters` — slot chính thức trong `03` hay domain-internal (allowlist).
- [ ] **model-routing theo task** — idea-only. *(Soát 2026-08-02: tiền đề cũ "ĐỤNG điều 6, KHÔNG tự mở" đã HẾT HIỆU LỰC — điều 6 nới sang "HẠN CHẾ gọi LLM" ngày `2026-08-02b`. Nay không còn bị chặn thẳng, nhưng phải qua thứ tự ①script → ②agent liên kết → ③model + ích lợi đo được + user chốt.)*
- [ ] **Nợ nhỏ:** daemon exit-1 (hộp đen đã cắm, chờ repro) · Start Menu icon = **user sign-out/in** (file đã đúng).
- [ ] **Tách `app.js` theo concern — HẾT bị chặn.** Điều kiện cũ ("khi `cockpit.html` nghỉ hưu") **đã tới**: `frontend/pages/` giờ chỉ còn `app.html` (44 KB), `frontend/scripts/` chỉ còn **`app.js` 196 KB một file**. Chưa làm, không còn lý do hoãn.

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
- [ ] **Lệnh `zemory skill add <repo-url>`** (clone vào kho đúng khuôn) — ý tưởng nêu ra, chưa quyết.
- [ ] **Skill chung vs riêng 2 tầng** (mục ở §Ưu tiên kế tiếp) — mô hình vendored đã trả lời phần lớn; cần rà lại mục đó xem còn gì.

## Quyết định mở / cần chốt
- [ ] **`01_CONSTITUTION`: KHÔNG gộp §Mục đích với §Điều khoản (user hỏi, agent trả lời 2026-07-26 — chờ user xác nhận đóng).** Đã đo: riêng zemory có **45 cạnh `references` trỏ vào `hp:N`**, cộng SasinHarvest 14 + SasinFlow 11 ⇒ **~70 trích dẫn "điều N" xuyên docs**. Gộp = đánh số lại = **hỏng cả 70 trích dẫn**, và `06_CHANGES` cấm sửa entry lịch sử nên không vá ngược được. Hai mục cũng khác BẢN CHẤT: §Mục đích định nghĩa zemory LÀ GÌ (+ phi-mục-tiêu), §Điều khoản là luật ĐÁNH SỐ được trích dẫn khắp nơi. **Nỗi lo "gộp sợ tràn/bể UI" không được giải bằng việc gộp** — độ dài file y nguyên; thứ thật sự trị là lớp graph vừa dựng (điều N thành node, có legend + bộ lọc + bấm nhảy) thay cho việc cuộn một file dài. *(Bẫy parse hai-list-đánh-số đã trị bằng cắt đúng section — không phải lý do để gộp.)*
- [ ] **(Ý tưởng user 2026-07-23) Zemory tự đổi model/agent Claude theo việc lớn·nhỏ để tiết kiệm chi phí.** *(Soát 2026-08-02 — tiền đề đã đổi: điều 6 nay là "**HẠN CHẾ** gọi LLM" (`2026-08-02b`), KHÔNG còn "KHÔNG BAO GIỜ". Vế **không proxy model API** thì GIỮ NGUYÊN, mà model-routing đúng là chạm vế đó ⇒ vẫn cần user chốt, nhưng lý do chặn hẹp hơn trước.)* Đây là đổi BẢN CHẤT zemory (bộ nhớ thụ động → lớp điều khiển agent), không phải chi tiết nhỏ. User đã chọn: CHỈ ghi ý tưởng, KHÔNG code, chờ chốt hiến pháp trước khi làm gì tiếp. 3 hướng đã trình: (a) sửa hiến pháp mở khe cho model-routing (thay đổi tầng cao nhất) · (b) để CLI/agent tự quản (Claude Code đã có setting chọn model riêng, zemory không đụng vào) · (c) (chưa trình) zemory chỉ ĐO/GỢI Ý tín hiệu độ lớn task (vd token ước tính, số file đụng) qua UI/API cho AGENT tự quyết — vẫn 0-LLM vì zemory không tự gọi/đổi model, chỉ cung cấp số đo.
- [ ] **(Graph — plan 13 §8) Loại lỗi nào build TRƯỚC?** Đã trình 8 loại; user CHƯA chọn. Ba nhóm: (a) link gãy + orphan (docs, rẻ, làm ngay được) · (b) **blast-radius** "sửa X đụng ai" (cần đọc import code) · (c) traceability "requirement nào chưa có test". Prototype 2026-07-18 đã chứng minh (b) chạy được: code-graph 55 module/154 import, tìm ra **orphan thật `core/index.ts`** (barrel 0 ai import), fan-in `memory/db.ts`=18.
- [ ] **(Graph) Độ mịn + overlay:** v1 dừng ở file hay kéo tới hàm (AST)? overlay "semantic neighbor" (từ vector sẵn) làm v1 hay phase 2? *(đề xuất: v1 không AST, chỉ cạnh khai báo)*
- [ ] **(plan 14 §7) Chưa chốt:** tray bằng gì trên Node · write-gate phủ lệnh nào trước · autostart per-OS làm sao · graph cache để trong DB hay file JSON · chu kỳ auto-sync.
- [ ] RAG còn cần chốt khi mở rộng sang **data chính**: chunk doc dài cho docs/knowledge/code; data chính dùng chung `global_memory.db` (cột `kind`) hay store tách rồi fuse.

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
