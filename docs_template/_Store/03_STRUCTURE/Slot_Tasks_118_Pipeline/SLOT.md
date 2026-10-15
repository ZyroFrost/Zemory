---
id: Slot_118
aka: 03-118
name: pipeline
version: 2
path: tasks/<case>/pipeline/
applies: [NonApp]
---
# Slot_Tasks_118_Pipeline pipeline — script chạy của chính case

- Vai trò:
  - Repo theo case ⇒ pipeline nằm TRONG chính case: spec · findings · script cùng một chỗ, mở một folder là thấy. `data/<tên>/` vẫn nằm riêng (file nặng, gitignore) — ngoại lệ có chủ đích.
  - `common.py` = logic dùng chung (tên không số mới import được) + khai đường bằng HẰNG (RAW / PROC / OUT); không nối chuỗi đường dẫn trong từng stage.
  - Ánh xạ stage ↔ playbook (`04_SKILLS`): `00` = gate/pull-precheck · `01` = pull · `fill` = fill · `upload` = upload. Task mới bám khuôn số này.
  - File trung gian mang tiền tố số stage (`01_pull.py` → `data/<case>/02_processing/01_pull_*.csv`); NGOẠI LỆ file deliverable cuối ở `03_output/` giữ tên nghiệp vụ.
  - Right-size: chỉ tạo stage task THẬT cần (2–4 là thường), không chẻ vụn cho đủ bộ.
  - Case đang có ở `pipelines/<tên>/` dời vào đây KHI NÀO CHẠM tới case đó (chạy test của chính nó làm lưới đỡ), không dời hàng loạt.
- Được chứa / không chứa: Chỉ chứa script có số chặng + `common.py`. Không chứa config của case (→ gốc `tasks/<case>/`).
- Khuôn tên: Stage đánh số phẳng `NN_mô-tả.py` theo thứ tự chạy, mỗi STAGE một file (vd `common.py` + `00_ready.py` · `01_pull.py` …): `00` = cổng/readiness, thường không xuất data · `01`, `02`… = bước. `NN_` chỉ có ĐÚNG MỘT nghĩa: thứ tự STAGE. Tên stage bằng tiếng Anh ASCII.
