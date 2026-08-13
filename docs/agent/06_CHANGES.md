<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-13i] — (⑦) ĐÃ DỌN: pack 234,91 → 22,52 MiB, giữ nguyên mốc lịch sử

**Cách làm — giữ LOG, bỏ BLOB** (user hỏi thẳng: xoá hay để làm log). Thứ đáng giữ là *"ngày
05/08 đã xảy ra chuyện gì, ở commit nào"*, không phải 314 MB weight tải lại được (HP điều 2).
Và nội dung **không mất gì**: mỗi commit cũ đều có bản tương ứng đã bóc weight trên `main`
(`32d5d03`→`8bbcba9` · `921354f`→`d9cf711`, cùng ngày cùng message).
· tag `pre-lfs-fix-20260805` **dời** sang `8bbcba9` và nâng thành **annotated** — chính nó nay
  mang phần log: hash cũ, tên hai file weight, lý do, ánh xạ hash để tra ngược.
· xoá `refs/original/refs/heads/main` (rác `filter-branch`) · `reflog expire` · `gc --prune=now`.

**Số đo:** `size-pack` **234,91 → 22,52 MiB**. `main` **y nguyên** `7e7d2a8`; 3 tag còn đủ; cây
làm việc sạch; `fsck` sạch; 28/28 test + `validate` + `conform` ✓. **Không đụng remote, không
force-push, không hash nào của `main` đổi** ⇒ clone máy khác KHÔNG hỏng.

**🔴 SỰ CỐ TỰ GÂY, ghi lại vì đắt:** `git reflog expire --expire=now --all` **xoá luôn stash**.
`git stash list` đọc **reflog của `refs/stash`** — stash entry CHÍNH LÀ reflog entry, nên "dọn
reflog" = "xoá danh sách stash". Mất mục stash 04/08 của user (việc chưa commit).
**Cứu được** vì `refs/stash` vẫn trỏ commit `2986922` và `gc` không đụng (reachable qua ref):
`update-ref -d refs/stash` rồi `stash store` để dựng lại entry — nội dung khớp y nguyên
(3 file · +120/−66). **Bài học: `--all` trong lệnh git bao gồm cả những ref mình không nghĩ tới.**
Lần sau: chụp `for-each-ref` **và** `stash list` trước, và expire có phạm vi thay vì `--all`.

## [2026-08-13h] — (⑦) 314 MB weight: mục 🔴 treo 3 ngày hoá ra KHÔNG cần viết lại lịch sử

> 🔄 **Supersede:** thay [2026-08-12e] — "audit 10 mặt sau 1.5.0" — vế *"gỡ = viết lại lịch sử +
> force-push, làm hỏng clone máy kia"*, và vế *"mọi lần clone đều kéo về ~314 MB"*. **Cả hai sai.**

**Đo:** weight vào git qua ĐÚNG MỘT commit `921354f` (05/08) và **đã bị gỡ khỏi `main` ngay hôm
đó**: `merge-base --is-ancestor 921354f HEAD` ⇒ KHÔNG · `ls-tree HEAD` ⇒ 0 file. Nó chỉ còn sống
nhờ **hai ref CỤC BỘ** cùng trỏ `32d5d03`: `refs/original/refs/heads/main` (rác `filter-branch`
để lại) và tag `pre-lfs-fix-20260805`. **Remote không có cả hai** ⇒ clone từ GitHub không kéo gì.

**Số:** `.git` máy này **661 MB** · clone từ **local** (kéo cả tag) **236 MB** · clone từ GitHub
không chứa commit đó.

**Vì sao mục này treo 3 ngày ở mức 🔴:** nó được viết bằng suy luận *"blob còn trong pack ⇒ còn
trong lịch sử ⇒ phải viết lại lịch sử"* — nghe rất hợp lý, và không ai hỏi **ref nào đang giữ**.
Một câu lệnh `for-each-ref` là đủ để bác. Đúng dạng "chưa xác minh thì chưa phải sự thật": cái
giá không phải 314 MB mà là **ba ngày mang một việc nguy hiểm giả** (force-push, đổi mọi hash,
bắt máy kia clone lại) trong danh sách ưu tiên cao nhất.

