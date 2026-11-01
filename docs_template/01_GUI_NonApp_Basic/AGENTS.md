# <PROJECT>

> ⛔ **Mở repo này để LÀM VIỆC, hay chỉ để THAM KHẢO?** Repo đang làm không phải repo này ⇒ CHỈ ĐỌC: không sửa / tạo /
> xoá file ở đây, không chạy lệnh ghi với cwd ở đây. Repo này có thể đang có phiên agent khác làm việc. Muốn tham khảo
> ⇒ đọc rồi áp vào repo của mình. Thật sự cần ghi vào đây ⇒ hỏi trước.

Repo này dùng harness của zemory ở tầng **Basic** (không cài zemory), hệ **NON-APP**: sản phẩm / tài sản — agent đọc · dò · kéo · điền · xuất FILE (BI/report · data · docs-only · design), không phát triển app; không có luật UI. Luật · hiến pháp ·
cấu trúc · quy trình nằm trong `docs/agent/`, mỗi luật và mỗi slot một folder; file này chỉ chỉ đường.

## Vào việc
1. **Đọc trước lần ghi đầu tiên của phiên, và đọc lại sau mỗi lần nén ngữ cảnh** — tầng Basic không có gì tự chèn luật vào
   phiên:
   - mọi file luật `docs/agent/01_LAW/_Rule/*/Rule_*/Rule_*.md` (bản tiếng Anh; bỏ qua `.vi.md`) — `Keys` là luật phán đoán,
     `Gate` phần lớn không có máy chặn ở tầng này;
   - `docs/agent/04_TODO.md` và mọi `docs/agent/01_LAW/_Cons/*/*/Cons.md` đã viết.
2. **Lưới chặn của tầng Basic** — chạy trên Windows trần, không cần Node, Git hay zemory:
   - quyền gốc của host trong `.claude/settings.json` (`permissions.ask` · `deny`): `git push` hỏi · force-push chặn · xoá đệ
     quy, `Remove-Item`, `git reset --hard`, `git clean` hỏi;
   - `.claude/hooks/guard.ps1` (Windows PowerShell 5.1): ghi file ra ngoài project ⇒ host hỏi người dùng
     (`Rule_Gate_44_RepoScope`) · ghi giá trị bí mật vào file code git theo dõi ⇒ chặn (`Rule_Gate_21_WhatEntersGit`).
   - Lưới chỉ đỡ hụt, chữ của luật mới quyết (`Rule_Gate_61_HookSafetyNet`). Dòng quyền là của repo: thêm · bớt · đổi
     `ask` ↔ `deny` được. Sửa `.claude/settings.json` xong ⇒ mở lại phiên để host nạp lại.
3. **Lệnh `zemory` trong luật và skill** (`conform` · `validate` · `memory search` · `changelog search` · `plan search` ·
   `tidy` · `sync` …) chỉ chạy ở tầng Memory. Ở tầng Basic, bước cần lệnh đó ⇒ bỏ qua và ghi rõ trong câu trả lời đã bỏ bước
   nào; đo thay bằng đọc file trực tiếp. Kiểm cấu trúc thay cho `zemory conform`:
   `python .claude/skills/harness-structure/scripts/check_structure.py`.
4. **Dựng repo lần đầu:**
   - viết hiến pháp: mỗi khung trong `docs/agent/01_LAW/_Cons/` có `Cons.md` mẫu; viết lại cho sản phẩm này
     (`status: written`) hoặc ghi `status: n/a` kèm lý do;
   - liệt kê một lần mọi luật `docs/agent/01_LAW/_Rule/Rule_*/` (tên đầy đủ) và hỏi giữ · sửa · bỏ. Bỏ một luật = thêm
     `retired: true` vào đầu file luật, giữ folder và số (`Rule_Gate_10_DestructiveOps`). Chưa trả lời ⇒ giữ mặc định.
5. **Tra khi cần, không đọc hết:** cấu trúc `docs/agent/02_STRUCTURE/` (`INDEX.md`: mục lục slot do máy sinh lúc sync, không sửa tay; slot ở `_Slot/`) ·
   thiết kế `docs/plan/` · lịch sử `docs/agent/05_CHANGES.md` và `docs/archive/`. Không thấy một việc trong
   `04_TODO`/`05_CHANGES` không có nghĩa là chưa từng có — tra archive trước khi kết luận.
6. Luật chung (`01_LAW/_Rule/`) là sàn cho mọi repo; hiến pháp (`01_LAW/_Cons/`) của repo chỉ siết thêm, không nới.
7. **Nâng lên tầng Memory** (Global Memory + guard đầy đủ, luật tự chèn vào phiên): cài zemory bằng một lệnh PowerShell
   `irm https://raw.githubusercontent.com/ZyroFrost/Zemory/main/backend/scripts/install.ps1 | iex` (đặt `$env:ZEMORY_DIR` trước), rồi `zemory init --kit 02` hoặc `zemory init --kit 03`. Cây `docs/agent/`
   giữ nguyên.

## Mở khi trúng trigger — chưa trúng thì không mở
Mở một skill = đọc nguyên file đó. Host tự nạp skill theo `description`; bảng này là đường dự phòng.

| Mở khi | Đọc |
|---|---|
| tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch | `docs/agent/02_STRUCTURE/INDEX.md` + slot liên quan |
| hỏi repo có quy trình gì · thêm/bớt skill | `docs/agent/03_SKILLS/INDEX.md` |
| dựng · sửa báo cáo, dashboard, measure, visual | `.claude/skills/pbi-base/SKILL.md` |
| cần ĐỌC `.xlsx .xls .docx .pptx .pdf` | `.claude/skills/doc-read-office/SKILL.md` |
| cần SỬA / TẠO file Word `.docx` | `.claude/skills/doc-write-docx/SKILL.md` |
| cần VIẾT văn bản đưa người đọc (báo cáo · email · content · tài liệu giao đi) | `.claude/skills/doc-write-style/SKILL.md` |
| lời gọi "audit toàn diện" / "soi hết" | `.claude/skills/harness-audit/SKILL.md` |
| kiểm độ bám chuẩn | `.claude/skills/harness-conform/SKILL.md` |
| yêu cầu chưa đủ rõ để làm đúng | `.claude/skills/harness-grill/SKILL.md` |
| `zemory validate` báo plan vượt trần · "gọt plan" | `.claude/skills/harness-plan-trim/SKILL.md` |
| repo lệch chuẩn, cần nắn lại | `.claude/skills/harness-reconcile/SKILL.md` |
| "note lại" · "ghi sổ" · "chốt phiên" · sắp đổi session | `.claude/skills/harness-session-close/SKILL.md` |
| cần đặt · tạo · dời file · hỏi "để ở đâu" | `.claude/skills/harness-structure/SKILL.md` |
| sắp gọi một việc là XONG · thêm lớp lưu/chỉ mục/bí mật mới · bàn giao sang máy khác | `.claude/skills/harness-sync-path/SKILL.md` |
| điền số vào template → xuất deliverable | `.claude/skills/task-fill/SKILL.md` |
| kéo dữ liệu từ nguồn về | `.claude/skills/task-pull/SKILL.md` |
| đẩy deliverable lên đích (BI · Drive · SharePoint) | `.claude/skills/task-upload/SKILL.md` |
| đổi tên repo · dời repo · chuyển thư mục repo sang chỗ khác · zemory project move | `.claude/skills/harness-repo-move/SKILL.md` |
