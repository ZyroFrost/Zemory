<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-07-28b] — Check giọng văn sản phẩm · slot `attachment` (schema v19)

Gate 239 → **242**.

### Check giọng văn — UI là sản phẩm giao, không phải ghi chú nội bộ
User chốt: *"phải check full từ ngữ, không được dùng văn nói, phải dùng từ ngữ chuyên nghiệp chuẩn làm app"*.
- Đo trên **861 chuỗi hiển thị** (cả hai từ điển + text mặc định của `data-i18n`): **0 vi phạm**. Nên đây là **RATCHET chống tái phát**, không phải bộ sửa.
- **Hai vòng đo để loại báo oan** — quan trọng hơn bản thân luật:
  · Vòng 1 dùng `` của JS ⇒ `ngu` khớp trong "**ngu**ồn" (**27 ca oan**), `ui` khớp trong "**UI** language". JS coi ký tự có dấu là ranh giới từ ⇒ **không dùng `` cho tiếng Việt**, phải tự dựng lớp ranh giới.
  · Đã BỎ khỏi danh sách: `vs` (viết tắt kỹ thuật hợp lệ), `ok` (nhãn trạng thái chuẩn "3/3 OK"), `ui` (acronym).
  · `05_TODO.md` bị báo oan vì tôi chỉ đặt biên ở CUỐI — `_` là ký tự từ nên không có biên giữa `_` và `T`. Thêm biên đầu.
- Có test **chứng minh bộ luật NỔ ĐƯỢC** (5 mẫu văn nói phải bắt) **và KHÔNG nổ oan** (7 mẫu hợp lệ phải sạch) — đúng luật 4 của skill `audit toàn diện`.
- Thêm check thứ hai: ghi chú dev (`TODO`/`FIXME`/`mock`/`placeholder`) không được lọt ra giao diện.

### Slot `attachment` + `attachment_link` (schema **v19**)
**Đo trước khi thiết kế** — và số đo đổi hẳn phạm vi: quét **105 transcript, 5.456 attachment**:
`p50 0 KB · p90 0 KB · p99 1,6 KB · max 12 KB · tổng 0,2 MB · >1 MB: 0 · nhị phân: 0`.
5.104/5.456 không có đuôi file (metadata nội bộ, adapter đã bỏ đúng); phần còn lại là `.md ×181 .py ×46 .ts ×40 .sql ×20`… **toàn văn bản**. Tức 52 tin đính kèm đã ingest LÀ TOÀN BỘ những gì tồn tại — không có kho ảnh nào đang bị bỏ sót.

Thiết kế theo đó — dựng slot đúng, **không** dựng máy móc cho hàng chưa có:
- **Tách khỏi `messages`** vì cột `content` nuôi FTS5: nhét blob vào là thổi index mà không tìm được gì (bài học v16/v17: trigram nuốt tool-dump làm DB phình 435 MB).
- **Ba hạng `kind` tường minh** — `text` (nội dung, đã redact) · `blob` (nhị phân) · `ref` (CHỈ ghi nhận "từng có file này, ở đây", không lưu nội dung, dùng khi vượt ngưỡng). Thà biết nó từng tồn tại còn hơn im lặng bỏ qua.
- **Dedup theo `sha256`** + bảng nối `attachment_link`: một file đọc lại 20 lần = 1 hàng nội dung + 20 hàng nối, không phải 20 bản sao.
- **KHÔNG backfill** 52 tin cũ: chúng nằm ở `messages.content` dạng `[file:<path>]` + nội dung và VẪN ĐÚNG — là lớp full, tìm được, đọc được. Viết lại dữ liệu nguồn chỉ để gọn hơn là không đáng (điều 3).
- **Chưa nối vào bundle sync** — đó là L3, cần user chốt chính sách trước (bundle đang "lean" −74%, thả blob vào là phá cân đối đó).

*(Lại dính họ lỗi cũ lần thứ 4: **backtick trong comment SQL nằm trong template literal** cắt đứt `SCHEMA`. Và một `
` trong comment nở thành xuống dòng thật làm vỡ comment TS.)*

---

## [2026-07-28] — Sources hiện ĐỦ BỘ nguồn được hỗ trợ, không chỉ nguồn đã có dữ liệu

Gate 238 → **239**.

**User bác đúng, và tôi đã bảo vệ hành vi sai trước khi nghe ra vấn đề.** Cây Sources dựng thuần từ `GROUP BY sessions`, nên một adapter mới (`claude-web` vừa thêm) **vô hình** cho tới khi capture được lần đầu. Nguyên văn: *"nếu không hiện thì sao check vào để nó scan ra được... tui muốn nó hiện đúng chuẩn"*. Đúng là **vòng luẩn quẩn**: muốn có dữ liệu phải tick, muốn tick phải có dữ liệu.

- `scopeTree()` nay ghép **bộ chuẩn `allAdapters()`** vào cây: nguồn nào zemory hỗ trợ mà chưa nạp gì thì vẫn hiện, gắn cờ `empty`.
- UI hiện nhãn *"chưa có dữ liệu"* (viền đứt, chữ mờ) kèm tooltip **chỉ luôn lệnh nạp** — `scan-web --platform <tên>` cho web, `scan --deep` cho local. Thấy mà không biết đường nạp thì cũng như không.
- Có test khoá: mọi adapter trong `allAdapters()` phải có mặt trong cây; nguồn có dữ liệu `empty=false`, nguồn chưa nạp `empty=true`. Lần refactor sau không ẩn lại được.
- Đo live: cây trả về 11 node, `claude-web` hiện với 0 tin và cờ `empty`.

**Bài học:** một danh sách "cái gì đang có" và một danh sách "cái gì dùng được" là HAI thứ khác nhau. Trộn làm một thì bề mặt cấu hình tự khoá chính nó.

---

## [2026-07-27h] — Bịt CSRF · gỡ `/init-fresh` · provider Claude.ai cho web-capture

Gate 230 → **238**.

