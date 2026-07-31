<!-- zemory template · SỔ ĐĂNG KÝ skill (bản hệ APP) — KHÔNG chứa playbook: mỗi quy trình sống
     trọn trong `.claude/skills/<tên>/SKILL.md`. Ở đây chỉ 1 dòng mỗi skill + luật dùng.
     Bảng TRIGGER ("mở lúc nào") ở `AGENTS.md` — KHÔNG chép lại. File này có TRẦN 60 dòng,
     gate `bootstrap-manifest.test.mjs` canh: phình lên là playbook đang bò về đây. -->
# <PROJECT> — Sổ đăng ký skill

> Mở khi: cần biết **project có sẵn quy trình gì**, hoặc thêm/bớt một skill.
> Cần biết **lúc nào mở skill nào** → bảng trigger trong `AGENTS.md`.
> File này **KHÔNG** nằm trong bộ đọc mỗi phiên.

## 1. Luật dùng skill

- **Skill là THAM KHẢO để khuyến nghị, KHÔNG auto-apply.** Đọc skill → rút khuyến nghị (✅ nên theo ·
  ⚠ đang KẸT / anti-pattern · ◻ nên chuẩn hoá) → **TRÌNH user**; user chốt mới làm.
- **Mở một skill = đọc NGUYÊN file đó**, không đọc lướt. Thà mở thừa còn hơn làm sai.
- **Skill KHÔNG chứa luật.** Luật chung → `02_RULES`; bất biến riêng của project → `01_CONSTITUTION`;
  chuẩn cấu trúc → `03_STRUCTURE`. Skill chỉ mô tả **cách làm**, dẫn chiếu luật khi cần.
- **Skill dài / có tài nguyên → tách file, KHÔNG phình `SKILL.md`**: `reference/*.md` và `scripts/*`
  đặt cạnh nó, thân `SKILL.md` chỉ trỏ tới. Trần **120 dòng** mỗi `SKILL.md`.

## 2. Danh mục — mỗi skill một việc

| Skill | Làm gì |
|---|---|
| `grill/` | làm rõ yêu cầu chưa đủ rõ TRƯỚC khi bắt tay |
| `session-close/` | chốt phiên: định tuyến mọi thứ về đúng file, rồi tự dọn hai file sổ |
| `reconcile/` | nắn repo đã lệch về chuẩn — **đề xuất**, không tự dời |
| `conform/` | chấm độ bám chuẩn (máy chấm, agent phán) |
| `audit/` | soi toàn diện trước mốc lớn — verify từng phát hiện rồi mới ghi |
| `read-office/` | đọc `.xlsx .xls .docx .pptx .pdf` rẻ nhất có thể |
| `write-docx/` | sửa/tạo `.docx` mà không phá bảng · ảnh · mục lục · style |

## 3. Skill NGOÀI — vendor, KHÔNG chép nội dung

- **Skill repo của người khác** → vendor **nguyên bản** vào `external/skills/<tên-repo>/` (giữ tên +
  LICENSE, KHÔNG sửa nội dung người ta), ở đây chỉ thêm **một dòng index**; agent đọc thẳng bản gốc.
- **Tool ngoài** (package public) → cài như dependency, **gọi qua CLI**, KHÔNG dán source vào repo.
  Đang dùng: `markitdown` (Microsoft · MIT) — `pip install "markitdown[xlsx,xls,docx,pptx,pdf]"`,
  phục vụ skill `read-office/`.

| Vendor / tool | Dùng khi | Đường dẫn / cách cài | License |
|---|---|---|---|
| *(chưa có — thêm khi vendor cái đầu tiên)* | | | |

## 4. Thêm một skill

1. Tạo `.claude/skills/<tên-tiếng-anh>/SKILL.md` — frontmatter `name` + `description` (nói cả **làm gì**
   lẫn **khi nào dùng**, kèm cụm tiếng Việt user hay gõ: đó là thứ DUY NHẤT quyết định skill có được
   gọi ra hay không).
2. **Trình trước khi ghi**: nêu tên + một dòng lý do, user gật mới thêm.
3. Đăng ký ở **HAI chỗ**, thiếu một là skill mồ côi: một dòng vào §2 của file này, và một dòng vào
   bảng trigger trong `AGENTS.md`.
