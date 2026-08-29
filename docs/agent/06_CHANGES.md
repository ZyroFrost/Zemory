<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

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

## [2026-08-28] — ba tool ĐIỀU KHIỂN qua MCP: mở cửa cho năng lực đã có, và bốn lần bề mặt tự khai sai về chính nó

**Ship** `memory_jobs` · `memory_scan` · `memory_embed` (bề mặt MCP 14 → **17 tool**), đúng khung user
chốt 27/08: *"mọi chức năng đã có sẵn trên zemory hết rồi, MCP chỉ là điều khiển và quản lý"* — cả ba
chỉ delegate (`scan()` · CLI `memory embed --all` · trạng thái sẵn có), 0 chức năng mới. Đều qua
write-gate: có kẻ ghi ⇒ trả *"busy"* kèm TÊN chủ khoá, không tranh. `memory_embed` phóng job **rời**
rồi trả ngay (~58 tin/phút — không lời gọi MCP nào sống tới đó).

**Nắn chuẩn kèm theo** (`03_STRUCTURE §4`: surface mỏng · `tools/` chỉ khai báo + delegate): dời
`scanWebPlatforms`+`WEB_PLATFORMS`+`platformsInUse`+`accountsOf`+`WebScanRow` từ `ui.ts` → `memory/scanweb.ts`,
và `uiPort`+`DEFAULT_UI_PORT` → `core/config.ts`. Không dời thì tiến trình MCP stdio phải nhập NGUYÊN máy
chủ HTTP (kèm scheduler · tray · autostart) chỉ để đọc một số — nhân cái lệch chuẩn lên thay vì nắn.

**Bốn lần bề mặt TỰ KHAI SAI về chính nó, mỗi lần bắt được bằng ĐO chứ không bằng đọc lại code** (đầy đủ:
`plan/14 §8`): ① `vectorRemaining()` **15,7 s** trên kho thật ⇒ tool không kịp trả trong 6 s trong khi mô tả
ghi *"cheap"*; daemon đã cache đúng số đó (`/memory-status` **107 ms** ấm · 7,4 s lạnh) ⇒ hỏi daemon trước,
`deep:true` mới đếm thẳng, im ⇒ *"not counted"*, **KHÔNG bịa 0**. ② `schedulerChildRunning`/`syncJobRunning`
là biến trong bộ nhớ DAEMON ⇒ tiến trình MCP đọc luôn ra `false` — một bề mặt nói dối dựng sẵn. ③ In
`alive:false` cạnh `daemonJobRunning:true` — **không trả lời ≠ đã chết**. ④ **Thứ tự hỏi LÀ một phần phép đo**:
gọi endpoint nặng trước làm mấy endpoint sau chết đói ⇒ chính phép đo tạo ra thứ nó đo.

**Cổng:** `mcp-control.test.mjs` 8 ca (3 ca ÂM) · **7 đột biến đỏ một-đối-một** · gate **853/853 · 0 fail ·
đỉnh RAM 3.302/4.096 MB · conform ✓**. ⚠ Lượt đột biến ĐẦU báo cả 7 sống sót — sai ở THƯỚC (harness bắt TAP
trong khi Node dùng reporter `spec`); bảy phép thử cùng hỏng một hướng ⇒ nghi thước, không nghi bảy thiết kế
(luật đo ②). Gate còn bắt ba dư chấn của đợt dời code: một import chết và **hai neo test còn trỏ `ui.ts`**.
Chạy thật qua `zemory mcp` stdio: 17 tool, `embedBacklog` 344 (*daemon cache 47s*), khớp `embedRunning:true`.

**Kèm — SỐ cho lỗ `/ping` nghẽn sau khởi động** (`[2026-08-27b] §Còn hở` ghi "~4 phút", chưa có số): đo ngay
sau khi bật lại daemon — **12.347 → 1.496 → 131 ms**. Cơ chế vẫn CHƯA chốt; đây là số, không phải bản vá.

## [2026-08-27b] — audit 11 mặt: con maintain hết chạy mù · vector nhúng-sau và tin không-uuid có chuyến chở · bản trùng NULL bị khử

**Audit đầy đủ** (gate 835/835 · conform ✓ · quick_check ok · drill phục hồi 6′32″ 315.103 tin) lộ ba lỗ
blocking, đều thuộc họ *bề mặt nền câm* hoặc *HP điều 16*; vá trong cùng phiên, mỗi vá có đột biến đỏ.

