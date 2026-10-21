---
id: Slot_6
aka: 03-6
name: plan
version: 5
path: docs/plan/
---
# Docs_006_Plan plan — spec / plan theo section

- Vai trò:
  - ★ Spec/plan theo section — PHẲNG; MỌI `.md` đều được index.
  - Plan chỉ chứa spec: không mục việc (việc ⇒ `04_TODO`, theo `Rule_Gate_38_TodoDoor`), không luật (bất biến ⇒ `01_LAW/_Cons` của repo, được duyệt mới ghi; plan chỉ dẫn chiếu).
  - Plan chỉ giữ hướng đã chốt hiện tại và các điểm còn mở; đổi hướng ⇒ sửa tại chỗ, lịch sử và lý do ghi `05_CHANGES`.
  - Không máy sinh nào ghi vào plan (mục lục · catalog · bảng tra do build sinh ⇒ file cạnh nguồn sinh, plan trỏ link). Sơ đồ, bảng cấu trúc, khối `mermaid` vẽ tay là phần chính của plan: giữ.
  - `00_overview.md` = OVERVIEW mặc định mọi app (mục đích · tính năng · ý tưởng · phi-mục-tiêu). Spec chi tiết từ `01_*` trở đi, đánh số tăng dần.
  - Hệ NON-APP: defect/spec dài của một case → `docs/plan` (một trong 3 ngoại lệ được nằm ngoài `tasks/<case>/`).
- Trần: một spec khoảng 1.000 dòng (khoá `thresholds.plan_spec_lines`) — sửa spec nào thì đọc trọn spec đó. Cả `docs/plan` không có trần: không phiên nào đọc trọn thư mục; spec được tra bằng `plan search` hoặc mở đúng `plan/NN §mục` mà câu báo của cổng/hook dẫn tới. Cổng `validate` báo lỗi khi gặp khối máy sinh, cảnh báo khi một spec vượt trần. Gọt plan: skill `harness-plan-trim`.
- Được chứa / không chứa: Chứa: file `NN_tên.md` phẳng, không thư mục con.
- Khuôn tên: `NN_tên.md` — `NN` hai chữ số, `00` = overview; tên nhiều từ nối bằng `_`.
