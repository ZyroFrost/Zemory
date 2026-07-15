<!-- zemory · file chỉ đường DUY NHẤT ở root. Mọi hướng dẫn nằm đây. -->
# <PROJECT>

Project này dùng **zemory** — lớp quản trị bộ nhớ/context cho agent.
**Docs trong `docs/` có 2 LOẠI — nhìn DÒNG ĐẦU file để biết, sửa đúng đường:**
- **Mirror** (dòng đầu có `<!-- GENERATED from global_memory.db -->` — thường là TODO · CHANGES · `docs/plan/*`): **DB là nguồn**, `.md` chỉ là bản render — sửa bằng lệnh (`zemory plan set` / `changelog add`), **ĐỪNG gõ tay** (render sẽ ghi đè; `zemory docs sync` cũng cố tình KHÔNG import sửa tay vào mirror — nó báo `kept DB source` — để mirror cũ không đè ngược DB).
- **Hand-source** (KHÔNG có header GENERATED — thường là CONSTITUTION · STRUCTURE): **chính file `.md` là nguồn** — sửa file trực tiếp rồi chạy `zemory docs sync` để nạp bản mới vào DB (DB chỉ giữ bản copy cho search).

> **Cài harness = NẮN project về CHUẨN, KHÔNG bê nội dung mẫu.** zemory chỉ dựng sẵn **cấu trúc + cách lưu** chuẩn; **nội dung** (CONSTITUTION/TODO/CHANGES/plan) là của riêng project. Bạn (AI) đọc bộ chuẩn (`01_CONSTITUTION.md` + `02_RULES.md` + các mục dưới) rồi tự chỉnh project cho khớp cấu trúc — dựng `docs/agent` + `docs/plan`, đánh số plan, gom todo/plan lạc chỗ. TUYỆT ĐỐI không copy TODO/CHANGES của project khác vào.

## 0. Lần đầu trong repo này? → SETUP (BỎ QUA nếu đã có `docs/.harness.json`)
1. Gõ thử `zemory --version`. Báo "not found" → `npm i -g zemory`.
2. Chưa có `docs/.harness.json` → `zemory init` (scaffold harness chuẩn).
3. `zemory doctor` xanh → setup xong, sang §1.
→ **Đã có `docs/.harness.json` rồi thì KHÔNG chạy §0**, vào thẳng §1.

## 1. Mở phiên (MỖI lần) — ĐÚNG 3 bước rồi BẮT TAY LÀM
1. `zemory docs sync` — nạp docs vào brain. **LUÔN chạy đầu tiên** (thiếu → plan rỗng).
2. Đọc `docs/agent/01_CONSTITUTION.md` (hiến pháp — bất biến TỐI CAO riêng của project, vi phạm = bug thiết kế) rồi `02_RULES.md` (luật làm việc chung). Tuân tuyệt đối, hiến pháp trên hết.
3. `zemory doctor` — xanh là XONG. Làm việc user yêu cầu.
→ Hết. Đừng lặp lại `plan ls/search`; đừng tự dọn docs (trừ §3 / §5, hoặc user bảo).

## 2. Tra cứu (KHI CẦN, không phải mỗi lần)
- Plan/spec: `zemory plan ls [doc]` · `plan search "<q>"` · `plan show <#id>`
- Backlog: `docs/agent/04_TODO.md` · Changelog: `zemory changelog ls`
- Việc cũ / session khác: `zemory brain search "<q>" [--all]` — **chỉ khi user nhắc việc đã làm / lỗi cũ**, đừng tìm bừa.

## 3. Sửa docs — MIRROR qua lệnh, HAND-SOURCE sửa file + sync
**Sửa NỘI DUNG là việc của bạn** — chọn đúng đường theo loại (xem 2 LOẠI ở đầu file):
- **Hand-source** (không header GENERATED — CONSTITUTION/STRUCTURE): sửa file `.md` trực tiếp → `zemory docs sync`.
- **Mirror** (có header GENERATED — plan/TODO/CHANGES): đừng mở `.md` gõ tay, làm qua lệnh:
- Sửa 1 mục (plan/rules): ghi nội dung mới ra **file tạm (UTF-8)** → `zemory plan set <#id> --file <path>` (tự render lại).
- Thêm changelog: `zemory changelog add "<tiêu đề>" --file <path>` (hoặc bỏ `--file` nếu không có body).
- Render lại toàn bộ .md: `zemory docs render`.

⚠ **Windows/PowerShell**: ĐỪNG dùng `echo "..." | zemory plan set` cho nội dung **có dấu** — PowerShell làm hỏng UTF-8 (đ/ư/ậ → `?`). **Luôn dùng `--file`** (ghi file tạm rồi truyền path).

**Thấy nội dung SAI** — ref tới file không tồn tại, tên file cũ, link gãy, todo lạc trong plan?
→ **ĐỪNG đứng hình, ĐỪNG chỉ báo cáo.** Đây chính là việc cần sửa:
1. `zemory plan ls <doc>` — tìm `#id` của section sai.
2. Ghi bản đúng ra file tạm → `zemory plan set <#id> --file <path>`.
3. Xoá nguyên doc thừa/trùng thì theo §5.

