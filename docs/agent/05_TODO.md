<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
## ✅ Đã xong (chi tiết 06_CHANGES.md)
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
- [x] **Nghiệm thu cơ học 2026-06-29 PASS:** `npm run check` xanh; `zemory doctor` xanh; `validate`, `docs ls`, `plan search`, `changelog ls`, `brain scan`, `brain search`, `brain bench`, `npm pack --dry-run` đều chạy được.

**Trạng thái sau 2026-06-30:** remote Git + commit/push `main` đã xong; không còn blocker cơ học trong v0.1. Mốc publish/package registry là quyết định riêng nếu cần.
## ⭐ Ưu tiên kế tiếp
> Compression đã **BỎ khỏi scope** (changelog 2026-06-25). zemory tập trung **global memory + harness**. Source nén ở `attic/`.

- [x] ~~Harness: rà `01_CONSTITUTION` ghi RÕ luật riêng + AGENTS chỉ điều hướng~~ **HOÀN TẤT 2026-07-17** — AGENTS (repo+template) gọt về router THUẦN (0 luật/0 nội dung harness); `01_CONSTITUTION` giữ 12 điều luật riêng làm nguồn (fix §Mục đích: chỉ `docs_template/` là bản mẫu); audit toàn repo + dọn FILE WINS drift (plan/00·02, README, cli/ui/tools/comment) + gỡ nốt `docs sync` sót. Xem 05_CHANGES.

**✅ RAG semantic core — đã code/test tới gate A-D + E (rerank, opt-in) + full backfill (2026-06-30) + F1 (asymmetric prompts/256d/chunking, 2026-07-14):**
- [x] A. Embed pipeline: EmbeddingGemma-300M qua Transformers.js (ONNX, Node, no Python) — embed ra vector unit-normalized, fail-open khi model lỗi.
- [x] B. Vector store: `sqlite-vec` trong `global_memory.db`; `zemory brain embed` incremental; vector index hiện chạy thật trên DB local.
- [x] C. Hybrid retrieve: vector stream đã fuse vào RRF cùng FTS; `brain search` mặc định chạy hybrid khi enabled và fallback FTS khi vector lỗi/thiếu.
- [x] D. Benchmark gate: `brain bench` PASS; test suite xác nhận hybrid recall@3 >= FTS trên paraphrase corpus.
- [x] Full corpus backfill: `zemory brain embed --all` đã chạy xong trên corpus lịch sử của `global_memory.db`; mốc nghiệm thu 2026-06-30 xác nhận `vec_chunks` khớp `messages` 1:1. Vì brain ingest transcript sống, message mới sau mốc này xử lý bằng `zemory brain embed` incremental.
- [x] E. Rerank cross-encoder (opt-in) — `backend/src/brain/rerank.ts` rescore top-40 ứng viên RRF rồi reorder; fail-open giữ thứ tự RRF; default OFF, bật qua UI toggle / `ZEMORY_RERANK=1` / `--rerank`. `brain bench --rerank` đo lane riêng; spot check brain thật xác nhận reorder tốt hơn hybrid thuần. Chi tiết plan 05 §4.E.
- [x] F1. **Asymmetric Gemma prompts + Matryoshka 256d + chunk message dài + MCP grade/rewrite guidance** (2026-07-12, commit `2164674`) + **rebuild toàn bộ DB thật ở 256d + FTS external-content + VACUUM** (plan 12, HOÀN TẤT 2026-07-14: DB 1141.4MB→595.1MB, gate 82/82 + bench 100%/100%).
- [ ] F2. (TẦM NHÌN, sau core) Mở RAG sang **data chính** (ngoài memory agent): retriever **đa-store + `kind`**, chung model + retriever, DB tách được. Ý tưởng user — plan 05 §4.F.

