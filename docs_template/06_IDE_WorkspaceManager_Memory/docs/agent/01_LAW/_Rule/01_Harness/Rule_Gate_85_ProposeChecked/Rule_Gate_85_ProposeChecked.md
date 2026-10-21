---
id: Rule_85
name: propose-checked
version: 7
kind: action
code: 01_Harness
checked: [Rule_Gate_83_HarnessFromStore, Rule_Core_80_SharedChangeImpact, Rule_Keys_62_DesignChangeApproval, Rule_Gate_86_LawLayersAgree]
from: _Store/01_LAW/_Rule/01_Harness/Rule_Gate_85_ProposeChecked @v7 #592f529d2dc8
---
# Rule_Gate_85_ProposeChecked — Search HS before proposing a new part; amend an existing part when it fits

## What
Before anyone proposes a new law, constitution article, slot, frame or skill, they search HS for a part that already says it
or can hold it. A new part is proposed only when nothing existing can take it. Giving an existing part a new law takes the same
search.

## When
- A repo or a session wants a new law, article, slot, frame or skill — shared or for one repo only.
- A request says "add a rule", "new skill", "propose a law" or the like.
- An existing law, frame or skill is edited so that it gains a law: a 🔴 line, a new key in its `gate.json`, a new labelled
  check in its script.

## Do
1. Search HS for a part that already says the same thing ⇒ if found, add nothing.
2. A part that can take it (one more point, one more case, one more check) ⇒ propose amending that part.
3. Only when no part can take it ⇒ propose a new part.
4. The proposal names the parts that were weighed and says why each cannot take it. A new part lists them in its header:
   `checked: [<existing part>, …]`.
5. `Rule_Gate_83_HarnessFromStore` still applies: the proposal goes to the zemory session, the requester approves, zemory writes.
6. A new slot or structure template ⇒ weigh the existing slots by PATH and by KIND OF FILE, not by name, following
   `Skill_Harness_Structure` §5. A new slot says in its text what rule of its own sets it apart from each slot it overlaps.
7. Adding a law to an existing part ⇒ the same search first, over the laws and the skills tied to the part. Then, in the part:
   `checked:` names what was weighed · `version` goes up · a skill names under `## Implements` the law or frame it carries out
   (no law holds the new duty ⇒ propose it in a law, `Rule_Gate_86_LawLayersAgree`) · every labelled check of the skill's
   script is named in a skill's text.

## Example
- Situation: a department repo wants a law "never edit a stored procedure in a source database".
- ✗ Wrong: create a new constitution article for that repo straight away.
- ✓ Right: search HS; `Cons_Gate_11_WriteBoundary` already holds what may be written and where ⇒ propose one more case in that
  frame; no new article is needed.
- Situation: the workspace manager template needs `requirements.txt` and its shared standards in a content folder of the repo.
- ✗ Wrong: new slots `Root_142_Requirements` and `Content_141_WorkspaceStandard`.
- ✓ Right: `requirements.txt` is a dependency manifest ⇒ extend the path of `Root_059_PackageJson`; shared standards belong
  in HS parts (laws, skills, frames) ⇒ dissolve the folder into them.
- Situation: every slicer of a report must offer Select all.
- ✗ Wrong: write a 🔴 line into `Skill_PBI_White` and a check into its gate script, weighing nothing.
- ✓ Right: search the laws and the PBI skills for the duty; name them in `checked:`, raise `version`, name the law the skill
  carries out under `## Implements`, and name the check `select-all` in the skill's text.

## Check
- The guard blocks a Write that creates a new part folder on HS when its header has no `checked:` or names a part that is not
  on HS; the block lists the closest existing parts.
- A keyword reminder fires when a request talks about adding or proposing a law, article, skill or slot.
- The gate (`npm run check`) reds a slot that is new against HEAD and overlaps an existing slot by path or kind of file,
  unless its `checked:` names that slot and its text says how it differs. The gate sees parts written by a script too.
- The guard blocks a change that adds a law to an existing part (a 🔴 line in its header file, a new gate key in its
  `gate.json`) until `checked:` names existing parts, `version` is above the last commit's and, for a skill, `## Implements`
  is not empty. It finds HS from the absolute path, so a repo that writes into HS is held by its own guard.
- The gate (`npm run check`) reds a labelled check in a skill's script that no skill's text names (older ones listed, the list
  only shrinks).

## Luật là gì
Trước khi đề xuất một luật, điều hiến pháp, slot, khung hay skill mới, phải dò HS tìm phần đã nói điều đó hoặc chứa được nó.
Chỉ đề xuất phần mới khi không phần nào có sẵn nhận được. Thêm luật vào một phần đang có cũng phải dò như vậy.

## Khi nào áp
- Một repo hay một phiên muốn có luật, điều hiến pháp, slot, khung hoặc skill mới — chung hay chỉ cho một repo.
- Lời yêu cầu nói tới "thêm luật", "skill mới", "đề xuất luật" hoặc tương tự.
- Sửa một luật, khung hay skill đang có làm nó có thêm luật: một dòng 🔴, một khoá mới trong `gate.json`, một phép kiểm
  mang nhãn mới trong script của nó.

