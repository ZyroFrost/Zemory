<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory plan set` -->
# Scoped sync — chọn nguồn để đồng bộ / recall (Local·Web × máy × agent × nền)

> Spec năng lực MỚI: một **bộ chọn phạm vi** dạng cây mở rộng theo tầng, để người dùng tick chính xác lane trí nhớ nào được **sync / merge / recall** — và **loại "chỗ xài chung không nên lấy"**.
> Trạng thái: **Ý TƯỞNG (chưa code)**. Nền provenance ĐÃ CÓ sẵn (`origin`/`source`/`host`/`project_root`) — đây chỉ là lớp **CHỌN + LỌC** đứng trên, KHÔNG thêm store/table.

## 1. Mục tiêu & nguyên tắc
- Cho phép **chọn đúng lane** trí nhớ theo cây phân tầng, thay vì "tất cả hoặc không".
- **Loại trừ chỗ dùng chung**: có những nơi (account web dùng chung, máy công ty, agent tạp…) **không nên** nuốt vào brain riêng — phải bỏ được.
- **Provenance TUYỆT ĐỐI không lẫn**: mỗi memory luôn giữ nguồn gốc thật; bộ chọn chỉ *lọc*, KHÔNG bao giờ đổi/gộp nguồn (RULES §3 — 1 nguồn sự thật).
- Tái dùng engine sẵn có (RULES §1): không viết store thứ 2; bộ chọn = query rollup + bộ lọc.

## 2. Cây chọn — 2 nhánh gốc
- **Local** → **máy** (`host`) → **agent** (`source`: claude-code / codex / continue / lmstudio…)
- **Web** → **nền** (`source`: chatgpt-web / gemini-web / claude-web) *(+ Claude desktop nếu sau này có adapter)*
- Mỗi nút = tick chọn/bỏ; tick nút cha = chọn cả nhánh con; mở rộng dần (lazy expand). Hiển thị đếm session/message mỗi nút để biết đang lấy bao nhiêu.

## 3. Mô hình dữ liệu — ĐÃ CÓ, KHÔNG thêm bảng
- Cây suy ra từ 4 cột sẵn có trên `sessions`: `origin` (local|web) · `source` (agent/nền) · `host` (máy) · `project_root` (dự án).
- Rollup gần như đã có: `brainHostTree()` (PC → source → project). Chỉ cần thêm tầng `origin` ở gốc và trục Web theo `source`.
- Không migration, không cột mới.

## 4. Áp bộ chọn vào đâu (3 điểm dùng)
- **sync (export / import --merge)** — CHỖ CHÍNH của "chỗ chung không lấy": chỉ đóng gói / chỉ nuốt lane đã tick. Bundle mang theo provenance như cũ; bên nhận merge additive, không đụng lane không chọn.
- **recall / search** — mở rộng facet `--origin` hiện tại thành bộ lọc đa tầng (origin + host + source). CLI: cờ; UI: cây tick.
- **ingest (scan / scan-web)** — chọn agent/nền nào được quét vào brain (vd bỏ account web dùng chung, bỏ máy công ty).

## 5. "Chỗ xài chung không nên lấy" — cơ chế loại trừ
- Danh sách **exclude bền** lưu ở settings (`~/.zemory`), không phải trong data: vd `host=<máy công ty>`, `source=<account web chung>`.
- Mặc định **include tất**; exclude là opt-in và **hiện rõ cái gì bị bỏ** (không cắt âm thầm — RULES: no silent caps).
- Exclude là *lọc lúc chạy*, KHÔNG xóa dữ liệu; muốn xóa hẳn vẫn dùng `brain forget`.

## 6. Quyết định mở / cần chốt
- Lưu lựa chọn ở đâu: `settings.json` (nghiêng phương án này — cấu hình, không phải data) vs cột/bảng.
- Exclude theo **lane tĩnh** (origin/host/source cụ thể) hay theo **rule** (glob project_root)? Có thể cả hai.
- Có cần **profile nhiều bộ chọn** (vd "chỉ code", "chỉ web", "không máy công ty") để đổi nhanh không.
- UI: tái dùng app-mode window + project picker sẵn có, thêm cây tick 2 nhánh.
- Quan hệ với sync xuyên máy đã chốt (plan 02 §0, bundle `.enc` + `import --merge`): scoped sync = thêm bộ lọc *trước khi export* và *trước khi merge*.
