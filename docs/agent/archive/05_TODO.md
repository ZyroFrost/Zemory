<!-- TODO ARCHIVE — mục ĐÃ XONG cắt khỏi 05_TODO.md. NGOÀI bộ đọc mỗi phiên; tra khi cần (vẫn trong git). -->
# TODO — Archive

- [x] **Đã xong:** cứu theo lô-chia-đôi (198.758) → chép 127.700 vector → dựng lại 7/7 FTS →
  `integrity_check: ok` → kiểm nghiệp vụ (FTS ra 31.748 dòng, CLI tìm đủ ba lớp) → đổi chỗ →
  `memory scan` nạp lại 144 tin từ transcript gốc ⇒ **+602 tin, mất 0**.
- [x] **✅ NGUYÊN NHÂN THỨ HAI (2026-08-04): hook per-message + `npm run check` song song.**
  Lần hỏng thứ hai **Drive vô can** (kho ngoài vùng sync, 1 hardlink). Thủ phạm là 4 hook chép
  từ máy cũ — mỗi lượt trả lời sinh một tiến trình ghi kho — chồng lên `node --test` chạy 60 file
  song song. **Khoá `cli-write.lock` KHÔNG phủ đường hook** (kiểm lúc hỏng: file khoá không tồn
  tại). ⇒ Sửa khoá là việc thật, ghi ở mục 🔴 đầu file.
  **Nghĩa là kho có ÍT NHẤT HAI đường hỏng khác nhau** — vá một đường không đóng được đường kia.
