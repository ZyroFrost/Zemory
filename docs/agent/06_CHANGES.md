<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

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

## [2026-09-02g] — vòng dọn sắp xoá ĐÚNG phiên đăng nhập cuối cùng: chặn lại trước 40 giờ

**Audit tìm ra một mất dữ liệu CÓ HẸN GIỜ.** Vòng thu hồi profile (`[2026-08-31d]`) quyết định bằng
TUỔI, mà tuổi là proxy tệ cho GIÁ TRỊ: cùng 122 MB, một bản giữ phiên đăng nhập cuối cùng của một
khe, một bản rỗng ruột. Đo trên đĩa thật (17 bản app tạo · 1.488 MB):

| bản | phiên | khe SỐNG | luật cũ |
|---|---|---|---|
| `chatgpt.msedge-bak-1787976590023` | **có** | **không** (khe signed-out) | xoá sau ~40 h |
| `claude-3.msedge-bak-1787905538196` | **có** | **khe không còn tồn tại** | xoá sau ~44 h |
| `claude.msedge-bak-1787906707220` (505 MB) | có | **có** (vừa hồi) | xoá — ĐÚNG, bản dư |

Hai bản đầu là đường về DUY NHẤT của khe đó; mất là phải đăng nhập tay — vòng dọn rác thành vòng
mất dữ liệu, đúng thứ `[2026-08-31d]` đã rút thành luật rồi vẫn tái diễn theo trục khác.

**Vá — chính sách ④ "đường về cuối cùng thì không xoá, bất kể tuổi":** bản CÓ phiên
(`jarHasSession === true`) mà khe sống KHÔNG chứng minh được là đang có phiên ⇒ **giữ**. Hướng an
toàn MỘT CHIỀU: chỉ giữ thêm, không bao giờ xoá thêm ⇒ tự nó không thể đẻ mất mát. Khe live đăng
nhập lại ⇒ bản cũ thành dư ⇒ hết bảo vệ, rơi về cửa sổ 7 ngày. Nghiêm `=== true` ở vế bản dời (để
bề mặt dựng entry tay không bật bảo vệ tràn lan), LỎNG `!== true` ở vế khe sống. `slotOfSetAside`
trả `null` cho dạng mất-dấu-chấm đời cũ thay vì đoán; `sweepBrowserProfiles` **đếm ra** số bản được
giữ (`protected`). Kèm sửa dòng help `status.ts` nói sai (*"không dòng code nào lấy lại bản dời"* —
sai từ khi `restoreShelvedSession` ship cùng ngày).

**Cổng:** `reclaim-sweep.test.mjs` 5 → 10 ca, gồm **7 ca ÂM** (khe sống miễn nhiễm mọi ngưỡng ·
`null`/`undefined` không được coi là có phiên · khe live đã có phiên thì bản cũ hết bảo vệ · parse
khe trả null thay vì đoán) + 1 ca ĐĨA THẬT với jar SQLite thật ở ngưỡng 0. **Đột biến: 4 ĐỎ**
(gồm *trả về đúng code cũ*) **+ 1 XANH có chủ đích** (đổi thứ tự hai phép tương đương nghĩa — ghi
ra để không ai tưởng cổng canh cú pháp). Nghiệm thu đĩa thật: đúng **2** bản được bảo vệ, `claude`
505 MB không được bảo vệ (đúng ý), `would reclaim NOW = 0`.

## [2026-09-02f] — audit bắt được 3 lỗi do CHÍNH bản vá SSO đẻ ra, + 1 bug chữ lòi ra màn hình

**Lượt audit gọi `/connections` THẬT sau khi ship `[2026-09-02d]` và thấy khe chatgpt lại hiện
`borrow: chrome/1`** — đúng hình dạng bug vừa sửa. Đo jar mới phân định được: KHÔNG phải hồi quy —
`chrome` có `googleSession=1` nên qualify bằng nhánh SSO đúng thiết kế. Nhưng nó phơi ba lỗi thật:

