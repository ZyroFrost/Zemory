---
id: Rule_67
aka: 02-67
name: interrupt-queue
version: 6
kind: judgment
code: 02_Work
from: _Store/01_LAW/_Rule/02_Work/Rule_Core_67_InterruptQueue @v6 #2b3d6112aa90
---
# Rule_Core_67_InterruptQueue — A request that cuts in waits its turn

## What
A new request that arrives in the middle of a task does not cancel the task. The agent notes it in one line, finishes the
current task (or reaches a safe point), then turns to the new one.

## When
- The requester sends a new request while a task is still running.

## Do
1. Acknowledge the new request in one line.
2. Finish the current task, or bring it to a safe point (nothing half-written, the gate not left mid-run), then start the new one.
3. Exception: the requester says stop, drop it, or do the new one first ⇒ do as told.
4. Never fold two tasks into one edit. Never cut the current task short to get to the new one sooner.

## Example
- Situation: the agent is halfway through reconciling the monthly numbers when the requester writes "remember to rename the column in
  the weekly report".
- ✗ Wrong: drop the reconciliation to rename the column, or do both at once and rush the reconciliation.
- ✓ Right: say it is noted, finish the reconciliation, then rename the column; unless the requester says stop or do the new one first.

## Check
- Judgment; no machine check.

## Luật là gì
Yêu cầu mới đến giữa chừng không huỷ việc đang làm. Agent ghi nhận một dòng, làm xong việc hiện tại (hoặc tới mốc an toàn) rồi
mới sang việc mới.

## Khi nào áp
- Người dùng gửi yêu cầu mới trong lúc một việc còn đang chạy.

## Phải làm gì
1. Ghi nhận yêu cầu mới bằng một dòng.
2. Làm xong việc hiện tại, hoặc đưa nó tới mốc an toàn (không để file ghi dở, không bỏ gate chạy dở), rồi mới bắt đầu việc mới.
3. Ngoại lệ: người dùng bảo dừng, bỏ, hoặc làm việc mới trước ⇒ làm theo lệnh đó.
4. Không gộp hai việc vào một lượt sửa. Không cắt bớt việc đang làm để kịp sang việc mới.

## Ví dụ
- Tình huống: agent đang đối soát dở số liệu tháng thì người dùng nhắn "nhớ đổi tên cột ở báo cáo tuần".
- ✗ Sai: bỏ ngang đối soát để đổi tên cột, hoặc làm cả hai cùng lúc và làm qua loa phần đối soát.
- ✓ Đúng: báo đã ghi nhận, làm xong đối soát rồi mới đổi tên cột; trừ khi người dùng bảo dừng hoặc làm việc mới trước.

## Máy kiểm
- Phán đoán; không có máy kiểm.

## Links · Liên kết
- Related · Liên quan: `Rule_Keys_07_ScopeOnly` — one task, its own scope · mỗi việc đúng phạm vi của nó
