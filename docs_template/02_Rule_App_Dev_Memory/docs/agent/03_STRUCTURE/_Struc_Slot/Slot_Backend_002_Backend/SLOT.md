---
id: Slot_2
aka: 03-2
name: backend
version: 3
path: backend/
from: _Store/03_STRUCTURE/_Struc_Slot/Slot_Backend_002_Backend @v3 #41af1babe5a5
---
# Slot_Backend_002_Backend backend — phía server: code của mình + entry

- Vai trò:
  - ★ Phía server: code của mình + entry — 100% của mình, một giọng. Phần code là vai trò bắt buộc `backend/(code)`.
  - Code nằm dưới `backend/`: Node → `backend/src/` · Python → `backend/<pkg>/`. Tên co theo stack: chỉ TẦNG co theo ngôn ngữ, không tự đổi tên concern.
  - Cây tối thiểu chạy được: (1) code của mình dưới `backend/`; (2) MỘT entry — `run.*` HOẶC manifest khai `bin`/`main`; (3) MỘT manifest — ở gốc HOẶC `backend/`, không cần cả hai. Mọi slot con khác `[opt]`.
  - Daemon nền / server tiến trình dài phục vụ UI cục bộ (single-instance, cổng cố định): surface mỏng ở `backend/src/` mở endpoint `api/` + serve `frontend/` tĩnh; nghiệp vụ vẫn ở domain.
  - UI embed (single-bin): app CLI/1-binary được EMBED trang UI như resource (vd HTML/CSS/JS trong một file TS) để ship gọn — GIỮ ở backend nhưng GHI RÕ; server phục vụ nó vẫn là backend, nội dung UI vẫn thuộc frontend về vai trò. Không ép tách nếu tách làm vỡ build một file.
  - UI một ngôn ngữ: app render UI server-side bằng chính ngôn ngữ backend (Streamlit/Gradio/Dash/Django+template) → không có `frontend/` tách; vai trò frontend = pages/views nằm TRONG backend (Python: `backend/<pkg>/pages`, hoặc `views/` nếu framework ép tên). Khi đó bắt buộc còn 3: backend(code) + docs + AGENTS.
  - Hệ NON-APP không có `backend/` (không có code-app).
- Được chứa / không chứa:
  - Chứa: `src/` (hoặc `<pkg>/`) · `test/` · `scripts/` · `infra/` · `resources/` · `run.*` · manifest.
  - Không chứa: code ngoài clone về (→ `external/`).
