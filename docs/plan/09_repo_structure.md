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
├── backend/          [BẮT BUỘC] code mình + entry + test + scripts (server-side gom hết)
│   ├── <pkg>/ | src/  code mình (Python backend/<package>/ · Node backend/src/ hoặc src/)
│   ├── test/          test (own code)
│   ├── scripts/       [optional] script dev/build của mình
│   ├── infra/         [optional] config app tự quản (monitoring/deploy)
│   └── run.* · pyproject.toml / package.json
├── frontend/         [BẮT BUỘC] UI — HTML/React/Vue… ; asset → frontend/assets/
├── docs/             [BẮT BUỘC] harness zemory (agent/ · plan/ · .harness.json)
├── AGENTS.md · README.md · LICENSE · .gitignore · config (tsconfig/eslint…)   [manifest root]
├── external/         [optional] repo ngoài clone về tham chiếu (gọi, không dán vào backend)
├── attic/            [optional] backup nguồn cũ / code đã gỡ — tracked, giữ tham chiếu
├── Dockerfile · docker-compose.yml · *.spec · build.ps1   [tool ÉP để root]
│   ───── gitignore, KHÔNG commit ─────
├── data/             [optional] runtime .db log/cache/state + secret/.key/bundle
├── dist/ · build/    [optional] output đóng gói ĐỂ CHẠY/MỞ app (chỉ khi build)
└── .venv/ · node_modules/ · __pycache__/   [optional] env/deps generated
```
→ Root tracked: **`backend/ frontend/ docs/`** (+ optional `external/ attic/`) + manifest. Bắt buộc = `backend/ frontend/ docs/ AGENTS.md`.
## 3. Routing — sửa gì vào đâu
| Cần làm | Vào đâu |
|---|---|
| UI / asset (icon, logo, font, ảnh) | `frontend/` — asset → `frontend/assets/` |
| logic / API / auth · test · script dev/build | `backend/` (+ `backend/test/` + `backend/scripts/`) — bảo mật = code |
| config app tự quản (monitoring…) | `backend/infra/` — nhánh backend |
| dùng / tham chiếu code ngoài | `external/` |
| data/log runtime + secret/key | `data/` — root + `.gitignore` (phình/bí mật; app đóng gói: OS app-data) |
| backup nguồn cũ / code đã gỡ | `attic/` — tracked, optional |
| tài liệu / rule / plan | `docs/` — qua lệnh `zemory` |
| deploy config tool ép root (Docker/.spec) | root |
| build output (`dist/`,`build/`) | root + `.gitignore` [optional] |
## 4. Quyết định đã chốt
- **backend + frontend luôn có** — không tách theo "số mặt" nữa (user luôn build UI, kể cả tool ít UI như zemory).
- **infra KHÔNG là folder top-level** → gom vào `backend/infra/` (hạ tầng là nhánh server-side của backend).
- **Tên folder code ngoài = `external/`** — bỏ `vendor/` (dễ nhầm "nhà cung cấp dịch vụ") và `deps/` (dễ nhầm package-manager). external/ tự giải thích.
- **Docker/compose/`.spec` để ROOT** (tool ép vị trí — tôn trọng), khác với config app tự quản (`backend/infra/`).
- **Output + env gitignore** (`dist/ build/ node_modules/ .venv/ __pycache__/`) → up git chỉ tracked folder nguồn + manifest → repo sạch, không "đẻ mớ folder".
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
