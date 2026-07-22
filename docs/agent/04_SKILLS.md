<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — Kho skill (playbook thao tác)

> **KHO SKILL** — chứa NHIỀU skill; mỗi `## <tên>` là MỘT skill (playbook thao tác tự-chứa). File này **CHỈ chứa skill** — KHÔNG nhét luật / norm / mô tả cấu trúc / thứ linh tinh khác vào đây (luật → `01_CONSTITUTION`/`02_RULES` · chuẩn cấu trúc → `03_STRUCTURE`). RULES/STRUCTURE chỉ nêu NORM + trigger rồi **DẪN CHIẾU** tới skill tương ứng; cách-làm chi tiết nằm ở đây.
> **HAI KHUÔN — chọn theo độ dài:**
> - **NGẮN → inline:** 1 section `## <tên>` ngay trong file này (trigger → các bước). Vd: `grill` · `chốt phiên` · `reconcile`.
> - **DÀI / có resources → KHÔNG chép vào đây:** vendor **nguyên bản** repo gốc vào `external/skills/<tên-repo>/` (giữ đúng tên + LICENSE, KHÔNG sửa nội dung người ta — HP điều 1/2), ở đây chỉ để **1 DÒNG INDEX** trỏ tới. Agent cần thì **đọc thẳng bản gốc** (trỏ, KHÔNG chép ⇒ đủ nội dung mà 0 nhân bản).
> - **⚠ GUARDRAIL:** file này **KHÔNG BAO GIỜ phình**. Nội dung dài ra thì nó thuộc **skill gốc** (`external/skills/`) hoặc **chuẩn** (`03_STRUCTURE`) — không có ngoại lệ.
> **Adapter ở đâu?** KHÔNG viết prose adapter ở đây. Chỗ "adapt hiện ra thật" là **`03_STRUCTURE`** (từ điển slot + ràng buộc): agent đọc skill gốc + đọc 03 rồi tự khớp; bỏ vào slot hay không là quyết định của agent theo từng project.
> **Kích hoạt:** trigger ở RULES/STRUCTURE bắn, hoặc user gọi tên skill. Đọc SAU `01_CONSTITUTION` · `02_RULES` · `03_STRUCTURE`.

### Kho skill vendored (`external/skills/` — của repo zemory, dùng chung, đọc on-demand)
> Không phải project nào cũng xài; zemory cũng có thể không xài. Kho nằm **1 chỗ ở repo zemory**, KHÔNG copy sang từng project.

| skill | dùng khi | đường dẫn | license |
|---|---|---|---|
| `ui-ux-pro-max` | thiết kế UI/UX: 84 UI style · 192 palette · 74 cặp font · 98 UX guideline · 25 chart · 22 stack | `external/skills/ui-ux-pro-max-skill/` (entry: `skill.json`, sub-skill ở `.claude/skills/*`, data ở `src/ui-ux-pro-max/data`) | MIT |

**Skill inline hiện có:** `grill` · `chốt phiên / ghi sổ` · `reconcile`.

## grill
> Kích hoạt (tự động): `02_RULES §Hành xử` bắn khi yêu cầu chưa đủ để thực thi đúng. User gõ "grill" = ép chạy thủ công cùng cơ chế.

**Mục tiêu:** làm rõ yêu cầu TRƯỚC khi thực thi — KHÔNG tự chọn cách hiểu rộng nhất, KHÔNG tự suy diễn.

**Điều kiện kích hoạt (bất kỳ):** yêu cầu đa nghĩa · thuật ngữ nhiều cách hiểu · thiếu dữ kiện · phạm vi không xác định · tồn tại giả định ngầm chưa nêu · hai yêu cầu mâu thuẫn · hoặc trước thao tác khó đảo ngược.

**Quy trình:**
1. **Dừng** — chưa build.
2. **Đọc trước, hỏi sau:** cái nào đọc code/docs ra được thì ĐỌC, đừng hỏi. Chỉ hỏi phần input từ user còn thiếu để thực thi đúng (KHÔNG áp cho kiến thức chung).
3. **Hỏi mỗi lần MỘT câu** — kèm ĐỀ XUẤT của mình + diễn giải lại để xác nhận đúng ý.
4. **Đi hết mọi nhánh còn mơ hồ** cho tới khi đủ dữ kiện.
5. **Chốt đủ rõ MỚI build.**

## chốt phiên / ghi sổ
> Kích hoạt (luật cứng, `02_RULES §Chốt phiên`): user nói "note lại" · "docs lại" · "ghi sổ" · "chốt phiên" · "sắp hết context / đổi session / mở phiên mới" — hoặc bất kỳ cách nói nào mang nghĩa **kết sổ phiên này để phiên sau đọc tiếp**.

**TUYỆT ĐỐI không ghi docs theo trí nhớ tóm tắt.** Ghi theo tóm tắt = mất chi tiết, và cái mất luôn là cái phiên sau cần nhất.

