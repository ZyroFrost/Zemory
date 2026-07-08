# prototype/web-capture

Prototype **thử nghiệm** cho tính năng thu web-chat (ChatGPT/Gemini/Claude) vào brain.
**KHÔNG phải app code** — chưa tích hợp `src/`. Spec + kết quả test: `docs/plan/07_web_chat_capture.md`.
Giữ ở đây làm backup ý tưởng đã chạy được. Sản phẩm thật sẽ là lệnh `zemory brain scan-web` (plan 07 §10).

## ⚠ KHÔNG commit dữ liệu thật
Các script này tải về hội thoại thật (PII). File `*.json` data (vd `chatgpt-conversations.json`) **KHÔNG được đẩy git** — đã gitignore. Chỉ commit `.mjs` + README.

## Cách tiếp cận: browser-connector (login-once + CDP)
Không có OAuth đọc lịch sử ChatGPT; copy cookie thì bị guard chặn; fetch Node thuần bị Cloudflare 403.
Cách chạy được = mở một cửa sổ trình duyệt riêng (profile của zemory) kèm cổng debug, **user tự đăng nhập 1 lần** vào trang thật, rồi điều khiển cửa sổ đó qua CDP để gọi API nội bộ của site bằng phiên đã login. Password không bao giờ qua zemory.

## Chạy (Windows, Edge)
```
# 1) mở cửa sổ zemory (profile riêng) + cổng debug, tới chatgpt.com — CHẠY NGOÀI SANDBOX để browser sống
msedge --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\.zemory\browser\chatgpt" --new-window https://chatgpt.com
#    -> ĐĂNG NHẬP ChatGPT trong cửa sổ đó (1 lần; profile lưu cookie)

# 2) probe: đã login chưa + tổng số hội thoại
node cdp-probe.mjs

# 3) dò endpoint (Projects/gizmos)
node cdp-discover.mjs

# 4) kéo toàn bộ (hiện chưa có backoff → ~200 cái đầu rồi dính rate-limit)
node cdp-pull.mjs <out.json>

# 5) soi format / liệt kê / search (offline, đọc file đã kéo)
node inspect-export.mjs <file.json>
node summarize-export.mjs <file.json> <out.txt>
node search-export.mjs <file.json> <out.txt>
```

## Script
- `cdp-probe.mjs` — check `/api/auth/session` (login+email) + đếm `total` hội thoại.
- `cdp-discover.mjs` — dò endpoint backend-api (conversations, gizmos/snorlax/sidebar).
- `cdp-pull.mjs` — enumerate `/backend-api/conversations` (paged) → fetch từng `/conversation/{id}` → ghi file. **TODO bản thật: pace + backoff + resume.**
- `inspect-export.mjs` — in cấu trúc file export (nhận diện ChatGPT mapping / Claude chat_messages / Gemini activity-log), text cắt ngắn.
- `summarize-export.mjs` — list hội thoại (title · #msg · ngày) + tổng message + mẫu node.
- `search-export.mjs` — search keyword trong title+content (demo; bản thật dùng FTS/vector của brain).
- `list-sessions.mjs` — liệt kê session đang có trong `global_memory.db` (theo source/origin).

## Kết quả test (2026-07-02/03)
Tài khoản test: enumerate **752** hội thoại, kéo **219** (6.636 msg) OK, **533** fail = rate-limit 429. Format khớp spec. Chi tiết plan 07 §5-§7.
