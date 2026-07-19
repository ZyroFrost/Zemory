<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Plan 13: Graph — app phụ trợ vẽ đồ thị cho MỌI repo theo chuẩn zemory

> Trạng thái: **SPEC DRAFT (chốt hướng 2026-07-18, CHƯA code).** Ý tưởng user: một **app phụ trợ dùng chung** — tự nó là 1 app, kết nối với MỌI repo theo chuẩn zemory rồi vẽ graph (node + cạnh có kiểu) để xem cấu trúc + dò quan hệ/ảnh hưởng.
> Định vị: chuẩn zemory (slot §4 · harness · `.harness.json` · cross-ref `.md` · brain) là **CONTRACT**; graph app là **CONSUMER** của contract — cùng mô hình A.I Center consume zemory (plan/04 §1). Repo nào theo chuẩn → tự động graph được, app không cần biết gì riêng repo đó.

## 1. Mục tiêu / vấn đề
- Slot + index của zemory trả lời tốt **"sửa X ở đâu"** (routing 0-token) và **"từng bàn X chưa"** (recall), nhưng KHÔNG trả lời **"X liên quan / ảnh hưởng gì"** — traceability đa-hop, blast-radius.
- Graph lấp đúng lớp đó: node = slot/file/doc-section/plan/HP/changelog/skill (+ symbol AST sau), cạnh CÓ KIỂU (routing · references · supersede · touches · imports).
- Hai bề mặt tiêu thụ: **NGƯỜI** (viewer trực quan, kiểu Knowledge Graph Viewer) + **AGENT** (truy vấn đa-hop rẻ token thay grep+đọc nhiều file).

## 2. Bất biến (dẫn chiếu hiến pháp — KHÔNG phát sinh luật mới ở plan)
- **Dẫn xuất, KHÔNG nguồn thứ hai (HP điều 3):** graph rebuild được từ `.md` + code + brain; vứt/dựng lại bất cứ lúc nào. KHÔNG thành kho sự thật thứ hai.
- **0 LLM khi build (HP điều 6):** cạnh sinh bằng **parse tất định** (link markdown · bảng routing · supersede · `digest.paths_touched` · import-graph/AST). KHÔNG extract entity bằng LLM (khác GraphRAG/KAG). Semantic-neighbor (nếu có) = cosine trên **vector đã có sẵn**, vẫn không sinh văn bản.
- **Fail-open (HP điều 9):** graph lỗi/thiếu → recall vẫn chạy bằng slot + FTS/vector. Graph chỉ THÊM.
- **Tách bộ máy khỏi dữ liệu (HP điều 5):** builder cài toàn máy, đọc docs/brain của project; app viewer là consumer.
- **Progressive disclosure (HP điều 8):** truy vấn agent trả node-ID + nhãn 1 dòng trước; mở chi tiết khi cần.
- **Engine nội bộ, KHÔNG slot capability mới (HP điều 4):** graph nằm trong domain brain (giống vector là engine nội bộ của `search`), KHÔNG đăng ký capability thứ 5.

