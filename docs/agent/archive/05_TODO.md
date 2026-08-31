<!-- TODO ARCHIVE — mục ĐÃ XONG cắt khỏi 05_TODO.md. NGOÀI bộ đọc mỗi phiên; tra khi cần (vẫn trong git). -->
# TODO — Archive

- ✅ **⑤ Reranker ĐA NGỮ** — `bge-reranker-base` là model zh/en trên kho tiếng Việt. Nhưng nhớ TRẦN:
  chỉ 15/108 câu có đáp án trong pool mà ngoài top-10 ⇒ đó là **toàn bộ** dư địa của mọi reranker.
  Và giá hiện tại 43–59 s/truy vấn.

**ĐÃ LOẠI bằng số — đừng đề xuất lại:** **BGE-M3** (`[2026-08-23b]`: prose −21 điểm, 1,8× chậm) ·
**tắt lớp gộp** (`[2026-08-23c]`: cổng bất khả thi về nguyên tắc, tương đương cầm lái ⇒ giữ BẬT) ·
**T5 bật mặc định** (tụt ở nghiêm cả hai kho) · Qwen3-Embedding · Qwen3-Reranker (29 s/truy vấn) ·
lai hai model (mọi cặp trong sai số) · tiền tố ngữ cảnh cấp phiên (`plan/17 §2.2`) · LLM 0,6B sinh
biến thể (`§3b`, tệ hơn cả một truy vấn).

- ✅ **CÂU HỎI đang chờ chính 3 phiên đó trả lời — bộ chuẩn Cowork có bị CẮT QUÁ TAY?**
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

