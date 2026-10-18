---
id: Rule_85
name: propose-checked
version: 5
kind: action
code: 01_Harness
checked: [Rule_Gate_83_HarnessFromStore, Rule_Core_80_SharedChangeImpact, Rule_Keys_62_DesignChangeApproval]
from: _Store/01_LAW/_Rule/01_Harness/Rule_Gate_85_ProposeChecked @v5 #54db8d826b79
---
# Rule_Gate_85_ProposeChecked — Search HS before proposing a new part; amend an existing part when it fits

## What
Before anyone proposes a new law, constitution article, slot, frame or skill, they search HS for a part that already says it
or can hold it. A new part is proposed only when nothing existing can take it.

## When
- A repo or a session wants a new law, article, slot, frame or skill — shared or for one repo only.
- A request says "add a rule", "new skill", "propose a law" or the like.

## Do
1. Search HS for a part that already says the same thing ⇒ if found, add nothing.
2. A part that can take it (one more point, one more case, one more check) ⇒ propose amending that part.
3. Only when no part can take it ⇒ propose a new part.
4. The proposal names the parts that were weighed and says why each cannot take it. A new part lists them in its header:
   `checked: [<existing part>, …]`.
5. `Rule_Gate_83_HarnessFromStore` still applies: the proposal goes to the zemory session, the requester approves, zemory writes.
6. A new slot or structure template ⇒ weigh the existing slots by PATH and by KIND OF FILE, not by name, following
   `Skill_Harness_Structure` §5. A new slot says in its text what rule of its own sets it apart from each slot it overlaps.

## Example
- Situation: a department repo wants a law "never edit a stored procedure in a source database".
- ✗ Wrong: create a new constitution article for that repo straight away.
- ✓ Right: search HS; `Cons_Gate_11_WriteBoundary` already holds what may be written and where ⇒ propose one more case in that
  frame; no new article is needed.
- Situation: the workspace manager template needs `requirements.txt` and its shared standards in `content/standard/`.
- ✗ Wrong: new slots `Root_142_Requirements` and `Content_141_WorkspaceStandard`.
- ✓ Right: `requirements.txt` is a dependency manifest ⇒ extend the path of `Root_059_PackageJson`; shared standards belong
  in HS parts (laws, skills, frames) ⇒ dissolve the folder into them.

## Check
- The guard blocks a Write that creates a new part folder on HS when its header has no `checked:` or names a part that is not
  on HS; the block lists the closest existing parts.
- A keyword reminder fires when a request talks about adding or proposing a law, article, skill or slot.
- The gate (`npm run check`) reds a slot that is new against HEAD and overlaps an existing slot by path or kind of file,
  unless its `checked:` names that slot and its text says how it differs. The gate sees parts written by a script too.

## Luật là gì
Trước khi đề xuất một luật, điều hiến pháp, slot, khung hay skill mới, phải dò HS tìm phần đã nói điều đó hoặc chứa được nó.
Chỉ đề xuất phần mới khi không phần nào có sẵn nhận được.

## Khi nào áp
- Một repo hay một phiên muốn có luật, điều hiến pháp, slot, khung hoặc skill mới — chung hay chỉ cho một repo.
- Lời yêu cầu nói tới "thêm luật", "skill mới", "đề xuất luật" hoặc tương tự.

## Phải làm gì
1. Dò HS tìm phần đã nói cùng điều đó ⇒ có thì không thêm gì.
2. Có phần nhận được (thêm một ý, một ca, một phép kiểm) ⇒ đề xuất sửa phần đó.
3. Chỉ khi không phần nào nhận được ⇒ đề xuất phần mới.
4. Đề xuất nêu tên các phần đã cân nhắc và vì sao từng phần không nhận được. Phần mới ghi chúng ở header:
   `checked: [<phần có sẵn>, …]`.
5. `Rule_Gate_83_HarnessFromStore` vẫn áp: đề xuất gửi phiên zemory, người dùng duyệt, zemory ghi.
6. Slot hay template cấu trúc mới ⇒ cân các slot có sẵn theo ĐƯỜNG DẪN và theo LOẠI FILE, không theo tên, làm đúng
   `Skill_Harness_Structure` §5. Slot mới ghi trong thân bài luật riêng nào làm nó khác từng slot nó chồng lên.

## Ví dụ
- Tình huống: một repo phòng ban muốn có luật "không bao giờ sửa stored procedure trong cơ sở dữ liệu nguồn".
- ✗ Sai: tạo ngay một điều hiến pháp mới cho repo đó.
- ✓ Đúng: dò HS; `Cons_Gate_11_WriteBoundary` đã giữ chuyện được ghi gì, ghi ở đâu ⇒ đề xuất thêm một ca vào khung đó; không cần
  điều mới.
- Tình huống: template tổng quản cần `requirements.txt` và bộ chuẩn chung trong `content/standard/`.
- ✗ Sai: đẻ slot `Root_142_Requirements` và `Content_141_WorkspaceStandard`.
- ✓ Đúng: `requirements.txt` là file khai phụ thuộc ⇒ mở rộng đường dẫn của `Root_059_PackageJson`; chuẩn chung thuộc về
  các phần HS (luật, skill, khung) ⇒ rã thư mục đó vào chúng.

## Máy kiểm
- Guard chặn lệnh Write tạo thư mục phần mới trên HS khi header chưa có `checked:` hoặc nêu một phần không có trên HS; lời chặn
  liệt kê các phần gần nhất.
- Lời nhắc theo từ khoá bật khi lời yêu cầu nói tới thêm hay đề xuất luật, điều, skill, slot.
- Gate (`npm run check`) báo đỏ slot mới so với HEAD mà chồng lên slot có sẵn theo đường dẫn hay loại file, trừ khi
  `checked:` nêu slot đó và thân bài nói nó khác thế nào. Gate thấy cả phần do script ghi.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_RuleGate` — writing a law and its machine check · viết luật và dựng chốt máy
- Implements · Thi hành: `Skill_Harness_Structure` — proposing a slot or a structure template · đề xuất slot hay template cấu trúc
- Related · Liên quan: `Rule_Gate_83_HarnessFromStore` — who may change the harness · ai được sửa harness
- Related · Liên quan: `Rule_Gate_35_OneHome` — one thing, one home · một thứ một nhà
