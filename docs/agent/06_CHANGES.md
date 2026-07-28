<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-07-28k] — Harness đi được vào Claude Cowork · và `data/` trần đã nuốt ruột skill vendored suốt từ đầu

Gate 286 → **291** · `conform` ✓ · `validate` ✓.

### `.gitignore` ghi `data/` thay vì `/data/` — 137 file chưa bao giờ vào git
Pattern trần khớp **mọi độ sâu**, nên nó nuốt luôn 7 thư mục `data/` bên trong
`external/skills/ui-ux-pro-max-skill/`. Đo: `git ls-files external/skills | grep "/data/"` = **0**;
trên đĩa **137 file / 4,82 MB**. Skill này giá trị nằm CHÍNH ở dữ liệu (192 palette · 84 UI style ·
74 cặp font · 98 UX guideline) ⇒ **ai clone repo về cũng nhận vỏ skill không có ruột**, và im lặng:
không lỗi, chỉ là tra gì cũng không ra. Đúng cái máy thứ hai của chủ repo đang dùng.

Nó cũng làm repo vi phạm chính chuẩn của mình — `03_STRUCTURE` khai `external/skills/` là
*"clone **nguyên bản**, KHÔNG sửa nội dung"*, mà thực tế đang ship bản cụt.

Vá: neo `/data/`. Runtime của repo vẫn chỉ ở gốc nên `data/global_memory.db` vẫn ignore
(kiểm chéo bằng `git check-ignore -v`); lộ ra đúng 137 file đã đo, không dư một file nào.

### `docs/agent/06_CHANGES.md.bak` — rác đã hết hạn, nhưng KHÔNG phải rác lọt
Do chính `zemory archive` tạo làm lưới lùi (`archive.ts:76`: *"thao tác PHÁ HUỶ — giữ .bak để lùi được"*),
`.gitignore` có khai riêng. Trước khi xoá đã đối chiếu theo entry chứ không theo dung lượng:
16 entry trong `.bak`, **0 entry chỉ-có-ở-đó** (đã nằm đủ ở `06_CHANGES` 12 + `archive/` 56) ⇒ xoá không mất gì.
Vấn đề còn lại là **archive không có bước dọn**, nên `.bak` đọng ngay trong `docs/agent/` —
đúng chỗ luật bắt "ĐỌC HẾT" (`05_TODO` giữ đề xuất cho archive tự dọn).

### BOOTSTRAP cho Claude Cowork
`docs_template/cowork/BOOTSTRAP.md` — runbook 4 giai đoạn cho agent Cowork, **không cần CLI**:
áp chuẩn (tải 8 file `docs_template/nonapp/` + `.harness.json`) → dò toàn bộ thư mục đã mount →
chiếu file vào routing `03 §3` + điền bản trắng theo `grill` + đề xuất overview + dựng playbook →
chốt (điền ô **Instructions** của Cowork project).

Ba ràng buộc đến từ số đo, không phải phỏng đoán:
- **Không lệnh máy thật.** Cowork chạy bash trong sandbox riêng, không với tới terminal host
  (3 nguồn khớp + `claude-code#55649`) ⇒ mọi đường "cài zemory rồi gọi" là ngõ cụt.
- **Tải chứ không dán inline.** Bộ chuẩn 499 dòng / 57,6 KB ≈ 14k token; tải thì nội dung ra thẳng đĩa,
  dán inline thì mỗi lần đọc là nuốt trọn vào ngữ cảnh. Ba lối theo thứ tự: `curl` → `web_fetch` → xin `.zip`.
- **Skill Cowork agent KHÔNG tự cài được** — Cowork chỉ nạp skill bật trong **Customize** và
  *"doesn't read the Claude Code CLI's `~/.claude` directory"* (docs chính chủ; nhiều hướng dẫn ngoài nói ngược).
  Nên BOOTSTRAP viết playbook vào `04_SKILLS.md` (slot chuẩn, chạy ngay), còn skill đóng gói thì **soạn sẵn + hướng dẫn upload**.

### Gate chống mục cho manifest
`bootstrap-manifest.test.mjs` (5 test) buộc manifest khớp `docs_template/nonapp/` thật: đủ file ·
đúng số dòng · target mirror source · `<RAW>` trỏ đúng nonapp · không lọt lệnh host. Cần vì cột "Dòng"
là **bản sao số liệu** — sửa chuẩn mà quên bảng thì bước tự-kiểm của BOOTSTRAP báo ✗ **oan** trên mọi máy
(cùng họ F1: chuẩn chép tay ra chỗ thứ hai rồi trôi).
**Đột biến hoá 5/5 bị bắt** (sai số dòng · mất một hàng · target rớt `docs/` · `<RAW>` trỏ sang `app` · nhét `npm install`).

### Kiểm bằng đường thứ hai
Manifest đếm từ file **local**, còn Cowork tải từ **origin/main** — lệch một dòng là ✗ oan hàng loạt.
Đo qua HTTP: **8/8 URL raw trả 200, số dòng remote khớp local tuyệt đối**.

---

## [2026-07-28j] — Tự bắt: probe vừa nối xong CHỈ gọi được bằng curl · audit lại 6 mặt

Gate 284 → **286** · `conform` ✓ · `validate` ✓ · audit lại toàn bộ: **0 FAIL**.

