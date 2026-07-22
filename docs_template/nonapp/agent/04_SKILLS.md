<!-- zemory template · playbook CHUNG mọi project — BẢN HỆ NON-APP (grill · chốt phiên · reconcile + pull/fill/upload). Ship nguyên từ template. RULES/STRUCTURE nêu NORM+trigger rồi DẪN CHIẾU tới đây; KHÔNG nhét luật riêng vào đây. grill/chốt-phiên GIỮ KHỚP bản app. -->
# <PROJECT> — Kho skill (playbook thao tác — hệ NON-APP)

> **KHO SKILL** — chứa NHIỀU skill; mỗi `## <tên>` là MỘT skill (playbook thao tác tự-chứa). File này **CHỈ chứa skill** — KHÔNG nhét luật / norm / mô tả cấu trúc vào đây (luật → `01_CONSTITUTION`/`02_RULES` · chuẩn cấu trúc → `03_STRUCTURE`). RULES/STRUCTURE chỉ nêu NORM + trigger rồi **DẪN CHIẾU** tới skill tương ứng.
> **HAI KHUÔN — chọn theo độ dài:**
> - **NGẮN → inline:** 1 section `## <tên>` ngay trong file này. Vd: `grill` · `chốt phiên` · `reconcile` · `pull` · `fill` · `upload`.
> - **DÀI / có resources → KHÔNG chép vào đây:** vendor **nguyên bản** repo gốc vào `external/skills/<tên-repo>/` (giữ đúng tên + LICENSE), ở đây chỉ để **1 DÒNG INDEX** trỏ tới.
> - **⚠ GUARDRAIL:** file này **KHÔNG BAO GIỜ phình**. Nội dung dài ra thì thuộc **skill gốc** (`external/skills/`) hoặc **chuẩn** (`03_STRUCTURE`).
> **Kích hoạt:** trigger ở RULES/STRUCTURE bắn, hoặc user gọi tên skill. Đọc SAU `01_CONSTITUTION` · `02_RULES` · `03_STRUCTURE`.

## Cách dùng skill (LUẬT chung — vendored `external/skills/`)
Skill vendored là **kho THAM KHẢO**, KHÔNG auto-apply. Quy trình BẮT BUỘC mỗi khi làm việc mà skill phủ (dataviz cho report/dashboard, review chất lượng, chọn palette/theme trình bày…):
1. **ĐỌC skill liên quan trước**; nếu nó không phủ vấn đề → nói RÕ "skill không có match", đừng bịa.
2. **RÚT KHUYẾN NGHỊ**, phân 3 loại: ✅ nên theo · ⚠ đang KẸT / sai / anti-pattern · ◻ nên chuẩn hoá.
3. **TRÌNH user (recommend) — KHÔNG tự đổi.** Áp/đổi vẫn theo `02_RULES §Hành xử`; **user chốt mới làm**.

Nói gọn: **skill khuyến nghị, user quyết, agent thực thi sau khi được duyệt.**

### Kho skill vendored (`external/skills/` — dùng chung, đọc on-demand)
| skill | dùng khi | đường dẫn | license |
|---|---|---|---|
| *(chưa có — thêm khi vendor skill đầu tiên)* | | | |

**Skill inline hiện có:** `grill` · `chốt phiên / ghi sổ` · `reconcile` · `pull` · `fill` · `upload`.

## grill
> Kích hoạt (tự động): `02_RULES §Hành xử` bắn khi yêu cầu chưa đủ để thực thi đúng. User gõ "grill" = ép chạy thủ công cùng cơ chế.

**Mục tiêu:** làm rõ yêu cầu TRƯỚC khi thực thi — KHÔNG tự chọn cách hiểu rộng nhất, KHÔNG tự suy diễn.

**Điều kiện kích hoạt (bất kỳ):** yêu cầu đa nghĩa · thuật ngữ nhiều cách hiểu · thiếu dữ kiện · phạm vi không xác định · tồn tại giả định ngầm chưa nêu · hai yêu cầu mâu thuẫn · hoặc trước thao tác khó đảo ngược.

**Quy trình:**
1. **Dừng** — chưa làm.
2. **Đọc trước, hỏi sau:** cái nào đọc docs/deliverable/data ra được thì ĐỌC, đừng hỏi. Chỉ hỏi phần input từ user còn thiếu để thực thi đúng.
3. **Hỏi mỗi lần MỘT câu** — kèm ĐỀ XUẤT của mình + diễn giải lại để xác nhận đúng ý.
4. **Đi hết mọi nhánh còn mơ hồ** cho tới khi đủ dữ kiện.
5. **Chốt đủ rõ MỚI làm.**

## chốt phiên / ghi sổ
> Kích hoạt (luật cứng, `02_RULES §Chốt phiên`): user nói "note lại" · "docs lại" · "ghi sổ" · "chốt phiên" · "sắp hết context / đổi session / mở phiên mới" — hoặc bất kỳ cách nói nào mang nghĩa **kết sổ phiên này để phiên sau đọc tiếp**.