**✅ MCP global recall — đã code/test 2026-06-29:**
- [x] `zemory mcp` stdio server local với `brain_search`, `brain_show`, `plan_search`, `plan_show`.
- [x] Global brain đọc được ở mọi cwd/project; nếu project chưa setup harness thì recall tự rơi về toàn bộ `global_memory.db` thay vì bắt buộc có `docs/.harness.json`.
- [x] MCP không auto-inject memory; agent gọi on-demand rồi dùng `*_show` để mở full text.
- [x] (2026-07-12) `brain_search` mô tả giờ hướng dẫn agent tự chấm kết quả + viết lại query (≤2 lần) khi hit kém, thay vì kết luận ngay "không có" — agentic retrieval loop, 0 token phía zemory.

**✅ Memory retention/privacy core — đã code/test 2026-06-30:**
- [x] Encrypted share đã có: `zemory brain export/import` bằng bundle `.zemory.enc`.
- [x] Raw local safety net: `zemory brain backup/restore` bằng SQLite online backup, restore luôn rename DB cũ sang `.bak-*`.
- [x] Forget trong brain DB: `zemory brain forget` theo `--session`, `--project`, `--source/--agent`, `--before`, hoặc `--message`; dry-run mặc định, `--force` mới xóa, auto backup trước khi xóa.
- [x] Re-redact dữ liệu đã ingest: `zemory brain redact --force` re-apply secret redaction cho messages/artifact index; FTS message update trigger giữ search index đồng bộ.
- [x] (2026-07-14) `zemory brain vacuum` — thu hồi trang trống sau khi chỉnh sửa cấu trúc (dims cut, FTS migration).

**Khác (chưa làm):**
- [ ] (Nếu cần quên tuyệt đối) Source-transcript privacy/tombstone: xóa/redact transcript gốc của agent host hoặc ghi tombstone chống whole-file adapter re-ingest lại dữ liệu đã quên.
- [ ] (Sau) code map AST + adapter host mới (Gemini/Cursor/…) khi có fixture thật.

**🔥 VIỆC KẾ TIẾP:**
- [~] **(ĐANG DỞ 2026-07-19 — ĐỌC TRƯỚC KHI LÀM TIẾP) App hoá zemory, bước D: giao diện tab.** Spec: `plan/14 §4/§4b`. Thứ tự đã đảo theo user: **D (giao diện) → B (tự động) → C (write gate)** — vì công tắc tự-động cần chỗ đặt để bấm thử.
  - **ĐÃ XONG (chạy được, CHƯA commit):** thanh tab trên cùng `🧠 Global Memory │ <mỗi project 1 tab> │ ＋ │ ◐ theme │ ⚙` trong `ui-page.ts`; tab là **lớp áo của `<select id="proj">`** (select vẫn là nguồn sự thật ⇒ **không sửa handler cũ nào**); CSS bật/tắt vùng theo `body[data-tab]` (**không dời DOM**); theme **Dark/Light** + tab đang mở nhớ qua `localStorage`; chỗ trống `#graphSoon` cho Graph.
  - **BẪY ĐÃ GẶP + CÁCH TRÁNH:** viết `onclick` inline trong chuỗi sinh HTML làm **hỏng cú pháp JS nhúng** (nháy bị nhân đôi qua template literal) — đã chuyển sang `data-act`/`data-root` + **1 listener uỷ quyền**. **LUẬT: sau mỗi lần sửa `ui-page.ts` phải trích khối `<script>` ra file rồi `node --check`** — `npm run build` KHÔNG bắt được lỗi này.
  - **CÒN LẠI (user nêu sau khi xem thật):**
    1. **UI LAG vì quá nhiều project rác** — registry gom mọi folder từng chạy agent (`ztmpl1–8`, `harness-test`, `demo-proj`…). Cần lọc: chỉ hiện project pin/đang dùng, còn lại vào menu "…", **kèm đường gỡ project khỏi registry**.
    2. **Tách "CHUẨN DÙNG CHUNG" khỏi tab project** — khối `docs_template/` (AGENTS + 01→06) là tài sản cấp máy → đưa về **Global Memory** (hoặc tab riêng); **tab project CHỈ còn harness của chính nó**.
    3. Xin ý kiến user về theme sáng (mới phối, chưa được duyệt bằng mắt).
