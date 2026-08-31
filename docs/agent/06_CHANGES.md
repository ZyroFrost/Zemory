<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-31c] — 2.12.1: đèn đỏ sync HẾT NÓI DỐI (bug thật: lượt chưa từng chạy vẫn báo "bị cắt")
**BUG THẬT, tìm được lúc audit chính đợt vá trên — và đang chạy trên máy user lúc đó.** Card Drive
Sync báo 🔴 *"cut off mid-run · push incomplete"* cho một lượt **CHƯA TỪNG KHỞI ĐỘNG**. Đo trên
`daemon.log` thật: `08:24:56` và `08:25:56` in **2 dòng "starting background sync job"**, mà
**0 lượt chạy · 0 kết cục · sổ `autosyncRunAt` kẹt mở · 2 suất lịch bị tiêu**. Gốc: `web-pull` giữ
token job daemon nhưng **vô hình với cả ba chiều** của cổng `syncBlockedBy`, nên cổng báo "rảnh";
`syncTick` tiêu mốc + mở sổ + in "starting" TRƯỚC khi `startSyncJob` gọi `claimDaemonJob`, và nhánh
claim-trượt **thoát sớm không gọi `onDone`** ⇒ không ai đóng sổ. Vá ba chỗ (chiều `jobHolder` ·
gọi `startSyncJob` trước rồi mới ghi sổ · tách `onSyncOutcome`). Chuỗi nhân quả đầy đủ + lý do
từng vế: `plan/14 §3b`.

