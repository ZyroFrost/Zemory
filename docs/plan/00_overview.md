<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — Tổng quan (Overview) + Build Plan

> File `00` = OVERVIEW của app (mục đích · tính năng · ý tưởng), kèm kế hoạch xây dựng bên dưới. Tiếng Việt (quy ước docs); code/UI tiếng Anh.

## Tổng quan
**zemory = lớp quản trị BỘ NHỚ + HARNESS cho coding agent — một lõi dùng chung cho mọi project trên máy.** Dùng được ở HAI mức, độc lập nhau:
1. **Harness (chuẩn docs) — mặc định, không cần DB.** Bộ `docs/agent/*` (constitution · rules · structure · TODO · changelog) + `plan/` đánh số + `AGENTS.md`. Project nào cũng adopt để agent bám một chuẩn thống nhất thay vì mỗi repo một kiểu.
2. **Memory DB (tuỳ chọn — cài thêm khi cần nhớ xuyên phiên).** Cài `global_memory.db` local: hook scan transcript phiên (Claude Code · Codex · Continue · LM Studio) + web chat vào DB, dedup + redact, recall hybrid (FTS + vector), đồng bộ xuyên máy qua bundle mã hoá. Cho phép agent NHỚ việc phiên trước — xuyên project và xuyên máy.

User chọn dùng chỉ harness, hoặc harness + DB; hai mức không ràng buộc nhau. Bất biến kiến trúc đầy đủ: `docs/agent/01_CONSTITUTION.md`.

---

## 0. Tóm tắt 1 đoạn
Zemory là lớp **memory + governance (harness)** local dùng chung cho coding agent. Mỗi project có docs curated là file `.md` (nguồn — FILE WINS), có index dẫn xuất trong Global Memory cho `plan search`; transcript từ Claude, Codex và host khác được ingest thành episodic index có thể dựng lại. Runtime ép đúng một provider cho mỗi capability `memory`, `search`, `harness`, `health`. Mục tiêu là **recall xuyên phiên** (progressive disclosure) + một **khung docs/quy-tắc nhất quán**, không proxy model API.

Định vị dài hạn: Zemory là móng memory/context của A.I Center. (Compression — từng là lane thứ 3 — đã **BỎ 2026-06-25** vì không cho net token saving hợp lý trên Claude subscription; thiết kế giữ ở plan 03 dạng DROPPED, code ở `attic/`.)
## 1. Mục tiêu & phi-mục-tiêu

**Mục tiêu**
- Một hệ **dùng vĩnh viễn cho mọi project**, cấu trúc ổn định, **mở rộng được** (cắm ý tưởng mới không phải sửa đổi lõi).
- **Tự chứa, tự sở hữu**: không phụ thuộc/đụng repo người khác; `backend/src/` 100% của mình.
- **Tiết kiệm token** thật (search trúng + nén đọc + recall xuyên session).
- **Sạch sở hữu**: lúc nào cũng biết "của mình (src) vs dependency public (deps)".

**Phi-mục-tiêu**
- KHÔNG fork/clone agentmemory hay lean-ctx.
- KHÔNG nhồi 2 codebase khác nền tảng vào 1 process.
- KHÔNG reimplement engine nặng từ số 0 một cách vô nghĩa (xem "trần" §4).

---

## 2. Nguyên tắc cốt lõi (đã chốt qua thảo luận)
1. **Tiết kiệm token thật, đo trung thực.** Giá trị = recall trúng (đỡ re-explain) + harness gọn + (sau) RAG semantic; không claim % ảo. (Lane "compress-on-read" đã bỏ — xem changelog.)
2. **Ranh giới `backend/src/` và dependency.** Code điều phối/policy của Zemory nằm trong `backend/src/`; engine/model public (vd embed model, sqlite-vec) gọi qua dependency hoặc binary optional, không dán source vào lõi.
3. **Mỗi lớp dữ liệu có đúng một nguồn.** Curated docs/changelog: **file `.md` là nguồn (FILE WINS, HP điều 3)**, DB doc/section/changelog là index dẫn xuất; transcript gốc của host là nguồn episodic và bảng messages là index dẫn xuất.
4. **Một capability, một slot, một provider.** Config chọn provider; runtime từ chối provider thiếu hoặc conflict.
5. **Không proxy model API.** Zemory chỉ ở tầng tool/CLI/MCP + lưu local; không `ANTHROPIC_BASE_URL`, không rewrite history/cache.
6. **Progressive disclosure.** Search trả snippet/ID trước; chỉ mở message hoặc section cụ thể khi cần.
7. **App cơ học, agent phán đoán.** Zemory không gọi LLM (embed model nhỏ chỉ *đo nghĩa*, không *sinh văn bản*); app validate, index, backup và báo cờ, còn quyết định curated do user/agent duyệt.
8. **Harness gọn trong `docs/`.** Root project chỉ cần `AGENTS.md`; config nằm tại `docs/.harness.json`.
9. **Code, CLI, UI bằng tiếng Anh; docs project bằng tiếng Việt.**
## 3. Kiến trúc
```text
Claude / Codex / host khác
        │  hook capture + command/MCP on-demand
        ▼
┌──────────── ZEMORY RUNTIME ────────────┐
│ config → registry → router → checks     │
│ memory │ search │ harness │ health      │
└───────┬─────────┬─────────┬─────────────┘
        │         │         │
        ▼         ▼         ▼
  Global Memory  FTS/RRF   docs policy
  SQLite/WAL    semantic  + doctor
        │
        ├─ curated docs/changelog: file .md = nguồn → DB index dẫn xuất
        └─ sessions: host transcript source → derived searchable rows
```