- [ ] **(kế tiếp sau D) Bước B — tự động hoá:** công tắc **"Mở cùng PC"** (autostart per-OS) + **"Tự sync brain"** (plan 14 §3b) + scheduler chạy nền lúc máy rảnh. **Đây là gap user nêu từ đầu phiên** ("zemory chưa được cài đặt ở tính năng tự động"). Gắn vào ⚙ sau khi D xong.
- [ ] **(sau B) Bước C** write gate · **(sau)** E: icon khay + đóng gói. User muốn zemory **vừa chạy web local vừa thành app dính cửa sổ như SasinFlow** — nền tảng đã có (server localhost + `--app` window), còn thiếu **icon khay + tự khởi động**.
- [x] ~~**Delta export (plan 08) — tiền đề auto-sync**~~ **HOÀN TẤT 2026-07-19** — xem `06_CHANGES`. Bundle mặc định `payload=rows` (chỉ sessions/messages/known_stores — đúng 3 bảng merge thật sự đọc); `--delta` + watermark `sync_state` (schema v13); `--full` giữ cho disaster-restore. **Đo thật: 709.1MB → lean 184.6MB (−74%) → delta 1.8MB.** Round-trip khớp tuyệt đối + FTS dựng lại đúng; `npm run check` 87/87.
  - Còn lại (gộp vào plan 14): `syncDrive` chưa dùng delta (file 1/máy phải tự-đủ) → delta tích luỹ + compact làm cùng daemon auto-sync.
- [ ] **(CHỐT HƯỚNG 2026-07-18, chưa code) App hoá zemory — TỰ ĐỘNG HOÁ (gap user nêu: đang toàn thủ công) + daemon + UI đa-project + tab Graph.** Spec: **`docs/plan/14_daemon_app.md`**. Gap thật: chưa cài như app · chưa có setting **"Mở cùng PC"** (autostart) · chưa có setting **"Tự sync brain khi dữ liệu lệch"** (tự export/import bundle plan 08, mặc định OFF, §3b) — multi-máy thì ĐÃ có, đừng nhầm. Chốt: **port 4444** (user chốt) · single-instance + **WRITE GATE** (CLI ghi qua daemon — trị gốc "database is locked" plan 12) · idle scheduler scan/embed · tray pattern SasinFlow · **UI THIẾT KẾ LẠI (§4, user chốt 2026-07-18): tab `GLOBAL MEMORY` = Main (nhãn UI KHÔNG dùng chữ "brain") → tab `zemory` cố định (harness+graph của chính nó, cùng khuôn) → tab các project ngoài + nút [＋] add; graph đi THEO project trong tab · theme CHỐT: Dark + Light toggle giống SasinFlow (dark mặc định, token CSS-var 1 chỗ — §4b)** · cài NATIVE là chính, Docker CHỈ headless (lý do plan 14 §5, đừng bàn lại). Phân kỳ A→F §6 (B = tự động hoá lõi, ưu tiên ngay sau A); quyết định mở §7 (tray Node · phạm vi write-gate · autostart per-OS · graph cache · chu kỳ/ngưỡng auto-sync).
- [ ] **(CHỐT HƯỚNG 2026-07-18, chưa code) Graph — app phụ trợ vẽ đồ thị cho mọi repo theo chuẩn zemory.** Spec đầy đủ: **`docs/plan/13_graph.md`**. Tóm tắt: zemory = BUILD graph dẫn xuất (cạnh KHAI BÁO: routing·references·supersede·`digest.touches` + overlay SUY LUẬN `semantic_neighbor` từ vector sẵn, fail-open, nhãn riêng) + `zemory graph build/export --json` (contract) + MCP `graph_neighbors`/`graph_impact`; **App viewer = repo RIÊNG** consume `graph.json`/brain (KHÔNG parse lại chuẩn). Bất biến: dẫn xuất·0 LLM·fail-open·engine nội bộ brain (dẫn chiếu HP điều 1/3/5/6/8/9). **CẦN CHỐT trước khi code** (plan 13 §8): packaging (surface `zemory graph ui` MVP rồi tách / repo riêng ngay) · độ mịn node v1 (có AST symbol chưa) · overlay suy luận v1 hay phase 2 · cross-project `--all` · viewer tech (cytoscape/d3/sigma — cần research license) · schema versioning.
  - **ĐỀ XUẤT HIẾN PHÁP (chờ user chốt):** thêm 1 điều/khoản vào `01_CONSTITUTION` — *"Graph là lớp DẪN XUẤT (rebuild từ .md+code+brain, 0 LLM); app ngoài chỉ CONSUME export; graph có 2 hạng cạnh — KHAI BÁO (baseline) vs SUY LUẬN (overlay fail-open, gắn nhãn, KHÔNG giả dạng khai báo)."* (KHÔNG tự sửa hiến pháp — user duyệt mới ghi.)
