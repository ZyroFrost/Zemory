<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-09-04d] — một LUẬT ĐÃ SỬA không đi được bằng `sync`; và tôi xoá trắng đúng file mình đang vá

🔴 **`sync` là GAP-FILL, nên nó KHÔNG BAO GIỜ mang được một luật đã sửa.** `adopt.ts` bỏ qua file
đã tồn tại (`if (!existsSync(abs)) return …` — đúng FILE WINS, HP điều 3). ⇒ sửa một dòng trong
`02_RULES`/`03_STRUCTURE` của template **chỉ tới được repo MỚI**; 16 repo đang có sẽ không bao giờ
nhận, chạy `sync_all.ps1` bao nhiêu lần cũng vậy. Chỉ file **hoàn toàn mới** (skill mới) mới tới.
Tôi đã đề nghị `sync_all.ps1` — **sai**, vì đọc câu §5 của `DEPT_STANDARD` mà không kiểm nghĩa
gap-fill. User bác đúng: *"t nói là bạn sửa tay hết từng cái mà"*.
⇒ Chèn TAY: luật `protected` **14/17** repo · luật config-của-một-case (non-app) **11/11**. Ba repo
bỏ có lý do (`SasinHarvest`·`SasinHub`·`SasinInfra` không có mục `§Guardrail`, và khai
`protected: []` nên luật không có gì để cai). Và sửa câu §5 gây hiểu sai ở `_DWC` (user chốt).
**Không commit ở 14 repo:** mọi repo đang có 1–31 file việc dở khác — chèn một dòng của mình vào bộ
thay đổi của người khác là sai. File đã ghi; phiên của từng repo commit cùng việc của nó.