**TUYỆT ĐỐI không ghi docs theo trí nhớ tóm tắt.** Ghi theo tóm tắt = mất chi tiết, và cái mất luôn là cái phiên sau cần nhất.

**Global Memory là NGUỒN THẬT của phiên — trí nhớ trong context thì KHÔNG.** Khi context bị tóm tắt/trim, chi tiết phiên vẫn còn NGUYÊN trong episodic memory (DB); cái bạn "nhớ" trong context đã bị lược. Đây là GỐC của "đổi session là sót/lệch". Nên **mọi lần ghi docs / audit / báo cáo — nhất là khi ĐỔI SESSION — BẮT BUỘC dò Global Memory + đối chiếu deliverable/pipeline/file THẬT để verify TRƯỚC khi khẳng định bất cứ điều gì.**

**Bước 0 — DÒ GLOBAL MEMORY + VERIFY (bắt buộc, KHÔNG skip, làm TRƯỚC Bước 1):**
1. `zemory memory digest <session>` + `zemory memory search "<chủ đề phiên>" [--all]` → dựng lại ĐẦY ĐỦ việc/đổi/quyết định/lỗi của phiên, kể cả đoạn đã trôi khỏi context.
2. **Verify từng mục sắp ghi với NGUỒN THẬT** = GM (điều đã thực sự làm/nói/quyết) + deliverable/measure/pipeline/file THẬT (đọc lại chỗ liên quan). Chỉ mục SỐNG SÓT verify mới được ghi; claim chưa verify = KHÔNG ghi.
3. **Áp CẢ cho audit / báo cáo lỗi:** mỗi finding phải đối chiếu file THẬT + GM trước khi gọi là "lỗi thật". Bẫy điển hình: tên file cũ trong entry changelog CŨ là **BẢN GHI LỊCH SỬ**, KHÔNG phải link gãy cần sửa; số liệu trong report cũ có thể là snapshot đúng-tại-thời-điểm. KHÔNG tin kết quả subagent chưa tự kiểm lại.

**Bước 1 — ĐỌC LẠI ĐỦ 3 nguồn TRƯỚC khi ghi:**
1. **FULL phiên hiện tại** (dùng `zemory memory digest`/`search` moi lại đoạn đã trôi): đã LÀM gì · đã ĐỔI gì · QUYẾT ĐỊNH gì · còn DỞ gì · phát hiện LỖI gì chưa sửa.
2. **FULL `docs/plan/*`** — mọi file, để biết việc vừa làm có đụng/lệch spec/dictionary nào không.
3. **FULL `docs/agent/*`** — `01`→`06`, để biết chỗ nào phải cập nhật và không ghi trùng.

**Bước 2 — định tuyến từng thứ về đúng file, KHÔNG BỎ SÓT:**

| Thứ phát sinh trong phiên | Ghi vào |
|---|---|
| Việc đã xong / deliverable-measure-pipeline đã sửa | `06_CHANGES.md` (sau khi user OK) **và xoá khỏi** `05_TODO.md` |
| Việc còn dở · việc phát sinh · việc phiên sau làm | `05_TODO.md` — nêu rõ `[~]`, **đã tới đâu, bước kế tiếp là gì** |
| Thiết kế / quyết định thay đổi (gồm định nghĩa metric) | `docs/plan/NN_*.md` / `docs/dictionary.md` (+ supersede ở changelog nếu đảo quyết định cũ) |
| Luật / bất biến riêng phát sinh | **ĐỀ XUẤT** vào `05_TODO.md` chờ user chốt — KHÔNG tự sửa `01_CONSTITUTION.md` |

**Chuẩn "không bỏ sót":** mọi việc đã làm phải tìm được ở CHANGES **hoặc** TODO. Chẩn đoán sai / đường cụt **cũng phải ghi** (để phiên sau khỏi đâm lại).

**Bước cuối:** `zemory validate` (xanh mới coi là chốt xong) → BÁO CÁO user. Không tự `git push` (`02_RULES §Git`).

## reconcile
> Kích hoạt (`03_STRUCTURE §6`): flow HIẾM, chỉ khi dọn repo chưa theo chuẩn. `zemory validate`/`structure` chỉ **CHỈ RA** chỗ lệch (advisory) — **agent tự nắn, zemory KHÔNG auto-move**. **Đập cấu trúc lớn / khó đảo → HỎI user TRƯỚC** (`02_RULES §Hành xử`, §Git).