🔴 **① THỨ TỰ SAI (nặng nhất).** Vòng quét trả về nguồn qualify ĐẦU TIÊN, mà thứ tự cứng là
chrome→edge→brave ⇒ `chrome` (0 phiên ChatGPT, chỉ có phiên Google) **thắng** `brave` đang giữ phiên
nền thật. Bề mặt mời đường YẾU HƠN (còn phải bấm qua trang OAuth) và giấu đường mạnh. Vá: hai hạng —
gặp phiên NỀN trả NGAY, nguồn SSO chỉ được nhớ làm ĐƯỜNG LÙI; `BorrowSource` mang thêm `via:
"platform"|"sso"` để nơi gọi phân biệt được, thay vì đoán từ con số `cookies`.

🔴 **② Câu "đóng Brave" bị CHE.** `borrowBlocked` chỉ đặt khi `!findBorrowSource(...)`; chrome qualify
nên hint biến mất — tức mất luôn chỉ dẫn tới đường đăng nhập THẲNG. Nay chỉ `via === "platform"` mới
được che nó. Kèm dọn: một hàng gọi `findBorrowSource` **một** lần thay vì hai (hai lời gọi có thể
trả khác nhau nếu trình duyệt đóng/mở giữa chừng ⇒ một hàng tự mâu thuẫn).

🔴 **③ BUG CHỮ, người dùng đang đọc thấy:** `conn.borrowBlocked` có `{b}` **hai** lần nhưng FE dùng
`.replace('{b}', …)` — JS chỉ thay lần ĐẦU ⇒ trên màn hình lòi nguyên chữ *"Đóng {b} rồi mở lại"*.
Vá bằng `/\{b\}/g`. Thêm khoá `conn.borrowSsoOnly` (đủ HAI dict) vì khi vừa có nút Mượn vừa có hint
thì câu cũ ("không mượn được vì bị khoá") tự mâu thuẫn với chính cái nút.

⚠ **Một chẩn đoán của tôi bị BÁC khi đo lại, ghi vì nó là bẫy quen:** tôi báo "UI hiện *Mượn (0
cookie)* vô nghĩa" — **SAI**, đọc `sources.js` thì FE dùng `canBorrow` thuần như boolean, con số
KHÔNG bao giờ ra màn hình. Tôi suy từ payload API chứ chưa đọc bề mặt.

**Cổng:** +3 ca (phiên nền thắng SSO dù SSO đứng trước · chỉ `platform` được che hint + một-lời-gọi ·
chữ: thay hết `{b}`, có câu riêng, đủ hai dict). **Đột biến 4/4 ĐỎ**, gồm *trả về đúng code cũ* và
*tái hiện bug placeholder*. Nghiệm thu máy thật: khe chatgpt nay mang ĐỒNG THỜI `canBorrow via=sso`
+ `borrowBlocked: Brave`, daemon báo đúng `2.13.0` (bản chạy trước đó còn compile-in `2.12.1`).

## [2026-09-02e] — cửa sổ đăng nhập mở ĐỦ RỘNG (1200×900), hết bé xíu

User chụp: cửa sổ login zemory mở ra **bé xíu**, không thấy trọn form. Gốc: lượt HIỆN của
`browserArgs` không có tham số kích thước nào ⇒ Chromium mở theo mặc định/nhớ cũ, mà profile mới
tinh thì không có gì để nhớ. Vá: lượt hiện ép `--window-size=1200,900 --window-position=120,80`
(đủ cho account chooser của Google); lượt NGẦM giữ nguyên `1,1` + đẩy khuất. Cổng: +3 phép trong
ca `browserArgs` sẵn có (hiện đủ rộng · không dính 1×1 · ngầm không mở to) — đo thẳng mảng tham số,
không cần login sống.

## [2026-09-02d] — Mượn chở CẢ phiên SSO ⇒ trang login hiện sẵn tài khoản, hết form trắng

**User chốt (AskUserQuestion, sau khi nghe rõ đánh đổi):** *"phải nó có cookie hiện lên web khi
đăng nhập"* → chọn **"Có — chép cả phiên SSO"**. Trang Google trắng bạn chụp là vì profile khe
**sạch, không có cookie đăng nhập Google** ⇒ Google không biết ai ⇒ form trống. Trước bản này Mượn
CỐ Ý cắt sạch mọi host trừ nền (header file: *"borrows ONE site's cookies, not the jar"*), nên kể
cả mượn được cũng không có gì để Google nhận ra người dùng.

