<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Scoped sync — chọn nguồn để đồng bộ / recall (Local·Web × máy × agent × nền)

> Spec: một **bộ chọn phạm vi** dạng cây mở rộng theo tầng, để người dùng tick chính xác lane trí nhớ nào được **sync / merge / recall** — và **loại "chỗ xài chung không nên lấy"**.
> **Trạng thái (cập nhật 2026-07-10): ✅ ĐÃ BUILD — core + CLI + UI.** `backend/src/memory/scope.ts` + `zemory memory scope [ls|exclude|include|clear]`. Nền provenance (`origin`/`source`/`host`/`project_root`) tái dùng, KHÔNG thêm store/table (đúng thiết kế §3).

## 1. Mục tiêu & nguyên tắc
- Cho phép **chọn đúng lane** trí nhớ theo cây phân tầng, thay vì "tất cả hoặc không".
- **Loại trừ chỗ dùng chung**: có những nơi (account web dùng chung, máy công ty, agent tạp…) **không nên** ingest vào memory riêng — phải bỏ được.
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
- ✅ **recall / search** (`backend/src/memory/search.ts`): `isExcluded()` lọc theo `excludeLanes` (mặc định = `getScopeExclude()` từ settings) trước khi trả kết quả.
- ✅ **sync** (`backend/src/memory/share.ts` export + merge): cùng danh sách exclude áp cho cả 2 chiều.
- ❌ **ingest (scan / scan-web)** — **CHƯA áp dụng**: `scan`/`scan-web` hiện quét/ingest TOÀN BỘ, không lọc theo scope lúc ingest (chỉ lọc sau, ở recall/sync). Muốn "bỏ máy công ty ngay từ lúc quét" thì đây là việc còn lại.

## 5. "Chỗ xài chung không nên lấy" — cơ chế loại trừ — ✅ ĐÃ CÓ
- Danh sách exclude lưu ở **`settings.json`** (qua `getScopeExclude`/`setScopeExclude` trong `backend/src/settings.ts`) — đúng phương án nghiêng ở §6 cũ (config, không phải data).
- Mặc định **include tất**; exclude opt-in, **hiện rõ** trong `zemory memory scope ls` (đánh dấu `✗ EXCLUDED` / `✗ excluded (covered by a broader rule)`) — không cắt âm thầm.
- Exclude là *lọc lúc chạy*, KHÔNG xóa dữ liệu; muốn xóa hẳn vẫn dùng `memory forget`.
- CLI: `zemory memory scope exclude|include --origin <local|web> --host <máy> --source <agent>` · `zemory memory scope clear`.
- UI: `ui.ts` đã expose `scopeTree`/`scopeExcluded`/`scopeRules` cho cockpit.

## 6. Quyết định — ĐÃ CHỐT qua code (không còn "mở")
- ✅ Lưu ở `settings.json` (không phải cột/bảng) — đúng như nghiêng.
- ✅ Exclude theo **lane tĩnh** (origin/host/source cụ thể) — **CHƯA** có rule dạng glob project_root (nếu cần lọc theo pattern project thì đây là mở rộng sau).
- ❌ **Profile nhiều bộ chọn** (đổi nhanh "chỉ code"/"chỉ web") — CHƯA có, chỉ 1 danh sách exclude đang hoạt động tại 1 thời điểm.
- ✅ UI tái dùng app-mode window có sẵn (không phải cây tick riêng biệt — hiện là data-driven, xem cockpit).
- ✅ Quan hệ với sync xuyên máy (plan 02 §0): scope lọc TRƯỚC khi export và TRƯỚC khi merge — đúng thiết kế.

## 7. MỨC ĐỘ sync (ý tưởng user 2026-07-20) — chọn sync "sâu tới đâu"

> Khác §2–§5: chỗ đó chọn **LANE NÀO** (Local/Web × máy × agent) được sync. Mục này chọn **SÂU TỚI ĐÂU** trong một lane: chỉ chữ, hay kéo theo cả file đã upload. User nêu: *"chọn sync ở mức độ nào, mess thôi, hoặc lấy luôn file đã up"*.

**Ba mức đề xuất:**

| Mức | Chở gì | Trạng thái |
|---|---|---|
| **L1 — chỉ message** ("mess thôi") | `sessions` · `messages` · `known_stores` | ✅ **ĐÃ LÀ MẶC ĐỊNH HÔM NAY** — chính là bundle `payload=rows` (lean 184.6MB · delta 1.8MB) |
| **L2 — snapshot đầy đủ** | thêm mọi lớp dẫn xuất (FTS · vector · digest · doc/section) | ✅ đã có: cờ `--full`, giữ cho disaster-restore |
| **L3 — kèm FILE đã upload** | bytes của ảnh/file người dùng đính kèm | ❌ **CHƯA KHẢ THI** — xem đo bên dưới |

