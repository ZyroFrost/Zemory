<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — Sổ đăng ký skill

> Mở khi: cần biết **repo có sẵn quy trình gì**, hoặc thêm/bớt một skill.
> Cần biết **lúc nào mở skill nào** → bảng trigger trong `AGENTS.md`.
> File này **KHÔNG** nằm trong bộ đọc mỗi phiên, và **có TRẦN 60 dòng** — phình lên nghĩa là
> playbook đang bò ngược về đây (playbook sống ở `.claude/skills/<tên>/SKILL.md`).

## 1. Luật dùng skill

- **Skill là THAM KHẢO để khuyến nghị, KHÔNG auto-apply.** Đọc skill → rút khuyến nghị (✅ nên theo ·
  ⚠ đang KẸT / anti-pattern · ◻ nên chuẩn hoá) → **TRÌNH user**; user chốt mới làm. Đổi UI/UX vẫn theo
  `02_RULES §Hành xử` (phải duyệt trước). User có ý tưởng UI mới → check skill để **gợi ý lại** trước
  khi build.
- **Mở một skill = đọc NGUYÊN file đó**, không đọc lướt. Thà mở thừa còn hơn làm sai.
- **Skill KHÔNG chứa luật.** Luật chung → `02_RULES`; bất biến kiến trúc → `01_CONSTITUTION`; chuẩn
  cấu trúc → `03_STRUCTURE`. Skill chỉ mô tả **cách làm**, dẫn chiếu luật khi cần.
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
| `sync-path/` | khai + ĐO đường sang máy thứ hai của mọi thứ vừa dựng (không có kênh = chưa xong) |
| `read-office/` | đọc `.xlsx .xls .docx .pptx .pdf` rẻ nhất có thể |
| `write-docx/` | sửa/tạo `.docx` mà không phá bảng · ảnh · mục lục · style |
| `write-style/` | bộ luật văn phong cho văn bản ĐƯA NGƯỜI ĐỌC — chưng cất từ Wikipedia:Signs of AI writing |

## 3. Skill NGOÀI — vendor, KHÔNG chép nội dung (HP điều 1/2)

- **Skill repo của người khác** → vendor **nguyên bản** vào `external/skills/<tên-repo>/` (giữ tên +
  LICENSE, KHÔNG sửa nội dung người ta), ở đây chỉ **một dòng index**; agent đọc thẳng bản gốc. Kho nằm
  **một chỗ ở repo zemory**, KHÔNG copy sang từng project. **Adapter thì KHÔNG viết prose ở đây** — chỗ
  adapt hiện ra thật là `03_STRUCTURE` (từ điển slot); agent đọc skill gốc + đọc 03 rồi tự khớp.
- **Tool ngoài** (package public) → cài như dependency, **gọi qua CLI**, KHÔNG dán source vào repo.

| Vendor / tool | Dùng khi | Đường dẫn / cách cài | License |
|---|---|---|---|
| `ui-ux-pro-max` (skill repo) | thiết kế UI/UX: 84 UI style · 192 palette · 74 cặp font · 98 UX guideline · 25 chart · 22 stack | `external/skills/ui-ux-pro-max-skill/` (entry `skill.json`) | MIT |
| `markitdown` (Microsoft · tool) | đọc nội dung `.xlsx .xls .docx .pptx .pdf` — phục vụ skill `read-office/` | `pip install "markitdown[xlsx,xls,docx,pptx,pdf]"` | MIT |

## 4. Thêm một skill

1. Tạo `.claude/skills/<tên-tiếng-anh>/SKILL.md` — frontmatter `name` + `description` (nói cả **làm gì**
   lẫn **khi nào dùng**, kèm cụm tiếng Việt user hay gõ: đó là thứ DUY NHẤT quyết định skill có được gọi
   ra hay không).
2. **Trình trước khi ghi**: nêu tên + một dòng lý do, user gật mới thêm.
3. Đăng ký ở **HAI chỗ**, thiếu một là skill mồ côi: một dòng vào §2 của file này, và một dòng vào bảng
   trigger trong `AGENTS.md`. `zemory conform` canh cả hai chiều.
