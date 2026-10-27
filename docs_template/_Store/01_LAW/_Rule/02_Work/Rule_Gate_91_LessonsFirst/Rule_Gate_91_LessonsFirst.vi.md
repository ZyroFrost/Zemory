---
version: 1
lang: vi
---
# Rule_Gate_91_LessonsFirst — Sửa xong là khi bài học đã được ghi

Vì sao là một luật riêng: `Rule_Gate_01_DoneMeansRun` hỏi bản sửa đã chạy thật chưa, `Rule_Keys_11_VerifyClaims` hỏi khẳng định đã
đo chưa, `Rule_Gate_34_DocsFollowChange` hỏi tài liệu đã theo chưa; không luật nào hỏi cùng lỗi đó có quay lại qua đoạn code kế
tiếp không. Câu hỏi đó, và chỗ giữ câu trả lời, là luật này.

## Luật là gì
Một lỗi có gốc ở cách viết code hay cách vận hành chỉ được coi là xong khi bài học của nó đã nằm trong sổ của repo
(`Cons_Gate_17_LessonsLedger`), kèm phép kiểm bằng máy ở mọi chỗ máy thấy được lỗi, và mục changelog của lần sửa nêu tên bài học đó.
Lỗi mà code mới không thể đem lại (một bản ghi sai một lần, sự cố ngoài repo) không cần bài học; mục changelog ghi rõ lý do.

## Khi nào áp
- Sắp gọi một lần sửa lỗi là xong.
- Viết một mục changelog về lỗi, sự cố hay hồi quy.
- Viết code mới trong vùng mà sổ đã có bài học.

## Phải làm gì
1. Hỏi: code mới, tác vụ mới hay dữ liệu mới có làm lỗi này lặp lại được không? Có ⇒ cần một bài học.
2. Thêm `L-<số>` vào sổ ngay trong lượt sửa: sự cố có số · kiểu sai · luật cho code mới · cách kiểm · nơi đã sửa.
3. Gắn phép kiểm mạnh nhất làm được: mẫu `static` chạy trong cổng của repo · test `runtime` · từ khoá `judgment`. Chỉ bài học loại
   `judgment` mới dựa riêng vào người đọc.
4. Mục changelog của lần sửa nêu `L-<số>`, hoặc có dòng `không có bài học: <lý do>`.
5. Trước khi viết code mới trong một vùng, đọc các bài học của vùng đó trong sổ.

## Ví dụ
- Tình huống: khoá của job audit được tách ra vì nó giữ một làn 25 phút, nhưng vẫn trùm lên phần đọc từ server khác; 04:00 làn
  đó chờ 686 giây.
- ✗ Sai: thu hẹp khoá này, ghi changelog "đã thu hẹp khoá"; job kế tiếp chép lại đúng kiểu khoá cũ.
- ✓ Đúng: `L-12 — khoá không bao giờ trùm lên phần đọc từ server khác`, kiểm `static`: một mẫu dò ra phần đọc từ xa nằm trong khối
  khoá và làm cổng đỏ; mục changelog ghi `L-12`.

## Máy kiểm
- Guard chặn một mục changelog mới báo sửa lỗi (`sửa lỗi` · `fix` · `bug` · `sự cố` · `incident` · `regression` · `hồi quy`) mà không
  nêu `L-<số>` và không có dòng `không có bài học:` / `no lesson:`, ở repo có khung sổ kinh nghiệm.
- `conform` (khung `Cons_Gate_17_LessonsLedger`) đỏ khi sổ thiếu, chưa viết, hoặc còn là bản mẫu.

## Links · Liên kết
- Related · Liên quan: `Cons_Gate_17_LessonsLedger` — the ledger this law writes into · sổ mà luật này ghi vào
- Implements · Thi hành: `Skill_Harness_SessionClose` — the changelog step asks for the lesson · bước changelog hỏi bài học
- Implements · Thi hành: `Skill_Harness_SyncPath` — a fix found on the way gets its lesson before done · lỗi gặp trên đường phải có bài học trước khi xong
