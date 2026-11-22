---
version: 15
lang: vi
---
# Rule_Gate_83_HarnessFromStore — Repo dùng bản chép harness; thay đổi chung do chính repo cần nó sửa trên HS

## Luật là gì
Harness của một repo — luật, khung hiến pháp, slot cấu trúc, skill — được làm trên harness store (HS) của zemory rồi chép về
repo. Repo không bao giờ sửa bản chép: sửa ở đó thì không repo nào khác nhận được, và lần sync sau gặp một bản chép lệch với HS.
Thay đổi mà mọi repo cần thì sửa ngay trên HS, do phiên của chính repo cần nó làm sau khi người dùng duyệt; không bao giờ để đó
chờ phiên zemory làm hộ. Repo điền vào chỗ trống mà khung để lại cho nó.

## Khi nào áp
- Agent làm việc trong repo muốn sửa một file dưới `docs/agent/01_LAW`, `docs/agent/02_STRUCTURE`, `docs/agent/03_SKILLS` hoặc
  `.claude/skills`.
- Repo cần một luật, slot hay skill đang thiếu, đang sai, hoặc cần khác đi cho riêng nó.

## Phải làm gì
1. Việc hằng ngày đọc bản harness của chính repo; đọc HS khi sắp sửa một thay đổi.
2. Điền chỗ khung để trống, ngay trong repo: `Cons.md` của khung hiến pháp, skill riêng dựng trên khung skill
   (`Skill_Own_<Tên>`), giá trị các khoá của marker. Không bao giờ thêm, bớt hay đổi tên mục của khung. Mọi thay đổi trên một
   `Cons.md` — một điều cấm, một chỗ nới, một bài học vào sổ — đều viết ra cho người dùng kèm câu gốc của người dùng mà nó dựa
   vào, và chỉ ghi khi người dùng duyệt trong phiên (cờ một lần `.allow-docs-write`); agent không bao giờ tự đặt luật vào hiến pháp.
3. Cần thay đổi? Dò phần đó trên HS trước (`Rule_Gate_85_ProposeChecked`), rồi:
   a. phần đó sai hoặc thiếu với mọi repo đang dùng nó ⇒ hỏi người dùng (một câu, kèm nội dung sửa viết sẵn,
      `Rule_Gate_79_HarnessEdit`). Được duyệt ⇒ phiên của chính repo này, không phải phiên zemory:
      1. sửa phần đó trên HS (`docs_template/_Store` trong bản clone zemory) và tăng `version`;
      2. chạy `zemory impact <phần>` để liệt kê mọi repo đang mang nó;
      3. commit phần đó trong repo zemory, chỉ nêu đúng đường của mình (`git commit --only <đường>`): nhiều phiên cùng ghi HS, và
         sync giữ lại mọi bộ mang một phần chưa commit — không ráp lại bộ đó, không ghi vào repo dùng bộ đó, và nêu các đường
         nó đang chờ;
      4. chạy `zemory sync` ở repo này: lệnh ráp lại mọi thư mục bộ đã tụt sau HS, rồi đưa repo này lên; commit các thư mục bộ
         vừa ráp lại, chỉ nêu đúng các đường đó;
      5. chạy `zemory sync` ở từng repo khác mà impact liệt kê, và nhắn các phiên đang mở ở đó (`Rule_Gate_89_MessageOnlyWithWork`).
      Sync báo một bộ "đang chờ đường HS chưa commit" của phiên khác ⇒ phiên đó commit; phiên không viết ra các đường đó thì
      không bao giờ commit, trả về hay ráp chúng.
   b. chỉ repo này cần khác ⇒ một phần riêng: điều hiến pháp riêng nằm ở `01_LAW/_Cons/Cons_<Gate|Keys|Core>_1NN_<Tên>/`
      (số từ 101, không có dòng `from:`); repo tự ghi sau khi người dùng duyệt điều đó trong phiên (cờ một lần `.allow-docs-write`).
      Bản chép của phần chung không bao giờ sửa ở đây.
4. Khung thiếu mục repo cần ⇒ thêm mục đó vào khung trên HS, như bước 3a.
5. Bãi bỏ một phần thì giữ số và đánh dấu bãi bỏ; sync đưa trạng thái đó xuống mọi repo.
6. Sổ (`04_TODO.md`, `05_CHANGES.md`) là trí nhớ của repo, không phải harness: repo tự ghi, mục TODO mới theo
   `Rule_Gate_38_TodoDoor`.