- [x] **✅ ĐÃ TÌM RA (2026-08-03h): Google Drive đồng bộ chính file DB.** `D:\Zyro` nằm trong
  vùng Drive; `fsutil hardlink list` cho thấy `global_memory.db` bị hardlink vào
  `\Zyro\.tmp.driveupload\`. Đã `relocate` sang `D:\zemory-data` (ngoài vùng Drive), verify lành.
  Chi tiết + phần tôi kết luận sai: `06_CHANGES [2026-08-03h]`.
- [x] **TÔI ĐÃ NÓI SAI, tự sửa:** tôi ghi `data/backups/` **RỖNG**. Không đúng — trong đó có
  `global_memory-2026-07-26T12-48-21-379Z.db` (1,12 GB, **171.345 tin · 1.203 phiên**, đọc
  được, `quick_check` chạy). Tôi kết luận "rỗng" từ một lần `ls` sai chỗ và **không kiểm lại**
  trước khi viết vào sổ — đúng cái lỗi mà chính sổ này đã ghi ở mục engram ("tài liệu không
  phải phép đo"). Vậy máy **CÓ** đường lùi, chỉ là cũ 8 ngày (thiếu ~28k tin).
  Cứu + quét lại vẫn là lựa chọn đúng vì nó cho **199.360 tin** — nhiều hơn cả bản trước khi
  hỏng — nhưng lý do phải là "cứu được nhiều hơn", KHÔNG phải "không còn đường nào khác".

- [x] **F6 — search hybrid+rerank chạy IN-PROCESS trong daemon, nuốt event loop (đau nhất).**
  Đo sống 2026-08-02: máy RẢNH search vẫn **25,5 s** (rerank bật, model ấm — CLI chỉ 9,9 s);
  trong lúc scheduler embed backlog chạy thì **MỌI endpoint ~48 s**, kể cả `/memory-status`
  vốn **4 ms** (kiểm chéo: tắt embed con ⇒ status về 4 ms). Bài học 07-21 *"việc nặng không
  được lên event loop của daemon"* đã áp cho scan/embed/digest (tiến trình con) nhưng **chưa
  áp cho search** — một người bấm Tìm là cả UI đứng. Hướng: đẩy search/rerank ra worker/child,
  hoặc tối thiểu trả 202+poll. Cần user chốt hướng.
- [x] **F5 — 23 nhóm project TÁCH TÊN** — user duyệt, đã gộp `[2026-08-02i]`: 115 phiên trỏ
  lại trong 44ms, khoá project 135 → 112, phiên/tin không đổi, `cwd` gốc còn nguyên ở 59 phiên.
</details>

- [x] **RÁC `[tool_result]` — ĐÃ DỰNG RỒI GỠ BỎ 2026-08-02. Tiền đề SAI, đừng đề xuất lại.**
  Đã build đủ: bảng dẫn xuất `boiler` (schema v20) + `rebuildBoiler` nối vào `scan`/`reindex`
  + `dropBoilerplate` lọc trước xếp hạng. Chạy thật: đánh dấu **13.524 tin**. Rồi đo hiệu quả và
  **gỡ sạch**, vì nó không thắng net (`HP điều 12`).
  - **Đo quyết định:** trên 5 truy vấn thật, số tin boilerplate lọt vào top-10 khi KHÔNG lọc là
    **0/10 ở cả 5** — bộ lọc không đổi được gì. Chỉ khi truy vấn CHÍNH LÀ câu boilerplate
    (`todos modified successfully`) mới có 8–10/10, mà lúc đó trả về chúng là **đúng**, không phải rác.
  - **Vì sao tiền đề sai:** con số "~16% kết quả là rác" là tôi đếm `[tool_result]`, mà tool_result
    **không** đồng nghĩa boilerplate. Soi tay 3 hit của truy vấn `cowork bootstrap`: 2/3 là **nội
    dung file test BOOTSTRAP thật** — đúng thứ người tìm cần. Nhóm này đã có `demoteToolOutput`
    phạt nhẹ, và phạt nhẹ mới đúng liều.
  - **Giữ lại bài học, không giữ code:** phân bố trùng khít (đo 195.533 tin) — ≥5: 25.117 tin
    (12,8%) nhưng **giết nhầm nội dung file đọc lại 5–19 lần**; ≥20: 13.524 (6,9%), 93% là
    tool/hệ thống; ≥50: 9.510. Muốn làm lại thì phải có **corpus nhãn chứng minh recall tăng**,
    không phải chỉ đếm rác.

- [x] **MIGRATE CHÍNH REPO NÀY sang kiến trúc skill — XONG 2026-08-01** (ghi `06_CHANGES [2026-08-01b]`): 7 skill ra `.claude/skills/`, `04_SKILLS` 222→53 dòng, `04` ra khỏi ĐỌC HẾT, bộ luôn nạp −5.4k tok/phiên, test `read-set-contract` siết lại.

- [x] **PHASE 1 — BỘ COWORK: XONG 2026-07-31** (đã ghi `06_CHANGES [2026-07-31b]`, user duyệt 01/08).
  `03_STRUCTURE` + `04_SKILLS` **trở lại đủ 6 file**, nhưng **trigger-load** (bảng trong `AGENTS.md`),
  KHÔNG phải luôn-nạp ⇒ nền mỗi phiên **3.182 tok** (trước 2.842; bộ đầy đủ 10.268). `03 §2` là **nhà duy
  nhất của từ điển** — `docs/dictionary.md` bị gỡ khỏi chuẩn, 10 chỗ trỏ lại về `03 §2`
  (structure ×2 · fill ×2 · session-close · audit · conventions · README · 02_RULES · AGENTS).
  Bù 3 luật: **đồng bộ 01↔02↔03↔05↔06↔plan** · **phép kiểm phải ĐỎ ĐƯỢC** (+ luật 5 "PHÁ THỬ" trong
  `audit`) · **"tra `archive/` trước khi kết luận chưa từng làm"** trong `AGENTS.md`.
  Manifest `BOOTSTRAP.md` **24 hàng** (thêm 2, sửa 6 số dòng — đọc số THẬT bằng script, không gõ tay).
  **Đo end-to-end:** dựng thử một dự án theo manifest rồi chạy `check_install.py` → **24/24 khớp, exit 0**.
  Gate `bootstrap-manifest` 8/8 · `npm run check` 422/422 · `conform` ✓.
  - ⚠ **`check_install.py` chỉ dùng được NGAY SAU KHI CÀI** — nó gate cả `05_TODO`(7) và `06_CHANGES`(9),
    hai file bắt buộc phải phình. Đừng quảng cáo là "chạy lại lúc nào cũng được".

- [x] **PHASE 2 — GUIDE.docx đồng bộ + mục `/context`: XONG 2026-07-31** (đã ghi `06_CHANGES [2026-07-31b]`).
  Đọc trọn 463 dòng (markitdown) rồi đối chiếu với bộ file thật. **7 sửa đồng bộ:** cây §7 thiếu
  `03`/`04` · câu chốt §7 ánh xạ 3 mức sai · §12 thiếu dòng "định nghĩa chỉ số" · §6 gọi nhầm "danh mục
  quy trình" (thứ luôn nạp là BẢNG TRA) · §2 thêm thuật ngữ "Từ điển dữ liệu" · §11 thêm ranh giới "tra
  archive trước khi nói chưa từng làm" · `BOOTSTRAP.md` 1d nói thiếu 03/04.
  **Thêm theo user (dựa trên đo GM 9.730 tin ngắn):** hàng "Bắt đầu một phiên mới → *đọc docs và chuẩn
  bị*" (user gõ 11×, guide chưa hề có) · ví dụ ghi sổ đổi thành *"note lại đi"* (dạng user hay dùng hơn
  *"ghi sổ"*) · **mục mới "Canh chỗ nhớ còn lại — lệnh `/context`"** kèm **ảnh thật user chụp**
  (`img/step_context.png`, moi từ transcript phiên), ngưỡng **95%** thì ghi sổ + đổi phiên, kèm phân biệt
  *context window* vs *weekly usage limit*.
  **User BÁC 2 đề xuất của tôi:** `xong chưa` (chỉ dùng khi vòng lặp kẹt) · `làm đi` (không cần).
  **Bảng kiểm write-docx:** bảng 9→9 · ảnh 9→**10** · mọi `r:embed` tra ra rel + file có thật · 0 ảnh mồ
  côi · ảnh rộng = khổ chữ (5.731.510 EMU, cao theo tỷ lệ gốc 828×407) · TOC field còn · begin=separate=
  end=13 · **trang 15 → 16** (render thật bằng x2t).
  - ⚠ **Vá thêm lỗi CÓ SẴN:** `wp:docPr id` trùng (`1`×3 · `4`×2 · `5`×2) từ trước đợt này — đã đánh số
    lại 1..10. *(Bản `.bak` cũng trùng ⇒ không phải do đợt sửa hôm nay.)*
  - ⚠ **Bẫy đã trả giá:** `x2t.exe` render lỗi JS *"Cannot read property 'length' of undefined"* — KHÔNG
    phải docx hỏng, mà là **`AllFonts.js` không nằm cạnh `x2t.exe`** (nó ở
    `%LOCALAPPDATA%\ONLYOFFICE\DesktopEditors\data\fonts`). Trỏ đúng là render được ngay.
  - **Còn lại:** mục lục là TOC field ⇒ **user mở Word bấm `F9`** để cập nhật số trang.
    Chưa đo phân bố **khoảng trắng cuối trang** (skill `write-docx` §10) — đợt này không chèn ngắt trang
    ép nên rủi ro thấp, nhưng chưa đo thì ghi là **chưa đo**.

- [x] **PHASE 3 — ĐÃ ĐEM LÊN BẢN CHÍNH (app + nonapp), 2026-07-31.** Supersede đã ghi; hai test khoá
  hai chiều đã nới sang "ba bộ cùng kiến trúc". Kết quả: 17 file skill mới (app 7 · nonapp 10, chép
  NGUYÊN VĂN playbook cũ + frontmatter), `04_SKILLS` thành sổ đăng ký (211→52 · 233→55 dòng, trần 60
  dòng có gate canh), `04` ra khỏi ĐỌC HẾT, nonapp `03` **§7 = Từ điển dữ liệu** và `docs/dictionary.md`
  bị cấm ở mọi chỗ. Gate 422 → **423** · `conform` ✓.
  - **Code phải đi kèm (5 chỗ):** `adopt.ts` scaffold `.claude/skills/**` (thiếu ⇒ `init` dựng sổ đăng
    ký trỏ vào file không tồn tại — `init --non-app` giờ ra **19 doc**) · `checks.ts` probe `grill` nhận
    cả hai hình dạng · `conform` luật ④ đối chiếu 3 chiều (thư mục ↔ `04` §2 ↔ trigger `AGENTS`) ·
    `graph-standard` đếm skill theo THƯ MỤC (trước đếm heading ⇒ sổ mỏng ra "skill 4" sai) ·
    `validate` bỏ chuỗi "§7" (trên dự án non-app nó chỉ vào mục TỪ ĐIỂN, không phải luật deliverable).
  - **Đã đo:** `check_install` cowork 24/24 · `init --non-app` ra đủ 10 skill · đột biến 2 phép kiểm mới
    (nhét `04_SKILLS` lại vào ĐỌC HẾT ⇒ đỏ · skill không khai trong sổ ⇒ `skill-unregistered` đỏ).
  - ⚠ **Sửa lại một kết luận CŨ của chính mục này:** trần theo dòng chỉ sai với `06_CHANGES`; còn
    `05_TODO` thì **không có trần nào cả** — `archiveTodo` đã đúng từ trước (mọi mục `[x]` rời file
    NGAY, comment trong code ghi rõ *"ngưỡng kích thước là cổng SAI cho một luật đúng-chỗ"*, đo
    2026-07-29: gác bằng ngưỡng là lý do 107 mục đã xong nằm lại chiếm 46% file). Doc của cả ba bộ
    nay nói đúng thực tế đó; `06_CHANGES` bản cowork (không có CLI) trần **40.000 ký tự**, giữ ~25.000.

- [x] **ĐEM Bước 4 "TỰ DỌN" LÊN MỌI BẢN CHÍNH — XONG 2026-07-31** (làm cùng Phase 3 ở trên).
  `session-close` Bước 4: sau khi ghi sổ, đếm dòng; file vượt ngưỡng thì chuyển phần cũ sang
  `docs/agent/archive/`, chép NGUYÊN VĂN. Bản app/nonapp đang phó mặc cho lệnh `zemory archive` — mà
  lệnh đó chỉ chạy khi có người nhớ gõ.
  - ⚠ **SỬA LUÔN ĐƠN VỊ TRẦN — trần theo DÒNG là sai đơn vị (đo 2026-07-31).** Dòng ở sổ rất dày:
    `05_TODO` của zemory **33,8 tok/dòng**, `06_CHANGES` **20,7 tok/dòng** ⇒ **trần 300 dòng ≈ 10.155 tok
    MỖI file**. Mà `05_TODO` **luôn được nạp**: nền cowork 2.842 tok + TODO chạm trần = **~12,9k tok**,
    **nặng hơn cả bộ đầy đủ (10.268 tok)** mà nó thay thế — toàn bộ 7,4k tiết kiệm từ việc dời 03/04
    sang skill bị MỘT cái TODO đầy ăn sạch. ⇒ trần phải tính bằng **KÍCH THƯỚC (ký tự/token)**, không
    phải dòng.
  - ⚠ Ghi chú kèm: câu *"05_TODO — CHỈ các mục còn mở"* trong `AGENTS.md` **không giảm token đầu vào**
    (đọc file là đọc nguyên file); nó chỉ là chỉ dẫn chú ý. Đòn duy nhất có tác dụng là **giữ file nhỏ**.

- [x] ~~test sub-tab routing + ratchet không-tái-sinh~~ · ~~dọn orphan i18n~~ — **XONG 2026-07-29.** Nửa "test nav/sub-tab" **vốn đã có** (`app-ui.test.mjs`: nav khoá đúng 6 key + mỗi nút sub-tab khớp đúng một khối `.sub` cho 4 nhóm) — mục này khai thiếu. Nửa thật còn thiếu là **ratchet không-tái-sinh**, nay đã thêm: 7 khối (`sessDlg` · `homeChecks` · `renderHomeChecks` · `gmSources` · `insHealth` · `gmHealth` · `gmVector`) + 9 key i18n. Đã xoá **18 cặp** khỏi 2 dict (−715 ký tự); dict 360 → 351 key, parity vẫn cân. Đột biến **5/5**.

**CHỜ USER CHỐT trước khi code:**
- [x] ~~Mở phiên Claude/Codex mới xác nhận Stop hook capture e2e~~ — **ĐÓNG: đang xác minh SAI ĐƯỜNG.** Đo 2026-07-29: **không máy nào cài hook** (Claude `settings.json` + Codex `config.toml` đều 0 lần nhắc zemory) mà capture vẫn đủ — **6.882 tin/2 ngày**, `ingest_state` tiến nhịp ~30 phút. Đường thật là **scheduler scan của daemon**; hook chỉ là lối tuỳ chọn (code còn sống, `hook install` vẫn ghi được). `plan/00` đã sửa cho khớp thực tế. **Còn lại (nếu muốn):** đo độ trễ scan-vs-hook để quyết có khuyến nghị hook cho ai cần realtime.
- [x] ~~Benchmark Raw vs lite vs Lean map/signatures vs semantic~~ — **ĐÓNG: nửa còn giá trị đã BUILD, nửa kia thuộc scope đã DROP.** `zemory memory bench` (RAG gate: FTS-only vs hybrid trên corpus paraphrase có nhãn, + rerank) đã có và **đang chạy trong gate** (`vectors.test.mjs` — *"hybrid recall@3 ≥ FTS recall@3"*). Còn "Raw/lite/Lean map/signatures" là từ vựng của **compression — DROPPED 2026-06-25**, plan 03 đã sang `attic/dead-plans/`. Phần code-map (LeanCTX map/signatures cho CODE) vẫn sống nhưng ở mục §Phase 2 *Code map AST*, không phải ở đây. *(Mục này lọt từ backlog tháng 6, trôi qua 2 lần đổi tên file mà không ai soi — tìm lại được nguyên văn trong bản cứu index `02_TODO.md` dòng 77.)*

- [x] ~~47.068 tin chờ nhúng vector~~ — **XONG (đo 2026-07-29):** `vectorRemaining()` = **0**, coverage **134.831/134.831 = 100%**, profile `gemma-prompt-v1` 256d. Scheduler nền đã tiêu hoá hết đúng như lường trước; không phải sửa gì. *(Mục này treo với con số cũ trong khi việc đã xong — đúng loại drift mà `archiveTodo` sinh ra để dọn.)*

- [x] SQLite global đa-agent + FTS5 word/trigram + search theo project/`--all`.
- [x] Adapter Claude Code, Codex, Continue và LM Studio; parser state có migration versioned.
- [x] Stop capture cho Claude và Codex; recall on-demand qua global instruction.
- [x] Backup global DB trước migration và recovery scan parser v2.

- [x] ~~🗜️ `compress` (compress-on-read)~~ — đã BUILD rồi **BỎ khỏi scope (2026-06-25)**, code dời `attic/`. (Lý do: không cho net saving trên subscription — changelog.)
- [x] **`harness` `validate`** (trước tên capability `governance`) — link docs/, độ dài CHANGES, supersede.
- [x] Khóa DB-source: generated mirror không re-import, ID section ổn định, `changelog add` tự render.
- [x] Archive chuyển sang cờ SQLite; lịch sử vẫn search được, không tạo archive store thứ hai.
- [x] Scope mutation theo project và chặn path traversal ngoài `docs/`.
- [x] Provider runtime đọc thật `docs/.harness.json`; `doctor` đỏ khi provider sai.
- [x] Test integration, clean build, CI, license, README và package hygiene đã hoàn tất.
- [x] **Nghiệm thu cơ học 2026-06-29 PASS:** `npm run check` xanh; `zemory doctor` xanh; `validate`, `docs ls`, `plan search`, `changelog ls`, `memory scan`, `memory search`, `memory bench`, `npm pack --dry-run` đều chạy được.

**Trạng thái sau 2026-06-30:** remote Git + commit/push `main` đã xong; không còn blocker cơ học trong v0.1. Mốc publish/package registry là quyết định riêng nếu cần.
- [x] ~~**HAI FILE `config.json` cùng tồn tại**~~ **ĐÃ CÓ CẢNH BÁO 2026-07-28** — `zemory doctor` nay in ra bản ĐANG DÙNG (cạnh DB) và bản MỒ CÔI ở home. **CHỈ báo, không tự xoá** (file của user). Chạy thật trên máy này: cảnh báo hiện đúng hai đường dẫn. Còn lại: bạn tự xoá `~/.zemory/config.json` nếu không cần.
- [x] ~~**`.bell` + `.bell .badge` — CSS chết**~~ **ĐÃ GỠ 2026-07-28** (2 rule; kiểm chéo: 0 rule còn lại · 0 phần tử mang class). Test khoá không cho tái sinh.
- [x] ~~**Ảnh chưa có bề mặt xem**~~ **XONG 2026-07-28 (bản B, user duyệt thiết kế).** Ảnh hiện INLINE trong Recall (thread + ô Xem trước) + chip lọc `🖼 Có ảnh` + badge `🖼N` trên hàng kết quả + dialog M 16:9 xem full. Backend: `memory/attachments.ts` (mới) · `GET /attachment?sha=` (content-addressed, cache immutable, `nosniff`+CSP) · `atts` gắn vào `/memory-session`·`/memory-context`·`/memory-search`·`/recent-messages` · `hasAttachment` trong `SearchOptions`. Verify LIVE: tải về sha256 KHỚP TUYỆT ĐỐI với bản trong DB; `withAtt=1` lọc 0/8 → 8/8.
- [x] ~~**Adapter khác chưa nối ảnh**~~ **XONG 2026-07-28 — cả 6 adapter.** Bộ đọc block ảnh gom về MỘT chỗ `adapters/_shared.ts` (`imageAttachment`/`imageLabel`/`MAX_BLOB_BYTES`), `claude.ts` bỏ bản sao. Ba hình dạng ĐÃ KHAI: Anthropic base64 · OpenAI `image_url` data-URI · ChatGPT `image_asset_pointer` ⇒ `kind='ref'` (export không kèm bytes, thà ghi nhận còn hơn im lặng). Hình dạng lạ ⇒ `null`, KHÔNG đoán. Test `attachments.test.mjs` (13) chạy vòng qua TỪNG adapter.
  - ⚠ **CHƯA bump `PARSER_VERSION`** (đang 5) ⇒ ảnh cũ của `codex`/`chatgpt`/`continue`/`lmstudio`/`claude-web` **chưa được nạp lại**; chỉ dữ liệu MỚI mới có. Bump = re-ingest toàn bộ, giá đã đo lần trước: **+44.390 vector chờ embed và DB +21%**. Nêu giá TRƯỚC khi bấm (bài học 2026-07-27) ⇒ chờ user quyết.
  - ⚠ **Chưa verify trên dữ liệu THẬT của 4 nền kia** — máy này không có store `continue`/`lmstudio`, `codex` ở đây dùng SQLite chứ không phải `sessions/*.jsonl`, còn 2 phiên `claude-web` mẫu không chứa block ảnh nào. Parser viết theo hợp đồng công khai + fixture, **chưa có ca đời thật chứng minh nó nổ**.
- [x] ~~**L3 — sync kèm ảnh**~~ **XONG TRỌN 2026-07-28** (cả 3 bước). Bước ③: công tắc `🖼 Kèm ảnh` cạnh Gọn/Đầy đủ (`/set-sync-attachments`, **mặc định TẮT** — bundle lean vừa cắt −74%, thả blob vào là xoá lợi ích đó). Bundle chở bảng phẳng `attachment_ship` mang `session_id`+`msg_uuid` **chứ không phải `message_id`** (id là AUTOINCREMENT cục bộ, cố ý không đi theo bundle — chở nó là trỏ vào tin của máy kia). Test round-trip: bật ⇒ ảnh sang và nối đúng id **9001 của máy nhận**; tắt ⇒ **0** blob.
- [x] ~~**Tên file khi tải ảnh về**~~ **XONG 2026-07-28 (user yêu cầu).** Trước đó "Save image as" luôn ra tên `attachment` vì trình duyệt lấy đoạn cuối đường dẫn. Nay `/attachment` trả `Content-Disposition: inline; filename="…"`.
  - **ĐO TRƯỚC, và số đo BÁC kỳ vọng "lấy tên gốc":** quét 378 transcript thật / 889 block ảnh — khoá bên trong chỉ có `type`·`source`·`file`, **KHÔNG block nào mang tên**; 0/678 hàng `attachment` có `name`. Claude Code không ghi tên cho ảnh dán/chụp màn hình ⇒ với nhóm này **tên gốc không tồn tại**, không thể lấy.
  - Nên: có `name` thì dùng nguyên; không có thì dựng tên CỦA MÌNH `zemory-<ngày-tin>-<sha8>.<đuôi>` và gọi đúng nó là tên dự phòng — KHÔNG bịa rồi gọi là tên gốc (điều 12). Đo LIVE: `zemory-2026-07-02-2c42170c.jpg`.
- [x] ~~**166 ảnh ở `toolUseResult` chưa hề được nạp**~~ **XONG 2026-07-28.** Ảnh do tool `Read` đọc từ file trên đĩa nằm ở `toolUseResult.file.base64`, **NGOÀI `message.content`** ⇒ `flatten()` không bao giờ thấy (đúng bẫy "hai đường ghi" đã dính với record `attachment`). Đây cũng là chỗ **DUY NHẤT có tên gốc thật**: ghép ngược `tool_use_id` → `input.file_path` của lời gọi tool, đo **166/166 = 100% trúng** (`layout_white.png`, `smartphone_red.png`…). Bảng ghép ở cấp module vì hợp đồng `parseLine` không có hook theo-file; có trần 5.000 để daemon chạy dài không phình.
  - ⚠ Cần **re-ingest** thì 166 ảnh này mới vào (hiện chỉ áp cho dữ liệu mới) — xem mục PARSER_VERSION ở trên.
- [x] ~~**Xem trước (Tìm kiếm) và thread (Phiên) vẽ KHÁC NHAU**~~ **XONG 2026-07-28** (user: *"giao diện của phiên nó khác bên tìm làm hơi khó xử lý"* — đúng, và là lỗi tôi tự tạo khi thêm ảnh). Gốc: ô Xem trước dán thẳng `stdEsc(content.slice(…))` nên **còn nguyên dòng nhãn `[image:…]` ngay cạnh thumbnail** (một thông tin hiện hai lần), không thu gọn khối code/tool, và dán nhãn `user` cho cả output tool; tab Phiên thì đi qua `msgHtml()` nên sạch. Nay gom về **MỘT hàm `msgBlock(m, cap)`** dùng chung cả hai chỗ (`cap`=0 là full cho Phiên, 390/1200 cho Xem trước); nhãn bị bỏ TRƯỚC khi cắt nên không bao giờ còn nhãn đứt nửa. 4 test mới trong `app-ui.test.mjs` **chạy chính hàm trích từ file đang ship**, kèm chốt "chỉ MỘT định nghĩa, đúng HAI chỗ gọi".
- [x] ~~**`/scripts/*.js` và `/styles/*.css` không có header cache**~~ **XONG 2026-07-28.** `serveFrontend` trả 200 trần ⇒ trình duyệt áp **cache phỏng đoán**: vỏ HTML đã `no-store` từ trước nhưng script/style thì bị bỏ sót, nên cửa sổ đang mở có thể chạy **vỏ mới + script cũ** mà không có dấu hiệu nào ngoài việc "tính năng vừa làm không thấy đâu". Thêm `cache-control: no-store` (file đọc thẳng từ đĩa của daemon cục bộ, chi phí bằng 0).
- [x] ~~**Tab Phiên không có thanh lọc như tab Tìm kiếm**~~ **XONG 2026-07-28 (bản B, user duyệt).** Thanh lọc full-width TRÊN hai cột, đúng khuôn tab Tìm kiếm: ô `Tìm phiên…` + `↻`, chip `🖼 Có ảnh`, 4 select `Thời gian · Nguồn · Agent · Máy`, ô đếm. **Cố ý KHÔNG chép Hybrid/Rerank** — đó là công tắc của bộ máy tìm, vô nghĩa với một danh sách phiên.
  - **Lọc chạy Ở SERVER, không phải client.** Bản cũ `Array.filter` trên `svList` = tìm trong **120 phiên vừa tải trong khi DB có 1.206**, mà giao diện vẫn nói như đã tìm hết — cùng họ "bề mặt chỉ-đọc nói sai" của F1. `/sessions` nay nhận `q·days·origin·agent·host·withAtt` và trả `{items, total}`; ô đếm hiện `N/total` khi danh sách bị cắt.
  - Mỗi hàng phiên có badge `🖼N`; số ảnh đếm qua `attachment_link` → `messages.session_id`, KHÔNG qua `attachment.session_id` (cột đó chỉ ghi phiên của tin đầu tiên mang ảnh ⇒ đếm thiếu khi ảnh dùng lại ở phiên khác).
  - Select của tab Phiên mang class `.ssel` tách khỏi `.rsel`: dùng chung một class thì đổi bộ lọc phiên lại **bắn một lượt recall hybrid** vô ích. 3 test khoá + i18n 3 khoá mới đủ 2 từ điển.
  - Đo LIVE khớp số đã đo trên DB: tổng **1.206** · có ảnh **73** · web **861** · máy DESKTOP-PFB157K **251**.
- [x] ~~**Link đính kèm mồ côi**~~ **XONG 2026-07-28 — và suýt xoá nhầm.** Tiêu chí cũ của tôi ("hàng có `message_id` trỏ tin đã chết") **SAI**: cột đó chỉ ghi tin ĐẦU TIÊN mang nội dung (dedup sha256), đo lại thì **cả 87 hàng vẫn còn liên kết SỐNG** ⇒ xoá theo tiêu chí đó là mất 87 tấm ảnh đang dùng. Số mồ côi THẬT = **0**. Nay `pruneOrphanAttachments()` chỉ dọn **LIÊN KẾT chết** (95 → 0), chạy tự động cuối mỗi `scan`; xoá nội dung là tuỳ chọn `dropUnlinked`, mặc định KHÔNG. Test khoá đúng ca này.
- [x] ~~**Duyệt mắt màn Recall**~~ **USER DUYỆT 2026-07-28**: *"ok cái này quá hay luôn, cái xem ảnh khá ổn"*.
- [x] ~~**Ratchet chặn ký tự điều khiển**~~ **XONG 2026-07-28** — `conform` check ⑦ `control-char` (blocking): quét mọi file code + docs, duyệt theo MÃ ký tự (không regex — dải điều khiển trong class regex chính là chỗ lint vừa bắt). 3 test chứng minh nó **nổ được** (NUL trong .ts · 0x08 trong .md) và **không nổ oan** (tab · CRLF · dấu tiếng Việt).

**Bẫy đã trả giá trong phiên này — đọc trước khi sửa tiếp**
1. **Backtick trong comment nằm trong template literal** cắt đứt chuỗi — dính **6 lần**. Trước khi viết comment trong một template literal, bỏ hết dấu ``` ` ```.
2. **Gate xanh KHÔNG chứng minh test đang soi thứ đang chạy** — 22 test UI neo vào file đã chết.
3. **Đo sai chỗ còn tệ hơn không đo** — kết luận "không có ảnh" vì chỉ nhìn `attachment`, trong khi ảnh nằm ở content block.
4. **Hai đường ghi message** — vá một đường thì dữ liệu im lặng không vào.
5. **`\b` của JS không dùng được cho tiếng Việt** — `ngu` khớp trong "nguồn".
6. **Luật quá tay nguy hơn không có** — regex `sync|migrate` trần bắt nhầm `/sync-pulse` chỉ-đọc.

- [x] **F1 — ĐÃ XỬ 2026-07-27** (`standard-spec.ts` + `/standard-spec`, parse 90/90 & 66/66, tìm section theo TÊN, FE fail-open). Mục cũ: **NGUỒN TRÙNG: chuẩn thư mục §3 + routing §4 nằm ở BA nơi.** `03_STRUCTURE.md` là nguồn thật (điều 3), nhưng backend có `SLOT_ROLES`/`graph-standard` và frontend hardcode `STRUCT` (35 hàng) + `ROUTE` (26 hàng) trong `app.js`. Đổi chuẩn = sửa 3 chỗ ⇒ chắc chắn lệch. **Đường sửa rẻ:** `graph-standard.ts` ĐÃ parse §4 từ chính .md — chỉ cần phơi endpoint rồi cho FE đọc, xoá bản hardcode. (Cũng là lý do CỐ Ý không dịch 26 chuỗi trong `STRUCT`/`ROUTE`: dịch bản sao = nhân đôi chỗ bảo trì.)
- [x] **F2 — ĐÃ XỬ một nửa 2026-07-27:** `analyzeMigration()` nối vào `zemory migrate` (hết mồ côi). `/init-fresh` vẫn còn, gỡ endpoint là thao tác xoá — chờ user duyệt. Mục cũ: **2 endpoint chết:** `/init-fresh` · `/migrate`, 0 người gọi ở cả FE lẫn CLI. `/init-fresh` dời docs cũ đi mà lại mở trên HTTP. Chưa gỡ — **gỡ endpoint là thao tác xoá, chờ user duyệt.**
- [x] **F3 — 1 digest mồ côi** (phiên gốc đã xoá) → đã dọn. Ghi chú: `pruneOrphanVectors` dọn vector nhưng KHÔNG dọn digest.
- [x] **Kho tài liệu tính năng — ĐÃ DỊCH XONG 2026-07-27** (14 khối → key `f.doc.<k>`, VI + EN ở cả hai từ điển; trần hardcode 127→100). Mục cũ: — 14 tính năng × khối `## Định nghĩa` dài, hiện chỉ có tiếng Việt. Là NỘI DUNG chứ không phải nhãn giao diện; dịch là một dự án riêng, cần user quyết.

- [x] **`slotOf()` trộn tầng với slot — ĐÃ SỬA 2026-07-27.** Thay bằng `routeTarget()`: chỉ gọi là slot khi tên CÓ TRONG từ điển §3 (`SLOT_ROLES`), còn lại thành hạng node `layer` mới, giữ nguyên đường dẫn nên không mất thông tin (`data/logs/` ≠ `data/secrets/`). Kết quả: `slot_unused` 48 → 37 (hết 13 slot ma), `layer` 14, `concern` 60 → 66, `slotsDeclared` 65 → 54. **Sửa xong lại tự dính hai bẫy, cả hai lộ ra ngay khi đo:** ① regex `[a-z_]+` loại mất `i18n` (có chữ số) nên một slot THẬT bị xếp thành tầng; ② đích trỏ vào FILE (`config/servers.yaml`) bị gắn `/` thành thư mục ma. Đã khoá cả hai bằng test.
- [x] ~~**RERANK BẬT ⇒ search 23 GIÂY.**~~ Đo 3 lần: rerank ON `23.525 / 22.805 / 22.222 ms`; tắt rerank `640 / 647 ms` ⇒ **chậm 36×**. `plan/05 §4.E` chốt rerank là **opt-in, mặc định OFF** — máy này đang ON. Recall trên UI hiện gần như không dùng được. Cần: trả mặc định về OFF, và nếu giữ thì phải chạy async + có spinner, không để block 23s.
- [x] ~~**`memory embed` dừng sớm**~~ — **BÁO NHẦM, lỗi của tôi.** `memory.ts:548` ghi rõ *"Plain `embed` does one batch; `--all` loops until the corpus is caught up"* ⇒ dừng sau 1 lô là **ĐÚNG THIẾT KẾ**; tôi chạy nhầm `memory embed` thay vì `--all`. Việc thật còn lại: chạy `memory embed --all` cho hết **12.890 vector** tồn sau re-ingest v4.

**🟠 P2 — chức năng mất / rác sống**
- [x] **Nút "Dọn dự án đã mất" — ĐÃ TRẢ LẠI 2026-07-26** (`data-act="pruneproj"` → `/prune-projects`, có dialog xác nhận). Mục cũ: — `/prune-projects` còn ở backend nhưng **FE không còn chỗ nào gọi** (grep: `pin-project` ✓ · `forget-project` ✓ · `prune-projects` ✗). Rơi mất khi rewrite `app.html`; changelog 07-22 §G ghi rõ nút này từng có.
- [x] **`gOrphanN` — ĐÃ GỠ 2026-07-26** (không còn trong app.js lẫn app.html). Mục cũ: — `app.js:311,324` ghi vào id không có trong HTML (có guard `if` nên không crash). Ô đếm orphan cạnh toolbar graph đã bị bỏ lúc rewrite.

**🟡 P3 — dọn dẹp**
- [x] ~~Harness: rà `01_CONSTITUTION` ghi RÕ luật riêng + AGENTS chỉ điều hướng~~ **HOÀN TẤT 2026-07-17** — AGENTS (repo+template) gọt về router THUẦN (0 luật/0 nội dung harness); `01_CONSTITUTION` giữ 12 điều luật riêng làm nguồn (fix §Mục đích: chỉ `docs_template/` là bản mẫu); audit toàn repo + dọn FILE WINS drift (plan/00·02, README, cli/ui/tools/comment) + gỡ nốt `docs sync` sót. Xem 05_CHANGES.

**✅ RAG semantic core — đã code/test tới gate A-D + E (rerank, opt-in) + full backfill (2026-06-30) + F1 (asymmetric prompts/256d/chunking, 2026-07-14):**
- [x] A. Embed pipeline: EmbeddingGemma-300M qua Transformers.js (ONNX, Node, no Python) — embed ra vector unit-normalized, fail-open khi model lỗi.
- [x] B. Vector store: `sqlite-vec` trong `global_memory.db`; `zemory memory embed` incremental; vector index hiện chạy thật trên DB local.
- [x] C. Hybrid retrieve: vector stream đã fuse vào RRF cùng FTS; `memory search` mặc định chạy hybrid khi enabled và fallback FTS khi vector lỗi/thiếu.
- [x] D. Benchmark gate: `memory bench` PASS; test suite xác nhận hybrid recall@3 >= FTS trên paraphrase corpus.
- [x] Full corpus backfill: `zemory memory embed --all` đã chạy xong trên corpus lịch sử của `global_memory.db`; mốc nghiệm thu 2026-06-30 xác nhận `vec_chunks` khớp `messages` 1:1. Vì memory ingest transcript sống, message mới sau mốc này xử lý bằng `zemory memory embed` incremental.
- [x] E. Rerank cross-encoder (opt-in) — `backend/src/memory/rerank.ts` rescore top-40 ứng viên RRF rồi reorder; fail-open giữ thứ tự RRF; default OFF, bật qua UI toggle / `ZEMORY_RERANK=1` / `--rerank`. `memory bench --rerank` đo lane riêng; spot check memory thật xác nhận reorder tốt hơn hybrid thuần. Chi tiết plan 05 §4.E.
- [x] F1. **Asymmetric Gemma prompts + Matryoshka 256d + chunk message dài + MCP grade/rewrite guidance** (2026-07-12, commit `2164674`) + **rebuild toàn bộ DB thật ở 256d + FTS external-content + VACUUM** (plan 12, HOÀN TẤT 2026-07-14: DB 1141.4MB→595.1MB, gate 82/82 + bench 100%/100%).
- [x] `zemory mcp` stdio server local với `memory_search`, `memory_show`, `plan_search`, `plan_show`.
- [x] Global Memory đọc được ở mọi cwd/project; nếu project chưa setup harness thì recall tự rơi về toàn bộ `global_memory.db` thay vì bắt buộc có `docs/.harness.json`.
- [x] MCP không auto-inject memory; agent gọi on-demand rồi dùng `*_show` để mở full text.
- [x] (2026-07-12) `memory_search` mô tả giờ hướng dẫn agent tự chấm kết quả + viết lại query (≤2 lần) khi hit kém, thay vì kết luận ngay "không có" — agentic retrieval loop, 0 token phía zemory.

**✅ Memory retention/privacy core — đã code/test 2026-06-30:**
- [x] Encrypted share đã có: `zemory memory export/import` bằng bundle `.zemory.enc`.
- [x] Raw local safety net: `zemory memory backup/restore` bằng SQLite online backup, restore luôn rename DB cũ sang `.bak-*`.
- [x] Forget trong memory DB: `zemory memory forget` theo `--session`, `--project`, `--source/--agent`, `--before`, hoặc `--message`; dry-run mặc định, `--force` mới xóa, auto backup trước khi xóa.
- [x] Re-redact dữ liệu đã ingest: `zemory memory redact --force` re-apply secret redaction cho messages/artifact index; FTS message update trigger giữ search index đồng bộ.
- [x] (2026-07-14) `zemory memory vacuum` — thu hồi trang trống sau khi chỉnh sửa cấu trúc (dims cut, FTS migration).

**Khác (chưa làm):**
- [x] **ĐÃ ĐÓNG 2026-07-28 — bản tab cockpit này đã bị `plan/15` thay bằng UI 6 màn (đang chạy), nên phần dở dang bên dưới không còn đích để về.** Giữ làm lịch sử: Spec: `plan/14 §4/§4b`. Thứ tự đã đảo theo user: **D (giao diện) → B (tự động) → C (write gate)** — vì công tắc tự-động cần chỗ đặt để bấm thử.
  - **ĐÃ XONG (chạy được, CHƯA commit):** thanh tab trên cùng `🧠 Global Memory │ <mỗi project 1 tab> │ ＋ │ ◐ theme │ ⚙` trong `ui-page.ts`; tab là **lớp áo của `<select id="proj">`** (select vẫn là nguồn sự thật ⇒ **không sửa handler cũ nào**); CSS bật/tắt vùng theo `body[data-tab]` (**không dời DOM**); theme **Dark/Light** + tab đang mở nhớ qua `localStorage`; chỗ trống `#graphSoon` cho Graph.
  - **BẪY ĐÃ GẶP + CÁCH TRÁNH:** viết `onclick` inline trong chuỗi sinh HTML làm **hỏng cú pháp JS nhúng** (nháy bị nhân đôi qua template literal) — đã chuyển sang `data-act`/`data-root` + **1 listener uỷ quyền**. **LUẬT: sau mỗi lần sửa `ui-page.ts` phải trích khối `<script>` ra file rồi `node --check`** — `npm run build` KHÔNG bắt được lỗi này.
  - **ĐÃ XONG 2026-07-20 (chờ user nghiệm thu bằng mắt, CHƯA ghi `06_CHANGES`):**
    1. ~~**UI LAG vì quá nhiều project rác**~~ — **GỐC RỄ tìm ra: `rememberProject()` không phân biệt chạy thật với chạy test**, nên mỗi `npm test` bơm thêm scaffold vào registry THẬT (`~/.zemory/projects.json` phình **331 entry**; 18 còn sống = 6 project thật + 11 scratch + 1 bản trùng do `D:` vs `d:`). Vá: `registry.ts` schema v2 (`{root,pinned,lastSeen}`, đọc ngược bản `string[]`) · **chặn scratch root** (dưới `os.tmpdir()`, giải 8.3 short-name; escape hatch `ZEMORY_REGISTRY_ALLOW_TMP=1`) · **fold hoa/thường trên win32** (hết 2 tab 1 project) · `pinProject`/`forgetProject`/`pruneDeadProjects` · seam `ZEMORY_REGISTRY_FILE` để test không đụng file thật. UI: thanh tab hiện **pin + 5 gần đây**, còn lại vào **menu `…`/`☰`** (mỗi dòng có 📌 ghim + ✕ gỡ + nút "Dọn dự án đã mất"). **Đã prune registry thật: 331 → 6 project** (bản cũ giữ ở `projects.json.bak-*`).
    2. ~~**Tách "CHUẨN DÙNG CHUNG" khỏi tab project**~~ — khối `docs_template/` (AGENTS + 01→06) dời khỏi `renderStatus()` sang **panel riêng `#standard` trong inspector = tab Global Memory**; tab project giờ CHỈ còn harness của chính nó.
    3. ~~**Light theme chỉ đổi nền**~~ **XONG 2026-07-20 (chờ user duyệt mắt):** audit đa-agent tìm **92 điểm màu hardcode** (khối light cũ chỉ khai lại 12 token; `--amber/red/blue/shadow` giữ giá trị tối; `--green2/--green-dim` chưa hề định nghĩa). Vá = **TOKEN HOÁ TOÀN BỘ**: `:root` bổ sung token thiếu (`--green2/--green-dim/--on-green/--amber2/--on-amber/--red2/--wash-1..3/--grid-line/--scrim/--inset/--bg-grad/--text-strong`), light khai lại **đủ bộ** (AA), thay **102+24 literal** → token (script map tường minh, không sed mù), gồm modal (`#101713`), input/commandbar/set-side near-black, gradient panel tối, SVG logo (stop/stroke theo token), 3 chuỗi màu JS. **Còn lại 0 literal** ngoài 2 token def `--shadow`. Test khoá `ui-page.test.mjs`: "mọi màu là token" + "token màu khai đủ 2 theme".
    4. ~~**Cài đặt rải nhiều nơi**~~ **XONG (#4):** gỡ 4 lối vào thừa (commandbar `.set-open`, project-panel ⚙, click 2 pill) — chỉ còn **⚙ ở tab bar, PIN cố định phải** (tách `.tab-strip` cuộn khỏi `.tab-actions` cố định → ⚙ không trôi khi nhiều tab). 2 pill 🗄/☁ giữ làm status, bỏ click. Pane `health` trong Settings gỡ (checks dời sang tab project).
    5. ~~**Tab project chưa tách Graph**~~ **XONG (#6):** panel project tách **2 sub-tab** `Harness | Graph` (CSS `body[data-ptab]`, không dời DOM); Harness = harness rows + **Kiểm tra chi tiết** (dời từ Settings); Graph = cây folder + canvas.
    6. ~~**Danh sách Kiểm tra cũ/trùng**~~ **XONG (#2):** gộp `search`+`memory` (trùng code) → 1 mục; `grill` check THẬT (đọc 04_SKILLS §grill) thay vì luôn ok; `validate` hết luôn-xanh (state theo `rep.ok` → on/warn/off) + help text bỏ "docs đã render" (pipeline đã gỡ); memory check assert bảng FTS tồn tại.
    7. ~~**Delay đổi ngôn ngữ**~~ **XONG (#1):** gốc = `/set-lang` `invalidateDashboard()` (regression tôi tự thêm) xoá cả heavyCache 5' + `memoryTick(true)` ép quét lại toàn DB mỗi cú bấm. Vá: bỏ invalidate (payload memory KHÔNG có chuỗi server-dịch), `setLangUI` chỉ refetch `/status`+`/check` (2 thứ có `tr()`) song song, KHÔNG đụng memory; TTL cache 15s→60s (>chu kỳ poll 30s); Hybrid/Rerank cập nhật cục bộ; scope-lane dùng `invalidateDashboardSoft` (giữ heavyCache).
    8. ~~**Mọi dialog đóng bằng ESC**~~ **XONG (#5):** 1 global keydown đóng overlay trên cùng (tabMenu/doc/session/sync/settings), TRỪ sync đang chạy (`__syncing`); ghi thành **luật chung** `03_STRUCTURE §5` (repo + template generic).
    9. ~~**Light theme còn "dính xanh/vàng"**~~ **XONG 2026-07-20 (2 vòng):** ① sửa bug tự-tham-chiếu `--scrim:var(--scrim)`/`--inset:var(--inset)` (tokenizer thay nhầm chính token def → backdrop/inset vô hiệu) + 4 vầng sáng radial GÓC màu xanh → token `--glow` (xanh ở dark, **trong suốt ở light**) + 1 inline `color:#dce7df` sót. ② **User chốt: light mode = TRẮNG ĐEN (monochrome)** — *"như dark mode nhưng đảo màu, không phải light màu linh tinh"* → viết lại TOÀN BỘ token light thành xám (accent xanh → gần đen; warn/error → xám đậm; 0 token có màu, verify script). Logo theo accent (dark=ô xanh, light=ô đen). **Dark giữ nguyên xanh brand.** Test khoá "mọi màu là token" + "token khai đủ 2 theme".
    10. ~~**Chữ "cockpit" khắp nơi**~~ **XONG (user ghét chữ này):** window title `Zemory Cockpit`→`zemory`; gỡ "cockpit" khỏi mọi comment/string user thấy (0 trong bản build). Giữ path vật lý `~/.zemory/cockpit/browser` (đổi = mất login ChatGPT đã lưu).
    11. ~~**Logo/brand nằm trong rail = tưởng của project**~~ **XONG:** dời brand (logo + "zemory") lên **góc trái tab bar cố định** (main, hiện mọi tab); gỡ khỏi rail. Ô "Thêm dự án bằng đường dẫn" trong panel = thừa (trùng [＋] tab bar) → gỡ; [＋] giờ hỏi path qua prompt.
    12. ~~**"Nút track còn xanh" ở light**~~ **XONG 2026-07-20 — BUG DO SCRIPT TOKENIZE CỦA TÔI:** script thay literal→token đã thay NHẦM chính giá trị trong token def (`--green2:#b5efc8` → `--green2:var(--green2)` tự tham chiếu → **vô hiệu ở CẢ dark**, kể cả `--text`!) + để lại `))` thừa (`var(--green-dim, #2f6b48)` → `var(--green-dim))`) làm khai báo `.sw.on` hỏng. Test token-completeness KHÔNG bắt (chỉ check tên token tồn tại, không check value hợp lệ). Vá: phục hồi 13 token def dark về hex thật + gỡ 12 `))` (cẩn thận: `))` cũng khớp nhầm `calc(…var(--tabh))`/`minmax(…var(--recall-left))` → sửa lại 2 chỗ đó) + **checkbox filter thêm `accent-color:var(--green)`** (trước dùng xanh mặc định trình duyệt). Test mới khoá: "không token tự tham chiếu" + "ngoặc calc/minmax cân bằng".
    13. **[ ] CÒN LẠI — chờ user duyệt mắt (light monochrome + 2 sub-tab); #7 GRAPH ĐỘNG chưa làm.**
    4. ~~**LAG khi đổi tab — LỖI THIẾT KẾ UI, không phải DB**~~ (user chỉ đúng chỗ 2026-07-20 sau khi tôi chẩn sai lần đầu). Đo: mỗi cú bấm tab chạy `runChecks()` = `sleep(200)` + `tick()` + **4 lần `/check` TUẦN TỰ, mỗi lần kèm `sleep(120)`** ⇒ **~1.17–1.6s/lần bấm**, kèm `renderChecks()` viết lại DOM giữa mỗi bước. Vá: **đổi tab = lật CSS + vẽ từ cache per-project** (`projCache`, TTL 60s ⇒ bấm lại tab đã xem = **0 request**) · lần đầu vào project chạy **song song, bỏ sạch sleep** (~275ms, không chặn UI) · `memoryTick()` KHÔNG còn chạy khi đổi tab project (panel bộ nhớ thuộc Global Memory) · nút "Kiểm tra lại"/sau `sync` mới ép chạy thật (`runChecks(true)`).
    5. ~~**LAG THẬT SỰ = VÒNG LẶP RENDER VÔ HẠN** (tìm ra 2026-07-20 sau khi user bác 2 chẩn đoán sai của tôi: "ko liên quan gì db hết")~~ — `renderStatus()` → `renderTabs()` → `applyLang()` → `renderStatus()` → … **đệ quy tới khi TRÀN NGĂN XẾP**, và `try{}catch{}` **nuốt sạch `RangeError`** nên nó hiện ra như "chậm" chứ không phải lỗi. Đo mô phỏng đúng đồ thị gọi: **1 lần render = 6.397 lần vẽ lại DOM + 9.594 lượt `querySelectorAll` toàn trang**. Bắn ở MỌI `tick()` (10s), MỌI cú bấm tab, MỌI `pick()`. Sinh ra từ commit `977e6f9` (khung tab) — `renderTabs` gọi `applyLang` để dịch nhãn, khép vòng với `applyLang→renderStatus` vốn có. **Vá:** `renderTabs` dịch thẳng bằng `t()`, KHÔNG gọi `applyLang`; thêm guard tái nhập `applyLangBusy`. **Bài học ghi vào changelog: `npm run build` KHÔNG thấy được lỗi trong chuỗi HTML — phải có test chạy trên PAGE đã sinh.**
    10. **[ ] (nợ kỹ thuật, ratchet đã cắm)** còn **8 chỗ `onclick` inline** trong markup sinh bằng JS (có từ trước) — test `ui-page.test.mjs` chốt **không cho tăng**; dọn dần sang `data-act` + listener uỷ quyền.
- [x] **ĐÃ ĐÓNG 2026-07-28 — làm xong 07-20/21; phần hoãn (Phase D · MCP mirror) theo dõi ở mục Graph riêng.** Giữ làm lịch sử: **ĐÃ LÀM THẬT (2026-07-20):**
  - **Cây folder** `structure-tree.ts` (`/folder-tree`): từ điển ~60 slot từ `03_STRUCTURE §3/§4` + walker cây thật + đánh dấu slot đã dùng / lạ chuẩn (0 LLM). Check conformance cấu trúc (zemory: 18 slot, 0 lạ).
  - **Graph code** `backend/src/graph.ts` (`/code-graph`): import-graph TĨNH ĐỊNH, **TS/JS + Python**. JS: `import…from`/`require` + resolve `./x.js`→`x.ts`+`/index.*`. Python: `from a.b import c`/`import a.b` + resolve dotted qua suffix-match (chịu được package-root khác nhau) + relative `.`/`..`. Symbol: function/class/const export (JS) · def/class (Py), regex nhẹ KHÔNG cần AST lib. + fan-in/out + orphan. Declared edges (plan 13 §4). **Đo thật: zemory 81 file/175 import/db.ts fan-in 19 · SasinFlow (Python) 22 file/40 import/config.py fan-in 7/app.py 40 symbol.**
  - **UI sub-tab Graph:** force-layout SVG thuần (PRNG mulberry seed cố định → layout ổn định, 0 lib) · node to theo fan-in · màu theo slot (dark có màu, light xám) · **ĐỒNG BỘ 2 chiều:** bấm node → sáng import + **sáng folder trong cây** (`.trow.active`) + hiện symbol/loc/fan; bấm folder trong cây → lọc node thuộc folder đó. Toggle "chỉ orphan" · nút Dựng lại. Test `graph.test.mjs` **6/6** (edge/fan/orphan/slot/**python**/fail-open).
  - **Panel "Dự án" GỠ HẲN** (user 2026-07-20: "bỏ nguyên panel, vào 2 tab liền"): bỏ header + mô tả + select; vào thẳng 2 sub-tab; nút "Chạy" dời lên hàng sub-tab (phải). `#proj` giữ ẩn làm nguồn sự thật cho tab.
  - **CÒN LẠI (tách phiên, cần chốt plan 13 §8):** ① cạnh **SUY LUẬN** (`semantic_neighbor` từ vector) — overlay phase 2 · ② docs-graph (references/supersede/touches) · ③ `zemory graph export --json` (contract cho app ngoài) + MCP `graph_neighbors`/`graph_impact` · ④ mở thêm ngôn ngữ khác (Go/Rust…) nếu cần. Nợ nhỏ: `SLOT_ROLES` là bản sao từ điển `03_STRUCTURE` (không auto-sync, cùng kiểu `validate.ts`).