### CSRF — tôi đã NÓI QUÁ ở báo cáo trước, đây là số đúng
Guard cũ **đã có** và chặn được: Host không phải loopback (DNS rebinding) và `Origin` lạ. Lỗ hổng thật **hẹp hơn** tôi mô tả: trình duyệt KHÔNG gửi `Origin` cho GET subresource, nên `<img src="http://127.0.0.1:4444/set-drive?path=…">` trên trang bất kỳ vẫn chạy (ảnh hỏng nhưng REQUEST đã gửi — CORS chặn ĐỌC, không chặn GỬI). Cross-site POST thì luôn kèm `Origin` và đã bị chặn sẵn.
- **Ép POST** cho endpoint đổi trạng thái ⇒ bịt cả họ, vì cross-site POST không qua nổi guard `Origin`. FE vốn đã POST hết nên không phải sửa gì.
- **Chặn `Sec-Fetch-Site`** làm lớp hai: trình duyệt gửi header này cho MỌI request kể cả `<img>`; CLI/curl không gửi nên không ảnh hưởng.
- **Bẫy tự gây, tự bắt:** regex đầu tiên viết `sync|migrate` trần và nó bắt nhầm `/sync-pulse` + `/sync-status` — hai endpoint CHỈ ĐỌC mà UI gọi bằng GET liên tục. Một luật bảo mật quá tay thì hỏng đúng thứ nó định bảo vệ. Neo `sync$`/`migrate$`, và có test khoá danh sách chỉ-đọc.
- Đo live: GET `/set-hybrid` → **405** · POST → 200 · `Sec-Fetch-Site: cross-site` → **403** · `/` `/sync-pulse` `/memory-status` → 200.

### `/init-fresh` gỡ (audit F2)
0 người gọi ở cả FE lẫn CLI, mà là thao tác **dời docs cũ đi**. Năng lực không mất: `zemory init --fresh` gọi thẳng `freshHarness()`.

### Web capture Claude.ai — provider mới (cùng khung ChatGPT)
- `PLATFORMS.claude` trong `scanweb.ts` + adapter `adapters/claudeweb.ts`. **Khác ChatGPT ở hai chỗ**: xác thực bằng **cookie phiên** (không có bearer token) nên mọi lời gọi phải kèm `org uuid`; và `chat_messages` là **mảng PHẲNG đã đúng thứ tự** — không có nhánh chết nên không cần đi `current_node → parent` như `mapping` của ChatGPT.
- Giữ **lớp FULL**: `thinking` · `tool_use` · `tool_result` đều được giữ và gắn nhãn theo đúng quy ước adapter Claude Code, để `roleMatches()` và việc hạ điểm tin tool nhận ra. Khối lạ (Anthropic thêm loại mới) ⇒ rơi về `text` phẳng, **không mất message**.
- `sender: 'human'` quy về `role: 'user'` cho khớp mọi adapter khác — không quy đổi thì bộ lọc role bỏ sót nguyên một nguồn.
- 6 test với fixture đúng dạng API claude.ai. **Chạy thật:** lệnh mở đúng cửa sổ đăng nhập; capture end-to-end **chờ user đăng nhập một lần** (giống hệt bước đầu của ChatGPT).

---

## [2026-07-27g] — F1 + F2 đã xử: bản chuẩn đọc từ NGUỒN · năng lực migrate hết mồ côi

Gate 227 → **230**.

### F1 — UI tra cứu đang hiện SAI 60%, nay đọc thẳng từ `03_STRUCTURE.md`
- Đo trước khi sửa: nguồn có **90 hàng cây / 66 dòng routing**, UI hiện **35 / 26** — và 24 dòng còn hiện thì là bản **viết tắt tay**, chữ khác nguồn (`"endpoint app MÌNH mở ra"` → `"endpoint mình mở"`). Hai slot `graph/` `adapters/` thêm sáng nay cũng không lên UI. `03_STRUCTURE.md` đã đổi **38 lần**.
- **Một bề mặt CHỈ-ĐỌC mà nói sai thì nguy hơn một bề mặt báo lỗi:** người ta vào đó để TRA, không thấy dòng mình cần thì kết luận "chuẩn chưa khai" rồi đẻ folder ngoài chuẩn — trong khi chuẩn có khai.
- `backend/src/docs/standard-spec.ts` (mới) parse §cây + §routing từ chính file .md; endpoint `/standard-spec?profile=app|non-app`. Parse khớp nguồn **90/90 và 66/66**.
- **Tìm section theo TÊN, không theo số** — non-app đánh số khác app (§2 cây / §3 routing). Ghim số thì một profile trả rỗng mà không ai biết; bắt được lúc đo (non-app ra 0), đã khoá bằng test.
- FE **fail-open**: fetch/parse hỏng thì rơi về bảng hardcode cũ và ghi rõ *"bản dự phòng"* trên nhãn — UI không bao giờ trắng.
- Hệ quả phụ: 26 chuỗi tiếng Việt trong `STRUCT`/`ROUTE` không cần dịch nữa vì chúng chỉ còn là bản dự phòng, không phải nguồn hiển thị.

### F2 — `analyzeMigration()` hết mồ côi
Đường DUY NHẤT chạm tới nó là endpoint `/migrate` mà không FE nào gọi; lệnh CLI cùng tên thì chỉ **in hướng dẫn 4 bước**. Nay `zemory migrate` in **bảng phân tích thật trước** (file chuẩn thiếu cái nào · file lạ đoán vai trò gì · có `docs/plan/` chưa) rồi mới tới các bước. Fail-open khi repo chưa có `docs/`.

### Song ngữ đợt 2 (tiếp)
`TITLES` 6 phụ đề màn → key, `go()` gọi `t()` khi vẽ. 8 tên tính năng/nhóm + 15 nhãn trạng thái → key ở **cả hai** từ điển, render qua `t()`.

---

## [2026-07-27f] — Song ngữ đợt 2 · skill `audit toàn diện` · CHẠY audit toàn diện 6 mặt

Gate **227/227**. Đây là mục chốt trước khi commit cả ngày 27/07.