### Nối backend xong tôi tưởng là xong — chưa
Nút "Kiểm" trong màn Tính năng **chỉ render khi `kind==='check'`**, mà `vector` là `kind:'stat'` và `rerank` là `kind:'toggle'` ⇒ hai check vừa nối vào `runCheck` **không có đường bấm từ UI**, chỉ gọi được bằng `curl`. Tức tôi mới **dời chỗ mồ côi**, chưa nối thật.
- Vá vòng 1: thêm khai báo `probe` cho feature ⇒ có nút. **Vẫn nửa vời** — `sysStatus` chỉ đọc `Z.checks` cho `kind='check'`, nên bấm xong kết quả nằm im, không hiện ra.
- Vá vòng 2: `probeLine(f)` trong `renderSysDetail` hiện pill + chi tiết; chưa bấm thì nhắc "≈8 giây vì phải tải model". i18n đủ 2 từ điển.
- **Đột biến hoá 4/4 bị bắt**: gỡ `probe` của từng feature · vô hiệu nhánh render nút · định nghĩa `probeLine` mà không gọi.
- Test đầu tiên còn **đỏ oan** vì regex `[^}]*` dừng ở hàm lồng `get:function(m){…}` — sửa cách cắt entry, không sửa code.

### Kiểm luôn hai rủi ro tự đặt ra
- **Probe tải model có làm `doctor` chậm không?** Không: `doctor` chỉ chạy `memory·validate·grill` — đo **1,3 s**.
- **UI có tự gọi probe mỗi lần vẽ không?** Không: `refreshChecks()` chỉ nạp 3 check rẻ; probe chỉ chạy khi người dùng bấm.

### Audit lại 6 mặt sau mọi thay đổi
`0 FAIL · 2 WARN`: **export mồ côi còn đúng 1** (`resolveDocPath`, cố ý để lại) · 2 endpoint > 3 s là **cold start** (đo lại khi ấm: search **0,76 s**, `/code-graph` 2,3 s). Sạch: 0 endpoint chết (54) · 0 CSS chết · 0 id ghi vào hư vô · 0 key i18n lệch · 0 ký tự điều khiển · integrity ok · 0 mồ côi mọi loại · 16/16 endpoint LIVE 200.

## [2026-07-28i] — Dọn nợ nhẹ: 4/5 export mồ côi được NỐI VÀO (không xoá) · check vector·rerank nay kiểm THẬT

Gate 278 → **284** · `conform` ✓ · `validate` ✓. Mọi thay đổi đã đột biến hoá: **5/5 đột biến bị bắt.**

### `vector` và `rerank` trước đây báo trạng thái theo CÔNG TẮC, không phải theo sự thật
Hai mục này lấy state từ config ⇒ hiện "on" **kể cả khi model không tải nổi**. Trong khi `embedProbe`/`rerankProbe`/`embedDims` viết ra đúng để kiểm thật thì nằm mồ côi (audit: mỗi hàm xuất hiện đúng 1 lần = chỉ có định nghĩa). Nay nối vào `runCheck`:
- `vector` → `model onnx-community/embeddinggemma-300m-ONNX · 256d (model 768d) · nhúng thử ok`
- `rerank` → `tắt (opt-in) · model Xenova/bge-reranker-base sẵn sàng` — **tắt là trạng thái ĐÚNG**, không báo đỏ.

**Tự bắt một lỗi ngay khi vừa viết:** bản đầu in **768d** (dims thô của model) trong khi index thật là **256d** — sai đúng kiểu "bề mặt chỉ-đọc nói sai còn nguy hơn báo lỗi". Vá theo pattern *stored-dims-authoritative* (plan 12): ưu tiên `vec_config.dims`, chỉ rơi về dims model khi chưa có index.

### `schedulerChildRunning` → cờ `embedRunning` trong `/automation`
Đúng thứ tôi đã phải mở `Get-Process` mới thấy khi truy vụ recall chậm: job embed nền ngốn 4.592 s CPU làm **mọi** endpoint chậm 2–9× mà giao diện không hề nói gì.

### `doctor` cảnh báo HAI file `config.json`
Bản THẬT nằm cạnh DB (`currentMemoryDir()`), bản ở `~/.zemory` là rác còn sót sau `memory relocate` — và chính nó đã khiến tôi chẩn đoán sai một setting. **Chỉ báo, KHÔNG tự xoá** file của user; test khoá luôn điều đó.

### Còn lại 1/5 export — cố ý không đụng
`resolveDocPath` là **guard bảo mật** trùng ý với đoạn inline ở `readDoc` (`ui.ts:496`) nhưng khác ngữ nghĩa resolve. Gộp hai guard là refactor an-toàn-đường-dẫn, không phải dọn dẹp ⇒ tách ra làm riêng, không nhét vào đợt dọn nhẹ.

### Vặt
`.bell` + `.bell .badge` — 2 rule CSS chết (0 phần tử dùng) đã gỡ, có test chống tái sinh.

---

## [2026-07-28h] — AUDIT TOÀN DIỆN: recall 25 s → 0,55 s (rerank mặc định BẬT trái thiết kế)

Gate 276 → **278** · `conform` ✓ · `validate` ✓ · 6 mặt chạy đủ, mỗi mục đo hai đường.

### Phát hiện nặng nhất — và nó chỉ lộ ra vì user bắt audit
`/memory-search` mất **25–62 giây**. Truy ra hai lớp nguyên nhân, phải bóc từng lớp mới thấy:
1. **Job embed nền ăn hết CPU** (4.592 s CPU, do chính re-ingest v6 tạo 32k backlog). Dừng nó: `/sessions` **4,5 s → 0,05 s**, `/code-graph` **7,8 s → 1,03 s**. Nhưng search **vẫn 23 s** ⇒ chưa phải gốc.
2. **Rerank BẬT.** Đo dứt điểm cùng tiến trình: `rerank=false` **4.616 ms** · `rerank=true` **29.304 ms** — **6,3×**.

