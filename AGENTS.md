<!-- zemory · file chỉ đường DUY NHẤT ở root. THUẦN điều hướng — KHÔNG luật, KHÔNG nội dung harness (tất cả nằm trong docs/agent/*). -->
# Zemory

> ⛔ **DỪNG — bạn mở repo này để LÀM VIỆC, hay chỉ để THAM KHẢO?**
> Nếu project bạn đang làm **KHÔNG phải repo này** (chỉ ghé đọc/tham khảo) → **CHỈ ĐỌC, KHÔNG GHI:**
> - ❌ **KHÔNG** sửa/tạo/xoá file ở đây. ❌ **KHÔNG** chạy lệnh `zemory` với cwd ở đây — mọi lệnh GHI (`init` · `sync` · `reindex` · `archive` · `memory scan/sync` · `hook`…) ghi vào repo này **và/hoặc** `global_memory.db`.
> - ⚠ Repo này **có thể đang có phiên agent khác làm việc** — bạn ghi vào = xung đột thật.
> - ✅ Muốn tham khảo cách làm → đọc rồi ÁP VÀO REPO CỦA BẠN, chạy lệnh `zemory` ở repo của bạn.
> - Thật sự cần ghi vào đây → **HỎI USER TRƯỚC**.

Project này dùng **zemory** (harness). Mọi luật · quy trình · cấu trúc · thiết kế nằm trong `docs/` — file này CHỈ chỉ đường vào đó:

## Vào việc
1. **Chưa có `docs/.harness.json`?** →
   - **HỎI USER TRƯỚC — dự án này là APP hay NON-APP? (ĐỪNG tự đoán.)** Hai loại áp HAI chuẩn cấu trúc khác nhau; chọn sai là nắn folder sai từ đầu:
     - **APP** = hệ để **LÀM & BẢO TRÌ một app** — có code CHẠY do mình phát triển (UI / server / CLI). Áp chuẩn `03_STRUCTURE` **APP** (backend/ · frontend/ · docs/ · AGENTS.md).
     - **NON-APP** = **sản phẩm / tài sản**, agent chỉ **đọc · dò · kéo · điền · xuất FILE** (BI/report · data · docs-only · design). *Mở một `.pbix` ra dò, đổ số vào template — KHÔNG phải phát triển app.* Áp chuẩn `03_STRUCTURE` **NON-APP** (deliverable + tasks/ + data/ … · **0 luật UI**).
   - Rồi chạy: **APP** → `zemory init` · **NON-APP** → `zemory init --non-app` → `zemory doctor` xanh. (Thiếu lệnh `zemory` → `npm i -g zemory`.) Đã có `.harness.json` → bỏ qua bước này (profile đã chốt trong đó).
2. **ĐỌC LỚP NỀN — 3 file, LUÔN LUÔN, trước mọi việc:** `01_CONSTITUTION` (bất biến — ĐƯỢC LÀM GÌ) → `02_RULES` (luật làm việc — CƯ XỬ THẾ NÀO) → `04_SKILLS` (playbook — LÀM RA SAO). Ba file này là đủ để bắt đầu.
3. **Còn lại TRA KHI CẦN — đừng nạp trước:**
   - `03_STRUCTURE` — **BẮT BUỘC mở TRƯỚC khi tạo / đổi tên / dời bất kỳ file hay thư mục nào.** Đây là bảng tra "cần gì → để ở đâu"; đoán thay vì tra là đặt sai chỗ.
   - `05_TODO` — trước khi nhận việc mới (xem đang dở tới đâu, tránh làm lại).
   - `06_CHANGES` — khi cần biết một quyết định cũ và lý do của nó.
   - `docs/plan/NN_*` — khi đụng tới thiết kế; mở đúng file theo số hiệu, không đọc cả thư mục.
   - *(`docs_visual/` nằm NGOÀI `docs/` — chỉ mở khi user nhắc.)*
   - **NGOẠI LỆ — vẫn phải đọc HẾT:** khi **chốt phiên / ghi sổ / audit** (`04_SKILLS §chốt phiên`). Lúc đó bỏ sót là ghi sai sổ, nên đọc đủ `docs/agent/*` + `docs/plan/*`.
4. Làm theo những gì vừa đọc — `01_CONSTITUTION` (bất biến, TỐI CAO) trên `02_RULES` (luật làm việc).