### Skill mới: `audit toàn diện` (vào `04_SKILLS` + CẢ HAI template)
User chốt: *"khi tui bảo audit toàn diện là phải chạy full mọi thứ luôn như bữa"*. Nay cụm từ đó có
định nghĩa cứng — **6 mặt, không cắt bớt** — và 4 luật đúc từ chỗ đã trả giá:
1. **Gate xanh KHÔNG phải bằng chứng** — nó chỉ chứng minh *cái test soi thì đúng*. Đã dính: bộ test UI neo vào bản đã thay ⇒ gate 100% xanh trong khi bề mặt đang chạy có 0 test.
2. **Verify từng finding rồi mới ghi** — đã có đợt loại 5 nghi vấn, và 2 đợt checker báo oan (48 rồi 13 mục).
3. **Mọi con số phải ĐO**, không suy luận.
4. **Hỏi ngược mỗi check: "cái gì làm nó ĐỎ?"** — trả lời không được thì check đó không thể nổ.

### Song ngữ đợt 2
- `TITLES` (6 phụ đề màn) chuyển sang key, `go()` gọi `t()` lúc vẽ ⇒ đổi ngôn ngữ là đổi luôn.
- 8 tên tính năng/nhóm + 15 nhãn trạng thái → key ở **cả hai** từ điển; render qua `t()`.
- **CỐ Ý KHÔNG dịch `STRUCT` + `ROUTE` trong `app.js`** — xem F1 dưới: dịch một bản sao là nhân đôi chỗ phải bảo trì.

### Kết quả audit toàn diện 6 mặt

| Mặt | Kết quả |
|---|---|
| ① Gate & lint | **227/227** (tắt daemon trước — không thì test embed OOM) |
| ② Chuẩn & docs | `conform` ✓ sạch trên zemory · `validate` ✓ · docs dưới ngưỡng · TODO 58 mở / 79 đóng |
| ③ Kiến trúc | **F1 nguồn trùng** (dưới) · 5 export không ai gọi |
| ④ FE ↔ BE | 52 endpoint · **F2: 2 endpoint chết** · i18n 2 chiều đủ · trần hardcode giữ 127 |
| ⑤ Dữ liệu | `integrity_check` **ok** (23,2 s) · 173.392 tin · 0 message/vec_map mồ côi · **F3: 1 digest mồ côi → đã xoá** · DB 801,1 MB |
| ⑥ Bề mặt sống | 10 endpoint đều 200 · `sync-pulse` 232 ms · `code-graph` 1,14 s · **file tĩnh thiếu → 404 trong 2 ms** (bẫy treo đã vá) |

**F1 — NGUỒN TRÙNG (nặng nhất, chưa sửa):** chuẩn thư mục §3 và bảng routing §4 tồn tại ở **BA** nơi — `03_STRUCTURE.md` (nguồn thật, điều 3), `SLOT_ROLES`/`graph-standard` (backend), và `STRUCT` (35 hàng) + `ROUTE` (26 hàng) hardcode trong `app.js`. Đổi chuẩn phải sửa ba chỗ ⇒ **chắc chắn sẽ lệch**. Đường sửa đã rõ và rẻ: `graph-standard.ts` **đã biết parse §4 từ chính file .md** — chỉ cần phơi ra endpoint rồi cho FE đọc, xoá bản hardcode.

**F2 — 2 endpoint chết:** `/init-fresh` · `/migrate` — 0 người gọi ở cả FE lẫn CLI (CLI dùng `zemory init --fresh` / `zemory migrate` trực tiếp). Đáng để ý vì `/init-fresh` là thao tác dời docs cũ đi mà lại mở trên HTTP. **Chưa gỡ — gỡ endpoint là thao tác xoá, chờ user duyệt.**

**F3 — 1 digest mồ côi** (`chatgpt-test-export-resolve-001`, phiên gốc đã xoá) → **đã dọn**. `pruneOrphanVectors` dọn vector nhưng không dọn digest.

**Nghi vấn ĐÃ LOẠI (ghi lại để lần sau khỏi đào lại):**
- *"210 export không ai gọi"* — **detector của tôi sai** (escaping `` trong `node -e` bị nuốt). Viết lại ra file: **5**, và cả 5 đã verify từng cái.
- *"FE gọi `/set-` không tồn tại"* — regex cắt ở dấu `-`; thực tế là `/set-lang`, `/set-drive`… đều có.
- *"`/gate-acquire` `/gate-release` `/nav-cost` chết"* — đều CÓ người gọi (CLI write-gate, và `ui.ts` nội bộ).

---

## [2026-07-27e] — Học 3 cơ chế từ Hermes: ghi nguyên tử · hạ điểm tool trong recall · quét ký tự ẩn

Gate 216 → **227**. **CHƯA commit.** User chốt: *"làm lần lượt cả 3, nhưng cần audit lại toàn bộ — fix cái này tốt hơn hay có hại"*. Audit đã **đổi phạm vi của mục ③**.

### ② Ghi file NGUYÊN TỬ (`util/fs-atomic.ts`)
- `writeFileSync` truncate trước rồi mới ghi ⇒ chết giữa chừng để lại file cụt. Đang dùng ở đúng những chỗ hỏng là mất thật: `06_CHANGES.md` (điều 3: .md LÀ NGUỒN; `archive` **cắt ngắn** nó), `location.json` (con trỏ tới DB — hỏng thì zemory mở ra bộ nhớ RỖNG), `config.json`, và **file cấu hình của CHÍNH agent** (`settings.json` của Claude Code, `config.toml` của Codex — hỏng là hỏng công cụ user, không chỉ hỏng zemory).
- Ghi tạm **cùng thư mục** (rename chỉ nguyên tử trong cùng volume — repo ở D:, %TEMP% ở C:), `fsync` trước rename, retry EPERM/EBUSY (Windows: AV/indexer giữ handle), `--backup` cho thao tác phá huỷ. **Thất bại ⇒ đích còn nguyên vẹn** — thà báo lỗi to hơn hỏng lặng lẽ.
- **Test bắt lỗi trong chính helper của tôi:** bản đầu tách ghi/rename thành hai khối `try`, lỗi ở khối ghi thoát ra không ai dọn ⇒ sót file `.tmp`. Gộp một khối là hết. Có ratchet: 4 file được canh không được dùng `writeFileSync` trần nữa.

