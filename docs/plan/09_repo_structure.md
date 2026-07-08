<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory plan set` -->
# Chuẩn cấu trúc repo — bộ khung dùng chung cho mọi app

> Spec bộ khung thư mục chuẩn zemory **ship + thực thi** cho mọi app (UI + server-side).
> Mục tiêu: **ít folder, dễ quét mắt**, rạch ròi của-mình vs ngoài, một chuẩn cho nhiều stack.
> Trạng thái (2026-07-06): **CHỐT thiết kế**, đang chuẩn bị rollout (áp lên các app).

## 1. Nguyên tắc
> **Spec CHÍNH THỨC (cây từng-dòng + routing + convention) = harness file `docs/agent/04_STRUCTURE.md`** — ship cho MỌI app, agent đọc trực tiếp. Doc plan này = **nguyên tắc + quyết định thiết kế + rollout** (KHÔNG lặp cây, tránh 2 bản lệch).

- Mô tả theo **VAI TRÒ (role)**, KHÔNG khóa framework → áp Web / Desktop / CLI / AI / Data / Monorepo mà gần như không đổi cấu trúc.
- **Chuẩn RIÊNG của mình:** mỗi concern **1 TÊN duy nhất**; chỉ khi framework ÉP CỨNG (Next `pages/`, Django `models/`,`migrations/`, Rails `app/models`) mới theo tên nó — như Docker ép `Dockerfile` ở root.
- **Mục đích KÉP:** cấu trúc gọn + **INDEX điều hướng** — agent đọc rule là trỏ THẲNG folder cần sửa, KHỎI grep cả repo (nhanh + tiết kiệm token, đúng bất biến #1).
- **Nguồn = ĐẦU VÀO (git tracked); output/runtime/secret = ĐẦU RA (GITIGNORE).**
- Rule phục vụ mục tiêu (gọn / rạch ròi / định vị nhanh), KHÔNG ép cho đủ folder — **thiếu concern nào bỏ folder đó**.
- **BẮT BUỘC = 4:** `backend/(code)` · `frontend/` · `docs/` · `AGENTS.md`. TẤT CẢ folder khác `[opt]` — tạo KHI CÓ concern.
## 2. Cây thư mục chuẩn
**Cây thư mục ĐẦY ĐỦ (ghi chú từng dòng) + 3 nhóm ①TRACKED / ②ROOT-tool-ép / ③GITIGNORE → xem [`04_STRUCTURE.md §2`](../agent/04_STRUCTURE.md).**

Chỉ nhắc mốc: **BẮT BUỘC = 4** (`backend/(code)` · `frontend/` · `docs/` · `AGENTS.md`); mọi folder con (api…util, frontend/*, data/*, ROOT tool) đều `[opt]` — tạo KHI CÓ concern. Không lặp cây ở đây để tránh 2 bản lệch.
## 3. Routing — sửa gì vào đâu
**Bảng routing "sửa gì / có gì → vào đâu" (1 tên chuẩn mỗi slot) → xem [`04_STRUCTURE.md §3`](../agent/04_STRUCTURE.md).**

Cốt lõi: cần thêm concern nào → mở THẲNG slot tương ứng, KHÔNG grep cả repo (INDEX điều hướng = tiết kiệm token).
## 4. Quyết định đã chốt
Quyết định thiết kế đã chốt (convention đầy đủ ở [`04_STRUCTURE.md §4`](../agent/04_STRUCTURE.md)):
- **Tách file harness thứ 4:** cấu trúc → `docs/agent/04_STRUCTURE.md` (markdown source), `01_RULES` chỉ còn con trỏ. Wire vào `STANDARD_AGENT` → mọi `zemory init` ship kèm.
- **1 TÊN / concern** (chuẩn riêng): `store/` (KHÔNG db|models), `pages/` (KHÔNG views|screens). Framework ép cứng mới đổi (Next `pages/`, Django `models/`).
- **BẮT BUỘC = 4**; tất cả còn lại `[opt]` — INDEX là TỪ ĐIỂN tên, tạo khi có.
- **6 loại non-code** rạch ròi: assets(media) · resources(đóng-gói) · config(operator) · data(runtime) · external(code-ngoài) · attic(backup).
- **3 loại kết nối:** `api/`(mình mở) · `integrations/`(SaaS ngoài) · `store/`(DATABASE remote/cloud/nội-bộ). external/=code-họ.
- **SQL 1 cách:** gom `store/queries.*` đặt tên, không rải inline. **Secret:** trỏ tên env (`password_env`), pass thật `.env`/vault→`data/`.
- **Dialog 3-size** (token `frontend/styles/`). **Setting UI:** default `frontend/config/`, user-chỉnh `data/settings/`.
- **Version/Packaging KHÔNG nhóm mới** — dùng git/Releases/data/migrations + `.spec`+scripts+resources/packaging+dist.
- **Đã gộp review GPT (9.8):** util=helper-thuần · auth-scope · events-scope · frontend/config-guardrail · data/-chia-con · types-escape-hatch (FE tách → packages/contracts).
## 5. Phạm vi áp dụng
- **ÁP:** hầu hết app estate (UI + server-side) — desktop WebView2 (SasinFlow), web app, tool có cockpit (zemory), AI/data project, monorepo. Áp gần như không đổi cấu trúc.
- **KHÔNG ép** (convention riêng): thư viện/SDK thuần (không UI) · mobile native (Gradle/Xcode) · notebook / data rời · game engine (Unity/Unreal). Chuẩn note "ngoài phạm vi", không nhồi.
## 6. zemory thực thi thế nào — ship + check + guide (KHÔNG auto-move)
- **Ship chuẩn:** rule §"Cấu trúc repo — chuẩn & routing" trong `docs-template/agent/01_RULES.md` → mọi project nhận qua harness.
- **Check lệch:** `zemory validate` báo advisory (liệt kê tầng có/thiếu; warn nếu code không ở `backend/`(`src/`) hoặc thiếu `AGENTS.md`).
- **Hướng dẫn reconcile:** `AGENTS.md §7` — agent nắn từng app: `git mv` (giữ history) → sửa import/entry → verify; **hỏi trước khi đập lớn**. zemory chỉ chỉ ra chỗ lệch, KHÔNG tự move file.

## 7. Rollout (chuẩn bị)
- Áp lên app hiện có (agent-assisted, từng app, hỏi trước):
  - SasinInfra: gần chuẩn (đã có backend/frontend/config+vendor) → đổi `config/`→`backend/infra/`, `vendor/`→`external/`.
  - zemory: gom `src/`→`backend/`, `deps/`→`external/`, cân nhắc tách UI-generated (`ui-page.ts`) sang `frontend/` (hay giữ code-gen trong backend).
