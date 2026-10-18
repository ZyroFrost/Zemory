---
id: Rule_8
aka: 02-8
name: clarify-first
version: 10
kind: judgment
code: 02_Work
---
# Rule_Keys_08_ClarifyFirst — Unclear ⇒ make it clear; unreasonable ⇒ push back before doing it

## What
When the input is not enough to do the work right, the agent stops and asks, one question at a time, each with a proposal. A
design that looks unreasonable is challenged with reasons and another option before any work.

## When
The agent triggers this itself, without being called, when it sees:
- several meanings · a term read in more than one way · missing facts · undefined scope · a hidden assumption;
- two requests that contradict each other;
- an action that is hard to undo is next;
- something unreasonable in a design it was given.

## Do
1. Stop; read what can be read.
2. Ask one question at a time, each with a concrete proposal. An unreasonable design ⇒ give the reason and another option.
3. Before proposing or changing the design of an area ⇒ search `zemory plan search "<area>"` and the existing standard for that
   kind of work; a direction already rejected is not proposed again.
4. Never pick the broadest reading on your own. Work starts once it is clear enough; the final decision is the approval in the
   session.
5. Call it by hand with the word "grill" in the request. Process: `.claude/skills/harness-grill/SKILL.md`.

## Example
- Situation: the requester writes briefly "remove the docs sync part".
- ✗ Wrong: read it as removing the whole docs system and start deleting tables, search commands and the related screens.
- ✓ Right: stop, read what exists, ask one question with a concrete proposal: which part stays, which goes; work after the answer.

## Check
- Keyword reminder: a request with "what does it mean", "design", "propose", "grill" shows this law; the rest is judgment.

## Luật là gì
Khi đầu vào chưa đủ để làm đúng, agent dừng và hỏi, mỗi lần một câu, câu nào cũng kèm đề xuất. Thiết kế trông bất hợp lý thì phản
biện kèm lý do và phương án khác trước khi làm.

## Khi nào áp
Agent tự kích, không chờ lời gọi, khi thấy:
- đa nghĩa · thuật ngữ nhiều cách hiểu · thiếu dữ kiện · phạm vi chưa xác định · giả định ngầm;
- hai yêu cầu mâu thuẫn nhau;
- sắp tới một thao tác khó đảo;
- điểm bất hợp lý trong thiết kế được giao.

## Phải làm gì
1. Dừng; đọc những gì đọc được.
2. Hỏi mỗi lần một câu, kèm đề xuất cụ thể. Thiết kế bất hợp lý ⇒ nêu lý do và phương án khác.
3. Trước khi đề xuất hay đổi thiết kế một vùng ⇒ tra `zemory plan search "<vùng>"` và chuẩn đã có của loại việc đó; hướng đã bị
   bác thì không đề xuất lại.
4. Không tự chọn cách hiểu rộng nhất. Đủ rõ mới làm; quyết định cuối là phê duyệt trong phiên.
5. Gọi tay bằng chữ "grill" trong lời yêu cầu. Quy trình: `.claude/skills/harness-grill/SKILL.md`.

## Ví dụ
- Tình huống: người dùng nhắn ngắn "gỡ phần đồng bộ tài liệu đi".
- ✗ Sai: hiểu là bỏ cả hệ thống tài liệu, bắt đầu xoá bảng, lệnh tìm kiếm và giao diện liên quan.
- ✓ Đúng: dừng, đọc những gì đang có, hỏi một câu kèm đề xuất cụ thể: giữ phần nào, bỏ phần nào; có câu trả lời rồi mới làm.

## Máy kiểm
- Nhắc theo từ khoá: lời yêu cầu có "là sao", "thiết kế", "đề xuất", "grill" thì hiện luật này; phần còn lại là phán đoán.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_Grill` — the question-by-question process · quy trình hỏi từng câu
- Related · Liên quan: `Rule_Keys_07_ScopeOnly` — scope · phạm vi
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — actions hard to undo · thao tác khó đảo