## 4. Quy tắc nội dung
- Bộ chuẩn LUÔN có **TODO**. Thấy todo bất kỳ đâu (TODO.md root, todo lẫn trong plan) → **gộp vào `04_TODO`**. **`plan` = specs thuần, KHÔNG todo.**
- **Luật riêng của app** (bất biến kiến trúc) → `01_CONSTITUTION.md` (user chốt); thấy luật nằm rải trong plan → đề xuất dời về hiến pháp, plan chỉ dẫn chiếu.

## 5. Reconcile docs cũ — khi `zemory sync` báo "non-standard", hoặc có doc trùng/thừa
1. `zemory docs sync` — import HẾT `.md` → brain (an toàn, không đụng file).
2. `zemory docs ls` — xem cái nào **trùng**/**thừa**.
3. `zemory plan show <#id>` — đọc nội dung TRƯỚC khi quyết.
4. Gộp todo → `04_TODO`. Bỏ thừa: `zemory docs rm <path>` cho bản trùng/obsolete. **HỎI user** nếu doc còn nội dung thật.
5. **Plan:** gom mọi doc mô tả plan (folder `planning`, doc plan lạc ở root/`docs`) về `docs/plan/`, đặt tên **`NN_tên.md`** đánh số thứ tự (`00_`, `01_`, …); `plan` chỉ chứa specs, todo tách về `04_TODO`.
6. `zemory docs render` → `zemory doctor` (xanh = xong). KHÔNG mất nội dung; HỎI trước khi bỏ.

## 6. Grill — CHỈ khi user kêu "grill" / trước quyết định khó đảo
- Hỏi **TỪNG câu một** (kèm đề xuất), chờ trả lời rồi hỏi tiếp; đi hết các nhánh.
- Cái nào đọc code/docs ra được → đọc, ĐỪNG hỏi. Chốt xong **mới build**. Quyết định bền → `zemory changelog add`.

## 7. Reconcile CẤU TRÚC repo — nắn về chuẩn (xem `03_STRUCTURE.md`)
Khi `zemory validate` báo folder lệch, hoặc repo chưa theo khung `backend/` `frontend/` `docs/`:
1. `zemory validate` — xem tầng nào thiếu / đặt sai (advisory, không tự sửa).
2. Nắn về chuẩn, **GIỮ git history — dùng `git mv`, KHÔNG copy rồi xoá** (bảng routing ĐẦY ĐỦ ở `03_STRUCTURE.md`):
   - code CỦA MÌNH → `backend/` (Python `backend/<pkg>/`; Node `backend/src/`|`src/`); type/contract dùng chung BE↔FE → `backend/src/types/` (FE import).
   - UI/asset → `frontend/` (asset → `frontend/assets/`). Repo ngoài clone về → `external/`. Config app tự quản → `backend/infra/`.
   - **Nguồn cũ / code BỊ THAY khi refactor → `attic/`** (backup tracked — đừng xoá thẳng, để rollback). Runtime `.db`/log/cache + secret `.key`/bundle → `data/` (gitignore).
   - Tool ép root: `.github/` (CI) · `.vscode/` · Docker/`.spec` · `.env` (secret → gitignore) + `.env.example` (tracked). Build output `dist/`,`build/` → root + `.gitignore`.
   - **KHÔNG ép tạo `test/`** — chỉ khi app có test tự động (lõi logic). Bắt buộc chỉ 4: `backend(code)/ frontend/ docs/ AGENTS.md`.
3. Sau khi move: **sửa import / entry point / path** cho khớp — cần **judgment**, làm cẩn thận rồi **verify (chạy chính app)**.
4. **Đập cấu trúc lớn / khó đảo → HỎI user TRƯỚC.** zemory chỉ *chỉ ra* chỗ lệch; **agent tự nắn**, không auto-move.
5. Xong → cập nhật `README` + `zemory changelog add` (sau khi OK).

## 8. "Đọc zemory, refactor app này theo chuẩn" — recipe end-to-end
Khi user mở 1 app và kêu bạn *đọc zemory + nắn app về chuẩn* (không tự chạy UI):
1. **Chưa có harness** (`docs/.harness.json`)? → `zemory init` (kéo chuẩn + `AGENTS`/`RULES` vào). Đã có → bỏ qua.
2. `zemory structure` — xem **ĐÍCH** (repo layout + bảng routing) cần conform. `zemory validate` — xem đang **lệch** đâu.
3. Đọc `docs/agent/03_STRUCTURE.md` (cây từng-dòng + bảng routing = index điều hướng: sửa gì → folder nào).
4. **Reconcile theo §7** (git mv giữ history, gom theo bảng routing — nguồn cũ bị thay → `attic/`, runtime/secret → `data/`, `.env`/CI ở root, **KHÔNG ép `test/`**). Sửa import/entry/path → verify bằng cách **chạy chính app**.
5. **Đập cấu trúc lớn / khó đảo → HỎI user TRƯỚC.** Xong → cập nhật `README` + `zemory changelog add` (sau OK).
