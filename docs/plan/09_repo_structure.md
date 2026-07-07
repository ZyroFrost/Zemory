<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory plan set` -->
# Chuẩn cấu trúc repo — bộ khung dùng chung cho mọi app

> Spec bộ khung thư mục chuẩn zemory **ship + thực thi** cho mọi app (UI + server-side).
> Mục tiêu: **ít folder, dễ quét mắt**, rạch ròi của-mình vs ngoài, một chuẩn cho nhiều stack.
> Trạng thái (2026-07-06): **CHỐT thiết kế**, đang chuẩn bị rollout (áp lên các app).

## 1. Nguyên tắc
- **Luôn 2 mặt: `backend/` + `frontend/`** (mọi app trong estate đều dựng UI).
- **Folder nguồn = ĐẦU VÀO (git tracked); build/output = ĐẦU RA (ở root, GITIGNORE).**
- **Rạch ròi của-mình vs ngoài:** `backend/` = 100% code mình; `external/` = code ngoài, chỉ gọi/extend.
- **Mục đích KÉP:** vừa cấu trúc GỌN, vừa là **INDEX điều hướng** — agent đọc rule là trỏ thẳng vào folder cần sửa, KHỎI grep/đọc cả repo để dò (nhanh + tiết kiệm token, đúng bất biến #1).
- Rule phục vụ mục tiêu (dễ xem / rạch ròi / định vị nhanh), KHÔNG ép cho đủ folder — thiếu mặt nào thì bỏ mặt đó.
## 2. Cây thư mục chuẩn
```
App/
├── backend/          [BẮT BUỘC] server-side gom hết: code mình + entry (test/scripts optional)
│   ├── <pkg>/ | src/  code mình (Python backend/<package>/ · Node backend/src/ hoặc src/)
│   │   └── types/     type/contract DÙNG CHUNG BE↔FE (nguồn; FE import — KHÔNG đẻ shared/)
│   ├── test/          [optional] test tự động (chỉ khi có; TEST thường = chạy chính app)
│   ├── scripts/       [optional] script dev/build của mình
│   ├── infra/         [optional] config app tự quản (monitoring/deploy)
│   ├── migrations/    [optional] schema/DB migration (app log/db)
│   └── run.* · pyproject.toml / package.json
├── frontend/         [BẮT BUỘC] UI — HTML/React/Vue… ; asset → frontend/assets/
│   └── test/          [optional] test frontend / E2E (khi có)
├── docs/             [BẮT BUỘC] harness zemory (agent/ · plan/ · .harness.json)
├── AGENTS.md · README.md · LICENSE · .gitignore · config (tsconfig/eslint…)   [manifest root]
├── external/         [optional] repo ngoài clone về tham chiếu (gọi, không dán vào backend)
├── attic/            [optional] backup: nguồn cũ/code gỡ + SNAPSHOT bản tốt trước khi up server (rollback)
├── Dockerfile · docker-compose.yml · *.spec · build.ps1 · .github/workflows/ · .vscode/  [tool ÉP root]
├── .env.example      [tracked] template config
│   ───── gitignore, KHÔNG commit ─────
├── .env              secret runtime (buộc root — dotenv đọc ./.env)
├── data/             [optional] runtime .db log/cache/state + secret/.key/bundle
├── dist/ · build/    [optional] output đóng gói ĐỂ CHẠY/MỞ app (chỉ khi build)
└── .venv/ · node_modules/ · __pycache__/   [optional] env/deps generated
```
→ Root tracked: **`backend/ frontend/ docs/`** (+ optional `external/ attic/`) + manifest. **Bắt buộc = 4: `backend/(code) frontend/ docs/ AGENTS.md`** — test/scripts/infra/migrations đều optional.
## 3. Routing — sửa gì vào đâu
| Cần làm | Vào đâu |
|---|---|
| UI / asset (icon, logo, font, ảnh) | `frontend/` — asset → `frontend/assets/` |
| logic / API / auth | `backend/` — code + entry; **bảo mật = code**, không phải folder |
| type/contract dùng chung BE↔FE | `backend/src/types/` — FE **import** từ backend (KHÔNG đẻ `shared/`) |
| config app tự quản (monitoring…) | `backend/infra/` — nhánh backend |
| dùng / tham chiếu code ngoài | `external/` |
| data/log runtime + secret/key | `data/` — root + `.gitignore` |
| **backup nguồn cũ + snapshot TRƯỚC KHI up server** | `attic/` — tracked, rollback khi deploy hỏng |
| **test tự động (khi có)** · script dev/build | `backend/test/` (+ `frontend/test/`) · `backend/scripts/` — **[optional]**; TEST thường = **chạy app** |
| tài liệu / rule / plan | `docs/` — qua lệnh `zemory` |
| **CI/CD · editor · Docker/.spec** (tool ép) | root — `.github/` `.vscode/` `Dockerfile` `docker-compose.yml` `.spec` |
| **env config** | root — `.env.example` (tracked) + `.env` (secret, gitignore) |
| build output (`dist/`,`build/`) | root + `.gitignore` [optional] |
## 4. Quyết định đã chốt
- **backend + frontend luôn có** — user luôn build UI, kể cả tool ít UI như zemory.
- **infra KHÔNG top-level** → `backend/infra/` (hạ tầng = nhánh server-side của backend).
- **code ngoài = `external/`** — bỏ `vendor/`/`deps/` (external/ tự giải thích).
- **Docker/compose/`.spec` + `.github/` (CI/CD) + `.vscode/` (editor) để ROOT** — tool ép vị trí, tôn trọng; khác config app tự quản (`backend/infra/`).
- **`.env` buộc root + GITIGNORE** (dotenv/vite đọc `./.env`); **`.env.example` = TRACKED** template. Secret khác (`.key`, bundle, `.db`) → `data/`.
- **type dùng chung BE↔FE** → `backend/src/types/`, FE import từ backend — KHÔNG đẻ folder `shared/`.
- **TEST không bắt buộc** — thực tế **chạy chính app = bàn test** (build tới đâu coi tới đó). Folder `test/` (backend + frontend) CHỈ optional cho **lõi logic dễ sai ngầm** (search/dedup/migration/privacy — như zemory 15 test). App UI/luồng thẳng → bỏ. **Bắt buộc chỉ 4:** `backend(code)/ frontend/ docs/ AGENTS.md`.
- **`attic/` = lưới an toàn backup** — nguồn cũ/code đã gỡ + **snapshot bản chạy tốt TRƯỚC KHI up server** (rollback khi deploy hỏng).
- **Output + env + data gitignore** (`dist/ build/ node_modules/ .venv/ __pycache__/ .env data/`) → repo tracked chỉ folder nguồn + manifest → sạch.
- **Tên co theo stack**, giữ đúng TẦNG.
## 5. Phạm vi áp dụng
- **Hầu hết mọi app** của estate (UI + server-side): desktop WebView2 (SasinInfra), web app, tool có cockpit (zemory)… ✅
- **KHÔNG ép** cho: thư viện/SDK thuần (không UI), mobile native (Gradle/Xcode có convention riêng), notebook / nghịch data rời.

## 6. zemory thực thi thế nào — ship + check + guide (KHÔNG auto-move)
- **Ship chuẩn:** rule §"Cấu trúc repo — chuẩn & routing" trong `docs-template/agent/01_RULES.md` → mọi project nhận qua harness.
- **Check lệch:** `zemory validate` báo advisory (liệt kê tầng có/thiếu; warn nếu code không ở `backend/`(`src/`) hoặc thiếu `AGENTS.md`).
- **Hướng dẫn reconcile:** `AGENTS.md §7` — agent nắn từng app: `git mv` (giữ history) → sửa import/entry → verify; **hỏi trước khi đập lớn**. zemory chỉ chỉ ra chỗ lệch, KHÔNG tự move file.

## 7. Rollout (chuẩn bị)
- Áp lên app hiện có (agent-assisted, từng app, hỏi trước):
  - SasinInfra: gần chuẩn (đã có backend/frontend/config+vendor) → đổi `config/`→`backend/infra/`, `vendor/`→`external/`.
  - zemory: gom `src/`→`backend/`, `deps/`→`external/`, cân nhắc tách UI-generated (`ui-page.ts`) sang `frontend/` (hay giữ code-gen trong backend).
