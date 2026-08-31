---
name: reconcile
description: Bring a project folder back in line with the standard when files have drifted into the wrong places, or when adopting an existing messy folder. Produces a proposal table - never moves anything on its own. Use when taking over an unfamiliar folder, or when the user asks to reorganise, tidy up, or restructure. Vietnamese triggers - "sắp xếp lại", "dọn lại thư mục", "nắn về chuẩn", "folder đang lộn xộn", "áp chuẩn vào dự án có sẵn".
---

# reconcile — nắn repo về chuẩn

> Kích hoạt (`03_STRUCTURE §6`): flow HIẾM, chỉ khi dọn repo chưa theo chuẩn. `zemory validate`/`structure` chỉ **CHỈ RA** chỗ lệch (advisory) — **agent tự nắn, zemory KHÔNG auto-move**. **Đập cấu trúc lớn / khó đảo → HỎI user TRƯỚC** (`02_RULES §Hành xử`, §Git).

**A. Docs lệch** (doc trùng / thừa / lạc chỗ):
1. Soi file `.md` trùng/thừa trong `docs/`; **đọc file** TRƯỚC khi quyết.
2. Gộp todo lạc → `05_TODO`. Bỏ bản trùng/obsolete: **xoá thẳng file `.md`** (file wins) — **HỎI user trước nếu doc còn nội dung thật**; sau khi xoá, `zemory reindex`.
3. Gom mọi doc plan về `docs/plan/`, đặt tên `NN_tên.md` (`00_overview` → `01_` …); plan chỉ chứa specs, todo tách về `05_TODO`.

**B. Cấu trúc folder lệch** (chưa theo khung non-app):
1. `zemory validate` — xem thiếu deliverable / đặt sai (advisory).
2. Nắn theo routing `03_STRUCTURE §3`, **GIỮ git history — `git mv`, KHÔNG copy rồi xoá**:
   - sản phẩm giao đi → `reports/`|`models/`|`content/`|`design/`. Định nghĩa nguồn → `sources/` · DAX → `measures/` · SQL/M gọi-tên → `queries/`.
   - việc định kỳ → `tasks/NN_<tên>/`; data thật → `data/<task>/` (gitignore). File lẻ 1-lần → `data/adhoc/`. Template điền → `templates/`.
   - raw kéo về / extract → `data/extract/` (gitignore). Render ra → `exports/` (gitignore). Secret → `.env`/`config/*.local.*` (gitignore).
   - **Bắt buộc chỉ 3 vai trò:** `docs` · `AGENTS.md` · ≥1 deliverable. KHÔNG ép `backend/`+`frontend/` (non-app không có code-app).
3. Sau move: sửa path trong scripts/sources/connection cho khớp → verify bằng cách MỞ deliverable / chạy refresh thử.
4. Xong → cập nhật `README` + ghi entry `06_CHANGES.md` (sau khi user OK).

**Recipe end-to-end:** `zemory init --non-app` (nếu chưa có harness) → `zemory structure` (xem ĐÍCH) + `zemory validate` (xem lệch đâu) → đọc `03_STRUCTURE §2` (cây) + §3 (routing) → làm **A** rồi **B** → verify (mở deliverable / refresh) → cập nhật README + changelog (sau khi user OK). Việc lớn / khó đảo: HỎI user trước.
