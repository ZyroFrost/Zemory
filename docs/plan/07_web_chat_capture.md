<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory plan set` -->
# Web-chat capture — thu session từ ChatGPT / Gemini / Claude.ai
> Spec cho năng lực: nuốt hội thoại **web chat** (chatgpt.com, gemini.google.com, claude.ai) vào global brain.
> Khác adapter agent CLI/IDE (`claude-code`, `codex`, `continue`, `lmstudio`): web chat nằm ở **server**, KHÔNG ghi file ra đĩa → `brain scan` quét đĩa không với tới. Phải lấy qua **export chính chủ** hoặc **browser** (đăng nhập).
> Ưu tiên: **GPT trước**, rồi Gemini, rồi Claude.ai.
> **Trạng thái (cập nhật 2026-07-08): ✅ v1 ĐÃ SHIP cho ChatGPT** — `backend/src/brain/scanweb.ts` (browser-connector), schema **v9 có cột `origin`**, **859 hội thoại ChatGPT** (~30.9k msg, cả Project chats) đã vào brain. Gemini/Claude.ai chưa làm. Scripts prototype cũ dời `attic/web-capture/`.
## 1. Mục tiêu & nguyên tắc
- Tái dùng brain hiện có: `sessions`/`messages`, dedup `UNIQUE(session_id,uuid)`, redact, digest, recall, sync — KHÔNG tạo store thứ 2 (RULES §3). Web chat chỉ là thêm `source` + nhánh `origin`.
- Tiết kiệm token/công: EXTEND engine, không viết lại (RULES §1).
- Luật project: chỉ code parser một nền SAU KHI có data thật → **đã có** (kéo được 219 hội thoại thật, §5), format đã verify (§6).

## 2. Local vs Web — vì sao tách nhánh
- **local** = tool chạy trên máy tự ghi transcript ra đĩa (claude-code, codex, continue, lmstudio). `brain scan` đọc file.
- **web** = hội thoại trên server (ChatGPT/Gemini/Claude web), không có file. Phải đăng nhập trình duyệt để lấy.
- Trộn chung khi search sẽ **loạn** (việc code lẫn brainstorm web) → cần chiều phân loại rõ.

## 3. Nhánh `origin` — thiết kế DB (migration v6)
- Thêm **một CỘT** `sessions.origin TEXT NOT NULL DEFAULT 'local'`, giá trị `'local' | 'web'`. **KHÔNG tách bảng riêng.**
- Migration **v6**: `ALTER TABLE sessions ADD COLUMN origin ...` + `CREATE INDEX idx_sessions_origin`. Backfill: phiên cũ (245) = `'local'` (mặc định lo sẵn).
- Adapter/connector web set `origin='web'`; `source` giữ nền cụ thể (`chatgpt-web`/`gemini-web`/`claude-web`).
- Search/recall + UI thêm **facet Local / Web**: lọc chỉ-local, chỉ-web, hoặc cả hai có nhãn.
- **Vì sao 1 cột không phải table:** RULES §3 "1 nguồn sự thật". Table riêng ⇒ mọi query UNION, nhân đôi messages/FTS/vector/digest. Một cột = giữ 1 store + 1 đường search, chỉ thêm bộ lọc. ERD toàn bộ đã vẽ (artifact ngoài repo).

## 4. Ba cơ chế thu — chọn v2b (browser-connector)
- **v1 — file-drop (offline, ToS sạch):** user Export chính chủ → thả `conversations.json` vào `~/.zemory/imports/<platform>/` → adapter `whole` multi-session. Ưu: sạch tuyệt đối. Nhược: thủ công, đợi email. Dùng làm fallback + để nuốt bộ data test.
- **v2a — browser extension (push):** MV3 hook `fetch`/XHR → `POST /ingest-web`. Mạnh nhưng phải viết + cài extension, maintain per-site.
- **v2b — BROWSER-CONNECTOR (CHỌN):** zemory mở **cửa sổ trình duyệt riêng** (profile `~/.zemory/browser/<platform>`), **user đăng nhập 1 lần** vào trang thật của nền (id/pass/2FA nhập vào OpenAI, KHÔNG vào zemory). Sau đó zemory **điều khiển cửa sổ đó qua CDP (`--remote-debugging-port`)**, gọi API nội bộ của site bằng phiên đã login để kéo hội thoại. Profile lưu cookie → lần sau tự chạy, chỉ login lại khi phiên hết hạn.
  - Password **không bao giờ đi qua zemory**; chỉ "mượn" phiên. Đây là cách sạch — đối lập với copy cookie (đã bị guard chặn) và OAuth (OpenAI KHÔNG mở API đọc lịch sử — đã xác minh).
  - Chạy trong browser thật nên **qua được Cloudflare** (điều mà fetch từ Node thuần bị chặn).

## 5. KẾT QUẢ TEST (2026-07-02/03) — feasibility CONFIRMED
> **✅ ĐÃ SHIP (2026-07-08):** cơ chế này giờ là `backend/src/brain/scanweb.ts` — **859 hội thoại ChatGPT** đã bắt (kể cả Project chats qua gizmo endpoints, có pace/backoff/resume). Phần dưới là kết quả TEST prototype ban đầu (giữ làm lịch sử).

Prototype (scripts giờ ở `attic/web-capture/`): mở Edge debug + login-once + CDP pull.
- Tài khoản test `zyrofrost@gmail.com`: **enumerate đủ 752 hội thoại**; **kéo thành công 219** (6.636 message) với đúng nội dung; **533 fail = rate-limit 429** (sau ~200 request liên tục, không backoff) — đã fix bằng pace/backoff/resume ở bản ship.
- Search thử nội dung (không chỉ title): tìm chủ đề "chính trị" → 38 hội thoại khớp, có trích đoạn thật ⇒ **lấy được + tìm được + đọc được content thật**.
- Điều KHÔNG làm được (đã xác minh, để khỏi thử lại): (a) **OAuth đọc lịch sử** — OpenAI không có. (b) **Copy cookie/DPAPI** từ profile Edge sẵn — guard chặn + App-Bound Encryption. (c) **fetch backend-api từ Node thuần** — Cloudflare chặn 403.
## 6. Format ChatGPT — đã verify bằng file thật (chatgpt-web)
- Export/pull ra **MẢNG** hội thoại. Mỗi hội thoại keys thật: `title`, `create_time`, `update_time`, `conversation_id`, **`gizmo_id`/`gizmo_type`** (thuộc Project nào), `is_archived`, `default_model_slug`, **`mapping`**, **`current_node`**...
- `mapping` = OBJECT `nodeId → { message:{ author.role, content:{content_type, parts[]}, create_time }, parent, children[] }` → **cây** (edit/regen tạo nhánh).
- Message node mẫu thật: `role=assistant`, `create_time=1782985802.19` (**float unix**), `content_type=text`, `parts[0]`=text. Khớp 100% spec.
- **Flatten:** từ `current_node` ngược `parent` về root rồi đảo (hoặc đi `children` từ root); bỏ node null/system/hidden. `uuid=nodeId`, `role=author.role`, `content=join(parts)`, `ts=create_time*1000→ISO`, `sessionId='chatgpt-'+conversation_id`.
- **Project không sót:** hội thoại trong Project vẫn nằm trong list phẳng (gắn `gizmo_id`) → không cần enumerate riêng cho backfill.

## 7. Endpoints API đã dò (chatgpt.com, dùng qua phiên login)
- `GET /api/auth/session` → `{ accessToken }` (Bearer cho các call sau).
- `GET /backend-api/conversations?offset=&limit=100&order=updated` → `{ items:[{id,title}], total }` — **list toàn bộ lịch sử** (phân trang; gồm cả hội thoại trong Project).
- `GET /backend-api/conversation/{id}` → full hội thoại (cây `mapping`).
- `GET /backend-api/gizmos/snorlax/sidebar` → list Project (cursor-paged) — tham khảo, không cần cho backfill vì list phẳng đã đủ.

## 8. Kiến trúc nạp (cả v1 và v2b đổ về cùng bảng)
- Ghi thẳng `sessions` (origin, source, title, host, project_root=null) + `messages` (uuid, role, content, ts) → tái dùng session upsert `ON CONFLICT(id)` + message `INSERT OR IGNORE ON UNIQUE(session_id,uuid)` (idempotent) + refresh count/started/ended + `redact()` + `buildDigest`.
- **redact()** BẮT BUỘC áp cho content web (như đường file). Sau nạp cần `brain embed` để vector phủ.

## 9. parseFileMulti — multi-session/file (cho v1 & nuốt file test)
Một file export = NHIỀU hội thoại → phá bất biến "1 file = 1 session". Sửa additive:
- Thêm `parseFileMulti?(filePath): Array<ParsedSession & {sessionId}>` vào Adapter contract; giữ `parseFile` cũ (lmstudio không đụng).
- `ingestFile`: nhánh mới lặp phần per-session (upsert · DELETE whole-replace · INSERT OR IGNORE · refresh) cho từng hội thoại trong một transaction; `ingest_state` giữ short-circuit size/mtime per-file với `session_id` sentinel; `FileResult` trả `SessionReport[]`; `scan()` merge.

## 10. `brain scan-web` — browser-connector (cơ chế v2b)
> **✅ ĐÃ BUILD: `backend/src/brain/scanweb.ts`** — lệnh `zemory brain scan-web --platform chatgpt [--limit N] [--refresh] [--delay <s>]`. Node-orchestrate short evals (loose list + projects sidebar + per-project cursor pagination), pace/backoff/resume, dedupe theo id. Phần dưới là spec gốc.

Lệnh (không thuộc `brain scan` quét đĩa):
1. Mở Edge/Chrome profile kèm `--remote-debugging-port`. Lần đầu: user login (dừng chờ). Profile lưu phiên.
2. CDP `Runtime.evaluate`: check login → `/backend-api/conversations` lấy id → fetch từng `/conversation/{id}` (+ gizmo endpoints cho Project chats).
3. Flatten mapping → upsert `sessions(origin='web', source='chatgpt-web', project_root=<project>)` + messages.
4. **Pacing + backoff + resume**. Kết thúc: `brain embed` phần mới.
- Chạy độc lập sandbox (browser phải sống); password không qua zemory.
## 11. Rate-limit & resume
- Test: ~3 req/s liên tục → 429 sau ~200 cái. Fix: **giãn ~1 req/1.5–2s**, **retry backoff** khi 429/5xx, **resume** (bỏ qua conversation_id đã có trong brain / đã pull) → gom trọn 752 qua nhiều vòng. Ghi tiến độ incremental (không dồn 1 file cuối).

## 12. Provenance mapping
- `source` = `chatgpt-web`/`gemini-web`/`claude-web`. `origin` = `web`.
- `host` = máy chạy browser (`hostname()`). `project_root=null` → bucket "(unknown)".
- `title` = tiêu đề hội thoại. `started/ended_at` suy từ timestamp message.
- message `uuid` = id gốc của nền (ChatGPT `nodeId`) — LOAD-BEARING cho dedup; re-pull idempotent.

## 13. Rủi ro
- **Rate-limit 429** — hurdle chính (đã có cách xử l: pace/backoff/resume).
- **Token/phiên hết hạn** → cần login lại (profile persist làm giãn tần suất).
- **ToS xám**: dùng API nội bộ site = vùng chống-tự-động-hoá. Giữ own-data, local, human-triggered login. v1 export là đường chính chủ nếu cần tuyệt đối an toàn.
- **Format drift**: endpoint/shape site đổi → parser versioned + fixture thật.
- **KHÔNG commit data**: file hội thoại kéo về (PII thật) **không được đẩy git**. Chỉ script + docs.
- **multi-session** phá "1 file=1 session" nếu quên `parseFileMulti`.

## 14. Quyết định ĐÃ CHỐT
- Lưu web-chat vào brain qua **cột `origin` (local/web)**, migration v6 — KHÔNG table riêng.
- Cơ chế web = **v2b browser-connector** (login-once, CDP pull); v1 file-drop làm fallback; v2a extension để sau.
- Re-pull/re-drop = **full replace** per hội thoại (idempotent theo uuid).
- Thứ tự nền: **ChatGPT trước** → Gemini → Claude.ai.
- Password KHÔNG bao giờ nhập vào zemory (chỉ login trên trang thật của nền).

## 15. Còn lại
- ✅ **ChatGPT: XONG** — `brain scan-web --platform chatgpt` đã ship, 859 hội thoại (cả Project chats) trong brain.
- Gemini: Takeout là log lossy → fidelity cao phải qua browser-connector/extension; **CHƯA làm**.
- Claude.ai: export `chat_messages` phẳng (dễ nhất) hoặc browser-connector; **CHƯA làm**.
- Khung `scan-web --platform` đã có sẵn (ChatGPT) → thêm Gemini/Claude.ai dùng chung khung.
