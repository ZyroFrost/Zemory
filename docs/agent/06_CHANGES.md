<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-22b] — conform ĐỌC slot khai trong 03_STRUCTURE §3 (hết báo oan off-standard-dir cho APP domain-first)

**Lỗi:** `off-standard-dir` chỉ tra `SLOT_ROLES` cứng, KHÔNG đọc `03_STRUCTURE.md §3` của chính
project — trái điều conform tự tuyên bố (HP điều 3 *file wins* · điều 13 *khai vào chuẩn rồi máy
honour*). Fix-text của nó (*"thêm slot vào chuẩn nếu là concern thật"*) thành lời nói suông: khai
vào §3 xong vẫn đỏ. Đóng mục `05_TODO "APP domain-first tên tự do chưa có đường khai"` — music_video_flow
(APP · FastAPI · đã nắn chuẩn 21/08) là ca thật đầu tiên: **16 blocking** cho `backend/app` · `api/v1` ·
`schemas` · `workspaces/*`, không mục nào lệch thật.

**Vá** (`structure-tree.ts` +73 · `conform.ts` +17): `declaredSlots(root)` parse §3 (CHỈ tree entry
`├── name/`, bỏ prose/`<placeholder>`) + `extraDirOk(dir)` exempt bốn đường — ① last-seg ∈ §3 khai ·
① top-level khai KHÔNG-phải-slot/root ⇒ freeform subtree (`workspaces/*`, như `tasks/<case>/` non-app) ·
② `backend/<pkg>/` có `__init__.py` = package root (scope depth-2) · ③ `api/vN`. Nối cả cổng blocking
`conform` lẫn cây UI (`roleFor`). Fail-open khi thiếu §3.

**Đo — KHÔNG nới luật:** music_video_flow **16 → ✓ 0**; fixture code-dir tên vô nghĩa CHƯA khai (không
pkg-root/api-version) **VẪN đỏ** (cổng còn nổ); **51/51** (conform · conform-declared[mới] · conform-foreign
· structure-sync · graph-standard), cổng parity điều 13 xanh. KHÔNG đổi `SLOT_ROLES` (không đụng repo
khác) · KHÔNG dùng ADAPT (music_video_flow là APP thuần đã nắn, không phải repo giữ cấu trúc riêng).

## [2026-08-22] — mặt audit ⑪ thành LUẬT CHUNG · cổng i18n cho HTML · bản vá backup ăn nửa

**User chỉnh đúng chỗ tôi đặt sai nhà:** 5 phép kiểm (chính tả · thiếu dấu · caption · song ngữ ·
UI-khớp-code) tôi viết vào **skill** — mà skill chỉ nạp khi gọi. NORM nay ở `02_RULES §Ngôn ngữ` (4 ràng buộc) + **ship cả 4 bộ template**; skill chỉ giữ **cách ĐO + bẫy báo oan**.

**Đo lần đầu: 4/5 bộ dò của tôi BÁO OAN** (`minh`/`nhanh`/`song` vốn không dấu ⇒ 63 oan · `\b` của JS
là ASCII ⇒ 128 oan · `Â.`/`Ã.` trúng ĐÂY/NGÃ ⇒ 192 oan · nhãn ở thẻ CON ⇒ 20 oan · khoá truyền qua BIẾN
⇒ "46 khoá chết" thật ra **0**). Sau vá: **0** thiếu dấu (61.234 từ) · từ lặp **0 thật** · **0 endpoint chết, 0 route FE gãy**. Danh sách bẫy: `05_TODO`.

**Lỗ THẬT: 21 chỗ chữ Việt trên UI không đi qua i18n** — `i18n-ratchet` chỉ quét `scripts/*.js`, chưa
soi `pages/app.html`; bật `lang=en` vẫn thấy «Quét sâu» · tooltip «Cài đặt» + 7 `aria-label`. Vá: móc
**`data-i18n-aria`** + 12 khoá hai dict; cổng mở sang HTML **có nhận biết TỔ TIÊN** (thiếu vế này là báo oan 2 ca) + **ca tự-kiểm dựng tại chỗ**. Trần **0**. Kèm 2 ô nhập thiếu nhãn.

🔴 **Bản vá backup hôm qua chỉ ăn MỘT NỬA — chính dòng log mới phơi ra:** `backup nhường embed — lượt
thứ 24 liên tiếp · bản mới nhất 11.7 giờ tuổi`. Khoá FILE đã khai kho nhưng **cờ trong bộ nhớ daemon**
(`holdUntil`) thì không, mà nó xét TRƯỚC. Vá: `/gate-acquire?db=` + khoá FILE quyết trước + ca `③c`
(đột biến ⇒ đỏ). Đo trên khoá THẬT: chặn kho thật = **false** · kho song song = **true**.

