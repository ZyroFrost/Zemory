<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

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

⚠ **Ba lần TỰ SAI trong lượt vá, ghi vì cả ba đều suýt thành kết luận sai:**
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

## [2026-08-25c] — TIN VÀ VECTOR ĐI CÙNG CHUYẾN: vá lỗ chở vector (HP điều 16)

Diễn tập phục hồi đầu tiên (`plan/18 §4b`) dựng kho từ kênh chung: đường lùi CÒN SỐNG (7m42s ·
2.340 phiên · 300.421 tin), nhưng kho dựng ra **thiếu ~22.000 vector** so với kho gốc ⇒ máy nhận
phải nhúng lại **27.035 tin (~12 giờ)**, trái điều 16. Đối chiếu chéo 300/300 tin `prose` của
chính máy này: **có vector tại chỗ, không có trong gói** ⇒ không phải "máy kia chậm nhúng".

**Cơ chế:** gói chở vector KÈM đợt tin mới (cùng dải `id > watermark`), mà nhúng chạy SAU tin
~30 phút ⇒ lúc gói đi tin chưa có vector; khi vector có thì id đã nằm dưới watermark và không
lượt nào quay lại chở. GM xác nhận bệnh đã cắn thật: 13/08 máy kia merge xong còn **137.063 tin
cần nhúng**, chỉ thoát nhờ có người đẩy tay một gói full.

**Vá:** `embedFrontierId()` — gói DELTA dừng ngay trước tin đầu tiên chưa nhúng, tin và vector đi
cùng chuyến; watermark chỉ nhảy tới id ĐÃ GỬI. Ba chốt: kho chưa có vector nào ⇒ không chặn gì ·
chỉ tin trong 24 h mới được chặn (tin cũ không nhúng nổi mà chặn là sync đứng vĩnh viễn) · **chỉ
áp cho DELTA** — gói THAY THẾ (`since=0`: baseline · gộp · bàn giao) phải chở ĐỦ, vì gộp GHI ĐÈ
kho chung nên cắt ở ranh giới là **xoá tin khỏi kênh**. Vế thứ ba là lỗi do chính lượt vá này đẻ
ra, tự soi diff mới thấy; nay có cổng `CA MẤT DỮ LIỆU` + đột biến.

**Cổng:** `vector-ship.test.mjs` +3 ca (1 dương · 2 ÂM), mỗi ca đỏ được bằng một đột biến riêng.
⚠ Lượt đột biến đầu trượt regex ⇒ "8/8 xanh" khi đó là xanh GIẢ; phải cắt theo DÒNG mới tiêm được.

**Phần TỒN (~22k vector đã lỡ đi thiếu) — chữa bằng NỐI THÊM, không ghi đè.** Vá trên chỉ lo
chiều xuôi. Hai đường được cân: gộp container (`--compact`, viết lại 1,6 GB, ĐÈ kho chung) và bù
(`vectors-catchup`, nối một khối ~66 MB). **Chọn bù** — user chỉ đúng nguyên tắc: *"ghi đè sợ nó
lâu, nên B nếu không lệch data nào"*, và đó cũng là chữ của HP điều 16.

- **`zemory memory vectors-catchup [--dry-run]`** — dựng lại kho chung vào file TẠM (đúng thứ máy
  mới nhận được), so bằng khoá BỀN `(session_id, uuid)` chứ không phải `messages.id` (id là số cục
  bộ), rồi nối MỘT khối chở đúng phần thiếu. Không đụng byte cũ ⇒ máy khác đang đọc không bị ảnh
  hưởng. Cổng: ca dương + **ca ÂM** *"kênh đã đủ ⇒ không nối khối rác, container y nguyên"*.
- **`zemory memory sync --compact`** — giữ làm đường DỌN GỌN (gộp 26 khối về 1), có ca ÂM riêng:
  không cờ thì tuyệt đối chỉ `delta`, `removed=0`.

