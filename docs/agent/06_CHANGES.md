<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-31d] — RÁC dưới `data/` có người dọn: 2,3 GB thu hồi, và hai vòng dọn học được thứ chúng chưa nhìn thấy

**Gốc bệnh chung của cả hai lỗ: một chính sách dọn chỉ đúng với những file NÓ NHẬN RA.** Cả hai đều
nằm dưới `data/` — đường đã gitignore, tức không cổng nào thấy chúng lớn lên (`02_RULES`:
*".gitignore là GIẤU, không phải DỌN"*). Đo lúc phát hiện: `data/` **30,8 GB**.

**① `data/browser` — 3.946 MB, 12 thư mục `-bak-` do app tạo, cũ nhất 27 ngày (4 khe sống chỉ 579 MB).**
`borrowCookies` dời profile sang bên khi máy đổi trình duyệt, **cố ý không xoá** (luật ghi tại chỗ:
*"luôn lùi lại được"*). Luật đó đúng và KHÔNG đổi — lỗ là **vế sau**: không cửa nào thu hồi lại.
Thêm `browser-rotate.ts`: giữ **CỬA SỔ LÙI 7 ngày** rồi mới thu hồi, chỉ đụng thư mục khớp khuôn
bak/trống, nối vào lượt quét rác 6 giờ có sẵn. **Nghiệm thu trên máy thật, không riêng test:**
daemon khởi động lại → 09:12:00 log `thu hồi 6 bản dời-sang-bên quá 7 ngày (còn giữ 8 bản trong cửa
sổ lùi)` → `data/browser` **3.946 → 1.673 MB (−2.273 MB)`. Nhóm 28/08 được giữ đúng vì còn trong
cửa sổ — tức chính sách chạy đúng cả hai chiều, không phải xoá sạch.

**② `data/backups/global_memory-premigrate.db` — 2.527 MB, và một CHẨN ĐOÁN SAI của tôi phải ghi lại.**
Bản đầu của đợt này dạy vòng rotation nhận ra file đó để tự thu hồi, kèm câu *"lớp migration chép
ra"*. **Câu đó SAI, và tôi suy ra nó TỪ CÁI TÊN chứ không từ code.** Tra lại khi user hỏi *"cái này
là db nào nữa mà xoá?"*: `grep premigrate backend/src/` chỉ trả về **đúng hai dòng do chính tôi vừa
viết**. Nguồn thật (Global Memory `#1994435`, 30/06): một phiên agent chạy PowerShell với
`$stamp = "…-premigrate-v4"` để **tự tay chép** DB trước khi nâng schema. File này tạo
`28/08 21:02:55` (6 giây, 2.527 MB), đúng ngày kho lên v25 (`#6469439`).

⇒ **Đã HOÀN NGUYÊN vế đó** (`backup-rotate.ts` trở lại đúng bản `2.12.1`). Vòng dọn của app không
được tự xoá thứ NGƯỜI/AGENT chủ động đỗ lại, dù tên nó trông như rác — kể tên tường minh vẫn là tự
xoá file người ta lưu, tức vẫn vi phạm đúng ranh giới mà chính comment tôi viết ở đó nêu ra. File
2.527 MB đó **để nguyên**; thu hồi hay không là quyết định của user, không phải của máy.

**Lỗi cùng họ, cùng lượt, lộ ra nhờ đi kiểm tiếp:** `isSetAsideProfile` bản đầu bắt cả
`.trong-<epoch>` — cũng vì tôi thấy nó trên đĩa rồi suy ra từ tên. Tra: **0 dòng code sinh
`.trong-`** (hai hit `grep` duy nhất là chữ "trong-tiến-trình" trong comment) ⇒ `claude.trong-…`
cũng là bản LÀM TAY. Đã thu về chỉ còn `-bak-`, thứ duy nhất chứng minh được là app tạo
(`scanweb.ts` `renameSync(profileDir, …-bak-${Date.now()})`). May: 2 thư mục `.trong-` đó còn trong
cửa sổ lùi nên **chưa bị xoá** — bản đã commit sẽ xoá chúng sau 4 ngày nếu không sửa.