**Gốc rễ:** `settings.ts` trả `read().rerank ?? true` — **mặc định CODE là BẬT**, trong khi `plan/05 §4.E` chốt *opt-in, mặc định OFF* và HP điều 12 cấm bật mặc định lớp chưa qua gate. Đợt 07-26 đã bắt đúng triệu chứng nhưng **chỉ vá GIÁ TRỊ trong config**, không vá mặc định — nên nó quay lại. Nay sửa đúng chỗ (`=== true`) + `settings-defaults.test.mjs` khoá mặc định của cả 3 công tắc đắt (rerank · syncLevel · syncAttachments), đã **đột biến hoá: đặt lại `?? true` thì test ĐỎ**.
- Trên máy này config còn giá trị `true` lưu tường minh ⇒ đã trả về mặc định thiết kế. **Đo LIVE sau khi tắt: 25 s → 0,55 s (45×).** Rerank không mất: bật lại bằng nút UI · `ZEMORY_RERANK=1` · `--rerank`.

### Chẩn đoán sai của chính tôi trong lúc audit — vì đọc NHẦM FILE
Tôi kết luận "config rỗng ⇒ rerank không đến từ config" sau khi đọc `~/.zemory/config.json`. **Sai**: config THẬT nằm cạnh DB (`data/config.json` sau relocate), và nó có `"rerank": true`. File ở home là **bản cũ còn sót**. Cùng họ lỗi "kho import cạnh DB mà discovery chỉ tìm ở home" (07-28c). Đã ghi vào `05_TODO`.

### Kết quả 6 mặt (0 FAIL)
| mặt | kết quả |
|---|---|
| ① gate | **278/278** · lint sạch |
| ② chuẩn & docs | `conform` ✓ · `validate` ✓ · `06_CHANGES` 226 dòng · **`04_SKILLS` 203 > ngưỡng 200** |
| ③ kiến trúc | **5 export mồ côi** (đo 2 đường) · điều 6: **0** lời gọi model API |
| ④ FE↔BE | **0/57 endpoint chết** · neo test trỏ đúng file đang chạy · **`.bell` CSS chết** |
| ⑤ dữ liệu | `integrity_check` ok · FK 0 lỗi · 0 message mồ côi · 0 session rỗng · 0 lệch `message_count` · 0 link đính kèm chết · 0 digest mồ côi |
| ⑥ bề mặt sống | **15/15 endpoint 200** |

**Báo oan do chính script audit của tôi (ghi lại để khỏi đào lại):** 3 id `mgSel`·`rsPath`·`fgSel` bị coi là "JS ghi mà HTML không có" — thật ra chúng được tạo ĐỘNG trong `zDialog({bodyHtml})`, script chỉ soi HTML tĩnh. Và ngược lại, phép grep thô của tôi suýt tha cho `.bell` vì "bell" là substring của `aria-labelledby`.

---

## [2026-07-28g] — Đột biến hoá bắt được 2 test XANH GIẢ · luật kiểm chéo vào RULES + cả 2 template

Gate 274 → **276** · `conform` ✓ · `validate` ✓.

### Vì sao có mục này
User chỉ ra một mẫu lặp: *"cứ suýt hoài… bạn có để ý là tui nói check kỹ, mà làm một hồi lại phát hiện thêm sai không"*. Đếm lại phiên này: **6 lần báo sai trước khi tự bắt** — NUL (nói 1 file, thật ra 2) · "29 nhãn không link" (báo oan) · "87 hàng mồ côi" (tiêu chí sai, suýt xoá dữ liệu sống) · "Recall chưa duyệt" (đã duyệt) · "L3 chưa code" (xong 2/3) · 20 mục TODO đã xong vẫn ghi chưa làm.

**Cả 6 chung một gốc: đo MỘT lần, bằng MỘT cách, rồi coi kết quả đầu là sự thật.** Không cái nào là "quên check" — cái nào cũng có chạy lệnh.

### Kiểm chéo lại chính việc vừa làm (đường đo thứ hai)
- Re-ingest KHÔNG mất dữ liệu: sessions 1206 → 1208 · messages 174.405 → **176.067** · 0 session rỗng · 0 message mồ côi · 0 phiên lệch `message_count`.
- DB nói có ⇒ HTTP phải phục vụ đúng: 10 mẫu ngẫu nhiên **10/10 khớp byte**; 5 mẫu CÓ TÊN GỐC **5/5** đúng cả bytes lẫn tên trong `Content-Disposition`.

### ĐỘT BIẾN HOÁ — và nó bắt được 2 test xanh giả
Phá 4 chỗ trong code rồi đòi test phải ĐỎ. **2/4 đột biến SỐNG SÓT**:
1. *`pruneOrphanAttachments` xoá luôn nội dung* → vẫn xanh. Vì test cũ chỉ xoá MỘT tin nên ảnh còn liên kết khác ⇒ **nhánh xoá-nội-dung chưa bao giờ được chạy**. Thêm ca xoá HẾT tin: mặc định nội dung phải còn, chỉ `dropUnlinked` mới xoá.
2. *`msgBlock` không bỏ nhãn `[image:…]`* → vẫn xanh. Vì **`msgHtml` có một bản sao gánh thay**. Hai bản sao không chỉ thừa: bản ở `msgHtml` chạy SAU khi chuỗi đã bị cắt nên không cứu được nhãn đứt nửa. Gỡ bản sao, giữ đúng một chỗ (trước khi cắt) + test cap ngắn hơn nhãn.
Sau khi vá: **4/4 đột biến đều bị bắt.**