## Phải làm gì
1. Dò HS tìm phần đã nói cùng điều đó ⇒ có thì không thêm gì.
2. Có phần nhận được (thêm một ý, một ca, một phép kiểm) ⇒ đề xuất sửa phần đó.
3. Chỉ khi không phần nào nhận được ⇒ đề xuất phần mới.
4. Đề xuất nêu tên các phần đã cân nhắc và vì sao từng phần không nhận được. Phần mới ghi chúng ở header:
   `checked: [<phần có sẵn>, …]`.
5. `Rule_Gate_83_HarnessFromStore` vẫn áp: đề xuất gửi phiên zemory, người dùng duyệt, zemory ghi.
6. Slot hay template cấu trúc mới ⇒ cân các slot có sẵn theo ĐƯỜNG DẪN và theo LOẠI FILE, không theo tên, làm đúng
   `Skill_Harness_Structure` §5. Slot mới ghi trong thân bài luật riêng nào làm nó khác từng slot nó chồng lên.
7. Thêm luật vào một phần đang có ⇒ dò như trên trước, trên các luật và các skill nối với phần đó. Rồi trong phần đó:
   `checked:` nêu những phần đã cân · `version` tăng · skill nêu ở `## Implements` luật hay khung mà nó thi hành (không luật
   nào giữ nghĩa vụ mới ⇒ đề xuất thêm vào luật, `Rule_Gate_86_LawLayersAgree`) · mọi phép kiểm mang nhãn trong script của
   skill đều được chữ của một skill nêu tên.

## Ví dụ
- Tình huống: một repo phòng ban muốn có luật "không bao giờ sửa stored procedure trong cơ sở dữ liệu nguồn".
- ✗ Sai: tạo ngay một điều hiến pháp mới cho repo đó.
- ✓ Đúng: dò HS; `Cons_Gate_11_WriteBoundary` đã giữ chuyện được ghi gì, ghi ở đâu ⇒ đề xuất thêm một ca vào khung đó; không cần
  điều mới.
- Tình huống: template tổng quản cần `requirements.txt` và bộ chuẩn chung trong một thư mục nội dung của repo.
- ✗ Sai: đẻ slot `Root_142_Requirements` và `Content_141_WorkspaceStandard`.
- ✓ Đúng: `requirements.txt` là file khai phụ thuộc ⇒ mở rộng đường dẫn của `Root_059_PackageJson`; chuẩn chung thuộc về
  các phần HS (luật, skill, khung) ⇒ rã thư mục đó vào chúng.
- Tình huống: mọi ô lọc của một báo cáo phải có dòng Select all.
- ✗ Sai: viết một dòng 🔴 vào `Skill_PBI_White` và một phép kiểm vào script cổng của nó, không cân phần nào.
- ✓ Đúng: dò các luật và các skill PBI xem đã có nghĩa vụ này chưa; nêu chúng ở `checked:`, tăng `version`, nêu luật mà skill
  thi hành ở `## Implements`, và nêu tên phép kiểm `select-all` trong chữ của skill.

## Máy kiểm
- Guard chặn lệnh Write tạo thư mục phần mới trên HS khi header chưa có `checked:` hoặc nêu một phần không có trên HS; lời chặn
  liệt kê các phần gần nhất.
- Lời nhắc theo từ khoá bật khi lời yêu cầu nói tới thêm hay đề xuất luật, điều, skill, slot.
- Gate (`npm run check`) báo đỏ slot mới so với HEAD mà chồng lên slot có sẵn theo đường dẫn hay loại file, trừ khi
  `checked:` nêu slot đó và thân bài nói nó khác thế nào. Gate thấy cả phần do script ghi.
- Guard chặn lần sửa thêm luật vào một phần đang có (dòng 🔴 trong file đầu, khoá cổng mới trong `gate.json`) tới khi
  `checked:` nêu phần có thật, `version` lớn hơn bản ở commit gần nhất và, với skill, `## Implements` không rỗng. Guard nhận ra
  HS từ đường tuyệt đối, nên repo ghi lên HS cũng bị guard của chính nó soi.
- Gate (`npm run check`) báo đỏ phép kiểm mang nhãn trong script của skill mà không chữ skill nào nêu tên (các nhãn cũ có
  danh sách, chỉ được giảm).

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_RuleGate` — writing a law and its machine check · viết luật và dựng chốt máy
- Implements · Thi hành: `Skill_Harness_Structure` — proposing a slot or a structure template · đề xuất slot hay template cấu trúc
- Related · Liên quan: `Rule_Gate_83_HarnessFromStore` — who may change the harness · ai được sửa harness
- Related · Liên quan: `Rule_Gate_35_OneHome` — one thing, one home · một thứ một nhà
- Related · Liên quan: `Rule_Gate_86_LawLayersAgree` — a skill's law hangs on a law · luật trong skill phải treo vào luật