Mỗi ca đều có đột biến RIÊNG chứng minh đỏ được. ⚠ Bốn lỗi của chính lượt này, **ba do tự soi
diff mới thấy** chứ không cổng nào kêu: chặn-trên áp nhầm cả gói thay thế (mất tin khỏi kênh) ·
lệnh bù nối khối mà **không lấy khoá kênh** (hai máy nối cùng lúc là rách container) · không đánh
dấu khối của chính mình đã merge (lượt sau giải mã lại 66 MB để phát hiện "0 dòng mới"). Cái thứ
tư do test bắt: bảng bóng `vec_chunks_rowids` KHÔNG tồn tại ở kho chưa từng nhúng ⇒ `SQLITE_ERROR`
— mà đó đúng là ca lệnh này sinh ra để chữa. Kèm một bẫy thời gian: test gọi `syncDrive` quên cô
lập HOME ⇒ đi quét transcript THẬT, treo hơn **8 phút**.

## [2026-08-25b2] — soát plan bằng CODE: 8 dòng "chưa làm" hoá ra đã xong

Đo lại từng mục thay vì chép chữ: `memory promote` (04:25) · `vecship-chunks` (08 §8b) · MCP
`graph_impact`/`graph_neighbors` (13) · tray thật `platform/tray.ts` (14 §6.E) · nhúng `tool_use`
đã chạy — Bash 33.588 · Edit 21.534 · PowerShell 9.588 · Write 5.425, `EMBED_TOOLS_DEFAULT` nay là
mặc định ship (17 §3.2/§3c) · `git-history-secrets` 2 ca (18 ⑦) · `uplinkguard` (⑨) ·
`guard-tool-matrix` 26 ca trong gate chính (⑩). Phủ vector: prose 99,7% · tool_result 99,5% ·
tool_use 75,6% · tổng 92,1%.

Vì sao đáng ghi: sổ nói khác code làm MỌI phiên sau đo lại từ đầu — chính phiên này suýt xây lại
cổng lịch sử git vì plan ghi "còn nợ". Ghi rõ phần CHƯA đo: cổng nghiệm thu `@10` của `tool_use`
sau khi nhúng vẫn chưa ai chạy.

## [2026-08-25b1] — lớp GỘP near-dup: đo A/B trên 108 nhãn, GIỮ MẶC ĐỊNH BẬT

`plan/19 §4b` từng nghiêng "tắt gộp" theo thước NGHIÊM. Đo lại, đổi đúng một biến:
nghiêm `@10` 32% (bật) vs 45% (tắt) · **tương đương** `@10` 67 vs 66 · `@40` 76 vs 72 · MRR 0,443
vs 0,436. 13 điểm nghiêm "mất" CHÍNH LÀ thứ thước tương đương sinh ra để không phạt oan (gộp trả
đại diện cụm). Ở thước cầm lái, tắt gộp không mua được gì mà mất ở pool sâu ⇒ **không đổi code**.
Tốc độ không phải yếu tố: 6.409 vs 4.098 ms là **cache nóng** (chạy lại lượt BẬT sau ra 3.669 ms).
Ca âm không đổi ở cả hai cấu hình.

## [2026-08-25b] — THI HÀNH chuẩn mới xuống thực địa: `pipelines/` biến mất khỏi 4 repo

Chuẩn đổi ở entry dưới là CHỮ; đây là lượt nắn FOLDER THẬT. User chốt *"làm trọn từng cái, phải
check lại chuẩn từng cái, ko bị hư gì mới được"* nên làm từng repo, nghiệm thu xong mới sang repo kế.

| repo | dời | nắn đường | nghiệm thu |
|---|---|---|---|
| PBI_HR | 1 case + 2 file mail | 3 | `ready` exit 0 (DB thật 324.545 dòng) · import `graph_mail` từ `scripts/` OK |
| PBI_SALE | 1 case + 2 mail | 2 | `ready` exit 0 (két + Graph token) |
| Maintain | 3 case + 2 mail + `_legacy`(102 file)→`external/` | 11 | **38 PASS · 0 FAIL** · 3 cổng ready exit 0 |
| PBI_OPS | 5 case + 4 file dùng chung | 10 | vault 4 khoá · `monthly ready` exit 0 |

Cấu trúc đích: `bin/` chỉ LAUNCHER · `tasks/<case>/{spec·findings·SQL·pipeline/}` · `scripts/` code
dùng chung · `external/` code người khác. **`pipelines/` biến mất khỏi cả 4** (còn ở `Rebuild` là
ĐÚNG — repo theo NGUỒN). Mọi phép dời bằng `git mv` nên lịch sử còn nguyên; `conform ✓` cả 4.

