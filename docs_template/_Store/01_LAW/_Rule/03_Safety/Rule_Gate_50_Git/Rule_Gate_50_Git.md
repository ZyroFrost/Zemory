---
id: Rule_50
aka: 02-50
name: git
version: 7
kind: action
code: 03_Safety
---
# Rule_Gate_50_Git — Commit freely, push on command, never break history

## What
A local commit can be undone, so the agent commits without asking. A push cannot be undone, so it happens only on the requester's
command. History is never rewritten or destroyed without asking first.

## When
- Work is finished and ready to commit.
- About to push, force-push, rewrite history, delete a remote tag or branch, or discard uncommitted work.

## Do
1. Commit locally in the repo's commit style; no need to ask. A session's own uncommitted work past 300 lines is committed
   locally at the end of the turn by the hook (only the files the session wrote, through the pre-commit check, never pushed).
2. Push only when the request contains a push command. Work done ⇒ run the check, report, stop. One push command covers the whole
   batch in progress: later fixes of the same batch are pushed without asking again.
3. Writing the changelog · committing · "it's done" is not a push command. Pushing is not how a fix takes effect on the running
   machine: a rebuild is enough.
4. Without asking first ⇒ no force-push · no rewriting pushed history · no deleting remote tags or branches · no `reset --hard` or
   `clean` over uncommitted work.

## Example
- Situation: the agent fixed a total in a report, the tests are green, the requester says write the ledger and commit.
- ✗ Wrong: commit, then push to the remote because "done means push".
- ✓ Right: write the ledger, commit locally, report, stop; push only on a push command.

## Check
- The guard blocks `git push` without a command and the history-breaking commands (flag `discard`).
- The end-of-turn hook commits the session's own files locally once their uncommitted lines pass 300, and says so in one line.

## Luật là gì
Commit cục bộ đảo được nên agent commit không cần xin. Push không gỡ được nên chỉ làm khi người dùng ra lệnh. Lịch sử không bao giờ
bị viết lại hay phá khi chưa hỏi trước.

## Khi nào áp
- Việc xong, sẵn sàng commit.
- Sắp push, force-push, viết lại lịch sử, xoá tag hay nhánh trên remote, hoặc bỏ việc chưa commit.

## Phải làm gì
1. Commit cục bộ theo phong cách commit của repo; không cần xin. Việc chưa commit của phiên vượt 300 dòng thì hook cuối lượt tự
   commit cục bộ (chỉ các file phiên đã ghi, đi qua phép kiểm pre-commit, không bao giờ push).
2. Chỉ push khi lời yêu cầu có lệnh push. Xong việc ⇒ chạy phép kiểm, báo, dừng. Một lệnh push phủ cả đợt đang làm: các bản vá kế
   tiếp của cùng đợt push luôn, không hỏi lại.
3. Ghi changelog · commit · "xong rồi" không phải lệnh push. Push không phải cách để bản sửa có hiệu lực trên máy đang chạy: build
   lại là đủ.
4. Chưa hỏi trước ⇒ không force-push · không viết lại lịch sử đã push · không xoá tag hay nhánh trên remote · không `reset --hard`
   hay `clean` lên việc chưa commit.

## Ví dụ
- Tình huống: agent sửa xong một lỗi tính tổng trong báo cáo, test xanh, người dùng bảo ghi sổ rồi commit.
- ✗ Sai: commit rồi tự đẩy lên remote vì "xong rồi thì đẩy".
- ✓ Đúng: ghi sổ, commit cục bộ, báo kết quả, dừng; chỉ đẩy khi có lệnh push.

## Máy kiểm
- Guard chặn `git push` chưa có lệnh và nhóm lệnh phá lịch sử (cờ `discard`).
- Hook cuối lượt tự commit cục bộ các file của phiên khi số dòng chưa commit vượt 300, và báo một dòng.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — discarding work is destroying · bỏ việc chưa commit là phá dữ liệu
- Related · Liên quan: `Skill_Dev_Release` — version numbers and release · số phiên bản và phát hành
