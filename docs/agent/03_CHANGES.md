<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory changelog add` -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-07-05] — Harness standard: docs-template + UI cockpit load bộ chuẩn

Chuẩn hoá bộ harness dùng chung + UI cockpit hướng về chuẩn.
- `docs-template/` (chuẩn chung, tách khỏi `docs/`): thêm rule **Thiết kế UI** (3 size dialog S/M/L + %), **đồng bộ rules↔todo↔change↔plan**, **plan đánh số**, **brain recall on-demand**; `AGENTS.md` nêu "cài harness = nắn project về chuẩn, KHÔNG bê nội dung mẫu" + gom/đánh số plan lúc reconcile.
- UI cockpit: panel harness load **bộ chuẩn** từ `docs-template` (read-only, path-guarded) + docs project là instance; nút **Run** (tái cấu trúc về chuẩn) + **Add project**; layout panel lưu `config.json` (hết reset do random port); tooltip Sources (harness + tối ưu token).
- RULES riêng của zemory kéo theo 4 rule generic trên.

## [2026-07-05] — Scoped sync: loại lane (origin/host/source) khỏi sync + recall

Thêm scoped sync/recall: loại lane provenance (origin/host/source) khỏi **sync + recall** mà KHÔNG xoá data (spec plan 08).
- `src/brain/scope.ts`: `scopeTree()` (Local→máy→agent, Web→nền), `isExcluded`/`laneMatches`, `laneSqlClause`; settings `scopeExclude` trong `config.json`.
- Áp exclude vào: export (lọc snapshot), merge (skip incoming), recall (`hydrate`).
- CLI `zemory brain scope [ls|exclude|include|clear]`; UI: cây tick trong panel Global memory + nút "+ Add rule" (blocklist, wildcard).
- Test: match + recall/merge/export exclusion (tổng 57 test xanh).
- V2 (chưa làm): scan/scan-web exclude — chặn ingest ngay từ cổng.

## [2026-07-05] — scan-web: fix 3 bug backfill (B1 reconnect · B2 batch ingest · B3 --limit)

Fix 3 bug chặn backfill toàn tài khoản ChatGPT (`src/brain/scanweb.ts` + `cli.ts`, test xanh):
- **B1** `Cdp` reject mọi pending khi `ws` close/error + cờ `dead` + reconnect-on-death (Cdp.connect lại 3 lần backoff) → hết treo/exit 13.
- **B2** ingest theo batch (mặc định 25 chat: ghi `scan-web-part.json` + `scan()` tăng dần; resume theo nội dung brain) → crash không mất tiến độ.
- **B3** cờ `--limit N` (kéo N chat mới nhất verify nhanh) + default delay 1500ms giảm 429.
Chờ nghiệm thu: re-run backfill toàn 756 trên tài khoản live.

## [2026-07-01] — Đồng bộ memory xuyên máy qua Drive folder (brain sync)

Đồng bộ memory xuyên máy qua **Drive folder** (không sync DB sống), nối tiếp merge-import (#163).

- Thêm `zemory brain sync` + `syncDrive()` trong `src/brain/share.ts`: export bundle máy này vào Drive folder đã link (tên `global_memory.<host>.zemory.enc`, force overwrite) rồi **merge mọi bundle máy khác** trong folder bằng đường `import --merge`. Trả về số session/message thêm + số message cần embed.
- Drive link: setting `drive` trong `~/.zemory/config.json` + ô nhập trên command bar UI. Nút **Link** chạy test kết nối (`probeDrive`: tồn tại / ghi được / đếm bundle); **bắt lỗi khi dán URL web** Google Drive và chỉ rõ phải dùng path local của Drive Desktop (vd `G:\My Drive\Global Memory`).
- Nút **Sync now** ngay cạnh Link trên command bar; trạng thái hiện tại chỗ Drive state. `resolveShareKey` tìm key theo thứ tự: `--key-file` → `~/.zemory/share.key` → `<repo>/share/share.key` → env `ZEMORY_SHARE_KEY`.
- Bất biến (đã ghi memory): KHÔNG sync `global_memory.db` sống (WAL + ~453MB → dễ corrupt / mất ghi qua Drive); chỉ sync bundle `.enc` bất biến + merge cộng dồn, mỗi session giữ `host` máy gốc. Sau sync chạy `brain embed --all` để vector hóa message mới.
- Endpoint UI mới: `/set-scope`, `/set-drive`, `/doc`, `/brain-session`, `/drive-sync`. `npm run check` 41 test pass (gồm test merge additive + idempotent NULL-uuid).

## [2026-07-01] — Đại tu UI live cockpit: tối giản 3 cột + filter/sort/full-session + ? help + resize

Đại tu UI live cockpit theo phản hồi owner: tối giản, hết trùng lặp, mọi thứ bấm được.

- **3 cột đúng mối quan tâm**: Project (trái: dropdown chọn project + harness docs + Checks) · Recall (giữa) · Global memory (phải). Bỏ rail nav giả, hàng KPI cards trên, và các panel trùng (Global brain / Plan&changelog / Live activity) → mỗi dữ liệu chỉ còn 1 chỗ.
- **Global memory gộp 1 khối**: tổng mes/ses/DB + vector/search + breakdown theo máy + theo agent + bảng DB (trước đây tách & lặp nhiều panel).
- **Filter recall mặc định bật hết + lưu setting** (`~/.zemory/config.json`: `scope`/`hybrid`/`rerank`); rerank default chuyển ON. Time/Type/Agent từ nút giả → **dropdown lọc thật** (recency / role / source, lọc ở `search.ts` qua `source`/`role`/`sinceMs`). "Sorted by relevance" bấm xoay relevance/newest/oldest.
- **Harness gộp 1 panel**, dropdown nằm trong; bấm mỗi `.md` → dialog xem nội dung file (endpoint `/doc`, path-guarded). Checks đổi tên "Capability checks" + mô tả + mỗi feature 3 dòng (tên / bar / message wrap, hết cắt "..."). **Dấu ? chú thích trên mọi panel header.**
- **Mở full session**: nút ⤢ trên mỗi kết quả + trong Thread preview → dialog lớn 920px hiện toàn bộ transcript (`getSessionThread` + `/brain-session`). Dialog `.md` và session cùng size.
- **Resize mọi mối nối panel** (rail + inspector) kéo đẩy nhau bằng flex-grow, lưu localStorage, double-click reset; cộng các mối kéo cột sẵn có.
- Bỏ 2 nút search dư (Search now / Filters), giữ 1 nút Search; giữ invariant 1 viewport.
- `npm run check` 41 test pass; verify trang serve qua curl + endpoint.

## [2026-06-30] — Merge-import bundle cộng dồn (sync xuyên máy an toàn)

- Thêm `zemory brain import --merge`: gộp một bundle vào brain local theo kiểu **cộng dồn, không phá** — thay cho việc sync thẳng file `global_memory.db` sống qua Drive (WAL + 453MB + whole-file = dễ corrupt/mất ghi).
- `src/brain/share.ts` thêm `mergeBrainBundle()`: giải mã bundle ra DB tạm → `ATTACH` → `INSERT OR IGNORE` sessions (theo id) + messages + known_stores, rồi tính lại message_count/started_at/ended_at. KHÔNG đụng DB gốc (không replace), không máy nào đè session máy nào, `host` từng session giữ nguyên máy gốc.
- Dedup message 2 lớp: có `uuid` → `UNIQUE(session_id,uuid)` + OR IGNORE; `uuid` NULL (≈18% corpus — codex/lmstudio/tool) → anti-join theo (session_id, role, timestamp, content) để re-merge cùng bundle **idempotent** (lần 2 thêm 0).
- KHÔNG copy `vec_chunks` (rowid = message id, đổi giữa các DB) → sau merge chạy `zemory brain embed --all` để vector hóa message mới; KHÔNG copy `ingest_state` (offset quét per-máy, merge vào sẽ phá scan incremental); KHÔNG copy doc/section/changelog (đi qua git).
- Tách helper `decryptBundleToFile`; `import` thường (không `--merge`) vẫn là REPLACE toàn DB như cũ.
- Test: thêm 2 ca trong `brain-share.test.mjs` (additive + dedup uuid/NULL-uuid + giữ host + FTS sync; merge vào máy mới). Smoke trên brain thật 453MB: merge #1 = +230 session/+57,216 msg, merge #2 = +0/+0 (idempotent). `npm run check` PASS 41 test.

## [2026-06-30] — RAG Giai đoạn E — cross-encoder rerank (opt-in)

- Thêm `src/brain/rerank.ts`: cross-encoder reranker (mặc định `Xenova/bge-reranker-base` ONNX qua Transformers.js) — engine opt-in cho slot `search` hợp nhất, **dùng chung weight cache + inference brick** với embedder (plan 05 §2). Fail-open: model lỗi/thiếu → giữ nguyên thứ tự RRF.
- `search.ts`: thêm `rerankEnabled()` + stage `maybeRerank()` rescore top-40 ứng viên RRF rồi reorder; refactor `recall`/`searchHybrid` qua `fusedSearch` chung. `search()` FTS sync giữ nguyên làm baseline. Thêm `SearchOptions.rerank` để override per-call.
- Mặc định **OFF (opt-in)** theo bất biến "chỉ bật mặc định sau khi thắng net": bật qua UI toggle Rerank, env `ZEMORY_RERANK=1`, hoặc `brain search --rerank`. Setting `rerank` lưu ở `~/.zemory/config.json`.
- CLI: `brain search --rerank/--no-rerank`, `brain bench --rerank` (thêm lane hybrid+rerank; opt-in nên `npm test` không tải model reranker). UI: toggle Rerank cạnh Hybrid + endpoint `/set-rerank`.
- Test mới `test/rerank.test.mjs` (config, enable logic, fail-open, scoring thật, non-destructive). `npm run check` PASS 37 test; `doctor` xanh.
- Spot check brain thật: rerank đẩy top-K đúng chủ đề hơn hybrid thuần (query "wired the vector index into recall" → top chuyển từ ledgerTick sang đúng message về recall/backend). Corpus gate 8-doc hybrid đã 100% nên rerank chưa tăng recall ở đó — giá trị thật nằm ở corpus lớn/nhiễu.

## [2026-06-30] — Memory retention/privacy core

- Thêm `src/brain/privacy.ts` với raw local `backup/restore`, `forget` và `redact` cho global brain.
- CLI mới: `zemory brain backup`, `restore`, `forget`, `redact`; destructive path dry-run mặc định hoặc yêu cầu `--force`, auto backup trước khi sửa/xóa.
- `forget` hỗ trợ selector `--session`, `--project`, `--source/--agent`, `--before`, `--message`; xóa kèm vector rows để RAG không giữ bóng dữ liệu đã quên.
- `redact --force` re-apply secret redaction cho messages/artifact index; thêm trigger update cho `messages_fts`/`messages_fts_tri` để search index đồng bộ khi content đổi.
- Thêm test backup/restore, forget dry-run/force, redact + FTS; `npm run check` pass 32 tests và CLI QA trên DB tạm pass.

## [2026-06-30] — Dọn backlog sau kiểm tra app

- Kiểm tra lại trạng thái app sau UI resize và push Git.
- Dọn backlog: bỏ các mục `Initial commit / remote Git` đã hoàn tất khỏi TODO.
- Xác nhận còn lại là roadmap/việc cần nghiệm thu thực tế, không phải blocker cơ học của v0.1.

## [2026-06-30] — Thêm resize handles cho live UI

- Thêm draggable resize handles cho live UI: sidebar, inspector, split Recall, và bottom deck.
- Layout resize được lưu vào localStorage, reload vẫn giữ; double-click trên handle để reset vùng tương ứng.
- Giữ invariant UI một màn hình chính: body/html không scroll, chỉ các panel nội bộ scroll.
- QA bằng Edge/Playwright: kéo 4 handle, reload persistence, mobile ẩn handle, search brain trả kết quả, không console error.

## [2026-06-30] — Khóa live UI trong một viewport

- Khóa live UI vào một viewport cố định: html/body/shell không còn page-level scroll.
- Workspace, inspector, Recall, bottom deck được chia bằng grid height 100vh; nội dung dài chỉ scroll trong panel cụ thể như result list, thread preview, coverage và live activity.
- Mobile cũng không tạo page scroll; status deck chuyển thành strip ngang scroll nội bộ và chỉ giữ core Recall trong viewport.
- QA Playwright/Edge: desktop 1536x1040 và mobile 390x844 đều có docScrollHeight == clientHeight, windowScrollY = 0, search vẫn trả 12 rows, không console/page errors.

## [2026-06-30] — Hiển thị coverage agent và folder quét trong UI

- Thêm backend coverage cho live UI: transcript stores từ known_stores và project folders từ sessions.project_root.
- UI giờ hiển thị rõ số agent/source, số transcript store, số project folder và path đầy đủ trong panel Capture coverage.
- Scan & capture report giờ liệt kê Stores scanned ngay sau khi bấm Scan known/Deep scan, kể cả khi không có nhiều session mới.
- QA bằng Playwright/Edge: desktop + mobile đều render coverage paths; search vẫn trả kết quả; không console/page errors; npm run check pass 29 tests.

## [2026-06-30] — Tinh chỉnh live cockpit UI sát concept

- Siết lại layout live memory cockpit theo concept: sidebar trái, command bar, status deck, Recall split list/preview, right rail và bottom deck trong first viewport.
- Recall search giờ render dạng result rows + thread preview, không bung inline từng card như bản trước.
- Bổ sung thông tin thật trên UI: global brain, vector index, share bundle, agents, project harness, plan/changelog, checks và live activity.
- Sửa mobile không còn tự focus search khi load, tránh bị nhảy xuống giữa màn hình.
- Đã QA bằng Playwright trên Edge: desktop/native 1536x1040, mobile 390x844, search `zemory` trả 12 rows và preview 7 messages, không console/page errors.

## [2026-06-30] — Live memory cockpit UI redesign

- Redesign `zemory ui` thành live memory cockpit 3 cột: rail điều hướng, vùng recall chính và inspector cho brain/vector/share/activity.
- Thêm `src/ui-page.ts` để tách template UI khỏi server; `src/ui.ts` giờ tập trung endpoint và dashboard data helpers.
- `/brain-status` trả thêm table inventory, vector count/remaining/coverage, share bundle/key/LFS status và recent activity để UI hiển thị đầy đủ thông tin.
- UI tự refresh status/brain trong lúc chat, giữ search/expand context, project picker, setup actions, scan known/deep scan và capability checks.
- QA: `npm run check` PASS 29/29; Playwright fallback qua Edge kiểm desktop 1440x1000 và mobile 390x844, search FTS trả hit và expand context, không có console error.

## [2026-06-30] — Document repo-contained memory share key

- Theo yêu cầu owner, đưa `share/share.key` vào private repo để máy khác clone về có thể giải mã memory bundle trực tiếp.
- Cập nhật README và `share/README.md` với flow clone → `git lfs pull` → build → `brain import` bằng key trong repo.
- Giữ cảnh báo rõ: ai có quyền đọc repo private này thì có quyền giải mã toàn bộ memory bundle.

## [2026-06-30] — Encrypted global brain sharing bundle

- Thêm `zemory brain keygen` để tạo share key local nằm ngoài repo.
- Thêm `zemory brain export <out.zemory.enc>` dùng AES-256-GCM + scrypt, snapshot SQLite bằng online backup trước khi mã hóa.
- Thêm `zemory brain import <in.zemory.enc>` để restore bundle sang brain DB local; mặc định không overwrite nếu thiếu `--force`, và backup DB cũ khi thay thế.
- Thêm test round-trip mã hóa/giải mã, kiểm tra bundle không chứa plaintext; README ghi flow share memory qua encrypted bundle + Git LFS.
- Bundle `share/global_memory.zemory.enc` được tạo để upload; key nằm ngoài repo ở `~/.zemory/share.key`.

## [2026-06-30] — Clean RAG backlog state and fix generated docs heading separators

- Updated TODO / Plan 05 / roadmap so full vector backfill is recorded as completed historical work, not an open next step.
- Reworded backfill notes to avoid freezing a live corpus count; new transcript messages are handled by incremental `zemory brain embed`.
- Fixed generated docs rendering so a section edited via `plan set` without a trailing newline cannot glue the next heading onto the previous line.
- Added a regression test for the renderer separator behavior and re-rendered docs from `global_memory.db`.
- Verification: `npm run check`, `zemory validate`, `zemory doctor`, and final `brain info` all pass; vector count matched message count at the verification point.

## [2026-06-30] — Complete full vector backfill for global_memory.db

- Finished zemory brain embed --all on the global brain; vec_chunks now matches messages 1:1 at the verification point.
- Fixed a real vec0 insert failure by switching the backfill writer to explicit insert + update-on-duplicate, so a preexisting row no longer crashes the pass.
- Switched backfill to batched embeddings, then tuned the pass order to group similar-length messages so batch padding waste stays low on long transcripts.
- npm run check passes after the change set.

## [2026-06-29] — MCP global recall server

Thêm MCP recall server local:

- `zemory mcp` chạy stdio JSON-RPC/MCP với 4 tool ổn định: `brain_search`, `brain_show`, `plan_search`, `plan_show`.
- Tool logic reuse global brain + DB-source docs hiện có; không tạo memory DB thứ hai.
- Global brain hoạt động ở cấp máy: nếu cwd/project chưa có `docs/.harness.json`, MCP recall không fail mà rơi về global scope.
- `brain_search` dùng progressive disclosure: trả hit nhẹ trước, `brain_show` mở full message/context khi cần.
- `plan_search`/`plan_show` đọc section DB-source, giữ plan/docs là nguồn curated theo project.
- Vector search fail-fast khi DB chưa có `vec_chunks`, tránh load embed model vô ích trên DB tạm/DB chưa backfill.
- README cập nhật: zemory cài một lần toàn máy; per-project `zemory init` chỉ là harness docs tùy chọn.
- Test thêm `test/mcp.test.mjs`; `npm run check` PASS 25/25.

## [2026-06-29] — Polish RAG backfill UX: embed progress + remaining count

- `zemory brain embed` thêm progress callback theo batch: CLI in tiến độ `done/total` trong lúc embed, tránh cảm giác treo trên DB thật.
- `zemory brain info` hiển thị thêm số message còn thiếu embedding (`remaining`) cạnh `vec_chunks`.
- Help của `zemory brain` mô tả rõ `embed [--limit N] [--all]`, default one-batch 500 message và `--all` để catch up toàn corpus.
- Test thêm assertion cho progress callback và `vectorRemaining`; `npm run check` PASS.

## [2026-06-29] — Nghiệm thu v0.1 + RAG core A-D PASS

Nghiệm thu v0.1 và RAG core trên repo thật:

- `npm run check` PASS: typecheck + lint + build + 21 test.
- `zemory doctor` PASS: docs, plan, providers, FTS brain, workflow validate/grill đều xanh.
- CLI smoke PASS: `docs sync`, `docs ls`, `plan search`, `changelog ls`, `validate`, `structure`, `brain scan`, `brain search`, `brain bench`, `npm pack --dry-run`.
- Global brain thật scan OK: 219 session, 53k+ message, 4 agent.
- RAG core A-D đã có code/test: EmbeddingGemma/Transformers.js, `sqlite-vec`, hybrid RRF, benchmark gate.
- `brain embed` CLI thêm progress trong batch để DB lớn không nhìn như treo; test khóa progress callback.
- Docs/TODO/plan cập nhật lại: v0.1 chuyển sang đã nghiệm thu cơ học, RAG A-D chuyển sang done; còn lại là initial commit, MCP recall tools, retention/privacy, full vector backfill, và mở RAG sang data chính.

## [2026-06-26] — Đồng bộ toàn bộ docs về trạng thái hiện tại + RAG Giai đoạn F (data chính)

Thêm **RAG Giai đoạn F** (ý tưởng user 2026-06-26): sau core RAG, mở RAG sang **toàn bộ data chính** (ngoài memory agent) — CHUNG model + embed service + retriever + RRF; DB tách được nhưng dùng chung 1 model; retriever build **đa-store + `kind`** để mở rộng không phá code. Ghi vào plan 05 §4.F + §5 + TODO.

**Đồng bộ toàn bộ docs về trạng thái hiện tại** (bỏ tàn dư compression, governance→harness, hướng tiếp = RAG):
- `00_build_plan`: §2 nguyên tắc (bỏ framing nén; #5 = "không proxy model API"), §7 bản quyền (LeanCTX→engine RAG: EmbeddingGemma/Transformers.js/sqlite-vec, kiểm license Gemma), §9 quyết định (4 capability, compression bỏ, RAG engine nội bộ search), §10 bước kế (RAG → MCP → retention).
- `04_roadmap`: §8 dashboard (bỏ token-ledger/bounce/artifact), §10 trình tự (ưu tiên = RAG, không phải compression).
- `01_repo_survey` §0: banner + định vị hiện tại (2 lane + RAG), khảo sát cũ giữ làm hồ sơ.
- `02_TODO`: Phase 3 dashboard, mục "Đã xong" đánh dấu compress đã bỏ + governance→harness.
- Changelog cũ (03_CHANGES) giữ nguyên = lịch sử.

## [2026-06-25] — RAG semantic: chốt stack (EmbeddingGemma + Transformers.js + sqlite-vec) + plan 05 + TODO

Chốt làm **RAG semantic** cho zemory (nâng recall từ FTS-only lên hybrid). Tạo `docs/plan/05_rag.md` + TODO phân kỳ A–E.

Stack đã chốt:
- **Model embed:** EmbeddingGemma-300M (Google) — nhẹ ~300M, đa ngữ 100+ (tiếng Việt tốt), Matryoshka cắt chiều. (BGE-M3 loại vì ~2.2GB không nhẹ; txtai chỉ là framework tham chiếu Python, không dùng.)
- **Runtime:** Transformers.js (ONNX) — chạy trong Node/TS, KHÔNG Python/GPU.
- **Vector store:** sqlite-vec trong chính `global_memory.db` (giữ 1 file).
- **Fusion:** thêm luồng vector vào RRF đã có (BM25 + vector). Vector = engine nội bộ slot `search`, không slot riêng.

Bất biến: embed model nhỏ ≠ LLM (vẫn "tầng lưu không gọi LLM"); FTS là baseline luôn có, vector chỉ thêm + fallback FTS khi lỗi; agentic on-demand; chỉ bật vector sau benchmark thắng net.

Dọn TODO cũ thời nén: quyết định LeanCTX (moot), semantic-provider (chốt = engine nội bộ).

## [2026-06-25] — Đổi tên governance → harness; dọn docs về trạng thái hiện tại

- Capability `governance` → **`harness`** (rõ nghĩa hơn: nó quản đúng cái *docs harness* — rules/TODO/changelog/plan + validate). Provider của `memory` đổi `harness` → **`global`** để tránh trùng tên. Code: types/runtime/modules; file `governance-docs.ts`→`harness-docs.ts`, `memory-harness.ts`→`memory-global.ts`. Doctor giờ: `memory → global · search → keyword · harness → docs · health → core`.
- Dọn docs về trạng thái hiện tại: `00_build_plan` §0/§3/§4/§8 + modules bỏ compression khỏi kiến trúc + đổi governance→harness; plan 04 §1/§8 + `02_TODO` đồng bộ. zemory = **global memory + harness** (4 capability: memory/search/harness/health).
- `.harness.json` adapters: `memory: global`. 13 test, build + doctor xanh.

## [2026-06-25] — Bỏ compression khỏi scope — zemory = global memory + governance

> 🔄 **Supersede:** đảo quyết định "compression quota-safe là ưu tiên số 1 (2026-06-21)" + toàn bộ hướng nén tool-output. User chốt: trên Claude subscription (không trả theo token) compression không cho net saving hợp lý — đúng lý do Headroom thất bại.

Giá trị thật của zemory = **global memory (recall xuyên phiên)** + **governance/docs harness**. Compression bị **gỡ khỏi tool sống**.

- Capability `compress` + provider lite/leanctx: bỏ khỏi registry/types/runtime/checks/status/doctor/UI/CLI.
- Lệnh CLI bỏ: `run`, `compress`, `read`, `output`, `eval`. UI bỏ panel "Token benchmark" + endpoint `/ledger`.
- Source nén (Giai đoạn A+B: `src/compress`, `src/eval`, `src/artifacts`, `modules/compress-*`) **dời sang `attic/`** (giữ tham chiếu cho A.I Center sau, không build). Test nén → `attic/test/`.
- Giữ nguyên: global brain (capture + recall `brain search/show`), governance (plan/changelog/AGENTS), doctor cho 4 capability còn lại (memory/search/governance/health). DB schema giữ bảng artifact (vô hại, không dùng).
- Còn 13 test, build + doctor xanh.

Plan 03/04 (thiết kế compression) giữ làm hồ sơ ý tưởng đã thử, đánh dấu DROPPED.
