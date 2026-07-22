<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Plan 13: Graph — app phụ trợ vẽ đồ thị cho MỌI repo theo chuẩn zemory

> Trạng thái: **BUILT 2026-07-20/21** — Phase A→C + docs-graph (references+supersede) + semantic overlay (`--semantic`, inferred) + `graph export` **v2** + cache + cross-project `--all`; điều 13 hiến pháp đã chốt. Còn hoãn: Phase D (tsserver/pyright), MCP mirror. Chi tiết build/verify: `06_CHANGES` + `05_TODO §🧩 Graph`. §5/§8/§9 dưới đây là SPEC gốc — vài chỗ đã lệch code (§5 `graph build`/bảng DB không tồn tại → cache in-memory; contract v1→v2). *(Sử: SPEC DRAFT chốt hướng 2026-07-18.)* Ý tưởng user: một **app phụ trợ dùng chung** — tự nó là 1 app, kết nối với MỌI repo theo chuẩn zemory rồi vẽ graph (node + cạnh có kiểu) để xem cấu trúc + dò quan hệ/ảnh hưởng.
> Định vị: chuẩn zemory (slot §4 · harness · `.harness.json` · cross-ref `.md` · memory) là **CONTRACT**; graph app là **CONSUMER** của contract — cùng mô hình A.I Center consume zemory (plan/04 §1). Repo nào theo chuẩn → tự động graph được, app không cần biết gì riêng repo đó.

## 1. Mục tiêu / vấn đề
- Slot + index của zemory trả lời tốt **"sửa X ở đâu"** (routing 0-token) và **"từng bàn X chưa"** (recall), nhưng KHÔNG trả lời **"X liên quan / ảnh hưởng gì"** — traceability đa-hop, blast-radius.
- Graph lấp đúng lớp đó: node = slot/file/doc-section/plan/HP/changelog/skill (+ symbol AST sau), cạnh CÓ KIỂU (routing · references · supersede · touches · imports).
- Hai bề mặt tiêu thụ: **NGƯỜI** (viewer trực quan, kiểu Knowledge Graph Viewer) + **AGENT** (truy vấn đa-hop rẻ token thay grep+đọc nhiều file).

## 2. Bất biến (dẫn chiếu hiến pháp — KHÔNG phát sinh luật mới ở plan)
- **Dẫn xuất, KHÔNG nguồn thứ hai (HP điều 3):** graph rebuild được từ `.md` + code + memory; vứt/dựng lại bất cứ lúc nào. KHÔNG thành kho sự thật thứ hai.
- **0 LLM khi build (HP điều 6):** cạnh sinh bằng **parse tất định** (link markdown · bảng routing · supersede · `digest.paths_touched` · import-graph/AST). KHÔNG extract entity bằng LLM (khác GraphRAG/KAG). Semantic-neighbor (nếu có) = cosine trên **vector đã có sẵn**, vẫn không sinh văn bản.
- **Fail-open (HP điều 9):** graph lỗi/thiếu → recall vẫn chạy bằng slot + FTS/vector. Graph chỉ THÊM.
- **Tách bộ máy khỏi dữ liệu (HP điều 5):** builder cài toàn máy, đọc docs/memory của project; app viewer là consumer.
- **Progressive disclosure (HP điều 8):** truy vấn agent trả node-ID + nhãn 1 dòng trước; mở chi tiết khi cần.
- **Engine nội bộ, KHÔNG slot capability mới (HP điều 4):** graph nằm trong domain memory (giống vector là engine nội bộ của `search`), KHÔNG đăng ký capability thứ 5.

## 3. Kiến trúc — SEAM: zemory BUILD/EXPORT · App CONSUME
```text
┌── zemory (BỘ MÁY, cài toàn máy — HP điều 5) ─────────────────────┐
│ đã parse sẵn chuẩn: slot §4 · cross-ref .md · digest.paths_touched │
│ · doc/section index · registry project đã biết                     │
│   → DỰNG graph dẫn xuất: graph_node / graph_edge (rebuild được)     │
│   → XUẤT: `zemory graph export --json [--project X | --all]`  ◄── CONTRACT
│   → MCP: graph_neighbors / graph_impact (truy vấn cho agent)        │
└───────────────────────┬────────────────────────────────────────────┘
                        │  graph.json (schema versioned)  /  memory DB
                        ▼
┌── Graph App (APP PHỤ TRỢ — REPO RIÊNG, harness riêng) ──────────────┐
│ • discover repo theo chuẩn (đọc .harness.json / registry zemory)    │
│   → 1 app thấy MỌI repo chuẩn                                        │
│ • render viewer tương tác (cytoscape/d3/sigma — chốt sau)           │
│ • xuyên project được (memory zemory vốn cross-project)               │
│ = CONSUMER thuần: KHÔNG parse lại chuẩn (tránh trùng parser, HP điều 1)│
└─────────────────────────────────────────────────────────────────────┘
```
- **App là PROJECT RIÊNG** (repo + harness riêng, tự nó cũng "ăn" chuẩn zemory). Theo `02_RULES §Phạm vi project`, KHÔNG scaffold app ở repo zemory này; chỉ thiết kế.
- Lý do tách: app "kết nối mọi repo theo chuẩn" đúng nghĩa vì zemory ĐÃ biết đọc mọi repo chuẩn; app chỉ đọc `graph.json`/memory. zemory không phình thành app graph — chỉ thêm 1 capability dẫn xuất + 1 lệnh export.