**Phép nắn đường (chỗ dễ hỏng nhất):** `common.py` `parents[2]`→`[3]` (vào sâu một tầng) ·
`sys.path` trỏ mail đổi từ `parents[1]` (cũ = `pipelines/`) sang `parents[3]/"scripts"` · launcher
`%HERE%pipelines\<case>` → `%HERE%tasks\<case>\pipeline` · 5 `spec.md` của OPS + 2 repo khác.

⚠ **PBI_OPS phải nắn NGƯỢC trước:** phiên bên đó đã gộp `scripts/` vào `bin/` theo luật ⑤ (luật vừa
bị gỡ) ⇒ trả `vault.ps1` + `build_dashboard_tracker.py` về `scripts/`, `vault.cmd` trỏ lại
`%HERE%scripts\vault.ps1` — vẫn mở được két (4 khoá).

⚠ **Tự sai giữa đường, bắt được khi quét lại:** tính SAI độ sâu link tương đối (`../../../scripts/`
thay vì `../../`) ở 2 `spec.md`. Nay **0 link cũ** trên cả 4 repo.

**Hai tham chiếu chết CÓ SẴN — đánh dấu, KHÔNG tự đoán đích:** `Maintain/…/04_push_target.py` import
`common` từ case `SALE_Quarterly_Target` (case đã sang repo khác) · `PBI_SALE/…/PkdB2bYNhi/spec.md`
trỏ `_legacy/` mà SALE **chưa bao giờ có** (kiểm bằng bản sao lưu).

**Kèm:** đăng ký **14 skill mồ côi** ở 6 repo (`sync-path` · `write-style`…) — `sync` gap-fill file
nhưng file-wins nên không tự thêm dòng khai; nay `conform` 0 repo còn báo.

## [2026-08-25] — gỡ luật "ngưỡng gộp slot" (SAI) · thêm `external/` cho non-app · pipeline về TRONG case

> 🔄 **Supersede:** thay [2026-08-24l] — "vá 5 lỗ CHUẨN do thực địa báo", riêng mục ⑤ "NGƯỠNG GỘP SLOT ≥3 file" — đo lại thì mọi slot mỏng đều đang đúng chỗ, ép gộp là phá từ điển tên; luật còn hứa một phép kiểm `conform` chưa hề tồn tại. Bốn mục ①②③④ của entry đó GIỮ NGUYÊN.

**① GỠ luật ⑤ "slot <3 file thì gộp" — nó SAI, và chính tôi ship nó hôm qua.** Đo lại thực địa:
mọi slot "mỏng" đều đang chứa **đúng thứ tên slot nói** — `content/README.md` (INDEX case) ·
`scripts/vault.ps1` (**`common.py` neo cứng `REPO/scripts/vault.ps1`, dời là gãy**) ·
`measures/*.dax` · `sources/*.m`. Ép gộp cho đủ 3 file thì phá chính từ điển tên mà chuẩn dựng ra.
Luật còn hứa *"`conform` nhắc khi <3 file"* trong khi **conform không hề có phép kiểm đó** — luật
trỏ vào cái máy không tồn tại. Gỡ khỏi 3 bản chuẩn + **14 repo**.
⚠ Hệ quả đã xảy ra trước khi kịp gỡ: phiên PBI_OPS **đã thi hành nó** — xoá `queries/`, gộp
`check_*.sql` sang `sources/`. KHÔNG đảo lại (việc của phiên bên đó), nhưng doc bên đó nay trích
một luật không còn tồn tại. Đây là giá của việc ship một luật chưa cân kỹ.

**② THÊM `external/` vào chuẩn non-app** (lỗ ⑥ do thực địa báo). Đo: chuẩn app nhắc `external/`
**6 lần**, non-app **0** ⇒ code clone không có nhà, và **102 file ETL legacy** đã chui vào
`pipelines/_legacy` — làm hỏng nghĩa của chính `pipelines/`. Cùng định nghĩa bản app; `SLOT_ROLES`
đã có sẵn `external` nên máy không phải đổi.

**③ Pipeline về TRONG case** (lỗ ⑦): `tasks/<case>/pipeline/` là hình dạng chuẩn cho case-based —
mở một folder thấy spec + findings + script. **KHÔNG refactor một lượt**: case đang có thì dời khi
nào chạm tới nó (test của chính case làm lưới đỡ). `pipelines/<domain>/` **GIỮ** cho repo tổ chức
theo NGUỒN — `PBI_SasinFlow_Rebuild` không có `tasks/` nào, chỉ có `excel_loader` (12 file) +
`ipos_loader` (8 file). Số *"10/10 không ngoại lệ"* của báo cáo **sai vì chỉ đếm 4/6 repo**.

