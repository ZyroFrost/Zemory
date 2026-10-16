---
id: Slot_3
aka: 03-3
name: frontend
version: 4
path: frontend/
from: _Store/03_STRUCTURE/_Slot/Frontend_003_Frontend @v4 #21a6dc528287
---
# Frontend_003_Frontend frontend — giao diện người dùng

- Vai trò:
  - ★ UI — mọi app đều có UI, kể cả tool ít UI; bắt buộc khi app có UI. Mọi slot con `[opt]`.
  - Test/e2e/story: co-locate hoặc `frontend/test` — không ép; chạy app là phép kiểm thử.
  - Đặc tả thiết kế bề mặt: skill `app-design`. Từ điển slot thiết kế UI (token · gu · component · cổng chất lượng) hiện ra ở các slot con: giá trị thật token/palette sống ở `frontend/styles`.
  - UI no-build (static): app phục vụ UI bằng static files (FastAPI StaticFiles · express.static · nginx), không bundler (webpack/vite): một file HTML lớn PHẢI tách được thành nhiều file theo concern (`styles/*.css` · logic thành nhiều `<script src>` · state · api-client) — modular hoá không cần build. Thứ tự an toàn: `<script src>` giữ global scope trước → gỡ inline `onclick=` → nâng ES module sau (module scope mất global function ⇒ handler vỡ). Khác UI embed (single-bin): ở đó cấm tách; ở đây tách là đúng.
  - Ngoại lệ UI một ngôn ngữ (render server-side): không có `frontend/`, vai trò này nằm trong backend — xem `backend/`.
  - Hệ NON-APP không có `frontend/`; 0 luật UI.
- Được chứa / không chứa: Chứa: `assets/` · `components/` · `styles/` · `pages/` · `layouts/` · `state/` · `hooks/` · `client/` · `locales/` · `config/` · `util/` · `types/` · `public/`.
