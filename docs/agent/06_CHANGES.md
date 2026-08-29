<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-29b] — 2.10.0: luật ngôn ngữ code + ba ngoại lệ · hộp Cập nhật (zemory + repo) · Dọn dự án hai lớp · README viết lại
**Luật ngôn ngữ (bug-report từ repo `_DataWarehouse_Central`, kiểm lại bằng grep — đúng):** bullet *"code · comment công
khai: TIẾNG ANH"* ở `02_RULES` (zemory + 3 template app/nonapp/adapt) **không có phạm vi**, cowork thì tách TÊN riêng và
giới hạn `scripts/` — cùng một luật, bốn cách đọc. Hậu quả thật: agent bên đó định dịch 20 file / 20.203 token comment,
suýt sửa **tên cột Excel do phòng nghiệp vụ đặt** (`"Kich thuoc khu dat"`) và **chuỗi render ra `docs/`**. Nay MỘT bullet
cho cả 5 file: **code · comment = tiếng Anh toàn bộ** (comment · docstring · tên · log · commit), một file một ngôn ngữ;
**ba thứ không phải comment, không dịch**: ① chuỗi render ra tài liệu/bề mặt người đọc · ② tên do người khác đặt · ③ thuật
ngữ. Comment cũ sửa khi đang đụng file, không dịch hàng loạt (đo: tiết kiệm ~4.000 token/lần đọc toàn repo — không đáng).
Repo phòng ban nhận luật bằng cách agent bên đó sửa `02_RULES` (file wins, `sync` không ghi đè) — nói rõ, không tự ghi chéo.
**Màn Tính năng (user chốt sau 2.9.0):** đèn Vector = *có gì tự nhúng backlog không* — Healthy khi scheduler bật dù còn
pending (backlog không bao giờ về 0 khi kho nhận tin liên tục; ⚠ chỉ khi scheduler tắt) · badge **một từ vựng** (On/Off ·
Healthy/Warning/Off), số liệu thành chữ xám sau tên · chấm cam ở rail nay **toast tên repo** + thẻ dự án mang `⚠ chuẩn cũ`
(4 repo `guardStale`) — trước đây bấm sang Dự án mà không thẻ nào khác thẻ nào. Cổng UI/i18n 54/54.
**Chip cập nhật về đúng mục đích gốc (entry 23/08, user nhớ ra):** không nhảy màn nữa — bấm mở hộp **Cập nhật** tại chỗ:
bản zemory đang chạy / bản mới trên kênh chung + nút **Cập nhật ngay** (`POST /selfupdate`: cùng 4 bước và cùng chốt
cây-bẩn-thì-dừng của `zemory selfupdate`, dựng xong tự phóng daemon mới rồi thoát), bên dưới liệt kê repo cũ chuẩn — mỗi repo
một nút **Cập nhật repo** (`POST /harness-apply`: y hệt `zemory sync` + `hook guard` chạy trong repo đó — bù file thiếu, file
có sẵn giữ, sinh lại guard; không cắm hook runtime). Ghi vào repo khác được vì **chính cú bấm là lời cho phép** cho đúng repo đó.
Chọn được nhiều repo (ô tick, mặc định tick hết) → **Cập nhật đã chọn (n)** áp tuần tự, báo từng dòng; công tắc **Kiểm các
repo khác dùng chuẩn** (`repoStdCheck`, mặc định bật) — tắt thì chip chỉ báo bản zemory mới, cho máy chỉ dùng bộ nhớ.
Chip **luôn hiện**: cam khi có việc, **xanh "Đã cập nhật · v… · repo khớp chuẩn"** khi ổn (bản đầu ẩn hẳn — user: *"ai nói là
ẩn"*). Áp thật 4 repo lần đầu: log `guard ok` ×4, `guard.cjs` ghi lại, stale 0 — nhưng hàng không vẽ lại vì selector CSS
chứa `\` đường dẫn Windows ⇒ đọc như "apply giả"; nay tìm hàng bằng so sánh thuộc tính.
**Nút "Dọn dự án đã mất" chạy mà "không làm gì"** vì chỉ dọn registry (16 folder đều còn) trong khi danh sách *Chưa liên kết*
có **9 root mất folder**. Nay hai lớp + dry-run in từng dòng: root mất mà cùng TÊN folder với dự án đang liên kết ⇒ **gộp**
(trỏ lại + ghim, không xoá); không đích ⇒ gom vào nhóm thu gọn *folder đã mất* (cờ `gone` trong coverage). README viết lại
5 mục theo `write-style` (capture theo tài khoản · vòng đăng nhập · hai tab Dự án · badge một từ vựng · hộp cập nhật · MCP 17 tool).

## [2026-08-29] — Tài khoản web = DANH TÍNH; daemon canh đăng nhập; probe hết đóng tab; hai hệ dấu
> 🔄 **Supersede:** thay [2026-08-28e] — "một lỗi CHƯA fix được (hai cửa sổ đăng nhập)" — gốc: probe đóng tab lúc đang đăng nhập (④). Thay vế *"Probe cũng dọn"* (`scanweb.ts`).

**Sáu lỗi thật, user bắt bằng mắt, không cổng nào kêu:** ① **Đăng nhập xong app không nhận** — `/connect` trả `need-login`
sau 73 s rồi BUÔNG; chờ nằm ở UI (3 phút, chỉ khi app mở), cờ `connPending` không đặt. Nay **daemon canh** (`startLoginWatch`
5 s/lượt · 15 phút) → thấy đăng nhập ⇒ `webAuth` ⇒ kéo ngay qua cửa sổ đó ⇒ `webPull`; UI chỉ vẽ lại (`watching`).
② **Kéo về 0 vì chọn sai org** — 3 org, `CLAUDE_ORG_JS` lấy org chat ĐẦU = `Global` (0 hội thoại) ⇒ "not ready ×5" ⇒
báo `no-tab`. Nay duyệt **mọi org chat**, sổ `_bag` nhớ org từng hội thoại; rỗng thật ⇒ `done·0`. `enumerated 86` (trước 0).
③ **Lịch sử "đổi chủ"** — `sessions.account` ghi KHE, nhãn lấy email ĐANG đăng nhập ⇒ 81 phiên zyrofrost đội tên công ty.
Nay **khoá = email** (`accountKey`); `restampAccount` gắn email lên phiên web liệt kê; email không còn khe ⇒ hàng "chưa nối";
chưa danh tính ⇒ "(chưa gắn tài khoản)". **Chỉ lấy danh tính web trả về** (backfill theo sổ cũ bị bác). 5 đột biến đỏ.
④ **Cửa sổ đăng nhập chết sau 1–3 phút** (4 profile `exit_type: Normal`) — probe gọi `closeExtraPages` lúc OAuth mở thêm
trang claude.ai ⇒ đóng tab duy nhất ⇒ trình duyệt thoát. Probe nay **chỉ đọc** (gốc thật của "hai cửa sổ" 28/08). ⑤ Mỗi bấm
nối = khe mới ⇒ `freeAccountSlot`. ⑥ Đóng dấu tài khoản lên phiên local nạp cùng lượt ⇒ claude-code tách 3 hàng; `webSessionIds`.

**Hai hệ dấu (user chốt):** web nhị phân ✓/⚠ · local máy này ✓/⚠ theo đĩa · local máy khác ✓ xanh (≤30 ngày)
/ ✓ xám "đã ngưng" · hàng cha gộp con (`aggregateConn`) · popover **?** chú giải · thu gọn nhóm ▾/▸ · bỏ "(agents)".
**UI (user chốt cùng ngày):** Rerank ẩn khỏi UI (engine giữ) · Projects tách 2 tab **Dự án | Thêm dự án** · hai nút quét
trùng gộp còn MỘT `↻ Quét lại`; Quét sâu chỉ ở Global Memory. **Quét/MCP kéo web NGẦM** — `/memory-scan` từng mở cửa sổ
Brave HIỆN cho từng khe (user: *"ko bấm gì mà nó cứ tự mở"*); cửa sổ hiện chỉ khi bấm Liên kết. **ChatGPT mất phiên**
do đổi Edge→Brave (luật "máy mặc định thắng", 04:09Z); `setWebAuth(false)` xoá `who` ⇒ Link mở khe mới `chatgpt#2` — nay
giữ `who`, `slotOfIdentity` ưu tiên khe ĐANG nối. **Tick = được nạp + được embed** (user chốt): bỏ tick tài khoản ⇒ không
kéo (`scanWeb` xét cả lane email), tin đã có rời hàng đợi embed + bộ đếm (`SCOPE_EXCLUDE_SQL`, đột biến đỏ). Cây tự tươi 60 s.
**Kèm:** `canonProjectRoot` nắn chữ ổ đĩa ở đường nạp (fix 07-29 chỉ chắn sổ docs; quét 79+172 hàng) · `--account` cho
CLI `scan-web` · `/connect` log về `daemon.log` · `forget sess-rt` (xác test 02/08) · `webPull` ghi ở mọi đường kéo · trang
**`/linked`** "✓ Đã liên kết {email} · kéo N/M" trong tab đăng nhập · xoá 3 profile trống (370 MB) · gộp **103 phiên** của
7 root đổi tên về `Tool\Zemory` 100 · `Tool\SasinFlow` 96 · `_Maintain` 68 (ghim, `cwd` giữ). Đo sai đã rút: "Google chặn
OAuth" · "khe 4 = huy.nguyen" (CLI thiếu `--account`). Spec `plan/07 §16`. **Gate (lồng 4 GB): lần 1 885/3 (ba neo cũ) →
audit cuối 890/890 · đỉnh 3.284 MB · conform ✓ · phục hồi backup 2.552 MB ok** (conform bắt NUL thật tôi từng gạt là báo oan).

## [2026-08-28e] — Trình duyệt + cửa sổ đăng nhập: bốn lỗi thật, và một lỗi CHƯA fix được
> ⤴ Đã bị thay bởi [2026-08-29].
**Bốn lỗi ship được** (mỗi cái user chỉ ra, không cổng nào kêu): ① máy mặc định **Brave** mà bộ dò chỉ biết
Chrome/Edge ⇒ mở Edge, bật hộp Microsoft-sync che form đăng nhập — thêm `BRAVE_PATHS` · ② `authExpr` gọi URL
TƯƠNG ĐỐI khi tab còn `about:blank` ⇒ `Failed to parse URL`, bị đọc thành **"chưa đăng nhập"** và mở cửa sổ
cho tài khoản ĐANG đăng nhập — thêm `awaitOrigin` (chờ trạng thái, không chờ đồng hồ) · ③ `--hide-crash-restore-bubble`
(zemory đóng cửa sổ bằng `taskkill /F` nên Chromium coi mọi lượt là crash, hộp Restore che form đăng nhập) ·
④ `accountsOf` liệt kê MỌI thư mục profile ⇒ quét lặp 3 khe, mở cửa sổ đăng nhập cho khe đã mất phiên —
tách `pullableAccountsOf` (main + khe `auth.ok`); kéo là việc của khe ĐANG NỐI, nối lại là việc user bấm.

**Một quyết định ĐẢO HAI LẦN trong một buổi, ghi để không bàn lại:** *máy mặc định thắng* → *profile có phiên
thắng* → **máy mặc định thắng + NÓI RA + giữ bản lùi**. Vế giữa sinh ra khi tôi làm mất phiên Claude của user
(thêm Brave ⇒ mọi profile Edge bị dời sang bên, im lặng, giữa một việc khác — đã hoàn nguyên). Nhưng nó
**khoá user vào hãng cũ vĩnh viễn**. Cái sai thật của lượt đầu KHÔNG phải luật, mà là thi hành nó **im lặng**.

🔴 **CHƯA FIX: hai cửa sổ đăng nhập cùng lúc.** Ba hướng trên đều vá lỗi thật nhưng không phải lỗi này;
đo ra `1` cửa sổ mà user vẫn thấy `2` ⇒ phép đo chưa phủ đường user đi (`/connect` của UI, không phải
`scanWeb` gõ tay). Bước kế tiếp + ba nghi vấn chưa loại: `05_TODO §BÀN GIAO 2026-08-28`.

**Bài học đắt nhất của phiên — THƯỚC SAI, không phải THIẾT KẾ SAI (4 lần/ngày):** harness đột biến bắt TAP
trong khi Node in `spec` ⇒ báo 7 đột biến sống sót · so chuỗi tiếng Việt không dấu ⇒ báo mutant sống ·
chuẩn hoá Unicode KHÔNG đưa `ơ`/`ư` về `o`/`u` ⇒ lại báo sống · **đếm TIẾN TRÌNH thay vì CỬA SỔ** ⇒ tuyên
"đúng một cửa sổ" trong khi user thấy hai. Cả bốn đều là *N phép thử cùng hỏng một hướng ⇒ nghi cái thước*
(`02_RULES` luật đo ②) — và cả bốn tôi đều nghi thiết kế trước.

## [2026-08-28d] — Panel Nguồn: MỘT hàng cho một nguồn, tài khoản là dữ liệu thật, không còn hàng ma
> 🔄 **Supersede** bảng "Liên kết" tách rời dưới panel Sources (từ 2026-07-30) và cổng `id="mConn"`.

**User bắt trong một buổi, bảy lần, cùng một họ lỗi:** bề mặt nói khác dữ liệu. Nguồn web hiện HAI lần
(ô tick trên · nút Link dưới) · ✓ xanh cạnh "chưa kéo lần nào" · `tài khoản 2` là thư mục profile RỖNG
chưa từng đăng nhập mà vẫn thành hàng ⚠ vĩnh viễn · `who` ghi TÊN ORG ("Global") thay vì tài khoản ·
badge chữ "chưa có dữ liệu" bên số 0 · mở Edge trên máy mặc định **Brave** · cửa sổ app tự đóng.

**Đổi, theo thứ tự user chốt:** ① trạng thái liên kết = **badge trên CHÍNH hàng nguồn** (`✓`·`⚠`·`•`), chữ vào
tooltip, bấm ra hộp chi tiết; bảng dưới **gỡ hẳn** (local cũng mang badge) · ② **schema v24 `sessions.account`**
— ô tick theo tài khoản mới LỌC được (recall + SQL sync), `scanWeb` đóng dấu khi nạp; tầng tài khoản **chỉ bung
khi ≥2 tài khoản THẬT** (đã đăng nhập được / có dữ liệu), **nhãn = tên tài khoản** (số khe chỉ là fallback) ·
③ Claude lấy **email** từ `/api/account`→`/api/bootstrap`, không có mới rơi về `org: <tên>` và nói rõ · ④ nút
**＋ Thêm nguồn** dưới panel (trả lại đường "thêm tài khoản" bị làm rơi khi gỡ bảng cũ) · ⑤ **Brave** vào bộ dò
(`BraveHTML` ⇒ Brave trước) · ⑥ heartbeat cửa sổ **tách BẬN ≠ CHẾT**: từ chối ×3 ⇒ đóng, hết giờ ×36 (~3′) —
trước đó nghẽn 12,3 s sau khởi động đủ giết cửa sổ của daemon đang sống · ⑦ **v25**: phiên web `account NULL`
⇒ `main` — KHÔNG đoán: `webAuth` cho thấy trước v24 khe duy nhất từng `ok:true` là `main`; kho thật **v25 · 0 NULL**.

**Năm lỗi có sẵn lộ ra:** `connections.ts` **bản sao** `accountsOf` ⇒ vá khe ma không phủ bề mặt user nhìn (gộp
về `webslots.ts`) · `laneKey` gộp "không nêu" với "rỗng" ⇒ hàng cha/con **chung khoá toggle** · `claude-cowork`
thiếu trong `WEB_LABEL` ⇒ tên hiện hai lần · handler `data-addacct` mồ côi mà cổng vẫn xanh (grep chữ) · v24
`ALTER … ADD COLUMN` **không idempotent** — cổng `db-migrate-vecshipped` bắt ngay (neo `=== 23` của nó cũng giòn, nắn `>= 23`).

**Cổng:** `scope-account.test.mjs` 9 ca (**7 đột biến đỏ**) · `scanweb-platforms` +3 ca (Brave · email ·
đảo ca `#mConn` có supersede) · 99/99 vùng đụng. **Nếp vận hành làm rơi:** 3 lần bản vá "chưa hiện" chỉ vì
daemon chạy mã cũ — sửa backend là phải build + bật lại (`zemory-ui-fix-reopen`). Hôm nay bật lại **13 lần**,
mỗi lần cửa sổ chết theo đúng thiết kế — đó là phần lớn của "app tự ẩn".

## [2026-08-28c] — ĐÃ TICK LÀ PHẢI VÀO KHO: nguồn web tự kéo ngầm, hỏng thì BÁO
> 🔄 **Supersede luật *"scheduler nền KHÔNG được tự kéo web"*** (cổng `scanweb-platforms`, lý do
> khi đó: *"10 phút một lần tự mở trình duyệt là sai"*).

**Lý lẽ đảo luật là của BỀ MẶT, không phải của code** (user chốt): panel trái tab *Sync & Backup*
bày `Web chat` thành ô TICK, ngay cạnh khối *"AUTOMATION — what the daemon does when on"*. Đã tick
mà **24 ngày không về** thì bề mặt hứa một đằng làm một nẻo. Nguyên văn: *"mọi source đã check là nó
phải tự động vào kho chạy hết, ko dc thiếu mới đúng"* + *"bất cứ source nào check vào mà nó lỗi ko
kéo dc là phải báo"*. Luật cũ không sai — nó **hết đúng**: cái sai là *cửa sổ nhảy vào mặt người dùng*.

**Đo trước khi xây (điều 15).** Kéo NGẦM có chạy không? `--window-position=-32000,-32000` (Chrome
THẬT, **không** chế độ không-giao-diện — `plan/07 §5` đã đo fetch trần bị chặn 403): liệt kê **914
hội thoại**, `status:done`, 226 s, **0 cửa sổ hiện lên**. Có số rồi mới build.

**Ship:** `webTick` trong scheduler (nhịp 20′, lane khoẻ hỏi lại 3 h, lane HỎNG lùi 6 h — kéo web cần
NGƯỜI đăng nhập nên thử lại dày không bao giờ tự khỏi) · lane **không tick ⇒ không đụng**, lọc TRƯỚC
khi mở trình duyệt · mọi kết cục ghi `webPull` **kể cả hỏng** · cửa sổ ngầm **đóng ở `finally`** (thân
`scanWeb` có 8 đường thoát; rải lệnh đóng vào từng chỗ là rò một Chrome ẩn ở nhánh thứ 9).

**Bề mặt hết nói dối:** cây Nguồn nay mang `web:{state,status,staleDays}` cho lane đã tick — `⚠ mất
phiên — bấm để nối lại` (bấm được, mở đúng cửa sổ đăng nhập) · `chưa kéo lần nào` · `N ngày chưa có
tin mới`. Ba trạng thái cố ý KHÔNG gộp thành một đèn: kéo TỐT mà kho vẫn cũ là chuyện bình thường
(bạn không chat trên nền đó nữa), báo đỏ ở đó là tiếng ồn — mà tiếng ồn làm người ta bỏ qua cảnh báo thật.

**Lỗi kèm:** `accountsOf("claude")` trả **4 khe**, hai cái là **thư mục sao lưu** (`…bak-…`) ⇒ một lượt quét
mở **4 cửa sổ**. ChatGPT thoát chỉ vì bản sao lưu của nó dùng dấu chấm — lỗ do MAY MẮN, không do thiết kế.
**Cổng:** `web-autopull.test.mjs` 6 ca · **5 đột biến đỏ**. ⚠ Bản ĐẦU là **trang trí** (grep chữ trong `.ts`,
đột biến vào `dist` không đỏ nổi ca nào) — phải tách `browserArgs`/`webPullTargets`/`webDue` thành hàm THUẦN
rồi đo kết quả thật; một ca còn tự báo oan vì grep trúng chính chú thích giải thích.

## [2026-08-28b] — NÚT nhường, MÁY xếp hàng: "cứ bấm lại đi" là lời khuyên không dùng được
> 🔄 **Supersede** vế *"the user can simply retry when the spinner clears"* (`syncjob.ts`, viết cùng
> lúc với write-gate). Vế đó chỉ đúng nếu kẻ đang giữ kho chạy vài phút.

**Triệu chứng user báo:** UI *"another background job is writing the memory"*, **5.266 tin chưa đẩy**,
last push **19 giờ trước**. User hỏi có phải kẹt với máy kia.

**KHÔNG phải máy kia** (kênh chung 0 khoá `global_memory.sync.lock`), và cũng **không phải** ca 26/08
(`/sync-status` sạch, không lỗi bị che). Gốc là **bỏ đói**: log đo được lần auto-sync cuối là
27/08 07:11Z, sau đó **19 giờ · 8 lần daemon khởi động lại · 0 lượt sync nào được THỬ**. Mỗi lần
restart lại phóng `embed --all` chạy **30 phút → 3 tiếng**; `syncTick` nhường rồi hẹn lại 3 phút
(cơ chế chống bỏ đói 12/08 vẫn chạy đúng) nhưng **cửa sổ trống không bao giờ xuất hiện** trước lần
restart kế. Nút bấm thì gặp một `return` từ chối cụt.

**Đổi — tách theo NGƯỜI GỌI** (user chốt: *"muốn schedule với cả bấm sync now"*), mở rộng đúng thứ tự
ưu tiên `plan/14 §3` (việc NGƯỜI bấm > việc MÁY tự chạy) từ CPU sang quyền vào kho:
· **nút Đồng bộ ngay** ⇒ `preempt`: bảo chuỗi bảo trì NHƯỜNG (cờ `chainAbort` + giết con), rồi vào.
· **auto-sync của scheduler** ⇒ giữ nguyên xếp hàng, và câu báo đổi từ *"try again"* sang *"queued"*.
· **token do tiến trình KHÁC giữ** ⇒ **KHÔNG giật** — giết việc mình không sở hữu là bất khả đảo.
· `scan` **không bị cắt** (bước duy nhất đưa tin mới vào; cắt nó là đẩy gói THIẾU tin, trái điều 16).
Móc nhường đặt ở `writegate` (đảo phụ thuộc) vì `scheduler → syncjob` đã có ⇒ chiều ngược là import vòng.

**Vì sao cắt embed an toàn — ĐO, không cảm giác:** transaction TỪNG TIN · `embedPending` chọn phần CÒN THIẾU
⇒ mất tối đa một tin · log: **80 lượt embed khởi động / 48 có `finished`** ⇒ 32 lượt đã bị giết bởi restart,
`verifyMemory` chưa lần nào báo hỏng. Chi tiết `plan/14 §3`.
**Cổng:** `sync-preempt.test.mjs` 4 ca, có **ca ÂM** *máy tự chạy KHÔNG được cắt ngang* · **4 đột biến đỏ**.
Chạy thật: embed backlog 457 → bấm → `nhường cho Đồng bộ ngay` → sync `running:true` sau **11 s**.
