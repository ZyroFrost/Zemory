<!-- zemory template · file chỉ đường DUY NHẤT ở root. THUẦN điều hướng + HỢP ĐỒNG NẠP.
     KHÔNG luật, KHÔNG nội dung harness (luật → docs/agent/, quy trình → .claude/skills/). -->
# <PROJECT>

> ⛔ **DỪNG — bạn mở thư mục này để LÀM VIỆC, hay chỉ để THAM KHẢO?**
> Chỉ ghé đọc → **CHỈ ĐỌC, KHÔNG GHI**. Thật sự cần ghi → **HỎI USER TRƯỚC**.
> Thư mục này có thể đang có phiên agent khác làm việc.

Dự án này dùng **zemory** — bộ chuẩn làm việc. Luật nằm trong `docs/agent/`, quy trình nằm trong `.claude/skills/`.

## Hợp đồng nạp — đọc gì, lúc nào

**LUÔN đọc, mọi phiên, đúng thứ tự:**

1. `docs/agent/01_CONSTITUTION.md` — bất biến riêng của dự án, **TỐI CAO**
2. `docs/agent/02_RULES.md` — luật làm việc
3. `docs/agent/05_TODO.md` — **CHỈ** các mục còn mở

**MỞ KHI TRÚNG TRIGGER — chưa trúng thì KHÔNG mở:**

| Mở khi | Đọc |
|---|---|
| cần đặt · tạo · dời file · hỏi "để ở đâu" | `.claude/skills/structure/SKILL.md` |
| cần **định nghĩa metric/cột**, hoặc vừa đổi cấu trúc thư mục | `docs/agent/03_STRUCTURE.md` |
| hỏi "dự án có sẵn quy trình gì" · thêm/bớt skill | `docs/agent/04_SKILLS.md` |
| yêu cầu chưa đủ rõ để làm đúng | `.claude/skills/grill/SKILL.md` |
| "ghi sổ" · "chốt phiên" · "note lại" · đổi session | `.claude/skills/session-close/SKILL.md` |
| cần đọc nội dung `.xlsx .xls .docx .pptx .pdf` | `.claude/skills/read-office/SKILL.md` |
| cần SỬA / TẠO file Word `.docx` (chữ · ảnh · bảng) | `.claude/skills/write-docx/SKILL.md` |
| kéo dữ liệu từ nguồn về | `.claude/skills/pull/SKILL.md` |
| điền số vào mẫu → xuất sản phẩm giao đi | `.claude/skills/fill/SKILL.md` |
| đẩy sản phẩm lên đích (BI · Drive · SharePoint) | `.claude/skills/upload/SKILL.md` |
| đặt · đổi · hỏi "dự án đang chạy lịch gì" | `tasks/SCHEDULE.md` (danh mục lịch) |
| thư mục lệch chuẩn, cần nắn lại | `.claude/skills/reconcile/SKILL.md` |
| kiểm độ bám chuẩn | `.claude/skills/conform/SKILL.md` |
| user nói "audit toàn diện" / "soi hết" | `.claude/skills/audit/SKILL.md` |

**KHÔNG đọc trừ khi được hỏi thẳng:**
`docs/agent/06_CHANGES.md` · `docs/agent/archive/` · `docs/plan/`

> ⚠ **Nhưng PHẢI tra `archive/` trước khi kết luận "chưa từng làm".** Hai file sổ bị cắt ngắn định kỳ
> (xem `session-close`), nên **không thấy một việc trong `05_TODO`/`06_CHANGES` KHÔNG có nghĩa là chưa
> từng có**. Kết luận "chưa làm" mà chưa mở `archive/` là kết luận trên một file đã bị cắt.

> **Mở một skill = đọc NGUYÊN file đó**, không đọc lướt.
> Chưa trúng trigger mà mở trước = đốt ngữ cảnh vô ích.
> Thà mở thừa một skill còn hơn làm sai — nghi ngờ thì mở.
>
> Chạy trong Claude Code: các skill trên được harness tự nạp theo `description`;
> bảng này là đường dự phòng khi cơ chế đó không có.
