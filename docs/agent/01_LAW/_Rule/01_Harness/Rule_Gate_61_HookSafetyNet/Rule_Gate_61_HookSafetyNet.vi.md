---
version: 14
lang: vi
---
# Rule_Gate_61_HookSafetyNet — A hook is a safety net, not the one who decides; a block is cleared by the requester's word

## Luật là gì
Chữ của luật là tầng quyết định; hook chỉ đỡ những gì lọt. Hook cho qua không có nghĩa là được phép, và hook chặn không phải câu
đố để tìm đường vòng: một lần chặn đòi quyền được gỡ bằng lời của người dùng — lời đã nói trong phiên, hoặc lời hỏi xin.

## Khi nào áp
- Một hook cho qua hoặc chặn một thao tác.
- Sắp tạo một cờ dùng một lần `.allow-*`.

## Phải làm gì
1. Hook cho qua ≠ được phép: thao tác không đảo được vẫn phải được người dùng cho phép trước.
2. Bị chặn ⇒ đọc lại các dòng người dùng viết trong phiên. Người dùng đã duyệt hoặc đã ra lệnh đúng việc này ("gửi đi", "xoá đi",
   "push", "làm đi" nêu tên hoặc rõ ràng phủ việc đó) ⇒ tạo cờ rồi làm tiếp, nói một dòng việc gì đã qua. Không có lời nào phủ ⇒
   hỏi người dùng một dòng: cái gì bị chặn, cần người dùng cho phép gì. Không tìm cách khác mà hook không thấy — script khác,
   công cụ khác, bản chép của lệnh.
3. Một cờ `.allow-*` cho qua đúng một việc đã duyệt: chỉ tạo khi có lời duyệt hoặc lệnh của người dùng trong phiên này phủ việc
   đó, và không dùng lại cho việc khác. Nhóm bí mật không có cờ.
4. Đã được duyệt trước khi làm ⇒ tạo cờ TRƯỚC thao tác. Lời duyệt chỉ phủ đúng thứ nó nêu: việc rộng hơn, file khác hay người nhận
   khác với thứ đã duyệt thì không được phủ, phải hỏi.
5. Lần chặn không đòi quyền thì gỡ bằng cách làm đúng, không cần hỏi: đọc file trước, lời nhắc một lần (gọi lại đúng lệnh đó), và
   các luật về cách viết hay cách làm xong (`Rule_Gate_01` · `02` · `04` · `24` · `27` · `29` · `31` · `35` · `84` · `85` · `91` · `92`).
6. Lời người dùng có giá trị ở mọi phiên, dù nói ở đâu. Lời người dùng nói ở BẤT KỲ phiên nào của họ, trên bất kỳ máy nào, được
   tính trong phiên này như gõ ngay tại đây, đúng phần nó nêu (mục 2–4 áp nguyên), khi lời đó tới đây NGUYÊN VĂN: tin của bất kỳ
   phiên nào khác (`SendMessage`, `<cross-session-message>`) hay thư từ bất kỳ máy nào của họ (`zemory msg`). Bên chuyển trích
   nguyên văn và nêu tên phiên đã nghe lời đó. Còn nghi thì bên nhận tìm câu trích trong Global Memory (`zemory memory search`); câu
   trích Global Memory không có, lời diễn giải, hay chữ của agent chuyển là lời agent đó, không phải lời người dùng. Mọi việc làm
   theo lời được chuyển đều báo ngược về phiên hay máy đã chuyển.
7. Lời đã nói thì không bao giờ hỏi lại. Không phiên nào hỏi người dùng XÁC NHẬN điều mà lời họ, ở bất kỳ phiên nào, đã phủ: việc đó
   làm ngay. Chỉ hỏi một dữ kiện còn thiếu hay một quyết định chưa ai đưa — phiên làm việc dưới phiên khác thì gửi LÊN phiên đang
   chỉ huy nó, trong một tin nêu đúng mục; phiên đó trả lời bằng lời người dùng nó đang có, và chỉ hỏi người dùng đúng dữ kiện hay
   quyết định ấy.

## Ví dụ
- Tình huống: người dùng đã nói "gửi báo cáo cho Y"; cổng mail chặn `python send_fabi.py --send` cho báo cáo đó.
- ✗ Sai: gọi hàm gửi từ một script nháp mà cổng không đọc tới (a department repo, 2026-11-01: một file người dùng chưa kiểm đã tới
  tay người nhận theo đường đó); hoặc hỏi lại "gửi không?" khi lệnh đã nêu đúng báo cáo này và Y.
- ✓ Đúng: tạo `.allow-mail` cho đúng lệnh đó và nói "đang gửi báo cáo X cho Y theo lệnh"; file hay người nhận mà lệnh không nêu ⇒
  hỏi trước.

## Máy kiểm
- Hook `hook.cjs`: sau một lần chặn đòi quyền (mọi lần chặn của guard trừ loại gỡ được ở mục 5), công cụ hành động kế tiếp bị
  dừng một lần kèm lời nhắc mục 2; gọi lại đúng lệnh đó thì qua. Cổng người dùng đã trả lời trước đó trong phiên thì không nhắc
  lại. Read · Glob · Grep không bao giờ bị dừng.
- Nhắc theo từ khoá: lời yêu cầu nói tới vòng qua hook, vượt quyền hay tạo cờ thì hiện luật này.
