<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-20b] — guard lớp ① hở nửa cửa trên Windows · cảnh báo context thôi đoán theo tên

**Guard bỏ lọt MỌI lệnh đi qua tool `PowerShell`** (báo từ phiên repo `PBI_SasinFlow_Rebuild`, đã
tự đo lại và đúng). `guard.cjs` phân nhánh theo `tool_name` và chỉ biết 5 tên; phiên Claude Code
trên Windows có SẴN tool `PowerShell` ⇒ `git push` chưa xin · `git add -A` · xoá đệ quy · secret
vào git **vượt sạch chỉ bằng cách đổi tool**. Đo trước vá: 4/4 lệnh nguy hiểm qua `Bash` bị chặn,
4/4 lệnh y hệt qua `PowerShell` cho qua. Khó thấy vì regex nhận diện VẪN đúng — chỉ cổng TÊN sai,
nên mọi test cũ (chỉ gửi `tool_name: "Bash"`) đều xanh trong khi cửa mở toang.
**Vá:** nhận theo HÌNH DẠNG (`có tool_input.command` ⇒ soi như lệnh shell, bất kể tên) thay vì
theo danh sách tên — gác theo tên là cuộc đua không thắng, host thêm tool mới là lỗ mở lại. Thêm
`GUARD_MATCHER` một-chỗ và `hook guard` **in kèm matcher** (repo báo cáo nối thiếu đúng
`PowerShell`; hai tầng hỏng đều im lặng). Bản ship cho bộ cowork chép lại + manifest 282→291.
Gate `guard-tool-matrix` 4/4 soi MA TRẬN `tool × lệnh` + **ca ÂM** 6 lệnh thường ngày; đột biến:
trả về chỉ-nhận-`Bash` ⇒ 2 đỏ, bỏ `PowerShell` khỏi matcher ⇒ 3 đỏ.
⚠ Guard KHÔNG tự làm mới — repo nào đã cắm phải chạy lại `zemory hook guard` **và** thêm
`PowerShell` vào matcher.

**Cảnh báo context ~95% SAI trên phiên 1M.** Cơ chế tự sửa chỉ nổ SAU khi vượt 200k nên dải
190k–200k của mọi phiên 1M đều bị hét oan (thực dùng ~19%) — agent đọc xong đi chốt sổ sớm hơn
cần. Đo: transcript **không khai cửa sổ ở đâu cả** (`context_management: null`), và 5/6 phiên gần
nhất trên máy này đã vượt 200k với **cùng model id `claude-opus-5`** ⇒ tên model không phân biệt
được 1M với 200k. Tín hiệu TTL cache đã thử và loại (cả 6 phiên đều 1h).
**Vá:** HỌC TỪ BẰNG CHỨNG — mỗi lần `observed` vượt bậc là một lần chứng minh trần thật, ghi nhớ
vào `data/context-guard/observed-window.json` (cạnh kho, gitignored) và phiên sau đọc nó TRƯỚC khi
đoán theo tên; bằng chứng chỉ đi lên. Nghiệm thu bề mặt thật: phiên 750.775 token nay báo **75,1%**.
Gate 3 ca; đột biến: bỏ ghi nhớ ⇒ 1 đỏ, bỏ đọc bộ nhớ ⇒ 2 đỏ.

## [2026-08-20] — 2.0.0: đường đổi embedder sang BGE-M3 + cổng mặt audit ⑧

**Vì sao lên số lớn** (user chốt): đây là mốc đổi lớp NHÚNG của cả hệ, không phải một bản vá.
Đợt này mới THÊM đường — kho thật vẫn chạy Gemma-768, chưa gì phá vỡ tương thích.

**Chọn BGE-M3 bằng đo, không bằng cảm giác.** Ma trận 6 embedder × 12 lane trên cùng 68 nhãn +
bootstrap 2.000 lượt: Gemma-768 **thua rõ** (ΔMRR −0,086, KTC 95% [−0,168 … −0,005]) — so sánh
DUY NHẤT trong cả bảng có khoảng tin cậy không chứa 0. BGE-M3 thắng cả hai vai: retriever MRR
0,326 → 0,411 (@40 pool 85 → 93%), rerank-trộn 0,303 → 0,378. Chọn **int8** (chênh với fp32 nằm
TRONG sai số, mà nhanh gấp đôi: 637 vs 1.388 ms/tin). **KHÔNG lai hai model** — mọi cặp lai đều
trong sai số. Qwen3-Embedding/Reranker · gte · arctic · chỉ mục ColBERT: loại, có số. Spec: plan 19.

