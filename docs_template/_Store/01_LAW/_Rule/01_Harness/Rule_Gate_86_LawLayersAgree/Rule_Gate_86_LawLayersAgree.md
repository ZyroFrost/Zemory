---
id: Rule_86
name: law-layers-agree
version: 1
kind: action
code: 01_Harness
checked: [Rule_Gate_35_OneHome, Rule_Gate_83_HarnessFromStore, Rule_Core_80_SharedChangeImpact]
---
# Rule_Gate_86_LawLayersAgree — The layers of law never contradict each other, and stay linked

## What
A rule lives on three layers: the law or constitution frame (HS) states the duty · the repo's `Cons.md` states the repo's own
decision · a skill teaches how to carry it out. A lower layer never says the opposite of a higher one, and every layer names the
others it is tied to.

## When
- Writing or editing a law, a frame, a `Cons.md` or a skill.
- Two layers are seen to say different things.

## Do
1. Order: constitution frame and law > the repo's `Cons.md` > skill. A `Cons.md` never loosens the duty of its frame; a skill
   never teaches against the law it implements.
2. A contradiction found ⇒ the lower layer is fixed to follow the higher, or a change of the higher layer is proposed through HS
   (`Rule_Gate_83_HarnessFromStore`).
3. Links are written in the body: a law or frame ends with `## Links · Liên kết` (`Implements` · `Repo declares` · `Related`); a
   skill names the laws it carries out in `## Implements`. Both directions agree.
4. Changing one layer ⇒ check every layer linked to it (`zemory impact <part>` lists them).

## Example
- Situation: the law on secrets says values never enter git; a department's skill says "keep the password in `config.json` for the
  scheduled job".
- ✗ Wrong: follow the skill because it is more specific; the password goes into git.
- ✓ Right: the law wins; the skill is fixed to read the value from `data/secrets/`, and the fix goes through HS.

## Check
- `conform` and the HS test: every name in `## Links` and `## Implements` is a living part, and both directions match.
- `conform`: a section of the frame that the repo's `Cons.md` dropped or left with a template mark `<…>` is red.
- The app shows the same findings (it uses the conform engine).

## Luật là gì
Một quy định sống ở ba tầng: luật hay khung hiến pháp (HS) nêu nghĩa vụ · `Cons.md` của repo nêu quyết định riêng của repo · skill
dạy cách thi hành. Tầng dưới không bao giờ nói ngược tầng trên, và mỗi tầng nêu tên các tầng nó gắn với.

## Khi nào áp
- Viết hay sửa một luật, một khung, một `Cons.md` hay một skill.
- Thấy hai tầng nói khác nhau.

## Phải làm gì
1. Thứ bậc: khung hiến pháp và luật > `Cons.md` của repo > skill. `Cons.md` không nới nghĩa vụ của khung; skill không dạy trái luật
   nó thi hành.
2. Thấy mâu thuẫn ⇒ sửa tầng dưới theo tầng trên, hoặc đề xuất sửa tầng trên qua HS (`Rule_Gate_83_HarnessFromStore`).
3. Liên kết viết trong thân: luật hay khung kết thúc bằng `## Links · Liên kết` (`Implements` · `Repo declares` · `Related`); skill
   nêu các luật nó thi hành ở `## Implements`. Hai chiều khớp nhau.
4. Sửa một tầng ⇒ soát mọi tầng nối với nó (`zemory impact <phần>` liệt kê).

## Ví dụ
- Tình huống: luật về bí mật nói giá trị không bao giờ vào git; skill của một phòng ghi "để mật khẩu trong `config.json` cho job
  định kỳ".
- ✗ Sai: làm theo skill vì nó cụ thể hơn; mật khẩu lọt vào git.
- ✓ Đúng: luật thắng; skill được sửa để đọc giá trị từ `data/secrets/`, và việc sửa đi qua HS.

## Máy kiểm
- `conform` và test của HS: mọi tên trong `## Links` và `## Implements` là phần còn sống, và hai chiều khớp nhau.
- `conform`: mục của khung mà `Cons.md` của repo bỏ đi hoặc còn dấu mẫu `<…>` thì đỏ.
- App hiện cùng các phát hiện đó (dùng chung engine conform).

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_Conform` — the check that finds broken links and contradictions · phép kiểm tìm liên kết gãy và mâu thuẫn
- Related · Liên quan: `Rule_Gate_83_HarnessFromStore` — fixing a higher layer goes through HS · sửa tầng trên đi qua HS
- Related · Liên quan: `Rule_Gate_35_OneHome` — one home for each piece · mỗi nội dung một nhà
- Related · Liên quan: `Rule_Core_80_SharedChangeImpact` — changing a shared part · sửa phần dùng chung
