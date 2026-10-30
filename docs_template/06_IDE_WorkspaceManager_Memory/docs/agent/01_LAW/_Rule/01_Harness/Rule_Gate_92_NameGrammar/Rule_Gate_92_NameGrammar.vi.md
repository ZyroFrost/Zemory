---
version: 2
lang: vi
---
# Rule_Gate_92_NameGrammar — Every name on HS follows a declared pattern

## Luật là gì
Mọi thứ mang tên trên HS theo một khuôn trong bảng dưới: kệ · lớp · chương · phần · folder và file trong phần · bộ · trường `name:`.
Tên chưa có khuôn thì không tự đặt: người giao việc chốt khuôn trước. Bảng là nguồn duy nhất; máy đọc cùng bảng đó từ
`backend/src/docs/harness-names.ts`, hai bên khớp nhau.

## Khi nào áp
- Tạo, đổi tên hay dời một phần, hoặc một folder hay file trong phần.
- Thêm một kệ, một lớp, một chương, một họ skill hay một bộ.
- Viết trường `name:` của một phần.

## Phải làm gì
1. Tra bảng. Thứ đó có khuôn ⇒ đặt tên theo khuôn.
2. Không khuôn nào khớp ⇒ dừng, đề xuất tên dựng trên khuôn gần nhất, hỏi người giao việc chốt. Chốt xong ⇒ khuôn được thêm vào
   bảng này và vào `harness-names.ts` trong cùng một lượt sửa.
3. Mọi tên do mình đặt viết tiếng Anh ASCII (`Rule_Gate_29_CodeLanguage`). Tên do công cụ hay hệ điều hành ép giữ đúng như công cụ
   viết.

### Bảng khuôn
| Thứ | Khuôn |
|---|---|
| kệ | `NN_<CHỮ HOA>`: `01_LAW` · `02_STRUCTURE` · `03_SKILLS` |
| lớp trong kệ | `_<Từ>`: `_Rule` · `_Cons` · `_Slot` · `_Host` |
| file hay folder ở gốc HS | `README.md` · `source.json` · `04_TODO.md` · `05_CHANGES.md` · `Archive/` — không gì khác |
| chương của luật · của khung hiến pháp | `NN_<Tên>`: `01_Harness`…`05_Domain` · `01_Scope`…`04_Security` |
| luật · khung hiến pháp | `Rule_<Gate\|Keys\|Core>_NN_<Tên>` · `Cons_<Gate\|Keys\|Core>_NN_<Tên>`; điều riêng của repo đánh số từ 101 |
| cấu trúc | `Struc_<Repo\|Region\|Disk>_<Tên>` |
| slot | `<Vùng>_NNN_<Tên>`; vùng = đoạn đầu path của slot, file ở gốc = `Root` |
| skill | `Skill_<Họ>_<Tên>`; họ = loại sản phẩm skill làm ra: `Doc` · `Harness` · `Task` · `PBI` · `App` · `Db` · `Frame` · `Own` |
| host | `_Host/<GUI\|IDE\|CLI>` |
| bộ | `<NN>_<Host>_<Cấu trúc>_<Tầng>` |
| `<Tên>` trong tên phần | PascalCase ASCII; được mở đầu bằng số của thứ nó đặt tên (`01Raw`) |
| trường `name:` | kebab-case; slot của một file = đúng tên file đó (`.env`) |
| tên skill trên host | kebab-case do Agent Skills ép (`doc-write-docx`), sinh từ tên phần |
| file của phần | `<Phần>.md` · `<Phần>.vi.md` · `gate.json` · `hook.cjs` · `Cons.md` (khung hiến pháp) |
| folder trong phần | số nhiều khi chứa nhiều thứ cùng loại (`scripts/` · `references/` · `tests/`); số ít cho một khái niệm hay một tầng (`seed/`) |
| file hay folder khác trong phần | chữ thường, tiếng Anh ASCII, nhiều từ nối `_` (`edit_traps.md` · `lang_scan.mjs`) |
| tên do công cụ hay hệ điều hành ép | giữ như công cụ viết (`node_modules` · `Documents` · `package.json`) |

## Ví dụ
- Tình huống: một skill cần folder chứa các file đáp án mẫu và một script phụ kiểm ngắt trang.
- ✗ Sai: `reference/page-break-check.py` — folder chứa nhiều file mà để số ít, các từ nối bằng `-`.
- ✓ Đúng: `references/` và `scripts/page_break_check.py`.
- Tình huống: một loại phần mới, "playbook", chưa có khuôn.
- ✗ Sai: tạo `Playbook_Sales_Onboard` rồi làm tiếp.
- ✓ Đúng: dừng; đề xuất một skill họ `Task` đặt tên theo việc onboarding (khuôn gần nhất) hoặc một khuôn mới, chờ chốt.

## Máy kiểm
- Bài thử HS: mọi tên phần đọc được theo `harness-names.ts`; tên không đọc được ⇒ đỏ.
- Bài thử HS: mọi folder và file trong phần khớp một dòng của bảng; tên không khớp ⇒ đỏ.
- Bảng ở đây và `harness-names.ts` liệt kê cùng một bộ khuôn (một nguồn, hai lăng kính).

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_29_CodeLanguage` — names are ASCII English · tên viết tiếng Anh ASCII
- Related · Liên quan: `Rule_Gate_85_ProposeChecked` — a new part names what it was weighed against · phần mới nêu thứ đã đối chiếu
- Related · Liên quan: `Root_136_Principles` — the naming principles inside a repo · nguyên tắc đặt tên trong repo
- Implements · Thi hành: `Skill_Harness_Structure` — how to propose a name · cách đề xuất tên
