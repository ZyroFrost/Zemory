<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Plan 17: Recall quality — 6 giả thuyết ĐÃ ĐO, 3 chốt build · 2 bác · 1 treo

> Trạng thái: **ĐÃ ĐO XONG 2026-08-08** (spec ban đầu viết cùng ngày, sau khi tráo kho 768/fp32).
> Sáu phép thử chạy trên kho THẬT 215k tin, corpus 56 nhãn dương + 8 nhãn âm. Mọi con số dưới
> đây là ĐO, không phải ước. Khung kỷ luật: HP điều 15 (tăng cũng phải đo trước, phép thử NHỎ
> trên bản sao) · điều 12 (gate corpus có nhãn trước khi đổi mặc định) · điều 6 (①script →
> ②agent liên kết → ③model; lõi KHÔNG sinh văn bản) · điều 9 (fail-open mọi lớp phụ).

## 0. Mốc nền và đích

**Nền** (mặc định sáng 08/08, trước mọi thay đổi): `@1 20% · @3 25% · @10 32% · @40 43% · MRR 0,235`,
chặn ca âm **0/8**. Theo lớp: `prose@10` 53% · `tool_result@10` 0% · `tool_use` 0%.

**Đích đã chứng minh đạt được** (cân trọng số + T5 + T3 + T1):

| | @1 | @3 | @10 | @40 | MRR | chặn ca âm | mất kết quả đang ở top-10 |
|---|---|---|---|---|---|---|---|
| nền | 20% | 25% | 32% | 43% | 0,235 | 0/8 | — |
| **đích** | **36%** | **46%** | **64%** | **70%** | **0,436** | **8/8** | **0** |

`@10` gấp đôi · MRR +85%. Lớp `prose`: `@10` 62% → **91%**, `@40` 68% → **97%**, MRR 0,410 → **0,638**.
Lớp `tool_result`: `@10` 13% → **63%**. Lớp `tool_use` giữ ~0% — **không kỹ thuật nào ở plan này cứu
được** vì lớp đó KHÔNG có vector (xem §3.2).

**Ba lớp không tranh nhau vì tác động ba tầng khác nhau:** T5 lo *"đáp án có trong pool chưa"* ·
T3 lo *"nó có lên đầu chưa"* · T1 lo *"có nên trả gì không"*. Đo được tính **cộng dồn vượt tổng**:
ở `@10`, T3 riêng +4 điểm, T5 riêng +9 điểm, hai cái cùng nhau **+25 điểm** — vì T5 kéo đáp án VÀO
pool còn T3 đẩy nó LÊN, càng nhiều cái vào thì càng nhiều cái để đẩy.

## 1. CHỐT BUILD — ba lớp, theo đúng thứ tự này

### 1.1 T5 — Đa-truy-vấn RRF (làm TRƯỚC, đòn mạnh nhất)
**Số đo (56 câu):** `@10 39% → 50%` · `@40 45% → 64%` · MRR 0,255 → 0,313. Riêng `prose@40`
**68% → 94%**; `tool_result@10` 13% → 38%.

**Ý nghĩa vượt ra ngoài con số:** cái "trần pool" từng được chẩn là *"nghẽn ở lớp NHÚNG"* và là lý
do bỏ **43 giờ** dựng 768 chiều — hoá ra **phần lớn là giới hạn của MỘT cách diễn đạt**, không phải
của model. Hỏi cùng một việc bằng ba cách là `prose@40` lên 94%.

**Thiết kế:** `search`/`searchHybrid` nhận **mảng truy vấn**; chạy từng cái rồi RRF gộp (`RRF_K=60`,
hạ tầng RRF đã có). **AI sinh biến thể? AGENT ĐANG GỌI** — điều 6② (token của phiên nó, lõi zemory
không sinh văn bản). Bề mặt: `memory_search` (MCP) + CLI nhận nhiều truy vấn trong MỘT lời gọi;
mô tả tool dặn agent gửi 2–3 cách diễn đạt. Một truy vấn ⇒ hành vi y như cũ (tương thích ngược).

**Giá:** ~3× thời gian một lần tìm (0,9 s → ~2,7 s). Chấp nhận được vì recall là on-demand (điều 8).

