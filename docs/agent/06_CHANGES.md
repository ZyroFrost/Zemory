<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-24l] — vá 5 lỗ CHUẨN do thực địa báo (estate 6 repo non-app) — sửa ở TEMPLATE

Báo cáo từ `PBI_SasinFlow_Maintain`, mỗi mục kèm số đo; đây là lỗ của BẢN CHUẨN nên sửa ở template.

**① Launcher `.cmd` rời GỐC → slot `bin/`** + luật **GỐC REPO SẠCH**. Chuẩn cũ ĐÃ BIẾT cơ chế này
đẻ rác (có sẵn dòng cảnh báo) nhưng xử bằng cách trông chờ người NHỚ. Đo: **5 file rỗng 0 byte** ở
gốc, **2 đã lọt git**.

**② Luật DỌN RÁC + cổng máy.** Đo một repo: 5 file nháp `.tmp_*` sót · `data/extract/` **3.096 MB**
(venv **201 MB/13.830 file** bulk-copy + `.rar` **1,34 GB** trùng folder đã giải nén cạnh nó) ⇒ dọn
**1,56 GB/~13.850 file**. Luật vào `02_RULES` **5 bản**: nháp ra ngoài repo, buộc trong thì `_scratch_*`
và xoá NGAY LƯỢT ĐÓ · **`.gitignore` là GIẤU, KHÔNG phải DỌN**. Cổng vào `session-close` **Bước 3b**
(chỗ duy nhất chắc chắn chạy cuối phiên): file lạ + nháp sót · dung lượng thư mục gitignore · file
thực thi còn ở gốc.

**③ Bỏ `NN_` khỏi TÊN CASE** (template `03_STRUCTURE` + skill `case`). Repo mới init 2.4.0 vẫn sinh
ra đã sai — sửa tay **3 lần trong một ngày**. `NN_` nay giữ **đúng một nghĩa: thứ tự STAGE**; case
mirror theo TÊN xuyên `tasks/` ↔ `pipelines/` ↔ `data/`.

**④ `guard.cjs` nhánh XOÁ nay hiểu GLOB** như nhánh GHI. Trước đó khai `data/*/01_raw` chặn được
GHI mà **không chặn XOÁ** — người khai tưởng đã rào, cửa sau vẫn mở. Vá bằng **một hàm khớp duy
nhất** `underProtected()` cho cả hai nhánh (diệt luôn nguồn trùng).

**⑤ NGƯỠNG GỘP SLOT ≥3 file** (3 bản `03_STRUCTURE`). Luật cũ chỉ cấm folder RỖNG: đo **4 folder
cho 7 file**, gốc 11 folder, **0 vi phạm chuẩn cũ**. `conform` **nhắc, KHÔNG chặn**.

**Nghiệm thu:** `guard-delete` **11/11** (2 ca mới, có ca ÂM) · **đột biến** trả nhánh xoá về
so-tiền-tố ⇒ **ĐỎ** · gate bắt thêm 2 lỗ sổ sách của chính đợt này (manifest cowork 130→141 ·
59→82; app+adapt phải mang đủ luật cứng ⇒ thêm `Separator của INDEX` vào 3 bộ) ⇒ **49/49**.

⚠ `zemory sync` KHÔNG ghi đè `03_STRUCTURE`/`02_RULES` (file-wins) ⇒ vá này chỉ giúp repo sinh SAU;
**6 repo đang có phải sửa tay**. Đề nghị *sync báo "lệch template"* CHƯA làm: so diff ngây thơ sẽ
báo lệch ở MỌI repo (docs vốn sửa tay — đúng thiết kế), cần tín hiệu theo MARKER. Chờ user chốt.

## [2026-08-24k] — AUDIT bắt hồi quy do chính đợt trước đẻ ra: cổng "không biết" bóp chết kho NHỎ

**Lượt audit 11 mặt trước khi push đã làm đúng việc của nó.** Mặt ① đỏ **2 test** trong
`vectors.test` — cả hai đều là *hybrid trả về RỖNG* — ngay sau khi cổng abstain lên mặc định.
⚠ Thông báo nền in **"exit code 0"** trong khi log ghi `fail 2`; chỉ tin số trong log là thứ cứu
lượt này (bẫy đã ghi trong sổ bàn giao 23/08, nay tái diễn đúng y).

**Bệnh — đo trực tiếp, không suy luận.** Ngưỡng tuyệt đối 0,84 hiệu chỉnh trên kho **278k vector**;
dựng kho nhỏ bằng nội dung THẬT rồi đo cùng một truy vấn:

