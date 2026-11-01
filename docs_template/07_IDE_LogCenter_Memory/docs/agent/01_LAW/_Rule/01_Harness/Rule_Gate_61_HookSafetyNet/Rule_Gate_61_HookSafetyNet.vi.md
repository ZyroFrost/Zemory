---
version: 10
lang: vi
---
# Rule_Gate_61_HookSafetyNet — A hook is a safety net, not the one who decides; a block is answered by the requester

## Luật là gì
Chữ của luật là tầng quyết định; hook chỉ đỡ những gì lọt. Hook cho qua không có nghĩa là được phép, và hook chặn không phải câu
đố để tìm đường vòng: một lần chặn đòi quyền thì agent dừng cho tới khi người dùng trả lời.

## Khi nào áp
- Một hook cho qua hoặc chặn một thao tác.
- Sắp tạo một cờ dùng một lần `.allow-*`.

## Phải làm gì
1. Hook cho qua ≠ được phép: thao tác không đảo được vẫn phải được người dùng cho phép trước.
2. Bị chặn ⇒ dừng, hỏi người dùng một dòng: cái gì bị chặn, cần người dùng cho phép gì. Không tìm cách khác mà hook không thấy —
   script khác, công cụ khác, bản chép của lệnh — và không tự tạo cờ.
3. Một cờ `.allow-*` cho qua đúng một việc đã duyệt: chỉ tạo sau khi người dùng cho phép rõ trong phiên này, và không dùng lại cho
   việc khác. Nhóm bí mật không có cờ.
4. Đã được duyệt trước khi làm ⇒ tạo cờ TRƯỚC thao tác. Đã đâm vào chặn rồi thì là bị chặn: phải để người dùng trả lời, kể cả khi
   trước đó đã có lời duyệt. Dừng chỉ áp một lần cho mỗi cổng: người dùng đã trả lời một cổng trong phiên thì lần chặn sau của
   cùng cổng đó (cùng cờ) gỡ bằng cách tạo cờ cho đúng lệnh đó, không hỏi lại.
5. Lần chặn không đòi quyền thì gỡ bằng cách làm đúng, không cần hỏi: đọc file trước, lời nhắc một lần (gọi lại đúng lệnh đó), và
   các luật về cách viết hay cách làm xong (`Rule_Gate_01` · `02` · `04` · `24` · `27` · `29` · `31` · `35` · `84` · `85` · `91` · `92`).

## Ví dụ
- Tình huống: cổng mail chặn `python send_fabi.py --send`; agent thấy gọi hàm gửi từ một script nháp thì cổng không đọc tới.
- ✗ Sai: chạy script nháp, hoặc tự tạo `.allow-mail` vì một tiếng trước người dùng đã nói "gửi" (a department repo, 2026-11-01: một file người
  dùng chưa kiểm đã tới tay người nhận theo đường đó).
- ✓ Đúng: dừng, báo người dùng "cổng mail chặn gửi file X cho Y — gửi không?"; người dùng trả lời rồi mới tạo cờ cho đúng lệnh đó.

## Máy kiểm
- Hook `hook.cjs`: sau một lần chặn đòi quyền (mọi lần chặn của guard trừ loại gỡ được ở mục 5), mọi công cụ hành động bị chặn tới
  khi người dùng nhắn lại; Read · Glob · Grep vẫn mở. Hook đọc transcript của phiên từ cuối ngược về dòng gần nhất của người dùng.
- Nhắc theo từ khoá: lời yêu cầu nói tới vòng qua hook, vượt quyền hay tạo cờ thì hiện luật này.
