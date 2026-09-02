<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

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

## [2026-09-02l] — khe "mất đăng nhập" TREO VĨNH VIỄN dù người đã đăng nhập lại

**User bắt bằng hai ảnh cạnh nhau:** cửa sổ ChatGPT **đăng nhập đầy đủ** (sidebar, Projects, chat
đủ) và hộp zemory báo *"NOT linked — signed out"*. Câu hỏi đúng: *"cái này là bị báo giả à"* —
**đúng, báo giả.**

**Đo ba nguồn cho khe `chatgpt#2`:** `webAuth ok:true` (08:27) · `webPull need-login` (**15:53**, mới
hơn nên nó thắng theo luật bằng-chứng-mới-nhất) · jar trên đĩa `jarHasSession = null` vì **cửa sổ
đang MỞ** (Chromium giữ khoá). 16 phút sau vẫn treo.

🔴 **Cơ chế — vế sai là CHỮ CỦA TÔI sáng cùng ngày.** `[2026-09-02]` vá ① loại khe `need-login` khỏi
vòng tự kéo, lý lẽ ghi *"không bao giờ tự khỏi"*. **Sai đúng ca thường gặp nhất**: người đăng nhập
TAY vào cửa sổ đang mở. Phiên có thật, nhưng ① khe đã ra khỏi vòng kéo ⇒ không ai kiểm lại ·
② `startLoginWatch` chỉ canh **15 phút** và sống trong **RAM daemon** ⇒ hết giờ / daemon restart là
mất người canh. ⇒ bề mặt trưng "mất kết nối" cho khe ĐANG đăng nhập, **mãi mãi** — cùng họ "bề mặt
nói dối" với hai ca vá cùng ngày, **ngược chiều**.

**Vá — một phép ĐỌC FILE, không mở cửa sổ nào:** `needsLoginLane` đọc kho cookie của chính khe đó
(`webLaneSessionOnDisk`): `true` ⇒ phán quyết cũ hết hiệu lực, khe về vòng kéo NGẦM · `false` ⇒ giữ
nguyên · `null` (jar khoá vì cửa sổ đang mở) ⇒ **không đoán**, tự khỏi khi user đóng cửa sổ. Kèm:
khe vừa thoát `need-login` **tới lượt NGAY**, không chờ 6 giờ backoff.

**Cổng:** +2 ca / 10 phép, gồm **5 ca ÂM** (`false`/`null`/ném lỗi/không truyền phép dò đều giữ hành
vi cũ · khe lành không bị chặn oan). **Đột biến 3/3 ĐỎ**: *trả về đúng code cũ* (khe treo lại) · coi
`null` là có-phiên (máy tự mở cửa sổ) · bỏ "tới lượt ngay" (UI còn báo sai tới 6 giờ).

⚠ **CHƯA NGHIỆM THU END-TO-END — đính chính, đừng đọc lẫn.** Khe `chatgpt#2` đã xanh lúc **16:11:45**
(`auth ok` + `pull done`), nhưng đó là **cú Link user bấm** hoàn tất (~2 phút; hai lượt đo của tôi
16:09:51 và 16:10:33 trúng lúc nó đang bay nên vẫn thấy treo) — **KHÔNG phải nhờ bản vá này**, lúc
đó nó còn chưa build. Bản vá phủ ca người dùng **KHÔNG bấm** (hết 15 phút canh / daemon restart), và
ca đó chỉ có **unit test + đột biến**, chưa có lượt tự-khỏi THẬT nào chứng kiến. Ai gặp lại: đóng cửa
sổ khe đó rồi xem nhịp web kế (≤20′) có tự kéo và chuyển xanh không — đó mới là phép đo end-to-end.

## [2026-09-02k] — `isolated_pct` thôi đo SỐ FILE TEST, bắt đầu đo CODE CHẾT (user chốt)

