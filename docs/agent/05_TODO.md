<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

## 🔬 Audit toàn diện 2026-08-23 (11 mặt, TRONG LÚC ma trận bench chạy) — 2 blocking, 5 advisory

> **Điều kiện đo — đọc trước khi tin số:** ma trận bench đang ở ô 4/4 ⇒ **không build được**
> (`npm test` kéo `clean && tsc`, xoá `dist/` dưới chân job) và **daemon TẮT có chủ đích** từ 15:35Z.
> Mọi mặt cần build / cần bề mặt sống / cần I/O nặng đều ghi **CHƯA ĐO**, không ghi "sạch".
>
> **Sạch, đã đo trong lượt này:** tsc `--noEmit` **0 lỗi** (chứng minh merge 2.2.1 dịch được) · lint 0
> · **685/685 test · 0 skipped** (92/101 file) · `conform --gate` ✓ 233 file · `validate` ✓ ·
> `todo verify` exit 0 · **git: hash CÂY local = origin** (`20c1d799`), 1002 = 1002 file, 0 commit
> sót, 0 file untracked · secret cây HEAD **sạch**, chìa dấu tay **e6fb0eff** (≠ `41d88e4d` bản đã
> lộ) · blob lịch sử lớn nhất **1,72 MB**, size-pack 23,86 MiB · **0 tin mồ côi · 0 vector mồ côi ·
> FK sạch · digest 100%** ở CẢ HAI kho (2.332/2.332 · 2.330/2.330) · neo test **210 neo, 0 chết** ·
> `doctor` xanh, kho ngoài mọi phạm vi đồng bộ · **guard chứng minh sống 3 lần trong phiên** (chặn
> `git add -A`, chặn lệnh grep chạm tên file khoá, cho push qua rồi đóng dấu cờ một-lần).

- 🔴 **(BLOCKING — ĐÃ XỬ NGAY) BACKUP BỎ ĐÓI 27,9 GIỜ, và `doctor` vẫn chấm ✓.** Đo hai đường:
  bản backup cuối là `2026-08-21 22:35` (chuỗi trước đó đều đặn 17→21/08, rồi **dừng hẳn** — không
  có bản nào của 22/08 lẫn 23/08); log chứng minh cơ chế: `14:39Z [scheduler] backup nhường embed —
  bản mới nhất 23.1 giờ tuổi`, tức **job nhúng của chính phiên này** giữ khoá ghi. Rồi 15:35Z daemon
  bị tắt cho bench ⇒ backup **không còn cả cơ hội thử**. Kho nay 282.500 tin ⇒ ~2.700 tin mới nằm
  **đúng một bản**. **Đã chụp một bản ngay: 2.082.578.432 byte / 17,3 giây.**
  **Việc còn lại (đây mới là lỗ thật):** ngưỡng đỏ của `doctor` là **2× chu kỳ** nên trọn một ngày
  không backup vẫn hiện **✓** — đúng kiểu "bề mặt nói dối" mà `02_RULES` cấm. Đề xuất: >1× chu kỳ ⇒
  cảnh báo THẤY ĐƯỢC; và ca **daemon TẮT** phải nói riêng (lúc đó backup không phải "chậm", nó
  **không tồn tại**). Đây là **cửa thứ TƯ** của cùng một bệnh (chết 4 ngày vì treo công tắc · bỏ đói
  autosync · bỏ đói 27 giờ 21/08 · nay ngưỡng che mất).
- 🔴 **(BLOCKING) Template `nonapp` bắt dự án BI/report chạy phép kiểm APP-ONLY — lỗi CÓ SẴN, và bản
  vá 23/08 của tôi GIỮ NGUYÊN nó.** Đo: `docs_template/nonapp/.claude/skills/audit/SKILL.md` nhắc
  `npm run check` · `FE ↔ BE` endpoint · `integrity_check` · `lockfile`/`dependency`. **Quyết định
  cắt ĐÃ TỒN TẠI** — bộ `cowork` chỉ còn 4 mặt (Chuẩn & docs · Nguồn trùng · Bề mặt sống · Chữ trong
  sản phẩm giao đi) đúng vì "3 mặt app-only không áp được cho non-app" — nhưng **chưa bao giờ áp cho
  template `nonapp`**. Tôi giữ 3 bộ byte-identical để bảo toàn bất biến cũ, và vì thế **nhân cái sai
  lên** (thêm mặt ⑧ lockfile/dependency + ⑨ write-gate/kho). Đây là finding của mặt ③ **NGUỒN TRÙNG**.
  **Cần user chốt:** tách bản audit riêng cho `nonapp` (bỏ mặt app-only, giữ ⑦⑨⑩ vì non-app vẫn có
  bí mật/pipeline/lịch) — và nếu tách thì `standard-parity` phải đổi từ "khớp số mặt" sang "khớp
  theo PROFILE", không thì cổng vừa dựng sẽ đỏ oan.
- [ ] **(advisory) `06_CHANGES` 298/300 dòng — thêm MỘT entry nữa là vượt trần.** `archive` phải chạy
  trước khi ghi entry kế (nó giữ `changes_keep` 180). Kèm: **7 mục `✅` còn nằm trong `05_TODO`**
  (1.733 dòng, đã phình lại từ 1.551 sau lần archive 21/08) — `archive` nay nhặt được `✅` (bản vá
  21/08), nên chạy là gọn.
- [ ] **(advisory — bẫy báo oan MỚI cho mặt ⑪) Bộ dò mojibake báo oan trên chính file DẠY về
  mojibake.** Đo: 6/245 file trúng, kiểm tay **0 thật** — tất cả là `02_RULES §Ngôn ngữ` nêu ví dụ
  ``Ã¡ · â€ · ï»¿`` và `skills/audit` khai đúng cái mẫu đó. Muốn cổng-hoá thì phải miễn chuỗi nằm
  trong backtick. Thêm vào danh sách bẫy của mặt ⑪ (nay là bẫy thứ 6).
- [ ] **(advisory) Phép dò EXPORT MỒ CÔI của lượt này TRƯỢT ca tự-kiểm HAI LẦN ⇒ mặt ③ vế đó CHƯA
  ĐO.** Lần đầu cho 402/402 "mồ côi" (vô lý); kiểm chéo bằng grep thì `cmdInit` được gọi 2 lần trong
  `cli.ts`. Bản sửa vẫn trượt ca tự-kiểm nên tôi **không ghi số nào**. Bản đo hợp lệ gần nhất: 21/08
  — **395 export đều có người gọi**. *Ghi ra vì đây đúng là giá trị của luật ⑥/⑦: ca tự-kiểm đã chặn
  tôi khỏi đưa một con số sai vào báo cáo audit, hai lần.*
- [ ] **(ghi số, không phải việc mới) Chênh dữ liệu hai kho nới lên 2.276 tin** (thật 282.500 vs song
  song 280.224) vì hook realtime ghi suốt lúc làm việc, còn kho song song đóng băng. Chỉ là đối thủ
  ở lane FTS (~0,8% kho) và **chỉ lệch một chiều** — phải ghi kèm mọi bảng bench của phiên này.

**CHƯA ĐO — KHÔNG được đọc thành sạch:** ① gate ĐẦY ĐỦ `npm run check` **và** file test
`conform-declared` của máy kia (chờ bench xong → build; tsc đã chứng minh nguồn dịch được, nên đỏ
hiện tại là **do chưa build**) · ⑤ `quick_check`/`integrity_check` trên kho + trên bản backup vừa
chụp (I/O nặng) · ⑥ bề mặt sống: daemon TẮT có chủ đích ⇒ chưa gọi endpoint, **chưa mở app nhìn tận
mắt** · ⑧ `npm run check:clone` (cần mạng + build) · ⑨ **diễn tập phục hồi — lần cuối 12/08, nay 11
ngày**, vẫn là nợ nặng nhất của `plan/18` mặt ⑨ · ⑪ nhãn/caption + song ngữ soi bằng mắt (phép
ad-hoc của tôi hỏng; vế MÁY thì cổng `i18n-ratchet` đã xanh trong 685 test).

## 🔵 BÀN GIAO 2026-08-23 — ĐỌC MỤC NÀY TRƯỚC

**Hai câu user dặn hỏi lại ở phiên sau:** ① *"còn cách nào nữa không"* (nâng recall) — danh sách đã
dựng sẵn ở §⭐ NGÃ RẼ RECALL bên dưới, **đọc nó trước khi đề xuất gì** · ② *check todo* — nhớ luật
BA NGUỒN (`02_RULES §Hành xử`), đừng đọc sổ rồi chép.

**VIỆC ĐẦU TIÊN:** 🔴 **BẬT LẠI DAEMON 4444** — nó đang TẮT từ 15:35Z (tôi tắt cho bench). Hệ quả
đang chạy: `scheduler` không quay ⇒ **backup không có cả cơ hội thử**, và tồn nhúng không ai lượm.
`zemory ui` là bật. Kèm: bật lại `autosync` + `scheduler` (`POST /set-autosync?on=1` ·
`/set-scheduler?on=1`) — chúng TẮT từ 19/08 vì đợt kho song song, mà đợt đó **đã kết thúc**.

**Trạng thái máy lúc chốt (đo thật):** daemon **TẮT** · kho thật **2.333 phiên · 283.782 tin ·
261.472 vector · còn 9.241** · kho song song **280.224 tin · 261.397 vector · còn 5.862** (GIỮ vô
thời hạn, user chốt) · backup mới nhất **2026-08-22T19-31-41Z** (tôi chụp tay sau khi bắt ca bỏ đói
27,9 giờ) · `package.json` **2.3.0, ĐÃ PUSH** (`5c92b32`) · sau đó **4 commit chưa push** ·
`05_TODO` 1.676 dòng · `06_CHANGES` 298 dòng trước khi thêm 2 entry hôm nay.

**Phiên này làm gì** (số đo đầy đủ: `06_CHANGES [2026-08-23]` · `[b]` · `[c]`): ① **test FULL BGE-M3**
— 4 ô bench + 2 probe T5, phán quyết **KHÔNG TRÁO** · ② đóng **5 lỗ trôi chuẩn** zemory↔template +
dựng cổng `standard-parity` · ③ **push 2.3.0** · ④ **audit 11 mặt** (2 blocking) · ⑤ luật *"xong là
đóng ngay"* + vá `closedItems` · ⑥ **corpus 68 → 108 nhãn** · ⑦ cổng lớp gộp ⇒ **giữ gộp BẬT**.

⚠ **Bảy bẫy đã trả giá phiên này — đừng dẫm lại:**
· **Thước sai đẩy máy làm việc vô nghĩa hàng giờ:** so parity bằng `messages.id` (AUTOINCREMENT
  **cục bộ**) ⇒ báo lệch 2.594 ảo. Dấu vân tay của lỗi: **lệch gần BẰNG NHAU hai chiều**; thiếu thật
  thì lệch MỘT chiều. Khoá bền là `(session_id, uuid)`.
· **`memory embed --help` / `scan --help` CHẠY THẬT** (không có `--help`); embed còn giữ
  `cli-write.lock` hàng giờ. Đừng gõ cờ để "xem thử".
· **Đưa regex qua `node -e`/`sed` bị nuốt escape — dính LẦN THỨ 6**; và dùng `|` làm dấu phân cách
  `sed` trên nội dung có `|` thì im lặng không thay gì. Chữa dứt: **viết script ra FILE**.
· **Phép dò tự viết trượt ca tự-kiểm 2 lần** (export mồ côi báo 402/402). Không có ca tự-kiểm thì
  mọi con số là rác — nó đã chặn tôi khỏi ghi số sai vào chính báo cáo audit.
· **Bộ dò mojibake báo oan trên file DẠY về mojibake** (6/245 hit, 0 thật) — phải miễn chuỗi trong
  backtick nếu muốn cổng-hoá.
· **`doctor` chấm ✓ khi backup đã 27,9 giờ tuổi** (ngưỡng đỏ là 2× chu kỳ) — bề mặt nói dối.
· **Đọc một mình thước NGHIÊM ra kết luận sai** về lớp gộp (xem `[2026-08-23c]` phần tự nhận).

## ⭐ NGÃ RẼ RECALL — "còn cách nào nữa không" (dựng 2026-08-23 để trả lời câu user sẽ hỏi)

> Xếp theo **dư địa đo được**, không theo cảm giác. Ba thứ đã LOẠI bằng số ở cuối — đừng đề xuất lại.

- [ ] **① CỔNG "KHÔNG BIẾT" — lỗ lớn nhất còn lại, và độc lập model.** Đo lại hôm nay ở **cả 4 ô**:
  **0/18 ca âm bị chặn · 40,0 kết quả/câu · điểm đầu 0,0289–0,0292** (ngang ca dương) ⇒ hệ trả 40 kết
  quả tự tin cho câu nó KHÔNG có đáp án. `plan/17 §1.3` đã trượt cổng với `θ+margin` (chặn 5/8 + 4/10).
  **Nợ chặn nó đã bớt một nửa:** §4.2 đòi lớp nhãn `keyword` — nay **12 → 23 nhãn**. Còn §4.1 (bộ âm
  GIỮ RIÊNG rộng hơn). Hướng chưa thử: chấm bằng **ĐỘ ĐỒNG THUẬN giữa ba lane** thay vì khoảng cách
  riêng lane vector.
- [ ] **② TRẦN POOL — `@40` mới 46% (108 nhãn).** Hơn nửa số câu đáp án **không vào nổi pool**, nên
  mọi lớp xếp-lại đều vô nghĩa với phần đó (bench tự đo: chỉ **15/108** câu có đáp án trong pool mà
  ngoài top-10). Đây là chỗ duy nhất đáng chi giờ máy. Ứng viên: **ColBERT/late-interaction** (hồ sơ +
  điều kiện mở lại ở §🔄 ColBERT — kẹt ở model VI license sạch, đĩa 10–30×).
- [ ] **③ Lớp `tool_result` — yếu nhất mà ĐÃ tốn công nhúng.** 25 nhãn mới cho `@10` **20%**, MRR
  **0,070** (thấp nhất trong 4 lớp) trong khi lớp này chiếm ~28% kho và có vector 99,8%. Nó thiếu
  **trigram** (trigger v21 vẫn loại). Mở trigram cho nó = MIGRATION dựng lại bảng, **không tốn giờ
  nhúng** — và bge cho thấy lớp này CÓ dư địa (25→38% khi đổi không gian vector).
- [ ] **④ Ô nhập "cách nói khác" trên UI** (T5 cho NGƯỜI dùng) — backend sẵn (`/memory-search?also=`).
  Nhưng đo 23/08: T5 **tụt** ở thước nghiêm ở cả hai kho, và biến thể viết MÙ không tái lập được lãi
  của §1.1b ⇒ nếu làm thì **phải kèm hướng dẫn tại chỗ**, ô trống là bẫy. Cần trình duyệt thiết kế.
- [ ] **⑤ Reranker ĐA NGỮ** — `bge-reranker-base` là model zh/en trên kho tiếng Việt. Nhưng nhớ TRẦN:
  chỉ 15/108 câu có đáp án trong pool mà ngoài top-10 ⇒ đó là **toàn bộ** dư địa của mọi reranker.
  Và giá hiện tại 43–59 s/truy vấn.

**ĐÃ LOẠI bằng số — đừng đề xuất lại:** **BGE-M3** (`[2026-08-23b]`: prose −21 điểm, 1,8× chậm) ·
**tắt lớp gộp** (`[2026-08-23c]`: cổng bất khả thi về nguyên tắc, tương đương cầm lái ⇒ giữ BẬT) ·
**T5 bật mặc định** (tụt ở nghiêm cả hai kho) · Qwen3-Embedding · Qwen3-Reranker (29 s/truy vấn) ·
lai hai model (mọi cặp trong sai số) · tiền tố ngữ cảnh cấp phiên (`plan/17 §2.2`) · LLM 0,6B sinh
biến thể (`§3b`, tệ hơn cả một truy vấn).

## 📌 Việc còn MỞ tách ra từ các khối đã đóng (tách 2026-08-23 lúc chốt phiên)

> Bốn mục dưới đây nằm LẪN trong ba section `## ✅` đã xong. Archive cả khối là **nuốt việc**, nên
> tách ra đây rồi mới dời phần đã xong đi. Ngữ cảnh gốc của từng mục vẫn tra được ở
> `archive/05_TODO.md` (`zemory plan search`).

- [ ] **(chờ user) MỖI REPO KHÁC LÀM MỘT CHUYẾN 3 LỆNH** — `zemory sync` (nhận skill mới `write-style`,
  gap-fill file thiếu) → `zemory hook guard` (2 đợt vá 20/08: PowerShell + `.git/`-path + `*.env`) →
  `zemory doctor` (tự kêu nếu guard còn lỗi thời). Repo CÙNG máy làm được NGAY (CLI là junction);
  máy kia chờ push. ⚠ 2 dòng đăng ký skill (`04_SKILLS`+`AGENTS`) sync KHÔNG tự thêm (file-wins) —
  `conform` bên đó sẽ nhắc, agent bên đó tự thêm. Không tự sang sửa (`02_RULES §Phạm vi`).

- [ ] **(ĐÃ CHẠY PHÉP THỬ điều 15 — 2026-08-21, user hỏi "40 ngôn ngữ opt thêm được không") —
  KẾT LUẬN: cơ chế opt-thêm ĐÚNG là rẻ, nhưng 36 grammar sẵn có KHÔNG khớp nhu cầu; SQL bị
  chặn ở wasm.** Số đo:
  · `node_modules/tree-sitter-wasms` (Unlicense, đã cài) mang **36 grammar** (50 MB), zemory
    mới nạp 4. Nạp thử 5: **bash/java/go/rust LOAD OK cùng ABI 0.20.8 · ruby LOAD FAIL** —
    fail-open đỡ được, đúng trực giác user "không hại chất lượng" ở tầng nạp.
  · Nhưng "hỗ trợ một ngôn ngữ" là **BA tầng**, grammar chỉ là tầng 3: ① `SRC_EXT` bộ quét
    file (hiện chỉ ts/js/py — file .java/.sql còn không thành node) · ② cạnh import (regex
    per-language) · ③ walker symbol (bash/java/go tình cờ khớp tên node hiện tại; **rust khớp
    0**; mỗi ngôn ngữ cần mapping riêng).
  · **Rủi ro chất lượng THẬT nếu mở tầng ① mà thiếu tầng ②:** node mới toàn cô lập ⇒
    `isolated_pct` hiện **29,4% / trần 30%** — đỏ oan gần như chắc chắn.
  · **Estate đối chiếu:** 36 grammar ∩ nhu cầu thật ≈ ∅ (không java/go/rust); thứ CẦN là
    **SQL (60 file)** + PS1 (15) thì gói KHÔNG có; `@derekstride/tree-sitter-sql` (MIT) npm
    **không kèm wasm prebuilt** — muốn dùng phải tự build emscripten + khớp ABI 0.20.8.
  **Việc còn mở (chờ user chốt có đáng không):** một buổi build-thử wasm SQL + mapping 3 tầng
  + parse thử trên chính 60 file thật, cổng đạt = ERROR-node thấp + fitness không đỏ oan
  (thêm ngôn ngữ mới thì node của nó phải được miễn/điều chỉnh trần isolated). Không gấp.

- [ ] **Neo đo tiến độ — ghi ra để đừng đếm sai lần nữa:** trong bảng bóng `vec_chunks_rowids`,
  **`rowid` mới là id tin**, cột `id` bỏ trống (NULL). Đếm bằng `vec_map` chỉ ra tin bị CHUNK
  (5.874 hàng), không phải toàn kho. Tự kiểm đúng: 180.697 hàng chính + 5.874 chunk = 186.571.

- [ ] **CÂU HỎI đang chờ chính 3 phiên đó trả lời — bộ chuẩn Cowork có bị CẮT QUÁ TAY?**
  Nguyên văn user (`GM #2136043`, 2026-07-30): *"bộ cowork rút gọn là lúc t làm việc bên cowork của
  claude, bên đó bàn là để **tiết kiệm token khi load**, mới loại bỏ khá nhiều, vì **cowork ko có bộ não
  global như hệ claudecode** nên nó ko chứa nhiều thông tin để nén dc… nhưng **tui ko nghĩ là nó lại cắt
  quá nhiều như vậy**… t cần bạn tra gm để kiểm tra **đã nói gì và đã quyết định ntn**"*.
  **Nghi vấn cụ thể nhất:** bộ cowork **không có `03_STRUCTURE`** (chỉ `01_CONSTITUTION`·`02_RULES`·
  `05_TODO`·`06_CHANGES` — đo `GM #2136037`), trong khi user khẳng định (`#2136034`) *"logic ban đầu của
  tui chính là để 03 làm luôn công việc của dictionary… ý định ban đầu là hợp nhất vào 1 file"* và 03
  vốn **vừa là cây thư mục vừa là mô tả từng dòng** (`#2136039`·`#2136041`).
  ⇒ Cần **quyết định gốc** (cắt gì · vì sao) để chấm "cắt này có lý do token thật hay quá tay".
  *(2026-07-31: user sẽ COPY THẲNG nội dung từ Cowork sang thay vì chờ capture.)*

## 🔴 `memory embed` VÀ `memory scan` NHẬN CỜ LẠ RỒI CHẠY THẬT — bắt 2026-08-22 (chiều muộn)

**Cùng họ với `archive` vừa vá `[2026-08-22b]`, nhưng ở lệnh ĐẮT HƠN NHIỀU.** Đo trực tiếp: gõ
`memory embed --help` ⇒ nó **không in trợ giúp** mà khởi động job nhúng thật (bắt được pid 4544
đang chạy `dist/cli.js memory embed --help`, in đúng dòng *"building the vector index …"*), và
`memory scan --help` ⇒ **quét + nạp thật** (nạp tin mới vào kho, ghi `cli-write.lock` nhãn
`scan`). Cờ lạ bị bỏ qua âm thầm thay vì bị từ chối.

**Vì sao nặng hơn ca `archive`:** ① `embed` là job HÀNG GIỜ và nó **giữ `cli-write.lock`** ⇒ một
lần gõ sai cờ là chiếm khoá, cản job khác và bỏ đói `backupTick` (đúng đường đã gây ra ca BLOCKING
27 giờ ngày 21/08) · ② cùng bề mặt đó có `--rebuild`, tức lệnh **XOÁ nguyên chỉ mục véc-tơ** —
một lệnh mà cờ lạ được cho qua thì không có đường "xem trước" nào an toàn · ③ không có `--help`
thật nên người dùng buộc phải đoán cờ, mà đoán sai là chạy thật.

- [ ] **Vá:** cờ lạ ⇒ usage + `exit 1`, **không ghi byte nào** — đặt chốt ở **tầng hàm** như bản vá
  `archive` (`ArchiveOptions`, chốt ngay sau khi ĐẾM) để mọi người gọi đều có đường xem trước.
  Phủ ít nhất `embed` · `scan` · `digest` (ba lệnh heavy-write). Cổng: ca `--help` phải exit≠0 **và**
  kho không đổi byte · **ca ÂM** (không cờ ⇒ vẫn chạy thật) · ca tầng CLI chạy `dist/cli.js` trên
  kho tạm. Đột biến: trả về hành vi cũ ⇒ đỏ.
  ⚠ **KHÔNG vá trong lúc job nhúng đang chạy** — `npm run build` = `clean && tsc`, xoá `dist/`
  dưới chân job (bẫy đã ghi 12/08). Làm sau khi ma trận bench xong.

## 🔵 BÀN GIAO 2026-08-22 (chiều) — ĐỌC MỤC NÀY TRƯỚC

**Việc ĐẦU TIÊN của phiên sau — user chốt: "phải TEST FULL hệ mới".** Lượt đo bước ③ hôm nay
**chỉ chạy MỘT cấu hình** nên KHÔNG kết luận được; đừng đọc số ở `plan/19 §4b` thành phán quyết.
Bốn thứ còn thiếu, làm đủ mới gọi là full:

- [ ] **① Bù dữ liệu cho kho song song TRƯỚC KHI so** — nó thiếu **~9.600 tin** (269.769 vs
  279.363) nên hai kho chưa cùng dữ liệu; số của bge đang được *ưu ái nhẹ* (ít đối thủ hơn).
  Chạy: `GLOBAL_MEMORY_DB=<bgem3> zemory memory scan` → `… memory embed` (ước ~1,5–2 giờ ở
  637 ms/tin). **Đừng bench trước bước này** — so trên hai tập dữ liệu khác nhau là so lệch.
- [ ] **② Ma trận 4 ô × 2 kho**: `{gộp BẬT, gộp TẮT} × {rerank TẮT, rerank BẬT}`. Hôm nay mới
  đo 2 ô đầu (`--no-rerank`). Lệnh: `memory bench --recall` (có rerank) và `--no-rerank`, biến
  `ZEMORY_COLLAPSE=0` để tắt gộp. **Máy tĩnh, daemon TẮT** (ONNX tranh CPU là số hỏng).