**Còn lại cho user chốt** — thuần cục bộ, không đụng remote: xoá `refs/original/…` (an toàn, tag
vẫn giữ điểm lùi) và/hoặc xoá tag rồi `git gc --prune=now` để thu hồi 314 MB, đổi lại mất điểm
lùi về trước đợt sửa LFS 05/08.

## [2026-08-13g] — archive dời file xuống sâu một tầng mà bỏ quên link: 26/26 gãy

**Đo:** `docs/agent/archive/06_CHANGES.md` có **26 link nội bộ, gãy cả 26** — không một link nào
còn đúng. `zemory archive` cắt entry từ `docs/agent/` xuống `docs/agent/archive/` và chép NGUYÊN
VĂN, nên `../../backend/src/…` (đúng ở tầng trên) nay trỏ vào `docs/backend/…`, không tồn tại.

**Vì sao nguy hiểm hơn vẻ ngoài:** nó KHÔNG BAO GIỜ tự lộ — file vẫn render, link vẫn xanh, không
lệnh nào kêu. Mà entry changelog dẫn tới code chính là để người đọc sau **đi kiểm chứng lời khẳng
định**; link chết biến việc kiểm chứng thành ngõ cụt trong khi vẫn trông như có bằng chứng.

**Vá:** `deepenRelativeLinks()` áp cho CẢ HAI đường archive (`05_TODO` + `06_CHANGES`) — chừa URL
ngoài, neo, đường tuyệt đối và placeholder của bản mẫu. Dữ liệu cũ vá một lượt: 21 link về đúng,
2 file chỉ **đổi chỗ** được map lại (`validate.ts`→`docs/`, `settings.ts`→`config/`), `ui-page.ts`
**không còn tồn tại** nên gỡ link giữ chữ. Kết quả: **24 đúng · 0 gãy**.

**Cổng `archive-links.test.mjs` 2/2:** canh hàm biến đổi **và** canh file thật trên đĩa — hàm đúng
mà dữ liệu cũ vẫn hỏng thì người đọc vẫn lạc.

## [2026-08-13f] — bịt cái làm PHÉP ĐO nói dối: gate không được chạy khi máy đang bận

**Bệnh:** bộ đầy đủ báo **654 pass / 7 fail**, cả 7 ở `vectors.test.mjs`; chạy lại đúng file đó
lúc máy rảnh cho **13/13 XANH**. Test embed nạp model ONNX thật, tranh CPU/I-O với job nền của
daemon ⇒ **đỏ do điều kiện đo**, với thông báo vô nghĩa (`remaining 1 !== 0`, `SQLITE_ERROR`).

**Cái giá thật không phải 22 phút chạy lại, mà là NIỀM TIN vào gate:** một lượt đỏ không nói được
lý do thì lần nào gặp cũng tốn chừng ấy công để loại trừ — và đỏ-giả lặp vài lần là người ta bắt
đầu bỏ qua màu đỏ. Lời dặn "tắt daemon trước khi chạy gate" đã có sẵn trong sổ và **bị bỏ qua hai
lần**, lần sau cùng bởi chính agent viết ra nó ⇒ nay là **phép kiểm, không phải lời dặn**.

**Hai lớp:** ① `npm run preflight` (nối vào `npm run check`) chặn khi daemon đang embed/sync, in
lý do + ba đường đi tiếp; `ZEMORY_GATE_FORCE=1` để đè, có cảnh báo. ② `skipIfBusy(t)` ở 10 ca
embed — bận thì bỏ qua CÓ LÝ DO. Đo cùng tình huống: **7 đỏ / 22 phút → fail 0 · skipped 10 /
~0,5 giây**.