**Vấn đề (đo `[2026-09-02i]`):** cổng đỏ **88/272 = 32,4%** nhưng soi tay đủ 88 file ⇒ **0 code
chết**. Mẫu số bị chi phối bởi **65 file test + 17 script**, nên cổng **đỏ thêm mỗi lần thêm một
test** — phạt đúng việc tốt, và một cổng không bao giờ xanh được thì sớm muộn bị bỏ qua.

**Vá (user chốt):** `isEntryClassFile()` loại lớp ĐIỂM VÀO — thứ theo CẤU TRÚC không thể có cạnh
import (test · script · `hooks/` · `docs_template/` · `*.config.js`); cùng doctrine `noImportLayer`.
Số bị loại được IN RA. **Đo trước rồi mới chọn ngưỡng:** nền mới **1/116 = 0,9%** (đúng
`platform/window.ts` — entry daemon **spawn** bằng đường dẫn, cố ý KHÔNG đặc cách vì loại theo
`platform/` sẽ loại luôn `tray.ts` được import thật; cổng NÊU TÊN để người đọc phán). Trần **30% →
4%** ⇒ đỏ khi có 5 module chết. `graph fitness` nay **PASS**.

🔴 **SÀN ĐẾM — gate bắt lỗi của chính bản vá này:** siết trần làm **ĐỎ OAN** fixture repo-nhỏ của
`graph.test.mjs` (**1/3 = 33%**). Tỉ lệ trên mẫu bé là nhiễu — doctrine đã trả giá ở `plan/17 §1.3b`
(`ABSTAIN_MIN_VECTORS`). `ISOLATED_MIN_COUNT = 3`: đỏ đòi **đủ SỐ ĐẾM VÀ vượt tỉ lệ**. Sàn theo
ĐẾM chứ không theo cỡ repo — sàn-theo-cỡ tha một repo 20 file có 5 module chết (25%).

⚠ **Đánh đổi:** phép đo thôi thấy "test/script không ai gọi". Chấp nhận được (runner quét thư mục;
script frontend đã có `helpers.mjs readAppJs()` canh) — còn module chết thì không cơ chế nào khác bắt.

**Cổng:** `fitness-entry-class.test.mjs` 5 ca (2 ca ÂM · đối chứng cùng số file: 10 test mồ côi 0%
xanh vs 10 module mồ côi 90,9% ĐỎ · ca sàn). **Đột biến 8/8 ĐỎ**, gồm *trả về đúng code cũ* và
*tái hiện fixture đỏ oan*. File test mới khớp regex nặng ⇒ **đo `gate-cage`: 47 MB** rồi khai
`LIGHT_DESPITE_MATCH` kèm số, không đoán.

## [2026-09-02j] — doctor phán "daemon KHÔNG chạy" trong khi nó đang chạy

**Lượt kiểm cuối của audit tự bắt được.** `doctor` in *"daemon KHÔNG chạy ⇒ … Bật `zemory ui`"*
trong khi `/ping` trả `{"app":"zemory","pid":9144}` **ngay trước và ngay sau** lượt đó. Gốc:
`daemonAlive()` dùng trần **600 ms** và gộp MỌI lỗi thành "không sống" — mà `plan/14 §8` đã ĐO
`/ping` lượt lạnh **12.347 ms** (→1.496→131). Nên bất cứ lúc nào doctor chạy sớm sau khởi động
hoặc lúc daemon bận, nó khẳng định sai **và khuyên sai việc** (bật một thứ đang chạy).

**Nghịch lý trong cùng repo — đó là bằng chứng luật đã có, chỉ chưa áp đủ:** `ui.ts probeZemoryUi`
VỐN làm đúng (trần 2.500 ms, **ba** trạng thái, chú thích ghi thẳng *"Timeout ≠ absent"*) — vì ở đó
đoán sai nghĩa là dựng daemon thứ hai và **hỏng kho** (HP điều 11). Cùng một sự thật thì hai bề mặt
phải nói cùng một câu.

