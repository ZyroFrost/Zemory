<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory changelog add` -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-07-09] — chore(harness): renumber docs — 02_STRUCTURE after RULES; TODO→03, CHANGES→04

Đổi số file harness: cấu trúc lên #2 (đọc ngay sau RULES).

Thứ tự cũ 01_RULES/02_TODO/03_CHANGES/04_STRUCTURE → MỚI: 01_RULES · 02_STRUCTURE · 03_TODO · 04_CHANGES.
Lý do: STRUCTURE là nền tảng "how" (như RULES) → đọc trước; TODO/CHANGES là backlog/history → xuống dưới.

- Rename 6 file (git mv, docs/agent + docs-template/agent, giữ history).
- Code: STANDARD_AGENT (adopt) + STANDARD/mapping (migrate, +structure) + archive/cli/changelog paths (03_CHANGES→04_CHANGES) + structure cmd (→02_STRUCTURE).
- DB: doc.path của TODO (doc 111) → 03_TODO; refs trong RULES(#1058) + plan 09(§1-4) + TODO header(#1089) cập nhật.
- AGENTS §7/§8 + 02_STRUCTURE nội bộ (docs/ tree line thêm 02_STRUCTURE) cập nhật.
- Verify: build + 57 test PASS · docs render KHÔNG orphan · structure→02_STRUCTURE · validate 0 broken link · changelog add ghi đúng 04_CHANGES.

## [2026-07-08] — docs(structure): root config files = open catch-all (tool-forced, leave alone) — not an exhaustive list



## [2026-07-08] — docs(structure): sweep buried cross-cutting concerns — add errors/ logging/ audit/ + meta rule 'every concern must be explicit'

Quét + vá các concern cross-cutting còn NGẦM trong 04 (giống encryption/authz).

Audit 04 → phát hiện 0 lần nhắc: logging, logger, observability, metrics, error, feature-flag, health. Vá:
- §2 index: thêm **errors/** (error types + central handler) · **logging/** (logger + observability, log→data/logs, service→integrations) · **audit/** (audit-trail bảo mật, bảng→store).
- §3 routing: thêm lỗi/handler · logging/observability · audit-trail · feature-flag(→config) · health-check(→api).
- §4 luật: Logging/Observability · Audit trail (KHÁC log debug) · Error handling (không rải try/catch) · **META "Cross-cutting = RÕ": mọi concern xuyên suốt phải có place+type → audit không lọt; thiếu → BÁO thêm vào chuẩn.**

→ Chuẩn giờ liệt kê ĐỦ concern cross-cutting: authn/authz/encryption/secret/validation/error/logging/audit/rate-limit/cors/cache/i18n/feature-flag/health. Concern-không-trong-chuẩn = lọt (bài học từ encryption).

## [2026-07-08] — docs(structure): add authorization/phân quyền as first-class concern; record zemory's accept-plaintext + no-authz decisions

Thêm PHÂN QUYỀN/Authorization thành concern rõ ràng trong 04 (giống encryption — trước lấp ló trong auth/).

- §2 tree `auth/`: tách rõ AUTHENTICATION (là ai: login/jwt/oauth) vs AUTHORIZATION/PHÂN QUYỀN (được gì: role/permission/policy); enforce → middleware/.
- §3 routing: tách "authentication/login → auth/" và thêm "phân quyền/authorization (role·permission·policy) → auth/(định nghĩa) + middleware/(enforce) + store/(role-data) + config/(policy operator)".
- §4 convention: luật "Phân quyền/Authz" — app đa-user/đa-role PHẢI có; single-user/local ghi rõ "không phân quyền".

QUYẾT ĐỊNH zemory (ghi rõ theo luật mới):
- **Mã hóa at-rest: KHÔNG làm — chấp nhận plaintext.** Lý do: DB `~/.zemory/` local cá nhân, không share; redaction + OS file-perm đủ. SQLCipher để dành khi share/đóng gói phát hành.
- **Phân quyền: KHÔNG có — single-user/local.** zemory là tool cá nhân 1 người dùng, không đa-user → không cần role/permission.
- (Nên dọn 5 file .bak plaintext 400-935MB ở ~/.zemory/ — việc vận hành, không phải code.)

## [2026-07-08] — docs(structure): make encryption a first-class concern in 04 (place + type + rule) — was buried in vault/

Đưa MÃ HÓA thành concern rõ ràng trong 04_STRUCTURE (trước chỉ lấp ló trong vault/).

Gap phát hiện: user hỏi "sao refactor không lòi ra DB chưa mã hóa" — vì 04 không có place+type riêng cho encryption → audit/refactor không bắt được. Vá:
- §2 tree: `store/` ghi rõ "MÃ HÓA at-rest (SQLCipher) apply ở đây nếu data nhạy cảm"; `vault/` đổi thành "MÃ HÓA + KEY: derive key, encrypt/decrypt, credential vault".
- §3 routing: thêm dòng "mã hóa/encryption (at-rest DB · key · bundle) → vault/ + store/ + data/secrets/".
- §4 convention: thêm luật "Mã hóa/Encryption" — concern riêng, có place; **app có DATA NHẠY CẢM (chat/PII/log) NÊN mã hóa at-rest; nếu KHÔNG làm phải ghi rõ 'chấp nhận plaintext' để audit thấy, khỏi lọt**.

zemory hiện: DB `~/.zemory/global_memory.db` (935MB, PII chat) = PLAINTEXT, chưa có vault/store cipher → theo luật mới phải quyết: mã hóa hoặc ghi-rõ-chấp-nhận. (Slot vault/ + data/secrets/ đã định sẵn cho khi làm.)

## [2026-07-08] — docs: sync harness with built features — web-capture ChatGPT SHIPPED, savings per-feature, RULES backend/src+external

Đồng bộ docs với chức năng đã build (sau refactor + web-capture + savings per-feature).

- **02_TODO §Web-chat**: đánh dấu ChatGPT ĐÃ SHIP (scan-web `backend/src/brain/scanweb.ts`, schema origin v9, 859 hội thoại + Project chats); Gemini/Claude.ai + facet Local/Web = còn lại. Prototype → attic/web-capture.
- **plan 07** (§title/§5/§10/§15): trạng thái "prototype, chưa vào src" → "v1 SHIPPED ChatGPT"; prototype/ → attic/.
- **plan 10**: title + §3 → dashboard TRUNG THỰC per-FEATURE (% Recall/Digest + catalogue 11 feature n/a), path `backend/src/brain/savings.ts`.
- **01_RULES bất biến #2**: `src/` vs `deps/` → `backend/src/` vs `external/` + trỏ `04_STRUCTURE.md` (deps/ là khái niệm đã bỏ).
- GIỮ nguyên: `03_CHANGES` refs `src/` (lịch sử, đúng thời điểm — không viết lại); plan 00/04 dòng nguyên-tắc cũ (giá trị thấp).

## [2026-07-08] — docs(structure): add .claude/ + catch-all rule for .<tool>/ config folders (tool-forced root, leave alone)



## [2026-07-08] — refactor(structure): dogfood — move zemory itself to the 04_STRUCTURE standard (backend/ frontend/ attic/)

Dogfood: nắn CHÍNH zemory về chuẩn 04_STRUCTURE (git mv giữ history).

- `src/` → `backend/src/` · `test/` → `backend/test/` · `scripts/` → `backend/scripts/`.
- `prototype/web-capture/` → `attic/web-capture/` (nguồn cũ, đã bị brain/scanweb.ts thay).
- `assets/cockpit.png` → `frontend/assets/` (frontend = chỉ asset; UI code-gen vẫn ở backend/src/ui-page.ts).
- `share/` GIỮ root (bundle sync brain qua LFS — tracked cố ý; dồn data/ sẽ hỏng sync).
- Fix path: tsconfig rootDir/include → backend/src; package scripts (clean/lint/test/dev); eslint files; clean.mjs ../../dist; 15 test ../dist→../../dist.
- Fix 2 test migration cũ (hardcode version 6) → so với DB fresh (robust, khỏi vỡ lần bump schema sau).
- .gitignore: prototype→attic path + thêm data/. README + 04 trỏ đúng.
- dist/ + docs-template/ GIỮ root → bin, TEMPLATE_DIR không đổi.
- Verify: npm run check (typecheck+lint+57 test PASS) · zemory structure/validate (backend/frontend/docs/attic — hết cảnh báo thiếu frontend) · UI Cockpit + /savings chạy.

## [2026-07-08] — feat(harness): add 04_STRUCTURE.md — structure standard as its own agent doc; RULES/structure/validate/AGENTS point to it

Tách chuẩn cấu trúc ra file harness thứ 4: docs/agent/04_STRUCTURE.md.

- **04_STRUCTURE.md** (markdown source, như 01_RULES) = chuẩn cấu trúc ĐẦY ĐỦ: §1 nguyên tắc · §2 cây từng-dòng (marker ★BẮT BUỘC/[opt], 3 nhóm tracked/root/gitignore) · §3 routing "sửa gì→đâu" · §4 convention (gộp review GPT 9.8) · §5 phạm vi. Ship cho MỌI app.
- Wire vào STANDARD_AGENT (adopt.ts) → mọi `zemory init` scaffold kèm; không bị coi là non-standard.
- 01_RULES §Cấu trúc → rút còn CON TRỎ tới 04 (bất biến 4 + link).
- `zemory structure` → tóm tắt + trỏ 04. `zemory validate` + AGENTS §7/§8 → tham chiếu 04.
- plan 09 → rationale/quyết định + trỏ 04 (không lặp cây, tránh 2 bản lệch).
- Nội dung chuẩn (chốt qua nhiều vòng + 2 app mẫu SasinFlow/zemory): 1 tên/concern · store/=data-access(remote/cloud/nội-bộ DB) · store/queries gom SQL · config/=file operator (password_env) · vault · resources(prompts/sql/seed/packaging) · ai/+data/models · frontend Dialog 3-size · data/ chia con · version/packaging dùng slot cũ.

## [2026-07-07] — docs(harness): update refactor recipe (AGENTS §7/§8) to new standard — attic/data/.env/CI + test optional



## [2026-07-07] — feat(structure): audit standard — patch 5 gaps (.github/.env/shared-types/fe-test/migrations), demote test to optional

Chuẩn cấu trúc repo — vá 5 chỗ lọt + hạ test xuống optional (audit toàn diện).

- **Bắt buộc rút còn 4:** backend/(code) · frontend/ · docs/ · AGENTS.md. test/scripts/infra/migrations = OPTIONAL (trước ghi sai là bắt buộc).
- **TEST không ép:** thực tế chạy chính app = bàn test; folder test chỉ cho lõi logic dễ sai ngầm (như zemory 15 test). App UI thường → bỏ.
- **5 chỗ vá (app thật có nhưng chuẩn chưa xếp):**
  1. `.github/` (CI/CD) + `.vscode/`/`.idea/` (editor) → ROOT (tool ép, như Docker).
  2. `.env` = secret buộc root + gitignore (dotenv đọc ./.env); `.env.example` = tracked. Secret khác (.key/bundle/.db) → data/.
  3. type/contract dùng chung BE↔FE → backend/src/types/, FE import (KHÔNG đẻ shared/).
  4. test frontend/E2E → frontend/test/ (đối xứng backend/test/).
  5. backend/migrations/ (schema/DB migration — app log/db).
- **attic/ reframe:** backup nguồn cũ + SNAPSHOT bản tốt trước khi up server (rollback khi deploy hỏng).
- Ghi vào: plan doc 09 (§2 cây/§3 routing/§4 quyết định) + docs-template RULES §Cấu trúc + `zemory structure` + `zemory validate` (required = 4, test không ép, present[] thêm attic).

## [2026-07-07] — feat(ui): savings dashboard = % per feature column + TỔNG %; merge recall, add digest

Savings dashboard = bảng %: mỗi feature 1 CỘT, ô = **% token tiết kiệm**, cột CUỐI = TỔNG %.

- Ô = % = token tránh ÷ token nguồn (hover xem token thô). Trước đây để token thô — sai; giờ đúng là %.
- Gộp `search`+`show` → 1 feature **`recall`** (show là drill-down TRONG recall, bỏ log riêng, hết double-count). Migration v9 UPDATE các dòng cũ về 'recall'.
- Thêm feature **`digest`** đo thật: đọc digest gọn vs full session (logDigestRecall — baseline=messages, actual=digest_text).
- savingsByDay trả thêm baseByFeature + baseline mỗi dòng để UI tính %.
- Bảng "tất cả tính năng": liệt kê đủ 11 feature — đo được (Recall/Digest) có số; scoped/index/harness/capture/sync/webcap/rerank/ui = n/a (chất lượng / counterfactual / enabler), KHÔNG phịa.
- Verify: recall 99.88% · digest 99.23% · TỔNG 99.75%.

## [2026-07-07] — feat(ui): per-feature savings pivot — 1 column per feature (search/show) + TỔNG cột cuối

Savings đa-feature: mỗi feature 1 CỘT, cột CUỐI = TỔNG.

- `recall_savings` + cột **`feature`** (schema v8 + ALTER an toàn). Log per-feature: **`search`** (brain_search recall), **`show`** (brain_show / UI brain-context — drill 1 message vs cả session). Sẵn khung cho `plan`/`scoped`.
- `savingsByDay()` → **pivot**: `features[]` = các cột, mỗi ngày `byFeature{feature:avoided}`, cột cuối `avoided` = TỔNG; + grand total + recent (kèm feature).
- Dialog render **cột động theo features** + TỔNG cuối; recent list hiện feature mỗi dòng.
- TRUNG THỰC: chỉ feature phát sinh event đo được mới có cột (search/show). index/capture/UI **không đo được → KHÔNG có cột** (không phịa).
- Verify: 2 cột search+show, TỔNG = sum (search 3.9M + show 289k = 4.196.427).

## [2026-07-07] — tweak(ui): savings % per message row + 2-decimal % (99.xx% thay vì 100% phẳng)

Mỗi dòng "Recall gần đây — mỗi message" giờ có cột **%** (≈tránh/nguồn). Toàn bộ % làm tròn **2 số lẻ** (`toFixed(2)`) → lộ variation thật (vd 99.98% / 99.83%) thay vì luôn hiện 100% phẳng. Số tuyệt đối (token tránh) vẫn là chỉ số chính.

## [2026-07-07] — feat(ui): savings counts per message — MCP logging + per-recall list (query/hits) + %

Savings tính THEO TỪNG MESSAGE + đếm đủ mọi đường recall.

- **Log ở CẢ 3 đường recall chủ động:** CLI `brain search`, **MCP `brain_search`** (agent — TRƯỚC THIẾU nên agent recall không đếm), UI Search/Enter (commit=1). Type-ahead không log (tránh thổi phồng).
- **Per-message:** `recall_savings` thêm `query`+`hits` (schema v7 + ALTER an toàn cho DB cũ). `savingsByDay()` trả `recent[]` (25 recall gần nhất).
- **Dialog:** mục "Recall gần đây — mỗi message" (giờ · query · hits · ≈tránh) + cột **%** ở bảng ngày + tổng.
- **Verify:** 3 recall CLI → tổng 1→5, mỗi cái có query/hits/avoided đúng.
- Lưu ý: % ~100% vì baseline = cả session nguồn (cận trên); số có ý nghĩa là token tránh tuyệt đối.

## [2026-07-07] — feat(harness): complete slots — backend/test, backend/scripts, frontend/assets, attic/, data+secret

Bổ sung slot còn thiếu vào chuẩn cấu trúc (lộ ra khi audit zemory để refactor strict):

- **`backend/test/`** — test (own code). Slot BẮT BUỘC (mọi app có test) — trước thiếu hẳn.
- **`backend/scripts/`** — script dev/build của mình.
- **`frontend/assets/`** — asset (icon/logo/font/ảnh) thuộc frontend.
- **`attic/`** — backup nguồn cũ / code đã gỡ, tracked, giữ tham chiếu (optional).
- **`data/`** — thêm secret/key (`.key`, bundle `.enc`) cạnh log/cache; gitignore (bí mật).
- Cập nhật RULES §Cấu trúc repo (routing + bắt buộc/optional), `zemory structure`, plan 09 (tree + routing).
- Bắt buộc = `backend/` (code+test+scripts) + `frontend/` + `docs/` + `AGENTS.md`. Optional: external/ · data/ · attic/ · backend/infra/ · dist,build,.venv.

## [2026-07-07] — docs(harness): mark dist/build (+env/data) OPTIONAL — build output to run the app, only when built

Ghi rõ `dist/`+`build/` (và `.venv/`,`node_modules/`,`data/`) là **OPTIONAL** — output/generated, KHÔNG bắt buộc.

- `dist/`+`build/` = output **đóng gói để CHẠY/MỞ app**, CHỈ có khi app có bước build/package (app chạy thẳng thì không có). Do build sinh ra, gitignore, không commit.
- Bắt buộc chỉ là NGUỒN: `backend/ frontend/ docs/ AGENTS.md`. Optional: `external/ data/ backend/infra/ dist/ build/ .venv/`.
- Cập nhật: RULES §Cấu trúc repo, `zemory structure`, plan 09 (tree đánh dấu [optional] từng folder).

## [2026-07-07] — feat: data/ runtime-data slot in structure standard + % column in savings dialog

Thêm `data/` vào chuẩn cấu trúc + cột % vào dialog token-saved.

- **Chuẩn: `data/`** (root, GITIGNORE) = chỗ app ghi **runtime data/log** (.db log, cache, state lúc chạy). **OPTIONAL** (chỉ khi app có ghi data); app đóng gói có thể dùng OS app-data (`%LOCALAPPDATA%/<App>`) thay. Cập nhật: `docs-template/agent/01_RULES.md` §Cấu trúc repo, `zemory structure`, plan 09 (tree + routing), validate inventory.
- **Dialog "Token saved": thêm cột `%`** = ≈tránh / nguồn (hiệu suất recall, ước tính cận trên) — mỗi ngày + dòng tổng.

## [2026-07-07] — feat(ui): 'Token saved by recall' dialog — per-day, forward-only, honest estimate

Dialog "📊 Token saved by recall" — báo cáo THEO NGÀY, forward-only, ước tính trung thực (đúng ý user: đo trên recall thật).

- **UI**: nút 📊 Saved ở panel Global memory → dialog (size L) bảng theo ngày: `Ngày · Recalls · Nạp (X) · Nguồn (Y) · ≈ Tránh` + dòng TỔNG.
- **Data**: bảng `recall_savings` (db.ts) + `src/brain/savings.ts` (`logRecall`, `savingsByDay`). Endpoint `/savings`.
- **Log CHỦ ĐỘNG**: CLI `brain search` (mọi lần) + UI Search/Enter (`commit=1`). **KHÔNG log type-ahead** (onType → commit=0) để không thổi phồng. Forward-only (từ hôm bật; recall cũ không log lại).
- **Ước tính**: `actual` = token snippet trả về; `baseline` = full token của session(s) nguồn chứa hit; `≈ tránh = baseline − actual` (cận trên: giả định không-recall thì nạp cả nguồn). Token ≈ chars/4. Nhãn khắp nơi: hiệu suất recall, KHÔNG phải "saved $"/hoá đơn.
- **Nghiệm thu**: commit=1 → log 1 recall (nạp~519 / nguồn~731k / tránh~730k); commit=0 → không log; dialog + nút render đúng.

## [2026-07-07] — feat(ui): honest token panel — ~tokens captured + free-capture (no fake saved)

Panel token TRUNG THỰC (số thật, KHÔNG claim "saved") — đúng hướng "tương đối thật".

- Panel **Global memory** (UI): thêm tile **`~N tokens captured`** (≈chars/4 — đo brain giữ bao nhiêu context) + row **`Capture cost: 0 extra tokens · free`** (hook đọc file, không gọi model) + tooltip nói rõ KHÔNG có metric "saved" phịa (ledger đã bỏ, xem plan 10).
- `dashboardBrain().tokensEst = SUM(len(content))/4` (best-effort).
- Verify: `/brain-status` trả `tokensEst=22,997,560` (110k message); panel render đúng tile + row.
- plan 10 §3 cập nhật: đây là bản "tương đối thật" thay dashboard "saved %" (số phịa đã bỏ). Tùy chọn sau: retrieval ratio per-recall (ghi nhãn "retrieved", không "saved").

## [2026-07-07] — feat(harness): zemory structure in repo standard + routing; AGENTS §8 recipe refactor app về chuẩn

Gói flow "agent app-session đọc zemory → refactor app về chuẩn" thành mô tả chuẩn.

- **`zemory structure`**: giờ in **repo layout chuẩn + bảng routing** (target để conform: UI→frontend, logic/auth→backend, infra→backend/infra, code ngoài→external, output→root+gitignore) + required + tên co theo stack + con trỏ reconcile. Trước chỉ in layout docs harness (giờ vẫn giữ phần đó bên dưới).
- **`AGENTS.md §8`** — recipe end-to-end khi user kêu "đọc zemory, refactor theo chuẩn": (1) `zemory init` nếu chưa có harness → (2) `zemory structure` + `zemory validate` → (3) đọc RULES §Cấu trúc repo → (4) reconcile theo §7 (git mv giữ history, sửa import/entry, verify) → (5) hỏi trước khi đập lớn.
- Verify: `zemory init` project mới đã scaffold §8 + rule cấu trúc; `zemory structure` in đúng repo standard.

## [2026-07-07] — reconcile: align với việc bỏ ledger (session kia) — revise plan 10, gỡ ledger khỏi data-model

> 🔄 **Supersede:** chốt lại "dashboard token-savings (#528, 2026-07-06)" — sau khi merge session kia bỏ ledger: **KHÔNG làm dashboard**.

- **Merge `a72d83e`** (session kia): ledger → `attic/`, gỡ khỏi `db.ts`/`cli.ts`/`search.ts`/`ui`. Rebuild sau merge: typecheck + build sạch, **không còn tham chiếu ledger đứt gãy**.
- **plan 10 viết lại** = "vì sao KHÔNG có dashboard": ledger rỗng (no caller, luôn 0), `compress` out-of-scope, `recall` counterfactual = số phịa, không đọc được usage/cost. Framing thật: **free capture (0 token phụ trội)**, không marketing "measured savings". Kèm điều kiện để có metric thật nếu sau này cần.
- Gỡ dòng `ledger` khỏi ERD `02_data_model` (doc project hiện tại) cho khớp code.
- Lý do gốc giữ ở `attic/savings-removed.md`.

## [2026-07-07] — refine(harness): cấu trúc chuẩn — external/ + backend/infra + index-purpose; plan 09/10

> 🔄 **Supersede:** tinh chỉnh "chuẩn cấu trúc repo (#468, 2026-07-06)" — chốt tên folder + gom infra sau khi bàn kỹ.

- **`external/`** thay `vendor/` (tránh nhầm "nhà cung cấp dịch vụ"), cũng bỏ `deps/`. = folder repo ngoài clone về để **tham chiếu**.
- **infra KHÔNG top-level** → `backend/infra/` (hạ tầng = server-side = 1 nhánh backend). Root gọn còn `backend/ frontend/ docs/`.
- **Docker/compose/`.spec` để ROOT** (tool ép vị trí); **build output** (`dist/`,`build/`,`node_modules/`,`.venv/`) → root + `.gitignore`. Nguồn = ĐẦU VÀO (tracked), output = ĐẦU RA (gitignore) → repo tracked sạch, không "đẻ mớ folder".
- **Mục đích KÉP nói toạc trong rule:** bảng routing = INDEX điều hướng — agent trỏ THẲNG vào folder cần sửa, KHỎI grep/đọc cả repo (tiết kiệm token, bất biến #1).
- **validate**: structure check dùng `external/`, bỏ infra top-level.
- **Ghi plan:** `docs/plan/09_repo_structure.md` (spec cấu trúc đầy đủ) + `docs/plan/10_token_savings_dashboard.md` (ý tưởng dashboard đo token tiết kiệm — tái dùng `ledger`; 3 tầng đo-thật/ước-tính/không-quy-được; P1 surface UI, P2 instrument per-feature; KHÔNG phịa 1 con số giả-chính-xác).

## [2026-07-06] — feat(harness): chuẩn cấu trúc repo (backend/frontend/infra) — rule + routing + validate + AGENTS §7

Chuẩn **cấu trúc repo** dùng chung cho mọi app (quyết định: tầng khái niệm map theo stack; zemory **ship chuẩn + check lệch + hướng dẫn agent**, KHÔNG tự move file).

- **`docs-template/agent/01_RULES.md`** — section đầu "Cấu trúc repo — chuẩn & routing": bảng **sửa-gì-vào-đâu** để agent tự định tuyến (UI→`frontend/`, logic/API/**bảo mật-auth**→`backend/`, code ngoài tham chiếu→`vendor/`, config hạ tầng→`infra/`, tài liệu→`docs/`). Bắt buộc luôn có `backend/`+`docs/`+`AGENTS.md`; còn lại tạo **khi có nội dung** (không xài code ngoài → không `vendor/`). Bảo mật = code trong `backend/`, KHÔNG phải folder. Tên co theo stack (Python `backend/<pkg>`, Node `backend/src` hay `src/`).
- **`docs-template/AGENTS.md` §7** — reconcile cấu trúc: `git mv` giữ history, sửa import/entry rồi verify, **hỏi trước khi đập lớn**; zemory chỉ chỉ chỗ lệch, agent tự nắn.
- **`src/validate.ts`** — check advisory: liệt kê tầng có/thiếu, warn nếu code không ở `backend/`(`src/`) hoặc thiếu `AGENTS.md`. Chạy trên zemory: `structure: layers present — src/ · docs/`.

Bảo mật KHÔNG phải folder — làm rõ vì SasinInfra (repo khuôn mẫu) có vault là code trong backend + doc `06_security.md`, không phải thư mục.

## [2026-07-06] — feat(scan-web): kéo chat trong ChatGPT Project + nhãn project_root + Export-import + --delay/self-heal

Kéo được chat nằm trong **ChatGPT Project (gizmo)** + gắn nhãn `project_root`, và nhận cả bản **Export data**.

- **Bug gốc:** chat trong Project KHÔNG có ở `/backend-api/conversations` (list chỉ metadata, `mapping:null`) → scan-web bỏ sót (vd "Tạo ảnh động titan"). `total` của list còn bập bênh (6/101/760) làm dừng phân trang sớm.
- **Enumerate lại (`scanweb.ts`):** loose (`/conversations`, phân trang tới khi trang ngắn — bỏ `total`) **+ mọi Project** (`/gizmos/snorlax/sidebar` cursor → id project → `/gizmos/{id}/conversations` cursor). Node điều phối **từng eval ngắn** (không gộp 1 eval khổng lồ dễ vỡ context). Merge + dedupe.
- **Nhãn Project → `project_root`:** thêm `ParsedSession.project`; ingest set `project_root = project ?? cwd`. Adapter chatgpt đọc `gizmo_id`/`conversation_template_id` + map `_projects.json` (gizmo→tên); scan-web tự ghi map này mỗi lần chạy. Enumerate bỏ qua file `_*.json`.
- **Export data:** file bulk chỉ có `gizmo_id` (không tên) → adapter resolve tên qua `_projects.json` → import vẫn có nhãn đẹp. (Đường không đụng rate-limit; ChatGPT không có API trả toàn bộ nội dung 1 lần.)
- **Bền cho backfill lớn:** self-heal reconnect (mở lại browser khi tab đơ / port tắt), cờ `--delay <giây>` (`cli.ts`) giãn nhịp tránh 429.
- **Nghiệm thu:** enumerate 859 (760 loose + 99 project across 43 projects); titan + 18 project vào brain kèm `project_root`; 500/859 đã kéo, đang loop kéo nốt phần còn lại.

## [2026-07-06] — fix(scan-web): guard bước enumerate — retry + list-script phòng thủ, hết crash undefined.length

**Bug:** `zemory brain scan-web` crash `TypeError: Cannot read properties of undefined (reading 'length')` tại bước enumerate (`ids.length`, [scanweb.ts]) khi list-eval trả `undefined` — page vừa mở chưa sẵn sàng / 429 / execution context reload. B1 (reconnect) trước đó chỉ bọc fetch từng conversation, KHÔNG bọc bước enumerate → crash cả run (rất có thể là lỗi máy kia gặp lặp lại).

**Fix (`src/brain/scanweb.ts`):**
- `CHATGPT_LIST` phòng thủ: bọc `try/catch`, `if(!r.ok) break`, guard `j.items`/`j.total`, **luôn trả về MẢNG** (không bao giờ undefined/throw).
- Bước enumerate: vòng **retry 5 lần** (backoff 2.5→12.5s) + **reconnect** nếu socket chết + guard `Array.isArray`; hết retry vẫn rỗng → trả status `no-tab` (thông báo lịch sự "chờ tab load rồi chạy lại") thay vì crash. Account đã đăng nhập luôn có ≥1 hội thoại nên rỗng = "chưa sẵn sàng", không phải "hết việc".

**Nghiệm thu:** scan-web chạy lại OK — enumerated 57 · pulled 13 new · skipped 44 · failed 0; chatgpt-web 222→240 session (5602→5753 msg); data web 03/07 → 05/07 (đuổi kịp hôm nay). typecheck + build xanh.

## [2026-07-02] — Recency-aware recall — blend time-decay để ưu tiên tin mới+liên quan, khỏi lôi info cũ

> Fix chất lượng recall: agent hay lấy info CŨ vì xếp hạng thuần theo độ liên quan, bỏ qua thời gian.

- **Recency blend** (`src/brain/recency.ts` mới): điểm cuối = `(1/(1+vị_trí_liên_quan)) × hệ_số_tuổi`; hệ số = `0.5^(tuổi/half-life)` có **SÀN 0.15**. Áp SAU rrf/rerank nên chỉ *điều biến* thứ hạng liên quan (không phá điểm cross-encoder); đường cong `1/(1+i)` chặn item đuôi liên-quan-thấp nhảy top chỉ vì mới. → tin mới+liên quan lên đầu, tin cũ vẫn ra (xếp thấp hơn) — KHÔNG bỏ sót.
- Áp cho `search()` + `searchHybrid()`/`recall()` (dùng bởi CLI/MCP/UI) và **lane digest** (`searchDigests`, theo `meta.to` của phiên).
- Mặc định **BẬT**. Tắt: `--no-recency` (CLI) hoặc `ZEMORY_RECENCY=0`. Half-life chỉnh qua `ZEMORY_RECALL_HALFLIFE_DAYS` (mặc định 30 ngày).
- **Test**: +4 (recencyFactor mốc 1 / ~0.5 / floor / neutral / future-clamp · blendRecency đảo đúng + chặn đuôi · `search` recent-first · `--no-recency` giữ nguyên). `npm run check` xanh — 50 test.

## [2026-07-02] — Session digest (plan 06) — lớp tóm tắt dẫn xuất extractive cho recall rẻ token

> Build v1 tính năng plan 06 (session digest) sau grill 2026-07-02.

- **Schema v5** (`src/brain/db.ts`): bảng dẫn xuất `session_digest` (1 dòng/phiên) + FTS lane (word + trigram) + triggers; migration v4→v5 chỉ tạo bảng (additive, không đụng data cũ).
- **Generator extractive** (`src/brain/digest.ts`, KHÔNG LLM): trích `tasks[]` (câu user thật, mỗi việc 1 anchor `#id`) · `decisions[]` (câu ngôn-ngữ-tự-nhiên có dấu chốt, loại bỏ tool dump) · `errors[]` (chỉ `[tool_result]` có tín hiệu lỗi cấu trúc: exit code / not recognized / command not found / Traceback / ✗ — không match bare "error/lỗi") · `paths_touched[]` · `outcome` · `meta` (source/host/project/#msg/time). `source_sig = v<DIGEST_VERSION>:count:lastId:lastTs` → bump version (đổi logic) hoặc phiên mọc tin thì tự regen. Scope cứng theo `session_id` → KHÔNG lộn phiên; không sinh chữ → không bịa.
- **Tự regen** trong `brain scan`/ingest cho phiên có tin mới (hash-guarded, fail-open) + `zemory brain digest --all` backfill phiên cũ.
- **Recall R3**: `zemory brain search <q> --digest` (lane cấp phiên) + `zemory brain digest <session>` (mở 1 digest, drill xuống messages qua `#id`).
- **Test**: +5 test (build/anchor/idempotent/change-detect · không lộn phiên · backfill+search · empty no-op · migration v5). `npm run check` xanh — 46 test.
- **Nghiệm thu DB thật**: backup `.bak-20260702-premigrate-v5`; backfill **241/241** phiên; digest phiên PC (620 msg) và phiên lmstudio (cross-source) sạch, anchor mở đúng tin, `search --digest` trả đúng phiên, không lẫn.
- **Chưa làm (tầm nhìn)**: B agent-authored digest phủ lên khi recall (`kind=agent`); KHÔNG để zemory tự gọi LLM API.