- [x] ~~**Graph hấp thụ CALM — Phase A/B/C**~~ **XONG 2026-07-21** — xem `06_CHANGES`. `graph impact` (blast-radius + touches) · `graph callers` (symbol, confidence) · `graph fitness [--gate]` · `graph export --json` · tree-sitter AST · cạnh `touches` graph↔memory. **Phase D (tsserver/pyright) CỐ Ý HOÃN** — gate = decision rule: đếm câu "sửa X đụng ai" mà file-level + name-match trả lời TRƯỢT trong 2–4 tuần dùng thật; đủ vài ca mới mở D.
- [x] ~~Option "MỨC ĐỘ sync" L1/L2~~ **XONG 2026-07-20:** selector **Gọn/Đầy đủ** trong tab Nạp & Đồng bộ (`syncLevel` config + `/set-sync-level` + `memory sync --full`), test khoá. Chi tiết chờ ghi `06_CHANGES`.
- [x] ~~**Bước B — tự động hoá**~~ **XONG 2026-07-20:** `autostart.ts` ("Mở cùng PC" per-OS: Win Startup .cmd/mac launchd/Linux xdg, reconcile lúc daemon bind) + `jobs/scheduler.ts` (idle embed backlog + "Tự sync memory" §3b qua syncDrive, opt-in) + pane ⚙ **⚡ Tự động** 3 công tắc + endpoints. Mặc định scheduler ON, autostart/autosync OFF. Test `autostart.test.mjs`. Chi tiết `plan 14 §6.B`.
- [x] ~~**Bước C — write gate**~~ **XONG 2026-07-20:** `jobs/writegate.ts` cờ hold auto-hết-hạn; scheduler nhường khi CLI ghi; CLI heavy-write probe daemon → gate-acquire/release, fallback chạy thẳng. Trị gốc "database is locked". Test `writegate.test.mjs`. Chi tiết `plan 14 §6.C`.
- [x] ~~**Bước E — đóng gói + TRAY ICON**~~ **XONG 2026-07-21.** Lối tắt Desktop + tray icon thật: `backend/src/tray.ts` (systray2 MIT, prebuilt Go helper — KHÔNG node-gyp, rà license HP điều 2; load qua `createRequire().default` vì CJS; fail-open qua `ready().then/catch` — helper hỏng KHÔNG giết daemon; single-icon vì child-of-daemon). Verify: `tray_windows_release.exe` chạy, menu Open/Quit. Icon KHAY OK. **LƯU Ý:** icon **CỬA SỔ** (`--app` trên màn extend) vẫn ra Edge — bug RIÊNG, còn mở ở §🔥.
- [x] ~~**Delta export (plan 08) — tiền đề auto-sync**~~ **HOÀN TẤT 2026-07-19** — xem `06_CHANGES`. Bundle mặc định `payload=rows` (chỉ sessions/messages/known_stores — đúng 3 bảng merge thật sự đọc); `--delta` + watermark `sync_state` (schema v13); `--full` giữ cho disaster-restore. **Đo thật: 709.1MB → lean 184.6MB (−74%) → delta 1.8MB.** Round-trip khớp tuyệt đối + FTS dựng lại đúng; `npm run check` 87/87.
  - Còn lại (gộp vào plan 14): `syncDrive` chưa dùng delta (file 1/máy phải tự-đủ) → delta tích luỹ + compact làm cùng daemon auto-sync.
