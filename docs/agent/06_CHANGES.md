<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

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

## [2026-09-02] — cảnh báo context HẾT BỎ SÓT 7/8, và context lên được BỀ MẶT

**User báo *"t ko thấy nó cảnh báo, hiếm lắm hầu như ko"*. Đo ra là BUG THẬT, không phải ngưỡng.**
Trên 40 phiên thật của máy: **8 phiên vượt ngưỡng 90%, chỉ 1 có cờ `.warned` — bỏ sót 7**. Loại trừ
được lời giải thích dễ dãi ("cờ bị xoá khi nén"): **không phiên nào từng bị nén**, và cả 7 đều CÓ cờ
`.harness` ⇒ hook chạy bình thường. Tỉ lệ cờ tự nói: **46 `.harness` / 11 `.warned`**.

**Gốc rễ:** phép kiểm context CHỈ nằm ở nhánh `prompt` (`UserPromptSubmit`) — mà context phình
**TRONG lượt của assistant** (tool call, đọc file), không phải lúc người ta gõ. Hệ quả cơ học: phiên
chạm ngưỡng rồi KẾT THÚC mà user không gõ thêm ⇒ **không bao giờ báo**. Nhánh `stop` (bắn sau MỖI
lượt, tức chỗ duy nhất bắt được lúc vượt) trước bản này **không đo gì cả**.

**Vá — và ràng buộc phải tôn trọng.** Dòng đầu `capture-hook.ts` khoá `Stop` là hook **write-only,
0 token, no context change** (HP điều 10), nên KHÔNG được bê đoạn cảnh báo sang đó. Cách vá:
`stop` **ĐO + ghi sổ bền** `<sid>.ctx.json` (percent · tokens · window · threshold · over · at) và
**chốt sổ ngay** khi vượt ngưỡng — vẫn trả chuỗi RỖNG. Phần chữ giữ nguyên ở `prompt` (đã đúng, tự
gọi `readContextUsage` mỗi lượt — **không sửa gì**, không đẻ việc). Ca "đầy rồi tắt máy" do BỀ MẶT
phủ: hook không có đường nào tới người dùng trong ca đó.

