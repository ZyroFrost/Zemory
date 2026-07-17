# Cấu trúc repo chuẩn — bộ khung dùng chung cho mọi project

> Chuẩn folder zemory **ship + thực thi** cho MỌI project. Mô tả theo **VAI TRÒ**, không khóa framework.
> **CÓ 2 CHUẨN — xác định loại project TRƯỚC rồi áp đúng chuẩn:**
> ① **APP** (có code chạy: UI/server/CLI) → **§1–6**. ② **NON-APP** (sản phẩm/tài sản: BI/report, data, docs-only, design — vd `powerbi_sasinflow`) → **§7**. Cả hai dùng CHUNG harness `docs/` + `AGENTS.md`.
> Đọc TRƯỚC khi sửa: cần gì → §4 (app) / §7 (non-app) trỏ thẳng slot. Nắn project về chuẩn: xem `AGENTS.md §Reconcile`.

## 1. Nguyên tắc
- Mô tả theo **VAI TRÒ (role)**, KHÔNG khóa framework → áp Web / Desktop / CLI / AI / Data / Monorepo mà gần như không đổi cấu trúc.
- **Chuẩn RIÊNG của mình:** mỗi concern **1 TÊN duy nhất**; chỉ khi framework ÉP CỨNG (Next `pages/`, Django `models/`,`migrations/`, Rails `app/models`) mới theo tên nó — như Docker ép `Dockerfile` ở root.
- **Mục đích KÉP:** cấu trúc gọn + **INDEX điều hướng** — agent đọc rule là trỏ THẲNG folder cần sửa, KHỎI grep cả repo (nhanh + tiết kiệm token, đúng bất biến #1).
- **INDEX = TỪ ĐIỂN TÊN, KHÔNG phải danh sách folder phải tạo.** ~40 slot dưới đây là *tên có sẵn để tra cứu*; **CHỈ tạo folder khi CÓ concern THẬT** — **TUYỆT ĐỐI KHÔNG tạo hàng loạt folder rỗng** cho "đủ bộ". Thiếu concern nào → bỏ folder đó. Một app điển hình chỉ hiện diện 4–10 slot.
- **Nguồn = ĐẦU VÀO (git tracked); output/runtime/secret = ĐẦU RA (GITIGNORE).**
- **BẮT BUỘC = 4 VAI TRÒ:** `backend/(code)` · `frontend/` · `docs/` · `AGENTS.md`. TẤT CẢ còn lại `[opt]` — tạo KHI CÓ concern.

## 2. Hai cách sắp xếp code — layer-first / domain-first
Cùng MỘT từ điển tên slot (§3), chỉ khác **cấp lồng**. Chọn 1 kiểu cho mỗi app, **KHÔNG trộn tùy tiện**.

- **LAYER-FIRST** (mặc định — app nhỏ / CRUD / ít domain): slot nằm PHẲNG ngay dưới `src/`.
  → `src/{api, services, store, ai, validators, …}`
- **DOMAIN-FIRST** (app nhiều domain rạch ròi — vd zemory): mỗi domain là `src/<domain>/`, bên trong LỒNG LẠI đúng slot nó cần (cùng từ điển).
  → `src/<domain>/{store, services, ai, io, validators, …}`

```
Ví dụ DOMAIN-FIRST — chính zemory:
  src/brain/    store=db · services=ingest/search/digest · ai=embed/rerank/vectors · io=scanweb/share
  src/docs/     services=plan/changelog/markdown              (domain "harness")
  src/core/     composition root: registry/router/runtime      (wiring, KHÔNG business-logic)
  src/modules/  provider theo capability (memory/search/harness/health)
  surface:      commands (cli) · ui (server) · mcp              (entry MỎNG, chỉ wire vào domain)
```

**Luật bất diệt cho CẢ HAI kiểu:**
- **Cross-cutting** (`core, auth, vault, config, logging, audit, errors, i18n, update, migrations, shared, util`) → **LUÔN ở cấp `src/` gốc**, KHÔNG lồng/nhân bản trong từng domain.
- Bên trong một domain **chỉ dùng slot từ CÙNG từ điển** (store/services/ai/io/validators…), KHÔNG tạo tên mới.
- **Surface/entry MỎNG:** CLI → `commands/`, HTTP → `api/`, WS → `realtime/`, UI → `frontend/`; entry chỉ wire vào domain, không chứa nghiệp vụ.

## 3. Cây thư mục — ghi chú TỪNG DÒNG
Chuẩn RIÊNG, mô tả theo **vai trò**, gom theo 6 dải (band). Marker: `★` = BẮT BUỘC · `[opt]` = tạo KHI CÓ concern · `(manifest)` = file tool chuẩn.
```
App/                                # 1 APP = cây này  (Monorepo → apps/<app>/ + packages/<lib>/)
│
│ ═════════ ① TRACKED — NGUỒN + MANIFEST (commit lên git) ═════════
│
├── backend/                     ★ server-side: code mình + entry (100% của mình, một giọng)
│   ├── src/                     ★ nơi CHỨA code (Node: src/ · Python: backend/<pkg>/).
│   │                              Sắp theo LAYER-FIRST (phẳng) hoặc DOMAIN-FIRST (src/<domain>/ lồng slot) — §2.
│   │                              ▼ TẤT CẢ [opt] — tạo KHI CÓ concern (KHÔNG tạo folder rỗng):
│   │  │┄┄ BIÊN VÀO (thế giới → mình) ┄┄
│   │  ├── api/            [opt]  endpoint app MÌNH mở — REST/route phục vụ FE/client (+ health-check)
│   │  ├── graphql/        [opt]  schema + resolver (nếu dùng GraphQL)
│   │  ├── realtime/       [opt]  WebSocket / SSE (realtime push)
│   │  ├── events/         [opt]  NHẬN & xử lý event/webhook INBOUND · consumer · listener
│   │  ├── functions/      [opt]  serverless handler (Lambda / Cloud Function)
│   │  ├── commands/       [opt]  lệnh CLI (app là CLI, vd zemory) — mỗi verb 1 file
│   │  ├── middleware/     [opt]  pipeline request: guard / cors / log / rate-limit
│   │  │┄┄ BIÊN RA (mình → thế giới) ┄┄
│   │  ├── integrations/   [opt]  client gọi SERVICE NGOÀI (Stripe/Slack/SendGrid/FCM/S3-client…)
│   │  ├── store/          [opt]  DATA-ACCESS: driver + schema (DB remote/nội-bộ/cloud). at-rest (SQLCipher) ở đây
│   │  │   └── queries.*   [opt]    GOM mọi SQL đặt TÊN, gọi theo tên — KHÔNG rải f-string
│   │  ├── cache/          [opt]  lớp CACHE ứng dụng (Redis/memcached client + TTL/invalidate) — KHÁC store/ (primary) & data/cache/ (file)
│   │  ├── storage/        [opt]  OBJECT/BLOB & file-upload: validate/transform/ký-URL. client SaaS→integrations/ · bytes→data/uploads/ · metadata→store/
│   │  ├── notifications/  [opt]  điều phối EMAIL/SMS/PUSH (gửi gì/khi nào); kênh gửi→integrations/ · template→resources/locales
│   │  │┄┄ XỬ LÝ (nghiệp vụ) ┄┄
│   │  ├── services/       [opt]  business logic (nghiệp vụ cốt lõi)
│   │  ├── ai/             [opt]  lớp AI: provider interface + adapter (local model/OpenAI/Anthropic)
│   │  ├── agents/         [opt]  VÒNG LẶP AGENT: planning/reasoning/state-machine điều phối LLM (guardrail · grade→rewrite · cap vòng).
│   │  │                          Model-driven — KHÁC pipelines/ (tất định). LLM client→ai/ · prompt→resources/prompts/
│   │  ├── tools/          [opt]  ĐỊNH NGHĨA tool cho LLM/agent GỌI (schema + binding + shape kết quả). CHỈ khai báo + nối —
│   │  │                          THỰC THI delegate slot sẵn có (search/·integrations/·store/). KHÁC scripts/(dev)·util/·plugins/(bên-thứ-3)
│   │  ├── evals/          [opt]  ĐO CHẤT LƯỢNG model/agent/RAG trên corpus CÓ NHÃN (recall@k · LLM-judge · golden set) + gate.
│   │  │                          KHÁC test/ (pass/fail tất định)
│   │  ├── search/         [opt]  INDEX & retrieval (FTS/vector/Elastic): build index + query/rank/rerank
│   │  ├── pipelines/      [opt]  ETL / ingest / batch NHIỀU-BƯỚC (đường ống dữ liệu) — KHÁC jobs (lịch) & events (phản ứng)
│   │  ├── jobs/           [opt]  job nền / cron / queue / scheduled task
│   │  ├── validators/     [opt]  validate/parse input (zod/pydantic/schema)
│   │  │┄┄ NỀN TẢNG / cross-cutting (LUÔN cấp src/ gốc, dùng chung mọi domain) ┄┄
│   │  ├── core/           [opt]  COMPOSITION ROOT: DI/registry/router/runtime/lifecycle nối các module. KHÔNG business-logic
│   │  ├── auth/           [opt]  authentication (LÀ AI: login/jwt/oauth/session) + authorization (ĐƯỢC GÌ: role/permission/policy). Enforce→middleware/
│   │  ├── vault/          [opt]  MÃ HÓA + KEY: derive/encrypt/decrypt, credential vault — CODE ở đây; FILE key/bundle→data/secrets/
│   │  ├── config/         [opt]  config CODE (đọc .env→settings/hằng/enum) + feature-flag. Secret KHÔNG ở đây
│   │  ├── logging/        [opt]  LOGGER (level/format/sink) + observability (metrics/trace). Log file→data/logs/ · Sentry→integrations/
│   │  ├── audit/          [opt]  AUDIT TRAIL bảo mật (ai làm gì/khi nào); bảng→store/. KHÁC log debug
│   │  ├── errors/         [opt]  error types + 1 central handler/boundary (KHÔNG rải try/catch bừa)
│   │  ├── i18n/           [opt]  ĐA NGÔN NGỮ: load locale + lookup + AUTO-DỊCH. File dịch: server→resources/locales · UI→frontend/locales
│   │  ├── update/         [opt]  VERSION-UP tự động: check Releases/registry + tải + apply. Phối attic/(backup)+dist/(bản mới)+migrations/
│   │  ├── migrations/     [opt]  DB migration — mỗi file = 1 bước version schema
│   │  │┄┄ CHIA SẺ / HỢP ĐỒNG ┄┄
│   │  ├── shared/         [opt]  DÙNG CHUNG BE↔FE: type + RUNTIME (zod schema, hằng số, pure logic). Type-thuần = shared/types. FE import
│   │  ├── contracts/      [opt]  FILE spec hợp đồng API: OpenAPI/proto/GraphQL-SDL/AsyncAPI (contract-first). Sinh code→generated/
│   │  ├── plugins/        [opt]  điểm mở rộng cho BÊN THỨ 3 (host nạp thêm). KHÁC modules/ (feature CỦA MÌNH)
│   │  ├── modules/        [opt]  gói theo DOMAIN/feature (đơn vị domain-first §2); bên trong LỒNG lại slot
│   │  └── util/           [opt]  CHỈ helper thuần (format/date/string) — KHÔNG logic/repo/framework-adapter
│   ├── test/              [opt]  test tự động — CHỈ khi có lõi logic dễ sai ngầm. Test thường = CHẠY app
│   ├── scripts/           [opt]  script dev/build/ops/DEPLOY (+ sql/ one-off)
│   ├── infra/             [opt]  IaC: k8s/helm/terraform/ansible + config app tự quản (prometheus)
│   ├── resources/         [opt]  RESOURCE ĐÓNG GÓI tracked (KHÔNG code/media/runtime): prompts/ sql/ seed/ packaging/ locales/
│   ├── run.*              ★ entry chạy app — HOẶC manifest khai bin/main (Node-CLI: bin ở root là ĐỦ, khỏi run.*)
│   └── package.json | pyproject.toml   ★ manifest (Node-CLI có thể đặt ở ROOT — xem ghi chú ★)
│
├── frontend/               ★ UI (mọi app đều có UI, kể cả tool ít UI). ▼ TẤT CẢ [opt]:
│   ├── assets/       [opt]  MEDIA UI: ảnh / icon / logo / font (CHỈ media hiển thị)
│   ├── components/   [opt]  component dùng lại — GỒM Dialog 3-size (S/M/L)
│   ├── styles/       [opt]  TOKENS: 3-size dialog, màu, spacing + CSS/theme chung
│   ├── pages/        [opt]  trang / màn hình / route
│   ├── layouts/      [opt]  layout khung trang
│   ├── state/        [opt]  state client (Redux/Zustand)
│   ├── hooks/        [opt]  hook (React)
│   ├── api/          [opt]  client gọi BACKEND của mình (FE → BE)
│   ├── locales/      [opt]  ngôn ngữ / bản dịch UI (i18n)
│   ├── config/       [opt]  setting MẶC ĐỊNH ship (default layout/theme) — KHÔNG API-URL/secret
│   ├── util/         [opt]  helper thuần client (+ lib/) — đối xứng backend/util
│   ├── types/        [opt]  type CHỈ dùng client (dùng chung BE↔FE → backend/src/shared)
│   └── public/       [opt]  file tĩnh serve thẳng (favicon, robots.txt, manifest PWA, service-worker)
│                        ⤷ test/e2e/story: co-locate hoặc frontend/test — KHÔNG ép (chạy app = phép kiểm thử)
│
├── docs/                   ★ harness zemory (FILE .md là NGUỒN; DB chỉ INDEX dẫn xuất — file wins):
│   ├── agent/          ★    01_CONSTITUTION · 02_RULES · 03_STRUCTURE · 04_TODO · 05_CHANGES
│   ├── plan/           ★    spec / plan theo section — PHẲNG · NN_tên.md · MỌI .md đều được index
│   └── .harness.json   ★    marker: project đã wire harness
├── docs_visual/      [opt]  bản XEM TRỰC QUAN cho NGƯỜI (agent KHÔNG đọc) — .html tự chứa CÓ TƯƠNG TÁC ·
│                            .drawio/.svg vẽ tay: sơ đồ flow/kiến trúc/lineage/lưới trạng thái/timeline của
│                            hệ hoặc plan. NGOÀI cây docs/ → luật "đọc mọi file docs/" KHÔNG chạm (0 token).
│                            Mỗi file PHẢI có .md chủ trỏ tới + tóm tắt 1–3 dòng. Vẽ bằng chữ được → mermaid TRONG .md.
│
├── config/           [opt]  file config OPERATOR tự sửa (YAML/TOML): profile kết nối, server list
│   ├── *.example.*   [opt]    template TRACKED — trỏ secret bằng TÊN env
│   ├── *.yaml (real) [opt]    bản THẬT → GITIGNORE (password_env → .env)
│   └── *.local.*     [opt]    override theo máy → GITIGNORE
│
├── contracts/        [opt]  (escape-hatch) spec API ở ROOT khi ĐA CLIENT/SDK dùng chung (thay backend/src/contracts)
├── external/         [opt]  repo NGOÀI clone THAM CHIẾU — code HỌ, chỉ gọi/extend, KHÔNG dán vào backend
├── attic/            [opt]  backup: nguồn cũ / code đã gỡ + SNAPSHOT bản tốt TRƯỚC deploy/self-update (rollback). Tracked
├── docs_template/    [opt]  bộ docs MẪU TRẮNG phát cho project khác (chỉ tool kiểu zemory; có <PROJECT>)
├── share/            [opt]  bundle SYNC MÃ HÓA xuyên máy (git-lfs *.enc + key + README) — TRACKED (đã mã hóa). Chỉ app CÓ sync-qua-git
│
│ ═════════ ② ROOT — do TOOL ÉP vị trí (tôn trọng, KHÔNG dời) ═════════
│
├── AGENTS.md         ★         cửa vào harness (mô tả app + trỏ vào docs/)
├── README.md · LICENSE · .gitignore · .gitattributes   (manifest) giới thiệu/giấy phép/ignore/eol-lfs
├── package.json | pyproject.toml   ★ manifest (root — vd Node-CLI bin ở đây)
├── bin/              [opt]  entry CLI (npm convention: bin/<name> → dist/cli.js)
├── tsconfig · eslint · requirements.txt · vite/next/tailwind/jest/playwright.config.*   [opt] config build/test — tool ép root
├── .github/ · .gitlab-ci.yml         [opt]  CI/CD — tool ép root
├── .claude/ · .vscode/ · .idea/ · .serena/   [opt] config editor/agent — ĐỂ YÊN ở root (*.local.json→gitignore)
├── Dockerfile · docker-compose.yml · *.spec · Makefile|justfile · .husky/   [opt] tool ép root
├── .editorconfig · .prettierrc · .npmrc · .nvmrc · .env.example   [opt] config/format/pin/env-template — tool ép root
│                        ⤷ MỌI file config tool đọc từ root = ĐỂ YÊN, KHÔNG dời/dọn (danh sách MỞ)
│
│ ═════════ ③ GITIGNORE — KHÔNG commit (sinh ra / bí mật / theo máy) ═════════
│
├── .env              [opt]  secret runtime THẬT (pass/token/DATABASE_URL)
├── data/             [opt]  RUNTIME sống theo máy/user. ▼ [opt], tạo khi phình:
│   ├── state/ cache/ settings/ logs/ tmp/ snapshots/ models/ secrets/   [opt]  trạng thái/cache/setting-user/log/tạm/snapshot-data/model-weight/key
│   └── uploads/      [opt]    bytes file người dùng upload (blob runtime) — metadata thì ở store/
├── generated/        [opt]  CODE SINH tự động (từ contracts/proto/graphql) — build lại được. Commit chỉ khi cần reproducibility → ghi rõ
├── dist/ · build/ · coverage/ · .venv/ · node_modules/ · __pycache__/   [opt] output/deps sinh ra
```
**Ghi chú ★ — cây tối thiểu chạy được (khắc phục case Node-CLI):**
- **4 VAI TRÒ bắt buộc:** `backend/(code)` · `frontend/` (nếu có UI) · `docs/` · `AGENTS.md`.
- **(1) code của mình** dưới `backend/` (Node: `backend/src/` · Python: `backend/<pkg>/`).
- **(2) 1 ENTRY:** file `run.*` **HOẶC** manifest khai `bin`/`main` — Node-CLI (zemory) dùng `bin` ở root `package.json` là **HỢP LỆ**, KHÔNG bắt buộc `backend/run.*`.
- **(3) 1 MANIFEST:** ở root **HOẶC** `backend/` (không cần cả hai).
- Mọi slot con khác `[opt]` — **tạo KHI CÓ concern, không tạo folder rỗng**.

## 4. Routing — sửa gì / có gì → vào đâu
Tra cứu nhanh — **có gì / cần làm → mở THẲNG slot** (1 tên chuẩn duy nhất):

| Có gì / cần làm | → Slot |
|---|---|
| endpoint app MÌNH mở ra | `backend/src/api/` |
| gọi SERVICE API ngoài (SaaS: Stripe/Slack) | `backend/src/integrations/` |
| nối **DATABASE** (remote / nội-bộ / cloud) | `backend/src/store/` + profile `config/` + secret `.env`/`vault/` |
| **cache** (Redis/memcached client + TTL/invalidate) | `backend/src/cache/` · file cache runtime → `data/cache/` |
| **object/blob & file-upload** (S3…) | code → `backend/src/storage/` · client SaaS → `integrations/` · bytes → `data/uploads/` · metadata → `store/` |
| **notifications** (email/SMS/push) | orchestration → `backend/src/notifications/` · kênh gửi → `integrations/` · template → `backend/resources/locales/` |
| model AI | `backend/src/ai/` + weights `data/models/` + prompt `backend/resources/prompts/` |
| **vòng lặp agent / planning / reasoning / state-machine** | `backend/src/agents/` (LLM client → `ai/` · prompt → `backend/resources/prompts/`) |
| **định nghĩa tool cho LLM gọi** (tool-calling / MCP) | khai báo+binding → `backend/src/tools/` · **thực thi → `search/` · `integrations/` · `store/`** |
| **bộ nhớ agent** (hội thoại / scratchpad / checkpoint) | chính sách nhớ-quên-tóm-tắt → `agents/` · lưu bền → `store/` · blob runtime → `data/state/` |
| **đo chất lượng RAG/agent** (recall@k · LLM-judge) | `backend/src/evals/` (KHÁC `backend/test/`) |
| **search / index** (FTS/vector/Elastic) | `backend/src/search/` |
| **ETL / ingest / pipeline nhiều bước** | `backend/src/pipelines/` (KHÁC `jobs/`=lịch, `events/`=phản ứng) |
| business logic | `backend/src/services/` |
| câu SQL | `backend/src/store/queries.*` (gom, đặt tên, gọi theo tên) |
| job nền / cron / queue | `backend/src/jobs/` |
| event / webhook / listener (inbound) | `backend/src/events/` |
| websocket / SSE / realtime | `backend/src/realtime/` |
| lệnh CLI (mỗi verb) | `backend/src/commands/` |
| **wiring / DI / registry / lifecycle** | `backend/src/core/` (composition root, KHÔNG business-logic) |
| authentication / login | `backend/src/auth/` (login/jwt/oauth/session) |
| **phân quyền / authorization** (role · permission · policy) | định nghĩa role/permission → `backend/src/auth/` · **enforce (guard) → `backend/src/middleware/`** · role-data → `store/` · policy file operator → `config/` |
| middleware / guard | `backend/src/middleware/` |
| credential / secret (code) | `backend/src/vault/` (file → `data/secrets/`) |
| **mã hóa / encryption** (at-rest DB · key · bundle) | key+encrypt/decrypt → `backend/src/vault/` · **at-rest DB (SQLCipher) → `backend/src/store/`** · key/salt/bundle → `data/secrets/` |
| validate input | `backend/src/validators/` |
| **lỗi / exception tùy biến + handler** | `backend/src/errors/` (KHÔNG rải try/catch bừa) |
| **logging / observability** (logger · metrics · trace) | code → `backend/src/logging/` · log file → `data/logs/` · service ngoài (Sentry/Datadog) → `integrations/` |
| **audit trail** (ai làm gì — bảo mật) | ghi ở `backend/src/audit/` · bảng audit → `store/` · KHÁC log debug (`data/logs/`) |
| config (code, đọc env) + feature-flag | `backend/src/config/` |
| health-check endpoint | `backend/src/api/` |
| **code + type DÙNG CHUNG BE↔FE** | `backend/src/shared/` (type-thuần → `shared/types`); đa client/SDK → root `contracts/` + `packages/` |
| **spec API** (OpenAPI/proto/GraphQL-SDL) | `backend/src/contracts/` → sinh code `generated/` (gitignore) |
| **điểm mở rộng cho bên thứ 3** | `backend/src/plugins/` (feature của mình → `modules/`) |
| helper thuần | `backend/src/util/` · client → `frontend/util/` |
| UI component (Dialog…) | `frontend/components/` |
| token / CSS / định nghĩa 3-size | `frontend/styles/` |
| trang / route UI | `frontend/pages/` |
| media ảnh/icon UI | `frontend/assets/` |
| gọi backend từ FE | `frontend/api/` |
| type chỉ dùng client | `frontend/types/` |
| setting UI mặc định | `frontend/config/` · user chỉnh → `data/settings/` |
| **đa ngôn ngữ / i18n** (gồm auto-dịch) | chức năng → `backend/src/i18n/` · file dịch: UI → `frontend/locales/`, server → `backend/resources/locales/` |
| **version-up TỰ ĐỘNG** (check bản mới / tự cập nhật) | `backend/src/update/` (check Releases/registry + tải + apply). Package-manager (npm/pip) → có thể KHÔNG cần, ghi rõ lý do |
| **chốt version + deploy máy đích/VM (THỦ CÔNG)** | git tag (vX.Y.Z) → `dist/`(build) → `backend/scripts/deploy.*` → backup bản cũ TRÊN máy đích về `attic/` TRƯỚC KHI ghi đè |
| file config operator (server/node) | `config/` (`.example` tracked · real gitignore) |
| profile kết nối remote server | `config/servers.yaml` + `.env` (`password_env`) |
| code ngoài clone tham chiếu | `external/` |
| backup nguồn cũ / trước deploy | `attic/` |
| runtime db/log/cache/snapshot/model/upload | `data/` (gitignore) |
| **nơi lưu DB local + dời off ổ hệ thống** | DB ở `data/*.db` (hoặc `~/.zemory`); con trỏ CỐ ĐỊNH `~/.zemory/location.json` quyết định vị trí → dời bằng `brain relocate <dir>` / UI "Nơi lưu (máy)". **KHÔNG** để DB sống trong folder Drive-sync (WAL corrupt) |
| code sinh tự động (codegen) | `generated/` (gitignore; commit chỉ khi cần reproducibility) |
| đóng gói exe/installer | `.spec`(root) + `backend/resources/packaging/`(icon) + `dist/`(output) + Releases |
| test tự động | `backend/test/` (chỉ khi có lõi logic) |
| tài liệu / rule / plan | `docs/` — sửa FILE `.md` trực tiếp (file là nguồn, file wins) |
| **sơ đồ / flow / kiến trúc** (mô tả bằng chữ) | khối `mermaid` **TRONG `docs/plan/NN_*.md`** — đi cùng spec, `plan search` index được |
| **sơ đồ XEM TRỰC QUAN** (tương tác / vẽ tay) | `docs_visual/` (NGOÀI `docs/`) — 1 file self-contained + có `.md` chủ trỏ tới; sinh từ data → `scripts/` + render `exports/` |

## 5. Quyết định & Convention
```
BẮT BUỘC = 4         backend/(code) · frontend/ · docs/ · AGENTS.md. TẤT CẢ còn lại [opt] — tạo KHI CÓ concern
KHÔNG folder rỗng    INDEX = TỪ ĐIỂN TÊN để tra, KHÔNG phải checklist tạo. Tạo folder CHỈ khi có file/concern thật; thiếu → bỏ. App điển hình chỉ 4–10 slot hiện diện
2 trục sắp xếp       LAYER-FIRST (slot phẳng dưới src/, mặc định) HOẶC DOMAIN-FIRST (src/<domain>/ lồng slot). Chọn 1, không trộn. Cross-cutting LUÔN ở src/ gốc. (§2)
1 TÊN / concern      store/ (KHÔNG db|models) · pages/ (KHÔNG views|screens). Framework ép mới đổi
Tên nhiều-từ = _     file + folder slot nhiều từ → gạch DƯỚI (docs_visual · docs_template · NN_tên.md), KHÔNG hyphen/camelCase. Tên do tool/npm ép (package-lock.json · .github/ · docker-compose.yml) = ĐỂ YÊN
Framework ép         framework hardcode quét tên folder (Next pages/, Django models/migrations/, Rails app/models) → theo nó (như Docker ép root)
Tool ép root         MỌI config tool đọc từ root — folder .<tool>/ (.github/.vscode/.claude/.serena) + file *.config.* / .<tool>rc / .editorconfig / .npmrc / .dockerignore / .nvmrc + Docker/.spec/Makefile — ĐỂ YÊN, refactor KHÔNG dời/dọn/liệt-kê-cứng (là danh sách MỞ)
Entry ★ (Node-CLI)   entry = run.* HOẶC manifest.bin/main; manifest = root HOẶC backend/. Node-CLI (bin ở root package.json) KHÔNG cần backend/run.* — vẫn đạt ★
6 LOẠI non-code      assets=media · resources=đóng-gói-tracked · config=file-operator · data=runtime-gitignore · external=code-ngoài · attic=backup
3 loại "kết nối"     api/=mình MỞ · integrations/=SERVICE ngoài (SaaS) · store/=DATABASE (remote/cloud/nội-bộ). external/=code-họ-clone
Cache — 3 chỗ RÕ     lớp cache app (Redis client + policy) → cache/ · file cache runtime → data/cache/ · KHÔNG lẫn vào store/ (primary DB)
Storage/blob         quản lý upload/transform/ký-URL → storage/ · client S3 (SaaS) → integrations/ · bytes runtime → data/uploads/ · metadata → store/
Notifications        điều phối gửi (gì/khi nào) → notifications/ · kênh (SendGrid/Twilio/FCM) → integrations/ · template → resources/locales
Search/index         build-index + query/rank → search/ (FTS/vector/Elastic). App có domain search riêng (vd zemory) → gói trong domain đó (domain-first)
Pipelines            ETL/ingest/batch nhiều-bước → pipelines/. KHÁC jobs/ (theo lịch) & events/ (phản ứng sự kiện)
Agent (LLM) — 4 chỗ  loop/planning → agents/ · provider LLM → ai/ · tool cho LLM gọi → tools/ · prompt → resources/prompts/. KHÔNG gộp 1 folder "agent" lộn xộn (lỗi phổ biến: reasoning+state+memory+tool+LLM-client nhét chung)
tools/ ≠ scripts/    tools/ = tool cho LLM gọi (schema+binding; thực thi delegate slot sẵn có) · scripts/ = dev/build/ops · util/ = helper thuần · plugins/ = bên thứ 3
Agent memory         KHÔNG slot riêng: chính sách (nhớ gì/tóm tắt/trim) → agents/ · persistence → store/ · runtime → data/state/ — cùng pattern notifications//storage//authz
agents/ ≠ docs/agent agents/ = code agent CỦA APP · docs/agent/ = harness docs cho coding-agent đọc — 2 thứ khác hẳn nhau
Evals vs test        evals/ = đo chất lượng XÁC SUẤT trên corpus có nhãn + gate (vd zemory `brain bench`: hybrid recall@3 ≥ FTS) · test/ = pass/fail tất định
core/ (kernel)       COMPOSITION ROOT: DI/registry/router/runtime/lifecycle nối module. KHÔNG chứa business-logic (chống "core = nơi dồn tạp nham")
SQL — 1 CÁCH         mặc định store/queries.* (gom, đặt tên, gọi theo tên); resources/sql/ CHỈ khi cố ý tách file .sql. KHÔNG rải inline
Secret               config/ + .env.example chỉ trỏ TÊN env (password_env); pass THẬT ở .env/vault → data/secrets/. KHÔNG commit
Mã hóa / Encryption  concern RIÊNG: key+encrypt/decrypt → vault/ · at-rest DB (SQLCipher) apply ở store/ · key/salt/bundle → data/secrets/ · in-transit bundle → vault/. App có DATA NHẠY CẢM (chat/PII/log) → NÊN mã hóa at-rest; nếu KHÔNG làm phải ghi rõ "chấp nhận plaintext" (để audit thấy, không bỏ sót)
Sync bundle qua git   ngoại lệ CÓ CHỦ ĐÍCH của luật data/=gitignore: bundle MÃ HÓA cần đi qua git để đồng bộ xuyên máy (git-lfs) → TRACKED ở root share/ (đã mã hóa, không phải plaintext secret) — không nhét vào data/ (data/ không sync qua git)
Nơi lưu DB (di dời)  DB sống lớn dần → cho dời KHỎI ổ hệ thống. Vị trí = con trỏ CỐ ĐỊNH ~/.zemory/location.json (env override > pointer > ~/.zemory default); mọi phụ trợ (config/browser/imports/backups) bám theo. Dời an toàn = checkpoint WAL → copy → verify (integrity + đếm) → đổi pointer → GIỮ bản cũ .bak. Con trỏ PHẢI ở chỗ cố định, KHÔNG cạnh DB (phụ thuộc vòng). KHÔNG dời vào folder Drive-sync (WAL corrupt) — Drive chỉ nhận bundle .enc
Phân quyền / Authz   concern RIÊNG: authentication (LÀ AI) = auth/ · authorization/PHÂN QUYỀN (ĐƯỢC GÌ) = định nghĩa role/permission ở auth/ + ENFORCE (guard) ở middleware/ + role-data (user→role) ở store/ + policy file operator-sửa ở config/. App ĐA-USER / ĐA-ROLE → PHẢI có; single-user/local → ghi rõ "không phân quyền" (không bỏ sót)
Logging / Observab.  code logger (level/format/sink) + metrics/trace → logging/ · log FILE → data/logs/ · APM/Sentry/Datadog → integrations/. Là DEBUG/vận hành — KHÁC audit-trail
Audit trail          nhật ký BẢO MẬT "ai làm gì / lúc nào" (đổi quyền, xoá, đăng nhập) → ghi ở audit/ + bảng ở store/. KHÁC log debug (data/logs). App đa-user / có hành động nhạy cảm → NÊN có; không thì ghi rõ
Error handling       error types + 1 central handler/boundary → errors/. KHÔNG rải try/catch bỏ qua lỗi khắp nơi
Shared BE↔FE         shared/ = type + RUNTIME dùng chung (zod schema, hằng số, pure logic); type-thuần → shared/types. FE import. Escape-hatch: FE publish độc lập / đa client / SDK → nâng root contracts/ + packages/contracts (cắt coupling)
Contracts (spec)     FILE hợp đồng API (OpenAPI/proto/GraphQL-SDL/AsyncAPI) → contracts/ (contract-first) → sinh code generated/. KHÁC shared/ (code TS chạy được)
Generated code       output codegen → generated/, mặc định GITIGNORE (build lại được). Commit CHỈ khi cần reproducibility/offline-build → ghi rõ lý do
Plugins vs modules   modules/ = feature CỦA MÌNH (domain-first §2) · plugins/ = điểm mở rộng cho BÊN THỨ 3 (host nạp thêm)
Cross-cutting = RÕ   MỌI concern xuyên suốt (mã hóa/authz/logging/audit/error/cache/i18n…) phải có place+type trong chuẩn này → audit/refactor thấy được, KHÔNG lọt. Thiếu concern → BÁO thêm vào chuẩn
Setting UI kéo-thả   default ship → frontend/config/ (tracked); bản user chỉnh runtime → data/settings/ (gitignore)
Dialog / modal       CHỈ 3 size cố định S/M/L, chọn theo nội-dung + mục-đích, KHÔNG random/động/reflow. Token size ở frontend/styles/
docs_visual (xem)    bản trực quan (sơ đồ/flow/lineage/lưới/timeline) cho NGƯỜI mở NHÌN → docs_visual/ NGOÀI docs/ (agent KHÔNG auto-đọc → 0 token). .md THẮNG về sự kiện (visual chỉ trình bày; fact chỉ nằm trong visual = vô hình với plan search ⇒ mục). Mỗi file: self-contained (CSS/JS/SVG inline · KHÔNG CDN/build) + có .md chủ trỏ tới bằng LINK markdown + tóm tắt 1–3 dòng. Mặc định vẽ mermaid TRONG .md; docs_visual/ CHỈ khi không-text-được. Sinh từ data → scripts/ + exports/, KHÔNG commit render
UI embed (single-bin) app CLI/1-binary có thể EMBED trang UI như resource (vd HTML/CSS/JS trong 1 file TS) để ship gọn — GIỮ ở backend nhưng GHI RÕ; server phục vụ nó vẫn là backend, nội dung UI vẫn "thuộc" frontend về vai trò. KHÔNG ép tách nếu tách làm vỡ build 1-file
UI 1-ngôn-ngữ        app UI render SERVER-SIDE bằng chính ngôn ngữ backend (Streamlit/Gradio/Dash/Django+template) → KHÔNG có frontend/ tách; vai trò "frontend" = pages/views NẰM TRONG backend (Python: backend/<pkg>/pages, hoặc views/ nếu framework ép tên). Bắt buộc còn 3: backend(code)+docs+AGENTS. Asset UI: backend/<pkg>/assets hoặc frontend/assets tuỳ framework
Test                 KHÔNG bắt buộc — chạy chính app = phép kiểm thử; folder test chỉ cho lõi logic dễ sai ngầm (search/migration/privacy). FE: e2e/story co-locate hoặc frontend/test
Version              git=source(tag/branch) · dist+Releases=build · data/snapshots=data · migrations=schema · 05_CHANGES=log. KHÔNG folder versions/ chép tay
2 KIỂU version-up     ① TỰ ĐỘNG (app tự check+tải+apply) → backend/src/update/ (phối attic/+dist/+migrations/). ② THỦ CÔNG (chốt bản X, up máy đích/VM) → git tag → dist/ build → backend/scripts/deploy.* → backup bản đang chạy về attic/ TRƯỚC khi đè → rollback nếu hỏng. Dùng hạ tầng có sẵn, KHÔNG concern mới
Backup deploy 2 CHIỀU  KHÔNG chỉ push 1 chiều. Máy đích có backup lần trước → verify khớp attic/ local TRƯỚC khi đè (lệch = có sửa tay ngoài luồng, điều tra trước); deploy xong kéo bản-vừa-thay về attic/ local. Cùng nguyên lý additive-merge của brain sync/share.ts
Packaging            .spec(root) + backend/scripts + backend/resources/packaging + dist(output) + OS app-data(cài) — DÙNG SLOT CŨ, KHÔNG nhóm mới
util/                CHỈ helper thuần — KHÔNG business-logic / repository / framework-adapter (chống "nơi dồn tạp nham"). BE: backend/src/util · FE: frontend/util
auth/                authentication · authorization · jwt · oauth · permission — phân biệt rõ với middleware (enforce)
events/              event bus · consumer · listener · webhook INBOUND — webhook chỉ là 1 loại nguồn event
data/ chia con       phình → state/ cache/ settings/ models/ snapshots/ secrets/ logs/ tmp/ uploads/ (tránh trăm file JSON 1 chỗ)
frontend/config      CHỈ default layout/theme/profile — KHÔNG API-URL/endpoint/secret (mấy cái đó đi qua env)
Tên co theo stack    Python backend/<pkg>/ vs Node backend/src/ — chỉ TẦNG co theo ngôn ngữ, KHÔNG tự đổi tên concern
Monorepo             nhiều app → apps/<app>/ + packages/<lib>/ (+ packages/contracts nếu đa client), mỗi cái theo cây chuẩn
Ngoài phạm vi        lib/SDK thuần · mobile native (Gradle/Xcode) · ML/notebook · game engine · browser-extension → convention riêng, KHÔNG ép
```

## 6. Phạm vi áp dụng
- **ÁP §1–6 (chuẩn APP):** hầu hết app estate (UI + server-side) — desktop WebView2 (SasinFlow), web app, tool có cockpit (zemory), AI project, monorepo. Áp gần như không đổi cấu trúc; chọn layer-first hay domain-first theo số domain (§2).
- **ÁP §7 (chuẩn NON-APP):** project là SẢN PHẨM/TÀI SẢN, không phải code chạy — BI/report (Power BI/Tableau, vd `powerbi_sasinflow`), data/analytics (dbt/warehouse), docs-only, design/brand, research/notebook có cấu trúc.
- **KHÔNG ép** (convention riêng): thư viện/SDK thuần (không UI) · mobile native (Gradle/Xcode) · game engine (Unity/Unreal). Chuẩn note "ngoài phạm vi", không nhồi.

## 7. Chuẩn phụ NON-APP — BI / data / docs / design
> Dùng khi repo **không phải app chạy được** mà là **sản phẩm/tài sản** (deliverable). Cùng triết lý §1: vai-trò · 1-tên/concern · từ-điển-KHÔNG-checklist · KHÔNG folder rỗng · tracked=đầu-vào / gitignore=đầu-ra. **Harness `docs/` + `AGENTS.md` GIỮ Y HỆT app** (cùng engine zemory, agent điều hướng như nhau).

**BẮT BUỘC = 3 vai trò** (thay cho 4 của app): `docs/` · `AGENTS.md` · **≥1 folder DELIVERABLE** (`reports/`|`models/`|`content/`|`design/` — chọn theo loại). KHÔNG có `backend/`+`frontend/` vì không có code-app.

```
<project>/                         # vd powerbi_sasinflow — 1 sản phẩm = 1 cây
│ ═══ TRACKED (đầu vào / nguồn) ═══
├── AGENTS.md            ★  cửa vào: mô tả sản phẩm + trỏ docs/
├── docs/                ★  harness Y HỆT app: agent/(01_CONSTITUTION·02_RULES·03_STRUCTURE·04_TODO·05_CHANGES) · plan/ · .harness.json
│   └── dictionary.md   [opt] TỪ ĐIỂN DỮ LIỆU: định nghĩa metric/cột/bảng (BI/data NÊN có — chống mỗi report tính 1 kiểu)
├── docs_visual/        [opt] sơ đồ/flow/lineage/lưới XEM TRỰC QUAN cho NGƯỜI (vd luồng nạp DW) — .html tương tác/.svg;
│                            NGOÀI docs/, mỗi file có .md chủ trỏ tới + tóm tắt 1–3 dòng (= §5 docs_visual)
│ ┄┄ DELIVERABLE — chọn theo loại (≥1) ┄┄
├── reports/             ◆  BI: file báo cáo .pbix/.pbip/.twb (bản chính giao đi)      [LFS]
├── models/              ◆  data: semantic/transform layer — dbt model · tabular .bim · DAX model
├── content/             ◆  docs-only: nội dung .md/.mdx là sản phẩm chính
├── design/              ◆  design: .fig/.sketch/.psd nguồn thiết kế                    [LFS]
│ ┄┄ ĐẦU VÀO / XỬ LÝ ┄┄
├── sources/        [opt]  ĐỊNH NGHĨA nguồn: Power Query (M) · connection spec (trỏ TÊN env) · SQL kéo nguồn
├── measures/       [opt]  thư viện DAX/tính toán đặt tên + chú thích (trích ra để review/tái dùng)
├── queries/        [opt]  SQL/DAX/M đặt tên, gọi theo tên — KHÔNG rải inline (đối xứng store/queries.* của app)
├── pipelines/      [opt]  ETL/transform nhiều bước (code-driven: dbt/python)
├── notebooks/      [opt]  phân tích thăm dò .ipynb (research/analytics)
├── fixtures/       [opt]  DATA MẪU NHỎ (tracked) để mở report/model KHỎI cần nguồn thật
├── assets/         [opt]  theme .json · logo · icon · bảng màu cho report/design
├── scripts/        [opt]  refresh / publish / deploy (pbi-tools · PowerShell · dbt)
├── config/         [opt]  profile workspace/connection (operator): *.example.* tracked · real→gitignore
├── attic/          [opt]  bản cũ deliverable / snapshot TRƯỚC publish (rollback)
├── share/          [opt]  bundle sync mã hóa xuyên máy (chỉ khi cần) — như app
│ ═══ GITIGNORE (đầu ra / thật / theo máy) ═══
├── data/           [opt]  extract/cache/dataset THẬT kéo về (nặng, theo máy)
├── exports/        [opt]  bản render/publish sinh ra (PDF/PNG/build) — build lại được
└── .env            [opt]  connection string / token / workspace-id THẬT
```

**Ví dụ áp `powerbi_sasinflow`** — chỉ hiện slot CÓ THẬT (không tạo folder rỗng):
```
powerbi_sasinflow/
├── AGENTS.md
├── docs/{agent/, plan/, dictionary.md}          # định nghĩa metric doanh thu/đơn/khách…
├── docs_visual/dw_flow.html                      # [xem] sơ đồ luồng nạp DW — .md chủ: docs/plan/08_sasin_dw.md
├── reports/SasinFlow.pbix                        # [LFS] báo cáo chính
├── sources/{orders.m, connection.example.json}   # Power Query + spec (trỏ env)
├── measures/revenue.dax                          # DAX tách ra để review
├── assets/sasinflow-theme.json                   # theme màu
├── scripts/refresh.ps1                           # refresh + publish workspace
├── fixtures/sample_orders.csv                    # mở .pbix khỏi cần DB thật
└── .env                                          # connection thật (gitignore)
```

**Convention NON-APP** (bổ sung; phần còn lại kế thừa §5):
```
3 vai trò bắt buộc   docs/ · AGENTS.md · ≥1 deliverable (reports/|models/|content/|design/). KHÔNG backend/frontend
Nhị phân nặng        .pbix/.twb/.fig/.psd → Git LFS (như share/*.enc): track file, LFS lo dung lượng
Data thật vs mẫu     nguồn/extract THẬT → data/ (gitignore) · mẫu nhỏ mở được deliverable → fixtures/ (tracked)
Secret/connection    config/*.example.* tracked (trỏ TÊN env) · connection thật → .env / *.local.* (gitignore)
Từ điển dữ liệu      BI/data NÊN có docs/dictionary.md — định nghĩa metric/cột = nguồn sự thật, chống mỗi report tính 1 kiểu
SQL/DAX/M            gom queries/ hoặc measures/, đặt tên — KHÔNG rải inline (đối xứng store/queries app)
Publish/refresh      tự động hóa → scripts/ · bản render ra → exports/ (gitignore, build lại được)
Sơ đồ trực quan      .html tương tác/.svg xem trực quan (luồng/lineage/lưới bảng) → docs_visual/ (NGOÀI docs/, agent KHÔNG auto-đọc); mỗi file có .md chủ trỏ + tóm tắt. Chi tiết = §5 docs_visual
Harness = app        docs/agent/* + AGENTS.md y hệt → cùng lệnh zemory, agent điều hướng non-app đúng như app
```