⏰ **Sweep 91 file (trừ 7 file ONNX) bắt HAI lỗi CÓ SẴN, cùng một lý do — nợ gate đầy đủ từ 15/08.**
① *test hẹn giờ*: fixture neo `NOW=2026-07-02` còn `blendRecency` đọc đồng hồ THẬT ⇒ điểm lật **52,1
ngày**, mà 01/07→22/08 đúng 52 ⇒ vừa đỏ 1–2 ngày qua (`git log` search/recency từ 15/08: **0 commit**)
· ② `capture-hook.ts` ghi **`writeFileSync` trần** (`859225e` hôm qua) trong khi cổng `fs-atomic` canh
đúng file đó. Vá cả hai ⇒ **675/675 · 0 skipped**. Sweep rẻ hơn `npm run check` (không build, không
đụng job embed) ⇒ chạy sau MỖI đợt sửa.

**Parity luật: cowork THIẾU 2 luật cứng** (`CẤM CHẠY IM LẶNG` · `FILE TẠM có đường chết`) — dù
`[2026-08-20]` ghi *"cowork tự nhận qua bootstrap"*, nó có `02_RULES` RIÊNG. Đã bổ sung: 4 luật × 5 bộ ✓.
⚠ **Lúc chốt sổ:** `zemory archive` nhận MỌI cờ lạ rồi CHẠY THẬT — `--help` archive 5 entry + 6 mục,
`--dry-run` in *"moved 2…"* rồi **dời thật** (diff archive 6→8 `✅`). Cờ lạ phải fail-closed; đề xuất + ca cổng ở `05_TODO` (chưa vá).

## [2026-08-21c] — audit lượt 2: backup bị bỏ đói IM LẶNG 27 giờ + parity cây↔graph

**Audit 10 mặt lần hai trong ngày — 1 BLOCKING, 7 advisory.** Job embed còn chạy nên gate đầy đủ
vẫn nợ; chạy được: tsc 0 · lint 0 · conform ✓ · validate ✓ · doctor ✓ · **272 test/0 fail/0
skipped** · 395 export đều có người gọi · quick_check ok · FK 0 · digest 2.325/2.325 · 0 secret.

🔴 **BACKUP BỎ ĐÓI IM LẶNG — 27,0 giờ không bản sao lưu, 1.946 tin nằm ĐÚNG MỘT bản.**
Gốc: khoá ghi là MỘT file cho cả `data/` và **không mang danh tính kho**, nên job re-embed kho SONG
SONG (plan 19) giữ khoá 44 giờ làm `backupTick` của kho THẬT nhường liên tục — hai file khác nhau,
không hề tranh nhau; nhánh nhường lại nằm TRƯỚC `try` ⇒ **54 nhịp im, không một dòng log**. Đây là
**cửa thứ BA** của cùng một bệnh (backup chết 4 ngày vì treo công tắc `scheduler` · bỏ đói autosync):
bản vá 13/08 cắt phụ thuộc vào *công tắc* nhưng để lại phụ thuộc vào *"có ai đang ghi"*.
**Vá:** khoá đóng dấu `db` + `cliHoldsWriteOn(kho)` · nhánh nhường **đếm + log** · `doctor` có mặt
`backup:` **đỏ + exit 1** khi quá 2× chu kỳ. Chụp ngay một bản: 2.040.832.000 byte/**17,2 s**,
`quick_check ok`. Cổng `backup-starvation` 7 ca (quá nửa ca ÂM); đột biến: hành vi cũ ⇒ 1 đỏ, bỏ
nhánh quá-hạn ⇒ 3 đỏ. Nghiệm thu daemon thật: 60 s sau restart **có** dòng `backup nhường embed`.

**Parity cây folder ↔ graph.** Đợt đa ngôn ngữ 21/08 mở `EXTRA_LANG_EXT` cho graph mà quên cây ⇒
repo giả: graph 5 node · cây 2 dòng, **3 node `.go/.java/.sh` không có dòng nào**. Vá bằng MỘT hàm
`isSourceLeaf()` cạnh hai tập đuôi, cả graph lẫn cây gọi chung (cái sai gốc là hai điều kiện ghép
tay ở hai nơi). Đo trước khi sửa: `conform` chấm trên `g.nodes`, KHÔNG đọc cây ⇒ không tái diễn ca
"conform đỏ đột ngột". Cổng: 2 ca `structure-sync` (repo giả + **ca ÂM**); đột biến đỏ **cả hai
chiều**. Sau vá 0 lệch (trước 3) · hồi quy 226/226.

**Docs lệch đã vá:** plan 13 thiếu `graph path`/god-nodes, §9 còn ghi *"KHÔNG làm: đa ngôn ngữ"* ·
plan 19 §8 ghi ① *"CHƯA"* trong khi §2 nói xong, §6 nói *"chưa có máy thứ hai"* mà `sync.lock` cho
thấy `DESKTOP-PFB157K` sync lúc 15:07Z · sổ lặp nguyên khối + 3 số dòng chết. **Tự nhận:** "33 giờ"
tôi báo lúc đầu SAI mốc (`ageMs` thật 27,0), và hai phép đo đầu **hỏng lặng** (bộ lọc đường không
khớp đường bắt đầu bằng `frontend`) nên báo "0 route FE" — nghe như sạch.

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
