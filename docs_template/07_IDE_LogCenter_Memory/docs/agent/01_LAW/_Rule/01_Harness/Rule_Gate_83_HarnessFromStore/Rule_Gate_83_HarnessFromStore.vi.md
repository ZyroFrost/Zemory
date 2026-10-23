---
version: 9
lang: vi
---
# Rule_Gate_83_HarnessFromStore — A repo uses the harness, it does not own it

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
   b. chỉ repo này cần khác ⇒ một phần riêng: điều hiến pháp riêng nằm ở `01_LAW/_Cons/Cons_<Gate|Keys|Core>_1NN_<Tên>/`
      (số từ 101, không có dòng `from:`); repo tự ghi sau khi người dùng duyệt điều đó trong phiên (cờ một lần `.allow-docs-write`).
      Bản chép của phần chung không bao giờ sửa ở đây.
4. Khung thiếu mục repo cần ⇒ đề xuất bổ sung mục đó vào khung trên HS (như bước 3).
5. Bãi bỏ một phần thì giữ số và đánh dấu bãi bỏ; sync đưa trạng thái đó xuống mọi repo.
6. Sổ (`04_TODO.md`, `05_CHANGES.md`) là trí nhớ của repo, không phải harness: repo tự ghi, mục TODO mới theo
   `Rule_Gate_38_TodoDoor`.

## Ví dụ
- Tình huống: phiên của OPS tìm ra một bước hay hơn cho skill dựng báo cáo.
- ✗ Sai: sửa `.claude/skills/pbi-white/SKILL.md` trong repo OPS. Các phòng khác không bao giờ có bước đó, và lần sync sau gặp một
  bản chép lệch với HS.
- ✓ Đúng: dò trên HS xem mọi phòng dựng loại báo cáo đó có cần bước này không. Có ⇒ gửi đề xuất cho phiên zemory; zemory chạy
  `zemory impact Skill_PBI_White`, thêm bước vào skill trên HS sau khi người dùng duyệt, rồi sync xuống mọi repo.

## Máy kiểm
- Guard của repo chặn mọi Write / Edit dưới bốn thư mục harness, không có cờ vượt; lần điền khung được qua khi các mục của khung
  giữ nguyên; điều riêng của repo (`Cons_*_1NN`, không `from:`) qua khi có cờ một lần `.allow-docs-write` của người dùng. Repo zemory,
  nơi giữ HS, không bị chặn.
- conform `harness-edited-here`: bản chép khác bản lúc ráp thì đỏ.
- `zemory impact <phần>` liệt kê mọi repo đang mang phần đó và trạng thái (`current` · `behind` · `edited` · `absent`); thoát 1
  khi còn repo sửa bản chép tại chỗ.
