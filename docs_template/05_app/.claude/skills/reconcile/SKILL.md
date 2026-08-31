---
name: reconcile
description: Bring a project folder back in line with the standard when files have drifted into the wrong places, or when adopting an existing messy folder. Produces a proposal table - never moves anything on its own. Use when taking over an unfamiliar folder, or when the user asks to reorganise, tidy up, or restructure. Vietnamese triggers - "sắp xếp lại", "dọn lại thư mục", "nắn về chuẩn", "folder đang lộn xộn", "áp chuẩn vào dự án có sẵn".
---

# reconcile — nắn repo về chuẩn

> Kích hoạt (`03_STRUCTURE §8`): flow HIẾM, chỉ khi dọn repo chưa theo chuẩn. `zemory validate`/`structure` chỉ **CHỈ RA** chỗ lệch (advisory) — **agent tự nắn, zemory KHÔNG auto-move**. **Đập cấu trúc lớn / khó đảo → HỎI user TRƯỚC** (`02_RULES §Hành xử`, §Git).

**A. Docs lệch** (doc trùng / thừa / lạc chỗ):
1. Soi file `.md` trùng/thừa trong `docs/`; **đọc file** TRƯỚC khi quyết (`zemory plan search` nếu cần tìm theo nội dung).
2. Gộp todo lạc → `05_TODO`. Bỏ bản trùng/obsolete: **xoá thẳng file `.md`** (file wins) — **HỎI user trước nếu doc còn nội dung thật** (luật KHÔNG TỰ Ý XÓA); sau khi xoá file, `zemory reindex` cập nhật lại search index.
3. Gom mọi doc plan (folder `planning`, doc plan lạc ở root/`docs`) về `docs/plan/`, đặt tên `NN_tên.md` đánh số (`00_overview` → `01_` …); plan chỉ chứa specs, todo tách về `05_TODO`.

**B. Cấu trúc folder lệch** (chưa theo khung `backend/` · `frontend/` · `docs/`):
1. `zemory validate` — xem tầng nào thiếu / đặt sai (advisory, không tự sửa).
2. Nắn theo bảng routing `03_STRUCTURE §4` (app) / §7 (non-app), **GIỮ git history — dùng `git mv`, KHÔNG copy rồi xoá**:
   - code của mình → `backend/` (Python `backend/<pkg>/` · Node `backend/src/`); dùng chung BE↔FE → `backend/src/shared/`.
   - UI/asset → `frontend/`. Repo ngoài clone → `external/`. Nguồn cũ / code bị thay khi refactor → `attic/` (backup tracked, để rollback). Runtime (`.db`/log/cache) + secret (`.key`/bundle) → `data/` (gitignore). Tool ép root (`.github/` · `.env` + `.env.example` · Docker/`.spec`) → để yên ở root.
   - **KHÔNG ép tạo `test/`** — chỉ khi có lõi logic dễ sai ngầm. Bắt buộc chỉ 4 vai trò: `backend(code)` · `frontend` · `docs` · `AGENTS.md`.
3. Sau move: **sửa import / entry / path** cho khớp (cần judgment) → **verify bằng cách chạy chính app**.
4. Xong → cập nhật `README` + ghi entry vào `06_CHANGES.md` (sửa file trực tiếp, sau khi user OK).

**Recipe end-to-end** ("cài harness + nắn app này về chuẩn"): `zemory init` (nếu chưa có harness) → `zemory structure` (xem ĐÍCH: layout + routing) + `zemory validate` (xem đang lệch đâu) → đọc `03_STRUCTURE §3` (cây từng-dòng) + §4/§7 (routing) → làm **A** rồi **B** ở trên → verify bằng cách chạy app → cập nhật README + changelog (sau khi user OK). Việc lớn / khó đảo: HỎI user trước.
