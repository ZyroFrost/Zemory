<!-- zemory · file chỉ đường DUY NHẤT ở root. CHỈ điều hướng vào docs/ — luật · quy trình · cấu trúc nằm trong docs/agent/*, KHÔNG chép vào đây. -->
# <PROJECT>

> ⛔ **DỪNG — bạn mở repo này để LÀM VIỆC, hay chỉ để THAM KHẢO?**
> Nếu project bạn đang làm **KHÔNG phải repo này** (chỉ ghé để đọc/copy chuẩn, xem code mẫu) → **CHỈ ĐỌC, KHÔNG GHI:**
> - ❌ **KHÔNG** sửa/tạo/xoá file ở đây. ❌ **KHÔNG** chạy lệnh `zemory` với cwd ở đây — `init` · `sync` · `docs render` · `plan set` · `changelog` **đều GHI** vào repo này **và** `global_memory.db`.
> - ⚠ Repo này **có thể đang có phiên agent khác làm việc** — bạn ghi vào = xung đột thật (file nửa cũ nửa mới, DB lệch).
> - ✅ **Lấy chuẩn = ĐỌC `docs/agent/*` rồi ÁP VÀO REPO CỦA BẠN** (chạy lệnh `zemory` ở repo của bạn, không phải ở đây).
> - Thật sự cần ghi vào đây → **HỎI USER TRƯỚC**. Luật đầy đủ: `docs/agent/02_RULES.md` §Phạm vi project.

Project này dùng **zemory** — lớp harness (chuẩn docs) + bộ nhớ cho coding agent. **FILE `.md` là NGUỒN của docs (file wins); DB (`global_memory.db`) chỉ là INDEX dẫn xuất cho search.** Cài harness = **NẮN project về CHUẨN, KHÔNG bê nội dung mẫu**: đọc bộ chuẩn trong `docs/` rồi chỉnh project cho khớp cấu trúc (dựng `docs/agent` + `docs/plan`, đánh số plan, gom todo/plan lạc chỗ; KHÔNG copy TODO/CHANGES của project khác vào).

## Điều hướng — vào việc
1. **Chưa có `docs/.harness.json`?** → `zemory --version` (báo "not found" thì `npm i -g zemory`) → `zemory init` (dựng harness chuẩn) → `zemory doctor` xanh là xong. Đã có → bỏ qua.
2. **ĐỌC HẾT `docs/`** trước khi làm — KHÔNG bỏ sót, KHÔNG cắt bớt: toàn bộ `docs/agent/*` (`01_CONSTITUTION` hiến pháp TỐI CAO → `02_RULES` luật làm việc → `03_STRUCTURE` cấu trúc + reconcile → `04_TODO` backlog → `05_CHANGES` changelog) **và** toàn bộ `docs/plan/*` (`00_overview` app-là-gì → các spec `NN_`). *(Ngoại lệ: `docs_visual/` nằm NGOÀI `docs/` — nặng, chỉ mở khi user nhắc.)*
3. Làm việc user yêu cầu — tuân `02_RULES` (luật làm việc) và `01_CONSTITUTION` (bất biến, trên hết). `.md` là NGUỒN: đọc/sửa thẳng file (file wins), không cần chạy lệnh để đọc.

> **Toàn bộ luật · quy trình · cấu trúc · cách sửa docs · reconcile · grill · git nằm TRONG `docs/agent/*`.** AGENTS.md CHỈ điều hướng, KHÔNG lặp lại nội dung harness.
