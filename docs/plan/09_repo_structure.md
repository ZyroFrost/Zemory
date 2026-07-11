<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory plan set` -->
# Chuẩn cấu trúc repo — bộ khung dùng chung cho mọi app

> Spec bộ khung thư mục chuẩn zemory **ship + thực thi** cho mọi app (UI + server-side).
> Mục tiêu: **ít folder, dễ quét mắt**, rạch ròi của-mình vs ngoài, một chuẩn cho nhiều stack.
> Trạng thái (cập nhật 2026-07-10): **CHỐT thiết kế + đã kín cross-cutting** (mã hóa/phân quyền/logging/audit/i18n/version-up). zemory **tự nó đã dogfood xong**; SasinFlow docs đã sync, folder thật chưa nắn; project khác tự refactor khi được yêu cầu.


## 1. Nguyên tắc
> **Spec CHÍNH THỨC (cây từng-dòng + routing + convention) = harness file `docs/agent/02_STRUCTURE.md`** — ship cho MỌI app, agent đọc trực tiếp. Doc plan này = **nguyên tắc + quyết định thiết kế + rollout** (KHÔNG lặp cây, tránh 2 bản lệch).

- Mô tả theo **VAI TRÒ (role)**, KHÔNG khóa framework → áp Web / Desktop / CLI / AI / Data / Monorepo mà gần như không đổi cấu trúc.
- **Chuẩn RIÊNG của mình:** mỗi concern **1 TÊN duy nhất**; chỉ khi framework ÉP CỨNG (Next `pages/`, Django `models/`,`migrations/`, Rails `app/models`) mới theo tên nó — như Docker ép `Dockerfile` ở root.
- **Mục đích KÉP:** cấu trúc gọn + **INDEX điều hướng** — agent đọc rule là trỏ THẲNG folder cần sửa, KHỎI grep cả repo (nhanh + tiết kiệm token, đúng bất biến #1).
- **Nguồn = ĐẦU VÀO (git tracked); output/runtime/secret = ĐẦU RA (GITIGNORE).**
- Rule phục vụ mục tiêu (gọn / rạch ròi / định vị nhanh), KHÔNG ép cho đủ folder — **thiếu concern nào bỏ folder đó**.
- **BẮT BUỘC = 4:** `backend/(code)` · `frontend/` · `docs/` · `AGENTS.md`. TẤT CẢ folder khác `[opt]` — tạo KHI CÓ concern.
## 2. Cây thư mục chuẩn
**Cây thư mục ĐẦY ĐỦ (ghi chú từng dòng, gom 6 dải vai trò) + 3 nhóm ①TRACKED / ②ROOT-tool-ép / ③GITIGNORE → xem [`02_STRUCTURE.md §3`](../agent/02_STRUCTURE.md).**

Chỉ nhắc mốc: **BẮT BUỘC = 4** (`backend/(code)` · `frontend/` · `docs/` · `AGENTS.md`); mọi folder con (api…util, frontend/*, data/*, ROOT tool) đều `[opt]` — tạo KHI CÓ concern (INDEX = từ điển tên, **KHÔNG đẻ folder rỗng**). Không lặp cây ở đây để tránh 2 bản lệch.
## 3. Routing — sửa gì vào đâu
**Bảng routing "sửa gì / có gì → vào đâu" (1 tên chuẩn mỗi slot) → xem [`02_STRUCTURE.md §4`](../agent/02_STRUCTURE.md).** Chọn layer-first hay domain-first: [`02_STRUCTURE.md §2`](../agent/02_STRUCTURE.md).

Cốt lõi: cần thêm concern nào → mở THẲNG slot tương ứng, KHÔNG grep cả repo (INDEX điều hướng = tiết kiệm token).
## 4. Quyết định đã chốt
#2442 docs\plan\09_repo_structure.md — ## 4. Quyết định đã chốt
---
Quyết định thiết kế đã chốt (convention đầy đủ ở [`02_STRUCTURE.md §5`](../agent/02_STRUCTURE.md)):
- **Tách file harness thứ 4:** cấu trúc → `docs/agent/02_STRUCTURE.md` (markdown source), `01_RULES` chỉ còn con trỏ. Wire vào `STANDARD_AGENT` → mọi `zemory init` ship kèm.
- **1 TÊN / concern** (chuẩn riêng): `store/` (KHÔNG db|models), `pages/` (KHÔNG views|screens). Framework ép cứng mới đổi (Next `pages/`, Django `models/`).
- **BẮT BUỘC = 4**; tất cả còn lại `[opt]` — INDEX là TỪ ĐIỂN tên, tạo khi có.
- **6 loại non-code** rạch ròi: assets(media) · resources(đóng-gói) · config(operator) · data(runtime) · external(code-ngoài) · attic(backup).
- **3 loại kết nối:** `api/`(mình mở) · `integrations/`(SaaS ngoài) · `store/`(DATABASE remote/cloud/nội-bộ). external/=code-họ.
- **SQL 1 cách:** gom `store/queries.*` đặt tên, không rải inline. **Secret:** trỏ tên env (`password_env`), pass thật `.env`/vault→`data/`.
- **Dialog 3-size** (token `frontend/styles/`). **Setting UI:** default `frontend/config/`, user-chỉnh `data/settings/`.
- **Version/Packaging KHÔNG nhóm mới** — dùng git/Releases/data/migrations + `.spec`+scripts+resources/packaging+dist.
- **Đã gộp review GPT (9.8):** util=helper-thuần · auth-scope · events-scope · frontend/config-guardrail · data/-chia-con · types-escape-hatch (FE tách → packages/contracts).
- **Cross-cutting concern (2026-07-08/10) — bổ sung SAU review GPT:** mã hóa/encryption (vault/+store/+data/secrets) · phân quyền/authorization (auth/+middleware/+store/+config/) · logging/observability + audit-trail + error-handling (3 folder mới: `logging/` `audit/` `errors/`) · i18n 2 tầng (UI+server, gồm auto-dịch, 1 home `backend/src/i18n/`) · **meta-rule:** mọi concern xuyên suốt PHẢI có place+type rõ trong 02_STRUCTURE — thiếu thì BÁO + thêm (khỏi lọt, bài học từ vụ DB zemory plaintext không ai bắt được).
- **Version-up (2026-07-10) — concern tách khỏi "Version" (lưu-ở-đâu):** 2 kiểu — ① TỰ ĐỘNG (`backend/src/update/`, app tự check+tải+apply, PHẢI phối hợp attic/+dist/+migrations/) và ② THỦ CÔNG (git tag chốt version → dist/ build → `scripts/deploy.*` đẩy máy đích/VM → backup 2 CHIỀU: verify backup-trên-VM khớp attic/ local TRƯỚC khi đè, resync SAU khi deploy — không phải push 1 chiều).
- **`share/` (root, LFS bundle mã hóa xuyên máy)** — ngoại lệ có chủ đích của luật `data/=gitignore`, vì cần đi qua git để sync; giờ đã ghi rõ trong 02_STRUCTURE (trước đó là gap ẩn ngay trong chính zemory).
- **Renumber harness (2026-07-09):** `01_RULES→02_STRUCTURE→03_TODO→04_CHANGES` (STRUCTURE đọc ngay sau RULES, không nằm cuối). Kèm fix quan trọng: `adopt.ts` tự rename file cũ (`02_TODO`/`03_CHANGES`) sang tên mới khi `sync`, để project đã có harness từ trước không bị kẹt "non-standard" vĩnh viễn.
- **Chuẩn v2 (2026-07-10) — mở rộng phủ đủ mọi project + 2 trục sắp xếp:**
  - **2 trục tổ chức code** ([`02_STRUCTURE §2`](../agent/02_STRUCTURE.md)): LAYER-FIRST (slot phẳng dưới `src/`, mặc định app nhỏ/CRUD) vs DOMAIN-FIRST (`src/<domain>/` lồng lại slot, app nhiều domain). Cross-cutting (core/auth/vault/config/logging/audit/errors/i18n/update/migrations/shared/util) LUÔN ở `src/` gốc. **zemory chính LÀ domain-first** (`brain/`, `docs/`, `core/`) → chuẩn giờ CÔNG NHẬN, KHÔNG cần đập cấu trúc.
  - **Cây gom theo 6 dải** (biên-vào · biên-ra · xử-lý · nền-tảng · chia-sẻ · domain) — dễ quét mắt, biết slot mới thuộc nhóm nào.
  - **+10 slot phủ tác vụ phổ biến & mở rộng:** `cache/` (Redis/memcached app-level, KHÁC data/cache file) · `storage/` (object/blob + upload) · `notifications/` (email/SMS/push) · `search/` (index & retrieval FTS/vector/Elastic) · `pipelines/` (ETL/ingest/batch nhiều-bước) · `core/` (composition root: DI/registry/router/lifecycle) · `shared/` (**nâng từ `types/`**: type + RUNTIME dùng chung BE↔FE — zod/hằng/pure-logic) · `contracts/` (file spec API OpenAPI/proto/GraphQL-SDL) · `plugins/` (điểm mở rộng bên-thứ-3, KHÁC modules/=của-mình) · `generated/` (codegen output, gitignore). Frontend thêm `util/`+`types/` (đối xứng backend).
  - **Luật KHÔNG folder rỗng (nhấn mạnh):** INDEX = TỪ ĐIỂN TÊN để TRA, KHÔNG phải checklist phải tạo. Tạo folder CHỈ khi có concern/file thật; app điển hình chỉ 4–10 slot hiện diện. Áp chuẩn vào project = tùy concern mà tạo, tuyệt đối không đẻ một đống folder rỗng.
  - **Sửa ★ cho Node-CLI:** entry = file `run.*` HOẶC manifest khai `bin`/`main`; manifest ở root HOẶC `backend/`. zemory (bin ở root `package.json` → `dist/cli.js`) giờ ĐẠT ★, KHÔNG cần `backend/run.*` (trước đây tự-lệch chuẩn của chính mình — audit bắt được).
  - **UI embed (single-binary):** app CLI ship 1-file được phép embed trang UI như resource TS ở backend (vd zemory `ui-page.ts`) — GHI RÕ trong convention, KHÔNG ép tách sang `frontend/` nếu tách làm vỡ build 1-file.

- **Chuẩn NON-APP §7 (2026-07-11) — chuẩn phụ thứ 2, hết vùng trắng "ngoài phạm vi":**
  - **CÓ 2 CHUẨN, note ngay đầu doc** ([`02_STRUCTURE`](../agent/02_STRUCTURE.md)): §1–6 = APP (có code chạy) · §7 = NON-APP (sản phẩm/tài sản: BI/report, data, docs-only, design — vd `powerbi_sasinflow`). Agent xác định loại project TRƯỚC rồi áp đúng chuẩn.
  - **NON-APP bắt buộc = 3 vai trò:** `docs/` · `AGENTS.md` · ≥1 DELIVERABLE (`reports/`|`models/`|`content/`|`design/`) — KHÔNG `backend/frontend/`. Slot phụ: sources/ measures/ queries/ pipelines/ notebooks/ fixtures/ assets/ scripts/ config/ attic/; gitignore: data/ exports/ .env.
  - **Harness GIỮ Y HỆT app** (docs/agent/* + plan/ + .harness.json, cùng lệnh zemory) — chỉ thêm `docs/dictionary.md` [opt] cho BI/data (từ điển metric/cột, chống mỗi report tính 1 kiểu).
  - Nhị phân nặng (.pbix/.fig/.psd) → Git LFS; data thật → `data/` gitignore, mẫu nhỏ mở được file → `fixtures/` tracked; DAX/SQL/M gom `measures/`/`queries/` đặt tên (đối xứng `store/queries.*` app).
## 5. Phạm vi áp dụng
- **ÁP:** hầu hết app estate (UI + server-side) — desktop WebView2 (SasinFlow), web app, tool có cockpit (zemory), AI/data project, monorepo. Áp gần như không đổi cấu trúc.
- **KHÔNG ép** (convention riêng): thư viện/SDK thuần (không UI) · mobile native (Gradle/Xcode) · notebook / data rời · game engine (Unity/Unreal). Chuẩn note "ngoài phạm vi", không nhồi.
## 6. zemory thực thi thế nào — ship + check + guide (KHÔNG auto-move)
- **Ship chuẩn:** `docs-template/agent/02_STRUCTURE.md` (markdown source) → mọi project nhận qua `zemory init`/`sync`. `01_RULES.md` chỉ còn con trỏ tới file này.
- **Check lệch:** `zemory validate` báo advisory (liệt kê tầng có/thiếu; warn nếu code không ở `backend/`(`src/`) hoặc thiếu `AGENTS.md`).
- **Hướng dẫn reconcile:** `AGENTS.md §7/§8` — agent nắn từng app: `git mv` (giữ history) → sửa import/entry → verify; **hỏi trước khi đập lớn**. zemory chỉ chỉ ra chỗ lệch, KHÔNG tự move file.
- **Sync tự động cho project cũ:** `adopt.ts` có `LEGACY_RENAME` — project đã có harness cũ (`02_TODO.md`/`03_CHANGES.md`) tự rename sang tên mới (+ update `doc.path` trong DB) khi chạy `sync`, để không bị kẹt "non-standard" vĩnh viễn (bug tìm ra + vá 2026-07-10).
## 7. Rollout (chuẩn bị)
- **zemory: ✅ XONG (2026-07-08, dogfood).** `src/`→`backend/src/` · `test/`→`backend/test/` · `scripts/`→`backend/scripts/` · `prototype/web-capture/`→`attic/web-capture/` · `assets/`→`frontend/assets/`. Verify: `npm run check` (build+lint+57 test) PASS, `zemory validate`/`doctor` xanh, UI Cockpit chạy đúng. Tag backup: `pre-zemory-refactor`.
- **SasinFlow: docs ĐÃ sync (2026-07-10)** — `zemory sync` tự rename + gap-fill `02_STRUCTURE.md` (nhờ fix `LEGACY_RENAME`). **Cấu trúc folder THẬT chưa nắn** (`src/`, `web/`, `config/` chưa gom `backend/`/`frontend/`) — việc còn lại nếu cần.
- **SasinInfra: chưa đụng** — có `config/`+`vendor/` gần chuẩn, cần đổi `config/`→`backend/infra/`, `vendor/`→`external/` khi làm.
- **Nguyên tắc rollout (nhắc lại):** mỗi project tự refactor khi được yêu cầu — KHÔNG chủ động đụng project khác chỉ vì đang sửa chuẩn ở zemory. Project khác chỉ cần trỏ agent vào `AGENTS.md` (đọc + tự làm theo), không cần thao tác tay từ zemory.

