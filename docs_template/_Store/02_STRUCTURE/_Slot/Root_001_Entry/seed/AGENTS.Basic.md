# <PROJECT>

> ⛔ **Mở repo này để LÀM VIỆC, hay chỉ để THAM KHẢO?** Repo đang làm không phải repo này ⇒ CHỈ ĐỌC: không sửa / tạo /
> xoá file ở đây, không chạy lệnh ghi với cwd ở đây. Repo này có thể đang có phiên agent khác làm việc. Muốn tham khảo
> ⇒ đọc rồi áp vào repo của mình. Thật sự cần ghi vào đây ⇒ hỏi trước.

Repo này dùng harness của zemory ở tầng **Basic** (không cài zemory), hệ **<STRUC_LABEL>**<STRUC_INTRO>. Luật · hiến pháp ·
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
   - Lưới chỉ đỡ hụt, chữ của luật mới quyết (`Rule_Keys_61_HookSafetyNet`). Dòng quyền là của repo: thêm · bớt · đổi
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
5. **Tra khi cần, không đọc hết:** cấu trúc `docs/agent/02_STRUCTURE/` (`INDEX.md`: <STRUC_INDEX_ROLE>; slot ở `_Slot/`) ·
   thiết kế `docs/plan/` · lịch sử `docs/agent/05_CHANGES.md` và `docs/archive/`. Không thấy một việc trong
   `04_TODO`/`05_CHANGES` không có nghĩa là chưa từng có — tra archive trước khi kết luận.
6. Luật chung (`01_LAW/_Rule/`) là sàn cho mọi repo; hiến pháp (`01_LAW/_Cons/`) của repo chỉ siết thêm, không nới.
7. **Nâng lên tầng Memory** (Global Memory + guard đầy đủ, luật tự chèn vào phiên): cài zemory bằng một lệnh PowerShell
   `irm <ZEMORY_RAW>/backend/scripts/install.ps1 | iex` (đặt `$env:ZEMORY_DIR` trước), rồi <STRUC_KITS>. Cây `docs/agent/`
   giữ nguyên.

## Mở khi trúng trigger — chưa trúng thì không mở
Mở một skill = đọc nguyên file đó. Host tự nạp skill theo `description`; bảng này là đường dự phòng.

| Mở khi | Đọc |
|---|---|
| <STRUC_TRIGGER> | `docs/agent/02_STRUCTURE/INDEX.md` + slot liên quan |
| hỏi repo có quy trình gì · thêm/bớt skill | `docs/agent/03_SKILLS/INDEX.md` |
<SKILL_TRIGGERS>
