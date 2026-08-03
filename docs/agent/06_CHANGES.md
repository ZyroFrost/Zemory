<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-03j] — Lỗi TÔI vừa gây:  báo máy cài mới là KHO HỎNG

**Lộ ra khi user hỏi "cài mới chạy mới vẫn được đúng không" và tôi dựng thử một bản cài mới
hoàn toàn.** Đọc code không thấy — phải chạy thật mới thấy.

 mở kho bằng read-only. Kho **chưa tồn tại** (máy cài lần đầu) ⇒ SQLite trả
 ⇒ nó báo **"✗ HỎNG"** kèm lời khuyên đi  cứu dữ liệu.
Dọa oan ngay lần chạy đầu tiên. **Nặng hơn:** [2026-08-03d] đặt  ở **bước 0 chuỗi bảo
trì** và cho **DỪNG cả chuỗi** khi không ok ⇒ máy mới cài thì daemon **không scan / không embed
/ không digest / không backup** gì hết.

**Sửa:** . Trả  kèm chữ *"chưa có kho (máy
mới) — sẽ tạo khi dùng"*, và  in khác hẳn với "lành". Test hồi quy kèm theo.

**Đo lại bản cài mới, đầu tới cuối — mọi thứ còn lại BÌNH THƯỜNG:**
| | |
|---|---|
|  |  |
|  | **2 = FULL** (đổi ở [2026-08-03f], áp đúng cho kho mới) |
| schema | 20 · 58 bảng |
|  | **+90.780 tin / 104 phiên** |
|  sau khi ghi | ✓ lành |
|  | ra kết quả thật |
| kho THẬT của máy | ✓ lành |

⇒ **Sự cố hỏng kho [2026-08-03h] KHÔNG ảnh hưởng bản cài mới** — nguyên nhân là thư mục đồng bộ
đám mây, mà bản cài mới mặc định nằm ở , không phải vùng Drive. *(Việc  chưa
cảnh báo khi kho lỡ nằm trong vùng đồng bộ vẫn còn treo ở .)*

**Bài học lặp lại lần thứ ba trong ngày:** cả ba lỗi nặng nhất hôm nay đều **chỉ lộ ra khi chạy
thật** — engram 22 tool (đọc docs ra 20),  (đoán là rỗng), và lần này. Viết xong
một đường mới thì **phải chạy nó ở trạng thái TRẮNG**, không chỉ trên máy đã có sẵn dữ liệu.

## [2026-08-03i] — Bộ Cowork thứ hai: `cowork_global_memory` — dùng THẲNG zemory + GM

**Vì sao có bộ mới thay vì sửa bộ cũ:** bộ `cowork/` được thiết kế trên giả định *"máy ảo không
gọi được `zemory`, chỉ ra mạng được tới domain Anthropic"* — cả cơ chế MANIFEST + lối 0/1/2 đều
sinh ra từ đó. **Đo lại trên một máy thật (agent bên Cowork chạy, 2026-08-03): giả định SAI** —
có `node` v24 · `npm` v11 · `npm ping` PONG 736ms · `zemory` đã cài sẵn · đọc được cả thư mục
máy thật, mở được `global_memory.db` read-only qua `better-sqlite3` (65 object, schema v20, FTS
tra được trong 54ms).

Nhưng **KHÔNG lật ngược thành "luôn có"**: máy đó vốn đã cài zemory (junction) và đã mount sẵn;
máy mở Cowork lần đầu thì trắng. ⇒ **Giữ NGUYÊN bộ cũ làm đường lùi, thêm bộ mới có bước DÒ.**

- `docs_template/cowork_global_memory/` — `BOOTSTRAP.md` mở đầu bằng **§0 dò ba lệnh**
  (`node -v` · `npm ping` · `ls`); dò đạt thì `npm i -g zemory` → `zemory init --non-app` →
  `doctor` → `conform`. **Bỏ hẳn MANIFEST**: `init` rót bộ chuẩn từ bản gốc nên không bao giờ
  lệch phiên bản, và nhận được **bản ĐẦY ĐỦ** chứ không phải bản cắt gọn như bộ cũ buộc phải làm.
  Dò không đạt ⇒ tự bảo agent quay về `cowork/BOOTSTRAP.md`.
- **Điểm ăn tiền là Global Memory** — thứ chép file không bao giờ có được.
- **Và điểm nguy hiểm cũng ở đó, nên viết luật cứng:** ĐỌC thoải mái, **GHI phải hỏi user trước**
  (`scan`/`sync`/`embed`/`reindex`/`hook`). Lý do ghi thẳng vào file: GM là **một SQLite dùng
  chung**, máy thật có thể đang mở nó, và khoá ghi dựa trên **pid** nên **không phủ qua ranh giới
  máy ảo**. Kèm bắt buộc `memory verify` trước khi đụng, kiểm kho có nằm trong thư mục đồng bộ
  đám mây không, và trên Windows kiểm `fsutil hardlink list` — **đúng ba thứ vừa làm hỏng kho
  1,19 GB hôm nay** ([2026-08-03h]).
- **Luồng đầy đủ, không chỉ rót docs:** §0 dò → **§1 HỎI người dùng kho nhớ đặt ở đâu** →
  §2 cài + `memory relocate` về đúng chỗ + `verify` → §3 `init` bộ chuẩn → §4 `memory scan`
  quét nguồn → §5 giao diện → §6 đồng bộ Drive **để SAU**.
- **§1 là quyết định khó sửa nhất nên bắt HỎI trước khi cài gì**, kèm hai luật cứng:
  ① **không đặt trong thư mục đồng bộ đám mây** — đúng thứ vừa làm hỏng kho 1,19 GB hôm nay;
  ② **kho RIÊNG, KHÔNG trỏ vào kho của máy thật** — trỏ chung là hai bên cùng ghi mà khoá dựa
  trên pid không phủ qua ranh giới máy ảo. Gộp dữ liệu thì dùng export/import, không dùng
  chung tệp.
- Cảnh báo sẵn trong §2 rằng `relocate` **bỏ lại** `backups/`·`browser/`·`secrets/`+chìa — bắt
  agent kiểm thư mục cũ và dời tay (lỗ đã ghi ở `05_TODO`).
- **Trung thực về giới hạn:** §4 bắt nói thẳng khi quét ra **0 tin** (máy ảo trắng là bình
  thường), §5 bắt nói thẳng khi **giao diện không mở được** trong máy ảo — cấm báo "đã mở".
- Báo cáo cuối bắt **liệt kê từng lệnh đã GHI + ai cho phép**, hoặc nói rõ "không ghi gì".

## [2026-08-03h] — 🎯 NGUYÊN NHÂN GỐC: Google Drive đang đồng bộ chính file DB. Tôi đã loại sai.