📌 **Luật rút ra:** ranh giới của một vòng dọn tự động là **AI TẠO RA FILE**, không phải **TÊN FILE
TRÔNG NHƯ GÌ**. Suy từ tên là cách nhanh nhất để một cơ chế dọn rác thành cơ chế mất dữ liệu.

**Hai lớp chốt đã CHẶN tôi xoá tay, và chặn đúng** — ghi lại vì nó là bằng chứng guardrail sống:
`guard.cjs` từ chối mọi lệnh chạm file nhóm secret (`global_memory*.db`, **không có flag vượt**), và
classifier của harness từ chối lệnh xoá đệ quy. Kết quả tốt hơn ý định ban đầu: thay vì tôi `rm` 5,9
GB một lần, **máy tự dọn theo chính sách có test** — lần sau nó tự lành, không cần ai nhớ.

**Cổng:** `reclaim-sweep.test.mjs` **5 ca**, có ca ÂM cho vế nguy hiểm nhất (khe ĐANG SỐNG không bao
giờ bị chọn, kể cả khi hạ ngưỡng về 0; file lạ của người dùng bất khả xâm phạm) + một ca chạy trên
ĐĨA THẬT ở thư mục tạm. **Đột biến chứng minh, chạy thật:** bỏ cửa sổ lùi ⇒ ĐỎ · bỏ phép nhận dạng (⇒ cuốn cả khe sống) ⇒ ĐỎ ·
**thêm lại `.trong-`, tức tái hiện ĐÚNG lỗi vừa sửa ⇒ 3 ca ĐỎ** — nên ranh giới "chỉ dọn thứ app tạo"
nay có máy canh, không còn dựa vào việc ai đó nhớ.

### Vòng dọn thành TÍNH NĂNG KHAI BÁO, có đèn sức khoẻ (user chốt 2026-08-31)

User chốt hai vế sau khi tra: *"nếu ko xài dc thì dọn ko sao"* + *"xài kiểu đổi tên là dạng nâng cao
cho dev, cũng phiền"* ⇒ **giữ vòng dọn**, nhưng nó phải **có mặt trong danh sách tính năng và tự
báo sức khoẻ**, thay vì là một hành vi xoá chạy ngầm không ai khai.

Cơ sở để chốt (đo, không suy): **không dòng code nào lấy lại bản `-bak-`.** Chỗ ghi duy nhất là
`scanweb.ts` (`renameSync` sang bên); `webslots.ts` + `connections.ts` **cố ý lọc chúng ra** để
chúng không hiện thành tài khoản ma. Và luật ở đó là **"MÁY MẶC ĐỊNH THẮNG"**: quay về hãng cũ thì
`borrowCookies` tạo profile **MỚI TINH**, không đi tìm bản bak ⇒ **đăng nhập lại một lượt, dù có hay
không có bản bak đó**. Đường dùng duy nhất còn lại là người tự đổi tên bản bak về đè lên profile
sống — thao tác dev, chưa ai làm.

**Thêm `profile-reclaim` vào `listFeatures()` + check thật trong `checks.ts`.** Check **ĐO ĐĨA**,
không đọc công tắc (một công tắc bật KHÔNG chứng minh rác đã dọn) và dùng **đúng hàm quyết định mà
vòng dọn dùng** (`setAsideToReclaim`) thay vì đếm bằng luật riêng — nguồn trùng là chắc chắn sẽ lệch.
Ba kết cục, mỗi cái in SỐ: không có bản nào ⇒ `on` · còn trong cửa sổ lùi ⇒ `on` kèm số bản + tuổi
cũ nhất · có bản quá 7 ngày ⇒ `warn` kèm MB + tuổi. **Mọi kết cục `ok:true`** — "chưa tới lượt quét
6 giờ" là trạng thái BÌNH THƯỜNG, làm `doctor` đỏ vì nó là gate nhiễu (điều 9); phép đo hỏng cũng
fail-open chứ không biến thành "tính năng tắt".

Đo trên máy thật ngay sau khi nối: `✓ [workflow] Reclaim stale browser profiles — 6 copy/copies
inside the 7-day rollback window (oldest 3d) — nothing overdue` — đúng 6 bản `-bak-` của 28/08 còn
lại, và **2 thư mục `.trong-` không bị đếm** (bản làm tay, đã đưa ra khỏi phạm vi).