- ✅ **Đường TẢI vẫn chưa test — test 1 đi vòng qua nó.** Phiên Cowork thật đầu tiên (2026-07-28,
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
    *(Bằng chứng là ảnh chụp phiên, không phải tôi tự chạy — và phiên đó chụp lúc còn đang chạy Giai
    đoạn 1, CHƯA thấy BÁO CÁO CUỐI. Tức chưa kết luận được: dựng trọn bộ 19 file, và bước tự kiểm
    cuối — script check_install chạy BÊN MÁY SẾP — có xanh không. File script tồn tại trong repo
    nguồn không nói gì về lần cài bên kia; `todo verify` từng giơ cờ mục này vì đúng chỗ đó.)*
  - **Đã biết thêm (đo được từ chính phiên đó):** sandbox Cowork **ĐỌC được filesystem của host** — nó đọc
    thẳng `D:\Zyro\Tool\Zemory`. Khớp tài liệu sandbox của Claude Code (*"Read access covers the entire
    filesystem"*). Ghi vào không rõ, chưa thử.
  - **Agent tự áp `02_RULES §Phạm vi project` đúng chỗ:** dừng lại hỏi trước khi ghi harness vào cây git
    public của user, dù không ai nhắc. Luật đó ăn.

- ✅ F2. (TẦM NHÌN, sau core) Mở RAG sang **data chính** (ngoài memory agent): retriever **đa-store + `kind`**, chung model + retriever, DB tách được. Ý tưởng user — plan 05 §4.F.
- ✅ **Phase D** (tsserver/pyright → cạnh `resolved`) — HOÃN theo decision rule (đếm câu hỏi "sửa X đụng ai" trượt trong 2–4 tuần). ~~MCP mirror~~ **ĐÃ WIRE 2026-08-06** (`graph_impact`+`graph_neighbors`, 6/6 test — `[2026-08-06c]`). ~~Schema-change policy cho `graph.json` v2~~ **BỎ 2026-08-07 (user chốt): "ko xài, cũng không phù
  hợp app".** Đo trước khi bỏ: hợp đồng `graph.json` **chưa có consumer nào** — kế hoạch gốc là một
  "Graph App" repo riêng đọc file đó, nhưng quyết định 18/07 đã đảo (graph thành TAB trong `zemory ui`,
  đọc thẳng `/code-graph`, không qua file xuất). Viết luật versioning cho hợp đồng chưa ai ký là tạo
  cấu trúc chưa có nhu cầu. **Đừng đề xuất lại khi chưa có consumer thật.**
- ✅ **Hạng cạnh BE↔FE seam — V1 ĐÃ BUILD 2026-08-07, soát lại 2026-08-09; spec graduate sang
  `plan/13 §4` (cạnh `api`).** *(Soát 2026-08-09: `todo verify` giơ cờ vì `ui.ts` sửa 08/09 —
  **báo oan**, đó là thêm tham số `also` cho `/memory-search`; cạnh `api` sinh bằng khớp chuỗi
  route nên route MỚI tự vào graph, không cần sửa gì. Vế `resolved` vẫn chờ typed contract.)*
  Đã ship: `graph-seam.ts` khớp chuỗi route FE↔BE, nhãn
  `inferred·textual`, ba bề mặt (`/code-graph` · `graph export`/`edge` · `graph impact` — đo trên
  zemory: `ui.ts` ← 10 file FE kèm route; soát 2026-08-09 sau khi `ui.ts` thêm tham số `also` —
  cạnh `api` sinh bằng khớp chuỗi route nên route mới TỰ vào graph, không phải sửa gì).
  **CÒN MỞ đúng một vế:** tầng `resolved` field-level cần
  **typed contract** (OpenAPI/tRPC) — chưa repo nào có contract; khi nào có thì thêm parser, và
  nhớ kết luận bên dưới: *codegen+tsc mới là KHOÁ CỨNG, graph chỉ là KÍNH SOI*. Hồ sơ phân tích
  gốc giữ nguyên bên dưới để tra lý do.
  *(Đề xuất gốc 2026-07-22:)*
  **Bối cảnh:** bài FB nhóm giới thiệu **Grapuco** (SaaS): AST toàn codebase → dependency/call/module graph + flow · **phát hiện phần bị ảnh hưởng khi API/schema/function đổi** · context cho agent qua MCP · chat-with-codebase · security scan · recommendation+priority. Bài toán nó nhắm = **2 người vibecode BE/FE lệch nhau**: BE thêm field / đổi schema → FE chưa cập nhật; FE đổi luồng đăng ký → BE giữ business rule cũ. User muốn hấp thụ **đúng phần mạnh nhất** (contract-impact BE↔FE) vào graph zemory, **KHÔNG** lấy phần LLM (chat/security/recommend — trái điều 6).
  **Insight then chốt (vì sao zemory hợp hơn Grapuco):** Grapuco phải **ĐOÁN** kiến trúc từ code trần; zemory **ĐỌC VAI TRÒ đã khai trong chuẩn 03** → suy cạnh khai báo mà không cần đoán. **Chuẩn 03 chính là "hệ nối" để graph nhìn được luồng BE↔FE** — đây là lợi thế không đối xứng, thứ Grapuco không có.
  **Cạnh mới cần thêm (hạng KHAI BÁO, 0-LLM, fail-open — mở rộng plan 13 §4, KHÔNG tạo capability mới, đúng điều 4/13):**
   - `frontend/client/` → `backend/src/api/` : seam FE-gọi-BE (slot-level, tất định từ 03 §4).
     *(slot FE đổi tên `api/`→`client/` ngày 2026-08-15 — xem `06_CHANGES`.)*
   - `backend/src/contracts/` (OpenAPI/proto/GraphQL-SDL) → node `endpoint` + `schema.field`, cạnh `field → endpoint → handler`.
   - `backend/src/store/` + `migrations/` → node `schema.field` (điểm BE đổi field).
   - `backend/src/shared/` (type dùng chung BE↔FE) → cạnh **`resolved`** khi 2 bên import chung type.
   - Ghép chuỗi: `store.field → contract.endpoint → frontend/client call → component/test` ⇒ `graph impact <field>` trả về **FE nào gãy** khi BE đổi field.
  **TRẦN — GHI RÕ để agent sau KHÔNG tưởng graph fix triệt để (3 tầng, theo điều 13):**
   1. Luồng **KHAI BÁO** (import · slot-seam · **contract typed**) → tự động, `resolved`/`declared`. Chuẩn 03 + typed contract cho không phần này.
   2. Luồng **SUY LUẬN** (FE gọi `fetch('/api/x')` chuỗi viết tay, KHÔNG codegen) → chỉ `inferred`/`textual`, **GẮN NHÃN**, KHÔNG giả dạng chắc chắn. Đây là **TRẦN, bằng Grapuco** — chuẩn 03 thu hẹp chỗ tìm chứ **không xoá được** việc phải match URL.
   3. Luồng **NGỮ NGHĨA** (business rule · thứ tự bước đăng ký · field giờ bắt buộc) → **NGOÀI TẦM MỌI GRAPH, mãi mãi**. Đây chính là lý do "vá BE/FE hoài không hết": đang lấy công cụ CẤU TRÚC đánh vào bài toán NGỮ NGHĨA. Grapuco cũng không giải được lớp này dù marketing gộp chung.
  **"Fix triệt để" KHÔNG bằng graph (ghi để khỏi kỳ vọng ảo — bài học plan 13 §7 counterfactual):** đòn thật cho tầng 1 = **contract-first + codegen 2 đầu** (OpenAPI→openapi-typescript/orval · tRPC share type trực tiếp · GraphQL-codegen) → **`tsc` biến drift thành LỖI COMPILE** (khoá cứng, không phải "phát hiện sau"). Tầng runtime/một-phần-ngữ-nghĩa = **contract test (Pact/consumer-driven)**. Graph = **KÍNH SOI** blast-radius; codegen+tsc = **KHOÁ CỨNG**. Repo chưa có typed contract → **việc số 1 là dựng contract, KHÔNG phải graph**.
  **Điều kiện để graph mạnh THẬT:** repo phải (a) bám chuẩn 03 để đọc vai + (b) có typed contract để field-level lên `resolved`. Thiếu (b) → phần BE↔FE field-level chỉ `inferred`, không hơn Grapuco.
  **Protocol đo Grapuco TRƯỚC khi tin/hấp thụ (như đã đo CALM plan 13 §9 — KHÔNG tin marketing):** Grapuco là SaaS, không có code để mổ ⇒ **dùng thử trên 1 repo BE/FE THẬT**, **cắm 1 drift đã biết** (đổi tên/xoá 1 field schema), đo: (i) có chỉ ĐÚNG FE component/call/test đụng không · (ii) có báo NHẦM (false-positive) không · (iii) xuyên HTTP boundary nó match `resolved` hay chỉ đoán chuỗi. Lưu ý: tracing xuyên HTTP boundary là chỗ mấy tool này hay RÒ nhất; con số kiểu "29–241×" (CALM) là so với đọc-cả-file, KHÔNG phải so grep.
  **KHÔNG hấp thụ (trái điều 6 — zemory 0-LLM):** chat-with-codebase · security scan · recommendation LLM.
  **Chỗ sẽ code khi user chốt:** thêm parser contract (OpenAPI/GraphQL) + resolver FE-call vào graph engine (`backend/src/memory/graph*.ts`), hạng cạnh mới trong `graph export` (bump schema v3), `graph impact` in thêm seam BE↔FE (kèm nhãn confidence). Cross-repo (BE repo + FE repo tách) join bằng contract làm khoá qua `graph export --all`. Sau khi user duyệt design đủ sâu → graduate spec sang **plan 13 §4** (plan = spec đã chốt; TODO chỉ giữ đề xuất).

- ✅ **(advisory) `docs_template/*/skills/write-docx/reference/*` cố ý viết ASCII không dấu**
  (code Python + comment trong khối lệnh). Phép dò mặt ⑪ đếm 18 hit ở đó — **không phải lỗi**,
  nhưng nếu sau này muốn cổng-hoá phép "thiếu dấu" thì phải khai miễn cho các file đó trước.
- ✅ **(advisory) `policy.json` bản ship cowork KHÔNG có cổng NỘI DUNG** — `template-parity`
  chỉ so byte `guard.cjs` (0 dòng nhắc policy), manifest chỉ đếm dòng (46). Chiều 20/08 nó vừa
  được sửa TAY — đúng khuôn sự cố guard.cjs 11/08 mà gate byte-parity sinh ra để chống. Đề xuất:
  so 2 khoá `secret_names`/`secret_allow` với bộ sinh (KHÔNG so cả file — cowork khác
  `protected_write`/`flags_dir` có chủ đích). **User ĐÃ GẬT 2026-08-21 — LỊCH SAU-EMBED bước 2.**
- ✅ **`todo verify` giơ 8 cờ advisory** (1 "nghi đã xong" dòng ~360 i18n + 7 "code mới hơn sổ")
  — đa số là dòng lịch sử bị file sửa sau vì việc KHÁC; phán từng dòng khi chốt phiên, đừng xoá vội.
- ✅ **`ui-ux-pro-max` mới VENDOR + INDEX, chưa có ca ÁP DỤNG thật nào** — chưa dùng nó thiết kế/nắn UI nào của zemory.

- ✅ **(advisory — bẫy báo oan MỚI cho mặt ⑪) Bộ dò mojibake báo oan trên chính file DẠY về
  mojibake.** Đo: 6/245 file trúng, kiểm tay **0 thật** — tất cả là `02_RULES §Ngôn ngữ` nêu ví dụ
  ``Ã¡ · â€ · ï»¿`` và `skills/audit` khai đúng cái mẫu đó. Muốn cổng-hoá thì phải miễn chuỗi nằm
  trong backtick. Thêm vào danh sách bẫy của mặt ⑪ (nay là bẫy thứ 6).
- ✅ **(advisory) Phép dò EXPORT MỒ CÔI của lượt này TRƯỢT ca tự-kiểm HAI LẦN ⇒ mặt ③ vế đó CHƯA
  ĐO.** Lần đầu cho 402/402 "mồ côi" (vô lý); kiểm chéo bằng grep thì `cmdInit` được gọi 2 lần trong
  `cli.ts`. Bản sửa vẫn trượt ca tự-kiểm nên tôi **không ghi số nào**. Bản đo hợp lệ gần nhất: 21/08
  — **395 export đều có người gọi**. *Ghi ra vì đây đúng là giá trị của luật ⑥/⑦: ca tự-kiểm đã chặn
  tôi khỏi đưa một con số sai vào báo cáo audit, hai lần.*
- ✅ **(ĐÃ CHẠY PHÉP THỬ điều 15 — 2026-08-21, user hỏi "40 ngôn ngữ opt thêm được không") —
  KẾT LUẬN: cơ chế opt-thêm ĐÚNG là rẻ, nhưng 36 grammar sẵn có KHÔNG khớp nhu cầu; SQL bị
  chặn ở wasm.** Số đo:
  · `node_modules/tree-sitter-wasms` (Unlicense, đã cài) mang **36 grammar** (50 MB), zemory
    mới nạp 4. Nạp thử 5: **bash/java/go/rust LOAD OK cùng ABI 0.20.8 · ruby LOAD FAIL** —
    fail-open đỡ được, đúng trực giác user "không hại chất lượng" ở tầng nạp.
  · Nhưng "hỗ trợ một ngôn ngữ" là **BA tầng**, grammar chỉ là tầng 3: ① `SRC_EXT` bộ quét
    file (hiện chỉ ts/js/py — file .java/.sql còn không thành node) · ② cạnh import (regex
    per-language) · ③ walker symbol (bash/java/go tình cờ khớp tên node hiện tại; **rust khớp
    0**; mỗi ngôn ngữ cần mapping riêng).
  · **Rủi ro chất lượng THẬT nếu mở tầng ① mà thiếu tầng ②:** node mới toàn cô lập ⇒
    `isolated_pct` hiện **29,4% / trần 30%** — đỏ oan gần như chắc chắn.
  · **Estate đối chiếu:** 36 grammar ∩ nhu cầu thật ≈ ∅ (không java/go/rust); thứ CẦN là
    **SQL (60 file)** + PS1 (15) thì gói KHÔNG có; `@derekstride/tree-sitter-sql` (MIT) npm
    **không kèm wasm prebuilt** — muốn dùng phải tự build emscripten + khớp ABI 0.20.8.
  **Việc còn mở (chờ user chốt có đáng không):** một buổi build-thử wasm SQL + mapping 3 tầng
  + parse thử trên chính 60 file thật, cổng đạt = ERROR-node thấp + fitness không đỏ oan
  (thêm ngôn ngữ mới thì node của nó phải được miễn/điều chỉnh trần isolated). Không gấp.

- ✅ **(advisory) Phép "TỪ LẶP LIỀN" chưa đủ chính xác để thành cổng.** Đo 107 file: 15 hit, kiểm
  tay thì **0 thật** — toàn láy đôi («song song» · «bắt đầu đầu trang»), ô bảng cạnh nhau, hoặc
  chữ bị **dán liền sau khi bỏ code/đường dẫn** («scan known/deep scan»). Muốn thành cổng phải
  parse theo Ô BẢNG và có từ điển láy; chưa đáng, giữ ở dạng soi tay trong skill.
- ✅ **(advisory) Phép "endpoint chết" cần kể CẢ nguồn CLI-gọi-qua-HTTP.** Lượt đo đầu báo
  `/gate-acquire` · `/gate-release` là "không ai gọi" — sai: chính CLI gọi chúng qua HTTP
  (`commands/memory.ts`). Đã kể trong script đo; nếu cổng-hoá thì đừng bỏ nguồn này.

**Đã loại (ghi kèm lý do):** · *"156 chỗ chữ Việt trong HTML"* — báo oan: chữ Việt trong markup là
ĐÚNG khi phần tử có móc i18n · *"46 khoá i18n chết"* — báo oan: khoá truyền qua BIẾN
(`doc:'f.doc.x'` → `t(item.doc)`), thật ra **0** · *"20 phần tử thiếu nhãn"* — báo oan: nhãn nằm ở
thẻ CON hoặc `<label>` bọc ngoài; thật ra **2**, đã vá.

- ✅ **(advisory) Nhánh XOÁ của guard quét CẢ DÒNG — tên `.env` nhắc trong echo bị vạ lây.**
  Đo: `rm build.log && echo "check prod.env"` ⇒ CHẶN (không flag — nhóm secret); trong khi
  `rm .env.example` QUA (allow ăn đúng) và `rm build.log` QUA. Cùng họ đúng bug nhánh git đã
  vá `[2026-08-20d]` — sửa là quét theo SEGMENT như bên git. **User ĐÃ GẬT 2026-08-21 — nằm ở LỊCH SAU-EMBED bước 2, đừng hỏi lại.**
  *(Ghi nhận không sửa: `rm test.env` bị chặn là chặn phía an toàn có chủ đích — xoá secret là
  bất khả đảo; giữ.)*
- ✅ **(⑥) `/memory-status` — ĐÃ TRUY RA + vá một nửa 2026-08-13.** Bốn phép quét toàn bảng
  gánh gần hết thời gian (đo lúc job embed đang chạy, nên là cận trên): `SUM(LENGTH(content))`
  **1.615 ms** · `vectorCoverage` **1.391 ms** · `vectorRemaining` **994 ms** · `vectorCount`
  **194 ms**; toàn bộ phần còn lại ~100 ms.
  **Vá:** `vectorCoverage()` bị gọi THẲNG trong `dashboardMemory()` nên trả giá mỗi lượt
  `dashCache` (60 s) hết hạn, trong khi ba cái kia đã nằm sau TTL 300 s. Nay gộp vào
  `heavyStats()` — **con số y hệt, chỉ đổi tần suất tính**. Cổng mới trong `app-ui.test.mjs`
  (đột biến chứng minh đỏ được) canh mọi aggregate mới phải vào `heavyStats()`.
  **CÒN LẠI — lượt LẠNH (mở màn) vẫn trả trọn ~4 s.** Hai điều chưa làm, ghi rõ để không ai đọc
  thành đã xong: ① **chưa đo lại lúc máy rảnh** — đo hôm nay lệch 3× giữa hai lượt cách nhau vài
  phút vì job embed tranh CPU/I-O, nên **mọi con số tuyệt đối ở trên chưa đáng tin** · ② đường
  sửa lượt lạnh **KHÔNG phải warm-up đồng bộ lúc daemon khởi động** — nó chặn event loop nhiều
  giây, đúng cơ chế đẻ ra bug "hai daemon" (`ui.ts` §probeZemoryUi). Đường đúng: đẩy phép quét
  sang tiến trình con như `deepSearchChild`, hoặc trả payload nhẹ trước + số nặng bổ sung sau
  (vế sau đụng thiết kế UI ⇒ phải trình duyệt).

**⚠ CÒN LẠI CHƯA CHẠY — không được đọc thành "sạch":**
· **④ FE↔BE — hai vế treo nay ĐÃ CHẠY 2026-08-13:** ① *neo test* — **13 neo trỏ vào
  `backend/src/`, 0 neo trỏ vào file chết**. *Phép đo đầu báo 3 "mồ côi"
  (`commands/harness|hook|memory.ts`); kiểm chéo thì cả ba được `await import()` **động** trong
  `cli.ts` — báo oan vì phép quét chỉ bắt `from "…"`. Ai đo lại phải nhớ vế import động.*
  ② *i18n hai chiều* — đã đo, **90 chuỗi hardcode**, xem mục i18n bên dưới. Vế endpoint parity
  vẫn như cũ (2 false-positive `/migrate` · `/nav-cost`, KHÔNG mở lại).
· **⑥ Bề mặt sống — chạy MỘT NỬA:** đã gọi endpoint thật (bảng trên), **chưa mở app nhìn tận
  mắt** — theo skill, gọi endpoint KHÔNG thay được việc nhìn.
· **⑧ Rà license — ĐÃ CHẠY 2026-08-13, quét CẢ CÂY 190 gói** (không chỉ 14 dependency trực
  tiếp: license xấu ở tầng sâu vẫn đi kèm sản phẩm). Phân bố: MIT 127 · Apache-2.0 20 ·
  BSD-3 15 · ISC 13 · BSD-2 6 · còn lại lẻ. **2 gói cần biết, cả hai KHÔNG chặn:**
  · `@img/sharp-win32-x64` — `Apache-2.0 AND LGPL-3.0-or-later` (nhị phân đóng kèm **libvips**,
    LGPL). Là **optional dep của `@huggingface/transformers`**, zemory **không import `sharp`**
    ở đâu cả. Nếu đóng gói phân phối thì hoặc loại nó, hoặc giữ notice LGPL.
  · `@nativewindow/webview-win32-x64-msvc` — **không khai `license`**; nhưng gói cha
    `@nativewindow/webview` khai **MIT**, cùng repo cùng version ⇒ chỉ là thiếu field ở gói
    nhị phân theo nền tảng. Đây là optional dep TRỰC TIẾP, dùng thật ở `platform/window.ts`.
  ⚠ **Bài học phép đo (chính lượt này):** bản đầu tách `OR` và `AND` bằng CÙNG một regex ⇒
  `Apache-2.0 AND LGPL-3.0-or-later` **lọt qua**. `OR` = chọn một vế hợp lệ là đủ; `AND` = phải
  hợp lệ MỌI vế. Sửa xong mới lòi ra gói thứ hai — trước đó báo "chỉ 1 gói".
Ngoài ra **mặt ① chạy khi daemon đang có job nền** ⇒ xanh nhưng không phải điều kiện sạch.

- ✅ **Nợ cổng audit — CÒN ĐÚNG MỘT vế: ⑦ quét LỊCH SỬ git** (hiện chỉ quét cây HEAD; secret đã lộ thật 04/08). Ba vế kia đã trả: ⑧ license+clone 15/08 · ⑨ diễn tập phục hồi 24/08 (`vecship-chunks` vòng khép kín) · ⑩ ma trận guardrail ĐÃ trong gate chính (7 file `guard-*.test` chạy trong `npm test`, đo 24/08).
  cố THẬT mà chưa có cổng nào":
  · ✅ **⑧ Phụ thuộc & license — TRẢ XONG 2026-08-15 (user ra lệnh làm):** ① cổng license
    `backend/test/license-gate.test.mjs` (3 ca, tự vào `npm run check` qua glob) — quét CẢ CÂY
    190 gói, parser SPDX xử ĐÚNG OR/AND (ca AND-trap `Apache-2.0 AND LGPL-3.0-or-later` nằm trong
    bộ tự-kiểm), 2 ngoại lệ đích danh có test canh "ngoại lệ phải còn đúng sự thật"; đột biến
    chứng minh đỏ được (gỡ Apache-2.0 ⇒ 2 đỏ) · ② `npm run check:clone`
    (`backend/scripts/clone-check.mjs`, CỐ Ý ngoài gate mặc định — cần mạng, gate chậm là gate bị
    bỏ qua) — đo thật cùng ngày: clone 2,0s → prebuilds 0,2s → install 23,9s → build 6,7s →
    smoke `zemory 1.5.21` ⇒ **máy trắng dựng được**. Không pipe qua `tail` (bẫy nuốt exit code).
  · **⑨ Diễn tập phục hồi định kỳ**: "dữ liệu lành" KHÁC "dựng lại được"; mãi 11/08 mới thử lần đầu
    và đúng lần đó lộ ra kênh mang đi vứt sạch lớp vector.
  · **⑦ Quét LỊCH SỬ git** (hiện chỉ quét cây HEAD) + canh file lớn trước khi push.
  · **⑩ Đưa ma trận guardrail vào gate chính** thay vì chạy tay như hôm nay.

- ✅ Đã đối chiếu bản "Graph Engineering" (user gửi 2026-07-27) với graph mình. **Khoảng trống lớn nhất còn lại: KHÔNG có phía WRITE** — worker đọc được graph nhưng không publish phát hiện ngược lại kèm `run_id`/provenance; và **không có lớp công việc** (không node `AgentRun`/`Claim`/`Evaluation`). Chấm theo thước của tài liệu, zemory đạt *artifact · source · graph path*, thiếu *objective · plan · evaluator decision · execution record*. **KHOAN xây** — chính tài liệu cảnh báo "đừng thêm knowledge graph chỉ vì hệ có agent"; graph hiện đang kiếm đủ tiền nuôi thân ở vai cấu trúc + định tuyến.

**🚫 ĐÃ LOẠI — false-positive (giữ lại để phiên sau khỏi báo lại)**
`/set-` "404" = chuỗi động `'/set-'+nm` · `data-act="recall"`/`sysrecheck` "không handler" = có, qua `closest('[data-act=…]')` · `share/share.key` committed = **KHÔNG còn là false-positive** — repo hoá PUBLIC nên giả định "keep repo private" mà quyết định đó dựa vào đã sai; chìa đã xoay + gỡ khỏi git 2026-07-29 · `/cockpit` "gãy" = không gãy (lúc đo daemon đang tắt) · `/nav-cost` `/gate-acquire` `/gate-release` `/sync` `/migrate` "dead" = CLI/surface khác dùng.

- ✅ **model-routing theo task** — idea-only. *(Soát 2026-08-02: tiền đề cũ "ĐỤNG điều 6, KHÔNG tự mở" đã HẾT HIỆU LỰC — điều 6 nới sang "HẠN CHẾ gọi LLM" ngày `2026-08-02b`. Nay không còn bị chặn thẳng, nhưng phải qua thứ tự ①script → ②agent liên kết → ③model + ích lợi đo được + user chốt.)*
- ✅ (Nếu cần quên tuyệt đối) Source-transcript privacy/tombstone: xóa/redact transcript gốc của agent host hoặc ghi tombstone chống whole-file adapter re-ingest lại dữ liệu đã quên.
- ✅ (TẦM NHÌN, tuỳ chọn — không bắt buộc v1) Session digest **B agent-authored**: khi recall chạm phiên, agent hiện tại đọc transcript viết đè `kind=agent` (có anchor). Bỏ B1 "agent tự viết lúc kết thúc". KHÔNG để zemory tự gọi LLM API. Spec: `docs/plan/06_digest.md`.
- **(user nêu 2026-07-20) Skill CHUNG vs RIÊNG — ĐÃ CHỐT: cấu trúc HIỆN TẠI chính là câu trả lời**
  (user 2026-08-05: *"cấu trúc hiện tại là đã chốt và build còn gì"*). Tức: **giữ `04_SKILLS` làm kho
  duy nhất** (7 skill, 4 mục, trần 60 dòng), playbook ở `.claude/skills/<tên>/`, skill ngoài vendor ở
  `external/skills/` — **KHÔNG dời skill chung về `02_RULES`**. Hồ sơ tranh luận cũ giữ bên dưới, KHÔNG
  hỏi lại.

<details><summary>Hồ sơ tranh luận (đã chốt, giữ để tra)</summary>
  > ⚠ **Đo lại 2026-08-05** (user bắt: *"làm lâu rồi mà, ko check code thật à?"*): mô tả cũ nói
  > *"04 ship 3 skill generic"* — **SAI, giờ là 7** (`grill` · `session-close` · `reconcile` ·
  > `conform` · `audit` · `read-office` · `write-docx`). Và `04_SKILLS` đã được **dọn đúng vai**:
  > 4 mục (luật dùng · danh mục · skill NGOÀI vendor · thêm skill), có **trần 60 dòng**, playbook
  > đã ra `.claude/skills/<tên>/SKILL.md` — tức phần "đừng để playbook bò về 04" ĐÃ XONG.
  **Phần CHƯA làm, đúng nguyên bản câu hỏi:** `04_SKILLS` (zemory) và `docs_template/*/04_SKILLS`
  vẫn có **cùng 4 heading, KHÔNG phân tầng** — không chỗ nào nói skill nào *ship từ template* (repo
  không sửa tay) vs skill nào *repo tự thêm*. Hệ quả: `sync` gap-fill không phân biệt được, người
  đọc không biết cái nào là chuẩn. **Đề xuất giữ nguyên:** 2 TẦNG trong `04` (`## Skill chuẩn (ship
  từ docs_template)` vs `## Skill riêng của <PROJECT>`), KHÔNG dời về `02_RULES` — 02 vừa dọn sạch
  playbook 2026-07-18, dời ngược là tái phạm.

</details>

- ✅ **Cấu trúc `external/skills/` — user để ngỏ:** giữ 1 tầng `skills/` (kho enumerate được) hay **phẳng** `external/<repo>/` (đúng luật "đừng tạo cấu trúc chưa có nhu cầu" vì hiện `external/` chỉ có skill). Đổi = 1 lệnh `mv` + 3 dòng docs.
- ✅ **Lệnh `zemory skill add <repo-url>`** (clone vào kho đúng khuôn) — ý tưởng nêu ra, chưa quyết.
- *(Skill chung vs riêng — **ĐÃ CHỐT 2026-08-05**: giữ cấu trúc hiện tại; xem §Ưu tiên kế tiếp.)*

- ✅ RAG còn cần chốt khi mở rộng sang **data chính**: chunk doc dài cho docs/knowledge/code; data chính dùng chung `global_memory.db` (cột `kind`) hay store tách rồi fuse.

- ✅ **ADAPTER HOST MỚI** (Gemini/Antigravity · Cursor · Hermes) — chỉ làm sau khi có fixture dữ
  liệu THẬT. *(Đo 2026-08-07: `backend/src/memory/adapters/` có chatgpt · claude · claudeweb ·
  codex · continue · cowork · lmstudio — ba host trên đúng là CHƯA có.)*
  ⚠ **Vế "Code map AST" của mục này ĐÃ XONG, tách ra khỏi đây** *(sổ viết 28/07, tức viết SAU khi
  code đã có từ 22/07)*: AST → `graph-symbols.ts` · hash incremental → `graph-cache.ts` · import
  graph/blast-radius → `zemory graph impact` · fallback khi thiếu parser → `graph.ts` (regex
  `symbols` vẫn đứng). Giữ nguyên chữ "chỉ làm sau khi có fixture THẬT" cho phần adapter.
- ✅ Hook harness cảnh báo vi phạm docs nhưng không tự bypass permission host.

- ✅ VS Code status bar chỉ đọc status API chung.
- ✅ Toggle provider/adapter có validation conflict và rollback config.

- ✅ **Đuôi còn lại của mục trên: XOAY token npm** — token publish từng nằm trần trên Drive
  (nay ở `~/.npmrc`). **Agent KHÔNG tự làm được** (2026-08-15, đã xét khi user giao "tự làm"):
  revoke + cấp token mới đòi đăng nhập tài khoản npm của user. Việc 2 phút của user:
  npmjs.com → Access Tokens → revoke token cũ → tạo mới → dán vào `~/.npmrc`. Không gấp —
  gói chưa publish, token cũ chỉ nguy hiểm nếu tài khoản Drive của user bị lộ.

- ✅ **② TRẦN POOL — `@40` mới 46% (108 nhãn).** Hơn nửa số câu đáp án **không vào nổi pool**, nên
  mọi lớp xếp-lại đều vô nghĩa với phần đó (bench tự đo: chỉ **15/108** câu có đáp án trong pool mà
  ngoài top-10). Đây là chỗ duy nhất đáng chi giờ máy. Ứng viên: **ColBERT/late-interaction** (hồ sơ +
  điều kiện mở lại ở §🔄 ColBERT — kẹt ở model VI license sạch, đĩa 10–30×).
- ✅ **(⑨) Backup local nằm CÙNG Ổ với kho** (`data/backups/`, 5 bản × ~1,8 GB). Mất ổ D là mất
  cả hai; bù duy nhất là kho chính trên Drive, mà nó **không chở FTS/digest** (dựng lại được,
  vài phút — nên là rủi ro THỜI GIAN, không phải mất dữ liệu). Ghi để đừng tưởng đã có 2 lớp.
- ✅ **i18n HỤT — 90 → 74 chuỗi (2026-08-13, đã dọn phần RẺ).** 16 chuỗi vốn ĐÃ CÓ key sẵn,
  code chỉ quên gọi `t()`: `system.js` 11→0 · `gm.js` 2→0 · `harness.js` 5→3 · `sources.js`
  10→9. **74 còn lại KHÔNG cùng loại — đừng ước lượng như nhau:** 45 là nội dung *tài liệu chuẩn
  cấu trúc* trong `shell.js` (dịch = viết lại tài liệu), 10 là chữ nhúng trong chuỗi HTML ở
  `graph-panel.js` (phải tách chữ khỏi markup trước). Trần cổng đã hạ theo số đo.
- ✅ **i18n HỤT — ĐO ĐƯỢC + có cổng KHÔNG-LÙI 2026-08-13.** Trước chỉ có danh sách triệu chứng;
  nay có số: **90 chuỗi tiếng Việt hardcode** trong `frontend/scripts/` (ngoài `chrome.js` — nơi
  giữ hai dict): `shell.js` 45 · `system.js` 11 · `graph-panel.js` 10 · `sources.js` 10 ·
  `graph-render.js` 6 · `harness.js` 5 · `gm.js` 2 · `recall.js` 1.
  **Đã sửa** phần lộ rõ nhất ở trang chủ: `relTime()` (ô Last Sync: `chưa sync` · `7 giờ trước`)
  và 4 pill trạng thái hệ thống (`đủ`/`chờ`/`phiên`/`chưa build`/`sẵn sàng`/`đã link`/`chưa
  link`) — thêm 6 key vào **cả hai** dict.
  **Cổng `i18n-ratchet.test.mjs` (3/3, cả ba đột biến đỏ được):** ① số hardcode không được tăng
  ② gỡ được thì phải HẠ trần (trần treo cao hơn thực tế thì chỗ vừa dọn lặng lẽ quay lại được)
  ③ mọi key phải có ở CẢ HAI dict — `t()` fallback về vi nên thiếu bản EN **không báo lỗi**, nó
  chỉ lặng lẽ hiện tiếng Việt giữa giao diện tiếng Anh.
  *Vì sao không đặt trần 0 ngay: gate đỏ triền miên là gate bị bỏ qua — đúng luật 7 vừa phải
  sửa cho `guard`.* **CÒN LẠI 90 chuỗi**, gỡ dần rồi hạ trần.
  ✅ **i18n tầng BACKEND — XONG 2026-08-13.** `connections.ts` nay gửi kèm `detailCode` +
  `detailArgs` (mã + tham số) **BÊN CẠNH** `detail` — thêm chứ không thay, nên thứ gì đang đọc
  `detail` vẫn chạy y nguyên. UI ghép câu qua `connDetail()` theo ngôn ngữ đang bật, và dùng
  lại `relTime()` sẵn có thay vì đẻ cách tính thời gian tương đối thứ hai. Cổng
  `conn-detail-i18n.test.mjs` 4/4 canh **CẢ HAI ĐẦU** (backend quên gửi mã ⇒ UI lặng lẽ rơi về
  câu tiếng Việt; UI quên đọc mã ⇒ mã gửi lên chẳng ai dùng — cả hai đều không ném lỗi); đột
  biến ở từng đầu đều chứng minh đỏ được.
  ~~**i18n tầng BACKEND — nặng hơn, chưa làm.**~~ `memory/connections.ts` **sinh thẳng chuỗi
  tiếng Việt** rồi gửi lên UI (`${m} phút trước` · `kiểm lần cuối …` · `chưa kiểm lần nào` ·
  `store đã biết nhưng không còn trên đĩa` · `không có store trên máy này`). UI **không có cách
  nào dịch** vì nhận về câu đã ghép. Sửa đúng = trả mã + tham số (`{code, args}`) để UI ghép —
  đổi hình dạng payload, cần cổng riêng cho cả hai đầu.
- ✅ **Đo lại 2 mục dưới thước TƯƠNG ĐƯƠNG** (chưa làm, thước mới có thể đảo tiếp):
  ① cổng "không biết" — số ca âm không đổi, nhưng "mất bao nhiêu kết quả đang ở top-10" thì đổi.
  ② `vecMix` — bảng 09/08 cho thấy tắt nó thì `tool_result` MRR sập **0,209 → 0,074**, tức lớp đó
  sống gần như hoàn toàn nhờ nó; đáng xác nhận lại bằng thước tương đương.
- ✅ **Sao lưu NGOÀI máy — đã có MỘT phần:** bundle `.enc` trên Drive (baseline 289,7 MB + delta,
  auto-sync 05/08) phủ được phần NGUỒN; backup local 1,25 GB vẫn nằm **cùng ổ** với kho, và công
  embed 43 giờ chưa được bảo hiểm (bundle lean không chở vector) → sau tráo cân nhắc `export --full`.
- ✅ **RERANK: GIỮ, nhưng phải rẻ đi — đang đo cách cắt (user phản biện đúng 2026-08-03).**
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

- ✅ **Đo tốc độ embed/ngày — VẪN CHƯA có số ngày-thường sạch.** Mẫu cũ (07-12, mega-session) = 41 msg/phút, lệch. Rebuild plan 12 (27 giờ, 94k message tồn đọng) cho thấy tốc độ dao động 40–380 msg/phút tùy độ dài message, nhưng đó là backlog dồn cục, KHÔNG phải nhịp ingest hằng ngày. Việc còn lại: sau 1 ngày dùng bình thường (không rebuild), chạy `zemory memory embed --all` + bấm giờ cho SỐ MESSAGE MỚI TRONG NGÀY ĐÓ để ra phút/ngày thật; nếu >20 phút → cân nhắc q4 dtype (hỏi user). **(2026-07-17) ĐO THẬT xong:** backlog 10291 → clear hết ~3h ⇒ ~57–58 msg/phút (256d · q8 · máy CŨ). **⚠ Vế "cân nhắc q4" ĐÃ CHẾT (2026-08-05):** đo 5 dtype trên máy mới — q4 **chậm hơn** q8 1,8× và kém chính xác hơn, fp32 mới là nhanh nhất (xem `06_CHANGES [2026-08-05]`). **VẪN CÒN:** số ngày-thường đo lại SAU khi tráo 768+fp32 (tốc độ đổi hẳn: 1,26 s/chunk).

- ✅ **(ghi số, không phải việc mới) `isolated_pct` = 29,6% / trần 30%** (68/230 file) — làm phép
  tính: thêm **2 file cô lập** là vượt trần (`(68+k)/(230+k) > 0,30 ⇔ k ≥ 2`). Hiện KHÔNG chặn gate
  (`npm run check` không chấm fitness trên repo thật; test fitness chạy trên repo giả) — nên đây là
  thước sức khoẻ sát nóc, không phải gate đỏ. `/memory-status` lượt LẠNH đo lại: **20,3 s** (ấm
  3,7 ms) — số mới cho mục `[~] (⑥)` đang mở, KHÔNG phải hồi quy.

**Nghi vấn ĐÃ LOẠI — ghi kèm lý do, khỏi đào lại:**
· *"FE gọi route mà `ui.ts` không có (`/set-`)"* — **báo oan**: `system.js:110` ghép chuỗi
  `zPost('/set-'+nm+…)`, route thật đủ cả.
· *"31 neo test trỏ vào đường dẫn không tồn tại"* — **báo oan**: gần hết là fixture dựng trong repo
  TẠM (`conform.test` · `graph-standard.test`…), và ca `frontend/app.html` nằm trong **COMMENT** của
  `app-ui.test.mjs:132` — chính comment đó cảnh báo trước cái bẫy này. Neo thật là
  `../../frontend/pages/app.html`, có tồn tại.
· *"`policy.json` bản ship cowork đã lệch bộ sinh"* — **đo thì CHƯA lệch**: `secret_names` ·
  `secret_allow` · `key_read_block` **khớp**; `protected_write`/`flags_dir` khác **có chủ đích**.
  Cổng nội dung vẫn thiếu (mục cũ còn mở) nhưng hiện KHÔNG có drift.
· *"chìa lộ trong lịch sử git (`share/share.key`) còn hiệu lực"* — **đã xoay**: dấu tay hiện tại
  `e6fb0eff` ≠ `41d88e4d` (bản lộ, plan 16 §8).
· ⚠ **Hai phép đo ĐẦU của chính lượt audit này HỎNG LẶNG** (ghi vì đúng luật 5): bộ lọc đường dẫn
  của tôi viết `[\\/]frontend[\\/]` nên **không khớp đường bắt đầu bằng `frontend`** ⇒ báo *"0 route
  FE"* và *"0 neo test"* — nghe như sạch. Vá rồi mới có 49 route / 135 neo. Cùng ngày còn dính
  **hai lần** nuốt escape khi đưa regex qua shell — đúng bẫy sổ đã ghi, chữa bằng viết script ra file.

**CHƯA ĐO — không được đọc thành sạch:** ① gate ĐẦY ĐỦ `npm run check` (chờ job embed xong) ·
② mở app nhìn tận mắt (cần mắt người) · ③ `check:clone` (cần mạng) · ④ **diễn tập phục hồi** — lần
cuối 12/08, nay **9 ngày**, vẫn là nợ nặng nhất của plan 18 mặt ⑨, và mục BLOCKING ở trên làm nó
đắt hơn · ⑤ bench A/B plan 19 bước ③.

- ✅ **③ Lớp `tool_result` — yếu nhất mà ĐÃ tốn công nhúng.** 25 nhãn mới cho `@10` **20%**, MRR
  **0,070** (thấp nhất trong 4 lớp) trong khi lớp này chiếm ~28% kho và có vector 99,8%. Nó thiếu
  **trigram** (trigger v21 vẫn loại). Mở trigram cho nó = MIGRATION dựng lại bảng, **không tốn giờ
  nhúng** — và bge cho thấy lớp này CÓ dư địa (25→38% khi đổi không gian vector).
- ✅ **(ĐỀ XUẤT `02_RULES` — chờ user chốt) Hai luật ĐO rút ra từ phiên này.**
  ① *"N phép thử cùng thất bại theo CÙNG MỘT hướng ⇒ nghi THƯỚC, không nghi N thiết kế"* — tôi
  chạy **tám** giả thuyết, diễn giải tám lần như tám vấn đề kỹ thuật riêng, trước khi hỏi thước có
  đếm đúng không. ② *"Đo một cấu hình bằng bề mặt HẸP HƠN bề mặt sẽ chịu ảnh hưởng"* — dính **hai
  lần trong một phiên**: T3 chấm theo "cụm" thay vì tin TRẢ VỀ (báo +29% giả); hình phạt tool quét
  chỉ bằng `searchHybrid` nên làm hỏng đường nhanh của app (đã kịp commit rồi mới phát hiện).
- ✅ **HOOK ĐANG BẬT** (user bật lại 2026-08-05 chiều, sau cửa sổ gate). Hệ quả: **KHÔNG chạy
  `npm run check`** khi hook còn bật (60 test song song + hook ghi = tổ hợp hỏng kho 04/08);
  muốn chạy gate → user tắt (`zemory hook uninstall`) rồi bật lại — agent bị bộ lọc quyền chặn cả hai.
- ✅ **(ĐỀ XUẤT `02_RULES` — chờ user chốt) Luật: phép đo TỰ DỰNG phải khớp tham số của bench.**
  Phiên này tôi dựng probe thiếu `all: true` (bench luôn có) rồi rút 3 kết luận sai từ nó
  (`TOOL_DEMOTE` · `vecMix` · gộp-trùng). Luật đã có câu *"đo bằng bề mặt hẹp hơn…"* nhưng KHÔNG
  nói rõ ràng buộc "probe phải sao chép tham số của thước chính thức" — đó là chỗ tôi lọt qua.

- ✅ **④ Ô nhập "cách nói khác" trên UI** (T5 cho NGƯỜI dùng) — backend sẵn (`/memory-search?also=`).
  Nhưng đo 23/08: T5 **tụt** ở thước nghiêm ở cả hai kho, và biến thể viết MÙ không tái lập được lãi
  của §1.1b ⇒ nếu làm thì **phải kèm hướng dẫn tại chỗ**, ô trống là bẫy. Cần trình duyệt thiết kế.
- ✅ **(ĐỀ XUẤT — chờ user duyệt THIẾT KẾ) Ô nhập "cách nói khác" trên màn Recall.**
  Backend đã sẵn: `/memory-search?also=…` (lặp được, hoặc `alsoList=a|b`) tự chuyển sang đường
  sâu và truyền `--also` cho tiến trình con. Nhưng **chưa có chỗ bấm trên giao diện** — thêm
  phần tử UI là quyết định thiết kế, `02_RULES §Hành xử` bắt trình duyệt trước. Đây là đường
  duy nhất để NGƯỜI dùng được T5 trong app (agent thì đã có qua MCP `also[]`).

- ✅ **(ĐỀ XUẤT — chờ user duyệt THIẾT KẾ) Ô nhập "cách nói khác" — nay CÓ SỐ, nhưng RỦI RO hai chiều.**
  Đo 2026-08-10 (34 nhãn `prose`): biến thể **cụ thể** ⇒ `@10` 50 → **71%**, `@40` 65 → **79%**;
  biến thể **mơ hồ** ⇒ MRR 0,407 → **0,189**, tức **tệ hơn không gõ gì**. Nên ô này KHÔNG được là
  một ô trống — phải kèm ví dụ/hướng dẫn tại chỗ, nếu không người dùng gõ bừa là tự làm hỏng kết
  quả của mình. Backend đã sẵn (`/memory-search?also=`). Thêm phần tử UI ⇒ `02_RULES` bắt trình duyệt.

- 🔄 **ColBERT — HẾT BẾ TẮC MODEL 2026-08-15: BGE-M3 (MIT, VI sạch, chạy được trong stack).**
  Xem hồ sơ đo + phép thử kế ở mục 🔄 ColBERT trong «BÀN GIAO 2026-08-12 (chiều) → CHỜ USER».
  Đường `cc-by-nc` (jina) vẫn loại; bảng dò 2026-08-11 bên dưới giữ làm hồ sơ so sánh.
  ~~**ColBERT — DÒ XONG 2026-08-11, BẾ TẮC Ở MODEL (không phải ở kiến trúc hay giá).**~~
  Dò 100 model ColBERT phổ biến nhất; **đúng HAI cái biết tiếng Việt**, và chúng chia nhau hai
  nửa của vấn đề:

  | model | license | tiếng Việt | ONNX | runtime hỗ trợ? |
  |---|---|---|---|---|
  | `antoinelouis/colbert-xm` | **MIT** ✅ | có (1/81) | ✗ | ❌ nền **XMOD**, `transformers.js` KHÔNG có |
  | `jinaai/jina-colbert-v2` | **cc-by-nc-4.0** ❌ | có | ✅ | ✅ nền XLM-RoBERTa |
  | `LiquidAI/LFM2-ColBERT-350M` | other | ❌ 8 thứ tiếng, KHÔNG có VI | ✗ | — |
  | `answerai-colbert-small-v1` · `colbertv2.0` · mxbai · NeuML | MIT/apache ✅ | ❌ chỉ EN | ✅ | ✅ |

  **Đo được vì sao model tiếng Anh vô dụng ở đây** — cùng một câu, tokenizer cắt ra:
  `answerai` → `đ ##oi k ##hun ##g cho tu cu ##a so …` (24 token, **MẤT DẤU**, vocab BERT-EN 30.522)
  `jina`     → `đổi khung chờ từ cửa sổ rời sang widget con …` (16 token, **nguyên vẹn**)
  MaxSim khớp ở mức TOKEN, nên token vô nghĩa thì phép khớp là nhiễu-với-nhiễu. Thử `answerai`
  xếp lại top-40: MRR **0,476 → 0,170** (−64%), **1.784 ms/lần mã hoá** ⇒ 15% kho ≈ 15,9 giờ.
  ⚠ Con số −64% đó **KHÔNG đo ColBERT**, nó đo một model không đọc được tiếng Việt.

  **CẦN USER QUYẾT:** kho này dùng **cá nhân/nội bộ** hay có tính **thương mại**? `cc-by-nc-4.0`
  cấm thương mại. Weight tải lúc chạy nên zemory vẫn Apache-2.0 sạch, nhưng nếu dùng cho việc
  có tính thương mại thì đó là vi phạm của NGƯỜI DÙNG — không tự bật thay user.
  Đường sạch còn lại: tự chuyển `colbert-xm` sang ONNX **rồi gọi thẳng `onnxruntime-node`** (bỏ
  qua tầng dựng model của transformers.js) — vướng XMOD có adapter theo ngôn ngữ, cần `lang_ids`,
  là dự án nhỏ chưa chắc kết cục.
  ⚠ **Nhớ TRẦN trước khi chi giờ:** bench đo chỉ **6–8/68 câu** có đáp án trong pool mà ngoài
  top-10 ⇒ ở vai *xếp lại* mọi reranker chỉ có ngần ấy dư địa. Đáng chi chỉ khi dùng ở vai
  **lấy ứng viên** — mà vai đó cần chỉ mục đa-vector, đắt gấp bội.

- ✅ **(ĐỀ XUẤT — chờ user) Cờ `--no-window` cho `zemory ui`.** Hiện lệnh LUÔN bật cửa sổ app thật
  lên desktop — đúng cho người dùng, sai cho smoke-test/CI (sự cố 3 cửa sổ rỗng 06/08 đêm,
  `[2026-08-07b]`). Một cờ nhỏ: dựng daemon + serve, bỏ bước mở window. Chưa làm vì là feature mới.

- ✅ **(chờ user) Báo các repo khác đã cắm guard tự sinh lại** — `PBI_*`, SasinFlow, SasinHarvest,
  SasinInfra… Không tự sang sửa (`02_RULES §Phạm vi project`); repo báo cáo nói phiên bên đó sẽ tự chạy.
- ✅ **(ĐỀ XUẤT `02_RULES` — chờ user chốt) Bản lùi tráo-kho có HẠN DÙNG.** Mỗi lần tráo kho
  sinh một bản lùi ⇒ phải ghi NGÀY KHAI TỬ ngay lúc tạo: chết khi hệ mới qua bench trên kho thật
  + backup ngày xoay đủ vòng phủ nó (~5 ngày). Không có luật này thì mỗi đợt nâng cấp đẻ một xác
  1–2 GB nằm vĩnh viễn (bằng chứng: xác 256d nằm đúng 7 ngày sau khi hết vai, phải soát tay mới ra).
- ✅ **(chờ user) Guard PreToolUse thêm ~650 ms MỖI tool call** — đo 2026-08-07: Bash cho qua
  652 · Bash bị chặn 734 · Read 660 · Write 437 ms (p50, đo TRONG lúc embed chạy nên là cận
  trên). Vài trăm tool call/phiên ⇒ cỡ 1–2 phút. Không phải lỗi, là **chi phí cần quyết**: có
  thu hẹp `matcher` trong `.claude/settings.json` không (vd bỏ `Read` — nhưng mất chốt chặn đọc
  file khoá trực tiếp). Đường gỡ hoàn toàn: xoá `.claude/settings.json` của repo.
  ⚠ **Guard chỉ ăn TỪ PHIÊN SAU** (hook nạp lúc mở phiên). Đo 07/08: `.allow-push` vẫn còn
  nguyên sau khi push ⇒ phiên đó guard chưa gác. Từ phiên tới `git push` sẽ bị chặn tới khi
  user duyệt; flag đã tự dọn, KHÔNG để lại sẵn.
  ❌ **SỐ ĐÃ CHẾT** — nay version là **1.5.19**, tag `v1.2.0` không còn nghĩa gì. Repo vẫn chỉ có
  3 tag mốc-trước-refactor. *Việc thật nếu muốn: đặt tag theo release hiện hành, user quyết.*
  ~~**Chưa tạo git tag `v1.2.0`.**~~ Repo mới có tag dạng mốc-trước-refactor, chưa có tag
  version nào — không tự tạo tiền lệ mới. Một lệnh là xong nếu user muốn.
- ✅ **`/session-raw` (đọc transcript gốc) — CHƯA làm, chờ user quyết**: chỉ bù được **4,18%** tin bị clip + khối `thinking` bị bỏ lúc ingest; và với session **sync từ máy khác thì file không có ở máy này** (`ingest_state` toàn đường `C:\Users\Zyro\...`) ⇒ phải fail-open về DB. ROI thấp, nêu ra để user chốt chứ không tự làm.
- **`adapters` — ĐÃ CHỐT, không còn là câu hỏi** *(soát bằng code 2026-08-05)*: `03_STRUCTURE §4`
  dòng 201 khai rõ *"adapter theo host/nguồn → `backend/src/<domain>/adapters/` — slot LỒNG trong
  domain, cùng khuôn với `graph/`"*. Tức đã chọn **domain-internal**, và `conform` xanh với cấu
  trúc đó. Giữ dòng này làm hồ sơ, không phải việc.
- ✅ **(chờ user, việc ở repo khác) SasinFlow còn tồn đọng 9 entry changelog:** 9 entry 07-14→07-16 chỉ nằm trong `.md`, DB không có (tôi xóa khi khôi phục theo lệnh user). Với code mới **không mất được nữa** (CRLF đã vá + render salvage). Theo **FILE WINS**: 9 entry đã nằm trong `.md` (nguồn) nên coi như đủ; DB chỉ là index search, dựng lại từ file khi cần. (`docs sync` đã gỡ 2026-07-16.) KHÔNG tự sửa repo đó (`02_RULES §Phạm vi project`).
- ✅ **`01_CONSTITUTION`: KHÔNG gộp §Mục đích với §Điều khoản (user hỏi, agent trả lời 2026-07-26 — chờ user xác nhận đóng).** Đã đo: riêng zemory có **45 cạnh `references` trỏ vào `hp:N`**, cộng SasinHarvest 14 + SasinFlow 11 ⇒ **~70 trích dẫn "điều N" xuyên docs**. Gộp = đánh số lại = **hỏng cả 70 trích dẫn**, và `06_CHANGES` cấm sửa entry lịch sử nên không vá ngược được. Hai mục cũng khác BẢN CHẤT: §Mục đích định nghĩa zemory LÀ GÌ (+ phi-mục-tiêu), §Điều khoản là luật ĐÁNH SỐ được trích dẫn khắp nơi. **Nỗi lo "gộp sợ tràn/bể UI" không được giải bằng việc gộp** — độ dài file y nguyên; thứ thật sự trị là lớp graph vừa dựng (điều N thành node, có legend + bộ lọc + bấm nhảy) thay cho việc cuộn một file dài. *(Bẫy parse hai-list-đánh-số đã trị bằng cắt đúng section — không phải lý do để gộp.)*
- ✅ **(Graph — plan 13 §8) Loại lỗi nào build TRƯỚC?** Đã trình 8 loại; user CHƯA chọn. Ba nhóm: (a) link gãy + orphan (docs, rẻ, làm ngay được) · (b) **blast-radius** "sửa X đụng ai" (cần đọc import code) · (c) traceability "requirement nào chưa có test". Prototype 2026-07-18 đã chứng minh (b) chạy được: code-graph 55 module/154 import, tìm ra **orphan thật `core/index.ts`** (barrel 0 ai import), fan-in `memory/db.ts`=18. *(Soát 2026-08-07: số prototype là HỒ SƠ lịch sử — hai file đó nay đã đổi, đừng lấy số này làm hiện trạng; câu hỏi chờ user thì vẫn nguyên.)*

- ✅ **(③) 717 CỬA SỔ PHỤ CHÊNH — CHƯA TRUY RA.** Đo hai lần cách nhau ~30 phút đều ra **đúng
  717**, nên KHÔNG phải nhiễu do kho lớn thêm (giả thuyết cũ của tôi, nay bác). Đã loại: cửa sổ
  mồ côi (**0**), trùng khoá băm (**2**), tổng số khớp khít (220.280 + 7.408 = 227.688). Phần
  vector CHÍNH sang đủ (chênh đúng 2 = tin mới trong lúc xuất). Cần A/B trên **kho ĐÓNG BĂNG**.

- ✅ **(ghi số, không phải việc mới) Chênh dữ liệu hai kho nới lên 2.276 tin** (thật 282.500 vs song
  song 280.224) vì hook realtime ghi suốt lúc làm việc, còn kho song song đóng băng. Chỉ là đối thủ
  ở lane FTS (~0,8% kho) và **chỉ lệch một chiều** — phải ghi kèm mọi bảng bench của phiên này.

**CHƯA ĐO — KHÔNG được đọc thành sạch:** ① gate ĐẦY ĐỦ `npm run check` **và** file test
`conform-declared` của máy kia (chờ bench xong → build; tsc đã chứng minh nguồn dịch được, nên đỏ
hiện tại là **do chưa build**) · ⑤ `quick_check`/`integrity_check` trên kho + trên bản backup vừa
chụp (I/O nặng) · ⑥ bề mặt sống: daemon TẮT có chủ đích ⇒ chưa gọi endpoint, **chưa mở app nhìn tận
mắt** · ⑧ `npm run check:clone` (cần mạng + build) · ⑨ **diễn tập phục hồi — lần cuối 12/08, nay 11
ngày**, vẫn là nợ nặng nhất của `plan/18` mặt ⑨ · ⑪ nhãn/caption + song ngữ soi bằng mắt (phép
ad-hoc của tôi hỏng; vế MÁY thì cổng `i18n-ratchet` đã xanh trong 685 test).

- ✅ **Neo đo tiến độ — ghi ra để đừng đếm sai lần nữa:** trong bảng bóng `vec_chunks_rowids`,
  **`rowid` mới là id tin**, cột `id` bỏ trống (NULL). Đếm bằng `vec_map` chỉ ra tin bị CHUNK
  (5.874 hàng), không phải toàn kho. Tự kiểm đúng: 180.697 hàng chính + 5.874 chunk = 186.571.

- ✅ ⏸ **Ba agent chưa khai tự động được** (đã nêu tên trong `setup mcp`, không im lặng bỏ qua):
  `codex` (cấu hình **TOML**) · `opencode` (khuôn entry khác) · `pi` (nối bằng plugin package).
  **Đo trên engram v1.20.0 (2026-08-02) — họ làm được cả ba, và đây là hình dạng cần khớp:**
  `codex` → ghi `%APPDATA%/codex/config.toml` (642 B) + `engram-instructions.md` + prompt phục
  hồi sau nén · `opencode` → `~/.config/opencode/opencode.json` + plugin `engram.ts` **21 KB**
  · `pi` → cài npm `gentle-engram`, cần `pi` trong PATH (thiếu thì lệnh của họ cũng lỗi).
  ⇒ khoảng cách là THẬT, không phải giới hạn của ngành. Rẻ nhất là `codex` (chỉ cần bộ ghi TOML).

- ✅ ⏸ **Codex chỉ nhận `Stop`** — hệ hook của nó không có `UserPromptSubmit`/`PreCompact`/
  `SessionStart`, nên máy chạy Codex có capture per-message nhưng KHÔNG có đồng hồ context
  lẫn lưới sau nén. Chưa tìm hiểu Codex có sự kiện tương đương không.
  *(HOÃN 2026-08-06 — user chưa dùng Codex; xem ghi chú ⏸ ở §🔌 engram.)*
- ✅ **(hồ sơ) Đề xuất gốc của gate — giữ để tra lý do**
  Vấn đề đã TÁI DIỄN SUỐT MỘT THÁNG: agent soát TODO bằng cách ĐỌC file rồi báo lại, nên mục đã xong
  vẫn nằm đó và user bị hỏi lại lần hai. Luật `02_RULES §Chốt phiên` đã cấm — **và vẫn hỏng**, đúng
  như luật structure-sync từng dạy: *thứ CHẶN drift là code, không phải rule dễ quên.*
  **Đề xuất cơ chế (cần chốt hình dạng trước khi code):** mỗi mục TODO mang dấu **đã-đo-lần-cuối**
  (vd `<!-- v:2026-08-05 -->`); `zemory validate` cảnh báo mục nào **quá N ngày chưa đo lại**, và
  `zemory conform --gate` đỏ nếu có mục quá hạn xa. Cộng thêm: lệnh `zemory todo verify` chạy các
  phép đo rẻ tự động được (file tồn tại? hằng số? endpoint sống?) rồi in bảng LỆCH.
  *(Số nền để đo hiệu quả: soát tay 2026-08-05 phát hiện **11/58 mục sai ≈ 19%**.)*
- ✅ **Gemini** là nền web CUỐI còn thiếu — khung `scan-web --platform` đã phục vụ ChatGPT + Claude.ai, thêm Gemini là dùng lại khung.

- ✅ **① Bù dữ liệu cho kho song song TRƯỚC KHI so** — nó thiếu **~9.600 tin** (269.769 vs
  279.363) nên hai kho chưa cùng dữ liệu; số của bge đang được *ưu ái nhẹ* (ít đối thủ hơn).
  Chạy: `GLOBAL_MEMORY_DB=<bgem3> zemory memory scan` → `… memory embed` (ước ~1,5–2 giờ ở
  637 ms/tin). **Đừng bench trước bước này** — so trên hai tập dữ liệu khác nhau là so lệch.
- ✅ **② Ma trận 4 ô × 2 kho**: `{gộp BẬT, gộp TẮT} × {rerank TẮT, rerank BẬT}`. Hôm nay mới
  đo 2 ô đầu (`--no-rerank`). Lệnh: `memory bench --recall` (có rerank) và `--no-rerank`, biến
  `ZEMORY_COLLAPSE=0` để tắt gộp. **Máy tĩnh, daemon TẮT** (ONNX tranh CPU là số hỏng).
- ✅ **③ Đa-truy-vấn (T5)** — đòn mạnh nhất theo `plan/17 §1.1b` mà bench KHÔNG chạy: bench chỉ
  gửi một truy vấn. Phải dựng probe **sao chép nguyên tham số** `searchHybrid(q,{limit:40,
  all:true,rerank:false})` rồi thêm `also[]`; probe thiếu `all:true` từng cho **3 kết luận sai**
  (bẫy 10/08). Cách rẻ nhất: dùng lại `runRecallBench` như script
  `scratchpad/prose-diag.mjs` của phiên này (nó trả `ranks[]` từng câu).
- ✅ **④ Ca ÂM + mắt người**: 18 ca âm ở MỖI ô của ma trận (hôm nay: 0/18 chặn ở cả hai kho,
  không đổi) · daemon thứ hai CHỈ-ĐỌC `ZEMORY_UI_PORT=4445 GLOBAL_MEMORY_DB=<bgem3>` để nhìn
  tận mắt · user tự gõ so tay (`plan/19 §4`).

**Trạng thái máy lúc chốt (đo thật):** daemon **pid 25608 · 2.2.0** · `autosync`/`scheduler` TẮT ·
`realtime`/`autostart` BẬT · kho thật **279.363 tin · 257.072 vector · quick_check ok** · kho song
song **269.769 tin · 257.006 vector · 0 remaining trong phạm vi** · job embed **ĐÃ XONG** (log tự
chốt `DỪNG: không còn tin nào để nhúng`, cả wrapper lẫn con đã thoát) · cây git sạch · **2 commit
chưa push** (`ee6a251` · `0613044`) · `package.json` **2.2.0** (đã push mốc 2.2.0 trước đó).

**Phiên này làm gì:** ① audit 3 lượt (1 BLOCKING backup bỏ đói + 7 advisory) · ② vá backup **hai
đợt** · ③ parity cây↔graph · ④ mặt audit ⑪ + **luật "chữ người dùng đọc"** vào `02_RULES` + 4 bộ
template · ⑤ cổng i18n mở sang HTML + vá 21 chỗ + móc `data-i18n-aria` · ⑥ vá 2 lỗi CÓ SẴN (test
hẹn giờ `recency` · `writeFileSync` trần) · ⑦ vá 2 cổng tự bẫy (`archive` nuốt cờ · guard đọc tên
file thành lệnh push) · ⑧ **gate ĐẦY ĐỦ `npm run check` chạy lại được lần đầu từ 15/08: exit 0** ·
⑨ bench A/B một phần (§4b).

⚠ **Bẫy đã trả giá phiên này:**
· **Escape qua shell bị nuốt 4 LẦN** (`node -e` với `\\`, heredoc, `cd &&`, và **bash ăn `$_`/`$p`
  khi gọi PowerShell lồng trong bash**). Chữa: viết script ra FILE (Write/Edit), và cần PowerShell
  thì gọi **tool PowerShell**, đừng lồng trong bash.
· **`npm run check | tail -40` làm mất con số ca test** — gate PASS (exit 0) nhưng không chụp được
  `pass/fail`. Lần sau đừng pipe qua `tail` khi cần số.
· **Bench khi BẬT gộp là so lệch giữa hai kho** — lớp gộp dùng vector nên ngưỡng 0,85 hành xử khác
  nhau ở hai không gian; muốn so model thì phải `ZEMORY_COLLAPSE=0` (bằng chứng: FTS trùng khít).

- ✅ **(advisory) Advisory ④ của audit đêm 21/08 ĐÃ LÀM XONG nhưng vẫn mang dấu `[ ]`, kèm 3 số
  dòng chết.** `archive` đã dời 59 mục ngay tại chốt phiên (ghi ở chính bàn giao: 2.327 → 1.551),
  nhưng mục *"`05_TODO` đã 2.156 dòng"* vẫn mở, bàn giao vẫn ghi *"2.308 dòng"*, và số THẬT hôm nay
  là **1.562**. Ba con số cho cùng một đại lượng trong cùng một file — đúng thứ luật *SOÁT SỔ = ĐO
  LẠI* nhắm tới. (`todo verify` cũng đã lên **11 cờ** advisory, sổ còn ghi 8.)
- ✅ **(advisory) Job embed 44 giờ chạy ưu tiên `Normal`, và nhịp đã SỤP — ETA thật ~18–32 giờ,
  không phải "4 lượt".** Đo: `Get-Process 21968` ⇒ **PriorityClass = Normal** (kỷ luật ở `plan/14 §3`
  + `06_CHANGES [2026-08-14]` là *việc do MÁY tự chạy phải hạ `BELOW_NORMAL`*; job này phóng qua
  wrapper `.vbs` ở scratchpad nên **không đi qua `runStep`** — nơi duy nhất có luật hạ ưu tiên).
  Nhịp: lượt 55 mất **595,9 phút/4.000 vector** (cận trên cũ trong sổ là 216 phút); lấy mẫu sống
  hai lần cách 12,4 phút ⇒ **11,6 vector/phút** ⇒ còn ~12.800 vector ≈ **18 giờ** (theo nhịp lượt 55
  thì ~32 giờ). Hệ quả cần biết: **cả LỊCH SAU-EMBED bị đẩy ~một ngày**, và backup vẫn bị bỏ đói
  suốt thời gian đó (mục BLOCKING trên).
- ✅ **(advisory) Giả định *"chưa có máy thứ hai hoạt động ⇒ plan 19 bước ⑤ NGỦ"* ĐÃ HẾT ĐÚNG.**
  Đo: `G:\My Drive\Global Memory\global_memory.sync.lock` = `{"host":"DESKTOP-PFB157K","pid":12584,
  "at":"2026-08-21T15:07:24Z"}` và `global_memory.enc` đổi **21:42 local** ⇒ máy kia **đang sync ngay
  lúc audit**. Hai hệ quả: ① `autosync` của máy này TẮT 2 ngày nên ta **không nhận** khối của nó ·
  ② sau khi tráo BGE, kho máy kia còn `gemma-768` nên merge sẽ **từ chối vector** (đúng thiết kế
  chống kho lai, plan 19 §6) ⇒ bước ⑤ phải được điều phối **TRƯỚC hoặc NGAY SAU** tráo, không để ngủ.
- ✅ **(advisory, mục cũ thêm số mới) `/memory-status` lượt LẠNH >30s khi máy bận I/O** — curl
  timeout 30s ở lượt đầu sau restart + embed đang chạy; lượt ấm 5ms. Không phải bug mới — đúng
  mục `[~] (⑥)` còn mở; số này là cận trên lúc bận, đừng đọc thành hồi quy.
- ✅ **② ĐANG CHẠY từ 2026-08-19 15:43** — kho song song `data/global_memory.bgem3.db`
  (1.115 MB · **269.769 tin** · dấu `{1024, bge-m3-v1, int8}`), job embed **pid 29624** phóng qua
  `.vbs` (mồ côi, sống qua phiên), log `data/logs/bge-embed.log`.
  **Đo lúc phóng:** 742 vector/phút ⇒ ước **~5,3 giờ** *(lạc quan — embed xử tin NGẮN trước,
  sẽ chậm dần; đừng chốt con số này)*. Tiến độ đo bằng `vectorCount(<bản sao>)`, KHÔNG tin log.
  **Kho thật KHÔNG bị đụng** (đo cùng lúc: 256.948 vector · `{768, gemma-prompt-v1, fp32}`).
  ⚠ **ĐÃ TẮT `autosync` + `scheduler`** trong suốt đợt — hai kho dùng CHUNG `data/` nên chung
  luôn `cli-write.lock`, autosync 30 phút/lần sẽ cản job. **PHẢI BẬT LẠI SAU KHI TRÁO**
  (`/set-autosync?on=1` · `/set-scheduler?on=1`). Backup vẫn chạy (đồng hồ riêng, không treo
  vào công tắc nào — bản vá 2026-08-13).
- 🔴 **PHÁT SINH ở ②: `embed --all` CHẾT VÌ HẾT BỘ NHỚ ở 18.041 vector (~36 phút).** Log:
  `zemory memory: out of memory`, exit 1. Đợt Gemma 43 giờ trước KHÔNG dính ⇒ khác biệt nằm ở
  đợt này (model int8 542 MB + đường **tuần tự** gọi pipeline hàng chục nghìn lượt).
  **Cách vá — KHÔNG chỉ tăng heap** (tăng heap chỉ dời thời điểm chết nếu có rò thật): chạy
  **THEO LƯỢT, mỗi lượt một TIẾN TRÌNH RIÊNG** (`memory embed --limit 4000` × N lượt, wrapper
  `bge-embed-loop.mjs` ở scratchpad). Hết lượt là tiến trình thoát ⇒ hệ điều hành thu hồi sạch,
  rò không tích luỹ. `embedPending` vốn incremental + resumable nên cắt lượt chỉ tốn ~8 s nạp
  model mỗi lượt. Ngưỡng 4.000 = 1/4,5 mức đã chết. Wrapper chỉ đếm bằng **SQL trên kho**,
  không đọc log; một lượt lỗi KHÔNG giết cả job (chỉ dừng khi hai lượt liên tiếp không thêm gì).
  ⚠ Bẫy phụ đã dính: wrapper `appendFileSync` vào chính file mà `.cmd` đang redirect ⇒ **EBUSY**
  trên Windows, chết ngay khi khởi động. Chỉ được in ra stdout, để redirect lo phần ghi.
  **Đo sau khi vá:** 1.248 vector/phút (~75k/giờ) ⇒ ước ~3 giờ *(sẽ chậm dần — tin dài về sau)*.
- ✅ **③** bench A/B hai kho (2 thước · theo lớp · 18 ca âm, máy rảnh) + user tự so tay —
  cổng đạt: không lớp nào tụt (plan 19 §4).
- ✅ **④ (CHỜ USER KÝ)** tráo bằng script một-lần (tag `pre-bgem3-swap` · bản lùi 768 có án tử
  ~5 ngày · scan+embed bù) — plan 19 §5.
- ✅ **⑤ (NGỦ tới khi có máy kia)** thế hệ 1024 lên Drive + máy kia nhận như máy mới — plan 19 §6.

- ✅ **(⑦) 314 MB weight — ĐO LẠI 2026-08-13: KHÔNG cần viết lại lịch sử, KHÔNG cần force-push.**
  > 🔄 **Bác hai khẳng định cũ của chính mục này:** *"mọi lần clone đều kéo về ~314 MB"* và *"gỡ
  > được chỉ bằng `filter-repo` + force-push ⇒ hỏng clone máy kia"*. **Cả hai đều sai.**

  Sự thật đo được: weight vào git qua **đúng một commit** `921354f` (05/08) và **đã bị gỡ khỏi
  `main` ngay hôm đó** — `git merge-base --is-ancestor 921354f HEAD` ⇒ **KHÔNG**; `git ls-tree
  HEAD` ⇒ **0 file**. Lịch sử `main` đã sạch từ 9 ngày trước.
  Nó chỉ còn sống nhờ **HAI ref CỤC BỘ**, cả hai trỏ cùng `32d5d03`:
  · `refs/original/refs/heads/main` — **rác `filter-branch` để lại**, lẽ ra xoá sau khi kiểm;
  · `refs/tags/pre-lfs-fix-20260805` — tag mốc, tạo **có chủ ý**.
  **Remote KHÔNG có cả hai** (`git ls-remote origin | grep 32d5d03` ⇒ 0) ⇒ **clone từ GitHub
  không kéo 314 MB**. Số đo: `.git` máy này **661 MB** · clone từ **local** (kéo cả tag) 236 MB.

  ✅ **ĐÃ DỌN 2026-08-13** (user chốt "giữ log hay xoá?" → chọn **giữ log, bỏ blob**):
  `size-pack` **234,91 → 22,52 MiB**. Tag dời sang `8bbcba9` + nâng thành **annotated** mang
  luôn phần log (hash cũ · tên file · ánh xạ tra ngược); bỏ `refs/original`; `gc --prune=now`.
  `main` y nguyên `7e7d2a8` · 3 tag đủ · `fsck` sạch · 28/28 test + validate + conform ✓ ·
  **không đụng remote, không force-push** ⇒ clone máy khác không hỏng.
  ⚠ **Bẫy đã dính, đừng lặp:** `git reflog expire --all` **xoá luôn stash** (stash entry chính
  là reflog entry của `refs/stash`). Đã cứu được vì ref còn trỏ commit; lần sau chụp
  `stash list` trước và expire có phạm vi thay vì `--all`.
- ✅ **Sau khi TRÁO: `zemory reindex`** một lần cho chỉ mục docs tươi (đợt dọn 78 dòng doc đường
  cũ 05/08 đã xong — Zemory 23 + 6 repo khác 55, xem `06_CHANGES [2026-08-05b]`).
  Kèm theo tự động: digest toàn kho sẽ TỰ DỰNG LẠI LƯỜI ở scan/scheduler kế tiếp — `DIGEST_VERSION`
  bump 3→4 (2026-08-06, `cleanPath` cắt văn xuôi khỏi `paths_touched`; đo 261/261 path bẩn xử sạch).
  KHÔNG cần `digest --all` tay trước tráo — kho hiện tại sắp bị thay, chạy là công dã tràng.
- ✅ ⏸ **ColBERT làm LUỒNG SONG SONG để THỬ (user chốt hướng 2026-08-10) — NGỦ ĐÔNG theo quyết
  định park 2026-08-15**; kiến trúc luồng-song-song dưới đây vẫn là đường đúng NẾU ngày nào đó mở
  lại (điều kiện: model VI license sạch + nhắm trần pool).
  Không cần "zemory 2.0": vector vốn là *engine nội bộ của slot `search`* và RRF gộp bao nhiêu
  luồng cũng được (vừa chứng minh — thêm luồng thứ 4 trong ngày). ColBERT = **một bảng chỉ mục
  nữa + một luồng nữa**, `vec_chunks` cũ **không đụng**; thua thì tắt luồng, kho cũ chạy y nguyên
  (điều 9). Hai ràng buộc thật: **đĩa 10–30×** (cộng thêm, không thay) và `vec_config` hiện chỉ mô
  tả MỘT không gian vector ⇒ phải tách cấu hình riêng. Vẫn phải qua phép thử nhỏ trên bản sao
  (điều 15), và nhớ TRẦN: chỉ 6–8/68 câu có đáp án trong pool mà ngoài top-10.

- ✅ **(hướng lớn, chưa quyết) LATE INTERACTION / ColBERT — nhắm vào TRẦN POOL.**
  Lý do: `@40` mới **50%**, tức nửa số câu đáp án không vào nổi pool, và bench đo được **chỉ
  6/68 câu** nằm trong pool mà ngoài top-10 ⇒ **mọi lớp rerank ở kho này chỉ có 6 câu dư địa**.
  Tài liệu ngành khớp đúng ca của mình: *"bi-encoder huấn luyện trên web tổng quát hoá KÉM sang
  corpus kỹ thuật; khớp mức TOKEN của MaxSim lấy lại phần lớn khoảng cách đó mà KHÔNG cần huấn
  luyện lại"*, chất lượng ngang cross-encoder ở độ trễ ngang bi-encoder. Kho mình đúng là ngoài
  miền (log kỹ thuật tiếng Việt, embedder zero-shot). **Giá: đĩa 10–30× dense** + định dạng chỉ
  mục riêng ⇒ phải qua phép thử nhỏ trên bản sao trước (HP điều 15). Xem `plan/17 §3.1`.
- ✅ **Nợ nhỏ:** daemon exit-1 (hộp đen đã cắm, chờ repro). *(Start Menu icon **ĐÃ XONG** —
  `Start Menu\Programs\Zemory.lnk` tồn tại thật, kèm icon Z; dựng lại được sau khi vá bug
  Desktop-chuyển-hướng 05/08, không cần sign-out/in nữa.)*
- ✅ **DAEMON THOÁT exit 1 KHÔNG LOG (2026-07-21, thấy 1 lần) — ĐÃ CẮM HỘP ĐEN 2026-07-22, chờ repro để chẩn gốc.** *(Soát 2026-08-07: `daemon.log` sạch tới 06/08 20:41, daemon 4444 sống ổn từ đó — vẫn CHƯA tái hiện. Soát lại 2026-08-09: `todo verify` giơ cờ "code mới hơn sổ" vì `ui.ts` bị sửa 08/09 — **báo oan**, thay đổi đó là thêm tham số `also` cho `/memory-search`, không đụng `armCrashReport`. Mục vẫn ĐANG CHỜ tái hiện.)* Nghi **crash NATIVE** (better-sqlite3/onnxruntime segfault — bỏ qua handler JS) HOẶC stderr detached không capture. **Đã làm:** `backend/src/logging/daemon-log.ts` — `daemonLog()` ghi `<thư mục kho>/logs/daemon.log` (mirror stderr)
  *(⚠ sửa 2026-08-07: sổ — và cả comment trong chính file đó — ghi `~/.zemory/logs`, **SAI**. Đo:
  `logsDir()` = `join(currentMemoryDir(), "logs")`, tức log ĐI THEO KHO khi `relocate`; file thật ở
  `data/logs/daemon.log` (12.830 B, 07/08 09:04), còn `~/.zemory/` chỉ có `location.json`. Ghi sai
  chỗ này làm phiên sau soi nhầm nơi rồi kết luận "không có log".)* cho mọi lifecycle (up/shutdown/exit/uncaught/unhandled) + `armCrashReport()` bật `process.report` (reportOnFatalError + reportOnUncaughtException) → dump JSON **stack native** cạnh log. `ui.ts` arm ngay khi thắng port. **CÒN LẠI:** chờ lần daemon chết tiếp theo → đọc `daemon.log` + `report.*.json` để chẩn gốc; nếu tái hiện được thì chạy foreground + ép embed↔sync xen kẽ.
  *(⤴ Đã đóng 2026-08-10 — nguyên nhân là `start /b` không tách console, xem mục ✅ ở trên.)*

</details>
- ❌ **BÁC BỎ 2026-08-07 (user chốt) — cắt tool-dump khỏi FTS trigram. ĐỪNG ĐỀ XUẤT LẠI.**
  Agent nêu vì thấy **trigram = 512 MB = 42,3% kho** (to hơn bảng nguồn `messages` 275 MB) và
  tool-dump chiếm **56% khối lượng chữ** ⇒ ước tiết kiệm ~285 MB. **Sai ở gốc:** đo lại thì
  **119.668 tin tool-dump chỉ có 171 tin mang vector** (`vectors.ts` cố ý bỏ `tool_name IS NOT NULL`)
  ⇒ với **57% kho**, FTS word + trigram là **hai chân tìm kiếm DUY NHẤT**; cắt trigram là chặt một
  chân. Đổi lấy 285 MB trong khi ổ còn **140 GB trống**.
  **Đây đúng là lỗi của vụ cắt 256 chiều** — tính được phần TIẾT KIỆM, không đo phần MẤT. Sinh ra
  **HP điều 15**: chất lượng > dung lượng · cắt phải qua cổng như thêm · **tăng cũng phải đo trước**
  bằng phép thử nhỏ trên bản sao. Muốn giảm dung lượng thì tìm đường **KHÔNG đụng chất lượng**
  (dọn rác · dedup · VACUUM · nén lớp lưu), không phải cắt lớp tìm kiếm.

- ✅ **🔒 GATE CHỐNG "TODO THỐI" — ĐÃ BUILD `zemory todo verify` 2026-08-06, sửa tiếp 2026-08-07**
  (user chốt hình dạng: *máy ĐO lại*, không dùng dấu ngày thủ công). `docs/todo-verify.ts` +
  `commands/harness.ts`.
  > 🛠 **Sửa 2026-08-07 (ADAPT v2 · N2):** sổ giờ tìm theo MARKER (`harnessPathsAt(root)`) thay vì
  > ghép cứng `docs/agent/05_TODO.md`, và đọc qua `readTextFile` (lột BOM). Trước đó, repo đặt
  > harness ở `harness/` thì gate báo 0 mục — **một cổng không bao giờ đỏ được**. Chính trục ④ của
  > nó bắt ra dòng sổ này lạc hậu ngay trong lượt audit cùng ngày (gate tự soi được người sửa nó).
  **Bốn phép đo, đều tất định:** ① **ref chết** — mục nhắc một đường dẫn hoặc endpoint như thứ
  đang có mà repo không có · ② **nghi đã xong** — sổ nói "chưa" NGAY TRONG CÂU nêu tên, mà tên
  đó tồn tại · ③ **đo lại "0 match"** — sổ ghi "tệp X 0 match Y" thì grep lại đúng phép đo đó ·
  ④ **code mới hơn sổ** — `git blame` dòng sổ vs `git log` file nó nêu tên.
  **Trục ④ mới là trục bắt được ca write-gate thật**, và nó dạy một điều: ca đó KHÔNG heuristic
  chữ nghĩa nào bắt nổi — sổ nêu tên hàm CŨ, bản vá landing dưới tên MỚI, không có mâu thuẫn
  chữ nào cả. Chỉ git biết.
  **Luật bất đối xứng theo GIỌNG câu** (bản đầu làm sai, đã sửa): giọng phủ định + TỒN TẠI =
  đáng ngờ · giọng khẳng định + THIẾU = đáng ngờ. Không phân giọng thì một mục ghi rõ "CHƯA làm"
  lại bị gán nhãn "sổ khẳng định có" — ngược hẳn ý người viết.
  ⚠ **Hệ quả cho người VIẾT sổ:** đừng đặt đường dẫn/endpoint GIẢ vào backtick làm ví dụ — máy
  không phân biệt được ví dụ với khẳng định, và sẽ báo chúng là ref chết (đã dính ngay khi viết
  chính mục này).
  **Độ nhiễu đã đo:** bản đầu 8 phát hiện (5 báo oan) → nay **1/57 mục**. Gate nhiễu = gate bị bỏ qua.
  Test `todo-verify.test.mjs` **9/9**, gồm ca write-gate dựng bằng git thật (ngày commit ép cứng).
  ✅ **ĐÃ NỐI vào `npm run check` — đóng 2026-08-07** *(dòng này trước ghi "chưa nối", SAI)*.
  Đo: `package.json` khoá `check` = `typecheck && lint && test && conform && **todo**`, khoá
  `todo` = `node dist/cli.js todo verify`; commit `d3ebbe6` (06/08) muộn hơn chính dòng sổ này.
  ⇒ Đúng **trục ④ "code mới hơn sổ"** mà chính mục này dựng ra để bắt — gate tự dính lỗi nó
  sinh ra để chống, và nó KHÔNG tự bắt được (mục nằm ngoài 20/58 mục máy tra được).
  *(Hồ sơ đề xuất gốc giữ bên dưới.)*

- ✅ **(ĐÃ VÁ 2026-08-22) Guard chặn oan MỌI lệnh nhắc tên file cờ `.allow-push`.** Nhánh
  push là `GIT_CMD [^\n;|&]*\bpush\b`, mà `\bpush\b` khớp cả token nằm TRONG tên file ⇒
  `git check-ignore -v docs/hooks/.allow-push` bị chặn như một lệnh push thật (đo 2 lần trong phiên).
  Nghĩa là **chính cái lệnh để soi cờ** cũng không chạy được nếu cùng câu có chữ `git`. Cùng họ bẫy
  đã ghi 21/08 (*nhãn ca test chứa `git … push`*), nhưng ca này đắt hơn vì nó chặn việc KIỂM cờ.
  **Vá:** `PUSH_ARG = (?<![\w.-])push\b` trong **`guard-gen.ts` (NGUỒN SINH)**, rồi đi trọn chuỗi —
  `zemory hook guard` sinh lại → chép sang bản ship cowork → cập nhật số dòng manifest (338→343).
  Ba bước sau **không phải tuỳ chọn**: cổng `template-parity` (byte-parity) và `bootstrap-manifest`
  lần lượt bắt đúng bước tôi định bỏ qua.
  **Cổng:** ca mới trong `guard-tool-matrix` — 4 lệnh nhắc tên cờ × mọi tool phải **QUA**, kèm
  **vế ngược** 5 dạng push thật (`sudo` · `cd &&` · `--force` · `-u`) phải **CHẶN**. Đột biến trả
  `PUSH_ARG` về `\bpush\b` ⇒ **đỏ**. Nghiệm thu bề mặt thật: lệnh hôm qua bị chặn nay chạy và trả
  `.gitignore:1:.allow-*`; push thật vẫn phải xin phép.
- ✅ **(ĐÃ VÁ 2026-08-22) `zemory archive` nhận MỌI cờ lạ rồi CHẠY THẬT.** Đo trong phiên: `archive --help` → archive 5 entry + 6 mục ·
  `archive --dry-run` → in *"moved 2 closed item(s)"* và **dời thật 2 mục** (diff `archive/05_TODO.md`
  6 → 8 `✅`, lượt sau báo `0 mục để dời`). Đây là lệnh **DỜI NỘI DUNG giữa hai file** nên cờ lạ phải
  bị TỪ CHỐI (fail-closed), không bỏ qua âm thầm.
  **Vá:** `cmdArchive(args)` parse cờ tường minh — cờ lạ ⇒ in usage + **exit 1, không ghi byte nào**;
  `--dry-run` thật, và chốt xem-trước đặt ở **tầng hàm** (`ArchiveOptions.dryRun` trong
  `archiveTodo`/`archiveChanges`, ngay sau khi ĐẾM và trước byte đầu tiên) chứ không ở CLI — để mọi
  người gọi đều có đường xem trước. Tham số là optional nên **22 lời gọi cũ không phải sửa gì**.
  **Cổng:** 3 ca trong `archive-todo` — `--dry-run` đếm đúng mà file **byte-identical** và không tạo
  file archive · **ca ÂM** không cờ thì vẫn dời thật (chống bản vá biến thành dry-run ngầm) · ca
  **tầng CLI** chạy `dist/cli.js` thật trên repo TẠM: cờ lạ ⇒ exit≠0 **và** file không đổi byte.
  Đột biến: bỏ nhánh từ-chối ⇒ 1 đỏ · bỏ nhánh `dryRun` ⇒ 2 đỏ. Đo trên repo này: `--help` ⇒ exit 1,
  `05_TODO` giữ nguyên 1.687 dòng.

- ✅ **(BẮT ĐƯỢC + VÁ 2026-08-22) TEST HẸN GIỜ trong `recency.test.mjs` — gate đầy đủ hôm nay
  ĐANG ĐỎ, không ai biết.** Lượt sweep rộng nhất chạy được (91 file, trừ 7 file cần ONNX) ra đúng
  **1 đỏ**: *"search(): recency default ON ranks the fresher relevant message first"*.
  **Không phải do đợt sửa này** — `git log --since=2026-08-15` trên `search.ts`/`recency.ts`: **0
  commit**. Gốc: 3 ca đầu của file gọi hàm THUẦN nên truyền `NOW` vào được, còn ca này gọi
  `search()` mà `blendRecency` mặc định đọc **đồng hồ THẬT** (`nowMs = Date.now()`) — trong khi
  fixture neo mốc cứng `NOW = 2026-07-02`. Số học của điểm lật: `score = 1/(1+i) × recencyFactor`,
  `older` đứng i=0 ⇒ `fresher` (i=1) chỉ thắng khi `f_fresher > 2 × f_older`; `f_older` đã chạm
  SÀN 0,15 ⇒ ngưỡng `0.5^(d/30) = 0.30` ⇒ **d = 52,1 ngày**. Fixture để fresher = NOW−1 ngày, mà
  2026-07-01 → 2026-08-22 đúng **52 ngày** ⇒ nó vừa lật đỏ trong 1–2 ngày qua. Đo khớp: older
  **0,026667** vs fresher **0,026230**.
  **Vá:** neo fixture vào đồng hồ THẬT (đúng ý định ca đó là "mới vs cũ"), KHÔNG đổi API
  production chỉ để test chạy. Đột biến chứng minh còn cắn: tắt nhánh `recencyEnabled` ⇒ **đỏ**.
  **Soi cùng lớp lỗi ở chỗ khác:** chỉ `realtime-capture.test.mjs` còn mốc cứng, và nó **an toàn**
  (so mốc với chính chuỗi đó, không so với đồng hồ). ⇒ 1/91 file có bệnh này, đã hết.
  *Bài học cho cổng: test gọi code đọc `Date.now()` thì fixture phải neo theo `Date.now()`, hoặc
  code phải cho tiêm đồng hồ. Neo hai mốc khác nhau là hẹn giờ tự nổ — và nó nổ vào một ngày
  không ai đang sửa gì gần đó.*
- ✅ **(BẮT ĐƯỢC + VÁ 2026-08-22) `capture-hook.ts` ghi `writeFileSync` TRẦN — vi phạm cổng
  `fs-atomic`, lọt 1 ngày.** Sweep rộng bắt ca thứ hai: *"các chỗ ghi file nguồn/cấu hình không được
  dùng writeFileSync trần"*. Truy `git log`: commit **`859225e`** (đợt *chấm than update* 21/08)
  thêm `writeFileSync(flag, …)` cho marker nhắc-một-lần-mỗi-phiên. Cổng `fs-atomic` có sẵn và
  `capture-hook.ts` NẰM TRONG danh sách nó canh — nhưng gate đầy đủ chưa chạy từ 15/08 nên không ai
  thấy. Vá: đổi sang `writeFileAtomic` (file đã import sẵn, dùng ở dòng 88) + gỡ import trần.
  *Điều đáng ghi hơn cả hai lỗi: **cả hai đều lọt vì CÙNG một lý do** — nợ "chạy gate đầy đủ" từ
  15/08. Sweep 91 file (trừ 7 file ONNX) rẻ hơn hẳn `npm run check` (không build, không đụng job
  embed) và nó bắt được cả hai ⇒ nên chạy lượt này SAU MỖI đợt sửa, đừng chờ cửa sổ máy tĩnh.*

- ✅ **(BLOCKING — ĐÃ VÁ + ĐÃ CHỤP BẢN MỚI, 2026-08-21 22:3x) BACKUP BỊ BỎ ĐÓI IM LẶNG — 27,0 giờ
  không có bản sao lưu, 1.946 tin đang có ĐÚNG MỘT bản.**
  *(Con số tôi báo miệng lúc đầu là "33 giờ" — SAI mốc; `rotateBackup` trả về `ageMs` thật =
  **27,0 giờ**. Giữ lại vế đúng, sửa vế sai.)*
  Đo hai đường, khớp nhau: ① `data/backups/` bản mới nhất là
  `…2026-08-20T12-32-45Z` (các ngày 16→20/08 đều có, **21/08 KHÔNG**) · ② `daemon.log` **không một
  dòng backup nào** sau `2026-08-20T12:33:17Z`, trong khi job `dọn nháp` vẫn nổ 21/08 (04:25Z ·
  10:24Z) ⇒ scheduler SỐNG, chỉ nhịp backup không nổ. Nhịp thật của nó là **neo theo lần backup
  trước** (19/08: daemon lên 01:41Z mà backup vẫn 12:05Z = +24h) nên đây không phải "đồng hồ reset
  theo restart".
  **Gốc (đọc code, không suy diễn):** `scheduler.ts:215` — `if (child || syncJobRunning() ||
  cliHoldsWrite()) return;` — nhánh này nằm **TRƯỚC `try`** nên không có `log()` nào; còn
  `cliHoldsWrite()` đọc **MỘT khoá cho cả thư mục** (`writegate.ts:56` →
  `join(currentMemoryDir(),"cli-write.lock")`, nội dung chỉ `{pid,label,at}` — **không mang danh
  tính KHO**). Job embed đang ghi `global_memory.bgem3.db` giữ khoá đó liên tục (gia hạn mỗi lượt,
  stale 15 phút không bao giờ tới) ⇒ backup của **kho THẬT** — một file KHÁC, không ai ghi tranh —
  bị chặn 44 giờ. Bản 20/08 lọt được là do tick tình cờ rơi vào khe ~8 s giữa hai lượt.
  **Vì sao nặng:** đây là **cửa thứ BA** của cùng một bệnh mà repo đã trả giá hai lần (backup chết
  4 ngày vì treo vào công tắc `scheduler`, 08→12/08 · bỏ đói autosync). Bản vá 13/08 cắt phụ thuộc
  vào *công tắc*, nhưng để lại phụ thuộc vào *"có kẻ khác đang ghi"* — và plan 19 chính là một kẻ
  ghi 44 giờ. So sánh tại chỗ: `syncTick` (dòng 273) khi nhường có **hẹn quay lại** `SYNC_RETRY_MS`;
  `backupTick` thì không hẹn gì và **không nói gì**. Phơi nhiễm đo được: **1.946 tin / 6 phiên** sinh
  sau mốc backup cuối, mà `autosync` cũng TẮT từ 19/08 ⇒ chúng không có cả bản trên Drive.
  **ĐÃ LÀM (user chốt "chụp backup ngay + vá code"):**
  · **Chụp ngay một bản** bằng đúng `rotateBackup` (không đẻ đường mới): 2.040.832.000 byte trong
    **17,2 giây**, dọn 1 bản cũ (giữ 5), và bản mới **kiểm lại lành** — `quick_check ok` ·
    276.699 tin · 2.325 phiên · 257.072 vector.
  · **① khoá ghi nay mang ĐƯỜNG KHO** (`CliLock.db`, đóng dấu bằng `currentMemoryDb()` nên job trỏ
    `GLOBAL_MEMORY_DB` tự khai đúng kho song song) + hàm mới `cliHoldsWriteOn(db)`: kẻ ghi kho KHÁC
    ⇒ **không xung đột**; khoá đời cũ không khai kho ⇒ vẫn coi là xung đột (an toàn, tự lành khi
    tiến trình ghi kế tiếp chạy mã mới).
  · **② nhánh nhường THÔI IM LẶNG** — `backupYields` đếm lượt liên tiếp, log ở lượt ĐẦU rồi mỗi 8
    lượt (~4 giờ), kèm tuổi bản mới nhất và cờ ⚠ QUÁ HẠN. Trước đây 54 nhịp im trong 27 giờ nhìn
    y như "mọi thứ ổn".
  · **③ `doctor` có mặt mới**: `backupStale()` (trần = 2× chu kỳ) ⇒ `backup: ✗ … quá hạn` **và
    `exitCode=1`**; sạch thì in `backup: ✓ bản mới nhất N giờ tuổi` (nghiệm thu thật: `✓ 0.2 giờ`).
    Hai bề mặt (scheduler · doctor) dùng CHUNG một hàm, không đẻ hai cách tính tuổi.
  · **Cổng `backup-starvation.test.mjs` (7 ca, quá nửa là ca ÂM/biên)**: kho khác ⇒ không chặn ·
    cùng kho ⇒ chặn · hoa-thường + `/` vs `\` · khoá đời cũ ⇒ chặn · không khoá ⇒ không chặn ·
    quá 2 ngày ⇒ báo · chưa có bản nào ⇒ báo (và tuổi là `null`, KHÔNG bịa 0). Test đặt
    `GLOBAL_MEMORY_DB` **trước import động** để không đọc khoá THẬT của repo.
    **Đột biến chứng minh đỏ được:** trả `cliHoldsWriteOn` về hành vi cũ ⇒ **1 đỏ** (đúng ca ÂM) ·
    bỏ nhánh quá-hạn của `backupStale` ⇒ **3 đỏ**. Hồi quy 219/219 · tsc 0 · lint 0 · conform ✓.
  **NGHIỆM THU TRÊN DAEMON THẬT** — restart lúc 15:51:15Z (**pid 34156** · 2.1.0 · log
  `maintain off, auto-sync off, backup luôn bật`; job embed pid 21968 + wrapper 800 **sống
  nguyên**, hai công tắc vẫn TẮT). Đúng 60 s sau, nhịp mồi in ra dòng mà 27 giờ trước đó KHÔNG
  hề có:
  `[scheduler] backup nhường embed — lượt thứ 1 liên tiếp · bản mới nhất 0.3 giờ tuổi`.
  Nó VẪN nhường là ĐÚNG: khoá hiện tại do lượt embed đang chạy đặt bằng **mã cũ** nên không khai
  kho ⇒ nhánh bảo toàn. Lượt embed KẾ TIẾP (tiến trình mới, mã mới) sẽ đóng dấu
  `db=…bgem3.db` và từ đó backup kho thật chạy bình thường — **tự lành, và nay nhìn thấy được**.
  **CÒN LẠI (chưa làm, cố ý):** `maintainTick`/`syncTick` vẫn dùng `cliHoldsWrite()` cũ — chúng ghi
  ĐÚNG kho hiện hành nên không sai, nhưng nên dùng chung hàm mới cho một cách nói.
- ✅ **(advisory — ĐÃ VÁ 2026-08-21 23:0x, user chốt "sao ko làm đi") Cây folder ≠ graph sau khi mở
  đa ngôn ngữ 21/08 — bất biến do chính code khai, không cổng nào canh.** `graph.ts:151` nhận `SRC_EXT` **∪ `EXTRA_LANG_EXT`**, còn
  `structure-tree.ts:201` vẫn chỉ `SRC_EXT`. Hai comment tự khai bất biến này: `graph.ts:62`
  (*"Exported so the folder-tree view walks the EXACT same file set — tree and graph must never
  drift"*) và `structure-tree.ts:202` (*"same extension set as the code graph … so every graph node
  has a matching row here"*). **Đo trên repo giả** (`.ts` + `.go` + `.java` + `.sh`): graph 5 node ·
  cây 2 file ⇒ **3 node CHỈ có trong graph** (`worker.go` · `Tool.java` · `deploy.sh`), cả 3 mang cờ
  `noImportLayer`. Zemory **không dính** (file `.sh` duy nhất nằm trong `external/`, vốn bị IGNORE)
  — nhưng nó dính đúng **kho của user khác**, tức lý do tính năng này được build.
  **ĐÃ VÁ — một hàm, không phải hai điều kiện:** `isSourceLeaf()` đặt NGAY CẠNH hai tập đuôi trong
  `graph.ts`, rồi **cả** bộ quét của graph (`collectFiles`) **và** lá của cây (`structure-tree.ts`)
  gọi chung nó. Chọn hướng này thay vì "thêm `EXTRA_LANG_EXT` vào cây" vì cái sai gốc là **hai
  điều kiện ghép tay ở hai nơi** — vá kiểu kia thì lần thêm ngôn ngữ sau vẫn lệch y vậy. Đặt hàm ở
  `graph.ts` (nơi hai tập sống) nên KHÔNG sinh chiều phụ thuộc mới; cây vốn đã import từ đó.
  **KHÔNG lan sang cổng blocking:** đo trước khi sửa — `conform` chấm trên `g.nodes` (`conform.ts`
  đã loại `noImportLayer` từ 21/08), **không** đọc `buildFolderTree`; consumer duy nhất của cây là
  `/folder-tree` (UI). Nên bản vá này không thể tái diễn ca "conform đỏ đột ngột".
  **Cổng:** 2 ca mới trong `structure-sync.test.mjs` (đúng nhà — file đó vốn canh
  *index ↔ structure ↔ graph*), chạy trên **repo giả** 5 loại đuôi vì repo thật có thể tình cờ
  không chứa đuôi nào trong `EXTRA_LANG_EXT` (cổng xanh vì "không có dữ liệu để sai" thì không soi
  gì). Có **ca ÂM**: kho thuần ts/py không được nhận `.md`/`.json` thành lá. Kèm hai assert
  "cả hai bên phải THẤY ≥5 file" để phép so không xanh giả khi một bên rỗng.
  **Đột biến chứng minh đỏ được CẢ HAI CHIỀU:** trả cây về chỉ-`SRC_EXT` ⇒ ca parity đỏ ·
  `isSourceLeaf` nhận mọi đuôi ⇒ **ca ÂM** đỏ. Nghiệm thu bằng đường thứ hai (chính probe đã bắt
  bug): trước vá 3 node chỉ-có-trong-graph → sau vá **0 lệch cả hai chiều**.
  Hồi quy 226/226 · tsc 0 · lint 0 (bắt được một `extname` mồ côi do đợt sửa, đã gỡ) · conform ✓.
- ✅ **(advisory — ĐÃ VÁ 2026-08-21 22:4x) `plan/13` nói ngược code.** Đã thêm `graph path` +
  god-nodes vào §5, thêm khối 🔄 đảo vế *"KHÔNG làm: đa ngôn ngữ ngoài TS/JS/Py"* ở §9 (kèm lý do
  detect-then-load + phép thử điều 15 + trần `structure-tree` chưa vá), và sửa dòng trạng thái đầu
  file. Hồ sơ gốc của phát hiện: `graph path`
  (có thật: `commands/graph.ts:151`) và god-nodes **không xuất hiện một lần nào** trong plan 13
  (§5 vẫn liệt kê bề mặt build/export/impact/MCP/viewer); `EXTRA_LANG_EXT` có thật
  (`graph.ts:73`, 6 ngôn ngữ) trong khi **§9 vẫn ghi *"KHÔNG làm: … đa ngôn ngữ ngoài TS/JS/Py"***.
  `02_RULES §Tài liệu` bắt "đổi thiết kế → `docs/plan/*`" trong CÙNG thay đổi. Phiên sau đọc plan
  sẽ kết luận sai về cả bề mặt lẫn phạm vi ngôn ngữ.
- ✅ **(advisory — ĐÃ VÁ 2026-08-21 22:4x) `plan/19 §8` tự nói ngược mình:** bảng ghi bước ①
  *"CHƯA"* trong khi §2 ghi *"✅ ĐÃ LÀM 2026-08-19"*. Đã sửa bảng (① XONG · ② ĐANG CHẠY kèm số đo
  241.139 và ETA thật), **và** bỏ vế *"chưa có máy thứ hai hoạt động ⇒ bước ⑤ NGỦ"* ở §6 — audit đo
  ngược bằng `sync.lock` của `DESKTOP-PFB157K`.
- ✅ **(advisory — ĐÃ VÁ 2026-08-21 22:4x) `05_TODO` lặp NGUYÊN KHỐI trong bàn giao 21/08:** khối
  *"HAI CÔNG TẮC ĐANG TẮT"* xuất hiện hai lần (dòng 28 và 34, chỉ khác dòng ngoặc cuối) — đúng họ
  bẫy *"`splice` sổ nuốt dòng của mục kế bên"* mà chính bàn giao đó vừa ghi, và trái `02_RULES`
  (*"đọc hết 6 file KHÔNG được thấy nội dung trùng"*). Đã gộp về MỘT khối, và nhân dịp sửa luôn vế
  *"backup vẫn chạy"* đã bị chính audit này bác.
- ✅ **(advisory ④) ĐÃ LÀM tại chốt phiên 21/08** — `archive` dời **59 mục** sang
  `archive/05_TODO.md`: **2.327 → 1.551 dòng (−33%)**, 60 `[ ]` + 10 `[~]` còn nguyên, 0 việc mở
  bị nuốt (bản `.bak` ở `attic/harness-bak/`). *Ba con số cũ của mục này (2.156 · 2.308 · 2.327)
  đều đã chết — muốn biết thì `wc -l`, đừng đọc sổ.*

**Nghi vấn ĐÃ LOẠI — ghi kèm lý do, khỏi đào lại:**
· *"precommit-guard không honor `secret_allow`"* — **SAI**: đọc nguyên văn PRECOMMIT_SOURCE có
  dòng `secret_allow → continue`; grep hẹp ban đầu trượt nó (đúng bẫy công-cụ-hỏng-lặng, luật 5).
· *cờ `todo verify` dòng ~2052* — báo-oan-kỹ-thuật: `harness.ts` sửa 20/08 vì việc doctor,
  không liên quan mục gate-TODO-thối mà dòng sổ nói.
· *eslint "treo" 25 phút* — lỗi PHÉP ĐO của agent: gõ `eslint .` thay vì lệnh chuẩn của repo
  (`eslint backend/src backend/test backend/scripts`) nên bò cả `external/`+`frontend/`+`attic/`.
  Đường thật: exit 0 trong chưa đầy một phút. *Bài học lặp: đo bằng đúng lệnh production.*

**CHƯA ĐO — không được đọc thành sạch (chạy khi embed xong, TRƯỚC khi tráo kho):**
① gate ĐẦY ĐỦ `npm run check` (cần tắt scheduler + máy tĩnh) · ⑥ mở app nhìn tận mắt (cần mắt
người) · ⑧ clone sạch (deps không đổi từ 06/08, lần đo gần nhất 4/4 xanh — không chạy lại đêm
nay vì cần mạng) · ⑨ diễn tập phục hồi định kỳ (lần cuối 12/08 — vẫn là nợ cổng plan 18).

- ✅ **"CHẤM THAN UPDATE" — ĐÃ BUILD 2026-08-21 (user chốt "làm luôn, không chờ embed"), pull-based,
  KHÔNG push-ghi-chéo.** Một phép đo `syncCheck()` (adopt.ts — dry-run gap-fill + guardDrift), BỐN
  bề mặt cùng ăn: ① `zemory sync --check` (exit 1 khi cũ) · ② hook nhắc ĐÚNG 1 lần/phiên
  (marker `.harness`, fail-open, đã đo sống: lần 1 in, lần 2 im) · ③ endpoint `/harness-updates`
  (cache 5') · ④ chip vàng ở rail NGAY TRÊN chip sức khoẻ, bấm sang màn Dự án, mọi repo khớp thì
  ẨN HẲN. **Nghiệm thu lượt đầu tự chứng minh nhu cầu: 9 repo đang cũ** (mỗi repo thiếu đúng
  `write-style` vừa ship; `PBI_OPS`+`SasinFlow` còn `guardStale:2` — bắt xuyên repo). Gate
  `sync-check.test.mjs` 4/4, đột biến bỏ-nhánh-skills ⇒ đỏ; app-ui 47/47 (chip mới class
  `status-chip upd` cố ý KHÔNG khớp regex chip heal); realtime-capture 15/15. Đã nhìn tận mắt
  (screenshot). Giữ nguyên luật Phạm vi: chỉ NHẮC, hành động áp là của agent/user bên repo đó.
  **Kèm UI (user chốt cùng lượt, mượn ý OpenRCA):** nút thu gọn rail TÍCH HỢP vào logo (hover
  hiện ‹/›, bấm gập/mở) — nút `‹` rời ở rail-foot đã bỏ. Hover-state mắt người kiểm khi mở app.
- ✅ **KHẢO SÁT GRAPHIFY (108,7k sao, đo API — không tin marketing) + HẤP THỤ 2 MÓN — 2026-08-21
  (user chốt "mượn cái nó thắng, 2 hệ hỗ trợ nhau").** So theo thước plan 13: nó HƠN ở độ phủ
  ngôn ngữ (40 vs 3) + bề mặt truy vấn (path/communities/wiki) + cộng đồng; NGANG nền
  (tree-sitter · confidence-tier · incremental); THUA zemory đúng 2 đặc sản (cạnh từ CHUẨN 03 ·
  nối episodic `touches`) + kỷ luật 0-LLM cho docs (nó LLM-extract docs ⇒ không rebuild ổn định
  — đúng thứ điều 13 cấm). ⚠ Bẫy đo: lượt WebFetch đầu **BỊA benchmark LOCOMO** (README thô
  không có) — model tóm tắt nhỏ tự chế số; kiểm chéo raw README + GitHub API mới ra sự thật.
  **Đã hấp thụ (build + gate cùng ngày):** ① **`zemory graph path <A> <B>`** — BFS không hướng
  trên 3 lớp cạnh sẵn có (imports·calls·api), in LOẠI+HẠNG từng bước, lấp lỗ traceability đa-hop
  plan 13 §1 tự nhận; đo sống: `system.js → ui.ts` 1 bước qua api seam (import-graph mù ca này) ·
  ② **god-nodes theo TỔNG BẬC** trong `graph fitness` — lộ ngay `ui.ts (1↓/42↑)` mà bảng hubs
  chỉ-fan-in không hề thấy. Gate `graph-path.test.mjs` 5/5, đột biến bỏ-chiều-ngược ⇒ đỏ;
  matcher gộp về MỘT `matchFileId` (impact + path cùng nguồn, hết nguy cơ hai bản lệch).
  **Phán quyết phần còn lại (có số, đừng mở lại vô cớ):** · KHÔNG chạy đua 40 ngôn ngữ — đo
  estate 10 repo: py 165 · ts 139 · mjs 107 · **sql 60** · js 32 · ps1 15 · dax 3 — py/ts/js đã
  phủ; đáng cân duy nhất là **grammar SQL** (60 file thật) → đề xuất riêng bên dưới · KHÔNG
  Leiden/communities/wiki (dependency Python-stack, chưa ca dùng) · "LLM đọc + check lại" user
  nêu = ĐÃ LÀ điều 13 «máy dựng · agent kiểm», không cần cơ chế mới.
- ✅ **ĐA NGÔN NGỮ THEO KHO (detect-then-load) — BUILD 2026-08-21** (user chốt: *"nhiều ngôn ngữ
  là cho USER KHÁC của zemory; không phải kho nào cũng áp một đống ngôn ngữ"*). Kiến trúc: kho
  nào tự nạp đúng grammar kho đó CÓ — `EXTRA_LANG_EXT` (bash·java·go·rust·c_sharp·ruby, từ 36
  grammar sẵn trong `tree-sitter-wasms`, nạp LƯỜI per-key có cache-cả-fail) + node mang cờ
  `noImportLayer` + **fitness loại cờ đó khỏi `isolated_pct`** (không phạt thứ chưa đo được —
  29,4/30% mà tính bừa là đỏ oan) + walker thêm 3 nhánh node-type ĐÃ ĐO (method_declaration ·
  function_item · struct/interface/enum). Go/rust được `calls` miễn phí (chung `call_expression`).
  Ruby giữ làm ca-âm-sống (grammar LOAD FAIL → fail-open về symbol rỗng). Gate
  `graph-langs.test.mjs` 4/4 (fixture 7 ngôn ngữ), 2 đột biến đều đỏ (tắt guard fitness · bỏ
  nhánh rust); zemory tự nó hành vi Y NGUYÊN (không có file ext mới; `external/` vốn IGNORE).
  **Chưa làm, đừng đọc thành có:** cạnh IMPORT cho ngôn ngữ mở rộng (regex một-dòng per-language,
  thêm khi có user thật) · SQL/PowerShell (không có wasm prebuilt — mục riêng ở trên).
  🔬 **AUDIT NGAY SAU BUILD (user yêu cầu "audit xem có cấn gì") — bắt 2 CẤN, cả hai đã vá:**
  · **CẤN 1 (nặng): mở `SRC_EXT` LAN sang cổng blocking `conform`.** Đo: thư mục `devops/` chỉ
    chứa `deploy.sh` bỗng thành `off-standard-dir` ⇒ **mọi repo pull bản mới có thể ĐỎ ĐỘT NGỘT
    ở chỗ hôm qua còn xanh** — đúng loại báo oan đã vá 2 lần cùng ngày, và là side-effect ngoài
    phạm vi việc được giao. Vá: `conform` loại node `noImportLayer` (chưa có lớp cạnh ⇒ chưa đủ
    dữ kiện phán cấu trúc); `.ts` lạ VẪN bắt. Gate `BÁO OAN ⑦`, đột biến ⇒ đỏ.
  · **CẤN 2: `orphans` và `isolated_pct` nói KHÁC nhau** — fitness đã loại node mở rộng, `orphans`
    (thứ `graph export` phơi cho consumer) thì chưa ⇒ node `.go` hiện ra như "mồ côi" trong khi
    sự thật là "chưa đo được cạnh". Vá cả hai + phơi cờ `noImportLayer` ra contract v2. Gate ⑤.
  · **KHÔNG phải hồi quy (đã kiểm):** enrich 3,8s là chi phí CÓ TỪ TRƯỚC cho ts/js/py, không do
    đợt này; `/code-graph` lượt lạnh 4,3s → lượt 2 **0,58s** (graph-cache lo). Repo không có file
    ext mới ⇒ 0 grammar thừa được nạp (`external/` vốn trong IGNORE).
  · Sweep sau vá: **109/109 test vùng đụng · 0 skipped** · lint/tsc sạch · conform ✓ ·
    `isolated_pct` 29,6/30% PASS.
- ✅ **`doctor` cảnh báo rác nháp — LÀM 2026-08-20 (user duyệt "làm đi")**: dòng `scratch:`
  trong doctor (`sweepScratchpads({dryRun:true})`), báo tổng + số phiên scratchTick sẽ dọn.
  Đo thật: `scratch: ✓ 0.56 GB (trong trần)` — khớp log sweep của daemon (đường thứ hai).

- ✅ **`doctor` cảnh báo guard LỖI THỜI — LÀM 2026-08-20 (user duyệt "làm đi")**: `guardDrift()`
  so cả 3 file (guard · precommit · policy-theo-marker) với bản sinh hôm nay, CHỈ soi file mang
  dấu zemory (bản riêng của repo: im — nhắc là nhiễu). Gate `guard-gen.test.mjs` 8/8, đột biến
  trả-rỗng ⇒ đỏ. Nóng lên đúng hôm có HAI vòng vá guard — máy nhắc thay người nhớ.

- ✅ **① (BUILD) — XONG 2026-08-19** (chi tiết + số đo: `06_CHANGES [2026-08-20]`). profile `bge-m3-v1` trong `embed.ts`: nhánh theo
  `vec_config.profile`. Profile nay gánh **NĂM** thứ (không chỉ prompt): model · pooling **CLS** ·
  dims **1024** · dtype **int8** · **sequential**. Gate `embed-profile.test.mjs` **5/5**, và
  **5 đột biến đều ĐỎ được** (bỏ bge khỏi bộ đọc · mean-pool · bỏ tuần tự · dims 768 · dtype fp32).
  **Nghiệm thu quyết định:** vector do đường PRODUCTION sinh ra khớp **cos 1,000000** với vector
  của phép đo passD ⇒ mọi số của ma trận áp dụng đúng cho code này (trước khi vá lỗi lô: 0,98).
  ⚠ Ca đột biến "mean-pool" ban đầu **SỐNG SÓT** mọi test hành vi (chỉ vector thật bắt được) ⇒
  đã mở `embedProfileSpec()` để gate khoá thẳng hợp đồng — đúng luật 6 của skill audit.
- ✅ **Vá kèm: dòng CLI in SAI tên model.** `memory embed` in cứng *"EmbeddingGemma"* trong khi
  đang nhúng BGE 1024d — đúng loại "bề mặt nói dối" khiến một lượt chạy SAI trông như đúng.
  Nay lấy tên từ **profile của KHO** (`embedProfileSpec(idx.profile).model`), không phải cấu
  hình môi trường: kho song song in `bge-m3-ONNX · bge-m3-v1 · 1024d · int8`, kho thật in
  `embeddinggemma-300m-ONNX · gemma-prompt-v1 · 768d · fp32`. *(Lấy `embedConfig()` cũng vẫn
  sai — lúc in thì profile CHƯA được pin, nó chỉ được pin bên trong `embedPending`.)*
- 🔴 **PHÁT SINH ở ②, ĐÃ VÁ + CÓ GATE: hợp đồng `vec_config` bị BỎ QUA nếu đóng dấu TRƯỚC lần
  embed đầu.** `embedPending` lấy *"bảng `vec_chunks` tồn tại chưa"* làm điều kiện đọc hợp đồng
  ⇒ kho chuẩn bị theo plan 19 §3 (drop index → đóng dấu → embed) bị đọc nhầm sang cấu hình mặc
  định. **Đo được: vec_config nói `{1024, bge-m3-v1, int8}` mà lượt embed báo `dims 768` và chạy
  GEMMA.** Phép thử 20 tin bắt được — **cùng lỗi đó trong lượt 44 giờ sẽ cho một chỉ mục sai từ
  đầu tới cuối, im lặng**. Vá: hỏi thẳng `vec_config` (ba hàm `stored*` vốn đã tự fallback đúng).
  Gate mới trong `embed-profile.test.mjs` dựng đúng trạng thái đó, đột biến (trả về logic cũ)
  chứng minh ĐỎ được. *Bài học lặp lại lần thứ n: "bảng đã tồn tại" KHÔNG đồng nghĩa "hợp đồng
  đã có" — và phép thử nhỏ trước job dài không phải nghi lễ, lần này nó cứu 44 giờ.*
- ✅ **Đảo mắt UI — ĐÃ NHÌN TẬN MẮT 2026-08-15 (user giao agent tự làm):** lái Edge headless qua
  CDP, chụp ảnh THẬT trước/sau khi bấm chip. Chip hiện **"6 OK / Hoạt động tốt"** chấm xanh; bấm
  → nhảy đúng màn **Tính năng** ("Sức khoẻ 6/14 OK"). Nhánh "nói TÊN thứ cảnh báo" không chụp
  được vì hệ đang xanh hết — verify tầng code (names[0] + '+N', key đủ 2 dict).
- ✅ **Màn Tính năng mở lại hiện mặc định như thật — TRUY RA + VÁ 2026-08-21 (user báo lại:
  "heal mở lại là tắt, phải bấm recheck").** Nguyên nhân KHÔNG phải probe: `zboot` xếp
  `refreshChecks()` SAU chuỗi `/status → /memory-status`, mà lượt LẠNH của memory-status đo
  **>30s** khi máy bận ⇒ pill check treo "…" nhìn như tắt suốt lúc đó; và `/check` không cache
  phía daemon nên mỗi cửa sổ đo lại từ đầu. **Vá 3 tầng:** ① `refreshChecks()` chạy SONG SONG
  ngay đầu boot · ② daemon cache `/check` 10' + MỒI 3 check rẻ lúc khởi động (probe sâu giữ
  thủ công như thiết kế cũ) · ③ nút ↻ Recheck mang `fresh=1` — giữ đúng nghĩa "đo lại thật".
  Đo sau vá: 3 check trả **2–3ms** từ cache mồi; `fresh=1` vẫn đo thật (358ms). Gate anchor
  trong `app-ui.test.mjs` (48/48), đột biến xếp-hàng-lại ⇒ đỏ.
  **Vế 2 cùng ngày (user báo thêm "công tắc tự bật tắt hoài"):** cuộc ĐUA vẽ-đè — payload
  `/memory-status` bắn TRƯỚC cú bấm toggle, VỀ SAU (lượt lạnh >30s) và vẽ đè trạng thái CŨ lên
  nút vừa gạt ⇒ nhìn như tự tắt, vòng poll sau tự bật. Vá: toggle đóng dấu `Z.flagsAt`,
  `renderMem` cho giá trị LOCAL thắng trong 90s rồi server là sự thật. Gate anchor + đột biến
  gỡ-guard ⇒ đỏ (49/49). Đã BÁC giả thuyết cache-60s bằng đo (set xong đọc lại thấy NGAY —
  flags đọc tươi, chỉ số nặng mới cache). Trạng thái LƯU thì vốn đúng từ đầu: config cạnh kho
  ghi bền, hai lần restart daemon hôm nay đều giữ nguyên công tắc.
  ⚠ **Bằng chứng MỚI cho mục `[~] (⑥)` lượt lạnh:** nó chặn NGUYÊN event loop — đo 2026-08-21:
  `POST /set-rerank` timeout 8s vì daemon đang tính lượt lạnh. Tức lượt lạnh không chỉ chậm
  MỘT endpoint mà khựng CẢ daemon. Hướng vá vẫn như sổ ghi (đẩy sang tiến trình con kiểu
  `deepSearchChild`) — việc lớn, LỊCH SAU-EMBED không bắt buộc, làm khi rảnh tay.
- ✅ **Số phiên nhảy 1.315 → 2.085 — ĐÃ GIẢI 2026-08-20 bằng đúng lượt `GROUP BY` mục này đề nghị:**
  992 phiên trong cụm 12–15/08 đều `claude-code`, trong đó **983 mang host `DESKTOP-PFB157K`**
  (máy kia, về qua merge kho chính Drive — đường một-kho ghi-nối-thêm mở 12/08 chính là ngày
  cụm bắt đầu). Đúng giả thuyết "merge Drive", KHÔNG phải lỗi dữ liệu. Tổng nay 2.323 phiên,
  nhịp sau cụm về bình thường (2–6 phiên/ngày).
- ✅ **6 hàng `.tmp` trong `sync_state` — ĐÃ XOÁ 2026-08-15 (user duyệt "bạn tự làm").** Đo
  trước: đủ 6 (`probe-ship` · `probe2-5` · `timed`); xoá đúng 6; còn lại 5 hàng (2 watermark
  `drive:` + 3 watermark bundle test cũ — NGOÀI phạm vi duyệt, giữ nguyên). Verify sau xoá:
  `lastSync` vẫn khớp từng ký tự `drive.lastPushAt`.

- ✅ **(⑩) LOG CỦA SCHEDULER — ĐÃ VÁ** (`scheduler.ts:65` gọi `daemonLog`, ghi
  `data/logs/daemon.log`). *Sổ ghi 🔴 tới 2026-08-13 trong khi mã đã sửa từ hôm trước — đúng dạng
  "sổ nói khác code" mà luật SOÁT SỔ = ĐO LẠI sinh ra để bắt; bắt được vì kiểm mã, không đọc sổ.*
- ✅ **(⑨) MỘT CÔNG TẮC GÁNH BA VIỆC — ĐÃ TÁCH 2026-08-13.** `rotateBackup()` từng là bước 4 của
  chuỗi bảo trì, mà chuỗi đó `return` ngay khi `getScheduler()` tắt ⇒ **backup chết theo**, im
  lặng (lý do thật của "4 ngày không backup" 08/08 → 12/08 — job không hỏng, nó không được gọi).
  Nay `backupTick()` có đồng hồ riêng, **không hỏi bất kỳ công tắc tính năng nào**, lệch pha 1/4
  chu kỳ, có mồi riêng sau khởi động; vẫn giữ hai ràng buộc cũ (nằm trong token job · fail-open)
  và không claim lồng khi được gọi từ trong chuỗi. Cổng `scheduler-contract` 9/9 + ca mới
  *"BACKUP không được treo vào công tắc của tính năng khác"*, đột biến chứng minh đỏ được.
  ⚠ **Chỉ sống sau khi khởi động lại daemon** — daemon nạp mã lúc bind cổng.
- ✅ **DỌN 2 XÁC KHO CŨ — 2026-08-15, user duyệt từng cái:** ① `global_memory.256d-backup-20260808.db`
  (1,2 GB — bản lùi đợt tráo 768 đã hết vai: ảnh chụp 08/08, lùi về là mất 1 tuần tin; backup ngày
  xoay vòng đã thay vai bằng bản tươi hơn) · ② `data/corrupt-20260803-091106/` (2,0 GB vật chứng —
  điều kiện giữ *"tới khi truy xong nguyên nhân gốc"* đã thoả từ `[2026-08-03h]`). Đo sau xoá:
  `data/` chỉ còn đúng kho sống 1,8 GB.
- ✅ **Luật "HIỆN SUY NGHĨ TỪNG BƯỚC — CẤM CHẠY IM LẶNG" ĐÃ THÀNH LUẬT CHUNG — 2026-08-15 (user
  yêu cầu kiểm + phủ):** trước chỉ có ở `02_RULES` của zemory (chốt 12/08); nay thêm bản GENERIC
  (không mang số đo riêng zemory) vào **cả 3 template** `docs_template/{app,nonapp,adapt}/agent/
  02_RULES.md` §Hành xử (bộ cowork tự nhận vì bootstrap rót từ nonapp). Gate template 12/12 xanh;
  bảng số dòng trong BOOTSTRAP cập nhật 86→112. ⚠ **Repo KHÁC đang tồn tại KHÔNG tự nhận** —
  `sync` chỉ gap-fill file thiếu (file-wins); muốn SasinFlow/Harvest/Infra có luật này phải sang
  từng repo (xin phép user từng cái, như đợt `client/` 15/08).
- ✅ **(②) Entry changelog vượt trần — XONG 2026-08-13.** `zemory archive` dời 7 entry cũ (active
  339 → 149 dòng, lịch sử vẫn tra được), 2 entry còn lại nén chữ giữ nguyên số đo. `validate` nay
  **0 entry vượt trần**. *Ghi kèm: lượt cắt đầu tôi tưởng đã giảm dòng nhưng đếm tay ra y nguyên
  31 — gộp câu mà vẫn xuống dòng đúng chỗ cũ thì không giảm gì. Công cụ đúng, tôi sai.*

- ✅ **(⑧) CLONE SẠCH — ĐÃ DỰNG ĐƯỢC 2026-08-13** (chi tiết + số đo: `06_CHANGES [2026-08-13]`).
  Chẩn đoán cũ *"không có prebuilt cho Node 24"* **SAI**: asset ABI 137 có thật. Thủ phạm là host
  `github.com` **lọt 1/10 lượt** (`api.github.com` 10/10) ⇒ rơi về `node-gyp`, máy trắng không có
  bộ biên dịch C++. Vá: `backend/scripts/fetch-prebuilds.mjs` chạy TRƯỚC `npm install`.
  ⚠ **Hai bài học phép đo, giữ lại:** ① nối `| tail -3` làm mã thoát thành của `tail` ⇒ in ra
  *"CLONE SẠCH: DỰNG ĐƯỢC"* **ngược hẳn sự thật** · ② **đường mạng chập chờn thì một lượt đo
  chứng minh được cả hai điều trái ngược** — hôm 12/08 trúng lượt hỏng nên kết luận "thiếu
  prebuild", hôm nay có lượt trúng 1/10 làm cả một phép thử xanh giả. Đo tỉ lệ, đừng đo một lượt.

- ✅ **ĐÃ CHỐT RỒI — user duyệt 2026-08-12, thành `01_CONSTITUTION` điều 16** *(«ĐỒNG BỘ CHỞ TRỌN
  BỘ RAG — MÁY NHẬN KHÔNG BAO GIỜ PHẢI DỰNG LẠI GÌ»)*. `conform` cũng đã nhận ra điều 16. Mục
  dưới đây là bản đề xuất gốc, giữ để tra lý do; **KHÔNG hỏi lại user lần nữa** — hỏi lại một
  việc đã chốt là LỖI (`02_RULES §Hành xử`).
  ~~**(ĐỀ XUẤT `01_CONSTITUTION` — chờ user chốt) Nâng 9 yêu cầu đồng bộ lên tầng hiến pháp.**~~
  Chúng đang nằm ở `plan/08 §8.0` (user chốt 2026-08-12), nhưng bản chất là **bất biến kiến
  trúc**, không phải chi tiết thiết kế: một kho chính · ghi là nối thêm · chở trọn bộ RAG · máy
  mới không nhúng lại gì · mọi thứ lên GM là add-only. Bằng chứng cần nâng tầng: **trong MỘT
  phiên, agent đi sai bốn lần** đúng những điều này, mỗi lần đều vì tự thêm một ràng buộc
  "an toàn/đơn giản" mà user không đặt. Plan thì agent chỉ mở khi trúng trigger; hiến pháp thì
  luôn nạp — đó là khác biệt quyết định.

**CHỜ USER — đừng tự quyết:**
1. **Số version + push** — 11 file sửa, 3 commit cũ chưa push, chưa commit đợt này.
2. **File dư trên Drive**: `FULL-768…20260811` (1,67 GB, chụp trước v21) · `DESKTOP-PFB157K.000003`
   (331 MB) · `SS01-IT-12.000024` + 5 delta. Sau lượt sync ĐẦU TIÊN bằng code mới, chúng bị kho
   chính phủ hết ⇒ xoá được. **Guard chặn agent xoá `*.enc`** (nhóm secret, không có flag) — user
   tự xoá hoặc bảo agent sửa policy.
3. 🔄 **ColBERT — MỞ LẠI CÙNG NGÀY (user ra lệnh dò lặp "thử hết cách") và lần đầu QUA ĐỦ 3 RÀO.**
   > 🔄 Supersede quyết định park viết vài giờ trước — đảo vì DÒ RA ĐƯỜNG MỚI, không phải đổi ý suông.
   **BGE-M3 (BAAI, MIT)**: đa ngữ 100+ CÓ tiếng Việt · 8192 token · MỘT lần encode ra CẢ BA
   (dense-1024 + sparse + **colbert multi-vector**). Đã THỬ TAY 2026-08-15 trên chính stack Node
   của repo (bản ONNX `yuniko-software/bge-m3-onnx` fp32 2,3 GB, chạy `onnxruntime-node` 1.24.3
   sẵn có, tokenize bằng `@huggingface/transformers`):
   · **Tokenizer VI SẠCH TUYỆT ĐỐI** — 12 token nguyên chữ có dấu (`đổi | khung | chờ…`), qua
     được đúng rào đã giết answerai-colbert (BERT-EN băm 24 mảnh mất dấu).
   · **MaxSim phân biệt đúng thứ tự, biên rộng**: câu hỏi rerank/recall → doc ĐÚNG **0,705** ·
     GẦN 0,436 · LẠC ĐỀ 0,279. Encode **137–220 ms**/đoạn (fp32, CPU, 13–62 token).
   · Bản NHẸ có sẵn: `aapot/bge-m3-onnx` fp16/int8 **vẫn giữ đủ 3 đầu** + script export chỉnh
     được. ⚠ đừng suy tốc độ q8 từ số của EmbeddingGemma — model khác, phải đo (bài học plan 17 §3b).
   **Trần cũ VẪN ĐỨNG, chép lại để không ảo:** vai rerank dư địa chỉ **6–8/68 câu**, và
   live-encode top-40 ≈ 8–25 s/truy vấn (chậm ngang cross-encoder) — muốn nhanh phải precompute;
   vai retriever (đúng chỗ nghẽn pool) cần chỉ mục multi-vector: đo thật **62 token ≈ 254 KB fp32**
   ⇒ cả kho cỡ ~200 GB nếu không nén (ColBERTv2 nén 128d+int8; bge-m3 KHÔNG có đầu nén sẵn).
   Engine chỉ mục cho JS đã có ứng viên: `fast-plaid-web` (Rust+WASM) — chưa rà license.
   ✅ **A/B ĐÃ CHẠY 2026-08-15 (user ra lệnh "thử nghiệm thật") — CỔNG VƯỢT XA, lần đầu một lớp
   rerank THẮNG trên kho này.** 68/68 nhãn giải được, tham số chép đúng `recallbench.ts:241`,
   scheduler tắt lúc đo, mọi lane chấm trên CÙNG top-40 của hybrid (khác biệt duy nhất = thứ tự):

   | lane (thước NGHIÊM) | @1 | @3 | @10 | @40 | MRR |
   |---|---|---|---|---|---|
   | hybrid nền | 19% | 31% | 35% | 49% | 0,264 |
   | + colbert THAY HẲN | 28% | 41% | **46%** | 49% | 0,352 (+33%) |
   | + colbert TRỘN 50/50 | **32%** | 41% | 43% | 49% | **0,374 (+42%)** |

   Tương đương: MRR 0,479 → 0,543 (thay) / **0,583 (trộn)**; `@1` 37% → **53%** (trộn).
   Theo lớp: **`keyword` MRR 0,246 → 0,500 (+103%, cả hai lane)** — MaxSim chính là khớp từ-mềm,
   ăn đúng lối gõ từ khoá · `prose` MRR 0,350 → 0,466 (trộn) · `tool_result` 0,188 → 0,250 ·
   `tool_use` gần như đứng (0,113 → 0,179 thay / đứng nguyên trộn — lớp đó chỉ 21% vào nổi pool).
   **CỨU/PHÁ quanh ranh top-10:** thay hẳn cứu **9** / phá 2 · trộn cứu 6 / phá **1** — vùng
   trong-pool-ngoài-top-10 chỉ có ~9,5 câu ⇒ lane thay-hẳn cứu GẦN TRỌN vùng cứu được.
   So mốc lịch sử: cross-encoder cũ làm `@10` TỤT 35→28%; colbert làm TĂNG 35→46%.
   **Ba số phải nhớ trước khi ship:**
   ① `@40` đứng nguyên 49% — trần POOL còn nguyên, rerank không đụng được (đúng dự báo).
   ② Giá encode fp32: **1.388 ms/đoạn** (cap 1200 ký tự, 3.176 lượt ≈ 73 phút) ⇒ encode-sống
     top-40 ≈ 55 s/truy vấn — KHÔNG sống nổi ở đường tìm; đường ship thật = **precompute + nén**
     (1024d fp32 ≈ 1,2 MB/tin là bất khả thi; phải đo cắt chiều/int8/tỉa token TRƯỚC — điều 15,
     và colbert head của bge-m3 KHÔNG huấn luyện Matryoshka nên cắt chiều phải đo, không suy).
   ③ MaxSim đầu bảng KHÔNG làm được cổng "không biết": DƯƠNG median 0,644 vs ÂM median 0,516
     nhưng chồng lấn nặng (ÂM max **0,780** > DƯƠNG median) — đừng thử lại đường ngưỡng đơn.
   Kết quả thô: `bgem3-bench-result.json` + script ở scratchpad phiên 15/08.
   ✅ **MA TRẬN ĐẦY ĐỦ 2026-08-15 (user ra lệnh "thử hết các cách") — 4 model · 12 lane · cùng
   68 nhãn · ~4,5 giờ máy (3 pass có checkpoint, scheduler tắt lúc đo). KẾT LUẬN: BGE-M3 THẮNG
   CẢ HAI VAI; Qwen3 (cả embedding lẫn reranker) THUA — đóng cửa có số đo.**
   · **Vai XẾP LẠI top-40** (thước nghiêm): nền MRR 0,264 → **bge-DENSE trộn 0,5 = 0,378, @1
     19%→34% (+10 câu) — LANE MẠNH NHẤT**, mà chỉ cần MỘT vector/tin (4 KB) · colbert trộn
     w=0,6 = 0,375 · sparse trộn 0,331 · gemma trộn 0,303 · qwen-dense trộn 0,262 (≈nền) ·
     Qwen3-Reranker top-10: MRR 0,314 nhưng **2,86 s/cặp = 29 s/truy vấn — chết tốc độ**.
     ⇒ **Phần lớn cái colbert mua được, dense-1024 của CHÍNH bge-m3 mua được với giá 1/300 đĩa.**
   · **Vai LẤY ứng viên** (pool 440, so A/B — số tuyệt đối bị thổi): gemma-768 hiện tại MRR
     0,326 → **bge-m3-1024 = 0,411 (+26%; riêng prose+keyword 0,300→0,426 = +42%)**, @10
     66%→78%, @40 85%→93% — **đây là đòn vào TRẦN POOL, chỗ mọi rerank bó tay** · qwen3-1024
     = 0,270 (THUA gemma dù MTEB cao hơn — leaderboard ≠ kho mình) · qwen cắt 512 ≈ nguyên,
     cắt 256 sập (0,192).
   · **Bẫy phép đo MỚI, đắt — ghi để không ai dính lại:** `Buffer.from(base64).buffer` là POOL
     dùng chung của Node — đọc `.buffer.slice(0)` ra **16.384 số rác/vector** và các lần decode
     đè nhau. Bắt được vì lane đọc-từ-đĩa tụt về ĐÚNG mức ngẫu nhiên trong khi lane tính-sống
     mạnh (đo hai đường). Đọc đúng: cắt `[byteOffset, byteLength)` + **copy** ra khỏi pool.
   · **Caveat trung thực:** bge đo fp32, qwen đo q8 (q8 nhanh hơn fp16 2,8× trên Qwen3 — NGƯỢC
     bài học Gemma, lần 3 xác nhận "đừng suy số giữa hai model"); corpus 1 bộ 68 nhãn; doc cap
     1200 ký tự; retriever là pool-proxy chưa phải quét cả kho.
   ✅ **CỔNG 1 ĐÃ CHẠY 2026-08-15/19 (đêm) — INT8 ĐẠT, chờ user chốt dtype + phạm vi:**
     · Probe dtype (bản dense-only `onnx-community/bge-m3-ONNX`, chạy transformers.js đúng đường
       production): **int8 = 880 ms/doc-cap-1200 · trên tin thật TB 637 ms** (fp32 thô 1.400 ms)
       · q4 LOẠI (1.962 ms — chậm hơn cả fp32 VÀ kém hơn, đúng vết Gemma) · fp16/fp32 bản này
       chưa nạp được (file external-data tải hụt — lỗi tải, chưa kết luận về model).
     · **Chất lượng ở TẦNG METRIC** (re-encode trọn pool 2.939 văn bản bằng int8, chấm lại đúng
       2 lane sẽ ship): RERANK trộn MRR **0,364** (fp32 0,378 · nền 0,264 ⇒ **giữ 88% mức tăng**;
       thước tương đương gần y nguyên 0,572 vs 0,575) · RETRIEVER MRR **0,385** (fp32 0,411 ·
       gemma 0,326 ⇒ **giữ 69% mức tăng**, @40 pool giữ nguyên 93%).
     · **Chi phí ước re-embed cả kho (~245k tin có vector):** int8 ≈ **44 giờ** (đúng cỡ đợt 768
       từng chấp nhận, chạy nền BELOW_NORMAL vài ngày) · fp32 full (bản yuniko 3 đầu ra, mở sẵn
       đường colbert+sparse) ≈ **95–100 giờ**.
     · **CHỜ USER CHỐT 2 CÂU:** ① dtype — int8-44h (đủ thắng rõ gemma: retriever +18%, rerank
       +20% MRR) hay fp32-100h (trọn mức tăng + 3 đầu ra)? · ② phạm vi — cả kho một lần hay
       khoanh prose+keyword trước? Dữ liệu thô: `passA/B/C/D.json` + script ở scratchpad 15/08.
   ✅ **VÒNG DÒ THÊM 2026-08-19 — 2 ứng viên mới, ĐỀU THUA BGE-M3; BGE giữ ngôi.** Cùng registry,
   cùng 68 nhãn (`passE.json`). **gte-multilingual-base** (Apache · 305M · 768d · q8 **324 ms —
   NHANH NHẤT, gấp 4 gemma**): rerank MRR 0,310 · retriever 0,347 — hơn gemma chút ít, **thua xa
   bge**. **snowflake-arctic-embed-l-v2.0** (Apache · 568M · 1024d · MRL-256 · q8 688 ms): rerank
   0,325 · retriever 0,355 (prose+keyword 0,381) — **đứng nhì**, và có một điểm RIÊNG đáng ghi:
   **@40 = 96%, cao nhất bảng** (bge 93% · gemma 85%) tức nó vớt được nhiều đáp án vào pool nhất;
   cắt MRL-256 giữ nguyên @40 96% mà chỉ tốn 1/4 đĩa (MRR 0,338). Nhưng ở thước quyết định
   (@1 · MRR) vẫn thua bge rõ.
   **Xếp hạng cuối — retriever MRR:** bge-fp32 **0,411** > bge-int8 0,385 > arctic 0,355 > gte
   0,347 > **gemma 0,326 (hiện tại)** > qwen3 0,270. Rerank MRR: bge-fp32 **0,378** > bge-int8
   0,364 > arctic 0,325 > gte 0,310 > gemma 0,303 > qwen3 0,262.
   ⚠ **Bẫy kỹ thuật đã dính + trị:** bản ONNX của gte/arctic trả `sentence_embedding` (ĐÃ pool),
   không có `last_hidden_state` ⇒ lượt đầu chết cả 5 dtype với *"Cannot read properties of
   undefined"*. Phải in `Object.keys(output)` ra xem TRƯỚC khi kết luận "model không nạp được".
   ✅ **LAI HAI MODEL — ĐÃ THỬ 2026-08-19, KHÔNG ĐÁNG: mọi cặp lai nằm TRONG SAI SỐ.** Thử 6 cặp
   (arctic→bge · gte→bge · bge→arctic · arctic→gemma · gemma→bge, quét w=0,3…1,0). Điểm cao nhất
   `LẤY bge → XẾP arctic` MRR **0,419** so với **bge-fp32 đơn độc 0,410** — chênh 0,009 ≈ **0,6
   câu/68**.
   🔬 **BOOTSTRAP 2.000 LƯỢT (PRNG tất định, lặp lại được) — phép kiểm quyết định, KTC 95% của
   HIỆU so với bge-fp32 đơn độc:**
   · `LẤY bge → XẾP arctic` +0,009 [−0,032 … +0,053] ⇒ **TRONG SAI SỐ**
   · `arctic → bge w=0,7` +0,006 [−0,037 … +0,052] ⇒ **TRONG SAI SỐ**
   · `gemma → bge` +0,006 [−0,064 … +0,071] ⇒ **TRONG SAI SỐ**
   · `bge-int8 đơn độc` −0,026 [−0,060 … **+0,007**] ⇒ **TRONG SAI SỐ — int8 KHÔNG phân biệt
     được với fp32** ⇒ **chọn int8** (một nửa giờ máy, không mua được gì bằng fp32 mà đo thấy)
   · `arctic đơn độc` −0,055 [−0,132 … +0,023] ⇒ TRONG SAI SỐ
   · **`gemma đơn độc` −0,086 [−0,168 … −0,005] ⇒ THUA RÕ — kết luận VỮNG DUY NHẤT của cả bảng**
   ⇒ **Ba hệ quả thi hành:** ① đổi gemma→bge là quyết định CÓ CƠ SỞ THỐNG KÊ (khoảng tin cậy
   không chứa 0) · ② **KHÔNG lai hai model** — gấp đôi chỉ mục + gấp đôi giờ encode để đổi lấy
   thứ không phân biệt được với nhiễu · ③ **int8, không fp32** — tiết kiệm ~50 giờ máy mà thước
   không thấy khác biệt.
   ⚠ **Trần của phép đo, phải nói ra:** **corpus 68 nhãn đã CHẠM TRẦN PHÂN GIẢI** — nó chỉ phân
   biệt được khoảng cách cỡ gemma-vs-bge (Δ0,086), không phân biệt nổi Δ<0,05. Muốn quyết những
   lựa chọn sát nhau hơn thì phải mở rộng corpus TRƯỚC, không phải chạy thêm model. *(Đây cũng là
   lời cảnh báo cho mọi bảng số trước đó trong mục này: chênh lệch nhỏ giữa các lane rerank
   (colbert 0,375 vs bge-dense 0,378) cùng nằm trong vùng nhiễu — đừng đọc thành thứ hạng chắc.)*
   **Dò tiếp cùng đêm — ứng viên cho TRẦN POOL (chỗ colbert không đụng được):**
   `Qwen3-Embedding-0.6B` — **Apache-2.0 · 100+ ngữ · Matryoshka 32→1024 · 32K context · có bản
   ONNX chính chủ cho transformers.js** (cùng runtime đang chạy, thay model là chạy) — xếp trên
   EmbeddingGemma ở MTEB đa ngữ; kèm anh em `Qwen3-Reranker-0.6B` (đúng lỗ "T6 reranker đa ngữ
   chưa thử được" của plan 17 §3.1). Phép thử rẻ trước khi bàn re-embed: khuôn `dims-test` —
   pool đóng băng + 68 nhãn, so recall Gemma-768 vs Qwen3 (cắt 768/512/256 trên cùng dãy số).
   GM nhắc lại: chính user đã chỉ BGE-M3 làm "ứng viên #1" từ 2026-06-25 (`#97147`) — dense +
   sparse + colbert một model; sparse lane của nó cũng là ứng viên nới pool chưa thử.
4. ~~**`tooltest.db` 1,71 GB**~~ — **KHONG CON tren dia** (do 2026-08-13). Da xoa, khong con cho ai.

**VIỆC KẾ TIẾP đã rõ đường:**
- 🔴 **Backup tự động ĐÃ KHÔNG CHẠY 4 NGÀY** — bản mới nhất trong `data/backups/` là **08/08
  01:02** (1.232 MB). Chính cơ chế này cứu kho hồi 04/08. Chưa truy nguyên nhân. **Ưu tiên cao
  nhất** trong danh sách này: nó là lưới đỡ cuối cùng của kho.
- **Watermark chết sau `import`** — nguồn gốc của cả đống file vừa dọn: `import` đổi hẳn không
  gian id, watermark `drive:<host>` không khớp nữa nên lượt push kế tiếp đổ nguyên kho. Ở lối
  một-file nó không còn đẻ file mới, nhưng vẫn nối một khối ~336 MB thừa. Sửa: sau `import`, đặt
  lại watermark theo `MAX(messages.id)` mới.
- **Khối vector LỊCH SỬ** (226k vector ≈ 700 MB) — đường thường ngày đã chở vector của tin mới;
  phần tồn đọng chỉ cần khi dựng máy mới. Chưa làm, chờ lúc bàn giao thật.
- **19.474 tin ngoài phạm vi embed** (`Read` · `Grep` · `TodoWrite`…) — cố ý bỏ, nay NHÌN THẤY
  được. Muốn phủ thì phải qua cổng điều 15 (đo trước, bản sao trước).
- **Cửa sổ phụ của tin dài không đi theo gói** (`vec_map`, 5.874/226.973 ≈ 2,6%) — máy nhận tự
  nhúng phần đuôi. Ghi ra để không ai tưởng gói chở đủ 100%.

- ✅ **SỬA TẠI CHỖ: cổng so NỘI DUNG bản guard của bộ cowork** (`template-parity.test.mjs`, đột biến
  chứng minh đỏ được). Bộ cowork là bộ DUY NHẤT ship sẵn `hooks/guard.cjs` và hôm nay nó được **chép
  tay**; cổng duy nhất canh nó là **số dòng** trong MANIFEST ⇒ hai bản lệch nội dung mà trùng số
  dòng thì lọt. Nay so từng byte.
- ✅ **(③) ĐƯỜNG CỨU HỘ — ĐÃ NỐI XONG 2026-08-12** (`06_CHANGES [2026-08-12]`). `memory salvage`
  nay gọi `salvageVectors` sau `salvageMemory`, đọc số chiều qua `vectorDimsOf()` mới, in
  `copied/lost`, fail-open khi kho nguồn chưa từng nhúng. Cổng `salvage-vectors.test.mjs` **3/3**,
  đột biến chứng minh đỏ được (bỏ lời gọi ⇒ 1 đỏ). *Giữ hồ sơ gốc bên dưới để không ai mở lại.*

<details><summary>Hồ sơ gốc của lỗ (phát hiện 2026-08-11) — giữ để tra lý do</summary>

- **ĐƯỜNG CỨU HỘ CHỈ CHẠY MỘT NỬA — `salvageVectors` không ai gọi.** Đây là phát hiện
  đáng giá nhất của lượt audit, và đúng loại mà 6 mặt cũ **không thể** thấy (không lỗi, không đỏ,
  chỉ im lặng thiếu).
  **Bằng chứng, ba nguồn khớp nhau:** ① quét 567 export ⇒ `salvageVectors` là hàm DUY NHẤT không
  phải kiểu mà **không ai dùng, kể cả trong chính file nó** (grep toàn repo: xuất hiện đúng 1 lần =
  dòng khai báo) · ② `salvage.ts:103` — `salvageMemory` tự ghi *"KHÔNG dựng lại FTS/vector ở đây —
  gọi …"*, tức nó CỐ Ý để phần vector cho người gọi · ③ `commands/memory.ts:758` gọi **mỗi**
  `salvageMemory` rồi in kết quả, không gọi tiếp.
  **Hậu quả:** kho hỏng (đã xảy ra **HAI LẦN**) thì `zemory memory salvage` cứu được dòng nguồn
  nhưng **bỏ lại toàn bộ chỉ mục vector** — phải embed lại từ đầu, hiện là **~55 giờ máy** (43 giờ
  đợt 768d + 12–16 giờ lớp tool). Chính đoạn code viết ra để tránh việc đó thì nằm im.
  ⚠ **Đừng coi là "chỉ là lớp dẫn xuất nên không sao"**: đúng về nguyên tắc (HP điều 3), nhưng cái
  giá là 55 giờ, và hàm này đã ghi sẵn ba cái bẫy phải trả giá mới biết (vec0 không nhận
  `WHERE rowid > ? ORDER BY rowid` · rowid chunk bắt đầu từ 2^40 · phải bật `safeIntegers` vì vec0
  từ chối float64). Vứt đi là vứt luôn hiểu biết đó.
  **Sửa:** sau `salvageMemory`, gọi `salvageVectors(src, out, dims)` (đọc `dims` từ `vec_config`
  của kho nguồn, fail-open nếu không đọc được) rồi in `copied/lost`.

</details>

  ✅ **(③) Export thừa — DỌN XONG 2026-08-15: bỏ `export` ở 11 hàm** (`loadCorpus` ·
  `driveFsPrefsPath` · `browserAccounts` · `findSplitProjects` · `setStoragePointer` ·
  `rareTerms` · `rm3Expand` · `bundleSignature` · `isBundleMerged` · `markBundleMerged` ·
  `listDriveHosts`). `tsc` + `lint` + gate xanh ⇒ không cái nào đang được dùng ngoài file mình.
  **GIỮ có chủ đích 2 cái:** `machineBusyReason` (API của `helpers.mjs` cho mọi test) và
  **`formatCloudReport`** — lint báo "never used" nhưng nó **KHÔNG phải rác**: đó là bản in của
  lưới đỡ cho sự cố ĐÃ XẢY RA THẬT (04/08 Drive cuốn cả kho lên mây, HP điều 11/14). Thiếu là
  thiếu **chỗ GỌI**, không phải bản thân nó → xem mục dưới.
  ⚠ **Ba lần phép đo tự hỏng khi làm việc này, ghi để đừng tin nhầm:** quét sai regex ra
  **345/345** (vô lý — app sẽ không chạy nổi) · quên tính `backend/test/` ra **53** (báo oan) ·
  regex thiếu cờ `g` nên `match()` luôn trả 1 ⇒ báo cả 13 cái là "không ai dùng", kể cả hàm tôi
  BIẾT đang được gọi. **Cách chữa dứt: đếm bằng `split()`, đừng đưa regex qua shell/sed.**
- ✅ **`formatCloudReport` — ĐÃ NỐI VÀO `doctor` 2026-08-20 (user duyệt "làm đi")**: khối chi
  tiết in sau features (check `storage-safety` vẫn giữ dòng ngắn — không trùng logic, cùng gọi
  `cloudSyncReport`); kho sạch thì im. Trả công ngay lượt chạy đầu: lộ dấu vết
  `*.tmp.driveupload` còn trong `D:\huy.nguyen` mà trước không bề mặt nào nói.
  (thu hẹp tầm nhìn là dọn dẹp, không gấp). *150/171 mục còn lại là `interface`/`type` — bề mặt
  KIỂU, KHÔNG phải rác; đừng "dọn".*
- ✅ **(⑦) 10 file `.idx` mồ côi — HẾT 2026-08-13** (đo: đúng **1 `.idx` / 1 `.pack`**). `git gc`
  chạy trong đợt dọn weight đã cuốn luôn.
- ✅ **(⑦) Pack repo 233 MiB — CÒN 22,52 MiB 2026-08-13.** Thủ phạm đã truy ra và dọn xong (xem
  `06_CHANGES [2026-08-13i]`). *Vế `share.key` có trong lịch sử: **vẫn còn giá trị** — xoay chìa
  là việc riêng, không dọn được bằng `gc`.*
- ❌ **(⑥) "`/memory-status` mất 18,5 giây" — SỐ ĐÃ CHẾT.** Đo lại 2026-08-13 lúc máy rảnh:
  `fresh=1` **6,1 / 4,1 / 4,1 s**, cache ấm **0,003 s**. Mục sống nằm ở `[~] (⑥)` phía trên —
  đừng đọc hai mục thành hai việc.
- ❌ **(⑩) "Daemon báo v1.2.0 / package 1.3.0" — SỐ ĐÃ CHẾT** (nay v1.4.1 vs **1.5.10**). *Bài học
  thì vẫn đúng và đáng giữ: **đừng lấy version trên UI làm bằng chứng về mã đang chạy** — chính
  bẫy này làm ta tưởng đã restart daemon hôm nay trong khi chưa.*
- ✅ **(⑩ · luật 7) Guard CHẶN NHẦM lệnh audit — ĐÃ SỬA 2026-08-13.** Nay chỉ soi token **trông
  như tệp đang bị đọc**: có dấu phân cách đường dẫn · đứng ngay sau một lệnh đọc (bỏ qua cờ) ·
  hoặc là token cuối câu. Ba dấu hiệu đó vẫn chặn đủ `cat /etc/ssh/id_rsa` · `cat id_rsa | grep`
  · `head id_rsa` · `base64 ~/.ssh/id_rsa` (có cổng riêng cho từng ca, để bản vá không lén nới).
  **Bằng chứng A/B trên cùng payload:** guard cũ `exit 2` (chặn) — guard mới `exit 0`.
  *Phiên này dính lại đúng ca đó khi gõ `grep -rln "id_rsa" …| head` để đi SỬA nó.*
  Đã sinh lại `docs/hooks/guard.cjs` + đồng bộ bản ship cho bộ cowork (cổng byte-parity bắt được
  ngay khi quên — đúng việc nó sinh ra để làm).

**Mặt ① — ĐANG CHẠY 2026-08-11, và đã ra 3 phát hiện trước cả khi test xong:**

- ❌ **Sổ SAI: "agent bị bộ lọc quyền chặn cả hai (`hook install`/`uninstall`)".** Thử thật:
  `zemory hook uninstall` chạy sạch, gỡ đủ 4 sự kiện khỏi `~/.claude/settings.json` (đếm lại: 0 dấu
  vết). **Agent tự tắt hook được** — dòng cũ đã chặn oan mặt ① suốt nhiều tuần. *(Lần thứ tư trong
  ngày sổ nói khác thực tế.)*
- 🔴 **Chốt chặn THẬT của `npm run check` không phải hook, mà là `clean`:** khoá `test` chạy
  `npm run build` trước, mà `build` = `clean && tsc` ⇒ **xoá `dist/` ngay dưới chân job đang chạy**
  (repo đã giết job một lần đúng kiểu này). Đường vòng an toàn, dùng lại được: **`npx tsc`** (ghi
  đè tại chỗ, không xoá) rồi gọi thẳng `node --test "backend/test/*.test.mjs"`.
- ✅ **LINT ĐỎ 2 lỗi, đã sửa** — `search.ts` `docFreq` và `platform/window.ts` nhịp tim, cùng một
  kiểu `no-useless-assignment` (khởi tạo rồi luôn bị ghi đè ở cả `try` lẫn `catch`). Cả hai landing
  **09–10/08**, tức **gate chưa hề chạy từ ~05/08** vì hook bật chặn ⇒ lỗi lọt vào mà không ai biết.
  Đây đúng là thứ mặt ① sinh ra để bắt. Sau khi sửa: `lint` xanh · `typecheck` xanh.

⚠ **HOOK ĐANG TẮT** (tôi gỡ để chạy gate). **Bật lại bằng `zemory hook install` ngay sau khi gate
xong** — quên là capture chết lặng, không ai báo.

**Chưa đo được — ghi thẳng, KHÔNG ghi "sạch"** (luật 3):
- **Mặt ③ vế "export mồ côi":** chưa có công cụ, chưa đo. Vế "nguồn trùng" đã đo xong.
- **Mặt ⑧ vế "dựng từ clone SẠCH":** chưa đo (cần `npm install` ở thư mục trắng).

- ✅ **`autosync` — ĐÃ BẬT LẠI, sổ nói sai** *(đo 2026-08-11 bằng HAI nguồn: khoá `autosync` trong
  file config cạnh kho **và** `/automation` của daemon đang chạy — cả hai đều `true`)*. Dòng cũ ghi
  "đang TẮT, tôi tắt 08/08" đã hết đúng. `scheduler` thì vẫn TẮT thật.

- ✅ **Rebuild 768+fp32 trên BẢN SAO — XONG 08/08, ĐÃ TRÁO** *(dấu `[~]` giữ tới 09/08 là lạc
  hậu — kho thật đang chạy 768d/fp32, xem mục TRÁO KHO ngay dưới)*. `D:\huy.nguyen\zemory-lab\lab.db` (~43 giờ, đo thật).
  Chạy tiếp: `memory embed --all` với `GLOBAL_MEMORY_DB` trỏ bản sao **và** `ZEMORY_MODEL_DIR`
  ghim `data\models` (thiếu là nó tải lại 1,2 GB model, vì thư mục model suy ra từ thư mục DB).
  Bản sao đã đóng dấu `vec_config = {768, gemma-prompt-v1, fp32}`.
  - ⚠ **KHÔNG `npm run build` khi job đang chạy** — `clean` xoá `dist/` ngay dưới chân tiến trình
    (đã giết job một lần). Cần build thì `npx tsc` (ghi đè tại chỗ, không xoá).
  - ⚠ **Tiến trình agent tự phóng đều bị dọn** (`Start-Process`, WMI `Win32_Process.Create`);
    `schtasks` thì bị bộ lọc quyền chặn. Chỉ lệnh nền do harness quản lý mới sống qua nhiều lượt.
- ✅ **TRÁO KHO — XONG 2026-08-08.** Thực hiện đúng thứ tự: tắt daemon (nó giữ file) → đổi tên
  256 thành bản lùi → chép 768 vào vị trí → `quick_check ok` → `memory scan` (**+9.530 tin**,
  6 giây) → `memory embed` bù ở 768/fp32 → daemon bật lại đọc đúng kho mới.
  **Bài học thao tác:** gói TOÀN BỘ bước thay file vào MỘT lần chạy script, để hook capture
  (đang bật) không chen vào giữa lúc file đang đổi tên; và script có chốt "file còn bị tiến
  trình khác giữ sau 30 s ⇒ DỪNG, không thay" — thay file đang mở đúng là cách hỏng kho mà
  repo này đã trả giá hai lần.
  > 📏 **ĐO HAI LƯỢT, CẢ HAI SAU KHI EMBED XONG — đừng chạy song song với job** (bài học đo được
  > 2026-08-07: bench và embed cùng chạy mô hình ONNX trên một CPU nên giẫm chân nhau — bench ngốn
  > 3.208 s CPU mà 19 phút mới in nổi dòng tiêu đề, embed tụt về **0 chunk/30 s**; dừng bench thì
  > embed hồi lại **32 chunk/phút** sau ba mẫu đo. Ngoài ra bench chạy lúc máy bị chiếm thì cột
  > `ms/truy vấn` vô nghĩa). Kho thật 256 đứng yên tới lúc tráo ⇒ đo lúc nào trước tráo cũng cùng số.
  > ① `node dist\cli.js memory bench --recall --skip-rerank` (mặc định = kho THẬT 256) ⇒ mốc TRƯỚC.
  > ② `$env:GLOBAL_MEMORY_DB="D:\huy.nguyen\zemory-lab\lab.db"` rồi chạy lại ⇒ mốc SAU (768/fp32).
  > ③ So **BẢNG THEO LỚP** (`prose` · `tool_use` · `tool_result`), không so con số gộp.
  > Công cụ đã sẵn: corpus 56 câu chia lớp + bench in bảng theo lớp (commit `67a5812`).
  > 🔴 **BIẾT TRƯỚC: kho 768 sắp tráo VẪN thiếu vector cho hơn nửa số tin — đừng tưởng tráo xong
  > là recall hết rác** (user báo 2026-08-07: agent bên SasinFlow thấy `memory search` trả kết quả
  > lạc repo / ảnh / không liên quan, nghi kho hỏng vì cắt 256 chiều). Đo bằng MÃ, không qua search:
  > `vectors.ts` lọc `tool_name IS NULL` khi chọn tin để embed (chỉ mở bằng `ZEMORY_EMBED_TOOLS=1`),
  > và lệnh embed đang chạy KHÔNG đặt biến đó ⇒ 43 giờ này nâng phần ĐÃ có vector, **không lấp**
  > phần chưa bao giờ có. Cộng thêm `db.ts` loại chính nhóm đó khỏi FTS trigram ⇒ với phần kho ấy
  > chỉ còn MỘT chân tìm kiếm (FTS word). Khớp con số cũ: 119.668 tin tool-dump / 171 có vector.
  > **Chưa xác minh, đừng đoán:** "trả kết quả từ repo khác" nghe giống lỗi SCOPE (search vốn scope
  > theo project, trừ khi `--all`) hơn là lỗi số chiều; "trả về ảnh" chưa tìm ra nguyên nhân. Hai
  > cái này phải đo riêng — plan 17.
  > ✅ **User chốt 2026-08-07:** *cứ để 768 chạy cho xong, rồi embed tiếp đợt nhỏ cho các tin mới.*
  > Tức KHÔNG dừng job, KHÔNG thử tool-dump lúc này; việc embed tool-dump có đáng hay không để
  > **sau khi tráo + `bench --recall`** cho ra số thật, và phải qua phép thử nhỏ trên BẢN SAO
  > trước (HP điều 15 — tăng cũng phải đo trước).
- ✅ **Rerank — ĐÃ ĐO 2026-08-08, kết luận: GIỮ TẮT mặc định.** Trên kho 768: hybrid `41%@10`
  · hybrid+rerank `27%@10` (MRR 0,220 → 0,160) · **11 s/truy vấn** so với 0,68 s. Nó làm recall
  TỤT, không phải tăng. Mục này trước ghi "chưa đo, tạm chấp nhận" — nay đóng bằng số.
  *(dtype rerank vẫn `q8`; không còn ý nghĩa để đo tiếp khi lane này không bật.)*
- ✅ **plan 17 — recall quality: VIẾT XONG + ĐO XONG 6 GIẢ THUYẾT 2026-08-08/09.**
  `docs/plan/17_recall_quality.md`. Kết quả: **2 thắng đã ship mặc định** (đa-truy-vấn RRF ·
  trộn cosine) · **2 opt-in trượt cổng** (gộp near-dup · cổng không-biết) · **2 bị bác bằng số**
  (router trọng số · tiền tố ngữ cảnh — cái sau cứu ~40 giờ embed lại toàn kho).
  Thước chính thức 68 nhãn: `@10` **32% → 41%** · MRR **0,235 → 0,282** · `prose` MRR
  0,410 → **0,458** · `prose@40` 68% → **94%** khi agent gửi 3 lối nói.
  Trả 2 món nợ đo lường: **bộ âm giữ riêng 10 câu** + **lớp nhãn `keyword` 12 câu** (12 phiên/
  12 project) — lần đầu corpus phủ lối gõ từ khoá; bench nay chạy CẢ HAI bộ âm (18 câu).

- ✅ **`global_memory.HONG-20260804-*.db` — ĐÃ XOÁ 2026-08-08** (1.026 MB, user duyệt). Kiểm
  SHA256 trước khi xoá: trùng khít hai bản trong `data/corrupt-20260803-091106/` ⇒ vật chứng
  còn nguyên. Đây là cách xoá đúng với thứ được đánh dấu "không được xoá": chứng minh nó là
  BẢN SAO trước, đừng tin mỗi tên file.
  ✅ **Hai mục xoá — XONG 2026-08-15, user tự xoá.** Thư mục `zemory-lab` KHÔNG còn trên đĩa
  (đo: `test -d` ⇒ không tồn tại). *Hồ sơ gốc giữ bên dưới để tra lý do từng khuyến nghị giữ.*
  ~~**Còn hai mục xoá, CHỜ user:** `attic\zemory-lab\lab.db` (1,18 GB, bản lab máy cũ) +~~
  folder `D:\huy.nguyen\zemory-lab`. ⚠ **Khuyến nghị GIỮ `zemory-lab` thêm vài ngày** — chính
  `lab.db` trong đó là NGUỒN của kho 768 đang chạy; xoá sớm là bỏ mất đường lùi thứ hai khi
  bản lùi 256 đã cũ hơn hiện trạng. Ổ D còn **139 GB**, không có áp lực dung lượng.

- ✅ **`relocate` chở cả cụm — XONG 2026-08-06** (`[2026-08-06c]`: danh sách ĐEN, bí mật kẹt ⇒ huỷ).
- ✅ **Cảnh báo sớm cloud — XONG 2026-08-06** (`cloudguard.ts` + check `storage-safety`, đọc `roots`
  DriveFS thật; phân hạng bằng-chứng/dấu-vết chống báo oan — `[2026-08-06c]`).
- ✅ **TRUY NGUYÊN NHÂN GỐC — ĐÃ ĐÓNG** (Drive đồng bộ chính file DB — `[2026-08-03h]`; 05/08 lộ thêm
  tầng Computers-backup). Hồ sơ điều tra giữ nguyên bên dưới **để không ai đi lại**; dòng "đã loại:
  thư mục đồng bộ đám mây" là kết luận SAI thời điểm đó, đọc kèm cảnh báo này.
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
    - **② Write-gate KHÔNG BAO GIỜ TỪ CHỐI ai — ĐÃ SỬA** *(soát bằng code 2026-08-06; dòng này
      trước ghi "chưa sửa", SAI — sổ nói khác code)*. Khuyết tật gốc: `acquireCliWrite()` chỉ đặt
      một mốc thời gian và luôn trả `{ok:true, held:true}` — **hai CLI cùng gọi thì cả hai đều
      được "cấp"**. Cổng một chiều: chỉ bảo *scheduler của daemon* nhường, KHÔNG loại trừ
      CLI↔CLI; và `daemonPort()` trả null khi daemon chết ⇒ **không có cổng nào cả**.
      ⇒ Đã có khoá THẬT: `acquireCliWriteLock(label)` (`jobs/writegate.ts`) ghi **khoá FILE**
      mang `{pid,label,at}`, **trả `ok:false` + `heldBy`** khi tiến trình KHÁC đang giữ, gia hạn
      khi chính mình giữ (heartbeat cho job nhiều giờ); không đặt được khoá thì CHẠY (điều 9).
      `commands/memory.ts` bọc `HEAVY_WRITES = {scan · scan-web · embed · digest · sync}`, chờ
      tối đa 2 phút rồi chạy luôn. Test khoá `cli-write-lock.test.mjs` (có ca "phải bị từ chối").
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
- *(ĐÃ XONG, giữ dòng để khỏi mở lại: lịch backup tự động + xoay vòng đã xây `[2026-08-03c]` —
  chính nó cứu vụ kho hỏng lần hai trong 2 phút, `06_CHANGES [2026-08-04]`.)*

- ✅ **`W_OR` — ĐÃ HẠ.** Sổ ghi "0,6 → cần hạ ~0,25"; đo code: `search.ts:101`
  `W_OR = 0.3` (chỉnh được qua `ZEMORY_W_OR`). Đã nằm trong khoảng đề xuất.
- ✅ **ÂM TÍNH — CƠ CHẾ ĐÃ CÓ** (câu cũ *"chưa có cơ chế nào làm việc đó"* nay SAI).
  `search.ts:389` `ABSTAIN_DIST = 0,86` + `ABSTAIN_MARGIN = 0,05`, bật bằng `ZEMORY_ABSTAIN=1`.
  **Mặc định TẮT có chủ đích** vì trượt cổng nghiêm (chặn 5/8 bộ cũ + 4/10 bộ giữ riêng, giết
  oan 0/68) — xem `plan/17 §1.3`. Việc còn lại KHÔNG phải "xây cơ chế" mà là "tìm tín hiệu
  mạnh hơn margin" — đã nằm ở mục đo lại dưới thước tương đương ở đầu file.
- ✅ **`tool_result` KHÔNG còn 0%** — nới hình phạt tin tool 0,3 → 0,7 theo lane + trộn cosine
  đưa lớp này lên `@10` **63% → 75%** (thước tương đương). Xem `06_CHANGES [2026-08-09b]`/`[c]`.

- ✅ **User ĐÃ TẮT rerank** *(đo 2026-08-13 nguồn ③ chạy thật: `/memory-status` ⇒ `rerank: false`
  · `hybrid: true`)*. Hai mục con bên dưới ("sau khi tắt: đo lại", "cân nhắc sửa gốc") theo đó
  mà xét lại — hồ sơ đo giữ nguyên vì nó là bằng chứng cho quyết định.
  ~~**User tắt rerank** — nút trong UI (⚙), hoặc đổi khoá `rerank` thành `false` trong file
  config cạnh kho (gitignored nên `todo verify` không thấy đường dẫn — đừng viết nó dạng
  backtick đường dẫn, gate sẽ báo ref chết). KHÔNG tự đổi: đây là setting hiển thị của user.~~
  ⚠ **Soát 2026-08-09 (nguồn ③ chạy thật): VẪN đang `true`** — chưa tắt. **Đo lại end-to-end cuối
  ngày trên một truy vấn thật** (`"vì sao rerank làm recall tệ đi"`): tắt rerank **2,60 s** · bật
  **18,8–29,4 s** (chậm **7,2×**), và **top-10 chỉ trùng 1/10** — giữ hạng 1, xáo sạch 9 hạng sau.
  Cùng câu đó FTS-thuần **0,57 s** cho top-1 ĐÚNG là câu trả lời. Một truy vấn không phải kết luận
  chung, nhưng đây là lần đầu đo trên đường THẬT chứ không qua bench. Và giờ có thêm hai lý do
  mạnh hơn: ① đo lại trên 25 câu có đáp án TRONG pool, rerank vẫn thua hybrid (MRR 0,571 → 0,459)
  và tốn 10 s/truy vấn · ② **đã có bản thay thế rẻ hơn 270 lần đang chạy mặc định**: trộn cosine
  (`vecMix`) thắng ở đúng chỗ cross-encoder thua, giá 119 ms. Tức bật rerank hiện nay là trả 10 s
  để nhận kết quả tệ hơn thứ đã có sẵn miễn phí.
  ✅ **Đã tắt và đã đo** (2026-08-13/15: `/memory-status` ⇒ `rerank: false`, nguồn ③ chạy thật).
  ~~**Sau khi tắt: đo lại** một truy vấn thật để xác nhận header không còn `rerank` và~~
  thời gian về ~0,7 s.
- ✅ **Cân nhắc sửa gốc — QUYẾT KHÔNG VIẾT MIGRATION (2026-08-15, user giao agent quyết).**
  Đo: máy này config `rerank: false` (nguồn ③ `/memory-status`); máy mới nhận mặc định ĐÚNG từ
  ngày vá; máy cũ `SS01-IT-10` đã chết. Migration chỉ phục vụ ca "máy khác còn config cũ" —
  hiện không có máy nào như vậy đang chạy. Nếu `DESKTOP-PFB157K` (hay máy cũ nào) quay lại:
  kiểm MỘT lệnh (`/memory-status` → `rerank`) thay vì viết code đón một ca chưa tồn tại.

</details>

- ✅ **BUG đếm bundle — ĐÃ SỬA, sổ lạc hậu** *(soát bằng code 2026-08-11; dòng cũ ghi "chờ user
  gật" nhưng bản vá landing CÙNG NGÀY dòng sổ được viết)*. Đo: `ui.ts:264` nay khớp
  `.endsWith(".enc")` kèm comment nêu rõ lý do; commit **`1cbe86c` (10/08)**. Test khoá cũng có
  rồi: `recall-lane-defaults.test.mjs:88` chốt *"2 bundle series + 1 bundle đời cũ, KHÔNG đếm
  .txt/.md"* — chạy lại 11/08: **5/5 xanh**. Giữ dòng để không ai sửa lần hai.
  ✅ **ĐÃ SỬA 2026-08-15** (`06_CHANGES [2026-08-13l]`): cả hai bản vi/en nay nói thẳng số đo
  (`MRR 0,571→0,459` · `2,6 s → 18,8–29,4 s` · top-10 trùng 1/10) + *"trên kho này KHÔNG NÊN BẬT"*.
  ~~**UI khuyên SAI về rerank — VẪN CÒN** *(đo lại 2026-08-11: `chrome.js` khoá `f.doc.rerank`~~
  còn nguyên câu "đáng bật khi corpus lớn/nhiễu, câu hỏi khó")*, trong khi đo trên chính kho này
  nó **tệ hơn + chậm 11,6×**. Cùng loại "UI nói sai thực tế" đã sửa cho 256d/đường kho, nhưng đây
  là LỜI KHUYÊN nên không tự đổi — chờ user.
  **Câu thay đề xuất (cả 2 từ điển VI+EN):** *"OPT-IN, mặc định TẮT. Đo trên chính kho này
  (68 nhãn, 2026-08-10): rerank làm recall TỤT (`@10` 35%→28%) và chậm 11,6×. Chỉ bật khi muốn
  thử lại trên kho khác — đừng bật vì nghĩ 'corpus lớn thì nên bật'."*
- ✅ **3 comment sai đường kho — ĐÃ HẾT** *(soát 2026-08-11)*: grep toàn `backend/src` cho chuỗi
  `.zemory/global_memory` ra **0 kết quả**. Các chỗ còn nhắc `~/.zemory` đều HỢP LỆ và phải giữ
  (`location.json` con trỏ · `config.json` · thư mục `imports/` · ghi chú mặc định đời cũ) —
  đừng "dọn" chúng, chúng không phải đường kho.
- ✅ **Phân biệt khoá TƯƠI / MỒ CÔI — ĐÃ LÀM.** `commands/memory.ts:225-256`: hết thời gian chờ
  mà khoá vẫn TƯƠI ⇒ in `pid X đang ghi (label)` rồi **thoát**, chỉ chạy đè khi khoá đã mồ côi;
  `--force` là đường vượt có ý thức. Đúng nguyên văn đề xuất cũ.
- ✅ **Ca test tầng LỆNH — ĐÃ CÓ.** `backend/test/write-gate-command.test.mjs` (mục cũ ghi
  *"KHÔNG có ca nào phủ tầng LỆNH"* — nay sai). ⚠ Tồn tại ≠ đã chạy: file này nằm trong nhóm
  test chưa chạy lại vì hook đang bật (xem mục "5 file test còn mù").
- ✅ **Lỗ CON-CỦA-DAEMON — ĐÃ BỊT** (đây mới là nguyên nhân GỐC của ca 08/08, không phải
  scheduler). `memory.ts:189-202`: con mang `ZEMORY_DAEMON_CHILD=1` nay chỉ bỏ qua khoá **của
  chính mình**, gặp khoá của pid KHÁC thì BỎ QUA lượt ghi; `scheduler.ts:88` truyền thêm
  `ZEMORY_DAEMON_PID` để con phân biệt được hai loại khoá đó.

- ✅ **Gói nén bộ cowork — ĐÃ XOÁ 2026-08-11 (user duyệt).** Nguyên văn: *"file 7z ko cần, bỏ đi
  cũng dc, vì lấy trực tiếp từ git rồi"*. Đúng hai quyết định cũ đã ghi ở archive changelog
  (*"KHÔNG commit — nó là bản render, không phải nguồn"* 31/07 · *"chốt xoá, không gitignore"*
  02/08) mà file vẫn tracked tới `d9cf711` (05/08). **KHÔNG gitignore** — đúng nguyên văn quyết
  định cũ. Trước khi xoá đã đo: không tài liệu nào trỏ tới gói, và bản thân gói lạc hậu (mốc
  31/07, thiếu nhánh hooks, chở 4 file bản cũ) nên giữ lại là phát tán bản sai.
  ⇒ **Lối 3 của BOOTSTRAP ("xin người dùng gửi file zip") nay không có gói dựng sẵn** — người
  gửi tự nén từ cây nguồn. Chấp nhận được: lối 1 (tải qua tool web) mới là lối chính, đã đo chạy.
- ✅ **Khoá mồ côi trong `zemory-lab` — KHÔNG CÒN** (đo 2026-08-13: file không tồn tại).

- ✅ **① Hook `context-guard` (UserPromptSubmit, Claude Code) — GỘP cảnh báo + lưu (ý user).**
  Đọc `usage` tin cuối transcript phiên hiện tại → % cửa sổ (200k/1M theo model id). Dưới
  ngưỡng ⇒ **im lặng tuyệt đối**. Chạm ngưỡng (mặc định **95%**, config được) ⇒ MỘT phát làm
  cả hai: ingest ngay ĐÚNG file transcript này (đường scan-1-file mới, xem ③) + in 1 dòng:
  *"⚠ context ~95% — phiên đã lưu FULL vào GM. Chốt việc dở/ghi sổ trước khi bị nén; sau nén
  gọi `memory_context`."* Chống spam: **1 lần/phiên** (cờ marker). Verify lúc build: kênh
  hiển thị hook output tới user; công thức % có sai số cache/model.
- ✅ **② Lưới sau nén:** `PreCompact` → scan lần cuối ngay trước nén (đỡ ca compact ập tới
  không qua ngưỡng) · `SessionStart(matcher: compact)` → thẻ phục hồi 1-LẦN (`recallCard` +
  câu "vừa bị nén — kho còn nguyên, tra lại trước khi làm tiếp"). Handler session-start ĐÃ CÓ
  SẴN trong `capture-hook.ts` (opt-in chưa cài) — chỉ thiếu khai matcher. Đây là auto-inject
  đầu tiên của hệ: 1 thẻ nhỏ, đúng 1 lần, đúng sự kiện mất trí nhớ — user đã chốt; ghi
  changelog như diễn giải điều 8 (điều 8 cấm *broad memory mỗi prompt*, không cấm thẻ này).
- ✅ **③ Realtime capture — LÀ ĐƯỜNG NẠP CHÍNH, mặc định BẬT (user chốt lại 2026-08-02:
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
- ✅ **④ Mảnh luật (mọi agent, kể cả không hook):** +2 câu vào `MEMORY_PROTOCOL` + mô tả
  `memory_context`: *"context vừa bị nén/tóm tắt → gọi memory_context + memory_search dựng
  lại TRƯỚC khi làm tiếp, đừng đoán từ bản tóm tắt."* Cursor/Windsurf/Qwen chỉ nhận mảnh này;
  Cowork ngoài phạm vi.
</details>

- ✅ **5 export mồ côi — ĐÓNG NỐT 2026-08-06.** 4 mục nối từ trước; `resolveDocPath` xử theo đúng
  chẩn đoán cũ ("hai bên KHÁC ngữ nghĩa resolve, gộp hàm là sai"): rút BẤT BIẾN an toàn ra
  `util/safe-path.ts::isWithinBase`, hai bên giữ resolve riêng — `[2026-08-06c]`.

- ✅ **Edge id — ĐÃ CÓ PHÍA TIÊU THỤ 2026-08-06** (`[2026-08-06c]`): `graph export` đóng dấu eid
  (trước CHỈ payload UI có — consumer không trích dẫn nổi từ contract) · lệnh `zemory graph edge
  <eid>…` kiểm id được dẫn + in **cited-edge validity** N/M. Kèm vá trùng id: 2.865 cạnh/1.288 id
  (1 id gánh 157 cạnh calls) → băm cả symbol ⇒ duy nhất 100%, id `imports` giữ nguyên.
- ✅ **Tách `app.js` — XONG CẢ 3 BƯỚC** (`[2026-08-06c]` + 2026-08-07). 1.837 dòng/1 IIFE → **12 file**
  global-scope (`core` nạp đầu · `boot` cuối; thứ tự khai ở `app.html`, guard drift ở `helpers.mjs`).
  Bước 3 lộ ra một lỗi của chính bước 1: `graph.js` **ôm 125 dòng KHÔNG phải graph** (`renderMem` ·
  `renderDiscovered` · `renderDriveDonut` · `refreshChecks` · `loadRecentSessions`…) vì lần đó cắt
  theo dải phân cách, mà dải "graph" trùm luôn đầu khối PHASE-2. Đã trả về đúng nhà theo concern
  (gm · sources · system · shell), rồi mới chia phần graph thật thành `graph-render` (canvas, 31 KB)
  + `graph-panel` (cây/toolbar/seam, 9 KB). File to nhất giờ là `chrome.js` 56 KB — **từ điển i18n**,
  không phải logic, nên không tách.
  **Chờ user:** đảo mắt UI thật một lượt khi mở `zemory ui` lần tới (máy kiểm hết, mắt người chưa).

**🔥 VIỆC KẾ TIẾP:**
- **(user giao 2026-07-16) SasinFlow — UI 1 file HTML: ĐÃ TÁCH XONG, mục này lẽ ra đóng từ lâu.**
  > ⚠ **Sổ đã nói khác code suốt ~3 tuần** — user bắt được 2026-08-05 (*"2 cái này làm lâu rồi mà má,
  > ko check code thật à?"*). Tôi liệt kê theo TODO mà không mở repo ra đo. Đúng cái lỗi `02_RULES`
  > gọi là *"sổ nói khác code"*, và là lý do luật đòi đo trước khi khẳng định.
  **ĐO THẬT (read-only trên repo SasinFlow, 2026-08-05):** `frontend/index.html` **5.150 → 499 dòng**
  (38 KB). JS đã ra **7 file** — `anomaly.js` 237 KB · `core.js` 114 · `invoice.js` 94 · `settings.js`
  92 · `recon.js` 82 · `heartbeat.js` 22 · `update.js` 6 — CSS ra `styles/app.css` (79 KB), HTML nạp
  bằng **7 `<script src>` + 1 `<link>`**, chỉ còn 1 khối script nội tuyến. Tức **bước 1–2 của phương
  án 4 bước đã xong** (CSS tách · JS cắt nhiều file giữ global scope).
  **CÒN LẠI (đúng 2 bước cuối, vẫn ở repo SasinFlow — cross-project, không tự làm):** ③ gỡ **105
  `onclick=` inline** (survey cũ ghi 127 ⇒ đã giảm phần nào) · ④ nâng ES module. Cả hai là "làm sạch",
  không chặn gì — chỉ làm khi user yêu cầu bên đó.
- ✅ **DAEMON CHẾT KHÔNG LỜI TRĂNG TRỐI — TÌM RA NGUYÊN NHÂN GỐC 2026-08-10, ĐÃ SỬA.**
  > 🔄 **Bác giả thuyết chủ đạo của chính mục này** (*"nghi crash NATIVE — better-sqlite3/
  > onnxruntime segfault bỏ qua handler JS"*). Soi ba tuần sai hướng. Nguyên nhân thật là
  > lỗi thiết kế của repo: `autostart.ts` dùng `start "" /b` — cờ `/b` **KHÔNG tách tiến
  > trình**, daemon chạy TRONG CÙNG console với file khởi động nên bị buộc vào vòng đời
  > console đó; console đóng ⇒ Windows gửi `CTRL_CLOSE_EVENT` rồi `TerminateProcess` ⇒
  > **giết cứng, không handler nào kịp chạy**.
  >
  > **Vì sao hộp đen im lặng — và vì sao đó là bằng chứng chứ không phải hộp đen hỏng:**
  > `process.on("exit")` ghi MỌI lối thoát bình thường. Bốn nguồn cùng im (không
  > `shutting down` · không `process exit code=` · không `report.*.json` · Windows không
  > có `Application Error` cho `node.exe`) ⇒ **loại trừ** hết đường đi qua Node, còn đúng
  > một khả năng: bị kết thúc cứng từ ngoài. Hộp đen trong tiến trình **về nguyên tắc**
  > không bắt được ca này.
  >
  > **Đã sửa 3 lớp:** ① gốc — autostart sang `.vbs` (`WshShell.Run(cmd,0,False)`), thử
  > thật: daemon sinh ra MỒ CÔI (cha đã thoát), `/ping` sống · ② triệu chứng — cửa sổ có
  > nhịp tim, daemon chết thì cửa sổ **chết theo** (thử thật: giết server giả ⇒ cửa sổ
  > thoát sau 20,2 s); kèm luật `02_RULES §Bề mặt CHẾT THEO nền` · ③ chẩn đoán —
  > `daemonHeartbeat()` ghi mốc mỗi 30 s vào `data/logs/daemon-heartbeat`, để lần sau
  > ghim được PHÚT chết.
  >
  > ⚠ **Chưa bắt tận tay.** Giả thuyết khớp rất sát nhưng ca 10/08 không được quan sát
  > trực tiếp lúc chết. Nhịp tim là thứ chốt ở lần sau. Ca chết còn lại trong ngày
  > (02:18) **user tự tắt máy** — đã xác nhận, không phải bug.
  >
  > 🔎 **Hệ quả chưa sửa:** mọi daemon do agent khởi động từ shell của nó cũng dính đúng
  > lỗi này (con của `bash.exe`) — đó là lý do **hai job embed chết giữa chừng 10/08**.
  > Lệnh dài phải chạy qua đường tách tiến trình, không phải qua shell của phiên.

<details><summary>Hồ sơ điều tra gốc (2026-07-21 → 08-10) — giữ để tra</summary>

- ✅ **CODE: series của HOST ĐÃ CHẾT — ĐÓNG 2026-08-06** (`[2026-08-06c]`): lệnh
  `zemory memory sync --prune-host <host>` (dry-run mặc định; chỉ xoá khi ① mọi bundle của host đó
  đã merge vào kho máy này ② series máy này phủ đủ để máy thứ ba lấy tiếp; cấm tự dọn chính mình).
  *(Phần dọn tay đã xong trước đó — `[2026-08-06]`. Hồ sơ chẩn-đoán-sai giữ dưới để khỏi lặp.)*
  > ⚠ **Tự sửa mô tả tôi viết vài giờ trước** (*"compact chưa từng code"*) — **SAI**. Đo: `share.ts`
  > có `DRIVE_COMPACT_AT = 12`, nhánh `compacting` ghi baseline mới rồi **xoá hết file cũ** (an toàn
  > vì baseline là tập cha), và `drive-sync.test.mjs` có test khoá *"compaction folds many deltas
  > into one baseline without losing a row"*. Tôi kết luận "chưa code" chỉ từ việc **đếm file trên
  > Drive** — đúng cái lỗi luật cấm: thấy triệu chứng rồi phán nguyên nhân.
  **Lỗ THẬT (hẹp hơn nhiều):** compact chỉ chạy cho **series của CHÍNH máy đang chạy**
  (`listMySeries(dir, host)`), và ngưỡng là **12 file**. Nên: máy này 2 file — chưa tới ngưỡng, đúng
  thiết kế; máy cũ `SS01-IT-10` **9 file (~338 MB)** — **sẽ nằm đó vĩnh viễn** vì máy đó đã bỏ, không
  còn ai chạy compact cho series của nó. **Việc còn lại:** ① dọn tay 9 file máy cũ SAU khi verify nội
  dung đã nằm trong kho local (kho đã có đủ dữ liệu máy cũ tới 04/08 — vẫn phải đo, không tin); ②
  cân nhắc cho compact/`sync` xử được **series của host đã chết** (hoặc lệnh `memory sync --prune-host
  <host>` có dry-run), vì đây là ca sẽ lặp mỗi lần đổi máy.
- ✅ **Folder Drive — ĐÃ CHỐT 2026-08-06 (user): GIỮ, không hỏi lại.** Nguyên văn: *"cái này là nơi
  lưu chính của GM để share máy khác mà… để đó chứ hỏi gì"*. `G:\My Drive\Global Memory` = kênh bundle
  `.enc` chính thức xuyên máy (đúng thiết kế plan 08/14) kiêm bản sao ngoài máy. Câu hỏi "xoá Drive"
  là kế hoạch cũ đã chết — đừng dựng lại.
- [x→06_CHANGES khi user OK] **Backup máy (Computers) từng cuốn cả kho trần + chìa — ĐÃ TẮT 2026-08-05 tối.**
  Phát hiện: DriveFS backup **toàn bộ `D:\huy.nguyen`** (sổ `mirror_item` có `cloud_filename` cho
  `global_memory.db` + `share.key` = ĐÃ từng lên Drive dạng trần — chìa nằm cạnh két, điều 7; DB sống
  trong vùng sync, điều 11 — đúng cơ chế hỏng kho 03/08). User gỡ root khỏi Computers; verify bằng
  HÀNH VI (file mồi không bị cuốn sau 35s + hàng đợi chỉ còn xác cũ mtime tháng 7) vì file config ghi trễ.
  Bản đã lỡ lên mây: **user xác nhận đã xoá**. **Còn 1 đuôi — xoay `share.key`: QUYẾT HOÃN TỚI
  LẦN BÀN GIAO MÁY KẾ (2026-08-15, user giao agent quyết).** Lý do: ① mức lộ là Drive CỦA CHÍNH
  user (bản trần đã xoá), không phải công khai — khác hẳn chìa CŨ trong git · ② xoay bây giờ =
  re-export trọn kho Drive (~1,4 GB) bằng chìa mới **và phải mang tay chìa sang máy kia** — agent
  tự xoay là khoá máy kia khỏi kho chung trong im lặng · ③ lần dựng/bàn giao máy kế PHẢI mang chìa
  tay sẵn ⇒ xoay lúc đó là chuyến xe miễn phí. Quy trình sẵn ở `plan/16 §3`.
- *(Đề xuất HP điều 14 "bí mật: ngoài git ≠ ngoài repo" — đã nằm ở mục ngay dưới, cũng chờ user.)*

- ✅ **(Graph) Độ mịn + overlay — CÂU HỎI ĐÃ BỊ CODE TRẢ LỜI, đóng 2026-08-07.** Sổ hỏi *"v1 dừng
  ở file hay kéo tới hàm (AST)? overlay semantic_neighbor làm v1 hay phase 2?"* (viết 19/07) —
  **cả hai vế đã build từ 22/07**, tức câu hỏi treo 2,5 tuần sau khi hết là câu hỏi: `graph-symbols.ts`
  (symbol AST hàm/class/method + dòng, qua tree-sitter WASM; tiêu thụ ở `zemory graph callers` và
  `graph impact`) · `graph-semantic.ts` (`semanticEdges()`, `type:"semantic_neighbor"` nhãn `inferred`,
  cờ `--semantic`). Cả hai dependency nằm trong `package.json`, không phải optional.
- ✅ **(plan 14 §7) HẾT quyết định mở — cả 5 đã chốt BẰNG CODE** *(soát 2026-08-06; mục này trước
  ghi "chỉ còn HAI: ① tray ② write-gate", SAI — sổ nói khác code)*:
  ① **tray** = `platform/tray.ts` dùng **systray2** (MIT, helper Go prebuilt nên không cần
  node-gyp — đã rà license theo HP điều 2), fail-open khi tray không dựng được, helper là con của
  daemon nên không đẻ icon ma; `traysweep.ts` dọn icon mồ côi. Verify live 2026-07-21.
  ② **write-gate phủ lệnh nào** = `HEAVY_WRITES = {scan · scan-web · embed · digest · sync}`
  (`commands/memory.ts`). ③ autostart per-OS = `platform/autostart.ts` (Startup .cmd/launchd/xdg)
  · ④ graph cache = in-memory + bảng `graph_fitness` · ⑤ chu kỳ auto-sync = syncjob 30'.
- ✅ **`npm i -g github:` — ĐÃ CHỐT 2026-08-06 (user): GIỮ ĐƯỜNG CLONE, không đổi package.**
  Cả hai lối chữa đều trả giá không đáng: `typescript` sang `dependencies` = mọi bản cài kéo
  theo cả bộ biên dịch + nhoè ranh giới dev/runtime · commit `dist/` = đưa lớp DẪN XUẤT vào git
  (phạm tinh thần HP điều 3) và đẻ nguy cơ `dist` cũ hơn `src`. Đường clone (`git clone` →
  `npm install` → `npm run build` → `npm link`) đã chạy sạch từ khi lên TS 6.0.3.
  **Việc còn lại = TÀI LIỆU phải nói đúng đường clone** (đã sửa 7 chỗ). Hồ sơ cân nhắc giữ dưới.

<details><summary>Hai lối đã cân và BỎ (giữ để khỏi bàn lại)</summary>
  *(Soát 2026-08-05: đường CLONE đã hết lỗi `ERESOLVE` — TS 6.0.3, `npm install` sạch chạy được;
  nhưng `npm i -g github:` VẪN hỏng vì cài global không kéo devDependencies ⇒ thiếu `tsc` cho
  `prepare`. Và token npm để publish đã tìm lại được — nằm trong `_migration`, nay ở `~/.npmrc`;
  cân nhắc XOAY token vì nó từng nằm trần trên Drive. Publish 1.1.0 = `npm login` + `npm publish`,
  việc của user — `[2026-08-03l]`.)* Người mới hiện đi đường clone. Hai lối chữa, mỗi lối một giá:
  - **đưa `typescript` sang `dependencies`** — cài global sẽ kéo nó ⇒ `prepare` dựng được.
    Giá: mọi bản cài mang theo cả bộ biên dịch (nặng), và lẫn lộn dev/runtime.
  - **commit sẵn `dist/` vào repo** — cài xong chạy ngay, không cần build.
    Giá: đưa file sinh ra vào git (phạm tinh thần điều 3), và mỗi lần sửa code phải nhớ commit
    lại `dist` nếu không bản cài sẽ cũ hơn mã nguồn.
  Chưa chọn được thì **tài liệu phải nói đúng đường clone** — đã sửa cả 7 chỗ.

</details>

- [x] **Ngưỡng cảnh báo context — XONG TRỌN 2026-08-07** (`[2026-08-07b]`): config kẹp [50,99]
  (06/08) + ô chỉnh trên pane ⚙→⚡ (07/08, user chốt "làm đi") — `/automation` phơi số, đổi qua
  `/set-context-warn`, server kẹp và trả số thật về ô. Smoke: gõ 120 → lưu 99.

<details><summary>Spec gốc ①②③④ — ĐÃ BUILD HẾT, giữ để tra lý do (soát bằng code 2026-08-05)</summary>

- [x] **Lane `claude-cowork` — ĐÃ GHI SỔ `06_CHANGES [2026-08-05d]` (user duyệt 05/08).** *(chi tiết
  build + bẫy `resume_token` nằm ở entry đó; dòng dưới giữ làm hồ sơ đo)*
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

<!-- dời từ 05_TODO.md ngày 2026-08-23 — 5 section đã xong, chép NGUYÊN VĂN -->

## ✅ RÁC NHÁP + FLAG MỘT-LẦN — ĐÃ VÁ 2026-08-20 (user chốt "thêm luật với hook tự xoá")

**① Thư mục nháp phình vô hạn.** Đo trên đúng MỘT phiên nặng: **3,97 GB** (model ONNX tải để đo ·
cache HuggingFace · profile trình duyệt · JSON số liệu). Nó KHÔNG nằm trong `git status`, không
cổng nào soi, nên mọi lượt audit đều đi qua mà không thấy. Nguyên văn user: *"đợi t kiểm thì t
ko nhớ và cũng lâu mới làm"* ⇒ đúng doctrine **máy canh, đừng dựa ai nhớ**.
· **Job:** `jobs/scratchpad.ts` + `scratchTick` (mỗi 6 giờ, đồng hồ RIÊNG — không treo vào công
  tắc tính năng nào, đúng bài học backup chết lặng 4 ngày). Dọn phiên quá 7 ngày hoặc khi tổng
  vượt 2 GB, **cũ nhất trước, chỉ tới khi về dưới trần**.
· **Bốn ràng buộc an toàn** (job TỰ XOÁ FILE nên khắt khe hơn thường): chỉ nhận đúng khuôn
  `<project>/<session>/scratchpad` · không đụng phiên đang chạy · không đụng thư mục vừa ghi
  trong 6 giờ · fail-open. Gate 7 ca, **quá nửa là ca ÂM**; đột biến: bỏ bảo vệ phiên đang chạy
  ⇒ 2 đỏ, bỏ kiểm khuôn ⇒ 1 đỏ.
· **Luật** `FILE TẠM PHẢI CÓ ĐƯỜNG CHẾT` vào `02_RULES` + cả 3 template.
· Dọn tay ngay trong phiên: **3,97 GB → 79 MB** (giữ dữ liệu đo để còn đối chiếu).

**② Flag `.allow-*` bị tiêu thụ dù lệnh KHÔNG chạy** (dính đúng lúc push 2.0.0). Hook PreToolUse
chỉ nói CHO QUA — nó không biết lệnh có chạy hay không; guard ăn flag rồi tầng khác của host chặn
⇒ phải xin user lần nữa cho việc họ vừa đồng ý. Nay flag đóng dấu **vân tay của VIỆC** + cửa sổ
90 s: cùng việc ⇒ thử lại được · việc khác ⇒ **thu hồi ngay** · quá cửa sổ ⇒ chết hẳn. Gate 3 ca
(chạy trên repo TẠM — bản đầu dùng flag thật và làm ĐỎ một file test chạy song song, đúng bài học
"test không được đụng tài nguyên thật"); đột biến: xoá-ngay ⇒ 2 đỏ, bỏ vân tay ⇒ 1 đỏ.
Hai test cũ neo vào hành vi cũ đã **cập nhật theo hợp đồng mới**, không gỡ bỏ.

## ✅ CẢNH BÁO CONTEXT 95% SAI TRÊN PHIÊN 1M — ĐÃ VÁ 2026-08-20 (user chốt "làm luôn")

**Lỗ:** `windowFor()` đoán cửa sổ theo model id — có `[1m]`/`-1m` ⇒ 1M, còn lại ⇒ 200k. Cơ chế
tự sửa (`observed > base` ⇒ nhảy bậc) chỉ nổ SAU khi vượt 200k, nên **dải 190k–200k của MỌI phiên
1M đều bị hét "⚠ context ~95%"** trong khi thực dùng ~19%. Giá không nằm ở con số: agent nhận
cảnh báo sẽ đi chốt sổ / thu hẹp việc sớm hơn cần thiết.

**Đo trước khi sửa — hai phép, và cả hai đều bác giả định cũ:**
· Transcript **KHÔNG khai cửa sổ ở đâu cả** (`context_management: null`; không trường nào mang
  trần) ⇒ không có "nguồn thật" để đọc như hướng gợi ý ban đầu.
· Quét 6 phiên gần nhất trên máy này: **5/6 đã vượt 200k** (731k · 757k · 474k · 225k · 218k) với
  **CÙNG một model id `claude-opus-5`** ⇒ phỏng đoán 200k sai với thực tế máy, và tên model về
  nguyên tắc không phân biệt được 1M với 200k.
· Tín hiệu phụ đã thử và LOẠI: TTL cache (`ephemeral_1h` vs `5m`) — cả 6 phiên đều 1h, không tách được.

**Cách vá — HỌC TỪ BẰNG CHỨNG thay vì đoán theo tên.** Một phiên không thể dùng quá cửa sổ của
chính nó, nên mỗi lần thấy `observed` vượt bậc là một lần CHỨNG MINH được trần thật; nay trần đó
được **ghi nhớ** (`data/context-guard/observed-window.json`, cạnh kho theo HP điều 14, gitignored)
và phiên sau đọc nó TRƯỚC khi đoán theo tên. Thứ tự: ① hậu tố tường minh · ② trần đã học · ③ mới
tới phỏng đoán. Bằng chứng **chỉ đi lên** (phiên ngắn không xoá trần đã chứng minh — cùng bài học
"trần treo" của cổng i18n). Fail-open tuyệt đối: mốc hỏng/không ghi được ⇒ hành xử y như cũ.

**Nghiệm thu trên bề mặt thật:** phiên này 750.775 token ⇒ hook nay báo **75,1%** (trước sẽ là
375% hoặc 95% tuỳ mốc); mốc đã ghi `{"claude-opus-5": 1000000}`. Gate: 3 ca mới trong
`realtime-capture.test.mjs` (15/15 xanh), **đột biến chứng minh đỏ được** — bỏ ghi nhớ ⇒ 1 đỏ,
bỏ đọc bộ nhớ ⇒ 2 đỏ.

⚠ **Giới hạn còn lại, ghi để không ai đọc thành đã kín:** phiên ĐẦU TIÊN trên một máy trắng vẫn
đoán 200k cho tới khi có phiên nào vượt ngưỡng — không có cách nào biết trước, vì thông tin đó
không tồn tại trong transcript. Đây là trần của bài toán, không phải chỗ chưa làm.

## ✅ ĐÃ ĐỒNG BỘ chuẩn `frontend/api/` → `frontend/client/` sang 3 repo khác (user cho phép 2026-08-15)

Chuẩn đổi tên ngày 2026-08-15 (`06_CHANGES`) **KHÔNG tự lan** — mỗi repo giữ bản copy riêng.
Dò bằng `project_root` trong GM rồi đọc file thật; user chốt từng repo trước khi ghi
(`02_RULES §Phạm vi project`).

| project | đã làm | ghi chú |
|---|---|---|
| `Tool\SasinHarvest` | **đổi tên folder thật** `frontend/api/` → `client/` · sửa 1 import trong `pages/app.js` · sửa 3 chỗ trong `03_STRUCTURE` | `conform` ✓ · **không phải git repo** |
| `Tool\SasinFlow` | 3 chỗ trong `03_STRUCTURE` | là git repo — **file đang `M`, CHƯA commit** |
| `Tool\SasinInfra` | 3 chỗ trong `03_STRUCTURE` | **không phải git repo** |

**Hai điều phải nhớ khi đụng lại mấy repo này:** ① `SasinHarvest` và `SasinInfra` **không nằm
trong git** ⇒ không lùi được bằng `git checkout`, phải tự sao lưu trước khi sửa (lần này đã chép
`app.js` + folder `api/` ra scratchpad trước khi đổi tên) · ② `SasinHarvest/attic/
frontend-vanilla-pre-redesign/` **cố ý KHÔNG sửa** — đó là ảnh chụp lịch sử, sửa nó là làm hỏng
bản ghi (cùng doctrine với luật supersede của changelog).

*Ghi chú: file trong `SasinHarvest` vốn đã tên `client.js` — tác giả cũng nghĩ tới chữ "client",
đúng hướng đổi tên này. Và `/api/...` trong URL endpoint là **đường HTTP của backend**, KHÔNG
liên quan tên thư mục FE — đừng đổi nhầm khi thấy grep ra hàng chục dòng.*

## ✅ XONG 2026-08-08 — kho 768 chiều + fp32 ĐÃ TRÁO, đang chạy thật

> **Đo trên daemon 4444 sau khi tráo:** `dbPath` = `data/global_memory.db` · **215.452 tin ·
> 1.290 phiên** · vector **157.524 · coverage 99,2% · dims 768d** · `quick_check ok`.
> Kho 256 cũ GIỮ LẠI làm bản lùi: `data/global_memory.256d-backup-20260808.db` (1.234 MB).
>
> **Cổng điều 12 đã vượt** — mốc phải thắng là `41%@10`, đo trên lớp `prose` (mốc cũ chính là
> đo trên corpus toàn prose): **41% → 62%** @10, MRR 0,245 → 0,354. Bảng đầy đủ theo lớp trong
> `06_CHANGES`. `tool_use` giữ **0%** — đúng như đã cảnh báo trước: đợt này KHÔNG lấp lớp chưa
> bao giờ có vector.
>
> ⚠ **Kỳ vọng từ bảng `dims-test` là QUÁ LẠC QUAN, đừng dùng lại làm mốc:** bảng đó hứa
> `recall@1` **91%** ở 768; thực đo trên kho thật chỉ **18%**. Không mâu thuẫn — `dims-test`
> so vector-với-vector trên tập ứng viên hẹp, còn đây là recall thật xuyên 215k tin qua hybrid.
> Phần THỨ HẠNG TƯƠNG ĐỐI của bảng cũ thì đúng, và đó mới là thứ nó dùng để quyết.
>
> ✅ **Rerank: ĐÃ ĐO, KHÔNG được bật mặc định** (mục "rerank chưa đo" bên dưới đóng theo).
> Ở kho 768: hybrid `41%@10` nhưng hybrid+rerank chỉ `27%@10`, MRR 0,220 → 0,160, và tốn
> **11 giây/truy vấn** so với 0,68 giây. Nó làm recall TỤT chứ không tăng.
>
> ✅ **Đã xoá `global_memory.HONG-20260804-*.db`** (1.026 MB, user duyệt 2026-08-08). An toàn
> vì SHA256 cho thấy nó TRÙNG KHÍT hai bản trong `data/corrupt-20260803-091106/` — vật chứng
> vẫn còn đủ hai bản, đúng ràng buộc "không xoá cho tới khi truy xong nguyên nhân gốc".

## ✅ RERANK — ĐÃ TẮT 2026-08-10, đóng bằng số (hồ sơ giữ lại bên dưới)

> **Đo dứt điểm** (bench 68 nhãn, kho thật): thua mọi cột nghiêm (`@10` 35→28% · MRR 0,288→0,204)
> và chậm **11,6×**. Đã tắt bằng `/set-rerank?on=0`; header lệnh không còn `rerank (cross-encoder)`.
> ⚠ **Đọc kèm sắc thái, đừng dùng entry này để kết luận "rerank vô dụng":** dưới thước TƯƠNG ĐƯƠNG
> nó gần như HOÀ (0,413 vs 0,402) — nó xáo giữa các tin tương đương nhau chứ không phá recall.
> Phán quyết đúng: **không đáng 11,6× thời gian**.
>
> **Ba đường CỨU rerank chưa ai thử** (ghi để phiên sau không kết luận vội): ① **reranker ĐA NGỮ** —
> `bge-reranker-base` là model zh/en trên kho tiếng Việt, tài liệu ngành đo English-only sụp 31% vs
> 84–90% của bản đa ngữ; chưa kiểm được vì 4 model dò đều không có ONNX nạp được (đường ra: tự
> chuyển `bge-reranker-v2-m3`) · ② **TRỘN thay vì THAY** — rerank hiện thay HẲN thứ tự, trong khi
> `vecMix` đã chứng minh *trộn ăn hơn thay hẳn* · ③ **thu cửa sổ** top-40→top-10 (rẻ 4×, ít chỗ phá).
> **TRẦN cần biết trước:** bench đo chỉ **6–8/68 câu** có đáp án trong pool mà ngoài top-10 ⇒ đó là
> TOÀN BỘ dư địa của mọi lớp rerank ở kho này. Nghẽn thật nằm ở POOL, không phải ở xếp lại.

<details><summary>Hồ sơ gốc (phát hiện 2026-08-08) — giữ để tra</summary>

<!-- dời từ 05_TODO.md 2026-08-23 (chốt phiên) — 3 section đã xong, mục còn mở đã tách ra trước -->

## ✅ HAI CỔNG BÁO OAN + MỘT LỖ `*.env` — ĐÃ VÁ 2026-08-20 (báo từ `PBI_SasinFlow_Rebuild`, TỰ ĐO LẠI trước khi sửa)

Báo cáo nêu 2 lỗi, đo lại thì **đúng 1,5/2** — và lộ thêm một lỗ nặng hơn báo cáo không thấy:
· **① `conform` chặn `pipelines/<domain>/`** (non-app) — tái lập được; gốc SÂU hơn mô tả:
  `graph.ts:266` gán slot theo `basename` nên MỌI con-của-slot tên lạ đều "vô slot" (zemory
  xanh chỉ vì may — mọi folder lồng trùng tên slot). Vá: `NONAPP_FREEFORM_PARENTS`
  (`tasks`·`pipelines`·`data`, khai ở `structure-tree.ts`, có gate PARITY neo vào chính
  template non-app) — **CHỈ miễn profile non-app**; đề nghị gốc "miễn mọi subdir" bị BÁC vì
  mở lỗ phía app (03 §2 cấm tên mới trong domain). Kèm: `ignore` trong marker nay áp cả
  nhánh chuẩn (trước chỉ nhánh `layout:"foreign"` đọc — repo theo chuẩn không có đường miễn).
· **② guard đọc `.git/hooks/pre-push` thành `git push`** — 1/2 ca của báo cáo đúng (ca
  `cat pre-commit + .env` họ ghi CHẶN, đo trên zemory là QUA). Vá bằng
  `(?<!\.)\bgit\b(?![\\/])` cho cả 4 nhánh git; **BÁC** cách vá token-đầu-câu của báo cáo —
  đo 8 ca: `/usr/bin/git push` · `sudo git push` · `env A=1 git push` sẽ LỌT.
· **③ (báo cáo KHÔNG thấy, nặng nhất) mẫu secret thiếu `*.env`** — `git add ipos_loader.env`
  /`prod.env` LỌT SẠCH trên mọi repo dùng mặc định; comment trong `guard-gen.ts` còn tự nhận
  "app/x.env vẫn bị bắt" (SAI, đo ra lọt). Vá: thêm `*.env` + allow `example.env`/`sample.env`;
  nhánh secret nay CHỈ quét token của đúng SEGMENT chứa lệnh git (trị luôn ca "tên .env nhắc
  trong `echo`" cùng câu lệnh).
Gate: matrix +2 test · conform +4 test (cả VẾ NGƯỢC app-vẫn-nghiêm) — **80/80**, 5 đột biến
đều đỏ được (git trần ⇒ 1 đỏ · bỏ `*.env` ⇒ 1 đỏ · quét-cả-dòng ⇒ 1 đỏ · tắt nhánh non-app
⇒ 1 đỏ · thêm parent lạ ⇒ parity đỏ). Bản ship cowork chép lại + manifest 321→338 · 43→46.

- [ ] **(chờ user) MỖI REPO KHÁC LÀM MỘT CHUYẾN 3 LỆNH** — `zemory sync` (nhận skill mới `write-style`,
  gap-fill file thiếu) → `zemory hook guard` (2 đợt vá 20/08: PowerShell + `.git/`-path + `*.env`) →
  `zemory doctor` (tự kêu nếu guard còn lỗi thời). Repo CÙNG máy làm được NGAY (CLI là junction);
  máy kia chờ push. ⚠ 2 dòng đăng ký skill (`04_SKILLS`+`AGENTS`) sync KHÔNG tự thêm (file-wins) —
  `conform` bên đó sẽ nhắc, agent bên đó tự thêm. Không tự sang sửa (`02_RULES §Phạm vi`).
- [ ] **(ĐÃ CHẠY PHÉP THỬ điều 15 — 2026-08-21, user hỏi "40 ngôn ngữ opt thêm được không") —
  KẾT LUẬN: cơ chế opt-thêm ĐÚNG là rẻ, nhưng 36 grammar sẵn có KHÔNG khớp nhu cầu; SQL bị
  chặn ở wasm.** Số đo:
  · `node_modules/tree-sitter-wasms` (Unlicense, đã cài) mang **36 grammar** (50 MB), zemory
    mới nạp 4. Nạp thử 5: **bash/java/go/rust LOAD OK cùng ABI 0.20.8 · ruby LOAD FAIL** —
    fail-open đỡ được, đúng trực giác user "không hại chất lượng" ở tầng nạp.
  · Nhưng "hỗ trợ một ngôn ngữ" là **BA tầng**, grammar chỉ là tầng 3: ① `SRC_EXT` bộ quét
    file (hiện chỉ ts/js/py — file .java/.sql còn không thành node) · ② cạnh import (regex
    per-language) · ③ walker symbol (bash/java/go tình cờ khớp tên node hiện tại; **rust khớp
    0**; mỗi ngôn ngữ cần mapping riêng).
  · **Rủi ro chất lượng THẬT nếu mở tầng ① mà thiếu tầng ②:** node mới toàn cô lập ⇒
    `isolated_pct` hiện **29,4% / trần 30%** — đỏ oan gần như chắc chắn.
  · **Estate đối chiếu:** 36 grammar ∩ nhu cầu thật ≈ ∅ (không java/go/rust); thứ CẦN là
    **SQL (60 file)** + PS1 (15) thì gói KHÔNG có; `@derekstride/tree-sitter-sql` (MIT) npm
    **không kèm wasm prebuilt** — muốn dùng phải tự build emscripten + khớp ABI 0.20.8.
  **Việc còn mở (chờ user chốt có đáng không):** một buổi build-thử wasm SQL + mapping 3 tầng
  + parse thử trên chính 60 file thật, cổng đạt = ERROR-node thấp + fitness không đỏ oan
  (thêm ngôn ngữ mới thì node của nó phải được miễn/điều chỉnh trần isolated). Không gấp.

## ✅ PHÉP THỬ NHÚNG LỚP TOOL — ĐÃ ĐO 2026-08-11, CỔNG QUA, đang embed kho thật

> 🔄 **Supersede mục "VIỆC ĐẦU TIÊN CỦA PHIÊN SAU" viết cùng file.** Sổ ghi job dừng ở
> **24.073 (53,8%) · 7/14 nhãn** — đo lại bằng DB thì đã là **26.479 (59,2%) · 12/14 nhãn**.
> Lượt chạy thứ hai (15:30 10/08 → 01:18 11/08) không ai ghi log nên sổ đứng ở mốc cũ.

**A/B cùng mã, cùng ngày, cùng 68 nhãn** — đối chứng chạy trên kho thật (chưa có vector tool),
không so chéo với con số 10/08:

| lớp | kho thật (không vector tool) | bản sao (có vector tool) |
|---|---|---|
| `tool_use` @10 | **0%** · MRR 0,000 | **14%** · MRR 0,048 |
| `keyword` @10 | 42% · MRR 0,314 | **50%** · MRR 0,336 |
| `prose` @10 | 50% · MRR 0,393 | 50% · MRR 0,392 |
| `tool_result` @10 | 25% | 25% |
| hybrid nghiêm @10 | 35% · MRR 0,274 | **40%** · MRR 0,287 |
| hybrid tương đương @10 | 53% · @40 65% | **66%** · @40 **74%** |

**Cổng QUA:** `tool_use` thoát 0% (nhánh SAI là *vẫn ~0%*), không lớp nào tụt.
⚠ Mức nhảy của thước **tương đương** (+13đ) **không phải toàn bộ là hệ tốt lên** — thước đó cần
vector mới chấm được "gần trùng", nên trước đây tin tool *không thể* được tính tương đương.
Con số đáng tin là thước **nghiêm +3 nhãn**, khớp cộng dồn 2 `tool_use` + 1 `keyword`.

**Sửa hai chỗ SAI trong mốc bằng chứng cũ:**
· **14/14 KHÔNG đạt được** với phạm vi `Edit,Write,Bash,PowerShell` — một nhãn trỏ vào tool
  **`Artifact`**, nằm ngoài danh sách ⇒ trần thật là 13/14. Dòng "28.705 ⇒ 14/14" đã chết.
· Phạm vi chạy kho thật nay là **`Edit,Write,Bash,PowerShell,Artifact`** = **45.059 tin**
  (`Artifact` chỉ 21 tin — thêm vào gần như miễn phí và nó phủ đúng nhãn thứ 14).

  ✅ **XONG từ 11/08** — job đó kết thúc lâu rồi (kết quả: lớp `tool_use` 0%→21%@10, xem
  `06_CHANGES`). *`embedRunning: true` hiện nay là job NỀN THƯỜNG NGÀY của scheduler, không phải
  job này — đừng đọc nhầm thành "vẫn đang chạy".*
  ~~**Job embed kho thật ĐANG CHẠY** (bắt đầu 01:46 ngày 11/08, ~15,7 giờ máy).~~
  Log `D:\huy.nguyen\zemory-lab\embed-full-real.log`; đo tiến độ bằng SQL trên `messages`
  ⋈ `vec_chunks_rowids`, đừng tin log (lượt trước mất dấu vì không ai ghi).
  **Phóng bằng `.vbs` (`WshShell.Run(cmd,0,False)`) nên nó MỒ CÔI, không chết theo phiên agent** —
  đây là đường thay cho câu cũ "lệnh dài phải do user chạy ở cửa sổ riêng".
  Xong ⇒ chạy lại `memory bench --recall --no-rerank` trên kho thật, so đúng bảng trên.

- [ ] **Neo đo tiến độ — ghi ra để đừng đếm sai lần nữa:** trong bảng bóng `vec_chunks_rowids`,
  **`rowid` mới là id tin**, cột `id` bỏ trống (NULL). Đếm bằng `vec_map` chỉ ra tin bị CHUNK
  (5.874 hàng), không phải toàn kho. Tự kiểm đúng: 180.697 hàng chính + 5.874 chunk = 186.571.

## 🔓 COWORK ĐỌC ĐƯỢC — ✅ ĐÃ BUILD XONG (soát lại 2026-08-07); còn đúng 1 CÂU HỎI chờ user
> ⚠ **Sổ đã nói khác code — heading cũ ghi *"chỉ còn viết adapter"*, SAI.** Đo đủ ba nguồn 2026-08-07:
> ① **MÃ** — `backend/src/memory/adapters/cowork.ts` (parse event → tin, giữ khối tool) **và** đường KÉO
> trong `backend/src/memory/scanweb.ts` (`PLATFORMS.cowork`, `/v1/code/sessions`, đi cùng cửa sổ claude.ai)
> + test `backend/test/cowork.test.mjs`; commit `1e151de`. ② **GM/git** — lane ship cùng đợt "thu hội thoại
> web nhiều tài khoản". ③ **CHẠY THẬT** — daemon 4444 báo source `claude-cowork`: **1 phiên · 63 tin**
> (16/07) đã nằm trong kho. ⇒ Adapter KHÔNG còn là việc; **gate `todo verify` xanh vẫn không bắt được ca
> này** (nó chỉ phủ 20/58 mục có tên tra được), nên ghi ra đây để phiên sau khỏi build lại lần hai.
> *(Vẫn đúng: 3 phiên user cần — "Harness AI" v.v. — CHƯA có trong kho, mới 1 phiên; xem câu hỏi bên dưới.)*

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

<!-- === 2026-08-23: doi 22 section khong con muc mo nao tu 05_TODO (lich su thuan; `archive` chi nhat MUC nen khong voi toi khoi van thuat) === -->
## 🔵 BÀN GIAO 2026-08-22 (chiều) — ĐỌC MỤC NÀY TRƯỚC

**Việc ĐẦU TIÊN của phiên sau — user chốt: "phải TEST FULL hệ mới".** Lượt đo bước ③ hôm nay
**chỉ chạy MỘT cấu hình** nên KHÔNG kết luận được; đừng đọc số ở `plan/19 §4b` thành phán quyết.
Bốn thứ còn thiếu, làm đủ mới gọi là full:

## 🔵 BÀN GIAO 2026-08-22 (sáng) — (khối cũ, giữ để tra)

**Trạng thái máy lúc chốt (đo thật, không chép sổ):** daemon **pid 1928 · 2.1.0** (restart 2 lần
trong phiên — mọi bản vá ĐANG SỐNG) · `autosync` **TẮT** · `scheduler` **TẮT** · `realtime` +
`autostart` BẬT · kho thật **278.207 tin · 2.327 phiên · 257.072 vector · `quick_check ok`** ·
kho song song **252.229 vector** · backup mới nhất `2026-08-21T15-35-29Z` · cây làm việc **32 file
đổi/mới, CHƯA commit** · **11 commit chưa push** · `package.json` **2.1.0**.

**🔥 JOB EMBED VẪN CHẠY** — wrapper pid 800 + con pid 21372 (lượt 58). Đích ước ~253.900 ⇒ còn
~1.700 vector. Wrapper tự thoát khi 2 lượt liền không thêm gì. **Đừng chạy `npm run check`** (khoá
`test` kéo `npm run build` = `clean && tsc`, xoá `dist/` dưới chân job). Thay bằng **sweep 91 file**:
`node --test $(ls backend/test/*.test.mjs | grep -v -E "embed\.test|embed-profile|embed-scope-config|vectors\.test|rerank\.test|memory-search\.test|digest\.test")`
— **675/675 · 0 skipped** lúc chốt, và chính nó bắt 2 lỗi mà `conform`/`lint` không thấy.

**Phiên này làm gì** (số đo đầy đủ: `06_CHANGES [2026-08-21c]` · `[2026-08-22]`): ① audit 10 mặt →
1 BLOCKING (backup bỏ đói im lặng **27 giờ**) + 7 advisory · ② vá backup **hai đợt** (khoá mang danh
tính kho → rồi cờ trong bộ nhớ daemon cũng phải mang) · ③ parity cây folder ↔ graph (`isSourceLeaf`)
· ④ vá 4 chỗ docs lệch (plan 13 · plan 19 ×2 · sổ lặp khối) · ⑤ **mặt audit ⑪ + luật "chữ người dùng
đọc"** vào `02_RULES` + 4 bộ template · ⑥ cổng i18n mở sang HTML + vá **21 chỗ** + móc
`data-i18n-aria` · ⑦ bịt parity luật cho bộ cowork (thiếu 2 luật cứng) · ⑧ vá 2 lỗi CÓ SẴN mà sweep
bắt được (test hẹn giờ `recency` · `writeFileSync` trần trong `capture-hook`).

⚠ **Ba bẫy đã trả giá phiên này — đừng dẫm lại:**
· **Đưa regex/escape qua shell bị nuốt — dính 3 LẦN** (`node -e` với `\\`, heredoc, `cd &&`). Chữa
  dứt: viết script ra FILE bằng tool Write/Edit, đừng nhồi vào `-e`.
· **`zemory archive` CHẠY THẬT với MỌI cờ — nó không có `--help` LẪN `--dry-run`.** Dính HAI lần
  trong một phiên: `archive --help` archive 5 entry + 6 mục · `archive --dry-run` in đúng câu
  *"moved 2 closed item(s)"* rồi **dời thật 2 mục** (kiểm chéo: diff `archive/05_TODO.md` từ 6 lên
  8 mục `✅`, lượt chạy kế tiếp báo `0 mục để dời`). Cờ lạ bị **bỏ qua âm thầm** thay vì báo lỗi.
  Muốn xem trước thì chỉ có đường thủ công: `wc -l` + `grep -c "^- ✅"` trước/sau. *(Đã ghi thành
  mục advisory bên dưới — lệnh DỜI NỘI DUNG giữa hai file thì cờ lạ phải bị TỪ CHỐI, không cho qua.)*
· **Bộ dò tự viết báo oan là chuyện thường, không phải ngoại lệ:** 4/5 phép kiểm mới báo oan ở lượt
  đầu (chi tiết ở §MẶT AUDIT ⑪). Luật rút ra: mỗi phép đo phải in *"đã quét bao nhiêu"* và có ca
  tự-kiểm, nếu không thì "0 hit" đọc thành "sạch" trong khi bộ lọc đang hỏng.

**VIỆC ĐẦU TIÊN của phiên sau:** ① job embed xong ⇒ chạy **gate ĐẦY ĐỦ** `npm run check` (scheduler
đang tắt sẵn) · ② bench A/B plan 19 bước ③ · ③ tráo kho (chờ user ký) · ④ **bật lại `autosync` +
`scheduler`** sau tráo · ⑤ điều phối máy thứ hai (`DESKTOP-PFB157K` đang sync — plan 19 §6 đã sửa,
KHÔNG còn là việc "ngủ").

## 🔵 BÀN GIAO 2026-08-21 — (khối cũ, giữ để tra)

**Trạng thái máy lúc chốt** (đo thật cuối phiên, không chép sổ): daemon **pid 26916 · 2.1.0**
(restart 3 lần trong ngày, mọi bản vá ĐANG SỐNG) · cây làm việc **sạch** · **10 commit CHƯA push**
(`7f9977b` → `ca9ddc0`) — user chốt *"chờ embed xong push một lần"*, **số version kế do user chốt**
· kho thật **275.802 tin · 2.324 phiên · `quick_check ok`** · `05_TODO` 1.551 dòng sau `archive`
(số 2.308 ghi lúc đầu là mốc TRƯỚC khi archive chạy — đo lại bằng `wc -l`, đừng chép) ·
`06_CHANGES` 217 dòng (< trần 300).

**Phiên 21/08 làm gì** (chi tiết + số đo: `06_CHANGES [2026-08-21]` · `[b]`): ① chấm than update
pull-based (4 bề mặt, 1 phép đo) · ② vá 2 bệnh UI user báo (heal-mở-lại-tắt · công-tắc-tự-bật-tắt)
· ③ skill `write-style` ship 4 bộ template · ④ khảo sát Graphify + hấp thụ `graph path` +
god-nodes · ⑤ đa ngôn ngữ THEO KHO (detect-then-load) · ⑥ audit 2 lượt, bắt+vá 2 cấn.

⚠ **Bốn bẫy đo đã trả giá phiên này — đừng dẫm lại:**
· **`node -e` replace trên file CRLF hỏng LẶNG** — pattern `\n` không khớp `\r\n`, script in
  "đã cập nhật" mà thay 0 chỗ. Phải grep lại sau MỌI lần replace, hoặc dùng tool edit thật.
· **Heredoc `bash` NUỐT backslash** — `/\\/g` thành `/\/g` ⇒ tsc lỗi cú pháp. Code có escape thì
  viết bằng tool Write/Edit, đừng qua heredoc.
· **`splice` sổ nuốt dòng của mục KẾ BÊN** — sửa xong phải đọc lại vùng quanh, không chỉ dòng sửa.
· **`eslint .` KHÁC `npm run lint`** — bò cả `external/`+`attic/` rồi treo 25 phút; lệnh chuẩn của
  repo chạy < 1 phút. Luôn đo bằng đúng lệnh production.

🔴 **HAI CÔNG TẮC ĐANG TẮT — PHẢI BẬT LẠI SAU KHI TRÁO KHO:** `autosync` **TẮT** · `scheduler`
**TẮT** (tắt tạm vì hai kho dùng chung `data/` nên chung `cli-write.lock`; autosync 30 phút/lần
sẽ cản job embed). `realtime` + `autostart` vẫn BẬT.
Bật lại: `POST /set-autosync?on=1` · `POST /set-scheduler?on=1`.
*(User bật autosync sáng 21/08, tôi tắt lại theo lịch tráo — có hỏi và user đồng ý.)*
> 🔄 **Sửa vế *"backup vẫn chạy (đồng hồ riêng)"* — audit 22:00 cùng ngày ĐO NGƯỢC:** đồng hồ
> riêng có thật, nhưng `backupTick` nhường **im lặng** cho khoá ghi của cả thư mục `data/` ⇒ chính
> job embed kho song song đã bỏ đói nó **27,0 giờ**. Đã chụp một bản ngay (17,2 s) và vá cả ba
> tầng — xem §🔬 Audit 2026-08-21 (22:00) bên dưới.

**🔥 VIỆC ĐANG CHẠY — job re-embed BGE-M3 (plan 19 bước ②):**
kho song song `data/global_memory.bgem3.db` · **237.904 / ~253.900 vector (93,7%, đo cuối phiên
21/08 — đích ước theo tỉ lệ phủ 94,1% của kho thật, KHÔNG phải 100% số tin)** · dấu
`{1024, bge-m3-v1, int8}` · wrapper pid 800 + con embed đang sống (phóng qua `.vbs` nên **sống
qua lần đổi phiên**, đã chứng minh nhiều lần). Log `data/logs/bge-embed.log`; **tiến độ đo bằng
`vectorCount(<bản sao>)`, KHÔNG đọc log** (log trễ hơn kho: nó chỉ in khi tiến trình lượt đó thoát).
**54 lượt đã đóng, tất cả exit 0** — còn ~16.000 vector ≈ **4 lượt**.
Nhịp dao động theo tải máy: 17–20 phút/4.000 lúc rảnh → **151–216 phút** lúc bận (đuôi toàn tin
dài + máy chia CPU với gate/audit). **Đừng lấy nhịp lúc bận làm mốc ước.**
**Kho THẬT không bị đụng:** 257.072 vector · `{768, gemma-prompt-v1, fp32}` · daemon phục vụ bình thường.

✅ **BẮT LÚC CHỐT PHIÊN 21/08 — `archive` chưa bao giờ nhặt được mục nào (sổ nói khác code).**
Cơ chế archive-mục-đã-đóng (dựng 29/07 để trị bệnh "107 mục xong chiếm 46% file") chỉ biết dấu
`[x]`, còn quy ước viết THẬT của repo là `- ✅ **…**` ⇒ đo được: **0 mục `[x]` / 59 mục `✅`**,
`05_TODO` phình **2.327 dòng** mà `archive` báo *"nothing to do"* mỗi lần. Kèm bề mặt nói dối:
in *"under threshold — left alone"* trong khi code KHÔNG có ngưỡng cho file này (comment ngay
trên đầu hàm nói rõ). **Vá:** `ITEM` nhận `✅` ngang `[x]` (một hằng `CLOSED`), sửa câu in.
**Thử trên BẢN SAO trước** (mục ✅ có thể chứa mục con `[ ]`) rồi mới chạy thật: dời 59 mục,
**2.327 → 1.551 dòng (−33%)**, và **60 `[ ]` + 10 `[~]` còn nguyên · 0 việc mở bị nuốt** ·
khối bàn giao/lịch còn đủ · có `.bak` ở `attic/harness-bak/`. Gate trong `archive-todo.test.mjs`
(8/8), đột biến trả `ITEM` về chỉ-`[x]` ⇒ đỏ.

**📋 LỊCH SAU-EMBED — hàng đợi MỘT thứ tự, user chốt 2026-08-21 ("cứ xếp lịch đi"):**
1. **Kiểm job xong THẬT** — `vectorCount` đứng yên + wrapper tự thoát (nó chỉ dừng khi 2 lượt
   liên tiếp không thêm vector); đừng tin log, đếm SQL.
2. **Vá 2 advisory audit 21/08 (user đã gật):** ① nhánh XOÁ của guard quét theo SEGMENT như
   nhánh git `[2026-08-20d]` (+ ca âm `rm x && echo "…\.env"` vào `guard-tool-matrix`, đột biến
   chứng minh đỏ) · ② gate NỘI DUNG cho `policy.json` ship cowork (so 2 khoá
   `secret_names`/`secret_allow` với bộ sinh — KHÔNG so cả file, cowork khác `protected_write`
   có chủ đích). Làm TRƯỚC lượt gate đầy đủ để gate phủ luôn 2 bản vá; xong sinh lại
   `hook guard` + chép bản ship (template-parity canh).
3. **Trả nợ "chưa đo" của audit:** TẮT daemon 4444 (embed test OOM nếu để) → `npm run check`
   ĐẦY ĐỦ (scheduler đang tắt sẵn) → bật lại daemon → đảo mắt UI bằng mắt người/CDP ·
   (tuỳ sức: `check:clone` cần mạng · diễn tập phục hồi — nợ plan 18 ⑨).
4. **Plan 19 bước ③** — bench A/B hai kho (2 thước · theo lớp · 18 ca âm, máy tĩnh).
5. User tự gõ so tay bao lâu tuỳ ý → **CHỜ USER KÝ** → tráo (bước ④, script một-lần, tag
   `pre-bgem3-swap`, bản lùi 768 có án tử ~5 ngày).
6. **Sau tráo:** bật lại `autosync` + `scheduler` (`POST /set-autosync?on=1` ·
   `/set-scheduler?on=1`) · `scan`+`embed` bù · nhân dịp kho đóng băng đo luôn mục
   **717 cửa sổ phụ chênh** (dịp miễn phí, đã ghi ở §Audit 12/08) · push đợt version kế
   (user chốt số) · archive bớt khối ✅ của `05_TODO` (advisory ④ audit 21/08).

**Phiên 19–20/08 làm gì** (chi tiết + số đo: `06_CHANGES [2026-08-20]` → `[e]`):
① chọn BGE-M3 bằng ma trận 6 embedder × 12 lane + bootstrap 2.000 lượt · ② cổng mặt audit ⑧
(license + clone sạch) · ③ vá guard hở tool `PowerShell` (báo từ repo PBI) · ④ vá cảnh báo
context 95% sai trên phiên 1M · ⑤ vá flag `.allow-*` bị tiêu thụ khi lệnh không chạy · ⑥ job
`scratchTick` tự dọn thư mục nháp + luật FILE TẠM PHẢI CÓ ĐƯỜNG CHẾT · **⑦ (chiều)** vá 2 cổng
báo oan từ báo cáo PBI (`conform` non-app · guard đọc `.git/hooks/*` thành lệnh git) + lỗ
`*.env` thiếu trong mẫu secret — báo cáo bên kia đúng 1,5/2, sửa KHÁC cả hai đề nghị của họ
(`[d]`) · **⑧ (chiều)** restart daemon 2.0.0 + doctor thêm 3 mặt (guard lỗi thời · cloud · rác
nháp) + đóng mục "số phiên nhảy" bằng GROUP BY (`[e]`).

**Bốn bẫy đã trả giá phiên này — đừng dẫm lại:**
· **Phép thử NHỎ trước job dài không phải nghi lễ:** 20 tin bắt được lỗi hợp đồng `vec_config`
  bị bỏ qua ⇒ cứu **44 giờ** chạy sai (embed bằng Gemma trong kho đóng dấu BGE, im lặng).
· **`Buffer.from(base64).buffer` là POOL dùng chung của Node** — đọc `.buffer.slice(0)` ra 16.384
  số rác/vector; lộ ra vì lane đọc-từ-đĩa tụt về đúng mức NGẪU NHIÊN. Phải cắt
  `[byteOffset, byteLength)` + copy.
· **Gọi model THEO LÔ vừa chậm hơn vừa DỊCH vector** (bge 5,6× · gemma 2,3×; cos 0,982/0,962).
· **Test không được đụng tài nguyên THẬT của repo:** gate flag bản đầu dùng `docs/hooks/.allow-push`
  thật ⇒ làm ĐỎ một file test chạy song song (`node --test` chạy các file cùng lúc).
· **(chiều) `node -e` replace trên file CRLF là HỎNG LẶNG:** pattern có `\n` không khớp `\r\n`,
  script in "đã cập nhật" mà thay 0 chỗ — phải kiểm lại bằng grep sau MỌI lần replace, hoặc dùng
  công cụ edit thật. Cùng họ với bẫy "regex qua shell bị nuốt escape" (dính lần thứ n+1 trong
  cùng phiên, khi đột biến guard bằng one-liner).
· **(chiều) Log của job ghi giờ UTC, máy hiển thị UTC+7** — đọc lướt sẽ thấy "7 giờ không ai
  chạy" và kết luận job chết trong khi nó đang chạy lượt kế. Đối chiếu mốc bằng epoch/`Z`.
· **(chiều) NHÃN ca test chứa chuỗi `git …push` cũng bị guard soi như lệnh thật** — chính lệnh
  đo ma trận bị hook chặn vì tên ca `<git> push`. Ghép mảnh cả NHÃN, không riêng payload.

**Ba đường cụt / thứ đã LOẠI có số — đừng đề xuất lại:** Qwen3-Embedding (thua cả Gemma trên kho
này) · Qwen3-Reranker (MRR khá nhưng **29 s/truy vấn**) · **lai hai model** (mọi cặp nằm TRONG
sai số — bootstrap 2.000 lượt) · chỉ mục ColBERT đợt này (dense-mix mua được ~hết giá trị với
1/300 đĩa) · tín hiệu TTL cache để đoán cửa sổ context (cả 6 phiên đều 1h, không tách được).

⚠ **Trần của phép đo, đừng đọc số nhỏ thành thứ hạng:** corpus 68 nhãn chỉ phân biệt được ΔMRR
≥ ~0,05. Mọi chênh lệch nhỏ hơn thế trong các bảng của phiên này (colbert 0,375 vs bge-dense
0,378…) đều **nằm trong vùng nhiễu**.

## 🔵 BÀN GIAO 2026-08-15 — ĐỌC MỤC NÀY TRƯỚC

**Trạng thái máy lúc chốt** (đo thật, không chép sổ): kho **245.419 vector · coverage 99,9% ·
remaining 321** *(số này DAO ĐỘNG chứ không về 0 khi đang làm việc — hook ghi ~23 tin/phút,
nhanh hơn tốc độ nhúng; đừng đọc thành lỗi)* · `lastSync` **19:04:40**, Drive **100%** ·
`rerank` TẮT · `hybrid` BẬT · git **sạch, đã push** (`189fe63`) · **59 mục** chưa đóng.

⚠ **DAEMON ĐANG CHẠY MÃ CŨ:** `/ping` báo **v1.5.14**, đĩa đã **1.5.20**. Ba đợt sửa sau lần
restart cuối (chip rail · chuẩn `client/` · dọn export) **chưa vào bản đang chạy**. Frontend thì
Ctrl+R là thấy; backend phải **khởi động lại daemon**.

**Phiên 15/08 làm gì** (chi tiết: `06_CHANGES [2026-08-15]` · `[2026-08-15b]`):
① chip sức khoẻ ở rail **bấm được** + nói TÊN thứ đang cảnh báo · ② chuẩn **`frontend/api/` →
`frontend/client/`** + đồng bộ sang 3 repo khác · ③ dọn **11 export thừa** · ④ soát sổ **66 → 59**.

**VIỆC ĐẦU TIÊN của phiên sau:** ✅ **ĐÃ LÀM 2026-08-15 (đêm)** — daemon restart (pid 20820,
`/ping` báo **v1.5.21**); bản vá ② client/ verify ở tầng chuẩn (`structure-sync` xanh, zemory
KHÔNG có folder `frontend/client/` là ĐÚNG — chưa có lớp gom lời gọi, không tạo folder rỗng);
bản vá ③ verify bằng gate xanh; bản vá ① (chip rail) verify Ở TẦNG CODE (key `rail.needAttn`
có ở cả 2 dict) — **mắt người CHƯA nhìn**, user đảo mắt khi mở app. Chi tiết: §🔬 Audit 15/08 dưới.
⚠ Muốn chạy gate sạch thì **tắt `scheduler` tạm** — `preflight` sẽ chặn vì backlog embed gần
như luôn dương; hoặc chấp nhận `skipIfBusy` bỏ qua ~10 ca embed (**"xanh có kèm skipped" ≠ "xanh
phủ đủ"**).

**Ba đường cụt đã thử — ĐỪNG đâm lại:**
· dịch 45 chuỗi `shell.js` → vô ích (bảng dự phòng; nguồn thật là `/standard-spec` đọc
  `03_STRUCTURE.md`, trả **91 dòng** tiếng Việt) · dùng `services/` cho slot FE → trùng nghĩa
  `backend/src/services/` · "chờ embed xong rồi làm X" → điều kiện không bao giờ đạt.

**Bẫy phép đo đã trả giá NHIỀU LẦN phiên này** (đọc trước khi tin bất kỳ con số quét nào):
· đưa regex qua **shell/sed** ⇒ escape bị nuốt — **4 lần** trong một phiên; chữa dứt bằng `split()`
· quét export quên `backend/test/` ⇒ báo oan 53; thiếu cờ `g` ⇒ báo oan **13/13**
· chạy gate lúc daemon bận ⇒ **đỏ giả** (`drive-sync` đỏ, chạy riêng thì 8/8).

## 🔥 TRIỂN KHAI BGE-M3 — user chốt 2026-08-19, spec: `docs/plan/19_bge_swap.md`

> User quyết sau ma trận 6 embedder + bootstrap: **đổi Gemma-768 → BGE-M3 int8-1024, qua KHO
> SONG SONG (`data/global_memory.bgem3.db`), kho đang xài KHÔNG đụng** cho tới khi bench thắng
> và user ký tráo. Toàn bộ thiết kế + kỷ luật song song + đường lùi ở plan 19 — ĐỌC plan trước
> khi làm bất kỳ bước nào.

- 🔴 **PHÁT SINH khi làm ①: GỌI THEO LÔ vừa CHẬM HƠN vừa LỆCH VECTOR — và KHO ĐANG CHẠY dính
  NẶNG HƠN kho mới.** Đo 2026-08-19 (16 tin thật, cùng máy, cùng model, khác đúng đường gọi):
  | | từng-cái | theo-lô 16 | lô nhanh hơn? | lệch vector (cos lô-vs-đơn) |
  |---|---|---|---|---|
  | bge-m3 int8 | **318 ms/tin** | 1.792 ms/tin | **KHÔNG — chậm 5,6×** | 0,982 (min 0,978) |
  | **gemma (ĐANG CHẠY)** | **360 ms/tin** | 814 ms/tin | **KHÔNG — chậm 2,3×** | **0,962 (min 0,925)** |
  **Nghĩa là:** `embedPending` gom lô 16 (`vectors.ts:277`) nên **tài liệu** trong kho thật được
  mã hoá theo lô, còn **truy vấn** thì mã hoá từng cái (`embedQuery`) ⇒ hai vế lệch nhau ~4%
  (xấu nhất 7,5%), mà lệch bao nhiêu còn **phụ thuộc các tin CÙNG LÔ** — tức nhiễu ngẫu nhiên
  theo thứ tự quét. Không lỗi nào nổ, không gate nào đỏ; đúng họ hỏng-lặng.
  *Đã loại giả thuyết padding:* lô cắt đồng đều 400 ký tự **vẫn lệch** (0,977–0,987).
  **Đã xử cho kho MỚI:** profile `bge-m3-v1` mang cờ `sequential` ⇒ encode từng cái ⇒ vector
  production khớp **cos 1,000000** với đúng thứ đã benchmark (trước khi vá: 0,98).
  **CHỜ USER — KHO ĐANG CHẠY:** cố ý KHÔNG đụng (bạn yêu cầu "không đụng cái đang xài"), và đổi
  giữa chừng sẽ trộn hai biến thể vector trong CÙNG một chỉ mục. Hai đường: ① kệ — đợt tráo
  bge sẽ dựng lại toàn bộ bằng đường tuần tự, bệnh tự hết · ② nếu vì lý do gì mà HOÃN tráo lâu,
  cân nhắc bật `sequential` cho gemma + `embed --rebuild` (43 giờ — không đáng nếu sắp tráo).
  *Ghi để không ai đọc số cũ mà tưởng vector kho hiện tại là "chuẩn": mọi con số recall đo trên
  kho thật từ trước tới nay đều mang sẵn khoản lệch này — nó là một phần của mốc nền, không phải
  hồi quy mới.*
## 🔵 BÀN GIAO 2026-08-14 — ĐỌC MỤC NÀY TRƯỚC

**Phiên 13–14/08 đóng 13 mục** (chi tiết + số đo: `06_CHANGES [2026-08-13]` → `[2026-08-14]`).
Máy lúc chốt: daemon **pid 28192 · v1.5.15** *(đã restart, mọi bản vá backend ĐANG SỐNG)* ·
`autostart`/`scheduler`/`autosync`/`realtime` đều BẬT · vector **238.623 · coverage 98,6%** ·
`.git` **661 MB → 22,52 MiB** · git sạch, đã push.

**VIỆC ĐẦU TIÊN — chạy gate ĐẦY ĐỦ (chưa chạy sau 8 commit cuối).**
Lượt gate cuối chạy ở `1.5.7`; từ đó tới `1.5.15` mới chỉ chạy test lẻ (77/77 + 11/11 + 4/4 xanh).
⚠ **Không chạy thẳng `npm run check`**: `preflight` sẽ CHẶN vì backlog embed gần như luôn dương
(hook ghi ~23 tin/phút). Đường đúng: **tắt `scheduler` → `npm run check` → bật lại**; hoặc
`ZEMORY_GATE_FORCE=1` và chấp nhận vài ca embed bị `skipIfBusy` bỏ qua (đọc dòng `skipped`,
"xanh có kèm skipped" ≠ "xanh phủ đủ").

**Ba việc CHỜ USER — CẢ BA ĐÃ ĐÓNG 2026-08-15** *(user giao agent tự quyết/làm)*:
1. ✅ **6 hàng `.tmp` rác** — ĐÃ XOÁ (xem §🔬 Audit 15/08: xoá đúng 6, verify `lastSync` nguyên).
2. ✅ **Tag `pre-lfs-fix-20260805` — QUYẾT GIỮ.** Nó là tag annotated MANG log tra ngược (hash cũ
   · tên file weight · ánh xạ), blob 314 MB đã prune nên giữ gần như 0 chi phí (size-pack 22,93
   MiB); xoá là mất bản ghi, không được lại gì.
3. ~~`lab.db` 1,46 GB~~ — **user tự xoá 2026-08-14**, thư mục `zemory-lab` không còn.

**Đường cụt đã thử, ĐỪNG đâm lại:**
· **Dịch 45 chuỗi `shell.js`** — vô ích: bảng `STRUCT`/`ROUTE` chỉ là lưới đỡ, nguồn thật là
  `/standard-spec` đọc `03_STRUCTURE.md` (đo: backend trả **91 dòng** tiếng Việt, bảng dự phòng
  **25 dòng**). Muốn màn đó ra tiếng Anh phải làm ở TẦNG TÀI LIỆU.
· **"Chờ embed xong rồi làm X"** — điều kiện KHÔNG BAO GIỜ đạt khi đang làm việc.

## 🔵 BÀN GIAO 2026-08-12 (tối) — VIỆC ĐẦU TIÊN CỦA PHIÊN SAU

> ⚠ **Luật mới, áp ngay từ dòng đầu phiên:** `02_RULES §Hành xử` — **HIỆN SUY NGHĨ TỪNG BƯỚC,
> CẤM CHẠY IM LẶNG**. Nói trước mỗi cụm hành động; số lệch dự đoán thì báo NGAY, không dồn cuối.

> ✅ **BẪY ĐO ĐÃ ĐƯỢC BỊT BẰNG MÁY 2026-08-13** *(trước đó chỉ là lời dặn, và đã bị bỏ qua hai
> lần — lần sau cùng bởi chính agent viết ra nó).* Bệnh: bộ đầy đủ cho **654 pass / 7 fail**, cả
> 7 ở `vectors.test.mjs`; chạy lại lúc máy rảnh **13/13 XANH**. Test embed nạp model ONNX thật,
> tranh CPU/I-O với job nền ⇒ **đỏ do điều kiện đo**. Giá phải trả không phải một lượt chạy hỏng
> mà là **niềm tin vào gate** — đỏ-giả vài lần là người ta bắt đầu bỏ qua màu đỏ.
> **Hai lớp chốt:** ① `npm run preflight` (đã nối vào `npm run check`) **chặn** gate khi daemon
> đang embed/sync, kèm lý do + đường đi tiếp; `ZEMORY_GATE_FORCE=1` để đè · ② `skipIfBusy(t)` ở
> 10 ca embed: bận thì **bỏ qua CÓ LÝ DO** (hiện ở dòng `skipped`) thay vì đỏ mập mờ.
> Đo trong cùng tình huống: trước **7 đỏ / 22 phút** → sau **fail 0 · skipped 10 / ~0,5 giây**.
> ⚠ **Giới hạn còn lại, đừng đọc thành phủ kín:** `preflight` chỉ kiểm **lúc bắt đầu**. Lượt gate
> hôm nay khởi động lúc máy rảnh, giữa chừng daemon tự bật job embed ⇒ ca cuối bị bỏ qua. Lớp ②
> đỡ đúng chỗ đó, nhưng **"xanh có kèm skipped" KHÔNG phải "xanh phủ đủ"** — đọc dòng `skipped`
> trước khi kết luận.

**Đã xong hôm nay:** release **1.5.0 đã push** (`73420e4`) · một kho chính trên Drive ghi bằng
nối thêm · chở trọn bộ RAG (máy trắng còn phải nhúng **2 tin**) · vá bỏ đói autosync (nghiệm thu:
tự chạy sau 1.170 s, lượt kế chỉ nối **0,5 MB**) · log nền ra đĩa · audit 10 mặt.

**MỘT VIỆC ĐỎ CÒN LẠI** *(mục ⑧ đã ĐÓNG 2026-08-13 — xem `06_CHANGES [2026-08-13]`: asset ABI 137
CÓ thật, thủ phạm là host `github.com` lọt 1/10 lượt; vá bằng `fetch-prebuilds.mjs` + cổng 4/4)*:

1. **(⑦) 314 MB weight** — ĐO LẠI 2026-08-13, **nhẹ hơn hẳn mô tả cũ**: lịch sử `main` đã sạch
   từ 05/08, remote không có, nên **không cần `filter-repo`, không cần force-push, không hash
   nào đổi, clone máy kia KHÔNG hỏng**. Chỉ còn 2 ref cục bộ níu lại — chi tiết + hai lựa chọn
   ở mục ⑦ bên dưới.

**Trạng thái máy lúc chốt:** kho **239.778+ tin · `quick_check ok`** · vector **227.688** ·
`scheduler`/`autosync`/`realtime` đều BẬT · daemon pid 5468 **đang chạy build CŨ (báo v1.4.1)** —
khởi động lại để nạp 1.5.0 · Drive: **đúng 1 file** `global_memory.enc` 1.357,5 MB, đã lên mây ·
`zemory-lab` còn 1,5 GB (chỉ `lab.db` + script).

## 🔵 BÀN GIAO 2026-08-12 (chiều) — đọc mục này TRƯỚC khi làm gì tiếp

**Đã đóng phiên này** (chi tiết + số đo: `06_CHANGES [2026-08-12b]` và `[c]`): `git gc` (10 file
`.idx` mồ côi → 0) · **trigram nhận lại `tool_use`** (migration **v21**, kho thật 100%) · **lỗi
thứ tự trigger UPDATE** (có sẵn từ trước, làm tin rơi khỏi trigram mỗi lần `redact()` chạy) ·
`salvage` thôi đảo chính sách bằng `'rebuild'` · **phạm vi embed vào config** + tách hai số tồn
đọng · **Drive thành MỘT kho chính ghi bằng nối thêm** · **vector đi cùng gói**.

**Trạng thái máy lúc chốt:** kho **239.105 tin · 1.315 phiên · `quick_check ok`** · vector
**226.973 · trong phạm vi thiếu 0 · ngoài phạm vi 19.474** · `scheduler` **BẬT** (mới bật phiên
này) · hook capture BẬT · daemon **v1.4.1**. Bộ test **639/639**.

⚠ **Daemon phải khởi động lại sau đợt sửa này** — nó nạp code lúc bind cổng, nên bản đang chạy
vẫn là code TRƯỚC khi đổi lối sync. Chưa restart mà autosync nổ ⇒ nó ghi theo lối series CŨ.

## 🔵 BÀN GIAO 2026-08-12 (sáng) — đọc mục này TRƯỚC khi làm gì tiếp

**Ba việc lớn của phiên đã ĐÓNG, không mở lại:** ① lớp `tool_use` nhúng xong (**52.169/52.177 =
100%**), bench chốt **0% → 21%@10**, nhãn phủ 14/14 · ② mặt ① của audit chạy được lần đầu kể từ
~05/08 và đã vá 3 chỗ đỏ · ③ đường cứu hộ nay chở cả vector (cổng 3/3, đột biến đỏ được).

**Trạng thái máy lúc chốt:** kho **238.495 tin · 1.314 phiên · `quick_check ok`** · vector **100%**
· Drive **238.495/238.495 đã đẩy, 9 bundle** · hook capture **ĐANG BẬT** (4 sự kiện) · daemon
**v1.4.1** · `lang` đã trả về **`vi`** sau khi chụp ảnh tiếng Anh.

**BA VIỆC CHỜ USER — đừng tự quyết:**
1. **`git gc`** dọn 10 file `.idx` mồ côi trong `.git/objects/pack` (nó viết lại vùng object).
2. **Số version** để push — hiện `package.json` **1.4.1**, có commit chưa push.
3. **ColBERT** treo chờ user kiếm model tiếng Việt (kẹt ở MODEL, không phải kiến trúc).

**VIỆC KẾ TIẾP đã có số, làm được ngay:**
- **Trigram cho `tool_use`** — đường rẻ nhất còn lại, KHÔNG tốn giờ máy (chỉ đảo điều kiện trigger
  đang loại tin tool + một migration dựng lại bảng). Đo hôm nay: lớp đó có 2 luồng thì được 21%@10,
  `tool_result` 2 luồng được 25% ⇒ luồng thứ ba là chỗ còn dư địa. **Chưa đo.**
- **Cổng "không biết" chấm bằng ĐỒNG THUẬN 3 luồng** thay vì khoảng cách riêng luồng vector. Bench
  hôm nay vẫn: **18/18 câu lạc đề đều trả ~40 kết quả**, điểm đầu gần bằng ca dương.
- **Xuất bundle FULL bản mới** lên Drive — bản 1,63 GB hiện có chụp lúc lớp tool mới 76%, nay 100%.

⚠ **Hai bẫy thao tác đã trả giá hôm nay, đừng dẫm lại:**
· **KHÔNG chạy `npm run check` khi có job nền** — khoá `test` kéo `npm run build` = `clean && tsc`,
  **xoá `dist/` ngay dưới chân job**. Đường an toàn: `npx tsc` rồi `node --test` thẳng.
· **Job dài phải phóng qua `.vbs`** (`WshShell.Run(cmd,0,False)`); phóng từ shell của agent là chết
  theo phiên. Script sẵn ở scratchpad của phiên, chép lại nếu cần.

## 🚨 DB THẬT BỊ HỎNG 2026-08-03 — PHỤC HỒI ĐỦ · nguyên nhân gốc ĐÃ TÌM RA — còn MỘT việc code
> 🔄 **Cập nhật 2026-08-05 (soát TODO):** vế "còn treo nguyên nhân gốc" của mục này ĐÃ ĐÓNG —
> `06_CHANGES [2026-08-03h]` kết luận **Google Drive đồng bộ chính file DB** (dòng "Đã loại: thư
> mục đồng bộ đám mây" bên dưới là kết luận SAI thời điểm đó, giữ làm hồ sơ). Ngày 05/08 còn phát
> hiện thêm tầng nữa: DriveFS backup **cả `D:\huy.nguyen`** (kho + chìa lên mây trần) — user đã gỡ.
> **Việc CODE của mục này: ĐÃ ĐÓNG HẾT 2026-08-06** (`06_CHANGES [2026-08-06c]`): vá write-gate ✓
> · `relocate` chở cả cụm ✓ · cảnh báo sớm cloud (`cloudguard` + check `storage-safety`) ✓.
> Backup tự xoay vòng đã xây `[2026-08-03c]`; embed dở dang đã bị rebuild 768 thay thế.
> *(Sử gốc: phát hiện lúc bench recall; mất 0 tin; kho lúc đó 199.360 tin. Chi tiết `[2026-08-03b]`.)*

**Thiệt hại (đo, không đoán):** hỏng nằm ở `messages_fts*` · `section_fts*` · `changelog_fts*`
· `session_digest_fts_tri*` (bảng bóng FTS — 100% dẫn xuất) và chạm cả **bảng nguồn**:
`messages` · `attachment` · `section` · `changelog` · `vec_map`.

**Bản gốc hỏng giữ nguyên 2 bản** ở `data/corrupt-20260803-091106/` — KHÔNG xoá cho tới khi
truy xong nguyên nhân gốc (nó là vật chứng duy nhất).

## 🎯 ĐÃ CHỐT 2026-08-05 — dựng thẳng **768 chiều + fp32** (user quyết), đang chạy

**Bằng chứng dưới đây GIỮ LẠI:** nó giải thích vì sao chọn 768, và mốc **41%@10** của nó chính là
ngưỡng bản sao phải vượt thì mới được tráo vào kho thật.

**Nghẽn KHÔNG phải rerank — là lớp NHÚNG.** Chuỗi đo trên corpus 34 câu có nhãn, kho thật:
`recall@10 41%` · `@40 56%` · `@100 56%` · `@200 56%` · `@500 56%` ⇒ **chạm trần**.
**15/34 câu (44%) đáp án KHÔNG bao giờ được lấy về**, dù nhìn tới 500 kết quả. Nới `POOL`
60 → 200 → 500 **không đổi một con số nào**. 15 tin trượt vs 19 tin tìm ra: dài 714 vs 635 ký
tự, **cả hai nhóm đều 100% CÓ VECTOR** ⇒ không phải thiếu chỉ mục, không phải chunk, không
phải xếp hạng.

**Phép thử có kiểm soát** (`scratchpad/dims-test.mjs`, chạy trên bản sao `D:/zemory-lab/lab.db`):
EmbeddingGemma huấn luyện Matryoshka nên **256 chiều CHÍNH LÀ 256 số đầu của 768** — embed MỘT
lần ở 768 rồi so bốn cách cắt trên **cùng một dãy số**, nên khác biệt duy nhất là số chiều.

| chiều | @1 | @3 | @10 | @40 | MRR |
|---:|---:|---:|---:|---:|---:|
| 128 | 62% | 82% | 88% | 97% | 0,728 |
| **256** *(đang dùng)* | **74%** | 88% | 97% | 97% | **0,816** |
| 512 | 85% | 97% | 97% | 100% | 0,913 |
| **768** *(gốc của model)* | **91%** | 97% | 100% | 100% | **0,944** |

Tăng ĐỀU qua cả bốn mức ⇒ quan hệ thật, không phải nhiễu. `recall@1` **74% → 91%** là chỉ số
đáng giá nhất (agent tra cứu cần đúng ngay vị trí đầu).

**Vì sao đang là 256:** cắt hồi 2026-07 để giảm DB **1.141 MB → 595 MB**. Đánh đổi có chủ đích,
nhưng **lúc đó chưa ai đo được nó lấy mất bao nhiêu chất lượng** — bench khi ấy dùng corpus 8
câu bão hoà và `topN=10` nên không nhìn quá 10 kết quả. Giờ mới có thước.

- **ĐƯỜNG ĐÃ CHỌN: ③ làm thẳng 768 + fp32** *(quyết định — không phải việc; việc đang chạy là mục
  [~] ở đầu file)*. Hai số đo mới (2026-08-05) làm hai lựa chọn kia mất lý do tồn tại:
  - **512 KHÔNG rẻ hơn 768 một giây nào** — model luôn tính đủ 768 rồi `sliceNormalize` mới cắt,
    nên hai mức là **cùng một lần chạy model**; khác biệt duy nhất là dung lượng (297 vs 446 MB).
    Ưu điểm "tốn 2/3 thời gian" của phương án ② là SAI, đã bác.
  - **Chi phí thật rẻ hơn ước cũ nhiều:** 123.086 chunk duy nhất × 1,26 s = **43 giờ** (ước cũ
    60–190 giờ dựa trên 3,4 s/tin và chưa trừ dedup 19% + tool call).
  - Đo lại với 3.000 mồi (phương án ①) **bỏ**: nó tốn ~1 giờ chỉ để tinh chỉnh một lựa chọn mà
    giờ không còn đánh đổi — 768 đã trội cả về chất lượng lẫn thời gian.
- *(Luật user đã chốt, KHÔNG phải việc: mọi thí nghiệm chạy trên BẢN SAO — bản đang dùng:
  `D:\huy.nguyen\zemory-lab\lab.db`, chụp bằng `db.backup()` nên nhất quán.)*
- *(Hạ tầng sẵn: `ZEMORY_POOL` · `ZEMORY_RERANK_POOL` · `ZEMORY_RERANK_CHARS` chỉnh từ ngoài;
  bench có cột `@40` + kết luận tự động; `topN` 10 → 40.)*

## 🔴 RECALL: bản vá 3 lane ĐỔI CHỖ, chưa xong — việc kế tiếp rõ ràng (2026-08-08)

**Bench THẬT cuối ngày (máy rảnh, coverage 100%, `bench-final.log`)** — số này SUPERSEDE mọi
con số mô phỏng đã báo trong ngày:

| | trước vá | sau vá |
|---|---:|---:|
| `prose` @1 | 18% | **32%** ↑ |
| `prose` @3 | 47% | 41% ↓ |
| `prose` @10 | 62% | 53% ↓ |
| `prose` MRR | 0,354 | **0,384** ↑ |
| `tool_result` @10 | 25% | **0%** ↓↓ |

⇒ Bản vá **đẩy đáp án lên vị trí đầu nhưng làm mỏng top-3/top-10**. Giả thuyết (CHƯA xác minh):
lane OR rộng, lấn chỗ lane VECTOR vốn gánh @10 cho `prose`. Mô phỏng trước đó chạy FTS thuần
nên mù với cạnh tranh này — **giới hạn của phép thử pool đóng băng, ghi lại để đừng lặp**.

> ✅ **CẢ BA MỤC DƯỚI ĐÂY ĐÃ ĐÓNG — soát bằng code 2026-08-09.** Sổ đứng yên ở trạng thái
> 08/08 trong khi ba đợt vá ngày 09/08 đã xử hết. Giữ dòng + bằng chứng để không ai mở lại.

## 🔴 RERANK ĐANG BẬT TRÊN MÁY NÀY — chờ user tắt (phát hiện 2026-08-08, ưu tiên cao)

File config cạnh kho (gitignored) có khoá `rerank` = `true`. Code đã vá **mặc định = TẮT** (có
`settings-defaults.test.mjs` khoá), nhưng **giá trị cũ trong config KHÔNG tự tắt theo** — đúng
ca `plan/05 §4.E` đã ghi: đợt 07-26 chỉ vá GIÁ TRỊ, đợt sau vá MẶC ĐỊNH, và máy nào đã lỡ ghi
`true` thì nằm lại vĩnh viễn. Bằng chứng nó đang chạy thật: `memory search` in header
`… · rerank (cross-encoder) · …`.

**Giá phải trả, đo 2026-08-08 trên kho 768:** hybrid `41%@10` → hybrid+rerank `27%@10`
(MRR 0,220 → 0,160) và **11 s/truy vấn** thay vì 0,68 s. Tức mọi lần recall trên máy này đang
**chậm 16 lần và tệ hơn**. Rất có thể là một phần của triệu chứng "search trả rác".

## 🔴 WRITE-GATE VẪN THỦNG — bắt được ĐANG XẢY RA 2026-08-08 (ưu tiên cao)

**Hai `memory embed --all` cùng ghi MỘT kho** — đúng tổ hợp đã hỏng kho 03/08. Bắt được lúc
đang chạy, không phải suy đoán: `Win32_Process` cho thấy **pid 15640** (backfill chạy tay) và
**pid 11092** (do daemon vừa bật sinh ra) cùng chạy `dist\cli.js memory embed --all`, mỗi bên
~2,3–2,8 GB RAM. Đã dừng pid 11092 + tắt scheduler qua `/set-scheduler` (đảo được: bật lại
trong ⚙ Tự động).

**Khoá KHÔNG hỏng — người GỌI bỏ qua lời từ chối.** Bằng chứng: `data/cli-write.lock` ghi
`{"pid":15640,"label":"embed"}`, tức `acquireCliWriteLock` ĐÃ trả `ok:false` cho tiến trình
thứ hai. Nhưng `commands/memory.ts` chờ 24×5 s rồi in *"chờ quá lâu — chạy tiếp"* và **chạy
luôn**. Với job embed dài HÀNG GIỜ thì nhánh "chạy luôn" là nhánh **luôn luôn** được chọn.
⇒ Bản vá 2026-08-06 sửa được vế "khoá không bao giờ từ chối", nhưng vế "người gọi phải nghe
lời từ chối" thì chưa. Khoá đúng, cửa vẫn mở.

> ✅ **CẢ BA MỤC ĐÃ ĐÓNG — soát bằng code 2026-08-09** (sổ đứng ở trạng thái sáng 08/08, bản vá
> landing cùng ngày nhưng không ai đổi dấu). Giữ dòng + bằng chứng để không ai build lại lần hai.

## 📌 Bàn giao 2026-07-28 — ĐÃ ĐÓNG 2026-08-05 (user duyệt → `06_CHANGES [2026-08-05d]`)
> Ba lane web (claude-web 3 lỗi · hỏi-đăng-nhập giữa run · nút Quét kéo web) + lane `claude-cowork`
> đã ghi sổ đầy đủ ở entry đó. Quyết định "KHÔNG lấy cookie từ trình duyệt chính" giữ nguyên.

<details><summary>Bản gốc 3 mục (giữ để tra lại lý do — nội dung đã vào changelog)</summary>

- **`claude-web` — ĐÃ GHI SỔ `[2026-08-05d]`.** *(hồ sơ đo, không còn là việc)*
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
- **Hết hạn xác thực khi scan web → HỎI + mở cửa sổ — ĐÃ GHI SỔ `[2026-08-05d]`.**
  Trước: `need-login` là ngõ cụt — in *"a browser window is open at …"* **kể cả khi không mở cửa sổ nào**
  (chỉ mở khi cổng debug chết), và hết hạn GIỮA run thì mọi hội thoại còn lại đếm thành `failed`, log
  trông y như bị rate-limit. Nay: `awaitLogin()` mở cửa sổ **trước** rồi mới hỏi, kiểm lại auth sau mỗi
  câu trả lời; giữa run cứ **3 lần fail liên tiếp** thì hỏi lại site xem còn đăng nhập không — mất phiên
  thì lưu phần đã kéo, hỏi, đăng nhập xong **chạy tiếp tại chỗ**. Không TTY (daemon/pipe) ⇒ mở cửa sổ rồi
  báo `need-login` + exit 1, **không treo** chờ câu trả lời không ai gõ được.
- **UI: nút Quét kéo được web + hỏi đăng nhập — ĐÃ GHI SỔ `[2026-08-05d]`.** *(user báo 2026-07-30:
  "bấm scan nó ra mới nhưng vẫn ko lấy từ web dc, cũng ko hề hỏi authen")*
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
- **KHÔNG lấy cookie từ trình duyệt chính (user hỏi 2026-07-30) — quyết định GIỮ NGUYÊN, không phải việc.**
  Đã xác minh từ `plan/07 §5`: copy cookie/DPAPI từ profile Edge có sẵn bị **App-Bound Encryption** +
  guard chặn; vượt được chỉ bằng cách tiêm vào tiến trình trình duyệt (kiểu malware) và phá điều 7. Cookie
  **đã tự dùng lại** trong profile RIÊNG của zemory (`data/browser/<nền>`) — hỏi đăng nhập chỉ xảy ra khi
  chính cookie đó hết hạn. Ghi lại đây để phiên sau khỏi thử lại đường đã chết.

</details>

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

> ⏸ **HOÃN VÔ THỜI HẠN 2026-08-06 (user chốt): mọi mục nhánh CODEX + GEMINI.** Nguyên văn:
> *"cái này ko cần quan tâm, t chưa làm… bỏ qua đi"* — user chưa dùng hai host đó, nên khai MCP
> cho `codex`, mở rộng hook Codex, và nền web Gemini đều KHÔNG có người tiêu thụ. Giữ nguyên hồ
> sơ (đo đạc còn giá trị nếu sau này dùng tới); **đừng đưa lại vào danh sách ưu tiên khi chưa hỏi.**

## 🧷 Context-guard + realtime capture — ĐÃ BUILD XONG `[2026-08-02h]`; còn 2 việc
> ✅ **Bốn mục dưới ĐÃ XONG — dấu đã đổi `[ ]` → `✅` (05/08), soát lại bằng code 2026-08-06 vẫn
> đúng:** `WARN_AT_PERCENT = 95` (`capture-hook.ts:28`) + marker chống spam
> (`context-guard/<sid>.warned`) · handler `pre-compact` · handler `session-start` chỉ nói khi
> `source=compact` + `recallCard` · bảng khai hook có đủ 4 sự kiện (`capture-hook.ts:191–194`) ·
> `context-guard.ts` có `readContextUsage` + `lastCompactAt`.
> **Giữ nguyên dấu `✅` — đừng đổi ngược về `[ ]`,** phiên sau sẽ build lại lần hai.

> Gốc: đối chiếu "compaction recovery" của engram. **Session-lifecycle KHÔNG làm** (đã có tốt
> hơn, tự động: sessions từ transcript + digest 100%). "Nén từng đoạn hội thoại": digest
> per-phiên ĐÃ CÓ (plan 06, 2026-07-02); compression đúng nghĩa đã BỎ 2026-06-25 (attic/).
> Số đo nền (2026-08-02): usage nằm sẵn trong transcript (`cache_read+cache_create+input` —
> phiên thật đo 439k) · scan incremental cả kho: **7,2s** có tin mới · **1,8s** no-op ·
> **~125s khi embed nền chạy** (tranh CPU + write-gate — hook sẽ timeout, scheduler lượm lại).

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

- **Nợ đo lại — ĐÃ ĐO 2026-08-05, cả hai đóng:** vector backlog kho thật còn **639** (không phải
  ~4.6k; scheduler đã lượm gần hết trước khi tôi tắt nó chiều nay — phần còn lại sẽ do lần embed sau
  khi TRÁO xử) · entry `2026-08-02` đã trôi xuống `archive/06_CHANGES.md`, không còn trong bộ đọc.

## 🔬 Audit 2026-07-27 — còn 1 finding
## 🔥 Từ chốt sổ 2026-07-21 — làm trước
## 📥 User gửi 2026-08-05 tối — "để tính sau", note lại đây

<!-- === 2026-08-24 (chot phien): doi 20 section lich su khong con muc mo === -->
## 🔬 Audit toàn diện 2026-08-23 (11 mặt, TRONG LÚC ma trận bench chạy) — 2 blocking, 5 advisory

> **Điều kiện đo — đọc trước khi tin số:** ma trận bench đang ở ô 4/4 ⇒ **không build được**
> (`npm test` kéo `clean && tsc`, xoá `dist/` dưới chân job) và **daemon TẮT có chủ đích** từ 15:35Z.
> Mọi mặt cần build / cần bề mặt sống / cần I/O nặng đều ghi **CHƯA ĐO**, không ghi "sạch".
>
> **Sạch, đã đo trong lượt này:** tsc `--noEmit` **0 lỗi** (chứng minh merge 2.2.1 dịch được) · lint 0
> · **685/685 test · 0 skipped** (92/101 file) · `conform --gate` ✓ 233 file · `validate` ✓ ·
> `todo verify` exit 0 · **git: hash CÂY local = origin** (`20c1d799`), 1002 = 1002 file, 0 commit
> sót, 0 file untracked · secret cây HEAD **sạch**, chìa dấu tay **e6fb0eff** (≠ `41d88e4d` bản đã
> lộ) · blob lịch sử lớn nhất **1,72 MB**, size-pack 23,86 MiB · **0 tin mồ côi · 0 vector mồ côi ·
> FK sạch · digest 100%** ở CẢ HAI kho (2.332/2.332 · 2.330/2.330) · neo test **210 neo, 0 chết** ·
> `doctor` xanh, kho ngoài mọi phạm vi đồng bộ · **guard chứng minh sống 3 lần trong phiên** (chặn
> `git add -A`, chặn lệnh grep chạm tên file khoá, cho push qua rồi đóng dấu cờ một-lần).

## 🔵 BÀN GIAO 2026-08-23 — ĐỌC MỤC NÀY TRƯỚC

**Hai câu user dặn hỏi lại ở phiên sau:** ① *"còn cách nào nữa không"* (nâng recall) — danh sách đã
dựng sẵn ở §⭐ NGÃ RẼ RECALL bên dưới, **đọc nó trước khi đề xuất gì** · ② *check todo* — nhớ luật
BA NGUỒN (`02_RULES §Hành xử`), đừng đọc sổ rồi chép.

**VIỆC ĐẦU TIÊN — ✅ ĐÃ XONG 2026-08-23:** daemon 4444 sống lại (`/ping` 2.3.0) và **`autosync` + `scheduler` đã BẬT** (đo lại `/automation`, không tin response của POST). Lượt sync đầu chạy thật: nhúng thêm 500 vector.

**Trạng thái máy lúc chốt (đo thật):** daemon **TẮT** · kho thật **2.333 phiên · 283.782 tin ·
261.472 vector · còn 9.241** · kho song song **280.224 tin · 261.397 vector · còn 5.862** (GIỮ vô
thời hạn, user chốt) · backup mới nhất **2026-08-22T19-31-41Z** (tôi chụp tay sau khi bắt ca bỏ đói
27,9 giờ) · `package.json` **2.3.0, ĐÃ PUSH** (`5c92b32`) · sau đó **4 commit chưa push** ·
`05_TODO` 1.676 dòng · `06_CHANGES` 298 dòng trước khi thêm 2 entry hôm nay.

**Phiên này làm gì** (số đo đầy đủ: `06_CHANGES [2026-08-23]` · `[b]` · `[c]`): ① **test FULL BGE-M3**
— 4 ô bench + 2 probe T5, phán quyết **KHÔNG TRÁO** · ② đóng **5 lỗ trôi chuẩn** zemory↔template +
dựng cổng `standard-parity` · ③ **push 2.3.0** · ④ **audit 11 mặt** (2 blocking) · ⑤ luật *"xong là
đóng ngay"* + vá `closedItems` · ⑥ **corpus 68 → 108 nhãn** · ⑦ cổng lớp gộp ⇒ **giữ gộp BẬT**.

⚠ **Bảy bẫy đã trả giá phiên này — đừng dẫm lại:**
· **Thước sai đẩy máy làm việc vô nghĩa hàng giờ:** so parity bằng `messages.id` (AUTOINCREMENT
  **cục bộ**) ⇒ báo lệch 2.594 ảo. Dấu vân tay của lỗi: **lệch gần BẰNG NHAU hai chiều**; thiếu thật
  thì lệch MỘT chiều. Khoá bền là `(session_id, uuid)`.
· **`memory embed --help` / `scan --help` CHẠY THẬT** (không có `--help`); embed còn giữ
  `cli-write.lock` hàng giờ. Đừng gõ cờ để "xem thử".
· **Đưa regex qua `node -e`/`sed` bị nuốt escape — dính LẦN THỨ 6**; và dùng `|` làm dấu phân cách
  `sed` trên nội dung có `|` thì im lặng không thay gì. Chữa dứt: **viết script ra FILE**.
· **Phép dò tự viết trượt ca tự-kiểm 2 lần** (export mồ côi báo 402/402). Không có ca tự-kiểm thì
  mọi con số là rác — nó đã chặn tôi khỏi ghi số sai vào chính báo cáo audit.
· **Bộ dò mojibake báo oan trên file DẠY về mojibake** (6/245 hit, 0 thật) — phải miễn chuỗi trong
  backtick nếu muốn cổng-hoá.
· **`doctor` chấm ✓ khi backup đã 27,9 giờ tuổi** (ngưỡng đỏ là 2× chu kỳ) — bề mặt nói dối.
· **Đọc một mình thước NGHIÊM ra kết luận sai** về lớp gộp (xem `[2026-08-23c]` phần tự nhận).

## 🔬 MẶT AUDIT ⑪ + LUẬT "CHỮ NGƯỜI DÙNG ĐỌC" — 2026-08-22 (user nêu 5 phép kiểm còn thiếu)

> Chi tiết + số đo: `06_CHANGES [2026-08-22]`. Ở đây chỉ giữ **việc còn mở** và **thứ đã loại**.

**Đặt sai nhà lần đầu, user chỉnh:** *"cái này tính ra là skill khi gọi chứ cũng ko phải là luật,
áp lên mọi bộ harness"*. NORM nay ở `02_RULES §Ngôn ngữ` (4 ràng buộc) + ship **cả 4 bộ template**;
skill `audit` mặt ⑪ chỉ giữ **cách đo + bẫy báo oan**. Ma trận 4 luật × 5 bộ rule: đủ ✓.

## 🔬 Audit toàn diện 2026-08-21 (22:00, sau chốt phiên — job embed VẪN chạy) — 1 BLOCKING, 7 advisory

> **Điều kiện đo:** job re-embed BGE còn sống (wrapper pid 800 + con embed pid 21968) ⇒ **gate đầy
> đủ vẫn KHÔNG chạy được** (`npm test` kéo `npm run build` = `clean && tsc`, xoá `dist/` dưới chân
> job). Mọi số thời gian là CẬN TRÊN. Thay vào đó chạy: `typecheck` · `lint` · `conform --gate` ·
> `validate` · `doctor` · **cụm 33 file test độc-lập-daemon**.
>
> **Sạch, đo trong lượt này:** tsc 0 lỗi · lint 0 lỗi · `conform` ✓ (230 file · slot 19/56 · skill 9)
> · `validate` ✓ · `doctor` ✓ (guard KHÔNG lỗi thời — `guardDrift` im) · **272 test pass / 0 fail /
> 0 skipped** (33 file: graph 9 · conform/parity 5 · guard 4 · ui/i18n 3 · docs/todo 6 · khác 6) ·
> **395 export đều có người gọi** (0 mồ côi, phép đo có self-test) · `quick_check ok` · FK 0 ·
> **0 tin mồ côi** · digest **2.325/2.325** · DDL vector đúng dấu (`float[1024]` kho song song ·
> `float[768]` kho thật — phép thử kiểu "20 tin cứu 44 giờ") · **0 secret tracked** · blob lịch sử
> lớn nhất **1,72 MB** (314 MB weight đã sạch thật) · deps khớp lockfile · heartbeat daemon tươi ·
> **guard chặn THẬT** (nó chặn đúng lệnh của chính tôi khi tôi gõ tên file khoá).

## 🔬 Audit toàn diện 2026-08-21 (đêm, Fable — TRONG LÚC job embed chạy) — 10 mặt, 0 blocking, 4 advisory

> **Điều kiện đo phải đọc trước khi tin số:** job re-embed BGE đang chạy ⇒ mặt ① chỉ chạy
> tsc/lint + test KHÔNG-ONNX; mọi số thời gian là CẬN TRÊN (máy bận I/O). Gate ĐẦY ĐỦ cố ý
> chưa chạy — xem "chưa đo" cuối mục.
>
> **Sạch, đo trong phiên:** tsc 0 lỗi · `npm run lint` 0 lỗi · `conform` ✓ · `validate` ✓ ·
> `quick_check ok` · FK 0 · **0 tin mồ côi** · digest **2.324/2.324 (100%)** · vector khớp chéo
> SQL↔API (257.072) · 0 secret tracked · 0 blob mới >1MB từ `410a462` · pack đứng yên 22,93 MiB ·
> heartbeat daemon tươi (<60s) · write-lock được giữ ĐÚNG bởi con embed (label khớp, mốc tươi) ·
> app-ui 47/47 · i18n-ratchet + license-gate 6/6 · guard suite 32/32 (ma trận có ca ÂM) ·
> **6 đột biến trong ngày đều đỏ được** · 2 export mới (`guardDrift` · `NONAPP_FREEFORM_PARENTS`)
> đều có người gọi · 06_CHANGES 217 dòng < trần 300.

## 🔴 GUARD LỚP ① HỞ NỬA CỬA TRÊN WINDOWS — ĐÃ VÁ 2026-08-20 (báo từ repo `PBI_SasinFlow_Rebuild`)

> Báo cáo từ phiên repo khác, **đã tự đo lại và ĐÚNG** — tái lập nguyên vẹn trên chính zemory.

**Lỗ:** `guard.cjs` phân nhánh theo `tool_name` và chỉ biết 5 tên (`Write`·`Edit`·`NotebookEdit`
·`Read`·`Bash`). Phiên Claude Code trên Windows có SẴN tool **`PowerShell`** làm đúng việc của
Bash ⇒ **mọi nhánh gác LỆNH vượt được sạch chỉ bằng cách đổi tool.** Đo trước khi vá:

| tool | `rm -rf docs/agent` | `Remove-Item -Recurse` | `git push` | `git add -A` |
|---|---|---|---|---|
| `Bash` | CHẶN | CHẶN | CHẶN | CHẶN |
| **`PowerShell`** | **cho qua** | **cho qua** | **cho qua** | **cho qua** |

**Vì sao không gate nào bắt được:** regex nhận diện VẪN ĐÚNG (nhánh Bash bắt cả cú pháp
PowerShell) — chỉ cái cổng TÊN chặn sai. Mọi test cũ chỉ gửi `tool_name: "Bash"` nên xanh hết
trong khi cửa mở toang. *Nghiêm trọng thêm: phiên đang chạy của chính tôi có tool PowerShell và
đã dùng nhiều lần — lỗ này mở suốt.*

**Đã vá ba tầng:**
1. **Nhận theo HÌNH DẠNG, không theo tên** — có `tool_input.command` ⇒ soi như lệnh shell, bất kể
   tool tên gì. Gác theo danh sách tên là cuộc đua không thắng: host thêm tool terminal mới là lỗ
   mở lại. Kèm `MultiEdit` vào nhánh ghi.
2. **`GUARD_MATCHER` thành hằng số một-chỗ** (`guard-gen.ts`) và `zemory hook guard` nay **in kèm
   matcher đầy đủ** — trước chỉ in `PreToolUse → node …/guard.cjs`, người nối phải tự đoán, và
   repo báo cáo đoán thiếu đúng `PowerShell`. Hai tầng hỏng đều im lặng: guard không hiểu tên ⇒
   cho qua · matcher thiếu tên ⇒ host không bao giờ gọi guard.
3. **Bản ship cho bộ cowork** (`docs_template/cowork/nonapp/hooks/guard.cjs`) chép lại từ bản sinh
   + cập nhật số dòng trong manifest BOOTSTRAP (282 → 291). *Gate `template-parity` đã bắt đúng
   việc này — nó đỏ ngay khi bản ship trôi khỏi bản sinh.*

**Gate mới `guard-tool-matrix.test.mjs` (4/4)** — soi MA TRẬN `tool × lệnh` thay vì từng regex,
có ca tool-lạ-chưa-biết-tên, có ca kiểm matcher, và **ca ÂM** (6 lệnh thường ngày × 2 tool phải
được cho qua — luật 7). Đột biến chứng minh đỏ được: trả guard về chỉ-nhận-`Bash` ⇒ **2 đỏ**;
bỏ `PowerShell` khỏi matcher ⇒ **3 đỏ**.

⚠ **File guard KHÔNG tự làm mới** — `generateGuards()` chỉ chạy khi gõ `zemory hook guard`
(`sync`/`doctor`/`init` không gọi). Mọi repo đã cắm guard đang giữ bản HỞ cho tới khi có người
chạy lại lệnh đó **và** thêm `PowerShell` vào matcher trong `.claude/settings.json`.
## 🔬 Audit toàn diện 2026-08-15 (đêm) — 10 mặt, gate xanh trọn, 0 lỗ mới

> **Sạch, đã đo trong phiên này:** gate ĐẦY ĐỦ **671/671 · 0 fail · 0 skipped** (~17 phút, daemon
> TẮT lúc chạy — không phải "xanh có kèm skipped") · `conform` ✓ (slot 19/56, nhận điều 16) ·
> `validate` ✓ (0 entry vượt trần) · `quick_check ok` 25,9 s · FK 0 · **258.779 tin / 2.085 phiên**
> · 0 tin mồ côi · digest **100%** · vector 245.723 · coverage 100% · dims 768d · `lastSync` khớp
> từng ký tự `drive.lastPushAt` (bản vá 13k sống trên daemon THẬT) · backup local ĐÚNG NHỊP NGÀY
> (12→13→14/08 ~13:00 — backupTick sau tách công tắc chạy thật) · log nền có dòng `[scheduler]` ·
> git sạch, size-pack 22,93 MiB, 0 secret tracked, 0 file lớn (max 1,8 MB ảnh), `.gitignore` kín ·
> guard PreToolUse **chứng minh sống bằng ca thật trong phiên** (chặn lệnh chạm token tên file khoá).
>
> **Đo gần nhất, KHÔNG chạy lại đêm nay (đắt, không có thay đổi liên quan):** license cả cây 190
> gói (13/08) · clone sạch 4/4 (13/08) · diễn tập phục hồi kho trắng (12/08) · ma trận guardrail
> 28 ca (11/08). **Chưa đo:** mở app nhìn tận mắt (cần mắt người) · 717 cửa sổ phụ chênh (cần kho
> đóng băng) · đo lạnh `/memory-status` lúc máy rảnh.

## 🔬 Audit sau release 1.5.0 (2026-08-12 tối) — 5 phát hiện · 3 mặt CHƯA CHẠY

> **Sạch, đã đo:** gate **646/646** · typecheck · lint · `conform` ✓ (nhận ra `điều 16`) ·
> `quick_check` + `foreign_key_check` sạch · **0 cửa sổ vector mồ côi** · cây làm việc KHÔNG
> track bí mật nào (13 file khớp mẫu chỉ vì tên thư mục `cowork_global_memory/`) · nhịp tim
> daemon tươi · **diễn tập phục hồi ĐÃ LÀM** (merge kho chính vào kho trắng: 239.706 tin ·
> 226.898 vector · còn phải nhúng 2 tin).

## 🔬 Audit 10 mặt 2026-08-11 (lần đầu chạy bộ mở rộng) — 1 lỗ sửa tại chỗ, 5 việc còn

> Sạch: `conform` ✓ · 0 mồ côi (3 phép đo) · digest **1.294/1.294** · vector `prose` **99,93%** ·
> 6/6 dependency license tương thích Apache-2.0 · đúng MỘT kẻ ghi kho · nhịp tim daemon tươi ·
> guardrail **22/28** · **diễn tập phục hồi ĐÃ LÀM** (bundle 1,63 GB giải mã ra chỗ tạm, đếm đủ).
> Bốn mặt mới (⑦–⑩) **ngay lần đầu chạy đã ra 4 phát hiện** mà 6 mặt cũ không thể thấy.

## 🔗 NGUỒN ĐỒNG BỘ GLOBAL MEMORY — đọc TRƯỚC khi nối một máy mới (đo 2026-08-11)

> Máy nào pull repo về cũng đọc mục này để biết kho nhớ chung nằm đâu và nối vào thế nào.
> Mọi số dưới đây đo bằng `~/.zemory/location.json` · file config cạnh kho · `/automation` của
> daemon đang chạy — không phải chép lại từ sổ.

| | giá trị hiện tại |
|---|---|
| kho sống | `<repo>/data/global_memory.db` (HP điều 14 — TRONG cây repo, KHÔNG ở ổ hệ thống) |
| con trỏ vị trí | `~/.zemory/location.json` → `{"dataDir": "<repo>/data"}` |
| kênh xuyên máy | thư mục Drive dùng chung, máy này trỏ `G:\My Drive\Global Memory` |
| kho chính trên Drive | **`global_memory.enc`** — MỘT file duy nhất, container nhiều khối (+ `global_memory.bak.enc` là bản lùi) |
| cách ghi | **NỐI THÊM** một khối vào cuối; không có tin mới ⇒ không chạm file |
| chở gì | **TRỌN bộ RAG**: tin gốc + vector + cửa sổ phụ của tin dài (HP điều 16) |
| model | `data/models` **4,4 GB** (EmbeddingGemma + rerank) — vẫn cần ở máy mới để nhúng CÂU HỎI |

### MỘT KHO CHÍNH — mọi máy ghi vào chính nó

> 🔄 **Thay bảng "HAI ĐƯỜNG CHỞ lean/full" viết 2026-08-11.** Bảng đó dạy rằng đường mặc định
> **không chở vector** nên máy kia "có đủ TIN, không có lớp ngữ nghĩa" — **hết đúng từ 2026-08-12**.
> Nó cũng dạy phải `import --force` (THAY nguyên DB) để có vector; nay **không cần**, và
> `import` trên kho chính sẽ báo lỗi chỉ đường sang `--merge`.

| | đường DUY NHẤT hiện nay |
|---|---|
| xuất | `zemory memory sync` (tự động 30 phút/lần, hoặc bấm tay) |
| ghi vào | `global_memory.enc` — **nối thêm**, mọi máy cùng file |
| bên nhận | `zemory memory sync` (tự merge) hoặc `zemory memory import <file> --merge` |
| máy mới dùng được ngay? | **CÓ — đủ cả hybrid.** Đo 2026-08-12 trên kho trắng: nhận **219.944/219.946 vector**, còn phải nhúng lại **2 tin** |

**Đo bằng vòng khép kín, không suy đoán** (2026-08-12): xuất gói **1.356 MB** → merge vào kho
TRẮNG → đếm hai đầu. Tin 239.495 · vector 226.675 · cửa sổ phụ 6.664 · `vectorRemaining` = **2**.
Chênh vài trăm hàng so với nguồn là do kho lớn thêm trong lúc xuất (autosync vẫn chạy) — không
phải lỗ thiết kế, và lượt sync kế tiếp tự bù.

**Ba bẫy đã trả giá khi dựng đường này, đừng dẫm lại:**
· **id trong gói là ID GIẢ** — `buildRowsSnapshot` cố ý không chép cột `id`, tin được đánh số
  lại từ 1. Lấy id đó tra ngược kho nguồn ⇒ chở đúng 25% vector, `rejected=0`, không log nào báo.
· **Tin `uuid IS NULL`** (11.233 = 4,7%) phải định danh bằng **băm mốc-thời-gian + nội dung**;
  bỏ chúng là đẩy ~3,9 giờ nhúng lại sang máy mới.
· **Một hàng hỏng không được giết cả lô** — bọc lô 500 trong một giao dịch rồi nuốt lỗi ở vòng
  ngoài là mất 500 vector một lần, âm thầm.

### Bốn thứ máy mới cần để CHẠY LIỀN (thiếu một là hụt)

1. **Mã nguồn** — `git clone`/`git pull` → `npm install` → `npm run build` → `npm link`.
2. **Chìa** — mang tay, `zemory memory key set` (đọc stdin), rồi **so dấu tay** `key show` với
   máy nguồn. Chìa phải có **TRƯỚC** mọi thao tác bundle (`plan/16 §3`).
3. **Kho + trọn bộ RAG** — `zemory memory import "<thư mục Drive>/global_memory.enc" --merge`
   *(hoặc chỉ cần trỏ Drive rồi `zemory memory sync` — nó tự merge)*.
   > 🔄 **ĐỔI 2026-08-12.** Bước này trước ghi `--force` kèm câu *"KHÔNG dùng `--merge`: merge chỉ
   > lấy 4 bảng nguồn, vector sẽ bị vứt"* — **nay ngược lại**: `--merge` là đường ĐÚNG và nó chở
   > đủ vector; còn `--force` trên kho chính sẽ bị từ chối kèm câu chỉ đường (kho chính là
   > container nhiều khối, không phải ảnh chụp nguyên DB).
   *(Lệnh TỰ DÒ chìa cạnh kho — không cần `--key-file`; cổng `sync-path-key.test.mjs` khoá.)*
4. **Model 4,4 GB** (`data/models`) — không chép thì máy kia **tự tải lúc chạy**. Cần cả lúc
   **TRUY VẤN**, không riêng lúc embed: câu hỏi phải được nhúng mới so được với vector ⇒ thiếu
   model thì dù kho có đủ vector, hybrid vẫn rơi về FTS.

Sau khi merge xong, từ đó trở đi mọi máy chạy `zemory memory sync` như thường — nối thêm, additive.
**Quy trình chung cho MỌI thứ mới sinh ra sau này: skill `.claude/skills/sync-path/`** — khai kênh
+ đo vòng khép kín trước khi gọi là xong, để không lặp lại cảnh dò-rồi-vá của phiên này.

⚠ **Series của máy cũ `SS01-IT-10` đã CHẾT** (9 file ~338 MB nằm lại vĩnh viễn — không còn ai chạy
compact cho nó). Đừng chờ nó cập nhật; dọn bằng `zemory memory sync --prune-host SS01-IT-10`
(có dry-run) khi đã verify nội dung của nó nằm trong kho local.

**Công tắc đang bật trên máy này** (đo `/automation` + config, 2026-08-11):
`autostart` BẬT · `autosync` **BẬT** · `realtime` BẬT (đã nối) · `scheduler` TẮT · `rerank` TẮT ·
`hybrid` BẬT · `syncAttachments` TẮT.

## 🔵 BÀN GIAO 2026-08-10 — recall: đọc mục này TRƯỚC khi làm gì tiếp

> **Đổi so với bàn giao 09/08:** ① **rerank ĐÃ TẮT** (đo: thua mọi cột nghiêm, chậm 11,6×) —
> mốc nền dưới đây đo KHÔNG rerank, giữ nguyên giá trị · ② thêm hai lớp **RM3** và **luồng
> từ-hiếm**, cả hai **TRƯỢT CỔNG, mặc định TẮT** (`ZEMORY_RM3=1` / `ZEMORY_RARE=1`) · ③ đang
> chạy **phép thử nhúng tin tool trên BẢN SAO** — xem mục `[~]` đầu danh sách.
>
> **Điều quan trọng nhất phiên này tìm ra:** `tool_use` 0% **KHÔNG phải** vì thiếu vector mà vì
> **RRF thưởng đồng thuận nhiều luồng** — thứ chỉ có mặt ở MỘT luồng thì hạng 1 cũng bị vùi.
> Bằng chứng: luồng từ-hiếm có đáp án **7/14 ở pool 60** mà đường ống trả **0/14**; nâng
> `W_RARE` 0,45→3 cứu 3/14 vào top-40. Quan hệ đơn điệu theo số luồng: `prose` 3 luồng 50%@10 ·
> `tool_result` 2 luồng 25% · `tool_use` 1 luồng 0%. **Đọc trước khi quyết chi giờ máy cho embed.**
>
> ⚠ **Bẫy phương pháp đã dính phiên này:** probe tự dựng thiếu `all: true` (bench luôn có) ⇒ ba
> thí nghiệm `TOOL_DEMOTE`/`vecMix`/gộp-trùng cho số VÔ NGHĨA, đã bỏ. Probe mới phải sao chép
> tham số của `recallbench.ts:240` trước khi tin bất kỳ con số nào.

**Trạng thái thước (bench chính thức, 68 nhãn, `bench --recall --no-rerank`):**

| lane | nghiêm | tương đương |
|---|---|---|
| hybrid | `@10` 35% · MRR 0,288 | `@10` **54%** · `@40` **63%** · MRR **0,413** |
| FTS-thuần | `@10` 28% · MRR 0,191 | `@10` 44% · MRR 0,312 |

Đầu phiên chỉ có MỘT thước và `@10` 32% · MRR 0,235. **Đọc `plan/17` §1.2b trước khi đo lại bất
cứ gì** — hai thước có thể nói NGƯỢC nhau, và dùng lẫn chúng là ra quyết định sai.

**Mặc định đang chạy:** đa-truy-vấn (agent gửi `also`) · trộn cosine `vecMix` · gộp near-dup +
`similarIds` · hình phạt tool **hai mức theo lane** (FTS 0,3 · hybrid 0,7). Đang TẮT: cổng
"không biết" (`ZEMORY_ABSTAIN=1` để bật — trượt cổng nghiêm, chặn 5/8+4/10, giết oan 0/68).

  ✅ **XONG 11/08 — cổng QUA** (`tool_use` thoát 0%, không lớp nào tụt; đã embed kho thật).
  Bản sao `tooltest.db` cũng không còn trên đĩa. *Giữ hồ sơ để tra phương pháp A/B.*
  ~~**PHÉP THỬ ĐANG CHẠY trên BẢN SAO — nhúng tin tool để kiểm giả thuyết "hai luồng".**~~
  > 🔄 **Đổi PHẠM VI và LÝ DO so với mục cũ** (`Edit,Write` 9–16 giờ vì "khớp ngữ nghĩa").
  > Đo 2026-08-09/10: 14 nhãn `tool_use` trỏ vào **Bash 6 · Edit 4 · PowerShell 3 · Artifact 1 ·
  > Write 0** ⇒ `Edit,Write` chỉ phủ **4/14**. Và lý do thật KHÔNG phải ngữ nghĩa mà là **RRF
  > thưởng đồng thuận nhiều luồng**: `prose` 3 luồng 50%@10 · `tool_result` 2 luồng 25% ·
  > `tool_use` 1 luồng **0%**. Embed = cấp cho lớp này luồng thứ hai.
  **Đang chạy:** `GLOBAL_MEMORY_DB=D:\huy.nguyen\zemory-lab\tooltest.db`
  `ZEMORY_MODEL_DIR=…\data\models ZEMORY_EMBED_TOOLS=Edit,Write,Bash,PowerShell memory embed --all`
  (bản sao chụp bằng `db.backup()`, 1.550 MB, `quick_check ok`; log `zemory-lab\tooltest-embed.log`).
  **Mốc bằng chứng** (embed xử theo độ dài TĂNG DẦN): 8.246 tin→phủ 1/14 · **11.000→4/14 (~3,9 giờ)**
  · 16.682→7/14 · 28.705→**14/14 (~10 giờ)**; trọn nhóm 44.747 tin ≈ 15,7 giờ.
  **Nghiệm thu đã định TRƯỚC:** `bench --recall --no-rerank` trên bản sao, so bảng THEO LỚP với mốc
  nền (`prose` 50%@10 · `tool_result` 25% · `tool_use` 0%). ĐÚNG nếu `tool_use` tiến về ~25% mà
  `prose`/`keyword` không tụt; SAI nếu vẫn ~0% dù đáp án đã có vector ⇒ **đừng chạy job trên kho thật**.
  ⚠ Chạy MỘT MÌNH — bench và embed cùng dùng ONNX một CPU thì cả hai số đều hỏng.
- ❌ **"Backlog embed ~960 tin" — SỐ CHẾT LẦN THỨ BA.** Đo 2026-08-13 qua `/memory-status`:
  **remaining 35 · coverage 100%**. Và vế *"scheduler đang TẮT nên không ai tự xử"* cũng hết
  đúng — scheduler **BẬT** từ 12/08, nó tự xử. *Con số này đã chết ba lượt (674 → 960 → 35): nó
  là **đại lượng ĐANG CHẢY**, ghi số vào sổ là ghi một ảnh chụp hết hạn ngay khi mực khô. Muốn
  biết thì gọi `/memory-status`, đừng đọc sổ.*
## 🔴 Hồ sơ đợt rebuild (giữ để tra) — dựng lại chỉ mục ở 768 chiều + fp32

> Kho thật `✓ lành` · **~207k tin · 1.284 phiên** · chìa `e6fb0eff` · repo `D:\huy.nguyen\Tool\Zemory`.
> Số đo + lý do đầy đủ: `06_CHANGES [2026-08-05]`. Cổng đã xanh: **510/510** · `conform` ✓ · đã push **1.1.1**
> *(đo lại 2026-08-07: `package.json` = 1.1.1, release commit `c58fa76`; dòng này trước ghi 1.1.0 — lỗi thời một bậc).*
> Kho thật lúc đo: **211.050 tin · 1.287 phiên** (số 207k/1.284 ở dưới là mốc 05/08, hook vẫn nạp thêm mỗi ngày).

> 🔄 **BÀN GIAO PHIÊN 2026-08-07 — đọc trước khi gõ gì.** Embed chạy trong **cửa sổ PowerShell RIÊNG
> của user**, output đã CHUYỂN HƯỚNG vào file (console không còn gì để in ⇒ hết bẫy đóng băng):
> `$env:GLOBAL_MEMORY_DB="D:\huy.nguyen\zemory-lab\lab.db"; $env:ZEMORY_MODEL_DIR="D:\huy.nguyen\Tool\Zemory\data\models";`
> `node dist\cli.js memory embed --all *> D:\huy.nguyen\zemory-lab\embed.log`
> **Mốc 2026-08-07 tối: 112.889/123.086 chunk (91,7%)** — còn ~10,2k, nhịp 32 chunk/phút ⇒ ~5,3 giờ.
> *(mốc trong ngày: 81,4% lúc chốt phiên trước → 88,2% chiều → 91,7% tối)*
> **Xem tiến độ (cửa sổ KHÁC, đừng đụng cửa sổ job):** `node D:\huy.nguyen\zemory-lab\watch.cjs` (bảng
> tự cập nhật 30s, tự báo ĐỨNG IM) hoặc `progress.cjs` (một phát). **Bài học trả giá 4 lần trong ngày:
> bôi đen/copy console đang in = Windows ĐÓNG BĂNG tiến trình** (mark-mode chặn write; ESC là chạy lại).
> Chết thì mũi tên lên + Enter, `--all` tự nối; **TUYỆT ĐỐI không `--rebuild`**.
> **Đừng smoke bằng `zemory ui`** — nó LUÔN bật cửa sổ thật lên desktop user (sự cố "344 KB không có
> data" 06/08 đêm — xem `[2026-08-07b]`); kiểm bề mặt thì curl daemon 4444 thật, read-only.

## 🆕 Phát sinh 2026-08-09/10 — 4 việc

## 🔬 Audit 2026-08-03 (6 mặt) — 3 lỗ đã sửa tại chỗ, còn 2 việc CHỜ USER
> Chi tiết + số đo: `06_CHANGES [2026-08-03]`. Sạch: gate 481 · conform · integrity ok ·
> 0 mồ côi · digest 100% · 0 project tách tên · 44/44 neo test sống.

## 🧹 Từ đợt P2/P3 + Graph Engineering — còn mở
## ⭐ Ưu tiên kế tiếp
> Toàn bộ diễn biến UI refactor (VÒNG 1–11, plan 15, 5 quyết định) đã XONG và dời sang `archive/05_TODO.md` + `06_CHANGES`. Dưới đây chỉ còn thứ chưa chốt.

**CÒN TREO từ đợt UI refactor:**
## 🧩 Graph — phase sau
## 🧠 Kho skill vendored — còn mở
## Phase 3 — UI / mở rộng
## 🌐 Web-chat capture (spec: docs/plan/07_web_chat_capture.md)
> Thu hội thoại web vào memory. ChatGPT ✓ · claude.ai ✓. Prototype cũ ở `attic/web-capture/`.
> **Quyết định đã chốt (plan 07 §14):** origin = 1 cột · v2b browser-connector (v1 file fallback) · re-pull full replace idempotent · GPT trước · password KHÔNG nhập vào zemory · KHÔNG commit file data thật (PII).


## 🆕 Phát sinh 2026-08-07 tối (sau release 1.2.0) — dời từ 05_TODO 2026-08-25


  ✅ **ĐÃ CHẠY 2026-08-15** — gate đầy đủ **670/670 pass · 0 fail · 0 skipped**, tức 5 file đó
  đều chạy thật (không ca nào bị `skipIfBusy` bỏ qua).
  ~~**CHẠY 5 FILE TEST CÒN MÙ sau khi embed xong:** `embed` · `rerank` · `vectors` ·~~
  `memory-search` · `digest`. Ba lượt audit hôm nay CỐ Ý bỏ chúng để không tranh CPU với job
  embed (đo thật: bench chạy song song làm embed tụt về 0 chunk/30 s). Ghi ra đây để **không ai
  đọc "audit xanh" thành "đã soi hết"** — vùng này chưa được soi trong cả ba lượt.
  Chạy CÙNG DỊP hai lượt bench, không cần lượt audit riêng.

---

## Cắt khỏi `05_TODO.md` ngày 2026-08-31 (lúc release 2.12.0)

> Lúc cắt: `05_TODO` dài 130 dòng mà **0 mục `[ ]` còn mở** — toàn bộ là 12 khối ghi chú "đã ĐÓNG"
> cùng các khối trạng-thái-lúc-bàn-giao. Chúng đều đã có bản đầy đủ trong `06_CHANGES` (mỗi khối tự
> trỏ tới entry của nó), nên nằm lại sổ việc là drift chứ không phải cố ý. Nguyên văn giữ dưới đây.

*(Mục "KIỂM LẠI AUTO-SYNC" (giao 2026-08-30) đã ĐÓNG 2026-08-31 — xem `06_CHANGES [2026-08-31]`. Ba
nguồn khớp: mã (gate 932/932) · Global Memory (đã ghi nhận) · chạy thật (watermark = MAX(id), lượt
02:05→02:21 tự bắn `OK · delta 576 tin`, không ai bấm tay). Đo được XA HƠN yêu cầu gốc: gốc bệnh
không phải lỗi logic auto-sync mà là **Drive File Stream đơ tầng OS** khi kho còn một file 2 GB —
đã vá bằng bốn lớp (đèn sức khoẻ gộp mọi tầng · watchdog lượt kẹt · probe Drive tách tiến trình con
· kho chia KHÚC, HP điều 16 sửa đổi). Kèm đóng luôn "khe `chatgpt` main vỏ rỗng" (note 29/08 dưới
đây, "dọn khi tiện") — `deadMainLane` đã tắt vòng tự thử ngầm của nó.)*

## BÀN GIAO 2026-08-29 (đã xử phần lớn trong ngày 29–30)

**Trạng thái lúc chốt (ĐO):** zemory **2.10.0** đã push (`0e0f322`), cây sạch. Gate đầy đủ 890/890 · conform ✓ · phục hồi
backup ok (đo trước hai đợt UI cuối; hai đợt đó chạy cổng vùng đụng 49–62/… xanh, chưa chạy gate đầy đủ lại — **phiên sau:
tắt daemon → `npm run check`** như thường lệ). Kho v25 · 2.729 phiên · 317.969 tin. **DESKTOP-PFB157K còn bản cũ** — bên
đó: bấm chip cập nhật (xanh/cam ở chân rail) → *Cập nhật ngay*, hoặc `zemory selfupdate`. Khe `chatgpt` main là vỏ rỗng
(khe 2 mới sống) — vô hại, dọn khi tiện. Chi tiết mọi việc đã làm: `06_CHANGES [2026-08-29]` + `[2026-08-29b]`.

*(Ba mục bàn giao 28/08 đã ĐÓNG 2026-08-29 — xem `06_CHANGES [2026-08-29]`: "hai cửa sổ" gốc là probe đóng
tab lúc đăng nhập · tài khoản công ty `huy.nguyen@sasin.vn` đã nối ở khe main, zyrofrost ở khe 2.)*


## 🔵 BÀN GIAO 2026-08-27 (phiên tối) — ĐỌC MỤC NÀY TRƯỚC

**5 mục mở**: 2 việc user GIAO cho phiên sau (bàn kỹ rồi mới làm) + 3 tool MCP. Trạng thái dưới đây là ĐO.

*(Mục "Đặt tên chuẩn lại các bộ `docs_template/`" đã ĐÓNG 2026-08-31 — xem `06_CHANGES [2026-08-31b]`.
5 bộ đổi tên theo prefix số + độ phức tạp cho user: `01_cowork_basic` · `02_cowork_memory`
(trước `cowork`/`cowork_global_memory`) · `03_nonapp` · `04_adapt` · `05_app`. Gate đầy đủ xanh.)*
*(Mục "Cấu trúc lại TÊN + BỐ CỤC toàn bộ folder phòng ban" đã ĐÓNG — làm ở project khác (estate
`D:\huy.nguyen\WorkSpace`), KHÔNG phải trong một phiên của repo này. Đo 2026-08-31 qua 3 nguồn:
Global Memory (nhiều phiên `Dept_IT`/`Dept_OPS`/`Dept_HR`/`Dept_SALE` 24–29/08 đổi `PBI_*`→`Dept_*`
+ sửa link chéo) · registry zemory (`data/projects.json`: đủ 8 phòng ban `Dept_*`, `lastSeen`
29/08, **0** `PBI_*` còn sót) · không còn gì để chạy thật thêm. Mục này bị đọc nhầm thành "còn mở"
trong bản ghi 27/08→31/08 vì không ai soát lại theo 3 nguồn trước khi báo — đúng lỗi "TODO thối".)*

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