> 🔄 **Supersede [2026-08-03b] · [2026-08-03d] · [2026-08-03f]** — mọi chỗ tôi viết *"đã loại:
> thư mục đồng bộ đám mây (D: là đĩa cục bộ, Drive nằm ở G: — điều 11 không bị vi phạm)"*.
> **SAI.** Tôi thấy Drive gắn ở `G:` rồi suy ra `D:` an toàn, **không kiểm** `D:\Zyro` có nằm
> trong vùng Drive đồng bộ không. Một lệnh là ra.

**Bằng chứng:**
```
fsutil hardlink list D:\Zyro\Tool\Zemory\data\global_memory.db
  \Zyro\.tmp.driveupload\423483          ← thư mục staging của Google Drive
  \Zyro\Tool\Zemory\data\global_memory.db
```
`D:\Zyro\.tmp.driveupload` + `.tmp.drivedownload` tồn tại, **sửa lần cuối cùng ngày**, và 2 tiến
trình `GoogleDriveFS` đang chạy. Tức Drive **hardlink file DB 1,19 GB ĐANG ĐƯỢC GHI vào staging
rồi upload**. Đây là **điều 11 bị vi phạm**, và là nguyên nhân hỏng SQLite kinh điển nhất: WAL
cần `.db` + `-wal` + `-shm` nhất quán VỚI NHAU, mà Drive chép từng file một lúc chúng đang đổi.

**Khớp toàn bộ dấu hiệu, kể cả những thứ giả thuyết cũ giải thích không nổi:**
| dấu hiệu | Drive sync? |
|---|---|
| Trang được cây trỏ tới mà **chưa bao giờ ghi xuống** | ✅ đúng chữ ký thao tác file mức HĐH trên DB WAL đang sống |
| Hỏng dồn ở cây FTS5 | ✅ cấu trúc bị ghi lại nhiều nhất |
| Giết tiến trình **0/8 không tái hiện** | ✅ vì kill không phải nguyên nhân |
| Không có sự kiện đĩa/điện nào | ✅ không cần |

**Đã xử lý:** `zemory memory relocate "D:\zemory-data"` — 1.140,7 MB · 200.327 tin đã kiểm ·
chỗ mới **chỉ còn MỘT hardlink** (Drive không với tới). `memory verify` → lành.

**Hai lỗ của `relocate` lộ ra khi làm (chưa sửa):**
- Nó in *"settings moved"* nhưng **bỏ lại** `backups/` (2,2 GB) · `browser/` (cookie) ·
  `imports/` · `logs/` · `cockpit/` · `context-guard/` — trái với comment trong `db.ts` vốn hứa
  *"relocating the data dir moves the whole cluster in one step"*. Phải dời tay.
- Tệ hơn: nó **bỏ lại `secrets/` và `share.key`** — tức chìa danh tính vẫn nằm trong thư mục
  đang được upload lên cloud. Đây là lỗ **điều 7**, không chỉ là bất tiện. Đã dời tay; cần sửa
  `relocate` cho đúng lời hứa của nó.

**Bài học, và nó cay:** tôi đã viết ba mục changelog truy nguyên nhân, dựng phép tái hiện, đo
`synchronous`, đổi cả pragma — trong khi câu trả lời nằm ở **một lệnh `fsutil` chưa ai gõ**. Và
người phát hiện không phải tôi: một agent khác tình cờ để ý `link count = 2`. Lần sau, với bất
kỳ nghi ngờ nào về hỏng file: **kiểm hardlink + thư mục đồng bộ TRƯỚC**, đừng suy luận từ code.
*(Các sửa ở [c]/[f] — bọc giao dịch vector, `synchronous = FULL`, `verify`, backup xoay vòng —
vẫn giữ: chúng đúng về nguyên tắc và rẻ. Chỉ đừng đọc chúng như "đã chữa nguyên nhân".)*

## [2026-08-03g] — Template thứ 4: hệ ADAPT — nhận repo CÓ SẴN cấu trúc riêng

**Vấn đề:** muốn dùng harness cho một repo **không phải của mình** (bên thứ ba · làm nhóm · có
CI/import khoá cứng theo tên folder). Hai chuẩn cũ đều ÉP folder: APP đòi `backend/`+`frontend/`,
NON-APP đòi deliverable+`tasks/`. Nắn repo người ta là phá đường import, CI, pre-commit và tài
liệu của họ.

**Cách giải — nắn HARNESS theo repo, không nắn repo:**
- `docs_template/adapt/` — bộ thứ 4. Khác ba bộ kia ở ĐÚNG MỘT chỗ: `03_STRUCTURE` không *quy
  định* cấu trúc mà *mô tả* cấu trúc rồi **khoá** lại. Mọi thứ còn lại (`01_CONSTITUTION`,
  `02_RULES`, skill, kỷ luật TODO/changelog) chép nguyên — chúng nói về *cách làm việc*, không
  về tên folder, nên không có gì để nắn.
- **Từ điển 54 slot KHÔNG được chép sang repo ngoài** — chỉ mang một **bảng dịch** slot↔đường
  thật. Chép từ điển là tạo bản sao thứ hai của chuẩn, sửa một chỗ thì các bản kia trôi lệch
  (phạm điều 3). Đây là lý do bộ này KHÔNG phải "một chuẩn mới".
- `.claude/skills/adopt/SKILL.md` — quy trình 4 bước: **hỏi user APP/NON-APP** (đừng đoán) → đọc
  cây THẬT → **đề xuất** bảng ánh xạ → **chờ NGƯỜI DUYỆT** → khoá vào `.harness.json`.
  Bỏ `reconcile` khỏi bộ này: nó nắn repo, đúng thứ hệ ADAPT cấm.
- `conform` thêm `layout: "foreign"`: đổi câu hỏi từ *"có đúng slot chuẩn không"* sang
  ***"có đúng bản đã KHAI không"***. Folder cấp 1 mọc thêm mà chưa khai ⇒ ĐỎ. Đường khai mà
  không tồn tại ⇒ ĐỎ.

**Cái bẫy trung tâm của thiết kế, và cách chặn:** nếu chuẩn uốn theo bất cứ thứ gì nó nhìn thấy
thì `conform` thành **lời nói vòng** — "repo tuân thủ đúng cái repo đang là", luôn xanh, gác con
số không. Cùng đúng một loại xanh-giả đã dính 3 lần trong ngày. Chặn bằng **duyệt + đóng băng**:
bảng chỉ có hiệu lực sau khi người duyệt, và từ đó cổng so thực tế với bản khoá.
Thêm một lớp nữa: `.harness.json` thiếu / gõ sai / **khai rỗng** ⇒ **rơi về cổng chuẩn**, KHÔNG
im lặng bỏ qua — một file gõ sai không được phép vô hiệu hoá cổng.

