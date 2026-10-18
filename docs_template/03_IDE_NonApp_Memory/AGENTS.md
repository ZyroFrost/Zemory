# <PROJECT>

> ⛔ **Mở repo này để LÀM VIỆC, hay chỉ để THAM KHẢO?** Repo đang làm không phải repo này ⇒ CHỈ ĐỌC: không sửa / tạo /
> xoá file ở đây; không chạy lệnh `zemory` với cwd ở đây (lệnh ghi như `init` · `sync` · `reindex` · `archive` ·
> `memory scan` · `hook` ghi vào repo này và kho nhớ). Repo này có thể đang có phiên agent khác làm việc. Muốn tham khảo
> ⇒ đọc rồi áp vào repo của mình. Thật sự cần ghi vào đây ⇒ hỏi trước.

Repo này dùng harness của zemory, hệ **NON-APP**: sản phẩm / tài sản — agent đọc · dò · kéo · điền · xuất FILE (BI/report · data · docs-only · design), không phát triển app; không có luật UI. Luật · hiến pháp · cấu trúc · quy trình nằm trong
`docs/agent/`, mỗi luật và mỗi slot một folder; file này chỉ chỉ đường.

## Vào việc
1. **Chưa có `docs/.harness.json`?** ⇒ hỏi trước: dự án là APP hay NON-APP (không tự đoán; mở một `.pbix` ra dò, đổ số vào template là NON-APP). NON-APP ⇒
   `zemory init --kit 02` hoặc `zemory init --kit 03`;
   rồi `zemory doctor` xanh. Thiếu lệnh `zemory` ⇒ cài bằng một lệnh PowerShell:
   `irm https://raw.githubusercontent.com/ZyroFrost/Zemory/main/backend/scripts/install.ps1 | iex` (đặt `$env:ZEMORY_DIR` trước — hỏi nếu chưa rõ thư mục cài; kho
   nhớ không nằm trong thư mục cài). Tab Code của Claude Desktop không đọc PowerShell profile ⇒ cài xong mở lại app.
   - Init xong ⇒ viết hiến pháp: mỗi khung trong `docs/agent/01_LAW/_Cons/` có `Cons.md` mẫu; viết lại cho sản phẩm này
     (`status: written`) hoặc ghi `status: n/a` kèm lý do. `zemory conform` đỏ tới khi viết đủ.
   - Rồi liệt kê một lần mọi luật `docs/agent/01_LAW/_Rule/Rule_*/` (tên đầy đủ) và hỏi giữ · sửa · bỏ. Bỏ một luật =
     thêm `retired: true` vào đầu file luật, giữ folder và số (`Rule_Gate_10_DestructiveOps`). Chưa trả lời ⇒ giữ mặc định.
2. **Luật tự đến, không phải đọc trước** — mỗi loại một đường:
   - `Core` và `Keys` (luật phán đoán) cùng hiến pháp của repo được chèn nguyên văn lúc mở phiên và sau mỗi lần nén;
   - `Keys` còn nhắc lại một dòng khi câu gõ trúng từ khoá của luật đó;
   - `Gate` chặn đúng lúc định làm sai — câu chặn mang tên đầy đủ và nguyên văn luật.
3. **Đọc `docs/agent/04_TODO.md`** và mọi `Cons.md` đã viết trước khi làm.
4. **Tra khi cần, không đọc hết:** luật `docs/agent/01_LAW/_Rule/` · hiến pháp `docs/agent/01_LAW/_Cons/` · cấu trúc
   `docs/agent/02_STRUCTURE/` (`INDEX.md`: mục lục slot do máy sinh lúc sync, không sửa tay; slot ở `_Slot/`) · lịch sử `zemory changelog search` (phủ cả
   `docs/archive/`) · thiết kế `zemory plan search "<vùng>"` trước khi đề xuất hay đổi thiết kế một vùng. Không thấy
   một việc trong `04_TODO`/`05_CHANGES` không có nghĩa là chưa từng có — tra archive trước khi kết luận.
5. Luật chung (`01_LAW/_Rule/`) là sàn cho mọi repo; hiến pháp (`01_LAW/_Cons/`) của repo chỉ siết thêm, không nới.

## Mở khi trúng trigger — chưa trúng thì không mở
Mở một skill = đọc nguyên file đó. Host tự nạp skill theo `description`; bảng này là đường dự phòng.

| Mở khi | Đọc |
|---|---|
| tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch | `docs/agent/02_STRUCTURE/INDEX.md` + slot liên quan |
| hỏi repo có quy trình gì · thêm/bớt skill | `docs/agent/03_SKILLS/INDEX.md` |
| tạo · đổi bảng, cột, khoá, view trong cơ sở dữ liệu | `.claude/skills/dev-db-design/SKILL.md` |
| dựng · sửa báo cáo, dashboard, measure, visual | `.claude/skills/pbi-base/SKILL.md` |
| cần ĐỌC `.xlsx .xls .docx .pptx .pdf` | `.claude/skills/doc-read-office/SKILL.md` |
| cần SỬA / TẠO file Word `.docx` | `.claude/skills/doc-write-docx/SKILL.md` |
| cần VIẾT văn bản đưa người đọc (báo cáo · email · content · tài liệu giao đi) | `.claude/skills/doc-write-style/SKILL.md` |
| lời gọi "audit toàn diện" / "soi hết" | `.claude/skills/harness-audit/SKILL.md` |
| kiểm độ bám chuẩn | `.claude/skills/harness-conform/SKILL.md` |
| yêu cầu chưa đủ rõ để làm đúng | `.claude/skills/harness-grill/SKILL.md` |
| `zemory validate` báo plan vượt trần · "gọt plan" | `.claude/skills/harness-plan-trim/SKILL.md` |
| repo lệch chuẩn, cần nắn lại | `.claude/skills/harness-reconcile/SKILL.md` |
| được duyệt thêm hoặc sửa luật, khung hiến pháp, chốt máy | `.claude/skills/harness-rule-gate/SKILL.md` |
| "note lại" · "ghi sổ" · "chốt phiên" · sắp đổi session | `.claude/skills/harness-session-close/SKILL.md` |
| sắp gọi một việc là XONG · thêm lớp lưu/chỉ mục/bí mật mới · bàn giao sang máy khác | `.claude/skills/harness-sync-path/SKILL.md` |
| "mở case" · "lưu thành task" · "đóng case" · "mở lại case" · "vụ này lưu ở đâu" | `.claude/skills/task-case/SKILL.md` |
| điền số vào template → xuất deliverable | `.claude/skills/task-fill/SKILL.md` |
| kéo dữ liệu từ nguồn về | `.claude/skills/task-pull/SKILL.md` |
| đẩy deliverable lên đích (BI · Drive · SharePoint) | `.claude/skills/task-upload/SKILL.md` |
| nắn repo lên bộ chuẩn · áp chuẩn · chuyển repo sang bộ · sync --standard | `.claude/skills/harness-reshape/SKILL.md` |