- [ ] **③ Đa-truy-vấn (T5)** — đòn mạnh nhất theo `plan/17 §1.1b` mà bench KHÔNG chạy: bench chỉ
  gửi một truy vấn. Phải dựng probe **sao chép nguyên tham số** `searchHybrid(q,{limit:40,
  all:true,rerank:false})` rồi thêm `also[]`; probe thiếu `all:true` từng cho **3 kết luận sai**
  (bẫy 10/08). Cách rẻ nhất: dùng lại `runRecallBench` như script
  `scratchpad/prose-diag.mjs` của phiên này (nó trả `ranks[]` từng câu).
- [ ] **④ Ca ÂM + mắt người**: 18 ca âm ở MỖI ô của ma trận (hôm nay: 0/18 chặn ở cả hai kho,
  không đổi) · daemon thứ hai CHỈ-ĐỌC `ZEMORY_UI_PORT=4445 GLOBAL_MEMORY_DB=<bgem3>` để nhìn
  tận mắt · user tự gõ so tay (`plan/19 §4`).

**Trạng thái máy lúc chốt (đo thật):** daemon **pid 25608 · 2.2.0** · `autosync`/`scheduler` TẮT ·
`realtime`/`autostart` BẬT · kho thật **279.363 tin · 257.072 vector · quick_check ok** · kho song
song **269.769 tin · 257.006 vector · 0 remaining trong phạm vi** · job embed **ĐÃ XONG** (log tự
chốt `DỪNG: không còn tin nào để nhúng`, cả wrapper lẫn con đã thoát) · cây git sạch · **2 commit
chưa push** (`ee6a251` · `0613044`) · `package.json` **2.2.0** (đã push mốc 2.2.0 trước đó).

**Phiên này làm gì:** ① audit 3 lượt (1 BLOCKING backup bỏ đói + 7 advisory) · ② vá backup **hai
đợt** · ③ parity cây↔graph · ④ mặt audit ⑪ + **luật "chữ người dùng đọc"** vào `02_RULES` + 4 bộ
template · ⑤ cổng i18n mở sang HTML + vá 21 chỗ + móc `data-i18n-aria` · ⑥ vá 2 lỗi CÓ SẴN (test
hẹn giờ `recency` · `writeFileSync` trần) · ⑦ vá 2 cổng tự bẫy (`archive` nuốt cờ · guard đọc tên
file thành lệnh push) · ⑧ **gate ĐẦY ĐỦ `npm run check` chạy lại được lần đầu từ 15/08: exit 0** ·
⑨ bench A/B một phần (§4b).

⚠ **Bẫy đã trả giá phiên này:**
· **Escape qua shell bị nuốt 4 LẦN** (`node -e` với `\\`, heredoc, `cd &&`, và **bash ăn `$_`/`$p`
  khi gọi PowerShell lồng trong bash**). Chữa: viết script ra FILE (Write/Edit), và cần PowerShell
  thì gọi **tool PowerShell**, đừng lồng trong bash.
· **`npm run check | tail -40` làm mất con số ca test** — gate PASS (exit 0) nhưng không chụp được
  `pass/fail`. Lần sau đừng pipe qua `tail` khi cần số.
· **Bench khi BẬT gộp là so lệch giữa hai kho** — lớp gộp dùng vector nên ngưỡng 0,85 hành xử khác
  nhau ở hai không gian; muốn so model thì phải `ZEMORY_COLLAPSE=0` (bằng chứng: FTS trùng khít).

## 🔵 BÀN GIAO 2026-08-22 (sáng) — (khối cũ, giữ để tra)

**Trạng thái máy lúc chốt (đo thật, không chép sổ):** daemon **pid 1928 · 2.1.0** (restart 2 lần
trong phiên — mọi bản vá ĐANG SỐNG) · `autosync` **TẮT** · `scheduler` **TẮT** · `realtime` +
`autostart` BẬT · kho thật **278.207 tin · 2.327 phiên · 257.072 vector · `quick_check ok`** ·
kho song song **252.229 vector** · backup mới nhất `2026-08-21T15-35-29Z` · cây làm việc **32 file
đổi/mới, CHƯA commit** · **11 commit chưa push** · `package.json` **2.1.0**.

**🔥 JOB EMBED VẪN CHẠY** — wrapper pid 800 + con pid 21372 (lượt 58). Đích ước ~253.900 ⇒ còn
~1.700 vector. Wrapper tự thoát khi 2 lượt liền không thêm gì. **Đừng chạy `npm run check`** (khoá
`test` kéo `npm run build` = `clean && tsc`, xoá `dist/` dưới chân job). Thay bằng **sweep 91 file**:
`node --test $(ls backend/test/*.test.mjs | grep -v -E "embed\.test|embed-profile|embed-scope-config|vectors\.test|rerank\.test|memory-search\.test|digest\.test")`
— **675/675 · 0 skipped** lúc chốt, và chính nó bắt 2 lỗi mà `conform`/`lint` không thấy.

**Phiên này làm gì** (số đo đầy đủ: `06_CHANGES [2026-08-21c]` · `[2026-08-22]`): ① audit 10 mặt →
1 BLOCKING (backup bỏ đói im lặng **27 giờ**) + 7 advisory · ② vá backup **hai đợt** (khoá mang danh
tính kho → rồi cờ trong bộ nhớ daemon cũng phải mang) · ③ parity cây folder ↔ graph (`isSourceLeaf`)
· ④ vá 4 chỗ docs lệch (plan 13 · plan 19 ×2 · sổ lặp khối) · ⑤ **mặt audit ⑪ + luật "chữ người dùng
đọc"** vào `02_RULES` + 4 bộ template · ⑥ cổng i18n mở sang HTML + vá **21 chỗ** + móc
`data-i18n-aria` · ⑦ bịt parity luật cho bộ cowork (thiếu 2 luật cứng) · ⑧ vá 2 lỗi CÓ SẴN mà sweep
bắt được (test hẹn giờ `recency` · `writeFileSync` trần trong `capture-hook`).

⚠ **Ba bẫy đã trả giá phiên này — đừng dẫm lại:**
· **Đưa regex/escape qua shell bị nuốt — dính 3 LẦN** (`node -e` với `\\`, heredoc, `cd &&`). Chữa
  dứt: viết script ra FILE bằng tool Write/Edit, đừng nhồi vào `-e`.
· **`zemory archive` CHẠY THẬT với MỌI cờ — nó không có `--help` LẪN `--dry-run`.** Dính HAI lần
  trong một phiên: `archive --help` archive 5 entry + 6 mục · `archive --dry-run` in đúng câu
  *"moved 2 closed item(s)"* rồi **dời thật 2 mục** (kiểm chéo: diff `archive/05_TODO.md` từ 6 lên
  8 mục `✅`, lượt chạy kế tiếp báo `0 mục để dời`). Cờ lạ bị **bỏ qua âm thầm** thay vì báo lỗi.
  Muốn xem trước thì chỉ có đường thủ công: `wc -l` + `grep -c "^- ✅"` trước/sau. *(Đã ghi thành
  mục advisory bên dưới — lệnh DỜI NỘI DUNG giữa hai file thì cờ lạ phải bị TỪ CHỐI, không cho qua.)*
· **Bộ dò tự viết báo oan là chuyện thường, không phải ngoại lệ:** 4/5 phép kiểm mới báo oan ở lượt
  đầu (chi tiết ở §MẶT AUDIT ⑪). Luật rút ra: mỗi phép đo phải in *"đã quét bao nhiêu"* và có ca
  tự-kiểm, nếu không thì "0 hit" đọc thành "sạch" trong khi bộ lọc đang hỏng.

**VIỆC ĐẦU TIÊN của phiên sau:** ① job embed xong ⇒ chạy **gate ĐẦY ĐỦ** `npm run check` (scheduler
đang tắt sẵn) · ② bench A/B plan 19 bước ③ · ③ tráo kho (chờ user ký) · ④ **bật lại `autosync` +
`scheduler`** sau tráo · ⑤ điều phối máy thứ hai (`DESKTOP-PFB157K` đang sync — plan 19 §6 đã sửa,
KHÔNG còn là việc "ngủ").

## 🔵 BÀN GIAO 2026-08-21 — (khối cũ, giữ để tra)

**Trạng thái máy lúc chốt** (đo thật cuối phiên, không chép sổ): daemon **pid 26916 · 2.1.0**
(restart 3 lần trong ngày, mọi bản vá ĐANG SỐNG) · cây làm việc **sạch** · **10 commit CHƯA push**
(`7f9977b` → `ca9ddc0`) — user chốt *"chờ embed xong push một lần"*, **số version kế do user chốt**
· kho thật **275.802 tin · 2.324 phiên · `quick_check ok`** · `05_TODO` 1.551 dòng sau `archive`
(số 2.308 ghi lúc đầu là mốc TRƯỚC khi archive chạy — đo lại bằng `wc -l`, đừng chép) ·
`06_CHANGES` 217 dòng (< trần 300).

**Phiên 21/08 làm gì** (chi tiết + số đo: `06_CHANGES [2026-08-21]` · `[b]`): ① chấm than update
pull-based (4 bề mặt, 1 phép đo) · ② vá 2 bệnh UI user báo (heal-mở-lại-tắt · công-tắc-tự-bật-tắt)
· ③ skill `write-style` ship 4 bộ template · ④ khảo sát Graphify + hấp thụ `graph path` +
god-nodes · ⑤ đa ngôn ngữ THEO KHO (detect-then-load) · ⑥ audit 2 lượt, bắt+vá 2 cấn.

⚠ **Bốn bẫy đo đã trả giá phiên này — đừng dẫm lại:**
· **`node -e` replace trên file CRLF hỏng LẶNG** — pattern `\n` không khớp `\r\n`, script in
  "đã cập nhật" mà thay 0 chỗ. Phải grep lại sau MỌI lần replace, hoặc dùng tool edit thật.
· **Heredoc `bash` NUỐT backslash** — `/\\/g` thành `/\/g` ⇒ tsc lỗi cú pháp. Code có escape thì
  viết bằng tool Write/Edit, đừng qua heredoc.
· **`splice` sổ nuốt dòng của mục KẾ BÊN** — sửa xong phải đọc lại vùng quanh, không chỉ dòng sửa.
· **`eslint .` KHÁC `npm run lint`** — bò cả `external/`+`attic/` rồi treo 25 phút; lệnh chuẩn của
  repo chạy < 1 phút. Luôn đo bằng đúng lệnh production.

🔴 **HAI CÔNG TẮC ĐANG TẮT — PHẢI BẬT LẠI SAU KHI TRÁO KHO:** `autosync` **TẮT** · `scheduler`
**TẮT** (tắt tạm vì hai kho dùng chung `data/` nên chung `cli-write.lock`; autosync 30 phút/lần
sẽ cản job embed). `realtime` + `autostart` vẫn BẬT.
Bật lại: `POST /set-autosync?on=1` · `POST /set-scheduler?on=1`.
*(User bật autosync sáng 21/08, tôi tắt lại theo lịch tráo — có hỏi và user đồng ý.)*
> 🔄 **Sửa vế *"backup vẫn chạy (đồng hồ riêng)"* — audit 22:00 cùng ngày ĐO NGƯỢC:** đồng hồ
> riêng có thật, nhưng `backupTick` nhường **im lặng** cho khoá ghi của cả thư mục `data/` ⇒ chính
> job embed kho song song đã bỏ đói nó **27,0 giờ**. Đã chụp một bản ngay (17,2 s) và vá cả ba
> tầng — xem §🔬 Audit 2026-08-21 (22:00) bên dưới.

**🔥 VIỆC ĐANG CHẠY — job re-embed BGE-M3 (plan 19 bước ②):**
kho song song `data/global_memory.bgem3.db` · **237.904 / ~253.900 vector (93,7%, đo cuối phiên
21/08 — đích ước theo tỉ lệ phủ 94,1% của kho thật, KHÔNG phải 100% số tin)** · dấu
`{1024, bge-m3-v1, int8}` · wrapper pid 800 + con embed đang sống (phóng qua `.vbs` nên **sống
qua lần đổi phiên**, đã chứng minh nhiều lần). Log `data/logs/bge-embed.log`; **tiến độ đo bằng
`vectorCount(<bản sao>)`, KHÔNG đọc log** (log trễ hơn kho: nó chỉ in khi tiến trình lượt đó thoát).
**54 lượt đã đóng, tất cả exit 0** — còn ~16.000 vector ≈ **4 lượt**.
Nhịp dao động theo tải máy: 17–20 phút/4.000 lúc rảnh → **151–216 phút** lúc bận (đuôi toàn tin
dài + máy chia CPU với gate/audit). **Đừng lấy nhịp lúc bận làm mốc ước.**
**Kho THẬT không bị đụng:** 257.072 vector · `{768, gemma-prompt-v1, fp32}` · daemon phục vụ bình thường.

✅ **BẮT LÚC CHỐT PHIÊN 21/08 — `archive` chưa bao giờ nhặt được mục nào (sổ nói khác code).**
Cơ chế archive-mục-đã-đóng (dựng 29/07 để trị bệnh "107 mục xong chiếm 46% file") chỉ biết dấu
`[x]`, còn quy ước viết THẬT của repo là `- ✅ **…**` ⇒ đo được: **0 mục `[x]` / 59 mục `✅`**,
`05_TODO` phình **2.327 dòng** mà `archive` báo *"nothing to do"* mỗi lần. Kèm bề mặt nói dối:
in *"under threshold — left alone"* trong khi code KHÔNG có ngưỡng cho file này (comment ngay
trên đầu hàm nói rõ). **Vá:** `ITEM` nhận `✅` ngang `[x]` (một hằng `CLOSED`), sửa câu in.
**Thử trên BẢN SAO trước** (mục ✅ có thể chứa mục con `[ ]`) rồi mới chạy thật: dời 59 mục,
**2.327 → 1.551 dòng (−33%)**, và **60 `[ ]` + 10 `[~]` còn nguyên · 0 việc mở bị nuốt** ·
khối bàn giao/lịch còn đủ · có `.bak` ở `attic/harness-bak/`. Gate trong `archive-todo.test.mjs`
(8/8), đột biến trả `ITEM` về chỉ-`[x]` ⇒ đỏ.

**📋 LỊCH SAU-EMBED — hàng đợi MỘT thứ tự, user chốt 2026-08-21 ("cứ xếp lịch đi"):**
1. **Kiểm job xong THẬT** — `vectorCount` đứng yên + wrapper tự thoát (nó chỉ dừng khi 2 lượt
   liên tiếp không thêm vector); đừng tin log, đếm SQL.
2. **Vá 2 advisory audit 21/08 (user đã gật):** ① nhánh XOÁ của guard quét theo SEGMENT như
   nhánh git `[2026-08-20d]` (+ ca âm `rm x && echo "…\.env"` vào `guard-tool-matrix`, đột biến
   chứng minh đỏ) · ② gate NỘI DUNG cho `policy.json` ship cowork (so 2 khoá
   `secret_names`/`secret_allow` với bộ sinh — KHÔNG so cả file, cowork khác `protected_write`
   có chủ đích). Làm TRƯỚC lượt gate đầy đủ để gate phủ luôn 2 bản vá; xong sinh lại
   `hook guard` + chép bản ship (template-parity canh).
3. **Trả nợ "chưa đo" của audit:** TẮT daemon 4444 (embed test OOM nếu để) → `npm run check`
   ĐẦY ĐỦ (scheduler đang tắt sẵn) → bật lại daemon → đảo mắt UI bằng mắt người/CDP ·
   (tuỳ sức: `check:clone` cần mạng · diễn tập phục hồi — nợ plan 18 ⑨).
4. **Plan 19 bước ③** — bench A/B hai kho (2 thước · theo lớp · 18 ca âm, máy tĩnh).
5. User tự gõ so tay bao lâu tuỳ ý → **CHỜ USER KÝ** → tráo (bước ④, script một-lần, tag
   `pre-bgem3-swap`, bản lùi 768 có án tử ~5 ngày).
6. **Sau tráo:** bật lại `autosync` + `scheduler` (`POST /set-autosync?on=1` ·
   `/set-scheduler?on=1`) · `scan`+`embed` bù · nhân dịp kho đóng băng đo luôn mục
   **717 cửa sổ phụ chênh** (dịp miễn phí, đã ghi ở §Audit 12/08) · push đợt version kế
   (user chốt số) · archive bớt khối ✅ của `05_TODO` (advisory ④ audit 21/08).

**Phiên 19–20/08 làm gì** (chi tiết + số đo: `06_CHANGES [2026-08-20]` → `[e]`):
① chọn BGE-M3 bằng ma trận 6 embedder × 12 lane + bootstrap 2.000 lượt · ② cổng mặt audit ⑧
(license + clone sạch) · ③ vá guard hở tool `PowerShell` (báo từ repo PBI) · ④ vá cảnh báo
context 95% sai trên phiên 1M · ⑤ vá flag `.allow-*` bị tiêu thụ khi lệnh không chạy · ⑥ job
`scratchTick` tự dọn thư mục nháp + luật FILE TẠM PHẢI CÓ ĐƯỜNG CHẾT · **⑦ (chiều)** vá 2 cổng
báo oan từ báo cáo PBI (`conform` non-app · guard đọc `.git/hooks/*` thành lệnh git) + lỗ
`*.env` thiếu trong mẫu secret — báo cáo bên kia đúng 1,5/2, sửa KHÁC cả hai đề nghị của họ
(`[d]`) · **⑧ (chiều)** restart daemon 2.0.0 + doctor thêm 3 mặt (guard lỗi thời · cloud · rác
nháp) + đóng mục "số phiên nhảy" bằng GROUP BY (`[e]`).

**Bốn bẫy đã trả giá phiên này — đừng dẫm lại:**
· **Phép thử NHỎ trước job dài không phải nghi lễ:** 20 tin bắt được lỗi hợp đồng `vec_config`
  bị bỏ qua ⇒ cứu **44 giờ** chạy sai (embed bằng Gemma trong kho đóng dấu BGE, im lặng).
· **`Buffer.from(base64).buffer` là POOL dùng chung của Node** — đọc `.buffer.slice(0)` ra 16.384
  số rác/vector; lộ ra vì lane đọc-từ-đĩa tụt về đúng mức NGẪU NHIÊN. Phải cắt
  `[byteOffset, byteLength)` + copy.
· **Gọi model THEO LÔ vừa chậm hơn vừa DỊCH vector** (bge 5,6× · gemma 2,3×; cos 0,982/0,962).
· **Test không được đụng tài nguyên THẬT của repo:** gate flag bản đầu dùng `docs/hooks/.allow-push`
  thật ⇒ làm ĐỎ một file test chạy song song (`node --test` chạy các file cùng lúc).
· **(chiều) `node -e` replace trên file CRLF là HỎNG LẶNG:** pattern có `\n` không khớp `\r\n`,
  script in "đã cập nhật" mà thay 0 chỗ — phải kiểm lại bằng grep sau MỌI lần replace, hoặc dùng
  công cụ edit thật. Cùng họ với bẫy "regex qua shell bị nuốt escape" (dính lần thứ n+1 trong
  cùng phiên, khi đột biến guard bằng one-liner).
· **(chiều) Log của job ghi giờ UTC, máy hiển thị UTC+7** — đọc lướt sẽ thấy "7 giờ không ai
  chạy" và kết luận job chết trong khi nó đang chạy lượt kế. Đối chiếu mốc bằng epoch/`Z`.
· **(chiều) NHÃN ca test chứa chuỗi `git …push` cũng bị guard soi như lệnh thật** — chính lệnh
  đo ma trận bị hook chặn vì tên ca `<git> push`. Ghép mảnh cả NHÃN, không riêng payload.

**Ba đường cụt / thứ đã LOẠI có số — đừng đề xuất lại:** Qwen3-Embedding (thua cả Gemma trên kho
này) · Qwen3-Reranker (MRR khá nhưng **29 s/truy vấn**) · **lai hai model** (mọi cặp nằm TRONG
sai số — bootstrap 2.000 lượt) · chỉ mục ColBERT đợt này (dense-mix mua được ~hết giá trị với
1/300 đĩa) · tín hiệu TTL cache để đoán cửa sổ context (cả 6 phiên đều 1h, không tách được).

⚠ **Trần của phép đo, đừng đọc số nhỏ thành thứ hạng:** corpus 68 nhãn chỉ phân biệt được ΔMRR
≥ ~0,05. Mọi chênh lệch nhỏ hơn thế trong các bảng của phiên này (colbert 0,375 vs bge-dense
0,378…) đều **nằm trong vùng nhiễu**.

## 🔬 MẶT AUDIT ⑪ + LUẬT "CHỮ NGƯỜI DÙNG ĐỌC" — 2026-08-22 (user nêu 5 phép kiểm còn thiếu)

> Chi tiết + số đo: `06_CHANGES [2026-08-22]`. Ở đây chỉ giữ **việc còn mở** và **thứ đã loại**.

**Đặt sai nhà lần đầu, user chỉnh:** *"cái này tính ra là skill khi gọi chứ cũng ko phải là luật,
áp lên mọi bộ harness"*. NORM nay ở `02_RULES §Ngôn ngữ` (4 ràng buộc) + ship **cả 4 bộ template**;
skill `audit` mặt ⑪ chỉ giữ **cách đo + bẫy báo oan**. Ma trận 4 luật × 5 bộ rule: đủ ✓.

- [ ] **(advisory) Phép "TỪ LẶP LIỀN" chưa đủ chính xác để thành cổng.** Đo 107 file: 15 hit, kiểm
  tay thì **0 thật** — toàn láy đôi («song song» · «bắt đầu đầu trang»), ô bảng cạnh nhau, hoặc
  chữ bị **dán liền sau khi bỏ code/đường dẫn** («scan known/deep scan»). Muốn thành cổng phải
  parse theo Ô BẢNG và có từ điển láy; chưa đáng, giữ ở dạng soi tay trong skill.
- [ ] **(advisory) `docs_template/*/skills/write-docx/reference/*` cố ý viết ASCII không dấu**
  (code Python + comment trong khối lệnh). Phép dò mặt ⑪ đếm 18 hit ở đó — **không phải lỗi**,
  nhưng nếu sau này muốn cổng-hoá phép "thiếu dấu" thì phải khai miễn cho các file đó trước.
- [ ] **(advisory) Phép "endpoint chết" cần kể CẢ nguồn CLI-gọi-qua-HTTP.** Lượt đo đầu báo
  `/gate-acquire` · `/gate-release` là "không ai gọi" — sai: chính CLI gọi chúng qua HTTP
  (`commands/memory.ts`). Đã kể trong script đo; nếu cổng-hoá thì đừng bỏ nguồn này.

**Đã loại (ghi kèm lý do):** · *"156 chỗ chữ Việt trong HTML"* — báo oan: chữ Việt trong markup là
ĐÚNG khi phần tử có móc i18n · *"46 khoá i18n chết"* — báo oan: khoá truyền qua BIẾN
(`doc:'f.doc.x'` → `t(item.doc)`), thật ra **0** · *"20 phần tử thiếu nhãn"* — báo oan: nhãn nằm ở
thẻ CON hoặc `<label>` bọc ngoài; thật ra **2**, đã vá.

## 🔬 Audit toàn diện 2026-08-21 (22:00, sau chốt phiên — job embed VẪN chạy) — 1 BLOCKING, 7 advisory

> **Điều kiện đo:** job re-embed BGE còn sống (wrapper pid 800 + con embed pid 21968) ⇒ **gate đầy
> đủ vẫn KHÔNG chạy được** (`npm test` kéo `npm run build` = `clean && tsc`, xoá `dist/` dưới chân
> job). Mọi số thời gian là CẬN TRÊN. Thay vào đó chạy: `typecheck` · `lint` · `conform --gate` ·
> `validate` · `doctor` · **cụm 33 file test độc-lập-daemon**.
>
> **Sạch, đo trong lượt này:** tsc 0 lỗi · lint 0 lỗi · `conform` ✓ (230 file · slot 19/56 · skill 9)
> · `validate` ✓ · `doctor` ✓ (guard KHÔNG lỗi thời — `guardDrift` im) · **272 test pass / 0 fail /
> 0 skipped** (33 file: graph 9 · conform/parity 5 · guard 4 · ui/i18n 3 · docs/todo 6 · khác 6) ·
> **395 export đều có người gọi** (0 mồ côi, phép đo có self-test) · `quick_check ok` · FK 0 ·
> **0 tin mồ côi** · digest **2.325/2.325** · DDL vector đúng dấu (`float[1024]` kho song song ·
> `float[768]` kho thật — phép thử kiểu "20 tin cứu 44 giờ") · **0 secret tracked** · blob lịch sử
> lớn nhất **1,72 MB** (314 MB weight đã sạch thật) · deps khớp lockfile · heartbeat daemon tươi ·
> **guard chặn THẬT** (nó chặn đúng lệnh của chính tôi khi tôi gõ tên file khoá).