**① Con maintain chạy mù.** `scheduler.ts` phóng scan/embed/digest với `stdio:"ignore"` — con `embed --all` 20 phút,
730 s CPU, 0 hàng, không phân biệt được "chậm" với "kẹt". Nay hút hai ống, giữ đuôi 8 KB, thoát lỗi ghi stderr,
dòng `finished` kèm tiến độ cuối (`+500 embedded · remaining 1127`). 4 đột biến đỏ.
**② Kênh chung thiếu 16.405 vector máy này ĐANG CÓ** (diễn tập dựng lại; 300/300 mẫu có vector tại chỗ). Hai gốc:
`vectorCatchUp` lọc `uuid IS NOT NULL` ⇒ 10.271 tin không-uuid không bao giờ được bù dù `vector_ship` có khoá dự
phòng; vector nhúng SAU khi tin đã lên kênh không còn chuyến chở (6.121, dồn 25–27/08). Vá: khoá bền `messageKey`
hai truy vấn; **schema v23 `vec_shipped`** gieo bằng vector đang có, mỗi delta chở kèm vector chưa ghi sổ, lượt
0-tin vẫn đi. 6 đột biến đỏ. Kho thật: catch-up +10.973 vector, dry-run sau đó **thiếu 0**.
**③ Bản trùng NULL trên kênh.** Dựng lại ra 21.502 hàng / 11.231 khoá — `UNIQUE` không khử NULL, merge chỉ khử so
với hàng đã có ⇒ baseline DESKTOP chở 10.271 bản trùng, thước bù nối 49 MB vô ích mỗi lượt. Vá: merge giữ
`MIN(rowid)` trong gói; 2 test, đột biến đỏ cả hai. Lớp "đếm thiếu theo khoá" **gỡ** — đột biến sống sót.
**Gate nhường máy** (user chốt: trần 4 GB cả cây · ưu tiên thấp · chậm cũng được). Gate từng tràn 16 GB làm chết
phiên hai lần. Đo bằng Job Object: RAM tích luỹ QUA CÁC CA trong một tiến trình — `vectors.test` cả file **>12 GB**
(q8 vẫn vượt; tắt arena ONNX còn tệ hơn), ca nặng nhất chạy riêng **3,3 GB**; 5 file graph nạp grammar tree-sitter
1,3–2,9 GB/file. Nay `npm test` → `gate.mjs` → lồng Job Object 4 GB + `BelowNormal` (`gate-cage.ps1`) →
`run-tests.mjs`: nhóm nhẹ 2 worker, **12 file nặng chạy từng ca một tiến trình** (`test-groups.mjs` khai danh
sách + miễn-kèm-số-đo; cổng `test-partition` canh ba chiều). `preflight` chặn cả khi daemon sống.
Nghiệm thu cuối trong lồng: **845/845 · đỉnh cả cây 3.306 MB / 4.096 · 6 phút** (gate cũ 42 phút — phần chậm là
paging). Ca sát mép duy nhất (`vector-write-atomic`, 4.088 MB) hạ fixture 2→1 tin dài ⇒ 3.033 MB.
**Kèm:** 4 entry vượt trần cắt về ≤25 · `write-docx §10` thêm đường đo trang WPS COM, áp 15 repo.
**Còn hở:** `/nav-cost` 0 FE gọi · daemon nghẽn `/ping` ~4 phút sau khởi động (chưa chốt cơ chế) · DESKTOP
cần lên 2.7.x và dọn 10.271 bản trùng · guard lớp ① báo oan token `"data"` trong `.on("data")`.

## [2026-08-27] — Cowork ĐỌC ĐƯỢC kho chung qua MCP: một đường dẫn sai đẻ ra một kiến trúc thừa
> 🔄 **Supersede** vế *"Cowork KHÔNG dùng được MCP: nó chạy trong máy ảo riêng, không với tới
> `zemory` trên máy thật"* — in ở `setup mcp`, và là tiền đề của cả bộ `docs_template/cowork_global_memory/`.

