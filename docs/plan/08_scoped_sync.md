<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Scoped sync — chọn nguồn để đồng bộ / recall (Local·Web × máy × agent × nền)

> Spec: một **bộ chọn phạm vi** dạng cây mở rộng theo tầng, để người dùng tick chính xác lane trí nhớ nào được **sync / merge / recall** — và **loại "chỗ xài chung không nên lấy"**.
> **Trạng thái (cập nhật 2026-07-10): ✅ ĐÃ BUILD — core + CLI + UI.** `backend/src/brain/scope.ts` + `zemory brain scope [ls|exclude|include|clear]`. Nền provenance (`origin`/`source`/`host`/`project_root`) tái dùng, KHÔNG thêm store/table (đúng thiết kế §3).

## 1. Mục tiêu & nguyên tắc
- Cho phép **chọn đúng lane** trí nhớ theo cây phân tầng, thay vì "tất cả hoặc không".
- **Loại trừ chỗ dùng chung**: có những nơi (account web dùng chung, máy công ty, agent tạp…) **không nên** ingest vào brain riêng — phải bỏ được.
- **Provenance TUYỆT ĐỐI không lẫn**: mỗi memory luôn giữ nguồn gốc thật; bộ chọn chỉ *lọc*, KHÔNG bao giờ đổi/gộp nguồn (RULES §3 — 1 nguồn sự thật).
- Tái dùng engine sẵn có (RULES §1): không viết store thứ 2; bộ chọn = query rollup + bộ lọc.

## 2. Cây chọn — 2 nhánh gốc — ✅ ĐÃ CÓ
- **Local** → **máy** (`host`) → **agent** (`source`: claude-code / codex / continue / lmstudio…)
- **Web** → **nền** (`source`: chatgpt-web / gemini-web / claude-web) *(+ Claude desktop nếu sau này có adapter)*
- `scopeTree()` (scope.ts) dựng cây, đếm session/message mỗi nút; `laneKey()` = định danh lane ổn định cho toggle UI/dedup.

## 3. Mô hình dữ liệu — ĐÃ CÓ, KHÔNG thêm bảng
- Cây suy ra từ 4 cột sẵn có trên `sessions`: `origin` (local|web) · `source` (agent/nền) · `host` (máy) · `project_root` (dự án).
- Không migration, không cột mới — đúng như thiết kế.

## 4. Áp bộ chọn vào đâu — 2/3 điểm ĐÃ DÙNG, 1 điểm CHƯA
- ✅ **recall / search** (`backend/src/brain/search.ts`): `isExcluded()` lọc theo `excludeLanes` (mặc định = `getScopeExclude()` từ settings) trước khi trả kết quả.
- ✅ **sync** (`backend/src/brain/share.ts` export + merge): cùng danh sách exclude áp cho cả 2 chiều.
- ❌ **ingest (scan / scan-web)** — **CHƯA áp dụng**: `scan`/`scan-web` hiện quét/ingest TOÀN BỘ, không lọc theo scope lúc ingest (chỉ lọc sau, ở recall/sync). Muốn "bỏ máy công ty ngay từ lúc quét" thì đây là việc còn lại.

## 5. "Chỗ xài chung không nên lấy" — cơ chế loại trừ — ✅ ĐÃ CÓ
- Danh sách exclude lưu ở **`settings.json`** (qua `getScopeExclude`/`setScopeExclude` trong `backend/src/settings.ts`) — đúng phương án nghiêng ở §6 cũ (config, không phải data).
- Mặc định **include tất**; exclude opt-in, **hiện rõ** trong `zemory brain scope ls` (đánh dấu `✗ EXCLUDED` / `✗ excluded (covered by a broader rule)`) — không cắt âm thầm.
- Exclude là *lọc lúc chạy*, KHÔNG xóa dữ liệu; muốn xóa hẳn vẫn dùng `brain forget`.
- CLI: `zemory brain scope exclude|include --origin <local|web> --host <máy> --source <agent>` · `zemory brain scope clear`.
- UI: `ui.ts` đã expose `scopeTree`/`scopeExcluded`/`scopeRules` cho cockpit.

## 6. Quyết định — ĐÃ CHỐT qua code (không còn "mở")
- ✅ Lưu ở `settings.json` (không phải cột/bảng) — đúng như nghiêng.
- ✅ Exclude theo **lane tĩnh** (origin/host/source cụ thể) — **CHƯA** có rule dạng glob project_root (nếu cần lọc theo pattern project thì đây là mở rộng sau).
- ❌ **Profile nhiều bộ chọn** (đổi nhanh "chỉ code"/"chỉ web") — CHƯA có, chỉ 1 danh sách exclude đang hoạt động tại 1 thời điểm.
- ✅ UI tái dùng app-mode window có sẵn (không phải cây tick riêng biệt — hiện là data-driven, xem cockpit).
- ✅ Quan hệ với sync xuyên máy (plan 02 §0): scope lọc TRƯỚC khi export và TRƯỚC khi merge — đúng thiết kế.

## Còn lại (backlog thật)
- [x] ~~**Export gọn + DELTA**~~ **HOÀN TẤT 2026-07-19** — xem `06_CHANGES`. Phát hiện then chốt: `mergeBrainBundle` VỐN chỉ đọc `sessions`/`messages`/`known_stores`; mọi lớp dẫn xuất trong bundle là **hàng chết được chở đi vô ích**. Nay bundle mặc định là **payload `rows`** (chỉ 3 bảng nguồn, DDL copy verbatim từ source nên schema đổi không phải sửa); `--full` giữ lại cho disaster-restore. `sinceMessageId` → **delta**; watermark per-bundle ở bảng `sync_state` (schema **v13**, per-máy, KHÔNG đi theo bundle). **Đo thật trên DB 709.1MB: lean 184.6MB (−74%, 4s) · delta ~1.6k msg = 1.8MB (0.2s).** Round-trip verify: 1173 session / 144.396 msg khớp tuyệt đối, **FTS dựng lại đúng** (13.946 hit `zemory`, khớp nguồn), re-merge +0/+0.
  - **Còn lại (thuộc plan 14):** `syncDrive` vẫn đẩy **lean baseline** (1 file/máy, ghi đè) — CỐ Ý chưa dùng delta vì file đó phải tự-đủ, máy bỏ lỡ vài lần sync sẽ hổng nếu chỉ có delta cuối. Delta dùng file tích luỹ + compact định kỳ, làm cùng daemon auto-sync (plan 14 §3b).
- [ ] Áp scope lúc **ingest** (scan/scan-web) — bỏ qua lane ngay từ lúc quét, không chỉ lọc sau.
- [ ] Exclude theo **rule/glob** (không chỉ lane tĩnh) nếu cần lọc theo pattern project_root.
- [ ] **Profile nhiều bộ chọn** nếu user cần đổi nhanh giữa nhiều cấu hình exclude.