### 1.2 T3 — Gộp near-duplicate — 🔴 **TRƯỢT CỔNG, đã ship dạng OPT-IN, mặc định TẮT**
> 🔄 **Sửa chính mục này.** Bản trước ghi *"MRR 0,255 → 0,328 (+29%), `@1` 16% → 27%, rác ca âm
> 40 → 22 cụm"* và xếp nó là "chốt build". **Cả ba con số đó SAI** — chúng đến từ một phép thử
> ngoại tuyến chấm bằng thước lệch. Đo lại trên bề mặt THẬT sau khi ship:

| | @1 | @3 | @10 | @40 | MRR |
|---|---|---|---|---|---|
| 1 truy vấn, không gộp | 16% | 30% | **39%** | **45%** | **0,255** |
| 1 truy vấn, có gộp | 16% | 27% | 32% | 41% | 0,223 |
| 3 truy vấn, không gộp | 23% | 34% | **45%** | **64%** | **0,311** |
| 3 truy vấn, có gộp | 23% | 30% | 39% | 41% | 0,278 |

**Lỗi thước, ghi rõ để không ai lặp:** phép thử ngoại tuyến chấm theo *"cụm CHỨA đáp án nằm ở vị
trí mấy"* — tức cho điểm dù thứ **trả về** là tin khác. Bản cài thật trả về **ĐẠI DIỆN** cụm, nên
khi đáp án là bản-trùng của một hit xếp cao hơn thì nó bị đẩy khỏi top-10. Đã thử **cả hai lối**:
xoá bản trùng, và hạ chúng xuống sau (doctrine `demoteToolOutput`) — hạ tốt hơn xoá ở `@40`
(36% → 41%) nhưng **không lối nào cứu được `@10`**.

Mất thêm một lời hứa nữa: "sạch hơn cho ca âm" cũng bốc hơi — lấy dư ×4 rồi gộp thì **suất trống
được lấp bằng rác mới**, nên ca âm vẫn **40 kết quả/câu** (phép thử cũ tưởng 40 → 22 vì nó không
lấp lại).

**Vì sao GIỮ code (opt-in) thay vì xoá:** giá trị thật của gộp là *"trả về một tin TƯƠNG ĐƯƠNG cũng
được"*, mà thước hiện tại đòi **đúng một uuid** nên về nguyên tắc nó không thể ghi nhận điều đó —
đúng món nợ **§4.3 nhãn đa-uuid**. Chưa sửa thước thì KHÔNG được tuyên T3 thắng. Đã ship:
`collapseHits` (θ=0,85 qua `ZEMORY_COLLAPSE_SIM`, hạ-không-xoá, đếm vào `similar`), bật bằng
`ZEMORY_COLLAPSE=1` / `collapse: true`; **mặc định TẮT có test khoá** (`collapseEnabled`).

**Đo lại khi nào:** sau khi §4.3 xong. Đó là lúc câu hỏi "gộp có tốt không" mới trả lời được.

### 1.3 T1 — Cổng "không biết" — ⚠ **CỔNG NGHIÊM TRƯỢT; ship OPT-IN dạng YẾU**
> 🔄 **Sửa chính mục này.** Bản trước ghi *"θ=0,82 chặn 8/8 ca âm, giết oan 0/56 ⇒ tách hoàn hảo"*.
> **Sai** — "tách hoàn hảo" là hệ quả của việc hiệu chỉnh θ trên **chính 8 ca âm dùng để chấm nó**.
> Thêm 10 ca âm GIỮ RIÊNG (§4.1, chưa từng dùng chọn tham số) và 12 nhãn `keyword` (§4.2) thì hai
> phân bố **CHỒNG NHAU**, và không θ nào tách nổi:

| | dải khoảng cách cosine của hit đầu |
|---|---|
| dương `prose` | 0,596 – 0,812 |
| dương `tool_use` | 0,619 – 0,785 |
| dương `tool_result` | 0,629 – 0,772 |
| dương **`keyword`** | 0,661 – **0,856** |
| âm bộ cũ | 0,844 – 0,914 |
| âm **giữ riêng** | **0,806** – 0,935 |

Vùng chồng lấn **0,806–0,856**: truy vấn kiểu từ khoá **nằm xa một cách hợp lệ**, còn câu lạc đề
thì có cái nằm gần. Khoảng cách tuyệt đối, một mình, KHÔNG phải tín hiệu đủ.

