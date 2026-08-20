<!-- zemory · file chỉ đường DUY NHẤT ở root. THUẦN điều hướng — KHÔNG luật, KHÔNG nội dung harness (tất cả nằm trong docs/agent/*). -->
# <PROJECT>

> ⛔ **DỪNG — bạn mở repo này để LÀM VIỆC, hay chỉ để THAM KHẢO?**
> Nếu project bạn đang làm **KHÔNG phải repo này** (chỉ ghé đọc/tham khảo) → **CHỈ ĐỌC, KHÔNG GHI:**
> - ❌ **KHÔNG** sửa/tạo/xoá file ở đây. ❌ **KHÔNG** chạy lệnh `zemory` với cwd ở đây — mọi lệnh GHI (`init` · `sync` · `reindex` · `archive` · `memory scan/sync` · `hook`…) ghi vào repo này **và/hoặc** `global_memory.db`.
> - ⚠ Repo này **có thể đang có phiên agent khác làm việc** — bạn ghi vào = xung đột thật.
> - ✅ Muốn tham khảo cách làm → đọc rồi ÁP VÀO REPO CỦA BẠN, chạy lệnh `zemory` ở repo của bạn.
> - Thật sự cần ghi vào đây → **HỎI USER TRƯỚC**.

Project này dùng **zemory** (harness) ở **hệ ADAPT** — repo có **cấu trúc riêng có sẵn** và
**KHÔNG được nắn**. Ta nắn *harness theo repo*, không nắn repo theo harness.

> 🔺 **Nếu bạn từng làm với zemory ở repo khác: ĐỪNG áp chuẩn cũ vào đây.**
> Hệ APP đòi `backend/` · `frontend/`; hệ NON-APP đòi deliverable + `tasks/`. **Hệ này KHÔNG đòi
> tên folder nào cả** — nó đọc bảng ánh xạ đã khoá ở `docs/agent/03_STRUCTURE.md` §3 và
> `docs/.harness.json`. Tạo `backend/` ở đây là **làm bẩn repo của người khác**.

Mọi luật · quy trình · cấu trúc · thiết kế nằm trong `docs/` — file này CHỈ chỉ đường vào đó:

## Vào việc
1. **Chưa có `docs/.harness.json`, hoặc có mà `layout` chưa phải `"foreign"`?** → repo CHƯA được
   nhận. **Chạy skill `adopt`** (`.claude/skills/adopt/SKILL.md`) — đọc NGUYÊN file, đừng làm tắt.
   Nó sẽ: **hỏi user APP hay NON-APP** (ĐỪNG tự đoán) → đọc cây thật → **đề xuất** bảng ánh xạ →
   **chờ người duyệt** → khoá. **Tuyệt đối không tự khoá bảng khi chưa ai duyệt** — chuẩn tự uốn
   theo cái nó nhìn thấy thì `conform` luôn xanh và không gác gì cả.
   Đã khoá rồi → bỏ qua bước này.
2. **ĐỌC HẾT `docs/`** — KHÔNG bỏ sót: `docs/agent/01_CONSTITUTION` · `02_RULES` · `05_TODO` ·
   `06_CHANGES` **và** toàn bộ `docs/plan/*`. **`03_STRUCTURE` và `04_SKILLS` KHÔNG nằm trong bộ
   này** — xem §Mở khi trúng trigger.
3. **`03_STRUCTURE` ở hệ này là BẢNG ÁNH XẠ ĐÃ KHOÁ, dùng để TRA — không đọc hết mỗi phiên.**
   Mở nó khi: **cần biết một concern nằm ở folder nào của repo** · **thêm folder mới** ·
   **cấu trúc gốc của repo đã đổi** · `conform` báo lệch.
   `zemory conform` gác **thực tế so với bảng đã khoá** — không đòi `backend/`/`frontend/`.
4. **Lịch sử cũ nằm ở `docs/agent/archive/`** — ngoài bộ đọc mỗi phiên nhưng **vẫn tra được**
   (`zemory changelog search` · `zemory plan search`). Không thấy một việc trong `05_TODO`/
   `06_CHANGES` **KHÔNG** có nghĩa là chưa từng có — tra archive trước khi kết luận "chưa làm".
5. Làm theo những gì vừa đọc — `01_CONSTITUTION` (bất biến, TỐI CAO) trên `02_RULES`.

## Luật riêng của hệ ADAPT — luôn áp, không cần mở file nào
- **KHÔNG đổi tên · KHÔNG dời · KHÔNG xoá** bất kỳ folder/file nào đang có của repo. Thấy cấu
  trúc "xấu" → ghi nhận xét vào `05_TODO`, **không tự sửa**. Đổi tên một folder là phá đường
  import, CI, pre-commit, và tài liệu của người khác.
- **Chỉ được THÊM** các đường của harness: `AGENTS.md` · `CLAUDE.md` · thư mục harness
  (`.harness.json` → `docs`) · `docs/plan/` · `.claude/skills/`. Trùng tên với thứ có sẵn →
  **đổi đường harness**, không đổi thứ của repo.
- **Thêm folder mới cho repo** → đặt theo **quy ước ĐANG CÓ của repo**, không theo quy ước
  zemory; rồi thêm một dòng vào `03_STRUCTURE` §3 và ghi `06_CHANGES`. Bỏ bước khai báo là
  `conform` đỏ — đúng như mong muốn.

## Mở khi trúng trigger — chưa trúng thì KHÔNG mở
> `03_STRUCTURE` · `04_SKILLS` · các quy trình trong `.claude/skills/` nằm NGOÀI bộ đọc mỗi phiên.
> **Mở một skill = đọc NGUYÊN file đó**, không đọc lướt. Nghi ngờ thì mở.

| Mở khi | Đọc |
|---|---|
| repo chưa nhận · cấu trúc gốc đã đổi · `conform` đỏ | `.claude/skills/adopt/SKILL.md` |
| tra "concern này nằm folder nào" · thêm folder mới | `docs/agent/03_STRUCTURE.md` §3 |
| hỏi "repo có sẵn quy trình gì" · thêm/bớt skill | `docs/agent/04_SKILLS.md` |
| yêu cầu chưa đủ rõ để làm đúng | `.claude/skills/grill/SKILL.md` |
| "note lại" · "ghi sổ" · "chốt phiên" · sắp đổi session | `.claude/skills/session-close/SKILL.md` |
| kiểm độ bám chuẩn | `.claude/skills/conform/SKILL.md` |
| user nói "audit toàn diện" / "soi hết" | `.claude/skills/audit/SKILL.md` |
| cần ĐỌC nội dung `.xlsx .xls .docx .pptx .pdf` | `.claude/skills/read-office/SKILL.md` |
| cần SỬA / TẠO file Word `.docx` | `.claude/skills/write-docx/SKILL.md` |
| cần VIẾT văn bản đưa người đọc (báo cáo · email · content · tài liệu giao đi) | `.claude/skills/write-style/SKILL.md` |

> ⚠ Skill `reconcile` (nắn repo về chuẩn) **KHÔNG dùng ở hệ này** — nó nắn repo, đúng thứ hệ
> ADAPT cấm. Cần chỉnh thì chỉnh **bảng ánh xạ**, không chỉnh repo.
