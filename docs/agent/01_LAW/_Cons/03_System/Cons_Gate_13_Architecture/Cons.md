---
frame: Cons_Gate_13_Architecture
status: written
---
# Kiến trúc

## Các lớp
Ghi nhận (`memory/adapters`, hook) → GM (`memory/db.ts` qua hàng đợi ghi) → lớp dẫn xuất (FTS · vector · graph · digest) → bề mặt
(CLI · daemon HTTP · MCP · UI)

## Không được vượt
- Lớp ghi nhận không gọi model, không nhúng vector, không gọi mạng (điều 10, `rule-gates ⑪`).
- Không lớp nào của `backend/src` gọi endpoint model (điều 6, `rule-gates ⑩`).
- Bề mặt không ghi thẳng vào GM: mọi lượt ghi đi qua hàng đợi ghi (điều 18).
- Lớp dẫn xuất không được thành nguồn: không ghi ngược vào `messages`/`sessions` (điều 3, `rule-gates ①`).