**Kiểm chứng khả thi L3 (đo thật trên DB sống 2026-07-20 — KHÔNG suy đoán):**
- Schema **không có bảng/cột nào chứa file**: `messages` chỉ có `content TEXT` (`id · session_id · uuid · role · content · tool_name · timestamp`); không có `artifact`/`attachment`/blob store nào trong DB.
- Trên **144.396 message**: `file-service://` (con trỏ asset của ChatGPT) = **0 dòng**; chuỗi `attachment` = 77 dòng nhưng là **chữ người viết**, không phải tham chiếu tải được.
- Nguyên nhân: `scanweb.ts` flatten `content.parts[]` **chỉ lấy phần text** — part ảnh/file bị bỏ ngay lúc ingest. Nên **không có cả con trỏ lẫn bytes** để mà sync.
- Với agent local (Claude Code/Codex): "file" đi vào memory dưới dạng **tool output = text** trong `messages`, nên L1 vốn đã chở phần chữ đó rồi; cái thiếu chỉ là **binary gốc**.

⇒ **L3 không phải một công tắc sync — nó là một năng lực CAPTURE mới**, phải làm trước 3 việc: ① `scanweb` giữ non-text part + tải asset qua phiên đã login · ② có chỗ chứa blob (kiểu `artifact` store — thiết kế cũ nằm ở plan 03 DROPPED + `attic/`) · ③ rồi mới thêm mức sync chở nó.

**Phản biện thiết kế trước khi ai đó bắt tay vào L3** (nêu để quyết định có cơ sở, quyền chốt là user):
- **Đụng HP điều 7:** `share/` là git-LFS **tracked**; nhét file người dùng upload vào bundle = đẩy PII thật lên git — điều 7 cấm commit data thật. Nếu làm, blob phải nằm ngoài luồng git hoặc mã hoá + tách kho.
- **Đụng kết quả vừa đạt:** vừa cắt bundle 709MB → 184MB → delta 1.8MB (−74%); binary sẽ thổi ngược lại và xoá phần lớn lợi ích đó.
- **Đề xuất:** làm **L1/L2 selector trước** (đã có sẵn, chỉ thiếu chỗ bấm), L3 để dạng ý tưởng có điều kiện — chỉ mở khi user thật sự cần file gốc xuyên máy và chấp nhận đánh đổi dung lượng + luồng lưu riêng cho blob.

## Còn lại (backlog thật)
- [x] ~~**Export gọn + DELTA**~~ **HOÀN TẤT 2026-07-19** — xem `06_CHANGES`. Phát hiện then chốt: `mergeMemoryBundle` VỐN chỉ đọc `sessions`/`messages`/`known_stores`; mọi lớp dẫn xuất trong bundle là **hàng chết được chở đi vô ích**. Nay bundle mặc định là **payload `rows`** (chỉ 3 bảng nguồn, DDL copy verbatim từ source nên schema đổi không phải sửa); `--full` giữ lại cho disaster-restore. `sinceMessageId` → **delta**; watermark per-bundle ở bảng `sync_state` (schema **v13**, per-máy, KHÔNG đi theo bundle). **Đo thật trên DB 709.1MB: lean 184.6MB (−74%, 4s) · delta ~1.6k msg = 1.8MB (0.2s).** Round-trip verify: 1173 session / 144.396 msg khớp tuyệt đối, **FTS dựng lại đúng** (13.946 hit `zemory`, khớp nguồn), re-merge +0/+0.
  - **Còn lại (thuộc plan 14):** `syncDrive` vẫn đẩy **lean baseline** (1 file/máy, ghi đè) — CỐ Ý chưa dùng delta vì file đó phải tự-đủ, máy bỏ lỡ vài lần sync sẽ hổng nếu chỉ có delta cuối. Delta dùng file tích luỹ + compact định kỳ, làm cùng daemon auto-sync (plan 14 §3b).
- [ ] Áp scope lúc **ingest** (scan/scan-web) — bỏ qua lane ngay từ lúc quét, không chỉ lọc sau.
- [ ] Exclude theo **rule/glob** (không chỉ lane tĩnh) nếu cần lọc theo pattern project_root.
- [ ] **Profile nhiều bộ chọn** nếu user cần đổi nhanh giữa nhiều cấu hình exclude.
