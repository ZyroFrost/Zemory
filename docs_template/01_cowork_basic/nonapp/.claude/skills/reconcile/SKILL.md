---
name: reconcile
description: Bring a project folder back in line with the standard when files have drifted into the wrong places, or when adopting an existing messy folder. Produces a proposal table - never moves anything on its own. Use when taking over an unfamiliar folder, or when the user asks to reorganise, tidy up, or restructure. Vietnamese triggers - "sắp xếp lại", "dọn lại thư mục", "nắn về chuẩn", "folder đang lộn xộn", "áp chuẩn vào dự án có sẵn".
---

# reconcile — nắn thư mục về chuẩn

> **Luật tối cao của skill này: ĐỀ XUẤT, KHÔNG TỰ LÀM.** Đập cấu trúc lớn hoặc khó đảo → **HỎI USER TRƯỚC**.

## A. Docs lệch (doc trùng · thừa · lạc chỗ)

1. Soi file `.md` trùng/thừa trong `docs/`. **Đọc file TRƯỚC khi quyết** — đừng xoá theo tên.
2. Gom todo lạc → `05_TODO.md`. Bản trùng/lỗi thời → đề xuất xoá; **HỎI user nếu file còn nội dung thật**.
3. Gom mọi doc thiết kế về `docs/plan/`, đặt tên `NN_tên.md` (`00_overview` → `01_` …). Plan **chỉ chứa specs**, todo tách về `05_TODO`.

## B. Cấu trúc thư mục lệch

1. **Kiểm kê trước, đừng đụng gì.** Với mỗi nhóm file ghi: đuôi · số lượng · dung lượng · đang nằm đâu · file mới sửa gần nhất. In **BẢNG KIỂM KÊ**.
2. Chiếu từng nhóm vào slot đúng bằng bảng routing của skill `structure`.
3. In **BẢNG LỆCH**:

   | file / nhóm | đang ở | nên ở | vì sao |
   |---|---|---|---|

   Cột "vì sao" phải dẫn đúng dòng routing, **không nói chung chung**.
4. **User gật TỪNG MỤC thì mới dời.** Giữ lịch sử: dùng `git mv` nếu là git repo, **không copy rồi xoá**.
5. Sau khi dời: sửa đường dẫn trong `scripts/` · `sources/` · connection cho khớp → **verify bằng cách mở deliverable ra / chạy refresh thử**.
6. Xong → cập nhật `README` + ghi `06_CHANGES.md` (sau khi user OK).

## Kiểm tự động

`scripts/check_structure.py` của skill `structure` chỉ ra chỗ lệch. Nó **chỉ báo**, không tự dời — và mục `xem xét` không phải lỗi, chỉ là máy không biết thư mục đó thuộc slot nào.

## Cấm

- Tự dời/xoá vì "thấy rõ ràng là sai chỗ".
- Tạo thư mục rỗng cho đủ bộ chuẩn.
- Xoá thư mục chỉ vì bảng kiểm báo vậy mà chưa mở ra xem.