- [x] ~~**App hoá zemory — daemon + tự động hoá + UI đa-project**~~ **XONG 07-19→21** (`plan/14`): A daemon cổng 4444 · B autostart+scheduler · C write-gate · D UI+graph · E tray+lối tắt. **Còn duy nhất F** (profile headless/Docker) — chưa có nhu cầu thật, không mở tới khi cần.
- [x] ~~**Graph — engine đồ thị cho mọi repo theo chuẩn**~~ **XONG 07-20/21** (`plan/13`): Phase A→C + docs-graph + overlay `semantic_neighbor` + `graph export` v2 + cache + `--all`; **điều 13 đã vào hiến pháp**. Phần còn hoãn (Phase D · MCP mirror) đã theo dõi riêng ở mục Graph bên dưới.
- [x] ~~**(CHỐT 2026-07-18) Thêm slot `04_SKILLS.md` — tách playbook khỏi rules/structure.**~~ **HOÀN TẤT 2026-07-18** — xem `06_CHANGES`. Thêm `04_SKILLS.md` (grill · chốt phiên · reconcile) + renumber `04_TODO→05_TODO`/`05_CHANGES→06_CHANGES` (repo+template), RULES/STRUCTURE giữ NORM+trigger→dẫn chiếu, `LEGACY_RENAME` phủ gen-1→3, code (adopt/migrate/status/ui/cli/archive/validate/checks/changelog) + test (+gen-3). Verify: `npm run check` 83/83 · `init` ra đúng 6 file · `doctor`/`validate` xanh.
  - (Tuỳ chọn về sau, CHƯA làm) ship bản gọi-được sang `.claude/skills/<name>/SKILL.md` — 1 nguồn, 2 dạng (đọc vs invoke).