### Đóng cứng thành luật (RULES + cả 2 template)
- *"Một phép đo chưa được kiểm chéo thì chưa phải sự thật"* — trước khi báo số / kết luận xong-chưa / xoá bất cứ thứ gì, phải đo lại bằng **đường thứ hai khác cơ chế**; liệt kê 4 dạng đã trả giá.
- *"Test mới phải chứng minh mình ĐỎ ĐƯỢC"* — viết xong thì phá code nó canh, không đỏ nghĩa là chưa soi gì.

---

## [2026-07-28f] — L3 sync kèm ảnh (trọn 3 bước) · parser v6: 137 ảnh mới + 125 tên gốc · suýt xoá nhầm 87 ảnh sống

Gate **274/274** · `conform` ✓ · `validate` ✓.

### Suýt xoá nhầm 87 tấm ảnh đang sống — tiêu chí "mồ côi" của tôi SAI
Tôi đã báo "95 link + **87 hàng** `attachment` mồ côi, chờ duyệt để xoá". Trước khi xoá thì đo lại bằng định nghĩa khác, và số đo bác chính tôi: tiêu chí cũ là *"hàng có `message_id` trỏ tin đã chết"* — nhưng cột đó chỉ ghi tin **ĐẦU TIÊN** mang nội dung ấy (dedup theo `sha256`), nên sau whole-replace nó *trông như* chết trong khi ảnh vẫn được nhiều tin khác trỏ tới. Đo: **87/87 hàng vẫn còn liên kết SỐNG**; số hàng thật sự không ai trỏ tới = **0**.
- `pruneOrphanAttachments()` vì thế chỉ dọn **LIÊN KẾT** chết (95 → 0), chạy tự động cuối mỗi `scan` như `pruneOrphanVectors`. Xoá nội dung là tuỳ chọn `dropUnlinked`, **mặc định KHÔNG** — huỷ dữ liệu phải do user quyết (`02_RULES §Hành xử`).
- `attachmentStats()` cũng sửa theo: "mồ côi" = không còn liên kết sống nào, không phải `message_id` chết.
- Bài học lặp lại lần nữa: **một tiêu chí nghe hợp lý vẫn phải đo trước khi cho nó quyền xoá.**

### L3 — trọn 3 bước (plan 08 §7)
Bước ③: công tắc `🖼 Kèm ảnh` cạnh Gọn/Đầy đủ (`/set-sync-attachments`), **mặc định TẮT** vì bundle lean vừa cắt −74%.
- Bundle chở bảng phẳng `attachment_ship` mang `session_id` + `msg_uuid`, **KHÔNG mang `message_id`**: id là AUTOINCREMENT cục bộ và cố ý không đi theo bundle (merge khoá `UNIQUE(session_id,uuid)`) — chở id sang máy khác là trỏ vào tin của người ta.
- Bên nhận tra lại id của mình rồi mới nối; nội dung dedup theo `sha256` nên cùng một ảnh từ nhiều máy chỉ tốn một hàng. Bundle cũ / máy gửi tắt công tắc ⇒ nhánh này im lặng bỏ qua.
- Test round-trip dựng máy nhận có id **lệch hẳn (9001)**: bật ⇒ ảnh sang và nối đúng id của máy nhận · tắt ⇒ **0** blob.

### Parser v6 — re-ingest
`PARSER_VERSION` 5→6, quét lại **109/109** transcript. Đính kèm **678 → 815** (+137 ảnh vốn nằm ở `toolUseResult`, ngoài `message.content`, chưa từng được nạp); **0 → 125 ảnh có TÊN GỐC** (`layout_white.png`, `smartphone_red.png`…). DB 870,9 → **947,3 MB**.
- **Cái giá, nêu rõ vì lần trước quên nêu:** **47.068 tin chờ nhúng vector** (nội dung đổi ⇒ `vec_hash` khác). Scheduler nền tiêu hoá dần; trong lúc đó recall chạy bằng FTS (điều 9).

### Một chỗ đoán bừa còn sót
Hàng "Phiên gần đây" vẫn suy App/Non-app bằng regex `/PBI|powerbi/` — đúng cái badge-đoán đã bị gỡ khỏi card project từ 07-25. `/recent-sessions` không mang `profile` ⇒ **bỏ hẳn nhãn**: một nhãn ĐOÁN tệ hơn không có nhãn, vì người đọc tưởng nó đọc từ `.harness.json`.

### Dọn sổ (tiếp)
Đóng thêm 4 mục đã xong mà còn ghi "chưa làm": L3 · link mồ côi · badge App/Non-app · panel Chuẩn chung 2-khung (làm xong từ 07-25 trong màn Harness). Mục mở: 43 → **39**.

---

## [2026-07-28e] — Ảnh XEM ĐƯỢC trong Recall · 6 adapter cùng đọc ảnh · byte NUL làm mù mọi phép grep

Gate 246 → **269**. `conform` ✓ · `validate` ✓.

