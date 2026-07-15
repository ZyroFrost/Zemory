<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory changelog add` -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-07-16] — docs(structure): them 3 slot AI (agents/tools/evals) vao tu dien chuan + chot RULES/CONSTITUTION ap chung app va non-app

Them 3 slot AI vao tu dien chuan cau truc (03_STRUCTURE, ca template lan ban zemory) ??? lap lo hong "AI project" ma ??6 tuyen bo phu nhung tu dien chua co ten:

- `agents/` ??? VONG LAP AGENT (planning/reasoning/state-machine dieu phoi LLM: guardrail ?? grade???rewrite ?? cap vong). Model-driven, KHAC pipelines/ (tat dinh). LLM client ??? ai/ ?? prompt ??? resources/prompts/.
- `tools/` ??? DINH NGHIA tool cho LLM/agent goi (schema + binding + shape ket qua). Chi khai bao + noi; THUC THI delegate slot san co (search/ ?? integrations/ ?? store/). KHAC scripts/(dev) ?? util/ ?? plugins/(ben-thu-3).
- `evals/` ??? DO CHAT LUONG model/agent/RAG tren corpus CO NHAN (recall@k ?? LLM-judge ?? golden set) + gate. KHAC test/ (pass/fail tat dinh).

Kem: ??4 routing +4 dong (vong lap agent ?? tool cho LLM goi ?? bo nho agent ??? khong slot rieng: chinh sach???agents/, persistence???store/, runtime???data/state/ ?? do chat luong RAG/agent) va ??5 convention +5 dong (trong do "Agent (LLM) ??? 4 cho RO" chong loi pho bien gop 1 folder "agent" ho lon; "agents/ ??? docs/agent/").

Nguon goc: so sanh voi post cau truc AI-agent co ban tren FB + repo production-agentic-rag-course (LangGraph) ??? bang chung concern co that trong domain ma chuan tuyen bo phu; zemory khong dung agents/ (hien phap dieu 6: khong tu goi LLM) nhung tu dien la cho CA estate.

CUNG CHOT (user 2026-07-16): 01_CONSTITUTION + 02_RULES ap CHUNG cho ca app lan non-app ??? KHONG tach profile; ghi ro trong header comment 2 file template.

Ghi nhan viec moi (TODO ??VIEC KE TIEP): SasinFlow UI 1 file HTML qua bu ??? nghien cuu phuong an phan tang chuan truoc (doi chieu tu dien frontend/ + convention UI-embed single-bin), trinh user duyet, KHOAN fix.

## [2026-07-15] — feat(harness): tang hien phap 01_CONSTITUTION per-app + renumber 01..05 + hien phap zemory 12 dieu

Them tang hien phap per-app cho harness (y tuong constitution.md cua GitHub Spec Kit) + renumber agent docs.

Phan nghia (user chot): constitution = luat TOI CAO rieng tung app (moi app mot ban, nhu moi quoc gia mot hien phap; chi user duoc sua) ?? RULES = luat lam viec CHUNG moi project (ship nguyen tu template, nhu cong uoc). Het canh luat rieng app di o nho dau RULES hoac nam rai trong plan.

Renumber (user chot "don len, khong dung 00"): 01_CONSTITUTION ?? 02_RULES ?? 03_STRUCTURE ?? 04_TODO ?? 05_CHANGES.

- Template: 01_CONSTITUTION.md scaffold moi; RULES viet lai thuan-generic (bo o "luat rieng cuoi file"); VA LUON bug template stale (noi dung con tro 02_TODO/03_CHANGES/04_STRUCTURE tu dot renumber 07-09 ??? moi project init tu do den nay nhan RULES tro file khong ton tai).
- adopt.ts: STANDARD_AGENT 5 file; LEGACY_RENAME phu CA 2 the he ten cu (gen-1 02_TODO/03_CHANGES ?? gen-2 01_RULES/02_STRUCTURE/03_TODO/04_CHANGES) ??? moi ten dich deu moi tinh nen rename khong collision. +1 test e2e chuoi legacy.
- migrate/status/validate/archive/cli/changelog + comments: theo ten moi. guessRole them constitution|invariant|principle|hien phap.
- UI cockpit: chip list harness chuan gio du 5 file (co 01_CONSTITUTION).
- AGENTS.md (root + template): buoc mo phien doc CONSTITUTION truoc RULES; muc 4 them luat "luat rieng cua app -> 01_CONSTITUTION, plan chi dan chieu".
- Chinh zemory: `zemory sync` tu rename + update doc.path; RULES ve generic (5 bat bien don sang hien phap; bo sung 4 muc template co ma zemory thieu ??? trong do co luat Dialog 3-size chinh zemory da implement o changelog #317 nhung chua nam trong RULES cua no); plan 09 cap nhat ref + ghi nhan ca 2 dot renumber.
- HIEN PHAP zemory (12 dieu): gom moi luat toi cao dang nam rai ??? token-first ?? ranh gioi minh/nguoi-ta + license/weight-runtime ?? 1-nguon-su-that + derived-rebuildable + KHONG dung sessions/messages goc ?? 1-capability-1-slot ?? tach tool khoi data ?? KHONG BAO GIO tu goi LLM/khong proxy API ?? local-only + privacy (redact-at-ingest, password khong qua zemory, khong commit PII) ?? recall on-demand + progressive disclosure ?? fail-open moi lop phu ?? capture 0-token khong vuot quyen host ?? sync additive + provenance khong lan ?? do trung thuc + gate truoc khi bat mac dinh. Moi dieu co dan chieu plan goc.

Gate: npm run check 83/83 ?? doctor xanh ?? validate chi con 2 warn lich su (changelog cu, giu theo luat khong-viet-lai-lich-su). Commit cf28037 (pha 1) + commit nay (hien phap 12 dieu + ghi so).

## [2026-07-14] — Plan 12: rebuild vector 256d Gemma-prompt + FTS external-content + VACUUM (DB 1141MB->595MB)

Plan 12 thi cong xong: rebuild vector index (EmbeddingGemma asymmetric query/document prompts + Matryoshka 256d) + FTS external-content migration (v12) + VACUUM.

Ket qua do that:
- DB: 1141.4MB -> 595.1MB (giai phong 546.3MB, ~48%).
- vec_chunks: 94384 vector (0 remaining), chunk message dai (>6000 ky tu) da duoc cua so hoa.
- Gate: npm run check 82/82 (backend/test). brain bench @256d: hybrid recall@3 100% (8/8), rerank 100% (8/8), FTS-only 0% (8/8) tren corpus paraphrase.
- Spot-check 3 query that (VN + EN) sau rebuild: khong regression, mot query (export bundle) cho ket qua lien quan hon han truoc.

Su co doc duong: lan rebuild dau crash giua chung do "database is locked" (mot tien trinh zemory khac ghi cung luc, vuot busy_timeout 5s). Khong mat du lieu (moi vector tu commit rieng) nhung CLI khong retry nen chet. Da va: retry-with-backoff (toi da 8 lan, 2s->60s) quanh moi pass cua `zemory brain embed --all`, chi bat dung loi busy.

Code moi: ZEMORY_EMBED_DIMS + sliceNormalize (embed.ts), vec_map chunk mapping + stored-dims-authoritative (vectors.ts), FTS external-content migration v11->v12 (db.ts), `zemory brain vacuum` (privacy.ts) + `zemory brain embed --rebuild`.

Xem docs/plan/12_vector_rebuild_256.md cho chi tiet thi cong; docs/plan/11_db_size_optimization.md buoc 2 (cat 768->256 tai cho) coi la superseded boi plan 12 (rebuild thang o 256d).

## [2026-07-12] — chore(session): chốt sổ 07-10→07-12 — chuẩn 2-profile, relocate, audit sạch, UI+i18n, embed tối ưu, 115k vector, Drive 1.1GB; bàn giao plan/11 chờ duyệt

Chốt sổ phiên 2026-07-10 → 07-12 — tổng kết MỌI THỨ đã làm (chi tiết từng mục ở changelog #950–#994) + bàn giao cho session sau.

**Đã hoàn thành trong phiên:**
- **Chuẩn cấu trúc**: Chuẩn v2 (2 trục layer/domain-first, +10 slot, luật KHÔNG-folder-rỗng) → **§7 chuẩn phụ NON-APP** (BI/data/docs/design, vd powerbi_sasinflow) + note 2-CHUẨN đầu doc → CLI nhận profile `app|non-app` trong `.harness.json` (validate/structure/init --non-app). Audit zemory vs chuẩn: ĐẠT.
- **Storage**: dời brain khỏi ổ C (con trỏ `~/.zemory/location.json`, verify + giữ .bak) · path DB động toàn hệ thống (15 file) · model cache theo brain-dir · dọn ổ C 5.78GB → 0.01MB · xóa bundle share cũ 424MB.
- **Audit fix sạch**: 2×P1 (digest lane lộ nội dung forget/redact · gitignore chặn bundle) + 8×P2/P3 (UI Host/Origin guard · changelog import merge · render salvage hand-edit schema v10 · CDP port động · WAL race relocate · con trỏ treo · CLI error sạch · thread truncated).
- **Gỡ savings dashboard** (counterfactual ~99.99% ảo, schema v11 DROP recall_savings) — giữ Recall/Digest/harness (giá trị lõi).
- **UI redesign**: modal ⚙ Cài đặt 6 tab · top-bar pill gọn · i18n VI/EN đầy đủ 2 chiều (~150 key + backend tr()) · Việt hóa nhất quán.
- **Embed tối ưu 3 nấc, 0% mất chất lượng**: skip tool-call (−32%) · dedup `vec_hash` copy-vector bit-for-bit (−21% phần còn lại; 20.9% msg/ngày là trùng exact) · batch 16. Backlog 42k XONG: **115.047 vector, remaining 0, bench hybrid recall@3 = 100% (8/8)**.
- **Sync**: bundle SS01-IT-10 **1.1GB đã lên Drive** (scan +9.767 msg mới trước export); GitHub push đủ (tới `ee278f5`).
- **Memory rules mới**: preserve-source (tối ưu chỉ đụng lớp dẫn xuất) · design authority.

**Bàn giao session sau (đã ghi 03_TODO ⭐):** ① đề xuất giảm ~50% DB **CHỜ DUYỆT** — đọc `docs/plan/11_db_size_optimization.md` (có luôn câu trả lời "giảm cái gì mà nhiều vậy": 87% DB là INDEX dẫn xuất, text gốc chỉ 13%) ② đo tốc độ embed/ngày thật (`brain embed --all` + bấm giờ) ③ tooltip i18n (nhỏ).

## [2026-07-12] — perf(embed): dedup nội dung trùng — copy vector từ lần đầu, 0% mất chất lượng (vec_hash)

Lọc trùng lặp khi embed — ý user: "cho agent lọc lại message, nhưng CHỈ cái bị trùng lặp/ghi lặp lại". Đo thật: **20,9% message mới mỗi ngày là trùng exact** (rules/recall card inject lại mỗi phiên, file đọc lặp).

Thiết kế theo đúng luật "không mất sess gốc" ([memory](zemory-optimize-preserve-source)): dedup ở TẦNG DẪN XUẤT, message gốc không đụng một dòng.

- **`vec_hash`** (sha1(content-slice) → rowid chuẩn, bảng dẫn xuất rebuild được) trong [vectors.ts](../../backend/src/brain/vectors.ts): gặp nội dung đã embed → **COPY vector** từ lần đầu thay vì gọi model. Nội dung giống hệt ⇒ model cho ra vector giống hệt ⇒ copy = **0% mất chất lượng** (test chứng minh bit-for-bit). Xử cả trùng trong-cùng-run (twin chờ canonical xong rồi copy) lẫn xuyên-run (tra vec_hash).
- Bảng hash fill lazy từ giờ (không backfill nặng) — hội tụ trong vài ngày; canonical bị `forget` → fallback embed lại bình thường (fail-open).
- `EmbedPendingResult.deduped` báo số vector copy mỗi pass.

Cộng dồn 3 tối ưu embed (skip tool-call −32% · dedup −21% phần còn lại · batch 16): khối lượng model-call hằng ngày ~2.800 → **~1.170 msg/ngày**, kỳ vọng ~10–15 phút chạy nền. +1 test (70/70 xanh).

## [2026-07-11] — perf(embed): bỏ embed tool-call (FTS đã phủ) + batch 16 — cắt ~1/3 khối lượng embed/ngày

Cắt thời gian embed hằng ngày — user chỉ đúng: brain nhận ~2.800 msg/ngày, tốc độ cũ ~60 msg/phút ⇒ ~46 phút embed/ngày là KHÔNG chấp nhận được cho công cụ dùng hằng ngày.

Đo cơ cấu 14 ngày: 32% message là TOOL-CALL (lệnh + args, dài, semantic ~0) — FTS keyword đã phủ đầy đủ. Fix trong [vectors.ts](../../backend/src/brain/vectors.ts):
- **Mặc định KHÔNG embed tool-call** (`tool_name IS NOT NULL`): embedPending + vectorRemaining cùng filter; env `ZEMORY_EMBED_TOOLS=1` bật lại nếu cần. Backlog còn lại giảm ngay 8.953 → 7.626; khối lượng hằng ngày giảm ~1/3.
- **batchSize mặc định 4 → 16**: batching ONNX tận dụng CPU tốt hơn.
- Vector tool-call ĐÃ embed từ trước giữ nguyên (vô hại, vẫn giúp).

Ước tính sau fix: embed hằng ngày ~10–20 phút chạy NỀN (thay vì 46) và sẽ đo lại thực tế; recall không mất gì — tool-output vẫn tìm được qua FTS + digest. Nếu cần nhanh hơn nữa: `ZEMORY_EMBED_DTYPE=q4` (~30-50%) hoặc Matryoshka 256d (việc sau, TODO plan 05).

69/69 test xanh.

## [2026-07-11] — feat(cli): profile app/non-app trong .harness.json — validate/structure/init nhận chuẩn §7

Nối tầng CLI vào chuẩn 2-profile — trước đó chỉ sửa tầng markdown (§7), còn `validate`/`structure` vẫn hardcode chuẩn app (bắt backend/+frontend/, cảnh báo thiếu với repo BI/data).

- **Field mới `profile` trong docs/.harness.json** ([types.ts](../../backend/src/core/types.ts), [config.ts](../../backend/src/core/config.ts)): `"app"` (mặc định, §1–6) | `"non-app"` (§7). Normalize lúc load, project cũ không cần đổi gì.
- **`zemory validate` theo profile** ([validate.ts](../../backend/src/validate.ts)): non-app → check docs/ + AGENTS.md + ≥1 deliverable (reports/|models/|content/|design/), KHÔNG đòi backend/frontend; app → như cũ + thông minh hơn: repo không có code nhưng CÓ deliverable → gợi ý set `"profile": "non-app"` thay vì cằn nhằn sai; thiếu frontend chỉ cảnh báo khi CÓ code (là app thật).
- **`zemory structure`** in cả 2 chuẩn ngay đầu (① APP §1–6 · ② NON-APP §7 + required của từng cái) — agent đọc CLI cũng thấy như đọc .md.
- **`zemory init --non-app`**: scaffold harness + ghi luôn `"profile": "non-app"` — dùng cho powerbi_sasinflow và các repo deliverable.

+3 test (app-default cảnh báo đúng · non-app check deliverable & im về backend/frontend · hint đổi profile). 69/69 xanh; validate repo này vẫn sạch.

## [2026-07-11] — docs(structure): §7 chuẩn phụ NON-APP (BI/data/docs/design) + note 2-chuẩn đầu doc

Thêm chuẩn cấu trúc THỨ HAI cho project NON-APP — lấp vùng trắng "ngoài phạm vi" cho các repo kiểu `powerbi_sasinflow`.

- **§7 mới trong [02_STRUCTURE](../agent/02_STRUCTURE.md)** (cả docs-template lẫn docs của zemory): chuẩn phụ cho project là SẢN PHẨM/TÀI SẢN (BI/report Power BI·Tableau, data/analytics dbt, docs-only, design). Bắt buộc = **3 vai trò**: `docs/` · `AGENTS.md` · ≥1 deliverable (`reports/`|`models/`|`content/`|`design/`) — không backend/frontend. Từ điển slot phụ: sources/ measures/ queries/ pipelines/ notebooks/ fixtures/ assets/ scripts/ config/ attic/ (+ data/ exports/ .env gitignore). Kèm ví dụ áp powerbi_sasinflow + bảng convention (LFS cho .pbix/.fig, data-thật vs fixtures, dictionary.md).
- **Note "CÓ 2 CHUẨN" ngay đầu doc** để agent khác đọc là biết: ① APP (code chạy) → §1–6 · ② NON-APP (deliverable) → §7; xác định loại project trước, áp đúng chuẩn. §6 phạm-vi cập nhật tương ứng (non-app hết bị "ngoài phạm vi").
- **Harness giữ Y HỆT app** — docs/agent/* + plan/ + .harness.json, cùng engine + lệnh zemory; chỉ thêm `docs/dictionary.md` [opt] cho BI/data. Nghĩa là zemory không cần biết project là app hay non-app.
- Ghi quyết định vào [plan/09 §4](../plan/09_repo_structure.md); DB đã sync (doc 8 section).

## [2026-07-11] — feat(ui): i18n hoàn chỉnh VI/EN — t() + dict đầy đủ + backend localize, không sót chuỗi

i18n hoàn chỉnh cả 2 ngôn ngữ — không sót chuỗi nào trong VI lẫn EN.

- **`t(key)` + từ điển đầy đủ** ([ui-page.ts](../../backend/src/ui-page.ts)): ~150 key vi/en phủ mọi chuỗi JS-render (rail harness, panel bộ nhớ, nguồn/scope, quét, Drive sync, kết quả tìm, xem trước, session viewer, doc viewer, sort, act). Trước đây chỉ chrome tĩnh (data-i18n) flip; nay toàn bộ JS cũng flip.
- **applyLang re-render**: đổi ngôn ngữ re-render các view đã cache (renderStatus/renderBrainSummary/renderHits/sort) + hỗ trợ `data-i18n-ph` cho placeholder + option select; `setLangUI` refetch `/status` + `/brain-status` để lấy chuỗi backend đã localize.
- **Backend localize theo `getLang()`** ([settings.ts](../../backend/src/settings.ts) `tr()`, [status.ts](../../backend/src/status.ts), [checks.ts](../../backend/src/checks.ts)): feature label/help, setup/plan detail, mọi detail của health-check giờ ra đúng ngôn ngữ (áp cho cả doctor CLI).
- **Sửa bug**: biến local `const t = brain.totals` trong `renderBrainSummary` che mất hàm `t()` → panel bộ nhớ báo "t is not a function"; đổi tên local thành `tot`.

Verify: 66/66 test; chụp cả VI lẫn EN — panel bộ nhớ, placeholder, mọi filter/select, rail, Drive/sync, kết quả tìm đều flip sạch, không còn chữ lẫn ngôn ngữ ở cả hai chiều.

## [2026-07-11] — feat(ui): cockpit gọn lại — nút Cài đặt tập trung + i18n VI/EN + Việt hoá nhất quán

Làm lại cockpit theo 3 điểm user nêu: chưa có nút Cài đặt thật, ngôn ngữ Anh–Việt lẫn lộn, bố cục quá tải.

- **Nút Cài đặt thật** ([ui-page.ts](../../backend/src/ui-page.ts)): một modal 6 tab (Ngôn ngữ · Nơi lưu · Drive · Tìm kiếm · Kiểm tra · Docs harness) gom mọi cấu hình vốn rải khắp nơi. Di chuyển (không viết lại) các control đã chạy: ô Drive + Link/Sync, ô Nơi lưu + Dời, Capability checks + Re-test, menu Sync/Fresh docs — giữ nguyên id + hàm nên wiring không đứt.
- **Dọn top-bar**: bỏ 2 ô nhập đường dẫn + Link/Sync/Dời; còn lại pill trạng thái (Máy/CLI/🗄 nơi lưu/☁ drive) + một nút ⚙ Cài đặt + làm mới. Bỏ panel Capability checks khỏi rail trái (đưa vào Cài đặt → Kiểm tra).
- **Thống nhất tiếng Việt + nút VI/EN**: i18n nhẹ (`T` dict vi/en + `applyLang` quét `[data-i18n]`), mặc định tiếng Việt, giữ thuật ngữ kỹ thuật (Recall/Hybrid/Rerank/FTS5/vector/BM25). Toggle trong Cài đặt → Ngôn ngữ, lưu vào config.json qua `/set-lang`. Việt hoá cả chrome JS-render (rail harness, panel bộ nhớ, nguồn, quét).
- **Backend** ([settings.ts](../../backend/src/settings.ts), [ui.ts](../../backend/src/ui.ts)): thêm `getLang/setLang` (mặc định 'vi'), endpoint `POST /set-lang`, field `lang` trong `dashboardBrain()`.
- Sửa bug sẵn: `<\div>` → `</div>` ở khối scope-chips.

Verify: 66/66 test; build sạch; UI thật chụp lại (top-bar gọn, modal Cài đặt 6 tab, panel bộ nhớ + rail tiếng Việt, pill 'đã dời · 938 MB' / '✓ 2 bundle').

## [2026-07-11] — chore(savings): gỡ hẳn dashboard/ledger 'token saved' (counterfactual ảo) — giữ Recall/Digest/harness

Gỡ hẳn lớp "đo token tiết kiệm" — số nó khoe là counterfactual ảo, luôn ~99.99%.

Kiểm tra thật trên DB: cơ chế CHẠY (11 event ghi, report + dialog render), nhưng con số vô nghĩa — baseline = tổng token của CẢ session mà hit chạm tới (test: 1,953,137 → 241 token = "tiết kiệm 99.99%"), một thứ không ai nạp thay cho 1 search. Feature đo được thật duy nhất (compress) đã out-of-scope từ trước. Chính plan/10 §2 đã tự kết luận "counterfactual → dashboard trưng số giả → KHÔNG làm" rồi §3 lại build.

Đã gỡ:
- `backend/src/brain/savings.ts` (cả module) + bảng `recall_savings` (schema v11 DROP TABLE).
- Mọi call `logRecall`/`logDigestRecall` (cli.ts recall + digest, mcp.ts, ui.ts commit).
- Endpoint `/savings` + dialog "📊 Saved" trong UI (nút + `openSavings`/`renderSavings`/`featureList`/`pivot*`/`recentList`).
- Migration v7–v9 (chỉ reshape recall_savings) nay bọc `hasTable` → no-op nếu bảng đã biến mất.

GIỮ nguyên (feature THẬT, không đụng): Recall (semantic search), Digest, docs harness, Global memory. GIỮ tile trung thực `~N token đã thu` (≈chars/4) + `Capture cost: 0 · free`.

Verify: 66/66 test; DB thật migrate v10→v11, recall_savings đã drop; embedded UI JS compile sạch, 0 dấu vết savings.

## [2026-07-10] — fix(app): quét sạch mọi finding P2/P3 — UI guard, import merge, render salvage, CDP port, WAL race, con trỏ treo, CLI error, thread cap

Dọn nốt toàn bộ finding P2/P3 còn treo của đợt audit — app không còn finding mở.

- **UI chống DNS-rebinding/CSRF** ([ui.ts](../../backend/src/ui.ts)): mọi request phải có `Host` loopback và (nếu có) `Origin` loopback, sai → 403. Verify sống bằng curl: Host `evil.com` → 403, Origin lạ POST `/relocate` → 403, trang cockpit → 200.
- **`changelog import` hết phá dữ liệu** ([changelog.ts](../../backend/src/docs/changelog.ts)): mặc định MERGE — chỉ thêm entry chưa có (khớp date+title), giữ nguyên id/`archived`/`supersedes`; wipe-reseed phải gọi `--replace` tường minh.
- **Render mirror không nuốt hand-edit** ([plan.ts](../../backend/src/docs/plan.ts), schema v10 `doc.rendered_hash`): render lưu sha1; lần render sau nếu file trên đĩa lệch hash (bị sửa tay) → cứu nguyên bản ra `.hand-edited-<ts>.bak` + cảnh báo, rồi mới ghi đè. `renderChangelog` cũng cứu file không có header GENERATED.
- **scan-web hết kẹt port 9222** ([scanweb.ts](../../backend/src/brain/scanweb.ts)): nếu 9222 không có CDP mà TCP lại bận (process khác chiếm) → tự lấy port rảnh cho phiên đó thay vì launch browser fail câm.
- **relocate hết WAL-race** ([relocate.ts](../../backend/src/brain/relocate.ts)): checkpoint → `BEGIN IMMEDIATE` (chặn mọi writer) → xác nhận WAL rỗng → count + copy trong lock; writer chen ngang → retry, 3 lần fail → báo "close other zemory processes".
- **Con trỏ treo hết tạo brain rỗng âm thầm** ([db.ts](../../backend/src/brain/db.ts)): `location.json` trỏ folder không có DB trong khi `~/.zemory` vẫn còn DB cũ → cảnh báo to 1 lần kèm cách sửa.
- **CLI hết nổ UnhandledRejection** ([cli.ts](../../backend/src/cli.ts)): bọc toàn bộ dispatch — mọi lỗi in 1 dòng `zemory <cmd>: <message>` + exit 1 (verify: `brain export` path không tồn tại).
- **Thread 5000-msg hết cắt âm thầm** ([search.ts](../../backend/src/brain/search.ts)): `getSessionThread` trả cờ `truncated`, dialog UI hiện "(hiển thị 5000 đầu — phiên còn dài hơn)".

**Verify:** 66/66 test (thêm docs-guard.test.mjs: merge-giữ-archived + salvage hand-edit); DB thật migrate v10 sạch; guard UI test sống 4/4.

## [2026-07-10] — fix(privacy+storage): bịt lỗ digest lane của forget/redact + path DB động toàn hệ thống + mở gitignore cho share bundle

Fix 3 finding của đợt audit sau khi dời DB sang D:.

- **P1 privacy — forget/redact bỏ sót `session_digest`** ([privacy.ts](../../backend/src/brain/privacy.ts)): digest TRÍCH NGUYÊN VĂN message (tasks/errors/digest_text) và được index FTS riêng → nội dung đã `forget` vẫn tìm được qua `search --digest`, secret đã `redact` vẫn nằm trong digest. Nay: `forget --force` xóa luôn digest của các session bị đụng (trigger dọn 2 bảng FTS; digest rebuild từ message còn lại), `redact` scrub cả 5 cột text của digest (redact chuỗi JSON an toàn vì mọi pattern chỉ khớp `[A-Za-z0-9_.-]`). CLI in thêm số digest. +2 test.
- **P1 git — bundle share không bao giờ vào git**: `.gitignore` có `*.zemory.enc` chặn chính `share/global_memory.zemory.enc` mà share/README mô tả là "tracked by Git LFS" → máy khác clone không restore được. Thêm exception `!share/global_memory.zemory.enc`.
- **P2 — path DB đóng băng lúc load module**: 15 file dùng const `BRAIN_DB`/`BRAIN_DIR` (docs/plan, changelog, digest, search, scope, savings, settings, scanweb, ui, archive, recall, share, vectors, embed, relocate) → server `zemory ui` đang chạy vẫn đọc/ghi vị trí CŨ sau khi relocate. Nay mọi default resolve qua `currentBrainDb()`/`currentBrainDir()` (đọc con trỏ mỗi lần gọi); `settings.ts` đổi `CONFIG_PATH` const thành hàm để config.json cũng đi theo.

**Verify:** 64/64 test xanh; trên DB thật `brain redact` dry-run quét 112.400 msg + 1.131 digest (0 secret); `brain where` vẫn trỏ D:.

## [2026-07-10] — fix(brain): model cache + openBrain theo vị trí đã dời; relocate mang model theo

Hoàn thiện tính năng dời-nơi-lưu để **thật sự đưa dữ liệu nặng khỏi ổ hệ thống**, phát hiện khi dời DB thật (938MB) mà ổ C vẫn còn ~6GB.

- **embed model cache theo BRAIN_DIR** ([embed.ts](../../backend/src/brain/embed.ts)): trước dùng `homedir()` cố định → 598MB model kẹt ở C sau relocate và phình thêm nếu đổi model. Nay `cacheDir = <brain-dir>/models` (env `ZEMORY_MODEL_DIR` vẫn override) → model đi theo DB.
- **openBrain đọc con trỏ ĐỘNG** ([db.ts](../../backend/src/brain/db.ts) `currentBrainDb()`): default resolve lại `location.json` mỗi lần mở → tiến trình dài (server `zemory ui`) nhận relocate mà không cần restart cho mọi thao tác đi qua `openBrain`.
- **relocate mang model theo** ([relocate.ts](../../backend/src/brain/relocate.ts)): sau khi dời DB, best-effort `cpSync` `models/` sang chỗ mới (non-critical; re-cache nếu lỗi).

**Đã thực thi trên máy này:** dời DB `C:\…\.zemory` → `D:\Zyro\Tool\Zemory\data` (937.8MB, 112.400 msg verified) + move model (598MB). `brain where` xác nhận trỏ D.

**Còn lại (chưa tự động):** một số hàm (`vectors`/`share`/`privacy`) vẫn lấy default `BRAIN_DB` const → trong 1 tiến trình đang chạy chỉ đọc đúng vị trí mới sau khi khởi động lại (CLI mới thì luôn đúng). Backup DB cũ + browser profile cũ ở C là rác lịch sử, xoá tay để giải phóng.

**Verify:** `npm run check` xanh (62 test).

## [2026-07-10] — feat(brain): dời nơi lưu DB off ổ C — con trỏ location.json + brain relocate + UI 'Nơi lưu'

Cho phép **dời DB brain KHỎI ổ hệ thống** (ổ C phình không kiểm soát — hiện đã ~938 MB) sang folder local bất kỳ, vd `data/` trong repo (gitignore). Đặt được ngay chỗ Drive-sync trong cockpit, kèm tự-dời an toàn.

**Vì sao:** `global_memory.db` lớn dần vô hạn theo số session; nằm ở `~/.zemory` trên ổ C làm đầy ổ. Trước đây chỉ đổi được qua env `GLOBAL_MEMORY_DB` (ẩn, không persist tiện). Nay có setting + script dời.

**Cơ chế (an toàn, khó-đảo nên làm kỹ):**
- **Con trỏ bootstrap** `~/.zemory/location.json` `{dataDir}` — CỐ ĐỊNH ở home (không thể để cạnh DB: gà–trứng). Thứ tự: env `GLOBAL_MEMORY_DB` > pointer > `~/.zemory` default. Mọi phụ trợ (`config.json`/`browser`/`imports`/`backups`) bám `BRAIN_DIR` nên dời theo cụm. Default GIỮ nguyên `~/.zemory` (không phá máy đang chạy).
- **`brain/relocate.ts`** — `relocateBrain()`: checkpoint WAL → copy `.db`(+`config.json`) → **verify** (`PRAGMA integrity_check` + đếm message khớp) → chỉ khi OK mới đổi con trỏ → GIỮ bản cũ đổi tên `.relocated-*.bak` (không xoá, rollback được). Chặn folder cloud-sync (Google Drive/OneDrive/Dropbox…) trừ `--force` (WAL sống trên Drive = corrupt).
- **CLI**: `zemory brain where` (xem DB ở đâu + size + con trỏ) · `zemory brain relocate <dir> [--force]`.
- **UI cockpit**: ô **"Nơi lưu (máy)"** ngay cạnh "Drive folder" + nút **⇄ Dời**; xác nhận → "đang dời…" → báo bản cũ giữ ở đâu.

**Chuẩn:** cơ chế thuộc data-access domain brain → `backend/src/brain/relocate.ts` (KHÔNG dùng slot `storage/`=blob để tránh lẫn tên). `02_STRUCTURE` thêm routing "nơi lưu DB local + dời off ổ hệ thống" + convention "Nơi lưu DB (di dời)".

**Verify:** `npm run check` xanh (**62 test**, +5 relocate: move+verify+giữ-bak, chặn cloud, pointer-only khi chưa có DB, env-pin chặn, storageInfo). Embedded UI JS parse OK. `brain where` trên máy thật đọc đúng (C:\…\.zemory, 937.8 MB). Chưa tự dời DB thật — user tự bấm khi muốn.

## [2026-07-10] — feat(structure): chuẩn v2 — 2 trục layer/domain-first + phủ đủ slot + luật không-folder-rỗng

Nâng chuẩn cấu trúc (`docs/agent/02_STRUCTURE.md` + `docs-template/`) lên **v2** để phủ đủ mọi project — cái gì cũng có slot gắn vào, không lệch/lẫn, và **KHÔNG đẻ folder rỗng**.

**Vì sao:** audit chuẩn cũ thấy 1 lỗ hổng gốc + 4 vùng hở — chuẩn chỉ mô tả *layer-first* nhưng chính zemory tổ chức *domain-first* (`brain/`/`docs/`/`core/`), nên mọi app nhiều-domain sẽ tự lệch; thiếu nhà cho code dùng chung BE↔FE (chỉ có `types/` type-only), thiếu tên slot cho cache/blob/notifications/search/pipeline/contracts/plugins/codegen; frontend thiếu `util/`/`types/`; và ★ bắt buộc `backend/run.*` khiến chính zemory (Node-CLI, bin ở root) non-conformant.

**Đã làm:**
- **§2 mới — 2 trục sắp xếp:** LAYER-FIRST (slot phẳng dưới `src/`) vs DOMAIN-FIRST (`src/<domain>/` lồng lại slot); cross-cutting luôn ở `src/` gốc. Công nhận cách zemory đang tổ chức → không cần đập cấu trúc.
- **Cây gom theo 6 dải vai trò** (biên-vào · biên-ra · xử-lý · nền-tảng · chia-sẻ · domain) — dễ quét.
- **+10 slot:** `cache/` `storage/` `notifications/` `search/` `pipelines/` `core/` `shared/`(nâng từ `types/`, thêm runtime dùng chung) `contracts/` `plugins/` `generated/`; frontend `+util/ +types/`.
- **Luật KHÔNG folder rỗng** nêu nổi bật: INDEX = từ điển tên để TRA, tạo folder chỉ khi có concern thật (app điển hình 4–10 slot).
- **Sửa ★:** entry = `run.*` HOẶC manifest `bin`/`main`; manifest ở root HOẶC `backend/` → zemory (bin root) nay ĐẠT ★. Thêm convention **UI-embed single-binary** (giữ `ui-page.ts` ở backend, ghi rõ).
- **plan 09** cập nhật quyết định "Chuẩn v2" + sửa cross-ref số mục (§2→§3 cây, §3→§4 routing, §4→§5 convention).
- **README** sửa 2 ref sai: ảnh `assets/`→`frontend/assets/cockpit.png`, `docs/agent/04_STRUCTURE.md`→`02_STRUCTURE.md`.

**Conformance zemory:** domain-first hợp lệ → `brain/`/`docs/`/`core/` GIỮ NGUYÊN, không di chuyển file, không tạo folder mới. `npm run check` xanh (57 test), `zemory validate`/`doctor` xanh.

## [2026-07-10] — docs: update every idea/plan doc — fix 01/00 stale refs, expand plan 09 with all later structure decisions, plan 04 status



## [2026-07-10] — docs(structure): deploy backup is BIDIRECTIONAL — verify VM backup vs local attic/ before overwrite, resync after