🔴 **TÔI GÂY RA ĐÚNG LỖI MÌNH VỪA VÁ CẢ PHIÊN — ghi lại vì nó đắt.** Lúc sửa `DEPT_STANDARD.md`,
script của tôi `io.open(p,'w')` (**cắt trắng file**) rồi mới `write(...)` — mà `write` ném
`UnicodeEncodeError` vì tôi viết emoji bằng cặp surrogate `🔴` thay vì `\U0001F534`. Kết
quả: file chuẩn của cả estate **còn 0 byte**. Đây **cùng một hình dạng** với bug `pushAppend` sửa ở
`[2026-09-04]`: *bước PHÁ chạy trước bước có thể trượt, không có đường hoàn nguyên*. Tôi vá cho máy
xong rồi tự phạm bằng tay, trong cùng một phiên.
**Cứu được nhờ đúng hai lớp đã dựng:** ① file tracked trong git ⇒ `git show HEAD:… > …` phục hồi
đủ **34.341 byte / 251 dòng, khớp HEAD** · ② guard **chặn** `git restore` của tôi (*"lệnh HUỶ việc
chưa commit"*) — buộc tôi đi đường không-phá thay vì đường tiện tay.
**Làm lại đúng cách:** ghi ra file TẠM → kiểm bản mới DÀI HƠN bản cũ → `move` vào chỗ. Đúng khuôn
vừa vá cho nhánh gộp.

## [2026-09-04c] — chuẩn non-app: config của MỘT case ở gốc `tasks/<case>/`, không phải `pipeline/`

**Sinh từ một ca thật ở repo phòng ban** (`sources/` thành bãi phẳng, không biết file nào của việc
nào). Chuẩn vốn đã trả lời — nó chia theo **PHẠM VI DÙNG**, không theo task: thuộc một case ⇒
`tasks/<case>/`; dùng chung ⇒ `sources/`. Nên `sources/<task>/` là trái chuẩn, và cách sửa đúng là
đưa file của một case RA KHỎI `sources/`. Đo trên repo đó: **5/6 file** chỉ một case dùng.

**Chỗ chuẩn CHƯA nói, nay thêm một dòng routing:** config của MỘT case (`*.example.*` tracked +
`*.local.*` gitignore) ⇒ **gốc `tasks/<case>/`** · KHÔNG vào `pipeline/` (chỗ đó chỉ chứa script có
số chặng — `NN_` chỉ giữ được nghĩa khi không có gì khác nằm cùng) · KHÔNG vào `config/` cấp repo
(slot của config dùng chung).

⚠ **Vì sao KHÔNG ghi vào `DEPT_STANDARD.md` của repo trung tâm** — dù user hỏi đúng chỗ đó: chính §5
của chuẩn ấy vạch ranh *"template harness (`02_RULES` · `03_STRUCTURE` · skills) thuộc project
zemory — KHÔNG nhét luật phòng ban vào đó, nó là chuẩn rộng hơn, dùng cả ngoài công ty"*. Ranh giới
đó chạy **cả hai chiều**: *"`pipeline/` được chứa cái gì"* là ngữ nghĩa slot của zemory, không phải
luật công ty. Nên nó vào `docs_template/03_nonapp/` — nhưng **lan thì phải chèn TAY từng repo**, vì
`sync` là gap-fill: xem `[2026-09-04d]`.

## [2026-09-04b] — xoá trong protected: chặn rồi XIN PHÉP được · và bản lùi thôi che kho chính hụt

**Hai vế user chốt sau khi đọc bản vá `[2026-09-04]`.**

🔴 **① Xoá trong `protected` giờ có đường cờ** (*"chặn rồi xin phép là được"*). Trước đó là `deny()`
tuyệt đối, không cờ nào ăn — trong khi `mv <protected>/x /tmp` **cùng hậu quả** lại CÓ cờ, nên người
ta học cách đi đường `mv`. Và một cổng không có đường cho user duyệt là **máy đang làm NGƯỜI QUYẾT**,
trái `02_RULES §Guardrail` (*chữ là tầng quyết định, máy là tầng đỡ hụt*). Dùng cờ **`delete`** chứ
KHÔNG dùng `docs_write`: một lượt duyệt GHI không được biến thành duyệt XOÁ.
⚠ Bản nháp đầu của tôi dùng `return` → thoát CẢ hàm guard, bỏ qua luôn phép kiểm secret của token
còn lại, phép kiểm xoá đệ quy và cả nhánh `mv`. Nay memo hoá một lần cho cả câu lệnh.
**Cổng:** `guard-flag-retry` 10 ca (**4 ca ÂM**: cờ ghi ≠ cờ xoá · không dùng ké lệnh khác · cờ xoá
không che token secret). **Đột biến 3/3 ĐỎ**, đỏ 2/3/1 ca khác nhau ⇒ các ca không trùng.

🔴 **② `bak.enc` là BACKUP — thôi để nó che kho chính đang hụt** (*"này t nhớ là backup"*). `mergeAll`
quét mọi `*.enc` nên nó đọc cả bản lùi; điều đó ĐÚNG và giữ nguyên (fail-open). Cái hỏng chưa bao giờ
là *"nó hội tụ"* mà là **hội tụ trong im lặng khi đang hỏng**: 03/09 khúc 1 còn **0 byte**, cả 48 khối
chỉ nằm ở bản lùi, mà sync vẫn `OK` và mọi số vẫn đẹp suốt 20 giờ — trên một file mà lượt gộp kế tiếp
`rmSync` ngay dòng đầu. Nay `syncDrive` báo `[sync] kho chung ĐANG SỐNG NHỜ BẢN LÙI` khi khúc 1 vắng
mặt/không đọc được, **hoặc** dãy khúc chính ít khối hơn bản lùi.
⚠ Bản nháp đầu chỉ có vế *số khối* ⇒ fixture 1-vs-1 không nổ dù khúc 1 đã VẮNG MẶT. Và ca ÂM đầu của
tôi **hụt**: nó chạy khi chưa có `bak.enc` nên phép dò còn chưa tới — đột biến *"kêu cả khi kênh lành"*
**sống sót**. Thêm ca ÂM 2 (có bản lùi + khúc 1 lành, đúng hình dạng sau một lượt gộp thành công) thì
**3/3 ĐỎ**.

**Áp lại:** `guard.cjs` sinh lại **16/16 repo** · bản ship cowork byte-identical · MANIFEST 507 → **527**.

## [2026-09-04] — guard chặn VĨNH VIỄN thao tác đổi tên, dù user cấp cờ bao nhiêu lần

**Báo từ repo `WorkSpace/Dept_OPS`.** Không thể `mv`/đổi tên một file trong đường
`protected_write`, cấp cờ bao nhiêu lần cũng vô ích.

🔴 **Cơ chế.** `flagWritePath` đóng vân tay theo **TỪNG ĐƯỜNG** (`consumeFlag("docs_write", rel)`),
mà `mv A B` chạm **HAI** đường: ① nguồn `A` đóng dấu `sha1(A)` → cho qua · ② đích `B` thấy dấu khác
→ **xoá cờ** → CHẶN. Lượt sau nguồn lại ăn cờ mới trước ⇒ **vòng lặp không thoát**. Cửa sổ 90 giây
không cứu được: nó cho thử lại *cùng một subject đã tiêu thụ*, còn ở đây nguồn tiêu thụ một cờ MỚI
mỗi lượt. Đây là BUG chứ không phải chính sách — chính thông báo của guard **mời** user tạo cờ, tức
thiết kế CÓ Ý cho user duyệt là qua được; và một cổng hứa mở mà không mở nổi thì đẩy người ta đi gỡ
luôn đường khỏi `protected`.

**Bằng chứng đây là SÓT, không phải chủ ý:** 4 nhánh còn lại trong cùng file (`push` · `delete` ·
`discard` · `git_add_all`) **đều** vân tay theo LỆNH (`bare`). Chỉ nhánh này lệch.

**Vá (phương án 1 của báo cáo):** một cờ phủ **trọn một lệnh** — bớt một khái niệm thay vì thêm cờ
`.allow-rename` riêng, và đưa nhánh này về đúng khuôn 4 nhánh kia. Vẫn là *một lần cho một việc*:
đổi lệnh ⇒ dấu khác ⇒ thu hồi. Cổng: `guard-flag-retry.test.mjs` +3 ca (**2 ca ÂM**), **đột biến
2/2 ĐỎ** (trả về `rel` ⇒ đỏ 2 ca; bỏ hẳn vân tay ⇒ đỏ 1 ca).
⚠ Lượt đầu 3 ca của tôi ĐỎ vì **test sai, không phải sản phẩm sai**: `blocked()` không đặt `cwd`,
mà guard đổi đường bằng `path.relative(ROOT, tok)` — cwd ở ổ D: còn ROOT ở ổ C: thì `path.relative`
qua hai ổ trả đường TUYỆT ĐỐI, không khớp đường protected nào ⇒ mọi ca đường-dẫn lọt sạch. Lỗ này
nằm đó lâu mà không ai thấy vì các ca cũ chỉ test `git push` — không đụng đường dẫn.

**Đã áp lên MỌI repo đang dính: 16/16** (`zemory hook guard` sinh lại từ generator đã vá) — 0 repo
còn bản cũ · 1 bỏ qua (chưa từng cài guard) · `policy.json`/`precommit-guard.cjs`/`.gitignore`
**giữ nguyên** ở mọi repo, `put()` chỉ làm mới file còn dấu generator.

**Luật kèm (user chốt), ship cả 3 template:** *đường `protected` trỏ vào thứ CHỈ ĐỌC — đừng trỏ vào
sản phẩm chính repo đang tạo ra*. Ca thật: repo đó khai `reports/*.pbix` là `protected`, tức mọi lượt
sửa báo cáo thường ngày đều phải xin cờ. Cổng đúng, **chỗ đặt sai**.

⚠ **CÒN HỞ, chưa vá vì là quyết định của user:** xoá trong `protected` là `deny()` **tuyệt đối,
không có `consumeFlag` nào** — trong khi comment ngay trên đó tự viết `mv <protected>/x /tmp` *"có
hậu quả Y HẾT xoá"*, mà nhánh `mv` **lại có** đường cờ. Hai đường cùng hậu quả, hai cổng khác nhau.

## [2026-09-03] — audit 11 mặt: gộp kho chung PHÁ kênh thật, và ba bề mặt nói dối

Gate vào phiên **1019/1019 xanh**, code y hệt `2.13.1` ⇒ lỗi KHÔNG ở code mới; cả bốn thứ dưới đây
thuộc họ *"không báo lỗi, mà nói dối"* và không cổng nào với tới, vì kênh chung nằm NGOÀI repo.

🔴 **① Gộp kho chung PHÁ kênh — đo trên kênh ĐANG CHẠY.** Nhánh `compacting` dựng khúc tươi ở
`os.tmpdir()` (C:) rồi `renameSync` sang Drive (G:, filesystem khác) ⇒ **EXDEV, đích không tồn tại**
— mà mọi bước PHÁ đã chạy TRƯỚC, không try/catch. Đo: khúc 1 **0 byte**, cả **48 khối / 2,22 GB**
chỉ còn ở `bak.enc` — file mà lượt gộp kế tiếp `rmSync` ngay dòng đầu. Cổng cũ không thể nổ: fixture
đặt `driveDir` trong `tempDir()` ⇒ CÙNG volume. Cơ chế + vá: `plan/08 §8e`; cổng
`compact-atomic.test.mjs` 3 ca (1 ÂM), **đột biến 3/3 ĐỎ**.

🔴 **② Lỗi merge kênh bị hấp thụ.** Entry `error` chỉ nằm trong `merged[]`, lượt sync vẫn trả
`ok:true` và log `auto-sync: OK` ⇒ một file KHÔNG giải mã được ở MỌI lượt, suốt 20 giờ, không dòng
nào kêu (`§8d` luật ⑤). Nay lên log kèm dấu `[sync]`; fail-open giữ nguyên (điều 9).

🔴 **③ `coverage 100% · remaining 0` là con số nói dối — 23.226 tin không vector** (7,0% kho; hai
đường đo độc lập cùng một số; **0** trong đó là prose). `vectorOutOfScope()` viết 12/08 đúng để chữa
việc này và test của nó assert *"phải NHÌN THẤY được"* — mà **0 lời gọi ngoài test**. Nay lên
`/memory-status` · `memory stats` · `memory info`.

🔴 **④ Công cụ chẩn đoán ném vỡ đúng lúc cần nhất.** `vectors-catchup` chỉ đếm *"tin ĐANG CÓ trên
kênh mà thiếu vector"* ⇒ kênh càng cụt số càng ĐẸP: đo thật **117**, trong khi kênh chỉ dựng lại
được **11.605/333.152 tin**; và nó NÉM ở khúc đầu không đọc được nên không in nổi số nào. Nay: khúc
hỏng ghi TÊN rồi đi tiếp · so phiên/tin để báo HỤT · exit ≠ 0 + stderr. `surface-truth.test.mjs`
5 ca, **đột biến 4/4 ĐỎ**.

**Kèm:** đối chiếu kênh 7 ngày trong chuỗi bảo trì (user chốt) · help thiếu **7 lệnh**, nay khớp code
hai chiều · `plan/00` tự đá nhau về Stop hook. Gate **1019 → 1030**, 0 fail.

⚠ **Hai chẩn đoán SAI của tôi, đều là suy diễn từ CÙNG MỘT công cụ rồi trưng như đo được:** ① *"6.310
⇒ kênh dựng lại được end-to-end"* — số đó không đo độ đầy của kênh · ② *"đường bàn giao máy mới
hỏng"* — `plan/16 §3` dùng `memory sync` (quét mọi `.enc`) nên máy mới vẫn nhận đủ.

## [2026-09-02m] — chốt phiên: `keep 5→3`, và phép loại lớp điểm-vào QUÊN mất bề mặt thứ hai

**① Backup `keep: 5 → 3` (user chốt: *"giữ 3 bản thôi"*).** Quét rác lúc chốt phiên đo
`data/backups` = **18,5 GB / 9 file**: 13,3 GB là **5 bản luân phiên** (đúng chính sách, không phải
bug) · 5,2 GB là hai bản **người/agent đỗ tay** (`premigrate` · `premove2` — `BACKUP_RE` cố ý không
khớp, xoá là việc của user) · 2 sidecar 0 MB. Gốc: `keep` là hằng số **nhân với kích thước kho**, mà
kho đã 595 MB → **2.738 MB** kể từ lúc số 5 được chọn. 3 bản ≈ 8,2 GB (thu về ~5,3 GB), vẫn còn ba
thế hệ để lùi. Dọn xảy ra ở nhịp backup kế (<24 h) vì prune **cố ý** đi kèm lượt ghi (*"không bao
giờ có lúc tay trắng"*). **Cổng:** trước đó **KHÔNG cổng nào neo `keep`** (chỉ neo `everyMs`) — một
mặc định không ai canh là mặc định sẽ trôi, đúng ca `getRerankSetting()` từng bật lại làm recall
chậm 6,3×. Nay neo `keep === 3` + hai ràng buộc bản chất (≥2 để còn đường lùi · ≤3 vì mỗi bản là
+2,7 GB). **Đột biến 3/3 ĐỎ** (về 5 · lên 10 · xuống 1).

🔴 **② TÔI PHÁ ĐÚNG BẤT BIẾN MÀ COMMENT NGAY ĐÓ CẢNH BÁO.** `[2026-09-02k]` thêm phép loại lớp
điểm-vào vào `graphFitness` nhưng **quên `orphans`** — trong khi `graph.ts` viết sẵn tại chỗ: *"cùng
lý do fitness loại chúng khỏi `isolated_pct`; **hai bề mặt phải nói MỘT câu, lệch nhau là đọc sai
một chỗ**"* (và `plan/13 §9` chốt cùng điều). Hậu quả người dùng thấy: `orphans` **hiện lên UI thật**
(bộ lọc "chỉ orphan" + số đếm ở `graph-render.js`) ⇒ UI báo ~82 mồ côi trong khi cổng nói 1. Đúng
lỗi *"vá một bề mặt, quên bề mặt kia"* đã trả giá cùng ngày ở `webLaneLinked`. Vá: **một** phép
`countsForImportHealth()` cho CẢ HAI.

⚠ **Cổng đầu của tôi cho vế ② là TRANG TRÍ — ghi lại vì nó là bài học đắt.** Nó dựng graph **GIẢ**
(chèn node vào `g.nodes`), mà `orphans` được tính TRONG `buildCodeGraph` ⇒ assertion không bao giờ
soi tới `orphans`; đột biến *"trả `orphans` về lọc cũ"* **vẫn XANH**. Phải dựng **repo THẬT trên
đĩa** mới đo được cả hai bề mặt. Và lượt đột biến kế tiếp lại **xanh giả NGƯỢC**: file test thiếu
một dấu đóng nên KHÔNG NẠP ĐƯỢC, làm mọi đột biến trông như "đỏ" — đúng bẫy *"đột biến không áp
được ≠ bằng chứng"*. Chỉ sau khi `node --check` sạch và 6/6 ca xanh thì **2/2 đột biến ĐỎ** mới là
bằng chứng, gồm M1 tái hiện chính lỗi vừa mắc.
