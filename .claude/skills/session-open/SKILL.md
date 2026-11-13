---
name: session-open
description: Open a work session and get straight back to work - title the session, read the core docs, pick up the newest handover, re-measure the item, then build it. Use on the first message of every session, whatever it says (the reminder hook names this skill there), and whenever asked to read the docs and continue. Counterpart of session-close. Vietnamese triggers - "làm tiếp", "tiếp tục", "đọc docs", "vào việc", "mở phiên".
---

# session-open — mở phiên và vào việc ngay

> Kích hoạt: tin nhắn ĐẦU TIÊN người dùng gõ trong phiên, nói gì cũng vậy ("làm tiếp", "tiếp tục", một việc cụ thể) — hook nhắc
> nêu tên skill này ở đúng tin đó. Và mọi yêu cầu đọc docs rồi làm tiếp.
> Đi cặp với skill `session-close`: chốt phiên ghi sổ, mở phiên đọc sổ rồi làm tiếp. Bản chung của mọi repo:
> `Skill_Harness_SessionOpen` trong HS (`docs_template/_Store`).

Người dùng không phải nói "đọc docs, đặt tên phiên, rồi làm tiếp" — skill này là nguyên câu đó. Chạy đủ các bước trước khi làm
việc, đúng thứ tự, không hỏi.

## Bước 1 — Đặt tên phiên (`02-48`)
- `zemory peers --fix --session <id> --apply`, `<id>` = biến môi trường `CLAUDE_CODE_SESSION_ID`. Lệnh dựng
  `<Repo>_<Brand>_<d-m-yyyy>` (thêm `_<số>` cho phiên sau trong cùng ngày) từ repo và ngày mở phiên, thay tiêu đề `/clear`
  mang sang, giữ tiêu đề đã đúng khuôn và đúng ngày. `<Brand>` là hãng của agent (`Claude`, `Codex`), không phải tên model.
- Báo "no stored session" ⇒ transcript chưa ghi xuống đĩa: chạy lại sau câu trả lời đầu. Không có mã phiên ⇒ báo người dùng
  tiêu đề cần đặt, một lần.

## Bước 2 — Đọc lõi (`AGENTS.md` §Vào việc bước 2)
- Dùng công cụ Read, đọc tới dòng cuối: `02_RULES` §Lõi · khối ĐỌC KỸ của `01_CONSTITUTION`, các điều nó liệt kê và §Mục đích ·
  cả `05_TODO`. Hook `02-59_read-first` chặn lần ghi đầu tiên tới khi đọc xong.
- `03_STRUCTURE` · `04_SKILLS` · `docs/plan/*` KHÔNG đọc ở bước này — chỉ mở khi trúng trigger (`AGENTS.md` §Mở khi trúng trigger).

## Bước 3 — Nối tiếp chỗ phiên trước dừng
1. Khối bàn giao mới nhất trong `05_TODO` và các mục `06_CHANGES` nó trỏ tới (`zemory changelog search` khi cần mục cũ).
2. `zemory peers --repo Zemory`: có phiên khác đang chạy trong repo này ⇒ nói ra trước khi ghi gì; hai phiên cùng ghi một repo
   sẽ giẫm nhau (banner ⛔ của `AGENTS.md`).
3. `zemory memory search "<chủ đề của khối bàn giao>"`: những yêu cầu cuối của người dùng, để việc đã chốt trong hội thoại mà
   chưa vào sổ không bị làm lại hay hỏi lại (`02-39` · `02-40`).
4. Đo lại ĐÚNG MỘT việc sắp làm từ ba nguồn — mã · Global Memory · chạy thật (`02-12`). Soát cả sổ là việc của `session-close`.

## Bước 4 — Báo một khối, rồi làm
- Một khối ngắn: tiêu đề đã đặt · đã đọc gì · việc được chọn và lý do · việc đang chờ người dùng.
- "làm tiếp" / "tiếp tục" = làm trọn việc mở kế tiếp (`02-95`): việc mở đầu tiên của khối bàn giao mới nhất mà không chờ người
  dùng. Bắt đầu ngay trong lượt đó.
- Tin nhắn tự nêu việc ⇒ việc đó là việc được chọn; bước 1–3 vẫn chạy trước.
- Chỉ dừng hỏi (một đoạn: số đo, đề xuất, một câu hỏi) khi việc chờ quyết định của người dùng · xoá hoặc ghi đè (`02-10`) · tốn
  token hay tiền của người dùng · hai việc tranh nhau mà sổ không nói việc nào trước.

## Phép kiểm
- Sau bước 1, `zemory peers --fix --session <id>` trả "already follows the rule".
- Hook read-first chỉ cho lần ghi đầu tiên qua sau bước 2.
- Khối báo ở bước 4 nêu đúng một việc; phiên hỏi lại "làm gì tiếp?" thay vì tự chọn là đã bỏ bước 4.
