---
id: Rule_38
aka: 02-38
name: todo-door
version: 12
kind: action
code: 01_Harness
---
# Rule_Gate_38_TodoDoor — The TODO ledger: the way in and the way out

## What
`04_TODO` holds only work that cannot be done right now. An agent never adds an item on its own: it asks first. A finished item
leaves the ledger in the same turn. This is the only law about the TODO ledger; other files point here.

## When
- An agent is about to add an item to `04_TODO`.
- An item in `04_TODO` is finished.

## Do
1. Work within reach ⇒ do it now and write `05_CHANGES`; do not park it in `04_TODO`.
2. Want a new item? Ask one question with the proposal; write it only once approved (then create the flag `.allow-todo`). A
   proposal never waits in the ledger.
3. An item is finished ⇒ in the same turn: measure it again (`Rule_Keys_11_VerifyClaims`), write `05_CHANGES`, remove it from
   `04_TODO` or mark it done for `zemory archive`.
4. Done marks the machine moves: `- [x]` · `- ✅` · `N. [x]` · a heading `## [x]` (the whole block moves when no `[ ]` / `[~]`
   is left inside). Another way of writing "done" is invisible to the machine.
5. `zemory archive` at session close is the last net, not the place to pile up finished items.
6. The block between `<!-- zemory:standard-todo:start` and `<!-- zemory:standard-todo:end -->` is written by `zemory sync` from
   `zemory conform`: what still keeps the repo off its standard. The machine rewrites it every run and removes it once the repo
   is clean. The agent never edits it: it fixes the repo, then runs `zemory sync`.

## Example
- Situation: the manager has just settled a new rule; writing it into the law file takes a few minutes.
- ✗ Wrong: add "put into the law later" to the TODO ledger and report done; the ledger grows and the rule has no effect.
- ✓ Right: do it now (with the approval `Rule_Gate_79_HarnessEdit` asks for), write the changelog; the ledger keeps only work
  that truly cannot be done in time.

## Check
- The guard blocks a new open item in `04_TODO` without the flag `.allow-todo`.

## Luật là gì
`04_TODO` chỉ chứa việc chưa làm liền được. Agent không bao giờ tự thêm mục: phải hỏi trước. Mục xong rời sổ ngay trong lượt.
Đây là luật duy nhất về sổ việc; file khác dẫn chiếu về đây.

## Khi nào áp
- Agent sắp thêm một mục vào `04_TODO`.
- Một mục trong `04_TODO` đã xong.

## Phải làm gì
1. Việc trong tầm tay ⇒ làm ngay và ghi `05_CHANGES`; không đậu vào `04_TODO`.
2. Muốn thêm mục mới? Hỏi một câu kèm đề xuất; chỉ ghi khi được chấp thuận (khi đó tạo cờ `.allow-todo`). Đề xuất không bao giờ
   nằm chờ trong sổ.
3. Một mục xong ⇒ trong cùng lượt: đo lại (`Rule_Keys_11_VerifyClaims`), ghi `05_CHANGES`, xoá khỏi `04_TODO` hoặc đánh dấu xong
   để `zemory archive` dời.
4. Dấu xong máy dời được: `- [x]` · `- ✅` · `N. [x]` · tiêu đề `## [x]` (dời cả khối khi bên trong không còn `[ ]` / `[~]`).
   Viết "xong" kiểu khác thì máy không thấy.
5. `zemory archive` lúc chốt phiên là lưới vét cuối, không phải chỗ để dồn mục đã xong.
6. Khối giữa `<!-- zemory:standard-todo:start` và `<!-- zemory:standard-todo:end -->` do `zemory sync` ghi từ `zemory conform`:
   những gì còn làm repo lệch chuẩn. Máy viết lại khối mỗi lượt và xoá khi repo hết lệch. Agent không sửa khối: sửa repo, rồi
   chạy `zemory sync`.

## Ví dụ
- Tình huống: quản lý vừa chốt một quy định mới; đưa vào file luật chỉ mất vài phút.
- ✗ Sai: ghi vào sổ việc "chờ đưa vào luật" rồi báo xong; sổ dài thêm, quy định chưa có hiệu lực.
- ✓ Đúng: làm ngay (với sự cho phép mà `Rule_Gate_79_HarnessEdit` đòi), ghi changelog; sổ chỉ giữ việc thật sự chưa làm kịp.

## Máy kiểm
- Guard chặn mục mở mới trong `04_TODO` khi chưa có cờ `.allow-todo`.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_SessionClose` — closing items and archiving at session end · đóng mục và dời sổ cuối phiên
- Related · Liên quan: `Rule_Keys_11_VerifyClaims` — an item is a claim to measure · mục trong sổ là khẳng định phải đo
