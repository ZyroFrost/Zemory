---
version: 4
lang: vi
---
# Rule_Gate_73_GateEveryRule — Mọi luật và mọi slot có chốt máy; chữ chỉ là tầng cuối

## Luật là gì
Mọi luật (của HS và của riêng repo) và mọi slot có chốt mạnh nhất mà máy nhìn thấy được: chặn (hook · gate · conform · read) khi máy
thấy được lúc vi phạm, và tối thiểu một câu nhắc theo từ khoá (`prompt`) khi máy không thấy. Chữ một mình không bao giờ là tầng
duy nhất: agent quên chữ được, hook thì không.

## Khi nào áp
- Viết, nhận hoặc sửa một luật hay một slot.
- Lời người giao việc nói về chủ đề của một luật mà không câu nhắc nào bắn.
- Một luật bị vi phạm trong phiên mà không hook nào lên tiếng.

## Phải làm gì
1. Phân loại theo câu hỏi "lúc vi phạm, máy thấy gì?" rồi dựng chốt (`Skill_Harness_RuleGate` §2–3).
2. Sàn: `gate.json` của mọi luật có ít nhất một `prompt` mà `re` phủ cách người ta nói — tiếng Việt có dấu và không dấu, tiếng Anh,
   và đúng những từ người giao việc đã dùng. Luật mà không từ nào báo trước được thì ghi `"core": "<vì sao>"`; đó là lối duy nhất
   xuống dưới sàn.
3. Người giao việc dùng một từ cho chủ đề của một luật mà câu nhắc bỏ sót ⇒ thêm từ đó vào `re` của luật ngay trong phiên, kèm câu
   của người giao việc làm ca `block` (là một lần sửa HS: nói một dòng rồi thêm).
4. Một luật bị vi phạm mà không hook nào bắn ⇒ trước khi đóng việc, dựng hoặc siết chốt của luật đó; lần lọt chính là phép đo.
5. Slot: thứ máy thấy được (món nằm sai chỗ, phần mà luật đòi) vào `conform`; phần còn lại `## Check` của slot ghi rõ là chủ máy tự
   phán.

## Ví dụ
- Tình huống: người giao việc viết "đừng đẻ thư mục rỗng nữa"; luật cấm thư mục rỗng đã có nhưng câu nhắc chỉ biết "folder rỗng".
- ✗ Sai: trả lời rồi để câu nhắc như cũ; phiên sau lọt đúng câu đó.
- ✓ Đúng: trả lời, rồi thêm "thư mục rỗng" / "thu muc rong" vào `re` của luật, kèm câu của người giao việc làm ca chặn.

## Máy kiểm
- Test HS: mọi luật có `gate.json` chứa `hook` · `gate` · `conform` · `read` · `prompt`, hoặc một lý do `core`.
- Test HS: số slot mà phần kiểm chỉ có chữ không bao giờ tăng (ratchet: chỉ được giảm).
- `zemory gates`: luật thiếu dấu cổng, luật lõi mang dấu, lõi vượt trần.
