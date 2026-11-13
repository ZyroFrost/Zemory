---
version: 1
lang: vi
---
# session-open — mở phiên và vào việc ngay

> Kích hoạt: tin nhắn ĐẦU TIÊN người dùng gõ trong phiên, nói gì cũng vậy ("làm tiếp", "tiếp tục", một việc cụ thể) — hook nhắc
> nêu tên skill này ở đúng tin đó. Và mọi yêu cầu đọc docs rồi làm tiếp.
> Đi cặp với `Skill_Harness_SessionClose`: chốt phiên ghi sổ, mở phiên đọc sổ rồi làm tiếp.

Người dùng không phải nói "đọc docs, đặt tên phiên, rồi làm tiếp" — skill này là nguyên câu đó. Chạy đủ các bước trước khi làm
việc, đúng thứ tự, không hỏi.

## Bước 1 — Đặt tên phiên
- `zemory peers --fix --session <id> --apply`, `<id>` = biến môi trường `CLAUDE_CODE_SESSION_ID`. Lệnh dựng
  `<Repo>_<Brand>_<d-m-yyyy>` (thêm `_<số>` cho phiên sau trong cùng ngày) từ repo và ngày mở phiên, thay tiêu đề `/clear`
  mang sang, giữ tiêu đề đã đúng khuôn và đúng ngày.
- Báo "no stored session" ⇒ transcript chưa ghi xuống đĩa: chạy lại sau câu trả lời đầu. Không có mã phiên (host khác) ⇒ báo
  người dùng tiêu đề cần đặt, một lần.
- Luật tiêu đề: `_Host/IDE` § Phiên và nhắn liên phiên. `<Brand>` là hãng của agent (`Claude`, `Codex`), không bao giờ là tên
  model (`Opus`).

## Bước 2 — Đọc lõi
- Dùng công cụ Read, đọc tới dòng cuối: phần lõi của luật · khối ĐỌC KỸ của hiến pháp, các điều nó liệt kê và phần Mục đích ·
  cả TODO. Hook read-first nêu đúng danh sách; nó chặn lần ghi đầu tiên tới khi đọc xong.
- Cấu trúc, skill, plan KHÔNG đọc ở bước này — chỉ mở khi trúng trigger riêng (`AGENTS.md` § mở khi trúng trigger).

## Bước 3 — Nối tiếp chỗ phiên trước dừng
1. Khối bàn giao mới nhất trong TODO và các mục CHANGES nó trỏ tới.
2. `zemory peers --repo <repo>`: có phiên khác đang chạy trong repo này ⇒ nói ra trước khi ghi gì; hai phiên cùng ghi một repo
   sẽ giẫm nhau.
3. `zemory memory search "<chủ đề của khối bàn giao>"`: những yêu cầu cuối của người dùng, để việc đã chốt trong hội thoại mà
   chưa vào sổ không bị làm lại hay hỏi lại.
4. Đo lại ĐÚNG MỘT việc sắp làm từ ba nguồn — mã · Global Memory · chạy thật (`Rule_Keys_11_VerifyClaims`). Soát cả sổ là việc
   của chốt phiên, không phải bước này.

## Bước 4 — Báo một khối, rồi làm
- Một khối ngắn: tiêu đề đã đặt · đã đọc gì · việc được chọn và lý do · việc đang chờ người dùng.
- "làm tiếp" / "tiếp tục" = làm trọn việc mở kế tiếp (`Rule_Keys_95_DoItDontHandBack`): việc mở đầu tiên của khối bàn giao mới
  nhất mà không chờ người dùng. Bắt đầu ngay trong lượt đó.
- Tin nhắn tự nêu việc ⇒ việc đó là việc được chọn; bước 1–3 vẫn chạy trước.
- Chỉ dừng hỏi (một đoạn: số đo, đề xuất, một câu hỏi) khi việc chờ quyết định của người dùng · xoá hoặc ghi đè · tốn token
  hay tiền của người dùng · hai việc tranh nhau mà sổ không nói việc nào trước.

## Phép kiểm
- Sau bước 1, `zemory peers --fix --session <id>` trả "already follows the rule".
- Hook read-first chỉ cho lần ghi đầu tiên qua sau bước 2.
- Khối báo ở bước 4 nêu đúng một việc; phiên hỏi lại "làm gì tiếp?" thay vì tự chọn là đã bỏ bước 4.

## Liên kết
- Liên quan: `Skill_Harness_SessionClose` — chốt phiên ghi thứ skill này đọc