**A. Docs lệch** (doc trùng / thừa / lạc chỗ):
1. Soi file `.md` trùng/thừa trong `docs/`; **đọc file** TRƯỚC khi quyết.
2. Gộp todo lạc → `05_TODO`. Bỏ bản trùng/obsolete: **xoá thẳng file `.md`** (file wins) — **HỎI user trước nếu doc còn nội dung thật**; sau khi xoá, `zemory reindex`.
3. Gom mọi doc plan về `docs/plan/`, đặt tên `NN_tên.md` (`00_overview` → `01_` …); plan chỉ chứa specs, todo tách về `05_TODO`.

**B. Cấu trúc folder lệch** (chưa theo khung non-app):
1. `zemory validate` — xem thiếu deliverable / đặt sai (advisory).
2. Nắn theo routing `03_STRUCTURE §3`, **GIỮ git history — `git mv`, KHÔNG copy rồi xoá**:
   - sản phẩm giao đi → `reports/`|`models/`|`content/`|`design/`. Định nghĩa nguồn → `sources/` · DAX → `measures/` · SQL/M gọi-tên → `queries/`.
   - việc định kỳ → `tasks/NN_<tên>/`; data thật → `data/<task>/` (gitignore). File lẻ 1-lần → `data/adhoc/`. Template điền → `templates/`.
   - raw kéo về / extract → `data/extract/` (gitignore). Render ra → `exports/` (gitignore). Secret → `.env`/`config/*.local.*` (gitignore).
   - **Bắt buộc chỉ 3 vai trò:** `docs` · `AGENTS.md` · ≥1 deliverable. KHÔNG ép `backend/`+`frontend/` (non-app không có code-app).
3. Sau move: sửa path trong scripts/sources/connection cho khớp → verify bằng cách MỞ deliverable / chạy refresh thử.
4. Xong → cập nhật `README` + ghi entry `06_CHANGES.md` (sau khi user OK).

**Recipe end-to-end:** `zemory init --non-app` (nếu chưa có harness) → `zemory structure` (xem ĐÍCH) + `zemory validate` (xem lệch đâu) → đọc `03_STRUCTURE §2` (cây) + §3 (routing) → làm **A** rồi **B** → verify (mở deliverable / refresh) → cập nhật README + changelog (sau khi user OK). Việc lớn / khó đảo: HỎI user trước.

## pull  (KÉO nguồn tự động)
> Kích hoạt: cần đưa data mới từ nguồn (SQL/VM/web/API) về để làm deliverable. `03_STRUCTURE §5`.

1. Đọc **`sources/`** (định nghĩa M/connection/SQL) + credential từ **`.env`/`config/`** — **KHÔNG nhập password vào zemory**; nếu nguồn là web thì mượn phiên đã login trên trang thật.
2. Kéo raw về **`data/extract/`** (gitignore) — đặt tên theo nguồn + ngày. Pace/backoff nếu API có rate-limit; **resume-safe** (kéo tiếp được sau khi đứt).
3. **KHÔNG commit** file kéo về (PII/nặng). Ghi lại lần kéo (nguồn · phạm vi · số dòng) vào task/`05_TODO` để truy được.
4. Lỗi nguồn → BÁO, đừng bịa số; thiếu quyền → HỎI user.

## fill  (ĐIỀN template tự động)
> Kích hoạt: có template trống + đã có số → xuất bản deliverable/exports. `03_STRUCTURE §5`.

1. Lấy file mẫu từ **`templates/`** (bản TRỐNG) — KHÔNG sửa template gốc; làm việc trên bản sao.
2. Đổ số từ **`data/`** / **`measures/`** / **`queries/`** vào đúng ô/sheet theo **`docs/dictionary.md`** (định nghĩa metric = nguồn sự thật — chống mỗi lần điền một kiểu).
3. Xuất ra **deliverable** (`reports/…` nếu là bản chính giao đi) hoặc **`exports/`** (bản render). Giữ tên file theo convention của task (`<ngày>_..._REPORT.xlsx`).
4. **Đổi HÌNH HÀI/bố cục** report (thêm/bớt cột, đổi chart, layout) = quyết định TRÌNH BÀY → **trình user trước** (`02_RULES §Hành xử`); điền số theo mẫu có sẵn thì cứ làm.

## upload  (ĐẨY / PUBLISH tự động)
> Kích hoạt: deliverable đã xong → đưa lên đích (workspace BI · Drive · SharePoint). `03_STRUCTURE §5`.

1. Chạy **`scripts/`** publish (pbi-tools / PowerShell / API) — đích + credential lấy từ **`config/`**/`.env`, KHÔNG hardcode.
2. **Xác nhận đích + phạm vi TRƯỚC khi đẩy** (đẩy đè bản đang chạy = khó đảo — như `git push`, phải được user cho phép nếu là môi trường thật/production).
3. Sau khi đẩy: verify ở đích (mở lại / kiểm số) + ghi lần publish vào `06_CHANGES` (sau khi user OK).
4. Giữ bản trước khi đè về **`attic/`** để rollback (đối xứng "backup deploy 2 chiều" của app).
