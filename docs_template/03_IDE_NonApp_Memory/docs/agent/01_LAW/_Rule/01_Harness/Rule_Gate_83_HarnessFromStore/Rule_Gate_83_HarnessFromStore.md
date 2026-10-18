---
id: Rule_83
name: harness-from-store
version: 3
kind: action
code: 01_Harness
from: _Store/01_LAW/_Rule/01_Harness/Rule_Gate_83_HarnessFromStore @v3 #17112c0de79b
---
# Rule_Gate_83_HarnessFromStore — A repo uses the harness, it does not own it

## What
The harness of a repo — its laws, constitution frames, structure slots and skills — is made in the harness store (HS) of zemory
and copied into the repo. The repo uses its copy; it never changes it. The repo only fills in the blanks a frame leaves for it.

## When
- An agent working in a repo wants to change a file under `docs/agent/01_LAW`, `docs/agent/02_STRUCTURE`, `docs/agent/03_SKILLS`
  or `.claude/skills`.
- A repo needs a law, slot or skill that is missing, wrong, or different for it.

## Do
1. Daily work reads the repo's own copy of the harness; HS is read only when a change is to be proposed.
2. Fill what a frame leaves blank, in the repo: the `Cons.md` of a constitution frame, a repo skill built on the skill frame
   (`Skill_Own_<Name>`), the values of the marker keys. Never add, remove or rename a section of a frame.
3. Need a change? Find the part on HS first (`Rule_Gate_85_ProposeChecked`), then propose it to the requester:
   a. the part is wrong or missing for every repo that uses it ⇒ propose fixing the shared part on HS; zemory runs
      `zemory impact <part>`, the requester approves, zemory changes HS and syncs it down to every repo;
   b. only this repo needs it different ⇒ propose a part of its own (its own law, constitution article or structure part, built
      from HS slots); zemory creates it once the requester approves.
4. A frame that lacks a section the repo needs ⇒ propose adding the section to the frame on HS (as in step 3).
5. Retiring a part keeps its number and marks it retired; sync carries that state to every repo.
6. The ledgers (`04_TODO.md`, `05_CHANGES.md`) are the repo's memory, not harness: the repo writes them, under
   `Rule_Gate_38_TodoDoor` for new TODO items.

## Example
- Situation: the OPS session finds a better step for the skill that builds a report.
- ✗ Wrong: edit `.claude/skills/pbi-mix/SKILL.md` in the OPS repo. The other departments never get the step, and the next sync
  meets a copy that differs from HS.
- ✓ Right: check on HS whether every department building that report needs the step. Yes ⇒ send the proposal to the zemory
  session; zemory runs `zemory impact Skill_PBI_Mix`, adds the step to the skill on HS once the requester approves, and syncs it to
  every repo.

## Check
- The repo's guard blocks every Write / Edit under the four harness folders, no flag; a fill of a frame passes when the frame's
  sections stay as they are. The zemory repo, which holds HS, is not blocked.
- conform `harness-edited-here`: a copy that differs from what was assembled is red.
- `zemory impact <part>` lists every repo carrying the part and its state (`current` · `behind` · `edited` · `absent`); exit 1
  while a copy is edited in a repo.

## Luật là gì
Harness của một repo — luật, khung hiến pháp, slot cấu trúc, skill — được làm trên harness store (HS) của zemory rồi chép về
repo. Repo dùng bản chép; không bao giờ sửa nó. Repo chỉ điền vào chỗ trống mà khung để lại cho nó.

## Khi nào áp
- Agent làm việc trong repo muốn sửa một file dưới `docs/agent/01_LAW`, `docs/agent/02_STRUCTURE`, `docs/agent/03_SKILLS` hoặc
  `.claude/skills`.
- Repo cần một luật, slot hay skill đang thiếu, đang sai, hoặc cần khác đi cho riêng nó.

## Phải làm gì
1. Việc hằng ngày đọc bản harness của chính repo; chỉ đọc HS khi sắp đề xuất thay đổi.
2. Điền chỗ khung để trống, ngay trong repo: `Cons.md` của khung hiến pháp, skill riêng dựng trên khung skill
   (`Skill_Own_<Tên>`), giá trị các khoá của marker. Không bao giờ thêm, bớt hay đổi tên mục của khung.
3. Cần thay đổi? Dò phần đó trên HS trước (`Rule_Gate_85_ProposeChecked`), rồi đề xuất cho người dùng:
   a. phần đó sai hoặc thiếu với mọi repo đang dùng nó ⇒ đề xuất sửa phần chung trên HS; zemory chạy `zemory impact <phần>`,
      người dùng duyệt, zemory sửa HS rồi sync xuống mọi repo;
   b. chỉ repo này cần khác ⇒ đề xuất một phần riêng (luật riêng, điều hiến pháp riêng, phần cấu trúc riêng ráp từ slot của HS);
      zemory tạo sau khi người dùng duyệt.
4. Khung thiếu mục repo cần ⇒ đề xuất bổ sung mục đó vào khung trên HS (như bước 3).
5. Bãi bỏ một phần thì giữ số và đánh dấu bãi bỏ; sync đưa trạng thái đó xuống mọi repo.
6. Sổ (`04_TODO.md`, `05_CHANGES.md`) là trí nhớ của repo, không phải harness: repo tự ghi, mục TODO mới theo
   `Rule_Gate_38_TodoDoor`.

## Ví dụ
- Tình huống: phiên của OPS tìm ra một bước hay hơn cho skill dựng báo cáo.
- ✗ Sai: sửa `.claude/skills/pbi-mix/SKILL.md` trong repo OPS. Các phòng khác không bao giờ có bước đó, và lần sync sau gặp một
  bản chép lệch với HS.
- ✓ Đúng: dò trên HS xem mọi phòng dựng loại báo cáo đó có cần bước này không. Có ⇒ gửi đề xuất cho phiên zemory; zemory chạy
  `zemory impact Skill_PBI_Mix`, thêm bước vào skill trên HS sau khi người dùng duyệt, rồi sync xuống mọi repo.

## Máy kiểm
- Guard của repo chặn mọi Write / Edit dưới bốn thư mục harness, không có cờ vượt; lần điền khung được qua khi các mục của khung
  giữ nguyên. Repo zemory, nơi giữ HS, không bị chặn.
- conform `harness-edited-here`: bản chép khác bản lúc ráp thì đỏ.
- `zemory impact <phần>` liệt kê mọi repo đang mang phần đó và trạng thái (`current` · `behind` · `edited` · `absent`); thoát 1
  khi còn repo sửa bản chép tại chỗ.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_Reshape` — applying HS to a repo · áp HS xuống một repo
- Related · Liên quan: `Rule_Gate_85_ProposeChecked` — searching HS before proposing · dò HS trước khi đề xuất
- Related · Liên quan: `Rule_Gate_79_HarnessEdit` — changing HS itself needs the requester's approval · sửa chính HS cần người dùng cho phép
