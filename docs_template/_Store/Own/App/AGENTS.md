# <PROJECT>

Repo này dùng harness của zemory. Luật · cấu trúc · quy trình nằm trong `docs/agent/`, mỗi luật và mỗi slot một folder;
file này chỉ chỉ đường.

## Vào việc
1. **Lõi được chèn sẵn đầu phiên** — các luật phán đoán (không có chốt máy) và Mục đích của repo. Luật còn lại có chốt
   máy: vi phạm thì bị chặn, câu chặn mang nguyên văn luật.
2. **Đọc `docs/agent/05_TODO.md`** trước khi làm.
3. **Tra khi cần, không đọc hết:** luật `docs/agent/02_RULES/<số>_<tên>/RULE.md` · hiến pháp `docs/agent/01_CONSTITUTION/` ·
   slot `docs/agent/03_STRUCTURE/` (tra `INDEX.md`: thứ gì nằm đâu) · lịch sử `zemory changelog search` · thiết kế
   `zemory plan search "<vùng>"`.
4. Hiến pháp (`01_CONSTITUTION/`) đứng trên luật làm việc (`02_RULES/`).

## Mở khi trúng trigger
| Mở khi | Đọc |
|---|---|
| tạo · đổi tên · dời folder · thêm slot | `docs/agent/03_STRUCTURE/INDEX.md` + slot liên quan |
| hỏi repo có quy trình gì · thêm/bớt skill | `docs/agent/04_SKILLS.md` |
| yêu cầu chưa đủ rõ để làm đúng | `.claude/skills/grill/SKILL.md` |
