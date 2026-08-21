<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-21b] — hấp thụ từ Graphify: `graph path` + god-nodes + đa ngôn ngữ THEO KHO

**Khảo sát Graphify (108,7k sao — đo bằng GitHub API, không tin marketing).** Nó HƠN ở độ phủ
ngôn ngữ · bề mặt truy vấn · cộng đồng; NGANG nền (tree-sitter · confidence-tier · incremental);
THUA đúng 2 đặc sản zemory (cạnh từ CHUẨN 03 · nối episodic `touches`) + kỷ luật 0-LLM cho docs —
nó LLM-extract docs ⇒ graph không rebuild ổn định, đúng thứ điều 13 cấm. ⚠ **Bẫy đo:** lượt
WebFetch đầu **BỊA benchmark LOCOMO** (README thô không có); kiểm chéo raw README + API mới ra thật.

**Mượn 2 món nó thắng:** · **`graph path <A> <B>`** — BFS không hướng trên 3 lớp cạnh SẴN CÓ
(imports · calls · api seam), in LOẠI + HẠNG từng bước (suy luận không giả dạng khai báo, kể cả
giữa đường đi); lấp lỗ traceability đa-hop plan 13 §1 tự nhận; đo sống `system.js → ui.ts`
**1 bước qua api seam** (đường import-graph mù hoàn toàn) · **god-nodes theo TỔNG BẬC** trong
`graph fitness` — lộ ngay `ui.ts (1↓/42↑)` mà bảng hubs chỉ-fan-in không liệt kê; matcher gộp về
một `matchFileId`. **KHÔNG mượn:** Leiden/wiki (dependency Python, chưa ca dùng) · LLM-extract docs.

**Đa ngôn ngữ THEO KHO — detect-then-load** (user chốt: *"nhiều ngôn ngữ là cho USER KHÁC của
zemory; không phải kho nào cũng áp một đống ngôn ngữ"*). `EXTRA_LANG_EXT` (bash·java·go·rust·
c_sharp·ruby) lấy từ **36 grammar đã ship sẵn** trong `tree-sitter-wasms`, **nạp lười per-key có
cache-cả-fail** ⇒ kho ts/js/py không tốn thêm byte nào. Node mang cờ `noImportLayer`; walker thêm
3 nhánh node-type ĐÃ ĐO; go/rust được `calls` miễn phí; ruby giữ làm **ca âm sống** (LOAD FAIL →
fail-open). Phép thử điều 15 trước khi build đã bác hướng "bật cả 40": hỗ trợ một ngôn ngữ là BA
tầng (quét file · cạnh import · walker), và 36 grammar ∩ nhu cầu thật ≈ ∅ — thứ cần là SQL (60
file thật) thì **không có wasm prebuilt**. Gate `graph-langs` 5/5 + `graph-path` 5/5, 3 đột biến đỏ.

**Audit ngay sau build bắt 2 CẤN, vá cùng ngày:** ① mở `SRC_EXT` **LAN sang cổng blocking
`conform`** — `devops/` chỉ chứa `deploy.sh` bỗng off-standard ⇒ mọi repo pull bản mới ĐỎ ĐỘT
NGỘT; vá bằng loại `noImportLayer` khỏi phép chấm đó (`.ts` lạ vẫn bắt) · ② `orphans` và
`isolated_pct` **nói khác nhau** ⇒ node `.go` hiện như "mồ côi" trong contract v2; vá cả hai +
phơi cờ ra export. Gate `BÁO OAN ⑦` + ca ⑤ đột biến đều đỏ. Sweep **109/109 · 0 skipped**.

## [2026-08-21] — chấm than update pull-based · vá 2 bệnh UI "tự tắt" · skill `write-style`

