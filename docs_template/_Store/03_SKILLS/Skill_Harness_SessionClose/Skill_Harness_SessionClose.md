---
id: Skill_Harness_SessionClose
aka: session-close
name: harness-session-close
version: 12
description: Close out a work session correctly - route everything that happened into the right file so the next session can pick up where this one stopped. Use when asked to write things down, log progress, wrap up, or when the context is running out or the session is about to switch. Vietnamese triggers - "note lại", "docs lại", "ghi sổ", "chốt phiên", "sắp hết context", "đổi session", "mở phiên mới", "tổng kết lại".
---

# session-close — chốt phiên / ghi sổ

> Kích hoạt (luật cứng, `Rule_Keys_11_VerifyClaims` · `Rule_Keys_11_VerifyClaims`): có yêu cầu "note lại" · "docs lại" · "ghi sổ" ·
> "chốt phiên" · "sắp hết context / đổi session / mở phiên mới" — hoặc bất kỳ cách nói nào mang
> nghĩa **kết sổ phiên này để phiên sau đọc tiếp**.

**TUYỆT ĐỐI không ghi docs theo trí nhớ tóm tắt.** Ghi theo tóm tắt = mất chi tiết, và cái mất luôn
là cái phiên sau cần nhất.

**Global Memory là NGUỒN THẬT của phiên — trí nhớ trong context thì KHÔNG.** Khi context bị tóm
tắt/trim, chi tiết phiên vẫn còn NGUYÊN trong episodic memory (DB); cái bạn "nhớ" trong context đã
bị lược. Đây là GỐC của "đổi session là sót/lệch". Nên **mọi lần ghi docs / audit / báo cáo — nhất
là khi ĐỔI SESSION — BẮT BUỘC dò Global Memory + đối chiếu code / deliverable / pipeline / file THẬT
để verify TRƯỚC khi khẳng định bất cứ điều gì.**

> **Không có `zemory` CLI** (không có Global Memory): đọc lại phiên hiện tại là nguồn duy nhất — càng
> phải ghi sớm, đừng để trôi. Các bước `zemory …` dưới đây thì làm tay đúng luật đi kèm.

## Bước 0 — DÒ GLOBAL MEMORY + VERIFY (bắt buộc, KHÔNG skip, làm TRƯỚC Bước 1)

0. **`zemory memory scan` TRƯỚC `digest`** — phiên ĐANG CHẠY chưa nằm trong GM tới khi được scan;
   bỏ bước này thì `digest` trả thiếu/rỗng và phần đầu phiên đã bị nén khỏi context mất luôn. Scan
   xong GM vẫn thiếu ⇒ đọc thẳng transcript gốc của phiên (Claude Code:
   `~/.claude/projects/<repo>/<session>.jsonl`). *Đo được: bỏ bước này, một quyết định chốt giữa
   phiên rơi mất, sổ chỉ còn câu nói vài phút trước đó — câu đã bị chính quyết định kia thay.*
1. `zemory memory digest <session>` + `zemory memory search "<chủ đề phiên>" [--all]` → dựng lại ĐẦY
   ĐỦ việc/đổi/quyết định/lỗi của phiên, kể cả đoạn đã trôi khỏi context.
2. **Verify từng mục sắp ghi vào docs với NGUỒN THẬT** = GM (điều đã thực sự làm/nói/quyết) +
   code / deliverable / measure / pipeline / file THẬT (đọc lại dòng/chỗ liên quan). Chỉ mục SỐNG
   SÓT verify mới được ghi; claim chưa verify = KHÔNG ghi.