| số vector | 3 | 20 | 60 | 150 | kho thật 278k |
|---|---|---|---|---|---|
| topDist | 0,9925 | 0,9681 | 0,9215 | 0,9162 | câu dương p50 **0,717** (trần 0,864) |

Ở kho thưa, *"hàng xóm gần nhất ở xa"* chỉ nói *kho còn ít điểm*, KHÔNG nói *kho không có đáp án*.
Hậu quả đo: kho 3 tin ⇒ **0 kết quả** dù FTS có 2 hit và đáp án nằm trong kho ⇒ **máy vừa cài xong
recall câm với MỌI câu** — kiểu hỏng tệ nhất vì trông y hệt "kho không có gì".

**Vá:** thêm SÀN `ABSTAIN_MIN_VECTORS` (mặc định 10.000, đổi được qua env). Chỉ mục dưới sàn ⇒
**không bao giờ chặn**. Phép đếm chỉ chạy khi khoảng cách ĐÃ vượt ngưỡng, nên đường tìm thường
ngày không trả thêm phí; đếm lỗi ⇒ coi như kho mỏng ⇒ không chặn (fail-open, điều 9).

⚠ **Nói thẳng phần chưa biết:** sàn 10k là chọn **THẬN TRỌNG, chưa hiệu chỉnh** — vùng
150…278k vector chưa ai đo. Nó chỉ bảo đảm phía an toàn (thà không chặn còn hơn chặn oan). Muốn
siết cho đúng thì phải đo topDist theo kích thước kho trên corpus CÓ NHÃN rồi mới hạ sàn.

**Nghiệm thu:** `memory-search` **16/16** · **đột biến 2 hướng ĐỎ** (bỏ sàn · hạ sàn xuống 1) ·
hai test từng đỏ nay xanh với thời gian chạy THẬT (5,7 s/ca — đúng chi phí nhúng ONNX, không phải
xanh giả 26 ms) · kho thật vẫn chặn đúng câu lạc đề và vẫn trả 12 kết quả cho câu thật.

⚠ Bẫy: lượt chạy lại đầu báo `skipped 10` vì daemon **tự bật lại** rồi chạy embed ⇒ `skipIfBusy`
bỏ qua đúng hai ca cần kiểm. **Skip KHÔNG phải pass.**

## [2026-08-24j] — user đóng 2 mục cuối: model-routing BỎ · biển cấm separator về nhà vĩnh viễn — **sổ về 0 mục mở**

**① Model-routing — BỎ (user chốt), theo hướng (b): để CLI/agent tự lo, zemory không đụng.** Lý do
là một RANH GIỚI KIẾN TRÚC, không phải một cái tick — chép nguyên văn vì ai định mở lại phải đọc
nó trước: *"second brain nó phải nằm bên project A.I Center; t sợ mở quá nhiều ở zemory thì nó ko
còn là hệ RAG nữa, nó thành AI ops"*. Mục này treo từ 23/07, từng được nới lý do chặn khi điều 6
đổi sang *"HẠN CHẾ gọi LLM"* (02/08) — nay đóng bằng phạm vi, không bằng luật.