**Vá:** `daemonLiveness()` trả **`alive` | `absent` | `unknown`**; chỉ **ECONNREFUSED** (không ai
lắng nghe) mới là `absent`, hết giờ/lỗi khác ⇒ `unknown`. Trần 600 ms → **3.000 ms**. Ba trạng thái
in **ba câu khác nhau**; nhánh `unknown` nói *"KHÔNG TRẢ LỜI trong 3s — có thể đang BẬN, không phải
bằng chứng đã chết"* và **không** khuyên bật lại daemon. Đây đúng đòi hỏi `plan/14 §8` mục ②
(*"`unknown` ≠ `false`"*) mà mục đó tự ghi là còn hở.

**Cổng:** `daemon-liveness.test.mjs` 4 ca (ba trạng thái · trần ≥ 2.500 ms · ba câu phải KHÁC nhau
và câu 'bận' không được khuyên bật lại · `ui.ts` vẫn giữ luật gốc). **Đột biến 3/3 ĐỎ** (*trả về
đúng code cũ*: hết-giờ⇒absent · trần 600 ms · gộp nhánh 'unknown'). Nghiệm thu máy thật: daemon
đang chạy ⇒ doctor nay chỉ in `backup: ✓ bản mới nhất 9.9 giờ tuổi`, hết dòng sai.

## [2026-09-02i] — cache dashboard TỰ SÁT: đóng dấu lúc VÀO nên sinh ra đã quá hạn

**Đo trên kho thật 2.732 MB: `/memory-status` lượt LẠNH 74 giây**, lượt ngay sau vẫn **9,5 s** thay
vì ~40 ms như chú thích trong chính file hứa. Gốc rễ là đúng MỘT chữ: `dashCache = { at: now … }`
với `now` lấy ở ĐẦU hàm, tức mốc **request vào**. Lượt tính lâu hơn `DASH_TTL_MS` (60 s) ⇒ hàng
cache sinh ra **đã quá hạn** ⇒ lượt kế tính lại từ đầu ⇒ toàn bộ chuỗi tối ưu ở `dashboardMemory`
(hai tầng TTL · tách `/sync-pulse` · coverage 38 s → 0,58 s) bị vô hiệu **đúng trên kho lớn — nơi
nó tồn tại để bảo vệ**. `heavyCache` cùng lỗi (TTL 300 s nên chưa lộ).
**Bằng chứng đây là SÓT, không phải chủ ý:** `heavyStatsAsync` đã dùng `Date.now()` lúc hoàn tất từ
trước, ở HAI chỗ; chỉ hai đường đồng bộ còn dùng mốc vào. **Hệ quả thật:** 74 s đó chạy đồng bộ trên
event loop nên `/connections` gọi ngay sau khởi động **timeout hai lần** (45 s rồi 240 s).

⚠ **CHƯA ĐO SẠCH mức cải thiện, nói thẳng thay vì trưng số đẹp.** Sau khi vá: cold 10,2 s · warm
36,2 · warm 3,1 — **nhiễu**, vì `/automation` cho `embedRunning: true` (nhúng nền vừa tranh I/O vừa
tự làm mất hiệu lực cache — 14 chỗ gọi `invalidateDashboard`). Phần **chứng minh được, không phụ
thuộc tải**: mốc-vào khiến cache không thể phục vụ khi thời gian tính vượt TTL (số học), và bản vá
chỉ NỚI hiệu lực cache, không bao giờ thu hẹp. Số end-to-end thật cần đo lúc scheduler im — chưa làm.

**Cổng:** `dash-cache-stamp.test.mjs` 3 ca (số học của luật · cả hai đường dùng `Date.now()` · TTL
vẫn lớn hơn nhịp poll 30 s). **Đột biến 3/3 ĐỎ**, hai cái *trả về đúng code cũ*.

### `graph fitness` đỏ oan: câu nó in ra không phải thứ nó đếm

