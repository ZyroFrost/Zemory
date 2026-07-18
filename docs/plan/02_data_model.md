<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
> Cấu trúc `~/.zemory/global_memory.db` — store global duy nhất, **3 loại nội dung đều ĐÃ BUILD**,
> tất cả **query bằng FTS**. Curated docs: **file `.md` là NGUỒN (FILE WINS, HP điều 3)**; bảng `doc/section/changelog` trong DB = **index dẫn xuất**, rebuild được từ `.md`.

---

## 0. Nguyên tắc & quyết định (CHỐT 2026-06-18)
- Curated docs, TODO, specs và changelog: **file `.md` là NGUỒN (FILE WINS)**; bảng `doc/section/changelog` là index dẫn xuất, rebuild từ `.md` (HP điều 3, chốt 2026-07-16 — supersede mô hình cũ "DB là nguồn, md là mirror").
- Transcript gốc của host là nguồn episodic; `sessions/messages` và FTS là lens dẫn xuất có thể rebuild.
- Sửa curated content = sửa `.md` trực tiếp (file wins); search index dựng lại bằng `zemory reindex` (đọc `.md`, KHÔNG ghi ngược). (Mọi lệnh ghi DB→md — docs sync/render · plan set · docs add · changelog add — đã gỡ hoàn toàn.)
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

## 4. Quan hệ `.md` ↔ DB (FILE WINS — file là nguồn)
- Sửa thường = sửa `.md` trực tiếp; DB doc/section/changelog dựng lại (index dẫn xuất) từ `.md`.
- `zemory reindex` đọc `.md` (docs/plan + 06_CHANGES) → dựng lại doc/section/changelog index; **thuần đọc, KHÔNG ghi ngược file**.
- Thêm/sửa/xoá nội dung docs = sửa/xoá file `.md` trực tiếp; chạy `reindex` để search tươi.
- KHÔNG còn lệnh render DB→md hay sửa-qua-DB (docs render/sync · plan set · docs add · changelog add) — **đã gỡ hoàn toàn 2026-07-17** (vi phạm FILE WINS).
- `archive` là thao tác FILE: cắt entry cũ khỏi `06_CHANGES.md` sang `docs/agent/archive/06_CHANGES.md` (cold, ngoài bộ đọc mỗi phiên), rồi reindex main. KHÔNG dùng cờ DB.

## 5. Trạng thái harness hiện tại (cập nhật 2026-07-14)
Harness chuẩn (`docs_template/`, ship cho project khác) gồm:

- `docs/agent/01_CONSTITUTION.md`, `02_RULES.md`, `03_STRUCTURE.md`, `04_SKILLS.md`, `05_TODO.md`, `06_CHANGES.md`;
- `docs/plan/00_overview.md` (điểm khởi đầu template);
- `docs/.harness.json` chọn provider và threshold.

Backlog riêng của chính zemory (dogfood, KHÔNG thuộc template) mở rộng thêm `docs/plan/01`–`12` theo thời gian: repo survey, data model (file này), compression (đã bỏ scope), roadmap, RAG, digest, web-chat capture, scoped sync, repo structure, token-savings dashboard (đã gỡ), DB size optimization, vector rebuild 256d.

Global brain ở `GLOBAL_MEMORY_DB` hoặc `~/.zemory/global_memory.db`.

Các file `00_INDEX`, `02_CONTEXT`, overview dẫn xuất, notes và archive markdown không còn thuộc schema chuẩn.

> **Lưu ý kỹ thuật (2026-07-14):** section này (và 7 doc khác của chính project zemory: `02_RULES.md` — tên sau renumber, `00_overview.md`, `01_repo_survey.md`, `03_subscription_quota_safe_compression.md`, `04_remaining_capabilities_roadmap.md`, `05_rag.md`, `08_scoped_sync.md`) hiện lưu trong DB dưới dạng **1 section duy nhất** thay vì tách theo heading như các doc khác — di sản từ lúc repo đổi đường dẫn (`D:\Work_Study\...` → `D:\Zyro\Tool\Zemory`). **ĐÃ tự lành 2026-07-16** (FILE WINS: so cả CẤU TRÚC khi reindex → tách lại đúng heading; cả 8 doc về 7–30 section). Xem 04_TODO + 05_CHANGES.