**"Chấm than update" (user chốt "làm luôn, không chờ embed") — MỘT phép đo, BỐN bề mặt.**
`syncCheck()` (dry-run gap-fill + `guardDrift`) dùng chung cho: `zemory sync --check` (exit 1 khi
cũ) · **hook nhắc đúng 1 lần/phiên** · `/harness-updates` (cache 5′) · **chip vàng ở rail** ngay
trên chip sức khoẻ, mọi repo khớp thì ẩn hẳn. Trả lời đúng bài toán user nêu (*"repo càng nhiều,
không thể gọi từng con áp update"*) mà KHÔNG ghi chéo — luật Phạm vi giữ nguyên: chỉ NHẮC, hành
động áp là của agent/user bên repo đó. **Nghiệm thu tự chứng minh nhu cầu: 9 repo đang cũ**
(mỗi cái thiếu `write-style` vừa ship; `PBI_OPS`+`SasinFlow` còn `guardStale:2`). Gate
`sync-check` 4/4, đột biến bỏ-nhánh-skills ⇒ đỏ.

**Hai bệnh UI user báo, cả hai KHÔNG phải "trạng thái bị mất" mà là VẼ SAI:**
· *"heal mở lại là tắt, phải bấm Recheck"* — `zboot` xếp `refreshChecks()` SAU chuỗi
  `/status → /memory-status`, mà lượt LẠNH của nó đo **>30s** khi máy bận ⇒ pill treo "…" nhìn
  như tắt. Vá 3 tầng: chạy song song ngay đầu boot · daemon **cache `/check` 10′ + mồi 3 check
  rẻ lúc lên** · nút ↻ Recheck mang `fresh=1` (giữ đúng nghĩa "đo lại thật"). Đo sau vá:
  **2–3ms** từ cache · fresh 358ms.
· *"công tắc tự bật tắt hoài"* — cuộc ĐUA vẽ-đè: payload bắn TRƯỚC cú bấm về SAU và vẽ đè trạng
  thái cũ. Vá: toggle đóng dấu `Z.flagsAt`, local thắng 90s rồi server là sự thật. **Đã BÁC giả
  thuyết cache-60s bằng đo** (set xong đọc lại thấy ngay). Trạng thái LƯU vốn đúng từ đầu —
  config cạnh kho ghi bền, ba lần restart daemon trong ngày đều giữ nguyên công tắc.
· Kèm UI: nút thu gọn rail **tích hợp vào logo** (hover hiện ‹/›), mượn ý OpenRCA; nút rời đã bỏ.

**Skill mới `write-style`** — bộ luật văn phong cho văn bản đưa người đọc, chưng cất từ trang
`Wikipedia:Signs of AI writing` (dò trang thật, không viết theo trí nhớ) thành **10 điều CẤM** +
ví dụ tiếng Việt tương đương + quy trình 4 bước. Ship trọn **4 bộ template**, đăng ký đủ 2 chỗ
mỗi bộ; manifest cowork 321→338 · 43→46 · thêm hàng 25. Harness tự nạp skill ngay trong phiên;
`conform` tự đếm skill 8→9. Gate `template-parity` 7/7 · `bootstrap-manifest` 8/8.

## [2026-08-20e] — doctor thêm 3 mặt (guard lỗi thời · cloud đầy đủ · rác nháp) + daemon lên 2.0.0

**Restart daemon (user duyệt):** pid 29564 · `/ping` 2.0.0 · hai công tắc giữ nguyên TẮT ·
job embed không hề hấn. **`scratchTick` trả công ngay phút thứ 2**: log ghi
`dọn 147 phiên nháp (2.261 MB) → còn 570 MB` — bản vá 20/08 chạy thật lần đầu, và cũng chứng
minh vì sao trước đó rác tích 2,9 GB: daemon còn mã 1.5.21 nên job dọn chưa hề tồn tại lúc chạy.

**Ba mặt mới của `doctor`** (đều là đề xuất nằm sẵn trong `05_TODO`, user chốt "làm đi"):
· **guard LỖI THỜI** — `guardDrift()` so cả 3 file chốt (guard · precommit · policy-theo-marker)
  với bản `hook guard` sinh hôm nay; CHỈ soi file mang dấu zemory, bản riêng của repo thì im.
  Trị đúng bệnh lộ ra hôm nay: một ngày HAI vòng vá guard mà mọi repo đã cắm phải "nhớ" đi sinh
  lại — nay máy nhắc thay người. Gate `guard-gen.test.mjs` 8/8, đột biến trả-rỗng ⇒ đỏ.
· **cloud ĐẦY ĐỦ** — nối `formatCloudReport` (hàm mồ côi từ 04/08, 0 lời gọi suốt) vào doctor;
  sạch thì im. Lượt chạy đầu lộ ngay dấu vết `*.tmp.driveupload` còn trong `D:\huy.nguyen`.
· **rác nháp** — dòng `scratch:` từ `sweepScratchpads({dryRun:true})`; đo `0.56 GB (trong trần)`,
  khớp log sweep của daemon (kiểm bằng đường thứ hai).

**Đóng bằng phép đo, không tốn code:** mục "số phiên nhảy 1.315→2.085" — chạy đúng lượt
`GROUP BY` sổ đề nghị: 992 phiên cụm 12–15/08 đều `claude-code`, **983 mang host máy kia**
(về qua merge kho chính Drive, mở đúng 12/08). Không phải lỗi dữ liệu.

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