**Bước 1 — ĐỌC LẠI ĐỦ 3 nguồn TRƯỚC khi ghi:**
1. **FULL phiên hiện tại** — đọc lại từ ĐẦU hội thoại, kể cả đoạn đã bị tóm tắt/trôi khỏi context (dùng `zemory memory digest <session>` / `memory search` để moi lại). Rút ra: đã LÀM gì · đã ĐỔI gì · QUYẾT ĐỊNH gì · còn DỞ gì · phát hiện LỖI gì chưa sửa.
2. **FULL `docs/plan/*`** — mọi file, để biết việc vừa làm có đụng/lệch spec nào không.
3. **FULL `docs/agent/*`** — `01_CONSTITUTION` · `02_RULES` · `03_STRUCTURE` · `04_SKILLS` · `05_TODO` · `06_CHANGES`, để biết chỗ nào phải cập nhật và không ghi trùng cái đã có.

**Bước 2 — định tuyến từng thứ về đúng file, KHÔNG BỎ SÓT:**

| Thứ phát sinh trong phiên | Ghi vào |
|---|---|
| Việc đã xong / đã sửa code | `06_CHANGES.md` (sau khi user OK) **và xoá khỏi** `05_TODO.md` |
| Việc còn dở · việc phát sinh · việc phiên sau làm | `05_TODO.md` — nêu rõ trạng thái `[~]`, **đã tới đâu, bước kế tiếp là gì** |
| Thiết kế / quyết định thay đổi | `docs/plan/NN_*.md` (+ supersede ở changelog nếu đảo quyết định cũ) |
| Luật / bất biến riêng phát sinh | **ĐỀ XUẤT** vào `05_TODO.md` chờ user chốt — KHÔNG tự sửa `01_CONSTITUTION.md` |

**Chuẩn "không bỏ sót":** mọi việc đã làm trong phiên phải tìm được ở CHANGES **hoặc** TODO — không việc nào chỉ nằm trong đầu rồi mất theo phiên. Chẩn đoán sai / đường cụt / thứ đã thử mà không xong **cũng phải ghi** (để phiên sau khỏi đâm lại chỗ đó).

**Bước cuối:** `zemory validate` (đọc file trực tiếp — xanh mới coi là chốt xong) → BÁO CÁO user. Không tự `git push` (`02_RULES §Git`).

## reconcile
> Kích hoạt (`03_STRUCTURE §8`): flow HIẾM, chỉ khi dọn repo chưa theo chuẩn. `zemory validate`/`structure` chỉ **CHỈ RA** chỗ lệch (advisory) — **agent tự nắn, zemory KHÔNG auto-move**. **Đập cấu trúc lớn / khó đảo → HỎI user TRƯỚC** (`02_RULES §Hành xử`, §Git).

**A. Docs lệch** (doc trùng / thừa / lạc chỗ):
1. Soi file `.md` trùng/thừa trong `docs/`; **đọc file** TRƯỚC khi quyết (`zemory plan search` nếu cần tìm theo nội dung).
2. Gộp todo lạc → `05_TODO`. Bỏ bản trùng/obsolete: **xoá thẳng file `.md`** (file wins) — **HỎI user trước nếu doc còn nội dung thật** (luật KHÔNG TỰ Ý XÓA); sau khi xoá file, `zemory reindex` cập nhật lại search index.
3. Gom mọi doc plan (folder `planning`, doc plan lạc ở root/`docs`) về `docs/plan/`, đặt tên `NN_tên.md` đánh số (`00_overview` → `01_` …); plan chỉ chứa specs, todo tách về `05_TODO`.

**B. Cấu trúc folder lệch** (chưa theo khung `backend/` · `frontend/` · `docs/`):
1. `zemory validate` — xem tầng nào thiếu / đặt sai (advisory, không tự sửa).
2. Nắn theo bảng routing `03_STRUCTURE §4` (app) / §7 (non-app), **GIỮ git history — dùng `git mv`, KHÔNG copy rồi xoá**:
   - code của mình → `backend/` (Python `backend/<pkg>/` · Node `backend/src/`); dùng chung BE↔FE → `backend/src/shared/`.
   - UI/asset → `frontend/`. Repo ngoài clone → `external/`. Nguồn cũ / code bị thay khi refactor → `attic/` (backup tracked, để rollback). Runtime (`.db`/log/cache) + secret (`.key`/bundle) → `data/` (gitignore). Tool ép root (`.github/` · `.env` + `.env.example` · Docker/`.spec`) → để yên ở root.
   - **KHÔNG ép tạo `test/`** — chỉ khi có lõi logic dễ sai ngầm. Bắt buộc chỉ 4 vai trò: `backend(code)` · `frontend` · `docs` · `AGENTS.md`.
3. Sau move: **sửa import / entry / path** cho khớp (cần judgment) → **verify bằng cách chạy chính app**.
4. Xong → cập nhật `README` + ghi entry vào `06_CHANGES.md` (sửa file trực tiếp, sau khi user OK).

**Recipe end-to-end** ("đọc zemory + nắn app này về chuẩn"): `zemory init` (nếu chưa có harness) → `zemory structure` (xem ĐÍCH: layout + routing) + `zemory validate` (xem đang lệch đâu) → đọc `03_STRUCTURE §3` (cây từng-dòng) + §4/§7 (routing) → làm **A** rồi **B** ở trên → verify bằng cách chạy app → cập nhật README + changelog (sau khi user OK). Việc lớn / khó đảo: HỎI user trước.