**Gốc: bản MSIX chuyển hướng AppData.** Desktop cài từ Microsoft Store ghi vào
`%LOCALAPPDATA%\Packages\Claude_*\LocalCache\Roaming\` ⇒ `setup mcp` dò `%APPDATA%` thấy trống,
báo *"chưa cài"* trên chính máy đang chạy Desktop — và từ đó đẻ ra một bộ template riêng cho máy ảo.

**Nghiệm thu trong phiên Cowork THẬT** bằng con số **đang trôi**: máy thật 30 phút trước **303.434** tin ·
Cowork báo **303.977** · đo lại ngay sau **303.977** ⇒ đọc kho sống, cùng file. Cowork liệt kê đủ
`mcp__zemory__memory_*`, `dbPath` đúng kho chung.

**Đổi ở code:** `mcpsetup.ts` dò MSIX bằng glob tiền tố `Claude_` (không ghim PFN), ưu tiên trước
`%APPDATA%` · `harness.ts` thay dòng khẳng định sai · `cowork_global_memory/BOOTSTRAP.md` nắn bốn lỗ
(§0 tự cài Node/git · §4 hỏi nguồn + `scan-web` · §4b `embed` BẮT BUỘC · **§5b nối MCP + nghiệm thu**).
Phạm vi đích: **máy thật của người KHÔNG rành kỹ thuật, agent tự làm hết** — MCP là bước CUỐI của bootstrap.

**Cổng:** `mcp-msix.test.mjs` 5 ca trên HOME giả · 2 đột biến đỏ đúng chỗ · template 41/41.
**Còn hở:** chỉ đo Windows + một bản MSIX · chưa đo Cowork GHI · bootstrap chưa chạy trên máy trắng thật.
Thiết kế đầy đủ: `plan/20`.

## [2026-08-26b] — sync chịu được cú CHẬP của ổ đám mây: ngoại lệ KHÔNG phải trọng tài
**Triệu chứng.** UI báo `another background job is writing` (write-gate đúng) che lỗi thật ở
`/sync-status`: `UNKNOWN: unknown error, write`. Watermark đứng **20 giờ** (5.793.032) trong khi 7.268 tin chờ.

**Chẩn đoán bằng trạng thái ĐĨA:** khối #39 **có mặt đủ** trên kênh (41 khối, 0 byte rác) nhưng không
được đánh dấu merged ⇒ chết giữa `appendChunk` và `writeExportWatermark`; các lượt sau nối khối
**TRÙNG** (#37≡#39 · #30≡#31, tổng 30,4 MB). `UNKNOWN` = mã libuv khi Google Drive File Stream trả
lỗi không map nổi; đọc tuần tự 1.832 MB **42,9 s · 0 lỗi** ⇒ kênh **CHẬP**, không hỏng.

**Ba lớp vá** (5 luật ở `plan/08 §8d`): quan sát — giữ đuôi stderr của con sync, log phân biệt thành/bại ·
chiều GHI — **số khối đếm được phán**, retry 3 lần có cắt về chiều dài cũ, watermark nhích NGAY khi
khối chứng minh có mặt · chiều ĐỌC — `withDriveRetry` bọc `extractChunk`.

**Cổng:** 14 ca mới · **9 đột biến** đỏ một-đối-một · gate **830/830**. Cổng bắt ba lỗi trong chính
bản vá (lần thử cuối không cắt · `throw` thiếu `cause` · dòng `[sync]` đáng giữ bị vứt ở lượt thành công).

**Trả nợ vector kênh chung:** đẩy **2.790 vector / 12,5 MB**; 41→42 khối, khối mới bắt đầu đúng tại
EOF cũ ⇒ 0 byte cũ bị ghi đè; dry-run lại `thiếu 0`. Khối trùng 30,4 MB để yên — gộp ở ngưỡng 48 tự cuốn.

## [2026-08-26] — guard: khớp TOKEN ở VỊ TRÍ LỆNH · soi GHI/DỜI qua lệnh · nói đúng về flag
Ba lỗ do repo phòng ban báo về, vá ở **máy sinh** `guard-gen.ts` rồi sinh lại cả hai bản
(`docs/hooks/` + `docs_template/cowork/nonapp/hooks/`). Luật đầy đủ: `02_RULES §Guardrail lớp ①`.

**(b) BÁO OAN — tên lệnh trong VĂN BẢN bị chặn** (dính 3 lần/phiên: `echo "=== git remote (chua push) ==="`).
Nay khớp **token ở vị trí lệnh**; ngoại lệ bắt buộc: interpreter (`bash -c` · `node -e` · `python -c`)
thì soi cả câu — thiếu vế này là mở toang `bash -c "git push"`.

**(a) LỌT — ghi vào protected bằng shell/script.** Đo trên policy thật `PBI_OPS`: `echo >>` ·
`python -c open().write()` · ghi ra NGOÀI repo · `mv` — **lọt hết** bản cũ, **chặn hết** bản mới
(soi chuyển hướng · `mv/cp/Move-Item` · payload interpreter có đường protected VÀ động từ ghi).

**`mv` ra khỏi protected = xoá** ⇒ chặn cả nguồn lẫn đích trong protected. Giới hạn ghi thẳng vào
comment: chỉ thấy ĐƯỜNG DẪN VIẾT THẲNG; đường dựng lúc chạy thì không — muốn chặn thật phải ở tầng OS.

**Câu mô tả flag SAI, sửa 6 chỗ:** flag bị **đóng dấu** `ZEMORY-USED`, giữ 90 s cho đúng lệnh thử lại,
xin việc khác hoặc quá hạn thì thu hồi — không phải "tự xoá".

**Cổng:** `guard-tool-matrix` +3 ca (có ca ÂM) · 3 đột biến đỏ · gate **816/816**.

**Lan 9 repo `PBI_*`** lộ thêm lỗ zemory không dính: đường protected là **TÊN TRẦN ở gốc** (`.vault` ·
`attic`) lọt vì nhánh interpreter chỉ soi token có `/` ⇒ 7/9 repo thủng. Vá: bỏ điều kiện `/`, để
`underProtected` quyết. Áp lại **9/9 · 8/8 ca**, guard 491 dòng khớp từng byte. Không commit ở repo nào ngoài zemory.
Bốn lần tự sai trong lượt (probe dựng ca từ policy sai repo · cắt segment tại `|` · probe chạy sai cwd ·
manifest đếm dòng guard lỗi thời) — mẫu số chung: **luật đo ① — sao chép tham số của thước thật**.

## [2026-08-25d] — HÀNG ĐỢI ghi kho chung: đợi tới lượt, có nhịp tim, kiểm hai đầu
> 🔄 **Supersede** vế *"Tranh chấp thì BÁO, không cố chống"* (`plan/08 §8`, agent viết 2026-08-12).
> User bác: *"t nói là 1 file duy nhất, 2 máy cùng ghi vào — chứ KHÔNG hề nói là 2 cái ghi sai nhau"*.

**Sự cố:** lượt merge đọc kênh ở **0,55 MB/s** giữ khoá **~1 giờ** > ngưỡng mồ côi 15 phút ⇒ máy kia
**hợp lệ** nối khối giữa lúc máy này đang đọc ⇒ `UNKNOWN: unknown error, read`, hỏng cả sync lẫn bù vector.

**Bốn thứ đổi** (spec: `plan/08 §8c`): **hàng đợi thật** — khoá còn sống thì ĐỢI (nới dần, trần 30 s/nhịp) ·
**nhịp tim** — chủ khoá chạm lại mỗi 30 s, lỡ 3 nhịp mới coi là chết · **tương thích ngược** — khoá bản
cũ không có `beat` đọc bằng ngưỡng 15 phút · **kiểm hai đầu quanh lúc nối** — số khối đổi so với lúc
liệt kê ⇒ DỪNG; nối xong đếm lại, lệch ⇒ báo lỗi rõ.

**Kèm — vùng tới hạn tối thiểu:** merge chạy NGOÀI khoá. Lộ chi phí ẩn: `mergeContainer` giải nén MỌI khối
ra file tạm rồi mới hỏi "đã merge chưa" ⇒ **2,4 GB đọc / ~1 giờ** để kết luận không có gì mới. Nay chữ ký
khối đọc **tại chỗ** (header plaintext) ⇒ khối đã biết bỏ qua gần miễn phí.

**Cổng:** `drive-single-file.test.mjs` — ca ÂM *khoá còn sống KHÔNG được cướp* + *khoá chết thật thì vào
được* + *không có gì mới thì không chép lại container* (cờ `cheap`) + *đoạn GHI vẫn phải có khoá*; 3 đột biến.
Bản đầu của cổng "cửa chặn rẻ" là TRANG TRÍ — lộ khi chạy đột biến; ca chờ gắn `timeout: 60s` vì hỏng theo
chiều "không bao giờ coi là chết" thì test TREO chứ không đỏ.

**Chưa đo:** *Drive đẻ conflicted copy* và *nối lên bản cũ làm mất khối* — nêu theo cách Drive hoạt động,
chưa dựng phép thử hai máy thật; code chỉ nhìn `global_memory.enc`, file trùng tên khác nằm chết không ai báo.