- [x] ~~CHỜ USER DUYỆT: giảm ~50% DB~~ **HOÀN TẤT 2026-07-14** — xem `docs/plan/12_vector_rebuild_256.md`, changelog #1010. Kết quả thật: 1141.4MB→595.1MB (−546.3MB, ~48%), 94.384 vector, gate 82/82 + bench 100%/100%.
- [x] ~~Chuẩn RULES chưa có, template RULES stale~~ **HOÀN TẤT 2026-07-14 (commit `cf28037`)** — thêm tầng `01_CONSTITUTION.md` (hiến pháp per-app, ý tưởng Spec Kit; user chốt "đôn lên, không dùng 00") + renumber `01_CONSTITUTION·02_RULES·03_STRUCTURE·04_TODO·05_CHANGES`; vá template stale (refs gen-1); RULES zemory về generic (5 bất biến dời sang hiến pháp, bổ sung 4 mục thiếu); hiến pháp zemory gom 12 điều từ luật rải trong plan 00/02/04–08/10–12; `LEGACY_RENAME` phủ 2 thế hệ tên; UI chip list đủ 5 file. Ghi chú gốc: Kiểm chứng: ① **Template `docs-template/agent/01_RULES.md` STALE** — vẫn trỏ `02_TODO.md`/`03_CHANGES.md`/`04_STRUCTURE.md` (tên trước đợt renumber 2026-07-09; tên thật giờ là `03_TODO`/`04_CHANGES`/`02_STRUCTURE`). `adopt.ts` copy template verbatim ⇒ **mọi project `zemory init` từ 07-09 tới nay đều nhận RULES trỏ file không tồn tại**. (`docs-template/agent/03_TODO.md:4` cũng còn trỏ `03_CHANGES.md`.) ② **KHÔNG có profile app/non-app cho RULES** — khác `02_STRUCTURE` (đã tách §1–6 APP vs §7 NON-APP). `adopt.ts` không hề branch theo `profile`, nên project BI/data (`init --non-app`) vẫn bị nhét luật "Thiết kế UI — dialog 3 size S/M/L" vô nghĩa với nó. ③ **RULES riêng của zemory đã DRIFT khỏi template**: zemory có 5 "Bất biến KIẾN TRÚC" riêng (token-first · `backend/src` vs `external/` · 1 nguồn sự thật · 1 capability=1 slot=1 provider · tách tool khỏi data) nhưng nhét thẳng lên đầu, KHÔNG dùng ô `<!-- Luật riêng của <PROJECT> -->` mà template chừa sẵn ở cuối; đồng thời **thiếu 4 mục template có**: "Thiết kế UI (dialog 3 size)" (mỉa mai: chính zemory đã implement luật này — changelog #317), "Đồng bộ bắt buộc rules↔todo↔change↔plan", "Plan phải đánh số NN_tên.md", "Tra log sâu qua `memory search`". ⇒ Việc bước sau: chốt kiến trúc chuẩn RULES (generic + profile app/non-app + ô luật-riêng), vá template stale, rồi nắn RULES của zemory về đúng chuẩn đó.
- [x] ~~Bug đồng bộ docs: 8 doc lưu 1 blob heading=NULL~~ **HOÀN TẤT 2026-07-16** — chẩn đoán ban đầu SAI 2 lần (đổ cho "đổi project_root", rồi cho CRLF). Gốc thật: **vòng lặp tự duy trì** — blob (1 section level-0) render ra **trùng khít file**, nên check "nội dung khớp" của FILE WINS bảo "unchanged" ⇒ không bao giờ tách lại. Vá: `docs sync` so **CẢ cấu trúc** (`idx.sections === parseMarkdown(file).length`), không chỉ nội dung. Cả 8 doc tự lành (7–30 section), không cần can thiệp DB thủ công. +1 test khóa.
- [x] Migration v5 + bảng dẫn xuất `session_digest` (1 dòng/phiên) + FTS lane (word/trigram).
- [x] Generator A (extractive, KHÔNG LLM): `tasks[]` (nhiều việc, mỗi việc 1 anchor) · `paths_touched[]` · `decisions[]` · `errors[]` · `outcome` · `meta` (source/host/project/#msg/time) · `source_sig` hash. Dùng vector sẵn có để *chọn* câu đắt (không sinh văn bản), fail-open về heuristic.
- [x] Regen theo nhịp `memory scan`/ingest cho phiên có tin mới (guard hash — không cần biết phiên kết thúc) + `zemory memory digest --all` backfill phiên cũ.
- [x] Recall R3: lane digest cấp phiên trong `memory search` + lệnh `memory digest <session>`; progressive disclosure digest → anchor → messages.
- [x] Test: backfill, regen idempotent, anchor mở đúng tin, KHÔNG lộn phiên (scope theo `session_id`), fail-open.
- [x] ~~TÁCH 2 template APP/NON-APP + non-app hệ file~~ **XONG 2026-07-23** (user giao). `docs_template/{app,nonapp}/` — 2 cây riêng + parity gate (5 shell identical), `02/03/04` khác thật (nonapp 0-UI · tasks/templates/data-tiers · pull/fill/upload playbook). `AGENTS.md` bắt agent HỎI app/non-app + giải thích 2 khái niệm. Code `adopt/harness/ui` profile-aware (mặc định app). Gate 172/172. Chi tiết `06_CHANGES [2026-07-23]`.
- [x] ~~`03_STRUCTURE` của zemory còn §7 (dư)~~ **XONG 2026-07-23 (user duyệt "đồng bộ chuẩn mới lên chính zemory"):** 03 của zemory → app-only (intro "hệ APP" + §6 trỏ non-app + §7 body→stub); `AGENTS.md` root thêm đoạn hỏi app/non-app. reindex + validate + structure-sync xanh.
- [x] ~~**Badge App/Non-app + panel Chuẩn chung theo profile**~~ **ĐÃ XONG TỪ 2026-07-25** (`projectProfile()` đọc `.harness.json` thật, `#projProf` render APP/NON-APP, màn Harness có 2 sub-tab `docs`|`struct` + viewer `.md`). **Sót lại một chỗ đoán bừa, gỡ 2026-07-28:** hàng "Phiên gần đây" vẫn suy App/Non-app bằng regex `/PBI|powerbi/` — đúng cái badge-đoán đã bị gỡ khỏi card project. Payload `/recent-sessions` không mang `profile` ⇒ bỏ hẳn nhãn, vì nhãn ĐOÁN tệ hơn không có nhãn.
- [x] ~~REDO LAYOUT Global Memory~~ **KHÔNG PHẢI VIỆC — TODO cũ viết LỘN thuật ngữ, đã đóng (user chốt 2026-07-22).** Nhầm ở chỗ tách "harness" vs "Chuẩn chung" thành 2 thứ: thực ra **"Chuẩn chung" (`docs_template/`) CHÍNH LÀ cái user gọi "harness" trong câu "recall+harness chung"** — KHÔNG phải harness per-project. Layout user muốn **ĐÃ CÓ SẴN trong build** (user tự sửa trước đó): tab Global Memory chia 2 sub-tab (`data-gtab`, nhớ qua localStorage) — **① "Recall & Chuẩn chung"** = `#recall` + `#standard` · **② "Bộ nhớ & Đồng bộ"** = `#memory` (stats) + `#capture` (Nạp&Đồng bộ) + `#coverage` (Dự án). Wired đủ: `frontend/styles/04-tabs.css` (`body[data-gtab]`), `frontend/scripts/04-tabs.js` (`setGlobalSubTab`), i18n 2 dict (`gsub.recall`/`gsub.mem`). **KHÔNG nắn gì thêm.** *(Ghi chú migration: UI đã tách `ui-page.ts` embed → `frontend/` no-build multi-file — mọi tham chiếu file cũ `ui-page.ts`/`gm-scroll`/`setTab('standard')` trong các item TODO/CHANGES cũ đọc theo bản mới.)*
- [x] ~~BUG ICON Edge~~ **XONG 2026-07-22 (user xác nhận taskbar ra Z).** Gốc: cửa sổ Edge `--app` KHÔNG cho đổi icon taskbar (bám AUMID Edge). Giải = **NATIVE WINDOW** (`@nativewindow/webview` MIT + helper `backend/src/platform/window.ts`; `ui.ts` native-first → fallback msedge) + **koffi** set `SetCurrentProcessExplicitAppUserModelID` + icon RGBA (`ensureAlpha`) + `WEBVIEW2_USER_DATA_FOLDER`. Chi tiết `06_CHANGES` [2026-07-22] §D.
- [x] ~~registry pin/gỡ/dọn project~~ **XONG 2026-07-22** (user duyệt bố trí: nút vào **list "Dự án"**). Mỗi hàng project *đã liên kết* (máy này) có 📌 ghim/bỏ-ghim + ✕ gỡ (hover hiện; pinned sáng sẵn) + "Dọn dự án đã mất" cuối nhóm máy; nút NGOÀI `.cov-open` nên không đụng thao-tác-mở-tab. Wire endpoint sẵn có `/pin-project`·`/forget-project`·`/prune-projects`. Menu ☰ chết (`#tabMenu`+`data-mact`+`renderTabMenu`/`toggleTabMenu`) đã gỡ (§cruft P3). `07-memory.js` covRow+handler · `04-tabs.css` `.cov-line/.cov-acts`. Test khoá `cockpit.test.mjs`. Chi tiết `06_CHANGES §G`.
- [x] ~~Panel chưa có seam kéo (§5)~~ **XONG 2026-07-22.** **1 engine data-driven** (`seam()` descriptor trong `02-layout.js`, gỡ 2 engine cũ `initResizers`/`initPanelSplits` + code chết bottom/panel-split) + **2 seam mới**: inspector "Bộ nhớ&Đồng bộ" (`--gm-cov-w`) + graph 2×2 **chữ thập** (`--graph-col-w`+`--graph-row-h`, kéo 2D). Khai `:root` 3 var. Test khoá `cockpit.test.mjs`. Chi tiết `06_CHANGES` [2026-07-22] §C.
- [x] ~~**Chuẩn chung → cây/list trái + viewer .md phải**~~ **ĐÃ XONG 2026-07-25** trong màn Harness của `plan/15` (2 khung thật `/harness-files` + `/doc`, seam kéo được, toggle App/Non-app trong panel trái) — đúng yêu cầu 07-22, chỉ là làm ở bản UI mới chứ không phải trên cockpit cũ.
  - **Bố cục:** list/cây harness bên **TRÁI** (giống cây folder tab Graph) + **viewer .md bên PHẢI** — bấm 1 file → render nội dung `.md` **ĐẦY ĐỦ, read-only, cuộn** bên phải (thay doc modal `openStandardDoc` hiện tại).
  - **App/Non-app:** toggle **BÊN TRONG panel trái** (2 nút nhỏ ngay đầu list) — **TUYỆT ĐỐI KHÔNG thêm 1 dòng/row mới ở trên** (user: *"ko tạo thêm 1 dòng nữa để bị bể UI"*).
  - **Vị trí:** để trong **menu/list gốc bên TRÁI** — **KHÔNG** tạo tab riêng trên tab bar (user: *"đưa lên trên chỗ đâu đưa má"* — hết chỗ). Tức đổi `#standard` từ **list phẳng + modal** (`renderStandard` `STD` array + `openStandardDoc`, `06-project.js:87`) → **2-pane trái-list/phải-viewer** NGAY TRONG chỗ nó đang ở (Global Memory sub-tab ①), không dời tab.
  - **Project tab:** hiện badge **`App` / `Non-app`** cạnh tên project (đọc `.harness.json` `config.profile`, mặc định `app`).
  - **Backend ĐÃ SẴN (chủ yếu là frontend):** `/standard-doc?file=X&profile=app|non-app` (`ui.ts:705`, `readStandardDoc(rel, profile)` đọc `templateDir(profile)`); `docs_template/app/` + `nonapp/` đủ 2 bộ. `STD` array thiếu `plan/00_overview.md` → thêm. Tái dùng pattern cây `/folder-tree` + seam resize (§5) cho panel trái.
  - Ràng buộc: user nhấn mạnh **KHÔNG bể UI** (nói 2 lần) → trình nháp bố trí duyệt trước khi code.
  - **⚠ PHỐI HỢP đa-session:** repo có `docs/plan/15_ui_refactor.md` + `frontend/pages/app.html` (session khác) = **refactor UI LỚN "AI Memory OS"** (rebrand GOLD `#FFD166` · nav rail dọc 10 màn thay tab bar · logo mới `ChatGPT Image …11_24_04` · có màn **Harness** app/non-app · user chốt 2026-07-23). **Yêu cầu Chuẩn chung này CHÍNH là màn Harness của plan/15** → làm TRONG bản mới đó, **KHÔNG trên cockpit cũ**. Màu xanh/tím + logo `05_36_14` + brand tôi làm phiên 07-22 **BỊ plan/15 SUPERSEDE** (chỉ cơ chế **native window** `platform/window.ts` là host tái dùng được cho bản mới).
- [x] ~~**LƯU `thinking`**~~ — **ĐÃ THỬ, KHÔNG LÀM ĐƯỢC (2026-07-26).** Claude Code ghi khối thinking ra đĩa dưới dạng **`{"type":"thinking","thinking":"","signature":"ErsM…"}`** — **18.743 khối, trường `thinking` RỖNG hết** (tổng 2.224 ký tự / 20.486 khối), chỉ còn `signature` là chữ ký mã hoá không giải ra text. Đã dò hết các kho khác của host: `~/.claude/sessions` (14 KB) · `cache` (453 KB) · `backups` · `plans` · `ide` — đều là metadata, **không nơi nào có nội dung thinking**. ⇒ Không phải zemory bỏ; **dữ liệu không tồn tại trên đĩa**. Muốn có thì phải bắt ở tầng runtime (hook lúc chạy) — đụng điều 6/10, chưa có đường sạch. **Đừng thử lại trừ khi Claude Code đổi format.**
- [x] ~~**Lớp `messages` bị cắt cụt**~~ — **XONG 2026-07-26 (PARSER_VERSION 3→4).** Gỡ `clip()` (cap 4.000 ký tự) khỏi **cả 5 adapter**; `_shared.ts` giữ lại khối comment giải thích. Lý do: `plan/06 §6` khai `messages` là lớp **ĐẦY**, digest mới là lớp lọc — mà clip cắt MÙ vào lớp đầy (không xét trùng/rác/secret, chỉ xét độ dài). Đo trước khi gỡ: **95,25%** block < 4k, chỉ **4,75%** bị cắt, block lớn nhất **1,30 MB** ⇒ bỏ cap an toàn. **4 tầng lọc CÓ LÝ DO giữ nguyên** (dedup `UNIQUE(session_id,uuid)` · `redact()` · bỏ dòng rỗng/JSON hỏng · bỏ thinking) — có test ratchet khoá.
- [x] ~~**FILE người dùng kéo vào chat**~~ — **XONG 2026-07-26.** `claude.ts` nhận `attachment.type="file"` (record cấp DÒNG, không nằm trong `message.content` nên `flatten()` không bao giờ thấy) → message `[file:<tên>]\n<nội dung>`, `tool_name='attachment'`, có `uuid` để dedup. Viewer fold lại như khối code. **Kết quả thật: 51 file · 207.932 ký tự.** CỐ Ý KHÔNG nạp: `edited_text_file` (chỉ snippet của file đã có trong repo) · các `attachment` nội bộ (`todo_reminder` 3.838 · `queued_command` 520 · `deferred_tools_delta`…) · **`~/.claude/file-history/` (5.009 file · 211 MB snapshot code trong repo ⇒ kho thứ hai, trái điều 3, phình DB +35,7%)**.
- [x] **HỆ QUẢ re-ingest v4 — ĐÃ XỬ** (đo 2026-07-27: vector chờ = **0**, phủ **100%**). Mục cũ: **⚠ CẦN XỬ:** ① **44.390 vector chờ embed** (nội dung đổi ⇒ `vec_hash` khác ⇒ phải nhúng lại); trước đó backlog = 0. Chạy `zemory memory embed` (nhiều giờ) mới phủ lại lane semantic; trong lúc đó recall vẫn chạy bằng FTS (fail-open, điều 9). ② **DB 1,07 GB → 1,29 GB (+231 MB, +21%)** — phần lớn là FTS trigram index trên các tool-dump dài. ③ **CHỈ 105/350 phiên được sửa** (`ingest_state`: v4=105 · v2=245): phiên nào transcript không còn trên máy này thì giữ nguyên bản cắt — message còn dấu `…` giảm **7.004 → 4.709**, phần dư thuộc phiên máy khác + 859 phiên web-chat. **Bài học quy trình: tôi chạy re-ingest mà KHÔNG cảnh báo trước về backlog vector và mức phình — lần sau phải nêu cái giá TRƯỚC khi bấm.** *(Backup đã tạo trước khi chạy: `data/backups/global_memory-2026-07-26T12-48-21-379Z.db`)*
- [x] **Cụm 07-22 — ĐÃ PUSH** (main ngang origin/main, 155 commit). Mục cũ: — 2 commit đầu (`0992490` privacy · `3849168` harness) **ĐÃ push**. **CHƯA commit** (chờ user duyệt mắt xong): ① resize (`02-layout.js`·`04-tabs.css`·`cockpit.html`·`01-tokens-base.css`·`cockpit.test.mjs`) · ② logo/màu (`make-icons.mjs`·`ui.ts`·`tray.ts`·`autostart.ts`·`window.ts`·frontend head/brand/theme·`manifest.webmanifest`·assets+packaging icons) · ③ native dep (`package.json` +`@nativewindow/webview`+`koffi` optional) · ④ sync-audit (`structure-tree.ts`·`structure-sync.test.mjs`·`01_CONSTITUTION`·`06_CHANGES`·`05_TODO`) · ⑤ **tầng 1** (pin/gỡ `07-memory.js`·`04-tabs.js`·`05-graph.js`·`06-project.js`·`11-boot.js`·`10-i18n.js`·`04-tabs.css` · hộp đen `logging/daemon-log.ts`+`ui.ts` · cruft `autostart.ts`·`graph.ts`·`settings.ts`·`.gitattributes`·`plan/14` · test `cockpit.test.mjs`·`graph.test.mjs`) · ⑥ README viết lại. → commit gọn theo nhóm + **xin phép push** (§Git). **⚠ Build/gate: kill daemon + native-window helper trước** (cùng khoá `dist`).
- [x] **`graph` + `adapters` — ĐÃ CHỐT là slot chính thức 2026-07-26** (có trong `SLOT_ROLES` + khai ở `03_STRUCTURE`). Mục cũ: **** `zemory conform` (mới) bắt được **`backend/src/memory/graph/`** ở CHÍNH zemory **và `backend/src/integrations/graph/` ở SasinHarvest** — hai repo cùng đẻ tên `graph` mà `SLOT_ROLES`/`03_STRUCTURE` không khai. Chuẩn 03 §4 có dòng *"engine graph → LỒNG trong domain, KHÔNG slot thứ 5"* nhưng **không đặt TÊN** cho folder đó, mà 03 §2 lại buộc *"bên trong một domain chỉ dùng slot từ CÙNG từ điển"* ⇒ mâu thuẫn nhỏ trong chính chuẩn. Chọn: (a) thêm `graph` (và `adapters`) vào `03 §3/§4` + `SLOT_ROLES` làm slot chính thức · (b) coi là domain-internal + cho vào allowlist của `structure-sync` và `conform`. **Đề xuất của agent: (a)** — vì đã 2 repo độc lập cùng dùng tên này, tức là concern thật chứ không phải ngẫu nhiên. Audit index↔structure↔graph bắt: `adapters` (`backend/src/memory/adapters/` per-host ingest) có trong graph `SLOT_ROLES` nhưng `03_STRUCTURE` không khai ⇒ graph tự đẻ tên. Chọn: (a) thêm `adapters` vào 03 §3/§4 làm slot chính thức, hay (b) coi là folder domain-internal + cho vào allowlist của test parity. (P1 `platform` đã fix + có `structure-sync.test.mjs` chống drift.)
- [x] ~~Dọn cruft P3~~ **XONG PHẦN LỚN 2026-07-22:** gỡ tabMenu chết (`#tabMenu`+`.tabmenu-*`+`renderTabMenu`/`toggleTabMenu`+`data-mact`+escLayers) · `setInspectorTab`/`.itab` chết + `data-itab` body · 8 key i18n mồ côi ×2 dict (`tab.moreTitle/manageTitle/menuHead/none`+`itab.*`) · comment cite `plan 14 §B`→`§6.B` + gỡ "cockpit" plan14:28 · `sourceSignature` +hash đường dẫn (bắt rename) · autostart quoting (`O'Brien` PS + `.desktop` space) · `.gitattributes` binary ảnh + eol=lf. Routing §4 (graph 197 · OS 198) **đã có sẵn**. `git mv graph*.ts` **đã xong**. **CÒN LẠI (tách):** `CANON_ROOT` gộp case GIỮA-path (`GROUP BY lower(project_root)` — rare, đổi hiển thị, cần chọn representative) · i18n test mù ~30 key động (test hiện chỉ khoá static `data-i18n`/`t('...')`).

- [x] ~~`semantic_neighbor`~~ **XONG** — `graph-semantic.ts`: embed file-head (chunk 16) → cosine top-3 ≥0.6, `kind:"inferred"`, chạy trong `graph export --semantic` (tiến trình CLI = off main thread), fail-open. Chốt: embed **file-level** lúc export, KHÔNG persist.
- [x] ~~docs-graph~~ **XONG** — `graph-docs.ts` + `zemory graph docs`: `references` (link md) + `supersede` (anchor marker `> 🔄 Supersede:` + chỉ nối ngày DUY NHẤT — trước ~33/34 cạnh rác). Vào `graph export` v2.
- [x] ~~Graph cache~~ **XONG** — `graph-cache.ts`: cache in-memory per-root theo `sourceSignature` (count+mtime), wired `/code-graph`+`/nav-cost`. (KHÔNG bảng DB/JSON — plan 14 §7.5 chốt = in-memory.)
- [x] ~~Cross-project `--all`~~ **XONG** — `graph export --all` bundle mọi project registry (schema **v2**).
- [x] ~~Điều hiến pháp graph~~ **XONG** — **điều 13** đã vào `01_CONSTITUTION` (user duyệt 2026-07-21).
- [x] ~~Nợ nhỏ: `SLOT_ROLES` là bản sao không auto-sync~~ **ĐÃ CÓ GATE** — `structure-sync.test.mjs` chốt parity giữa `SLOT_ROLES` và `03_STRUCTURE §3/§4`: thêm/đổi slot mà một bên không theo ⇒ gate ĐỎ (điều 13 "giữ khớp bằng code, không dựa trí nhớ agent"). Vẫn là hai bản chép tay, nhưng KHÔNG còn drift âm thầm.
- [x] ~~3 commit LOCAL chưa push~~ **ĐÃ PUSH** (verified 2026-07-22: `1ef6422`·`76523fb`·`977e6f9`·`d72fb3e` đều trên `origin/main`).
- [x] ~~Semantic là provider riêng hay engine nội bộ?~~ CHỐT 2026-06-25: **engine nội bộ** của search hợp nhất — 1 slot `search`, thêm luồng vector vào RRF (xem plan 05).
- [x] ~~Phân phối LeanCTX: dependency hay binary?~~ MOOT — compression đã bỏ, code ở `attic/`.
- [x] ~~Artifact lưu bao lâu / tối đa GB?~~ CHỐT 2026-06-25: vĩnh viễn, KHÔNG tự xóa; đầy → cảnh báo, cũ → archive gzip (chi tiết changelog).
- [x] ~~sqlite-vec hay brute-force cosine?~~ CHỐT 2026-06-29 theo code/test: dùng `sqlite-vec` trong `global_memory.db`, fail-open về FTS.
- [x] ~~Chiều vector mặc định?~~ CHỐT 2026-06-29: ban đầu 768d đầy đủ. **ĐỔI 2026-07-14 (plan 12): 256d Matryoshka** (cắt + renormalize từ 768d, 0% mất theo bench) — dims lưu trong `vec_config.dims`, stored-dims-authoritative. DB thật đã rebuild xong ở 256d.
- [x] ~~Lịch backfill toàn bộ corpus thật?~~ CHỐT 2026-06-30: chạy thủ công có kiểm soát bằng `zemory memory embed --all`; mốc nghiệm thu đã backfill đủ corpus lịch sử của `global_memory.db`. Message mới sau đó dùng incremental embed.
- [x] ~~Có cần rerank cross-encoder không?~~ CHỐT 2026-06-30: **làm rồi, opt-in** (Giai đoạn E — bge-reranker-base, default OFF, bật qua UI/`ZEMORY_RERANK`/`--rerank`).
- [x] ~~Đồng bộ memory xuyên máy thế nào?~~ CHỐT 2026-07-01: **bundle `.enc` qua Drive folder + `memory import --merge`** (additive), KHÔNG sync DB sống. `memory sync` + Drive link trong UI. Chi tiết changelog + plan 02 §0.
- [x] ~~Có cần asymmetric query/document prompt cho embed model không?~~ CHỐT 2026-07-12/14 (plan 12): **có** — EmbeddingGemma là prompt-trained, query dùng `task: search result | query:`, document dùng `title: none | text:`. Profile lưu `vec_config.profile`.
- [x] ~~Xác minh sync end-to-end desktop ↔ laptop~~ **ĐÃ CHỨNG MINH BẰNG DỮ LIỆU** — DB máy này chứa **251 phiên mang `host=DESKTOP-PFB157K`** (máy kia) bên cạnh 957 phiên của `SS01-IT-10`, và `sync_state` có 2 watermark ⇒ đường export → Drive → `import --merge` đã chạy thật, provenance không lẫn (điều 11).
- [x] Feasibility test (2026-07-02/03): login-once + CDP pull, enumerate 752 hội thoại, format ChatGPT verify.
- [x] **Schema `origin`** (thêm ở v6) + `idx_sessions_origin` + migration backfill `'local'`. (`db.ts`)
- [x] **`memory scan-web --platform chatgpt`** (`backend/src/memory/scanweb.ts`): browser-connector + pace/backoff/resume + dedupe theo id. **859 hội thoại ChatGPT (~30.9k msg)** đã vào memory, **cả Project chats** (gizmo endpoints, gắn `project_root`).
- [x] parseFileMulti + fallback file-export (`~/.zemory/imports/chatgpt/`) — dùng ingest bộ Export lớn.

**Còn lại (chưa làm):**
- [x] Recall + UI: facet **Local / Web** — ĐÃ CÓ (xác minh 2026-07-11): UI filter "Nguồn: Local/Web" (fOrigin) + cây Nguồn scope-tree + CLI `memory search --origin local|web`.

---

## Cắt khỏi 05_TODO.md — 2026-07-29 (phần thuật lại việc ĐÃ XONG)

> Backlog đang giữ 17,5% dung lượng là mục dưới heading tự khai đã xong, cộng một khối 98 dòng
> thuật lại VÒNG 1–11 của đợt UI refactor — tất cả đều đã có entry trong `06_CHANGES`.
> `archiveTodo` không thấy chúng vì chúng KHÔNG viết bằng `- [x]`. Cắt tay, giữ nguyên văn ở đây.

## ✅ Đã xong (chi tiết 06_CHANGES.md)
- Chốt: ngôn ngữ **TypeScript** · `planning→plan` · config vào `docs/.harness.json` · root chỉ `AGENTS.md` thin · bỏ CLAUDE.md.
- `core` (registry/router/hooks/conflict) · `cli` (init/sync/migrate/doctor/ui/archive/grill/structure/setup).
- Adopt an toàn: sync (in-place) · fresh (backup aside) · migrate (analyze + playbook) · merge legacy planning→plan · auto plan-index.
- `archive` (cắt CHANGES) ✓ · `grill` (playbook) ✓.
- UI: app-mode window + project picker + test-runner (bar từng dòng) + Setup popup (Sync/Fresh) + cờ plan/setup.
- structure-in-INDEX · setup runbook (`zemory setup`) · entry `AGENTS.md` thin.

### ✅ Đã xong (chi tiết 06_CHANGES.md)

## ✅ Global Memory nền tảng
## ✅ Thêm (XONG 2026-06-18)
## 🔵 Stabilization v0.1 — chờ nghiệm thu
## 🔬 AUDIT TOÀN DIỆN 2026-07-26 — 12 finding đã VERIFY (user yêu cầu, quét 6 mặt)
> Cách làm: đo bằng script + gọi LIVE endpoint thật, **verify từng finding rồi mới ghi** (5 nghi vấn đã bị loại làm false-positive — xem cuối mục). Gate lúc chốt: `npm run check` **206/206** · `conform` ✓ sạch · `integrity_check` ok.

### 🔬 AUDIT TOÀN DIỆN 2026-07-26 — 12 finding đã VERIFY (user yêu cầu, quét 6 mặt)

> **ĐÃ FIX NGAY TRONG PHIÊN (2026-07-26, user "ok fix đi") — gate `npm run check` 206/206 · `conform` ✓:**
> ① **Rerank → OFF** (khôi phục mặc định thiết kế, `plan/05 §4.E`). Search **23.000 ms → 1.078 ms**. Rerank KHÔNG mất: vẫn bật được qua nút UI · `ZEMORY_RERANK=1` · `--rerank`.
> ② **Coverage 114,6% → 99,3%** — thêm `vectorCoverage()` (`vectors.ts`) đo ĐÚNG KHÁI NIỆM: *message-có-vector / message-embed-được*. Công thức cũ `vectorCount/messages` sai hai đầu: tử số đếm cả CHUNK của message dài (rowid tổng hợp ≥2^40 qua `vec_map`), mẫu số lại gồm cả tool-message vốn ngoài diện embed. Giờ không thể vượt 100%.
> ③ **`pruneOrphanVectors()` gọi cuối mỗi `scan`** (trước chỉ gọi trong `share.ts`) — dọn 504 vector mồ côi do whole-replace; fail-open.
> ④ **Trả lại nút "Dọn dự án đã mất"** (`data-act="pruneproj"` → `/prune-projects`), có dialog xác nhận vì là thao tác gỡ.
> ⑤ **Gỡ `gOrphanN`** chết khỏi `app.js`.
> *(P2/P3 ĐÃ XONG 2026-07-27 — xem mục ngay dưới.)*

### 🔬 AUDIT TOÀN DIỆN 2026-07-26 — 12 finding đã VERIFY (user yêu cầu, quét 6 mặt)

## 📌 COWORK + DỌN RÁC — 2026-07-28 (phiên tối)
> Gate **291/291** · `conform` ✓ · `validate` ✓. Chi tiết: `06_CHANGES [2026-07-28k]`.

### 📌 COWORK + DỌN RÁC — 2026-07-28 (phiên tối)

- [ ] **(ĐỀ XUẤT — chờ user) `zemory archive` tự dọn `.bak` sau khi archive thành công.**
  Hiện archive đẻ `.md.bak` làm lưới lùi rồi để đó vĩnh viễn, mà chỗ đọng lại là `docs/agent/` —
  đúng nơi luật bắt "ĐỌC HẾT", nên nó trông y như rác lọt (chủ repo đã hiểu nhầm đúng một lần).
  Đổi hành vi lệnh nên không tự làm. Phương án: xoá `.bak` khi đã verify archive ghi xong, hoặc dời sang `attic/`.

### 📌 COWORK + DỌN RÁC — 2026-07-28 (phiên tối)

## 📌 BÀN GIAO PHIÊN — chốt 2026-07-28 (phiên chiều)
> Gate **286/286** · `conform` ✓ · `validate` ✓ · DB **947,3 MB** · schema **v19** · parser **v6**.
> Đã commit + push `origin/main` tới `e71de73`. Daemon chạy ở 4444.

### 📌 BÀN GIAO PHIÊN — chốt 2026-07-28 (phiên chiều)

**Bài học đắt nhất phiên này — đọc trước khi làm tiếp**
> Tôi báo sai **6 lần trước khi tự bắt**, và cả 6 chung một gốc: **đo MỘT lần, bằng MỘT cách, rồi coi kết quả đầu là sự thật**. Không cái nào là "quên check". Hai luật đã vào `02_RULES` + cả 2 template để chặn: **① một phép đo chưa kiểm chéo thì chưa phải sự thật** · **② test mới phải chứng minh mình ĐỎ ĐƯỢC**.
> **Đột biến hoá là phép kiểm DUY NHẤT trong phiên chưa bỏ sót lần nào** — nó bắt được 2 test xanh giả, 1 tiêu chí xoá sai (suýt mất 87 ảnh sống), và 1 probe chỉ gọi được bằng curl. Thay đổi nào có test thì chạy nó, đừng chờ ai nhắc.

### 📌 BÀN GIAO PHIÊN — chốt 2026-07-28 (phiên chiều)

**Trạng thái các năng lực chính**
- Bộ nhớ: **176.852 tin · 1.209 phiên · 2 máy · 6 nguồn**; vector 115.268, còn **14.034 chờ nhúng** (giá của re-ingest v6, scheduler tự tiêu hoá — recall vẫn chạy bằng FTS).
- **Đính kèm: 816** — trong đó **125 mang TÊN GỐC** (ảnh do tool `Read` đọc từ đĩa). 0 link chết, 0 mồ côi.
- **Ảnh dùng được đầu-cuối**: xem inline trong Recall (thread + Xem trước) · chip lọc `🖼 Có ảnh` · dialog M 16:9 · tải về có tên (`Content-Disposition`) · **sync xuyên máy qua công tắc `🖼 Kèm ảnh`** (mặc định TẮT).
- Capture: ChatGPT ✓ · claude.ai ✓ · **Gemini là nền web CUỐI còn thiếu**.
- **Recall nhanh lại: 25 s → 0,55 s** sau khi vá mặc định rerank (xem changelog `[2026-07-28h]`).
- Cả **6 adapter** cùng đọc block ảnh qua `_shared.imageAttachment`.

### 📌 BÀN GIAO PHIÊN — chốt 2026-07-28 (phiên chiều)

**Việc kế tiếp, theo thứ tự tôi đề nghị**

### 📌 BÀN GIAO PHIÊN — chốt 2026-07-28 (phiên chiều)

**🔤 BYTE NUL trong file nguồn — mọi phép grep audit trước nay đều MÙ 2 file lớn nhất (tìm ra + vá 2026-07-28)**
- `backend/src/memory/ingest.ts` (1 byte, dòng 400) và `backend/src/ui.ts` (2 byte, dòng 1089 + 1093) chứa ký tự **NUL THẬT** gõ thẳng vào template literal làm ký tự nối khoá (`` `${a}<NUL>${b}` ``). Chạy đúng, `tsc` không kêu — nhưng **ripgrep xếp file có NUL vào loại nhị phân rồi BỎ QUA**. Nghĩa là mọi đợt audit grep `backend/src` (export mồ côi · endpoint chết · i18n · chuỗi hardcode) đều **chưa từng nhìn** 777 dòng `ingest.ts` + toàn bộ `ui.ts`.
- Vá: đổi sang escape ``\u0000`` — giá trị runtime y hệt, `tsc` xanh, grep thấy lại (kiểm chứng: `writeAttachments` trước đó 0 kết quả, sau khi vá ra 3).
- **Báo oan tự bắt:** phép quét NUL đầu tiên của tôi (`grep -qP '\x00'`) cho ÂM TÍNH GIẢ nên tôi đã kết luận nhầm "chỉ `ingest.ts` dính". Quét lại bằng Python mới ra `ui.ts`. Đã quét toàn bộ file tracked: ngoài 2 file này, mọi hit còn lại đều là nhị phân thật (png/ico/ttf).
## 🔬 AUDIT TOÀN DIỆN 2026-07-27 — 3 finding (F3 đã xử)
> Chạy đủ 6 mặt theo skill `audit toàn diện` vừa viết. Gate **227/227** · `conform` ✓ · `integrity_check` ok.

### 🔬 AUDIT TOÀN DIỆN 2026-07-27 — 3 finding (F3 đã xử)

## 🧹 P2/P3 dọn dẹp + 3 món "Graph Engineering" — XONG 2026-07-27
> Gate lúc chốt: `npm run check` **214/214** · `conform` ✓ sạch trên zemory · `dangling-ref` = 0 trên cả 3 repo thật · live endpoint verify thật (860/860 cạnh có eid).

### 🧹 P2/P3 dọn dẹp + 3 món "Graph Engineering" — XONG 2026-07-27

**Phát hiện nặng hơn cả việc dọn: UI thật KHÔNG có test nào.** 22 test UI (`cockpit.test.mjs`) neo vào cockpit cũ; UI viết lại thành 5 màn mà neo không đổi ⇒ gate vẫn xanh còn `app.*` phủ 0. Nhiều vòng đã báo "i18n parity ✓" trong khi nó kiểm từ điển bản cũ. Nay có `backend/test/app-ui.test.mjs` (25 test) soi UI thật; chạy lần đầu lòi 1 lỗi thật (7 màu không qua token) + 3 test tự viết sai.
**Bẫy TREO:** `serveFrontend`/`serveBinary` gọi `writeHead(200)` trước `readFileSync` ⇒ file thiếu thì client chờ vĩnh viễn (không timeout, không lỗi). Sửa: đọc xong mới cam kết header.
**Đã xong:** cockpit 19 file → `attic/` (git mv) · gỡ `/cockpit` `/ui-state` `/set-ui-state` + 2 helper mồ côi · `share/README.md` 7 lệnh `brain`→`memory` · 8 CSS class chết · `archive` 409→229 dòng · lịch sử `graphFitness` (bảng `graph_fitness`, schema **v18**, card ở panel Graph) · edge id ổn định `sha1(from|to|kind|rel)` · `conform` check ⑥ `dangling-ref`.

### 🧹 P2/P3 dọn dẹp + 3 món "Graph Engineering" — XONG 2026-07-27

**Còn mở từ đợt này:**

### 🧹 P2/P3 dọn dẹp + 3 món "Graph Engineering" — XONG 2026-07-27

**🔴 P1 — người dùng thấy ngay**
- [ ] **`04_SKILLS` phình 92 → 192 dòng** (+109%) — file tự khai guardrail "KHÔNG BAO GIỜ phình". Hai skill mới đều ngắn nên còn đúng khuôn, nhưng thêm nữa thì phải tách sang `external/skills/`.

### 🧹 P2/P3 dọn dẹp + 3 món "Graph Engineering" — XONG 2026-07-27

**✅ ĐẠT (đã kiểm, không phải giả định)**
`integrity_check` ok · `foreign_key_check` 0 lỗi · 0 message mồ côi · `sessions.message_count` khớp thực tế 100% · 0 session rỗng · **điều 6: 0 lời gọi model API trong `backend/src/`** · CLI ↔ help **21/21** khớp · docs không nhắc lệnh không tồn tại · `conform` sạch · 15/15 endpoint LIVE trả 200.

### 🧹 P2/P3 dọn dẹp + 3 món "Graph Engineering" — XONG 2026-07-27

**🚫 ĐÃ LOẠI — false-positive (ghi lại để phiên sau khỏi báo lại)**

### ⭐ Ưu tiên kế tiếp

> **📍 2026-07-25 (chiều) — GỘP NAV 9 → 6 MÀN + skill MarkItDown. CHỜ USER DUYỆT MẮT, CHƯA ghi `06_CHANGES`, CHƯA commit.**
> **Gốc vấn đề (user nêu):** phiên trước được giao "thêm chức năng vào tab đang có" nhưng lại **đẻ tab mới trùng chức năng** (làm theo IA 10-màn của GPT trong `plan/15`). Đo ra 5 chỗ trùng THẬT: ① 3 tab cùng nói về bộ nhớ (`Global Memory` · `Bộ nhớ & Sync` · `Insights`) — riêng 7 ô `gmStats` ≡ 10 stat card màn Memory ≡ 4 tile `insHealth` · ② 2 viewer hội thoại (dialog `#sessDlg` của Recall ≡ cả màn `Sessions`) · ③ `Top Sources` vẽ 2 lần (`gmSources` từ scopeTree + `Top Agents` từ `/insights`) · ④ **2 list "sức khoẻ" hardcode song song** (`renderHomeChecks` 12 dòng ≡ `FEATURES` 14 mục — 2 nguồn sự thật, tất yếu lệch) · ⑤ 2 tab đều tên "memory" → không đoán được cái nào làm gì.
> **Luật user chốt cho đợt này:** gộp lại · **màn nào gộp nhiều thì tách SUB-TAB, KHÔNG đẻ tab nav** · tuyệt đối không trùng card/info/chức năng · tối giản, không thêm thứ không cần.
> **Đã làm:** nav **9 → 6** (`Trang chủ · Recall · Dự án · Global Memory · Nạp & Đồng bộ · Harness`); 3 nhóm sub-tab mới (`data-hm` Tổng quan|Tính năng&Kiểm tra · `data-rc` Tìm kiếm|Phiên · `data-gm` Tổng quan|Xu hướng) + engine sub-tab dùng chung có **nhớ qua phiên** (`subApply`/`subSet`/`subLoad`/`ensureScreen`, chỉ fetch sub đang mở) + `data-goto="màn:sub"`; **map màn cũ trong localStorage** (`sessions`→`recall:sess` · `insights`→`gmem:trend` · `system`→`home:feat`) để bản cũ không mở lên trắng trang. **Gỡ trùng:** 10 stat card màn Memory · 4 tile `insHealth` · card `gmSources` · card `homeChecks` + `renderHomeChecks`/`checkRow`/`derived` (roll-up giờ MỘT nguồn = `FEATURES`+`sysStatus`, pill trong màn và chip chân rail cùng đọc) · dialog `#sessDlg` (⤢ nhảy sub-tab Phiên, một viewer duy nhất) · nhánh `data-act="recheck"` chết (0 nút gọi) · 4 key i18n mồ côi. **Bù thứ độc nhất khỏi mất:** `Tokens (~)` + tooltip "?" của Section/Digest/Changelog/Doc/Known-stores dời vào `gmStats`; `svInfo()` lấy meta từ `/memory-session` khi phiên chưa có trong list (mở từ Recall) + bỏ chuỗi `" ·  · "` rỗng. Vá thêm 1 bug markup có sẵn: grid Recall không đóng thẻ.
> **Verify:** `node --check` xanh · i18n **254/254 khớp 2 dict**, 0 key trùng, 0 key thiếu · nav↔screen 6/6 · 5 nhóm sub-tab khớp button↔sub + default · mọi `<section>` cân bằng thẻ div · daemon 4444 phục vụ LIVE `/` `/scripts/app.js` `/styles/app.css` `/insights` `/sessions` `/memory-status` đều 200 · `validate` xanh · `reindex` 175 section.
> **VÒNG 2 (2026-07-26, user duyệt 6 màn rồi chỉ tiếp 5 điểm) — ĐÃ LÀM HẾT:**
> ① **Gộp tiếp `Nạp & Đồng bộ` VÀO `Global Memory` ⇒ nav 6 → 5.** User bác cách tôi tách analytics/actions: *"ban đầu thiết kế là sync đi với global memory, chứ ko có từ ingest nào hết"* — **user đúng**: sync LÀ thao tác trên bộ nhớ; tách ra là bắt nhảy 2 màn để làm 1 việc, và ảnh chụp chứng minh mỗi màn không đủ nội dung (dư khoảng trống). Bỏ luôn 2 sub-tab `data-gm`. Thứ tự trong màn: bảng SỐ lên đầu → chart NHỎ → hành động (3 cột kéo được).
> ② **Chart: giữ nhưng nhỏ** (user: *"cho nó không gian nhỏ thôi"*) — `.mini-row` cap card 190px / svg 96px, 3 chart thấp cùng hàng. **Bỏ donut "Sức khoẻ" + card "Vector Index" riêng** → thành tile trong bảng số (thêm tile `Vector coverage` + `Vector dims`, +`hint.dims`).
> ③ **Session viewer: prose FULL TEXT + thu lại code/tool.** `msgHtml()` — prose `pre-wrap` không cắt chữ; `tool_use`/`tool_result`/khối ``` → `<details class="fold">` bấm mới mở ("ko dc mở hết"). Cắt segment tại mốc tool ở ĐẦU DÒNG nên 1 message vừa prose vừa tool vẫn đúng.
> ④ **Nút ↻ quét lại** trong danh sách Phiên (`data-act="sessrescan"`): scan → refresh → nạp lại list. **Backend tên session VỐN ĐÃ ĐÚNG** (`custom-title` của `/title` thắng + KHOÁ, ai-title sau không ghi đè — `claude.ts:43` · `ingest.ts:455`); thiếu là chỗ LÀM TƯƠI, app chỉ thấy tên mới sau lần scan kế tiếp.
> ⑤ **Fix 2 bug user báo:** *Graph bấm node không hiện lên tree* — 2 gốc: `gHiTreeFolder(nd.dir)` bị **chính dòng ngay sau ghi đè sạch** class `active`, và file nằm trong folder **đang thu gọn** thì set class cũng không ai thấy → thêm `gRevealTreeFile()` (mở folder cha + `scrollIntoView`). *Settings dư line ngang* — `set-row` cuối còn `border-bottom` mà ngay dưới là khối About có `border-top` ⇒ 2 vạch sát nhau → `border:0`.
>
> **ĐO THẬT trước khi sửa session viewer** (167.738 tin) — số liệu BÁC chẩn đoán ban đầu của tôi: `THREAD_CAP` **không** phải nguyên nhân (**0** session vượt 5.000 tin; dài nhất 3.212) · `clip()` 4.000 ký tự/block chỉ đụng **4,18%** (7.004 tin) · thứ thật sự làm viewer khó đọc là **52,5% tin chứa `tool_use`/`tool_result`** (88.023 tin) — tức là vấn đề **CÁCH HIỂN THỊ**, không phải bị cắt dữ liệu. Nên đã trị bằng fold ở frontend, KHÔNG dựng endpoint đọc transcript gốc.
>
> **VÒNG 3 (2026-07-26) — user bắt 3 lỗi của tôi, đã sửa hết:**
> ① **GRAPH: bấm node vẫn KHÔNG nhảy vào dòng trên tree — vòng 2 tôi "fix" mà KHÔNG verify bằng dữ liệu thật (sai quy trình).** Đo lại: `/code-graph` **125 node** ≡ `/folder-tree` **125 file leaf**, `data-path` khớp node `id` **0 lệch** ⇒ không phải lỗi khớp path. **Gốc thật: `box.setPointerCapture()` trong handler `pointerdown` bắt con trỏ về `#gcanvas`, nên event `click` bị đổi target sang canvas ⇒ `ev.target.closest('.gnode')` trả `null` ⇒ rơi vào nhánh `gDeselectAll()` — bấm node BỎ CHỌN chứ không chọn.** Vá: chọn node ở **`pointerup`** bằng `ndrag.id` đã bắt từ `pointerdown` (chắc chắn đúng id, miễn nhiễm chuyện retarget); `click` chỉ còn lo ca bấm-nền-để-bỏ-chọn. + `gRevealTreeFile()` cuộn **trong `#pgTree`** bằng `scrollTop` thay vì `scrollIntoView` (cái này cuộn cả trang vì `.scroll` cũng scrollable). **Bài học: đừng sửa UI theo suy luận — phải đo/kiểm rồi mới sửa.**
> ② **Skill MarkItDown → SHIP vào cả 2 template** (`docs_template/{app,nonapp}/agent/04_SKILLS.md`): bảng "Tool ngoài — gọi qua CLI, KHÔNG vendor source" + section skill đầy đủ kèm số đo. Viết **generic** (0 tên app cụ thể, không dẫn chiếu "HP điều N" vì hiến pháp là per-project — chỉ nêu nguyên tắc bằng chữ). Gate `template-parity.test.mjs` **5/5** xanh (04_SKILLS thuộc nhóm 3 file được phép khác nhau).
> ③ **"Memory nhiều card quá dư ko?" — DƯ THẬT, và tôi còn tái phạm trùng.** Bảng số Global Memory có `Messages`/`Sessions`/`Vector coverage` **lặp y hệt 6 ô at-a-glance của Trang chủ** → gỡ 3 tile đó, đổi thành tile **`Chờ embed`** (việc-cần-làm, khác con số coverage) + giữ `Vector dims`. Và 7 card một màn = quá dày → **tách 2 sub-tab TRONG CÙNG màn nav Global Memory** (vẫn đúng "sync đi với global memory", không đẻ tab nav): **① Bộ nhớ** (bảng số + 3 chart nhỏ + Sources/scope) · **② Đồng bộ & Sao lưu** (Máy này+tự động · Drive · **Sao lưu & Riêng tư tách thành card riêng** — trước card Drive gánh cả donut+link+sync+mode+4 dòng privacy). Seam đổi tên khớp biến grid (`mem1`/`mem2` — seam chỉnh cột TRƯỚC nó).
> **Verify vòng 3:** i18n **258/258 khớp 2 dict** · nav↔screen 5/5 · 5 nhóm sub-tab khớp + default đúng · mọi section cân bằng thẻ · gate parity 5/5 · LIVE: nav=5 screens=5, `/standard-doc?profile=app|non-app` đều trả skill markitdown · `validate` xanh · `reindex` 176 section.
>
> **VÒNG 4 (2026-07-26) — TÊN SESSION không tự đổi: CHẨN LẠI BẰNG SỐ ĐO, chẩn đoán vòng 2 của tôi CHƯA ĐỦ.**
> Vòng 2 tôi kết luận "backend đúng, chỉ thiếu chỗ làm tươi" rồi thêm nút ↻ — user báo **vẫn lỗi**. Đo transcript thật (6 file `~/.claude/projects/d--Zyro-Tool-Zemory/`) vs DB: `67a0f145` file có **2 dòng cuối đều là `custom-title`** (dòng 1167=`25-7-2026`, dòng 1168=`24-7-2026`) mà `ingest_state.last_line=**1167**`, `size` lệch **đúng 115 byte ≈ 1 dòng JSON** ⇒ DB đang giữ `25-7` (dòng 1167), bỏ đúng dòng cuối. **Nghi off-by-one trong `completeLines` — nhưng chạy `memory scan` thì DB tự về `24-7-2026` và cả 6 phiên khớp ⇒ CODE INGEST ĐÚNG, thật sự chỉ là chưa scan.** Vấn đề: user muốn **"tự đổi theo"**, một cái nút không đáp ứng.
> **Giải: `refreshSessionTitles()`** (`memory/ingest.ts`) — làm tươi TÊN từ **đuôi 16 KB** của transcript N phiên mới nhất của máy này; **KHÔNG** đụng `messages`/`ingest_state` (scan vẫn sở hữu 2 thứ đó, nên không thể làm ingest bỏ sót nội dung). Chỉ áp `custom-title`; **cố ý bỏ qua `ai-title`** trong đuôi vì muốn chứng minh "file không có custom-title ở đâu cả" thì phải đọc cả file, đoán sẽ để ai-title ghi đè tên user đặt (phá luật `titleLocked`). Nối `GET /sessions?fresh=1` (fail-open) + frontend `loadSessions()` gọi sẵn `fresh=1` ⇒ mở tab Phiên là tên đã mới.
> **Bug tự gây + tự bắt khi test:** bản đầu lọc `size > ingestedSize` ("chỉ soi file mọc thêm") ⇒ sau một lần `scan` mọi size khớp nên **không soi cái nào**, tên sai không bao giờ tự lành (`checked=1 updated=0`). Đã bỏ guard, đổi sang "N phiên mới nhất, ORDER BY ended_at DESC LIMIT".
> **Verify:** phá tên trong DB thành rác → gọi hàm → **tự lấy lại đúng `Zemory_Claude_24-7-2026`** từ transcript; đồng thời **tự lành thêm 6 phiên** đang lệch tên (`PBI_SasinFlow_Rebuild_*`). LIVE `/sessions?limit=120&fresh=1` → 120 phiên trong **111 ms**, đầu danh sách ra tên thật (`Zemory_Claude_25-7-2026`…) thay vì `Đọc docs và chuẩn bị`/`(untitled)`. **Bài học (lặp lại lần 2 trong phiên): KHÔNG kết luận theo suy luận — đo trước, và tự test cái mình vừa viết trước khi báo xong.**
>
> **VÒNG 5 (2026-07-26) — 2 lỗi BẢN CHẤT user bắt:**
> ① **`role='user'` mà nội dung là docs.** Đo: `role='user'` 69.324 tin, trong đó **44.102 (63,6%) bắt đầu bằng `[tool_result]`** — output máy, KHÔNG phải người gõ; chỉ 25.222 (36,4%) là người thật. Gốc: **API Anthropic trả `tool_result` TRONG LƯỢT `user`**, adapter ghi trung thực theo transcript nên `role='user'`. `tool_name` ở role=user = **0 dòng** ⇒ không phân biệt được bằng metadata; nhưng mọi tin tool_result đều **BẮT ĐẦU** bằng marker (44.102 = 44.102) ⇒ luật tất định. **Vá 2 chỗ:** viewer dán nhãn **`tool`** (mờ hơn, `data-role="tool"`) thay vì "USER"; `search.ts` thêm `roleMatches()` ⇒ **`role='user'` = người thật hỏi gì**, `role='tool'` = output công cụ, filter UI đổi nhãn theo. **`digest.ts` KHÔNG bị** — `NON_NL` (dòng 56) đã chặn `[tool_result]` ở đầu từ trước, đã kiểm chứ không sửa mù. **Verify LIVE:** `role=user` → 12 hit, **0** tool_result · `role=tool` → 12 hit, **12/12** tool_result · `role=assistant` → 9 hit, 0 tool_result.
> ② **Tách sub-tab SAI NHÓM (user: "tách tab ngu quá").** Tôi để **Sources (scope include/exclude)** ở tab chart, nhưng **Sources · Máy này/quét · Drive là SETTING CẦN NHAU** — bỏ tick lane ở Sources đổi luôn cái gì được sync/recall, nên phải đứng cùng nhau **như bố cục ban đầu**. Đã trả Sources về tab ② (3 cột: Sources | Máy này+tự động | Drive+Sao lưu, kéo được §5) và gộp lại card "Sao lưu & Riêng tư" vào Drive (bỏ luôn cột thứ 4 tôi tự thêm). **Ranh giới đúng = theo VIỆC:** tab ① chỉ SỐ + chart · tab ② chỉ SETTING. Không trộn.
>
> **VÒNG 6 (2026-07-26) — chart: 4 bảng 2×2 + TRỤC THỜI GIAN.** ① Tab ① sau khi trả Sources về tab ② thì chừa nửa màn trống → **lưới 2×2 lấp đủ khung** (`.chart-grid` `grid-auto-rows:minmax(0,1fr)`), thêm chart thứ 4 **"Bộ nhớ theo dự án"** (query mới trong `insightsData`: `GROUP BY project_root ORDER BY messages LIMIT 8` — COUNT/SUM thẳng, 0 suy diễn). Gộp 2 chart hạng mục về **một helper `barRows()`** dùng chung (Top Sources · theo dự án) thay vì 2 khối HTML lặp. ② **Trục thời gian** (user: *"chart mà ko có cột time thì ý nghĩa mẹ gì"*) — `xAxis()` lấy 4 mốc rải đều; **render bằng HTML `.xaxis`, KHÔNG dùng `<text>` trong SVG** vì `viewBox` đi cùng `preserveAspectRatio="none"` sẽ bóp méo chữ theo chiều ngang. Verify LIVE: daily 31 điểm (trục `25/06 … 25/07`) · monthly 15 điểm (trục `2025-02 … 2026-07`) · agents 5 · **projects 8** (Zemory 21.887 msg/20 sess…).
>
> **VÒNG 7 (2026-07-26) — GRAPH: bôi chọn + kéo nhiều node (user giao).**
> `gSelIds` thành **NGUỒN SỰ THẬT** của lựa chọn (1 hoặc nhiều); mọi cách chọn chỉ sửa mảng đó rồi gọi `gPaintSel()` ⇒ graph ↔ cây ↔ inspector luôn đồng nhất, không nơi nào tự vẽ riêng. **Cách chọn:** `Shift+kéo nền` = bôi chọn (khung `.gmarquee` overlay HTML, không vẽ trong SVG để khỏi bị viewBox làm méo nét) · `Ctrl/Cmd+bấm` = thêm/bớt · **kéo một node đang trong nhóm = kéo CẢ NHÓM**. Kéo nền TRẦN vẫn là pan (giữ thói quen cũ). **Undo:** entry đổi thành `{moves:[…]}` ⇒ kéo 5 node = **1 lần Ctrl+Z**, không phải 5. **Highlight:** 1 node → sáng cả láng giềng (UX cũ, blast-radius) · nhiều node → chỉ sáng đúng nhóm + cạnh NỘI BỘ nhóm (kéo theo láng giềng của N node thì sáng gần hết graph, vô nghĩa). **Inspector nhiều node:** tổng hợp ĐO ĐƯỢC (số import nội bộ nhóm · tổng fan-in/out · tổng dòng · danh sách file) — không suy diễn. `gHiDir` (bấm folder) xoá `gSelIds` để không có 2 nguồn sự thật.
> **BÀI HỌC KỸ THUẬT (tự gây, mất thời gian tìm):** chèn `//` vào GIỮA một hàm viết trên **1 dòng** (`gHiDir`) làm phần còn lại của dòng — kể cả `}` đóng — bị biến thành comment ⇒ `node --check` báo lỗi ở **dòng cuối file** (1367), rất khó lần. Bộ đếm ngoặc tự viết **KHÔNG đáng tin** vì không strip regex literal (`{n}` quantifier đếm nhầm). **Cách tìm đúng: dùng `acorn.tokenizer()` có sẵn trong `node_modules`** rồi giữ stack dấu mở → nó chỉ thẳng "`{` mở ở dòng 434 chưa đóng". Ghi lại để phiên sau khỏi mò: **KHÔNG thêm comment giữa dòng vào hàm one-liner; muốn ghi chú thì để dòng RIÊNG phía trên.**
> **Verify:** `node --check` xanh · tokenizer "mọi dấu ngoặc đều khớp" · i18n **266/266** khớp 2 dict · LIVE `/scripts/app.js` có `gSelectInRect`/`gPaintSel`/`ndrag.group`/`moves:moves`, `/styles/app.css` có `.gmarquee`.
>
> **VÒNG 8 (2026-07-26) — GRAPH: hấp thụ 5 điểm từ mẫu "Knowledge Graph Viewer" (user duyệt).** Spec + số đo đầy đủ đã ghi ở **`plan/13 §0b`** (không lặp ở đây). Tóm: `/code-graph` giờ trả cạnh **có hạng + nhãn** (`imports` 233 declared · `calls` **393 inferred**, nét đứt) — trước đó cạnh KHÔNG nhãn và `calls`/`touches` build từ 07-21 chỉ dùng được qua CLI, **UI không thấy**; thêm bộ lọc hạng cạnh · **inspector liệt kê cạnh vào/ra bấm-nhảy-được** (trước chỉ có con số fan-in/out) · legend slot có đếm bấm ẩn/hiện · đếm "đang lọc/tổng" + `builtAt`. **Đo trung thực:** `touches` yếu — 35 digest nhưng chỉ **2/125 node** có `touchedBy>0` vì `buildTouchIndex` khớp `project_root` nghiêm, còn `graph export` có fallback khớp tên folder (23 digest·59 file hồi 07-21) ⇒ **hợp nhất 2 đường là việc còn lại**. **KHÔNG hấp thụ** taxonomy node của mẫu (user_story/requirement/status/priority) — cần LLM (trái điều 6) hoặc ép front-matter toàn hệ (trái điều 3); chỉ mở nếu user chủ động chốt chuẩn docs mới.
> **Verify:** `npm run check` **172/172** · `node --check` + tokenizer khớp ngoặc · i18n **273/273** 2 dict · LIVE đo trên repo zemory: 125 node · 626 cạnh (233+393) · 17 slot legend · `builtAt` có · hub `ui.ts` 35 ra/2 vào.
>
> **VÒNG 9 (2026-07-26) — TAXONOMY GRAPH LẤY TỪ BẢN CHUẨN (`graph-standard.ts`).** Spec + số đo ở **`plan/13 §0b.1`**. **Tôi đã nhận định SAI và user sửa:** tôi bảo taxonomy giàu "cần LLM hoặc ép front-matter (trái điều 3)"; user chỉ ra *"nếu trên structure có thì node phải có, đúng cấu trúc chuẩn mà?"* — đúng, **bản chuẩn đã tự khai vai trò**, và plan 13 §4 vốn đặc tả sẵn `hp_dieu`/`skill`/`plan_spec`/`slot`+`routing` từ lâu mà chưa build. Kết quả: 125 file → **288 node · 918 cạnh** (`calls` 403 · `imports` 234 · `contains` 134 · `routing` 102 · `references` 45); node file có `type` = vai trò slot; `slot` 16 dùng thật / `slot_unused` 48 (ẩn mặc định, tách vì chuẩn nói "từ điển tên, KHÔNG phải checklist phải tạo"). **2 bẫy parse đã dính:** `01_CONSTITUTION` có HAI list đánh số (§Mục đích + §Điều khoản) — quét cả file đẻ điều giả; và `slice(at).split(/^##\s+/m)[0]` trả **chuỗi rỗng** ⇒ hp_dieu/concern ra 0 (thay bằng `sectionBody()`). **Còn để ngỏ:** trạng thái nghiệp vụ (`status`/`priority`/`persona`) — là NỘI DUNG chứ không phải cấu trúc, cần front-matter và phải OPT-IN.
> **Verify:** `npm run check` **172/172** · i18n **273/273** 2 dict · tokenizer khớp ngoặc · đo LIVE trên repo thật.
>
> **VÒNG 10 (2026-07-26) — `zemory conform` + skill `soi chuẩn` + luật "MÁY dựng · AGENT sửa NGUỒN" (user duyệt).**
> **Khung tư duy tôi từng đặt sai:** tôi dựng trục "máy vs LLM". Điều 6 KHÔNG nói "không có LLM" — nó nói zemory không TỰ GỌI model. **Chiều gọi mới là thứ quan trọng: agent gọi zemory, zemory không gọi agent.** Trục đúng là *ai được GHI vào lớp nào*. User chốt: *"quy tắc là giảm gánh nặng cho LLM chứ không phải loại trừ nó… bán tự động"*.
> **Số đo quyết định thiết kế:** nạp cả graph vào ngữ cảnh ≈ **56.000 token**, chỉ rẻ hơn đọc cả repo **4,8×** ⇒ "cho agent đọc graph để kiểm" là ĐỐT QUOTA. Nên: **máy chấm (0 token) → agent đọc BẢNG LỆCH (~vài trăm token)**. (Đối chiếu `nav-cost`: routing 150× · impact 1.617× · recall 7.774×.)
> **Đã build:** `backend/src/docs/conform.ts` + `zemory conform [--json] [--gate]` (exit 1 khi có mục `blocking`, CI-able). 5 kiểm: `off-standard-dir` · `harness-missing` · `hp-uncited` · `skill-roster-drift` · `empty-slot-dir`. Tách khỏi `validate` (validate = *docs harness đúng khuôn?*, conform = *code+docs bám chuẩn?*). Skill **`soi chuẩn`** vào `04_SKILLS` **+ cả 2 template**. **Điều 13** thêm đoạn "MÁY DỰNG · AGENT SỬA NGUỒN".
> **3 dạng BÁO OAN tự bắt khi chạy thử repo khác (checker kêu oan = lần sau không ai đọc):** ① `(root)` — chuẩn nói "tool ép root = ĐỂ YÊN" · ② `backend`/`frontend`/`docs` — là 4 VAI TRÒ bắt buộc, không phải slot · ③ `pipelines/01_weekly` — `NN_<tên>` là convention ĐÃ KHAI của hệ non-app. Và bản đầu tôi báo **48 mục** "slot khai mà repo chưa dùng" — tự mâu thuẫn với ghi chú của chính mình, vì đó là TRẠNG THÁI ĐÚNG ("từ điển tên, không phải checklist"); đã thay bằng `empty-slot-dir` (folder tồn tại mà KHÔNG có file nào — đo trên đĩa, không đo bằng node code-graph, vì `docs/` đầy `.md` mà 0 file source).
> **Kết quả LIVE:** Zemory **1** phát hiện thật (`backend/src/memory/graph`) · SasinFlow **3** (`backend/sasinflow`, `…/collector`, `frontend/js` — đúng cái `plan/09 §7` ghi "folder chưa nắn") · SasinHarvest **2** (có `…/integrations/graph`) · PBI_Maintain 6 (pipeline không đánh số — đúng thiết kế: **máy nêu, agent của repo đó phán**, tôi KHÔNG sửa project ngoài).
> **Verify:** conform chạy đúng trên 4 repo · `--gate` exit 1 đúng.
> **TEST cho 2 module mới — XONG (gate 172 → `npm run check` 190/190).** `graph-standard.test.mjs` (8) + `conform.test.mjs` (10). Trọng tâm KHÔNG phải "bắt được lệch không" (dễ) mà là **KHÔNG BÁO OAN** — mỗi ca báo oan đã gặp có một ratchet: `(root)` · `backend`/`frontend`/`docs` · `NN_<tên>` · "slot khai mà chưa dùng". Fixture của `graph-standard` cố tình cài đủ bẫy: `01_CONSTITUTION` có HAI list đánh số, `03 §4` có hàng header + bảng ở section khác, `04_SKILLS` có section "LUẬT chung" không phải skill. **Chống test-xanh-giả bằng MUTATION TEST:** gỡ miễn trừ trong `conform.ts` → **6 test đỏ**; khôi phục → 10/10 xanh (bài học 07-21 "test có nhánh `if(n===0) return` = xanh giả" — lần này chứng minh bằng cách phá thật).
>
> **VÒNG 11 (2026-07-26) — AGENT TỰ DUYỆT MẮT ĐƯỢC (user sửa nhận định sai của tôi).** Tôi nói "tôi không nhìn được UI" ⇒ SAI: chụp màn hình bằng PowerShell (`System.Drawing.CopyFromScreen` + `SetForegroundWindow`) rồi tự đọc ảnh là thấy, thậm chí **tự bấm qua từng màn** bằng `SetCursorPos`+`mouse_event`. Script để ở scratchpad. **Từ nay KHÔNG được lấy cớ "không nhìn được UI" để đẩy việc duyệt mắt sang user.** Đã soi thật 4 màn: nav 5 mục đúng · sub-tab NHỚ đúng qua phiên (Home mở `feat`, Global Memory mở `sync`) · 3 cột `Sources | Máy này | Drive+Sao lưu` đứng chung đúng yêu cầu.
> **False-positive tự bắt khi soi ảnh:** thấy một ký tự "2" bị cắt ở góc dưới-phải MỌI màn, suýt báo là lỗi UI — thật ra là **cửa sổ VS Code phía sau lọt vào ảnh** vì `GetWindowRect` của cửa sổ maximize bao cả viền vô hình ~8px. Lỗi ở cách chụp, không phải ở app. *(Bài học: soi ảnh cũng phải verify như soi code.)*
> **Sửa từ ảnh:** cột "Máy này" chừa nửa màn trống (nội dung hết ở ~y530, card kéo tới y1055) → `align-items:start` cho lưới sync + `align-self:stretch` cho seam (seam phải cao hết mới nắm kéo được).
> **KHAI SLOT `graph` + `adapters` (user: "ban đầu làm mới đủ đúng"):** thêm `graph` vào `SLOT_ROLES` + 2 hàng routing `03 §4` + luật ở `03 §2` ("hai slot CHỈ dùng ở cấp domain"). Trị đúng mâu thuẫn nội tại: §4 nói "lồng trong domain" mà không đặt TÊN, còn §2 lại buộc "chỉ dùng slot từ cùng từ điển". **Kết quả: `zemory conform` → "✓ không lệch chuẩn"** (slot 17/65), `structure-sync` parity xanh, `npm run check` **190/190**.
> **Điểm nhỏ chưa đánh bóng:** chip sức khoẻ ở chân rail hiện "6 OK" trong ~vài giây đầu rồi mới về "14 OK" — do `/automation` về trước `/memory-status` nên `renderSystem()` vẽ lần đầu lúc `Z.mem` còn rỗng. Không sai số cuối, chỉ nhấp nháy lúc nạp.
>
> **CÒN TREO:** ① **user duyệt mắt bản 5 màn** → OK thì ghi `06_CHANGES` + commit (4 file: `app.html` · `app.js` · `app.css` · docs) · ② **`/session-raw` (đọc transcript gốc) — CHƯA làm, chờ user quyết**: chỉ bù được **4,18%** tin bị clip + khối `thinking` bị bỏ lúc ingest; và với session **sync từ máy khác thì file không có ở máy này** (`ingest_state` toàn đường `C:\Users\Zyro\...`) ⇒ phải fail-open về DB. ROI thấp, nêu ra để user chốt chứ không tự làm. · ③ chưa có test tự động cho sub-tab routing — khoá ratchet "nav đúng 5 mục" + "không tái sinh `sessDlg`/`homeChecks`/`gmSources`/`gmHealth`/`gmVector`" · ④ orphan i18n có TỪ TRƯỚC chưa dọn (`home.memEngine` · `home.docsHarness` · `graph.brokenDocs*` · `graph.orphanFiles` · `graph.neverModified*` · `graph.harnessOk` · `graph.validateOk`) · ⑤ **`plan/15` đã supersede IA 10 màn → 5 màn + luật "gộp thì tách sub-tab, không đẻ tab nav"** (đã ghi, không còn là nợ).
>
> **📍 2026-07-25 — SKILL MỚI: đọc file Office qua Markdown (`markitdown`, user giao).** Vào `04_SKILLS §đọc file Office qua Markdown` + bảng mới **"Tool ngoài — gọi qua CLI, KHÔNG vendor source"** (tách khỏi bảng skill vendored: markitdown là *công cụ* pip, không phải skill-repo ⇒ đúng HP điều 2). Cài+đo thật trên máy này: `markitdown` **0.1.6** MIT, `pip install "markitdown[xlsx,xls,docx,pptx,pdf]"`, `-o` xác nhận chạy. **Đo trên file mẫu tự sinh** (18 KB · 3 sheet · 308 dòng, ~token = ký tự÷4): XML thô **30.119** → Markdown **5.395** (rẻ hơn **5,6×**) → CSV **4.193**. ⚠ **Số đo BÁC kỳ vọng ban đầu "markdown rẻ nhất"**: CSV còn rẻ hơn Markdown ~22% (pipe của bảng tốn ký tự) — nên skill ghi rõ *chọn theo việc*: nhiều sheet/chữ-lẫn-số/docx/pptx/pdf → MarkItDown; một bảng số thuần → CSV. **CHỜ USER CHỐT:** có ship skill này vào **`docs_template/{app,nonapp}/agent/04_SKILLS.md`** không (đặc biệt hữu ích cho non-app BI/report vốn đọc Excel liên tục) — ship = mọi project `zemory init` sau này đều nhận, nên chờ gật.

### ⭐ Ưu tiên kế tiếp

> **📍 CHỐT SỔ 2026-07-25 (phiên RẤT DÀI — plan 15 + fix bug + version + hiến pháp).** ĐÃ XONG + verify LIVE trên daemon 4444:
> 1. **Plan-15 UI** — badge/Harness THẬT (đọc `.harness.json`) · **3 màn nav mới** (Global Memory dashboard · Session Viewer `/sessions` · Insights `/insights` tất-định) · Settings About đầy đủ · Graph **collapse tree+panel · resize 3 bảng · đổi vị trí panel** · tách `app.html`→`frontend/styles/app.css`+`scripts/app.js` · **README viết lại diệt misread no-LLM**. → **đã push `3baaf02`**.
> 2. **Fix bug (user báo)** — **tray ghost** (`traysweep.ts` EnumChildWindows sweep lúc startup, copy logic SasinFlow `desktop.py`) · **logo Z-stamp bừa → chữ-cái-đầu** (card project/máy) · icon vốn gold trong git (Z xanh = **cache Windows**, user sign-in ra gold).
> 3. **Version 1.0.0** (user quyết số) + **quy luật release-based** (bump khi deploy · user quyết · gom giữa 2 release) → `03_STRUCTURE §5` + template app.
> 4. **Hiến pháp điều 6 khoanh vùng** — "no-LLM" chỉ ràng buộc CHÍNH engine zemory (memory/search/harness/graph), KHÔNG áp app harness dựng. *(làm rõ, không supersede)*
> Chi tiết: `06_CHANGES` 2 entry [2026-07-25]. Cụm (2)(3)(4) commit+push phiên này.
>
> **PHIÊN SAU — CHỜ USER CHỐT trước khi code:** ① **L3 sync kèm file/ảnh** (user chốt LÀM, design đã trình, chờ gật "ok build") · ② `adapters` — slot chính thức trong `03` hay domain-internal (allowlist) · ③ (b) **model-routing theo task** — idea-only, ĐỤNG điều 6, chờ chốt hướng (KHÔNG tự mở điều 6). **Backlog có spec:** web capture Gemini/Claude.ai · memory-promotion + ingest bộ-nhớ-curated-của-agent (`~/.claude/.../memory/*.md`) · MCP graph mirror. **Nợ nhỏ:** daemon exit-1 (hộp đen đã cắm, chờ repro) · tách `app.js` sâu theo concern (khi `cockpit.html` nghỉ hưu) · Start Menu icon = **user sign-out/in** (file đã đúng).

### ⭐ Ưu tiên kế tiếp

> Compression đã **BỎ khỏi scope** (changelog 2026-06-25). zemory tập trung **global memory + harness**. Source nén ở `attic/`.

### ⭐ Ưu tiên kế tiếp

### 🎨 UI refactor (plan 15) — 5 quyết định + Graph + tách file XONG 2026-07-25 (xem 06_CHANGES)
**Đã xong (chi tiết 06_CHANGES 2 entry 2026-07-23):** app.html nav-rail 6 màn phục vụ ở `/` · i18n 2-dict (~200 key, cross-check khớp) · graph per-project THẬT (node=file, orphan/fitness dò được) + tree chung khối + zoom/pan/kéo/Ctrl+Z/layout/spacing · dialog `zDialog`/`zToast` thay HẾT prompt/confirm/alert + folder/file picker OS thật · Drive donut % · durable merge (schema v15 `project_pinned`) · filter/sort Projects · System per-feature check/toggle/build-digest/recheck · tooltip "?" mô tả số · **audit toàn diện + diệt 7 fake** (Recall bịa điểm · graph fitness/checks · dims 768→256 · version/host/health-chip thật). Commit gần nhất `9290f8b` (audit-fixes + tooltip CHƯA commit).

### 🎨 UI refactor (plan 15) — 5 quyết định + Graph + tách file XONG 2026-07-25 (xem 06_CHANGES)

**✅ 5 QUYẾT ĐỊNH — USER CHỐT + BUILD XONG 2026-07-25 (chi tiết 06_CHANGES):** ① Harness tab → **nối THẬT** 2-khung cây/viewer (`/harness-files`+`/doc`) · ② Badge → đọc `docs/.harness.json` `profile` thật (ẩn khi không rõ) · ③ build **4 màn** (Settings About · Global Memory dashboard · Session Viewer · Insights tất định) · ④ **tách `app.html`** → `frontend/styles/app.css`+`scripts/app.js` · ⑤ **dọn dead-code** hết. Kèm: Graph **collapse tree+panel · resize 3 bảng · đổi vị trí panel** (user giao) · **README viết lại diệt misread no-LLM**. Còn: test tự động cho màn mới (frontend no-build), tách sâu app.js theo concern khi cockpit.html nghỉ hưu. *(5 câu hỏi gốc giữ bên dưới làm lịch sử.)*

### 🎨 UI refactor (plan 15) — 5 quyết định + Graph + tách file XONG 2026-07-25 (xem 06_CHANGES)

**⏳ 5 QUYẾT ĐỊNH (gốc — đã giải):**
1. **Tab "Harness" trong chi tiết project = mock TOÀN BỘ** (cây file cứng · 3 nút `validate/reindex/sync` chết · preview 03_STRUCTURE cứng · tag "mock detail"; là tab MẶC ĐỊNH khi bấm project). → **xoá tab** (Graph đã là view per-project thật) hay **nối `/doc` thật**?
2. **Badge APP/NON-APP** trên card = đoán theo regex tên file (`/PBI|powerbi/`), CHƯA đọc `docs/.harness.json` thật. → nối backend đọc profile thật?
3. **Thiếu so với plan 15 GỐC** (user chốt 6 màn thay 10, nên đây là rớt có chủ đích — hỏi cái nào muốn build): Insights analytics (Usage Trends/Top Agents/Memory Growth) · dashboard Global Memory (Memory Health donut/Top Sources/Vector panel) · Home blocks (Alerts list/Activity chart/Recall inline) · Settings đầy đủ (tab·accent-color·check-update·About version/build) · Session Info panel + Export/Open-editor · prune + phân trang project · Sync Depth slider · MCP status.
4. **Nợ kỹ thuật:** `app.html` = 1 file ~1600 dòng (CSS+JS inline) vs chuẩn tách concern `03_STRUCTURE §UI` (`frontend/scripts/*`+`styles/*`). File split hiện đang phục vụ trang CŨ `cockpit.html` (`/cockpit`). → tách sau?
5. **Dead code/CSS** (không hiện ra UI, cleanup): `SHELL`/`STD`/`stdRender` cũ (superseded bởi `stdRenderReal`) · CSS chết `.mockbadge/.search/.kbd/.bell/.swatch/.donut`-conic · `subtabs('data-mt'/'data-et')` no-op · nhánh `sysStatus kind==='mock'`. → dọn luôn?

### 🎨 UI refactor (plan 15) — 5 quyết định + Graph + tách file XONG 2026-07-25 (xem 06_CHANGES)

**Ngoài ra (không chặn, từ audit):** graph KHÔNG dò import GÃY (relative không resolve bị bỏ âm thầm) — thêm "báo import hỏng" nếu user muốn; nav-cost (`/nav-cost` backend thật) chưa port vào graph UI.

### 🎨 UI refactor (plan 15) — 5 quyết định + Graph + tách file XONG 2026-07-25 (xem 06_CHANGES)

**✅ MCP global recall — đã code/test 2026-06-29:**

### 🎨 UI refactor (plan 15) — 5 quyết định + Graph + tách file XONG 2026-07-25 (xem 06_CHANGES)

- [~] **Đo tốc độ embed/ngày — VẪN CHƯA có số ngày-thường sạch.** Mẫu cũ (07-12, mega-session) = 41 msg/phút, lệch. Rebuild plan 12 (27 giờ, 94k message tồn đọng) cho thấy tốc độ dao động 40–380 msg/phút tùy độ dài message, nhưng đó là backlog dồn cục, KHÔNG phải nhịp ingest hằng ngày. Việc còn lại: sau 1 ngày dùng bình thường (không rebuild), chạy `zemory memory embed --all` + bấm giờ cho SỐ MESSAGE MỚI TRONG NGÀY ĐÓ để ra phút/ngày thật; nếu >20 phút → cân nhắc q4 dtype (hỏi user). **(2026-07-17) ĐO THẬT xong:** backlog 10291 → `memory embed --all` clear HẾT (remaining 0, +10433 vector, 21 pass, ~10834s ≈ 3h) ⇒ **~57–58 msg/phút** (256d · gemma q8 · CPU máy này). Tổng index 109.366 vector. Model verify chạy suốt (probe ok + embed chuỗi mới) — "model unavailable" chỉ là message sai (đã fix). **VẪN CÒN:** đây là backlog-rate; số **ngày-thường** (chỉ msg mới 1 ngày, chạy cuối ngày) mới chốt được q4 — ở ~58/min thì ngưỡng ">20 phút" ⇔ >~1160 msg mới/ngày.

### 🎨 UI refactor (plan 15) — 5 quyết định + Graph + tách file XONG 2026-07-25 (xem 06_CHANGES)

## 🧩 Session digest (plan 06) — ✅ XONG 2026-07-02 (build v1, xem 05_CHANGES)
> Lớp tóm tắt cấp phiên (DẪN XUẤT) để recall đọc rẻ token; đào xuống `messages` qua anchor khi cần. Spec: `docs/plan/06_digest.md`. Cụ thể hoá "memory promotion" (Phase 2) nhưng dạng lăng kính dẫn xuất, KHÔNG phải nguồn.
- [ ] (TẦM NHÌN, tuỳ chọn — không bắt buộc v1) B agent-authored: khi recall chạm phiên, agent hiện tại đọc transcript viết đè `kind=agent` (có anchor). Bỏ B1 "agent tự viết lúc kết thúc". KHÔNG để zemory tự gọi LLM API.

### 🧩 Session digest (plan 06) — ✅ XONG 2026-07-02 (build v1, xem 05_CHANGES)

## 🔥 PHIÊN SAU LÀM TRƯỚC (chốt sổ 2026-07-21 CHIỀU — Opus)
> Chiều 07-21: audit 5-agent (đọc-chỉ) → vá loạt P1/P2 (đã verify) + sync-chạy-ẩn + layout 3-cột + tách coverage theo máy. `npm run check` **161/161**. Chi tiết VERIFIED ở `06_CHANGES` (đã archive bớt entry cũ 07-22). **(07-21 ĐÃ push lên `origin/main`; chỉ còn doc edits phiên 07-22 chưa commit.)** Việc còn treo, làm trước:

### 🔥 PHIÊN SAU LÀM TRƯỚC (chốt sổ 2026-07-21 CHIỀU — Opus)

## 🧩 Graph — ĐÃ HOÀN TẤT declared + overlay (chiều 07-21), còn phase sau
> Baseline + moat + overlay đã xong. Chi tiết 06_CHANGES.

### 🧩 Graph — ĐÃ HOÀN TẤT declared + overlay (chiều 07-21), còn phase sau

  **"Fix triệt để" KHÔNG bằng graph (ghi để khỏi kỳ vọng ảo — bài học plan 10 / plan 13 §7 counterfactual):** đòn thật cho tầng 1 = **contract-first + codegen 2 đầu** (OpenAPI→openapi-typescript/orval · tRPC share type trực tiếp · GraphQL-codegen) → **`tsc` biến drift thành LỖI COMPILE** (khoá cứng, không phải "phát hiện sau"). Tầng runtime/một-phần-ngữ-nghĩa = **contract test (Pact/consumer-driven)**. Graph = **KÍNH SOI** blast-radius; codegen+tsc = **KHOÁ CỨNG**. Repo chưa có typed contract → **việc số 1 là dựng contract, KHÔNG phải graph**.

### 🧠 Kho skill vendored — còn mở

- [ ] **Skill chung vs riêng 2 tầng** (mục cũ bên dưới) — mô hình vendored đã trả lời phần lớn; cần rà lại mục đó xem còn gì.

### Phase 3 — UI / mở rộng

## 🌐 Web-chat capture (spec: docs/plan/07_web_chat_capture.md) — GPT trước
> Thu hội thoại web (ChatGPT/Gemini/Claude.ai) vào memory. Spec: `docs/plan/07_web_chat_capture.md`. Prototype cũ ở `attic/web-capture/`.

### 🌐 Web-chat capture (spec: docs/plan/07_web_chat_capture.md) — GPT trước

**✅ ĐÃ SHIP — ChatGPT (cập nhật 2026-07-08):**

### 🌐 Web-chat capture (spec: docs/plan/07_web_chat_capture.md) — GPT trước

**Quyết định đã chốt (plan 07 §14):** origin = 1 cột · v2b browser-connector (v1 file fallback) · re-pull full replace idempotent · GPT trước · password KHÔNG nhập vào zemory · KHÔNG commit file data thật (PII).

