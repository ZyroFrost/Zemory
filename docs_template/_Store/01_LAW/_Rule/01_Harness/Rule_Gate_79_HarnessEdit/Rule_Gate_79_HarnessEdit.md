---
id: Rule_79
name: harness-edit
version: 5
kind: action
code: 01_Harness
---
# Rule_Gate_79_HarnessEdit — Changing HS needs the requester's approval; a law whose breach cannot be undone needs a machine check

## What
HS (`docs_template/_Store`) and the harness files no other law covers (`docs/plan/`, `AGENTS.md`, `CLAUDE.md`) change only when
the requester has approved that very change in the session. Inside a repo, the four harness folders follow
`Rule_Gate_83_HarnessFromStore` instead: the repo never changes them.

## When
- An agent is about to create, edit, delete or move anything in HS, in `docs/plan/`, or in `AGENTS.md` / `CLAUDE.md`.
- A new law is written whose breach cannot be undone.

## Do
1. Change those files only after the requester approved that exact change in this session.
2. Never create, merge, retire or renumber a law, article, slot, skill, shelf or layer on your own; ask one question with a
   proposal, and do not park the proposal in a ledger to wait.
3. A sentence an agent wrote into a plan or a law is not the requester's decision; never use it as the ground for another change.
4. A law whose breach cannot be undone (a secret in a commit, a write to a forbidden path, an unrequested push) gets a machine
   check that blocks it when it happens; text alone is not enough. How to choose and build the check: `Skill_Harness_RuleGate`.

## Example
- Situation: an agent thinks HS "should" have one more shelf for a set's starter files.
- ✗ Wrong: create the shelf, move a few laws into the archive for tidiness, note the reason in the plan, then report it as done
  "according to the plan".
- ✓ Right: try the parts that exist first; still needed ⇒ propose and wait; change HS only once the requester approved that change.

## Check
- The guard blocks every write into HS and the other harness files above without the one-use flag `.allow-docs-write`; the
  flag is created only when the requester has approved.

## Luật là gì
HS (`docs_template/_Store`) và các file harness không luật nào khác giữ (`docs/plan/`, `AGENTS.md`, `CLAUDE.md`) chỉ đổi khi người
dùng đã cho phép đúng thay đổi đó trong phiên. Trong repo, bốn thư mục harness theo `Rule_Gate_83_HarnessFromStore`: repo không
bao giờ sửa.

## Khi nào áp
- Agent sắp tạo, sửa, xoá hay dời bất kỳ thứ gì trong HS, trong `docs/plan/`, hoặc `AGENTS.md` / `CLAUDE.md`.
- Viết một luật mới mà vi phạm thì không đảo được.

## Phải làm gì
1. Chỉ sửa các file đó sau khi người dùng đã cho phép đúng thay đổi đó trong phiên này.
2. Không tự tạo, gộp, bãi bỏ hay đánh lại số luật, điều, slot, skill, kệ, lớp; hỏi một câu kèm đề xuất, và không để đề xuất nằm
   trong sổ chờ duyệt.
3. Câu agent tự viết vào plan hay luật không phải quyết định của người dùng; không dùng làm căn cứ cho thay đổi khác.
4. Luật mà vi phạm không đảo được (bí mật vào commit, ghi vào đường cấm, push chưa xin) phải có chốt máy chặn lúc xảy ra; chữ một
   mình không đủ. Cách chọn và dựng chốt: `Skill_Harness_RuleGate`.

## Ví dụ
- Tình huống: agent thấy HS "nên có" thêm một kệ để chứa file khởi đầu của một bộ mẫu.
- ✗ Sai: tạo kệ mới, dời vài luật vào archive cho gọn, ghi lý do vào plan rồi báo đã làm "theo plan".
- ✓ Đúng: thử xếp vào phần có sẵn trước; vẫn cần ⇒ đề xuất và chờ; chỉ sửa HS khi người dùng đã cho phép đúng việc đó.

## Máy kiểm
- Guard chặn mọi lần ghi vào HS và các file harness kể trên khi chưa có cờ dùng một lần `.allow-docs-write`; cờ chỉ tạo khi người
  dùng đã cho phép.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_RuleGate` — choosing and building a machine check · chọn và dựng chốt máy
- Related · Liên quan: `Rule_Gate_83_HarnessFromStore` — the repo side of the harness · phía repo của harness
- Related · Liên quan: `Rule_Keys_61_HookSafetyNet` — a flag allows one approved change only · một cờ chỉ cho qua đúng một việc đã duyệt