## [2026-07-01] — Sync tự embed vector sau merge (recall đủ ngay, khỏi chạy embed tay)

> Nối tiếp scan-first: sau khi merge, sync tự build vector cho tin mới — khỏi chạy `brain embed` tay.

- **`syncDrive` embed sau merge** (`src/brain/share.ts`): trước phải chạy `zemory brain embed` riêng để phủ vector cho tin mới scan/merge. Nay sync tự embed **1 batch (≤500)** ở cuối → recall semantic (hybrid) đủ ngay sau sync cho increment thường ngày (vài chục–vài trăm tin/lần). Vector là **per-máy** (keyed theo message id cục bộ) nên KHÔNG đi trong bundle — mỗi máy tự embed phần của mình; đây là chỗ làm việc đó tự động.
- **Có trần để nút Sync không treo**: chỉ 1 batch/lần. Backlog lớn (một lần, ví dụ vừa import cả DB máy khác) thì `DriveSyncResult.embedded` + `vectorRemaining` báo còn lại + gợi ý `brain embed --all`. Cockpit/CLI hiện số vector vừa build.
- **Fail-open**: model không nạp được → embed 0, sync vẫn xong (recall rơi về FTS).
- Nghiệm thu: backlog tồn (2.706 tin, gồm dữ liệu merge từ PC nhà) đã embed dần về ~0 bằng `brain embed --all`; sync sau đó chỉ embed phần tăng thêm.