External engine (embedding model cho semantic) chỉ được gọi qua adapter — không sở hữu policy, DB, host permission hay capability slot của Zemory. (Compression đã bỏ; xem plan 03 DROPPED.)
### Core (`backend/src/core/`)
- **registry** ánh xạ capability sang đúng một provider đã chọn.
- **runtime** resolve provider từ `docs/.harness.json`, áp default và fail rõ khi tên provider không tồn tại.
- **router** là cửa gọi on-demand; CLI/MCP không gọi engine trực tiếp khi project đã connected.
- **hooks** phát lifecycle cho provider nhưng không bypass permission của host.
- **config** validate path nằm trong `docs/` và không chấp nhận JSON/config lỗi.

### Modules (`backend/src/modules/`) — mỗi module = manifest + logic + (check)
- `memory:global` — ingest đa-agent, global recall, backup/migration và retention.
- `search:keyword` — FTS5 word/trigram, scope trước candidate limit; semantic có thể là engine nội bộ sau benchmark.
- `harness:docs` — validate + archive (file-based) + reconcile; index docs/changelog cho search (khung docs/quy-tắc của project).
- `health:core` — kiểm tra config, provider, DB, hook, adapter và feature thực.

Provider built-in sống trong `backend/src/modules/`. (Capability `governance` đã đổi tên → `harness`; provider memory `harness` → `global`; `compress` đã bỏ.)
### Model/lib ngoài — dependency public, gọi qua adapter, không vendor source (⚠️ cập nhật 2026-07-10: `deps/` là khái niệm cũ, KHÔNG dùng)
- `model/` ban đầu dự tính `all-MiniLM-L6-v2`; thực tế build ra dùng **EmbeddingGemma-300M** (HuggingFace, public) qua Transformers.js — **tải/cache lúc runtime, KHÔNG commit vào repo**, KHÔNG có folder `deps/` vật lý.
- `lib/` — onnxruntime, sqlite-vec, better-sqlite3... là package npm thường (`package.json` deps), không cần folder riêng.
- Repo ngoài clone về (không phải package) → `external/` (đúng chuẩn `03_STRUCTURE.md`).

---

## 4. "Trần": cái nào TỰ VIẾT, cái nào CẮM (per-capability)
| Capability | Zemory sở hữu | Có thể cắm ngoài |
|---|---|---|
| harness/health | policy, validation, migration, UI status | không cần engine ngoài |
| memory/search keyword | schema, adapter, scope, FTS/RRF | tokenizer/embedding optional |
| semantic search | candidate policy, rerank contract, benchmark | embedding model local có license rõ |
| code map (tương lai) | cache contract, profile, fallback | parser/AST library theo ngôn ngữ |

Nguyên tắc: extend engine tốt nếu license và boundary phù hợp; chỉ tự build phần policy/integration mà engine ngoài không sở hữu. (Compression đã bỏ khỏi bảng — xem plan 03 DROPPED.)
## 5. Mô hình MEMORY (chỗ tinh tế nhất)
Zemory phân biệt ba lớp theo độ tin cậy, không sao chép cùng một nội dung sang nhiều store:

| Lớp | Nguồn | Vai trò |
|---|---|---|
| Curated | **file `.md` là nguồn** (FILE WINS); `doc/section`+`changelog` trong memory = index dẫn xuất, scope theo project | rules, TODO, specs, quyết định bền |
| Episodic | transcript gốc của host; `sessions/messages` là index dẫn xuất | hội thoại và tool output để recall xuyên phiên |
| Working | context hiện tại của host | dữ liệu tạm; Zemory không tự biến thành canonical |

Promotion từ episodic sang curated chỉ xảy ra qua lệnh rõ và review. Khi dữ liệu mâu thuẫn, rules/specs curated thắng transcript cũ. Global instruction chỉ yêu cầu search on-demand, không inject toàn bộ memory vào mỗi prompt.