### Byte NUL trong file nguồn — mọi đợt audit bằng grep đều mù 2 file lớn nhất
`ingest.ts` (1 byte) và `ui.ts` (2 byte) chứa ký tự **NUL THẬT** gõ thẳng vào template literal làm ký tự nối khoá (`` `${a}<NUL>${b}` ``). Chạy đúng, `tsc` im lặng — nhưng **ripgrep xếp file có NUL vào loại nhị phân rồi BỎ QUA**. Nghĩa là mọi lần audit grep `backend/src` (export mồ côi · endpoint chết · i18n · chuỗi hardcode) chưa từng nhìn 777 dòng `ingest.ts` lẫn toàn bộ `ui.ts`. Vá bằng escape; kiểm chứng: `writeAttachments` trước đó **0** kết quả, sau khi vá ra **3**.
- Phép quét NUL đầu tiên của tôi (`grep -qP`) cho **âm tính giả** nên tôi kết luận nhầm "chỉ `ingest.ts` dính"; quét lại bằng Python mới ra `ui.ts`.
- Sau đó **tự tái phạm lần thứ ba**: class regex lọc tên file của tôi nở thành hai byte điều khiển thật (0x00, 0x1F) — `eslint` bắt được, viết lại duyệt theo mã ký tự.
- Khôi phục thêm 4 byte `0x08` có sẵn trong `05_TODO`/`06_CHANGES` từ phiên trước (chuỗi `\b` bị nuốt, làm câu "**`\b` của JS không dùng được cho tiếng Việt**" mất chủ ngữ).

### Ảnh xem được trong Recall (bản B, user duyệt thiết kế)
`memory/attachments.ts` (mới) + `GET /attachment?sha=` (content-addressed, cache immutable, `nosniff` + CSP) + `atts` gắn vào `/memory-session`·`/memory-context`·`/memory-search`·`/recent-messages` + `hasAttachment` trong `SearchOptions`. FE: thumbnail inline, chip lọc `🖼 Có ảnh`, badge `🖼N`, dialog M 16:9. **Verify LIVE: sha256 tải về khớp tuyệt đối; `withAtt=1` lọc 0/8 → 8/8.**
- Ánh xạ tin↔ảnh đọc từ **`attachment_link`**, KHÔNG từ `attachment.message_id` — cột đó chỉ giữ tin ĐẦU TIÊN mang nội dung (dedup theo sha) nên phủ 566/724 tin ⇒ dùng nhầm là mất **22%**.
- **Xem trước và Phiên từng vẽ bằng HAI bộ khác nhau** (user: *"giao diện của phiên khác bên tìm"*): Xem trước dán text thô nên còn nguyên nhãn `[image:…]` cạnh thumbnail và gọi output tool là "user". Gom về **một `msgBlock(m, cap)`**; nhãn bị bỏ TRƯỚC khi cắt nên không còn nhãn đứt nửa.
- `serveFrontend` trả 200 **không header cache nào** ⇒ trình duyệt áp cache phỏng đoán: vỏ HTML `no-store` nhưng script/style thì không, nên cửa sổ chạy **vỏ mới + script cũ** mà không có dấu hiệu nào. Thêm `cache-control: no-store`.

### Cả 6 adapter cùng đọc ảnh (trước chỉ `claude.ts`)
Bộ đọc block ảnh gom về MỘT chỗ `_shared.ts`; ba hình dạng ĐÃ KHAI: Anthropic base64 · OpenAI `image_url` data-URI · ChatGPT `image_asset_pointer` ⇒ `kind='ref'` (export không kèm bytes). Hình dạng lạ ⇒ `null`, KHÔNG đoán. `chatgpt` từng lọc `typeof p === "string"`, `continue`/`lmstudio` chỉ lấy `.text` ⇒ mọi block khác biến mất im lặng — đúng họ lỗi đã làm mất 93 MB.

### Tên file khi tải ảnh về — và số đo BÁC kỳ vọng "lấy tên gốc"
Quét 378 transcript / 889 block ảnh: **không block nào mang tên**, 0/678 hàng có `name` ⇒ với ảnh dán/chụp màn hình **tên gốc không tồn tại**. Nên: có `name` thì dùng, không thì `zemory-<ngày-tin>-<sha8>.<đuôi>` và gọi đúng nó là tên dự phòng. `Content-Disposition` thay cho tên `attachment` mà trình duyệt tự đặt.
- Lộ ra **166 ảnh chưa hề được nạp**: nằm ở `toolUseResult.file.base64`, NGOÀI `message.content`. Đây cũng là chỗ DUY NHẤT có tên gốc thật — ghép ngược `tool_use_id` → `input.file_path`, đo **166/166 = 100%**. *(Cần bump `PARSER_VERSION` mới vào DB — chưa làm, chờ user.)*

### Tab Phiên: thanh lọc đối xứng tab Tìm kiếm (bản B, user duyệt)
Chip `🖼 Có ảnh` + 4 select `Thời gian · Nguồn · Agent · Máy` + ô đếm. **Cố ý không chép Hybrid/Rerank** (công tắc của bộ máy tìm). Bản cũ lọc phía client = tìm trong **120/1.206 phiên** mà giao diện vẫn nói như đã tìm hết ⇒ đẩy hết xuống server, `/sessions` trả `{items, total}`. Select mang class `.ssel` riêng, nếu dùng chung `.rsel` thì đổi bộ lọc phiên sẽ bắn một lượt recall hybrid vô ích. Đo LIVE khớp DB: 1.206 · có ảnh 73 · web 861 · máy 251.

### Dọn sổ
Đóng **20 chỗ** trong `05_TODO` đã xong từ lâu mà còn ghi "chưa làm" (mỗi cái kiểm bằng code trước khi xoá), gộp 3 mục L3 trùng nhau và 3 mục code-map trùng nhau; vá `plan/07` đang ghi "Claude.ai CHƯA làm" trong khi đã ship 07-27. Mục mở: 60 → 43.

---

## [2026-07-28d] — Nạp ĐƯỢC ảnh: 678 ảnh / 54,3 MB vào bảng attachment (parser v5)

Gate **246/246**. DB 801,1 → **870,9 MB**.

