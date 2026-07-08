# Cấu trúc repo chuẩn — bộ khung dùng chung cho mọi app

> Chuẩn folder zemory **ship + thực thi** cho MỌI app (UI + server-side). Mô tả theo **VAI TRÒ**, không khóa framework.
> Đọc TRƯỚC khi sửa: cần gì → §3 trỏ thẳng slot. Nắn app về chuẩn: xem `AGENTS.md §Reconcile`.

## 1. Nguyên tắc
- Mô tả theo **VAI TRÒ (role)**, KHÔNG khóa framework → áp Web / Desktop / CLI / AI / Data / Monorepo mà gần như không đổi cấu trúc.
- **Chuẩn RIÊNG của mình:** mỗi concern **1 TÊN duy nhất**; chỉ khi framework ÉP CỨNG (Next `pages/`, Django `models/`,`migrations/`, Rails `app/models`) mới theo tên nó — như Docker ép `Dockerfile` ở root.
- **Mục đích KÉP:** cấu trúc gọn + **INDEX điều hướng** — agent đọc rule là trỏ THẲNG folder cần sửa, KHỎI grep cả repo (nhanh + tiết kiệm token, đúng bất biến #1).
- **Nguồn = ĐẦU VÀO (git tracked); output/runtime/secret = ĐẦU RA (GITIGNORE).**
- Rule phục vụ mục tiêu (gọn / rạch ròi / định vị nhanh), KHÔNG ép cho đủ folder — **thiếu concern nào bỏ folder đó**.
- **BẮT BUỘC = 4:** `backend/(code)` · `frontend/` · `docs/` · `AGENTS.md`. TẤT CẢ folder khác `[opt]` — tạo KHI CÓ concern.

## 2. Cây thư mục — ghi chú TỪNG DÒNG
Chuẩn RIÊNG, mô tả theo **vai trò**. Marker: `★` = BẮT BUỘC (chỉ 5 dòng) · `[opt]` = tạo KHI CÓ concern · `(manifest)` = file tool chuẩn.
```
App/                                # 1 APP = cây này  (Monorepo → apps/<app>/, mỗi app 1 cây)
│
│ ═════════ ① TRACKED — NGUỒN + MANIFEST (commit lên git) ═════════
│
├── backend/                        ★BẮT BUỘC  server-side: code mình + entry (100% code mình, một giọng)
│   ├── src/                        ★BẮT BUỘC  nơi CHỨA code (Node: src/ · Python: backend/<pkg>/). ▼ con = TẤT CẢ [opt]:
│   │   ├── api/                    [opt]   endpoint app MÌNH MỞ RA — REST/route phục vụ FE/client
│   │   ├── integrations/           [opt]   client gọi SERVICE API NGOÀI (Stripe/Slack/SaaS) — code mình gọi họ
│   │   ├── ai/                     [opt]   lớp AI: interface provider + adapter (local model/OpenAI/Anthropic)
│   │   ├── services/               [opt]   business logic (nghiệp vụ cốt lõi)
│   │   ├── store/                  [opt]   DATA-ACCESS: driver connection + schema (DB remote/nội-bộ/cloud ĐỀU đây). MÃ HÓA at-rest (SQLCipher) apply ở đây nếu data nhạy cảm
│   │   │   └── queries.*           [opt]     GOM mọi câu SQL đặt TÊN, code gọi theo tên — KHÔNG rải f-string
│   │   ├── migrations/             [opt]   DB migration — mỗi file = 1 bước version schema
│   │   ├── jobs/                   [opt]   job nền / cron / queue / scheduled task
│   │   ├── events/                 [opt]   event bus / consumer / listener / webhook (webhook = 1 nguồn event)
│   │   ├── realtime/               [opt]   WebSocket / SSE (realtime push)
│   │   ├── graphql/                [opt]   schema + resolver (nếu dùng GraphQL)
│   │   ├── functions/              [opt]   serverless function handler (Lambda/Cloud Function)
│   │   ├── middleware/             [opt]   middleware / guard — pipeline request (log, cors, rate-limit)
│   │   ├── auth/                   [opt]   AUTHENTICATION (bạn LÀ AI: login/jwt/oauth/session) + AUTHORIZATION/PHÂN QUYỀN (ĐƯỢC GÌ: role/permission/policy). Enforce per-request → middleware/
│   │   ├── vault/                  [opt]   MÃ HÓA + KEY: derive key, encrypt/decrypt, credential vault — CODE ở đây; FILE key/bundle mã hóa → data/secrets/
│   │   ├── validators/             [opt]   validate/parse input (zod/pydantic/schema)
│   │   ├── errors/                 [opt]   error types tùy biến + central error handler/boundary (KHÔNG rải try/catch bừa)
│   │   ├── config/                 [opt]   config CODE (đọc .env → dựng settings, hằng số, enum). Secret KHÔNG ở đây
│   │   ├── logging/                [opt]   LOGGER setup (level/format/sink) + observability (metrics/traces). Log file → data/logs/ ; gửi Sentry/Datadog → integrations/
│   │   ├── audit/                  [opt]   AUDIT TRAIL bảo mật (ai làm gì / lúc nào) — ghi khi hành động nhạy cảm; data → store/ (bảng audit). KHÁC log debug
│   │   ├── types/                  [opt]   type/contract DÙNG CHUNG BE↔FE — FE import (escape-hatch §4 khi FE tách)
│   │   ├── modules/                [opt]   module/plugin gói theo tính năng (feature)
│   │   ├── commands/               [opt]   lệnh CLI (nếu app là CLI, vd zemory)
│   │   └── util/                   [opt]   CHỈ helper thuần (format/date/string) — KHÔNG logic/repo/framework-adapter
│   ├── test/                       [opt]   test tự động — CHỈ khi có lõi logic. Test thường = CHẠY app; UI đơn giản → bỏ
│   ├── scripts/                    [opt]   script dev/build/ops của mình
│   │   └── sql/                    [opt]     SQL one-off (nếu nhiều)
│   ├── infra/                      [opt]   IaC: k8s/helm/terraform/ansible + config app tự quản (monitoring/prometheus)
│   ├── resources/                  [opt]   RESOURCE ĐÓNG GÓI tracked (KHÔNG code / KHÔNG media / KHÔNG runtime):
│   │   ├── prompts/                [opt]     prompt/template AI ship kèm
│   │   ├── sql/                    [opt]     câu SQL tách FILE .sql (chỉ khi cố ý; mặc định store/queries.*)
│   │   ├── seed/                   [opt]     seed data / default config ship kèm (vd recon_defaults.json)
│   │   └── packaging/              [opt]     icon/logo/manifest cho .exe/installer (.ico) — icon đóng gói ≠ media UI
│   ├── run.*                       ★BẮT BUỘC  entry chạy app
│   └── package.json | pyproject.toml   ★BẮT BUỘC  manifest package
│
├── frontend/                       ★BẮT BUỘC  UI (mọi app đều có UI, kể cả tool ít UI). ▼ con = TẤT CẢ [opt]:
│   ├── assets/                     [opt]   MEDIA UI: ảnh / icon / logo / font (assets = CHỈ media, app hiển thị)
│   ├── components/                 [opt]   component dùng lại — GỒM Dialog 3-size (S/M/L)
│   ├── styles/                     [opt]   TOKENS: định nghĩa 3 size dialog, màu, spacing + CSS/theme chung
│   ├── pages/                      [opt]   trang / màn hình / route
│   ├── state/                      [opt]   state client (Redux/Zustand)
│   ├── api/                        [opt]   client gọi BACKEND của mình (FE → BE)
│   ├── hooks/                      [opt]   hook (React)
│   ├── layouts/                    [opt]   layout khung trang
│   ├── locales/                    [opt]   ngôn ngữ / bản dịch (i18n)
│   ├── config/                     [opt]   setting MẶC ĐỊNH ship (default layout/theme/profile) — TRACKED. KHÔNG API-URL/secret
│   └── public/                     [opt]   file tĩnh serve thẳng (favicon, robots.txt)
│
├── docs/                           ★BẮT BUỘC  harness zemory (nguồn = DB, .md là mirror):
│   ├── agent/                      ★BẮT BUỘC    01_RULES (luật) · 02_TODO (backlog) · 03_CHANGES (changelog)
│   ├── plan/                       ★BẮT BUỘC    spec / plan theo section
│   └── .harness.json               ★BẮT BUỘC    marker: project đã wire harness
│
├── config/                         [opt]   file config OPERATOR tự sửa (YAML/TOML): profile kết nối, server/node list
│   ├── *.example.*                 [opt]     template TRACKED (servers.example.yaml) — trỏ secret bằng TÊN env
│   ├── *.yaml (real)               [opt]     bản THẬT → GITIGNORE. Pass thật KHÔNG ở đây (password_env → .env)
│   └── *.local.*                   [opt]     override theo máy → GITIGNORE
│
├── external/                       [opt]   repo NGOÀI clone THAM CHIẾU — code HỌ, chỉ gọi/extend, KHÔNG dán vào backend
├── attic/                          [opt]   backup: nguồn cũ / code đã gỡ + SNAPSHOT bản tốt TRƯỚC KHI up server (rollback). Tracked
├── docs-template/                  [opt]   bộ docs MẪU TRẮNG app PHÁT cho project khác (chỉ tool kiểu zemory; có <PROJECT>)
│
│ ═════════ ② ROOT — do TOOL ÉP vị trí (tôn trọng, không dời) ═════════
│
├── AGENTS.md                       ★BẮT BUỘC  cửa vào harness (mô tả app + trỏ vào docs/)
├── README.md                       (manifest)  giới thiệu repo
├── LICENSE                         (manifest)  giấy phép
├── .gitignore                      (manifest)  danh sách git bỏ qua
├── .gitattributes                  (manifest)  thuộc tính git (eol/lfs)
├── package.json | pyproject.toml   ★BẮT BUỘC  manifest package
├── tsconfig.json                   [opt]   config TypeScript (nếu Node/TS)
├── eslint.config.js                [opt]   config linter
├── requirements.txt                [opt]   deps Python (nếu Python)
├── .github/workflows/              [opt]   CI/CD GitHub Actions — tool ép root
├── .gitlab-ci.yml                  [opt]   CI/CD GitLab — tool ép root
├── .claude/                        [opt]   config Claude Code (settings/commands/agents) — tool ép root (*.local.json → gitignore)
├── .vscode/                        [opt]   config VS Code — tool ép root
├── .idea/                          [opt]   config JetBrains — tool ép root
├── .serena/                        [opt]   config agent-tool Serena — tool ép root
│                                            ⤷ mọi folder .<tool>/ config (editor/agent) = ĐỂ YÊN ở root, KHÔNG dời/dọn
├── Dockerfile                      [opt]   image build — tool ép root
├── docker-compose.yml              [opt]   compose services — tool ép root
├── *.spec                          [opt]   PyInstaller spec (đóng exe) — tool ép root
├── Makefile | justfile             [opt]   task runner — tool ép root
├── .husky/                         [opt]   git hook (pre-commit) — tool ép root
├── bin/                            [opt]   entry CLI (npm convention: bin/<name>)
├── .env.example                    [opt]   template biến môi trường — TRACKED (chỉ TÊN key, KHÔNG giá trị secret)
├── vite/webpack/next/tailwind/postcss/babel · jest/vitest/playwright.config.*   [opt]   config build/test/CSS — tool ép root
├── .editorconfig · .prettierrc · .npmrc | .yarnrc · .dockerignore   [opt]   config editor/format/pkg-mgr/docker — tool ép root
├── .nvmrc · .python-version · .tool-versions   [opt]   pin phiên bản runtime — tool ép root
├── CONTRIBUTING.md · SECURITY.md · CODE_OF_CONDUCT.md · CHANGELOG.md   [opt]   community/health — root (hoặc .github/); harness dùng docs/agent/03_CHANGES
│                                            ⤷ MỌI file config tool đọc từ root (build/test/format/lint/pkg-mgr/docker) = tool ép → ĐỂ YÊN, KHÔNG dời/dọn (như folder .<tool>/)
│
│ ═════════ ③ GITIGNORE — KHÔNG commit (sinh ra / bí mật / theo máy) ═════════
│
├── .env                            [opt]   secret runtime THẬT (pass/token/DATABASE_URL). dotenv đọc ./.env
├── data/                           [opt]   RUNTIME sống theo máy/user. ▼ con [opt], tạo khi phình:
│   ├── state/                      [opt]     trạng thái app
│   ├── cache/                      [opt]     cache
│   ├── settings/                   [opt]     setting user CHỈNH runtime (kéo-thả layout) — đổi liên tục
│   ├── logs/                       [opt]     log
│   ├── tmp/                        [opt]     file tạm
│   ├── *.db                        [opt]     DB local (sqlite…)
│   ├── models/                     [opt]     trọng số model AI (tải/cache — nặng)
│   ├── snapshots/                  [opt]     snapshot DATA theo thời gian (version data — vd node_history)
│   └── secrets/                    [opt]     key / secret bundle mã hóa (*.key *.enc)
├── dist/                           [opt]   output đóng gói để CHẠY app (exe/installer). Phát hành → GitHub Releases
├── build/                          [opt]   thư mục build trung gian
├── coverage/                       [opt]   report test coverage (sinh ra)
├── .venv/                          [opt]   virtualenv Python (sinh ra)
├── node_modules/                   [opt]   deps Node (sinh ra)
└── __pycache__/                    [opt]   bytecode Python (sinh ra)
```
BẮT BUỘC = **5 dòng ★**: `backend/` · `backend/src/`(code) · `backend/run+manifest` · `frontend/` · `docs/` + `AGENTS.md`. TẤT CẢ folder con (api…util, mọi con frontend/, data/*, ROOT tool…) đều `[opt]` — tạo KHI CÓ.

## 3. Routing — sửa gì / có gì → vào đâu
Tra cứu nhanh — **có gì / cần làm → mở THẲNG slot** (1 tên chuẩn duy nhất):

| Có gì / cần làm | → Slot |
|---|---|
| endpoint app MÌNH mở ra | `backend/src/api/` |
| gọi SERVICE API ngoài (SaaS: Stripe/Slack) | `backend/src/integrations/` |
| nối **DATABASE** (remote / nội-bộ / cloud) | `backend/src/store/` + profile `config/` + secret `.env`/`vault/` |
| model AI | `backend/src/ai/` + weights `data/models/` + prompt `backend/resources/prompts/` |
| business logic | `backend/src/services/` |
| câu SQL | `backend/src/store/queries.*` (gom, đặt tên, gọi theo tên) |
| job nền / cron / queue | `backend/src/jobs/` |
| event / webhook / listener | `backend/src/events/` |
| websocket / SSE / realtime | `backend/src/realtime/` |
| authentication / login | `backend/src/auth/` (login/jwt/oauth/session) |
| **phân quyền / authorization** (role · permission · policy) | định nghĩa role/permission → `backend/src/auth/` · **enforce (guard) → `backend/src/middleware/`** · role-data (user→role) → `store/` · policy file operator → `config/` |
| middleware / guard | `backend/src/middleware/` |
| credential / secret (code) | `backend/src/vault/` (file → `data/secrets/`) |
| **mã hóa / encryption** (at-rest DB · key · bundle) | key+encrypt/decrypt → `backend/src/vault/` · **at-rest DB (SQLCipher) → `backend/src/store/`** · key/salt/bundle → `data/secrets/` |
| validate input | `backend/src/validators/` |
| **lỗi / exception tùy biến + handler** | `backend/src/errors/` (KHÔNG rải try/catch bừa) |
| **logging / observability** (logger · metrics · trace) | code → `backend/src/logging/` · log file → `data/logs/` · service ngoài (Sentry/Datadog) → `integrations/` |
| **audit trail** (ai làm gì — bảo mật) | ghi ở `backend/src/audit/` · bảng audit → `store/` · KHÁC log debug (`data/logs/`) |
| config (code, đọc env) | `backend/src/config/` |
| feature-flag | `backend/src/config/` (bật/tắt tính năng) |
| health-check endpoint | `backend/src/api/` |
| type dùng chung BE↔FE | `backend/src/types/` |
| helper thuần | `backend/src/util/` |
| UI component (Dialog…) | `frontend/components/` |
| token / CSS / định nghĩa 3-size | `frontend/styles/` |
| trang / route UI | `frontend/pages/` |
| media ảnh/icon UI | `frontend/assets/` |
| gọi backend từ FE | `frontend/api/` |
| setting UI mặc định | `frontend/config/` · user chỉnh → `data/settings/` |
| file config operator (server/node) | `config/` (`.example` tracked · real gitignore) |
| profile kết nối remote server | `config/servers.yaml` + `.env` (`password_env`) |
| code ngoài clone tham chiếu | `external/` |
| backup nguồn cũ / trước deploy | `attic/` |
| runtime db/log/cache/snapshot/model | `data/` (gitignore) |
| đóng gói exe/installer | `.spec`(root) + `backend/resources/packaging/`(icon) + `dist/`(output) + Releases |
| test tự động | `backend/test/` (chỉ khi có lõi logic) |
| tài liệu / rule / plan | `docs/` (qua lệnh `zemory`, không gõ tay mirror) |

## 4. Quyết định & Convention
```
BẮT BUỘC = 4         backend/(code) · frontend/ · docs/ · AGENTS.md. TẤT CẢ còn lại [opt] — tạo KHI CÓ concern
1 TÊN / concern      store/ (KHÔNG db|models) · pages/ (KHÔNG views|screens). Framework ép mới đổi
Framework ép         framework hardcode quét tên folder (Next pages/, Django models/migrations/, Rails app/models) → theo nó (như Docker ép root)
Tool ép root         MỌI config tool đọc từ root — folder .<tool>/ (.github/.vscode/.claude/.serena) + file *.config.* / .<tool>rc / .editorconfig / .npmrc / .dockerignore / .nvmrc + Docker/.spec/Makefile — ĐỂ YÊN, refactor KHÔNG dời/dọn/liệt-kê-cứng (là danh sách MỞ)
Index = TỪ ĐIỂN      ~20 folder backend + ~11 frontend KHÔNG bắt tạo hết; CÓ concern → dùng ĐÚNG tên; không → bỏ (không đẻ folder rỗng)
6 LOẠI non-code      assets=media · resources=đóng-gói-tracked · config=file-operator · data=runtime-gitignore · external=code-ngoài · attic=backup
3 loại "kết nối"     api/=mình MỞ · integrations/=SERVICE ngoài (SaaS) · store/=DATABASE (remote/cloud/nội-bộ). external/=code-họ-clone
SQL — 1 CÁCH         mặc định store/queries.* (gom, đặt tên, gọi theo tên); resources/sql/ CHỈ khi cố ý tách file .sql. KHÔNG rải inline
Secret               config/ + .env.example chỉ trỏ TÊN env (password_env); pass THẬT ở .env/vault → data/secrets/. KHÔNG commit
Mã hóa / Encryption  concern RIÊNG: key+encrypt/decrypt → vault/ · at-rest DB (SQLCipher) apply ở store/ · key/salt/bundle → data/secrets/ · in-transit bundle → vault/. App có DATA NHẠY CẢM (chat/PII/log) → NÊN mã hóa at-rest; nếu KHÔNG làm phải ghi rõ "chấp nhận plaintext" (để audit thấy, khỏi lọt)
Phân quyền / Authz   concern RIÊNG: authentication (LÀ AI) = auth/ · authorization/PHÂN QUYỀN (ĐƯỢC GÌ) = định nghĩa role/permission ở auth/ + ENFORCE (guard) ở middleware/ + role-data (user→role) ở store/ + policy file operator-sửa ở config/. App ĐA-USER / ĐA-ROLE → PHẢI có; single-user/local → ghi rõ "không phân quyền" (khỏi lọt)
Logging / Observab.  code logger (level/format/sink) + metrics/trace → logging/ · log FILE → data/logs/ · APM/Sentry/Datadog → integrations/. Là DEBUG/vận hành — KHÁC audit-trail
Audit trail          nhật ký BẢO MẬT "ai làm gì / lúc nào" (đổi quyền, xoá, đăng nhập) → ghi ở audit/ + bảng ở store/. KHÁC log debug (data/logs). App đa-user / có hành động nhạy cảm → NÊN có; không thì ghi rõ
Error handling       error types + 1 central handler/boundary → errors/. KHÔNG rải try/catch nuốt lỗi khắp nơi
Cross-cutting = RÕ   MỌI concern xuyên suốt (mã hóa/authz/logging/audit/error…) phải có place+type trong chuẩn này → audit/refactor thấy được, KHÔNG lọt. Thiếu concern → BÁO thêm vào chuẩn
Setting UI kéo-thả   default ship → frontend/config/ (tracked); bản user chỉnh runtime → data/settings/ (gitignore)
Dialog / modal       CHỈ 3 size cố định S/M/L, chọn theo nội-dung + mục-đích, KHÔNG random/động/reflow. Token size ở frontend/styles/
Test                 KHÔNG bắt buộc — chạy chính app = bàn test; folder test chỉ cho lõi logic dễ sai ngầm (search/migration/privacy)
Version              git=source(tag/branch) · dist+Releases=build · data/snapshots=data · migrations=schema · 03_CHANGES=log. KHÔNG folder versions/ chép tay
Packaging            .spec(root) + backend/scripts + backend/resources/packaging + dist(output) + OS app-data(cài) — DÙNG SLOT CŨ, KHÔNG nhóm mới
util/  (GPT)         CHỈ helper thuần — KHÔNG business-logic / repository / framework-adapter (chống "misc dump")
auth/  (GPT)         authentication · authorization · jwt · oauth · permission — phân biệt rõ với middleware
events/ (GPT)        event bus · consumer · listener · webhook — webhook chỉ là 1 loại nguồn event
data/ chia con (GPT) phình → state/ cache/ settings/ models/ snapshots/ secrets/ logs/ tmp/ (tránh trăm file JSON 1 chỗ)
frontend/config(GPT) CHỈ default layout/theme/profile — KHÔNG API-URL/endpoint/secret (mấy cái đó đi qua env)
types escape-hatch   mặc định backend/src/types (BE=source of truth); KHI FE publish độc lập / đa client / SDK → nâng packages/contracts (cắt coupling)
Tên co theo stack    Python backend/<pkg>/ vs Node backend/src/ — chỉ TẦNG co theo ngôn ngữ, KHÔNG tự đổi tên concern
Monorepo             nhiều app → apps/<app>/ + packages/<lib>/, mỗi cái theo cây chuẩn
Ngoài phạm vi        lib/SDK thuần · mobile native (Gradle/Xcode) · ML/notebook · game engine · browser-extension → convention riêng, KHÔNG ép
```

## 5. Phạm vi áp dụng
- **ÁP:** hầu hết app estate (UI + server-side) — desktop WebView2 (SasinFlow), web app, tool có cockpit (zemory), AI/data project, monorepo. Áp gần như không đổi cấu trúc.
- **KHÔNG ép** (convention riêng): thư viện/SDK thuần (không UI) · mobile native (Gradle/Xcode) · notebook / data rời · game engine (Unity/Unreal). Chuẩn note "ngoài phạm vi", không nhồi.
