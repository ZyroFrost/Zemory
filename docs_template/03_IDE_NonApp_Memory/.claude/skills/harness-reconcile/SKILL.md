---
id: Skill_Harness_Reconcile
aka: reconcile
name: harness-reconcile
version: 8
description: Bring a project folder back in line with the standard when files have drifted into the wrong places, or when adopting an existing messy folder. Produces a proposal table - never moves anything on its own. Use when taking over an unfamiliar folder, or when asked to reorganise, tidy up, or restructure. Vietnamese triggers - "sắp xếp lại", "dọn lại thư mục", "nắn về chuẩn", "folder đang lộn xộn", "áp chuẩn vào dự án có sẵn".
from: _Store/03_SKILLS/Skill_Harness_Reconcile @v8 #591385ea23c5
---

# reconcile — nắn thư mục về chuẩn

> Kích hoạt (`Root_136_Principles` mục Reconcile): flow HIẾM, chỉ khi dọn một repo/thư mục chưa theo chuẩn.
> **Luật tối cao của skill này: ĐỀ XUẤT, KHÔNG TỰ LÀM.** `zemory validate`/`zemory structure` (hoặc
> `scripts/check_structure.py` của skill `structure`) chỉ **CHỈ RA** chỗ lệch (advisory) — **agent tự
> nắn, công cụ KHÔNG auto-move**. **Đập cấu trúc lớn / khó đảo → HỎI TRƯỚC** (`Rule_Gate_10_ConfirmDelete`, `Rule_Gate_50_Git`).

## A. Docs lệch (doc trùng · thừa · lạc chỗ)

1. Soi file `.md` trùng/thừa trong `docs/`. **Đọc file TRƯỚC khi quyết** — đừng xoá theo tên
   (`zemory plan search` nếu cần tìm theo nội dung).
2. Gộp todo lạc → `04_TODO.md` (gộp thứ ĐÃ tồn tại là dọn, không phải đẻ mới — cửa vào `Rule_Gate_38_TodoDoor`
   chỉ chặn mục agent tự nghĩ ra). Bỏ bản trùng/lỗi thời: **xoá thẳng file `.md`** (file
   wins) — **HỎI trước nếu doc còn nội dung thật** (luật KHÔNG TỰ Ý XÓA); sau khi xoá file,
   `zemory reindex` cập nhật lại search index.
3. Gom mọi doc plan / doc thiết kế (folder `planning`, doc plan lạc ở root/`docs`) về `docs/plan/`,
   đặt tên `NN_tên.md` đánh số (`00_overview` → `01_` …). Plan **chỉ chứa specs**, todo tách về `04_TODO`.

## B. Cấu trúc thư mục lệch

1. **Kiểm kê trước, đừng đụng gì.** `zemory validate` — xem tầng nào thiếu / đặt sai / thiếu
   deliverable (advisory, không tự sửa). Với mỗi nhóm file ghi: đuôi · số lượng · dung lượng · đang
   nằm đâu · file mới sửa gần nhất. In **BẢNG KIỂM KÊ**.
2. Chiếu từng nhóm vào slot đúng bằng bảng routing (`02_STRUCTURE/INDEX.md`; kit có skill
   `structure` thì dùng bảng routing của skill đó) — theo profile của dự án:
   - **APP** (khung `backend/` · `frontend/` · `docs/`):
     - code của mình → `backend/` (Python `backend/<pkg>/` · Node `backend/src/`); dùng chung BE↔FE → `backend/src/shared/`.
     - UI/asset → `frontend/`. Repo ngoài clone → `external/`. Nguồn cũ / code bị thay khi refactor →
       `attic/` (backup tracked, để rollback). Runtime (`.db`/log/cache) + secret (`.key`/bundle) →
       `data/` (gitignore). Tool ép root (`.github/` · `.env` + `.env.example` · Docker/`.spec`) → để yên ở root.
     - **KHÔNG ép tạo `test/`** — chỉ khi có lõi logic dễ sai ngầm. Bắt buộc chỉ 4 vai trò:
       `backend(code)` · `frontend` · `docs` · `AGENTS.md`.
   - **NON-APP** (khung non-app):
     - sản phẩm giao đi → `reports/`|`models/`|`content/`|`design/`. Định nghĩa nguồn → `sources/` ·
       DAX → `measures/` · SQL/M gọi-tên → `queries/`.
     - việc định kỳ → `tasks/NN_<tên>/`; data thật → `data/<task>/` (gitignore). File lẻ 1-lần →
       `data/adhoc/`. Template điền → `templates/`.
     - raw kéo về / extract → `data/extract/` (gitignore). Render ra → `exports/` (gitignore).
       Secret → `.env`/`config/*.local.*` (gitignore).
     - **Bắt buộc chỉ 3 vai trò:** `docs` · `AGENTS.md` · ≥1 deliverable. KHÔNG ép `backend/`+`frontend/`
       (non-app không có code-app).
3. In **BẢNG LỆCH**:

   | file / nhóm | đang ở | nên ở | vì sao |
   |---|---|---|---|

   Cột "vì sao" phải dẫn đúng dòng routing, **không nói chung chung**.
4. **Được gật TỪNG MỤC thì mới dời.** **GIỮ lịch sử — dùng `git mv` (nếu là git repo), KHÔNG copy rồi xoá.**
5. Sau khi dời: **sửa import / entry / path** cho khớp (cần judgment) — non-app: đường dẫn trong
   `scripts/` · `sources/` · connection → **verify**: APP thì chạy chính app; NON-APP thì mở
   deliverable ra / chạy refresh thử.
6. Xong → cập nhật `README` + ghi entry vào `05_CHANGES.md` (sửa file trực tiếp, sau khi được duyệt).

## Kiểm tự động

`zemory validate` / `zemory structure`, hoặc `scripts/check_structure.py` của skill `structure`, chỉ
ra chỗ lệch. Chúng **chỉ báo**, không tự dời — và mục `xem xét` không phải lỗi, chỉ là máy không
biết thư mục đó thuộc slot nào.

## Recipe end-to-end ("cài harness + nắn dự án này về chuẩn")

- **APP:** `zemory init` (nếu chưa có harness) → `zemory structure` (xem ĐÍCH: layout + routing) +
  `zemory validate` (xem đang lệch đâu) → đọc `02_STRUCTURE` mục Cây thư mục (cây từng-dòng) + mục
  Routing → làm **A** rồi **B** ở trên → verify bằng cách chạy app → cập nhật README + changelog
  (sau khi được duyệt).
- **NON-APP:** `zemory init --non-app` (nếu chưa có harness) → `zemory structure` (xem ĐÍCH) +
  `zemory validate` (xem lệch đâu) → đọc `02_STRUCTURE` mục Cây thư mục + mục Routing → làm **A**
  rồi **B** → verify (mở deliverable / refresh) → cập nhật README + changelog (sau khi được duyệt).

Việc lớn / khó đảo: HỎI trước.

## Cấm

- Tự dời/xoá vì "thấy rõ ràng là sai chỗ".
- Tạo thư mục rỗng cho đủ bộ chuẩn.
- Xoá thư mục chỉ vì bảng kiểm báo vậy mà chưa mở ra xem.