**Badge context lên màn Sessions (user chỉ đúng hai chỗ đặt).** Endpoint `/session-context` (lô ≤300
id) + badge ở hàng list và trên dòng meta panel chi tiết. Điền ở **lượt thứ hai**, không chặn render:
đo được **141 ms/80 phiên** (ước tính token, có index `idx_messages_session`) + **~11,5 ms/phiên**
cho phần đọc đuôi transcript ⇒ ~1,4 s cho một trang; bắt người dùng chờ vì một con số phụ là sai
đánh đổi. Phân biệt **`●` phiên đang chạy** ("đang là bấy nhiêu") vs **`◐` đã đóng** ("kết thúc ở mức
đó") — hai thứ khác nghĩa. Màu lấy **đúng ngưỡng user đặt**, không đẻ ngưỡng thứ hai.

**CỘNG DỒN KHI CÓ NÉN — user chốt, và số đo cho thấy sai lệch một BẬC ĐỘ LỚN.** Nguyên văn:
*"phải tính cộng dồn nếu có lần nào nó chạy compact, vì compact là nó nén 1 lần rồi sẽ ko chính xác
nữa"*. Đúng: `readContextUsage` trả mức HIỆN TẠI, mà nén xong context tụt về ~30% rồi đầy lại. Đo
trên transcript thật:

| Phiên | Nén | % hiện tại | **Tổng đã tiêu** |
|---|---|---|---|
| `95074025` | **3 lần** | 50,8% | **3.516.281** |
| `56efaed7` | 2 lần | 92,5% | **2.930.289** |

Badge cũ nói "50,8%" cho một phiên đã tiêu **3,5 triệu** token.

**Cách hiển thị — user sửa hai lần, bản cuối là ý user và nó tốt hơn bản tôi đề xuất.** Tôi làm bản
đầu là *thay* `%` bằng số tổng (`◐ 3,516,281 ⟳3`); user hỏi ngay *"sao có cái hiện số ko phải %"* —
đúng, cả cột là `%` mà chen một số 7 chữ số vào giữa thì mất khả năng so sánh bằng mắt. Tôi đề xuất
`36% ⟳1` (giữ % chu kỳ). User sửa tiếp, và đây là ý hay hơn cả hai: *"kiểu là vượt 100% chính xác bao
nhiêu để biết là nén"* ⇒ **badge hiện % CỘNG DỒN trên cửa sổ**:

| Phiên | Badge | Chu kỳ hiện tại |
|---|---|---|
| `95074025` (nén 3) | **352% ⟳3** | 50,8% |
| `56efaed7` (nén 2) | **293% ⟳2** | 92,5% |
| `Dept_OPS` (nén 1) | **136% ⟳1** | 36,4% |
| chưa nén | **97%** | 96,5% |

MỘT con số, cả cột so sánh được, và nó **tự nói**: vượt 100% nghĩa là đã nén. Phiên chưa nén thì
`totalTokens === tokens` nên badge **không đổi gì** — đó là ca phổ biến (đo 40 phiên, **chỉ 2** từng nén).
🔴 **MÀU: vượt 100% LUÔN ĐỎ** (user chốt: *"vượt 100% thì phải màu đỏ mới đúng"*) — đã vượt trọn một
cửa sổ nghĩa là phiên **đã bị nén ít nhất một lần**, sự thật đó đắt hơn mọi ngưỡng và phải đọc được
ngay từ MÀU chứ không bắt người ta đọc số. Dưới 100% vẫn theo **đúng ngưỡng user đặt** (đỏ ≥ ngưỡng ·
cam ≥ ngưỡng−10 · xanh còn lại) — không đẻ ngưỡng thứ hai.
⚠ **Một cổng của tôi LỌT đột biến ở lượt này, ghi lại:** phép `/pct>=w/` khớp NHẦM vào `pct>=w-10`,
nên đột biến *"bỏ hẳn nhánh đỏ theo ngưỡng"* vẫn xanh. Siết thành `/pct>=w(?![w-])/` mới bắt được.
Bài học cũ lặp lại: một phép soi CHỮ mà không kiểm bằng đột biến thì không biết nó có soi gì không.

### 🔴 LỖI TÍNH NĂNG: máy TỰ BẬT khung đăng nhập — không ai cho phép

User bắt, nguyên văn: *"t đâu có cho phép UI tự động bật đăng nhập đâu má, lỗi tính năng rõ ràng,
chỉ bật đăng nhập khi user chọn thôi chứ ai cho phép tự mở khung đăng nhập"* và *"nếu cần đăng nhập
thì hiện cảnh báo dấu than mất kết nối, rồi user bấm vào mới mở ra"*. Đúng, và ranh giới này là
nguyên tắc chứ không phải sở thích: **kéo NGẦM là việc máy tự làm được; bật một khung đăng nhập là
đòi sự chú ý của NGƯỜI**, và máy không được tự quyết điều đó.

**Cơ chế đã đo:** máy đổi trình duyệt mặc định **Brave → Edge** ⇒ `borrowCookies` dời cả 4 profile
sang bên ⇒ **cả 4 khe `need-login` cùng lúc**. `WEB_RETRY_AFTER_FAIL_MS` = 6 giờ, và mỗi lần thử lại
**mở một cửa sổ trình duyệt THẬT** ⇒ **4 cửa sổ / 6 giờ, vô hạn**. Dấu vết khớp: 15:58 · 16:01 · 16:01
· 02:14 · 02:16 · 02:19 · 04:03. `deadMainLane` (2.11.0) không cứu được vì nó chỉ dập `main` KHI khe
số cùng nền còn sống — ở đây **không khe nào sống**.

**Vá ① — thôi tự mở:** `needsLoginLane()` loại khe `need-login` KHỎI vòng tự kéo, **dừng hẳn** chứ
không lùi lâu hơn: `need-login` **không bao giờ tự khỏi**, nên lùi 6 giờ hay 60 giờ đều là đổi nhịp
của cùng một việc vô ích — và mỗi lần vô ích là một cửa sổ đập vào mặt người dùng. Chỉ chặn ĐÚNG
`need-login`; `no-browser` (có thể tự khỏi khi cài lại trình duyệt) vẫn được thử lại.

**Vá ② — BẮT BUỘC, không phải tuỳ chọn:** nếu chỉ làm ① thì khe **chết IM LẶNG**. `/connections` đọc
`webAuth` (kết quả lần KIỂM cuối) chứ không đọc `webPull` (kết quả lần KÉO cuối) — đo được: `webAuth`
còn `ok:true` từ **29/08** trong khi cả 4 khe `need-login` từ **02/09**, tức **UI báo "đã nối" cho khe
đã chết**. Nay so MỐC giữa hai nguồn, **bằng chứng mới nhất thắng** (không ưu tiên cứng: một lượt kiểm
vừa chạy PHẢI thắng một lượt kéo hỏng hôm kia), và hiện `⚠ mất kết nối {ago} — bấm để đăng nhập lại`.
Bấm vào đi đường `/connect`, tức do NGƯỜI khởi xướng. Nghiệm thu máy thật: cả 4 khe chuyển từ
"đã nối" sang **MẤT KẾT NỐI** kèm câu chỉ việc phải làm.

**Cổng:** `web-autopull.test.mjs` +7 ca (`needsLoginLane` · khe need-login bị loại · khe hỏng lý do
KHÁC vẫn thử · khe lành không bị chặn oan · `/connections` đọc cả hai nguồn · so mốc · mã `needLogin`
có đủ hai dict). **Đột biến 4/4 ĐỎ**, gồm hai đột biến *trả về đúng code cũ*: bỏ chặn khe need-login ·
`connected` chỉ đọc `webAuth`.

### MƯỢN COOKIE: thiếu Brave, và "khoá" bị báo thành "không có"

User: *"vẫn chưa fix được việc mở browser đó thì lấy chính cookie web đã có để lưu"*. Đo ra **hai lỗ**:

**① `cookieSources()` chỉ có Chrome + Edge — THIẾU BRAVE**, trong khi trình duyệt mặc định của máy
này là Brave và **chính zemory cũng mở Brave** (`opening … in brave.exe` trong log). Nên phiên thật
của người dùng nằm ở Brave mà bộ mượn **không bao giờ nhìn tới** — nó báo *"không có trình duyệt nào
còn phiên"* trong khi phiên đang nằm ngay đó.

**② KHOÁ bị báo thành KHÔNG CÓ.** Chromium giữ khoá độc quyền kho cookie khi đang chạy — đo trên máy
này: đọc thẳng ném `unable to open database file`, và `copyFileSync` ném **EBUSY**, tức **không có
đường đọc nào** khi trình duyệt còn mở. `findBorrowSource` **nuốt** lỗi đó rồi trả `null` ⇒ bề mặt nói
sai VÀ không chỉ được việc phải làm (đóng trình duyệt).

**Vá:** thêm Brave vào nguồn · tách `borrowBlockedBy()` thành **hàm riêng** thay vì nhồi cờ ngầm
(`cookies: -1`) vào kiểu trả về của `findBorrowSource` — nơi gọi đang làm `Boolean(findBorrowSource())`
nên một object "khoá" sẽ lặng lẽ thành `canBorrow: true` ⇒ UI mời **Mượn** rồi thất bại. Hai câu hỏi
khác nhau thì hai hàm. UI hiện: *"💡 Có thể mượn phiên đăng nhập sẵn có, nhưng Brave đang mở nên kho
cookie bị khoá. Đóng Brave rồi mở lại hộp này."*

Đo sau khi vá: `chatgpt` → **mượn được (Chrome/Default, 1 cookie)** · `claude` → **BỊ KHOÁ, đóng Brave**
(trước đó cả hai đều im).

**Cổng:** +3 ca. **Đột biến 2/2 ĐỎ**: *trả về đúng code cũ* (bỏ Brave khỏi nguồn) · bỏ hẳn
`borrowBlockedBy` (quay lại im lặng).

⚠ **Ngoài tầm zemory, ghi để khỏi ai đi tìm bug:** user không nhận được prompt 2FA của Google trên
điện thoại. Đó là đường Google → thiết bị, zemory không nằm trên đó và không sửa được từ đây.
### Cửa sổ đăng nhập phải BUNG RA TRƯỚC MẶT (user bắt)

*"bấm vào link nó mở web mà nó ko tự bung ra trước mặt thì sao mà thấy"*. Đúng — cửa sổ mở sau lưng
app thì việc "mở cửa sổ để bạn đăng nhập" coi như **không xảy ra**.

⚠ **Bản đầu của tôi SAI và đã đo ra:** dùng `WScript.Shell.AppActivate(pid)` — **không ăn**, vì
Chromium tự sinh cây tiến trình nên **pid ta `spawn` thường KHÔNG sở hữu cửa sổ**; vòng chờ 6 giây
không bao giờ thấy `MainWindowHandle` (chạy thử trên một cửa sổ Brave thật: không ra gì). Đường đúng
là bảo **chính trình duyệt tự nâng mình**: `Page.bringToFront` của CDP nâng cả tab lẫn cửa sổ, không
phụ thuộc pid, không đụng khoá tiền cảnh của Windows — và **CDP đã nối sẵn** ở đó, không thêm hạ tầng.

Đặt **SAU** chốt `!first` (lúc đó cửa sổ chắc chắn tồn tại) và **chỉ khi `!opts.hidden`**: lượt ngầm
mà nhảy ra trước mặt là đúng lỗi vừa sửa ở mục trên — máy không được tự đòi sự chú ý.

**Cổng:** +3 ca. **Đột biến 3/3 ĐỎ**: bỏ hẳn việc nâng · nâng cả lượt ngầm · quay lại `AppActivate`.
⚠ Một phép của tôi **bắt oan lượt đầu**: cấm chuỗi `AppActivate` trong CẢ FILE, mà chữ đó còn nằm
trong chú thích giải thích vì sao nó không ăn. Phải bỏ comment trước khi soi — đúng bẫy "soi CHỮ" mà
`audit` đã ghi.

### Hai lỗi hộp "Connection details" — user bắt, và lỗi ĐẦU do chính lượt vá trên đẻ ra

**① `Link: linked` nằm NGAY TRÊN `Last pull: could NOT run (need-login)` — cùng một hộp, hai câu
ngược nhau.** Gốc: `scope.ts` (cây Nguồn) đọc **chỉ `webAuth`**, y như `/connections` trước khi vá.
Tôi vá một bề mặt, quên bề mặt kia ⇒ chúng lệch nhau ngay. Trớ trêu: comment ở ĐÚNG dòng đó đã viết
sẵn *"đọc từ cùng sổ mà bảng Liên kết vẫn đọc, để hai bề mặt KHÔNG BAO GIỜ nói khác nhau"* — tôi phá
đúng thứ nó cảnh báo.

⇒ Không vá hai chỗ nữa mà rút thành **MỘT hàm dùng chung** `webLaneLinked(auth, pull)` ở
`webslots.ts`, cả `scope.ts` lẫn `connections.ts` cùng gọi. **Nguồn TRÙNG thì sớm muộn cũng lệch;
một hàm thì không** — và có cổng canh *"không bên nào tự đọc `webAuth` rồi tự phán"*, để lần sau ai
đó copy luật ra chỗ mới là đỏ ngay.

**② Nút "Link" nằm ở hàng WEB TỔNG** (user: *"account nào hư thì hiện liên kết ở đó chứ, link ở đây
rồi nó biết link vào đâu, lại thiết kế ngu"*). Đúng: hàng cha gộp nhiều khe con nên `account` của nó
**rơi về `'main'` theo mặc định** ⇒ bấm Link ở đó là **âm thầm nối khe `main`** dù khe hỏng có thể là
khe 2. Nay hàng cha **chỉ BÁO**, kèm câu chỉ đường *"N tài khoản đang mất kết nối — mở nhóm này ra và
bấm vào ĐÚNG tài khoản đó"*; nút nối lại chỉ nằm ở hàng tài khoản thật (`!c.kids`).

**Cổng:** +3 ca. **Đột biến 4/4 ĐỎ**: `webLaneLinked` bỏ qua `webPull` · ưu tiên cứng thay vì so mốc ·
**trả về đúng code cũ** của `scope.ts` · cho hàng gộp bày lại nút Link.

### Cửa sổ trình duyệt bỏ lại — 3 icon Edge trên taskbar (user bắt, kèm ảnh)

**Không phải do tôi restart daemon.** Daemon khởi động lần cuối `01/09 19:47Z`; ba cửa sổ mở lúc
`02/09 02:14–02:19Z` — **6,5 giờ sau**, tức nhịp web 20′ tự chạy. Nguyên nhân MỞ là đúng thiết kế:
trình duyệt mặc định của máy đổi **Brave → Edge**, nên `borrowCookies` dời profile sang bên và mở cửa
sổ đăng nhập lại (có báo ra log).

**Lỗi thật là chúng KHÔNG ĐÓNG ĐƯỢC.** `closeBrowserTree` dùng `execFileSync` trần **8 giây** và
ETIMEDOUT thật: `taskkill /T /F` phải dọn cây Edge **34 tiến trình**. Log có đúng 3 lần
`spawnSync taskkill ETIMEDOUT` (02:15 · 02:18 · 02:23) và **pid 20512 · 25144 khớp chính xác** hai cửa
sổ còn trên taskbar. Mỗi lượt web gặp `need-login` bỏ lại thêm một cửa sổ, không có gì dọn.

**Vá ba vế:** ① `execFileSync` → `execFile` **bất đồng bộ** — bản cũ còn chặn event loop daemon 8 s
mỗi lần, nên nới trần mà vẫn sync là biến một lỗi rác thành một lỗi treo · ② trần **8 s → 30 s** ·
③ **thử lại một lần** (taskkill trượt lần đầu lúc trình duyệt đang bận ghi profile là chuyện thường).
Vẫn fail-open: hết cách thì ghi log, không ném — đóng cửa sổ là dọn dẹp, không được làm hỏng lượt kéo
đã thành công. Cổng 3 ca, đột biến **3/3 ĐỎ** (trả về trần 8000 · bỏ thử lại · trả về `execFileSync`).

⚠ **KHÔNG tự đóng 3 cửa sổ đang treo:** cả ba là trang **"Sign in"**, và 3 khe web đó đang `need-login`
— user đăng nhập vào đó thì chúng sống lại; đóng đi là lấy mất cơ hội đó.

Nguồn số là `compactMetadata.preTokens` của bản ghi `compact_boundary` (~1M mỗi lần ⇒ phiên đầy gần
TRỌN cửa sổ trước mỗi lần nén). 🔴 Phải **QUÉT TĂNG DẦN**: bản ghi nằm RẢI khắp file nên không đọc
đuôi được như `readContextUsage` — đọc cả 40 transcript mới nhất là **220 MB / 2.630 ms** (66 ms/file),
quá đắt để trả mỗi lượt. Nên sổ bền giữ `scannedTo`, lượt sau chỉ đọc byte MỚI; `scannedTo` đặt ở
ranh giới DÒNG (dòng cuối có thể đang ghi dở) và có 64 KB lùi an toàn để không cắt ngang bản ghi.
Nghiệm thu: quét lại từ `scannedTo` ra **0 lần mới** — không cộng trùng. File ngắn lại (bị thay) ⇒
quét lại từ 0. Endpoint có **ngân sách 40 MB/lượt** cho phần quét này.

**Màu: xám → XANH** (`--success`); **cam và đỏ giữ nguyên** (user: *"số xám ko thấy gì hết, để màu
xanh đi"* · *"2 cái cam và đỏ thì để nguyên"*).

**HAI LOẠI SỐ, CỐ Ý KHÔNG TRỘN** (user chốt: *"đừng tự tạo khung đoán riêng"*, và bác đúng câu tôi
nói sai lúc đầu rằng phiên web "không có context" — *"tất cả mọi agent đều có context"*):
- **`measured`** — chỉ `claude-code`: host tự khai `usage` trong transcript ⇒ có **cả tử số và mẫu
  số** ⇒ nói được PHẦN TRĂM.
- **`estimate`** — web/codex/…: `SUM(LENGTH(content))/4` từ nội dung đã lưu. Là số THẬT về độ lớn
  hội thoại, nhưng **không có mẫu số** (zemory không biết phiên đó chạy model nào) ⇒ trả **token,
  TUYỆT ĐỐI không %**. Quy ra % là bịa mẫu số. Đo thật: chatgpt-web tới **185.199** token.
  ⚠ `chars/4` **đếm hụt với tiếng Việt** ⇒ bề mặt luôn kèm dấu `~` và nhãn "est.".

**Bản đầu của badge CHỈ hiện % cho phiên MỚI — user bắt được ngay (*"sao có mấy cái nó ko hiện %"*).**
Vì nó chỉ đọc sổ `.ctx.json`, mà sổ chỉ tồn tại từ lúc bản vá `stop` chạy ⇒ mọi phiên trước đó rơi
về `estimate` **dù transcript còn nguyên trên đĩa và mang `usage` do host tự khai**. Tức endpoint đọc
THIẾU MỘT NGUỒN, không phải zemory không đo được. Thêm nhánh **đọc thẳng transcript**: tra đường qua
`ingest_state` (đã giữ `file_path` ↔ `session_id`, đo **7 ms/40 id**, không quét thư mục). Kết quả
đo lại: **12/12 phiên đều có %**, gồm phiên cũ 88,25% · 86,12% · 85,06%; 458 ms cho 12 id.
Hai bẫy đã đo và phải xử: · một id có **nhiều `file_path`** (ingest từ nhiều đường sau khi dời thư
mục, hoặc từ máy khác) ⇒ chọn đường TỒN TẠI tại chỗ · **16/52 đường là của MÁY KHÁC** ⇒ không đọc
được, phải rơi về ước tính chứ không được im.
🔴 Mốc `at` lấy **mtime của transcript**, KHÔNG phải `Date.now()`: FE dùng mốc đó để phân biệt `●`
đang chạy vs `◐` đã đóng, nên lấy giờ hiện tại là **mọi phiên cũ đều hiện như đang chạy**. Và endpoint
có **TRẦN 40 id/lượt** + FE chia lô tuần tự, vì `readContextUsage` là I/O ĐỒNG BỘ (~11,5 ms/phiên)
chạy trên event loop daemon — 120 id là ~1,4 s đứng hình mọi endpoint khác (lỗi đã trả giá 26/08/23).

**Một chẩn đoán của tôi bị BÁC bằng số, ghi lại:** tôi định đề nghị hạ ngưỡng 95%→85% và gọi đó là
cách sửa. User bác: *"ngưỡng là do setting user đặt, việc của bạn là phải code sao nó nhận đúng ngưỡng
đó"* — đúng, và nếu tôi dừng ở đó thì bug 7/8 kia vẫn còn nguyên. (Ngưỡng thật đang là **90**, không
phải 95 như ảnh chụp cũ; config và daemon khớp nhau.)

**Cổng:** `context-stop-state.test.mjs` **8 ca** — ① `stop` phải ghi sổ · ② `stop` phải IM kể cả khi
VƯỢT ngưỡng (canh bất biến 0-token, trước bản này **không cổng nào canh**) · ③ không biết cửa sổ ⇒
KHÔNG ghi (`window: null` mà vẫn ghi thì UI chỉ còn cách đoán) · fail-open transcript thiếu · sổ rác
⇒ null · 3 ca hợp đồng endpoint (`estimate` không được mang `percent`/`window` · `measured` phải đủ 5
trường · một truy vấn NHÓM, không N+1). i18n thêm 6 khoá **đủ hai dict**.
**Đột biến chứng minh, chạy thật 5/5 ĐỎ:** *trả về đúng code cũ* (bỏ hẳn phép đo ở `stop`) · phun chữ
ra `stop` khi vượt ngưỡng · bỏ chốt `window !== null` · cho `estimate` mang `percent` · bỏ `threshold`
khỏi `measured`.

**Bẫy trả giá:** đặt `process.env.GLOBAL_MEMORY_DB` trong thân từng test là **vô tác dụng** —
`memory/db.ts` đọc env ĐÚNG MỘT LẦN lúc nạp module, nên phải trỏ kho tạm TRƯỚC rồi mới `import` động
(cùng bẫy `autosync-schedule.test.mjs` và `writegate.test.mjs` đã ghi).

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