**Bug trong chính bản vá, bắt được lúc thử:** `process.exit()` gọi khi undici còn đang đóng socket
làm Node trên Windows chết bằng assertion libuv (`exit 127`) — tức phép kiểm canh gate lại là thứ
làm gate đỏ. Nay đặt `process.exitCode` và để tiến trình tự thoát.

**Giới hạn ghi rõ:** `preflight` chỉ kiểm LÚC BẮT ĐẦU. Lượt gate hôm nay khởi động lúc rảnh, giữa
chừng daemon tự bật embed ⇒ ca cuối bị bỏ qua. **"Xanh có kèm skipped" ≠ "xanh phủ đủ".**

## [2026-08-13e] — i18n: từ danh sách triệu chứng thành SỐ ĐO + cổng không-lùi

**Trước:** mục sổ chỉ liệt kê vài chuỗi thấy được khi chụp ảnh UI tiếng Anh. **Nay có số:**
**90 chuỗi** tiếng Việt hardcode trong `frontend/scripts/` (ngoài `chrome.js` — nơi giữ hai
dict): `shell.js` 45 · `system.js` 11 · `graph-panel.js` 10 · `sources.js` 10 · `graph-render.js`
6 · `harness.js` 5 · `gm.js` 2 · `recall.js` 1.

**Đã sửa phần lộ rõ nhất** (trang chủ): `relTime()` — ô Last Sync `chưa sync`, `7 giờ trước` —
và 4 pill trạng thái. Thêm 6 key vào **cả hai** dict. Các key kia vốn đã có sẵn ở cả hai bản;
code chỉ đơn giản **quên gọi `t()`**.

**Cổng `i18n-ratchet.test.mjs` 3/3** (cả ba đột biến đỏ được): ① số hardcode không được tăng ·
② gỡ được thì phải HẠ trần — trần treo cao hơn thực tế thì chỗ vừa dọn lặng lẽ quay lại được ·
③ mọi key phải có ở CẢ HAI dict: `t()` fallback về vi nên **thiếu bản EN không báo lỗi**, nó chỉ
hiện tiếng Việt giữa giao diện tiếng Anh — hỏng câm.

**Vì sao trần là 90 chứ không phải 0:** gate đỏ triền miên là gate bị bỏ qua — đúng luật 7 vừa
phải sửa cho `guard` ở entry trên. Trần chốt bằng số đo thật: thoái lui đỏ ngay, dọn dần thì
luôn xanh, và vế ② ép hạ trần nên con số thật sự đi về 0.

**Chưa làm — tầng BACKEND nặng hơn:** `connections.ts` sinh thẳng chuỗi tiếng Việt rồi gửi lên
UI, nên UI không có cách nào dịch. Sửa đúng là trả mã + tham số, đổi hình dạng payload.

## [2026-08-13d] — (⑩ · luật 7) guard thôi chặn nhầm: tên khoá trong MẪU TÌM KIẾM ≠ đọc khoá

**Bản cũ soi tất:** hễ câu lệnh chứa một lệnh đọc (`cat`/`head`/`tail`…) là **mọi** token đều bị
đối chiếu với danh sách tên khoá — nên `grep -rln "id_rsa" src/ | head` bị chặn, dù tên khoá nằm
trong *mẫu tìm kiếm* chứ không phải tệp bị đọc. Đo 2026-08-11: nó chặn đúng lệnh **audit** đi dò
lịch sử git. Phiên này dính lại y hệt khi gõ lệnh đó để đi SỬA nó.

**Vì sao không phải phiền nhẹ:** luật 7 nói thẳng — gate chặn nhầm thì người ta đi đường vòng, và
một gate bị đi vòng là gate **không còn tồn tại**.

**Vá (hẹp):** chỉ soi token trông như *tệp đang bị đọc* — ① có dấu phân cách đường dẫn · ② đứng
ngay sau một lệnh đọc (bỏ qua cờ `-x`) · ③ là token cuối câu.

