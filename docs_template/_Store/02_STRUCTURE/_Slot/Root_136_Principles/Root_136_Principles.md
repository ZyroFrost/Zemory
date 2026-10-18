---
id: Slot_136
aka: 03-136
name: principles
version: 11
kind: guide
path: .
---
# Root_136_Principles principles — nguyên tắc chung của chuẩn cấu trúc

- Hai chuẩn, chọn theo LOẠI dự án — chốt TRƯỚC khi nắn folder; agent hỏi, không tự đoán (`AGENTS.md §Vào việc`):
  - APP: có code CHẠY do mình phát triển (UI / server / CLI) — scaffold bằng `zemory init`.
  - NON-APP: dự án là SẢN PHẨM / TÀI SẢN (BI/report · data · docs-only · design); agent chỉ đọc · dò · kéo · điền · xuất FILE, kể cả mở `.pbix` ra dò hay đổ số vào template — scaffold bằng `zemory init --non-app`.
  - Ranh giới: có UI/dashboard trong deliverable KHÔNG biến dự án thành app; chỉ khi phát triển & bảo trì một app (code chạy) mới là app.
  - Hai hệ dùng CHUNG harness `docs/` + `AGENTS.md`: cùng engine, cùng lệnh zemory, agent điều hướng như nhau.
- Mô tả theo VAI TRÒ (role), không khoá framework → hệ APP áp Web / Desktop / CLI / AI / Data / Monorepo, hệ NON-APP áp BI / data / docs-only / design, gần như không đổi cấu trúc.
- MỘT TÊN duy nhất cho mỗi concern. Chỉ khi framework/công cụ ÉP CỨNG tên mới theo tên đó — như Docker ép `Dockerfile` ở gốc:
  - APP: Next `pages/`, Django `models/` · `migrations/`, Rails `app/models`.
  - NON-APP: Power BI Project `.pbip` · `.Report/` · `.SemanticModel/`, dbt `models/`.
- Mục đích KÉP: cấu trúc gọn + INDEX điều hướng — agent đọc chuẩn là trỏ THẲNG folder cần sửa, không grep cả repo (nhanh + tiết kiệm token).
- INDEX = TỪ ĐIỂN TÊN để TRA, KHÔNG phải danh sách folder phải tạo. CHỈ tạo folder khi CÓ concern/file thật; tuyệt đối không tạo hàng loạt folder rỗng cho đủ bộ; thiếu concern → bỏ folder đó. Dự án điển hình chỉ hiện diện 4–10 slot (APP) / 3–8 slot (NON-APP).
- Nguồn = ĐẦU VÀO = git tracked. Đầu ra = gitignore:
  - APP: output / runtime / secret.
  - NON-APP: nguồn = định nghĩa nguồn · measure · template điền · deliverable · spec; đầu ra = file THẬT nặng / PII / kéo về / render ra (`data/` · `exports/` · `.env`).
- Vai trò BẮT BUỘC; mọi thứ khác `[opt]`, tạo KHI CÓ concern:
  - APP = 4: `backend/(code)` · `frontend/` (nếu có UI) · `docs/` · `AGENTS.md`. Ngoại lệ UI một ngôn ngữ (render server-side) còn 3: backend(code) + docs + AGENTS.
  - NON-APP = 3: `docs/` · `AGENTS.md` · ≥1 folder DELIVERABLE (`reports/` | `models/` | `content/` | `design/`, chọn theo loại); không có `backend/` + `frontend/`.
- Chú giải marker trong cây: `★` = bắt buộc · `[opt]` = tạo khi có concern · `(manifest)` = file tool chuẩn (APP) · `◆` = deliverable, ≥1 (NON-APP). Cây chia dải: ① TRACKED (nguồn + manifest/định nghĩa/deliverable) · ② ROOT do tool ép vị trí · ③ GITIGNORE. Hệ APP chia tiếp `backend/src/` theo dải biên vào · biên ra · xử lý · nền tảng/cross-cutting · chia sẻ/hợp đồng.
- Hai cách sắp code (chỉ hệ APP) — cùng MỘT từ điển slot, chỉ khác cấp lồng; chọn một kiểu cho mỗi app, không trộn tuỳ tiện:
  - LAYER-FIRST (mặc định — app nhỏ / CRUD / ít domain): slot nằm phẳng ngay dưới `src/` → `src/{api, services, store, ai, validators, …}`.
  - DOMAIN-FIRST (app nhiều domain rạch ròi): mỗi domain là `src/<domain>/`, bên trong lồng lại đúng slot nó cần → `src/<domain>/{store, services, ai, io, validators, …}`. Ví dụ: `src/<domain-A>/` (store = db · services = nghiệp vụ · ai = model/adapter · io = nhập/xuất) · `src/<domain-B>/` (chỉ slot domain đó cần: services · validators · search) · `src/core/` composition root (registry/router/runtime — wiring, không business logic) · `src/modules/` provider theo capability · surface: commands (cli) · api/ui (server), entry mỏng chỉ wire vào domain.
  - Luật cho CẢ HAI kiểu: cross-cutting (`core` · `auth` · `vault` · `config` · `logging` · `audit` · `errors` · `i18n` · `update` · `migrations` · `shared` · `util`) LUÔN ở cấp `src/` gốc, không lồng/nhân bản trong domain · bên trong một domain chỉ dùng slot từ CÙNG từ điển, không tạo tên mới · surface/entry MỎNG: CLI → `commands/`, HTTP → `api/`, WS → `realtime/`, UI → `frontend/`, không chứa nghiệp vụ.
  - Hệ NON-APP: con của `tasks/` · `pipelines/` · `data/` là tự do theo chuẩn; điều ngược lại ở hệ APP (trong domain chỉ dùng slot từ điển) vẫn giữ.