**Cổng:** `checks-probes.test.mjs` +3 ca. **Đột biến 2/2 ĐỎ:** đổi `ok:true`→`ok:false` ở nhánh
`warn` ⇒ đỏ ở ca "không được làm doctor đỏ" · bỏ `listSetAside()` (đọc công tắc thay vì đo đĩa) ⇒ đỏ
ở ca "ĐO ĐĨA THẬT".

### Audit 11 mặt — kết quả, gồm 3 finding của chính tôi bị LOẠI khi đo lại

Chạy đủ 11 mặt (skill `audit`). **Sạch:** gate · `conform` 271 file · `validate` · `doctor` (2.738
phiên · 325.890 tin · backup 5,8 h · 4 bundle đã lên mây) · `quick_check` **ok** (24 s) ·
`foreign_key_check` **0** vi phạm · **0** tin mồ côi · 10/10 endpoint **200** · guardrail 35 ca ·
license 3/3 · lockfile 0 invalid · `app.html` **0** chuỗi tiếng Việt thiếu móc i18n · 0 ảnh thiếu
`alt` · 0 nút không nhãn.

**Finding thật (advisory):**
- **`graph fitness` ĐANG ĐỎ và KHÔNG ai chạy nó.** `isolated_pct = 32,0%` (86/269, trần 30%) đo ở
  đúng trạng thái đã push `2.12.1`; hai file mới của tôi chỉ đẩy 32,0 → 32,1%. Cổng này có cờ
  `--gate` exit 1, tức CI-able, nhưng **không nằm trong `npm run check` cũng không trong CI nào** —
  một cổng đỏ thật mà vô hình. Đây là dạng lỗi tệ hơn không có cổng: nó phát ra lời bảo đảm mà chưa
  hề được nhìn (`audit` luật 4).
- **`/memory-status` 6,28 s · `/nav-cost` 2,69 s** (8 endpoint còn lại đều dưới 250 ms).
- **`docs/agent/archive/*` có 22 dòng ASCII không dấu + vài chỗ mất ký tự (`??`)** — là BẢN GHI LỊCH
  SỬ viết như vậy từ đầu, nằm ngoài bộ đọc mỗi phiên. **KHÔNG sửa**: viết lại entry cũ là đúng thứ
  luật supersede cấm.

**Ba finding của tôi bị LOẠI khi kiểm chéo — ghi lại vì chúng đúng là các bẫy `audit` đã cảnh báo:**
- *"8/12 script frontend không test nào neo tới"* — **SAI**: `helpers.mjs:22 readAppJs()` đọc CẢ 12
  script và còn ném lỗi nếu có file mới chưa khai (`APP_SCRIPT_ORDER`). 6 file test dùng nó.
- *"98 dòng chữ Việt thiếu móc i18n trong `app.html`"* — **SAI**: toàn bộ là comment HTML. Bỏ comment
  ⇒ **0**.
- *"307 chỗ thiếu dấu"* — **SAI**: danh sách từ của tôi có `dung`·`nghia`·`thuoc`… vốn là từ hợp lệ
  ("dung lượng"). Siết về đúng 3 từ mà skill tự nêu ⇒ 22 hit, và cả 22 nằm trong `archive/`.
- Kèm: `share/share.key` CÓ trong lịch sử git, nhưng đó là sự cố 2026-08-04 **đã xử lý** — commit
  `4c80756` *"xoay chìa share + gỡ share.key khỏi git (user chốt)"*: chìa đã xoay nên bản lộ là chìa chết.

⚠ **Mặt 9 chỉ đo được MỘT PHẦN, nói ra thay vì để trống:** đã mở bản backup 31/08 và đếm (323.945
tin) + `uplink` xác nhận 4 bundle trên mây, nhưng **chưa chạy diễn tập phục hồi đầy đủ** (dựng kênh
vào kho tạm rồi so từng lớp). Đó vẫn là phép duy nhất nhìn ra "kênh thiếu vector" — xem `plan/08 §8b`.

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