**Không nới lỏng — có cổng cho cả hai chiều:** ca "phải cho qua" (3 dạng lệnh tìm) và ca "phải
vẫn chặn" (`cat /etc/ssh/id_rsa` · `cat id_rsa | grep` · `head id_rsa` · `base64 ~/.ssh/id_rsa`).
Test gọi guard THẬT qua stdin, đo hành vi chứ không đọc regex. **A/B trên cùng payload: guard cũ
`exit 2`, guard mới `exit 0`.**

Sinh lại `docs/hooks/guard.cjs`; bản ship cho bộ cowork được **cổng byte-parity bắt ngay** khi
tôi quên đồng bộ — đúng việc nó sinh ra để làm. Cổng: 33/33.

## [2026-08-13c] — (⑨) BACKUP thôi treo vào công tắc của tính năng khác

**Lưới đỡ cuối cùng của kho từng tắt theo một công tắc không liên quan.** `rotateBackup()` là
bước 4 của `maintainTick`, mà hàm đó `return` ngay dòng đầu khi `getScheduler()` tắt ⇒ **tắt
scheduler là tắt luôn backup**, không một dòng log. Đó là lý do THẬT của "4 ngày không có bản sao
lưu" (08/08 → 12/08): job không hỏng, nó **không bao giờ được gọi**. Cùng họ với lỗi bỏ đói
autosync — một công tắc gánh ba việc, người bật tưởng chỉ đổi một thứ.

**Vá:** `backupTick()` có đồng hồ riêng, **không hỏi công tắc tính năng nào**, lệch pha 1/4 chu
kỳ, mồi riêng 60 s sau khởi động (máy vừa bật lại sau nhiều ngày đúng là lúc cần hỏi "bản gần
nhất cũ chưa?"). Giữ nguyên hai ràng buộc cũ vì cả hai đều có lý do: **nằm trong token job**
(chép 1,1 GB trong lúc scan/embed đang ghi là kiểu tranh chấp nghi gây sự cố 03/08) và
**fail-open** (HP điều 9). Gọi từ trong chuỗi thì không claim lồng (`holdsToken`).

**Cổng:** `scheduler-contract` 9/9. Ca mới *"BACKUP không được treo vào công tắc của tính năng
khác"* — đột biến (cho `backupTick` hỏi `getScheduler()`) chứng minh đỏ được. Neo cũ *"claim
ĐÚNG MỘT lần"* **nắn PHẠM VI đo** (cả file → thân `maintainTick`) chứ không nới bất biến.

⚠ Chỉ sống sau khi **khởi động lại daemon** — daemon nạp mã lúc bind cổng.

## [2026-08-13b] — (⑥) `/memory-status`: một phép quét không được che, đứng lẫn giữa những phép đã che

**Truy ra chỗ tốn.** Bốn phép quét toàn bảng gánh gần hết: `SUM(LENGTH(content))` **1.615 ms** ·
`vectorCoverage` **1.391 ms** · `vectorRemaining` **994 ms** · `vectorCount` **194 ms**; toàn bộ
phần còn lại của payload ~100 ms.

**Lỗi thiết kế:** ba phép sau nằm trong `heavyStats()` (TTL 300 s), riêng `vectorCoverage()` bị
gọi thẳng trong `dashboardMemory()` ⇒ trả giá lại mỗi lượt `dashCache` (60 s) hết hạn, tức **gấp
5 lần số lượt** cho một con số đổi chậm y như hàng xóm. Nay gộp vào `heavyStats()` — **con số y
hệt, chỉ đổi tần suất tính**.

**Cổng:** `app-ui.test.mjs` thêm bất biến "mọi quét toàn bảng phải sau TTL dài" (46/46, đột biến
đỏ được). Vì sao cần máy canh: thêm một aggregate vào payload là việc tự nhiên, không gì trong mã
nhắc chỗ đúng của nó — và lỗi này **không bao giờ đỏ** ở test thường, kết quả vẫn đúng, chỉ chậm.

**CHƯA XONG, không đọc thành đã xong:** lượt LẠNH vẫn ~4 s. Và **mọi số tuyệt đối trên chưa đáng
tin** — đo khi job embed đang chạy, hai lượt cách nhau vài phút lệch **3×**. Warm-up đồng bộ lúc
khởi động là đường SAI (chặn event loop ⇒ đúng cơ chế bug "hai daemon"); đường đúng là đẩy sang
tiến trình con như `deepSearchChild`. Đo lại lúc máy rảnh trước khi quyết.

## [2026-08-13] — (⑧) clone sạch DỰNG ĐƯỢC: thủ phạm là ĐƯỜNG TẢI, không phải thiếu prebuild

> 🔄 **Supersede:** thay [2026-08-12e] — "audit 10 mặt sau 1.5.0" — vế chẩn đoán *"`better-sqlite3`
> không có prebuilt cho Node 24"*. Asset ABI 137 **CÓ thật**; ba hướng sửa sổ đề ra (hạ version ·
> ghim Node LTS · buộc cài Build Tools) đều dựa trên tiền đề sai — đổi ABI vẫn tải từ cùng host hỏng.