> 🔄 **Supersede một phần `[2026-08-30b]` lỗ ②** (*"mốc lịch bị tiêu ngay cả khi lượt bị chặn → giờ
> chỉ tiêu khi lượt thật khởi động"*): đợt đó bịt nhánh `holder` nhưng **bỏ sót nhánh claim trượt** —
> cùng một bug, hai đường vào, chỉ một đường được bịt. Bài học: vá "khi X thì đừng tiêu suất" phải
> đi đếm **mọi** cửa thoát giữa chỗ tiêu và chỗ chạy thật, không chỉ cửa vừa gặp.

**Hệ quả cho đợt vá `preflight` cùng entry này:** cảnh báo mới ĐỌC sổ bền, nên sổ kẹt mở thì nó cũng
nói dối theo. Vá trên là **điều kiện để chính cảnh báo đó thành thật**.

**Cổng:** `autosync-schedule.test.mjs` +1 ca 7 phép. **Đột biến chứng minh, chạy thật 2/2 ĐỎ** — quan
trọng nhất là đột biến *trả về đúng code cũ*: nó chứng minh cổng canh **đúng bug đã xảy ra**, không
phải canh một giả thuyết.


### Vá gốc: preflight hết tự sinh đèn đỏ mà không nói trước

**Gốc bệnh là quy trình, không phải bug.** Quy trình chạy gate là *"tắt daemon → chạy gate → bật
lại"*. Nếu đúng lúc đó có lượt auto-sync chưa đóng sổ, tắt daemon **cắt** nó, và lần khởi động sau
báo 🔴 `KHÔNG để lại kết cục` lên card Drive Sync. Đèn đó **đúng** (lượt bị cắt thật) và **vô hại**
(lượt kế đẩy bù, không mất tin) — nhưng nguyên nhân là **thao tác bảo trì**, không phải sự cố.
Xảy ra thật trong phiên này: lượt bắt đầu `07:37:04Z`, tôi tắt daemon ~`07:44Z` để chạy gate, user
thấy *"986 new messages not pushed · push incomplete"* và phải hỏi *"lỗi này là sao"*. User chốt:
*"cái này nên thêm để t ko bị cấn nhìn thông báo thấy lo nữa"*.

**Vá:** `preflight-gate.mjs` đọc **sổ bền `autosyncRunAt`** trong `config.json` (không hỏi daemon —
câu này phải nói được ĐÚNG LÚC daemon đã tắt, và đó chính là lý do sổ bền tồn tại) rồi in hai vế
NGƯỢC nhau tuỳ daemon còn sống hay không:
- **daemon SỐNG** → *phòng ngừa*: nêu mốc lượt + số phút, nói thẳng *"tắt daemon BÂY GIỜ là cắt nó
  ⇒ card sẽ hiện đèn đỏ push incomplete"*, kèm *"vô hại"* để chính câu cảnh báo không làm ai lo.
- **daemon TẮT** → *giải thích*: *"đã bị cắt lúc daemon tắt … KHÔNG phải lỗi mới. Lượt kế tự đẩy bù
  — không cần bấm Sync Now"* ⇒ đèn đỏ được giải thích TRƯỚC khi user gặp nó.

Cùng lượt sửa một **bẫy tự gài**: file vốn là top-level await, nên chỉ cần `import` nó là đã dò
daemon rồi đặt `process.exitCode = 1` — tức file test nào import cũng đỏ oan trên máy có daemon bật.
Nay `main()` chốt sau `import.meta.url === argv[1]`, phần thuần (`syncCutNote`) import được an toàn.

**Cổng:** `preflight-sync-note.test.mjs` 5 ca, và **mỗi ca đỏ được bằng một đột biến RIÊNG** (chạy
thật, 3/3 bắt): bỏ kẹp `Math.max(0,…)` ⇒ đỏ ở ca đồng-hồ-chạy-lùi · bỏ qua cờ `daemonAlive` ⇒ đỏ ở
ca hai-vế-phải-khác-nhau (chốt chống chính việc cờ đó thành trang trí) · bỏ chốt null ⇒ đỏ ở ca
không-được-cảnh-báo-oan. Nghiệm thu trên máy thật, không riêng test: chạy `npm run preflight` lúc
đang có lượt sync bay thật (`08:25:56Z`, 9′) ⇒ in đúng vế phòng ngừa. Ngay sau đó tôi **làm theo lời
cảnh báo của chính nó**: chờ lượt đóng sổ mới tắt daemon, thay vì cắt lần thứ hai trong một ngày.

## [2026-08-31b] — 2.12.0: 5 bộ `docs_template/` đặt tên chuẩn theo prefix số + độ phức tạp cho user

**Đổi:** `app→05_app` · `nonapp→03_nonapp` · `adapt→04_adapt` · `cowork→01_cowork_basic` ·
`cowork_global_memory→02_cowork_memory`. Thứ tự xếp theo độ phức tạp CHO NGƯỜI DÙNG cuối, không
theo agent thực thi: khe không cần Global Memory (basic) → khe có GM+MCP (memory) → BI/dữ liệu
(nonapp) → dev có repo sẵn cần duyệt ánh xạ (adapt) → dev xây app mới, chuẩn đầy đủ (app).

**Sửa chẩn đoán sai lúc đầu:** `cowork_global_memory` KHÔNG phải "đường lùi" của `cowork` như
đọc lần đầu từ `plan/20` — nó là bản NÂNG CẤP (commit `3c1dda6`, 27/08 sửa 159 dòng
`BOOTSTRAP.md`), "cowork 2.0" theo đúng lời user. Hai bộ phục vụ hai nhu cầu khác nhau (có/không
Global Memory), tồn tại song song vĩnh viễn — đề xuất gộp ban đầu bị bác đúng, không gộp.

**Đụng:** `adopt.ts`/`ui.ts` (2 chỗ code thật, `StructureProfile` giữ nguyên `"app"|"non-app"`,
chỉ đổi thư mục đích) · 5 test (`bootstrap-manifest`·`conform`·`read-set-contract`·
`template-parity`·`standard-parity` — file thứ 5 chỉ lộ khi chạy gate đầy đủ, vì nó ghép path
qua biến chứ không phải chuỗi literal) · URL tự tham chiếu trong `BOOTSTRAP.md`/`README.md`/2
`GUIDE.docx` của cả hai bộ cowork (sửa qua script XML theo đúng luật `write-docx`, đo trước/sau
9 bảng/12 ảnh không đổi) · `plan/20`. Thêm ghi chú "đổi tên từ đâu" đầu README cả hai bộ cowork.

**0 chỗ cần sửa ở repo khác** — cowork không đi qua `zemory init`/registry của project nào, chỉ
là file tĩnh copy thủ công qua bootstrap. Gate đầy đủ chạy 2 lần (lần 1 bắt 5 lỗi từ file test
thứ 5, đã vá): **932/932 · EXIT=0**.

## [2026-08-31] — Sync hết câm, kho chia KHÚC, khe web chết vĩnh viễn thôi tự mở browser

**Sync lùi trong im lặng — bốn lỗ cùng họ "gãy mà không ai biết"** (user: *"gãy ở drive cũng phải
báo sync vấn đề, đéo được nói xong rồi báo cáo láo"*). ① nhánh nhường im lặng → giờ nói tên kẻ
chặn + hẹn giờ · ② mốc lịch bị tiêu ngay cả khi lượt bị chặn → giờ chỉ tiêu khi lượt thật khởi động
· ③ lượt bị daemon-restart cắt ngang không để dấu vết → sổ bền `autosyncRunAt` báo đúng ở lần lên
kế · ④ **đèn sức khoẻ gộp mọi tầng** (`syncHealthOf`) lên card Drive Sync, trần RIÊNG cho bước
`embed` (180′, việc LOCAL) để khỏi báo oan "Drive hang?" khi máy đang cày thật (đo: CPU 3.552 s).
`syncPercentOf`: 100% là lời khẳng định — hụt 1 tin cũng không tròn thành đủ (bug thật:
321.320/321.818 từng hiện "100%").
**Watchdog lượt sync**: kẹt quá trần tự bị giết, nhịp kế tự thử lại — trị ca Google Drive File
Stream đơ cứng tầng OS 2 lần/giờ, kéo cả daemon đông cứng theo (probe Drive dời sang tiến trình con
có trần 8 s, hết sờ ổ đám mây trên event loop daemon).
**Kho chính đổi từ MỘT FILE sang MỘT DÃY KHÚC** (HP điều 16 sửa đổi, `plan/08 §8e`): Drive không
upload delta, nối 0,3 MB vào file 2 GB là re-upload cả 2 GB — gốc thật mọi lần Drive đơ hôm nay.
Khúc đầy 256 MB thì niêm phong; gộp tự động 48 khối bãi bỏ (chính nó gây tải), `--compact` giữ làm
lệnh tay. Máy chưa cập nhật chỉ thấy khúc 1 (tương thích ngược).
**Khe web `main` chết thì thôi tự mở browser mãi mãi** (`deadMainLane`): khe `chatgpt` hỏng từ
29/08, 0/0 lần kéo thành công, nhưng code cũ ép nó luôn nằm trong vòng tự thử vĩnh viễn. Nay: main
coi là chết khi kết cục gần nhất `need-login` **và** một khe số cùng nền đã kéo tốt; khe đang sống
(như `claude` main) không bị đụng.

**Cổng:** `autosync-schedule` 6 ca · `sync-watchdog` 2 ca · `last-sync`(health) 13 ca ·
`drive-single-file`(segment) 4 ca · `web-autopull`(deadMainLane) 5 ca — ~30 ca mới, mỗi ca có đột
biến đỏ riêng. Gate đầy đủ **932/932**. Đo máy thật: sync đẩy 245–576 tin/lượt vào
`global_memory.002.enc` (7,6→9,2 MB) thay vì re-upload 2 GB; web tick sau vá chỉ mở `chatgpt#2`,
main hết bị gọi — xác nhận trên hành vi thật, không riêng test.

**Vector "hụt" — KHÔNG phải việc mở** (đo lại cùng ngày, lúc release 2.12.0). Số ~4.141 ở bản ghi
đầu là số ĐỌC DỞ (`--dry-run` treo 2 lần phải kill, chưa từng xác nhận). Đo thẳng bằng đúng truy vấn
của lệnh bù: vector chính local **302.047** · sổ `vec_shipped` **306.058** · **chưa lên kênh 497** ·
cửa sổ phụ 11.130. "Hụt" = **có ở máy, chưa đẩy lên kênh** (không mất gì) và **tự bù** theo từng delta
từ v23 — khớp log: `delta 345 tin · nhúng thêm 70` · `delta 106 tin · nhúng thêm 106`. Không mở mục
`05_TODO` cho việc này (user chốt: sổ việc chỉ chứa việc phải làm). Cơ chế + **giới hạn của phép đo**
(497 là giới hạn DƯỚI; 4.508 dòng sổ mồ côi chưa giải thích được): `plan/08 §8b`.

## [2026-08-30b] — NHÚNG TRƯỚC, XUẤT SAU: sync hết trễ-một-nhịp (lượt auto chở 0 tin dù 5.926 tin xếp hàng)
**User bắt hai lần cùng buổi sáng** (*"vẫn chưa thấy tự động sync"* · *"để máy lâu rồi có tự động được đâu"*) — đo ra
ba tầng, hai tầng đầu KHÔNG phải lỗi: ① máy ngủ 01:03→10:17 (log trống — không tiến trình nào chạy thì không gì sync);
② lượt tay 10:26 giữ kho ⇒ cổng lịch 10:32 nhường đúng luật, tự bắn 10:56 ngay khi rảnh (bộ canh log bắt được —
lịch 30′ SỐNG). ③ Tầng thứ ba là **lỗi hội tụ thật**: `embedFrontierId` cắt gói delta ở tin đầu tiên CHƯA nhúng
(điều 16 — tin và vector cùng chuyến), mà embed nằm CUỐI lượt sync ⇒ mỗi lượt chỉ chở phần lượt TRƯỚC đã nhúng,
luôn trễ một nhịp; backlog lớn thì lượt auto 03:56Z **chở 0 tin**, watermark đứng yên 6504552, 5.926 tin xếp hàng
— nhìn y như "sync chạy mà không đổi gì". **Đảo thứ tự trong `syncDrive`: scan → merge → EMBED (lô có trần, ngoài
khoá) → khoá → merge → export/write/verify** — frontier tiến ngay trong lượt, gói chở chính phần vừa nhúng.
Cổng: ca thứ tự phase `embed` trước `export` trong `drive-single-file` (đột biến dời-embed-về-cuối ĐỎ) · 8/8 · 12/12
sync gates. Lượt tay 10:26 cũng ghi nhận: Drive chập lúc nối (thấy 16/17 khối) → tự cắt về → thử lại → đủ khối —
bộ vá 26/08 chạy đúng lần đầu trên sự cố thật, dấu vết nằm trong `stderr` của job như thiết kế.
**Hai lỗ lộ tiếp cùng buổi, vá cùng lượt:** ① lượt 04:18Z ghi XONG + embed XONG (backlog 0 lần đầu trong ngày) mà chết
ở cú ĐỌC-ĐẾM xác minh (`UNKNOWN … read` xuyên qua `listChunks` — chiều ghi/merge có thử-lại, đúng phép đọc này lọt) ⇒
`listChunksRetry` (sync, `Atomics.wait`, cùng danh sách lỗi chập) áp cả hai chỗ xác minh · ② **UI tự đóng giữa lượt
sync**: nhịp tim cửa sổ chờ `/ping` 3 s trong khi daemon gánh sync+embed trả lời 12–16 s (đo) ⇒ nhịp nào cũng "hết
giờ", 3 phút là chết oan — nâng 20 s/nhịp, BẬN hết bị xử như KẸT, treo cứng thật vẫn bị giết. Nghiệm thu cuối ngày:
watermark 6504552 → 6522959 (lượt tay 12:11) rồi **lượt TỰ ĐỘNG 12:36 tự bắn và đẩy nốt** — UI về `Fully synced
321.069/321.069`; drill phục hồi từ kênh + kiểm auto-sync qua đêm ghi ở `05_TODO` cho phiên sau.

## [2026-08-30] — sync hiện ĐÚNG BƯỚC đang chạy · context-warning đọc SỐ THẬT từ `/context` thay vì đoán tên model
**Kẹt "syncing…" mà số không đổi** — user bắt được lượt sync 29/08 chết vì Drive chập lúc ĐỌC LẠI để kiểm tra
(ghi đã xong, mtime đã đổi) mà UI vẫn báo "✓ sync xong" vì `pollSync` chỉ nhìn `running`, không nhìn `ok`. Nay:
`syncDrive`/`pushAppend` phát `[phase] scan|merge|lock-wait:<ai>|export|write|verify|embed` qua stderr con,
`syncjob.ts` trích theo thời gian thực (`extractPhase`, hàm thuần, 3 đột biến đỏ) → `/sync-status.phase`; UI hiện
đúng bước, `ok:false` báo LỖI đứng yên (không tự nhận "xong"), `ok:true` vẫn xoay tới khi `/memory-status?fresh=1`
trả về số mới mới tắt. Tiến trình `syncrun.js` kẹt 55 phút do Drive chập lúc xác minh — kill an toàn (đo bằng
code: con chết → `exit` handler tự nhả write-gate; container tự bỏ qua khối ghi dở nếu có, không có ở đây vì ghi
đã xong) — vướng một cờ CLI tự hết hạn 5 phút do chính tôi gõ nhầm `--dry-run` (cờ không tồn tại).

**Context-warning "hầu hết không báo, có báo thì sai" — lỗi gốc TÌM RA, không phải đoán:** `windowFor()` học trần
cửa sổ THEO TÊN MODEL, mà transcript ghi `message.model` là chuỗi trần (`"claude-sonnet-5"`), KHÔNG hề phân biệt
phiên `[1m]` với phiên 200k CÙNG tên — học 1M một lần (từ một phiên `[1m]`) là NHIỄM VĨNH VIỄN sang mọi phiên
sau cùng tên (hành vi này chính test cũ `windowFor HỌC...` đã khoá làm ĐÚNG). Kết quả: phiên 200k thật bị tưởng
1M ⇒ không bao giờ chạm ngưỡng (*"hầu hết ko báo"*); model mới toanh rơi về 200k mặc định trong khi thật 1M ⇒
báo sớm 5 lần (*"báo sớm sai số"*). User chỉ đúng hướng: `/context` (lệnh CÓ SẴN của host) in **SỰ THẬT** ra
transcript (`**Tokens:** 645k / 1m (64%)` — bằng chứng lấy từ transcript thật máy này). Nay `readContextUsage`
ưu tiên đọc khối `local_command` gần nhất của `/context` trong CHÍNH phiên đó (`lastContextCommandWindow`,
đọc đuôi ≤2 MB, không gọi model, HP điều 10) làm mẫu số; không có thì rơi về đoán như cũ (fail-open, không đụng
test cũ). 10 ca mới (`context-real-window.test.mjs`), 5 đột biến đỏ 5/5; đo trên transcript thật: chưa gõ
`/context` ⇒ đúng như thiết kế cũ, 93,48%/1.000.000 (đoán) — gần sát ngưỡng, không sai lệch bậc.

## [2026-08-29b] — 2.10.0: luật ngôn ngữ code + ba ngoại lệ · hộp Cập nhật (zemory + repo) · Dọn dự án hai lớp · README viết lại
**Luật ngôn ngữ (bug-report từ repo `_DataWarehouse_Central`, grep lại — đúng):** bullet *"code · comment công khai: TIẾNG
ANH"* ở `02_RULES` (zemory + 3 template) **không có phạm vi**, cowork tách TÊN riêng và giới hạn `scripts/` — một luật, bốn cách
đọc. Hậu quả thật: agent bên đó định dịch 20 file / 20.203 token comment, suýt sửa **tên cột Excel do nghiệp vụ đặt** và **chuỗi
render ra `docs/`**. Nay MỘT bullet cho cả 5 file: **code · comment = tiếng Anh toàn bộ**, một file một ngôn ngữ; **ba thứ không
phải comment, không dịch**: ① chuỗi render ra tài liệu/bề mặt người đọc · ② tên do người khác đặt · ③ thuật ngữ. Comment cũ sửa
khi đang đụng file, không dịch hàng loạt (đo: ~4.000 token/lần đọc toàn repo — không đáng).
Repo phòng ban nhận luật bằng cách agent bên đó sửa `02_RULES` (file wins, `sync` không ghi đè) — nói rõ, không tự ghi chéo.
**Màn Tính năng (user chốt sau 2.9.0):** đèn Vector = *có gì tự nhúng backlog không* — Healthy khi scheduler bật dù còn pending
(⚠ chỉ khi scheduler tắt) · badge **một từ vựng** (On/Off · Healthy/Warning/Off), số liệu thành chữ xám sau tên · thẻ dự án cũ
chuẩn mang `⚠ chuẩn cũ` (4 repo `guardStale`). Cổng UI/i18n 54/54.
**Chip cập nhật về đúng mục đích gốc (entry 23/08, user nhớ ra):** không nhảy màn — bấm mở hộp **Cập nhật** tại chỗ: bản zemory
đang chạy / mới trên kênh chung + **Cập nhật ngay** (`POST /selfupdate`: 4 bước + chốt cây-bẩn-thì-dừng của `zemory selfupdate`,
dựng xong tự phóng daemon mới); bên dưới repo cũ chuẩn, mỗi repo nút **Cập nhật repo** (`POST /harness-apply` = `zemory sync` +
`hook guard` trong repo đó: bù file thiếu, file có sẵn giữ, sinh lại guard). Ghi repo khác được vì **cú bấm là lời cho phép**.
Chọn được nhiều repo (ô tick, mặc định tick hết) → **Cập nhật đã chọn (n)** áp tuần tự, báo từng dòng; công tắc **Kiểm các
repo khác dùng chuẩn** (`repoStdCheck`, mặc định bật) — tắt thì chip chỉ báo bản zemory mới, cho máy chỉ dùng bộ nhớ.
Chip **luôn hiện**: cam khi có việc, **xanh "Đã cập nhật · v… · repo khớp chuẩn"** khi ổn (bản đầu ẩn hẳn — user: *"ai nói là
ẩn"*). Áp thật 4 repo lần đầu: log `guard ok` ×4, `guard.cjs` ghi lại, stale 0 — nhưng hàng không vẽ lại vì selector CSS
chứa `\` đường dẫn Windows ⇒ đọc như "apply giả"; nay tìm hàng bằng so sánh thuộc tính.
## [2026-08-29c] — sau 2.10.0: chip nguồn · lịch tự sync · bỏ qua root · toast góc phải
**Hàng "Chưa liên kết" mang chip NGUỒN** (`GROUP_CONCAT(DISTINCT source)`): root là TÊN project web (Tarot study · Sasin…)
hiện `project trên web`, ẩn Add (không có folder), giữ Merge. **Lịch tự sync** (⚙ panel Auto-sync): *sau mỗi N* (15′…12 h, mặc định 30′)
hoặc *theo mốc giờ trong ngày* (tick giờ, mỗi mốc một lần/ngày); đồng hồ 30′ cứng thay bằng cổng 60 s hỏi `autosyncDue` (thuần,
cổng `autosync-schedule` 2 ca). "Đồng bộ ngay" không bị lịch ràng. **Bỏ qua root chưa liên kết** (`ignoredRoots`, theo máy):
nút *Bỏ qua* trên hàng ⇒ rời danh sách, xuống nhóm thu gọn *Đã bỏ qua (N)* có *Khôi phục* — danh sách đó là undo; chỉ lọc danh
sách chọn, phiên vẫn recall/sync (khác ô tick Sources). Nút *Đã bỏ qua (N)* neo phải cùng hàng tab máy → hộp Khôi phục. ⚙ lịch sync
ở góc header panel; chip nguồn cùng kiểu vàng. **Toast mới** (user: *"mọi hoạt động đều có popup"*): góc phải, xếp chồng, ~5 s, nút
tắt, rê chuột giữ lại — thay dòng đáy-giữa 2,6 s bị đè; bỏ qua/khôi phục/dọn/thêm dự án/nối đều báo ngay, không im khi chờ vẽ lại.
**Tự sync "mỗi 30′" mà 8 giờ không chạy** (5.896 tin chưa đẩy): mốc lượt trước là BIẾN TIẾN TRÌNH — 28 lần restart trong ngày,
mỗi lần về 0 rồi nhường scan/embed 30′ ⇒ không bao giờ tới lượt. Nay mốc lưu bền trong config (`autosyncLastAt`), restart không
reset đồng hồ. Cụm nút Add/Merge/Ignore đều nhau (min-width, căn phải), nhãn "project trên web" chiếm đúng một ô.
**"Dọn dự án đã mất" chạy mà "không làm gì"** — chỉ dọn registry (16 folder còn) trong khi *Chưa liên kết* có **9 root mất
folder**. Nay hai lớp + dry-run từng dòng: root mất cùng TÊN với dự án đã liên kết ⇒ **gộp** (trỏ lại + ghim); không đích ⇒ nhóm
*folder đã mất* (cờ `gone`). README viết lại theo `write-style` (tài khoản · đăng nhập · 2 tab · badge · hộp cập nhật · MCP 17 tool).