### Kết quả đo sau khi nối
```
attachment  : blob=678 · 54,3 MB   (image/png ×665 · image/jpeg ×13)
attachment_link: 862 liên kết       ← dedup chạy: 862 tham chiếu / 678 nội dung
messages    : 669 tin mang nhãn [image:…]
```

### Cách làm — và vì sao KHÔNG nhét base64 vào `content`
- `flatten()` (`adapters/claude.ts`) thêm nhánh `image`: tách blob ra `attachments`, chỉ để lại **một dòng nhãn** `[image:<mime> <KB> <sha12>]` trong text. Base64 mà vào `content` là thổi FTS5 lên mà không tìm được gì — đúng bài học v16/v17 (trigram nuốt tool-dump làm DB phình 435 MB).
- Ngưỡng `MAX_BLOB_BYTES = 8 MB`: vượt thì hạ xuống `kind='ref'` (ghi nhận từng có, không lưu nội dung) chứ **không bỏ im lặng**. Đo thật: max 1,28 MB nên chưa ai chạm ngưỡng.
- Dedup theo `sha256`: một ảnh lặp lại N lần = **1** hàng nội dung + N liên kết.
- `PARSER_VERSION 4 → 5` để nạp lại transcript cũ (nếu không, ảnh cũ vẫn nằm ngoài).

### Bẫy đã dính khi làm
- **CÓ HAI đường ghi message** (whole-replace và append-mode jsonl). Vá một đường thì attachment **im lặng không vào**: nhãn `[image:…]` đã hiện trong content mà bảng vẫn rỗng — mà append-mode mới chính là đường Claude Code dùng. Đã tách thành hàm `writeAttachments()` cho cả hai cùng gọi.
- 4 test khoá lại: base64 không được vào `content` · ảnh ra `attachments` đúng `sha256`/`kind` · cùng ảnh ⇒ cùng sha256 · block ảnh lạ (`source.type='url'`) thì bỏ qua **mà không làm mất cả message**.

---

## [2026-07-28c] — Capture claude.ai CHẠY THẬT · 2 lỗi lặng lẽ · ĐÍNH CHÍNH: ảnh 93 MB đang bị bỏ

Gate **242/242**. Capture đầu-cuối: `pulled 2 · failed 0` → DB có 2 phiên `claude-web`, 6 tin, vai đúng.

### ĐÍNH CHÍNH — tôi đã kết luận SAI ở mục [2026-07-28b]
Tôi báo *"transcript không có file nhị phân"* và thiết kế slot attachment như thứ dự phòng cho tương lai. **Sai**: phép đo đó chỉ nhìn `attachment`, mà ảnh nằm ở content block `{type:'image', source:{base64…}}` — hình dạng hoàn toàn khác. Đo lại đúng chỗ:

```
1.245 block ảnh THẬT · TỔNG 93,00 MB
p50 46 KB · p90 182 KB · max 1.287 KB
png ×1047 · jpeg ×36 · (không rõ) ×162
```

Và `flatten()` trong `adapters/claude.ts` **không có nhánh `image`** (grep: 0 lần nhắc) — dòng `.map(b => b.type === "text" ? b.text : "")` biến mọi block ảnh thành chuỗi rỗng. Nghĩa là **93 MB ảnh đang bị bỏ im lặng ở khâu nạp**, và slot `attachment` là thứ cần NGAY, không phải dự phòng. *(Bài học: đo sai chỗ còn tệ hơn không đo — nó cho một kết luận tự tin mà sai.)*

### Hai lỗi làm capture fail, đều LẶNG LẼ
1. **`[object Object]` → HTTP 400, fail 2/2.** Comment của `interface Platform` ghi `listExpr` trả `[{id}]`; hợp đồng THẬT là **mảng chuỗi** (xem `CHATGPT_LIST`: `ids.push(c.id)`). Tôi tin comment nên URL thành `.../chat_conversations/[object Object]`. Đã sửa cả code lẫn **comment sai** đó. Lỗi bị `catch {}` nuốt — thêm `ZEMORY_WEB_DEBUG=1` để in ra thay vì đoán.
2. **Kho import nằm CẠNH DB, discovery chỉ tìm ở home.** `scan-web` ghi vào `currentMemoryDir()/imports/<platform>`, còn signature adapter là `.zemory/imports/<platform>` — đúng khi DB ở `~/.zemory`, **sai ngay khi user `relocate` DB khỏi ổ C:**. Hệ quả: lệnh báo *"ingested 2"* mà DB có **0** phiên. **Ảnh hưởng cả ChatGPT** — mọi capture web sau khi relocate đều rơi vào chỗ không ai nhìn.
   - Sửa: discovery quét thêm kho import, nhưng nhận đường dẫn **qua tham số** suy từ chính `dbPath` đang quét. Bản đầu tôi đọc `currentMemoryDir()` toàn cục ⇒ **3 test drive-sync đỏ** vì scan trên DB tạm hút luôn dữ liệu kho thật vào.

*(Họ lỗi "backtick trong comment nằm trong template literal" dính thêm lần thứ 5 và 6 trong phiên này.)*

---

## [2026-07-28b] — Check giọng văn sản phẩm · slot `attachment` (schema v19)

Gate 239 → **242**.