## 4. Mô hình dữ liệu — 2 HẠNG CẠNH (nền khai báo + overlay suy luận)
> Bắt chước triết lý FTS(chắc)+vector(thêm): cạnh KHAI BÁO là baseline luôn đúng; cạnh SUY LUẬN là overlay fail-open, **GẮN NHÃN riêng, KHÔNG giả dạng cạnh khai báo**.

**Node** (dẫn xuất, có key ổn định): `slot` (từ điển §4) · `file`/`dir` · `doc_section` · `plan_spec` · `hp_dieu` (điều khoản constitution) · `changelog_entry` · `skill` · *(phase 2)* `symbol`/`module` (tree-sitter AST) · `session`/`digest`.

**Cạnh KHAI BÁO — XƯƠNG SỐNG (tất định, 0 token, luôn đúng):**
- `routing` — concern → slot (bảng `03_STRUCTURE §4`).
- `references` — link markdown giữa docs (`→ 04_SKILLS §grill`, `plan → HP điều N`, `RULES → 03_STRUCTURE`).
- `supersede` — marker changelog (quyết định cũ ← mới).
- `touches` — `session/digest.paths_touched` → file/slot (nối episodic ↔ concern; zemory có SẴN, KAG-ảnh không có).
- *(phase 2)* `imports`/`calls` — import-graph/AST → blast-radius.

**Cạnh SUY LUẬN — OVERLAY [opt] (fail-open, nhãn `inferred`):**
- `semantic_neighbor` — cosine trên **vector đã có** (0 LLM), ngưỡng cắt để tránh hairball.
- Luật vàng: overlay tắt/lỗi → graph vẫn đủ dùng bằng cạnh khai báo.

**Lưu:** bảng dẫn xuất `graph_node` / `graph_edge` trong `global_memory.db` (như `vec_chunks`/`session_digest`), cột `declared|inferred`. Dựng bằng `zemory graph build`; rebuild an toàn.

## 5. Bề mặt & contract
- **`zemory graph build`** — parse chuẩn + memory → dựng bảng graph dẫn xuất (incremental, guard hash như digest).
- **`zemory graph export --json [--project X | --all]`** — xuất `graph.json` (schema **versioned**): `{ version, nodes:[{id,type,label,ref}], edges:[{src,dst,type,kind:declared|inferred}] }`. Đây là contract cho app + mọi consumer.
- **`zemory graph impact <file>`** — CLI advisory blast-radius: in fan-in + danh sách importer/caller của file, agent tự gọi TRƯỚC khi sửa file nóng. **TƯ VẤN, không chặn** — quyền sửa/permission thuộc host (HP điều 10); zemory chỉ đưa dữ kiện để agent tự thận trọng. *(Bề mặt CLI là CHÍNH — xem §9: hệ agent của user lái terminal, không wire MCP.)*
- **MCP** `graph_neighbors(node, edge_types?, depth?)` / `graph_impact(file)` — bản MIRROR của CLI cho host nào có nối MCP; trả node-ID + nhãn 1 dòng (progressive disclosure). Phụ, không phải đường giao hàng chính.
- **Viewer** — thuộc **Graph App** (repo riêng); hoặc bản tối giản `docs_visual/graph.html` self-contained cho từng repo (0 token agent) nếu cần nhanh.

## 6. Discover mode (phụ, KHÔNG flagship)
- Repo CHƯA theo chuẩn zemory (legacy / của người khác) → chủ yếu chỉ có cạnh suy luận (semantic + AST). Coi là **chế độ phụ**; flagship vẫn là repo theo chuẩn (cạnh khai báo đầy đủ).

## 7. Phi-mục-tiêu
- KHÔNG extract entity/relation bằng LLM (trái điều 6; cũng là chỗ KAG/GraphRAG stale + đắt).
- KHÔNG để cạnh suy luận giả dạng cạnh khai báo.
- KHÔNG tạo nguồn sự thật thứ hai; graph luôn rebuild từ `.md`+code+memory.
- KHÔNG bắt app parse lại chuẩn (consumer đọc export/memory).
- KHÔNG trưng "tiết kiệm N% token" kiểu counterfactual (bài học plan/10; claim "80%" của KAG-ảnh đã bị chính cộng đồng bác).