- [x] ~~**(CHỐT 2026-07-18) Thêm slot `04_SKILLS.md` — tách playbook khỏi rules/structure.**~~ **HOÀN TẤT 2026-07-18** — xem `06_CHANGES`. Thêm `04_SKILLS.md` (grill · chốt phiên · reconcile) + renumber `04_TODO→05_TODO`/`05_CHANGES→06_CHANGES` (repo+template), RULES/STRUCTURE giữ NORM+trigger→dẫn chiếu, `LEGACY_RENAME` phủ gen-1→3, code (adopt/migrate/status/ui/cli/archive/validate/checks/changelog) + test (+gen-3). Verify: `npm run check` 83/83 · `init` ra đúng 6 file · `doctor`/`validate` xanh.
  - (Tuỳ chọn về sau, CHƯA làm) ship bản gọi-được sang `.claude/skills/<name>/SKILL.md` — 1 nguồn, 2 dạng (đọc vs invoke).
- [~] **(user giao 2026-07-16) SasinFlow — UI 1 file HTML quá bự — ĐÃ KHẢO SÁT + CÓ PHƯƠNG ÁN, CHỜ USER DUYỆT ĐỂ TÁCH CODE (làm BÊN repo SasinFlow):** survey xong (07-16/18): `frontend/index.html` = **5.150 dòng** (JS ~4.020/307 func = 78% · 127 `onclick=` inline · CSS ~680 · HTML ~430). Phình vì **JS logic**, KHÔNG phải ảnh (0 base64, 1 SVG inline, 2 CSS url). **Assets đã ĐÚNG CHỖ, không cần fix:** logo UI → `frontend/assets/logo.png` · icon .exe (`sasin.ico`, `.spec` đọc) + icon tray/desktop (`sasin_icon.png`, `desktop.py` pystray) → `backend/resources/packaging/`. Hạ tầng sẵn sàng tách (FastAPI `StaticFiles` mount + `.spec` bundle nguyên folder → KHÔNG ràng buộc single-file). **Phương án 4 bước:** CSS ra `styles/` → cắt JS thành nhiều `<script src>` GIỮ global scope → gỡ inline `onclick=` → nâng ES module. Convention **"UI no-build"** + phân biệt 3-vai-trò-icon đã vào `03_STRUCTURE §5` (2026-07-18). **CÒN LẠI: user gật → tách code (repo SasinFlow, KHÔNG phải ở đây; cross-project).**
- [x] ~~CHỜ USER DUYỆT: giảm ~50% DB~~ **HOÀN TẤT 2026-07-14** — xem `docs/plan/12_vector_rebuild_256.md`, changelog #1010. Kết quả thật: 1141.4MB→595.1MB (−546.3MB, ~48%), 94.384 vector, gate 82/82 + bench 100%/100%.
- [~] **Đo tốc độ embed/ngày — VẪN CHƯA có số ngày-thường sạch.** Mẫu cũ (07-12, mega-session) = 41 msg/phút, lệch. Rebuild plan 12 (27 giờ, 94k message tồn đọng) cho thấy tốc độ dao động 40–380 msg/phút tùy độ dài message, nhưng đó là backlog dồn cục, KHÔNG phải nhịp ingest hằng ngày. Việc còn lại: sau 1 ngày dùng bình thường (không rebuild), chạy `zemory brain embed --all` + bấm giờ cho SỐ MESSAGE MỚI TRONG NGÀY ĐÓ để ra phút/ngày thật; nếu >20 phút → cân nhắc q4 dtype (hỏi user). **(2026-07-17) ĐO THẬT xong:** backlog 10291 → `brain embed --all` clear HẾT (remaining 0, +10433 vector, 21 pass, ~10834s ≈ 3h) ⇒ **~57–58 msg/phút** (256d · gemma q8 · CPU máy này). Tổng index 109.366 vector. Model verify chạy suốt (probe ok + embed chuỗi mới) — "model unavailable" chỉ là message sai (đã fix). **VẪN CÒN:** đây là backlog-rate; số **ngày-thường** (chỉ msg mới 1 ngày, chạy cuối ngày) mới chốt được q4 — ở ~58/min thì ngưỡng ">20 phút" ⇔ >~1160 msg mới/ngày.
- [x] ~~Chuẩn RULES chưa có, template RULES stale~~ **HOÀN TẤT 2026-07-14 (commit `cf28037`)** — thêm tầng `01_CONSTITUTION.md` (hiến pháp per-app, ý tưởng Spec Kit; user chốt "đôn lên, không dùng 00") + renumber `01_CONSTITUTION·02_RULES·03_STRUCTURE·04_TODO·05_CHANGES`; vá template stale (refs gen-1); RULES zemory về generic (5 bất biến dời sang hiến pháp, bổ sung 4 mục thiếu); hiến pháp zemory gom 12 điều từ luật rải trong plan 00/02/04–08/10–12; `LEGACY_RENAME` phủ 2 thế hệ tên; UI chip list đủ 5 file. Ghi chú gốc: Kiểm chứng: ① **Template `docs-template/agent/01_RULES.md` STALE** — vẫn trỏ `02_TODO.md`/`03_CHANGES.md`/`04_STRUCTURE.md` (tên trước đợt renumber 2026-07-09; tên thật giờ là `03_TODO`/`04_CHANGES`/`02_STRUCTURE`). `adopt.ts` copy template verbatim ⇒ **mọi project `zemory init` từ 07-09 tới nay đều nhận RULES trỏ file không tồn tại**. (`docs-template/agent/03_TODO.md:4` cũng còn trỏ `03_CHANGES.md`.) ② **KHÔNG có profile app/non-app cho RULES** — khác `02_STRUCTURE` (đã tách §1–6 APP vs §7 NON-APP). `adopt.ts` không hề branch theo `profile`, nên project BI/data (`init --non-app`) vẫn bị nhét luật "Thiết kế UI — dialog 3 size S/M/L" vô nghĩa với nó. ③ **RULES riêng của zemory đã DRIFT khỏi template**: zemory có 5 "Bất biến KIẾN TRÚC" riêng (token-first · `backend/src` vs `external/` · 1 nguồn sự thật · 1 capability=1 slot=1 provider · tách tool khỏi data) nhưng nhét thẳng lên đầu, KHÔNG dùng ô `<!-- Luật riêng của <PROJECT> -->` mà template chừa sẵn ở cuối; đồng thời **thiếu 4 mục template có**: "Thiết kế UI (dialog 3 size)" (mỉa mai: chính zemory đã implement luật này — changelog #317), "Đồng bộ bắt buộc rules↔todo↔change↔plan", "Plan phải đánh số NN_tên.md", "Tra log sâu qua `brain search`". ⇒ Việc bước sau: chốt kiến trúc chuẩn RULES (generic + profile app/non-app + ô luật-riêng), vá template stale, rồi nắn RULES của zemory về đúng chuẩn đó.
- [x] ~~Bug đồng bộ docs: 8 doc lưu 1 blob heading=NULL~~ **HOÀN TẤT 2026-07-16** — chẩn đoán ban đầu SAI 2 lần (đổ cho "đổi project_root", rồi cho CRLF). Gốc thật: **vòng lặp tự duy trì** — blob (1 section level-0) render ra **trùng khít file**, nên check "nội dung khớp" của FILE WINS bảo "unchanged" ⇒ không bao giờ tách lại. Vá: `docs sync` so **CẢ cấu trúc** (`idx.sections === parseMarkdown(file).length`), không chỉ nội dung. Cả 8 doc tự lành (7–30 section), không cần can thiệp DB thủ công. +1 test khóa.
- [ ] **(chờ user, việc ở repo khác) SasinFlow còn tồn đọng 9 entry changelog:** 9 entry 07-14→07-16 chỉ nằm trong `.md`, DB không có (tôi xóa khi khôi phục theo lệnh user). Với code mới **không mất được nữa** (CRLF đã vá + render salvage). Theo **FILE WINS**: 9 entry đã nằm trong `.md` (nguồn) nên coi như đủ; DB chỉ là index search, dựng lại từ file khi cần. (`docs sync` đã gỡ 2026-07-16.) KHÔNG tự sửa repo đó (`02_RULES §Phạm vi project`).
## 🧩 Session digest (plan 06) — ✅ XONG 2026-07-02 (build v1, xem 05_CHANGES)
> Lớp tóm tắt cấp phiên (DẪN XUẤT) để recall đọc rẻ token; đào xuống `messages` qua anchor khi cần. Spec: `docs/plan/06_digest.md`. Cụ thể hoá "memory promotion" (Phase 2) nhưng dạng lăng kính dẫn xuất, KHÔNG phải nguồn.
- [x] Migration v5 + bảng dẫn xuất `session_digest` (1 dòng/phiên) + FTS lane (word/trigram).
- [x] Generator A (extractive, KHÔNG LLM): `tasks[]` (nhiều việc, mỗi việc 1 anchor) · `paths_touched[]` · `decisions[]` · `errors[]` · `outcome` · `meta` (source/host/project/#msg/time) · `source_sig` hash. Dùng vector sẵn có để *chọn* câu đắt (không sinh văn bản), fail-open về heuristic.
- [x] Regen theo nhịp `brain scan`/ingest cho phiên có tin mới (guard hash — không cần biết phiên kết thúc) + `zemory brain digest --all` backfill phiên cũ.
- [x] Recall R3: lane digest cấp phiên trong `brain search` + lệnh `brain digest <session>`; progressive disclosure digest → anchor → messages.
- [x] Test: backfill, regen idempotent, anchor mở đúng tin, KHÔNG lộn phiên (scope theo `session_id`), fail-open.
- [ ] (TẦM NHÌN, tuỳ chọn — không bắt buộc v1) B agent-authored: khi recall chạm phiên, agent hiện tại đọc transcript viết đè `kind=agent` (có anchor). Bỏ B1 "agent tự viết lúc kết thúc". KHÔNG để zemory tự gọi LLM API.

## Quyết định mở / cần chốt
- [ ] **(Graph — plan 13 §8) Loại lỗi nào build TRƯỚC?** Đã trình 8 loại; user CHƯA chọn. Ba nhóm: (a) link gãy + orphan (docs, rẻ, làm ngay được) · (b) **blast-radius** "sửa X đụng ai" (cần đọc import code) · (c) traceability "requirement nào chưa có test". Prototype 2026-07-18 đã chứng minh (b) chạy được: code-graph 55 module/154 import, tìm ra **orphan thật `core/index.ts`** (barrel 0 ai import), fan-in `brain/db.ts`=18.
- [ ] **(Graph) Độ mịn + overlay:** v1 dừng ở file hay kéo tới hàm (AST)? overlay "semantic neighbor" (từ vector sẵn) làm v1 hay phase 2? *(đề xuất: v1 không AST, chỉ cạnh khai báo)*
- [ ] **(plan 14 §7) Chưa chốt:** tray bằng gì trên Node · write-gate phủ lệnh nào trước · autostart per-OS làm sao · graph cache để trong DB hay file JSON · chu kỳ auto-sync.
- [ ] **(plan 13 §8 #6) ĐỀ XUẤT HIẾN PHÁP chờ user chốt:** thêm điều "Graph là lớp DẪN XUẤT (rebuild từ .md+code+brain, 0 LLM); app ngoài chỉ CONSUME export; 2 hạng cạnh khai-báo/suy-luận, cạnh suy luận KHÔNG giả dạng khai báo."
- [ ] **3 commit đang nằm LOCAL, CHƯA PUSH:** `1ef6422` (lean/delta sync) · `76523fb` (cổng 4444) · `977e6f9` (wip UI tab). *(`6180618` và `4e71980` đã push rồi.)* Chờ user cho phép (§Git).
- [x] ~~Semantic là provider riêng hay engine nội bộ?~~ CHỐT 2026-06-25: **engine nội bộ** của search hợp nhất — 1 slot `search`, thêm luồng vector vào RRF (xem plan 05).
- [x] ~~Phân phối LeanCTX: dependency hay binary?~~ MOOT — compression đã bỏ, code ở `attic/`.
- [x] ~~Artifact lưu bao lâu / tối đa GB?~~ CHỐT 2026-06-25: vĩnh viễn, KHÔNG tự xóa; đầy → cảnh báo, cũ → archive gzip (chi tiết changelog).
- [x] ~~sqlite-vec hay brute-force cosine?~~ CHỐT 2026-06-29 theo code/test: dùng `sqlite-vec` trong `global_memory.db`, fail-open về FTS.
- [x] ~~Chiều vector mặc định?~~ CHỐT 2026-06-29: ban đầu 768d đầy đủ. **ĐỔI 2026-07-14 (plan 12): 256d Matryoshka** (cắt + renormalize từ 768d, 0% mất theo bench) — dims lưu trong `vec_config.dims`, stored-dims-authoritative. DB thật đã rebuild xong ở 256d.
- [x] ~~Lịch backfill toàn bộ corpus thật?~~ CHỐT 2026-06-30: chạy thủ công có kiểm soát bằng `zemory brain embed --all`; mốc nghiệm thu đã backfill đủ corpus lịch sử của `global_memory.db`. Message mới sau đó dùng incremental embed.
- [x] ~~Có cần rerank cross-encoder không?~~ CHỐT 2026-06-30: **làm rồi, opt-in** (Giai đoạn E — bge-reranker-base, default OFF, bật qua UI/`ZEMORY_RERANK`/`--rerank`).
- [x] ~~Đồng bộ memory xuyên máy thế nào?~~ CHỐT 2026-07-01: **bundle `.enc` qua Drive folder + `brain import --merge`** (additive), KHÔNG sync DB sống. `brain sync` + Drive link trong UI. Chi tiết changelog + plan 02 §0.
- [x] ~~Có cần asymmetric query/document prompt cho embed model không?~~ CHỐT 2026-07-12/14 (plan 12): **có** — EmbeddingGemma là prompt-trained, query dùng `task: search result | query:`, document dùng `title: none | text:`. Profile lưu `vec_config.profile`.
- [ ] RAG còn cần chốt khi mở rộng sang **data chính**: chunk doc dài cho docs/knowledge/code; data chính dùng chung `global_memory.db` (cột `kind`) hay store tách rồi fuse.
## Việc cần xác minh thực tế
- [ ] Mở phiên Claude và Codex mới để xác nhận Stop hook capture end-to-end trên runtime thật.
- [ ] Chạy benchmark Raw vs lite vs Lean map/signatures vs semantic trên cùng corpus code/log/test.
- [ ] Xác minh sync end-to-end **desktop ↔ laptop (`SS01-IT-10`)** qua Drive folder: export bundle → Drive sync về máy kia → `brain import --merge` → `brain hosts` tách đúng 2 máy → `brain embed --all`.
## Phase 2 — Năng lực nặng
- [ ] Code map AST + hash incremental + import graph/blast radius, fallback keyword khi parser thiếu.
- [ ] Adapter Gemini/Antigravity, Cursor và Hermes chỉ sau khi có fixture dữ liệu thật.
- [ ] **Memory promotion (episodic → curated learned-rule) — Ý TƯỞNG rõ (2026-07-18):** episodic brain đã bắt HẾT correction/decision qua các phiên → **nguyên liệu thô đã sẵn trong zemory**. THIẾU cái CẦU: zemory tự **phát hiện correction/decision LẶP LẠI** trong episodic → **ĐỀ XUẤT** nâng thành **memory-luật bền** (constitution/rules/1 memory doc) — **có review, user duyệt, KHÔNG auto-summary thành nguồn thứ hai** (điều 3). Cơ chế hình dung: quét episodic tìm pattern lặp (theme/correction) → xếp hạng theo tần suất → trình user *"correction X lặp N lần, nâng thành rule?"* → user gật mới ghi. Hiện đang để Claude-Code `memory/` gánh TAY. **Đây là "gap thật" duy nhất so với harness pattern 3-trụ** (trụ ② memory); trụ ③ (subagent/critic) zemory CỐ TÌNH bỏ (điều 6 — agent tự orchestrate, Claude auto-spawn subagent rồi).
- [ ] Hook harness cảnh báo vi phạm docs nhưng không tự bypass permission host.
## Phase 3 — UI / mở rộng
- [ ] VS Code status bar chỉ đọc status API chung.
- [ ] Toggle provider/adapter có validation conflict và rollback config.
## 🌐 Web-chat capture (spec: docs/plan/07_web_chat_capture.md) — GPT trước
> Thu hội thoại web (ChatGPT/Gemini/Claude.ai) vào brain. Spec: `docs/plan/07_web_chat_capture.md`. Prototype cũ ở `attic/web-capture/`.

**✅ ĐÃ SHIP — ChatGPT (cập nhật 2026-07-08):**
- [x] Feasibility test (2026-07-02/03): login-once + CDP pull, enumerate 752 hội thoại, format ChatGPT verify.
- [x] **Schema `origin`** (thêm ở v6) + `idx_sessions_origin` + migration backfill `'local'`. (`db.ts`)
- [x] **`brain scan-web --platform chatgpt`** (`backend/src/brain/scanweb.ts`): browser-connector + pace/backoff/resume + dedupe theo id. **859 hội thoại ChatGPT (~30.9k msg)** đã vào brain, **cả Project chats** (gizmo endpoints, gắn `project_root`).
- [x] parseFileMulti + fallback file-export (`~/.zemory/imports/chatgpt/`) — dùng ingest bộ Export lớn.

**Còn lại (chưa làm):**
- [x] Recall + UI: facet **Local / Web** — ĐÃ CÓ (xác minh 2026-07-11): UI filter "Nguồn: Local/Web" (fOrigin) + cây Nguồn scope-tree + CLI `brain search --origin local|web`.
- [ ] **Gemini** (`gemini-web`): Takeout lossy → browser-connector; sau GPT.
- [ ] **Claude.ai** (`claude-web`): export `chat_messages` phẳng hoặc browser-connector; sau GPT.
- [ ] Gộp khung `scan-web --platform <gemini|claude>` (khung ChatGPT đã có sẵn).

**Quyết định đã chốt (plan 07 §14):** origin = 1 cột · v2b browser-connector (v1 file fallback) · re-pull full replace idempotent · GPT trước · password KHÔNG nhập vào zemory · KHÔNG commit file data thật (PII).