## [2026-07-01] — Sync scan-first: bấm Sync tự scan máy này trước khi export (không hụt tin khi chuyển máy)

> Nối tiếp entry Cockpit: đảm bảo chuyển máy không mất tin nhắn.

- **`syncDrive` scan TRƯỚC khi export** (`src/brain/share.ts`): trước đây bấm Sync chỉ export DB hiện tại → nếu chat mới nhất chưa ingest thì up thiếu. Nay `syncDrive` chạy `scan()` (ingest transcript máy này) ngay trước `exportBrainBundle`, rồi mới export + merge. Áp dụng cho cả nút Sync (cockpit) lẫn CLI `zemory brain sync`.
- **Báo số tin đã bắt**: `DriveSyncResult` thêm `scanned {newMessages, changedFiles}`; cockpit hiện *"✓ Scanned this machine (+N new msg captured) → wrote bundle …"*, CLI in *"↻ scanned … +N new message(s) captured before export"*. Nghiệm thu: sync thật bắt **+6 tin mới** trước khi export.
- **Giới hạn còn lại (đã dặn owner)**: câu đang gõ dở / turn chưa ghi ra file transcript thì scan chưa thấy → đợi turn xong rồi Sync; và đợi Google Drive upload xong (icon tray) mới mở ở máy kia.

