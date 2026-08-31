<!-- zemory template · hệ NON-APP — bản Cowork. Sổ ĐĂNG KÝ skill, KHÔNG chứa playbook:
     mỗi quy trình sống trọn trong `.claude/skills/<tên>/SKILL.md`. Ở đây chỉ 1 dòng mỗi
     skill + luật dùng. Bảng TRIGGER ("mở lúc nào") ở `AGENTS.md` — không chép lại. -->
# <PROJECT> — Sổ đăng ký skill

> Mở khi: cần biết **dự án có sẵn quy trình gì**, hoặc thêm/bớt một skill.
> Cần biết **lúc nào mở skill nào** → bảng trigger trong `AGENTS.md`.

## 1. Luật dùng skill

- **Skill là THAM KHẢO để khuyến nghị, KHÔNG auto-apply.** Đọc skill → rút khuyến nghị (nên theo /
  đang kẹt / nên chuẩn hoá) → **TRÌNH user**; user chốt mới làm.
- **Mở một skill = đọc NGUYÊN file đó**, không đọc lướt. Thà mở thừa còn hơn làm sai.
- **Skill KHÔNG chứa luật.** Luật chung → `02_RULES`; bất biến riêng của dự án → `01_CONSTITUTION`.
  Skill chỉ mô tả **cách làm**, và dẫn chiếu luật khi cần.
- **Skill dài / có tài nguyên → tách file, KHÔNG phình `SKILL.md`**: đặt `reference/*.md` và
  `scripts/*` cạnh nó, thân `SKILL.md` chỉ trỏ tới. Đây là lý do `structure/` và `write-docx/` có
| `write-style/` | bộ luật văn phong cho văn bản ĐƯA NGƯỜI ĐỌC — chưng cất từ Wikipedia:Signs of AI writing |
  thư mục con.

## 2. Danh mục — mỗi skill một việc

| Skill | Làm gì |
|---|---|
| `structure/` | chuẩn thư mục: cây · bảng "cần gì → để đâu" · quy ước đặt tên · script kiểm |
| `grill/` | làm rõ yêu cầu chưa đủ rõ TRƯỚC khi bắt tay |
| `session-close/` | chốt phiên: định tuyến mọi thứ về đúng file, format changelog, tự dọn sổ |
| `reconcile/` | nắn thư mục đã lệch về chuẩn — **đề xuất**, không tự dời |
| `conform/` | chấm độ bám chuẩn (máy chấm, agent phán) |
| `audit/` | soi toàn diện trước mốc lớn — verify từng phát hiện rồi mới ghi |
| `pull/` | kéo dữ liệu từ nguồn về |
| `fill/` | điền số vào mẫu → xuất sản phẩm giao đi |
| `upload/` | đẩy sản phẩm lên đích (BI · Drive · SharePoint) |
| `read-office/` | đọc `.xlsx .xls .docx .pptx .pdf` rẻ nhất có thể |
| `write-docx/` | sửa/tạo `.docx` mà không phá bảng · ảnh · mục lục · style |

## 3. Thêm một skill

1. Tạo `.claude/skills/<tên-tiếng-anh>/SKILL.md` — frontmatter `name` + `description` (mô tả **khi
   nào dùng**, kèm trigger tiếng Việt, vì harness tự nạp theo `description`).
2. Thêm **một dòng** vào §2 và **một dòng** vào bảng trigger của `AGENTS.md`.
3. Có tài nguyên đi kèm → `reference/` · `scripts/` trong chính thư mục skill đó.