**Nguyên nhân thật: host `github.com` chập chờn.** Đo 10 lượt/host: `github.com` **1/10** lọt ·
`api.github.com` **10/10**. Trượt lượt nào là `prebuild-install` rơi về `node-gyp rebuild` (cần
bộ biên dịch C++) ⇒ clone sạch chết.

**Vá:** `backend/scripts/fetch-prebuilds.mjs` kéo đúng asset đó qua **API release** rồi đặt vào
cache đĩa của `prebuild-install`. Node thuần, 0 dependency, fail-open + in rõ khi hụt. **Phải chạy
TAY trước `npm install`** — đo mốc thời gian: npm chạy install script của *dependency* TRƯỚC
`preinstall` của gói gốc, nên không hook nào đủ sớm (đã thử `preinstall` rồi gỡ). Nối vào
`AGENTS.md` + `README`.

**Nghiệm thu vòng khép kín** (clone sạch + cache npm TRẮNG): `found cached prebuild` →
`Successfully installed prebuilt binary!` → `build_exit=0` → `zemory 1.5.0`. Đối chứng cùng
máy/cùng mạng khác đúng một biến: **không seed ⇒ `gyp ERR`**.

**Cổng:** `prebuild-cache.test.mjs` 4/4 (so tên cache + URL với chính `prebuild-install/util.js`),
đột biến `slice(0,6)`→`7` chứng minh đỏ được. Nó canh dạng hỏng CÂM: lệch một ký tự thì file nằm
cạnh chỗ cần nằm — không lỗi, không cảnh báo, bản vá vô tác dụng.

**Hai sổ sai, đã sửa:** ⑩ log scheduler ghi 🔴 trong khi `scheduler.ts:65` đã dùng `daemonLog` ·
bài học đo: **đường chập chờn thì MỘT lượt đo chứng minh được cả hai điều trái ngược** — đo tỉ lệ.

## [2026-08-12e] — audit 10 mặt sau 1.5.0 · luật HIỆN SUY NGHĨ · log nền ra đĩa

**Luật mới `02_RULES §Hành xử` (user chốt): HIỆN SUY NGHĨ TỪNG BƯỚC, CẤM CHẠY IM LẶNG.** Ba ca
trong ngày làm nền cho luật này, cả ba đều là **im lặng** chứ không phải lỗi khó: autosync chết
câm 2h34 · lệnh clone-sạch in *"DỰNG ĐƯỢC"* trong khi vừa chết (mã thoát bị `| tail` nuốt) · chở
hụt 75% vector với `rejected=0`.

**Vá: log scheduler ra ĐĨA** (`console.error` → `daemonLog`). Daemon phóng tách console nên
stderr rơi vào hư không — lớp nền không để lại dấu vết thì mọi lỗi của nó là lỗi câm.

