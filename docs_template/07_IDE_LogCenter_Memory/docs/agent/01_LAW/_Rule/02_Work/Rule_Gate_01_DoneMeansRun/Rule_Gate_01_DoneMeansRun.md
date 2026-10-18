---
id: Rule_1
aka: 02-1
name: done-means-run
version: 10
kind: action
code: 02_Work
from: _Store/01_LAW/_Rule/02_Work/Rule_Gate_01_DoneMeansRun @v10 #8a2673b01492
---
# Rule_Gate_01_DoneMeansRun — "Done" means it really ran

## What
The agent says "done" only when the work has really run and been measured. A green gate alone is not proof.

## When
- About to report a task as done.

## Do
Say "done" only when all three hold:
1. Code changed ⇒ after the last change, the repo's check has run (gate · test · type check · lint · the check command the
   marker declares).
2. A new check was written (test · script · reconciliation formula · comparison table) ⇒ break exactly what it guards and see it
   go red; it stays green ⇒ fix the check. Two common holes: the check never reaches the dangerous branch; a copy of the logic
   elsewhere carries the load instead.
3. What was built is used on another machine (a storage layer · an index · a secret · a delivered asset) ⇒ the path to that
   machine is declared and measured at the receiving end.

One missing ⇒ the work is unfinished, even with a green gate. How to break code: `.claude/skills/harness-audit/SKILL.md`. The
path to a second machine: `.claude/skills/harness-sync-path/SKILL.md`.

## Example
- Situation: the agent writes a reconciliation formula to check that the report's revenue total matches the DW.
- ✗ Wrong: it matches on the first run, so report done; in fact the formula compares the total with itself, and a changed number
  in the DW would still match.
- ✓ Right: change one number at the source on purpose and run again; the reconciliation must show a gap; if it does not, fix the
  formula, then report done.

## Check
- The end-of-turn hook blocks a turn that changed code without running any check command.
- A hook reminds once per session when a new test file is written and when code creates a new stored table.

## Luật là gì
Agent chỉ báo "xong" khi việc đã chạy thật và đã đo. Riêng cổng xanh không phải bằng chứng.

## Khi nào áp
- Sắp báo một việc là xong.

## Phải làm gì
Chỉ báo "xong" khi đủ ba điều:
1. Có sửa mã ⇒ sau lần sửa cuối đã chạy phép kiểm của repo (gate · test · type check · lint · lệnh kiểm khai trong marker).
2. Có viết phép kiểm mới (test · script · công thức đối chiếu · bảng so số) ⇒ đã phá đúng thứ nó canh và thấy nó báo đỏ; vẫn
   xanh ⇒ sửa phép kiểm. Hai lỗ hay gặp: phép kiểm không chạy tới nhánh nguy hiểm; một bản sao logic ở chỗ khác gánh thay.
3. Thứ vừa dựng được dùng ở máy khác (lớp lưu · chỉ mục · bí mật · tài sản giao đi) ⇒ đã khai đường sang máy đó và đo ở đầu nhận.

Thiếu một điều ⇒ việc còn dở, kể cả khi cổng xanh. Cách phá mã: `.claude/skills/harness-audit/SKILL.md`. Đường sang máy thứ hai:
`.claude/skills/harness-sync-path/SKILL.md`.

## Ví dụ
- Tình huống: agent viết công thức đối chiếu để canh tổng doanh thu báo cáo khớp với DW.
- ✗ Sai: chạy lần đầu thấy khớp thì báo xong; thực ra công thức đang so tổng với chính nó, đổi số ở DW vẫn báo khớp.
- ✓ Đúng: cố ý sửa sai một con số ở nguồn rồi chạy lại; phép đối chiếu phải báo lệch, không báo thì sửa công thức rồi mới báo xong.

## Máy kiểm
- Hook kết thúc lượt chặn lượt có sửa mã mà không chạy lệnh kiểm nào.
- Hook nhắc một lần mỗi phiên khi ghi file test mới và khi mã tạo bảng lưu mới.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_Audit` — how to break code to test a check · cách phá mã để thử phép kiểm
- Implements · Thi hành: `Skill_Harness_SyncPath` — the path to a second machine · đường sang máy thứ hai
- Related · Liên quan: `Rule_Keys_11_VerifyClaims` — every claim is measured · mọi khẳng định phải đo