## 8. Quyết định mở (CẦN CHỐT trước khi code)
1. ~~**Packaging/boundary:** Graph App = repo RIÊNG ngay, hay MVP trong zemory rồi tách?~~ **CHỐT 2026-07-18 (user):** graph = **TAB LỚN trong `zemory ui`** (daemon đa-project — plan 14 §4), sub-tab chọn project từ registry; export `graph.json` giữ làm seam để SAU NÀY tách app riêng nếu cần. Prototype 2026-07-18 (docs-graph + code-graph 55 module/154 import, lint bắt orphan thật `core/index.ts`, blast-radius click-node) xác nhận hướng: **code-graph là chính, docs-graph là phụ**; lint tô đỏ + thống kê là giá trị kiểm soát cốt lõi, không phải bức vẽ.
2. **Độ mịn node v1:** dừng ở slot/file/doc-section/plan/HP/changelog + `touches`, hay kéo tới `symbol` (AST) ngay? *(đề xuất: v1 KHÔNG AST; AST = phase 2.)*
3. **Overlay suy luận v1 hay phase 2:** bật `semantic_neighbor` (vector sẵn) ngay v1 hay để sau? *(đề xuất: v1 chỉ cạnh KHAI BÁO; overlay phase 2.)*
4. **Cross-project:** app graph 1 repo (mặc định) có thêm mode `--all` xuyên nhiều repo (memory cross-project) không?
5. **Viewer tech** (khi làm app riêng): cytoscape.js / d3 / sigma.js — cần 1 lượt research license + self-contained-được cho `docs_visual`.
6. **Constitution:** có thêm 1 điều/khoản "graph = lớp dẫn xuất; app ngoài chỉ consume export; 2 hạng cạnh declared/inferred" vào `01_CONSTITUTION` không? *(user chốt — đã ĐỀ XUẤT ở `05_TODO`.)*
7. **Export schema versioning:** `graph.json` gắn `version` + chính sách đổi schema (như migration DB).
8. ~~**Hướng đi so với CALM (§9): tự build sâu · consume CALM · hay hybrid?**~~ **CHỐT 2026-07-20 (user): "chỉ lấy cái nó tốt hơn"** — KHÔNG consume hệ MCP; hấp thụ đúng 2 thứ ĐO THẬT thắng (§9): ① fitness metrics (làm ngay trên file-graph sẵn có) · ② symbol-attributed callers/callees qua tree-sitter (phase sau, kèm nhãn confidence). Bỏ: edit-gate (host lo), MCP-first (hệ CLI), file-level dependencies của nó (bug; của mình đúng + rẻ hơn), semantic code search (0 kết quả). Lộ trình A→D ở cuối §9. *(Đồng thời định hướng #2: symbol-level = CÓ nhưng qua tree-sitter ở phase B/C, KHÔNG regex; v1 file-level giữ nguyên làm baseline.)*

## 9. Khảo sát đối chiếu — CALM (2026-07-20, user đưa)
> [github.com/Eilodon/CALM](https://github.com/Eilodon/CALM) — MCP server (Rust + tree-sitter + SQLite/FTS5+RRF) dựng call-graph symbol-level 24 ngôn ngữ cho 1 repo, kèm edit-safety-gate (refuse sửa hub symbol) + `fitness_report`. Trùng triết lý zemory ở: index dẫn xuất 0-LLM · FTS+semantic+RRF · "mọi số đều đo được".

**TRẠNG THÁI: PHÂN TÍCH — CHƯA CHỐT (quyết định thuộc user, ghi ở §8#8).** Dữ kiện thực địa: hệ agent của user (Claude Code + coding agent ngoài) hiện **lái terminal, KHÔNG wire MCP** (kiểm chứng 2026-07-20: `zemory mcp` có trong code từ 06-29 nhưng 0 nơi nối — không `.mcp.json`, không entry `~/.claude.json`). Lưu ý: đây là **lựa chọn cấu hình, không phải giới hạn kỹ thuật** — Claude Code nối MCP chỉ cần 1 file `.mcp.json`. Lợi thế cấu trúc của zemory vẫn đứng: **bề mặt CLI/shell mọi agent đều có sẵn, 0 config per-host** — năng lực graph nên CLI-first, MCP chỉ mirror.

**4 ý bốc từ CALM (nâng spec, không đổi kiến trúc):**
1. **Confidence ladder trên cạnh** — CALM gắn nhãn 4 mức (textual→inferred→resolved→formal). Xác nhận hướng 2-hạng declared/inferred của §4 đúng; nếu sau này thêm nguồn cạnh (AST, LSP), nâng `kind` thành ladder mịn hơn thay vì thêm hạng mới.
2. **Blast-radius = CỔNG TƯ VẤN qua CLI** — `zemory graph impact <file>` (§5): agent gọi trước khi sửa file fan-in cao. KHÁC CALM: không refuse/chặn (quyền sửa thuộc host, HP điều 10), chỉ đưa dữ kiện.
3. **Fitness metrics** — biến graph thành thước đo sức khoẻ chạy lại được (hub concentration · orphan/dead code · boundary violation giữa slot) gắn vào `validate`/checks; khớp kết luận §8#1 "lint là giá trị cốt lõi, không phải bức vẽ".
4. **Symbol-level = tree-sitter nếu làm** — khi file-level tỏ ra không đủ (quyết định mở §8#2), đường đúng là tree-sitter, không phải đào sâu regex.

**Phần CALM không có mà zemory có (giữ làm trọng tâm):** cạnh nối graph ↔ MEMORY (`touches` từ digest, `semantic_neighbor` từ vector) — dữ liệu episodic xuyên phiên/máy mà một tool chỉ đọc code không bao giờ dựng được.

**ĐO THẬT (2026-07-20 — cài `@eilodon/calm-mcp` 0.3.4 win32 vào scratchpad, index corpus backend zemory 87 file/612 symbol/26s, bơm JSON-RPC thẳng vào MCP stdio; đã xoá sạch sau test):**
- ✅ **`callers openMemory`** (symbol-level): 38 call-site **quy kết đúng hàm bao** (`file::function` + line + preview), nhãn `resolved`, ~1.042 tok. Native Grep cùng câu: 91 dòng thô ~1.490 tok, KHÔNG quy kết hàm (muốn biết phải Read thêm). → symbol-callers là giá trị thật grep không làm được.
- ❌ **`dependencies` (file-level) BUG trên chính code zemory**: parse nhầm SQL trong template literal (`db.ts` SCHEMA) thành import → ~2.627 tok rác. Grep (176 tok) + zemory file-graph (fan-in 20, ~138 tok) đều đúng và rẻ hơn. → tree-sitter không miễn nhiễm; graph nào cũng phải test trên code thật.
- ❌ **`search` semantic**: 0 kết quả với câu hỏi tự nhiên (mode mặc định).
- ✅ **`fitness_report`**: ~470 tok, CI-gate được — chấm zemory: dead code 14% (fail ngưỡng 10%), hub 7.9%, edge coverage 77.6%.
- Kết luận đo: MCP của CALM **KHÔNG ngon hơn toàn tập** so với tool native — hơn RÕ đúng 1 lớp (symbol-attributed callers/callees + fitness), thua/bug ở file-level và semantic. Con số 29–241× trong README của nó là so với *naive đọc cả file*, không phải so với Grep.

**LỘ TRÌNH HẤP THỤ — CHỐT 2026-07-20, THỰC THI XONG A/B/C 2026-07-21** (xem `06_CHANGES`). Trạng thái: **A ✅ · B ✅ · C ✅ · D ⏸ (cố ý hoãn theo decision rule)**. Ngoài lộ trình, đã làm thêm **`touches` (graph↔memory)** + **`graph export --json` v1**.
- **Phase A ✅ (0 dependency mới):** `zemory graph impact <file>` (CLI: fan-in + importer list, tư vấn không chặn) + **fitness metrics** trên file-graph sẵn có (hub concentration · orphan/dead % · slot-boundary violation), gắn vào `validate`/checks với ngưỡng như `memory bench` gate. UI: hiện điểm fitness ở sub-tab Graph.
- **Phase B ✅:** thay regex symbol trong `graph.ts` bằng **tree-sitter WASM** (`web-tree-sitter`, MIT — rà license theo HP điều 2) cho TS/JS/Py → node `symbol` chính xác (hàm/class/method + dòng), cạnh `defines`.
- **Phase C ✅:** cạnh `calls` bằng name-match trong project, **nhãn confidence bắt buộc** (`inferred`; nâng `resolved` chỉ khi có bằng chứng mạnh hơn) → blast-radius cấp hàm. Đây là lớp CALM thắng đo được; bài học từ bug của nó: **test trên code thật nhiều template-literal/SQL trước khi tin parser**.
- **Phase D ⏸ (chỉ khi đo thấy cần):** tier `resolved` qua tsserver/pyright. Gate vào phase D = decision rule: đếm câu "sửa X đụng ai" mà file-level + name-match trả lời trượt trong 2–4 tuần dùng thật.
- **KHÔNG làm:** consume MCP CALM · edit-gate/refuse · đa ngôn ngữ ngoài TS/JS/Py (thêm khi có repo thật) · semantic code search riêng (memory search lo phần memory).