### Check giọng văn — UI là sản phẩm giao, không phải ghi chú nội bộ
User chốt: *"phải check full từ ngữ, không được dùng văn nói, phải dùng từ ngữ chuyên nghiệp chuẩn làm app"*.
- Đo trên **861 chuỗi hiển thị** (cả hai từ điển + text mặc định của `data-i18n`): **0 vi phạm**. Nên đây là **RATCHET chống tái phát**, không phải bộ sửa.
- **Hai vòng đo để loại báo oan** — quan trọng hơn bản thân luật:
  · Vòng 1 dùng `\b` của JS ⇒ `ngu` khớp trong "**ngu**ồn" (**27 ca oan**), `ui` khớp trong "**UI** language". JS coi ký tự có dấu là ranh giới từ ⇒ **không dùng `\b` cho tiếng Việt**, phải tự dựng lớp ranh giới.
  · Đã BỎ khỏi danh sách: `vs` (viết tắt kỹ thuật hợp lệ), `ok` (nhãn trạng thái chuẩn "3/3 OK"), `ui` (acronym).
  · `05_TODO.md` bị báo oan vì tôi chỉ đặt biên ở CUỐI — `_` là ký tự từ nên không có biên giữa `_` và `T`. Thêm biên đầu.
- Có test **chứng minh bộ luật NỔ ĐƯỢC** (5 mẫu văn nói phải bắt) **và KHÔNG nổ oan** (7 mẫu hợp lệ phải sạch) — đúng luật 4 của skill `audit toàn diện`.
- Thêm check thứ hai: ghi chú dev (`TODO`/`FIXME`/`mock`/`placeholder`) không được lọt ra giao diện.

### Slot `attachment` + `attachment_link` (schema **v19**)
**Đo trước khi thiết kế** — và số đo đổi hẳn phạm vi: quét **105 transcript, 5.456 attachment**:
`p50 0 KB · p90 0 KB · p99 1,6 KB · max 12 KB · tổng 0,2 MB · >1 MB: 0 · nhị phân: 0`.
5.104/5.456 không có đuôi file (metadata nội bộ, adapter đã bỏ đúng); phần còn lại là `.md ×181 .py ×46 .ts ×40 .sql ×20`… **toàn văn bản**. Tức 52 tin đính kèm đã ingest LÀ TOÀN BỘ những gì tồn tại — không có kho ảnh nào đang bị bỏ sót.

Thiết kế theo đó — dựng slot đúng, **không** dựng máy móc cho hàng chưa có:
- **Tách khỏi `messages`** vì cột `content` nuôi FTS5: nhét blob vào là thổi index mà không tìm được gì (bài học v16/v17: trigram nuốt tool-dump làm DB phình 435 MB).
- **Ba hạng `kind` tường minh** — `text` (nội dung, đã redact) · `blob` (nhị phân) · `ref` (CHỈ ghi nhận "từng có file này, ở đây", không lưu nội dung, dùng khi vượt ngưỡng). Thà biết nó từng tồn tại còn hơn im lặng bỏ qua.
- **Dedup theo `sha256`** + bảng nối `attachment_link`: một file đọc lại 20 lần = 1 hàng nội dung + 20 hàng nối, không phải 20 bản sao.
- **KHÔNG backfill** 52 tin cũ: chúng nằm ở `messages.content` dạng `[file:<path>]` + nội dung và VẪN ĐÚNG — là lớp full, tìm được, đọc được. Viết lại dữ liệu nguồn chỉ để gọn hơn là không đáng (điều 3).
- **Chưa nối vào bundle sync** — đó là L3, cần user chốt chính sách trước (bundle đang "lean" −74%, thả blob vào là phá cân đối đó).

*(Lại dính họ lỗi cũ lần thứ 4: **backtick trong comment SQL nằm trong template literal** cắt đứt `SCHEMA`. Và một `
` trong comment nở thành xuống dòng thật làm vỡ comment TS.)*

---

## [2026-07-28] — Sources hiện ĐỦ BỘ nguồn được hỗ trợ, không chỉ nguồn đã có dữ liệu

Gate 238 → **239**.

**User bác đúng, và tôi đã bảo vệ hành vi sai trước khi nghe ra vấn đề.** Cây Sources dựng thuần từ `GROUP BY sessions`, nên một adapter mới (`claude-web` vừa thêm) **vô hình** cho tới khi capture được lần đầu. Nguyên văn: *"nếu không hiện thì sao check vào để nó scan ra được... tui muốn nó hiện đúng chuẩn"*. Đúng là **vòng luẩn quẩn**: muốn có dữ liệu phải tick, muốn tick phải có dữ liệu.

- `scopeTree()` nay ghép **bộ chuẩn `allAdapters()`** vào cây: nguồn nào zemory hỗ trợ mà chưa nạp gì thì vẫn hiện, gắn cờ `empty`.
- UI hiện nhãn *"chưa có dữ liệu"* (viền đứt, chữ mờ) kèm tooltip **chỉ luôn lệnh nạp** — `scan-web --platform <tên>` cho web, `scan --deep` cho local. Thấy mà không biết đường nạp thì cũng như không.
- Có test khoá: mọi adapter trong `allAdapters()` phải có mặt trong cây; nguồn có dữ liệu `empty=false`, nguồn chưa nạp `empty=true`. Lần refactor sau không ẩn lại được.
- Đo live: cây trả về 11 node, `claude-web` hiện với 0 tin và cờ `empty`.

**Bài học:** một danh sách "cái gì đang có" và một danh sách "cái gì dùng được" là HAI thứ khác nhau. Trộn làm một thì bề mặt cấu hình tự khoá chính nó.

---

## [2026-07-27h] — Bịt CSRF · gỡ `/init-fresh` · provider Claude.ai cho web-capture

Gate 230 → **238**.

