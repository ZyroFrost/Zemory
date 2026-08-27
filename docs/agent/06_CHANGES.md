<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-27] — Cowork ĐỌC ĐƯỢC kho chung qua MCP: một đường dẫn sai đẻ ra một kiến trúc thừa

> 🔄 **Supersede** vế *"Cowork KHÔNG dùng được MCP: nó chạy trong máy ảo riêng, không với tới
> `zemory` trên máy thật"* — in ở `setup mcp`, và là **tiền đề của cả bộ**
> `docs_template/cowork_global_memory/`. Vế đó viết CÙNG LÚC với lỗ đường dẫn dưới đây nên chưa
> bao giờ thử được, và không ai thử lại.

**Gốc: bản MSIX chuyển hướng AppData.** Desktop cài từ Microsoft Store chạy trong container ⇒ ghi
vào `%APPDATA%` bị lái sang `%LOCALAPPDATA%\Packages\Claude_*\LocalCache\Roaming\`. Nên trên máy
**đang chạy** Desktop, `setup mcp` vẫn báo *"chưa cài"* — và từ đó đẻ ra cả một bộ template riêng
cho máy ảo (13 file · kho cô lập · §6 treo vô hạn).

**Nghiệm thu trong phiên Cowork THẬT** — bằng chứng là con số **đang trôi**, thứ bản sao không giả
được: máy thật đo 30 phút trước **303.434** tin · Cowork báo **303.977** · đo lại ngay sau đó
**303.977**. Cowork liệt kê đủ `mcp__zemory__memory_*`, `dbPath` đúng kho chung.

**Đổi ở code:** `mcpsetup.ts` dò đường MSIX bằng **glob tiền tố `Claude_`** (không ghim
`PackageFamilyName` — đuôi đổi theo kênh phát hành), ưu tiên TRƯỚC `%APPDATA%` · `harness.ts` thay
dòng khẳng định sai.

**Nắn cả bootstrap** sau khi user đính chính phạm vi: bộ này cài lên **MÁY THẬT của người KHÔNG
rành kỹ thuật**, **agent tự làm hết** — không phải dựng kho trong máy ảo như agent hiểu nhầm ba
lần. MCP vì vậy **không thay** bootstrap mà là **bước CUỐI** của nó. Bốn lỗ vá: §0 *"dò không đạt
thì quay về bộ cũ"* ⇒ bỏ cuộc đúng lúc máy nontech nào cũng rơi vào (thiếu Node) ⇒ nay **tự cài** ·
§4 không hỏi nguồn, thiếu `scan-web` ⇒ máy trắng quét ra **0 tin** · §4b `embed` từ *"tuỳ chọn"*
lên **BẮT BUỘC** · **§5b nối MCP + nghiệm thu** — trước thiếu hẳn, nên dựng xong vẫn không đọc được.

**Cổng:** `mcp-msix.test.mjs` 5 ca soi HÀNH VI trên HOME giả · 2 đột biến (bỏ nhánh MSIX ⇒ 3 đỏ ·
ghim cứng PFN ⇒ đúng 1 đỏ). Máy thật: `setup mcp` in `✓ đã khai claude-desktop`. Template 41/41.

**Còn hở:** chỉ đo Windows + một bản MSIX · mới chứng minh **ĐỌC**, chưa đo GHI · chưa đo ra lệnh
việc nặng · bootstrap mới **chưa chạy thử trên máy trắng thật**. Thiết kế đầy đủ: `plan/20`.

## [2026-08-26b] — sync chịu được cú CHẬP của ổ đám mây: ngoại lệ KHÔNG phải trọng tài

**Triệu chứng.** UI báo `✕ another background job is writing the memory` — đó là WRITE GATE chạy
đúng (embed đang giữ token), nhưng nó **che** lỗi thật ở `/sync-status`: `UNKNOWN: unknown error,
write`. Watermark đứng **20 giờ** (5.793.032, mốc 25/08 09:54) trong khi 7.268 tin chờ đẩy.

**Chẩn đoán bằng TRẠNG THÁI ĐĨA, không bằng lời lỗi.** Khối #39 nối lúc 05:46:26 **có mặt ĐỦ** trên
kênh (41 khối, 0 byte rác) nhưng không được đánh dấu merged và watermark không nhích ⇒ chết giữa
`appendChunk` và `writeExportWatermark`. Hệ quả: mỗi lượt sau xuất lại đúng dải cũ rồi nối một khối
**TRÙNG** — #37≡#39 khớp từng byte (22.270.367 B / 3.812 tin), #30≡#31 cũng vậy. GM xác nhận lỗi đã
nổ **25/08** (`UNKNOWN … write` sau 6 phút 40) và chỉ được chữa bằng cách chạy lại — không ai vá.

**`UNKNOWN` = mã libuv khi Windows đưa mã lỗi nó không map nổi** (Google Drive File Stream). Đo loại
hẳn giả thuyết *"kênh hỏng/chậm"*: đọc tuần tự trọn 1.832 MB mất **42,9 s · 42,74 MB/s · 0 lỗi**;
`vectors-catchup` chết ở phút 5:42 rồi chạy lại **y nguyên lệnh** thì xong. Nó **CHẬP**, không hỏng.

**Ba lớp vá** (thiết kế + 5 luật: `plan/08 §8d`): ① **quan sát** — thôi vứt stderr, log phân biệt
thành/bại · ② **chiều GHI** — số khối ĐẾM ĐƯỢC phán chứ không phải ngoại lệ; retry 3 lần có cắt về
chiều dài cũ (vế "3 lần" của §8c ④ trước nay chưa build); watermark nhích NGAY khi khối chứng minh
được có mặt · ③ **chiều ĐỌC** — `withDriveRetry` bọc `extractChunk`.

**Cổng:** 14 ca mới · **9 đột biến** đỏ một-đối-một · gate **830/830 · 0 fail · 0 skipped**. ⚠ Cổng
bắt **ba lỗi trong chính bản vá**: lần thử cuối không cắt (để 17 byte rác trên kênh) · `throw` thiếu
`cause` · dòng `[sync]` đáng giữ nhất bị điều kiện *"chỉ giữ khi hỏng"* vứt, vì nó chỉ hiện ở lượt
**THÀNH CÔNG**.

**Trả nợ vector kênh chung:** đẩy **2.790 vector / 12,5 MB**; nghiệm thu ba phép khác cơ chế: 41→42
khối · khối mới bắt đầu ĐÚNG tại EOF cũ (1.921.443.041) ⇒ **0 byte cũ bị ghi đè** · dry-run lại ra
`thiếu 0`. Nợ ~22k của 25/08 nay chỉ còn 2.767 vì `embedFrontierId` đã bịt phần lớn. **30,4 MB khối
trùng để YÊN** — container chỉ-nối-thêm nên bỏ chúng = viết lại cả 1.832 MB và ĐÈ kho chung; ngưỡng
gộp tự động 48 khối, nay 42 ⇒ 6 lượt nữa nó tự cuốn, miễn phí.

## [2026-08-26] — guard: khớp TOKEN ở VỊ TRÍ LỆNH · soi GHI/DỜI qua lệnh · nói đúng về flag

Ba lỗ do repo phòng ban báo về (user chuyển 2026-08-26), vá ở **máy sinh** `guard-gen.ts` rồi
sinh lại cả hai bản (`docs/hooks/` + `docs_template/cowork/nonapp/hooks/`).

**② (b) BÁO OAN — tên lệnh nằm trong VĂN BẢN cũng bị chặn.** Dính **3 lần trong một phiên thật**:
`echo "=== git remote (chua push) ==="` · `echo "thu nghiem rm -rf"`. Chặn nhầm đi thẳng tới
*"gate nhiễu ⇒ gate bị bỏ qua"*. Nay khớp **token ở vị trí lệnh**: cắt câu thành segment (bỏ qua
dấu phân cách nằm trong nháy), lấy TỪ ĐẦU làm tên lệnh, bỏ env-assign và `sudo`/`env`/`nohup`.
**Ngoại lệ bắt buộc:** gặp interpreter (`bash -c` · `node -e` · `python -c`) thì nội dung trong
nháy CHÍNH LÀ lệnh ⇒ quay về soi cả câu — thiếu vế này là mở toang `bash -c "git push"`.

**② (a) LỌT — ghi vào protected bằng shell/script.** `checkWrite` chỉ chạy cho tool Write/Edit,
nên ghi bằng lệnh thì không nhánh nào soi. Đo trên **policy thật của `PBI_OPS`** (khai
`docs/agent/01_CONSTITUTION.md` · `data/*/01_raw` · `reports/*.pbix` · `../*`): bốn đường
`echo >>` · `python -c open().write()` · ghi ra NGOÀI repo · `mv` — **LỌT hết** ở bản cũ, **chặn
hết** ở bản mới. Nhánh mới soi: chuyển hướng `>`/`>>` · `mv`/`cp`/`Move-Item` · payload
interpreter **có đường protected VÀ có động từ ghi** (điều kiện kép để `python -c "print(open(
…).read())"` không bị chặn oan).

**③ `mv` ra khỏi protected không bị coi là xoá.** Nay với `mv`/`move`/`rename`: **nguồn** trong
protected ⇒ chặn (mất khỏi vùng bảo vệ, hậu quả y hệt xoá) · **đích** trong protected ⇒ chặn.

⚠ **GIỚI HẠN ghi thẳng vào comment** thay vì để người đọc tưởng guard phủ hết: tầng này chỉ thấy
ĐƯỜNG DẪN VIẾT THẲNG trong câu lệnh. Đường dẫn dựng lúc chạy (nối chuỗi, đọc từ biến/file/stdin)
thì KHÔNG thấy và không thể thấy — muốn chặn thật phải ở tầng hệ điều hành.

**Câu mô tả flag SAI — sửa 6 chỗ** (`policy.json` ở máy sinh · bản cowork · `02_RULES` của zemory
· 3 template adapt/app/nonapp). Câu cũ *"guard cho qua rồi tự xoá"* không đúng hành vi: flag bị
**ĐÓNG DẤU** `ZEMORY-USED <vân tay lệnh> <thời điểm>`, giữ 90 giây cho ĐÚNG lệnh đó thử lại (hook
`PreToolUse` chỉ nói *cho qua*, không biết lệnh có chạy thật — tầng khác chặn lại là flag mất
oan), xin việc KHÁC hoặc quá hạn thì **thu hồi**. Câu sai đó đã làm một agent tưởng có lỗ và suýt
ghi lỗ ma vào chuẩn dùng chung của cả estate.

**Cổng:** `guard-tool-matrix` +3 ca — ca ÂM *"tên lệnh trong văn bản KHÔNG được chặn"* · ca dương
*"không được hở lệnh thật, kể cả bọc interpreter"* · ca *"ghi/dời qua lệnh"* kèm 4 ca âm
(đọc-không-phải-ghi · chỗ thường · mv giữa hai chỗ thường · đọc file trong protected).
Ba đột biến riêng, đỏ đúng một-đối-một. Gate **816/816 · 0 fail · 0 skipped**.

**LAN RA 9 REPO `PBI_*` — và lượt lan lộ thêm một lỗ mà repo zemory KHÔNG dính.**
Áp lượt đầu (bản 487) rồi nghiệm thu bằng **marker của chính từng repo** ⇒ **7/9 repo vẫn thủng**:
nhánh interpreter chỉ soi token **có dấu `/`**, nên đường protected là **TÊN TRẦN ở gốc repo**
(`.vault` · `attic`) thì lọt. Zemory không dính vì `protected` của nó (`data` · `share` · `attic` ·
`external`) luôn được viết kèm đường con trong lệnh thật. Đây đúng loại lỗ **chỉ hiện khi áp lên
cấu hình thật của người khác**. Vá: bỏ điều kiện `/`, để `underProtected` quyết định (token vô
nghĩa như `w`/`1` không khớp đường nào nên không đẻ báo oan). Áp LẠI cả 9 repo ⇒ **9/9 · 8/8 ca**,
guard **491 dòng**, khớp từng byte với bản zemory. `policy.json` mỗi repo chỉ đổi ĐÚNG một dòng
(câu mô tả flag); `protected_write` giữ nguyên. **Không commit ở repo nào ngoài zemory.**

⚠ **Bốn lần TỰ SAI trong lượt vá, ghi vì cả bốn đều suýt thành kết luận sai:**
· probe nghiệm thu 9 repo dựng ca theo marker của **PBI_OPS** rồi áp cho mọi repo ⇒ báo "6 repo
  trượt". Sai: guard cho qua là ĐÚNG, vì nó chỉ bảo vệ đường repo TỰ KHAI. Phải dựng ca **từ
  chính policy từng repo** mới lòi ra lỗ `.vault` thật.
· hồi quy tự gây: cắt segment tại `|` làm `Get-ChildItem -Recurse | Remove-Item` LỌT — mẫu đó bắc
  QUA dấu ống. Sửa: vị-trí-lệnh quyết định *có soi hay không*, còn soi thì soi CẢ CÂU.
· probe nói "bản mới cũng lọt" — **sai vì probe chạy với cwd = zemory**, đường dẫn tương đối giải
  về repo khác. Luật đo ① (sao chép tham số của thước thật) — tham số bị quên ở đây là **cwd**.
· `BOOTSTRAP.md` của bộ cowork khai `guard.cjs = 359 dòng`; file mới **487** ⇒ cổng `cowork` đỏ.
  Manifest đếm dòng là thứ mọi lần sửa guard đều phải cập nhật.

## [2026-08-25d] — HÀNG ĐỢI ghi kho chung: đợi tới lượt, có nhịp tim, kiểm hai đầu

> 🔄 **Supersede** vế *"Tranh chấp thì BÁO, không cố chống"* (`plan/08 §8`, agent viết 2026-08-12).
> User đọc lại và bác: *"t nói là 1 file duy nhất, 2 máy cùng ghi vào — chứ KHÔNG hề nói là 2 cái
> ghi sai nhau"*. Vế cũ lấy giới hạn của Drive làm cớ dừng ở mức thấp hơn ý đã chốt.

**Sự cố sinh ra nó (đo cùng ngày):** lượt merge đọc kênh ở **0,55 MB/s** nên giữ khoá **~1 giờ** —
quá ngưỡng mồ côi 15 phút ⇒ máy kia **hợp lệ** nối khối lúc 13:08 ngay giữa lúc máy này đang đọc ⇒
`UNKNOWN: unknown error, read`, hỏng CẢ lượt sync lẫn lượt bù vector.

**Bốn thứ đổi** (spec đầy đủ: `plan/08 §8c`):
- **Hàng đợi thật** — gặp khoá còn sống thì **ĐỢI** (nới rộng dần, trần 30 s/nhịp), in *"đang chờ
  máy X"*. Không cướp, không bỏ cuộc. Trước đây: ném lỗi bắt người dùng tự bấm lại.
- **Nhịp tim** — chủ khoá chạm lại `at` mỗi 30 s; lỡ **3 nhịp** mới coi là chết. Việc chạy lâu vì
  vậy không còn bị hiểu nhầm là máy chết.
- **Tương thích ngược** — khoá của bản CŨ không có cờ `beat` ⇒ vẫn đọc bằng ngưỡng 15 phút. Không
  làm vậy thì ta cướp khoá của máy chạy bản cũ, tức tái tạo đúng lỗi đang vá, chỉ đổi chiều.
- **Kiểm hai đầu quanh lúc nối** — trước khi ghi: số khối đổi so với lúc liệt kê ⇒ **DỪNG**, để
  lượt sau merge rồi ghi (Drive đồng bộ theo CẢ FILE: nối lên bản cache cũ = **xoá khối của máy
  kia mà không ai báo**). Sau khi ghi: đếm lại khối, lệch ⇒ báo lỗi rõ thay vì báo "đã đẩy".

**Kèm — VÙNG TỚI HẠN TỐI THIỂU, và một chi phí ẩn to hơn cả bài toán khoá.** Merge nay chạy NGOÀI
khoá (khoá chỉ ôm phần ghi; merge lượt hai trong khoá bắt phần máy khác vừa nối). Trong lúc làm lộ
ra: `mergeContainer` **giải nén MỌI khối ra file tạm** rồi mới hỏi "đã merge chưa" ⇒ mỗi lượt sync
chép lại nguyên container — đo được **2,4 GB đọc / ~1 giờ** chỉ để kết luận KHÔNG có gì mới. Nay
chữ ký khối đọc **tại chỗ** (header là plaintext ở đầu khối) ⇒ khối đã biết bỏ qua gần như miễn phí.

**Cổng:** `drive-single-file.test.mjs` — ca ÂM *"khoá còn sống KHÔNG được cướp"* (đúng ca đã hỏng)
+ ca *"khoá chết thật thì máy sau vào được"* (không để một máy tắt làm kẹt cả hệ) + ca *"không có
gì mới thì không chép lại container"* + ca *"đoạn GHI vẫn phải có khoá"*. Ba đột biến, mỗi cái đỏ
đúng ca của nó.
⚠ **Cổng "cửa chặn rẻ" bản ĐẦU là TRANG TRÍ** — gỡ cửa chặn mà test vẫn xanh, vì "bỏ qua" và "chép
ra rồi mới bỏ qua" cho kết quả nhìn y hệt. Chỉ lộ khi chạy đột biến. Phải trưng cờ `cheap` ở kết
quả merge thì cổng mới đo được thứ nó khai là đang canh — đúng luật *"test mới phải chứng minh
mình ĐỎ ĐƯỢC"*.
⚠ Ca thứ hai gắn `timeout: 60s` có chủ đích: hỏng theo chiều *"không bao giờ coi là chết"* thì test
**TREO** chứ không đỏ — và treo trong gate là kiểu hỏng tệ hơn đỏ (hôm nay đã ngốn 15 phút im lặng
đúng vì một ca treo).

**Chưa đo, ghi rõ:** hành vi *"Drive đẻ conflicted copy"* và *"nối lên bản cũ làm mất khối"* nêu
theo cách Drive hoạt động, **chưa dựng phép thử hai máy thật**. Kèm một lỗ đã biết: nếu Drive đẻ
file trùng tên khác, code chỉ nhìn `global_memory.enc` ⇒ dữ liệu bản kia nằm chết, không ai báo.
