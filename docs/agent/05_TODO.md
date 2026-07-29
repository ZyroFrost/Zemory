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
  - **Hệ quả: `curl` và miền `raw.githubusercontent.com` VẪN chưa biết chạy được trong sandbox Cowork hay không.**
    Máy sếp sẽ KHÔNG có bản local ⇒ chắc chắn rơi vào đường mạng. Phải test lại trên một máy **không có**
    repo zemory (hoặc tạm đổi tên thư mục đó) mới ra số thật.
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
- [ ] **`claude-web` project = uuid thô** (`019f68e1-…`) vì API không trả tên folder. ChatGPT giải bằng `_projects.json`; làm tương tự cho claude.ai khi cần.

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
