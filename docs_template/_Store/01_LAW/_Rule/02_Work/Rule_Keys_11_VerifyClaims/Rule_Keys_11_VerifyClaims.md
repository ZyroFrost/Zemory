---
id: Rule_11
aka: 02-11
name: verify-claims
version: 8
kind: judgment
code: 02_Work
---
# Rule_Keys_11_VerifyClaims — Not verified is not a fact

## What
Every claim (a number · a state · a cause · whether something was done) traces back to a source that can be checked: reading a
file · running a command · calling the real surface · looking up an outside document. What cannot be traced is said to be
unverified, never filled in by guessing.

## When
- About to state a number, a conclusion, a cause, or that something was done.
- About to delete something.
- About to list, report or ask about an item in a ledger (`04_TODO` · plan · changelog).

## Do
1. Trace each claim to a source that can be checked. Not found ⇒ say "not verified" with the ways already tried.
2. Before reporting a number, a conclusion, or deleting ⇒ measure again by a second way with a different mechanism (another tool ·
   counting the other way · the real surface).
3. Look out for four kinds of error: a broken tool that quietly returns empty · a loose comparison that cries wolf · a criterion
   that sounds right but is wrong in substance · a ledger that says something other than reality.
4. Measuring tools: a home-made measure copies every parameter of the official one; several tests failing the same way ⇒ suspect
   the measure first; the number must fit the physical cost of the work — suspiciously fast is a false green until shown otherwise.
5. Work · faults · decisions from another session ⇒ search the decision history before claiming: with the CLI `zemory` ⇒
   `zemory memory search "<q>" --all`; without it ⇒ `docs/archive/`. Search the exact question being answered. Never write or
   claim from a summary or an unchecked subagent result.
6. A ledger item is a claim of state. Before listing, reporting or asking about one ⇒ measure it again with all three sources:
   code/files · decision history · a real run. Applies at all times, not only at session close. Three agree ⇒ conclude; they
   differ ⇒ the newer wins; one source out of reach ⇒ write "not verified", never assume "not done". An item untouched for more
   than 7 days ⇒ suspect it. Asking again about something already settled is a fault.

How to measure, false-alarm traps: `.claude/skills/harness-audit/SKILL.md`. The ledger measure (with the CLI): `zemory todo verify`.

## Example
- Situation: the agent checks the customer table and reports "120 duplicate customers, propose deleting".
- ✗ Wrong: the number comes from a name comparison that ignores case; most are different customers with the same name, deleting
  them loses real data.
- ✓ Right: count again another way (customer code, phone number); report the number only when both ways agree; unsure ⇒ say it is
  not verified.

## Check
- Keyword reminder: a request about what is left, an earlier session, a report or an audit shows this law. The ledger measure:
  `zemory todo verify`.

## Luật là gì
Mọi khẳng định (con số · trạng thái · nguyên nhân · đã làm hay chưa) truy được về một nguồn kiểm được: đọc file · chạy lệnh · gọi
bề mặt thật · tra tài liệu ngoài. Thứ không truy được thì nói là chưa xác minh, không lấp bằng suy đoán.

## Khi nào áp
- Sắp nêu một con số, một kết luận, một nguyên nhân, hay rằng một việc đã làm.
- Sắp xoá một thứ gì.
- Sắp liệt kê, báo cáo hay hỏi về một mục trong sổ (`04_TODO` · plan · changelog).

## Phải làm gì
1. Truy mỗi khẳng định về một nguồn kiểm được. Không ra ⇒ nói "chưa xác minh được" kèm các đường đã thử.
2. Trước khi báo một con số, một kết luận, hay xoá ⇒ đo lại bằng đường thứ hai khác cơ chế (đổi công cụ · đổi hướng đếm · gọi bề
   mặt thật).
3. Soát bốn dạng sai: công cụ hỏng lặng lẽ trả rỗng · phép so lỏng báo oan · tiêu chí nghe hợp lý mà sai bản chất · sổ nói khác
   thực tế.
4. Thước đo: phép đo tự dựng chép đủ tham số của thước chính thức; nhiều phép thử cùng hỏng một hướng ⇒ nghi thước trước; số đo
   phải khớp chi phí vật lý của việc đó — nhanh bất thường là xanh giả cho tới khi chứng minh được điều ngược lại.
5. Việc · lỗi · quyết định ở phiên khác ⇒ tra lịch sử quyết định trước khi khẳng định: có CLI `zemory` ⇒
   `zemory memory search "<q>" --all`; không có ⇒ `docs/archive/`. Tra đúng câu đang cần trả lời. Không ghi hay khẳng định theo
   bản tóm tắt hoặc kết quả subagent chưa kiểm.
6. Mục trong sổ là một khẳng định trạng thái. Trước khi liệt kê, báo cáo hay hỏi về một mục ⇒ đo lại bằng đủ ba nguồn: mã/file ·
   lịch sử quyết định · chạy thật. Áp mọi lúc, không chờ chốt phiên. Ba nguồn khớp ⇒ kết luận; lệch ⇒ cái mới hơn thắng; không
   chạm được một nguồn ⇒ ghi "chưa xác minh được", không mặc định "chưa làm". Mục quá 7 ngày không ai đụng ⇒ nghi ngờ. Hỏi lại
   một việc đã chốt là lỗi.

Cách đo, bẫy báo oan: `.claude/skills/harness-audit/SKILL.md`. Máy đo sổ (khi có CLI): `zemory todo verify`.

## Ví dụ
- Tình huống: agent soát bảng khách hàng và báo "có 120 khách trùng, đề nghị xoá".
- ✗ Sai: con số lấy từ một phép so tên không phân biệt hoa thường; phần lớn là khách khác nhau trùng tên, xoá đi là mất dữ liệu
  thật.
- ✓ Đúng: đếm lại bằng đường khác (mã khách, số điện thoại); hai cách khớp mới báo số; chưa chắc thì nói là chưa xác minh được.

## Máy kiểm
- Nhắc theo từ khoá: lời yêu cầu hỏi còn gì, phiên trước, báo cáo hay audit thì hiện luật này. Máy đo sổ: `zemory todo verify`.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_Audit` — how to measure and the false-alarm traps · cách đo và bẫy báo oan
- Related · Liên quan: `Rule_Gate_01_DoneMeansRun` — done is measured · xong là đã đo
- Related · Liên quan: `Rule_Gate_38_TodoDoor` — the ledger items · các mục trong sổ việc