### ① Hạ điểm đầu ra của tool trong recall — chống "recall blindness"
- Đo: 20 kết quả đầu có **8 tin TOOL (40%)** — dump file/output lệnh dài và đầy mã định danh nên khớp từ khoá rất tốt, đẩy câu trả lời của người xuống dưới. (Hermes ẩn hẳn phiên `subagent`/`tool` khỏi search mặc định.)
- **HẠ ĐIỂM, KHÔNG LOẠI** (×0,3). Audit trường hợp xấu nhất trước khi làm: truy vấn thông báo lỗi (`ERR_HTTP_HEADERS_SENT`, `BFCArena`, `ENOENT`…) — văn xuôi vẫn chiếm **8–10/10** vì agent có bàn về lỗi bằng lời ⇒ rủi ro mất thông tin thấp; khi tool là nguồn DUY NHẤT thì nó vẫn ra. `--role tool` / `includeTools` thì không phạt.
- Đặt sau RRF/rerank, cùng tầng recency. **Suýt sót đường chính:** `searchHybrid` có `hydrate` riêng và hybrid bật mặc định — UI đi lối đó. Đã cắm cả hai.
- Đo sau: FTS **20% → 7%**; hybrid 9→6 và 4→3.

### ③ Quét chiều VÀO — audit ĐỔI phạm vi ban đầu
- Kế hoạch ban đầu là quét injection/exfiltration như `_scan_memory_content` của Hermes. **Đo trên 173.201 tin thật thì phải bỏ phần lớn:**

| Dấu hiệu | Hit | |
|---|---|---|
| "ignore previous instructions" · "new instructions:" · "you are now a" | **0** | không có ca nào |
| U+202E/U+202D · U+2066–2069 (dấu hiệu tấn công thật) | **0** | sạch |
| U+FEFF (BOM) | 32 | **100% báo oan** — BOM trong file nguồn |
| U+200B | 11 | **100% báo oan** — copy từ web, công thức toán |
| "system prompt" | 201 | bàn luận bình thường |

- **Mọi tín hiệu khác 0 đều báo oan; mọi tín hiệu đúng đều bằng 0.** Bắt cụm từ sẽ nổ trên chính kho tài liệu bàn về prompt injection (kể cả phiên này). Ship bản đầy đủ = một tính năng mà đầu ra duy nhất quan sát được là nhiễu — đúng cái đã giết bản `conform` đầu (48 rồi 13 ca oan). Lần thứ ba trong phiên gặp họ lỗi này.
- **Chỉ giữ nhóm ký tự KHÔNG có công dụng hợp lệ nào** ⇒ nhiễu bằng 0 theo cấu tạo. `zemory memory audit` — **thuần đọc, không sửa, không chặn** (điều 3: lớp full là nguồn; quyết định là của user). Chạy trên DB thật: 1,33 s, **0 hit, 0 báo oan**.
- Bối cảnh cần ghi: bề mặt này **rộng ra từ chính thay đổi hôm nay** — gỡ lớp cắt để khôi phục lớp full nghĩa là `tool_result` (gồm nội dung file agent đọc) nay vào bộ nhớ nguyên vẹn.

---

## [2026-07-27d] — 🔄 Tách "Tính năng & Kiểm tra" khỏi Home thành mục nav riêng (đảo quyết định gộp)

> 🔄 **Supersede** phần "gộp 9 màn → 5" của `[2026-07-27]`: một trong bốn lần gộp là SAI. Ba lần kia gộp thứ *trùng nhau*; lần này gộp hai thứ *khác việc*.

- **User bác (2026-07-27):** *"chuẩn UI thông thường thì nó đã tổng hợp nhiều bảng khác rồi, tự nhiên thêm 1 tab nhỏ bên trong home người ta sẽ không để ý tab đó tồn tại… không đúng chức năng."* Đồng ý — Home là màn **liếc nhanh hằng ngày**, còn Tính năng & Kiểm tra là màn **chẩn đoán**, thỉnh thoảng mới vào.
- **Lý do gộp ban đầu vẫn đúng nhưng không đòi phải gộp màn:** bản 9-màn có HAI danh sách check độc lập — `renderHomeChecks()` → `#homeChecks` và `renderSystem()`/`renderSysDetail()` → `#sysList` (xác minh lại từ commit `e3a1be9`). Trùng lặp đó đã xử bằng cách **xoá bản trùng ở Home**; việc đó không kéo theo yêu cầu phải nhét màn kia vào Home.
- **IA nay 6 màn:** Trang chủ · Recall · Dự án · Global Memory · Harness · **Tính năng**. Đặt CUỐI rail vì là màn chẩn đoán (bản 9-màn cũ cũng để "✔ Hệ thống" cuối cùng).
- Home hết sub-tab ⇒ gỡ luôn nhóm `data-hm` khỏi engine (`SUBATTR` · `PERSIST` · `subtabs` · `subLoad`), key `hm.over`/`hm.feat` thay bằng `nav.system` ở **cả hai từ điển**. `ensureScreen('system')` gọi thẳng `renderSystem()` — màn phẳng, không sub-tab. Gỡ mục `LEGACY.system` (nó từng ánh xạ `system → home:feat`; nay `system` lại là màn thật).
- `#sysList` chỉ ẩn chứ không rời DOM nên `renderSystem()` vẫn chạy lúc boot ⇒ **chip sức khoẻ ở chân rail vẫn có dữ liệu dù chưa ai mở màn đó** (một nguồn sự thật duy nhất, vẫn không có danh sách check thứ hai).

---

## [2026-07-27c] — Drive/Sources cập nhật TỨC THÌ sau quét · `vectorCoverage` 38 s → 0,58 s · `[object Object]`

Gate **216/216**. **CHƯA commit.**

### `[object Object]` trên 2 dòng mốc Drive — lỗi tôi vừa gây ra ở bản trước
`relTime()` trả về **object** `{big,sub}`, tôi dùng thẳng như chuỗi. Sửa: `.big`.