- [ ] **(advisory) Advisory ④ của audit đêm 21/08 ĐÃ LÀM XONG nhưng vẫn mang dấu `[ ]`, kèm 3 số
  dòng chết.** `archive` đã dời 59 mục ngay tại chốt phiên (ghi ở chính bàn giao: 2.327 → 1.551),
  nhưng mục *"`05_TODO` đã 2.156 dòng"* vẫn mở, bàn giao vẫn ghi *"2.308 dòng"*, và số THẬT hôm nay
  là **1.562**. Ba con số cho cùng một đại lượng trong cùng một file — đúng thứ luật *SOÁT SỔ = ĐO
  LẠI* nhắm tới. (`todo verify` cũng đã lên **11 cờ** advisory, sổ còn ghi 8.)
- [ ] **(advisory) Job embed 44 giờ chạy ưu tiên `Normal`, và nhịp đã SỤP — ETA thật ~18–32 giờ,
  không phải "4 lượt".** Đo: `Get-Process 21968` ⇒ **PriorityClass = Normal** (kỷ luật ở `plan/14 §3`
  + `06_CHANGES [2026-08-14]` là *việc do MÁY tự chạy phải hạ `BELOW_NORMAL`*; job này phóng qua
  wrapper `.vbs` ở scratchpad nên **không đi qua `runStep`** — nơi duy nhất có luật hạ ưu tiên).
  Nhịp: lượt 55 mất **595,9 phút/4.000 vector** (cận trên cũ trong sổ là 216 phút); lấy mẫu sống
  hai lần cách 12,4 phút ⇒ **11,6 vector/phút** ⇒ còn ~12.800 vector ≈ **18 giờ** (theo nhịp lượt 55
  thì ~32 giờ). Hệ quả cần biết: **cả LỊCH SAU-EMBED bị đẩy ~một ngày**, và backup vẫn bị bỏ đói
  suốt thời gian đó (mục BLOCKING trên).
- [ ] **(advisory) Giả định *"chưa có máy thứ hai hoạt động ⇒ plan 19 bước ⑤ NGỦ"* ĐÃ HẾT ĐÚNG.**
  Đo: `G:\My Drive\Global Memory\global_memory.sync.lock` = `{"host":"DESKTOP-PFB157K","pid":12584,
  "at":"2026-08-21T15:07:24Z"}` và `global_memory.enc` đổi **21:42 local** ⇒ máy kia **đang sync ngay
  lúc audit**. Hai hệ quả: ① `autosync` của máy này TẮT 2 ngày nên ta **không nhận** khối của nó ·
  ② sau khi tráo BGE, kho máy kia còn `gemma-768` nên merge sẽ **từ chối vector** (đúng thiết kế
  chống kho lai, plan 19 §6) ⇒ bước ⑤ phải được điều phối **TRƯỚC hoặc NGAY SAU** tráo, không để ngủ.
- [ ] **(ghi số, không phải việc mới) `isolated_pct` = 29,6% / trần 30%** (68/230 file) — làm phép
  tính: thêm **2 file cô lập** là vượt trần (`(68+k)/(230+k) > 0,30 ⇔ k ≥ 2`). Hiện KHÔNG chặn gate
  (`npm run check` không chấm fitness trên repo thật; test fitness chạy trên repo giả) — nên đây là
  thước sức khoẻ sát nóc, không phải gate đỏ. `/memory-status` lượt LẠNH đo lại: **20,3 s** (ấm
  3,7 ms) — số mới cho mục `[~] (⑥)` đang mở, KHÔNG phải hồi quy.

**Nghi vấn ĐÃ LOẠI — ghi kèm lý do, khỏi đào lại:**
· *"FE gọi route mà `ui.ts` không có (`/set-`)"* — **báo oan**: `system.js:110` ghép chuỗi
  `zPost('/set-'+nm+…)`, route thật đủ cả.
· *"31 neo test trỏ vào đường dẫn không tồn tại"* — **báo oan**: gần hết là fixture dựng trong repo
  TẠM (`conform.test` · `graph-standard.test`…), và ca `frontend/app.html` nằm trong **COMMENT** của
  `app-ui.test.mjs:132` — chính comment đó cảnh báo trước cái bẫy này. Neo thật là
  `../../frontend/pages/app.html`, có tồn tại.
· *"`policy.json` bản ship cowork đã lệch bộ sinh"* — **đo thì CHƯA lệch**: `secret_names` ·
  `secret_allow` · `key_read_block` **khớp**; `protected_write`/`flags_dir` khác **có chủ đích**.
  Cổng nội dung vẫn thiếu (mục cũ còn mở) nhưng hiện KHÔNG có drift.
· *"chìa lộ trong lịch sử git (`share/share.key`) còn hiệu lực"* — **đã xoay**: dấu tay hiện tại
  `e6fb0eff` ≠ `41d88e4d` (bản lộ, plan 16 §8).
· ⚠ **Hai phép đo ĐẦU của chính lượt audit này HỎNG LẶNG** (ghi vì đúng luật 5): bộ lọc đường dẫn
  của tôi viết `[\\/]frontend[\\/]` nên **không khớp đường bắt đầu bằng `frontend`** ⇒ báo *"0 route
  FE"* và *"0 neo test"* — nghe như sạch. Vá rồi mới có 49 route / 135 neo. Cùng ngày còn dính
  **hai lần** nuốt escape khi đưa regex qua shell — đúng bẫy sổ đã ghi, chữa bằng viết script ra file.

**CHƯA ĐO — không được đọc thành sạch:** ① gate ĐẦY ĐỦ `npm run check` (chờ job embed xong) ·
② mở app nhìn tận mắt (cần mắt người) · ③ `check:clone` (cần mạng) · ④ **diễn tập phục hồi** — lần
cuối 12/08, nay **9 ngày**, vẫn là nợ nặng nhất của plan 18 mặt ⑨, và mục BLOCKING ở trên làm nó
đắt hơn · ⑤ bench A/B plan 19 bước ③.

## 🔬 Audit toàn diện 2026-08-21 (đêm, Fable — TRONG LÚC job embed chạy) — 10 mặt, 0 blocking, 4 advisory

> **Điều kiện đo phải đọc trước khi tin số:** job re-embed BGE đang chạy ⇒ mặt ① chỉ chạy
> tsc/lint + test KHÔNG-ONNX; mọi số thời gian là CẬN TRÊN (máy bận I/O). Gate ĐẦY ĐỦ cố ý
> chưa chạy — xem "chưa đo" cuối mục.
>
> **Sạch, đo trong phiên:** tsc 0 lỗi · `npm run lint` 0 lỗi · `conform` ✓ · `validate` ✓ ·
> `quick_check ok` · FK 0 · **0 tin mồ côi** · digest **2.324/2.324 (100%)** · vector khớp chéo
> SQL↔API (257.072) · 0 secret tracked · 0 blob mới >1MB từ `410a462` · pack đứng yên 22,93 MiB ·
> heartbeat daemon tươi (<60s) · write-lock được giữ ĐÚNG bởi con embed (label khớp, mốc tươi) ·
> app-ui 47/47 · i18n-ratchet + license-gate 6/6 · guard suite 32/32 (ma trận có ca ÂM) ·
> **6 đột biến trong ngày đều đỏ được** · 2 export mới (`guardDrift` · `NONAPP_FREEFORM_PARENTS`)
> đều có người gọi · 06_CHANGES 217 dòng < trần 300.

- [ ] **(advisory) Nhánh XOÁ của guard quét CẢ DÒNG — tên `.env` nhắc trong echo bị vạ lây.**
  Đo: `rm build.log && echo "check prod.env"` ⇒ CHẶN (không flag — nhóm secret); trong khi
  `rm .env.example` QUA (allow ăn đúng) và `rm build.log` QUA. Cùng họ đúng bug nhánh git đã
  vá `[2026-08-20d]` — sửa là quét theo SEGMENT như bên git. **User ĐÃ GẬT 2026-08-21 — nằm ở LỊCH SAU-EMBED bước 2, đừng hỏi lại.**
  *(Ghi nhận không sửa: `rm test.env` bị chặn là chặn phía an toàn có chủ đích — xoá secret là
  bất khả đảo; giữ.)*
- [ ] **(advisory) `policy.json` bản ship cowork KHÔNG có cổng NỘI DUNG** — `template-parity`
  chỉ so byte `guard.cjs` (0 dòng nhắc policy), manifest chỉ đếm dòng (46). Chiều 20/08 nó vừa
  được sửa TAY — đúng khuôn sự cố guard.cjs 11/08 mà gate byte-parity sinh ra để chống. Đề xuất:
  so 2 khoá `secret_names`/`secret_allow` với bộ sinh (KHÔNG so cả file — cowork khác
  `protected_write`/`flags_dir` có chủ đích). **User ĐÃ GẬT 2026-08-21 — LỊCH SAU-EMBED bước 2.**
- [ ] **(advisory, mục cũ thêm số mới) `/memory-status` lượt LẠNH >30s khi máy bận I/O** — curl
  timeout 30s ở lượt đầu sau restart + embed đang chạy; lượt ấm 5ms. Không phải bug mới — đúng
  mục `[~] (⑥)` còn mở; số này là cận trên lúc bận, đừng đọc thành hồi quy.
## 🔵 BÀN GIAO 2026-08-15 — ĐỌC MỤC NÀY TRƯỚC

**Trạng thái máy lúc chốt** (đo thật, không chép sổ): kho **245.419 vector · coverage 99,9% ·
remaining 321** *(số này DAO ĐỘNG chứ không về 0 khi đang làm việc — hook ghi ~23 tin/phút,
nhanh hơn tốc độ nhúng; đừng đọc thành lỗi)* · `lastSync` **19:04:40**, Drive **100%** ·
`rerank` TẮT · `hybrid` BẬT · git **sạch, đã push** (`189fe63`) · **59 mục** chưa đóng.

⚠ **DAEMON ĐANG CHẠY MÃ CŨ:** `/ping` báo **v1.5.14**, đĩa đã **1.5.20**. Ba đợt sửa sau lần
restart cuối (chip rail · chuẩn `client/` · dọn export) **chưa vào bản đang chạy**. Frontend thì
Ctrl+R là thấy; backend phải **khởi động lại daemon**.

**Phiên 15/08 làm gì** (chi tiết: `06_CHANGES [2026-08-15]` · `[2026-08-15b]`):
① chip sức khoẻ ở rail **bấm được** + nói TÊN thứ đang cảnh báo · ② chuẩn **`frontend/api/` →
`frontend/client/`** + đồng bộ sang 3 repo khác · ③ dọn **11 export thừa** · ④ soát sổ **66 → 59**.