**Vá — mở rộng Mượn có kiểm soát:** thêm `AUTH_HOSTS` (accounts.google.com · google.com ·
login.microsoftonline.com · login.live.com · appleid.apple.com). Prune giờ giữ **nền + các nhà
cung cấp SSO**, vẫn cắt sạch bank/mail/nền khác (KHÔNG phải cả jar). Và `findBorrowSource` +
`borrowCookies` nay mượn được cả khi **nền hết phiên nhưng CÒN đăng nhập Google/Microsoft**
(`hasAuthSession`: `__Secure-1PSID`/`ESTSAUTHPERSISTENT`) ⇒ OAuth hiện account chooser, một cú bấm
thay vì gõ email.

🔴 **Đánh đổi user đã nhận rõ khi chốt (ghi để minh bạch, đảo header rule cũ):** phiên SSO — chìa
của cả Gmail/Drive — nay nằm trong profile local của zemory (`data/browser/`, gitignored, mã hoá
per-máy theo App-Bound Encryption). Rủi ro gia tăng THẤP vì profile Brave thật của user vốn đã giữ
chính phiên đó trên CÙNG đĩa gitignored; đây là chép cùng-hãng cùng-máy, không rời máy (HP điều 7:
không transmit; điều 14: bí mật trong cây repo, cấm git/cloud/VM).

⚠ **Giới hạn cứng KHÔNG vá được, nói thẳng:** vẫn phải **đóng Brave ~20 giây MỘT lần** để lấy —
Chromium khoá độc quyền kho cookie khi đang chạy (đo: EBUSY) + App-Bound Encryption từ v127; không
tool nào ở quyền user đọc được cookie sống của trình duyệt đang mở. "Hiện tài khoản khi Brave vẫn
mở" cho login MỚI là bất khả ở mức user; 3/4 khe tự hồi được (`[2026-09-02c]`) là nhờ file profile
đã dời sang bên, không phải đọc kho sống.

**Cổng:** ca cũ "chỉ chở ĐÚNG nền" đổi thành "chở nền + SSO, vứt bank/nền khác" (kept 3 · dropped 2);
+1 ca SSO-only (nền hết phiên + còn Google ⇒ mượn được + cookie Google theo về · cả hai rác ⇒ vẫn
từ chối). **Đột biến 3/3 ĐỎ** (prune bỏ AUTH_HOSTS · findBorrowSource bỏ nhánh SSO · borrow bỏ điều
kiện authSess).

## [2026-09-02c] — profile bền như app chuẩn: đổi hãng khứ hồi TỰ TRẢ PHIÊN, hết đăng nhập lại

**User đòi đúng chuẩn ngành:** *"phải mở lên nhận được dù có đang mở brave… thiết kế web và app cơ
bản người ta vẫn làm được mà"*. Đúng: app giữ phiên chuẩn (Electron/Playwright) đăng nhập MỘT lần
rồi không bao giờ vứt profile của chính nó. zemory đang vứt: luật "máy mặc định THẮNG" (28/08) dời
profile sang bên mỗi khi Windows đổi trình duyệt mặc định mà KHÔNG có đường ngược — đúng lỗ
`[2026-08-31d]` đã ghi (*"không dòng code nào lấy lại bản -bak-"*). Đo 01–02/09: mặc định nhảy
**Brave→Edge→Brave trong một ngày** (lúc đo: `BraveHTML`) ⇒ 4 khe mất phiên dù mọi bản dời còn
nguyên trên đĩa. Hai màn Google trắng user chụp là hệ quả: profile mới tinh thì Google không biết ai.

**Vá — `restoreShelvedSession` (scanweb, chạy trước mỗi spawn):** profile sống KHÔNG có phiên
(`jarHasSession === false`) ⇒ trả bản `-bak-` MỚI NHẤT **cùng hãng** và **có phiên** về làm profile
sống; vỏ sống cũ dời sang bên, không xoá gì. `null` (jar bị cửa sổ đang mở khoá) = không đụng.
Fail-open toàn phần. Luật "mặc định thắng" GIỮ NGUYÊN — đây là đối xứng còn thiếu của nó, không
phải đảo nó; ranh cùng-hãng là ABE (cookie hãng khác không giải mã được, trả về chỉ đổi vỏ lấy vỏ).