### "Quét ra tin mới nhưng Drive kẹt rất lâu mới lên"
- **Nguyên nhân đo được:** panel Drive chỉ đổi khi `/memory-status?fresh=1` trả về, mà gói đó **69 giây**. Bổ ra từng phần: mọi truy vấn khác ≤ 191 ms, riêng **`vectorCoverage()` = 36–38 s**.
- **Gốc của 38 giây (code của chính tôi đợt trước):** hai `EXISTS` tương quan bắt SQLite dò `vec_chunks` (bảng ảo vec0, không có index rowid như bảng thường) **một lần cho MỖI hàng** trong 172 k hàng. Đổi sang `id IN (SELECT rowid FROM vec_chunks WHERE rowid < 2^40 UNION SELECT message_id FROM vec_map)` — dựng tập id một lần rồi tra. **38,0 s → 0,58 s (65×), ĐÁP SỐ Y HỆT** (126.701 = 126.701, đã chạy đối chứng cả hai dạng trên DB thật).
- **`/sync-pulse` (mới) — đường riêng cho thứ phải tức thì:** chỉ trả `drive` + `scopeTree`, toàn truy vấn rẻ. **0,20 s.** Quét xong gọi nó TRƯỚC, gói nặng chạy sau. Cũng nối vào `pollSync` và nút Đồng bộ ngay. Bài học: cái gì phải tức thời thì phải có đường riêng, đừng để nó phụ thuộc thứ nặng nhất trong cùng một gói.
- Sau tối ưu: `/memory-status?fresh=1` **69 s → 1,82 s**.

### Sources hiện `+N` của lần quét gần nhất (user 2026-07-27)
Ba panel **Máy này · Sources · Drive** đứng cạnh nhau vì liên quan nhau — nhưng chỉ hiện TỔNG thì không đối chiếu được gì. Nay mỗi lane có badge `+N`: "+20 tin mới" ở panel quét **=** tổng `+N` trên cây Sources **=** số Drive đang thiếu ⇒ user kiểm chéo bằng mắt, không phải tin lời app. Delta lan lên nhánh cha (claude-code +20 → SS01 +20 → Local +20), khoá theo `origin|host|source` (không theo nhãn — hai máy có thể trùng tên agent), và **giữ nguyên qua các lần render không đổi** để không biến mất trước khi user kịp nhìn. Có test chạy thẳng logic của file đang ship.

---

## [2026-07-27b] — UI: gộp hàng tab dự án · Drive đếm SAI theo id (bịa 639k tin) · màu thông báo quét · đo lỗ hổng song ngữ

Gate **215/215**. **CHƯA commit.**

### Drive báo "đã đồng bộ đủ" trong khi phép tính sai gốc
- `driveSyncProgress()` lấy `MAX(id)` làm "tổng số tin" và `MAX(id) − watermark` làm "số tin chờ". Sai vì `messages.id` là AUTOINCREMENT **có lỗ hổng** (forget · whole-replace re-ingest). Đo DB thật: `MAX(id)` = **1.836.847** nhưng `COUNT(*)` chỉ **172.333** — lệch **10,7×**.
- Với một watermark trễ có thật trong DB (`cli-lean.enc` = 1.127.371): công thức cũ báo **709.476 tin chờ**, sự thật **70.247** ⇒ **bịa ra 639.229 tin không tồn tại** (điều 12 cấm số phản-thực). Sửa: đếm theo **HÀNG** (`COUNT(*) WHERE id<=watermark`).
- **Vì sao user thấy "luôn báo đủ":** hai panel trả lời hai câu KHÁC NHAU — "Máy này +133 msg mới" = chờ **nạp vào DB**, còn Drive = mọi thứ **đã trong DB** đều đã đẩy. Auto-sync đang bật nên daemon đẩy ngay, pending về 0 thật, nhưng user không thấy việc đó xảy ra nên đọc thành mâu thuẫn. Không sửa được bằng cách đổi chữ — phải cho **mốc kiểm chứng**.
- Thêm `lastPushAt` + `newestAt` vào payload và một khối 3 dòng dưới donut: **Tin mới nhất · Đẩy lần cuối · Đã đẩy/tổng**. Nay câu "đủ" kiểm chứng được (đẩy 02:30:56 > tin mới nhất 02:28:59). Nếu tin mới nhất MỚI HƠN lần đẩy ⇒ đổi sang cảnh báo vàng "có tin mới hơn lần đẩy", không cho báo an toàn giả.
- Gỡ một `zGet('/drive-status')` tôi vừa thêm — **endpoint đó không tồn tại**; `renderMem` vốn đã vẽ lại donut từ `m.drive`.

### Gộp hàng: tên project + back vào cùng hàng tab
Hai hàng mà mỗi hàng chỉ có một chữ (user 2026-07-27). Tab bên trái, `Zemory [APP] ← Danh sách` đẩy sang phải bằng `margin-left:auto`. Màn Graph lấy lại chiều dọc.

### Màu thông báo kết quả quét
Chữ xám nhạt lẫn vào nền. Nay đổi màu **theo kết quả**: có tin mới = vàng đậm + viền + nền wash; không có = xám im lặng. Tô nổi cả số 0 thì lần sau không ai để ý nữa.

### Song ngữ — ĐO ĐƯỢC lỗ hổng gate cũ không thấy
- Gate i18n chỉ soi key ĐÃ nằm trong từ điển; nó **mù** với chuỗi tiếng Việt viết thẳng vào code. Đo: **137 chuỗi** như vậy trong `app.js` — đổi sang EN vẫn hiện tiếng Việt.
- Sửa ngay 10 chuỗi thuộc card Drive + thông báo quét (137 → **127**), mọi chuỗi MỚI đều có key ở cả hai từ điển. Thêm test **ratchet**: con số chỉ được đi xuống, chuỗi mới bắt buộc qua `t()`.
- Phần lớn 127 còn lại là mô tả slot của bản chuẩn (nội dung, không phải chrome UI) — hạ dần theo đợt.

---

## [2026-07-27] — dọn P2/P3 · **UI thật suốt nhiều vòng KHÔNG có test nào** (gate xanh giả) · bẫy TREO khi thiếu file tĩnh · 3 món từ bản "Graph Engineering"

**CHƯA commit** (chờ user duyệt mắt bản 5 màn). Gate 206 → **214**.

