<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory plan set` -->
# zemory — TODO / Backlog

> `[ ]` chưa làm · `[~]` đang làm · xong → chuyển sang `03_CHANGES.md` (`zemory changelog add`) và xoá khỏi đây.
## ✅ Đã xong (chi tiết 03_CHANGES.md)
- Chốt: ngôn ngữ **TypeScript** · `planning→plan` · config vào `docs/.harness.json` · root chỉ `AGENTS.md` thin · bỏ CLAUDE.md.
- `core` (registry/router/hooks/conflict) · `cli` (init/sync/migrate/doctor/ui/archive/grill/structure/setup).
- Adopt an toàn: sync (in-place) · fresh (backup aside) · migrate (analyze + playbook) · merge legacy planning→plan · auto plan-index.
- `archive` (cắt CHANGES) ✓ · `grill` (playbook) ✓.
- UI: app-mode window + project picker + test-runner (bar từng dòng) + Setup popup (Sync/Fresh) + cờ plan/setup.
- structure-in-INDEX · setup runbook (`zemory setup`) · entry `AGENTS.md` thin.

## ✅ Global brain nền tảng
- [x] SQLite global đa-agent + FTS5 word/trigram + search theo project/`--all`.
- [x] Adapter Claude Code, Codex, Continue và LM Studio; parser state có migration versioned.
- [x] Stop capture cho Claude và Codex; recall on-demand qua global instruction.
- [x] Backup global DB trước migration và recovery scan parser v2.

## ✅ Thêm (XONG 2026-06-18)
- [x] ~~🗜️ `compress` (compress-on-read)~~ — đã BUILD rồi **BỎ khỏi scope (2026-06-25)**, code dời `attic/`. (Lý do: không cho net saving trên subscription — changelog.)
- [x] **`harness` `validate`** (trước tên capability `governance`) — link docs/, độ dài CHANGES, supersede.
## 🔵 Stabilization v0.1 — chờ nghiệm thu
- [x] Khóa DB-source: generated mirror không re-import, ID section ổn định, `changelog add` tự render.
- [x] Archive chuyển sang cờ SQLite; lịch sử vẫn search được, không tạo archive store thứ hai.
- [x] Scope mutation theo project và chặn path traversal ngoài `docs/`.
- [x] Provider runtime đọc thật `docs/.harness.json`; `doctor` đỏ khi provider sai.
- [x] Test integration, clean build, CI, license, README và package hygiene đã hoàn tất.
- [x] **Nghiệm thu cơ học 2026-06-29 PASS:** `npm run check` xanh; `zemory doctor` xanh; `docs sync`, `validate`, `docs ls`, `plan search`, `changelog ls`, `brain scan`, `brain search`, `brain bench`, `npm pack --dry-run` đều chạy được.

**Trạng thái sau 2026-06-30:** remote Git + commit/push `main` đã xong; không còn blocker cơ học trong v0.1. Mốc publish/package registry là quyết định riêng nếu cần.
## ⭐ Ưu tiên kế tiếp
> Compression đã **BỎ khỏi scope** (changelog 2026-06-25). zemory tập trung **global memory + harness**. Source nén ở `attic/`.

**✅ RAG semantic core — đã code/test tới gate A-D + E (rerank, opt-in) + full backfill (2026-06-30):**
- [x] A. Embed pipeline: EmbeddingGemma-300M qua Transformers.js (ONNX, Node, no Python) — embed ra vector unit-normalized, fail-open khi model lỗi.
- [x] B. Vector store: `sqlite-vec` trong `global_memory.db`; `zemory brain embed` incremental; vector index hiện chạy thật trên DB local.
- [x] C. Hybrid retrieve: vector stream đã fuse vào RRF cùng FTS; `brain search` mặc định chạy hybrid khi enabled và fallback FTS khi vector lỗi/thiếu.
- [x] D. Benchmark gate: `brain bench` PASS; test suite xác nhận hybrid recall@3 >= FTS trên paraphrase corpus.
- [x] Full corpus backfill: `zemory brain embed --all` đã chạy xong trên corpus lịch sử của `global_memory.db`; mốc nghiệm thu 2026-06-30 xác nhận `vec_chunks` khớp `messages` 1:1. Vì brain ingest transcript sống, message mới sau mốc này xử lý bằng `zemory brain embed` incremental.
- [x] E. Rerank cross-encoder (opt-in) — `src/brain/rerank.ts` rescore top-40 ứng viên RRF rồi reorder; fail-open giữ thứ tự RRF; default OFF, bật qua UI toggle / `ZEMORY_RERANK=1` / `--rerank`. `brain bench --rerank` đo lane riêng; spot check brain thật xác nhận reorder tốt hơn hybrid thuần. Chi tiết plan 05 §4.E.
- [ ] F. (TẦM NHÌN, sau core) Mở RAG sang **data chính** (ngoài memory agent): retriever **đa-store + `kind`**, chung model + retriever, DB tách được. Ý tưởng user — plan 05 §4.F.

**✅ MCP global recall — đã code/test 2026-06-29:**
- [x] `zemory mcp` stdio server local với `brain_search`, `brain_show`, `plan_search`, `plan_show`.
- [x] Global brain đọc được ở mọi cwd/project; nếu project chưa setup harness thì recall tự rơi về toàn bộ `global_memory.db` thay vì bắt buộc có `docs/.harness.json`.
- [x] MCP không auto-inject memory; agent gọi on-demand rồi dùng `*_show` để mở full text.

**✅ Memory retention/privacy core — đã code/test 2026-06-30:**
- [x] Encrypted share đã có: `zemory brain export/import` bằng bundle `.zemory.enc`.
- [x] Raw local safety net: `zemory brain backup/restore` bằng SQLite online backup, restore luôn rename DB cũ sang `.bak-*`.
- [x] Forget trong brain DB: `zemory brain forget` theo `--session`, `--project`, `--source/--agent`, `--before`, hoặc `--message`; dry-run mặc định, `--force` mới xóa, auto backup trước khi xóa.
- [x] Re-redact dữ liệu đã ingest: `zemory brain redact --force` re-apply secret redaction cho messages/artifact index; FTS message update trigger giữ search index đồng bộ.

**Khác (chưa làm):**
- [ ] (Nếu cần quên tuyệt đối) Source-transcript privacy/tombstone: xóa/redact transcript gốc của agent host hoặc ghi tombstone chống whole-file adapter re-ingest lại dữ liệu đã quên.
- [ ] (Sau) code map AST + adapter host mới (Gemini/Cursor/…) khi có fixture thật.
## Quyết định mở / cần chốt
- [x] ~~Semantic là provider riêng hay engine nội bộ?~~ CHỐT 2026-06-25: **engine nội bộ** của search hợp nhất — 1 slot `search`, thêm luồng vector vào RRF (xem plan 05).
- [x] ~~Phân phối LeanCTX: dependency hay binary?~~ MOOT — compression đã bỏ, code ở `attic/`.
- [x] ~~Artifact lưu bao lâu / tối đa GB?~~ CHỐT 2026-06-25: vĩnh viễn, KHÔNG tự xóa; đầy → cảnh báo, cũ → archive gzip (chi tiết changelog).
- [x] ~~sqlite-vec hay brute-force cosine?~~ CHỐT 2026-06-29 theo code/test: dùng `sqlite-vec` trong `global_memory.db`, fail-open về FTS.
- [x] ~~Chiều vector mặc định?~~ CHỐT 2026-06-29 theo code/test: dùng 768d đầy đủ trước; Matryoshka 256/128 để tối ưu dung lượng/tốc độ là việc sau nếu cần.
- [x] ~~Lịch backfill toàn bộ corpus thật?~~ CHỐT 2026-06-30: chạy thủ công có kiểm soát bằng `zemory brain embed --all`; mốc nghiệm thu đã backfill đủ corpus lịch sử của `global_memory.db`. Message mới sau đó dùng incremental embed.
- [x] ~~Có cần rerank cross-encoder không?~~ CHỐT 2026-06-30: **làm rồi, opt-in** (Giai đoạn E — bge-reranker-base, default OFF, bật qua UI/`ZEMORY_RERANK`/`--rerank`).
- [x] ~~Đồng bộ memory xuyên máy thế nào?~~ CHỐT 2026-07-01: **bundle `.enc` qua Drive folder + `brain import --merge`** (additive), KHÔNG sync DB sống. `brain sync` + Drive link trong UI. Chi tiết changelog + plan 02 §0.
- [ ] RAG còn cần chốt khi mở rộng sang **data chính**: chunk doc dài cho docs/knowledge/code; data chính dùng chung `global_memory.db` (cột `kind`) hay store tách rồi fuse.
## Việc cần xác minh thực tế
- [ ] Mở phiên Claude và Codex mới để xác nhận Stop hook capture end-to-end trên runtime thật.
- [ ] Chạy benchmark Raw vs lite vs Lean map/signatures vs semantic trên cùng corpus code/log/test.
- [ ] Xác minh sync end-to-end **desktop ↔ laptop (`SS01-IT-10`)** qua Drive folder: export bundle → Drive sync về máy kia → `brain import --merge` → `brain hosts` tách đúng 2 máy → `brain embed --all`.
## Phase 2 — Năng lực nặng
- [ ] Code map AST + hash incremental + import graph/blast radius, fallback keyword khi parser thiếu.
- [ ] Adapter Gemini/Antigravity, Cursor và Hermes chỉ sau khi có fixture dữ liệu thật.
- [ ] Memory promotion có chủ đích từ session sang quyết định curated; không auto-summary thành nguồn thứ hai.
- [ ] Hook harness cảnh báo vi phạm docs nhưng không tự bypass permission host.
## Phase 3 — UI / mở rộng
- [ ] VS Code status bar chỉ đọc status API chung.
- [ ] Toggle provider/adapter có validation conflict và rollback config.