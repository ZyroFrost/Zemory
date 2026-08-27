<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

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