### Phát hiện nặng nhất: gate xanh giả — 22 test UI soi file đã chết
- Cả `backend/test/cockpit.test.mjs` (22 test: i18n parity · token màu · cân ngoặc CSS · điều 12) neo vào **cockpit cũ**. UI viết lại thành 5 màn (plan 15) mà bộ test **không hề đổi neo** ⇒ vẫn xanh, còn `app.html`/`app.css`/`app.js` — thứ đang chạy — **0 test**. Nhiều vòng sửa đã báo "i18n parity ✓" trong khi nó kiểm từ điển của bản cũ.
- `backend/test/app-ui.test.mjs` (mới, **25 test**) trỏ vào UI thật. Chạy lần đầu: **4 đỏ** — 1 lỗi UI thật (7 màu không qua token ⇒ light mode không đảo được: logo · nút danger · badge · nền dialog · wash pill), 3 do test tôi viết sai (regex `class="screen"` không khớp `class="screen on"`; 2 slice quá ngắn; và **lại dính bẫy cũ**: chuỗi `scrollIntoView` nằm trong comment *giải thích vì sao không dùng nó* — phải lột comment trước khi assert phủ định).
- Bài học: **đổi kiến trúc UI thì phải đổi neo của test cùng lúc**, nếu không test biến thành lời trấn an. Số test không đổi ≠ độ phủ không đổi.

### Bẫy TREO khi xin file tĩnh không tồn tại (`serveFrontend` · `serveBinary`)
- `writeHead(200)` gọi **trước** `readFileSync`. File thiếu ⇒ readFileSync ném, nhưng header 200 đã gửi ⇒ `writeHead(404)` trong catch ném `ERR_HTTP_HEADERS_SENT` ⇒ `res.end()` không bao giờ chạy ⇒ **client chờ vĩnh viễn**, không timeout, không lỗi.
- Lộ ra ngay khi cockpit nghỉ hưu (mọi bookmark/cache còn trỏ 18 file cũ đều treo tab). Sửa: đọc xong mới cam kết header. Đo: treo vô hạn → **404 trong 4ms**. Có test hình-dạng-nguồn chống tái phát.

### Cockpit cũ nghỉ hưu
- 19 file → `attic/frontend-cockpit/` + `attic/test/` bằng `git mv` (giữ lịch sử, không xoá cứng). Gỡ route `/cockpit`, `/ui-state`, `/set-ui-state` và 2 helper mồ côi `getUiState`/`setUiState`. Chúng tồn tại vì cockpit bind cổng ngẫu nhiên nên localStorage (khoá theo origin) mất layout; app nay chốt cổng 4444 ⇒ seam tự lưu được. Khoá `ui` trong `config.json` cũ thành mồ côi — vô hại, không migration.
- `share/README.md`: 7 lệnh `brain` đã chết → `memory`. 8 CSS class chết gỡ hẳn. `zemory archive`: 06_CHANGES 409 → 229 dòng.

### Taxonomy graph: tách TẦNG khỏi SLOT (`slotOf` → `routeTarget`)
- Bảng Routing §4 trỏ vào hai thứ khác hạng: **slot** (vai trò trong một tầng, có trong từ điển §3) và **tầng/thư mục đã khai** (§2 — `attic/` `data/` `dist/` `external/` `frontend/`…). Hàm cũ lấy MÙ đoạn cuối đường dẫn nên gọi tất cả là slot ⇒ 13 node `slot:*` sai hạng, `slot_unused` bị thổi phồng bởi những cái chưa bao giờ là slot.
- Thay bằng `routeTarget()`: tra từ điển `SLOT_ROLES` để quyết; không phải slot thì thành hạng node **`layer`** mới, giữ nguyên đường dẫn nên `data/logs/` ≠ `data/secrets/`. FE không phải sửa — `gSlotColor` băm tên type nên `layer` tự có màu và tự vào legend.
- Đo: `slot_unused` 48 → **37** · `layer` **14** · `concern` 60 → **66** · `slotsDeclared` 65 → **54** (số slot khai báo giờ mới đúng).
- **Sửa xong lại tự dính hai bẫy, cả hai lộ ra ngay khi đo lại chứ không phải khi suy luận:** ① `[a-z_]+` loại mất `i18n` (tên slot CÓ CHỮ SỐ) nên một slot thật bị xếp thành tầng; ② đích trỏ vào FILE (`config/servers.yaml`, `docs/agent/04_SKILLS.md`) bị gắn `/` thành thư mục ma — quy về thư mục chứa nó. Test khoá cả hai.

