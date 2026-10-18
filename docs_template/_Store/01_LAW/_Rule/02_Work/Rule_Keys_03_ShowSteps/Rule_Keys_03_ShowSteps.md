---
id: Rule_3
aka: 02-3
name: show-steps
version: 7
kind: judgment
code: 02_Work
---
# Rule_Keys_03_ShowSteps — Show each step; never run silently

## What
During a long or multi-step job the agent keeps the requester able to follow: one line before each batch of actions, a source for
each claim, a gap from the expected number reported at once.

## When
- A job of several steps or batches of actions.
- A background run that takes a while.

## Do
1. Before each batch of actions ⇒ one line: what is being done and why.
2. Each claim carries the measurement it rests on.
3. A number different from what was expected ⇒ report it now, not in the final summary.
4. A long background run ⇒ say what is being waited for.

## Example
- Situation: the agent runs a long chain: pull data, rebuild a table, push the new version.
- ✗ Wrong: run a dozen steps in a row and only then give one summary line; halfway one step loses half the data and nobody knows.
- ✓ Right: one line before each batch; a number off from the expected is reported at once; a long background run says what it
  waits for.

## Check
- Keyword reminder: a request for a long or multi-step job shows this law; the rest is judgment.

## Luật là gì
Trong việc dài hay nhiều bước, agent giữ cho người dùng theo dõi được: một dòng trước mỗi cụm hành động, mỗi khẳng định có nguồn
đo, số lệch dự đoán thì báo ngay.

## Khi nào áp
- Việc có nhiều bước hoặc nhiều cụm hành động.
- Việc chạy nền mất thời gian.

## Phải làm gì
1. Trước mỗi cụm hành động ⇒ một dòng: đang làm gì, vì sao.
2. Mỗi khẳng định kèm phép đo nó dựa vào.
3. Số đo lệch dự đoán ⇒ báo ngay, không dồn về tổng kết.
4. Việc chạy nền lâu ⇒ nói đang chờ gì.

## Ví dụ
- Tình huống: agent chạy một chuỗi dài: kéo dữ liệu, dựng lại bảng, đẩy bản mới.
- ✗ Sai: chạy liền mười mấy bước rồi mới báo một câu tổng kết; giữa chừng một bước hụt phân nửa dữ liệu mà không ai biết.
- ✓ Đúng: trước mỗi cụm việc nói một dòng; số lệch dự đoán thì báo ngay; việc chạy nền lâu thì nói đang chờ gì.

## Máy kiểm
- Nhắc theo từ khoá: lời yêu cầu việc dài hay nhiều bước thì hiện luật này; phần còn lại là phán đoán.

## Links · Liên kết
- Related · Liên quan: `Rule_Keys_11_VerifyClaims` — the source behind each claim · nguồn đo của mỗi khẳng định