**5/5 test · 2/2 đột biến bị bắt** (bỏ luật khai-rỗng · bỏ kiểm đường-khai-không-tồn-tại).
**Một bẫy xanh-giả nữa đã sập ngay khi viết test này:** repo giả ban đầu chỉ có `pipelines/` và
`notebooks/` — hoá ra cả hai **LÀ slot hợp lệ**, nên cổng chuẩn không bao giờ nổ và phép kiểm
"phải rơi về cổng chuẩn" thành vô nghĩa. Phải thêm một thư mục chắc chắn không phải slot **và có
file trong đó** (thư mục RỖNG không có code để chấm — lần đầu tôi tạo thư mục mà quên ghi file).

## [2026-08-03f] — TÁI HIỆN: kill KHÔNG làm hỏng (0/8) ⇒ đổi `synchronous` sang FULL

**Phép tái hiện (`attic/repro/`):** ép một tiến trình chèn FTS5 liên tục — đúng tải ghi
per-message (giao dịch nhỏ, trigger đẩy vào `messages_fts` + `_tri`, FTS5 tự trộn) — để cây
lớn tới 5–17 MB rồi **SIGKILL giữa lúc đang ghi**, 8 lượt với thời điểm giết khác nhau.
**KẾT QUẢ: 0/8 lượt hỏng.** Đúng như tài liệu SQLite: giết một TIẾN TRÌNH không được phép làm
hỏng DB — WAL tự phục hồi lúc mở lại.

⇒ **LOẠI giả thuyết force-kill.** Tôi đã tự nhận 8 lần `Stop-Process -Force` hôm đó là biến số
do mình đưa vào; phép đo nói đó KHÔNG phải nguyên nhân. Ghi lại để không ai — kể cả tôi — đổ
lỗi sai chỗ ở lần sau.

**Còn lại đúng một hướng, và nó khớp chữ ký:** trang được cây trỏ tới nhưng **chưa bao giờ
xuống đĩa** = MẤT GHI ở tầng HĐH/đĩa. Máy này là laptop; nhật ký Windows có *"entering sleep —
Sleep Reason: Battery"* (02/08 19:11) cùng 51 lần vào/ra modern standby.

**Nên đổi `synchronous` NORMAL → FULL, và ĐÃ ĐO chi phí chứ không đoán.** Trên chính tải
per-message (200 giao dịch × 20 tin, có trigger FTS):
**NORMAL 12,3 ms/lượt → FULL 13,0 ms/lượt — đắt hơn 5% (0,7 ms).**
Với WAL, `NORMAL` không fsync ở mỗi commit còn `FULL` thì có. Đổi 0,7 ms lấy việc không mất
ghi khi máy ngủ / hết pin là quá rẻ.
*(Vẫn CHƯA chứng minh được đây là nguyên nhân — nhưng nó là phòng thủ đúng chỗ, rẻ, và không
phụ thuộc vào việc có tìm ra nguyên nhân hay không.)*

## [2026-08-03e] — VẬT CHỨNG lật lại kết luận của tôi: hỏng là MẤT ĐUÔI FILE, không phải tranh chấp ghi