**④ BÁC gom `shared/`.** Đo tiền tố case toàn estate: **6/7 repo có case chỉ chứa MỘT phòng ban**
(OPS 10 case · SALE 4 · IT 4 · HR/IC/PUR 1), chỉ Maintain có hai (FIN 5 + MKT **1**). Tức **ranh
giới phòng ban ĐÃ LÀ ranh giới REPO** — tên repo chính là tên phòng ban — nên `shared/` chỉ vẽ lại
thứ đã có, thêm một tầng để đi qua. Thay bằng **một câu định tuyến** trong §4: *thuộc một case ⇒
`tasks/`+`data/` · dùng chung ⇒ slot theo vai trò · code người khác ⇒ `external/`*.

**Nghiệm thu:** `standard-parity` + `template-parity` + `structure-sync` **17/17** · 14/14 repo
nhận đủ (0 chỗ trượt neo) · **0 ký tự điều khiển** trên mọi file đụng tới · sao lưu 14 file.

**⑤ Vòng xoay backup bỏ quên file phụ — vá + cổng.** `rotateBackup` xoá `.db` nhưng để lại
`-shm`/`-wal`, nên mỗi lần xoay đẻ một cặp MỒ CÔI; đo trên kho thật: **6 file** của 3 bản đã bị
xoay đi từ 26/07 · 03/08 · 04/08 vẫn nằm đó. Rác nhỏ nhưng tích vĩnh viễn và làm thư mục sao lưu
đọc không ra bản nào còn sống. Vá: xoá kèm sidecar. Cổng: `backup-staleness` **6/6**, có **ca ÂM**
(sidecar của bản CÒN SỐNG không được đụng); **đột biến** bỏ hai dòng xoá sidecar ⇒ **ĐỎ**.
⚠ Lượt đột biến đầu **trượt regex nên không áp được** — hai dòng "6 pass" khi đó là xanh GIẢ, phải
đọc bản dịch thật rồi cắt theo DÒNG mới tái hiện được bug. Đã dọn 6 file mồ côi trên kho thật.

**Dọn `.bak` thừa:** 11 file ở 5 repo CÓ git (git đã giữ lịch sử) — trong đó `docs/agent/05_TODO.md.bak`
**167 KB nằm ngay trong thư mục harness luôn-nạp**. GIỮ 3 file ở `SasinInfra`/`SasinHarvest` vì hai
repo đó **không có git** — `.bak` là bản duy nhất.

## [2026-08-24m] — PUSH 2.5.0

Gate chạy một mình sau khi tắt daemon: **802/802 · 0 fail · 0 skipped** · `conform` ✓ 248 file ·
`todo verify` ✓ 0 mục · `validate` sạch. Bump 2.4.0→2.5.0, commit `b125975` (35 file,
+2.242/−329), cờ `.allow-push` một-lần → `4761125..b125975` lên `origin/main`, gỡ cờ ngay sau đó.

Nội dung bản này: `memory promote` (#12) · adapter `claude-code-memory` (#13) · cổng "không biết"
mặc định BẬT + sàn kích thước · `uplinkguard` · 5 lỗ chuẩn từ thực địa.

⚠ Guard chặn `git add -A` (chính lệnh đó từng đưa secret lên GitHub 04/08) ⇒ đi đường guard chỉ:
**liệt kê file tường minh**. Và cờ `.allow-push` phải tạo TRƯỚC lệnh push — hook soi lệnh trước khi
chạy nên `touch && push` trong cùng một dòng vẫn bị chặn.

**Kèm trong lượt:** dời launcher `.cmd` khỏi gốc sang `bin/` ở Maintain · PBI_HR · PBI_SALE (OPS do
phiên bên đó tự làm), vá `%~dp0` → `%~dp0..\` trong từng file — chạy thật 3 launcher xác nhận
dispatch đúng. Dựng lớp vault cho **PBI_SALE** (chép `scripts/vault.ps1` + `bin/vault.cmd` từ
PBI_HR): repo đó đã có sẵn 3 khoá trong két từ 05/08, chỉ thiếu **cửa mở két** ⇒ `quarterly ready`
từ đỏ thành **exit 0** mà không cần chạm giá trị bí mật nào.