### Hai lỗi CHỈ soi mắt mới thấy (endpoint xanh, gate xanh, mà UI vẫn sai)
Card "Xu hướng graph" render đúng chỗ nhưng báo *"chưa có mốc nào"* trong khi DB có 2 mốc:
- **Đường dẫn hai kiểu tách đôi chuỗi thời gian.** `D:/Zyro/Tool/Zemory` (curl dùng `/`) và `D:\Zyro\Tool\Zemory` (UI dùng `\`) lưu thành **hai project khác nhau**. Sửa: `resolve()` chuẩn hoá khoá ở CẢ `recordFitness` lẫn `fitnessHistory` — đọc phải cùng phép chuẩn hoá với ghi, lệch một bên là hỏng lặng.
- **Test ghi bẩn vào `global_memory.db` THẬT của user.** `recordFitness` đặt trong `getCodeGraph` ⇒ mỗi test dựng repo tạm lại chèn một hàng: đo được **15 hàng rác `zemory-gcache-*`** sau một vòng gate. Nguyên tắc bị vi phạm: **một hàm ĐỌC graph không được mutate trạng thái toàn cục**. Sửa gốc: `getCodeGraph` thuần đọc (trả thêm `sig`), điểm ghi chuyển sang endpoint `/code-graph` — chỗ duy nhất quan sát được "project này vừa đổi code". Đã dọn 15 hàng rác + gộp 2 cách viết. Có test chặn tái phát; sau một vòng gate đầy đủ DB còn đúng 1 khoá, 0 rác.
- Chuỗi phẳng (mọi mốc bằng nhau) bị ghim sát mép trên vì chia cho `mx` → đọc như "kịch trần". Đổi trần thành `mx*1.15`.

### Ba món từ bản tổng hợp "Graph Engineering" (user gửi 2026-07-27)
Đối chiếu tài liệu với graph mình có; lấy 3 món hợp điều 6, **bỏ** pipeline extract/resolve bằng LLM, điều phối swarm, và commit-DAG kiểu AgentHub (git đã là DAG).
- **Lịch sử `graphFitness`** (bảng `graph_fitness`, schema **v18**): một hàng mỗi lần graph dựng lại THẬT (chữ ký nguồn đổi), không phải mỗi lần đọc — nếu không, mở tab 20 lần đẻ 20 hàng và chart nói dối về nhịp đổi code. Card "Xu hướng graph" đặt ở panel phải màn Graph, **KHÔNG** nhét vào lưới 4 chart của Global Memory (lưới đó nói về bộ nhớ, user đã chốt đúng 4 bảng). Không backfill quá khứ — bịa số cũ là vi phạm điều 12.
- **Edge id ổn định** `sha1(from|to|kind|rel)[0..12]`: đóng dấu SAU khi gộp đủ 3 lớp cạnh. `rel` nằm trong hash có chủ ý — cùng cặp (A,B) mà một cạnh khai báo và một cạnh suy luận là hai sự thật khác hạng (điều 13). Đo live: **860/860 cạnh có eid, 860 id duy nhất**.
- **`conform` check ⑥ `dangling-ref`**: docs trỏ tới thứ không tồn tại (`điều N` sau khi đánh số lại · link `.md` mất file). Tất định, 0 LLM.
  - Bản đầu SAI: soi *cạnh* của graph-standard — mà graph-standard `continue` bỏ mọi tham chiếu không resolve được **trước** khi tạo cạnh ⇒ check vĩnh viễn ra 0. **Một check không thể nổ còn tệ hơn không có**: nó phát ra lời bảo đảm "không mâu thuẫn" trong khi chưa hề nhìn. Bắt được khi tự hỏi "cái gì làm nó đỏ?" mà không trả lời nổi. Sửa: đọc thẳng `.md`, và thêm 3 test fixture BUỘC nó nổ.
  - Đã thử thêm nhánh "§4 routing tới slot ngoài từ điển §3" → **13 mục báo oan** (`attic` `data` `dist` `external`…, đều là TẦNG §2 chứ không phải slot §3). Bỏ nhánh đó; gốc rễ là `slotOf()` gọi mọi đoạn cuối đường dẫn là "slot" — ghi vào 05_TODO.
  - Chạy trên 3 repo thật: `dangling-ref` = 0 ở cả ba (không báo oan ngoài đời).

---

## [2026-07-25] — fix(app): tray ghost (EnumChildWindows sweep, copy SasinFlow) · logo gold + bỏ Z-stamp bừa → initials · version 1.0.0 + quy luật release-based · khoanh vùng điều 6

Follow-up sau `3baaf02` (plan-15 đã push). User báo 2 bug thật (tray ghost · logo cũ Start Menu) + chỉnh version + 2 việc harness. **CHƯA commit** (chờ user cho push).

### Tray ghost — port logic SasinFlow (`desktop.py _sweep_dead_tray_icons`)
- Gốc: `shutdown()` graceful CÓ gọi `stopTray()` (NIM_DELETE), nhưng **kill -Force/crash = TerminateProcess → không cleanup → icon chết kẹt tới khi hover**. zemory dùng systray2 = **Go helper process RIÊNG** (khác SasinFlow pystray in-process).
- `backend/src/platform/traysweep.ts` (mới): lúc daemon startup, gửi `WM_MOUSEMOVE` quét lưới lên mọi `ToolbarWindow32` (thanh tray hiện + overflow). **Tìm toolbar bằng `EnumChildWindows` đệ quy** — chuỗi cứng `Shell_TrayWnd→TrayNotifyWnd→SysPager→ToolbarWindow32` trả **0** trên Win10 19045 này (bug bản đầu, tự bắt bằng test trực tiếp: BARS 0 → sửa thành đệ quy: BARS 4). PowerShell `-EncodedCommand`, fail-open (điều 9). Gọi trong `ui.ts` trước `startTray`.
- Verify chu kỳ: đóng app → 0 helper · mở lại → **đúng 1** (không tích luỹ process — nguồn ghost cũ).

### Logo
- Icon vốn **đã gold trong git** (regen từ `frontend/assets/UI_Zemory_Logo.png`) — cái Z xanh user thấy ở Start Menu **100% là Windows icon-cache**, không phải file sai. Đã: xoá shell icon-cache + `iconcache_*.db` + restart explorer + `StartMenuExperienceHost`/`SearchApp` + gỡ shortcut rác **"Zemory Cockpit.lnk"** (chrome-icon cũ từ hồi Edge `--app`). Start Menu search-cache bám session → user **sign-out/in** là ra gold (đã báo).
- **Bỏ logo Z stamp bừa** (`app.js`+`app.html`): card project + card "This machine" KHÔNG còn hardcode `'Z'`/`'◱'` cho MỌI thứ (SasinFlow/PBI cũng ra "Z") → hiện **chữ-cái-đầu tên** (neutral, phân biệt). Logo THẬT per-project/máy = **để dành làm setting** (user chốt hướng). Giữ brand logo góc rail (của chính zemory — chính đáng).

### Version 1.0.0 + quy luật release-based (user chốt)
- `package.json` `0.0.1` → **`1.0.0`** (user quyết số). Quy luật (theo SasinFlow `[[sasinflow-version-user-decides]]`): **RELEASE-BASED** — bump khi release/deploy 1 bản, KHÔNG per-commit/per-feature; USER quyết số (semver M.m.p); việc giữa 2 release gom vào version kế; nguồn = manifest 1 chỗ; notes = 06_CHANGES. Ghi `03_STRUCTURE §5` (zemory + **template app** generic; nonapp không có version convention → bỏ qua).

### Hiến pháp điều 6 — khoanh vùng (user "làm luôn")
- Thêm PHẠM VI vào **điều 6**: "no-LLM" ràng buộc CHÍNH hệ zemory (memory · search · harness · graph), **KHÔNG áp app mà harness dựng** (slot `ai/`·`agents/`·`tools/`·`evals/` để xây app LLM/AI tự do). Chống misread mà nhiều agent gặp (đã sửa README `3baaf02`). Đây là **làm rõ phạm vi, KHÔNG supersede** (luật không đảo). *(model-routing (b) — user tự nhắc "chỉ ghi ý tưởng" — GIỮ idea-only ở `05_TODO`, KHÔNG mở điều 6 kẻo mâu thuẫn chính khoanh-vùng này.)*

## [2026-07-25] — feat(ui): plan-15 tiếp — Harness/badge THẬT · 3 màn mới (Global Memory·Sessions·Insights) · Settings About · Graph collapse/3-resize/đổi-vị-trí · tách app.html · README diệt misread no-LLM

Phiên tự chủ (user "làm hết", chỉ dừng khi có fork nghiêm trọng). Mọi thứ verify **LIVE** (endpoint thật trên daemon 4444) + `node --check` JS nhúng + i18n parity 2 dict mỗi cụm. Kill+rebuild+reopen daemon 2 lần cho backend mới. **CHƯA có test tự động cho màn mới** (frontend no-build). Chưa push tới khi user duyệt (giờ user bảo push).

### Diệt fake / nối thật
- **Badge App/Non-app**: `projects.ts projectProfile()` đọc `docs/.harness.json` `config.profile` (fail-open "app"); `KnownProject.profile` + coverage `ui.ts` gắn `profile` (chỉ host này + CÓ harness → app/non-app, còn lại `null`). FE **ẩn badge khi `null`** thay vì đoán regex `/PBI|powerbi/` (4 chỗ). Detail đọc `data-prof` thật.
- **Harness sub-tab (project-detail)**: gỡ mock (cây cứng + 3 nút chết + preview 03 cứng + tag "mock detail") → **2-khung thật** cây-trái/viewer-`.md`-phải + seam `--phdoc`. Backend `/harness-files` (docs/agent+plan+AGENTS thật) + `readDoc` mở rộng (AGENTS root + `plan/`, path-guard giữ trong docs). Nút validate → `/check?feature=validate`.
- **Dead-code**: gỡ `SHELL`/`STD`/`stdRender` (mock cũ, `stdRenderReal` đã đè — grep xác nhận 0 caller) · `subtabs('data-mt'/'data-et')` no-op · nhánh `sysStatus kind==='mock'` · CSS `.mockbadge`.

### 3 màn nav mới + Settings (data THẬT, 0 số bịa — điều 12)
- **Global Memory** (dashboard, `◉`): donut Memory Health (vector coverage) + Top Sources (aggregate `scopeTree` theo source) + Vector Index (count/pending/coverage/dims) + Memory Statistics — toàn `Z.mem`/`/memory-status`.
- **Session Viewer** (`🗂` · `/sessions` mới, list KHÔNG dedup): list + search + Session Info + thread (`/memory-session`) + **Export .md** (blob client-side).
- **Insights** (`📈` · `/insights` mới): daily activity (SVG bars) · Top Agents (bar) · Memory growth (SVG line cumulative) · Health tiles — **tất định, 0 AI/forecast** (COUNT/SUM thẳng DB). Đo LIVE: 31 ngày · 5 agent · 15 tháng · 1199 sess/167k msg/1200 digest.
- **Settings**: About đầy đủ (version·máy·DB path·engine·license — thật từ `/ping`+`storageInfo`; KHÔNG lặp automation đã có ở màn Bộ nhớ&Sync).

### Graph nâng cấp (user giao chi tiết)
- Collapse **cây folder** + collapse **bảng thông tin** (nút `◀`/`▶`, lưu localStorage) · **resize 3 bảng**: thêm `data-seam-side="after"` vào `initSeams` → seam phải chỉnh CỘT PHẢI (trước chỉ chỉnh cột-trước) · **đổi vị trí bảng thông tin** phải ⇄ **panel ngang trên cùng** (nút `⬒`, di chuyển element `#gPanel` + đổi flex-direction). `gApplyLayout()` repaint graph theo size mới.

### Nợ kỹ thuật + README
- **Tách `app.html`** (200KB monolith) → `frontend/styles/app.css` (23.5KB) + `frontend/scripts/app.js` (132KB), giữ **global scope** (`<link>`/`<script src>`, daemon phục vụ sẵn `/styles`/`/scripts`, hot 0-build). app.html còn **37KB** (chỉ HTML+2 ref). Verify LIVE: `/styles/app.css` 200 · `/scripts/app.js` 200. *(Tách 2-file; tách sâu theo concern để sau khi `cockpit.html` nghỉ hưu → dùng tên NN-* sạch.)*
- **README viết lại — trị "lỗi thiết kế" khiến agent hiểu sai bản chất** (user: nhiều agent đọc README tưởng zemory chống-LLM). Xoay trục **memory-first → harness-first**: zemory TRƯỚC HẾT là **harness chuẩn dựng app MỌI loại** (kể cả LLM — slot `ai`/`agents`/`tools`/`evals`) + Global Memory. Khoanh vùng **"never calls a model API" = CHỈ engine memory của zemory**, KHÔNG phải triết lý chống-LLM, KHÔNG ràng buộc app dựng bằng harness. Thêm callout *"What agents most often misread"* đầu README · Highlights harness lên dòng đầu · §6/footer/Why/core-concept đều khoanh vùng lại. **KHÔNG đụng `01_CONSTITUTION`** (luật user chốt; nếu muốn thêm câu khoanh-vùng vào điều 6 → chờ user chốt).

### Còn treo
- Test tự động cho 3 màn mới + graph layout (frontend no-build — chưa có harness test cho page sinh).
- Graph vẫn KHÔNG dò import GÃY (relative không resolve bị bỏ âm thầm); nav-cost chưa port vào graph UI mới.
- ĐỀ XUẤT (chờ user): thêm 1 câu vào `01_CONSTITUTION §Mục đích`/điều 6 khoanh vùng "no-LLM chỉ áp engine memory" để hiến pháp cũng không gây misread.