**Audit — hai phát hiện đỏ:**
· 🔴 **(⑧) CLONE SẠCH KHÔNG DỰNG ĐƯỢC**, mặt này chạy lần đầu và đỏ ngay: `npm install` chết
  (`gyp ERR: no Visual Studio`) vì `better-sqlite3@12.11.1` phải biên dịch từ nguồn trên Node 24.
  Repo chạy được **chỉ vì máy có sẵn `node_modules`**. Đây đúng quy trình `AGENTS.md` dạy mọi máy
  thứ hai. Đã khai `engines` để lỗi hiện sớm; **chưa xác minh được** bản dựng sẵn có ABI 137 hay
  không (sandbox không ra được mạng ngoài).
· 🔴 **(⑦) Truy ra thủ phạm pack 235 MB**: `model_quantized.onnx_data` **294,6 MB** + tokenizer
  19,4 MB nằm trong LỊCH SỬ git (trái HP điều 2). **Chưa vá** — gỡ = viết lại lịch sử +
  force-push, làm hỏng clone máy kia; chờ user chốt.

**Sạch, đã đo:** 646/646 · conform ✓ · `quick_check`/`foreign_key` ✓ · 0 vector mồ côi · cây làm
việc không track bí mật · **diễn tập phục hồi ĐÃ LÀM**. **Chạy một phần, KHÔNG ghi "sạch":** ④ mới
soi endpoint parity · ⑥ mới gọi endpoint, chưa mở app nhìn · ⑧ chưa rà license · ① gate chạy khi
daemon có job nền. Chi tiết + việc còn lại: `05_TODO §Audit sau release 1.5.0`.

## [2026-08-12d] — release 1.5.0 · BẬT scheduler BỎ ĐÓI autosync · chở vector: 3 lỗi phải đo mới thấy

**Bật một tính năng giết một tính năng khác, im lặng tuyệt đối.** Bật `scheduler` ⇒ **2 giờ 34
phút KHÔNG một lượt autosync nào**, Drive trống, không lỗi, không log. Cơ chế: `maintainTimer` và
`syncTimer` **cùng chu kỳ 30 phút, tạo cùng một khoảnh khắc** ⇒ `maintainTick` (đăng ký TRƯỚC)
chạy đồng bộ tới tận lúc `spawn` rồi mới nhả event loop; `syncTick` chạy ngay sau, thấy `child`
⇒ bỏ lượt, đợi trọn chu kỳ. Trước đó autosync chạy đều **chỉ vì scheduler đang TẮT**. Vá: bị
chặn thì **hẹn lại sau 3 phút**, hai đồng hồ **lệch pha nửa chu kỳ**. Nghiệm thu máy thật: kho
chính **tự sinh sau 1.170 giây**, lượt kế tiếp **chỉ nối 0,5 MB**.

**Chở vector — ba lỗi, cả ba chỉ lộ khi ĐẾM HAI ĐẦU, không cái nào ném lỗi:** · **id trong gói là
ID GIẢ** — `buildRowsSnapshot` không chép cột `id` ⇒ chở **51.349/208.612 = 25%**, `rejected=0`.
· **11.233 tin `uuid=NULL`** (4,7%, đều có vector) bị bỏ ⇒ đẩy **3,9 giờ** nhúng lại sang máy
  mới. Nay định danh bằng **băm mốc-thời-gian + nội dung** — giống nhau trên mọi máy.
· **Một hàng hỏng giết cả lô 500** (giao dịch bọc cả lô, lỗi nuốt ở vòng ngoài).
Kết quả: máy trắng nhận **226.898 vector**, còn phải nhúng lại **2 tin** (trước: 3,9 giờ).

**`import` không đọc nổi kho chính** — đường BÀN GIAO trong tài liệu: người làm đúng hướng dẫn
nhận *"Not a zemory encrypted memory bundle"*. Nay `merge` hiểu container; thiếu `--merge` thì
báo câu chỉ đường.

