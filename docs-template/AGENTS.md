<!-- zemory · file chỉ đường DUY NHẤT ở root. Mọi hướng dẫn nằm đây. -->
# <PROJECT>

Project này dùng **zemory** — lớp quản trị bộ nhớ/context cho agent.
**Nguồn sự thật = `~/.zemory/global_memory.db`.** File `.md` trong `docs/` là **bản render sinh ra từ global_memory** — sửa NỘI DUNG bằng lệnh `zemory`, **đừng mở `.md` gõ tay** (render sẽ ghi đè).

## 0. Lần đầu trong repo này? → SETUP (BỎ QUA nếu đã có `docs/.harness.json`)
1. Gõ thử `zemory --version`. Báo "not found" → `npm i -g zemory`.
2. Chưa có `docs/.harness.json` → `zemory init` (scaffold harness chuẩn).
3. `zemory doctor` xanh → setup xong, sang §1.
→ **Đã có `docs/.harness.json` rồi thì KHÔNG chạy §0**, vào thẳng §1.

## 1. Mở phiên (MỖI lần) — ĐÚNG 3 bước rồi BẮT TAY LÀM
1. `zemory docs sync` — nạp docs vào brain. **LUÔN chạy đầu tiên** (thiếu → plan rỗng).
2. Đọc `docs/agent/01_RULES.md` — luật bất dịch, tuân tuyệt đối.
3. `zemory doctor` — xanh là XONG. Làm việc user yêu cầu.
→ Hết. Đừng lặp lại `plan ls/search`; đừng tự dọn docs (trừ §3 / §5, hoặc user bảo).

## 2. Tra cứu (KHI CẦN, không phải mỗi lần)
- Plan/spec: `zemory plan ls [doc]` · `plan search "<q>"` · `plan show <#id>`
- Backlog: `docs/agent/02_TODO.md` · Changelog: `zemory changelog ls`
- Việc cũ / session khác: `zemory brain search "<q>" [--all]` — **chỉ khi user nhắc việc đã làm / lỗi cũ**, đừng tìm bừa.

## 3. Sửa docs — qua LỆNH, KHÔNG mở `.md`
"Không sửa tay" = đừng mở file `.md` trong editor. **Sửa NỘI DUNG là việc của bạn** — làm qua lệnh:
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
- Bộ chuẩn LUÔN có **TODO**. Thấy todo bất kỳ đâu (TODO.md root, todo lẫn trong plan) → **gộp vào `02_TODO`**. **`plan` = specs thuần, KHÔNG todo.**

## 5. Reconcile docs cũ — khi `zemory sync` báo "non-standard", hoặc có doc trùng/thừa
1. `zemory docs sync` — import HẾT `.md` → brain (an toàn, không đụng file).
2. `zemory docs ls` — xem cái nào **trùng**/**thừa**.
3. `zemory plan show <#id>` — đọc nội dung TRƯỚC khi quyết.
4. Gộp todo → `02_TODO`. Bỏ thừa: `zemory docs rm <path>` cho bản trùng/obsolete. **HỎI user** nếu doc còn nội dung thật.
5. `zemory docs render` → `zemory doctor` (xanh = xong). KHÔNG mất nội dung; HỎI trước khi bỏ.

## 6. Grill — CHỈ khi user kêu "grill" / trước quyết định khó đảo
- Hỏi **TỪNG câu một** (kèm đề xuất), chờ trả lời rồi hỏi tiếp; đi hết các nhánh.
- Cái nào đọc code/docs ra được → đọc, ĐỪNG hỏi. Chốt xong **mới build**. Quyết định bền → `zemory changelog add`.