**BA điều kiện ② đã thử — hai bị bác bằng đo (đừng dựng lại):**
- *"lane AND rỗng"* ⇒ **cửa không bao giờ mở**: lane AND trả 1–3 ứng viên cho cả câu *"công thức
  nấu phở bò gia truyền Nam Định"*. Trong 215k tin có tin đủ dài để chứa mọi từ thông dụng.
  *(Phép thử trước báo `ftsAnd = 0` cho cả 64 câu vì nó dùng BỘ TÁCH TỪ KHÁC `ftsTerms` của
  production — lại đúng lỗi "đo bằng bản tự viết lại thay vì gọi đường thật".)*
- *"truy vấn không mang từ hiếm"* ⇒ **ngược dấu**: ca âm mang từ HIẾM HƠN ca dương (`minDF` trung
  vị **19** so với **213**), vì câu lạc đề chứa từ vựng kho gần như không có ("arabica", "plank",
  "vali"). Quét R × θ: chặn 0/18 ở mọi cấu hình.
- *MARGIN* (khoảng cách hit thứ 10 trừ hit đầu) ⇒ **sống**, vì không phụ thuộc thang đo. Câu đúng
  chủ đề có một hit NỔI TRỘI; câu lạc đề thì mọi ứng viên tầm tầm như nhau.

**Cấu hình chốt `θ=0,86 · M=0,05`, đo trên bản ĐÃ SHIP (68 nhãn dương · 8 âm cũ · 10 âm giữ riêng):**
chặn **5/8** ca âm cũ · **4/10** giữ riêng · **giết oan 0/68** · mất **0** kết quả đang ở top-10.

⇒ **Cổng nghiêm TRƯỢT** (mốc tự đặt: ≥7/8 và ≥75%). Nhưng "chặn ~50% rác, giá bằng không" là lãi
thật, nên GIỮ dạng **opt-in** (`ZEMORY_ABSTAIN=1`), **mặc định TẮT**, có test khoá. Muốn lên mặc
định thì cần tín hiệu mạnh hơn margin — hướng chưa thử: phân bố điểm của **cả** ba lane (không chỉ
lane vector), hoặc chấm bằng ĐỘ ĐỒNG THUẬN giữa các lane.

> ⚠ **LUẬT BẮT BUỘC — ngưỡng tính trên CÂU NGƯỜI DÙNG GÕ, KHÔNG tính trên biến thể của T5.**
> Đo được: lấy khoảng cách nhỏ nhất của 3 biến thể thì một ca âm tụt từ 0,844 xuống **0,800** (một
> biến thể tình cờ tìm được thứ gần hơn) ⇒ lọt cổng. Ở θ=0,82: theo câu gốc chặn 8/8, theo min-3
> chỉ **7/8**; lên θ=0,84 thì min-3 rơi còn **4/8**. Đây chính là chỗ T1 và T5 ĐÁ NHAU, và tính
> theo câu gốc là cách duy nhất để chúng thôi đá.

**Vì sao T1 là BẮT BUỘC trong tổ hợp, không phải tuỳ chọn:** sau T5+T3, ca âm trả về trung bình
**56 cụm** thay vì 40 — đa-truy-vấn làm bệnh "tự tin sai" **nặng hơn** vì gộp ba danh sách. T1 là
thứ duy nhất bịt cửa đó.

**Thiết kế:** cổng chỉ nổ khi **CẢ HAI** đúng: ① khoảng cách vector top-1 > θ **VÀ** ② lane từ khoá
không có hit mạnh. Điều kiện ② là **bắt buộc** dù corpus hiện chưa đo được nó (xem §4.2) — thiếu nó
thì truy vấn kiểu từ khoá ngắn sẽ bị bóp oan. Nổ ⇒ trả rỗng kèm câu *"kho không có gì đủ khớp"*
(hoặc cờ `low-confidence` cho agent tự quyết), KHÔNG im lặng trả rác.

**Mặc định: TẮT cho tới khi có bộ âm tính GIỮ RIÊNG** (§4.1) — θ hiện tại hiệu chỉnh trên chính 8 ca
âm dùng để chấm nó, tức fit trên tập test. Bật mặc định trước khi có tập giữ riêng là vi phạm điều 12.

### 1.4 Hiệu chỉnh lại HÌNH PHẠT TIN TOOL — ✅ đã ship, thắng KHÔNG đánh đổi (2026-08-09)
**Bệnh: một hằng số đúng lúc chọn, sai dần khi các lớp quanh nó mạnh lên.** `TOOL_DEMOTE = 0,3`
chọn 2026-07-27 khi tin tool chiếm **8/20 = 40%** kết quả đầu. Đo lại ở chính mức 0,3 hôm nay:
chúng chỉ còn **7%** — hình phạt làm quá tay và chôn luôn một lớp ĐÃ TỐN CÔNG EMBED
(`tool_result`: 61.473 tin, vector 99,8%, mà recall `@10` chỉ 25%).

