---
version: 1
lang: vi
---
# Rule_Gate_99_GraphFirst — Ask the code graph before grepping the code or changing a file

## Luật là gì
Nơi có zemory, graph code trả lời trong một lần gọi: ai dùng một file, file đó import gì, một thay đổi lan tới đâu. Agent hỏi graph
trước khi sửa một file nguồn đang có và trước khi dò code tìm chỗ phụ thuộc. Dùng nhiều vòng grep và đọc file cho câu hỏi mà graph
trả lời được là lỗi.

## Khi nào áp
- Sắp sửa một file nguồn đang có (`.ts .tsx .js .jsx .mjs .cjs .py .sh .java .go .rs .cs`), không phải file test.
- Sắp dò code tìm ai gọi, ai import hay ai phụ thuộc vào một thứ.

## Phải làm gì
1. Trước khi sửa một file nguồn, gọi `graph_impact` với file đó (MCP của zemory, trả từ graph đã lưu) hoặc chạy
   `zemory graph impact <file>`. Đọc danh sách file import nó, file import gián tiếp, và file đó có phải hub không.
2. Xử đủ mọi file import mà graph liệt kê (`Rule_Keys_80_SharedChangeImpact`).
3. Muốn đi theo cấu trúc thì dùng `graph_neighbors` từng bước một, thay vì mở nhiều file.
4. Giữ grep cho chữ không phải phụ thuộc: một câu thông báo, một chuỗi, một cấu hình, một dòng log.
5. Graph không trả lời được (loại file graph không đọc, repo không có code) ⇒ nói rõ rồi dùng grep.

## Ví dụ
- Tình huống: agent được giao đổi chữ ký một hàm trong `src/db/queries.ts`.
- ✗ Sai: chạy `grep -rn "queries" src/` ba lần, mở năm file, sửa hàm, sót một file import ở thư mục khác.
- ✓ Đúng: `graph_impact {"file": "src/db/queries.ts"}`, đọc danh sách file import, sửa hàm và mọi file import đó.

## Máy kiểm
- Hook: lần đầu sửa một file nguồn đang có mà phiên chưa hỏi graph về file đó thì bị chặn một lần, kèm đúng lệnh cần gọi; gọi lại
  y hệt thì qua. Grep đệ quy trên code của một repo có code bị chặn một lần mỗi phiên theo cùng cách. Trong transcript của phiên
  đã có một lần gọi graph thì cả hai đều qua.
- Nhắc theo từ khoá: yêu cầu sửa, refactor hay dò code thì hiện luật này.

## Links · Liên kết
- Related · Liên quan: `Rule_Keys_80_SharedChangeImpact` — the list of places a change reaches · danh sách nơi một thay đổi chạm tới
- Related · Liên quan: `Rule_Keys_81_FollowExistingPattern` — read how the code is used before adding to it · đọc cách code đang được dùng trước khi thêm
