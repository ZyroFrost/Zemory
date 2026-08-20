<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-20d] — vá 2 cổng báo oan + 1 lỗ `*.env` (báo từ repo PBI — tự đo lại, sửa khác đề nghị)

**Nguồn: báo cáo phiên `PBI_SasinFlow_Rebuild`; đo lại thì đúng 1,5/2 — và lộ thêm một lỗ
nặng hơn mà báo cáo không thấy.** Cả ba đã vá, gate **80/80 · 0 skipped**, 5 đột biến đều đỏ được.

**① `conform` chặn `pipelines/<domain>/` (non-app) — báo oan blocking.** Gốc sâu hơn mô tả:
`graph.ts:266` gán slot theo `basename` nên MỌI con-của-slot tên lạ đều "vô slot" (zemory xanh
chỉ vì may — mọi folder lồng trùng tên slot). Vá: `NONAPP_FREEFORM_PARENTS` (tasks·pipelines·
data) **chỉ miễn profile `non-app`** + gate PARITY neo const vào chính template non-app; `ignore`
trong marker nay áp cả nhánh chuẩn. **BÁC đề nghị "miễn mọi subdir"** — mở lỗ phía app (03 §2).
Fixture 2 chiều: non-app chỉ còn `randomstuff` đỏ; đổi profile app thì `excel_loader` đỏ lại.

**② guard đọc `.git/hooks/pre-push` thành `git push` — chặn oan đúng người làm theo tài liệu.**
Vá `(?<!\.)\bgit\b(?![\\/])` cho cả 4 nhánh git. **BÁC cách vá token-đầu-câu** của báo cáo:
đo 8 ca thì `/usr/bin/git push` · `sudo git push` · `env A=1 git push` sẽ LỌT.

**③ (nặng nhất, báo cáo không thấy) mẫu secret thiếu `*.env`:** `git add ipos_loader.env`/
`prod.env` LỌT SẠCH trên mọi repo dùng mặc định — comment trong `guard-gen.ts` còn tự nhận
"app/x.env vẫn bị bắt" (SAI, đo ra lọt). Vá: `*.env` vào `SECRET_DEFAULTS` + allow `example.env`/
`sample.env`; nhánh secret CHỈ quét token của đúng SEGMENT chứa lệnh git ⇒ tên `.env` nhắc
trong `echo` cùng câu lệnh hết bị chặn oan.

Ship: bản cowork chép lại (guard khớp byte + policy đồng bộ 2 khoá), manifest 321→338 · 43→46.
⚠ **Guard không tự làm mới** — repo đã cắm (kể cả vừa sinh lại đợt PowerShell 20/08 sáng) phải
chạy `zemory hook guard` LẦN NỮA; matcher giữ nguyên. Hồ sơ + việc chờ: `05_TODO` mục cùng tên.

## [2026-08-20c] — flag một-lần chịu được MỘT lần thử lại · job tự dọn thư mục nháp

**Flag `.allow-*` bị tiêu thụ ngay cả khi lệnh KHÔNG chạy.** Dính đúng lúc push 2.0.0: hook
PreToolUse chỉ nói CHO QUA — nó không biết lệnh có thực sự chạy hay không; guard ăn mất flag rồi
một tầng khác của host chặn lệnh lại ⇒ phải đi xin user lần nữa cho cùng một việc họ vừa đồng ý.
Hướng sai là *"phải xin lại"* chứ không phải *"lọt qua"* — an toàn, nhưng bắt user trả lời hai
lần cho một câu là thứ `02_RULES §Hành xử` gọi thẳng là LỖI.
**Vá:** flag đóng dấu **vân tay của VIỆC** (sha1 lệnh/đường dẫn) + cửa sổ 90 giây. Cùng việc ⇒
thử lại được · việc KHÁC mượn ⇒ **thu hồi ngay** · quá cửa sổ ⇒ chết hẳn. Vẫn là "một lần cho
một việc", chỉ thôi phạt vì một lần thử lại. Gate `guard-flag-retry` 3/3 (repo tạm, không đụng
flag thật — bản đầu dùng flag thật và làm ĐỎ một file test chạy song song); đột biến: quay lại
xoá-ngay ⇒ 2 đỏ, bỏ vân tay việc ⇒ 1 đỏ. Hai test cũ neo vào hành vi "tự xoá ngay" đã cập nhật
theo hợp đồng mới thay vì bị gỡ.

**Thư mục nháp phình vô hạn — nay có job dọn.** Đo trên đúng MỘT phiên làm việc nặng: **3,97 GB**
nằm im (model ONNX tải để đo · cache HuggingFace · profile trình duyệt · JSON số liệu). Không ai
dọn, không cổng nào kêu, và nó không nằm trong `git status` nên không lần audit nào thấy.
**Vá:** `jobs/scratchpad.ts` + `scratchTick` trong scheduler (mỗi 6 giờ, đồng hồ riêng, không
treo vào công tắc tính năng nào — đúng bài học backup chết lặng 4 ngày): dọn phiên quá 7 ngày
hoặc khi tổng vượt 2 GB, **cũ nhất trước, chỉ tới khi về dưới trần**.
Đây là job TỰ XOÁ FILE nên bốn ràng buộc an toàn đều có gate riêng (7 ca, quá nửa là ca ÂM):
chỉ nhận đúng khuôn `<project>/<session>/scratchpad` · không đụng phiên đang chạy · không đụng
thư mục vừa ghi trong 6 giờ · fail-open. Đột biến: bỏ bảo vệ phiên đang chạy ⇒ 2 đỏ, bỏ kiểm
khuôn ⇒ 1 đỏ. Kèm luật **FILE TẠM PHẢI CÓ ĐƯỜNG CHẾT** vào `02_RULES` + cả 3 template.
*(Dọn tay ngay trong phiên: 3,97 GB → 79 MB, giữ lại dữ liệu đo để còn đối chiếu.)*

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