## 3. Kiến trúc — SEAM: zemory BUILD/EXPORT · App CONSUME
```text
┌── zemory (BỘ MÁY, cài toàn máy — HP điều 5) ─────────────────────┐
│ đã parse sẵn chuẩn: slot §4 · cross-ref .md · digest.paths_touched │
│ · doc/section index · registry project đã biết                     │
│   → DỰNG graph dẫn xuất: graph_node / graph_edge (rebuild được)     │
│   → XUẤT: `zemory graph export --json [--project X | --all]`  ◄── CONTRACT
│   → MCP: graph_neighbors / graph_impact (truy vấn cho agent)        │
└───────────────────────┬────────────────────────────────────────────┘
                        │  graph.json (schema versioned)  /  brain DB
                        ▼
┌── Graph App (APP PHỤ TRỢ — REPO RIÊNG, harness riêng) ──────────────┐
│ • discover repo theo chuẩn (đọc .harness.json / registry zemory)    │
│   → 1 app thấy MỌI repo chuẩn                                        │
│ • render viewer tương tác (cytoscape/d3/sigma — chốt sau)           │
│ • xuyên project được (brain zemory vốn cross-project)               │
│ = CONSUMER thuần: KHÔNG parse lại chuẩn (tránh trùng parser, HP điều 1)│
└─────────────────────────────────────────────────────────────────────┘
```
- **App là PROJECT RIÊNG** (repo + harness riêng, tự nó cũng "ăn" chuẩn zemory). Theo `02_RULES §Phạm vi project`, KHÔNG scaffold app ở repo zemory này; chỉ thiết kế.
- Lý do tách: app "kết nối mọi repo theo chuẩn" đúng nghĩa vì zemory ĐÃ biết đọc mọi repo chuẩn; app chỉ đọc `graph.json`/brain. zemory không phình thành app graph — chỉ thêm 1 capability dẫn xuất + 1 lệnh export.

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
- **`zemory graph build`** — parse chuẩn + brain → dựng bảng graph dẫn xuất (incremental, guard hash như digest).
- **`zemory graph export --json [--project X | --all]`** — xuất `graph.json` (schema **versioned**): `{ version, nodes:[{id,type,label,ref}], edges:[{src,dst,type,kind:declared|inferred}] }`. Đây là contract cho app + mọi consumer.
- **MCP** `graph_neighbors(node, edge_types?, depth?)` / `graph_impact(file)` — trả node-ID + nhãn 1 dòng (progressive disclosure).
- **Viewer** — thuộc **Graph App** (repo riêng); hoặc bản tối giản `docs_visual/graph.html` self-contained cho từng repo (0 token agent) nếu cần nhanh.

## 6. Discover mode (phụ, KHÔNG flagship)
- Repo CHƯA theo chuẩn zemory (legacy / của người khác) → chủ yếu chỉ có cạnh suy luận (semantic + AST). Coi là **chế độ phụ**; flagship vẫn là repo theo chuẩn (cạnh khai báo đầy đủ).

## 7. Phi-mục-tiêu
- KHÔNG extract entity/relation bằng LLM (trái điều 6; cũng là chỗ KAG/GraphRAG stale + đắt).
- KHÔNG để cạnh suy luận giả dạng cạnh khai báo.
- KHÔNG tạo nguồn sự thật thứ hai; graph luôn rebuild từ `.md`+code+brain.
- KHÔNG bắt app parse lại chuẩn (consumer đọc export/brain).
- KHÔNG trưng "tiết kiệm N% token" kiểu counterfactual (bài học plan/10; claim "80%" của KAG-ảnh đã bị chính cộng đồng bác).

## 8. Quyết định mở (CẦN CHỐT trước khi code)
1. ~~**Packaging/boundary:** Graph App = repo RIÊNG ngay, hay MVP trong zemory rồi tách?~~ **CHỐT 2026-07-18 (user):** graph = **TAB LỚN trong `zemory ui`** (daemon đa-project — plan 14 §4), sub-tab chọn project từ registry; export `graph.json` giữ làm seam để SAU NÀY tách app riêng nếu cần. Prototype 2026-07-18 (docs-graph + code-graph 55 module/154 import, lint bắt orphan thật `core/index.ts`, blast-radius click-node) xác nhận hướng: **code-graph là chính, docs-graph là phụ**; lint tô đỏ + thống kê là giá trị kiểm soát cốt lõi, không phải bức vẽ.
2. **Độ mịn node v1:** dừng ở slot/file/doc-section/plan/HP/changelog + `touches`, hay kéo tới `symbol` (AST) ngay? *(đề xuất: v1 KHÔNG AST; AST = phase 2.)*
3. **Overlay suy luận v1 hay phase 2:** bật `semantic_neighbor` (vector sẵn) ngay v1 hay để sau? *(đề xuất: v1 chỉ cạnh KHAI BÁO; overlay phase 2.)*
4. **Cross-project:** app graph 1 repo (mặc định) có thêm mode `--all` xuyên nhiều repo (brain cross-project) không?
5. **Viewer tech** (khi làm app riêng): cytoscape.js / d3 / sigma.js — cần 1 lượt research license + self-contained-được cho `docs_visual`.
6. **Constitution:** có thêm 1 điều/khoản "graph = lớp dẫn xuất; app ngoài chỉ consume export; 2 hạng cạnh declared/inferred" vào `01_CONSTITUTION` không? *(user chốt — đã ĐỀ XUẤT ở `05_TODO`.)*
7. **Export schema versioning:** `graph.json` gắn `version` + chính sách đổi schema (như migration DB).