**Vì sao không đi đường khác (trả lời "dò app lớn"):** OAuth-handoff kiểu VS Code/GitHub Desktop
mượn được trình duyệt thật vì họ chỉ cần token — ChatGPT/Claude không có API lịch sử chat nên
zemory cần PHIÊN trong profile điều khiển được; còn đọc jar lúc Brave đang chạy là bất khả ở mức
user (khoá độc quyền + ABE — cả họ tool cookies-from-browser cùng kẹt từ Chrome 127).

**Đo trên đĩa thật trước khi ship:** 3/4 khe có brave-bak còn phiên (`chatgpt-2` · `claude` ·
`claude-2` — dời đi 01/09 23:01) ⇒ tự hồi; `chatgpt` main chỉ còn phiên trong msedge-bak (khoá
Edge) ⇒ đăng nhập tay MỘT lần cuối. **Cổng:** +3 ca hành vi (bak cùng hãng mới nhất CÓ phiên thắng
vỏ rỗng mới hơn · ba ca âm: có phiên không đụng / khác hãng không trả / không bak không ném · nối
đủ HAI đường spawn). **Đột biến 3/3 ĐỎ** (bỏ chốt phiên-sống · trả vỏ rỗng · phá lọc cùng-hãng).

## [2026-09-02b] — mượn cookie: "CÓ COOKIE" ≠ "CÓ PHIÊN" — thôi mời mượn jar rác

**User bắt bằng ảnh:** bấm đăng nhập lại mà Google hiện form TRẮNG — *"vào đăng nhập t bấm vào nó
phải hiện cái tk cũ ở đây chứ, ko phải nhập lại"*. Đo `/connections`: khe chatgpt đang mời **Mượn
từ Chrome với ĐÚNG 1 cookie** trong khi phiên thật nằm ở **Brave đang khoá** — và hàng chatgpt
không nói điều đó, vì `findBorrowSource` nhận mọi jar có `n > 0`. Một cookie lạc không phải phiên:
mượn về là một profile CHƯA đăng nhập ⇒ ChatGPT đá sang Google OAuth trên profile mới tinh ⇒ form trắng.

**Vá:** nguồn chỉ được MỜI khi jar có cookie PHIÊN — soi TÊN (`__Secure-next-auth.session-token%`
phủ cả bản chunked `.0`/`.1` · claude `sessionKey`), **không bao giờ đọc giá trị** (giữ ranh giới
gốc của tính năng). `borrowCookies` cũng TỪ CHỐI nguồn không phiên kèm câu lỗi nói thẳng ("has N
cookie(s) but no live session"). Nền thiếu tên trong bảng ⇒ bỏ soi (fail-open, điều 9 — nền đổi
tên cookie không được phép giết cả tính năng trong im lặng). Hệ quả bề mặt, 0 dòng UI mới: khe
chatgpt thôi mời Chrome-rác, `findBorrowSource` trả null nên rơi đúng nhánh `borrowBlocked: Brave`
sẵn có — câu đúng việc: *đóng Brave rồi Mượn*.

**Ranh giới nói rõ để khỏi ai "sửa tiếp":** KHÔNG chép cookie `accounts.google.com` cho Google
hiện account chooser — đó là chìa SSO cả đời số của người dùng, header file cấm đúng ca này
("borrows ONE site's cookies, not the jar"). Mượn ĐÚNG phiên nền thì chatgpt.com mở ra là đã
đăng nhập, không bao giờ chạm tới form Google.

**Cổng:** +3 ca **HÀNH VI** (jar SQLite giả trên đĩa thật qua seam `sources`, hết soi chữ): nguồn
rác bị nhảy qua và không được mời một mình · token chunked + `sessionKey` nhận đúng · borrow từ
chối nguồn không phiên + prune đúng host (giữ 2, vứt 1 site lạ). **Đột biến 2/2 ĐỎ**, gồm *trả về
đúng code cũ* (`if (n > 0)`).
