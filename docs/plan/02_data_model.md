<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory plan set` -->
# zemory — Data model (global_memory.db ERD)

> Cấu trúc `~/.zemory/global_memory.db` — store global duy nhất, **3 loại nội dung đều ĐÃ BUILD**,
> tất cả **query bằng FTS**. Nguồn = DB; `docs/*.md` = bản render mirror.

---

## 0. Nguyên tắc & quyết định (CHỐT 2026-06-18)
- Curated docs, TODO, specs và changelog lấy SQLite làm nguồn; markdown có header GENERATED là mirror một chiều.
- Transcript gốc của host là nguồn episodic; `sessions/messages` và FTS là lens dẫn xuất có thể rebuild.
- Sửa curated content qua `plan set`, `docs add`, `changelog add`; routine `docs sync` chỉ seed hand-source và không re-import generated mirror đã có trong DB.
- Mọi mutation section phải scope theo `project_root`; mọi path render/delete phải nằm trong `docs/`.
- Schema có version và migration; trước migration global phải backup bằng SQLite online backup.

## 1. ERD (toàn cảnh global_memory.db — TẤT CẢ ĐÃ BUILD)
```text
sessions 1──N messages ── FTS5 word + trigram
    │             │
    │             └─ source transcript + ingest_state(parser_version/offset)
    └─ source, project_root, title, time range

doc 1──N section ── self parent_id + FTS5 heading/body
 │
 └─ project_root, path, kind, rendered_at

changelog ── FTS5 title/body
 └─ project_root, date, supersedes_id, archived, created_at

known_stores       adapter store locations discovered by scan
schema_version     ordered DB migrations
```

SQLite bật WAL, foreign keys, busy timeout và synchronous NORMAL để nhiều reader cùng dùng local brain.

## 2. Schema và migration — nguồn thực thi ở backend/src/brain/db.ts
Schema thực thi duy nhất nằm trong `backend/src/brain/db.ts`; plan không lặp một bản DDL dài dễ trôi lệch. Các invariant bắt buộc:

- `sessions.id` và `messages(session_id, uuid)` hỗ trợ ingest idempotent;
- FTS tables đồng bộ bằng trigger insert/delete/update phù hợp (một số bảng — `messages_fts`/`messages_fts_tri`, migration v12 — là EXTERNAL CONTENT, đọc content từ bảng gốc thay vì giữ bản copy riêng);
- `doc(project_root, path)` unique và `section` giữ body markdown verbatim;
- changelog giữ metadata `archived`/`supersedes_id` trong DB, không encode archive thành folder thứ hai;
- `ingest_state` lưu size, mtime, complete-line offset và `parser_version`;
- `schema_version` chạy migration tăng dần; parser v2 đánh dấu state v1 để full re-ingest tự phục hồi đúng một lần.

Thêm hoặc đổi cột phải đi qua migration test trên DB tạm và backup trước khi áp global DB.

## 3. Cách tìm (access patterns) — KHÔNG "index trước rồi trỏ"
- Brain search filter `project_root` ngay trong từng FTS stream trước candidate limit, sau đó mới RRF và per-session diversification.
- `--all` bỏ scope có chủ đích; progressive disclosure trả snippet/ID trước và `show` mở một row.
- Plan search join FTS section với doc và weight heading cao hơn body.
- Changelog search giữ cả active lẫn archived để quyết định cũ vẫn recall được.
- TOC là query `section ORDER BY ordinal`; không có `00_INDEX` nguồn riêng.

## 4. Sync `db → md` (db là nguồn)
- `plan set` và `docs add` cập nhật DB rồi render ngay đúng mirror.
- `changelog add` cập nhật DB rồi render ngay `04_CHANGES.md`.
- `docs sync` import file chưa generated hoặc phục hồi DB rỗng; generated mirror có row DB tương ứng được giữ nguyên và không đổi ID.
- `docs render` là thao tác DB → markdown có chủ đích và có thể ghi đè mirror.
- `archive` chỉ set `changelog.archived=1` rồi render active rows; full history vẫn ở DB/FTS.

## 5. Trạng thái harness hiện tại (cập nhật 2026-07-14)
Harness chuẩn (`docs-template/`, ship cho project khác) gồm:

- `docs/agent/01_RULES.md`, `02_STRUCTURE.md`, `03_TODO.md`, `04_CHANGES.md`;
- `docs/plan/00_build_plan.md` (điểm khởi đầu template);
- `docs/.harness.json` chọn provider và threshold.

Backlog riêng của chính zemory (dogfood, KHÔNG thuộc template) mở rộng thêm `docs/plan/01`–`12` theo thời gian: repo survey, data model (file này), compression (đã bỏ scope), roadmap, RAG, digest, web-chat capture, scoped sync, repo structure, token-savings dashboard (đã gỡ), DB size optimization, vector rebuild 256d.

Global brain ở `GLOBAL_MEMORY_DB` hoặc `~/.zemory/global_memory.db`.

Các file `00_INDEX`, `02_CONTEXT`, overview dẫn xuất, notes và archive markdown không còn thuộc schema chuẩn.

> **Lưu ý kỹ thuật (2026-07-14):** section này (và 7 doc khác của chính project zemory: `01_RULES.md`, `00_build_plan.md`, `01_repo_survey.md`, `03_subscription_quota_safe_compression.md`, `04_remaining_capabilities_roadmap.md`, `05_rag.md`, `08_scoped_sync.md`) hiện lưu trong DB dưới dạng **1 section duy nhất** thay vì tách theo heading như các doc khác — di sản từ lúc repo đổi đường dẫn (`D:\Work_Study\...` → `D:\Zyro\Tool\Zemory`). Xem TODO mục "Bug đồng bộ docs" để biết chi tiết; chưa sửa vì cần hiểu rõ cơ chế split trong `docs/plan.ts` trước khi mổ DB.