**② Biển cấm "separator của index" — DỜI khỏi sổ việc về `02_RULES §Luật khi VIẾT`.** Nó là LUẬT
nổ lúc viết code (`conform` không kiểm được), không phải việc chưa làm; nằm trong `05_TODO` thì mọi
phiên phải đọc rồi soát lại một dòng vĩnh viễn không bao giờ đóng được — đúng thứ §Sổ việc cửa VÀO
sinh ra để chặn. Nội dung giữ nguyên, đo lại số cho tươi: **51/51 doc row dùng `\`** (sổ cũ ghi 23).

**Sổ: 7 mục (đầu 24/08) → 0 mục mở.** Mọi việc còn lại đều đã có nhà: đã làm ⇒ `06_CHANGES` ·
là luật ⇒ `02_RULES` · bị bỏ ⇒ ghi lý do rồi đóng.

⚠ **Bẫy tự dính BA LẦN trong phiên, ghi để lần sau khỏi mất công:** viết chuỗi chứa dấu gạch ngược qua heredoc rồi vào python thì tầng escape ăn mất — lần một biến ký tự xuống-dòng-thoát thành xuống dòng THẬT (vỡ syntax TS); lần hai biến đường dẫn Windows `docs\agent\05_TODO.md` thành `docsgent_TODO.md` (`\a` = bell, `\05` = octal) và nhét ký tự điều khiển VÔ HÌNH vào file, khiến `Edit` sau đó không khớp nổi chuỗi; lần ba dính ngay trong chính đoạn văn đang CẢNH BÁO về nó (`\x00` thành NUL thật) — đúng kiểu *bộ gác tự bẫy chính mình* mà `02_RULES §Sổ việc` đã ghi. Cách làm đúng: dựng dấu gạch ngược bằng `chr(92)`, hoặc sửa thẳng bằng công cụ sửa file, rồi **quét lại dải điều khiển** để chắc.

## [2026-08-24i] — cổng "KHÔNG BIẾT" QUA CỔNG lần đầu: chặn 4/8 → 7/8 · giữ riêng 50% → 85%

**Đợt đo cuối của kế hoạch 24/08.** Hai nợ đo lường chặn mục này từ 09/08 nay đã trả: bộ âm GIỮ
RIÊNG 10 → **20 ca** (10 ca viết mới hôm nay, chưa từng dùng chọn tham số) · lớp nhãn `keyword`
12 → **23**. Probe sao chép ĐÚNG tham số thước (luật đo ①); 136 truy vấn/660 s — khớp khối lượng
nên không phải xanh giả (luật đo ③).

**Luật mới `θ > 0,84`, một tín hiệu duy nhất:** chặn **7/8 âm cũ · 17/20 giữ riêng (85%)** ·
**mất 0 kết quả đang ở top-10**. Luật cũ `θ>0,86 & margin<0,05` chỉ được 4/8 · 10/20. Ba câu dương
bị chặn đều lớp `keyword` và **đang trượt sẵn** (hạng 0 · 0 · 33) ⇒ cổng đổi *"40 kết quả rác tự
tin"* lấy *"không biết"* trung thực, không cướp kết quả nào đang dùng được. θ hạ được vì đo trần
THẬT theo lớp: prose 0,812 · tool_result 0,778 · tool_use 0,764, chỉ keyword chạm 0,864.

**Hai vế bị BÁC bằng đo — ghi để không ai dựng lại:** ① `margin` (tín hiệu duy nhất sống sót vòng
09/08) hoá ra là **gánh nặng**: cùng θ, thêm nó kéo chặn 7/8→5/8 và 17/20→15/20 mà không cứu câu
dương nào · ② **ĐỘ ĐỒNG THUẬN giữa lane — đúng "hướng chưa thử" plan/17 đề xuất — cộng thêm ĐÚNG
SỐ KHÔNG**: ablation cho bộ số trùng khít, vì độ chồng FTS↔vector top-10 có trung vị **0 ở CẢ hai
phía**; dùng một mình thì giết oan 101/108.

**Kèm: bề mặt thôi nói dối.** CLI trước in "no matches" cho CẢ hai ca khác nhau; nay tách *"không
có gì"* với *"có ứng viên nhưng không đủ gần (cổng nổ)"* + chỉ đường xem tiếp (`searchHybridChecked`).

**✅ USER CHỐT BẬT MẶC ĐỊNH (24/08)**, đường lùi `ZEMORY_ABSTAIN=0` có test khoá riêng. Rủi ro
đã khai lúc chốt (cổng chấm bằng khoảng cách VECTOR ⇒ câu từ-khoá FTS tìm được vẫn có thể bị chặn;
23 nhãn là bằng chứng mỏng): `plan/17 §1.3b`.

**Nghiệm thu:** `memory-search` 15/15 · **đột biến 4 hướng ĐỎ** (gắn lại margin · θ về 0,86 ·
mặc-định-TẮT · bỏ đường lùi) · chạy thật: câu lạc đề ⇒ *"không biết"* · câu thật ⇒ 12 kết quả
nguyên vẹn · `ZEMORY_ABSTAIN=0` ⇒ 12 rác như cũ.

## [2026-08-24h] — #12 memory promotion: `zemory memory promote` (đề xuất, 0 ghi, 0 LLM)

**Cái cầu còn thiếu của Phase 2 (ý 18/07):** correction/decision user LẶP LẠI qua nhiều phiên mà
chưa ai viết thành luật. `promote.ts`: lọc marker chỉnh/chốt (VN+EN) trên tin role=user giọng
NGƯỜI (loại tool_result + text HOST bơm) → gom cụm cosine trên **vector ĐÃ CÓ** (greedy tất định
theo id — cùng kho luôn ra cùng cụm) → chỉ giữ cụm **≥3 tin qua ≥2 PHIÊN** (nhắc 3 lần trong một
cuộc là một sự vụ, không phải pattern) → đối chiếu lane curated #13: cụm đã khớp fact chưng cất
(cos ≥0,8) gắn `covered`. **CHỈ ĐỀ XUẤT** — user gật thì agent ghi luật, zemory không ghi (điều 3).

**Chạy thật:** 841 ứng viên → 174 cụm → **15 đề xuất**; đầu bảng là câu user chỉnh
**192× qua 148 phiên · 45 project** chưa từng thành luật — đúng loại lỗ hệ này sinh ra để bịt.
Lượt đầu lộ 2 bệnh, vá ngay: ① text host bơm (`<local-command-caveat>` 252×, `<ide_opened_file>`,
khối `# AGENTS.md instructions`) mang "DO NOT…" gom thành cụm to thứ nhì ⇒ lọc prefix tag ·
② note "curated lane empty" NÓI DỐI — 153 fact có trong kho nhưng **chưa embed** (scheduler chưa
tới) ⇒ tách hai câu "không có fact" vs "fact chưa có vector".