**VIỆC ĐẦU TIÊN của phiên sau:** ✅ **ĐÃ LÀM 2026-08-15 (đêm)** — daemon restart (pid 20820,
`/ping` báo **v1.5.21**); bản vá ② client/ verify ở tầng chuẩn (`structure-sync` xanh, zemory
KHÔNG có folder `frontend/client/` là ĐÚNG — chưa có lớp gom lời gọi, không tạo folder rỗng);
bản vá ③ verify bằng gate xanh; bản vá ① (chip rail) verify Ở TẦNG CODE (key `rail.needAttn`
có ở cả 2 dict) — **mắt người CHƯA nhìn**, user đảo mắt khi mở app. Chi tiết: §🔬 Audit 15/08 dưới.
⚠ Muốn chạy gate sạch thì **tắt `scheduler` tạm** — `preflight` sẽ chặn vì backlog embed gần
như luôn dương; hoặc chấp nhận `skipIfBusy` bỏ qua ~10 ca embed (**"xanh có kèm skipped" ≠ "xanh
phủ đủ"**).

**Ba đường cụt đã thử — ĐỪNG đâm lại:**
· dịch 45 chuỗi `shell.js` → vô ích (bảng dự phòng; nguồn thật là `/standard-spec` đọc
  `03_STRUCTURE.md`, trả **91 dòng** tiếng Việt) · dùng `services/` cho slot FE → trùng nghĩa
  `backend/src/services/` · "chờ embed xong rồi làm X" → điều kiện không bao giờ đạt.

**Bẫy phép đo đã trả giá NHIỀU LẦN phiên này** (đọc trước khi tin bất kỳ con số quét nào):
· đưa regex qua **shell/sed** ⇒ escape bị nuốt — **4 lần** trong một phiên; chữa dứt bằng `split()`
· quét export quên `backend/test/` ⇒ báo oan 53; thiếu cờ `g` ⇒ báo oan **13/13**
· chạy gate lúc daemon bận ⇒ **đỏ giả** (`drive-sync` đỏ, chạy riêng thì 8/8).

## 🔴 GUARD LỚP ① HỞ NỬA CỬA TRÊN WINDOWS — ĐÃ VÁ 2026-08-20 (báo từ repo `PBI_SasinFlow_Rebuild`)

> Báo cáo từ phiên repo khác, **đã tự đo lại và ĐÚNG** — tái lập nguyên vẹn trên chính zemory.

**Lỗ:** `guard.cjs` phân nhánh theo `tool_name` và chỉ biết 5 tên (`Write`·`Edit`·`NotebookEdit`
·`Read`·`Bash`). Phiên Claude Code trên Windows có SẴN tool **`PowerShell`** làm đúng việc của
Bash ⇒ **mọi nhánh gác LỆNH vượt được sạch chỉ bằng cách đổi tool.** Đo trước khi vá:

| tool | `rm -rf docs/agent` | `Remove-Item -Recurse` | `git push` | `git add -A` |
|---|---|---|---|---|
| `Bash` | CHẶN | CHẶN | CHẶN | CHẶN |
| **`PowerShell`** | **cho qua** | **cho qua** | **cho qua** | **cho qua** |

**Vì sao không gate nào bắt được:** regex nhận diện VẪN ĐÚNG (nhánh Bash bắt cả cú pháp
PowerShell) — chỉ cái cổng TÊN chặn sai. Mọi test cũ chỉ gửi `tool_name: "Bash"` nên xanh hết
trong khi cửa mở toang. *Nghiêm trọng thêm: phiên đang chạy của chính tôi có tool PowerShell và
đã dùng nhiều lần — lỗ này mở suốt.*

**Đã vá ba tầng:**
1. **Nhận theo HÌNH DẠNG, không theo tên** — có `tool_input.command` ⇒ soi như lệnh shell, bất kể
   tool tên gì. Gác theo danh sách tên là cuộc đua không thắng: host thêm tool terminal mới là lỗ
   mở lại. Kèm `MultiEdit` vào nhánh ghi.
2. **`GUARD_MATCHER` thành hằng số một-chỗ** (`guard-gen.ts`) và `zemory hook guard` nay **in kèm
   matcher đầy đủ** — trước chỉ in `PreToolUse → node …/guard.cjs`, người nối phải tự đoán, và
   repo báo cáo đoán thiếu đúng `PowerShell`. Hai tầng hỏng đều im lặng: guard không hiểu tên ⇒
   cho qua · matcher thiếu tên ⇒ host không bao giờ gọi guard.
3. **Bản ship cho bộ cowork** (`docs_template/cowork/nonapp/hooks/guard.cjs`) chép lại từ bản sinh
   + cập nhật số dòng trong manifest BOOTSTRAP (282 → 291). *Gate `template-parity` đã bắt đúng
   việc này — nó đỏ ngay khi bản ship trôi khỏi bản sinh.*

**Gate mới `guard-tool-matrix.test.mjs` (4/4)** — soi MA TRẬN `tool × lệnh` thay vì từng regex,
có ca tool-lạ-chưa-biết-tên, có ca kiểm matcher, và **ca ÂM** (6 lệnh thường ngày × 2 tool phải
được cho qua — luật 7). Đột biến chứng minh đỏ được: trả guard về chỉ-nhận-`Bash` ⇒ **2 đỏ**;
bỏ `PowerShell` khỏi matcher ⇒ **3 đỏ**.

⚠ **File guard KHÔNG tự làm mới** — `generateGuards()` chỉ chạy khi gõ `zemory hook guard`
(`sync`/`doctor`/`init` không gọi). Mọi repo đã cắm guard đang giữ bản HỞ cho tới khi có người
chạy lại lệnh đó **và** thêm `PowerShell` vào matcher trong `.claude/settings.json`.
- [ ] **(chờ user) Báo các repo khác đã cắm guard tự sinh lại** — `PBI_*`, SasinFlow, SasinHarvest,
  SasinInfra… Không tự sang sửa (`02_RULES §Phạm vi project`); repo báo cáo nói phiên bên đó sẽ tự chạy.
## 🔥 TRIỂN KHAI BGE-M3 — user chốt 2026-08-19, spec: `docs/plan/19_bge_swap.md`

> User quyết sau ma trận 6 embedder + bootstrap: **đổi Gemma-768 → BGE-M3 int8-1024, qua KHO
> SONG SONG (`data/global_memory.bgem3.db`), kho đang xài KHÔNG đụng** cho tới khi bench thắng
> và user ký tráo. Toàn bộ thiết kế + kỷ luật song song + đường lùi ở plan 19 — ĐỌC plan trước
> khi làm bất kỳ bước nào.

- 🔴 **PHÁT SINH khi làm ①: GỌI THEO LÔ vừa CHẬM HƠN vừa LỆCH VECTOR — và KHO ĐANG CHẠY dính
  NẶNG HƠN kho mới.** Đo 2026-08-19 (16 tin thật, cùng máy, cùng model, khác đúng đường gọi):
  | | từng-cái | theo-lô 16 | lô nhanh hơn? | lệch vector (cos lô-vs-đơn) |
  |---|---|---|---|---|
  | bge-m3 int8 | **318 ms/tin** | 1.792 ms/tin | **KHÔNG — chậm 5,6×** | 0,982 (min 0,978) |
  | **gemma (ĐANG CHẠY)** | **360 ms/tin** | 814 ms/tin | **KHÔNG — chậm 2,3×** | **0,962 (min 0,925)** |
  **Nghĩa là:** `embedPending` gom lô 16 (`vectors.ts:277`) nên **tài liệu** trong kho thật được
  mã hoá theo lô, còn **truy vấn** thì mã hoá từng cái (`embedQuery`) ⇒ hai vế lệch nhau ~4%
  (xấu nhất 7,5%), mà lệch bao nhiêu còn **phụ thuộc các tin CÙNG LÔ** — tức nhiễu ngẫu nhiên
  theo thứ tự quét. Không lỗi nào nổ, không gate nào đỏ; đúng họ hỏng-lặng.
  *Đã loại giả thuyết padding:* lô cắt đồng đều 400 ký tự **vẫn lệch** (0,977–0,987).
  **Đã xử cho kho MỚI:** profile `bge-m3-v1` mang cờ `sequential` ⇒ encode từng cái ⇒ vector
  production khớp **cos 1,000000** với đúng thứ đã benchmark (trước khi vá: 0,98).
  **CHỜ USER — KHO ĐANG CHẠY:** cố ý KHÔNG đụng (bạn yêu cầu "không đụng cái đang xài"), và đổi
  giữa chừng sẽ trộn hai biến thể vector trong CÙNG một chỉ mục. Hai đường: ① kệ — đợt tráo
  bge sẽ dựng lại toàn bộ bằng đường tuần tự, bệnh tự hết · ② nếu vì lý do gì mà HOÃN tráo lâu,
  cân nhắc bật `sequential` cho gemma + `embed --rebuild` (43 giờ — không đáng nếu sắp tráo).
  *Ghi để không ai đọc số cũ mà tưởng vector kho hiện tại là "chuẩn": mọi con số recall đo trên
  kho thật từ trước tới nay đều mang sẵn khoản lệch này — nó là một phần của mốc nền, không phải
  hồi quy mới.*
- [~] **② ĐANG CHẠY từ 2026-08-19 15:43** — kho song song `data/global_memory.bgem3.db`
  (1.115 MB · **269.769 tin** · dấu `{1024, bge-m3-v1, int8}`), job embed **pid 29624** phóng qua
  `.vbs` (mồ côi, sống qua phiên), log `data/logs/bge-embed.log`.
  **Đo lúc phóng:** 742 vector/phút ⇒ ước **~5,3 giờ** *(lạc quan — embed xử tin NGẮN trước,
  sẽ chậm dần; đừng chốt con số này)*. Tiến độ đo bằng `vectorCount(<bản sao>)`, KHÔNG tin log.
  **Kho thật KHÔNG bị đụng** (đo cùng lúc: 256.948 vector · `{768, gemma-prompt-v1, fp32}`).
  ⚠ **ĐÃ TẮT `autosync` + `scheduler`** trong suốt đợt — hai kho dùng CHUNG `data/` nên chung
  luôn `cli-write.lock`, autosync 30 phút/lần sẽ cản job. **PHẢI BẬT LẠI SAU KHI TRÁO**
  (`/set-autosync?on=1` · `/set-scheduler?on=1`). Backup vẫn chạy (đồng hồ riêng, không treo
  vào công tắc nào — bản vá 2026-08-13).
- 🔴 **PHÁT SINH ở ②: `embed --all` CHẾT VÌ HẾT BỘ NHỚ ở 18.041 vector (~36 phút).** Log:
  `zemory memory: out of memory`, exit 1. Đợt Gemma 43 giờ trước KHÔNG dính ⇒ khác biệt nằm ở
  đợt này (model int8 542 MB + đường **tuần tự** gọi pipeline hàng chục nghìn lượt).
  **Cách vá — KHÔNG chỉ tăng heap** (tăng heap chỉ dời thời điểm chết nếu có rò thật): chạy
  **THEO LƯỢT, mỗi lượt một TIẾN TRÌNH RIÊNG** (`memory embed --limit 4000` × N lượt, wrapper
  `bge-embed-loop.mjs` ở scratchpad). Hết lượt là tiến trình thoát ⇒ hệ điều hành thu hồi sạch,
  rò không tích luỹ. `embedPending` vốn incremental + resumable nên cắt lượt chỉ tốn ~8 s nạp
  model mỗi lượt. Ngưỡng 4.000 = 1/4,5 mức đã chết. Wrapper chỉ đếm bằng **SQL trên kho**,
  không đọc log; một lượt lỗi KHÔNG giết cả job (chỉ dừng khi hai lượt liên tiếp không thêm gì).
  ⚠ Bẫy phụ đã dính: wrapper `appendFileSync` vào chính file mà `.cmd` đang redirect ⇒ **EBUSY**
  trên Windows, chết ngay khi khởi động. Chỉ được in ra stdout, để redirect lo phần ghi.
  **Đo sau khi vá:** 1.248 vector/phút (~75k/giờ) ⇒ ước ~3 giờ *(sẽ chậm dần — tin dài về sau)*.
- [ ] **③** bench A/B hai kho (2 thước · theo lớp · 18 ca âm, máy rảnh) + user tự so tay —
  cổng đạt: không lớp nào tụt (plan 19 §4).
- [ ] **④ (CHỜ USER KÝ)** tráo bằng script một-lần (tag `pre-bgem3-swap` · bản lùi 768 có án tử
  ~5 ngày · scan+embed bù) — plan 19 §5.
- [ ] **⑤ (NGỦ tới khi có máy kia)** thế hệ 1024 lên Drive + máy kia nhận như máy mới — plan 19 §6.

## 🔬 Audit toàn diện 2026-08-15 (đêm) — 10 mặt, gate xanh trọn, 0 lỗ mới

> **Sạch, đã đo trong phiên này:** gate ĐẦY ĐỦ **671/671 · 0 fail · 0 skipped** (~17 phút, daemon
> TẮT lúc chạy — không phải "xanh có kèm skipped") · `conform` ✓ (slot 19/56, nhận điều 16) ·
> `validate` ✓ (0 entry vượt trần) · `quick_check ok` 25,9 s · FK 0 · **258.779 tin / 2.085 phiên**
> · 0 tin mồ côi · digest **100%** · vector 245.723 · coverage 100% · dims 768d · `lastSync` khớp
> từng ký tự `drive.lastPushAt` (bản vá 13k sống trên daemon THẬT) · backup local ĐÚNG NHỊP NGÀY
> (12→13→14/08 ~13:00 — backupTick sau tách công tắc chạy thật) · log nền có dòng `[scheduler]` ·
> git sạch, size-pack 22,93 MiB, 0 secret tracked, 0 file lớn (max 1,8 MB ảnh), `.gitignore` kín ·
> guard PreToolUse **chứng minh sống bằng ca thật trong phiên** (chặn lệnh chạm token tên file khoá).
>
> **Đo gần nhất, KHÔNG chạy lại đêm nay (đắt, không có thay đổi liên quan):** license cả cây 190
> gói (13/08) · clone sạch 4/4 (13/08) · diễn tập phục hồi kho trắng (12/08) · ma trận guardrail
> 28 ca (11/08). **Chưa đo:** mở app nhìn tận mắt (cần mắt người) · 717 cửa sổ phụ chênh (cần kho
> đóng băng) · đo lạnh `/memory-status` lúc máy rảnh.

- [ ] **`todo verify` giơ 8 cờ advisory** (1 "nghi đã xong" dòng ~360 i18n + 7 "code mới hơn sổ")
  — đa số là dòng lịch sử bị file sửa sau vì việc KHÁC; phán từng dòng khi chốt phiên, đừng xoá vội.
## 🔵 BÀN GIAO 2026-08-14 — ĐỌC MỤC NÀY TRƯỚC

**Phiên 13–14/08 đóng 13 mục** (chi tiết + số đo: `06_CHANGES [2026-08-13]` → `[2026-08-14]`).
Máy lúc chốt: daemon **pid 28192 · v1.5.15** *(đã restart, mọi bản vá backend ĐANG SỐNG)* ·
`autostart`/`scheduler`/`autosync`/`realtime` đều BẬT · vector **238.623 · coverage 98,6%** ·
`.git` **661 MB → 22,52 MiB** · git sạch, đã push.

**VIỆC ĐẦU TIÊN — chạy gate ĐẦY ĐỦ (chưa chạy sau 8 commit cuối).**
Lượt gate cuối chạy ở `1.5.7`; từ đó tới `1.5.15` mới chỉ chạy test lẻ (77/77 + 11/11 + 4/4 xanh).
⚠ **Không chạy thẳng `npm run check`**: `preflight` sẽ CHẶN vì backlog embed gần như luôn dương
(hook ghi ~23 tin/phút). Đường đúng: **tắt `scheduler` → `npm run check` → bật lại**; hoặc
`ZEMORY_GATE_FORCE=1` và chấp nhận vài ca embed bị `skipIfBusy` bỏ qua (đọc dòng `skipped`,
"xanh có kèm skipped" ≠ "xanh phủ đủ").

**Ba việc CHỜ USER — CẢ BA ĐÃ ĐÓNG 2026-08-15** *(user giao agent tự quyết/làm)*:
1. ✅ **6 hàng `.tmp` rác** — ĐÃ XOÁ (xem §🔬 Audit 15/08: xoá đúng 6, verify `lastSync` nguyên).
2. ✅ **Tag `pre-lfs-fix-20260805` — QUYẾT GIỮ.** Nó là tag annotated MANG log tra ngược (hash cũ
   · tên file weight · ánh xạ), blob 314 MB đã prune nên giữ gần như 0 chi phí (size-pack 22,93
   MiB); xoá là mất bản ghi, không được lại gì.
3. ~~`lab.db` 1,46 GB~~ — **user tự xoá 2026-08-14**, thư mục `zemory-lab` không còn.

**Đường cụt đã thử, ĐỪNG đâm lại:**
· **Dịch 45 chuỗi `shell.js`** — vô ích: bảng `STRUCT`/`ROUTE` chỉ là lưới đỡ, nguồn thật là
  `/standard-spec` đọc `03_STRUCTURE.md` (đo: backend trả **91 dòng** tiếng Việt, bảng dự phòng
  **25 dòng**). Muốn màn đó ra tiếng Anh phải làm ở TẦNG TÀI LIỆU.
· **"Chờ embed xong rồi làm X"** — điều kiện KHÔNG BAO GIỜ đạt khi đang làm việc.

## 🔵 BÀN GIAO 2026-08-12 (tối) — VIỆC ĐẦU TIÊN CỦA PHIÊN SAU

> ⚠ **Luật mới, áp ngay từ dòng đầu phiên:** `02_RULES §Hành xử` — **HIỆN SUY NGHĨ TỪNG BƯỚC,
> CẤM CHẠY IM LẶNG**. Nói trước mỗi cụm hành động; số lệch dự đoán thì báo NGAY, không dồn cuối.

> ✅ **BẪY ĐO ĐÃ ĐƯỢC BỊT BẰNG MÁY 2026-08-13** *(trước đó chỉ là lời dặn, và đã bị bỏ qua hai
> lần — lần sau cùng bởi chính agent viết ra nó).* Bệnh: bộ đầy đủ cho **654 pass / 7 fail**, cả
> 7 ở `vectors.test.mjs`; chạy lại lúc máy rảnh **13/13 XANH**. Test embed nạp model ONNX thật,
> tranh CPU/I-O với job nền ⇒ **đỏ do điều kiện đo**. Giá phải trả không phải một lượt chạy hỏng
> mà là **niềm tin vào gate** — đỏ-giả vài lần là người ta bắt đầu bỏ qua màu đỏ.
> **Hai lớp chốt:** ① `npm run preflight` (đã nối vào `npm run check`) **chặn** gate khi daemon
> đang embed/sync, kèm lý do + đường đi tiếp; `ZEMORY_GATE_FORCE=1` để đè · ② `skipIfBusy(t)` ở
> 10 ca embed: bận thì **bỏ qua CÓ LÝ DO** (hiện ở dòng `skipped`) thay vì đỏ mập mờ.
> Đo trong cùng tình huống: trước **7 đỏ / 22 phút** → sau **fail 0 · skipped 10 / ~0,5 giây**.
> ⚠ **Giới hạn còn lại, đừng đọc thành phủ kín:** `preflight` chỉ kiểm **lúc bắt đầu**. Lượt gate
> hôm nay khởi động lúc máy rảnh, giữa chừng daemon tự bật job embed ⇒ ca cuối bị bỏ qua. Lớp ②
> đỡ đúng chỗ đó, nhưng **"xanh có kèm skipped" KHÔNG phải "xanh phủ đủ"** — đọc dòng `skipped`
> trước khi kết luận.

**Đã xong hôm nay:** release **1.5.0 đã push** (`73420e4`) · một kho chính trên Drive ghi bằng
nối thêm · chở trọn bộ RAG (máy trắng còn phải nhúng **2 tin**) · vá bỏ đói autosync (nghiệm thu:
tự chạy sau 1.170 s, lượt kế chỉ nối **0,5 MB**) · log nền ra đĩa · audit 10 mặt.

**MỘT VIỆC ĐỎ CÒN LẠI** *(mục ⑧ đã ĐÓNG 2026-08-13 — xem `06_CHANGES [2026-08-13]`: asset ABI 137
CÓ thật, thủ phạm là host `github.com` lọt 1/10 lượt; vá bằng `fetch-prebuilds.mjs` + cổng 4/4)*:

1. **(⑦) 314 MB weight** — ĐO LẠI 2026-08-13, **nhẹ hơn hẳn mô tả cũ**: lịch sử `main` đã sạch
   từ 05/08, remote không có, nên **không cần `filter-repo`, không cần force-push, không hash
   nào đổi, clone máy kia KHÔNG hỏng**. Chỉ còn 2 ref cục bộ níu lại — chi tiết + hai lựa chọn
   ở mục ⑦ bên dưới.

**Trạng thái máy lúc chốt:** kho **239.778+ tin · `quick_check ok`** · vector **227.688** ·
`scheduler`/`autosync`/`realtime` đều BẬT · daemon pid 5468 **đang chạy build CŨ (báo v1.4.1)** —
khởi động lại để nạp 1.5.0 · Drive: **đúng 1 file** `global_memory.enc` 1.357,5 MB, đã lên mây ·
`zemory-lab` còn 1,5 GB (chỉ `lab.db` + script).

## 🔬 Audit sau release 1.5.0 (2026-08-12 tối) — 5 phát hiện · 3 mặt CHƯA CHẠY

> **Sạch, đã đo:** gate **646/646** · typecheck · lint · `conform` ✓ (nhận ra `điều 16`) ·
> `quick_check` + `foreign_key_check` sạch · **0 cửa sổ vector mồ côi** · cây làm việc KHÔNG
> track bí mật nào (13 file khớp mẫu chỉ vì tên thư mục `cowork_global_memory/`) · nhịp tim
> daemon tươi · **diễn tập phục hồi ĐÃ LÀM** (merge kho chính vào kho trắng: 239.706 tin ·
> 226.898 vector · còn phải nhúng 2 tin).

- [ ] **(⑦) 314 MB weight — ĐO LẠI 2026-08-13: KHÔNG cần viết lại lịch sử, KHÔNG cần force-push.**
  > 🔄 **Bác hai khẳng định cũ của chính mục này:** *"mọi lần clone đều kéo về ~314 MB"* và *"gỡ
  > được chỉ bằng `filter-repo` + force-push ⇒ hỏng clone máy kia"*. **Cả hai đều sai.**

  Sự thật đo được: weight vào git qua **đúng một commit** `921354f` (05/08) và **đã bị gỡ khỏi
  `main` ngay hôm đó** — `git merge-base --is-ancestor 921354f HEAD` ⇒ **KHÔNG**; `git ls-tree
  HEAD` ⇒ **0 file**. Lịch sử `main` đã sạch từ 9 ngày trước.
  Nó chỉ còn sống nhờ **HAI ref CỤC BỘ**, cả hai trỏ cùng `32d5d03`:
  · `refs/original/refs/heads/main` — **rác `filter-branch` để lại**, lẽ ra xoá sau khi kiểm;
  · `refs/tags/pre-lfs-fix-20260805` — tag mốc, tạo **có chủ ý**.
  **Remote KHÔNG có cả hai** (`git ls-remote origin | grep 32d5d03` ⇒ 0) ⇒ **clone từ GitHub
  không kéo 314 MB**. Số đo: `.git` máy này **661 MB** · clone từ **local** (kéo cả tag) 236 MB.

  ✅ **ĐÃ DỌN 2026-08-13** (user chốt "giữ log hay xoá?" → chọn **giữ log, bỏ blob**):
  `size-pack` **234,91 → 22,52 MiB**. Tag dời sang `8bbcba9` + nâng thành **annotated** mang
  luôn phần log (hash cũ · tên file · ánh xạ tra ngược); bỏ `refs/original`; `gc --prune=now`.
  `main` y nguyên `7e7d2a8` · 3 tag đủ · `fsck` sạch · 28/28 test + validate + conform ✓ ·
  **không đụng remote, không force-push** ⇒ clone máy khác không hỏng.
  ⚠ **Bẫy đã dính, đừng lặp:** `git reflog expire --all` **xoá luôn stash** (stash entry chính
  là reflog entry của `refs/stash`). Đã cứu được vì ref còn trỏ commit; lần sau chụp
  `stash list` trước và expire có phạm vi thay vì `--all`.
- [ ] **(⑨) Backup local nằm CÙNG Ổ với kho** (`data/backups/`, 5 bản × ~1,8 GB). Mất ổ D là mất
  cả hai; bù duy nhất là kho chính trên Drive, mà nó **không chở FTS/digest** (dựng lại được,
  vài phút — nên là rủi ro THỜI GIAN, không phải mất dữ liệu). Ghi để đừng tưởng đã có 2 lớp.
- [ ] **(ĐỀ XUẤT `02_RULES` — chờ user chốt) Bản lùi tráo-kho có HẠN DÙNG.** Mỗi lần tráo kho
  sinh một bản lùi ⇒ phải ghi NGÀY KHAI TỬ ngay lúc tạo: chết khi hệ mới qua bench trên kho thật
  + backup ngày xoay đủ vòng phủ nó (~5 ngày). Không có luật này thì mỗi đợt nâng cấp đẻ một xác
  1–2 GB nằm vĩnh viễn (bằng chứng: xác 256d nằm đúng 7 ngày sau khi hết vai, phải soát tay mới ra).
- [ ] **(③) 717 CỬA SỔ PHỤ CHÊNH — CHƯA TRUY RA.** Đo hai lần cách nhau ~30 phút đều ra **đúng
  717**, nên KHÔNG phải nhiễu do kho lớn thêm (giả thuyết cũ của tôi, nay bác). Đã loại: cửa sổ
  mồ côi (**0**), trùng khoá băm (**2**), tổng số khớp khít (220.280 + 7.408 = 227.688). Phần
  vector CHÍNH sang đủ (chênh đúng 2 = tin mới trong lúc xuất). Cần A/B trên **kho ĐÓNG BĂNG**.
- [~] **(⑥) `/memory-status` — ĐÃ TRUY RA + vá một nửa 2026-08-13.** Bốn phép quét toàn bảng
  gánh gần hết thời gian (đo lúc job embed đang chạy, nên là cận trên): `SUM(LENGTH(content))`
  **1.615 ms** · `vectorCoverage` **1.391 ms** · `vectorRemaining` **994 ms** · `vectorCount`
  **194 ms**; toàn bộ phần còn lại ~100 ms.
  **Vá:** `vectorCoverage()` bị gọi THẲNG trong `dashboardMemory()` nên trả giá mỗi lượt
  `dashCache` (60 s) hết hạn, trong khi ba cái kia đã nằm sau TTL 300 s. Nay gộp vào
  `heavyStats()` — **con số y hệt, chỉ đổi tần suất tính**. Cổng mới trong `app-ui.test.mjs`
  (đột biến chứng minh đỏ được) canh mọi aggregate mới phải vào `heavyStats()`.
  **CÒN LẠI — lượt LẠNH (mở màn) vẫn trả trọn ~4 s.** Hai điều chưa làm, ghi rõ để không ai đọc
  thành đã xong: ① **chưa đo lại lúc máy rảnh** — đo hôm nay lệch 3× giữa hai lượt cách nhau vài
  phút vì job embed tranh CPU/I-O, nên **mọi con số tuyệt đối ở trên chưa đáng tin** · ② đường
  sửa lượt lạnh **KHÔNG phải warm-up đồng bộ lúc daemon khởi động** — nó chặn event loop nhiều
  giây, đúng cơ chế đẻ ra bug "hai daemon" (`ui.ts` §probeZemoryUi). Đường đúng: đẩy phép quét
  sang tiến trình con như `deepSearchChild`, hoặc trả payload nhẹ trước + số nặng bổ sung sau
  (vế sau đụng thiết kế UI ⇒ phải trình duyệt).

**⚠ CÒN LẠI CHƯA CHẠY — không được đọc thành "sạch":**
· **④ FE↔BE — hai vế treo nay ĐÃ CHẠY 2026-08-13:** ① *neo test* — **13 neo trỏ vào
  `backend/src/`, 0 neo trỏ vào file chết**. *Phép đo đầu báo 3 "mồ côi"
  (`commands/harness|hook|memory.ts`); kiểm chéo thì cả ba được `await import()` **động** trong
  `cli.ts` — báo oan vì phép quét chỉ bắt `from "…"`. Ai đo lại phải nhớ vế import động.*
  ② *i18n hai chiều* — đã đo, **90 chuỗi hardcode**, xem mục i18n bên dưới. Vế endpoint parity
  vẫn như cũ (2 false-positive `/migrate` · `/nav-cost`, KHÔNG mở lại).
· **⑥ Bề mặt sống — chạy MỘT NỬA:** đã gọi endpoint thật (bảng trên), **chưa mở app nhìn tận
  mắt** — theo skill, gọi endpoint KHÔNG thay được việc nhìn.
· **⑧ Rà license — ĐÃ CHẠY 2026-08-13, quét CẢ CÂY 190 gói** (không chỉ 14 dependency trực
  tiếp: license xấu ở tầng sâu vẫn đi kèm sản phẩm). Phân bố: MIT 127 · Apache-2.0 20 ·
  BSD-3 15 · ISC 13 · BSD-2 6 · còn lại lẻ. **2 gói cần biết, cả hai KHÔNG chặn:**
  · `@img/sharp-win32-x64` — `Apache-2.0 AND LGPL-3.0-or-later` (nhị phân đóng kèm **libvips**,
    LGPL). Là **optional dep của `@huggingface/transformers`**, zemory **không import `sharp`**
    ở đâu cả. Nếu đóng gói phân phối thì hoặc loại nó, hoặc giữ notice LGPL.
  · `@nativewindow/webview-win32-x64-msvc` — **không khai `license`**; nhưng gói cha
    `@nativewindow/webview` khai **MIT**, cùng repo cùng version ⇒ chỉ là thiếu field ở gói
    nhị phân theo nền tảng. Đây là optional dep TRỰC TIẾP, dùng thật ở `platform/window.ts`.
  ⚠ **Bài học phép đo (chính lượt này):** bản đầu tách `OR` và `AND` bằng CÙNG một regex ⇒
  `Apache-2.0 AND LGPL-3.0-or-later` **lọt qua**. `OR` = chọn một vế hợp lệ là đủ; `AND` = phải
  hợp lệ MỌI vế. Sửa xong mới lòi ra gói thứ hai — trước đó báo "chỉ 1 gói".
Ngoài ra **mặt ① chạy khi daemon đang có job nền** ⇒ xanh nhưng không phải điều kiện sạch.

## 🔵 BÀN GIAO 2026-08-12 (chiều) — đọc mục này TRƯỚC khi làm gì tiếp

**Đã đóng phiên này** (chi tiết + số đo: `06_CHANGES [2026-08-12b]` và `[c]`): `git gc` (10 file
`.idx` mồ côi → 0) · **trigram nhận lại `tool_use`** (migration **v21**, kho thật 100%) · **lỗi
thứ tự trigger UPDATE** (có sẵn từ trước, làm tin rơi khỏi trigram mỗi lần `redact()` chạy) ·
`salvage` thôi đảo chính sách bằng `'rebuild'` · **phạm vi embed vào config** + tách hai số tồn
đọng · **Drive thành MỘT kho chính ghi bằng nối thêm** · **vector đi cùng gói**.

**Trạng thái máy lúc chốt:** kho **239.105 tin · 1.315 phiên · `quick_check ok`** · vector
**226.973 · trong phạm vi thiếu 0 · ngoài phạm vi 19.474** · `scheduler` **BẬT** (mới bật phiên
này) · hook capture BẬT · daemon **v1.4.1**. Bộ test **639/639**.

⚠ **Daemon phải khởi động lại sau đợt sửa này** — nó nạp code lúc bind cổng, nên bản đang chạy
vẫn là code TRƯỚC khi đổi lối sync. Chưa restart mà autosync nổ ⇒ nó ghi theo lối series CŨ.

## 🔵 BÀN GIAO 2026-08-12 (sáng) — đọc mục này TRƯỚC khi làm gì tiếp

**Ba việc lớn của phiên đã ĐÓNG, không mở lại:** ① lớp `tool_use` nhúng xong (**52.169/52.177 =
100%**), bench chốt **0% → 21%@10**, nhãn phủ 14/14 · ② mặt ① của audit chạy được lần đầu kể từ
~05/08 và đã vá 3 chỗ đỏ · ③ đường cứu hộ nay chở cả vector (cổng 3/3, đột biến đỏ được).

**Trạng thái máy lúc chốt:** kho **238.495 tin · 1.314 phiên · `quick_check ok`** · vector **100%**
· Drive **238.495/238.495 đã đẩy, 9 bundle** · hook capture **ĐANG BẬT** (4 sự kiện) · daemon
**v1.4.1** · `lang` đã trả về **`vi`** sau khi chụp ảnh tiếng Anh.

**BA VIỆC CHỜ USER — đừng tự quyết:**
1. **`git gc`** dọn 10 file `.idx` mồ côi trong `.git/objects/pack` (nó viết lại vùng object).
2. **Số version** để push — hiện `package.json` **1.4.1**, có commit chưa push.
3. **ColBERT** treo chờ user kiếm model tiếng Việt (kẹt ở MODEL, không phải kiến trúc).

**VIỆC KẾ TIẾP đã có số, làm được ngay:**
- **Trigram cho `tool_use`** — đường rẻ nhất còn lại, KHÔNG tốn giờ máy (chỉ đảo điều kiện trigger
  đang loại tin tool + một migration dựng lại bảng). Đo hôm nay: lớp đó có 2 luồng thì được 21%@10,
  `tool_result` 2 luồng được 25% ⇒ luồng thứ ba là chỗ còn dư địa. **Chưa đo.**
- **Cổng "không biết" chấm bằng ĐỒNG THUẬN 3 luồng** thay vì khoảng cách riêng luồng vector. Bench
  hôm nay vẫn: **18/18 câu lạc đề đều trả ~40 kết quả**, điểm đầu gần bằng ca dương.
- **Xuất bundle FULL bản mới** lên Drive — bản 1,63 GB hiện có chụp lúc lớp tool mới 76%, nay 100%.

⚠ **Hai bẫy thao tác đã trả giá hôm nay, đừng dẫm lại:**
· **KHÔNG chạy `npm run check` khi có job nền** — khoá `test` kéo `npm run build` = `clean && tsc`,
  **xoá `dist/` ngay dưới chân job**. Đường an toàn: `npx tsc` rồi `node --test` thẳng.
· **Job dài phải phóng qua `.vbs`** (`WshShell.Run(cmd,0,False)`); phóng từ shell của agent là chết
  theo phiên. Script sẵn ở scratchpad của phiên, chép lại nếu cần.

## 🔬 Audit 10 mặt 2026-08-11 (lần đầu chạy bộ mở rộng) — 1 lỗ sửa tại chỗ, 5 việc còn

> Sạch: `conform` ✓ · 0 mồ côi (3 phép đo) · digest **1.294/1.294** · vector `prose` **99,93%** ·
> 6/6 dependency license tương thích Apache-2.0 · đúng MỘT kẻ ghi kho · nhịp tim daemon tươi ·
> guardrail **22/28** · **diễn tập phục hồi ĐÃ LÀM** (bundle 1,63 GB giải mã ra chỗ tạm, đếm đủ).
> Bốn mặt mới (⑦–⑩) **ngay lần đầu chạy đã ra 4 phát hiện** mà 6 mặt cũ không thể thấy.

- [~] **i18n HỤT — 90 → 74 chuỗi (2026-08-13, đã dọn phần RẺ).** 16 chuỗi vốn ĐÃ CÓ key sẵn,
  code chỉ quên gọi `t()`: `system.js` 11→0 · `gm.js` 2→0 · `harness.js` 5→3 · `sources.js`
  10→9. **74 còn lại KHÔNG cùng loại — đừng ước lượng như nhau:** 45 là nội dung *tài liệu chuẩn
  cấu trúc* trong `shell.js` (dịch = viết lại tài liệu), 10 là chữ nhúng trong chuỗi HTML ở
  `graph-panel.js` (phải tách chữ khỏi markup trước). Trần cổng đã hạ theo số đo.
- [~] **i18n HỤT — ĐO ĐƯỢC + có cổng KHÔNG-LÙI 2026-08-13.** Trước chỉ có danh sách triệu chứng;
  nay có số: **90 chuỗi tiếng Việt hardcode** trong `frontend/scripts/` (ngoài `chrome.js` — nơi
  giữ hai dict): `shell.js` 45 · `system.js` 11 · `graph-panel.js` 10 · `sources.js` 10 ·
  `graph-render.js` 6 · `harness.js` 5 · `gm.js` 2 · `recall.js` 1.
  **Đã sửa** phần lộ rõ nhất ở trang chủ: `relTime()` (ô Last Sync: `chưa sync` · `7 giờ trước`)
  và 4 pill trạng thái hệ thống (`đủ`/`chờ`/`phiên`/`chưa build`/`sẵn sàng`/`đã link`/`chưa
  link`) — thêm 6 key vào **cả hai** dict.
  **Cổng `i18n-ratchet.test.mjs` (3/3, cả ba đột biến đỏ được):** ① số hardcode không được tăng
  ② gỡ được thì phải HẠ trần (trần treo cao hơn thực tế thì chỗ vừa dọn lặng lẽ quay lại được)
  ③ mọi key phải có ở CẢ HAI dict — `t()` fallback về vi nên thiếu bản EN **không báo lỗi**, nó
  chỉ lặng lẽ hiện tiếng Việt giữa giao diện tiếng Anh.
  *Vì sao không đặt trần 0 ngay: gate đỏ triền miên là gate bị bỏ qua — đúng luật 7 vừa phải
  sửa cho `guard`.* **CÒN LẠI 90 chuỗi**, gỡ dần rồi hạ trần.
  ✅ **i18n tầng BACKEND — XONG 2026-08-13.** `connections.ts` nay gửi kèm `detailCode` +
  `detailArgs` (mã + tham số) **BÊN CẠNH** `detail` — thêm chứ không thay, nên thứ gì đang đọc
  `detail` vẫn chạy y nguyên. UI ghép câu qua `connDetail()` theo ngôn ngữ đang bật, và dùng
  lại `relTime()` sẵn có thay vì đẻ cách tính thời gian tương đối thứ hai. Cổng
  `conn-detail-i18n.test.mjs` 4/4 canh **CẢ HAI ĐẦU** (backend quên gửi mã ⇒ UI lặng lẽ rơi về
  câu tiếng Việt; UI quên đọc mã ⇒ mã gửi lên chẳng ai dùng — cả hai đều không ném lỗi); đột
  biến ở từng đầu đều chứng minh đỏ được.
  ~~**i18n tầng BACKEND — nặng hơn, chưa làm.**~~ `memory/connections.ts` **sinh thẳng chuỗi
  tiếng Việt** rồi gửi lên UI (`${m} phút trước` · `kiểm lần cuối …` · `chưa kiểm lần nào` ·
  `store đã biết nhưng không còn trên đĩa` · `không có store trên máy này`). UI **không có cách
  nào dịch** vì nhận về câu đã ghép. Sửa đúng = trả mã + tham số (`{code, args}`) để UI ghép —
  đổi hình dạng payload, cần cổng riêng cho cả hai đầu.
## 🔗 NGUỒN ĐỒNG BỘ GLOBAL MEMORY — đọc TRƯỚC khi nối một máy mới (đo 2026-08-11)

> Máy nào pull repo về cũng đọc mục này để biết kho nhớ chung nằm đâu và nối vào thế nào.
> Mọi số dưới đây đo bằng `~/.zemory/location.json` · file config cạnh kho · `/automation` của
> daemon đang chạy — không phải chép lại từ sổ.

| | giá trị hiện tại |
|---|---|
| kho sống | `<repo>/data/global_memory.db` (HP điều 14 — TRONG cây repo, KHÔNG ở ổ hệ thống) |
| con trỏ vị trí | `~/.zemory/location.json` → `{"dataDir": "<repo>/data"}` |
| kênh xuyên máy | thư mục Drive dùng chung, máy này trỏ `G:\My Drive\Global Memory` |
| kho chính trên Drive | **`global_memory.enc`** — MỘT file duy nhất, container nhiều khối (+ `global_memory.bak.enc` là bản lùi) |
| cách ghi | **NỐI THÊM** một khối vào cuối; không có tin mới ⇒ không chạm file |
| chở gì | **TRỌN bộ RAG**: tin gốc + vector + cửa sổ phụ của tin dài (HP điều 16) |
| model | `data/models` **4,4 GB** (EmbeddingGemma + rerank) — vẫn cần ở máy mới để nhúng CÂU HỎI |

### MỘT KHO CHÍNH — mọi máy ghi vào chính nó

> 🔄 **Thay bảng "HAI ĐƯỜNG CHỞ lean/full" viết 2026-08-11.** Bảng đó dạy rằng đường mặc định
> **không chở vector** nên máy kia "có đủ TIN, không có lớp ngữ nghĩa" — **hết đúng từ 2026-08-12**.
> Nó cũng dạy phải `import --force` (THAY nguyên DB) để có vector; nay **không cần**, và
> `import` trên kho chính sẽ báo lỗi chỉ đường sang `--merge`.

| | đường DUY NHẤT hiện nay |
|---|---|
| xuất | `zemory memory sync` (tự động 30 phút/lần, hoặc bấm tay) |
| ghi vào | `global_memory.enc` — **nối thêm**, mọi máy cùng file |
| bên nhận | `zemory memory sync` (tự merge) hoặc `zemory memory import <file> --merge` |
| máy mới dùng được ngay? | **CÓ — đủ cả hybrid.** Đo 2026-08-12 trên kho trắng: nhận **219.944/219.946 vector**, còn phải nhúng lại **2 tin** |

**Đo bằng vòng khép kín, không suy đoán** (2026-08-12): xuất gói **1.356 MB** → merge vào kho
TRẮNG → đếm hai đầu. Tin 239.495 · vector 226.675 · cửa sổ phụ 6.664 · `vectorRemaining` = **2**.
Chênh vài trăm hàng so với nguồn là do kho lớn thêm trong lúc xuất (autosync vẫn chạy) — không
phải lỗ thiết kế, và lượt sync kế tiếp tự bù.

**Ba bẫy đã trả giá khi dựng đường này, đừng dẫm lại:**
· **id trong gói là ID GIẢ** — `buildRowsSnapshot` cố ý không chép cột `id`, tin được đánh số
  lại từ 1. Lấy id đó tra ngược kho nguồn ⇒ chở đúng 25% vector, `rejected=0`, không log nào báo.
· **Tin `uuid IS NULL`** (11.233 = 4,7%) phải định danh bằng **băm mốc-thời-gian + nội dung**;
  bỏ chúng là đẩy ~3,9 giờ nhúng lại sang máy mới.
· **Một hàng hỏng không được giết cả lô** — bọc lô 500 trong một giao dịch rồi nuốt lỗi ở vòng
  ngoài là mất 500 vector một lần, âm thầm.

### Bốn thứ máy mới cần để CHẠY LIỀN (thiếu một là hụt)

1. **Mã nguồn** — `git clone`/`git pull` → `npm install` → `npm run build` → `npm link`.
2. **Chìa** — mang tay, `zemory memory key set` (đọc stdin), rồi **so dấu tay** `key show` với
   máy nguồn. Chìa phải có **TRƯỚC** mọi thao tác bundle (`plan/16 §3`).
3. **Kho + trọn bộ RAG** — `zemory memory import "<thư mục Drive>/global_memory.enc" --merge`
   *(hoặc chỉ cần trỏ Drive rồi `zemory memory sync` — nó tự merge)*.
   > 🔄 **ĐỔI 2026-08-12.** Bước này trước ghi `--force` kèm câu *"KHÔNG dùng `--merge`: merge chỉ
   > lấy 4 bảng nguồn, vector sẽ bị vứt"* — **nay ngược lại**: `--merge` là đường ĐÚNG và nó chở
   > đủ vector; còn `--force` trên kho chính sẽ bị từ chối kèm câu chỉ đường (kho chính là
   > container nhiều khối, không phải ảnh chụp nguyên DB).
   *(Lệnh TỰ DÒ chìa cạnh kho — không cần `--key-file`; cổng `sync-path-key.test.mjs` khoá.)*
4. **Model 4,4 GB** (`data/models`) — không chép thì máy kia **tự tải lúc chạy**. Cần cả lúc
   **TRUY VẤN**, không riêng lúc embed: câu hỏi phải được nhúng mới so được với vector ⇒ thiếu
   model thì dù kho có đủ vector, hybrid vẫn rơi về FTS.

Sau khi merge xong, từ đó trở đi mọi máy chạy `zemory memory sync` như thường — nối thêm, additive.
**Quy trình chung cho MỌI thứ mới sinh ra sau này: skill `.claude/skills/sync-path/`** — khai kênh
+ đo vòng khép kín trước khi gọi là xong, để không lặp lại cảnh dò-rồi-vá của phiên này.

⚠ **Series của máy cũ `SS01-IT-10` đã CHẾT** (9 file ~338 MB nằm lại vĩnh viễn — không còn ai chạy
compact cho nó). Đừng chờ nó cập nhật; dọn bằng `zemory memory sync --prune-host SS01-IT-10`
(có dry-run) khi đã verify nội dung của nó nằm trong kho local.

**Công tắc đang bật trên máy này** (đo `/automation` + config, 2026-08-11):
`autostart` BẬT · `autosync` **BẬT** · `realtime` BẬT (đã nối) · `scheduler` TẮT · `rerank` TẮT ·
`hybrid` BẬT · `syncAttachments` TẮT.

## 🔵 BÀN GIAO 2026-08-10 — recall: đọc mục này TRƯỚC khi làm gì tiếp

> **Đổi so với bàn giao 09/08:** ① **rerank ĐÃ TẮT** (đo: thua mọi cột nghiêm, chậm 11,6×) —
> mốc nền dưới đây đo KHÔNG rerank, giữ nguyên giá trị · ② thêm hai lớp **RM3** và **luồng
> từ-hiếm**, cả hai **TRƯỢT CỔNG, mặc định TẮT** (`ZEMORY_RM3=1` / `ZEMORY_RARE=1`) · ③ đang
> chạy **phép thử nhúng tin tool trên BẢN SAO** — xem mục `[~]` đầu danh sách.
>
> **Điều quan trọng nhất phiên này tìm ra:** `tool_use` 0% **KHÔNG phải** vì thiếu vector mà vì
> **RRF thưởng đồng thuận nhiều luồng** — thứ chỉ có mặt ở MỘT luồng thì hạng 1 cũng bị vùi.
> Bằng chứng: luồng từ-hiếm có đáp án **7/14 ở pool 60** mà đường ống trả **0/14**; nâng
> `W_RARE` 0,45→3 cứu 3/14 vào top-40. Quan hệ đơn điệu theo số luồng: `prose` 3 luồng 50%@10 ·
> `tool_result` 2 luồng 25% · `tool_use` 1 luồng 0%. **Đọc trước khi quyết chi giờ máy cho embed.**
>
> ⚠ **Bẫy phương pháp đã dính phiên này:** probe tự dựng thiếu `all: true` (bench luôn có) ⇒ ba
> thí nghiệm `TOOL_DEMOTE`/`vecMix`/gộp-trùng cho số VÔ NGHĨA, đã bỏ. Probe mới phải sao chép
> tham số của `recallbench.ts:240` trước khi tin bất kỳ con số nào.

**Trạng thái thước (bench chính thức, 68 nhãn, `bench --recall --no-rerank`):**

| lane | nghiêm | tương đương |
|---|---|---|
| hybrid | `@10` 35% · MRR 0,288 | `@10` **54%** · `@40` **63%** · MRR **0,413** |
| FTS-thuần | `@10` 28% · MRR 0,191 | `@10` 44% · MRR 0,312 |

Đầu phiên chỉ có MỘT thước và `@10` 32% · MRR 0,235. **Đọc `plan/17` §1.2b trước khi đo lại bất
cứ gì** — hai thước có thể nói NGƯỢC nhau, và dùng lẫn chúng là ra quyết định sai.

**Mặc định đang chạy:** đa-truy-vấn (agent gửi `also`) · trộn cosine `vecMix` · gộp near-dup +
`similarIds` · hình phạt tool **hai mức theo lane** (FTS 0,3 · hybrid 0,7). Đang TẮT: cổng
"không biết" (`ZEMORY_ABSTAIN=1` để bật — trượt cổng nghiêm, chặn 5/8+4/10, giết oan 0/68).

  ✅ **XONG 11/08 — cổng QUA** (`tool_use` thoát 0%, không lớp nào tụt; đã embed kho thật).
  Bản sao `tooltest.db` cũng không còn trên đĩa. *Giữ hồ sơ để tra phương pháp A/B.*
  ~~**PHÉP THỬ ĐANG CHẠY trên BẢN SAO — nhúng tin tool để kiểm giả thuyết "hai luồng".**~~
  > 🔄 **Đổi PHẠM VI và LÝ DO so với mục cũ** (`Edit,Write` 9–16 giờ vì "khớp ngữ nghĩa").
  > Đo 2026-08-09/10: 14 nhãn `tool_use` trỏ vào **Bash 6 · Edit 4 · PowerShell 3 · Artifact 1 ·
  > Write 0** ⇒ `Edit,Write` chỉ phủ **4/14**. Và lý do thật KHÔNG phải ngữ nghĩa mà là **RRF
  > thưởng đồng thuận nhiều luồng**: `prose` 3 luồng 50%@10 · `tool_result` 2 luồng 25% ·
  > `tool_use` 1 luồng **0%**. Embed = cấp cho lớp này luồng thứ hai.
  **Đang chạy:** `GLOBAL_MEMORY_DB=D:\huy.nguyen\zemory-lab\tooltest.db`
  `ZEMORY_MODEL_DIR=…\data\models ZEMORY_EMBED_TOOLS=Edit,Write,Bash,PowerShell memory embed --all`
  (bản sao chụp bằng `db.backup()`, 1.550 MB, `quick_check ok`; log `zemory-lab\tooltest-embed.log`).
  **Mốc bằng chứng** (embed xử theo độ dài TĂNG DẦN): 8.246 tin→phủ 1/14 · **11.000→4/14 (~3,9 giờ)**
  · 16.682→7/14 · 28.705→**14/14 (~10 giờ)**; trọn nhóm 44.747 tin ≈ 15,7 giờ.
  **Nghiệm thu đã định TRƯỚC:** `bench --recall --no-rerank` trên bản sao, so bảng THEO LỚP với mốc
  nền (`prose` 50%@10 · `tool_result` 25% · `tool_use` 0%). ĐÚNG nếu `tool_use` tiến về ~25% mà
  `prose`/`keyword` không tụt; SAI nếu vẫn ~0% dù đáp án đã có vector ⇒ **đừng chạy job trên kho thật**.
  ⚠ Chạy MỘT MÌNH — bench và embed cùng dùng ONNX một CPU thì cả hai số đều hỏng.
- ❌ **"Backlog embed ~960 tin" — SỐ CHẾT LẦN THỨ BA.** Đo 2026-08-13 qua `/memory-status`:
  **remaining 35 · coverage 100%**. Và vế *"scheduler đang TẮT nên không ai tự xử"* cũng hết
  đúng — scheduler **BẬT** từ 12/08, nó tự xử. *Con số này đã chết ba lượt (674 → 960 → 35): nó
  là **đại lượng ĐANG CHẢY**, ghi số vào sổ là ghi một ảnh chụp hết hạn ngay khi mực khô. Muốn
  biết thì gọi `/memory-status`, đừng đọc sổ.*
- [ ] **Đo lại 2 mục dưới thước TƯƠNG ĐƯƠNG** (chưa làm, thước mới có thể đảo tiếp):
  ① cổng "không biết" — số ca âm không đổi, nhưng "mất bao nhiêu kết quả đang ở top-10" thì đổi.
  ② `vecMix` — bảng 09/08 cho thấy tắt nó thì `tool_result` MRR sập **0,209 → 0,074**, tức lớp đó
  sống gần như hoàn toàn nhờ nó; đáng xác nhận lại bằng thước tương đương.
- [ ] **(ĐỀ XUẤT `02_RULES` — chờ user chốt) Hai luật ĐO rút ra từ phiên này.**
  ① *"N phép thử cùng thất bại theo CÙNG MỘT hướng ⇒ nghi THƯỚC, không nghi N thiết kế"* — tôi
  chạy **tám** giả thuyết, diễn giải tám lần như tám vấn đề kỹ thuật riêng, trước khi hỏi thước có
  đếm đúng không. ② *"Đo một cấu hình bằng bề mặt HẸP HƠN bề mặt sẽ chịu ảnh hưởng"* — dính **hai
  lần trong một phiên**: T3 chấm theo "cụm" thay vì tin TRẢ VỀ (báo +29% giả); hình phạt tool quét
  chỉ bằng `searchHybrid` nên làm hỏng đường nhanh của app (đã kịp commit rồi mới phát hiện).
## 🔴 Hồ sơ đợt rebuild (giữ để tra) — dựng lại chỉ mục ở 768 chiều + fp32

> Kho thật `✓ lành` · **~207k tin · 1.284 phiên** · chìa `e6fb0eff` · repo `D:\huy.nguyen\Tool\Zemory`.
> Số đo + lý do đầy đủ: `06_CHANGES [2026-08-05]`. Cổng đã xanh: **510/510** · `conform` ✓ · đã push **1.1.1**
> *(đo lại 2026-08-07: `package.json` = 1.1.1, release commit `c58fa76`; dòng này trước ghi 1.1.0 — lỗi thời một bậc).*
> Kho thật lúc đo: **211.050 tin · 1.287 phiên** (số 207k/1.284 ở dưới là mốc 05/08, hook vẫn nạp thêm mỗi ngày).

> 🔄 **BÀN GIAO PHIÊN 2026-08-07 — đọc trước khi gõ gì.** Embed chạy trong **cửa sổ PowerShell RIÊNG
> của user**, output đã CHUYỂN HƯỚNG vào file (console không còn gì để in ⇒ hết bẫy đóng băng):
> `$env:GLOBAL_MEMORY_DB="D:\huy.nguyen\zemory-lab\lab.db"; $env:ZEMORY_MODEL_DIR="D:\huy.nguyen\Tool\Zemory\data\models";`
> `node dist\cli.js memory embed --all *> D:\huy.nguyen\zemory-lab\embed.log`
> **Mốc 2026-08-07 tối: 112.889/123.086 chunk (91,7%)** — còn ~10,2k, nhịp 32 chunk/phút ⇒ ~5,3 giờ.
> *(mốc trong ngày: 81,4% lúc chốt phiên trước → 88,2% chiều → 91,7% tối)*
> **Xem tiến độ (cửa sổ KHÁC, đừng đụng cửa sổ job):** `node D:\huy.nguyen\zemory-lab\watch.cjs` (bảng
> tự cập nhật 30s, tự báo ĐỨNG IM) hoặc `progress.cjs` (một phát). **Bài học trả giá 4 lần trong ngày:
> bôi đen/copy console đang in = Windows ĐÓNG BĂNG tiến trình** (mark-mode chặn write; ESC là chạy lại).
> Chết thì mũi tên lên + Enter, `--all` tự nối; **TUYỆT ĐỐI không `--rebuild`**.
> **Đừng smoke bằng `zemory ui`** — nó LUÔN bật cửa sổ thật lên desktop user (sự cố "344 KB không có
> data" 06/08 đêm — xem `[2026-08-07b]`); kiểm bề mặt thì curl daemon 4444 thật, read-only.

- [ ] **HOOK ĐANG BẬT** (user bật lại 2026-08-05 chiều, sau cửa sổ gate). Hệ quả: **KHÔNG chạy
  `npm run check`** khi hook còn bật (60 test song song + hook ghi = tổ hợp hỏng kho 04/08);
  muốn chạy gate → user tắt (`zemory hook uninstall`) rồi bật lại — agent bị bộ lọc quyền chặn cả hai.
- [ ] **Sau khi TRÁO: `zemory reindex`** một lần cho chỉ mục docs tươi (đợt dọn 78 dòng doc đường
  cũ 05/08 đã xong — Zemory 23 + 6 repo khác 55, xem `06_CHANGES [2026-08-05b]`).
  Kèm theo tự động: digest toàn kho sẽ TỰ DỰNG LẠI LƯỜI ở scan/scheduler kế tiếp — `DIGEST_VERSION`
  bump 3→4 (2026-08-06, `cleanPath` cắt văn xuôi khỏi `paths_touched`; đo 261/261 path bẩn xử sạch).
  KHÔNG cần `digest --all` tay trước tráo — kho hiện tại sắp bị thay, chạy là công dã tràng.
- [ ] **(ĐỀ XUẤT — chờ user duyệt THIẾT KẾ) Ô nhập "cách nói khác" trên màn Recall.**
  Backend đã sẵn: `/memory-search?also=…` (lặp được, hoặc `alsoList=a|b`) tự chuyển sang đường
  sâu và truyền `--also` cho tiến trình con. Nhưng **chưa có chỗ bấm trên giao diện** — thêm
  phần tử UI là quyết định thiết kế, `02_RULES §Hành xử` bắt trình duyệt trước. Đây là đường
  duy nhất để NGƯỜI dùng được T5 trong app (agent thì đã có qua MCP `also[]`).

- [ ] **(ĐỀ XUẤT — chờ user duyệt THIẾT KẾ) Ô nhập "cách nói khác" — nay CÓ SỐ, nhưng RỦI RO hai chiều.**
  Đo 2026-08-10 (34 nhãn `prose`): biến thể **cụ thể** ⇒ `@10` 50 → **71%**, `@40` 65 → **79%**;
  biến thể **mơ hồ** ⇒ MRR 0,407 → **0,189**, tức **tệ hơn không gõ gì**. Nên ô này KHÔNG được là
  một ô trống — phải kèm ví dụ/hướng dẫn tại chỗ, nếu không người dùng gõ bừa là tự làm hỏng kết
  quả của mình. Backend đã sẵn (`/memory-search?also=`). Thêm phần tử UI ⇒ `02_RULES` bắt trình duyệt.

- 🔄 **ColBERT — HẾT BẾ TẮC MODEL 2026-08-15: BGE-M3 (MIT, VI sạch, chạy được trong stack).**
  Xem hồ sơ đo + phép thử kế ở mục 🔄 ColBERT trong «BÀN GIAO 2026-08-12 (chiều) → CHỜ USER».
  Đường `cc-by-nc` (jina) vẫn loại; bảng dò 2026-08-11 bên dưới giữ làm hồ sơ so sánh.
  ~~**ColBERT — DÒ XONG 2026-08-11, BẾ TẮC Ở MODEL (không phải ở kiến trúc hay giá).**~~
  Dò 100 model ColBERT phổ biến nhất; **đúng HAI cái biết tiếng Việt**, và chúng chia nhau hai
  nửa của vấn đề:

  | model | license | tiếng Việt | ONNX | runtime hỗ trợ? |
  |---|---|---|---|---|
  | `antoinelouis/colbert-xm` | **MIT** ✅ | có (1/81) | ✗ | ❌ nền **XMOD**, `transformers.js` KHÔNG có |
  | `jinaai/jina-colbert-v2` | **cc-by-nc-4.0** ❌ | có | ✅ | ✅ nền XLM-RoBERTa |
  | `LiquidAI/LFM2-ColBERT-350M` | other | ❌ 8 thứ tiếng, KHÔNG có VI | ✗ | — |
  | `answerai-colbert-small-v1` · `colbertv2.0` · mxbai · NeuML | MIT/apache ✅ | ❌ chỉ EN | ✅ | ✅ |

  **Đo được vì sao model tiếng Anh vô dụng ở đây** — cùng một câu, tokenizer cắt ra:
  `answerai` → `đ ##oi k ##hun ##g cho tu cu ##a so …` (24 token, **MẤT DẤU**, vocab BERT-EN 30.522)
  `jina`     → `đổi khung chờ từ cửa sổ rời sang widget con …` (16 token, **nguyên vẹn**)
  MaxSim khớp ở mức TOKEN, nên token vô nghĩa thì phép khớp là nhiễu-với-nhiễu. Thử `answerai`
  xếp lại top-40: MRR **0,476 → 0,170** (−64%), **1.784 ms/lần mã hoá** ⇒ 15% kho ≈ 15,9 giờ.
  ⚠ Con số −64% đó **KHÔNG đo ColBERT**, nó đo một model không đọc được tiếng Việt.

  **CẦN USER QUYẾT:** kho này dùng **cá nhân/nội bộ** hay có tính **thương mại**? `cc-by-nc-4.0`
  cấm thương mại. Weight tải lúc chạy nên zemory vẫn Apache-2.0 sạch, nhưng nếu dùng cho việc
  có tính thương mại thì đó là vi phạm của NGƯỜI DÙNG — không tự bật thay user.
  Đường sạch còn lại: tự chuyển `colbert-xm` sang ONNX **rồi gọi thẳng `onnxruntime-node`** (bỏ
  qua tầng dựng model của transformers.js) — vướng XMOD có adapter theo ngôn ngữ, cần `lang_ids`,
  là dự án nhỏ chưa chắc kết cục.
  ⚠ **Nhớ TRẦN trước khi chi giờ:** bench đo chỉ **6–8/68 câu** có đáp án trong pool mà ngoài
  top-10 ⇒ ở vai *xếp lại* mọi reranker chỉ có ngần ấy dư địa. Đáng chi chỉ khi dùng ở vai
  **lấy ứng viên** — mà vai đó cần chỉ mục đa-vector, đắt gấp bội.

- [ ] ⏸ **ColBERT làm LUỒNG SONG SONG để THỬ (user chốt hướng 2026-08-10) — NGỦ ĐÔNG theo quyết
  định park 2026-08-15**; kiến trúc luồng-song-song dưới đây vẫn là đường đúng NẾU ngày nào đó mở
  lại (điều kiện: model VI license sạch + nhắm trần pool).
  Không cần "zemory 2.0": vector vốn là *engine nội bộ của slot `search`* và RRF gộp bao nhiêu
  luồng cũng được (vừa chứng minh — thêm luồng thứ 4 trong ngày). ColBERT = **một bảng chỉ mục
  nữa + một luồng nữa**, `vec_chunks` cũ **không đụng**; thua thì tắt luồng, kho cũ chạy y nguyên
  (điều 9). Hai ràng buộc thật: **đĩa 10–30×** (cộng thêm, không thay) và `vec_config` hiện chỉ mô
  tả MỘT không gian vector ⇒ phải tách cấu hình riêng. Vẫn phải qua phép thử nhỏ trên bản sao
  (điều 15), và nhớ TRẦN: chỉ 6–8/68 câu có đáp án trong pool mà ngoài top-10.

- [ ] **(hướng lớn, chưa quyết) LATE INTERACTION / ColBERT — nhắm vào TRẦN POOL.**
  Lý do: `@40` mới **50%**, tức nửa số câu đáp án không vào nổi pool, và bench đo được **chỉ
  6/68 câu** nằm trong pool mà ngoài top-10 ⇒ **mọi lớp rerank ở kho này chỉ có 6 câu dư địa**.
  Tài liệu ngành khớp đúng ca của mình: *"bi-encoder huấn luyện trên web tổng quát hoá KÉM sang
  corpus kỹ thuật; khớp mức TOKEN của MaxSim lấy lại phần lớn khoảng cách đó mà KHÔNG cần huấn
  luyện lại"*, chất lượng ngang cross-encoder ở độ trễ ngang bi-encoder. Kho mình đúng là ngoài
  miền (log kỹ thuật tiếng Việt, embedder zero-shot). **Giá: đĩa 10–30× dense** + định dạng chỉ
  mục riêng ⇒ phải qua phép thử nhỏ trên bản sao trước (HP điều 15). Xem `plan/17 §3.1`.
- [ ] **Sao lưu NGOÀI máy — đã có MỘT phần:** bundle `.enc` trên Drive (baseline 289,7 MB + delta,
  auto-sync 05/08) phủ được phần NGUỒN; backup local 1,25 GB vẫn nằm **cùng ổ** với kho, và công
  embed 43 giờ chưa được bảo hiểm (bundle lean không chở vector) → sau tráo cân nhắc `export --full`.
## 🚨 DB THẬT BỊ HỎNG 2026-08-03 — PHỤC HỒI ĐỦ · nguyên nhân gốc ĐÃ TÌM RA — còn MỘT việc code
> 🔄 **Cập nhật 2026-08-05 (soát TODO):** vế "còn treo nguyên nhân gốc" của mục này ĐÃ ĐÓNG —
> `06_CHANGES [2026-08-03h]` kết luận **Google Drive đồng bộ chính file DB** (dòng "Đã loại: thư
> mục đồng bộ đám mây" bên dưới là kết luận SAI thời điểm đó, giữ làm hồ sơ). Ngày 05/08 còn phát
> hiện thêm tầng nữa: DriveFS backup **cả `D:\huy.nguyen`** (kho + chìa lên mây trần) — user đã gỡ.
> **Việc CODE của mục này: ĐÃ ĐÓNG HẾT 2026-08-06** (`06_CHANGES [2026-08-06c]`): vá write-gate ✓
> · `relocate` chở cả cụm ✓ · cảnh báo sớm cloud (`cloudguard` + check `storage-safety`) ✓.
> Backup tự xoay vòng đã xây `[2026-08-03c]`; embed dở dang đã bị rebuild 768 thay thế.
> *(Sử gốc: phát hiện lúc bench recall; mất 0 tin; kho lúc đó 199.360 tin. Chi tiết `[2026-08-03b]`.)*

**Thiệt hại (đo, không đoán):** hỏng nằm ở `messages_fts*` · `section_fts*` · `changelog_fts*`
· `session_digest_fts_tri*` (bảng bóng FTS — 100% dẫn xuất) và chạm cả **bảng nguồn**:
`messages` · `attachment` · `section` · `changelog` · `vec_map`.

**Bản gốc hỏng giữ nguyên 2 bản** ở `data/corrupt-20260803-091106/` — KHÔNG xoá cho tới khi
truy xong nguyên nhân gốc (nó là vật chứng duy nhất).

## 🎯 ĐÃ CHỐT 2026-08-05 — dựng thẳng **768 chiều + fp32** (user quyết), đang chạy

**Bằng chứng dưới đây GIỮ LẠI:** nó giải thích vì sao chọn 768, và mốc **41%@10** của nó chính là
ngưỡng bản sao phải vượt thì mới được tráo vào kho thật.

**Nghẽn KHÔNG phải rerank — là lớp NHÚNG.** Chuỗi đo trên corpus 34 câu có nhãn, kho thật:
`recall@10 41%` · `@40 56%` · `@100 56%` · `@200 56%` · `@500 56%` ⇒ **chạm trần**.
**15/34 câu (44%) đáp án KHÔNG bao giờ được lấy về**, dù nhìn tới 500 kết quả. Nới `POOL`
60 → 200 → 500 **không đổi một con số nào**. 15 tin trượt vs 19 tin tìm ra: dài 714 vs 635 ký
tự, **cả hai nhóm đều 100% CÓ VECTOR** ⇒ không phải thiếu chỉ mục, không phải chunk, không
phải xếp hạng.

**Phép thử có kiểm soát** (`scratchpad/dims-test.mjs`, chạy trên bản sao `D:/zemory-lab/lab.db`):
EmbeddingGemma huấn luyện Matryoshka nên **256 chiều CHÍNH LÀ 256 số đầu của 768** — embed MỘT
lần ở 768 rồi so bốn cách cắt trên **cùng một dãy số**, nên khác biệt duy nhất là số chiều.

| chiều | @1 | @3 | @10 | @40 | MRR |
|---:|---:|---:|---:|---:|---:|
| 128 | 62% | 82% | 88% | 97% | 0,728 |
| **256** *(đang dùng)* | **74%** | 88% | 97% | 97% | **0,816** |
| 512 | 85% | 97% | 97% | 100% | 0,913 |
| **768** *(gốc của model)* | **91%** | 97% | 100% | 100% | **0,944** |

Tăng ĐỀU qua cả bốn mức ⇒ quan hệ thật, không phải nhiễu. `recall@1` **74% → 91%** là chỉ số
đáng giá nhất (agent tra cứu cần đúng ngay vị trí đầu).

**Vì sao đang là 256:** cắt hồi 2026-07 để giảm DB **1.141 MB → 595 MB**. Đánh đổi có chủ đích,
nhưng **lúc đó chưa ai đo được nó lấy mất bao nhiêu chất lượng** — bench khi ấy dùng corpus 8
câu bão hoà và `topN=10` nên không nhìn quá 10 kết quả. Giờ mới có thước.

- **ĐƯỜNG ĐÃ CHỌN: ③ làm thẳng 768 + fp32** *(quyết định — không phải việc; việc đang chạy là mục
  [~] ở đầu file)*. Hai số đo mới (2026-08-05) làm hai lựa chọn kia mất lý do tồn tại:
  - **512 KHÔNG rẻ hơn 768 một giây nào** — model luôn tính đủ 768 rồi `sliceNormalize` mới cắt,
    nên hai mức là **cùng một lần chạy model**; khác biệt duy nhất là dung lượng (297 vs 446 MB).
    Ưu điểm "tốn 2/3 thời gian" của phương án ② là SAI, đã bác.
  - **Chi phí thật rẻ hơn ước cũ nhiều:** 123.086 chunk duy nhất × 1,26 s = **43 giờ** (ước cũ
    60–190 giờ dựa trên 3,4 s/tin và chưa trừ dedup 19% + tool call).
  - Đo lại với 3.000 mồi (phương án ①) **bỏ**: nó tốn ~1 giờ chỉ để tinh chỉnh một lựa chọn mà
    giờ không còn đánh đổi — 768 đã trội cả về chất lượng lẫn thời gian.
- *(Luật user đã chốt, KHÔNG phải việc: mọi thí nghiệm chạy trên BẢN SAO — bản đang dùng:
  `D:\huy.nguyen\zemory-lab\lab.db`, chụp bằng `db.backup()` nên nhất quán.)*
- *(Hạ tầng sẵn: `ZEMORY_POOL` · `ZEMORY_RERANK_POOL` · `ZEMORY_RERANK_CHARS` chỉnh từ ngoài;
  bench có cột `@40` + kết luận tự động; `topN` 10 → 40.)*

## 🔴 RECALL: bản vá 3 lane ĐỔI CHỖ, chưa xong — việc kế tiếp rõ ràng (2026-08-08)

**Bench THẬT cuối ngày (máy rảnh, coverage 100%, `bench-final.log`)** — số này SUPERSEDE mọi
con số mô phỏng đã báo trong ngày:

| | trước vá | sau vá |
|---|---:|---:|
| `prose` @1 | 18% | **32%** ↑ |
| `prose` @3 | 47% | 41% ↓ |
| `prose` @10 | 62% | 53% ↓ |
| `prose` MRR | 0,354 | **0,384** ↑ |
| `tool_result` @10 | 25% | **0%** ↓↓ |

⇒ Bản vá **đẩy đáp án lên vị trí đầu nhưng làm mỏng top-3/top-10**. Giả thuyết (CHƯA xác minh):
lane OR rộng, lấn chỗ lane VECTOR vốn gánh @10 cho `prose`. Mô phỏng trước đó chạy FTS thuần
nên mù với cạnh tranh này — **giới hạn của phép thử pool đóng băng, ghi lại để đừng lặp**.

> ✅ **CẢ BA MỤC DƯỚI ĐÂY ĐÃ ĐÓNG — soát bằng code 2026-08-09.** Sổ đứng yên ở trạng thái
> 08/08 trong khi ba đợt vá ngày 09/08 đã xử hết. Giữ dòng + bằng chứng để không ai mở lại.

## 🔴 RERANK ĐANG BẬT TRÊN MÁY NÀY — chờ user tắt (phát hiện 2026-08-08, ưu tiên cao)

File config cạnh kho (gitignored) có khoá `rerank` = `true`. Code đã vá **mặc định = TẮT** (có
`settings-defaults.test.mjs` khoá), nhưng **giá trị cũ trong config KHÔNG tự tắt theo** — đúng
ca `plan/05 §4.E` đã ghi: đợt 07-26 chỉ vá GIÁ TRỊ, đợt sau vá MẶC ĐỊNH, và máy nào đã lỡ ghi
`true` thì nằm lại vĩnh viễn. Bằng chứng nó đang chạy thật: `memory search` in header
`… · rerank (cross-encoder) · …`.

**Giá phải trả, đo 2026-08-08 trên kho 768:** hybrid `41%@10` → hybrid+rerank `27%@10`
(MRR 0,220 → 0,160) và **11 s/truy vấn** thay vì 0,68 s. Tức mọi lần recall trên máy này đang
**chậm 16 lần và tệ hơn**. Rất có thể là một phần của triệu chứng "search trả rác".

## 🆕 Phát sinh 2026-08-09/10 — 4 việc

- [ ] **(ĐỀ XUẤT `02_RULES` — chờ user chốt) Luật: phép đo TỰ DỰNG phải khớp tham số của bench.**
  Phiên này tôi dựng probe thiếu `all: true` (bench luôn có) rồi rút 3 kết luận sai từ nó
  (`TOOL_DEMOTE` · `vecMix` · gộp-trùng). Luật đã có câu *"đo bằng bề mặt hẹp hơn…"* nhưng KHÔNG
  nói rõ ràng buộc "probe phải sao chép tham số của thước chính thức" — đó là chỗ tôi lọt qua.

## 🔴 WRITE-GATE VẪN THỦNG — bắt được ĐANG XẢY RA 2026-08-08 (ưu tiên cao)

**Hai `memory embed --all` cùng ghi MỘT kho** — đúng tổ hợp đã hỏng kho 03/08. Bắt được lúc
đang chạy, không phải suy đoán: `Win32_Process` cho thấy **pid 15640** (backfill chạy tay) và
**pid 11092** (do daemon vừa bật sinh ra) cùng chạy `dist\cli.js memory embed --all`, mỗi bên
~2,3–2,8 GB RAM. Đã dừng pid 11092 + tắt scheduler qua `/set-scheduler` (đảo được: bật lại
trong ⚙ Tự động).

**Khoá KHÔNG hỏng — người GỌI bỏ qua lời từ chối.** Bằng chứng: `data/cli-write.lock` ghi
`{"pid":15640,"label":"embed"}`, tức `acquireCliWriteLock` ĐÃ trả `ok:false` cho tiến trình
thứ hai. Nhưng `commands/memory.ts` chờ 24×5 s rồi in *"chờ quá lâu — chạy tiếp"* và **chạy
luôn**. Với job embed dài HÀNG GIỜ thì nhánh "chạy luôn" là nhánh **luôn luôn** được chọn.
⇒ Bản vá 2026-08-06 sửa được vế "khoá không bao giờ từ chối", nhưng vế "người gọi phải nghe
lời từ chối" thì chưa. Khoá đúng, cửa vẫn mở.

> ✅ **CẢ BA MỤC ĐÃ ĐÓNG — soát bằng code 2026-08-09** (sổ đứng ở trạng thái sáng 08/08, bản vá
> landing cùng ngày nhưng không ai đổi dấu). Giữ dòng + bằng chứng để không ai build lại lần hai.

## 🆕 Phát sinh 2026-08-07 tối (sau release 1.2.0) — 4 việc

  ✅ **ĐÃ CHẠY 2026-08-15** — gate đầy đủ **670/670 pass · 0 fail · 0 skipped**, tức 5 file đó
  đều chạy thật (không ca nào bị `skipIfBusy` bỏ qua).
  ~~**CHẠY 5 FILE TEST CÒN MÙ sau khi embed xong:** `embed` · `rerank` · `vectors` ·~~
  `memory-search` · `digest`. Ba lượt audit hôm nay CỐ Ý bỏ chúng để không tranh CPU với job
  embed (đo thật: bench chạy song song làm embed tụt về 0 chunk/30 s). Ghi ra đây để **không ai
  đọc "audit xanh" thành "đã soi hết"** — vùng này chưa được soi trong cả ba lượt.
  Chạy CÙNG DỊP hai lượt bench, không cần lượt audit riêng.
- [ ] **(chờ user) Guard PreToolUse thêm ~650 ms MỖI tool call** — đo 2026-08-07: Bash cho qua
  652 · Bash bị chặn 734 · Read 660 · Write 437 ms (p50, đo TRONG lúc embed chạy nên là cận
  trên). Vài trăm tool call/phiên ⇒ cỡ 1–2 phút. Không phải lỗi, là **chi phí cần quyết**: có
  thu hẹp `matcher` trong `.claude/settings.json` không (vd bỏ `Read` — nhưng mất chốt chặn đọc
  file khoá trực tiếp). Đường gỡ hoàn toàn: xoá `.claude/settings.json` của repo.
  ⚠ **Guard chỉ ăn TỪ PHIÊN SAU** (hook nạp lúc mở phiên). Đo 07/08: `.allow-push` vẫn còn
  nguyên sau khi push ⇒ phiên đó guard chưa gác. Từ phiên tới `git push` sẽ bị chặn tới khi
  user duyệt; flag đã tự dọn, KHÔNG để lại sẵn.
  ❌ **SỐ ĐÃ CHẾT** — nay version là **1.5.19**, tag `v1.2.0` không còn nghĩa gì. Repo vẫn chỉ có
  3 tag mốc-trước-refactor. *Việc thật nếu muốn: đặt tag theo release hiện hành, user quyết.*
  ~~**Chưa tạo git tag `v1.2.0`.**~~ Repo mới có tag dạng mốc-trước-refactor, chưa có tag
  version nào — không tự tạo tiền lệ mới. Một lệnh là xong nếu user muốn.
- [ ] **(ĐỪNG "dọn cho đẹp") Index lưu đường theo separator của OS**, không phải posix: 23 doc
  row của repo này đều dạng `docs\agent\…`, và mọi chỗ TRA cũng ghép bằng `join`. Đợt vét 07/08
  từng "chuẩn hoá" sang `/` và hậu quả đo được: `plan ls` im lặng báo "index rỗng" dù chỉ mục
  đủ, và lần `reindex` sau sẽ đẻ doc row TRÙNG. Chuyển sang posix là một **MIGRATION riêng**
  (phải đổi cả index cũ + mọi chỗ tra trong cùng bước), không phải việc dọn dẹp lẻ.

## 📌 Cowork — còn treo

- [ ] **Nợ cổng của 4 mặt audit mới (spec: `docs/plan/18_audit_coverage.md`).** Xếp theo "có sự
  cố THẬT mà chưa có cổng nào":
  · ✅ **⑧ Phụ thuộc & license — TRẢ XONG 2026-08-15 (user ra lệnh làm):** ① cổng license
    `backend/test/license-gate.test.mjs` (3 ca, tự vào `npm run check` qua glob) — quét CẢ CÂY
    190 gói, parser SPDX xử ĐÚNG OR/AND (ca AND-trap `Apache-2.0 AND LGPL-3.0-or-later` nằm trong
    bộ tự-kiểm), 2 ngoại lệ đích danh có test canh "ngoại lệ phải còn đúng sự thật"; đột biến
    chứng minh đỏ được (gỡ Apache-2.0 ⇒ 2 đỏ) · ② `npm run check:clone`
    (`backend/scripts/clone-check.mjs`, CỐ Ý ngoài gate mặc định — cần mạng, gate chậm là gate bị
    bỏ qua) — đo thật cùng ngày: clone 2,0s → prebuilds 0,2s → install 23,9s → build 6,7s →
    smoke `zemory 1.5.21` ⇒ **máy trắng dựng được**. Không pipe qua `tail` (bẫy nuốt exit code).
  · **⑨ Diễn tập phục hồi định kỳ**: "dữ liệu lành" KHÁC "dựng lại được"; mãi 11/08 mới thử lần đầu
    và đúng lần đó lộ ra kênh mang đi vứt sạch lớp vector.
  · **⑦ Quét LỊCH SỬ git** (hiện chỉ quét cây HEAD) + canh file lớn trước khi push.
  · **⑩ Đưa ma trận guardrail vào gate chính** thay vì chạy tay như hôm nay.

- [ ] **(ĐỀ XUẤT — cổng máy canh) Kiểm bundle ĐÃ RỜI KHỎI MÁY chưa, đừng chỉ kiểm "đã ghi file".**
  Sự cố 2026-08-11: client đồng bộ kẹt hàng đợi ⇒ bundle nằm im trong thư mục Drive, **hai gói
  317 MB kẹt từ 08/08 (3 ngày)** và bản bàn giao 1,63 GB cũng vậy — trong khi `memory sync` lần nào
  cũng báo "đã xuất" thành công. Máy kia không nhận được gì suốt thời gian đó và **không cổng nào đỏ**.
  **Đo được bằng máy:** sổ của client giữ hàng đợi thao tác + định danh mục; mục chưa lên mây mang
  định danh **cục bộ** (tiền tố `local-`) và **kích thước phía máy chủ = 0**. Đề xuất: thêm một check
  cạnh `storage-safety`/`cloudguard` — bundle mang định danh cục bộ quá N phút ⇒ **báo đỏ**, kèm số
  mục đang kẹt và mục cũ nhất. Cùng doctrine "máy canh, đừng dựa agent nhớ".
  ⚠ **Ràng buộc:** chỉ ĐỌC sổ của client, tuyệt đối không sửa/xoá trạng thái của nó; và phải chịu
  được ca không tìm thấy sổ (fail-open — điều 9), vì đường dẫn/định dạng của client có thể đổi.
  *(Bài học kèm theo: dấu `user-paused` và dòng "Syncing is paused" trong nhật ký client **KHÔNG**
  đủ để kết luận đang bị dừng — tôi đã kết luận sai từ đúng hai dấu hiệu đó, trong khi hàng đợi vẫn
  tự rút hết sau khi khởi động lại client. Thứ đáng tin là **hàng đợi + định danh**, không phải chữ
  trong log.)*
- [~] **Đường TẢI vẫn chưa test — test 1 đi vòng qua nó.** Phiên Cowork thật đầu tiên (2026-07-28,
  repo `vietnam_34_provinces_grdp_dashboard` clone vào `D:\Zyro\Tool\test`) **không dùng URL**: agent
  phát hiện máy có sẵn bản chuẩn ở `D:\Zyro\Tool\Zemory\docs_template\nonapp`, **tự đối chiếu số dòng
  8/8 rồi chép thẳng từ đĩa** — một lối BOOTSTRAP chưa hề khai. Đó là lối rẻ nhất và nó tự kiểm trước
  khi chép, nên đã **khai chính thức thành "lối 0"** (kèm bắt buộc đối chiếu số dòng — bỏ bước đó thì
  có nguy cơ chép nhầm bản cũ).
  - **ĐÃ CÓ SỐ THẬT (2026-07-30, user chụp lại phiên trên thư mục `test2` trắng — không có bản local nên
    rơi đúng vào đường mạng):** `curl` thẳng tới `raw.githubusercontent.com` **BỊ CHẶN** — sandbox chỉ ra
    được miền Anthropic, đúng như BOOTSTRAP §1a dự đoán. **Lối 1 (tool lấy nội dung web của Cowork) CHẠY**:
    agent tự chuyển sang lối đó và ghi ra file theo từng lô (5 → 4 → 2 …), panel file hiện `AGENTS.md` ·
    `CLAUDE.md` · `01_CONSTITUTION` · `02_RULES` · `05_TODO` · `06_CHANGES` · `00_overview` · 2 `SKILL.md` ·
    `conventions.md` · `check_structure.py`. ⇒ **Thứ tự lối trong BOOTSTRAP là đúng, và máy sếp sẽ dựng được.**
    *(Bằng chứng là ảnh chụp phiên, không phải tôi tự chạy — và phiên đó chụp lúc còn đang chạy Giai
    đoạn 1, CHƯA thấy BÁO CÁO CUỐI. Tức chưa kết luận được: dựng trọn bộ 19 file, và bước tự kiểm
    cuối — script check_install chạy BÊN MÁY SẾP — có xanh không. File script tồn tại trong repo
    nguồn không nói gì về lần cài bên kia; `todo verify` từng giơ cờ mục này vì đúng chỗ đó.)*
  - **Đã biết thêm (đo được từ chính phiên đó):** sandbox Cowork **ĐỌC được filesystem của host** — nó đọc
    thẳng `D:\Zyro\Tool\Zemory`. Khớp tài liệu sandbox của Claude Code (*"Read access covers the entire
    filesystem"*). Ghi vào không rõ, chưa thử.
  - **Agent tự áp `02_RULES §Phạm vi project` đúng chỗ:** dừng lại hỏi trước khi ghi harness vào cây git
    public của user, dù không ai nhắc. Luật đó ăn.

## 📌 Bàn giao 2026-07-28 — ĐÃ ĐÓNG 2026-08-05 (user duyệt → `06_CHANGES [2026-08-05d]`)
> Ba lane web (claude-web 3 lỗi · hỏi-đăng-nhập giữa run · nút Quét kéo web) + lane `claude-cowork`
> đã ghi sổ đầy đủ ở entry đó. Quyết định "KHÔNG lấy cookie từ trình duyệt chính" giữ nguyên.

<details><summary>Bản gốc 3 mục (giữ để tra lại lý do — nội dung đã vào changelog)</summary>

- **`claude-web` — ĐÃ GHI SỔ `[2026-08-05d]`.** *(hồ sơ đo, không còn là việc)*
  > 🔄 **Bác bỏ chẩn đoán cũ của chính mục này** (*"MẤT TRẮNG chat trong Project vì thiếu
  > `projectConvsExpr`"*). Sai. Đo hai đường trước khi sửa: ① item của
  > `…/<org>/chat_conversations` mang `project_uuid` **không null**; ② so TẬP id với
  > `…/<org>/projects/<pid>/conversations` ⇒ **`projectIdsMissingFromLoose: []`**. Tức danh sách
  > phẳng của claude.ai **đã chứa cả chat trong Project** — khác ChatGPT, nơi comment
  > *"A Project's chats are NOT in the loose list"* mới đúng. Tài khoản này **thật sự chỉ có 2 hội
  > thoại / 1 project**, nên "2 phiên · 6 tin" là con số ĐÚNG, không phải triệu chứng.
  > ⇒ **KHÔNG thêm `projectConvsExpr` cho claude** — nó chỉ kéo về đúng những id đã có (`CLAUDE_LIST`
  > có comment ghi rõ + test khoá, để phiên sau khỏi "vá" lại).

  **Ba lỗi THẬT tìm được khi đo, đã sửa:**
  1. **`o[0]` làm org** — account có 2 org (`chat`·`claude_max` và `api`·`api_individual`); máy này
     tình cờ đúng. Nay chọn theo caps `chat`; không org nào có caps `chat` ⇒ **báo lỗi rõ**, không im
     lặng dùng org rỗng (biểu hiện y hệt "chưa đăng nhập").
  2. **Khoá resume hardcode `chatgpt-`** trong khi adapter claude ghi `claudeweb-<uuid>` ⇒ resume chết
     lặng, **mỗi lần chạy kéo lại toàn bộ tài khoản**. Nay `Platform.sessionPrefix`, test so PARITY với
     id adapter thật sinh ra. *(Đo trên DB thật: 2 phiên đều mang tiền tố `claudeweb-`.)*
  3. **`project_root` là uuid thô** — payload CHI TIẾT (`?tree=True…`) có `project_uuid` nhưng
     `project: null`; chỉ danh sách phẳng mới có `project:{name}`. Nay `CLAUDE_PROJECTS` map uuid→tên +
     sidecar `_projects.json` (dùng chung `readProjectMap` với ChatGPT). **Đo sau khi chạy thật:
     `019f68e1-…` → `VU-Project`.**

  **Cowork vẫn KHÔNG lấy được qua đường này** — `cowork_sessions` · `tasks` · `sync/mcp` đều **404**
  (đo 2026-07-30). Vá Project không đổi điều đó; đừng hứa ngược lại.
- **Hết hạn xác thực khi scan web → HỎI + mở cửa sổ — ĐÃ GHI SỔ `[2026-08-05d]`.**
  Trước: `need-login` là ngõ cụt — in *"a browser window is open at …"* **kể cả khi không mở cửa sổ nào**
  (chỉ mở khi cổng debug chết), và hết hạn GIỮA run thì mọi hội thoại còn lại đếm thành `failed`, log
  trông y như bị rate-limit. Nay: `awaitLogin()` mở cửa sổ **trước** rồi mới hỏi, kiểm lại auth sau mỗi
  câu trả lời; giữa run cứ **3 lần fail liên tiếp** thì hỏi lại site xem còn đăng nhập không — mất phiên
  thì lưu phần đã kéo, hỏi, đăng nhập xong **chạy tiếp tại chỗ**. Không TTY (daemon/pipe) ⇒ mở cửa sổ rồi
  báo `need-login` + exit 1, **không treo** chờ câu trả lời không ai gõ được.
- **UI: nút Quét kéo được web + hỏi đăng nhập — ĐÃ GHI SỔ `[2026-08-05d]`.** *(user báo 2026-07-30:
  "bấm scan nó ra mới nhưng vẫn ko lấy từ web dc, cũng ko hề hỏi authen")*
  **Nguyên nhân:** cả hai nút (`scan`·`deepscan`) POST `/memory-scan` → `scan()` = **chỉ đọc đĩa**. UI
  **chưa bao giờ** có đường quét web ⇒ không lấy được web, và cũng không có chỗ nào để hỏi authen. Bản
  sửa CLI trước đó đúng nhưng nằm sai bề mặt.
  **Thiết kế user chốt:** *gộp vào nút Quét sẵn có + công tắc bật/tắt, nhớ qua phiên* (không đẻ nút mới).
  ⇒ `getScanWeb()` mặc định **TẮT** · `/memory-scan?web=1` · `/memory-scan-web?platform=` (nút "chạy tiếp"
  sau khi đăng nhập) · `/set-scan-web` · công tắc `data-auto="scanweb"`.
  **Vì sao UI không hỏi trực tiếp trong lúc quét:** giữ request HTTP mở để chờ người đăng nhập là treo
  daemon ⇒ server chạy **không tương tác**, chỉ MỞ cửa sổ rồi trả `need-login`; chỗ HỎI nằm ở dialog UI.
  CLI vẫn hỏi ngay tại terminal (có TTY).
  **Scheduler nền KHÔNG kéo web** (test khoá) — 10 phút một lần tự mở trình duyệt là hành vi không ai xin.
  **Đo bề mặt sống:** `POST /memory-scan` trả `web: [{chatgpt: need-login}, {claude: done · skipped 2}]`,
  và cửa sổ đăng nhập chatgpt **mở thật** (pid 7440, đúng thời điểm quét).
- **KHÔNG lấy cookie từ trình duyệt chính (user hỏi 2026-07-30) — quyết định GIỮ NGUYÊN, không phải việc.**
  Đã xác minh từ `plan/07 §5`: copy cookie/DPAPI từ profile Edge có sẵn bị **App-Bound Encryption** +
  guard chặn; vượt được chỉ bằng cách tiêm vào tiến trình trình duyệt (kiểu malware) và phá điều 7. Cookie
  **đã tự dùng lại** trong profile RIÊNG của zemory (`data/browser/<nền>`) — hỏi đăng nhập chỉ xảy ra khi
  chính cookie đó hết hạn. Ghi lại đây để phiên sau khỏi thử lại đường đã chết.

</details>

## 📐 Đối chiếu bộ COWORK vs bộ ĐẦY ĐỦ (đo 2026-07-31) — 2 việc
> Nền quyết định (GM `#2131427`, user 29/07): *"dùng harness zemory **ko có nghĩa là toàn bộ**… kết hợp
> với harness của chính claude… **vẫn đủ ý, đủ luật của zemory** và **cắt nhỏ lại phù hợp cho memory
> ngắn hạn của claude**… nếu cần thì sẽ **bổ sung thêm phần template cowork lại**"*.
>
> **Kết quả đối chiếu — phần lớn KHÔNG mất, chỉ đổi nhà:** `03_STRUCTURE` (130 dòng) → skill
> `structure/` (SKILL 97 + conventions 129 + `check_structure.py` 227) — **nhiều hơn bản gốc**, giữ đủ
> cây-có-mô-tả + routing + dòng `docs/dictionary.md`. `04_SKILLS` (233) → 13 skill nạp on-demand.
> Changelog/supersede → `session-close` Bước 3. Global Memory-verify → `session-close` Bước 1 **có rào
> 🖥️ "chỉ khi có zemory CLI"**. Bộ cowork còn SỬA một lỗi của template gốc: `audit` bỏ 3 mặt app-only
> (`npm run check` · FE↔BE · `integrity_check`) vốn không áp được cho non-app.

## 🔌 Đối chiếu engram — 6 việc ĐÃ XONG + ghi sổ (`06_CHANGES [2026-08-02f]`/`[g]`, chi tiết ở đó); còn:
> Số nền đo trên BINARY THẬT (engram v1.20.0): engram **22 tool** · zemory **12**. `DOCS.md`
> của họ liệt kê thiếu 2 tool — đọc tài liệu KHÔNG thay được chạy binary. Cowork vẫn ngoài
> phạm vi MCP (máy ảo riêng).

> ⏸ **HOÃN VÔ THỜI HẠN 2026-08-06 (user chốt): mọi mục nhánh CODEX + GEMINI.** Nguyên văn:
> *"cái này ko cần quan tâm, t chưa làm… bỏ qua đi"* — user chưa dùng hai host đó, nên khai MCP
> cho `codex`, mở rộng hook Codex, và nền web Gemini đều KHÔNG có người tiêu thụ. Giữ nguyên hồ
> sơ (đo đạc còn giá trị nếu sau này dùng tới); **đừng đưa lại vào danh sách ưu tiên khi chưa hỏi.**

- [ ] ⏸ **Ba agent chưa khai tự động được** (đã nêu tên trong `setup mcp`, không im lặng bỏ qua):
  `codex` (cấu hình **TOML**) · `opencode` (khuôn entry khác) · `pi` (nối bằng plugin package).
  **Đo trên engram v1.20.0 (2026-08-02) — họ làm được cả ba, và đây là hình dạng cần khớp:**
  `codex` → ghi `%APPDATA%/codex/config.toml` (642 B) + `engram-instructions.md` + prompt phục
  hồi sau nén · `opencode` → `~/.config/opencode/opencode.json` + plugin `engram.ts` **21 KB**
  · `pi` → cài npm `gentle-engram`, cần `pi` trong PATH (thiếu thì lệnh của họ cũng lỗi).
  ⇒ khoảng cách là THẬT, không phải giới hạn của ngành. Rẻ nhất là `codex` (chỉ cần bộ ghi TOML).

## 🧷 Context-guard + realtime capture — ĐÃ BUILD XONG `[2026-08-02h]`; còn 2 việc
- [ ] ⏸ **Codex chỉ nhận `Stop`** — hệ hook của nó không có `UserPromptSubmit`/`PreCompact`/
  `SessionStart`, nên máy chạy Codex có capture per-message nhưng KHÔNG có đồng hồ context
  lẫn lưới sau nén. Chưa tìm hiểu Codex có sự kiện tương đương không.
  *(HOÃN 2026-08-06 — user chưa dùng Codex; xem ghi chú ⏸ ở §🔌 engram.)*
> ✅ **Bốn mục dưới ĐÃ XONG — dấu đã đổi `[ ]` → `✅` (05/08), soát lại bằng code 2026-08-06 vẫn
> đúng:** `WARN_AT_PERCENT = 95` (`capture-hook.ts:28`) + marker chống spam
> (`context-guard/<sid>.warned`) · handler `pre-compact` · handler `session-start` chỉ nói khi
> `source=compact` + `recallCard` · bảng khai hook có đủ 4 sự kiện (`capture-hook.ts:191–194`) ·
> `context-guard.ts` có `readContextUsage` + `lastCompactAt`.
> **Giữ nguyên dấu `✅` — đừng đổi ngược về `[ ]`,** phiên sau sẽ build lại lần hai.

> Gốc: đối chiếu "compaction recovery" của engram. **Session-lifecycle KHÔNG làm** (đã có tốt
> hơn, tự động: sessions từ transcript + digest 100%). "Nén từng đoạn hội thoại": digest
> per-phiên ĐÃ CÓ (plan 06, 2026-07-02); compression đúng nghĩa đã BỎ 2026-06-25 (attic/).
> Số đo nền (2026-08-02): usage nằm sẵn trong transcript (`cache_read+cache_create+input` —
> phiên thật đo 439k) · scan incremental cả kho: **7,2s** có tin mới · **1,8s** no-op ·
> **~125s khi embed nền chạy** (tranh CPU + write-gate — hook sẽ timeout, scheduler lượm lại).

## 🔬 Audit 2026-08-03 (6 mặt) — 3 lỗ đã sửa tại chỗ, còn 2 việc CHỜ USER
> Chi tiết + số đo: `06_CHANGES [2026-08-03]`. Sạch: gate 481 · conform · integrity ok ·
> 0 mồ côi · digest 100% · 0 project tách tên · 44/44 neo test sống.

- [~] **RERANK: GIỮ, nhưng phải rẻ đi — đang đo cách cắt (user phản biện đúng 2026-08-03).**
  > 🔄 **Rút lại đề xuất "nên tắt rerank" tôi viết cùng ngày.** Nó dựa vào hai câu chưa đủ:
  > ① *"rerank chưa từng thắng"* — corpus gate chỉ **8 truy vấn** và hybrid đã **8/8**, một
  > corpus BÃO HOÀ thì không thể cho rerank cơ hội thắng; đó là giới hạn của phép đo, không
  > phải bằng chứng rerank vô dụng. ② rerank là **thành phần chuẩn của RAG** (bi-encoder
  > không cho query và doc "nhìn" nhau; cross-encoder thì có) — bỏ nó là bỏ một lớp chất
  > lượng thật để đổi lấy tốc độ.
  **Đã đo (2026-08-03):** chi phí TUYẾN TÍNH theo tổng token — 40 cặp×2000 ký tự **51,6s** ·
  20×2000 **25,5s** · 10×2000 **13,6s** · 40×400 **10,3s**. Ép số luồng ONNX (8) **không
  đổi** (25,6s → 27,9s = nhiễu) ⇒ không phải lỗi cấu hình luồng, mà là giá thật của
  cross-encoder base trên CPU máy này (Ryzen 5 7520U).
  **Bảng đánh đổi (pool đóng băng, 4 truy vấn, tự-kiểm gốc-vs-gốc đạt 3/3 & 5/5):**
  `40×2000` (hiện tại) 31–38s · `20×2000` 23,8s · `40×800` 31,5s · `20×800` **12,4s** ·
  `16×800` 10,7s · `12×600` 8,9s. Đáng chú ý: ở pool 20, cắt 2000→800 ký tự **không đổi độ
  đồng thuận** (1,8/3 · 2,8/5) mà **rẻ đi gần một nửa**.
  **Model nhẹ hơn — đo rồi, CHƯA dùng được:** `ms-marco-MiniLM-L-6-v2` nhanh **6×**
  (3,3s vs 19,6s/truy vấn) và qua được phép thử lẻ tiếng Việt, NHƯNG xếp hạng lệch hẳn bge
  (top-1 **0,3/1** · top-3 **0,5/3**) — nó huấn luyện trên MS MARCO tiếng Anh, kho này chủ
  yếu tiếng Việt ⇒ lệch nhiều khả năng là KÉM đi, không phải khác đi.
  **⚠ GIỚI HẠN của chính phép đo trên — phải nói ra:** "độ đồng thuận với cấu hình hiện tại"
  đo **độ ỔN ĐỊNH, không phải CHẤT LƯỢNG**. Bản 40×2000 không phải chân lý; một thứ tự khác
  chưa chắc tệ hơn. Muốn chốt pool/chars/model thì **phải có corpus có nhãn đủ lớn** — đúng
  đường `plan/05` dòng 73 đã ghi, và đúng đòi hỏi của `HP điều 12`. Trước khi có nó thì
  KHÔNG đổi mặc định dựa trên mấy con số này.
  *(Bài học phép đo: hai bản đầu đều SAI — bản 1 bị daemon ingest làm trôi pool giữa các lần
  đo, bản 2 tính cả truy vấn pool=1 nên top-3 tối đa đã là 1/3. Bản 3 thêm PHÉP TỰ KIỂM
  "gốc vs gốc phải ra 3/3 và 5/5" — đạt — mới tin được số.)*
  **Đã giảm đau mà KHÔNG đụng chất lượng:** rerank thôi chặn đường — MCP mặc định hybrid
  (0,9s), lượt sâu của UI chạy ở tiến trình con. Rerank vẫn còn nguyên, gọi khi cần.

## 🔬 Audit toàn diện 2026-08-02 (Fable, 6 mặt) — F1/F4 ĐÃ SỬA `[2026-08-02h]`, còn F5/F6
> Gate 462/462 · conform ✓ · integrity ok · schema v20 trên DB thật · 0 mồ côi (3 phép đo) ·
> digest 100% · neo test sống 100% · endpoint parity sạch · 15/15 endpoint sống 200.
> Nghi vấn ĐÃ LOẠI (ghi để khỏi đào lại): "daemon crash tái hiện khi audit" — SAI, daemon chết
> vì lệnh đo của tôi (`| Select-Object -First 5` giết native command khi pipeline đủ N object);
> chạy detached thì 15/15 xanh. Hộp đen đúng: không có dòng exit vì bị kill cứng. Con bug
> exit-1 thật (07-21) vẫn CHƯA tái hiện. · "134 export mồ côi" — 133 là interface/type (bề mặt
> kiểu công khai) hoặc dùng nội bộ; chết thật chỉ `resolveDocPath` (đã biết, cố ý giữ).

> **F6 XONG TRỌN** (`[2026-08-02i]`): backend tách hai lớp + UI có chip `🔬 Tìm sâu`.
> Còn để ngỏ, chưa cần: lượt sâu hiện chờ đồng bộ tới 120s rồi mới trả — nếu sau này thấy
> vướng thì đổi sang trả `202` + poll như `/sync-status` (hạ tầng đã có sẵn).

<details><summary>F6 gốc — ĐÃ SỬA phần lõi `[2026-08-02i]`</summary>

> **F1 + F4 đã sửa** — chi tiết ở `06_CHANGES [2026-08-02h]`. (F1 hoá ra còn một tầng nữa:
> probe thật mất **48s** nên tách cờ `deep`; F4 gom về `core/config::projectKey`, riêng
> `graph-memory::norm` giữ lại CÓ CHỦ ĐÍCH vì id node dùng `/`.)

- **Nợ đo lại — ĐÃ ĐO 2026-08-05, cả hai đóng:** vector backlog kho thật còn **639** (không phải
  ~4.6k; scheduler đã lượm gần hết trước khi tôi tắt nó chiều nay — phần còn lại sẽ do lần embed sau
  khi TRÁO xử) · entry `2026-08-02` đã trôi xuống `archive/06_CHANGES.md`, không còn trong bộ đọc.

## 🔬 Audit 2026-07-27 — còn 1 finding
## 🧹 Từ đợt P2/P3 + Graph Engineering — còn mở
- [ ] Đã đối chiếu bản "Graph Engineering" (user gửi 2026-07-27) với graph mình. **Khoảng trống lớn nhất còn lại: KHÔNG có phía WRITE** — worker đọc được graph nhưng không publish phát hiện ngược lại kèm `run_id`/provenance; và **không có lớp công việc** (không node `AgentRun`/`Claim`/`Evaluation`). Chấm theo thước của tài liệu, zemory đạt *artifact · source · graph path*, thiếu *objective · plan · evaluator decision · execution record*. **KHOAN xây** — chính tài liệu cảnh báo "đừng thêm knowledge graph chỉ vì hệ có agent"; graph hiện đang kiếm đủ tiền nuôi thân ở vai cấu trúc + định tuyến.

**🚫 ĐÃ LOẠI — false-positive (giữ lại để phiên sau khỏi báo lại)**
`/set-` "404" = chuỗi động `'/set-'+nm` · `data-act="recall"`/`sysrecheck` "không handler" = có, qua `closest('[data-act=…]')` · `share/share.key` committed = **KHÔNG còn là false-positive** — repo hoá PUBLIC nên giả định "keep repo private" mà quyết định đó dựa vào đã sai; chìa đã xoay + gỡ khỏi git 2026-07-29 · `/cockpit` "gãy" = không gãy (lúc đo daemon đang tắt) · `/nav-cost` `/gate-acquire` `/gate-release` `/sync` `/migrate` "dead" = CLI/surface khác dùng.

## ⭐ Ưu tiên kế tiếp
> Toàn bộ diễn biến UI refactor (VÒNG 1–11, plan 15, 5 quyết định) đã XONG và dời sang `archive/05_TODO.md` + `06_CHANGES`. Dưới đây chỉ còn thứ chưa chốt.

**CÒN TREO từ đợt UI refactor:**
- [ ] **`/session-raw` (đọc transcript gốc) — CHƯA làm, chờ user quyết**: chỉ bù được **4,18%** tin bị clip + khối `thinking` bị bỏ lúc ingest; và với session **sync từ máy khác thì file không có ở máy này** (`ingest_state` toàn đường `C:\Users\Zyro\...`) ⇒ phải fail-open về DB. ROI thấp, nêu ra để user chốt chứ không tự làm.
- **`adapters` — ĐÃ CHỐT, không còn là câu hỏi** *(soát bằng code 2026-08-05)*: `03_STRUCTURE §4`
  dòng 201 khai rõ *"adapter theo host/nguồn → `backend/src/<domain>/adapters/` — slot LỒNG trong
  domain, cùng khuôn với `graph/`"*. Tức đã chọn **domain-internal**, và `conform` xanh với cấu
  trúc đó. Giữ dòng này làm hồ sơ, không phải việc.
- [ ] **model-routing theo task** — idea-only. *(Soát 2026-08-02: tiền đề cũ "ĐỤNG điều 6, KHÔNG tự mở" đã HẾT HIỆU LỰC — điều 6 nới sang "HẠN CHẾ gọi LLM" ngày `2026-08-02b`. Nay không còn bị chặn thẳng, nhưng phải qua thứ tự ①script → ②agent liên kết → ③model + ích lợi đo được + user chốt.)*
- [ ] **Nợ nhỏ:** daemon exit-1 (hộp đen đã cắm, chờ repro). *(Start Menu icon **ĐÃ XONG** —
  `Start Menu\Programs\Zemory.lnk` tồn tại thật, kèm icon Z; dựng lại được sau khi vá bug
  Desktop-chuyển-hướng 05/08, không cần sign-out/in nữa.)*
- [~] **Đo tốc độ embed/ngày — VẪN CHƯA có số ngày-thường sạch.** Mẫu cũ (07-12, mega-session) = 41 msg/phút, lệch. Rebuild plan 12 (27 giờ, 94k message tồn đọng) cho thấy tốc độ dao động 40–380 msg/phút tùy độ dài message, nhưng đó là backlog dồn cục, KHÔNG phải nhịp ingest hằng ngày. Việc còn lại: sau 1 ngày dùng bình thường (không rebuild), chạy `zemory memory embed --all` + bấm giờ cho SỐ MESSAGE MỚI TRONG NGÀY ĐÓ để ra phút/ngày thật; nếu >20 phút → cân nhắc q4 dtype (hỏi user). **(2026-07-17) ĐO THẬT xong:** backlog 10291 → clear hết ~3h ⇒ ~57–58 msg/phút (256d · q8 · máy CŨ). **⚠ Vế "cân nhắc q4" ĐÃ CHẾT (2026-08-05):** đo 5 dtype trên máy mới — q4 **chậm hơn** q8 1,8× và kém chính xác hơn, fp32 mới là nhanh nhất (xem `06_CHANGES [2026-08-05]`). **VẪN CÒN:** số ngày-thường đo lại SAU khi tráo 768+fp32 (tốc độ đổi hẳn: 1,26 s/chunk).
- [ ] **(chờ user, việc ở repo khác) SasinFlow còn tồn đọng 9 entry changelog:** 9 entry 07-14→07-16 chỉ nằm trong `.md`, DB không có (tôi xóa khi khôi phục theo lệnh user). Với code mới **không mất được nữa** (CRLF đã vá + render salvage). Theo **FILE WINS**: 9 entry đã nằm trong `.md` (nguồn) nên coi như đủ; DB chỉ là index search, dựng lại từ file khi cần. (`docs sync` đã gỡ 2026-07-16.) KHÔNG tự sửa repo đó (`02_RULES §Phạm vi project`).
- [ ] F2. (TẦM NHÌN, sau core) Mở RAG sang **data chính** (ngoài memory agent): retriever **đa-store + `kind`**, chung model + retriever, DB tách được. Ý tưởng user — plan 05 §4.F.
- [ ] (Nếu cần quên tuyệt đối) Source-transcript privacy/tombstone: xóa/redact transcript gốc của agent host hoặc ghi tombstone chống whole-file adapter re-ingest lại dữ liệu đã quên.
- [ ] (TẦM NHÌN, tuỳ chọn — không bắt buộc v1) Session digest **B agent-authored**: khi recall chạm phiên, agent hiện tại đọc transcript viết đè `kind=agent` (có anchor). Bỏ B1 "agent tự viết lúc kết thúc". KHÔNG để zemory tự gọi LLM API. Spec: `docs/plan/06_digest.md`.
- **(user nêu 2026-07-20) Skill CHUNG vs RIÊNG — ĐÃ CHỐT: cấu trúc HIỆN TẠI chính là câu trả lời**
  (user 2026-08-05: *"cấu trúc hiện tại là đã chốt và build còn gì"*). Tức: **giữ `04_SKILLS` làm kho
  duy nhất** (7 skill, 4 mục, trần 60 dòng), playbook ở `.claude/skills/<tên>/`, skill ngoài vendor ở
  `external/skills/` — **KHÔNG dời skill chung về `02_RULES`**. Hồ sơ tranh luận cũ giữ bên dưới, KHÔNG
  hỏi lại.

<details><summary>Hồ sơ tranh luận (đã chốt, giữ để tra)</summary>
  > ⚠ **Đo lại 2026-08-05** (user bắt: *"làm lâu rồi mà, ko check code thật à?"*): mô tả cũ nói
  > *"04 ship 3 skill generic"* — **SAI, giờ là 7** (`grill` · `session-close` · `reconcile` ·
  > `conform` · `audit` · `read-office` · `write-docx`). Và `04_SKILLS` đã được **dọn đúng vai**:
  > 4 mục (luật dùng · danh mục · skill NGOÀI vendor · thêm skill), có **trần 60 dòng**, playbook
  > đã ra `.claude/skills/<tên>/SKILL.md` — tức phần "đừng để playbook bò về 04" ĐÃ XONG.
  **Phần CHƯA làm, đúng nguyên bản câu hỏi:** `04_SKILLS` (zemory) và `docs_template/*/04_SKILLS`
  vẫn có **cùng 4 heading, KHÔNG phân tầng** — không chỗ nào nói skill nào *ship từ template* (repo
  không sửa tay) vs skill nào *repo tự thêm*. Hệ quả: `sync` gap-fill không phân biệt được, người
  đọc không biết cái nào là chuẩn. **Đề xuất giữ nguyên:** 2 TẦNG trong `04` (`## Skill chuẩn (ship
  từ docs_template)` vs `## Skill riêng của <PROJECT>`), KHÔNG dời về `02_RULES` — 02 vừa dọn sạch
  playbook 2026-07-18, dời ngược là tái phạm.

</details>

## 🔥 Từ chốt sổ 2026-07-21 — làm trước
- [~] **DAEMON THOÁT exit 1 KHÔNG LOG (2026-07-21, thấy 1 lần) — ĐÃ CẮM HỘP ĐEN 2026-07-22, chờ repro để chẩn gốc.** *(Soát 2026-08-07: `daemon.log` sạch tới 06/08 20:41, daemon 4444 sống ổn từ đó — vẫn CHƯA tái hiện. Soát lại 2026-08-09: `todo verify` giơ cờ "code mới hơn sổ" vì `ui.ts` bị sửa 08/09 — **báo oan**, thay đổi đó là thêm tham số `also` cho `/memory-search`, không đụng `armCrashReport`. Mục vẫn ĐANG CHỜ tái hiện.)* Nghi **crash NATIVE** (better-sqlite3/onnxruntime segfault — bỏ qua handler JS) HOẶC stderr detached không capture. **Đã làm:** `backend/src/logging/daemon-log.ts` — `daemonLog()` ghi `<thư mục kho>/logs/daemon.log` (mirror stderr)
  *(⚠ sửa 2026-08-07: sổ — và cả comment trong chính file đó — ghi `~/.zemory/logs`, **SAI**. Đo:
  `logsDir()` = `join(currentMemoryDir(), "logs")`, tức log ĐI THEO KHO khi `relocate`; file thật ở
  `data/logs/daemon.log` (12.830 B, 07/08 09:04), còn `~/.zemory/` chỉ có `location.json`. Ghi sai
  chỗ này làm phiên sau soi nhầm nơi rồi kết luận "không có log".)* cho mọi lifecycle (up/shutdown/exit/uncaught/unhandled) + `armCrashReport()` bật `process.report` (reportOnFatalError + reportOnUncaughtException) → dump JSON **stack native** cạnh log. `ui.ts` arm ngay khi thắng port. **CÒN LẠI:** chờ lần daemon chết tiếp theo → đọc `daemon.log` + `report.*.json` để chẩn gốc; nếu tái hiện được thì chạy foreground + ép embed↔sync xen kẽ.
  *(⤴ Đã đóng 2026-08-10 — nguyên nhân là `start /b` không tách console, xem mục ✅ ở trên.)*

</details>
- ❌ **BÁC BỎ 2026-08-07 (user chốt) — cắt tool-dump khỏi FTS trigram. ĐỪNG ĐỀ XUẤT LẠI.**
  Agent nêu vì thấy **trigram = 512 MB = 42,3% kho** (to hơn bảng nguồn `messages` 275 MB) và
  tool-dump chiếm **56% khối lượng chữ** ⇒ ước tiết kiệm ~285 MB. **Sai ở gốc:** đo lại thì
  **119.668 tin tool-dump chỉ có 171 tin mang vector** (`vectors.ts` cố ý bỏ `tool_name IS NOT NULL`)
  ⇒ với **57% kho**, FTS word + trigram là **hai chân tìm kiếm DUY NHẤT**; cắt trigram là chặt một
  chân. Đổi lấy 285 MB trong khi ổ còn **140 GB trống**.
  **Đây đúng là lỗi của vụ cắt 256 chiều** — tính được phần TIẾT KIỆM, không đo phần MẤT. Sinh ra
  **HP điều 15**: chất lượng > dung lượng · cắt phải qua cổng như thêm · **tăng cũng phải đo trước**
  bằng phép thử nhỏ trên bản sao. Muốn giảm dung lượng thì tìm đường **KHÔNG đụng chất lượng**
  (dọn rác · dedup · VACUUM · nén lớp lưu), không phải cắt lớp tìm kiếm.

## 🧩 Graph — phase sau
- [ ] **Phase D** (tsserver/pyright → cạnh `resolved`) — HOÃN theo decision rule (đếm câu hỏi "sửa X đụng ai" trượt trong 2–4 tuần). ~~MCP mirror~~ **ĐÃ WIRE 2026-08-06** (`graph_impact`+`graph_neighbors`, 6/6 test — `[2026-08-06c]`). ~~Schema-change policy cho `graph.json` v2~~ **BỎ 2026-08-07 (user chốt): "ko xài, cũng không phù
  hợp app".** Đo trước khi bỏ: hợp đồng `graph.json` **chưa có consumer nào** — kế hoạch gốc là một
  "Graph App" repo riêng đọc file đó, nhưng quyết định 18/07 đã đảo (graph thành TAB trong `zemory ui`,
  đọc thẳng `/code-graph`, không qua file xuất). Viết luật versioning cho hợp đồng chưa ai ký là tạo
  cấu trúc chưa có nhu cầu. **Đừng đề xuất lại khi chưa có consumer thật.**
- [~] **Hạng cạnh BE↔FE seam — V1 ĐÃ BUILD 2026-08-07, soát lại 2026-08-09; spec graduate sang
  `plan/13 §4` (cạnh `api`).** *(Soát 2026-08-09: `todo verify` giơ cờ vì `ui.ts` sửa 08/09 —
  **báo oan**, đó là thêm tham số `also` cho `/memory-search`; cạnh `api` sinh bằng khớp chuỗi
  route nên route MỚI tự vào graph, không cần sửa gì. Vế `resolved` vẫn chờ typed contract.)*
  Đã ship: `graph-seam.ts` khớp chuỗi route FE↔BE, nhãn
  `inferred·textual`, ba bề mặt (`/code-graph` · `graph export`/`edge` · `graph impact` — đo trên
  zemory: `ui.ts` ← 10 file FE kèm route; soát 2026-08-09 sau khi `ui.ts` thêm tham số `also` —
  cạnh `api` sinh bằng khớp chuỗi route nên route mới TỰ vào graph, không phải sửa gì).
  **CÒN MỞ đúng một vế:** tầng `resolved` field-level cần
  **typed contract** (OpenAPI/tRPC) — chưa repo nào có contract; khi nào có thì thêm parser, và
  nhớ kết luận bên dưới: *codegen+tsc mới là KHOÁ CỨNG, graph chỉ là KÍNH SOI*. Hồ sơ phân tích
  gốc giữ nguyên bên dưới để tra lý do.
  *(Đề xuất gốc 2026-07-22:)*
  **Bối cảnh:** bài FB nhóm giới thiệu **Grapuco** (SaaS): AST toàn codebase → dependency/call/module graph + flow · **phát hiện phần bị ảnh hưởng khi API/schema/function đổi** · context cho agent qua MCP · chat-with-codebase · security scan · recommendation+priority. Bài toán nó nhắm = **2 người vibecode BE/FE lệch nhau**: BE thêm field / đổi schema → FE chưa cập nhật; FE đổi luồng đăng ký → BE giữ business rule cũ. User muốn hấp thụ **đúng phần mạnh nhất** (contract-impact BE↔FE) vào graph zemory, **KHÔNG** lấy phần LLM (chat/security/recommend — trái điều 6).
  **Insight then chốt (vì sao zemory hợp hơn Grapuco):** Grapuco phải **ĐOÁN** kiến trúc từ code trần; zemory **ĐỌC VAI TRÒ đã khai trong chuẩn 03** → suy cạnh khai báo mà không cần đoán. **Chuẩn 03 chính là "hệ nối" để graph nhìn được luồng BE↔FE** — đây là lợi thế không đối xứng, thứ Grapuco không có.
  **Cạnh mới cần thêm (hạng KHAI BÁO, 0-LLM, fail-open — mở rộng plan 13 §4, KHÔNG tạo capability mới, đúng điều 4/13):**
   - `frontend/client/` → `backend/src/api/` : seam FE-gọi-BE (slot-level, tất định từ 03 §4).
     *(slot FE đổi tên `api/`→`client/` ngày 2026-08-15 — xem `06_CHANGES`.)*
   - `backend/src/contracts/` (OpenAPI/proto/GraphQL-SDL) → node `endpoint` + `schema.field`, cạnh `field → endpoint → handler`.
   - `backend/src/store/` + `migrations/` → node `schema.field` (điểm BE đổi field).
   - `backend/src/shared/` (type dùng chung BE↔FE) → cạnh **`resolved`** khi 2 bên import chung type.
   - Ghép chuỗi: `store.field → contract.endpoint → frontend/client call → component/test` ⇒ `graph impact <field>` trả về **FE nào gãy** khi BE đổi field.
  **TRẦN — GHI RÕ để agent sau KHÔNG tưởng graph fix triệt để (3 tầng, theo điều 13):**
   1. Luồng **KHAI BÁO** (import · slot-seam · **contract typed**) → tự động, `resolved`/`declared`. Chuẩn 03 + typed contract cho không phần này.
   2. Luồng **SUY LUẬN** (FE gọi `fetch('/api/x')` chuỗi viết tay, KHÔNG codegen) → chỉ `inferred`/`textual`, **GẮN NHÃN**, KHÔNG giả dạng chắc chắn. Đây là **TRẦN, bằng Grapuco** — chuẩn 03 thu hẹp chỗ tìm chứ **không xoá được** việc phải match URL.
   3. Luồng **NGỮ NGHĨA** (business rule · thứ tự bước đăng ký · field giờ bắt buộc) → **NGOÀI TẦM MỌI GRAPH, mãi mãi**. Đây chính là lý do "vá BE/FE hoài không hết": đang lấy công cụ CẤU TRÚC đánh vào bài toán NGỮ NGHĨA. Grapuco cũng không giải được lớp này dù marketing gộp chung.
  **"Fix triệt để" KHÔNG bằng graph (ghi để khỏi kỳ vọng ảo — bài học plan 13 §7 counterfactual):** đòn thật cho tầng 1 = **contract-first + codegen 2 đầu** (OpenAPI→openapi-typescript/orval · tRPC share type trực tiếp · GraphQL-codegen) → **`tsc` biến drift thành LỖI COMPILE** (khoá cứng, không phải "phát hiện sau"). Tầng runtime/một-phần-ngữ-nghĩa = **contract test (Pact/consumer-driven)**. Graph = **KÍNH SOI** blast-radius; codegen+tsc = **KHOÁ CỨNG**. Repo chưa có typed contract → **việc số 1 là dựng contract, KHÔNG phải graph**.
  **Điều kiện để graph mạnh THẬT:** repo phải (a) bám chuẩn 03 để đọc vai + (b) có typed contract để field-level lên `resolved`. Thiếu (b) → phần BE↔FE field-level chỉ `inferred`, không hơn Grapuco.
  **Protocol đo Grapuco TRƯỚC khi tin/hấp thụ (như đã đo CALM plan 13 §9 — KHÔNG tin marketing):** Grapuco là SaaS, không có code để mổ ⇒ **dùng thử trên 1 repo BE/FE THẬT**, **cắm 1 drift đã biết** (đổi tên/xoá 1 field schema), đo: (i) có chỉ ĐÚNG FE component/call/test đụng không · (ii) có báo NHẦM (false-positive) không · (iii) xuyên HTTP boundary nó match `resolved` hay chỉ đoán chuỗi. Lưu ý: tracing xuyên HTTP boundary là chỗ mấy tool này hay RÒ nhất; con số kiểu "29–241×" (CALM) là so với đọc-cả-file, KHÔNG phải so grep.
  **KHÔNG hấp thụ (trái điều 6 — zemory 0-LLM):** chat-with-codebase · security scan · recommendation LLM.
  **Chỗ sẽ code khi user chốt:** thêm parser contract (OpenAPI/GraphQL) + resolver FE-call vào graph engine (`backend/src/memory/graph*.ts`), hạng cạnh mới trong `graph export` (bump schema v3), `graph impact` in thêm seam BE↔FE (kèm nhãn confidence). Cross-repo (BE repo + FE repo tách) join bằng contract làm khoá qua `graph export --all`. Sau khi user duyệt design đủ sâu → graduate spec sang **plan 13 §4** (plan = spec đã chốt; TODO chỉ giữ đề xuất).

## 🧠 Kho skill vendored — còn mở
- [ ] **`ui-ux-pro-max` mới VENDOR + INDEX, chưa có ca ÁP DỤNG thật nào** — chưa dùng nó thiết kế/nắn UI nào của zemory.
- [ ] **Cấu trúc `external/skills/` — user để ngỏ:** giữ 1 tầng `skills/` (kho enumerate được) hay **phẳng** `external/<repo>/` (đúng luật "đừng tạo cấu trúc chưa có nhu cầu" vì hiện `external/` chỉ có skill). Đổi = 1 lệnh `mv` + 3 dòng docs.
- [ ] **Lệnh `zemory skill add <repo-url>`** (clone vào kho đúng khuôn) — ý tưởng nêu ra, chưa quyết.
- *(Skill chung vs riêng — **ĐÃ CHỐT 2026-08-05**: giữ cấu trúc hiện tại; xem §Ưu tiên kế tiếp.)*

## 📥 User gửi 2026-08-05 tối — "để tính sau", note lại đây
## Quyết định mở / cần chốt
- [ ] **(ĐỀ XUẤT — chờ user) Cờ `--no-window` cho `zemory ui`.** Hiện lệnh LUÔN bật cửa sổ app thật
  lên desktop — đúng cho người dùng, sai cho smoke-test/CI (sự cố 3 cửa sổ rỗng 06/08 đêm,
  `[2026-08-07b]`). Một cờ nhỏ: dựng daemon + serve, bỏ bước mở window. Chưa làm vì là feature mới.
- [~] **🔒 GATE CHỐNG "TODO THỐI" — ĐÃ BUILD `zemory todo verify` 2026-08-06, sửa tiếp 2026-08-07**
  (user chốt hình dạng: *máy ĐO lại*, không dùng dấu ngày thủ công). `docs/todo-verify.ts` +
  `commands/harness.ts`.
  > 🛠 **Sửa 2026-08-07 (ADAPT v2 · N2):** sổ giờ tìm theo MARKER (`harnessPathsAt(root)`) thay vì
  > ghép cứng `docs/agent/05_TODO.md`, và đọc qua `readTextFile` (lột BOM). Trước đó, repo đặt
  > harness ở `harness/` thì gate báo 0 mục — **một cổng không bao giờ đỏ được**. Chính trục ④ của
  > nó bắt ra dòng sổ này lạc hậu ngay trong lượt audit cùng ngày (gate tự soi được người sửa nó).
  **Bốn phép đo, đều tất định:** ① **ref chết** — mục nhắc một đường dẫn hoặc endpoint như thứ
  đang có mà repo không có · ② **nghi đã xong** — sổ nói "chưa" NGAY TRONG CÂU nêu tên, mà tên
  đó tồn tại · ③ **đo lại "0 match"** — sổ ghi "tệp X 0 match Y" thì grep lại đúng phép đo đó ·
  ④ **code mới hơn sổ** — `git blame` dòng sổ vs `git log` file nó nêu tên.
  **Trục ④ mới là trục bắt được ca write-gate thật**, và nó dạy một điều: ca đó KHÔNG heuristic
  chữ nghĩa nào bắt nổi — sổ nêu tên hàm CŨ, bản vá landing dưới tên MỚI, không có mâu thuẫn
  chữ nào cả. Chỉ git biết.
  **Luật bất đối xứng theo GIỌNG câu** (bản đầu làm sai, đã sửa): giọng phủ định + TỒN TẠI =
  đáng ngờ · giọng khẳng định + THIẾU = đáng ngờ. Không phân giọng thì một mục ghi rõ "CHƯA làm"
  lại bị gán nhãn "sổ khẳng định có" — ngược hẳn ý người viết.
  ⚠ **Hệ quả cho người VIẾT sổ:** đừng đặt đường dẫn/endpoint GIẢ vào backtick làm ví dụ — máy
  không phân biệt được ví dụ với khẳng định, và sẽ báo chúng là ref chết (đã dính ngay khi viết
  chính mục này).
  **Độ nhiễu đã đo:** bản đầu 8 phát hiện (5 báo oan) → nay **1/57 mục**. Gate nhiễu = gate bị bỏ qua.
  Test `todo-verify.test.mjs` **9/9**, gồm ca write-gate dựng bằng git thật (ngày commit ép cứng).
  ✅ **ĐÃ NỐI vào `npm run check` — đóng 2026-08-07** *(dòng này trước ghi "chưa nối", SAI)*.
  Đo: `package.json` khoá `check` = `typecheck && lint && test && conform && **todo**`, khoá
  `todo` = `node dist/cli.js todo verify`; commit `d3ebbe6` (06/08) muộn hơn chính dòng sổ này.
  ⇒ Đúng **trục ④ "code mới hơn sổ"** mà chính mục này dựng ra để bắt — gate tự dính lỗi nó
  sinh ra để chống, và nó KHÔNG tự bắt được (mục nằm ngoài 20/58 mục máy tra được).
  *(Hồ sơ đề xuất gốc giữ bên dưới.)*

- [ ] **(hồ sơ) Đề xuất gốc của gate — giữ để tra lý do**
  Vấn đề đã TÁI DIỄN SUỐT MỘT THÁNG: agent soát TODO bằng cách ĐỌC file rồi báo lại, nên mục đã xong
  vẫn nằm đó và user bị hỏi lại lần hai. Luật `02_RULES §Chốt phiên` đã cấm — **và vẫn hỏng**, đúng
  như luật structure-sync từng dạy: *thứ CHẶN drift là code, không phải rule dễ quên.*
  **Đề xuất cơ chế (cần chốt hình dạng trước khi code):** mỗi mục TODO mang dấu **đã-đo-lần-cuối**
  (vd `<!-- v:2026-08-05 -->`); `zemory validate` cảnh báo mục nào **quá N ngày chưa đo lại**, và
  `zemory conform --gate` đỏ nếu có mục quá hạn xa. Cộng thêm: lệnh `zemory todo verify` chạy các
  phép đo rẻ tự động được (file tồn tại? hằng số? endpoint sống?) rồi in bảng LỆCH.
  *(Số nền để đo hiệu quả: soát tay 2026-08-05 phát hiện **11/58 mục sai ≈ 19%**.)*
- [ ] **`01_CONSTITUTION`: KHÔNG gộp §Mục đích với §Điều khoản (user hỏi, agent trả lời 2026-07-26 — chờ user xác nhận đóng).** Đã đo: riêng zemory có **45 cạnh `references` trỏ vào `hp:N`**, cộng SasinHarvest 14 + SasinFlow 11 ⇒ **~70 trích dẫn "điều N" xuyên docs**. Gộp = đánh số lại = **hỏng cả 70 trích dẫn**, và `06_CHANGES` cấm sửa entry lịch sử nên không vá ngược được. Hai mục cũng khác BẢN CHẤT: §Mục đích định nghĩa zemory LÀ GÌ (+ phi-mục-tiêu), §Điều khoản là luật ĐÁNH SỐ được trích dẫn khắp nơi. **Nỗi lo "gộp sợ tràn/bể UI" không được giải bằng việc gộp** — độ dài file y nguyên; thứ thật sự trị là lớp graph vừa dựng (điều N thành node, có legend + bộ lọc + bấm nhảy) thay cho việc cuộn một file dài. *(Bẫy parse hai-list-đánh-số đã trị bằng cắt đúng section — không phải lý do để gộp.)*
- [ ] **(Ý tưởng user 2026-07-23) Zemory tự đổi model/agent Claude theo việc lớn·nhỏ để tiết kiệm chi phí.** *(Soát 2026-08-02 — tiền đề đã đổi: điều 6 nay là "**HẠN CHẾ** gọi LLM" (`2026-08-02b`), KHÔNG còn "KHÔNG BAO GIỜ". Vế **không proxy model API** thì GIỮ NGUYÊN, mà model-routing đúng là chạm vế đó ⇒ vẫn cần user chốt, nhưng lý do chặn hẹp hơn trước.)* Đây là đổi BẢN CHẤT zemory (bộ nhớ thụ động → lớp điều khiển agent), không phải chi tiết nhỏ. User đã chọn: CHỈ ghi ý tưởng, KHÔNG code, chờ chốt hiến pháp trước khi làm gì tiếp. 3 hướng đã trình: (a) sửa hiến pháp mở khe cho model-routing (thay đổi tầng cao nhất) · (b) để CLI/agent tự quản (Claude Code đã có setting chọn model riêng, zemory không đụng vào) · (c) (chưa trình) zemory chỉ ĐO/GỢI Ý tín hiệu độ lớn task (vd token ước tính, số file đụng) qua UI/API cho AGENT tự quyết — vẫn 0-LLM vì zemory không tự gọi/đổi model, chỉ cung cấp số đo.
- [ ] **(Graph — plan 13 §8) Loại lỗi nào build TRƯỚC?** Đã trình 8 loại; user CHƯA chọn. Ba nhóm: (a) link gãy + orphan (docs, rẻ, làm ngay được) · (b) **blast-radius** "sửa X đụng ai" (cần đọc import code) · (c) traceability "requirement nào chưa có test". Prototype 2026-07-18 đã chứng minh (b) chạy được: code-graph 55 module/154 import, tìm ra **orphan thật `core/index.ts`** (barrel 0 ai import), fan-in `memory/db.ts`=18. *(Soát 2026-08-07: số prototype là HỒ SƠ lịch sử — hai file đó nay đã đổi, đừng lấy số này làm hiện trạng; câu hỏi chờ user thì vẫn nguyên.)*
- [ ] RAG còn cần chốt khi mở rộng sang **data chính**: chunk doc dài cho docs/knowledge/code; data chính dùng chung `global_memory.db` (cột `kind`) hay store tách rồi fuse.

## Phase 2 — Năng lực nặng
- [ ] **ADAPTER HOST MỚI** (Gemini/Antigravity · Cursor · Hermes) — chỉ làm sau khi có fixture dữ
  liệu THẬT. *(Đo 2026-08-07: `backend/src/memory/adapters/` có chatgpt · claude · claudeweb ·
  codex · continue · cowork · lmstudio — ba host trên đúng là CHƯA có.)*
  ⚠ **Vế "Code map AST" của mục này ĐÃ XONG, tách ra khỏi đây** *(sổ viết 28/07, tức viết SAU khi
  code đã có từ 22/07)*: AST → `graph-symbols.ts` · hash incremental → `graph-cache.ts` · import
  graph/blast-radius → `zemory graph impact` · fallback khi thiếu parser → `graph.ts` (regex
  `symbols` vẫn đứng). Giữ nguyên chữ "chỉ làm sau khi có fixture THẬT" cho phần adapter.
- [ ] **Memory promotion (episodic → curated learned-rule) — Ý TƯỞNG rõ (2026-07-18):** episodic memory đã bắt HẾT correction/decision qua các phiên → **nguyên liệu thô đã sẵn trong zemory**. THIẾU cái CẦU: zemory tự **phát hiện correction/decision LẶP LẠI** trong episodic → **ĐỀ XUẤT** nâng thành **memory-luật bền** (constitution/rules/1 memory doc) — **có review, user duyệt, KHÔNG auto-summary thành nguồn thứ hai** (điều 3). Cơ chế hình dung: quét episodic tìm pattern lặp (theme/correction) → xếp hạng theo tần suất → trình user *"correction X lặp N lần, nâng thành rule?"* → user gật mới ghi. Hiện đang để Claude-Code `memory/` gánh TAY. **Đây là "gap thật" duy nhất so với harness pattern 3-trụ** (trụ ② memory); trụ ③ (subagent/critic) zemory CỐ TÌNH bỏ (điều 6 — agent tự orchestrate, Claude auto-spawn subagent rồi).
- [ ] **(user nêu 2026-07-23 — ĐỀ XUẤT capability mới) Quét & ingest BỘ NHỚ CURATED của agent** (Claude Code `~/.claude/projects/<proj>/memory/*.md`+`MEMORY.md`; Codex/Cursor tương tự). **Bổ trợ TRỰC TIẾP** memory-promotion ở trên: thay vì zemory TỰ chưng cất (rủi ro auto-summary — điều 3/6), **ingest cái agent ĐÃ chưng cất sẵn** = fact cao-tín-hiệu, 0 LLM. Là adapter capture MỚI (như web-capture): đọc thư mục memory của host → ingest **read-only** (KHÔNG ghi ngược — điều 3/10) · stamp provenance riêng (`source=<agent>-memory`, `kind=curated` — tách lane khỏi episodic transcript, scope-tree lọc được) · **redact lúc ingest** (điều 7) · dedup + re-ingest khi file đổi (source_sig, giống scanweb full-replace) · recall xếp cao hơn (đã distilled). **Cần chốt:** ① `kind=curated` cột mới hay origin lane? ② map path Claude `<url-encoded-proj>` → project · global `CLAUDE.md`/`MEMORY.md` gắn `--all` · ③ adapter nào trước (Claude Code có cấu trúc rõ nhất). Ghi episodic vẫn giữ; đây THÊM lớp curated-external.
- [ ] Hook harness cảnh báo vi phạm docs nhưng không tự bypass permission host.

## Phase 3 — UI / mở rộng
- [ ] VS Code status bar chỉ đọc status API chung.
- [ ] Toggle provider/adapter có validation conflict và rollback config.

## 🌐 Web-chat capture (spec: docs/plan/07_web_chat_capture.md)
> Thu hội thoại web vào memory. ChatGPT ✓ · claude.ai ✓. Prototype cũ ở `attic/web-capture/`.
> **Quyết định đã chốt (plan 07 §14):** origin = 1 cột · v2b browser-connector (v1 file fallback) · re-pull full replace idempotent · GPT trước · password KHÔNG nhập vào zemory · KHÔNG commit file data thật (PII).
- [ ] **Gemini** là nền web CUỐI còn thiếu — khung `scan-web --platform` đã phục vụ ChatGPT + Claude.ai, thêm Gemini là dùng lại khung.

- [ ] **Đuôi còn lại của mục trên: XOAY token npm** — token publish từng nằm trần trên Drive
  (nay ở `~/.npmrc`). **Agent KHÔNG tự làm được** (2026-08-15, đã xét khi user giao "tự làm"):
  revoke + cấp token mới đòi đăng nhập tài khoản npm của user. Việc 2 phút của user:
  npmjs.com → Access Tokens → revoke token cũ → tạo mới → dán vào `~/.npmrc`. Không gấp —
  gói chưa publish, token cũ chỉ nguy hiểm nếu tài khoản Drive của user bị lộ.