## [2026-07-01] — Cockpit: fix cửa sổ không mở + thông báo Drive sync 2 pha + đổi tên/logo Zemory Cockpit

> Gộp các fix/UX của cockpit sau khi test trên laptop `SS01-IT-10`.

- **Fix cockpit UI không mở** (`src/ui.ts` `openWindow`): khi Edge/Chrome đã mở sẵn, `msedge --app=URL` bị gộp vào instance hiện có → **không bung cửa sổ app** (bấm shortcut không thấy gì, để lại nhiều server `dist/cli.js ui` treo). Thêm `--user-data-dir=~/.zemory/cockpit/browser` + `--no-first-run` + `--no-default-browser-check` → luôn mở instance riêng, cửa sổ hiện dù browser đang chạy.
- **Fix thông báo Drive sync sai ngữ nghĩa** (`src/ui-page.ts` `driveSync`): trước báo `✓ exported` ngay khi mới **ghi bundle xong ở local** — trong khi **Google Drive còn phải upload lên cloud** mới thật sự tới máy khác. Nay tách 2 pha rõ: *"đã ghi bundle (XXX) + merge N cái"* (xong) vs *"⏳ Google Drive đang upload lên cloud — chưa xong hẳn, xem icon Drive tray"*. (Tự động phát hiện Drive upload xong cần Google Drive API/OAuth — chủ đích không dùng, nên báo trung thực thay vì claim done.)
- **Đổi tên + logo app** (`src/ui-page.ts`): tiêu đề `zemory live memory cockpit` → **"Zemory Cockpit"** (khớp shortcut). Thêm logo SVG inline (node trung tâm nối 4 node ký ức trên tile gradient green brand — biểu trưng *global brain ← các mảnh session*) đặt ngay trước wordmark `zemory`, canh giữa, 38px; dùng chung làm favicon (tab/taskbar). Wordmark hạ 33→30px cho cân.
- **Vận hành — chạy `zemory` từ terminal**: repo chưa cài global nên gõ `zemory ui` báo "not recognized". Đã `npm link` (global shim trỏ vào repo, rebuild tự cập nhật) + thêm hàm `zemory` vào PowerShell profile (`Documents\WindowsPowerShell\profile.ps1` và `Documents\PowerShell\profile.ps1`) gọi `node.exe dist\cli.js` bằng đường dẫn tuyệt đối → mọi terminal mới gõ `zemory ...` chạy được, không phụ thuộc PATH cũ của terminal tích hợp VS Code.

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