7. Chiều của việc: cấp quản lý làm được việc của các repo dưới nó; repo không đẩy việc harness của mình lên trên. zemory là cấp
   quản lý cao nhất (giữ HS và bộ sync), nên:
   a. phiên repo không bao giờ nhờ phiên zemory sửa một phần, sửa hiến pháp của repo, hay chạy sync hộ; repo tự làm bước 3a;
   b. phiên zemory nhận một yêu cầu như vậy thì từ chối, và nêu đúng phần, file, dòng để repo yêu cầu tự sửa. Báo lỗi trong mã
      của zemory (một phép kiểm phán sai, một lệnh hỏng) không thuộc loại này: zemory sửa mã của mình.
8. Luật cho mọi repo do phiên khác chuyển lời người dùng ⇒ phiên của repo giữ HS làm; thay đổi chỉ phục vụ một repo thì repo đó tự
   làm.
9. Phiên của repo giữ HS không bao giờ sync hay commit một bộ vào repo khác thay cho nó, và không ghi "repo X chưa sync" vào sổ của
   mình: mỗi repo tự sync.

## Ví dụ
- Tình huống: phiên của OPS tìm ra một bước hay hơn cho skill dựng báo cáo.
- ✗ Sai: sửa `.claude/skills/pbi-white/SKILL.md` trong repo OPS — các phòng khác không bao giờ có bước đó, và lần sync sau gặp
  một bản chép lệch với HS. Cũng sai: gửi bước đó cho phiên zemory rồi chờ zemory sửa HS.
- ✓ Đúng: dò trên HS xem mọi phòng dựng loại báo cáo đó có cần bước này không. Có ⇒ hỏi người dùng; được duyệt ⇒ phiên OPS thêm
  bước vào `Skill_PBI_White` trên HS, `version` +1, chạy `zemory impact Skill_PBI_White`, chạy `zemory sync` ở OPS (các bộ mang
  skill đó được ráp lại trước), rồi ở từng repo phòng mà impact liệt kê, nhắn các phiên phòng đang mở, và commit skill cùng các bộ
  vừa ráp lại trong zemory.

## Máy kiểm
- Guard của repo chặn mọi Write / Edit dưới bốn thư mục harness, không có cờ vượt; lần điền khung phải giữ nguyên các mục của
  khung và chỉ qua khi có cờ một lần `.allow-docs-write` của người dùng; điều riêng của repo (`Cons_*_1NN`, không `from:`) qua khi có cờ một lần `.allow-docs-write` của người dùng. Ghi vào
  HS cũng cần cờ đó (`Rule_Gate_79_HarnessEdit`).
- conform `harness-edited-here`: bản chép khác bản lúc ráp thì đỏ.
- Send guard (`zemory hook send-guard`, trên `SendMessage`) chặn tin gửi tới phiên zemory nhờ sửa một phần hay nhờ sync: tên
  phần (`Rule_` · `Cons_` · `Skill_` · `Struc_` · slot `Xxx_NNN_Tên` · `HS`) đi cùng chữ đổi (sửa · đổi · thêm · bỏ · gộp ·
  cập nhật · edit · change · add · remove · merge · update), hoặc nhờ sync (sync giùm / hộ / giúp · nhờ sync). Bị chặn:
  `Cần Zemory: sửa Skill_Task_Case…`. Được qua: `Cần Zemory: conform báo sai ở case-checks.ts`, tin trả lời theo địa chỉ
  `uds:`, mọi tin phiên zemory gửi xuống.
- `zemory impact <phần>` liệt kê mọi repo đang mang phần đó và trạng thái (`current` · `behind` · `edited` · `absent`); thoát 1
  khi còn repo sửa bản chép tại chỗ.
- `zemory sync` ráp lại mọi thư mục bộ tụt sau HS trước khi ráp repo, và nói bộ nào; cổng "mọi thư mục bộ khớp HS" đỏ khi còn
  bộ tụt.
- Hai lượt sync không bao giờ cùng ghi một thư mục: lượt ráp bộ và từng lượt ráp repo giữ khoá trong `.harness-state/`; lượt sync
  gặp lượt khác đang ghi thì chờ, quá hạn thì dừng, nêu tên bên đang giữ, không ghi gì.