Quét 5 mức trên 68 nhãn chia lớp:

| TOOL_DEMOTE | TỔNG MRR | prose MRR | keyword MRR | tool_result MRR | dump chiếm top-10 |
|---|---|---|---|---|---|
| 0,3 (cũ) | 0,282 | **0,458** | 0,241 | 0,092 | 7% |
| 0,5 | 0,298 | 0,457 | 0,320 | 0,109 | 9% |
| **0,7 (mới)** | **0,319** | **0,458** | **0,373** | **0,209** | 12% |
| 0,85 | 0,331 | 0,443 | 0,340 | 0,425 | 15% |
| 1,0 (tắt) | 0,328 | 0,435 | 0,342 | 0,428 | 19% |

**0,7 là mức DUY NHẤT không đánh đổi gì:** `prose` MRR **0,458 → 0,458** y nguyên, mà `keyword`
**+55%**, `tool_result` **+127%**, tổng **+13%**. Dừng ở 0,7 chứ không lên 0,85 dù tổng cao hơn —
0,85 bắt `prose` trả giá (`@1` 35% → 32%), đổi lớp mạnh nhất lấy lớp yếu là lỗ (cùng lý lẽ đã dùng
khi quyết GIỮ lane AND). Test guard *"tin tool bị hạ xuống dưới văn xuôi"* vẫn xanh ở 0,7.

**Bài học đáng nhớ hơn cả con số:** loại lỗi này **không hỏng, không ai báo, mọi gate vẫn xanh** —
nó chỉ âm thầm ăn recall của một lớp. Cách duy nhất bắt được là **đo lại chính con số đã sinh ra
hằng số đó** (40% → 7%), chứ không phải nhìn recall gộp. Mọi hằng số điều biến thứ hạng nên được
soát lại theo nhịp này.

## 2. BÁC — có số, đừng đề xuất lại

### 2.1 T2 router trọng số theo độ dài truy vấn — BÁC
Ghép hai bộ trọng số theo số từ khoá **không đổi một con số nào** ở mọi ngưỡng K = 4…12. Lý do: cấu
hình cũ chỉ thắng đúng 2 câu, mà cả hai đều là câu dài nên không tách được bằng độ dài. Trần oracle
(router đoán đúng 100%) cũng chỉ MRR 0,276 so với 0,255 — không đáng độ phức tạp.

### 2.2 T4 tiền tố ngữ cảnh tất định — BÁC (thua thật)
| | @1 | @3 | @10 | MRR |
|---|---|---|---|---|
| không tiền tố | **44%** | **62%** | **94%** | **0,581** |
| có tiền tố | 35% | 59% | 91% | 0,522 |

*(pool 148 tài liệu, 34 câu prose — chỉ so A/B trong bảng này, không so với số của kho thật.)*

**Vì sao thua, ghi để không ai thử lại kiểu này:** tiền tố `project · tiêu đề phiên · task đầu của
digest` **giống nhau cho MỌI tin trong một phiên**, nên nó thêm một khối chữ dùng chung làm loãng
tín hiệu riêng của từng tin, và khiến các tin trong cùng phiên **khó phân biệt với nhau hơn**. Bản
Contextual Retrieval của Anthropic ăn vì LLM viết ngữ cảnh **RIÊNG cho từng chunk**; ngữ cảnh cấp
PHIÊN không có tính riêng đó — nó là nhiễu chia đều. Muốn làm lại thì phải có ngữ cảnh **đặc thù
từng tin**, mà đường đó cần LLM ⇒ trái điều 6① cho lõi.

**Kết quả âm này cứu ~40 giờ embed lại toàn kho** — đúng giá trị mà điều 15 nhắm tới.

## 3. CÒN TREO

### 3.1 T6 rerank đa ngữ — CHƯA THỬ ĐƯỢC (không phải bị bác)
Dò 4 model: **chỉ `Xenova/bge-reranker-base` nạp được**; `Xenova/mmarco-mMiniLMv2-L12-H384-v1`,
`onnx-community/bge-reranker-v2-m3`, `Xenova/bge-reranker-v2-m3` đều không có bản ONNX chạy được
với Transformers.js. Nên giả thuyết *"rerank thua vì model zh/en trên kho tiếng Việt"* **còn nguyên,
chưa được kiểm** — đổi một biến env là không đủ.