- Khuôn tên chung:
  - Tên slot viết THƯỜNG; tên file + folder nhiều từ → gạch DƯỚI `_` (`docs_visual` · `docs_template` · `NN_tên.md`), không hyphen/camelCase.
  - MỌI tên file/folder do mình đặt viết bằng tiếng Anh ASCII thuần — không ngôn ngữ bản địa (cả có dấu lẫn mất dấu), không ký tự ngoài ASCII. Nội dung bên trong vẫn theo `Rule_Gate_31_NoBrokenVietnamese`; luật này chỉ nói về TÊN. Lý do: tên bị gõ lại trong lệnh · import · link · URL; dấu vỡ theo encoding và ký tự đồng hình (`с` Cyrillic vs `c` Latin) làm ref chết không nhìn ra. NON-APP: áp cho cả tên case (`tasks/<case>/`) và tên stage pipeline — chỗ hay bị đặt theo ngôn ngữ bản địa nhất.
  - ĐỂ YÊN tên không phải của mình: tên do tool/npm ép (`package-lock.json` · `.github/` · `docker-compose.yml`), code vendor (`external/`), dữ liệu runtime của bên thứ ba, file/vendor có sẵn (`TargetAll.xlsx` · `..._REPORT.xlsx` · `.pbix` · `.Report/` · `.SemanticModel/`).
  - Tên co theo stack (APP): Python `backend/<pkg>/` vs Node `backend/src/` — chỉ TẦNG co theo ngôn ngữ, không tự đổi tên concern.
- Tool ép gốc (APP): MỌI config tool đọc từ gốc — folder `.<tool>/` (`.github` · `.vscode` · `.claude` · `.serena`) + file `*.config.*` · `.<tool>rc` · `.editorconfig` · `.npmrc` · `.dockerignore` · `.nvmrc` · `.env.example` · `tsconfig` · `eslint` · `requirements.txt` · `vite/next/tailwind/jest/playwright.config.*` · `.gitlab-ci.yml` · `Dockerfile` · `docker-compose.yml` · `*.spec` · `Makefile`/`justfile` · `.husky/` — ĐỂ YÊN; refactor không dời / dọn / liệt kê cứng (danh sách MỞ). Hệ NON-APP: danh sách file được ở gốc là các slot `Root_*` (cổng `conform`).
- 6 LOẠI non-code: `assets` = media · `resources` = đóng gói tracked · `config` = file operator · `data` = runtime gitignore · `external` = code ngoài · `attic` = backup.
- 3 loại kết nối (APP): `api/` = mình MỞ (biên VÀO) · `integrations/` = SERVICE ngoài (SaaS) · `store/` = DATABASE (remote/cloud/nội bộ); `external/` = code họ clone. Chiều gọi đi: `integrations/` = ra ngoài · `frontend/client/` = về BE của mình. MỘT tên không gánh hai chiều.
- Cross-cutting phải RÕ: MỌI concern xuyên suốt (mã hoá · authz · logging · audit · error · cache · i18n…) phải có chỗ + loại trong chuẩn để audit/refactor thấy, không lọt. Thiếu concern → BÁO để thêm vào chuẩn.
- Monorepo (APP): nhiều app → `apps/<app>/` + `packages/<lib>/` (+ `packages/contracts` nếu đa client), mỗi cái theo cây chuẩn.
- Luật nổ lúc VIẾT code (`conform` không kiểm được) nằm ở `01_LAW/_Rule/` (`Rule_Gate_21_WhatEntersGit` · `Rule_Gate_35_OneHome` · `Rule_Gate_29_CodeLanguage`), không ở chuẩn cấu trúc.
- Hệ NON-APP: 0 luật UI. Trình bày deliverable (layout report/chart) là quyết định TRÌNH BÀY — trình duyệt trước (`Rule_Keys_62_DesignChangeApproval`), cách dựng ở skill `pbi-base`; không phải luật UI-app.
- Phạm vi áp dụng:
  - Chuẩn APP áp cho hầu hết app (UI + server-side): desktop WebView2, web app, tool có cockpit, AI project, monorepo; chọn layer-first hay domain-first theo số domain.
  - Chuẩn NON-APP áp cho BI/report (Power BI/Tableau), data/analytics (dbt/warehouse), docs-only, design/brand, research/notebook có cấu trúc.
  - KHÔNG ép (convention riêng, chỉ ghi là ngoài phạm vi): thư viện/SDK thuần (không UI) · mobile native (Gradle/Xcode) · ML/notebook · game engine (Unity/Unreal) · browser-extension. Với chuẩn NON-APP, app có code chạy → chuẩn APP.
- Reconcile — nắn repo lệch về chuẩn: flow HIẾM; quy trình đầy đủ (docs lệch · cấu trúc folder lệch · recipe end-to-end) ở `.claude/skills/harness-reconcile/SKILL.md`. `zemory validate`/`structure` chỉ CHỈ RA chỗ lệch (advisory); agent tự nắn bằng `git mv` (giữ history), zemory không auto-move; đập cấu trúc lớn / khó đảo → hỏi TRƯỚC (`Rule_Gate_10_DestructiveOps`, `Rule_Gate_50_Git`).