`isolated_pct = 32,4%` (88/272) đỏ nhiều tuần, không nằm trong CI. Nó đếm **CHỈ lớp `imports`** trong
khi `detail` in *"no intra-project edges"*. Đo: `imports` 445 cạnh ⇒ 88 cô lập; thêm `calls` (4.482)
⇒ còn **6 (2,2%)**. Soi tay đủ 88 file ⇒ **0 code chết** (65 test · 17 script · `platform/window.ts`
daemon **spawn** bằng đường dẫn — xác minh hai đường · 2 hook · 2 template · `eslint.config.js`).
Sửa **câu chữ** cho đúng; cố ý không đếm `calls` vì đó là cạnh SUY LUẬN — để nó bịt miệng tín hiệu
code-chết là trái điều 13. Đổi định nghĩa/ngưỡng ⇒ xem `[2026-09-02k]`.

## [2026-09-02h] — phản biện BÁC đường "dọn sớm bản rỗng"; và vá chỗ `restoreProfile` phá trước khi kiểm

**Cửa phản biện đã ăn tiền.** Lượt audit đề xuất thêm tầng dọn NHANH cho bản dời "rỗng phiên"
(6 giờ thay vì 7 ngày, tính được ~758 MB). Phép phản biện độc lập **BÁC** (`holdsUp: false`), và tôi
tự đọc code xác minh lại thì đúng:

🔴 **Tiền đề chịu lực của nó SAI:** *"bản `session === false` không ai dùng tới"* — có **người đọc
thứ BA** mà nó bỏ sót: `restoreProfile` (`borrowcookies.ts`), gọi từ `/connect` (`ui.ts`), và đường
đó tồn tại ĐÚNG cho bản KHÔNG có phiên nền (mượn là vì khe đã signed-out). Thêm nữa CLI
`memory borrow-cookies --replace` để bản lùi lại trên đĩa làm **đường undo DUY NHẤT**, không bao giờ
gọi `dropBackup`. Hai bản `.bak-<base36>` trên đĩa này (141 MB) đúng hình dạng đó và đều `session=false`
⇒ tầng 6 giờ sẽ **xoá đường undo có tài liệu** trong khi tự khai "không thể mất gì".
🔴 **Và nó mở một đường mất trắng:** bản lùi sống xuyên `await scanWebPlatforms` (mở trình duyệt,
tính bằng giây/phút) trong khi vòng dọn chạy ở **tiến trình khác**; hạ trần xuống 6 giờ là nới cửa
sổ trúng đích **28×**. ⇒ **KHÔNG LÀM. Đừng đề xuất lại khi chưa có dữ kiện mới.**
*(Phần đo của nó vẫn dùng được và đã kiểm chéo bằng driver khác: 17 bản · 3 có phiên · 11 rỗng đọc
được · 3 không jar · 0 null. Riêng "ceiling 14 bản" là SAI — 11 bản, vì 3 bản không-jar chính guard
của nó đã loại và chúng 0 MB.)*

**Vá thật sự đáng làm, lộ ra từ chính phản biện:** `restoreProfile` làm `rmSync(target)` **rồi mới**
`renameSync(backup, target)`, cả hai trong MỘT `try` nuốt lỗi ⇒ bản lùi biến mất vì bất kỳ lý do là
`rmSync` xoá thành công profile sống, `renameSync` ném, `catch` nuốt ⇒ **khe mất trắng, không một
dòng báo** — đúng kiểu hỏng `02_RULES` gọi là tệ nhất (phá rồi im). Nay chốt `existsSync(backup)`
TRƯỚC khi phá; không còn bản lùi ⇒ giữ nguyên hiện trạng.
**Cổng:** +2 ca (bản lùi mất ⇒ đích còn nguyên · bản lùi còn ⇒ lùi đúng như cũ). **Đột biến 1 ĐỎ**
(*trả về đúng thứ tự cũ*). 61/61 ca của ba file liên quan xanh.