Nhưng phép đo sắc hơn (**chỉ 25 câu có đáp án NẰM TRONG pool** — vùng duy nhất rerank có thể cứu)
cho một dữ kiện mới:

| | @1 | @3 | @10 | MRR |
|---|---|---|---|---|
| hybrid | **36%** | **68%** | **88%** | **0,571** |
| + rerank | 28% | 56% | 84% | 0,459 |
| — riêng `prose` | 26% | 57% | 83% | 0,447 |
| — riêng **`tool_result`** | **50%** | 50% | **100%** | **0,600** |

⇒ **rerank làm hỏng `prose` nhưng lại giúp `tool_result`.** Cỡ mẫu nhỏ (4 câu) nên chưa chốt, nhưng
nó mở một hướng chưa có trong bản plan đầu: **rerank theo LỚP**, không phải bật/tắt toàn cục.

**Đường ③ ĐÃ THỬ 2026-08-09 — THẮNG, và rẻ đến mức khó tin.** Xếp lại top-40 bằng cosine trên
vector ĐÃ LƯU (một lần nhúng truy vấn + 40 phép nhân vô hướng), **119 ms/truy vấn** so với
10–32 **giây** của cross-encoder — rẻ hơn ~270 lần, và thắng ở đúng chỗ cross-encoder thua:

| thứ tự | @1 | @3 | @10 | @40 | MRR |
|---|---|---|---|---|---|
| RRF (nền) | 18% | 29% | 38% | 49% | 0,258 |
| xếp lại hoàn toàn bằng cosine | 19% | 34% | 40% | 49% | 0,276 |
| **TRỘN RRF + cosine** | **21%** | **34%** | **41%** | 49% | **0,282** |
| — riêng `prose` | 26 → **35%** | 50 → **56%** | 62% | 68% | 0,410 → **0,458** |
| — riêng `tool_result` | 0% | 0 → 13% | 13 → 25% | 25% | 0,039 → 0,087 |
| — riêng **`keyword`** | 25 → **17%** | 25% | 33 → 42% | 67% | 0,275 → **0,241** |

**Trộn ăn hơn thay hẳn** — giữ được cả tín hiệu từ khoá. Nhưng **lớp `keyword` TỆ ĐI** (`@1`
25% → 17%): xếp lại theo ngữ nghĩa đúng là thứ làm hỏng truy vấn mà người ta gõ nguyên văn từ
khoá. Đó là đánh đổi thật, chưa chốt hướng áp (toàn cục hay theo kiểu truy vấn).

**Vì sao cross-encoder thua mà cái này thắng — có tài liệu ngành khớp:** ① *"reranker tiếng Anh
chấm nội dung đa ngữ cho điểm không đáng tin"* — MiniLM English-only sụp **31%** so với **84–90%**
của Jina multilingual; `bge-reranker-base` là model zh/en trên kho tiếng Việt. ② *"bỏ rerank khi
vấn đề precision thực ra là vấn đề recall"* — `@40` của mình mới **49%**, tức hơn nửa số câu đáp án
KHÔNG vào nổi pool, rerank vĩnh viễn không cứu được phần đó. Bench tự đo: chỉ **7/68** câu nằm
trong pool mà ngoài top-10 ⇒ **dư địa của mọi lớp rerank ở kho này chỉ là 7 câu**.

**Hai đường còn lại, xếp theo giá:**
- **Reranker ĐA NGỮ thật** (Jina v2/v3 multilingual, hoặc tự chuyển `bge-reranker-v2-m3` sang
  ONNX rồi trỏ `ZEMORY_RERANK_MODEL` vào thư mục local). Đáng thử vì lệch ngôn ngữ là nguyên
  nhân có tài liệu, nhưng nhớ trần 7 câu ở trên — đừng kỳ vọng nhiều.
- **LATE INTERACTION / ColBERT** — hướng ngành khuyên đúng cho ca của mình: *"bi-encoder huấn
  luyện trên web tổng quát hoá KÉM sang corpus kỹ thuật; khớp mức TOKEN của MaxSim lấy lại phần
  lớn khoảng cách đó **mà không cần huấn luyện lại**"*, chất lượng ngang cross-encoder ở độ trễ
  ngang bi-encoder. Kho mình đúng là "ngoài miền" (log kỹ thuật tiếng Việt, embedder zero-shot).
  Giá: đĩa **10–30×** dense + định dạng chỉ mục riêng. Đây là hướng duy nhất nhắm vào **trần
  pool** — thứ T5 vừa chứng minh là chỗ nghẽn thật (`@40` 49%).

