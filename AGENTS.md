<!-- zemory · file chỉ đường DUY NHẤT ở root. THUẦN điều hướng — KHÔNG luật, KHÔNG nội dung harness (tất cả nằm trong docs/agent/*). -->
# Zemory

> ⛔ **DỪNG — bạn mở repo này để LÀM VIỆC, hay chỉ để THAM KHẢO?**
> Nếu project bạn đang làm **KHÔNG phải repo này** (chỉ ghé đọc/tham khảo) → **CHỈ ĐỌC, KHÔNG GHI:**
> - ❌ **KHÔNG** sửa/tạo/xoá file ở đây. ❌ **KHÔNG** chạy lệnh `zemory` với cwd ở đây — mọi lệnh GHI (`init` · `sync` · `reindex` · `archive` · `brain scan/sync` · `hook`…) ghi vào repo này **và/hoặc** `global_memory.db`.
> - ⚠ Repo này **có thể đang có phiên agent khác làm việc** — bạn ghi vào = xung đột thật.
> - ✅ Muốn tham khảo cách làm → đọc rồi ÁP VÀO REPO CỦA BẠN, chạy lệnh `zemory` ở repo của bạn.
> - Thật sự cần ghi vào đây → **HỎI USER TRƯỚC**.

Project này dùng **zemory** (harness). Mọi luật · quy trình · cấu trúc · thiết kế nằm trong `docs/` — file này CHỈ chỉ đường vào đó:

## Vào việc
1. **Chưa có `docs/.harness.json`?** → `zemory --version` (thiếu thì `npm i -g zemory`) → `zemory init` → `zemory doctor` xanh. Đã có → bỏ qua.
2. **ĐỌC HẾT `docs/`** — KHÔNG bỏ sót: toàn bộ `docs/agent/*` (`01_CONSTITUTION` → `06_CHANGES`) **và** toàn bộ `docs/plan/*` (`00_overview` → các spec `NN_`). *(Ngoại lệ: `docs_visual/` nằm NGOÀI `docs/` — chỉ mở khi user nhắc.)*
3. Làm theo những gì vừa đọc — `01_CONSTITUTION` (bất biến, TỐI CAO) trên `02_RULES` (luật làm việc).