**Nghiệm thu:** `memory-promote` **5/5** · đột biến 2 hướng ĐỎ (bỏ ngưỡng ≥2 phiên · bỏ sàn độ
dài) · lint sạch · fail-open: kho không có lớp vector ⇒ notes nói thẳng, không trả rỗng giả sạch.
Nhiễu còn lại có chủ đích chấp nhận (paste code/shell lọt marker) — báo cáo cho NGƯỜI đọc duyệt,
lọc quá tay là rơi tín hiệu thật; siết thêm chỉ khi có số đo mới.

## [2026-08-24g] — #13 ingest BỘ NHỚ CURATED của agent: adapter `claude-code-memory`

**Lane mới, 0 migration.** Adapter `claudemem.ts` quét `~/.claude/projects/<enc>/memory/*.md`
(kể cả `MEMORY.md`) — thứ agent ĐÃ chưng cất — vào Global Memory qua đúng đường `scan()` sẵn có:
**1 file = 1 session** (một fact = một đơn vị recall), role `memory`, `tool_name NULL` (vào đủ
3 lane word/trigram/vector, không dính hình phạt tool), redact + digest + scope-exclude hưởng
sẵn từ engine. Chạy thật: **153 fact / 153 phiên** từ mọi project trên máy, +435 tin trong lượt
scan; scheduler 30′ tự giữ tươi (file đổi ⇒ whole-replace).

**Ba câu "Cần chốt" của mục sổ — chốt bằng thiết kế, lý do ghi tại chỗ:**
· ① `kind=curated` **KHÔNG thêm cột** — lane = `source='claude-code-memory'` trên cột sẵn có
  (đúng doctrine plan/07 §3: một cột provenance, không store thứ hai); scope-tree lọc được ngay.
· ② map `<enc>` → project root bằng cách **mã hoá ngược mọi root trong registry** rồi so khớp
  (mã hoá là lossy nên decode thẳng là bất khả; không khớp ⇒ `(unknown)`, **cấm đoán** — đo:
  26/153 là project cũ ngoài registry). Global `~/.claude/CLAUDE.md` v1 CHƯA quét (ngoài phạm vi
  `projects/*/memory/`). Session id mang **hostname** — hai máy không lẫn phiên (điều 11).
· ③ Claude Code trước (đúng đề xuất); Codex/Cursor cần format riêng, làm khi có nhu cầu.
**Recall "xếp cao hơn" CHƯA làm** — mọi thay đổi xếp hạng phải qua corpus có nhãn (điều 12/15),
để cặp với #12.

**Nghiệm thu:** `curated-memory` **7/7** · **đột biến 2 hướng ĐỎ** (bỏ ràng buộc thư-mục-memory ⇒
6 đỏ · decode đoán bừa ⇒ 2 đỏ) · bất biến giữ đủ: read-only (mtime file nguồn đứng yên qua scan),
secret `sk-ant-…` bị redact trong kho còn file nguồn nguyên vẹn, lane exclude chặn từ cửa nạp có
báo `skippedLanes`.

⚠ Bẫy thước tự dính trong lượt nghiệm thu, ghi để khỏi lặp: `zemory … | Select-Object -First N`
trong PowerShell **cắt pipeline sớm ⇒ node ăn EPIPE ⇒ exit −1 GIẢ** — tưởng CLI hỏng, stash cả
cây đo lại mới thấy exit 0 qua cmd. Muốn cắt output thì `-Last`/`Select-String` (nuốt trọn) hoặc
đo exit qua `cmd /c`.