> 🔄 **Supersede [2026-08-03c] §"bọc giao dịch":** tôi đã viết rằng `vec_hash` 119.784 vs
> `vec_chunks` 142.840 là *bằng chứng* đường ghi vector không nguyên tử. **SAI.** Chính comment
> trong `vectors.ts` nói `vec_hash` **điền dần** ("fills lazily from now on, converging within
> days") — chênh lệch đó là **THIẾT KẾ**, không phải hỏng. Tôi lấy một con số bình thường làm
> bằng chứng cho giả thuyết mình đang tin. Việc bọc giao dịch vẫn đúng về nguyên tắc và giữ
> lại, nhưng nó **KHÔNG được chống lưng bởi vật chứng này**.

**Trước khi xoá bản hỏng (user duyệt: khôi phục được từ nguồn rồi thì không cần giữ 2,1 GB),
tôi vắt lấy vật chứng — và nó nói khác hẳn:** (`data/corrupt-20260803-forensic.txt`)

- **Hỏng CHỈ nằm ở cây bóng của FTS5.** Đọc được bình thường: `messages` 198.902 · `sessions`
  1.272 · `attachment` 3.940 · **`vec_chunks_rowids` 142.840 · `vec_map` 5.241 · `vec_hash`
  119.784 · `vec_chunks_chunks` · `vec_chunks_vector_chunks00`** — **toàn bộ bảng vector LÀNH.**
  Hỏng đúng: `messages_fts` · `messages_fts_data` · `messages_fts_tri*` · `section_fts*` ·
  `changelog_fts*` · `session_digest_fts_tri_data`.
- **Chữ ký của lỗi là DANGLING POINTER VƯỢT CUỐI FILE:** `page_count = 262534`, mà cây B trỏ
  tới `page 263511`, `263214`, `262698`… — **gần 1.000 trang (~4 MB) được tham chiếu nhưng
  KHÔNG TỒN TẠI trong file**. File khớp đúng header của nó (262.534 × 4.096 = 1.075.339.264
  byte = đúng kích thước thật), tức **không phải file bị cắt cụt — mà là những trang đó chưa
  bao giờ được ghi xuống**, trong khi cây đã trỏ vào chúng.
- **⇒ Đây KHÔNG phải chữ ký của hai tiến trình ghi xen kẽ.** Tranh chấp ghi cho ra lệch LOGIC
  giữa các bảng; nó không tạo được con trỏ vượt cuối file. Chữ ký này là **một lượt mở rộng DB
  bị đứt giữa chừng** — cây B đã commit phần trỏ, phần trang mới thì không xuống đĩa.
- **Khớp với thứ MỚI xuất hiện đúng hôm đó:** 02/08 là ngày đầu chạy **ghi per-message**, nên
  FTS5 bị chèn + tự trộn (automerge) liên tục hàng trăm lần — đúng cấu trúc bị hỏng. Cộng với
  **8 lần daemon bị `Stop-Process -Force`** (tôi làm), tức kill có thể rơi giữa một lượt
  checkpoint. Bảng NGUỒN hầu như không đổi cấu trúc nên sống sót; cây FTS bị nắn liên tục nên
  chết. **Vẫn CHƯA tái hiện được ⇒ vẫn chưa gọi là kết luận.**
- **Bài học về chính tôi, ghi để nhớ:** tôi đã có vật chứng này trong tay từ đầu (bản hỏng nằm
  đó suốt) nhưng đi suy luận từ code trước, rồi *chọn* con số hợp với giả thuyết. Lẽ ra phải
  chạy `quick_check` và liệt kê bảng nào đọc được **NGAY** — mất 30 giây và nó chỉ thẳng chỗ.

## [2026-08-03d] — Dò tiếp nguyên nhân: loại thêm 3 nghi can · dựng đường QUÉT LẠI TỪ NGUỒN

**Dò (nhật ký Windows + đọc code) — loại được ba nghi can, KHÔNG tìm ra nguyên nhân:**
- **Đĩa hỏng: LOẠI.** Ngày 03/08 không có sự kiện lỗi đĩa nào. Lần `disk 153` (thử lại I/O)
  gần nhất là **01/08** trên Disk 1.
- **Mất điện / tắt máy bẩn: LOẠI.** `Kernel-Power 41` gần nhất là **30/07**, không phải 03/08.
  (Có một lần ngủ vì hết pin 02/08 19:11 — vẫn TRƯỚC mốc "sáng 03/08 integrity_check còn ok".)
- **Ghi bảng bóng bằng kết nối thiếu `vec0`: LOẠI.** Soi hết repo: `vec_chunks`/`vec_map`/
  `vec_hash` chỉ được đụng trong `vectors.ts` và `salvage.ts`, cả hai đều qua `vecConnect`.
⇒ Không phải phần cứng, không phải điện. Nghi can còn lại vẫn là tranh chấp ghi phần mềm —
  **nhưng chưa tái hiện được nên vẫn KHÔNG gọi là tìm ra nguyên nhân gốc.**

**Vì chưa fix được nguyên nhân, dựng đường SỐNG cho lần sau (user chỉ đạo: "ko fix dc thì
phải scan lại từ source"):**
- **`memory verify`** — kho có lành không. Trước đây **KHÔNG AI HỎI câu này**: kho hỏng lúc nào
  không rõ, chỉ lộ ra vì tình cờ chạy bench. Nay nằm ở **bước 0 của chuỗi bảo trì daemon**, và
  hỏng thì **DỪNG cả chuỗi** — ghi tiếp vào file hỏng chỉ hỏng thêm, mà còn đè lên bản sao lưu
  đang tốt. Dùng `quick_check` (nhanh hơn `integrity_check` nhiều trên file 1 GB).
- **`memory reopen`** — mở lại đường nạp cho phiên bị thủng để `scan` kéo lại từ transcript
  GỐC. Đây là thứ đã cho lượt cứu hôm nay về **đủ 100%**, và giờ là một lệnh thay vì mò tay.
  Chỉ đụng phiên có `message_count` lệch số tin thật — không bắt máy đọc lại cả kho.
- **7/7 test xanh · 1/2 đột biến bị bắt.**
- **⚠ Đột biến KHÔNG bắt được, ghi thẳng ra:** bỏ dòng "đọc thử một dòng mỗi bảng nguồn" trong
  `verifyMemory` thì test **vẫn xanh** — `quick_check` đã đủ bắt mọi cảnh tôi dựng được. Giữ
  dòng đó vì tài liệu SQLite nói `quick_check` không chạm dữ liệu, **chứ không phải vì đã đo**.
  Đã ghi cảnh báo ngay tại chỗ trong code.

## [2026-08-03c] — Sau sự cố: bọc giao dịch đường ghi vector · backup tự xoay vòng

Hai việc PHÒNG NGỪA, cả hai sinh thẳng từ bằng chứng của sự cố [2026-08-03b], không phải phòng xa.

- **Bọc `vec_map` + `vec_chunks` + `vec_hash` vào MỘT giao dịch** (`vectors.ts` §`insTx`/`copyTx`).
  Trước đó là ba autocommit rời và `vec_map` được ghi **trước** vector — đúng khuôn của trạng
  thái tìm thấy trong DB hỏng (`vec_map` trỏ tới rowid `vec_chunks` không có; `vec_hash`
  119.784 vs `vec_chunks` 142.840). Chính comment cũ trong `writeVectorRaw` đã tự thú có kẻ
  ghi song song: *"…if another writer already filled it"*. Sửa cả ba đường: embed mới, chép
  dedup, và bản sao trong-lượt.
- **⚠ Phép kiểm kèm theo KHÔNG chứng minh được tính nguyên tử — tôi đã thử đột biến và nó vẫn
  XANH.** Gỡ `db.transaction` ra thì `vector-write-atomic.test.mjs` vẫn qua, vì trong một tiến
  trình không bị ngắt hai lệnh rời vẫn thành công cả hai. Muốn phân biệt phải ngắt đúng khe
  giữa hai lệnh — cần hai tiến trình tranh chấp hoặc kill giữa chừng, cả hai đều không tất
  định nên không đưa vào cổng. Giữ nó làm **chốt hồi quy** (ai đó đổi thứ tự ghi / bỏ sót dọn
  map cũ) và ghi rõ giới hạn ngay trong đầu file, để không ai đọc cổng xanh thành "đã chứng
  minh". Bằng chứng cho tính nguyên tử nằm ở chỗ code có bọc giao dịch, không ở phép kiểm.
- **`backup-rotate.ts` — sao lưu định kỳ + tự dọn.** Một bản/ngày, giữ 5 bản, nối vào cuối
  chuỗi bảo trì của daemon (`scan → embed → digest → backup`) nên nằm TRONG token job, không
  bao giờ chép 1,1 GB lúc có tiến trình khác đang ghi. Chép bằng `db.backup()` của SQLite chứ
  không `copyFile` — chép byte một file đang mở WAL cho ra bản RÁCH, đúng cái bẫy làm người ta
  tưởng mình có backup mà không có. Dọn CHỈ đụng file khớp khuôn tên `global_memory-<ISO>.db`.
  **3/3 đột biến bị bắt** (bỏ lọc tên · bỏ kiểm hạn · cho phép xoá bản mới nhất) — phép kiểm
  này thì đỏ được thật.
- **Lý do có `keep`/`everyMs` mà không phải cron hệ điều hành:** khoảng hở phải do MÁY giữ, và
  phải giữ ở nơi biết được lúc nào an toàn để chép. Cron ngoài không biết daemon đang embed.
- **Write-gate thành KHOÁ THẬT (`writegate.ts` §khoá xuyên tiến trình).** Bản cũ
  `acquireCliWrite()` chỉ đặt một mốc thời gian và **không bao giờ từ chối** — hai CLI cùng
  gọi đều nhận `{ok:true}`. Nó một chiều: chỉ bảo *scheduler daemon* nhường, không loại trừ
  CLI↔CLI. Và CLI hỏi qua HTTP nên **daemon chết ⇒ không còn cổng nào** — đúng cảnh ngày hỏng
  (daemon khởi động 8 lần gần như không lần nào tắt sạch, hook `scan` mỗi lượt trả lời, cộng
  `memory embed` gõ tay). Nay khoá nằm ở FILE (`cli-write.lock`, kèm pid + nhãn + mốc):
  mọi tiến trình đều thấy, sống sót qua việc daemon chết, **từ chối** khi người khác đang giữ,
  và tự nhả khi chủ chết hoặc quá 15 phút (điều 9 — không được kẹt vĩnh viễn). Đặt được khoá
  hay không thì lệnh **vẫn chạy** sau 2 phút chờ: khoá là cố vấn, không phải chỗ treo việc.
  **6/6 test xanh, 2/2 đột biến bị bắt** (bỏ luật từ chối · bỏ kiểm chủ khoá khi nhả).
- **Một bẫy test đã sập rồi mới thấy:** bản đầu dùng `pid: 1` để giả "tiến trình khác còn
  sống" — trên Windows pid 1 KHÔNG tồn tại (`ESRCH`) nên khoá bị coi là mồ côi và mọi phép
  kiểm "phải từ chối" đều **xanh giả**. Và `GLOBAL_MEMORY_DB` bị chốt lúc nạp module nên
  import tĩnh khiến khoá rơi vào `data/` THẬT — test tự ghi vào kho thật rồi đọc file khác.
  Cả hai đều là xanh-giả, đều ghi lại ngay trong đầu file test.

## [2026-08-03b] — DB THẬT HỎNG: phục hồi **ĐỦ 100%** · thêm `memory salvage` · một chỗ tôi ghi sai

**Sự cố.** Đang dựng corpus đo rerank thì kho báo `database disk image is malformed`. Sáng
cùng ngày `integrity_check` còn **ok** ⇒ hỏng xảy ra trong hôm nay.

- **Hỏng ở đâu:** nặng nhất là bảng bóng FTS (`messages_fts*` · `section_fts*` ·
  `changelog_fts*` · `session_digest_fts_tri*`) và chỉ mục vector — toàn lớp DẪN XUẤT. Nhưng
  **chạm cả bảng nguồn**: `messages` · `attachment` · `section` · `changelog` · `vec_map`.
- **Sai lầm suýt mắc khi đo thiệt hại:** `SELECT *` một lượt **DỪNG ở trang hỏng đầu tiên**,
  báo "đọc được 197.323/198.902" ⇒ tưởng mất 1.579 tin. Đọc lại theo **LÔ rowid, lô nào lỗi
  thì chia đôi xuống tới từng dòng** ⇒ cứu được **198.758 — mất 144 (0,07%)**. Chênh hơn 1.400
  dòng chỉ vì cách đọc. Tương tự: `attachment` 3.935/3.940 · `section` 758/768 ·
  `changelog` 216/218 (hai cái sau dựng lại từ `.md`, coi như không mất).
- **`zemory memory salvage`** — biến việc cứu thành năng lực, không phải script tạm: mở file
  gốc READ-ONLY, vét sang DB mới bằng đúng thuật toán chia-đôi trên, rồi dựng lại FTS từ nội
  dung nguồn. Không chép mù lớp dẫn xuất.
- **Bốn lỗi của tôi trong lúc cứu — mất 4 lượt chạy mới ra, ghi để không ai mò lại:**
  ① vòng chép 142k vector **không bọc transaction** ⇒ với WAL là 142k lần commit+fsync ⇒ treo.
  ② duyệt theo **khoảng rowid** (`lo += n`) trong khi rowid của chunk bắt đầu từ **2^40** —
  offset CÓ CHỦ ĐÍCH chứ không phải rowid hỏng như tôi tưởng ⇒ vòng lặp cần 220 triệu lượt.
  ③ bảng ảo `vec0` **không nhận** `WHERE rowid > ? ORDER BY rowid`; phải lấy rowid từ bảng
  bóng rồi nạp bằng `rowid IN (…)` (đã DÒ THẬT ba dạng truy vấn mới biết).
  ④ better-sqlite3 trả integer dạng `number` (float64) ⇒ vec0 từ chối *"Only integers are
  allowed for primary key values"*; phải bật `safeIntegers` (BigInt).
  **Lỗi ④ ẩn suốt ba lượt vì các khối `catch` của tôi NUỐT lỗi** — chỉ in "0 vector" mà không
  nói vì sao. In lỗi thật ra là tìm được trong một phút. Cộng thêm một lần **pipe qua `tail`
  nuốt hết output** nên tưởng tiến trình đã chết.
  Sau khi sửa: **120.000 vector trong 50 giây**.
- **KẾT QUẢ CUỐI: mất 0 tin.** Sau khi đổi chỗ, 144 tin nằm trên trang hỏng hoá ra dồn vào
  đúng **2 phiên** (102 + 42) — tức vùng hỏng là vùng ghi GẦN NHẤT, một manh mối mạnh. Mà
  transcript gốc `.jsonl` của hai phiên đó **vẫn còn trên đĩa**, nên chỉ cần đặt
  `ingest_state.last_line = 0` cho hai file rồi `memory scan`: `UNIQUE(session_id, uuid)` bỏ
  qua tin đã có và chèn đúng phần thiếu. **+602 tin** (144 cứu lại + 458 mới) ⇒
  **199.360 tin · 1.272 phiên**, NHIỀU HƠN cả trước khi hỏng.
  ⇒ Bài học dùng lại được: `salvage` KHÔNG phải bước cuối. Với dữ liệu nạp từ file, **nguồn
  thật là transcript trên đĩa**, DB chỉ là chỉ mục (đúng "file wins") — cứu xong phải quét lại.
- **Kiểm chứng trước khi đổi chỗ, không đổi mù:** `integrity_check: ok` · 7/7 chỉ mục FTS dựng
  lại (`messages_fts_tri` nặng nhất, 105s) · FTS tra thật `"zemory"` ra 31.748 dòng · tìm kiếm
  qua CLI chạy đủ ba lớp (FTS + vector + rerank). Bản hỏng giữ nguyên 2 bản ở
  `data/corrupt-20260803-091106/`, không xoá gì.
- **Còn thiếu, đang vá nền:** 127.700/142.840 vector cứu được (phần còn lại nằm trong vùng
  hỏng); `vectorRemaining` = **15.718** tin cần embed lại (thấp vậy nhờ `vec_hash` khử trùng
  lặp). Vector là lớp dẫn xuất nên vá được bằng máy cục bộ.
- **⚠ MỘT CHỖ TÔI GHI SAI, tự sửa:** tôi đã ghi ở đây rằng `data/backups/` **RỖNG** và "không
  có bản lùi nào". **Sai.** Trong đó có `global_memory-2026-07-26…db` — 1,12 GB, **171.345
  tin · 1.203 phiên**, mở ra đọc được. Tôi kết luận từ một lần `ls` sai chỗ và không kiểm lại
  trước khi viết vào sổ — đúng cái lỗi mà chính bản ghi hôm nay đã dạy ở mục engram (*"tài
  liệu không phải phép đo"*), lần này tôi mắc với chính máy mình.
  Việc cứu vẫn là lựa chọn đúng — nó cho 199.360 tin so với 171.345 của bản lùi — nhưng lý do
  phải là **"cứu được nhiều hơn"**, không phải "không còn đường nào khác".
  Vấn đề THẬT còn lại: backup đang chạy TAY, khoảng hở gần nhất là **8 ngày**. Cần lịch tự
  động. Đã tạo bản 03/08 ngay sau khi cứu xong.
- **Nguyên nhân gốc: CHƯA kết luận.** Đã loại: đĩa đầy (còn 168 GB) · thư mục cloud-sync (D:
  cục bộ, Drive ở G: — điều 11 không bị phạm). Nghi nhưng chưa chứng minh: hôm nay là ngày
  ĐẦU chạy **ghi per-message**, tức tiến trình ngắn hạn ghi xen kẽ daemon + embed nền, và
  `daemon.log` ghi **8 lần khởi động trong ~6 giờ, gần như không lần nào tắt sạch** (tôi
  `Stop-Process -Force` để chạy gate). WAL vốn chịu được kill nên riêng điều đó chưa đủ giải
  thích — nhưng hỏng bắt đầu đúng ở hai cấu trúc do **extension/virtual table** quản lý.
  Chi tiết + việc còn lại: `05_TODO §DB THẬT BỊ HỎNG`.

## [2026-08-03] — Audit 6 mặt: 3 lỗ THẬT, đau nhất là agent trả 30s mỗi lần tìm

- **`memory_search` qua MCP tốn 27–34s MỖI LẦN** — đợt trước tôi sửa đường UI mà **bỏ sót
  đường agent**, vốn là đường bị gọi nhiều nhất. Đo trong tiến trình đã ấm (kho 198.334 tin):
  **FTS 172ms · hybrid 746ms · hybrid+rerank 29.420ms** ⇒ thủ phạm là **rerank, không phải
  hybrid** (40×). Nay mặc định hybrid-không-rerank, `deep=true` mới thêm rerank: đo lại
  **0,9–1,05s** (lần đầu 9,7s vì nạp model). Mô tả tool nói thẳng cái GIÁ.
  ⚠ **Sửa cách diễn đạt của chính mục này:** câu *"rerank chưa từng thắng hybrid (8/8 = 8/8)"*
  ĐÚNG số nhưng dễ hiểu thành "rerank vô dụng" — corpus gate chỉ **8 truy vấn** và hybrid đã
  bão hoà, nên nó **không thể** cho rerank cơ hội thắng. Rerank vẫn là thành phần chuẩn của
  RAG (cross-encoder cho query và doc "nhìn" nhau, bi-encoder thì không); việc phải làm là
  làm nó RẺ, không phải bỏ — xem `05_TODO §RERANK`.
- **Daemon trả 200 + HTML cho MỌI đường lạ.** Bắt được bằng chính phép quét của mình: nó gọi
  `/scope-tree` (KHÔNG tồn tại — dữ liệu nằm trong `/memory-status`) và nhận 200, nên bảng
  kết quả báo "TẤT CẢ 200" trong khi một mục là hư không. Client gõ sai tên endpoint cũng
  nhận HTML rồi vỡ ở `JSON.parse`. Nay chỉ `/` và `/app` được vỏ app, còn lại **404 JSON**.
  *(Phép quét cũng đã sửa: thêm vế "đường lạ PHẢI 404" — "tất cả 200" mà không kiểm vế này
  thì không chứng minh được gì.)*
- **Hai danh sách móc có thể lệch nhau mà không ai biết:** `ZEMORY_HOOKS` (khai vào settings
  của host) và bộ sự kiện `cmdHook` chấp nhận. Lệch một cái ⇒ host gọi, CLI in `usage:` ⇒
  hook hỏng LẶNG, triệu chứng duy nhất là bộ nhớ thiếu tin. Đã chạy thật cả 4 (đều dispatch
  được) và thêm gate parity.
- **Sạch ở các mặt còn lại:** gate 481/481 · `conform` ✓ · `integrity_check ok` · schema v20 ·
  **0 mồ côi** (3 phép đo) · digest **1.272/1.272** · **0 nhóm project tách tên** (sau đợt gộp
  hôm qua) · 44/44 neo test trỏ file sống · endpoint parity chỉ còn false-positive `'/set-'+x`
  đã biết · 14 endpoint sống 200 + 3 đường lạ 404.
- **Nghi vấn đã loại:** "137 export mồ côi" — 136 là type/interface hoặc dùng nội bộ; chết
  thật vẫn chỉ `resolveDocPath` (cố ý giữ). · "engram có tool đo context" — regex khớp
  `mem_save` chỉ vì ví dụ trong mô tả có chữ *jsonwebtoken*; đọc từng tool thì engram **không
  có** tool nào đo context/nén.

Gate 478 → **481** · đột biến: rerank-mặc-định · 404-đường-lạ · parity-móc — **3/3 đỏ**.

## [2026-08-02i] — Tìm kiếm về lại HAI LỚP (rẻ trước, sâu khi xin) · gộp 23 project bị tách

- **F6 — daemon hết nghẹt.** `/memory-search` gọi thẳng `recall()` = hybrid + rerank cho MỌI
  lần gõ, ngay trên event loop. Đo trên kho thật (196.894 tin): **FTS 360ms · hybrid 20,5s ·
  hybrid+rerank 63,6s** (51s cả khi model đã ấm). Nay mặc định là lớp RẺ; lớp ngữ nghĩa chỉ
  chạy khi xin `deep=1` **và chạy ở tiến trình con**. Đo sống qua daemon: tìm nhanh
  **44–139ms** khi ấm (lượt ĐẦU sau khi daemon vừa bật, lại trúng lúc `embed --all` chạy:
  13,2s — nói ra để không ai tưởng lúc nào cũng 40ms), tìm sâu 51,5s mà `/ping` vẫn **6ms**
  và `/memory-status` **409ms** — trước đây mọi endpoint đứng 48s.
  Đây là quay về đúng điều 8 (progressive disclosure) mà bề mặt đã trôi khỏi — user chỉ ra:
  *"logic search ban đầu là search bộ lọc mà, rồi khi cần mới search full GM"*.
- **UI có chip `🔬 Tìm sâu`** — lựa chọn TỪNG LƯỢT, không lấy từ setting máy (máy này
  `hybrid=true` sẵn; đọc theo nó là mọi lượt tìm lại rơi vào đường 20–60s). Hai chip
  `Hybrid`/`Rerank` cũ giữ nguyên vai **công tắc engine của MÁY** (dùng cho lượt sâu + CLI +
  MCP) và nay nói rõ điều đó trong tooltip — trước đây chúng hứa đổi kết quả tìm, mà sau khi
  tách lớp thì không còn đúng. Lượt sâu có nhãn chờ riêng; hỏng/quá giờ thì **nói ra**, không
  hiện "0 kết quả" (hai thứ đó trông y hệt nhau).
- **F5 — gộp xong 23 nhóm project bị tách tên** (user duyệt). 115 phiên trỏ lại, **44ms**;
  khoá project **135 → 112**; phiên/tin **không đổi** (1.272 / 198.179) — không xoá dòng nào.
  Riêng repo này gom về **29 phiên · 35.941 tin** (trước nằm hai khoá 24+5). `cwd` gốc giữ
  nguyên cách viết cũ ở **59 phiên** ⇒ vẫn truy ngược được nó vốn thuộc chỗ nào.
- **Bấm nhầm `/compact` rồi huỷ — nay không còn tính là một chu kỳ.** Cờ cảnh báo mở lại dựa
  trên **DẤU VẾT** `compact_boundary` trong transcript (host chỉ ghi khi nén THẬT xảy ra),
  không dựa vào việc móc `PreCompact` đã nổ. Kèm bẫy đã trả giá lúc đo: chuỗi
  `"compact_boundary"` cũng xuất hiện trong nội dung chat (phiên đang BÀN về compact bị đếm
  thành lần nén) ⇒ chỉ nhận bản ghi có đủ `type=system` + `subtype` + `compactMetadata`.
- **Bối cảnh đo được, để khỏi đoán:** 30 lần nén thật trên máy — **27 auto · 3 tay**; p50 nén
  ở **1.000.183** token nhưng có ca auto ở **711.803** và thấp nhất **342.068** ⇒ ngưỡng 95%
  KHÔNG phải lưới duy nhất, `PreCompact` mới là thứ chạy bất kể nén sớm hay muộn.
- **`memory search --json`** — đường máy-đọc cho tiến trình con. **PowerShell làm hỏng encoding
  một file test** (`Get-Content -Raw` đọc bằng ANSI rồi ghi lại UTF-8): khôi phục từ git, và
  bài học là sửa văn bản bằng công cụ sửa file, không bằng `-replace` của shell.

Gate 475 → **478** · `conform` ✓ · đột biến: dấu-vết-nén 2/2 · "UI mặc định phải rẻ" 2/2 ·
chip Tìm sâu 2/2 — tất cả đỏ. *(Một phép đếm trong test tự nó sai lúc đầu: đếm cả chuỗi nằm
trong biểu thức ba ngôi nên ra 3 thay vì 2 — sửa bằng cách đếm trong đúng hai khối từ điển.)*

## [2026-08-02h] — Nạp bộ nhớ chuyển sang PER-MESSAGE · đồng hồ context · lưới sau khi nén

> 🔄 **Supersede:** thay [2026-07-30d] — "daemon KHÔNG hề scan" — ở phần NHỊP: chuỗi nền
> vẫn còn nhưng thôi làm đường nạp chính. User chốt: *"nhịp 10' là lần đó chưa xét kỹ — mỗi
> 1 mes phải tự đưa lên luôn mới đúng"*.

- **Vì sao đổi (số, không phải cảm tính):** poll trả tiền theo THỜI GIAN — 6 lần scan/giờ kể
  cả máy rảnh, 1,8–7,2s/lần — và vẫn trễ tới 10 phút. Hook trả theo CÔNG VIỆC: không tin thì
  0 chạy, có tin thì **~320ms** cả tiến trình (việc thật 5–71ms). Rẻ hơn, lại tươi hơn.
- **`scanOneFile`** nạp đúng MỘT transcript từ `transcript_path` của host, bỏ hẳn khâu
  discover. Không nhận diện được đường ⇒ trả "không nhận", **KHÔNG** lặng lẽ rơi về quét cả
  kho. Write-gate bận ⇒ bỏ qua ngay (chờ là ~125s/lượt), lưới bù lượm.
- **Bốn móc, mỗi cái một vai:** `Stop` nạp mỗi lượt · `UserPromptSubmit` im tuyệt đối tới
  95% rồi **chốt sổ + cảnh báo MỘT lần/phiên** · `PreCompact` nạp nốt trước khi nén ·
  `SessionStart` **chỉ** nói khi `source=compact` — auto-inject đầu tiên của hệ: một thẻ
  795 B, đúng sự kiện agent vừa mất trí nhớ, không phải memory mỗi prompt (điều 8).
- **Scheduler teo thành LƯỚI BÙ** (10' → 30'): embed · digest sweep · quét vét nguồn không
  hook · poll chiều import. Drive giữ nguyên nhịp 30' hai chiều theo user chốt.
- **Ba lỗi THẬT bắt được lúc chạy bề mặt sống, không phải khi đọc code:** ① hook hét
  **"Context ~295%"** (transcript ghi `claude-opus-5` ⇒ tính theo 200k trong khi phiên chạy
  1M) — nay `windowFor` **tự sửa**: phiên không thể vượt cửa sổ của chính nó nên số >100% là
  bằng chứng giả định sai ⇒ nâng bậc; vượt cả bậc cao nhất ⇒ IM thay vì hét bậy. ②
  `readStdin` cắm `setTimeout(800)` **không `unref`** ⇒ mỗi lần gọi hook chờ thừa 800ms. ③
  `memory_doctor` gọi thật mất **48s** ⇒ tách cờ `deep` (lượt nhanh **186ms**, khai `notProbed`).
- **CLI tách lối tắt cho `hook`** (nạp động) — 400ms → **232–320ms**; lệnh khác giữ đường cũ.
- **F1/F4 của audit sáng nay** xử luôn: doctor probe đúng thứ nó hứa · gom 5 bản so-path về
  `core/config::projectKey` (`graph-memory` CỐ Ý giữ riêng: id node dùng `/`, đã ghi rõ).
- **Một test của tôi XANH GIẢ, tự bắt bằng đột biến:** F1 chỉ soi CHỮ trong source nên gỡ
  hẳn hai key khỏi vòng probe vẫn xanh — viết lại thành kiểm hành vi.

- **Cảnh báo là một lần mỗi CHU KỲ ĐẦY, không phải mỗi phiên** (user hỏi "lâu lâu bị nén dù
  chưa tới hạn" ⇒ đo 30 lần nén thật trên máy: **27 auto · 3 manual**; p50 nén ở
  **1.000.183** token nhưng có ca auto ở **711.803** và thấp nhất **342.068**; **7/19 phiên
  bị nén >1 lần**, cá biệt **6 lần**). Vậy hai điều: ① ngưỡng 95% KHÔNG phải lưới duy nhất —
  `PreCompact` chạy cho cả nén tay lẫn nén tự động nên không phụ thuộc lúc nào nổ; ② cờ
  "đã cảnh báo" nay được XOÁ khi nén, nếu không thì từ lần nén thứ hai trở đi im lặng.

Gate 462 → **475** · `conform` ✓ · đột biến realtime **8/8** đỏ, F1 **2/2**, F4 (phải gỡ cả
hai cơ chế mới đỏ — chúng dự phòng nhau).

## [2026-08-02g] — Chạy engram THẬT (v1.20.0) rồi mới so — hai chỗ hôm nay tôi đo sai

> 🔄 **Supersede:** thay [2026-08-02e] — "Soát sổ: 6 mục chưa làm thực ra đã xong · 3 tiền đề
> sai" — ở đúng một gạch đầu dòng: số tool của engram và chuyện họ có pin hay không.

Tải bản phát hành windows_amd64 (**khớp checksum công bố**), chạy trong HOME sandbox, bơm
JSON-RPC vào `engram mcp` — đúng phép thử đã dùng cho zemory và cho CALM (`plan/13 §9`). Xong
xoá sạch binary + sandbox.

- **Sai 1 — "20 tool": binary trả 22**, có cả `mem_pin`/`mem_unpin` (`DOCS.md` của họ liệt kê
  thiếu). Tôi lấy TÀI LIỆU bên thứ ba làm phép đo rồi gọi là "đo lại". **Sai 2 — "họ không có
  pin": có** ⇒ ⑤ là bám kịp, không phải đi trước. Sổ cũ ghi 22 là đúng.
- **⑥ thì zemory đi trước THẬT, bằng chứng là README của họ:** *"Engram's MCP transport is
  **stdio only** — there is no HTTP or network MCP endpoint."* `serve :7437` là REST cho plugin
  OpenCode/Pi (đo: `/health` 200 · `/mcp` **404**). Ghi chú Docker tôi viết cho `mcp --http`
  trùng điều họ tự thú: loopback ⇒ container không với tới.
- **Lời dặn, đo cạnh nhau:** cùng dùng marker; chạy **3 lần** + chèn chữ user vào giữa ⇒ cả hai
  **1 khối, chữ user còn**. Khác cỡ: engram **3.873 B** (ép gọi `mem_save` sau mỗi việc) ·
  zemory **1.289 B** (chỉ dạy lúc nào ĐỌC). Mô tả có "khi nào gọi": engram **10/22** · zemory **12/12**.
- **Mô hình khác nhau — vòng ghi–đọc:** engram tìm trước khi ghi = *No memories found*, phải
  `mem_save` mới thấy; zemory cùng lúc có sẵn **1.271 phiên · 196.894 tin**, agent **không gọi
  lệnh ghi nào**. Cỡ một kết quả: engram 540 B · zemory 454 B/hit.
- **Ba agent ta chưa khai được thì họ khai được**, và giờ biết hình dạng: `codex` → `config.toml`
  + file chỉ dẫn · `opencode` → plugin `.ts` 21 KB · `pi` → npm. Khoảng cách là thật.
- **Lỗi SỐNG bắt được lúc tra lại sổ vừa ghi:** `changelog search "x" --limit 3` tìm chuỗi
  `"x 3"` (và `plan search` y hệt) — **cùng họ lỗi đã vá sáng nay cho `memory search`, khác bề
  mặt**. Nay dùng chung `positionalArgs`; gate `docs-search-flags` 4 test, đột biến 2 hướng đỏ.

Gate 458 → **462** · `conform` ✓.

## [2026-08-02f] — MCP 8 → 12 tool: đóng hết sáu khoảng trống so với engram

Sáu mục `05_TODO` ghi từ đợt đối chiếu sáng nay, làm trọn trong một lượt.

- **① Lời dặn cài CÙNG `setup mcp`** — khai server chỉ cho agent *có* tool; thứ quyết định nó
  có *gọi* hay không là lời dặn trong file chỉ dẫn thường trực (Cursor `.mdc` kèm
  `alwaysApply` · Windsurf `global_rules.md` · Gemini/Antigravity `GEMINI.md` · Qwen · Kiro).
  Khối có **marker hai đầu** ⇒ chạy lại THAY đúng khối cũ, không đẻ bản thứ hai, không đụng
  chữ user; marker mở-mà-không-đóng thì **DỪNG, không đoán chỗ kết thúc**. Claude Code/Desktop
  cố ý KHÔNG chèn: `AGENTS.md`/`CLAUDE.md` là tài sản harness, và lời dặn đã nằm ở mô tả tool.
- **② `memory_conflicts` — KHÁC engram có chủ đích.** `mem_judge`/`mem_compare` của họ GHI phán
  quyết vào kho; zemory chỉ **ghép cặp nghi ngờ** (cùng chủ đề · có dấu hiệu quyết định · cách
  xa nhau về thời gian) rồi giao agent phán — đúng thứ tự điều 6 (①script → ②agent liên kết) và
  không đổ suy luận ngược vào lớp dẫn xuất (điều 3). Trả thẳng `CANDIDATES ONLY`.
- **③ `project_merge`** tự tìm nhóm bị tách (`D:\` vs `d:\` · gạch cuối), **mặc định dry-run**,
  `apply=true` mới ghi, **không xoá dòng nào** — `cwd` gốc giữ nguyên để truy ngược.
- **④ `memory_doctor`** probe engine THẬT (không đọc công tắc) · **⑤ `session_pin`** dùng cột
  RIÊNG `sessions.pinned` (**schema v20**), lấy bằng truy vấn riêng nên phiên ghim **không tuột
  khỏi cửa sổ 400 dòng** dù rất cũ · **⑥ `zemory mcp --http`** (4445), cùng bộ tool với stdio
  (**gate parity**), guard loopback dùng CHUNG một bản với daemon UI (`util/loopback.ts`).
- **Nói thẳng giới hạn ⑥:** bind loopback nên container Docker **không** với tới nếu không
  `--network host`/map cổng. Bind rộng hơn là mở kho nhớ ra mạng (điều 7) — không làm mặc định.
- **Một test của tôi XANH GIẢ, tự bắt được:** `fetch` không cho ghi đè header `Host`, nên phép
  thử DNS-rebinding chưa hề chạm guard. Viết lại bằng `node:http` mới đỏ được.

Gate 437 → **458** · `conform` ✓ · đột biến phần lời dặn **5/5** đỏ.
