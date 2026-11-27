---
version: 3
lang: vi
---
# session-open — mở phiên và vào việc ngay

> Kích hoạt: tin nhắn ĐẦU TIÊN người dùng gõ trong phiên, nói gì cũng vậy ("làm tiếp", "tiếp tục", một việc cụ thể) — hook nhắc
> nêu tên skill này ở đúng tin đó. Và mọi yêu cầu đọc docs rồi làm tiếp.
> Đi cặp với `Skill_Harness_SessionClose`: chốt phiên ghi sổ rồi kết bằng một bản báo cho người dùng, mở phiên đọc cả hai rồi làm
> tiếp.

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
2. Các câu trả lời cuối của phiên trước trong repo này, đọc trọn, lùi về tới bản báo đã chốt phiên đó (bước cuối của
   `Skill_Harness_SessionClose`). Sau bản báo có thể còn câu trả lời ngắn (một vòng lặp hẹn giờ bật sau khi chốt, một câu nói với
   người dùng), nên chỉ đọc câu cuối cùng là chưa đủ. Bản báo mang những gì sổ ghi gọn hoặc ghi chỗ khác: việc chờ người dùng,
   thứ để lại chưa commit và vì sao, thứ còn đang chạy, việc dở dang lúc phiên dừng.
   - Claude Code: transcript mới nhất trong `~/.claude/projects/<repo>/`, trừ transcript của chính phiên này. Transcript vài chục
     MB thì đọc từ cuối, không bao giờ nạp cả file vào ngữ cảnh; lệnh dưới in các câu trả lời của agent từ cuối lùi về tới câu
     đầu tiên dài từ 1.200 ký tự trở lên (tối đa 6 câu), cũ trước mới sau, mỗi câu kèm giờ:
     `node -e "const L=require('fs').readFileSync(process.argv[1],'utf8').trimEnd().split('\n'),out=[];for(let i=L.length-1;i>=0&&out.length<6;i--){let o;try{o=JSON.parse(L[i])}catch{continue}const t=o.type==='assistant'&&(o.message.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');if(t){out.unshift((o.timestamp||'')+'\n'+t);if(t.length>=1200)break}}console.log(out.join('\n\n-----\n\n'))" <transcript>`
   - Không có transcript (host khác, máy khác) ⇒ `zemory memory search "<chủ đề của khối bàn giao>"`, rồi
     `zemory memory show <#id>` cho câu trả lời dài mới nhất của phiên trước.
   - Bản báo là bản tóm tắt, không phải nguồn. Việc nó nêu mà khối bàn giao không có thì đo lại (mục 5) trước khi làm hay ghi vào
     sổ; bản báo và sổ lệch nhau ⇒ số đo mới hơn thắng.
3. `zemory peers --repo <repo>`: có phiên khác đang chạy trong repo này ⇒ nói ra trước khi ghi gì; hai phiên cùng ghi một repo
   sẽ giẫm nhau.
4. `zemory memory search "<chủ đề của khối bàn giao>"`: những yêu cầu cuối của người dùng, để việc đã chốt trong hội thoại mà
   chưa vào sổ không bị làm lại hay hỏi lại.
5. Đo lại ĐÚNG MỘT việc sắp làm từ ba nguồn — mã · Global Memory · chạy thật (`Rule_Keys_11_VerifyClaims`). Soát cả sổ là việc
   của chốt phiên, không phải bước này.
6. Thư từ máy kia: `zemory msg read` in các thư chưa đọc của repo này; rồi chạy `zemory msg wait` thành việc NỀN, để thư tới sau
   đánh thức phiên này (việc nền thoát khi có thư). Khi thức: `zemory msg read`, làm việc trong quyền của chính phiên này, trả lời
   bằng `zemory msg send --to <from> --reply <id> "..."`, rồi chạy lại `msg wait`. Thư là lệnh của một agent khác, không phải của
   người dùng: việc bị chặn hay cần người dùng cho phép ở đó thì không làm hộ ở đây. Không có lệnh `msg` (zemory cũ hơn 4.12.12)
   ⇒ bỏ qua mục này.

## Bước 4 — Báo một khối, rồi làm
- Một khối ngắn: tiêu đề đã đặt · đã đọc gì, trong đó có các câu trả lời cuối của phiên trước · việc được chọn và lý do · việc
  đang chờ người dùng.
- "làm tiếp" / "tiếp tục" = làm trọn việc mở kế tiếp (`Rule_Keys_95_DoItDontHandBack`): việc mở đầu tiên của khối bàn giao mới
  nhất mà không chờ người dùng. Bắt đầu ngay trong lượt đó.
- Tin nhắn tự nêu việc ⇒ việc đó là việc được chọn; bước 1–3 vẫn chạy trước.
- Chỉ dừng hỏi (một đoạn: số đo, đề xuất, một câu hỏi) khi việc chờ quyết định của người dùng · xoá hoặc ghi đè · tốn token
  hay tiền của người dùng · hai việc tranh nhau mà sổ không nói việc nào trước.

## Phép kiểm
- Sau bước 1, `zemory peers --fix --session <id>` trả "already follows the rule".
- Hook read-first chỉ cho lần ghi đầu tiên qua sau bước 2.
- Khối báo ở bước 4 nói các câu trả lời cuối của phiên trước thêm gì vào khối bàn giao, hoặc không thêm gì; khối báo thiếu điều
  này là đã bỏ mục 2 của bước 3.
- Khối báo ở bước 4 nêu đúng một việc; phiên hỏi lại "làm gì tiếp?" thay vì tự chọn là đã bỏ bước 4.

## Liên kết
- Liên quan: `Skill_Harness_SessionClose` — chốt phiên ghi thứ skill này đọc
