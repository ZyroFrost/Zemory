<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

## 🔴 ĐANG CHẠY — dựng lại chỉ mục ở 768 chiều + fp32 (máy `SS01-IT-12`)

> Kho thật `✓ lành` · **~207k tin · 1.284 phiên** · chìa `e6fb0eff` · repo `D:\huy.nguyen\Tool\Zemory`.
> Số đo + lý do đầy đủ: `06_CHANGES [2026-08-05]`. Cổng đã xanh: **510/510** · `conform` ✓ · đã push **1.1.1**
> *(đo lại 2026-08-07: `package.json` = 1.1.1, release commit `c58fa76`; dòng này trước ghi 1.1.0 — lỗi thời một bậc).*
> Kho thật lúc đo: **211.050 tin · 1.287 phiên** (số 207k/1.284 ở dưới là mốc 05/08, hook vẫn nạp thêm mỗi ngày).

> 🔄 **BÀN GIAO PHIÊN 2026-08-07 — đọc trước khi gõ gì.** Embed chạy trong **cửa sổ PowerShell RIÊNG
> của user**, output đã CHUYỂN HƯỚNG vào file (console không còn gì để in ⇒ hết bẫy đóng băng):
> `$env:GLOBAL_MEMORY_DB="D:\huy.nguyen\zemory-lab\lab.db"; $env:ZEMORY_MODEL_DIR="D:\huy.nguyen\Tool\Zemory\data\models";`
> `node dist\cli.js memory embed --all *> D:\huy.nguyen\zemory-lab\embed.log`
> **Mốc 2026-08-07 tối: 112.889/123.086 chunk (91,7%)** — còn ~10,2k, nhịp 32 chunk/phút ⇒ ~5,3 giờ.
> *(mốc trong ngày: 81,4% lúc chốt phiên trước → 88,2% chiều → 91,7% tối)*
> **Xem tiến độ (cửa sổ KHÁC, đừng đụng cửa sổ job):** `node D:\huy.nguyen\zemory-lab\watch.cjs` (bảng
> tự cập nhật 30s, tự báo ĐỨNG IM) hoặc `progress.cjs` (một phát). **Bài học trả giá 4 lần trong ngày:
> bôi đen/copy console đang in = Windows ĐÓNG BĂNG tiến trình** (mark-mode chặn write; ESC là chạy lại).
> Chết thì mũi tên lên + Enter, `--all` tự nối; **TUYỆT ĐỐI không `--rebuild`**.
> **Đừng smoke bằng `zemory ui`** — nó LUÔN bật cửa sổ thật lên desktop user (sự cố "344 KB không có
> data" 06/08 đêm — xem `[2026-08-07b]`); kiểm bề mặt thì curl daemon 4444 thật, read-only.

- [~] **Rebuild 768+fp32 trên BẢN SAO** `D:\huy.nguyen\zemory-lab\lab.db` (~43 giờ, đo thật).
  Chạy tiếp: `memory embed --all` với `GLOBAL_MEMORY_DB` trỏ bản sao **và** `ZEMORY_MODEL_DIR`
  ghim `data\models` (thiếu là nó tải lại 1,2 GB model, vì thư mục model suy ra từ thư mục DB).
  Bản sao đã đóng dấu `vec_config = {768, gemma-prompt-v1, fp32}`.
  - ⚠ **KHÔNG `npm run build` khi job đang chạy** — `clean` xoá `dist/` ngay dưới chân tiến trình
    (đã giết job một lần). Cần build thì `npx tsc` (ghi đè tại chỗ, không xoá).
  - ⚠ **Tiến trình agent tự phóng đều bị dọn** (`Start-Process`, WMI `Win32_Process.Create`);
    `schtasks` thì bị bộ lọc quyền chặn. Chỉ lệnh nền do harness quản lý mới sống qua nhiều lượt.
- [ ] **TRÁO kho sau khi xong (thứ tự bắt buộc):** `bench --recall` trên bản sao phải thắng mốc
  **41%@10** (điều 12) → thay file kho thật → `memory scan` nạp lại transcript sinh ra trong lúc
  chờ (idempotent, đọc từ đĩa) → `memory embed` bù phần mới ở 768/fp32.
  > 📏 **ĐO HAI LƯỢT, CẢ HAI SAU KHI EMBED XONG — đừng chạy song song với job** (bài học đo được
  > 2026-08-07: bench và embed cùng chạy mô hình ONNX trên một CPU nên giẫm chân nhau — bench ngốn
  > 3.208 s CPU mà 19 phút mới in nổi dòng tiêu đề, embed tụt về **0 chunk/30 s**; dừng bench thì
  > embed hồi lại **32 chunk/phút** sau ba mẫu đo. Ngoài ra bench chạy lúc máy bị chiếm thì cột
  > `ms/truy vấn` vô nghĩa). Kho thật 256 đứng yên tới lúc tráo ⇒ đo lúc nào trước tráo cũng cùng số.
  > ① `node dist\cli.js memory bench --recall --skip-rerank` (mặc định = kho THẬT 256) ⇒ mốc TRƯỚC.
  > ② `$env:GLOBAL_MEMORY_DB="D:\huy.nguyen\zemory-lab\lab.db"` rồi chạy lại ⇒ mốc SAU (768/fp32).
  > ③ So **BẢNG THEO LỚP** (`prose` · `tool_use` · `tool_result`), không so con số gộp.
  > Công cụ đã sẵn: corpus 56 câu chia lớp + bench in bảng theo lớp (commit `67a5812`).
  > 🔴 **BIẾT TRƯỚC: kho 768 sắp tráo VẪN thiếu vector cho hơn nửa số tin — đừng tưởng tráo xong
  > là recall hết rác** (user báo 2026-08-07: agent bên SasinFlow thấy `memory search` trả kết quả
  > lạc repo / ảnh / không liên quan, nghi kho hỏng vì cắt 256 chiều). Đo bằng MÃ, không qua search:
  > `vectors.ts` lọc `tool_name IS NULL` khi chọn tin để embed (chỉ mở bằng `ZEMORY_EMBED_TOOLS=1`),
  > và lệnh embed đang chạy KHÔNG đặt biến đó ⇒ 43 giờ này nâng phần ĐÃ có vector, **không lấp**
  > phần chưa bao giờ có. Cộng thêm `db.ts` loại chính nhóm đó khỏi FTS trigram ⇒ với phần kho ấy
  > chỉ còn MỘT chân tìm kiếm (FTS word). Khớp con số cũ: 119.668 tin tool-dump / 171 có vector.
  > **Chưa xác minh, đừng đoán:** "trả kết quả từ repo khác" nghe giống lỗi SCOPE (search vốn scope
  > theo project, trừ khi `--all`) hơn là lỗi số chiều; "trả về ảnh" chưa tìm ra nguyên nhân. Hai
  > cái này phải đo riêng — plan 17.
  > ✅ **User chốt 2026-08-07:** *cứ để 768 chạy cho xong, rồi embed tiếp đợt nhỏ cho các tin mới.*
  > Tức KHÔNG dừng job, KHÔNG thử tool-dump lúc này; việc embed tool-dump có đáng hay không để
  > **sau khi tráo + `bench --recall`** cho ra số thật, và phải qua phép thử nhỏ trên BẢN SAO
  > trước (HP điều 15 — tăng cũng phải đo trước).
- [ ] **HOOK ĐANG BẬT** (user bật lại 2026-08-05 chiều, sau cửa sổ gate). Hệ quả: **KHÔNG chạy
  `npm run check`** khi hook còn bật (60 test song song + hook ghi = tổ hợp hỏng kho 04/08);
  muốn chạy gate → user tắt (`zemory hook uninstall`) rồi bật lại — agent bị bộ lọc quyền chặn cả hai.
- [ ] **Rerank vẫn `q8`, CHƯA đo** — model khác (cross-encoder `bge-reranker-base`), số đo của
  embed KHÔNG suy ra được cho nó. User chốt tạm chấp nhận vì rerank chỉ chạy lúc TRUY VẤN, không
  dính đường nạp. Đo xong mới được đổi mặc định (điều 12).
- [ ] **Sau khi TRÁO: `zemory reindex`** một lần cho chỉ mục docs tươi (đợt dọn 78 dòng doc đường
  cũ 05/08 đã xong — Zemory 23 + 6 repo khác 55, xem `06_CHANGES [2026-08-05b]`).
  Kèm theo tự động: digest toàn kho sẽ TỰ DỰNG LẠI LƯỜI ở scan/scheduler kế tiếp — `DIGEST_VERSION`
  bump 3→4 (2026-08-06, `cleanPath` cắt văn xuôi khỏi `paths_touched`; đo 261/261 path bẩn xử sạch).
  KHÔNG cần `digest --all` tay trước tráo — kho hiện tại sắp bị thay, chạy là công dã tràng.
- [ ] **SAU TRÁO: viết plan 17 — recall quality** (file mới, chưa tồn tại: docs/plan/17_recall_quality;
  user chốt 2026-08-07: *"không cần fix cái
  cũ, muốn thêm thì viết thêm plan"* — trong mạch HP điều 15). Nội dung: các hướng TĂNG chất lượng
  recall, mỗi hướng kèm **phép thử nhỏ trên bản sao** trước khi bỏ công (khuôn `dims-test`): mở rộng
  corpus có nhãn (34 câu là mỏng) · rerank có đáng bật mặc định ở kho 768 không · chunk overlap ·
  truy hồi lai theo digest · embed cả tool-dump có đáng không (171/119.668 hiện nay là lỗ recall của
  57% kho — đúng chỗ vụ trigram lộ ra). **Cố ý chờ tráo xong** — viết bây giờ là spec chay không số.
- [ ] **Sao lưu NGOÀI máy — đã có MỘT phần:** bundle `.enc` trên Drive (baseline 289,7 MB + delta,
  auto-sync 05/08) phủ được phần NGUỒN; backup local 1,25 GB vẫn nằm **cùng ổ** với kho, và công
  embed 43 giờ chưa được bảo hiểm (bundle lean không chở vector) → sau tráo cân nhắc `export --full`.
- [ ] **Xoá `data\global_memory.HONG-20260804-*.db`** (1.025 MB) khi chắc kho mới chạy ổn.
  Cùng đợt: `attic\zemory-lab\lab.db` (1,18 GB, bản lab máy cũ đã lỗi thời) + folder
  `D:\huy.nguyen\zemory-lab` (sau khi tráo xong) — đều chờ user gật vì là XOÁ.

## 🚨 DB THẬT BỊ HỎNG 2026-08-03 — PHỤC HỒI ĐỦ · nguyên nhân gốc ĐÃ TÌM RA — còn MỘT việc code
> 🔄 **Cập nhật 2026-08-05 (soát TODO):** vế "còn treo nguyên nhân gốc" của mục này ĐÃ ĐÓNG —
> `06_CHANGES [2026-08-03h]` kết luận **Google Drive đồng bộ chính file DB** (dòng "Đã loại: thư
> mục đồng bộ đám mây" bên dưới là kết luận SAI thời điểm đó, giữ làm hồ sơ). Ngày 05/08 còn phát
> hiện thêm tầng nữa: DriveFS backup **cả `D:\huy.nguyen`** (kho + chìa lên mây trần) — user đã gỡ.
> **Việc CODE của mục này: ĐÃ ĐÓNG HẾT 2026-08-06** (`06_CHANGES [2026-08-06c]`): vá write-gate ✓
> · `relocate` chở cả cụm ✓ · cảnh báo sớm cloud (`cloudguard` + check `storage-safety`) ✓.
> Backup tự xoay vòng đã xây `[2026-08-03c]`; embed dở dang đã bị rebuild 768 thay thế.
> *(Sử gốc: phát hiện lúc bench recall; mất 0 tin; kho lúc đó 199.360 tin. Chi tiết `[2026-08-03b]`.)*

**Thiệt hại (đo, không đoán):** hỏng nằm ở `messages_fts*` · `section_fts*` · `changelog_fts*`
· `session_digest_fts_tri*` (bảng bóng FTS — 100% dẫn xuất) và chạm cả **bảng nguồn**:
`messages` · `attachment` · `section` · `changelog` · `vec_map`.

**Bản gốc hỏng giữ nguyên 2 bản** ở `data/corrupt-20260803-091106/` — KHÔNG xoá cho tới khi
truy xong nguyên nhân gốc (nó là vật chứng duy nhất).

- ✅ **`relocate` chở cả cụm — XONG 2026-08-06** (`[2026-08-06c]`: danh sách ĐEN, bí mật kẹt ⇒ huỷ).
- ✅ **Cảnh báo sớm cloud — XONG 2026-08-06** (`cloudguard.ts` + check `storage-safety`, đọc `roots`
  DriveFS thật; phân hạng bằng-chứng/dấu-vết chống báo oan — `[2026-08-06c]`).
- ✅ **TRUY NGUYÊN NHÂN GỐC — ĐÃ ĐÓNG** (Drive đồng bộ chính file DB — `[2026-08-03h]`; 05/08 lộ thêm
  tầng Computers-backup). Hồ sơ điều tra giữ nguyên bên dưới **để không ai đi lại**; dòng "đã loại:
  thư mục đồng bộ đám mây" là kết luận SAI thời điểm đó, đọc kèm cảnh báo này.
  - **Đã loại:** đĩa đầy (D: còn **168 GB**) · thư mục đồng bộ đám mây (D: là đĩa cục bộ,
    Drive nằm ở G: — điều 11 không bị vi phạm).
  - **Nghi, chưa chứng minh:** hôm nay là ngày ĐẦU TIÊN chạy **ghi per-message** (hook Stop
    sau mỗi lượt) — tức tiến trình ngắn hạn ghi DB **xen kẽ** daemon + embed nền + script đo.
    `daemon.log` cho thấy **8 lần daemon khởi động trong ~6 giờ ngày 02/08, gần như không lần
    nào tắt sạch** (tôi `Stop-Process -Force` để chạy gate). WAL vốn chịu được kill, nên
    riêng việc kill CHƯA đủ giải thích — nhưng hỏng bắt đầu đúng ở `vec_chunks_rowids` và
    bảng bóng FTS, tức hai cấu trúc do **extension/virtual table** quản lý, không phải B-tree
    thường. Cần xem còn ai mở DB bằng đường khác (`vecConnect` mở READ-WRITE) lúc bị kill.
  - ✅ **ĐÃ ĐỌC CODE, tìm ra HAI khuyết tật THẬT — và đây là bằng chứng, không phải suy đoán:**
    - **① Bộ ba ghi vector KHÔNG nguyên tử (đã sửa).** `vectors.ts` ghi `vec_map` **TRƯỚC**
      vector, `vec_hash` **SAU**, ba lệnh là ba autocommit RỜI. Khớp CHÍNH XÁC với trạng thái
      tìm thấy trong DB hỏng: `vec_map` trỏ tới rowid `vec_chunks` không có, `vec_hash`
      119.784 vs `vec_chunks` 142.840. Bản thân code đã tự thú: comment trong `writeVectorRaw`
      viết *"repair by updating the existing row so backfill can resume **if another writer
      already filled it**"* — tức đường ghi này VỐN đã biết có kẻ ghi song song và chỉ vá tạm.
      ⇒ Đã bọc cả ba vào **một** giao dịch (`insTx`/`copyTx`).
    - **② Write-gate KHÔNG BAO GIỜ TỪ CHỐI ai — ĐÃ SỬA** *(soát bằng code 2026-08-06; dòng này
      trước ghi "chưa sửa", SAI — sổ nói khác code)*. Khuyết tật gốc: `acquireCliWrite()` chỉ đặt
      một mốc thời gian và luôn trả `{ok:true, held:true}` — **hai CLI cùng gọi thì cả hai đều
      được "cấp"**. Cổng một chiều: chỉ bảo *scheduler của daemon* nhường, KHÔNG loại trừ
      CLI↔CLI; và `daemonPort()` trả null khi daemon chết ⇒ **không có cổng nào cả**.
      ⇒ Đã có khoá THẬT: `acquireCliWriteLock(label)` (`jobs/writegate.ts`) ghi **khoá FILE**
      mang `{pid,label,at}`, **trả `ok:false` + `heldBy`** khi tiến trình KHÁC đang giữ, gia hạn
      khi chính mình giữ (heartbeat cho job nhiều giờ); không đặt được khoá thì CHẠY (điều 9).
      `commands/memory.ts` bọc `HEAVY_WRITES = {scan · scan-web · embed · digest · sync}`, chờ
      tối đa 2 phút rồi chạy luôn. Test khoá `cli-write-lock.test.mjs` (có ca "phải bị từ chối").
  - ⚠ **NHƯNG CHƯA GỌI LÀ TÌM RA NGUYÊN NHÂN.** Hai khuyết tật trên giải thích được **lệch
    giữa các bảng vector**; chúng KHÔNG giải thích `database disk image is malformed` ở tầng
    trang đĩa. Muốn kết luận thì phải TÁI HIỆN: ép hai tiến trình ghi `vec_chunks` đồng thời
    rồi kill giữa chừng. Chưa làm được ⇒ vẫn để mở.
  - ⚠ **Phép kiểm mới KHÔNG chứng minh tính nguyên tử — tôi đã thử đột biến và nó vẫn XANH.**
    Gỡ `db.transaction` ra, `vector-write-atomic.test.mjs` vẫn qua: trong một tiến trình không
    bị ngắt, hai lệnh rời vẫn thành công cả hai. Nó chỉ là chốt hồi quy cho lớp lỗi tất định.
    Ghi rõ ở đây để không ai đọc nhầm cổng xanh thành "đã chứng minh".
  - **Chưa xem:** nhật ký sự kiện Windows (lỗi đĩa), và liệu `project_merge apply` hôm qua
    (UPDATE 115 dòng trong một giao dịch) có để lại dấu gì không.
- *(ĐÃ XONG, giữ dòng để khỏi mở lại: lịch backup tự động + xoay vòng đã xây `[2026-08-03c]` —
  chính nó cứu vụ kho hỏng lần hai trong 2 phút, `06_CHANGES [2026-08-04]`.)*

## 🎯 ĐÃ CHỐT 2026-08-05 — dựng thẳng **768 chiều + fp32** (user quyết), đang chạy

**Bằng chứng dưới đây GIỮ LẠI:** nó giải thích vì sao chọn 768, và mốc **41%@10** của nó chính là
ngưỡng bản sao phải vượt thì mới được tráo vào kho thật.

**Nghẽn KHÔNG phải rerank — là lớp NHÚNG.** Chuỗi đo trên corpus 34 câu có nhãn, kho thật:
`recall@10 41%` · `@40 56%` · `@100 56%` · `@200 56%` · `@500 56%` ⇒ **chạm trần**.
**15/34 câu (44%) đáp án KHÔNG bao giờ được lấy về**, dù nhìn tới 500 kết quả. Nới `POOL`
60 → 200 → 500 **không đổi một con số nào**. 15 tin trượt vs 19 tin tìm ra: dài 714 vs 635 ký
tự, **cả hai nhóm đều 100% CÓ VECTOR** ⇒ không phải thiếu chỉ mục, không phải chunk, không
phải xếp hạng.

**Phép thử có kiểm soát** (`scratchpad/dims-test.mjs`, chạy trên bản sao `D:/zemory-lab/lab.db`):
EmbeddingGemma huấn luyện Matryoshka nên **256 chiều CHÍNH LÀ 256 số đầu của 768** — embed MỘT
lần ở 768 rồi so bốn cách cắt trên **cùng một dãy số**, nên khác biệt duy nhất là số chiều.

| chiều | @1 | @3 | @10 | @40 | MRR |
|---:|---:|---:|---:|---:|---:|
| 128 | 62% | 82% | 88% | 97% | 0,728 |
| **256** *(đang dùng)* | **74%** | 88% | 97% | 97% | **0,816** |
| 512 | 85% | 97% | 97% | 100% | 0,913 |
| **768** *(gốc của model)* | **91%** | 97% | 100% | 100% | **0,944** |

Tăng ĐỀU qua cả bốn mức ⇒ quan hệ thật, không phải nhiễu. `recall@1` **74% → 91%** là chỉ số
đáng giá nhất (agent tra cứu cần đúng ngay vị trí đầu).

**Vì sao đang là 256:** cắt hồi 2026-07 để giảm DB **1.141 MB → 595 MB**. Đánh đổi có chủ đích,
nhưng **lúc đó chưa ai đo được nó lấy mất bao nhiêu chất lượng** — bench khi ấy dùng corpus 8
câu bão hoà và `topN=10` nên không nhìn quá 10 kết quả. Giờ mới có thước.

- **ĐƯỜNG ĐÃ CHỌN: ③ làm thẳng 768 + fp32** *(quyết định — không phải việc; việc đang chạy là mục
  [~] ở đầu file)*. Hai số đo mới (2026-08-05) làm hai lựa chọn kia mất lý do tồn tại:
  - **512 KHÔNG rẻ hơn 768 một giây nào** — model luôn tính đủ 768 rồi `sliceNormalize` mới cắt,
    nên hai mức là **cùng một lần chạy model**; khác biệt duy nhất là dung lượng (297 vs 446 MB).
    Ưu điểm "tốn 2/3 thời gian" của phương án ② là SAI, đã bác.
  - **Chi phí thật rẻ hơn ước cũ nhiều:** 123.086 chunk duy nhất × 1,26 s = **43 giờ** (ước cũ
    60–190 giờ dựa trên 3,4 s/tin và chưa trừ dedup 19% + tool call).
  - Đo lại với 3.000 mồi (phương án ①) **bỏ**: nó tốn ~1 giờ chỉ để tinh chỉnh một lựa chọn mà
    giờ không còn đánh đổi — 768 đã trội cả về chất lượng lẫn thời gian.
- *(Luật user đã chốt, KHÔNG phải việc: mọi thí nghiệm chạy trên BẢN SAO — bản đang dùng:
  `D:\huy.nguyen\zemory-lab\lab.db`, chụp bằng `db.backup()` nên nhất quán.)*
- *(Hạ tầng sẵn: `ZEMORY_POOL` · `ZEMORY_RERANK_POOL` · `ZEMORY_RERANK_CHARS` chỉnh từ ngoài;
  bench có cột `@40` + kết luận tự động; `topN` 10 → 40.)*

## 🆕 Phát sinh 2026-08-07 tối (sau release 1.2.0) — 4 việc

- [ ] **CHẠY 5 FILE TEST CÒN MÙ sau khi embed xong:** `embed` · `rerank` · `vectors` ·
  `memory-search` · `digest`. Ba lượt audit hôm nay CỐ Ý bỏ chúng để không tranh CPU với job
  embed (đo thật: bench chạy song song làm embed tụt về 0 chunk/30 s). Ghi ra đây để **không ai
  đọc "audit xanh" thành "đã soi hết"** — vùng này chưa được soi trong cả ba lượt.
  Chạy CÙNG DỊP hai lượt bench, không cần lượt audit riêng.
- [ ] **(chờ user) Guard PreToolUse thêm ~650 ms MỖI tool call** — đo 2026-08-07: Bash cho qua
  652 · Bash bị chặn 734 · Read 660 · Write 437 ms (p50, đo TRONG lúc embed chạy nên là cận
  trên). Vài trăm tool call/phiên ⇒ cỡ 1–2 phút. Không phải lỗi, là **chi phí cần quyết**: có
  thu hẹp `matcher` trong `.claude/settings.json` không (vd bỏ `Read` — nhưng mất chốt chặn đọc
  file khoá trực tiếp). Đường gỡ hoàn toàn: xoá `.claude/settings.json` của repo.
  ⚠ **Guard chỉ ăn TỪ PHIÊN SAU** (hook nạp lúc mở phiên). Đo 07/08: `.allow-push` vẫn còn
  nguyên sau khi push ⇒ phiên đó guard chưa gác. Từ phiên tới `git push` sẽ bị chặn tới khi
  user duyệt; flag đã tự dọn, KHÔNG để lại sẵn.
- [ ] **Chưa tạo git tag `v1.2.0`.** Repo mới có tag dạng mốc-trước-refactor, chưa có tag
  version nào — không tự tạo tiền lệ mới. Một lệnh là xong nếu user muốn.
- [ ] **(ĐỪNG "dọn cho đẹp") Index lưu đường theo separator của OS**, không phải posix: 23 doc
  row của repo này đều dạng `docs\agent\…`, và mọi chỗ TRA cũng ghép bằng `join`. Đợt vét 07/08
  từng "chuẩn hoá" sang `/` và hậu quả đo được: `plan ls` im lặng báo "index rỗng" dù chỉ mục
  đủ, và lần `reindex` sau sẽ đẻ doc row TRÙNG. Chuyển sang posix là một **MIGRATION riêng**
  (phải đổi cả index cũ + mọi chỗ tra trong cùng bước), không phải việc dọn dẹp lẻ.

## 📌 Cowork — còn treo
- [~] **Đường TẢI vẫn chưa test — test 1 đi vòng qua nó.** Phiên Cowork thật đầu tiên (2026-07-28,
  repo `vietnam_34_provinces_grdp_dashboard` clone vào `D:\Zyro\Tool\test`) **không dùng URL**: agent
  phát hiện máy có sẵn bản chuẩn ở `D:\Zyro\Tool\Zemory\docs_template\nonapp`, **tự đối chiếu số dòng
  8/8 rồi chép thẳng từ đĩa** — một lối BOOTSTRAP chưa hề khai. Đó là lối rẻ nhất và nó tự kiểm trước
  khi chép, nên đã **khai chính thức thành "lối 0"** (kèm bắt buộc đối chiếu số dòng — bỏ bước đó thì
  có nguy cơ chép nhầm bản cũ).
  - **ĐÃ CÓ SỐ THẬT (2026-07-30, user chụp lại phiên trên thư mục `test2` trắng — không có bản local nên
    rơi đúng vào đường mạng):** `curl` thẳng tới `raw.githubusercontent.com` **BỊ CHẶN** — sandbox chỉ ra
    được miền Anthropic, đúng như BOOTSTRAP §1a dự đoán. **Lối 1 (tool lấy nội dung web của Cowork) CHẠY**:
    agent tự chuyển sang lối đó và ghi ra file theo từng lô (5 → 4 → 2 …), panel file hiện `AGENTS.md` ·
    `CLAUDE.md` · `01_CONSTITUTION` · `02_RULES` · `05_TODO` · `06_CHANGES` · `00_overview` · 2 `SKILL.md` ·
    `conventions.md` · `check_structure.py`. ⇒ **Thứ tự lối trong BOOTSTRAP là đúng, và máy sếp sẽ dựng được.**
    *(Bằng chứng là ảnh chụp phiên, không phải tôi tự chạy — và phiên đó chụp lúc còn đang chạy Giai
    đoạn 1, CHƯA thấy BÁO CÁO CUỐI. Tức chưa kết luận được: dựng trọn bộ 19 file, và bước tự kiểm
    cuối — script check_install chạy BÊN MÁY SẾP — có xanh không. File script tồn tại trong repo
    nguồn không nói gì về lần cài bên kia; `todo verify` từng giơ cờ mục này vì đúng chỗ đó.)*
  - **Đã biết thêm (đo được từ chính phiên đó):** sandbox Cowork **ĐỌC được filesystem của host** — nó đọc
    thẳng `D:\Zyro\Tool\Zemory`. Khớp tài liệu sandbox của Claude Code (*"Read access covers the entire
    filesystem"*). Ghi vào không rõ, chưa thử.
  - **Agent tự áp `02_RULES §Phạm vi project` đúng chỗ:** dừng lại hỏi trước khi ghi harness vào cây git
    public của user, dù không ai nhắc. Luật đó ăn.

## 📌 Bàn giao 2026-07-28 — ĐÃ ĐÓNG 2026-08-05 (user duyệt → `06_CHANGES [2026-08-05d]`)
> Ba lane web (claude-web 3 lỗi · hỏi-đăng-nhập giữa run · nút Quét kéo web) + lane `claude-cowork`
> đã ghi sổ đầy đủ ở entry đó. Quyết định "KHÔNG lấy cookie từ trình duyệt chính" giữ nguyên.

<details><summary>Bản gốc 3 mục (giữ để tra lại lý do — nội dung đã vào changelog)</summary>

- **`claude-web` — ĐÃ GHI SỔ `[2026-08-05d]`.** *(hồ sơ đo, không còn là việc)*
  > 🔄 **Bác bỏ chẩn đoán cũ của chính mục này** (*"MẤT TRẮNG chat trong Project vì thiếu
  > `projectConvsExpr`"*). Sai. Đo hai đường trước khi sửa: ① item của
  > `…/<org>/chat_conversations` mang `project_uuid` **không null**; ② so TẬP id với
  > `…/<org>/projects/<pid>/conversations` ⇒ **`projectIdsMissingFromLoose: []`**. Tức danh sách
  > phẳng của claude.ai **đã chứa cả chat trong Project** — khác ChatGPT, nơi comment
  > *"A Project's chats are NOT in the loose list"* mới đúng. Tài khoản này **thật sự chỉ có 2 hội
  > thoại / 1 project**, nên "2 phiên · 6 tin" là con số ĐÚNG, không phải triệu chứng.
  > ⇒ **KHÔNG thêm `projectConvsExpr` cho claude** — nó chỉ kéo về đúng những id đã có (`CLAUDE_LIST`
  > có comment ghi rõ + test khoá, để phiên sau khỏi "vá" lại).

  **Ba lỗi THẬT tìm được khi đo, đã sửa:**
  1. **`o[0]` làm org** — account có 2 org (`chat`·`claude_max` và `api`·`api_individual`); máy này
     tình cờ đúng. Nay chọn theo caps `chat`; không org nào có caps `chat` ⇒ **báo lỗi rõ**, không im
     lặng dùng org rỗng (biểu hiện y hệt "chưa đăng nhập").
  2. **Khoá resume hardcode `chatgpt-`** trong khi adapter claude ghi `claudeweb-<uuid>` ⇒ resume chết
     lặng, **mỗi lần chạy kéo lại toàn bộ tài khoản**. Nay `Platform.sessionPrefix`, test so PARITY với
     id adapter thật sinh ra. *(Đo trên DB thật: 2 phiên đều mang tiền tố `claudeweb-`.)*
  3. **`project_root` là uuid thô** — payload CHI TIẾT (`?tree=True…`) có `project_uuid` nhưng
     `project: null`; chỉ danh sách phẳng mới có `project:{name}`. Nay `CLAUDE_PROJECTS` map uuid→tên +
     sidecar `_projects.json` (dùng chung `readProjectMap` với ChatGPT). **Đo sau khi chạy thật:
     `019f68e1-…` → `VU-Project`.**

  **Cowork vẫn KHÔNG lấy được qua đường này** — `cowork_sessions` · `tasks` · `sync/mcp` đều **404**
  (đo 2026-07-30). Vá Project không đổi điều đó; đừng hứa ngược lại.
- **Hết hạn xác thực khi scan web → HỎI + mở cửa sổ — ĐÃ GHI SỔ `[2026-08-05d]`.**
  Trước: `need-login` là ngõ cụt — in *"a browser window is open at …"* **kể cả khi không mở cửa sổ nào**
  (chỉ mở khi cổng debug chết), và hết hạn GIỮA run thì mọi hội thoại còn lại đếm thành `failed`, log
  trông y như bị rate-limit. Nay: `awaitLogin()` mở cửa sổ **trước** rồi mới hỏi, kiểm lại auth sau mỗi
  câu trả lời; giữa run cứ **3 lần fail liên tiếp** thì hỏi lại site xem còn đăng nhập không — mất phiên
  thì lưu phần đã kéo, hỏi, đăng nhập xong **chạy tiếp tại chỗ**. Không TTY (daemon/pipe) ⇒ mở cửa sổ rồi
  báo `need-login` + exit 1, **không treo** chờ câu trả lời không ai gõ được.
- **UI: nút Quét kéo được web + hỏi đăng nhập — ĐÃ GHI SỔ `[2026-08-05d]`.** *(user báo 2026-07-30:
  "bấm scan nó ra mới nhưng vẫn ko lấy từ web dc, cũng ko hề hỏi authen")*
  **Nguyên nhân:** cả hai nút (`scan`·`deepscan`) POST `/memory-scan` → `scan()` = **chỉ đọc đĩa**. UI
  **chưa bao giờ** có đường quét web ⇒ không lấy được web, và cũng không có chỗ nào để hỏi authen. Bản
  sửa CLI trước đó đúng nhưng nằm sai bề mặt.
  **Thiết kế user chốt:** *gộp vào nút Quét sẵn có + công tắc bật/tắt, nhớ qua phiên* (không đẻ nút mới).
  ⇒ `getScanWeb()` mặc định **TẮT** · `/memory-scan?web=1` · `/memory-scan-web?platform=` (nút "chạy tiếp"
  sau khi đăng nhập) · `/set-scan-web` · công tắc `data-auto="scanweb"`.
  **Vì sao UI không hỏi trực tiếp trong lúc quét:** giữ request HTTP mở để chờ người đăng nhập là treo
  daemon ⇒ server chạy **không tương tác**, chỉ MỞ cửa sổ rồi trả `need-login`; chỗ HỎI nằm ở dialog UI.
  CLI vẫn hỏi ngay tại terminal (có TTY).
  **Scheduler nền KHÔNG kéo web** (test khoá) — 10 phút một lần tự mở trình duyệt là hành vi không ai xin.
  **Đo bề mặt sống:** `POST /memory-scan` trả `web: [{chatgpt: need-login}, {claude: done · skipped 2}]`,
  và cửa sổ đăng nhập chatgpt **mở thật** (pid 7440, đúng thời điểm quét).
- **KHÔNG lấy cookie từ trình duyệt chính (user hỏi 2026-07-30) — quyết định GIỮ NGUYÊN, không phải việc.**
  Đã xác minh từ `plan/07 §5`: copy cookie/DPAPI từ profile Edge có sẵn bị **App-Bound Encryption** +
  guard chặn; vượt được chỉ bằng cách tiêm vào tiến trình trình duyệt (kiểu malware) và phá điều 7. Cookie
  **đã tự dùng lại** trong profile RIÊNG của zemory (`data/browser/<nền>`) — hỏi đăng nhập chỉ xảy ra khi
  chính cookie đó hết hạn. Ghi lại đây để phiên sau khỏi thử lại đường đã chết.

</details>

## 🔓 COWORK ĐỌC ĐƯỢC — ✅ ĐÃ BUILD XONG (soát lại 2026-08-07); còn đúng 1 CÂU HỎI chờ user
> ⚠ **Sổ đã nói khác code — heading cũ ghi *"chỉ còn viết adapter"*, SAI.** Đo đủ ba nguồn 2026-08-07:
> ① **MÃ** — `backend/src/memory/adapters/cowork.ts` (parse event → tin, giữ khối tool) **và** đường KÉO
> trong `backend/src/memory/scanweb.ts` (`PLATFORMS.cowork`, `/v1/code/sessions`, đi cùng cửa sổ claude.ai)
> + test `backend/test/cowork.test.mjs`; commit `1e151de`. ② **GM/git** — lane ship cùng đợt "thu hội thoại
> web nhiều tài khoản". ③ **CHẠY THẬT** — daemon 4444 báo source `claude-cowork`: **1 phiên · 63 tin**
> (16/07) đã nằm trong kho. ⇒ Adapter KHÔNG còn là việc; **gate `todo verify` xanh vẫn không bắt được ca
> này** (nó chỉ phủ 20/58 mục có tên tra được), nên ghi ra đây để phiên sau khỏi build lại lần hai.
> *(Vẫn đúng: 3 phiên user cần — "Harness AI" v.v. — CHƯA có trong kho, mới 1 phiên; xem câu hỏi bên dưới.)*

> 🔄 **Đảo kết luận cũ.** `06_CHANGES [2026-07-30d]` ghi *"phiên Cowork không phơi qua claude.ai"*
> vì 3 endpoint đoán mò (`cowork_sessions` · `tasks` · `sync/mcp`) đều 404. **Sai vì đoán sai chỗ:**
> Cowork KHÔNG nằm dưới `/api/organizations/…` mà ở **`/v1/code/sessions`**. Tìm ra bằng cách cắm móc
> vào `fetch` của trang rồi mở thật một phiên (`Page.addScriptToEvaluateOnNewDocument` để móc sống qua
> lần tải lại) — đoán URL 6 lần đều trượt, móc một lần là ra.

**Công thức (đã gọi thật, 200):**
```
GET /v1/code/sessions?tags=cowork-remote&limit=100&include_trigger_sessions=true   → {data[], resume_token}
GET /v1/code/sessions/<cse_id>/events?limit=500                                    → {data[], resume_cursor}
headers BẮT BUỘC (thiếu ⇒ 400, kể cả khi đã đăng nhập):
  anthropic-version: 2023-06-01 · anthropic-beta: ccr-byoc-2025-07-29
  anthropic-client-feature: ccr · anthropic-client-platform: web_claude_ai
  x-organization-uuid: <org có caps 'chat'>
```
**Shape:** session `{id: cse_… , title, created_at, last_event_at, status, user_message_count, tags}` ·
event `{event_id, event_type, created_at, sequence_num, payload}`. Đo trên phiên *"Claude-swap setup"*:
**218 event** → `user` 30 (payload.message.content là **CHUỖI**) + `assistant` 50 (content là **MẢNG block**
`{text}`) = **80 tin thật**; phần còn lại (`system` 61 · `control_request/response` 36 · `env_manager_log` 26
· `result` · `active_goal` · `prompt_suggestion` · `rate_limit_event`) là điều khiển/log.

- [ ] **CÂU HỎI đang chờ chính 3 phiên đó trả lời — bộ chuẩn Cowork có bị CẮT QUÁ TAY?**
  Nguyên văn user (`GM #2136043`, 2026-07-30): *"bộ cowork rút gọn là lúc t làm việc bên cowork của
  claude, bên đó bàn là để **tiết kiệm token khi load**, mới loại bỏ khá nhiều, vì **cowork ko có bộ não
  global như hệ claudecode** nên nó ko chứa nhiều thông tin để nén dc… nhưng **tui ko nghĩ là nó lại cắt
  quá nhiều như vậy**… t cần bạn tra gm để kiểm tra **đã nói gì và đã quyết định ntn**"*.
  **Nghi vấn cụ thể nhất:** bộ cowork **không có `03_STRUCTURE`** (chỉ `01_CONSTITUTION`·`02_RULES`·
  `05_TODO`·`06_CHANGES` — đo `GM #2136037`), trong khi user khẳng định (`#2136034`) *"logic ban đầu của
  tui chính là để 03 làm luôn công việc của dictionary… ý định ban đầu là hợp nhất vào 1 file"* và 03
  vốn **vừa là cây thư mục vừa là mô tả từng dòng** (`#2136039`·`#2136041`).
  ⇒ Cần **quyết định gốc** (cắt gì · vì sao) để chấm "cắt này có lý do token thật hay quá tay".
  *(2026-07-31: user sẽ COPY THẲNG nội dung từ Cowork sang thay vì chờ capture.)*

## 📐 Đối chiếu bộ COWORK vs bộ ĐẦY ĐỦ (đo 2026-07-31) — 2 việc
> Nền quyết định (GM `#2131427`, user 29/07): *"dùng harness zemory **ko có nghĩa là toàn bộ**… kết hợp
> với harness của chính claude… **vẫn đủ ý, đủ luật của zemory** và **cắt nhỏ lại phù hợp cho memory
> ngắn hạn của claude**… nếu cần thì sẽ **bổ sung thêm phần template cowork lại**"*.
>
> **Kết quả đối chiếu — phần lớn KHÔNG mất, chỉ đổi nhà:** `03_STRUCTURE` (130 dòng) → skill
> `structure/` (SKILL 97 + conventions 129 + `check_structure.py` 227) — **nhiều hơn bản gốc**, giữ đủ
> cây-có-mô-tả + routing + dòng `docs/dictionary.md`. `04_SKILLS` (233) → 13 skill nạp on-demand.
> Changelog/supersede → `session-close` Bước 3. Global Memory-verify → `session-close` Bước 1 **có rào
> 🖥️ "chỉ khi có zemory CLI"**. Bộ cowork còn SỬA một lỗi của template gốc: `audit` bỏ 3 mặt app-only
> (`npm run check` · FE↔BE · `integrity_check`) vốn không áp được cho non-app.

## 🔌 Đối chiếu engram — 6 việc ĐÃ XONG + ghi sổ (`06_CHANGES [2026-08-02f]`/`[g]`, chi tiết ở đó); còn:
> Số nền đo trên BINARY THẬT (engram v1.20.0): engram **22 tool** · zemory **12**. `DOCS.md`
> của họ liệt kê thiếu 2 tool — đọc tài liệu KHÔNG thay được chạy binary. Cowork vẫn ngoài
> phạm vi MCP (máy ảo riêng).

> ⏸ **HOÃN VÔ THỜI HẠN 2026-08-06 (user chốt): mọi mục nhánh CODEX + GEMINI.** Nguyên văn:
> *"cái này ko cần quan tâm, t chưa làm… bỏ qua đi"* — user chưa dùng hai host đó, nên khai MCP
> cho `codex`, mở rộng hook Codex, và nền web Gemini đều KHÔNG có người tiêu thụ. Giữ nguyên hồ
> sơ (đo đạc còn giá trị nếu sau này dùng tới); **đừng đưa lại vào danh sách ưu tiên khi chưa hỏi.**

- [ ] ⏸ **Ba agent chưa khai tự động được** (đã nêu tên trong `setup mcp`, không im lặng bỏ qua):
  `codex` (cấu hình **TOML**) · `opencode` (khuôn entry khác) · `pi` (nối bằng plugin package).
  **Đo trên engram v1.20.0 (2026-08-02) — họ làm được cả ba, và đây là hình dạng cần khớp:**
  `codex` → ghi `%APPDATA%/codex/config.toml` (642 B) + `engram-instructions.md` + prompt phục
  hồi sau nén · `opencode` → `~/.config/opencode/opencode.json` + plugin `engram.ts` **21 KB**
  · `pi` → cài npm `gentle-engram`, cần `pi` trong PATH (thiếu thì lệnh của họ cũng lỗi).
  ⇒ khoảng cách là THẬT, không phải giới hạn của ngành. Rẻ nhất là `codex` (chỉ cần bộ ghi TOML).

## 🧷 Context-guard + realtime capture — ĐÃ BUILD XONG `[2026-08-02h]`; còn 2 việc
- [ ] ⏸ **Codex chỉ nhận `Stop`** — hệ hook của nó không có `UserPromptSubmit`/`PreCompact`/
  `SessionStart`, nên máy chạy Codex có capture per-message nhưng KHÔNG có đồng hồ context
  lẫn lưới sau nén. Chưa tìm hiểu Codex có sự kiện tương đương không.
  *(HOÃN 2026-08-06 — user chưa dùng Codex; xem ghi chú ⏸ ở §🔌 engram.)*
> ✅ **Bốn mục dưới ĐÃ XONG — dấu đã đổi `[ ]` → `✅` (05/08), soát lại bằng code 2026-08-06 vẫn
> đúng:** `WARN_AT_PERCENT = 95` (`capture-hook.ts:28`) + marker chống spam
> (`context-guard/<sid>.warned`) · handler `pre-compact` · handler `session-start` chỉ nói khi
> `source=compact` + `recallCard` · bảng khai hook có đủ 4 sự kiện (`capture-hook.ts:191–194`) ·
> `context-guard.ts` có `readContextUsage` + `lastCompactAt`.
> **Giữ nguyên dấu `✅` — đừng đổi ngược về `[ ]`,** phiên sau sẽ build lại lần hai.

> Gốc: đối chiếu "compaction recovery" của engram. **Session-lifecycle KHÔNG làm** (đã có tốt
> hơn, tự động: sessions từ transcript + digest 100%). "Nén từng đoạn hội thoại": digest
> per-phiên ĐÃ CÓ (plan 06, 2026-07-02); compression đúng nghĩa đã BỎ 2026-06-25 (attic/).
> Số đo nền (2026-08-02): usage nằm sẵn trong transcript (`cache_read+cache_create+input` —
> phiên thật đo 439k) · scan incremental cả kho: **7,2s** có tin mới · **1,8s** no-op ·
> **~125s khi embed nền chạy** (tranh CPU + write-gate — hook sẽ timeout, scheduler lượm lại).

- ✅ **① Hook `context-guard` (UserPromptSubmit, Claude Code) — GỘP cảnh báo + lưu (ý user).**
  Đọc `usage` tin cuối transcript phiên hiện tại → % cửa sổ (200k/1M theo model id). Dưới
  ngưỡng ⇒ **im lặng tuyệt đối**. Chạm ngưỡng (mặc định **95%**, config được) ⇒ MỘT phát làm
  cả hai: ingest ngay ĐÚNG file transcript này (đường scan-1-file mới, xem ③) + in 1 dòng:
  *"⚠ context ~95% — phiên đã lưu FULL vào GM. Chốt việc dở/ghi sổ trước khi bị nén; sau nén
  gọi `memory_context`."* Chống spam: **1 lần/phiên** (cờ marker). Verify lúc build: kênh
  hiển thị hook output tới user; công thức % có sai số cache/model.
- ✅ **② Lưới sau nén:** `PreCompact` → scan lần cuối ngay trước nén (đỡ ca compact ập tới
  không qua ngưỡng) · `SessionStart(matcher: compact)` → thẻ phục hồi 1-LẦN (`recallCard` +
  câu "vừa bị nén — kho còn nguyên, tra lại trước khi làm tiếp"). Handler session-start ĐÃ CÓ
  SẴN trong `capture-hook.ts` (opt-in chưa cài) — chỉ thiếu khai matcher. Đây là auto-inject
  đầu tiên của hệ: 1 thẻ nhỏ, đúng 1 lần, đúng sự kiện mất trí nhớ — user đã chốt; ghi
  changelog như diễn giải điều 8 (điều 8 cấm *broad memory mỗi prompt*, không cấm thẻ này).
- ✅ **③ Realtime capture — LÀ ĐƯỜNG NẠP CHÍNH, mặc định BẬT (user chốt lại 2026-08-02:
  *"nhịp 10' là lần đó chưa xét kỹ — mỗi 1 mes phải tự đưa lên luôn mới đúng"*).**
  > 🔄 Đảo thiết kế cũ của chính mục này ("công tắc thứ 4 thêm vào"): realtime **THAY** vai
  > nạp chính của `maintainTick`; hệ nhịp cũ KHÔNG bị xoá mà **teo thành lưới bù** — chỉ giữ
  > cho hai thứ vật-lý-không-per-message-được (embed: load model ONNX vài giây/lần · chiều
  > IMPORT: bundle máy khác trên Drive không có sự kiện để nghe, phải poll) + quét bù nguồn
  > không hook / hook trượt (đo: hook timeout khi embed nền chạy, ~125s).
  **Kiến trúc chốt:**
  - **Nạp:** Stop hook (đã tồn tại: `zemory hook install` → Stop → `scan()`) thành **mặc
    định** — cài trong `init`/`setup`/`doctor` nhắc; mỗi reply ingest **đúng 1 file** từ
    `transcript_path` (đo: cả kho 1,8–7s → 1 file mục tiêu <1s; comment "fast, incremental"
    trong `capture-hook.ts` đang nói quá) + digest regen phiên đó (sẵn có).
  - **Drive sync: GIỮ NGUYÊN poll 30' hai chiều như cũ** (user chốt 2026-08-02 sau khi cân:
    per-message/event-driven chưa đáng đợt này, thủ công thì quên là lệch máy). Event-driven
    debounce theo cụm ghi lại thành nâng-cấp-sau-nếu-cần, KHÔNG làm đợt này.
  - **Vì sao per-message chứ không 5'/10' (số đã đo, ghi để khỏi bàn lại):** poll trả chi phí
    theo THỜI GIAN (6–12 scan/giờ kể cả máy rảnh, 1,8–7s/lần) và vẫn trễ 5–10'; hook trả theo
    CÔNG VIỆC (không tin = 0 chạy, có tin = <1s, mỗi LƯỢT reply 1 lần). 95%/PreCompact không
    thay thế per-message — là tầng CHỐT đi kèm, đỡ ca hook trượt.
  - **Ca write-gate bận (embed nền giữ token chuỗi dài):** hook KHÔNG chờ — bỏ qua nhanh,
    đánh dấu dirty, lưới bù lượm (đo: chờ là 125s/turn, không chấp nhận được).
  - **Lưới bù (scheduler cũ, teo vai):** embed backlog + digest sweep + scan bù (nguồn không
    hook, hook trượt/gate bận) — nhịp giãn được 10'→30'.
  - **UI (user chốt 2026-08-02 — hết câu hỏi treo): realtime TÁCH thành công tắc RIÊNG,
    mặc định BẬT** ("tự sync mes theo máy"); "Tự sync memory" giữ nguyên = Drive poll 30'
    hai chiều; "Scheduler nền" = lưới bù (embed + digest + quét vét). Hai tầng độc lập —
    tắt Drive vẫn nhớ đầy đủ theo máy, tắt realtime rơi về quét bù. Mô tả UI đổi khớp vai
    (UI text discipline — không để mô tả nói "nhịp 10'" khi nạp đã per-message); layout
    cụ thể vẫn trình duyệt lúc build theo luật UI.
  - Gate `scheduler-contract` phải viết lại theo vai mới (UI hứa gì scheduler làm đó).
- ✅ **④ Mảnh luật (mọi agent, kể cả không hook):** +2 câu vào `MEMORY_PROTOCOL` + mô tả
  `memory_context`: *"context vừa bị nén/tóm tắt → gọi memory_context + memory_search dựng
  lại TRƯỚC khi làm tiếp, đừng đoán từ bản tóm tắt."* Cursor/Windsurf/Qwen chỉ nhận mảnh này;
  Cowork ngoài phạm vi.
</details>

## 🔬 Audit 2026-08-03 (6 mặt) — 3 lỗ đã sửa tại chỗ, còn 2 việc CHỜ USER
> Chi tiết + số đo: `06_CHANGES [2026-08-03]`. Sạch: gate 481 · conform · integrity ok ·
> 0 mồ côi · digest 100% · 0 project tách tên · 44/44 neo test sống.

- [~] **RERANK: GIỮ, nhưng phải rẻ đi — đang đo cách cắt (user phản biện đúng 2026-08-03).**
  > 🔄 **Rút lại đề xuất "nên tắt rerank" tôi viết cùng ngày.** Nó dựa vào hai câu chưa đủ:
  > ① *"rerank chưa từng thắng"* — corpus gate chỉ **8 truy vấn** và hybrid đã **8/8**, một
  > corpus BÃO HOÀ thì không thể cho rerank cơ hội thắng; đó là giới hạn của phép đo, không
  > phải bằng chứng rerank vô dụng. ② rerank là **thành phần chuẩn của RAG** (bi-encoder
  > không cho query và doc "nhìn" nhau; cross-encoder thì có) — bỏ nó là bỏ một lớp chất
  > lượng thật để đổi lấy tốc độ.
  **Đã đo (2026-08-03):** chi phí TUYẾN TÍNH theo tổng token — 40 cặp×2000 ký tự **51,6s** ·
  20×2000 **25,5s** · 10×2000 **13,6s** · 40×400 **10,3s**. Ép số luồng ONNX (8) **không
  đổi** (25,6s → 27,9s = nhiễu) ⇒ không phải lỗi cấu hình luồng, mà là giá thật của
  cross-encoder base trên CPU máy này (Ryzen 5 7520U).
  **Bảng đánh đổi (pool đóng băng, 4 truy vấn, tự-kiểm gốc-vs-gốc đạt 3/3 & 5/5):**
  `40×2000` (hiện tại) 31–38s · `20×2000` 23,8s · `40×800` 31,5s · `20×800` **12,4s** ·
  `16×800` 10,7s · `12×600` 8,9s. Đáng chú ý: ở pool 20, cắt 2000→800 ký tự **không đổi độ
  đồng thuận** (1,8/3 · 2,8/5) mà **rẻ đi gần một nửa**.
  **Model nhẹ hơn — đo rồi, CHƯA dùng được:** `ms-marco-MiniLM-L-6-v2` nhanh **6×**
  (3,3s vs 19,6s/truy vấn) và qua được phép thử lẻ tiếng Việt, NHƯNG xếp hạng lệch hẳn bge
  (top-1 **0,3/1** · top-3 **0,5/3**) — nó huấn luyện trên MS MARCO tiếng Anh, kho này chủ
  yếu tiếng Việt ⇒ lệch nhiều khả năng là KÉM đi, không phải khác đi.
  **⚠ GIỚI HẠN của chính phép đo trên — phải nói ra:** "độ đồng thuận với cấu hình hiện tại"
  đo **độ ỔN ĐỊNH, không phải CHẤT LƯỢNG**. Bản 40×2000 không phải chân lý; một thứ tự khác
  chưa chắc tệ hơn. Muốn chốt pool/chars/model thì **phải có corpus có nhãn đủ lớn** — đúng
  đường `plan/05` dòng 73 đã ghi, và đúng đòi hỏi của `HP điều 12`. Trước khi có nó thì
  KHÔNG đổi mặc định dựa trên mấy con số này.
  *(Bài học phép đo: hai bản đầu đều SAI — bản 1 bị daemon ingest làm trôi pool giữa các lần
  đo, bản 2 tính cả truy vấn pool=1 nên top-3 tối đa đã là 1/3. Bản 3 thêm PHÉP TỰ KIỂM
  "gốc vs gốc phải ra 3/3 và 5/5" — đạt — mới tin được số.)*
  **Đã giảm đau mà KHÔNG đụng chất lượng:** rerank thôi chặn đường — MCP mặc định hybrid
  (0,9s), lượt sâu của UI chạy ở tiến trình con. Rerank vẫn còn nguyên, gọi khi cần.

## 🔬 Audit toàn diện 2026-08-02 (Fable, 6 mặt) — F1/F4 ĐÃ SỬA `[2026-08-02h]`, còn F5/F6
> Gate 462/462 · conform ✓ · integrity ok · schema v20 trên DB thật · 0 mồ côi (3 phép đo) ·
> digest 100% · neo test sống 100% · endpoint parity sạch · 15/15 endpoint sống 200.
> Nghi vấn ĐÃ LOẠI (ghi để khỏi đào lại): "daemon crash tái hiện khi audit" — SAI, daemon chết
> vì lệnh đo của tôi (`| Select-Object -First 5` giết native command khi pipeline đủ N object);
> chạy detached thì 15/15 xanh. Hộp đen đúng: không có dòng exit vì bị kill cứng. Con bug
> exit-1 thật (07-21) vẫn CHƯA tái hiện. · "134 export mồ côi" — 133 là interface/type (bề mặt
> kiểu công khai) hoặc dùng nội bộ; chết thật chỉ `resolveDocPath` (đã biết, cố ý giữ).

> **F6 XONG TRỌN** (`[2026-08-02i]`): backend tách hai lớp + UI có chip `🔬 Tìm sâu`.
> Còn để ngỏ, chưa cần: lượt sâu hiện chờ đồng bộ tới 120s rồi mới trả — nếu sau này thấy
> vướng thì đổi sang trả `202` + poll như `/sync-status` (hạ tầng đã có sẵn).

<details><summary>F6 gốc — ĐÃ SỬA phần lõi `[2026-08-02i]`</summary>

> **F1 + F4 đã sửa** — chi tiết ở `06_CHANGES [2026-08-02h]`. (F1 hoá ra còn một tầng nữa:
> probe thật mất **48s** nên tách cờ `deep`; F4 gom về `core/config::projectKey`, riêng
> `graph-memory::norm` giữ lại CÓ CHỦ ĐÍCH vì id node dùng `/`.)

- **Nợ đo lại — ĐÃ ĐO 2026-08-05, cả hai đóng:** vector backlog kho thật còn **639** (không phải
  ~4.6k; scheduler đã lượm gần hết trước khi tôi tắt nó chiều nay — phần còn lại sẽ do lần embed sau
  khi TRÁO xử) · entry `2026-08-02` đã trôi xuống `archive/06_CHANGES.md`, không còn trong bộ đọc.

## 🔬 Audit 2026-07-27 — còn 1 finding
- ✅ **5 export mồ côi — ĐÓNG NỐT 2026-08-06.** 4 mục nối từ trước; `resolveDocPath` xử theo đúng
  chẩn đoán cũ ("hai bên KHÁC ngữ nghĩa resolve, gộp hàm là sai"): rút BẤT BIẾN an toàn ra
  `util/safe-path.ts::isWithinBase`, hai bên giữ resolve riêng — `[2026-08-06c]`.

## 🧹 Từ đợt P2/P3 + Graph Engineering — còn mở
- ✅ **Edge id — ĐÃ CÓ PHÍA TIÊU THỤ 2026-08-06** (`[2026-08-06c]`): `graph export` đóng dấu eid
  (trước CHỈ payload UI có — consumer không trích dẫn nổi từ contract) · lệnh `zemory graph edge
  <eid>…` kiểm id được dẫn + in **cited-edge validity** N/M. Kèm vá trùng id: 2.865 cạnh/1.288 id
  (1 id gánh 157 cạnh calls) → băm cả symbol ⇒ duy nhất 100%, id `imports` giữ nguyên.
- [ ] Đã đối chiếu bản "Graph Engineering" (user gửi 2026-07-27) với graph mình. **Khoảng trống lớn nhất còn lại: KHÔNG có phía WRITE** — worker đọc được graph nhưng không publish phát hiện ngược lại kèm `run_id`/provenance; và **không có lớp công việc** (không node `AgentRun`/`Claim`/`Evaluation`). Chấm theo thước của tài liệu, zemory đạt *artifact · source · graph path*, thiếu *objective · plan · evaluator decision · execution record*. **KHOAN xây** — chính tài liệu cảnh báo "đừng thêm knowledge graph chỉ vì hệ có agent"; graph hiện đang kiếm đủ tiền nuôi thân ở vai cấu trúc + định tuyến.

**🚫 ĐÃ LOẠI — false-positive (giữ lại để phiên sau khỏi báo lại)**
`/set-` "404" = chuỗi động `'/set-'+nm` · `data-act="recall"`/`sysrecheck` "không handler" = có, qua `closest('[data-act=…]')` · `share/share.key` committed = **KHÔNG còn là false-positive** — repo hoá PUBLIC nên giả định "keep repo private" mà quyết định đó dựa vào đã sai; chìa đã xoay + gỡ khỏi git 2026-07-29 · `/cockpit` "gãy" = không gãy (lúc đo daemon đang tắt) · `/nav-cost` `/gate-acquire` `/gate-release` `/sync` `/migrate` "dead" = CLI/surface khác dùng.

## ⭐ Ưu tiên kế tiếp
> Toàn bộ diễn biến UI refactor (VÒNG 1–11, plan 15, 5 quyết định) đã XONG và dời sang `archive/05_TODO.md` + `06_CHANGES`. Dưới đây chỉ còn thứ chưa chốt.

**CÒN TREO từ đợt UI refactor:**
- [ ] **`/session-raw` (đọc transcript gốc) — CHƯA làm, chờ user quyết**: chỉ bù được **4,18%** tin bị clip + khối `thinking` bị bỏ lúc ingest; và với session **sync từ máy khác thì file không có ở máy này** (`ingest_state` toàn đường `C:\Users\Zyro\...`) ⇒ phải fail-open về DB. ROI thấp, nêu ra để user chốt chứ không tự làm.
- **`adapters` — ĐÃ CHỐT, không còn là câu hỏi** *(soát bằng code 2026-08-05)*: `03_STRUCTURE §4`
  dòng 201 khai rõ *"adapter theo host/nguồn → `backend/src/<domain>/adapters/` — slot LỒNG trong
  domain, cùng khuôn với `graph/`"*. Tức đã chọn **domain-internal**, và `conform` xanh với cấu
  trúc đó. Giữ dòng này làm hồ sơ, không phải việc.
- [ ] **model-routing theo task** — idea-only. *(Soát 2026-08-02: tiền đề cũ "ĐỤNG điều 6, KHÔNG tự mở" đã HẾT HIỆU LỰC — điều 6 nới sang "HẠN CHẾ gọi LLM" ngày `2026-08-02b`. Nay không còn bị chặn thẳng, nhưng phải qua thứ tự ①script → ②agent liên kết → ③model + ích lợi đo được + user chốt.)*
- [ ] **Nợ nhỏ:** daemon exit-1 (hộp đen đã cắm, chờ repro). *(Start Menu icon **ĐÃ XONG** —
  `Start Menu\Programs\Zemory.lnk` tồn tại thật, kèm icon Z; dựng lại được sau khi vá bug
  Desktop-chuyển-hướng 05/08, không cần sign-out/in nữa.)*
- ✅ **Tách `app.js` — XONG CẢ 3 BƯỚC** (`[2026-08-06c]` + 2026-08-07). 1.837 dòng/1 IIFE → **12 file**
  global-scope (`core` nạp đầu · `boot` cuối; thứ tự khai ở `app.html`, guard drift ở `helpers.mjs`).
  Bước 3 lộ ra một lỗi của chính bước 1: `graph.js` **ôm 125 dòng KHÔNG phải graph** (`renderMem` ·
  `renderDiscovered` · `renderDriveDonut` · `refreshChecks` · `loadRecentSessions`…) vì lần đó cắt
  theo dải phân cách, mà dải "graph" trùm luôn đầu khối PHASE-2. Đã trả về đúng nhà theo concern
  (gm · sources · system · shell), rồi mới chia phần graph thật thành `graph-render` (canvas, 31 KB)
  + `graph-panel` (cây/toolbar/seam, 9 KB). File to nhất giờ là `chrome.js` 56 KB — **từ điển i18n**,
  không phải logic, nên không tách.
  **Chờ user:** đảo mắt UI thật một lượt khi mở `zemory ui` lần tới (máy kiểm hết, mắt người chưa).

**🔥 VIỆC KẾ TIẾP:**
- **(user giao 2026-07-16) SasinFlow — UI 1 file HTML: ĐÃ TÁCH XONG, mục này lẽ ra đóng từ lâu.**
  > ⚠ **Sổ đã nói khác code suốt ~3 tuần** — user bắt được 2026-08-05 (*"2 cái này làm lâu rồi mà má,
  > ko check code thật à?"*). Tôi liệt kê theo TODO mà không mở repo ra đo. Đúng cái lỗi `02_RULES`
  > gọi là *"sổ nói khác code"*, và là lý do luật đòi đo trước khi khẳng định.
  **ĐO THẬT (read-only trên repo SasinFlow, 2026-08-05):** `frontend/index.html` **5.150 → 499 dòng**
  (38 KB). JS đã ra **7 file** — `anomaly.js` 237 KB · `core.js` 114 · `invoice.js` 94 · `settings.js`
  92 · `recon.js` 82 · `heartbeat.js` 22 · `update.js` 6 — CSS ra `styles/app.css` (79 KB), HTML nạp
  bằng **7 `<script src>` + 1 `<link>`**, chỉ còn 1 khối script nội tuyến. Tức **bước 1–2 của phương
  án 4 bước đã xong** (CSS tách · JS cắt nhiều file giữ global scope).
  **CÒN LẠI (đúng 2 bước cuối, vẫn ở repo SasinFlow — cross-project, không tự làm):** ③ gỡ **105
  `onclick=` inline** (survey cũ ghi 127 ⇒ đã giảm phần nào) · ④ nâng ES module. Cả hai là "làm sạch",
  không chặn gì — chỉ làm khi user yêu cầu bên đó.
- [~] **Đo tốc độ embed/ngày — VẪN CHƯA có số ngày-thường sạch.** Mẫu cũ (07-12, mega-session) = 41 msg/phút, lệch. Rebuild plan 12 (27 giờ, 94k message tồn đọng) cho thấy tốc độ dao động 40–380 msg/phút tùy độ dài message, nhưng đó là backlog dồn cục, KHÔNG phải nhịp ingest hằng ngày. Việc còn lại: sau 1 ngày dùng bình thường (không rebuild), chạy `zemory memory embed --all` + bấm giờ cho SỐ MESSAGE MỚI TRONG NGÀY ĐÓ để ra phút/ngày thật; nếu >20 phút → cân nhắc q4 dtype (hỏi user). **(2026-07-17) ĐO THẬT xong:** backlog 10291 → clear hết ~3h ⇒ ~57–58 msg/phút (256d · q8 · máy CŨ). **⚠ Vế "cân nhắc q4" ĐÃ CHẾT (2026-08-05):** đo 5 dtype trên máy mới — q4 **chậm hơn** q8 1,8× và kém chính xác hơn, fp32 mới là nhanh nhất (xem `06_CHANGES [2026-08-05]`). **VẪN CÒN:** số ngày-thường đo lại SAU khi tráo 768+fp32 (tốc độ đổi hẳn: 1,26 s/chunk).
- [ ] **(chờ user, việc ở repo khác) SasinFlow còn tồn đọng 9 entry changelog:** 9 entry 07-14→07-16 chỉ nằm trong `.md`, DB không có (tôi xóa khi khôi phục theo lệnh user). Với code mới **không mất được nữa** (CRLF đã vá + render salvage). Theo **FILE WINS**: 9 entry đã nằm trong `.md` (nguồn) nên coi như đủ; DB chỉ là index search, dựng lại từ file khi cần. (`docs sync` đã gỡ 2026-07-16.) KHÔNG tự sửa repo đó (`02_RULES §Phạm vi project`).
- [ ] F2. (TẦM NHÌN, sau core) Mở RAG sang **data chính** (ngoài memory agent): retriever **đa-store + `kind`**, chung model + retriever, DB tách được. Ý tưởng user — plan 05 §4.F.
- [ ] (Nếu cần quên tuyệt đối) Source-transcript privacy/tombstone: xóa/redact transcript gốc của agent host hoặc ghi tombstone chống whole-file adapter re-ingest lại dữ liệu đã quên.
- [ ] (TẦM NHÌN, tuỳ chọn — không bắt buộc v1) Session digest **B agent-authored**: khi recall chạm phiên, agent hiện tại đọc transcript viết đè `kind=agent` (có anchor). Bỏ B1 "agent tự viết lúc kết thúc". KHÔNG để zemory tự gọi LLM API. Spec: `docs/plan/06_digest.md`.
- **(user nêu 2026-07-20) Skill CHUNG vs RIÊNG — ĐÃ CHỐT: cấu trúc HIỆN TẠI chính là câu trả lời**
  (user 2026-08-05: *"cấu trúc hiện tại là đã chốt và build còn gì"*). Tức: **giữ `04_SKILLS` làm kho
  duy nhất** (7 skill, 4 mục, trần 60 dòng), playbook ở `.claude/skills/<tên>/`, skill ngoài vendor ở
  `external/skills/` — **KHÔNG dời skill chung về `02_RULES`**. Hồ sơ tranh luận cũ giữ bên dưới, KHÔNG
  hỏi lại.

<details><summary>Hồ sơ tranh luận (đã chốt, giữ để tra)</summary>
  > ⚠ **Đo lại 2026-08-05** (user bắt: *"làm lâu rồi mà, ko check code thật à?"*): mô tả cũ nói
  > *"04 ship 3 skill generic"* — **SAI, giờ là 7** (`grill` · `session-close` · `reconcile` ·
  > `conform` · `audit` · `read-office` · `write-docx`). Và `04_SKILLS` đã được **dọn đúng vai**:
  > 4 mục (luật dùng · danh mục · skill NGOÀI vendor · thêm skill), có **trần 60 dòng**, playbook
  > đã ra `.claude/skills/<tên>/SKILL.md` — tức phần "đừng để playbook bò về 04" ĐÃ XONG.
  **Phần CHƯA làm, đúng nguyên bản câu hỏi:** `04_SKILLS` (zemory) và `docs_template/*/04_SKILLS`
  vẫn có **cùng 4 heading, KHÔNG phân tầng** — không chỗ nào nói skill nào *ship từ template* (repo
  không sửa tay) vs skill nào *repo tự thêm*. Hệ quả: `sync` gap-fill không phân biệt được, người
  đọc không biết cái nào là chuẩn. **Đề xuất giữ nguyên:** 2 TẦNG trong `04` (`## Skill chuẩn (ship
  từ docs_template)` vs `## Skill riêng của <PROJECT>`), KHÔNG dời về `02_RULES` — 02 vừa dọn sạch
  playbook 2026-07-18, dời ngược là tái phạm.

</details>

## 🔥 Từ chốt sổ 2026-07-21 — làm trước
- [~] **DAEMON THOÁT exit 1 KHÔNG LOG (2026-07-21, thấy 1 lần) — ĐÃ CẮM HỘP ĐEN 2026-07-22, chờ repro để chẩn gốc.** *(Soát 2026-08-07: `daemon.log` sạch tới 06/08 20:41, daemon 4444 sống ổn từ đó — vẫn CHƯA tái hiện.)* Nghi **crash NATIVE** (better-sqlite3/onnxruntime segfault — bỏ qua handler JS) HOẶC stderr detached không capture. **Đã làm:** `backend/src/logging/daemon-log.ts` — `daemonLog()` ghi `<thư mục kho>/logs/daemon.log` (mirror stderr)
  *(⚠ sửa 2026-08-07: sổ — và cả comment trong chính file đó — ghi `~/.zemory/logs`, **SAI**. Đo:
  `logsDir()` = `join(currentMemoryDir(), "logs")`, tức log ĐI THEO KHO khi `relocate`; file thật ở
  `data/logs/daemon.log` (12.830 B, 07/08 09:04), còn `~/.zemory/` chỉ có `location.json`. Ghi sai
  chỗ này làm phiên sau soi nhầm nơi rồi kết luận "không có log".)* cho mọi lifecycle (up/shutdown/exit/uncaught/unhandled) + `armCrashReport()` bật `process.report` (reportOnFatalError + reportOnUncaughtException) → dump JSON **stack native** cạnh log. `ui.ts` arm ngay khi thắng port. **CÒN LẠI:** chờ lần daemon chết tiếp theo → đọc `daemon.log` + `report.*.json` để chẩn gốc; nếu tái hiện được thì chạy foreground + ép embed↔sync xen kẽ.
- ❌ **BÁC BỎ 2026-08-07 (user chốt) — cắt tool-dump khỏi FTS trigram. ĐỪNG ĐỀ XUẤT LẠI.**
  Agent nêu vì thấy **trigram = 512 MB = 42,3% kho** (to hơn bảng nguồn `messages` 275 MB) và
  tool-dump chiếm **56% khối lượng chữ** ⇒ ước tiết kiệm ~285 MB. **Sai ở gốc:** đo lại thì
  **119.668 tin tool-dump chỉ có 171 tin mang vector** (`vectors.ts` cố ý bỏ `tool_name IS NOT NULL`)
  ⇒ với **57% kho**, FTS word + trigram là **hai chân tìm kiếm DUY NHẤT**; cắt trigram là chặt một
  chân. Đổi lấy 285 MB trong khi ổ còn **140 GB trống**.
  **Đây đúng là lỗi của vụ cắt 256 chiều** — tính được phần TIẾT KIỆM, không đo phần MẤT. Sinh ra
  **HP điều 15**: chất lượng > dung lượng · cắt phải qua cổng như thêm · **tăng cũng phải đo trước**
  bằng phép thử nhỏ trên bản sao. Muốn giảm dung lượng thì tìm đường **KHÔNG đụng chất lượng**
  (dọn rác · dedup · VACUUM · nén lớp lưu), không phải cắt lớp tìm kiếm.

## 🧩 Graph — phase sau
- [ ] **Phase D** (tsserver/pyright → cạnh `resolved`) — HOÃN theo decision rule (đếm câu hỏi "sửa X đụng ai" trượt trong 2–4 tuần). ~~MCP mirror~~ **ĐÃ WIRE 2026-08-06** (`graph_impact`+`graph_neighbors`, 6/6 test — `[2026-08-06c]`). ~~Schema-change policy cho `graph.json` v2~~ **BỎ 2026-08-07 (user chốt): "ko xài, cũng không phù
  hợp app".** Đo trước khi bỏ: hợp đồng `graph.json` **chưa có consumer nào** — kế hoạch gốc là một
  "Graph App" repo riêng đọc file đó, nhưng quyết định 18/07 đã đảo (graph thành TAB trong `zemory ui`,
  đọc thẳng `/code-graph`, không qua file xuất). Viết luật versioning cho hợp đồng chưa ai ký là tạo
  cấu trúc chưa có nhu cầu. **Đừng đề xuất lại khi chưa có consumer thật.**
- [~] **Hạng cạnh BE↔FE seam — V1 ĐÃ BUILD 2026-08-07 (user chốt "làm đi"); spec graduate sang
  `plan/13 §4` (cạnh `api`).** Đã ship: `graph-seam.ts` khớp chuỗi route FE↔BE, nhãn
  `inferred·textual`, ba bề mặt (`/code-graph` · `graph export`/`edge` · `graph impact` — đo trên
  zemory: `ui.ts` ← 10 file FE kèm route). **CÒN MỞ đúng một vế:** tầng `resolved` field-level cần
  **typed contract** (OpenAPI/tRPC) — chưa repo nào có contract; khi nào có thì thêm parser, và
  nhớ kết luận bên dưới: *codegen+tsc mới là KHOÁ CỨNG, graph chỉ là KÍNH SOI*. Hồ sơ phân tích
  gốc giữ nguyên bên dưới để tra lý do.
  *(Đề xuất gốc 2026-07-22:)*
  **Bối cảnh:** bài FB nhóm giới thiệu **Grapuco** (SaaS): AST toàn codebase → dependency/call/module graph + flow · **phát hiện phần bị ảnh hưởng khi API/schema/function đổi** · context cho agent qua MCP · chat-with-codebase · security scan · recommendation+priority. Bài toán nó nhắm = **2 người vibecode BE/FE lệch nhau**: BE thêm field / đổi schema → FE chưa cập nhật; FE đổi luồng đăng ký → BE giữ business rule cũ. User muốn hấp thụ **đúng phần mạnh nhất** (contract-impact BE↔FE) vào graph zemory, **KHÔNG** lấy phần LLM (chat/security/recommend — trái điều 6).
  **Insight then chốt (vì sao zemory hợp hơn Grapuco):** Grapuco phải **ĐOÁN** kiến trúc từ code trần; zemory **ĐỌC VAI TRÒ đã khai trong chuẩn 03** → suy cạnh khai báo mà không cần đoán. **Chuẩn 03 chính là "hệ nối" để graph nhìn được luồng BE↔FE** — đây là lợi thế không đối xứng, thứ Grapuco không có.
  **Cạnh mới cần thêm (hạng KHAI BÁO, 0-LLM, fail-open — mở rộng plan 13 §4, KHÔNG tạo capability mới, đúng điều 4/13):**
   - `frontend/api/` → `backend/src/api/` : seam FE-gọi-BE (slot-level, tất định từ 03 §4).
   - `backend/src/contracts/` (OpenAPI/proto/GraphQL-SDL) → node `endpoint` + `schema.field`, cạnh `field → endpoint → handler`.
   - `backend/src/store/` + `migrations/` → node `schema.field` (điểm BE đổi field).
   - `backend/src/shared/` (type dùng chung BE↔FE) → cạnh **`resolved`** khi 2 bên import chung type.
   - Ghép chuỗi: `store.field → contract.endpoint → frontend/api call → component/test` ⇒ `graph impact <field>` trả về **FE nào gãy** khi BE đổi field.
  **TRẦN — GHI RÕ để agent sau KHÔNG tưởng graph fix triệt để (3 tầng, theo điều 13):**
   1. Luồng **KHAI BÁO** (import · slot-seam · **contract typed**) → tự động, `resolved`/`declared`. Chuẩn 03 + typed contract cho không phần này.
   2. Luồng **SUY LUẬN** (FE gọi `fetch('/api/x')` chuỗi viết tay, KHÔNG codegen) → chỉ `inferred`/`textual`, **GẮN NHÃN**, KHÔNG giả dạng chắc chắn. Đây là **TRẦN, bằng Grapuco** — chuẩn 03 thu hẹp chỗ tìm chứ **không xoá được** việc phải match URL.
   3. Luồng **NGỮ NGHĨA** (business rule · thứ tự bước đăng ký · field giờ bắt buộc) → **NGOÀI TẦM MỌI GRAPH, mãi mãi**. Đây chính là lý do "vá BE/FE hoài không hết": đang lấy công cụ CẤU TRÚC đánh vào bài toán NGỮ NGHĨA. Grapuco cũng không giải được lớp này dù marketing gộp chung.
  **"Fix triệt để" KHÔNG bằng graph (ghi để khỏi kỳ vọng ảo — bài học plan 13 §7 counterfactual):** đòn thật cho tầng 1 = **contract-first + codegen 2 đầu** (OpenAPI→openapi-typescript/orval · tRPC share type trực tiếp · GraphQL-codegen) → **`tsc` biến drift thành LỖI COMPILE** (khoá cứng, không phải "phát hiện sau"). Tầng runtime/một-phần-ngữ-nghĩa = **contract test (Pact/consumer-driven)**. Graph = **KÍNH SOI** blast-radius; codegen+tsc = **KHOÁ CỨNG**. Repo chưa có typed contract → **việc số 1 là dựng contract, KHÔNG phải graph**.
  **Điều kiện để graph mạnh THẬT:** repo phải (a) bám chuẩn 03 để đọc vai + (b) có typed contract để field-level lên `resolved`. Thiếu (b) → phần BE↔FE field-level chỉ `inferred`, không hơn Grapuco.
  **Protocol đo Grapuco TRƯỚC khi tin/hấp thụ (như đã đo CALM plan 13 §9 — KHÔNG tin marketing):** Grapuco là SaaS, không có code để mổ ⇒ **dùng thử trên 1 repo BE/FE THẬT**, **cắm 1 drift đã biết** (đổi tên/xoá 1 field schema), đo: (i) có chỉ ĐÚNG FE component/call/test đụng không · (ii) có báo NHẦM (false-positive) không · (iii) xuyên HTTP boundary nó match `resolved` hay chỉ đoán chuỗi. Lưu ý: tracing xuyên HTTP boundary là chỗ mấy tool này hay RÒ nhất; con số kiểu "29–241×" (CALM) là so với đọc-cả-file, KHÔNG phải so grep.
  **KHÔNG hấp thụ (trái điều 6 — zemory 0-LLM):** chat-with-codebase · security scan · recommendation LLM.
  **Chỗ sẽ code khi user chốt:** thêm parser contract (OpenAPI/GraphQL) + resolver FE-call vào graph engine (`backend/src/memory/graph*.ts`), hạng cạnh mới trong `graph export` (bump schema v3), `graph impact` in thêm seam BE↔FE (kèm nhãn confidence). Cross-repo (BE repo + FE repo tách) join bằng contract làm khoá qua `graph export --all`. Sau khi user duyệt design đủ sâu → graduate spec sang **plan 13 §4** (plan = spec đã chốt; TODO chỉ giữ đề xuất).

## 🧠 Kho skill vendored — còn mở
- [ ] **`ui-ux-pro-max` mới VENDOR + INDEX, chưa có ca ÁP DỤNG thật nào** — chưa dùng nó thiết kế/nắn UI nào của zemory.
- [ ] **Cấu trúc `external/skills/` — user để ngỏ:** giữ 1 tầng `skills/` (kho enumerate được) hay **phẳng** `external/<repo>/` (đúng luật "đừng tạo cấu trúc chưa có nhu cầu" vì hiện `external/` chỉ có skill). Đổi = 1 lệnh `mv` + 3 dòng docs.
- [ ] **Lệnh `zemory skill add <repo-url>`** (clone vào kho đúng khuôn) — ý tưởng nêu ra, chưa quyết.
- *(Skill chung vs riêng — **ĐÃ CHỐT 2026-08-05**: giữ cấu trúc hiện tại; xem §Ưu tiên kế tiếp.)*

## 📥 User gửi 2026-08-05 tối — "để tính sau", note lại đây
- ✅ **CODE: series của HOST ĐÃ CHẾT — ĐÓNG 2026-08-06** (`[2026-08-06c]`): lệnh
  `zemory memory sync --prune-host <host>` (dry-run mặc định; chỉ xoá khi ① mọi bundle của host đó
  đã merge vào kho máy này ② series máy này phủ đủ để máy thứ ba lấy tiếp; cấm tự dọn chính mình).
  *(Phần dọn tay đã xong trước đó — `[2026-08-06]`. Hồ sơ chẩn-đoán-sai giữ dưới để khỏi lặp.)*
  > ⚠ **Tự sửa mô tả tôi viết vài giờ trước** (*"compact chưa từng code"*) — **SAI**. Đo: `share.ts`
  > có `DRIVE_COMPACT_AT = 12`, nhánh `compacting` ghi baseline mới rồi **xoá hết file cũ** (an toàn
  > vì baseline là tập cha), và `drive-sync.test.mjs` có test khoá *"compaction folds many deltas
  > into one baseline without losing a row"*. Tôi kết luận "chưa code" chỉ từ việc **đếm file trên
  > Drive** — đúng cái lỗi luật cấm: thấy triệu chứng rồi phán nguyên nhân.
  **Lỗ THẬT (hẹp hơn nhiều):** compact chỉ chạy cho **series của CHÍNH máy đang chạy**
  (`listMySeries(dir, host)`), và ngưỡng là **12 file**. Nên: máy này 2 file — chưa tới ngưỡng, đúng
  thiết kế; máy cũ `SS01-IT-10` **9 file (~338 MB)** — **sẽ nằm đó vĩnh viễn** vì máy đó đã bỏ, không
  còn ai chạy compact cho series của nó. **Việc còn lại:** ① dọn tay 9 file máy cũ SAU khi verify nội
  dung đã nằm trong kho local (kho đã có đủ dữ liệu máy cũ tới 04/08 — vẫn phải đo, không tin); ②
  cân nhắc cho compact/`sync` xử được **series của host đã chết** (hoặc lệnh `memory sync --prune-host
  <host>` có dry-run), vì đây là ca sẽ lặp mỗi lần đổi máy.
- ✅ **Folder Drive — ĐÃ CHỐT 2026-08-06 (user): GIỮ, không hỏi lại.** Nguyên văn: *"cái này là nơi
  lưu chính của GM để share máy khác mà… để đó chứ hỏi gì"*. `G:\My Drive\Global Memory` = kênh bundle
  `.enc` chính thức xuyên máy (đúng thiết kế plan 08/14) kiêm bản sao ngoài máy. Câu hỏi "xoá Drive"
  là kế hoạch cũ đã chết — đừng dựng lại.
- [x→06_CHANGES khi user OK] **Backup máy (Computers) từng cuốn cả kho trần + chìa — ĐÃ TẮT 2026-08-05 tối.**
  Phát hiện: DriveFS backup **toàn bộ `D:\huy.nguyen`** (sổ `mirror_item` có `cloud_filename` cho
  `global_memory.db` + `share.key` = ĐÃ từng lên Drive dạng trần — chìa nằm cạnh két, điều 7; DB sống
  trong vùng sync, điều 11 — đúng cơ chế hỏng kho 03/08). User gỡ root khỏi Computers; verify bằng
  HÀNH VI (file mồi không bị cuốn sau 35s + hàng đợi chỉ còn xác cũ mtime tháng 7) vì file config ghi trễ.
  Bản đã lỡ lên mây: **user xác nhận đã xoá**. **Còn 1 đuôi:** cân nhắc **xoay `share.key`**
  (plan/16, quy trình đã có từ 07-29) sau khi tráo kho — chìa từng nằm trần trên Drive.
- *(Đề xuất HP điều 14 "bí mật: ngoài git ≠ ngoài repo" — đã nằm ở mục ngay dưới, cũng chờ user.)*

## Quyết định mở / cần chốt
- [ ] **(ĐỀ XUẤT — chờ user) Cờ `--no-window` cho `zemory ui`.** Hiện lệnh LUÔN bật cửa sổ app thật
  lên desktop — đúng cho người dùng, sai cho smoke-test/CI (sự cố 3 cửa sổ rỗng 06/08 đêm,
  `[2026-08-07b]`). Một cờ nhỏ: dựng daemon + serve, bỏ bước mở window. Chưa làm vì là feature mới.
- [~] **🔒 GATE CHỐNG "TODO THỐI" — ĐÃ BUILD `zemory todo verify` 2026-08-06, sửa tiếp 2026-08-07**
  (user chốt hình dạng: *máy ĐO lại*, không dùng dấu ngày thủ công). `docs/todo-verify.ts` +
  `commands/harness.ts`.
  > 🛠 **Sửa 2026-08-07 (ADAPT v2 · N2):** sổ giờ tìm theo MARKER (`harnessPathsAt(root)`) thay vì
  > ghép cứng `docs/agent/05_TODO.md`, và đọc qua `readTextFile` (lột BOM). Trước đó, repo đặt
  > harness ở `harness/` thì gate báo 0 mục — **một cổng không bao giờ đỏ được**. Chính trục ④ của
  > nó bắt ra dòng sổ này lạc hậu ngay trong lượt audit cùng ngày (gate tự soi được người sửa nó).
  **Bốn phép đo, đều tất định:** ① **ref chết** — mục nhắc một đường dẫn hoặc endpoint như thứ
  đang có mà repo không có · ② **nghi đã xong** — sổ nói "chưa" NGAY TRONG CÂU nêu tên, mà tên
  đó tồn tại · ③ **đo lại "0 match"** — sổ ghi "tệp X 0 match Y" thì grep lại đúng phép đo đó ·
  ④ **code mới hơn sổ** — `git blame` dòng sổ vs `git log` file nó nêu tên.
  **Trục ④ mới là trục bắt được ca write-gate thật**, và nó dạy một điều: ca đó KHÔNG heuristic
  chữ nghĩa nào bắt nổi — sổ nêu tên hàm CŨ, bản vá landing dưới tên MỚI, không có mâu thuẫn
  chữ nào cả. Chỉ git biết.
  **Luật bất đối xứng theo GIỌNG câu** (bản đầu làm sai, đã sửa): giọng phủ định + TỒN TẠI =
  đáng ngờ · giọng khẳng định + THIẾU = đáng ngờ. Không phân giọng thì một mục ghi rõ "CHƯA làm"
  lại bị gán nhãn "sổ khẳng định có" — ngược hẳn ý người viết.
  ⚠ **Hệ quả cho người VIẾT sổ:** đừng đặt đường dẫn/endpoint GIẢ vào backtick làm ví dụ — máy
  không phân biệt được ví dụ với khẳng định, và sẽ báo chúng là ref chết (đã dính ngay khi viết
  chính mục này).
  **Độ nhiễu đã đo:** bản đầu 8 phát hiện (5 báo oan) → nay **1/57 mục**. Gate nhiễu = gate bị bỏ qua.
  Test `todo-verify.test.mjs` **9/9**, gồm ca write-gate dựng bằng git thật (ngày commit ép cứng).
  ✅ **ĐÃ NỐI vào `npm run check` — đóng 2026-08-07** *(dòng này trước ghi "chưa nối", SAI)*.
  Đo: `package.json` khoá `check` = `typecheck && lint && test && conform && **todo**`, khoá
  `todo` = `node dist/cli.js todo verify`; commit `d3ebbe6` (06/08) muộn hơn chính dòng sổ này.
  ⇒ Đúng **trục ④ "code mới hơn sổ"** mà chính mục này dựng ra để bắt — gate tự dính lỗi nó
  sinh ra để chống, và nó KHÔNG tự bắt được (mục nằm ngoài 20/58 mục máy tra được).
  *(Hồ sơ đề xuất gốc giữ bên dưới.)*

- [ ] **(hồ sơ) Đề xuất gốc của gate — giữ để tra lý do**
  Vấn đề đã TÁI DIỄN SUỐT MỘT THÁNG: agent soát TODO bằng cách ĐỌC file rồi báo lại, nên mục đã xong
  vẫn nằm đó và user bị hỏi lại lần hai. Luật `02_RULES §Chốt phiên` đã cấm — **và vẫn hỏng**, đúng
  như luật structure-sync từng dạy: *thứ CHẶN drift là code, không phải rule dễ quên.*
  **Đề xuất cơ chế (cần chốt hình dạng trước khi code):** mỗi mục TODO mang dấu **đã-đo-lần-cuối**
  (vd `<!-- v:2026-08-05 -->`); `zemory validate` cảnh báo mục nào **quá N ngày chưa đo lại**, và
  `zemory conform --gate` đỏ nếu có mục quá hạn xa. Cộng thêm: lệnh `zemory todo verify` chạy các
  phép đo rẻ tự động được (file tồn tại? hằng số? endpoint sống?) rồi in bảng LỆCH.
  *(Số nền để đo hiệu quả: soát tay 2026-08-05 phát hiện **11/58 mục sai ≈ 19%**.)*
- [ ] **`01_CONSTITUTION`: KHÔNG gộp §Mục đích với §Điều khoản (user hỏi, agent trả lời 2026-07-26 — chờ user xác nhận đóng).** Đã đo: riêng zemory có **45 cạnh `references` trỏ vào `hp:N`**, cộng SasinHarvest 14 + SasinFlow 11 ⇒ **~70 trích dẫn "điều N" xuyên docs**. Gộp = đánh số lại = **hỏng cả 70 trích dẫn**, và `06_CHANGES` cấm sửa entry lịch sử nên không vá ngược được. Hai mục cũng khác BẢN CHẤT: §Mục đích định nghĩa zemory LÀ GÌ (+ phi-mục-tiêu), §Điều khoản là luật ĐÁNH SỐ được trích dẫn khắp nơi. **Nỗi lo "gộp sợ tràn/bể UI" không được giải bằng việc gộp** — độ dài file y nguyên; thứ thật sự trị là lớp graph vừa dựng (điều N thành node, có legend + bộ lọc + bấm nhảy) thay cho việc cuộn một file dài. *(Bẫy parse hai-list-đánh-số đã trị bằng cắt đúng section — không phải lý do để gộp.)*
- [ ] **(Ý tưởng user 2026-07-23) Zemory tự đổi model/agent Claude theo việc lớn·nhỏ để tiết kiệm chi phí.** *(Soát 2026-08-02 — tiền đề đã đổi: điều 6 nay là "**HẠN CHẾ** gọi LLM" (`2026-08-02b`), KHÔNG còn "KHÔNG BAO GIỜ". Vế **không proxy model API** thì GIỮ NGUYÊN, mà model-routing đúng là chạm vế đó ⇒ vẫn cần user chốt, nhưng lý do chặn hẹp hơn trước.)* Đây là đổi BẢN CHẤT zemory (bộ nhớ thụ động → lớp điều khiển agent), không phải chi tiết nhỏ. User đã chọn: CHỈ ghi ý tưởng, KHÔNG code, chờ chốt hiến pháp trước khi làm gì tiếp. 3 hướng đã trình: (a) sửa hiến pháp mở khe cho model-routing (thay đổi tầng cao nhất) · (b) để CLI/agent tự quản (Claude Code đã có setting chọn model riêng, zemory không đụng vào) · (c) (chưa trình) zemory chỉ ĐO/GỢI Ý tín hiệu độ lớn task (vd token ước tính, số file đụng) qua UI/API cho AGENT tự quyết — vẫn 0-LLM vì zemory không tự gọi/đổi model, chỉ cung cấp số đo.
- [ ] **(Graph — plan 13 §8) Loại lỗi nào build TRƯỚC?** Đã trình 8 loại; user CHƯA chọn. Ba nhóm: (a) link gãy + orphan (docs, rẻ, làm ngay được) · (b) **blast-radius** "sửa X đụng ai" (cần đọc import code) · (c) traceability "requirement nào chưa có test". Prototype 2026-07-18 đã chứng minh (b) chạy được: code-graph 55 module/154 import, tìm ra **orphan thật `core/index.ts`** (barrel 0 ai import), fan-in `memory/db.ts`=18. *(Soát 2026-08-07: số prototype là HỒ SƠ lịch sử — hai file đó nay đã đổi, đừng lấy số này làm hiện trạng; câu hỏi chờ user thì vẫn nguyên.)*
- ✅ **(Graph) Độ mịn + overlay — CÂU HỎI ĐÃ BỊ CODE TRẢ LỜI, đóng 2026-08-07.** Sổ hỏi *"v1 dừng
  ở file hay kéo tới hàm (AST)? overlay semantic_neighbor làm v1 hay phase 2?"* (viết 19/07) —
  **cả hai vế đã build từ 22/07**, tức câu hỏi treo 2,5 tuần sau khi hết là câu hỏi: `graph-symbols.ts`
  (symbol AST hàm/class/method + dòng, qua tree-sitter WASM; tiêu thụ ở `zemory graph callers` và
  `graph impact`) · `graph-semantic.ts` (`semanticEdges()`, `type:"semantic_neighbor"` nhãn `inferred`,
  cờ `--semantic`). Cả hai dependency nằm trong `package.json`, không phải optional.
- ✅ **(plan 14 §7) HẾT quyết định mở — cả 5 đã chốt BẰNG CODE** *(soát 2026-08-06; mục này trước
  ghi "chỉ còn HAI: ① tray ② write-gate", SAI — sổ nói khác code)*:
  ① **tray** = `platform/tray.ts` dùng **systray2** (MIT, helper Go prebuilt nên không cần
  node-gyp — đã rà license theo HP điều 2), fail-open khi tray không dựng được, helper là con của
  daemon nên không đẻ icon ma; `traysweep.ts` dọn icon mồ côi. Verify live 2026-07-21.
  ② **write-gate phủ lệnh nào** = `HEAVY_WRITES = {scan · scan-web · embed · digest · sync}`
  (`commands/memory.ts`). ③ autostart per-OS = `platform/autostart.ts` (Startup .cmd/launchd/xdg)
  · ④ graph cache = in-memory + bảng `graph_fitness` · ⑤ chu kỳ auto-sync = syncjob 30'.
- [ ] RAG còn cần chốt khi mở rộng sang **data chính**: chunk doc dài cho docs/knowledge/code; data chính dùng chung `global_memory.db` (cột `kind`) hay store tách rồi fuse.

## Phase 2 — Năng lực nặng
- [ ] **ADAPTER HOST MỚI** (Gemini/Antigravity · Cursor · Hermes) — chỉ làm sau khi có fixture dữ
  liệu THẬT. *(Đo 2026-08-07: `backend/src/memory/adapters/` có chatgpt · claude · claudeweb ·
  codex · continue · cowork · lmstudio — ba host trên đúng là CHƯA có.)*
  ⚠ **Vế "Code map AST" của mục này ĐÃ XONG, tách ra khỏi đây** *(sổ viết 28/07, tức viết SAU khi
  code đã có từ 22/07)*: AST → `graph-symbols.ts` · hash incremental → `graph-cache.ts` · import
  graph/blast-radius → `zemory graph impact` · fallback khi thiếu parser → `graph.ts` (regex
  `symbols` vẫn đứng). Giữ nguyên chữ "chỉ làm sau khi có fixture THẬT" cho phần adapter.
- [ ] **Memory promotion (episodic → curated learned-rule) — Ý TƯỞNG rõ (2026-07-18):** episodic memory đã bắt HẾT correction/decision qua các phiên → **nguyên liệu thô đã sẵn trong zemory**. THIẾU cái CẦU: zemory tự **phát hiện correction/decision LẶP LẠI** trong episodic → **ĐỀ XUẤT** nâng thành **memory-luật bền** (constitution/rules/1 memory doc) — **có review, user duyệt, KHÔNG auto-summary thành nguồn thứ hai** (điều 3). Cơ chế hình dung: quét episodic tìm pattern lặp (theme/correction) → xếp hạng theo tần suất → trình user *"correction X lặp N lần, nâng thành rule?"* → user gật mới ghi. Hiện đang để Claude-Code `memory/` gánh TAY. **Đây là "gap thật" duy nhất so với harness pattern 3-trụ** (trụ ② memory); trụ ③ (subagent/critic) zemory CỐ TÌNH bỏ (điều 6 — agent tự orchestrate, Claude auto-spawn subagent rồi).
- [ ] **(user nêu 2026-07-23 — ĐỀ XUẤT capability mới) Quét & ingest BỘ NHỚ CURATED của agent** (Claude Code `~/.claude/projects/<proj>/memory/*.md`+`MEMORY.md`; Codex/Cursor tương tự). **Bổ trợ TRỰC TIẾP** memory-promotion ở trên: thay vì zemory TỰ chưng cất (rủi ro auto-summary — điều 3/6), **ingest cái agent ĐÃ chưng cất sẵn** = fact cao-tín-hiệu, 0 LLM. Là adapter capture MỚI (như web-capture): đọc thư mục memory của host → ingest **read-only** (KHÔNG ghi ngược — điều 3/10) · stamp provenance riêng (`source=<agent>-memory`, `kind=curated` — tách lane khỏi episodic transcript, scope-tree lọc được) · **redact lúc ingest** (điều 7) · dedup + re-ingest khi file đổi (source_sig, giống scanweb full-replace) · recall xếp cao hơn (đã distilled). **Cần chốt:** ① `kind=curated` cột mới hay origin lane? ② map path Claude `<url-encoded-proj>` → project · global `CLAUDE.md`/`MEMORY.md` gắn `--all` · ③ adapter nào trước (Claude Code có cấu trúc rõ nhất). Ghi episodic vẫn giữ; đây THÊM lớp curated-external.
- [ ] Hook harness cảnh báo vi phạm docs nhưng không tự bypass permission host.

## Phase 3 — UI / mở rộng
- [ ] VS Code status bar chỉ đọc status API chung.
- [ ] Toggle provider/adapter có validation conflict và rollback config.

## 🌐 Web-chat capture (spec: docs/plan/07_web_chat_capture.md)
> Thu hội thoại web vào memory. ChatGPT ✓ · claude.ai ✓. Prototype cũ ở `attic/web-capture/`.
> **Quyết định đã chốt (plan 07 §14):** origin = 1 cột · v2b browser-connector (v1 file fallback) · re-pull full replace idempotent · GPT trước · password KHÔNG nhập vào zemory · KHÔNG commit file data thật (PII).
- [ ] **Gemini** là nền web CUỐI còn thiếu — khung `scan-web --platform` đã phục vụ ChatGPT + Claude.ai, thêm Gemini là dùng lại khung.

- ✅ **`npm i -g github:` — ĐÃ CHỐT 2026-08-06 (user): GIỮ ĐƯỜNG CLONE, không đổi package.**
  Cả hai lối chữa đều trả giá không đáng: `typescript` sang `dependencies` = mọi bản cài kéo
  theo cả bộ biên dịch + nhoè ranh giới dev/runtime · commit `dist/` = đưa lớp DẪN XUẤT vào git
  (phạm tinh thần HP điều 3) và đẻ nguy cơ `dist` cũ hơn `src`. Đường clone (`git clone` →
  `npm install` → `npm run build` → `npm link`) đã chạy sạch từ khi lên TS 6.0.3.
  **Việc còn lại = TÀI LIỆU phải nói đúng đường clone** (đã sửa 7 chỗ). Hồ sơ cân nhắc giữ dưới.

<details><summary>Hai lối đã cân và BỎ (giữ để khỏi bàn lại)</summary>
  *(Soát 2026-08-05: đường CLONE đã hết lỗi `ERESOLVE` — TS 6.0.3, `npm install` sạch chạy được;
  nhưng `npm i -g github:` VẪN hỏng vì cài global không kéo devDependencies ⇒ thiếu `tsc` cho
  `prepare`. Và token npm để publish đã tìm lại được — nằm trong `_migration`, nay ở `~/.npmrc`;
  cân nhắc XOAY token vì nó từng nằm trần trên Drive. Publish 1.1.0 = `npm login` + `npm publish`,
  việc của user — `[2026-08-03l]`.)* Người mới hiện đi đường clone. Hai lối chữa, mỗi lối một giá:
  - **đưa `typescript` sang `dependencies`** — cài global sẽ kéo nó ⇒ `prepare` dựng được.
    Giá: mọi bản cài mang theo cả bộ biên dịch (nặng), và lẫn lộn dev/runtime.
  - **commit sẵn `dist/` vào repo** — cài xong chạy ngay, không cần build.
    Giá: đưa file sinh ra vào git (phạm tinh thần điều 3), và mỗi lần sửa code phải nhớ commit
    lại `dist` nếu không bản cài sẽ cũ hơn mã nguồn.
  Chưa chọn được thì **tài liệu phải nói đúng đường clone** — đã sửa cả 7 chỗ.

</details>

- [ ] **Đuôi còn lại của mục trên: XOAY token npm** — token publish từng nằm trần trên Drive
  (nay ở `~/.npmrc`). Việc của user; không liên quan tới lối cài đã chốt.
