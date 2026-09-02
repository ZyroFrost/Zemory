<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

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