### 3.2 Vector cho `tool_use` — chỉ `Edit`+`Write`, và phải sửa corpus trước
Đo thành phần lớp `tool_use` (62.284 tin, đều là **tham số ĐẦU VÀO của lệnh**):

| tool | n | avg ký tự | bản chất |
|---|---|---|---|
| Bash | 17.162 | 592 | lệnh shell |
| **Edit** | 16.215 | 1.233 | **code thật** (`old_string`/`new_string`) |
| Read | 10.863 | 117 | chỉ một đường dẫn |
| PowerShell | 7.652 | 596 | lệnh shell |
| Grep | 3.407 | 188 | pattern + path |
| **Write** | 3.350 | 3.201 | **nguyên nội dung file** |

**29% lớp này dưới 200 ký tự** — path/pattern/tham số, tức token literal mà FTS word khớp tốt hơn
vector; nhúng một đường dẫn thành 768 chiều gần như vô nghĩa. Chất liệu semantic thật chỉ ở
`Edit`+`Write` = **19.565 tin (~31% lớp) ≈ 9–16 giờ embed + ~60 MB**.

✅ **ĐÃ THỬ 2026-08-09 — ĐÁNG LÀM, và nó bác chính nghi vấn của tôi.** Phép thử trong RAM (khuôn
`dims-test`; pool 326 tin, trong đó **218 tin tool làm nhiễu CÙNG HẠNG** để đáp án không thắng chỉ
vì là tin tool duy nhất có vector):

| nhóm truy vấn | hiện tại (không vector) | nếu có vector |
|---|---|---|
| `tool_use` diễn giải (n=14) | @1 0% · @10 **0%** · MRR 0,000 | @1 **57%** · @3 71% · @10 **100%** · MRR **0,672** |
| `keyword` trỏ vào tin tool_use (n=4) | @1 0% · @10 **0%** · MRR 0,015 | @1 **50%** · @3 75% · @10 **100%** · MRR **0,615** |

⚠ Pool nhỏ nên **số tuyệt đối bị thổi lên** — đọc như phép so A/B, đừng so với kho thật.