### CSRF — tôi đã NÓI QUÁ ở báo cáo trước, đây là số đúng
Guard cũ **đã có** và chặn được: Host không phải loopback (DNS rebinding) và `Origin` lạ. Lỗ hổng thật **hẹp hơn** tôi mô tả: trình duyệt KHÔNG gửi `Origin` cho GET subresource, nên `<img src="http://127.0.0.1:4444/set-drive?path=…">` trên trang bất kỳ vẫn chạy (ảnh hỏng nhưng REQUEST đã gửi — CORS chặn ĐỌC, không chặn GỬI). Cross-site POST thì luôn kèm `Origin` và đã bị chặn sẵn.
- **Ép POST** cho endpoint đổi trạng thái ⇒ bịt cả họ, vì cross-site POST không qua nổi guard `Origin`. FE vốn đã POST hết nên không phải sửa gì.
- **Chặn `Sec-Fetch-Site`** làm lớp hai: trình duyệt gửi header này cho MỌI request kể cả `<img>`; CLI/curl không gửi nên không ảnh hưởng.
- **Bẫy tự gây, tự bắt:** regex đầu tiên viết `sync|migrate` trần và nó bắt nhầm `/sync-pulse` + `/sync-status` — hai endpoint CHỈ ĐỌC mà UI gọi bằng GET liên tục. Một luật bảo mật quá tay thì hỏng đúng thứ nó định bảo vệ. Neo `sync$`/`migrate$`, và có test khoá danh sách chỉ-đọc.
- Đo live: GET `/set-hybrid` → **405** · POST → 200 · `Sec-Fetch-Site: cross-site` → **403** · `/` `/sync-pulse` `/memory-status` → 200.

### `/init-fresh` gỡ (audit F2)
0 người gọi ở cả FE lẫn CLI, mà là thao tác **dời docs cũ đi**. Năng lực không mất: `zemory init --fresh` gọi thẳng `freshHarness()`.

### Web capture Claude.ai — provider mới (cùng khung ChatGPT)
- `PLATFORMS.claude` trong `scanweb.ts` + adapter `adapters/claudeweb.ts`. **Khác ChatGPT ở hai chỗ**: xác thực bằng **cookie phiên** (không có bearer token) nên mọi lời gọi phải kèm `org uuid`; và `chat_messages` là **mảng PHẲNG đã đúng thứ tự** — không có nhánh chết nên không cần đi `current_node → parent` như `mapping` của ChatGPT.
- Giữ **lớp FULL**: `thinking` · `tool_use` · `tool_result` đều được giữ và gắn nhãn theo đúng quy ước adapter Claude Code, để `roleMatches()` và việc hạ điểm tin tool nhận ra. Khối lạ (Anthropic thêm loại mới) ⇒ rơi về `text` phẳng, **không mất message**.
- `sender: 'human'` quy về `role: 'user'` cho khớp mọi adapter khác — không quy đổi thì bộ lọc role bỏ sót nguyên một nguồn.
- 6 test với fixture đúng dạng API claude.ai. **Chạy thật:** lệnh mở đúng cửa sổ đăng nhập; capture end-to-end **chờ user đăng nhập một lần** (giống hệt bước đầu của ChatGPT).

---

## [2026-07-27g] — F1 + F2 đã xử: bản chuẩn đọc từ NGUỒN · năng lực migrate hết mồ côi

Gate 227 → **230**.

### F1 — UI tra cứu đang hiện SAI 60%, nay đọc thẳng từ `03_STRUCTURE.md`
- Đo trước khi sửa: nguồn có **90 hàng cây / 66 dòng routing**, UI hiện **35 / 26** — và 24 dòng còn hiện thì là bản **viết tắt tay**, chữ khác nguồn (`"endpoint app MÌNH mở ra"` → `"endpoint mình mở"`). Hai slot `graph/` `adapters/` thêm sáng nay cũng không lên UI. `03_STRUCTURE.md` đã đổi **38 lần**.
- **Một bề mặt CHỈ-ĐỌC mà nói sai thì nguy hơn một bề mặt báo lỗi:** người ta vào đó để TRA, không thấy dòng mình cần thì kết luận "chuẩn chưa khai" rồi đẻ folder ngoài chuẩn — trong khi chuẩn có khai.
- `backend/src/docs/standard-spec.ts` (mới) parse §cây + §routing từ chính file .md; endpoint `/standard-spec?profile=app|non-app`. Parse khớp nguồn **90/90 và 66/66**.
- **Tìm section theo TÊN, không theo số** — non-app đánh số khác app (§2 cây / §3 routing). Ghim số thì một profile trả rỗng mà không ai biết; bắt được lúc đo (non-app ra 0), đã khoá bằng test.
- FE **fail-open**: fetch/parse hỏng thì rơi về bảng hardcode cũ và ghi rõ *"bản dự phòng"* trên nhãn — UI không bao giờ trắng.
- Hệ quả phụ: 26 chuỗi tiếng Việt trong `STRUCT`/`ROUTE` không cần dịch nữa vì chúng chỉ còn là bản dự phòng, không phải nguồn hiển thị.

### F2 — `analyzeMigration()` hết mồ côi
Đường DUY NHẤT chạm tới nó là endpoint `/migrate` mà không FE nào gọi; lệnh CLI cùng tên thì chỉ **in hướng dẫn 4 bước**. Nay `zemory migrate` in **bảng phân tích thật trước** (file chuẩn thiếu cái nào · file lạ đoán vai trò gì · có `docs/plan/` chưa) rồi mới tới các bước. Fail-open khi repo chưa có `docs/`.

### Song ngữ đợt 2 (tiếp)
`TITLES` 6 phụ đề màn → key, `go()` gọi `t()` khi vẽ. 8 tên tính năng/nhóm + 15 nhãn trạng thái → key ở **cả hai** từ điển, render qua `t()`.

---