**Hai bài học phương pháp, đắt hơn cả ba lỗi trên:** · **Fixture tự dựng CHE MẤT lỗi thật** —
phép thử giữ nguyên id nên chứng minh cho tình huống không tồn tại; ba ca test đầu cũng mù vì ở
quy mô nhỏ id nguồn (1,2,3) TÌNH CỜ trùng id gói (nay có ca ép id nguồn từ 5000). · **Chạy một
truy vấn rồi tin luôn** — `WHERE local_title='global_memory.enc'` trả HAI hàng (bản `trashed=1`
+ bản mới), `.get()` lấy hàng đầu ⇒ suýt báo "Drive không đẩy bản mới" trong khi nó đã lên xong.

Cổng: **648/648** · `scheduler-contract` 8/8 · `vector-ship` 5/5 · `drive-single-file` 4/4, đột
biến đều đỏ được. Version **1.5.0**.

## [2026-08-12c] — Drive: MỘT kho chính ghi bằng NỐI THÊM · vector đi cùng gói

> 🔄 **Supersede:** thay [2026-07-19] — "Export gọn + DELTA" — vế *series theo từng máy* bị bỏ.
> Nó khiến MỖI máy đẻ một baseline riêng của cùng một kho đã hội tụ: đo trên Drive thật
> `DESKTOP-PFB157K.000003` (1.312 phiên · 235.839 tin · 331 MB) và `SS01-IT-12.000024`
> (1.314 · 238.422 · 336 MB) **gần như trùng nội dung**. User chốt: *"trên drive luôn chỉ tồn
> tại 1 kho chính, 1 file duy nhất… bất kể máy nào bấm sync đều ghi lên 1 file đó"*.

**Kho chính = `global_memory.enc`, container nhiều khối.** Mỗi khối là một bundle HOÀN CHỈNH
(header · salt · iv · thẻ xác thực riêng), tiền tố `ZCHUNK <độ dài>`, **chỉ nối vào cuối**. Hai
hệ quả: ghi thêm không đụng byte cũ (một lượt sync nối ~100 KB thay vì viết lại ~336 MB), và
**không phải bẻ lại lớp mật mã** — mọi khối đi qua đúng `exportMemoryBundle`/`mergeMemoryBundle`
đã có. Tiền tố ĐỘ DÀI chứ không dò dấu hiệu: bản mã có thể chứa đúng chuỗi dấu hiệu ⇒ cắt nhầm.

**Thứ tự bắt buộc: GỘP TRƯỚC, GHI SAU** — merge kho chính vào kho local rồi mới xuất nối lên;
ngược lại là khối mình ghi thiếu phần máy kia. Kèm khoá `global_memory.sync.lock` (mồ côi sau 15
phút): máy khác đang ghi thì **báo lỗi rõ**, không giẫm lặng lẽ — kho THẬT nằm ở repo mỗi máy.

**Vector đi cùng gói** (`vecship.ts`): khoá theo `session_id`+`msg_uuid` — `messages.id` là
AUTOINCREMENT cục bộ, chở id sang là trỏ vào tin của người ta. Giá **3 KB/tin** (~100 tin ≈ 300
KB; con số ~700 MB chỉ là toàn bộ 226k vector lịch sử, việc MỘT LẦN). Lệch `vec_config` ⇒ **từ
chối kèm lý do**, tin vẫn vào đủ. Vì sao đáng làm: máy nhận thiếu vector thì recall rơi về FTS —
`@10` **26%/50%** (nghiêm/tương đương) so với hybrid **38%/71%**.

**Lỗi của chính bản vá này, do cổng cũ bắt:** máy tự merge lại khối nó vừa nối. Đã đánh dấu khối
của mình là đã-merge ngay lúc ghi; `push.bytes` sửa thành **byte ghi thêm**, không phải cả kho.

Cổng: `drive-single-file` 4/4 · `vector-ship` 3/3, đột biến đều đỏ được. Ba neo cũ **nắn theo
thiết kế mới** chứ không sửa cho xanh; `pruneDriveHost` nay nhận kho chính làm đường phát. **639/639**.