🔄 **Bác nghi vấn cũ của chính mục này** (*"14 câu diễn giải có thể đang đo một lối dùng không có
thật"*): **SAI** — cả hai nhóm cải thiện như nhau, tức câu diễn giải TRẢ LỜI ĐƯỢC, chỉ là không có
vector thì vô vọng. Lớp nhãn `keyword` (§4.2) chính là thứ cho phép tách hai giả thuyết này.

**Đã ship phần CHUẨN BỊ:** `ZEMORY_EMBED_TOOLS` nay nhận **danh sách tên tool**
(`ZEMORY_EMBED_TOOLS=Edit,Write`), không còn tất-cả-hoặc-không — để nhúng đúng phần đáng nhúng thay
vì cả 62.284 tin (gấp ~3 lần công cho phần lớn là đường dẫn `Read` và lệnh shell). Tên tool được
lọc còn ký tự an toàn trước khi ghép SQL. **Backlog đo thật: 20.196 tin** (mặc định chỉ 527).

**Còn lại là quyết định GIỜ MÁY:** ~9–16 giờ + ~60 MB. Lệnh sẵn sàng:
`ZEMORY_EMBED_TOOLS=Edit,Write node dist/cli.js memory embed --all`. Nên chạy MỘT MÌNH (write-gate
đã chặn được kẻ ghi thứ hai, nhưng đừng bật app trong lúc chạy — sự cố 08/08).

**Trigram cho `tool_use`:** trigger hiện loại theo `WHEN new.tool_name IS NULL AND content NOT LIKE
'[tool_result]%'` ⇒ mở ra là MIGRATION riêng + dựng lại bảng trigram (từng chiếm 42% cả DB). Chỉ bàn
khi vector-Edit/Write đã chứng minh đáng.

## 3b. LLM NHẸ TRONG LÕI — đã thử theo điều 6 bậc ③, kết quả ÂM (2026-08-09)

> **Bối cảnh, ghi cho đúng:** user chỉ ra rằng triết lý luôn là *"base code lo phần tất định để
> GIẢM TẢI và LỌC RÁC cho LLM; base code chạm trần thì LLM giải phần còn lại"* — và điều 6 vốn
> viết là **"HẠN CHẾ để tối ưu token"** với một thang ba bậc, chứ không phải "tránh LLM". Agent
> (tôi) đã đọc thành cái thứ hai và dừng ở bậc ①②, không bao giờ leo lên bậc ③ dù điều 6 mở sẵn.
> Đây là lần đầu bậc ③ được thi hành đúng thủ tục: user chốt, có phép thử, fail-open.

**Việc được chọn (và vì sao chỉ chọn một):** sinh **biến thể truy vấn** — chỗ base code không thể
làm được về bản chất, và là chỗ bậc ② thật sự BẾ TẮC: trong app KHÔNG CÓ agent nào để viết biến
thể hộ người dùng. Phần thưởng lại đã đo trước khi xây (biến thể TAY: `prose@40` 68% → **94%**),
nên ẩn số duy nhất là *"model 0,6B viết được ngang tay không"*.
Ba việc khác CỐ Ý không giao cho LLM: `tool_use` 0% là lỗ **coverage** (base code embed là xong) ·
LLM rerank có trần **6/68 câu** · HyDE *"cải thiện độ khớp ngữ nghĩa, KHÔNG cải thiện recall"* và
bơm ảo giác vào chính tầng truy hồi (tài liệu ngành), trong khi bệnh của kho là **lệch từ vựng**.

**Hạ tầng: KHÔNG cần runtime thứ hai.** `onnx-community/Qwen3-0.6B-ONNX` chạy qua chính
`@huggingface/transformers` 4.2 sẵn có, weight vào cùng cache `data/models` (plan 05 §2).

**Kết quả — 34 câu `prose`, cùng thước:**

| lane | @1 | @3 | @10 | @40 | MRR |
|---|---|---|---|---|---|
| 1 truy vấn | **35%** | **56%** | 62% | 68% | **0,458** |
| 3 truy vấn — TAY | 29% | 53% | **65%** | **94%** | 0,441 |
| 3 truy vấn — Qwen 0,6B | 21% | 44% | 53% | 62% | 0,334 |

⇒ **Biến thể do 0,6B sinh TỆ HƠN CẢ MỘT TRUY VẤN ở mọi cột.** Chế độ hỏng đã nhìn thấy: model
**nhại lại chính chỉ thị** thay vì làm theo (`"**Write a technical summary in English** using terms
like bundle, vector index"`, `"Dòng 1:** Write the event in a technical language…"`). Nó không tách
được *chỉ thị* khỏi *nội dung* — vách NĂNG LỰC, không phải chuyện tinh chỉnh prompt.

**Bốn số đo phụ đáng giữ:**
- `enable_thinking:false` phải đặt ở **KHUÔN CHAT**; `/no_think` nhét trong nội dung tin **KHÔNG
  ăn**. Tắt suy luận đưa tốc độ **7,7 → 17,1 tok/s** — ở mức này mỗi token cho phần "suy nghĩ" là
  token mất trắng.
- **dtype không đổi tốc độ sinh** (q8 6,9–7,5 vs q4f16 7,7–7,9 tok/s). Tức bài học *"fp32 nhanh
  nhất, q4 chậm nhất"* của **embedder** (plan 05 §5) **KHÔNG chuyển sang** model sinh — đừng suy
  số đo giữa hai model, kể cả cùng runtime cùng CPU.
- Sinh 2 biến thể mất **7,45 s/câu** ⇒ dù chất lượng có tốt cũng KHÔNG đặt được ở đường tìm
  mặc định; chỗ duy nhất khả thi là tầng "Tìm sâu" hoặc sinh trước rồi lưu.
- `onnx-community/Qwen2.5-0.5B-Instruct` **không nạp được** (onnxruntime báo lỗi dựng graph).

**Kết luận thi hành:** đường ĐÚNG cho đa-truy-vấn vẫn là **bậc ②** — agent liên kết viết biến thể
(đã ship, và chính biến thể "tay" trong phép đo này LÀ thứ một agent đủ mạnh viết ra), cộng một ô
nhập cho NGƯỜI dùng (§4 mục chờ duyệt thiết kế). **Không** đưa model sinh vào lõi cho việc này.
Ghi lại như một xác nhận cho thứ tự ưu tiên của điều 6: bậc ② thắng bậc ③ **bằng số**, không phải
bằng nguyên tắc.

**Nếu quay lại hướng này** thì câu hỏi KHÔNG phải "1,7B có khá hơn không" — 3× tính toán trên nền
7,45 s là hơn 20 s/câu, hết khả thi tương tác bất kể chất lượng. Câu hỏi đúng là **đổi runtime**
(llama.cpp/GPU) hoặc **sinh trước, lưu lại** cho tập truy vấn hay dùng.

## 4. NỢ ĐO LƯỜNG — phải trả trước khi bật T1 mặc định

### 4.1 Bộ âm tính GIỮ RIÊNG (chặn T1 khỏi bật mặc định)
θ=0,82 đang hiệu chỉnh trên **chính 8 ca âm dùng để chấm nó** = fit trên tập test. Cần thêm ~8–12 ca
âm mới, **không dùng để chọn θ**, chỉ để nghiệm thu. Chủ đề vẫn phải ngoài hẳn phạm vi kho (kho là
hội thoại kỹ thuật/BI của một người Việt) để không "vô tình đúng".

### 4.2 Truy vấn kiểu TỪ KHOÁ — vùng trắng hoàn toàn
**Cả 64 câu hiện có đều `ftsAnd = 0`** (lane AND đòi đủ mọi từ, câu tự nhiên dài không bao giờ khớp
hết). Nghĩa là corpus **không kiểm được lối dùng phổ biến nhất**: gõ 2–3 từ khoá / một đường dẫn /
một mảnh lệnh. Với loại đó độ tương đồng ngữ nghĩa có thể XA mà kết quả vẫn đúng ⇒ T1 chỉ-xét-vector
sẽ bóp oan. Phải thêm lớp nhãn `keyword` rồi mới tin điều kiện ② của T1.

### 4.3 Nhãn ĐA-UUID
Thước hiện đòi **đúng một uuid**. Đo được: 16/34 ca trượt `prose` là vì một tin **mới hơn, cùng chủ
đề** chiếm chỗ — với chuẩn ngành (NQ tính hit khi *bất kỳ* đoạn nào chứa đáp án) thì đó ĐÃ là hit.
Cho một câu mang TẬP uuid đúng thì thước mới thôi phạt oan đáp án đúng-mà-mới.

### 4.4 Giữ `NEGATIVE_CORPUS` chạy ở MỌI phép thử
Cải thiện recall dương mà thổi phồng "tự tin sai" là cân một chiều — đúng vết xe cắt 256 chiều.

## 5. Thứ tự thi hành + cổng nghiệm thu từng bước
1. **T5** — mở API nhiều truy vấn + RRF gộp; MCP/CLI nhận mảng. Gate: một truy vấn cho kết quả **y
   hệt** trước (tương thích ngược) · 3 truy vấn đạt `@10 ≥ 48%` trên corpus.
2. **T3** — gộp cụm ở tầng trả kết quả, θ=0,85, có đường mở "N bản tương tự". Gate: `MRR ≥ 0,32`
   một-truy-vấn · ghép với T5 đạt `@10 ≥ 60%` · tin không vector vẫn ra (fail-open).
3. **T1** — cổng hai điều kiện, **mặc định TẮT**. Gate: chặn ≥7/8 ca âm bộ CŨ **và** ≥6/8 bộ GIỮ
   RIÊNG · mất **0** kết quả đang ở top-10 · có ca test cho truy vấn từ khoá.
4. **Đo lại toàn bộ** bằng `memory bench --recall` (thước chính thức) rồi so bảng §0.
5. **T6** theo đường ③ trước (rerank bằng embedder, 0 model mới).

Mỗi bước: `npx tsc` + test vùng đụng + đo lại corpus TRƯỚC khi sang bước sau. Không đổi mặc định nào
mà chưa qua gate của chính nó (điều 12).

## 6. Phi-mục-tiêu
- KHÔNG cho lõi tự gọi LLM sinh truy vấn/ngữ cảnh (điều 6) — T5 để agent liên kết sinh.
- KHÔNG bật rerank mặc định dù model mới thắng: lane sâu opt-in (chip 🔬 đã có).
- KHÔNG embed cả lớp `tool_use` "cho đủ" — 69% lớp đó là token literal.
- KHÔNG bật T1 mặc định trước khi trả nợ §4.1 và §4.2.
- KHÔNG tính ngưỡng T1 trên biến thể của T5 (§1.3).