**Profile nay gánh NĂM thứ, không chỉ prompt**: model · pooling (**CLS** cho BGE) · dims 1024 ·
dtype int8 · **sequential**. Cái cuối là phát hiện tại chỗ: gọi THEO LÔ vừa chậm hơn (5,6× cho
BGE, 2,3× cho Gemma) vừa **dịch vector** (cos 0,982 · Gemma 0,962) — kho đang chạy vì thế có tài
liệu mã hoá theo lô còn truy vấn theo từng cái. Vá cho kho MỚI; kho đang chạy cố ý không đụng.
Nghiệm thu: vector đường production khớp **cos 1,000000** với vector đã benchmark.

🔴 **Một phép thử 20 tin cứu 44 giờ:** `embedPending` lấy *"bảng vec_chunks tồn tại chưa"* làm
điều kiện đọc hợp đồng ⇒ kho chuẩn bị theo plan 19 (drop → đóng dấu → embed) bị bỏ qua vec_config:
hợp đồng ghi `{1024, bge-m3-v1, int8}` mà lượt embed báo `dims 768` và chạy Gemma. Nay hỏi thẳng
`vec_config`. Gate `embed-profile` 6/6, **6 đột biến đều đỏ được**.

**Cổng mặt audit ⑧ — mặt cuối chưa có máy canh, nay có hai:** `license-gate` (3 ca, trong
`npm run check`) quét CẢ CÂY 190 gói, parser SPDX xử đúng OR/AND (ca bẫy
`Apache-2.0 AND LGPL-3.0-or-later` từng lọt lượt rà tay nay nằm trong bộ tự-kiểm); và
`npm run check:clone` dựng từ clone sạch (clone 2,0s → prebuilds 0,2s → install 23,9s → build
6,7s → smoke), để ngoài gate mặc định vì cần mạng. Kèm: luật **CẤM CHẠY IM LẶNG** thành luật
CHUNG — thêm bản generic vào cả 3 template (cowork tự nhận qua bootstrap).

## [2026-08-15b] — dọn 11 export thừa · và một hàm "chết" hoá ra là lưới đỡ chưa nối

**Dọn:** bỏ `export` ở **11 hàm** chỉ dùng trong chính file mình (`loadCorpus` ·
`driveFsPrefsPath` · `browserAccounts` · `findSplitProjects` · `setStoragePointer` · `rareTerms` ·
`rm3Expand` · 4 hàm trong `share.ts`). `tsc` + `lint` + gate xanh ⇒ không cái nào đang được dùng
từ ngoài. Zemory không phải thư viện (`package.json` không có `main`/`exports`) nên không ai
import từ ngoài vào — thu hẹp tầm nhìn là an toàn.

**GIỮ có chủ đích 2 cái.** `machineBusyReason` là API của `helpers.mjs` cho mọi test.
Còn **`formatCloudReport`** thì lint báo thẳng *"defined but never used"* — nhưng **không xoá**:
đó là bản in của lưới đỡ cho sự cố **đã xảy ra thật** (04/08, Google Drive cuốn cả
`global_memory.db` lên mây — HP điều 11/14). Nó không chết vì vô dụng, nó chết vì **chưa ai nối
vào CLI/UI**. Xoá là vứt hiểu biết rồi ngày nào đó viết lại từ đầu ⇒ ghi thành việc trong
`05_TODO` kèm chú thích tại chỗ, để lần sau không ai "dọn" nhầm.

**Ba lần phép đo TỰ HỎNG khi làm đúng việc này** — đáng ghi hơn cả kết quả:
· quét sai regex ⇒ **345/345** hàm "không ai gọi" (vô lý: app sẽ không chạy nổi)
· quên tính `backend/test/` ⇒ **53** (báo oan hàng loạt)
· regex thiếu cờ `g` nên `match()` luôn trả 1 ⇒ báo cả **13/13** là "không ai dùng", **kể cả hàm
  tôi biết chắc đang được gọi ngay trong file đó**.