3. **SOÁT `04_TODO` = ĐO LẠI, KHÔNG đọc rồi chép** (`Rule_Keys_11_VerifyClaims`, luật áp **MỌI LÚC** — chốt
   phiên chỉ là một trường hợp; kích hoạt cả khi giữa chừng có câu *"check todo"* · *"còn gì chưa
   làm"*): mỗi mục là một **KHẲNG ĐỊNH VỀ TRẠNG THÁI**, mà khẳng định phải truy được về nguồn kiểm
   được — file `.md` là nguồn của NỘI DUNG, **không phải nguồn của sự thật**. **BA NGUỒN, chạy ĐỦ
   CẢ BA cho MỌI mục — không chọn nguồn theo loại mục**:
   ① **mã / nguồn** (grep/đếm · mở file/số liệu ra đếm) ·
   ② **Global Memory / lịch sử quyết định** (`memory search --all`, lọc tin vai `user` — quyết định
   hay nằm ở phiên khác, thậm chí **repo khác**; không có CLI thì đọc `archive/`) ·
   ③ **chạy thật** (gọi endpoint · truy nguồn sống · mở app nhìn · đọc log tiến trình đang chạy ·
   mở chính bản giao nhìn tận mắt · làm mới dữ liệu rồi đối chiếu số).
   Chỉ khi **cả ba khớp** mới kết luận; lệch ⇒ **cái mới hơn thắng** (lời chốt CÓ HẠN DÙNG, có thể bị
   chính việc làm sau đó supersede). Nguồn nào không chạm được ⇒ ghi "chưa xác minh được" kèm nguồn
   đã thử, KHÔNG mặc định "chưa làm", KHÔNG lấy 2 nguồn còn lại làm đủ. **Mục quá 7 ngày không ai đụng
   = NGHI NGỜ.** **Hỏi lại một việc đã chốt là LỖI**, không phải cẩn thận. *Đo được: soát 58 mục ra
   11 sai (~19%)* — mục đã build vẫn mang `[ ]`, mục agent tự bịa vì thấy triệu chứng rồi phán nguyên nhân.
3b. **SOÁT HẾT SỔ, KHÔNG CHỈ KHỐI MỚI NHẤT.** Mọi khối — kể cả khối bàn giao của các phiên trước
   ("▶ PHIÊN SAU ĐỌC TRƯỚC…") và khối cũ nhiều tuần — từng mục đối chiếu `05_CHANGES` +
   `archive/05_CHANGES` (`zemory changelog search`) và GM (`zemory memory search --all`, lọc tin vai
   `user`). Xong ⇒ **đánh dấu ĐÚNG DẠNG máy nhặt** (Bước 3); cả khối xong ⇒ sửa tiêu đề thành
   `## [x] …`. Khối bàn giao của phiên trước: phiên NHẬN nó soát xong thì ĐÓNG — mục còn mở nhấc sang
   khối bàn giao MỚI, khối cũ thành `## [x]` (làm tay: dời vào archive) — không để khối bàn giao chồng
   lên nhau. *Đo được: một sổ 1.328 dòng mang hơn 10 khối bàn giao chưa ai đóng.*
4. **Áp CẢ cho audit / báo cáo lỗi:** mỗi finding phải đối chiếu code/file THẬT + GM trước khi gọi là
   "lỗi thật" — phần lớn false-positive đến từ đọc code thiếu ngữ cảnh hoặc không biết quyết định
   lịch sử. Bẫy điển hình: tên file cũ trong entry changelog CŨ là **BẢN GHI LỊCH SỬ**, KHÔNG phải
   link gãy cần sửa (sửa = vi phạm luật supersede); chuỗi tiếng Anh (ngôn ngữ gốc) có thể là **thuật
   ngữ kỹ thuật GIỮ NGUYÊN**, KHÔNG phải leak i18n; số liệu trong report cũ có thể là snapshot
   đúng-tại-thời-điểm. KHÔNG tin kết quả subagent chưa tự kiểm lại.

## Bước 1 — ĐỌC LẠI ĐỦ các nguồn TRƯỚC khi ghi

1. **FULL phiên hiện tại** — đọc lại từ ĐẦU hội thoại, kể cả đoạn đã bị tóm tắt/trôi khỏi context
   (dùng `zemory memory digest <session>` / `memory search` để moi lại). Rút ra: đã LÀM gì · đã ĐỔI gì
   · QUYẾT ĐỊNH gì · còn DỞ gì · phát hiện LỖI gì chưa sửa.
2. **FULL `docs/plan/*`** — mọi file, để biết việc vừa làm có đụng/lệch spec nào không (định nghĩa
   metric thì soi Từ điển dữ liệu `Docs_138_DataDictionary`).
3. **FULL `docs/agent/*`** — `01_LAW/_Cons` · `01_LAW/_Rule` · `02_STRUCTURE` · `03_SKILLS` ·
   `04_TODO` · `05_CHANGES`, để biết chỗ nào phải cập nhật và không ghi trùng cái đã có.
4. **FULL spec của MỌI case/task đã đụng trong phiên** (vd `tasks/<case>/spec.md`) — cả thân lẫn khối
   khai báo đầu file (`status` · `updated` · `evidence` · `run_at`…). Quyết định riêng của một case
   sống ở đó, KHÔNG ở `docs/plan`. *Đo được: bỏ qua file này ⇒ spec còn ghi "chưa dựng pipeline" sau
   khi pipeline đã chạy, giữ bảng lịch đã huỷ, ghi sai máy chạy.*

## Bước 2 — định tuyến từng thứ về đúng file, KHÔNG BỎ SÓT

| Thứ phát sinh trong phiên | Ghi vào |
|---|---|
| Việc đã xong / đã sửa code / sản phẩm (deliverable · measure · pipeline) đã sửa | `05_CHANGES.md` (sau khi được duyệt) **và xoá khỏi** `04_TODO.md` |
| Việc còn dở (ĐANG làm, đã báo) | `04_TODO.md` — nêu rõ `[~]`, **đã tới đâu, bước kế tiếp là gì** |
| Việc PHÁT SINH / ý cho phiên sau | **BÁO trong phiên, hỏi trước khi ghi** — cửa vào ở `Rule_Gate_38_TodoDoor`. Không gật ⇒ không có dòng nào |
| Thiết kế / quyết định thay đổi (gồm định nghĩa metric) | `docs/plan/NN_*.md` · định nghĩa metric → Từ điển dữ liệu `Docs_138_DataDictionary` (+ supersede ở changelog nếu đảo quyết định cũ) |
| Quyết định / trạng thái của MỘT case | spec của case đó (vd `tasks/<case>/spec.md`) — thân + khối khai báo (`updated` đổi cùng lượt); câu cũ bị thay thì sửa/gạch, KHÔNG để hai câu ngược nhau cùng sống |
| Luật / bất biến riêng phát sinh | **HỎI ngay trong phiên**, gật thì ghi thẳng vào đúng nhà (`01`/`02`) — KHÔNG tự sửa `01_LAW/_Cons/`, và KHÔNG đậu vào `04_TODO` chờ duyệt |

**Chuẩn "không bỏ sót":** mọi việc ĐÃ LÀM trong phiên phải tìm được ở `05_CHANGES` **hoặc**
`04_TODO` — không việc nào chỉ nằm trong đầu rồi mất theo phiên. Chẩn đoán sai · đường cụt · thứ đã
thử mà không xong **cũng phải ghi** (để phiên sau khỏi đâm lại chỗ đó): gộp vào **entry CHANGES của
chính việc đó** (một hai dòng "đã loại X vì Y"), KHÔNG đẻ mục `04_TODO` riêng. *"Không bỏ sót" nói về
việc ĐÃ LÀM — nó KHÔNG phải giấy phép ghi mọi thứ nghĩ ra vào sổ; cửa vào của sổ ở
`Rule_Gate_38_TodoDoor`.*

## Bước 2b — format changelog

- Mới nhất ở **trên cùng**, ngay sau header. Format: `## [YYYY-MM-DD] — tiêu đề`.
- **Đảo một quyết định cũ?** Entry mở đầu bằng
  `> 🔄 **Supersede:** thay [YYYY-MM-DDx] — "[đề mục]" — [lý do].`
  Mệnh đề đó phải nêu **ĐÚNG khoá ngày của entry bị thay** (ngày + chữ cái hậu tố, y như trong heading
  của nó) — máy chỉ nối được khi có khoá đó, và nối rồi thì ai tra trúng entry CŨ mới thấy nhãn
  “⚠ ĐÃ BỊ THAY”. Viết trống ngày ⇒ quyết định chết vẫn hiện như đang sống (`Docs_005_Agent`).
  Ngày trần khi hôm đó có nhiều entry ⇒ **bị bỏ qua**, không đoán. **Không sửa/xoá entry cũ.**
- **Entry NGẮN — trần ~30 dòng (luật, không phải gợi ý).** Một entry chỉ cần ba thứ: **đổi gì · vì
  sao · số đo**. Chi tiết thiết kế → `docs/plan/`; tường thuật quá trình → bỏ. *Lý do là số học: vùng
  active chỉ ~180 dòng, bốn entry 50 dòng là chiếm trọn, tức viết dài làm chính cơ chế archive thành
  vô nghĩa.*

## Bước 3 — TỰ DỌN hai file sổ (bắt buộc, đừng chờ ai nhớ gõ lệnh)

Hai file sổ **lớn dần mãi**, mà chuẩn bắt đọc `04_TODO` ở đầu mỗi phiên. Không dọn thì mỗi phiên phải
nạp lại toàn bộ lịch sử — càng dùng lâu càng tốn, tới lúc không còn chỗ cho việc thật.

Chạy `zemory archive` ngay sau khi ghi. Nó làm hai việc KHÁC NHAU, đúng bản chất từng file — đừng
áp chung một ngưỡng:

- **`04_TODO.md` — KHÔNG có ngưỡng.** Mọi mục đã xong — dấu `[x]` **hoặc** `✅`, `archive` nhận cả
  hai (bản chỉ-biết-`[x]` từng làm lệnh **chưa bao giờ nhặt được mục nào** ở repo viết `✅`, trong
  khi sổ phình tới 2.327 dòng và lệnh báo *"nothing to do"* mỗi lần) — chuyển sang
  `docs/agent/archive/04_TODO.md` ngay, vì một mục đã xong là **đặt sai chỗ kể từ giây nó xong** —
  không liên quan file dài hay ngắn. (Đo được: gác bằng ngưỡng kích thước là lý do 107 mục đã xong nằm
  lại chiếm **46%** một file vốn được nạp MỌI phiên.) Mục còn mở `[ ]`/`[~]` giữ nguyên toàn bộ.
  **Dạng dấu máy dời (zemory ≥ 3.6.0):** dòng `- [x]` · `- ✅` · `N. [x]`, và khối có tiêu đề `## [x]`
  (dời NGUYÊN khối tới tiêu đề cùng cấp kế tiếp). `✅` trên mục đánh số / tiêu đề, và khối đóng mà bên
  trong còn `[ ]`/`[~]`, thì máy CHỈ BÁO (danh sách *"NOT moved"*), không dời — `✅` hay được dùng để
  trang trí khối còn nợ. Đọc từng dòng báo: xong thật thì đổi sang `[x]` rồi chạy lại. Viết "xong"
  kiểu khác (gạch `~~…~~`, chữ XONG trong đoạn văn) thì máy KHÔNG thấy. **Đối số:** số mục vừa đóng ở
  Bước 0.3b phải bằng số `archive` báo dời; danh sách báo phải về 0 và số khối bàn giao `archive` đếm
  phải về 1 (chỉ khối của phiên này) — lệch ⇒ sửa dấu/đóng khối rồi chạy lại; KHÔNG coi "nothing to
  do" là sạch.
- **`05_CHANGES.md` — có trần.** Entry **cũ nhất** chuyển sang `archive/05_CHANGES.md`, giữ bản mới
  nhất tại chỗ. Ngưỡng khai trong `docs/.harness.json` (`thresholds.changes_lines`/`changes_keep`).

**Chép NGUYÊN VĂN, KHÔNG tóm tắt** — tầng archive là để TRA LẠI, không phải để nén; cả hai tầng được
reindex nên mục vừa chuyển tra được ngay (`zemory changelog search` · `zemory memory search`).

**Không chạy được `zemory`?** Làm tay đúng hai luật trên, đích `docs/agent/archive/<tên file>.md`
(tạo nếu chưa có), rồi báo đã chuyển bao nhiêu mục:

- `04_TODO.md` — KHÔNG chờ ngưỡng nào. Mục xong dời NGUYÊN VĂN sang archive ngay; dọn cả mục **đã
  huỷ / hoãn vô hạn** + ghi chú cũ; mục còn mở giữ **toàn bộ**. File vẫn to vì quá nhiều việc đang mở
  ⇒ **BÁO để cắt phạm vi**, KHÔNG tự xoá việc.
- `05_CHANGES.md` — trần theo **KÍCH THƯỚC, không phải số dòng.** Đếm bằng `wc -c`; vượt **40.000 ký
  tự** (~10k token) thì chuyển các entry **cũ nhất** đi, giữ lại ~**25.000 ký tự** mới nhất. *Vì sao
  không đếm dòng: dòng ở sổ dày mỏng rất khác nhau (đo được 20–34 token/dòng) nên "300 dòng" có thể là
  6k hay 10k token — đếm dòng là đo sai thứ.*

## Bước 3b — QUÉT RÁC (bắt buộc; luật `01_LAW/_Rule` *".gitignore là GIẤU, không phải DỌN"*)

Chốt phiên là chỗ DUY NHẤT chắc chắn chạy cuối phiên, nên phép quét đặt ở đây. Ba phép, in số ra rồi
mới kết luận — im lặng không tính là sạch:

- **① file lạ ở gốc + file nháp còn sót:** liệt kê untracked NGOÀI các đường gitignore hợp lệ
  (`data/` · `exports/` · két bí mật), và MỌI file khớp `_scratch_*` · `.tmp*` bất kể ở đâu. Có ⇒ xoá
  (hỏi trước nếu file có vẻ là sản phẩm), KHÔNG để lại "dọn sau".
- **② thư mục gitignore có phình không:** đo dung lượng từng thư mục dữ liệu; vượt ngưỡng repo tự đặt
  (mặc định gợi ý **2 GB**) ⇒ BÁO kèm 3 thư mục con to nhất. Đây đúng chỗ đã nuốt **3 GB** (một venv
  13.830 file + một `.rar` 1,34 GB trùng với folder đã giải nén cạnh nó) mà không cổng nào thấy, vì nó
  nằm dưới đường đã gitignore.
- **③ gốc repo có file thực thi không:** `.cmd`/`.sh`/`.bat` ở gốc ⇒ sai chuẩn, phải nằm `bin/`
  (`02_STRUCTURE` mục *Gốc repo sạch*). Đo thật: cơ chế launcher-ở-gốc đã đẻ 5 file rỗng 0 byte, 2 file
  lọt vào git.

Gợi ý lệnh (Windows PowerShell — đổi theo repo):
```
git status --porcelain | Select-String '^\?\?'          # ① file lạ
Get-ChildItem -Recurse -File -Filter '_scratch_*'        # ① nháp còn sót
Get-ChildItem data -Directory | ForEach-Object { '{0,8:N0} MB  {1}' -f ((Get-ChildItem $_ -Recurse -File | Measure-Object Length -Sum).Sum/1MB), $_.Name }
Get-ChildItem -File | Where-Object Extension -in '.cmd','.bat','.sh'   # ③ gốc
```

## Bước cuối

`zemory validate` (đọc file trực tiếp — xanh mới coi là chốt xong) → BÁO CÁO. **Không tự `git push`**
(`Rule_Gate_50_Git`).

## Bảng soát tài liệu đi cùng thay đổi (`Rule_Gate_34_DocsFollowChange`)

| Đã đổi | Phải sửa trong cùng thay đổi |
|---|---|
| việc trong sổ | `04_TODO`: đóng hoặc thêm mục theo `Rule_Gate_38_TodoDoor` |
| bất kỳ thứ gì đã được xác nhận | `05_CHANGES`: một entry, khuôn ở slot `Docs_005_Agent` |
| cấu trúc · định nghĩa (slot · routing · từ điển) | `02_STRUCTURE/INDEX.md` và slot liên quan |
| skill (thêm · bớt) | `03_SKILLS/INDEX.md` |
| thiết kế | spec trong `docs/plan` (sửa tại chỗ thành hướng mới) |
| chức năng có hướng dẫn trong sản phẩm | trang hướng dẫn của sản phẩm |

Sửa `.md` xong, muốn `plan search` · `changelog search` thấy ngay ⇒ `zemory reindex` (dựng lại chỉ mục từ file, không
ghi ngược file).