## 6. Phân phối, cấu trúc & cách chạy (đã chốt + đã build)
Zemory phân phối dưới dạng package npm CLI, một bản global dùng cho mọi project. Project chỉ chứa `AGENTS.md`, `docs/.harness.json`, `docs/agent/*` và `docs/plan/*`.

`zemory init` scaffold harness không ghi đè; `sync` gap-fill (bổ khuyết file harness còn thiếu, giữ nguyên file có sẵn — file wins); `fresh` backup cả agent docs và plan; `doctor` kiểm tra setup, provider và capability. Global Memory mặc định ở `~/.zemory/global_memory.db`, có thể chuyển bằng `GLOBAL_MEMORY_DB`.

Claude và Codex dùng Stop hook để capture. Recall dùng instruction hoặc MCP on-demand. UI và extension tương lai chỉ đọc status API chung.

## 7. Bản quyền (đã rà — Apache-2.0)
Zemory phát hành theo Apache-2.0 và package phải chứa `LICENSE`. Dependency, model hoặc binary ngoài chỉ được thêm sau khi xác minh license, attribution và điều kiện phân phối của đúng artifact được chọn.

Code third-party không được dán vào `backend/src/`. Nếu bắt buộc vendor một phần, nó phải nằm ở vùng tách biệt, giữ notice/license và có hồ sơ provenance. Engine/model ngoài cho RAG (EmbeddingGemma — **kiểm license Gemma trước khi phân phối**; Transformers.js; sqlite-vec) gọi qua dependency/adapter; weight model **tải/cache lúc runtime, KHÔNG commit vào repo**. (LeanCTX/compression: đã bỏ, code ở `attic/`.)
## 8. Phân kỳ (trạng thái)
- **Nền tảng v0.1 (đã có):** file-source docs/changelog (FILE WINS; DB là index dẫn xuất), global ingest/recall, FTS5, provider runtime, Claude/Codex capture, tests/CI và package hygiene.
- **Năng lực đã hoàn tất sau v0.1:** MCP progressive disclosure cho recall (`memory_search`/`memory_show`/`plan_search`), RAG semantic core + full vector backfill, memory retention/privacy core (encrypted export/import, raw backup/restore, forget dry-run/force, re-redact).
- **Năng lực kế:** source-transcript privacy/tombstone nếu cần quên tuyệt đối; sau đó semantic rerank, code map và adapter host mới — chỉ bật sau benchmark/fixture.
- **Bề mặt:** dashboard metrics và VS Code status bar dùng chung status API.

Compression (deterministic + quota-safe) đã **BỎ khỏi scope 2026-06-25** (changelog) — không còn thuộc phân kỳ. Backlog thực thi nằm duy nhất trong `docs/agent/05_TODO.md`; plan này chỉ mô tả trạng thái và thứ tự kiến trúc.
## 9. Quyết định (đã chốt — trước là "mở")
- TypeScript/Node là runtime của lõi; SQLite/WAL là Global Memory local.
- **File `.md` là nguồn curated (FILE WINS, chốt 2026-07-16 — supersede "DB là nguồn"); DB doc/section/changelog là index dẫn xuất, rebuild từ file bằng `zemory reindex` (đọc `.md`, KHÔNG ghi ngược).
- Capture tự động, recall on-demand; không auto-inject broad memory.
- Claude và Codex cùng dùng Stop capture; host khác cần adapter/lifecycle riêng.
- Global memory ở `~/.zemory/global_memory.db` (đã dời khỏi `headroom-custom` 2026-06-25).
- 4 capability: **memory · search · harness · health** (`governance` đổi tên → `harness`; **compression đã BỎ khỏi scope**, code ở `attic/`).
- Không proxy model API (không `ANTHROPIC_BASE_URL`/rewrite history).
- RAG semantic (plan 05): vector là **engine nội bộ slot `search`**, không slot riêng; model **EmbeddingGemma** chạy local qua **Transformers.js**, lưu **sqlite-vec**; chỉ bật sau benchmark thắng FTS.
- Fresh backup cả agent docs lẫn plan.
## 10. Bước kế tiếp
Trình tự đã hoàn tất qua 2026-06-30: **RAG semantic** (plan 05 — embed EmbeddingGemma + sqlite-vec + hybrid trên RRF), **MCP recall** (`memory_search`/`memory_show`/`plan_search`/`plan_show`) và **retention/privacy core** (`memory backup/restore/forget/redact`, export/import encrypted đã có). Compression đã BỎ khỏi scope (2026-06-25). Bước kế tiếp hợp lý: xác minh Stop hook runtime thật, source-transcript tombstone nếu cần quên tuyệt đối, rồi code map / adapter host mới. Mọi lớp mới phải có migration, regression test, health check và fallback trước khi bật mặc định.