Cả ba đều là *công cụ hỏng lặng* (luật 5): không lỗi, không cảnh báo, chỉ trả số sai một cách
tự tin. **Cách chữa dứt điểm: đếm bằng `split()`, đừng đưa regex qua shell/sed** — escape bị
nuốt 4 lần trong một phiên.

**i18n: không còn gì dọn rẻ.** Đo lại còn **46** chuỗi (số cũ tôi báo "30" là SAI): 45 ở
`shell.js` là bảng dự phòng `STRUCT`/`ROUTE` — dịch xong UI **vẫn ra tiếng Việt** vì nguồn thật
là `/standard-spec` đọc `03_STRUCTURE.md`; 1 ở `graph-render.js` là **khoá dữ liệu**. Muốn đi
tiếp phải làm ở TẦNG TÀI LIỆU, không phải tầng code.

## [2026-08-15] — chuẩn: `frontend/api/` → `frontend/client/` (một tên thôi gánh hai chiều)

**Do người ngoài chỉ ra** (giáo viên của user), đo lại thì đúng — nhưng không đúng theo cách đã
nói. Ý kiến gốc *"có `api` ở cả FE lẫn BE là sai"*: **vế đó không đúng** — lớp gom lời gọi ở FE là
cần thiết (thiếu nó thì mỗi màn tự `fetch`; zemory đang trả giá: **71 lời gọi rải 11 file**).

**Cái sai thật là TÊN.** Chuẩn tự dựng trục **BIÊN VÀO / BIÊN RA**: `api/` = mình MỞ (vào),
`integrations/` = mình GỌI ra ngoài. `frontend/api/` là *"client gọi BACKEND của mình"* — chiều
**RA**, lại mượn tên slot chiều **VÀO**: một từ gánh hai chiều ngược nhau, đúng thứ chính chuẩn
cấm (*"1 tên chuẩn duy nhất"*). Dòng "3 loại kết nối" còn tự mâu thuẫn: định nghĩa `api/` = *mình
MỞ*, trong khi `frontend/api/` chẳng mở gì.

**KHÔNG chọn `services/`** (phương án đầu, user bắt kiểm trước khi sửa — đúng):
`backend/src/services/` đã mang nghĩa *"business logic"*, đổi sang đó là **tái tạo y hệt cái
bệnh**. Chỉ `client/` và `http/` còn trống. **Phân biệt rút ra:** trùng tên mà **cùng nghĩa** là
đối xứng TỐT (`config/` 3 lần · `util/` 2 · `contracts/` 2); trùng tên **ngược nghĩa** mới là lỗi
— `api/` là ca duy nhất.

**Sửa đồng thời 4 chỗ** (thiếu một là gate đỏ hoặc hai bản lệch): `SLOT_ROLES` (gate
`structure-sync` parse `frontend/<slot>` rồi đòi có role) · `docs_template/app/` ·
`docs/agent/03_STRUCTURE.md` · mục graph seam `05_TODO`. Cổng **28/28**, slot 19/**56**.

**Đồng bộ sang 3 repo khác** (user cho phép từng cái): `SasinHarvest` đổi **tên folder thật**
`frontend/api/` → `client/` + 1 import + docs ⇒ `conform` ✓ · `SasinFlow`, `SasinInfra` chỉ docs.
Chỉ **2 chỗ** import trong toàn `SasinHarvest`, một nằm ở `attic/` nên **cố ý không đụng** (ảnh
chụp lịch sử). ⚠ `SasinHarvest` và `SasinInfra` **không nằm trong git** ⇒ đã tự sao lưu ra
scratchpad trước khi đổi tên; `SasinFlow` để lại file `M` chưa commit cho user tự quyết.
*Bẫy khi dò: `/api/...` trong URL endpoint là đường HTTP của backend, KHÔNG liên quan tên thư
mục FE — grep thô ra hàng chục dòng toàn loại đó.*

## [2026-08-14] — việc nền NHƯỜNG CPU cho người dùng · nghiệm thu 3 bản vá sau khi daemon nạp lại

**Nghiệm thu trên daemon THẬT** (pid mới, `v1.5.13`): ô Last Sync hết nói dối —
`lastSync = 2026-08-14T02:16:04.548Z`, **khớp từng ký tự** với `drive.lastPushAt`; log nền nay có
dòng `[scheduler]` (bản vá log ra đĩa đang chạy); `coverage 100%`.

**Việc nền thôi tranh CPU ngang hàng với người dùng.** Đo 2026-08-13: hook capture ghi **~23
tin/phút** khi đang làm việc (2.814 tin/2 giờ, 100% từ `claude-code` — chính phiên đang chạy), nên
backlog embed **gần như luôn dương** và job nền **gần như luôn chạy**. Ở ưu tiên `Normal` trên máy
12 core, ONNX ăn hết phần thì việc trước mặt khựng theo.
Nay `runStep` hạ con xuống `PRIORITY_BELOW_NORMAL`. **Hạ ưu tiên chứ KHÔNG ghim số core**: ghim
cứng thì lúc máy rảnh cũng chỉ dùng được phần đã ghim; hạ ưu tiên thì máy rảnh vẫn ăn trọn, máy
bận thì hệ điều hành tự cắt nhịp. Fail-open: thiếu quyền đổi ưu tiên thì chạy tiếp, không giết job.
Đo thật trước khi tin: `PriorityClass` đổi **Normal → BelowNormal** ngay sau lời gọi.

**Hệ quả phải ghi, vì nó làm hỏng một giả định:** "chờ embed xong rồi mới chạy gate" là điều kiện
**không bao giờ đạt** khi còn đang làm việc — backlog luôn được nạp thêm. `preflight` (dựng cùng
ngày) vì thế sẽ chặn gate vĩnh viễn trong phiên dài. Đường đúng: **tắt `scheduler` tạm** → gate
chạy sạch → bật lại; hoặc `ZEMORY_GATE_FORCE=1` khi biết rõ mình đang làm gì.

Cổng: `scheduler-contract` 10/10, ca mới canh ưu tiên + fail-open, đột biến chứng minh đỏ được.

## [2026-08-13m] — i18n tầng BACKEND: thôi ghép sẵn câu tiếng Việt rồi bắt UI in nguyên văn

**Tầng sâu hơn frontend.** `connections.ts` ghép thẳng `kiểm lần cuối 7 giờ trước`, `store đã
biết nhưng không còn trên đĩa: …` rồi gửi lên. UI nhận về một CÂU nên **không có cách nào dịch**
— bật `lang=en` thì bảng Liên kết vẫn ra tiếng Việt, và không lỗi nào nổ.

**Vá:** gửi kèm `detailCode` + `detailArgs` (mã + tham số) **BÊN CẠNH** `detail` — thêm chứ không
thay, nên mọi thứ đang đọc `detail` chạy y nguyên (HP: mở rộng, không ghi đè). UI ghép câu trong
`connDetail()` theo ngôn ngữ đang bật, và **dùng lại `relTime()`** sẵn có thay vì đẻ cách tính
thời gian tương đối thứ hai.

**Cổng `conn-detail-i18n.test.mjs` 4/4 — canh CẢ HAI ĐẦU**, vì hỏng đầu nào cũng im lặng: backend
quên gửi mã ⇒ UI lặng lẽ rơi về câu tiếng Việt · UI quên đọc mã ⇒ mã gửi lên chẳng ai dùng. Đột
biến ở từng đầu đều chứng minh đỏ được (gỡ mã ⇒ 1 đỏ; trả UI về `r.detail` ⇒ thêm 1 đỏ).

**i18n frontend cùng đợt: 90 → 30 chuỗi**, 6 file về 0. Chỗ duy nhất cố ý giữ: `'(ngoài chuẩn)'`
trong `graph-render.js` là **khoá dữ liệu** do backend sinh (`type: n.slot ?? …`), dịch là lệch
trạng thái lọc slot — nhãn đã tách qua `gSlotLabel()`.

## [2026-08-13l] — màn Tính năng vẽ MỖI NHÓM HAI LẦN · UI thôi khuyên bật rerank

**Bug bố cục, tìm ra nhờ đi dọn i18n.** `grp` vừa là **khoá gom nhóm** (`groups[f.grp]`) vừa là
thứ đem đi dịch — nhưng nửa số dòng khai bằng **key** (`f.grpCore`), nửa kia khai bằng **giá trị
tiếng Việt** (`'Lõi nhớ & tìm'`). Hai chuỗi khác nhau ⇒ hai nhóm riêng, mà `t()` render cả hai ra
**cùng một tên**: **6 khoá nhóm → chỉ 3 tên hiển thị**. Tức màn Tính năng đang vẽ *"Lõi nhớ &
tìm"*, *"Đồng bộ & lưu"*, *"Harness (docs)"* **mỗi cái hai lần**, mỗi lần chứa một nửa tính năng.
Nay chuẩn hoá 11 chỗ về dạng key ⇒ 3 khoá / 3 tên.
*Bản vá đầu **tự đẻ lỗi mới**: `renderSysDetail` in thẳng `f.grp`, mà `grp` nay là key ⇒ suýt
hiện chữ thô `f.grpCore` ra màn hình. Bắt được ngay vì đọc lại chỗ dùng, không chỉ chỗ khai.*

**UI thôi khuyên bật rerank.** Ô mô tả đang nói *"đáng bật khi corpus lớn/nhiễu, câu hỏi khó"*
trong khi đo trên chính kho này: rerank **thua hybrid ở mọi cột nghiêm** (MRR 0,571 → 0,459), một
truy vấn thật **2,6 s → 18,8–29,4 s** (~7×), top-10 chỉ trùng **1/10**; và `vecMix` làm đúng việc
đó với **119 ms**. Nay cả hai bản vi/en nói thẳng số đo + *"trên kho này thì KHÔNG NÊN BẬT"*.
Cùng họ với ô Last Sync: **bề mặt nói dối người dùng**, chỉ khác là nó nói dối bằng lời khuyên.

**i18n: 90 → 74 chuỗi hardcode.** Dọn đúng phần RẺ — 16 chuỗi vốn **đã có key sẵn** trong dict,
code chỉ quên gọi `t()` (`system.js` 11→0 · `gm.js` 2→0 · `harness.js` 5→3 · `sources.js` 10→9);
thêm mỗi một key mới `sys.goto`. **74 chuỗi còn lại KHÔNG cùng loại**: 45 là nội dung *tài liệu
chuẩn cấu trúc* trong `shell.js` (dịch = viết lại tài liệu), 10 là chữ **nhúng trong chuỗi HTML**
ở `graph-panel.js` (phải tách chữ khỏi markup trước). Trần trong cổng đã hạ theo đúng số đo.

## [2026-08-13k] — "Last Sync" lấy từ ĐỒNG BỘ THẬT, thôi đẻ nguồn thứ hai

> **User chốt:** *"sync phải luôn lấy từ thời gian tự động sync thực tế"* · *"nó giống logic bên
> cái đã làm thôi"* — tức dùng lại đường đã có, đừng viết thêm một truy vấn nữa.

**Lỗ thứ hai của cùng ô đó** (lỗ thứ nhất: lệch kiểu, xem `[2026-08-13j]`). `lastSyncAt()` tự đẻ
`SELECT MAX(updated_at) FROM sync_state` — **MAX trên TOÀN bảng**, trong khi bảng ghi watermark
của MỌI thứ, không riêng đồng bộ Drive. Đo: **11 hàng thì 6 là `.tmp` của phép thử**
(`timed.tmp` · `probe5.tmp` · `probe4.tmp` · `probe3.tmp` · `probe2.tmp` · `probe-ship.tmp`),
cộng `keytest.enc` · `test.zemory.enc` · `cli-lean.enc`.

**Hôm nay con số vẫn "đúng" — thuần may:** hàng `drive:SS01-IT-12` tình cờ mới nhất. Chỉ cần một
phép thử chạy sau lượt sync là ô này hiện giờ của **một lượt test**. Bug ngồi im chờ ngày thứ tự
đảo lại — kiểu khó thấy nhất, vì lúc kiểm thì nó đang đúng.

**Vá:** bỏ hẳn truy vấn riêng; `lastSync` lấy từ `drive.lastPushAt` — chính hàng `drive:<host>`
mà panel Drive vốn đã đọc, và `driveSummary()` nay gọi **một lần** dùng cho cả hai ô. Cùng bệnh
với ô "đã đủ" từng nói dối: hai truy vấn trả lời hai câu khác nhau rồi cùng đổ vào một ô — chữa
đúng là **bỏ truy vấn thứ hai**, không phải sửa nó cho khéo hơn.

**Cổng:** thêm ca vào `last-sync.test.mjs` (5/5) canh `lastSync` phải đến từ `drive.lastPushAt`
và cấm quay lại `MAX(updated_at)`; đột biến chứng minh đỏ được. *Ca này đỏ nhầm lần đầu vì soi
trúng `MAX(updated_at)` nằm trong CHÚ THÍCH giải thích bug — nay bỏ chú thích trước khi soi.*

**Còn lại:** 6 hàng `.tmp` rác trong `sync_state` nay vô hại (không ai đọc tới) nhưng vẫn nên dọn
— là xoá dữ liệu nên chờ user chốt.

## [2026-08-13j] — ô "Last Sync" NÓI DỐI: TEXT ISO bị đọc như số epoch, catch nuốt lỗi

**User báo:** card cứ hiện *"never synced"* dù vừa sync xong. Đo lại thấy mâu thuẫn **ngay trong
cùng một payload**: `lastSync: null` trong khi `drive.lastPushAt` là **một phút trước** và
`syncPercent 100 · 241.011/241.011 · pending 0`.

**Nguyên nhân:** `sync_state.updated_at` là **TEXT chứa chuỗi ISO**, code đọc như **số epoch** —
`Number("2026-08-13T06:59:26.646Z")` = NaN ⇒ `new Date(NaN).toISOString()` **ném RangeError** ⇒
`catch` nuốt ⇒ `null`. Dữ liệu trong DB vẫn đúng suốt; chỉ ô hiển thị nói dối.

**Hai thứ khiến nó sống lâu, đáng nhớ hơn bản thân lỗi:** ① lệch kiểu chỉ lộ khi mở schema ra
xem — đọc code không thấy gì sai · ② `catch` vốn dựng cho ca *"bảng chưa tồn tại"* đã âm thầm
nuốt luôn một **lỗi kiểu**. Một catch không phân biệt được *"không có gì để báo"* với *"tôi vừa
vỡ"* thì biến bug thành **lời nói dối** — người dùng thấy một con số sai chứ không thấy lỗi.
Cùng họ với `02_RULES §Bề mặt CHẾT THEO nền`: vỏ rỗng không báo lỗi, nó nói dối.

**Vá:** tách `parseSyncTimestamp()` — nhận ISO **và** epoch (kho bản cũ không vỡ), rác thì trả
null chứ không ném (`/memory-status` gói mọi số trang chủ: một ô ném là mất TOÀN BỘ payload).
A/B trên dữ liệu thật: cũ `THROW RangeError` → mới `2026-08-13T06:59:26.646Z`.

**Cổng `last-sync.test.mjs` 4/4**, soi HÀNH VI chứ không soi chữ trong mã; đột biến (trả về công
thức cũ) làm **2 ca đỏ**.

⚠ **Chỉ sống sau khi khởi động lại daemon** — daemon đang chạy là pid 5468 từ 12/08 19:55, báo
`v1.4.1` trong khi `package.json` đã 1.5.8. Mở cửa sổ UI KHÔNG nạp lại mã: cửa sổ chỉ gắn vào
daemon có sẵn.

## [2026-08-13i] — (⑦) ĐÃ DỌN: pack 234,91 → 22,52 MiB, giữ nguyên mốc lịch sử

**Cách làm — giữ LOG, bỏ BLOB** (user hỏi thẳng: xoá hay để làm log). Thứ đáng giữ là *"ngày
05/08 đã xảy ra chuyện gì, ở commit nào"*, không phải 314 MB weight tải lại được (HP điều 2).
Và nội dung **không mất gì**: mỗi commit cũ đều có bản tương ứng đã bóc weight trên `main`
(`32d5d03`→`8bbcba9` · `921354f`→`d9cf711`, cùng ngày cùng message).
· tag `pre-lfs-fix-20260805` **dời** sang `8bbcba9` và nâng thành **annotated** — chính nó nay
  mang phần log: hash cũ, tên hai file weight, lý do, ánh xạ hash để tra ngược.
· xoá `refs/original/refs/heads/main` (rác `filter-branch`) · `reflog expire` · `gc --prune=now`.

**Số đo:** `size-pack` **234,91 → 22,52 MiB**. `main` **y nguyên** `7e7d2a8`; 3 tag còn đủ; cây
làm việc sạch; `fsck` sạch; 28/28 test + `validate` + `conform` ✓. **Không đụng remote, không
force-push, không hash nào của `main` đổi** ⇒ clone máy khác KHÔNG hỏng.

**🔴 SỰ CỐ TỰ GÂY, ghi lại vì đắt:** `git reflog expire --expire=now --all` **xoá luôn stash**.
`git stash list` đọc **reflog của `refs/stash`** — stash entry CHÍNH LÀ reflog entry, nên "dọn
reflog" = "xoá danh sách stash". Mất mục stash 04/08 của user (việc chưa commit).
**Cứu được** vì `refs/stash` vẫn trỏ commit `2986922` và `gc` không đụng (reachable qua ref):
`update-ref -d refs/stash` rồi `stash store` để dựng lại entry — nội dung khớp y nguyên
(3 file · +120/−66). **Bài học: `--all` trong lệnh git bao gồm cả những ref mình không nghĩ tới.**
Lần sau: chụp `for-each-ref` **và** `stash list` trước, và expire có phạm vi thay vì `--all`.

## [2026-08-13h] — (⑦) 314 MB weight: mục 🔴 treo 3 ngày hoá ra KHÔNG cần viết lại lịch sử

> 🔄 **Supersede:** thay [2026-08-12e] — "audit 10 mặt sau 1.5.0" — vế *"gỡ = viết lại lịch sử +
> force-push, làm hỏng clone máy kia"*, và vế *"mọi lần clone đều kéo về ~314 MB"*. **Cả hai sai.**

**Đo:** weight vào git qua ĐÚNG MỘT commit `921354f` (05/08) và **đã bị gỡ khỏi `main` ngay hôm
đó**: `merge-base --is-ancestor 921354f HEAD` ⇒ KHÔNG · `ls-tree HEAD` ⇒ 0 file. Nó chỉ còn sống
nhờ **hai ref CỤC BỘ** cùng trỏ `32d5d03`: `refs/original/refs/heads/main` (rác `filter-branch`
để lại) và tag `pre-lfs-fix-20260805`. **Remote không có cả hai** ⇒ clone từ GitHub không kéo gì.

**Số:** `.git` máy này **661 MB** · clone từ **local** (kéo cả tag) **236 MB** · clone từ GitHub
không chứa commit đó.

**Vì sao mục này treo 3 ngày ở mức 🔴:** nó được viết bằng suy luận *"blob còn trong pack ⇒ còn
trong lịch sử ⇒ phải viết lại lịch sử"* — nghe rất hợp lý, và không ai hỏi **ref nào đang giữ**.
Một câu lệnh `for-each-ref` là đủ để bác. Đúng dạng "chưa xác minh thì chưa phải sự thật": cái
giá không phải 314 MB mà là **ba ngày mang một việc nguy hiểm giả** (force-push, đổi mọi hash,
bắt máy kia clone lại) trong danh sách ưu tiên cao nhất.

**Còn lại cho user chốt** — thuần cục bộ, không đụng remote: xoá `refs/original/…` (an toàn, tag
vẫn giữ điểm lùi) và/hoặc xoá tag rồi `git gc --prune=now` để thu hồi 314 MB, đổi lại mất điểm
lùi về trước đợt sửa LFS 05/08.
