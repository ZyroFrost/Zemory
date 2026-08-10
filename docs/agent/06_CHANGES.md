<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-10b] — Đa-truy-vấn: CHẤT LƯỢNG biến thể quyết định DẤU · sửa mô tả tool MCP · biến thể tự sinh THẤT BẠI

> 🔄 **Supersede số của [2026-08-09]** — *"ba lối nói cho `prose@40` 68 → 94%"*. Đo lại trên đường
> ống hôm nay (đã đổi nhiều: `vecMix` · gộp trùng · hình phạt tool hai mức · `W_OR` 0,3): ba lối
> nói chỉ ra **59%**. Con số 94% hết hạn, đừng dùng lại làm mốc.

**Đo trên 34 nhãn `prose`, tham số khớp `recallbench.ts:241` (`all:true`, rerank off):**

| cấu hình | @1 | @3 | @10 | @40 | MRR |
|---|---:|---:|---:|---:|---:|
| 1 truy vấn (nền) | **35%** | 44% | 50% | 65% | 0,407 |
| q + biến thể **CỤ THỂ** | 32% | **47%** | **71%** | **79%** | **0,432** |
| q + biến thể **MƠ HỒ** | 15% | 15% | 35% | 50% | **0,189** |
| q + cả hai | 21% | 32% | 50% | 59% | 0,300 |

**Kết luận không phải "gửi mấy cái" mà là "gửi cái NHƯ THẾ NÀO".** Cùng một số lượng: biến thể
diễn đạt kỹ, giữ nguyên độ cụ thể ⇒ `@10` **+21 điểm**; biến thể ngắn/mơ hồ ⇒ MRR rơi xuống **dưới
một nửa mức không dùng gì**. Đây là lớp có **PHƯƠNG SAI CAO**, không phải lớp "bật là lợi".

**Ba nguồn sinh biến thể, đã đo đủ cả ba — chỉ một nguồn dùng được:**
· luật tất định (3 từ hiếm) → MRR 0,407 → **0,215**, hại nặng · LLM nhỏ trong lõi (Qwen3-0,6B,
09/08) → 0,458 → 0,334, hại · **agent/người viết → 0,407 → 0,432, THẮNG**. Tức đúng thứ tự ưu
tiên điều 6: bậc ① và ③ đều thua, **bậc ② thắng** — nay có thêm bằng chứng thứ hai.

**Đã sửa mô tả tool MCP `memory_search`** theo đúng số mới: khuyên gửi **MỘT** biến thể, bắt buộc
*"cụ thể ngang câu gốc — viết không nổi thì đừng gửi"*, và nêu thẳng con số phạt (0,189 vs 0,407).
Mô tả cũ khuyên 2–3 biến thể dựa trên mốc 94% nay đã hết hạn ⇒ nó đang dạy sai mọi agent nối vào.

**Hệ quả thiết kế** (chi tiết `05_TODO` + `plan/17 §1.1b`): ô "cách nói khác" trên UI KHÔNG còn là
thắng lợi hiển nhiên — gõ câu mơ hồ vào là tệ hơn không gõ, nên nó không thể là một ô trống.

## [2026-08-10] — Rerank ĐÓNG bằng số · RM3 + luồng từ-hiếm TRƯỢT CỔNG · tìm ra cơ chế chôn `tool_use`

**Rerank: đo dứt điểm rồi TẮT.** Bench 68 nhãn, kho thật: thua **mọi** cột nghiêm (`@1` 25→18% ·
`@10` 35→28% · MRR 0,288→**0,204**) và chậm **11,6×** (1.165 → 13.499 ms). Đã tắt qua
`/set-rerank?on=0`. ⚠ **Đính chính báo cáo giữa phiên của tôi:** dưới thước **tương đương** rerank
gần như HOÀ (0,413 vs 0,402) — nó không phá recall mà *xáo giữa các tin tương đương*, thước
nghiêm phạt nặng chuyện đó. Phán quyết đúng là **"không đáng 11,6× thời gian"**, không phải "làm hỏng".

**Hai lớp mới TRƯỢT CỔNG — giữ code, mặc định TẮT** (`ZEMORY_RM3=1` / `ZEMORY_RARE=1`).
RM3 nhích đỉnh (MRR 0,288→0,294) nhưng **tụt chính `@40` — thứ nó sinh ra để cứu** (47→44%) và
phá nặng FTS-thuần (0,191→0,154), tức đường nhanh của app. Luồng từ-hiếm cũng trượt (0,277).
Bảng đầy đủ + vì sao: `plan/17 §3d`.

**Phát hiện đáng giá nhất — `tool_use` 0% là lỗi KIẾN TRÚC GỘP, không phải thiếu vector.** Luồng
từ-hiếm CÓ đáp án **7/14** ở pool 60 (nhiều câu hạng 1–2) mà đường ống trả **0/14**; nâng
`W_RARE` 0,45→3 cứu 3/14 vào top-40. RRF **thưởng đồng thuận nhiều luồng** nên thứ chỉ có mặt ở
MỘT luồng thì hạng 1 cũng bị vùi — quan hệ đơn điệu: `prose` 3 luồng **50%@10** · `tool_result`
2 luồng **25%** · `tool_use` 1 luồng **0%**. ⇒ Giá trị của job embed là **cấp luồng thứ hai**,
không phải "khớp ngữ nghĩa" như `plan/17 §3.2` nói; phạm vi đúng theo nhãn là
`Edit,Write,Bash,PowerShell` (44.747 tin ≈ 15,7 giờ). Chi tiết + cổng nghiệm thu: `plan/17 §3c`.

**⚠ LỖI PHƯƠNG PHÁP CỦA TÔI — rút lại 3 kết luận.** Probe tự dựng **thiếu `all: true`** trong khi
`recallbench.ts:240` luôn có; 14 đáp án nằm rải **12 project** nên probe lọc mất gần hết. Ba thí
nghiệm chạy trên nó (`TOOL_DEMOTE` 0,7/0,9/1,0 · `vecMix` · gộp-trùng) **vô giá trị, đã bỏ**. Bench
vẫn đứng vì có `all:true`. Đúng luật `02_RULES` cấm: *đo bằng bề mặt hẹp hơn bề mặt chịu ảnh hưởng*.

## [2026-08-09e] — Đồng bộ sổ↔code (5 mục thối) · UI nói SAI thực tế · reindex · bug đếm bundle

**5 mục sổ nói khác code, sửa bằng bằng chứng dòng code** (đổi `[ ]`→`✅`, KHÔNG xoá dòng):
`W_OR` sổ ghi "cần hạ 0,6→0,25" mà code đã 0,3 (`search.ts:101`) · write-gate khoá TƯƠI/MỒ CÔI đã
làm (`commands/memory.ts:225-256`) · ca test tầng LỆNH đã có · "chưa có cơ chế cổng không-biết" —
SAI, có từ `search.ts:389` · `tool_result` "về 0%" — đã lên 63→75%. Cộng dấu `[~]` rebuild 768
lạc hậu. **Lỗ của chính gate:** `todo verify` xanh nhưng chỉ tra được **28/79 mục**, cả 5 chỗ
lệch đều nằm ngoài vùng nó với tới.

**UI nói SAI với người dùng — 6 chuỗi, cả hai từ điển VI+EN.** Mô tả Bộ nhớ ghi
`~/.zemory/global_memory.db` (sai từ khi kho dời vào repo — HP điều 14) · mô tả Vector và tooltip
`hint.dims` ghi **256d** trong khi kho chạy **768d/fp32** từ 08/08 ⇒ **màn hình tự mâu thuẫn**: ô số
hiện 768d, phần mô tả nói 256d. Kèm 2 dòng **help CLI** cũng còn đường cũ (đã `npx tsc`), 5 chỗ
trong `docs/plan` (00 ×2 · 02 ×2 · 04) và `plan/05 §5` (gạch dòng "256d là mặc định thật").

**⚠ Chính bản vá UI đó làm CHẾT TOÀN BỘ giao diện.** Dấu nháy đơn trong câu tiếng Anh tôi thêm
(`the model's native size`) **đóng sớm chuỗi** ở từ điển toàn nháy đơn ⇒ `chrome.js` lỗi cú pháp ⇒
`zboot` không định nghĩa ⇒ `boot.js:5` chết ⇒ mọi thẻ đứng ở placeholder tĩnh (badge `v1.0.0`
chính là placeholder chưa bị `/ping` ghi đè). **Tôi CÓ chạy `node --check` — nhưng TRƯỚC lần sửa
cuối, nên nó chứng nhận cho bản không phải bản ship.** Chốt chặn mới chạy SAU khi sửa xong: parse
cả 12 file + **nạp 12 script theo đúng thứ tự `app.html` trong DOM giả** rồi xác nhận
`zboot`/`renderHarness`/`renderMem` tồn tại (bắt được cả lỗi thứ tự nạp mà `--check` mù), và
nghiệm thu trên bản daemon **phục vụ qua HTTP** chứ không phải file trên đĩa.

**`zemory reindex`** — chỉ mục thiếu phần sửa hôm nay (changelog 394→395, section 1080→1111).
⚠ Đính chính: tôi từng báo "mù ba tuần" dựa vào `doc.rendered_at`=16/07 — **suy luận sai**, đó là
cột đời cũ của đường render DB→md đã gỡ, `reindex` không ghi vào nó.

**Bug MỚI, chưa sửa** (chi tiết `05_TODO §Phát sinh 09/10-08`): `ui.ts:256` đếm bundle bằng hậu tố
**đời cũ** `.zemory.enc` ⇒ máy đã lên định dạng series **vĩnh viễn hiện 0 bundle**; chỉ sai HIỂN THỊ.

## [2026-08-09d] — Bản đồ vận hành cho NGƯỜI · luật "tên file = tiếng Anh"

**Sơ đồ toàn hệ → `docs_visual/zemory_runtime_map.html`** (self-contained 31 KB, 0 tài nguyên
ngoài; `.md` chủ ở `plan/00`). Node-link SVG dựng từ MỘT khai báo dữ liệu (26 node · 27 cạnh),
cạnh liền = luôn chạy · đứt = tuỳ chọn/đang tắt; kèm tab **chạy thật** — token trượt dọc đường
ống 10 chặng, mỗi chặng in số ĐO THẬT. Dựng vì các lớp recall cộng dồn hai tuần (đa-truy-vấn ·
trộn cosine · gộp near-dup · hai mức hạ tool · cổng không-biết) tới mức không nhìn được cả chuỗi.

**Phép A/B end-to-end trên MỘT truy vấn thật** (`"vì sao rerank làm recall tệ đi"`, kho sống):
FTS-thuần **0,57 s** · hybrid tắt hết phụ trợ 0,83 s · +trộn cosine 2,60 s · **+rerank 18,8–29,4 s**.
Rerank **chậm 7,2×** và **top-10 chỉ còn trùng 1/10** — nó giữ nguyên hạng 1 rồi xáo toàn bộ 9 vị
trí sau. Đáng ghi hơn: top-1 của **FTS-thuần** chính là câu trả lời, còn đường hybrid đắt gấp ~33
lần lại đẩy nó khỏi vị trí đầu. ⚠ MỘT truy vấn ⇒ **không phải kết luận chung** (điều 12) — nhưng
nó là bằng chứng chạy-thật cho mục rerank đang treo ở `05_TODO`, mạnh hơn số bench trước đó.

**Đo lúc dựng LỆCH sổ bốn chỗ:** sổ ghi 215.452 tin / 157.524 vector / 99,2% / backlog 20.196;
thật (daemon 06:08) **216.885 tin · 1.292 phiên · 1,51 GB · 159.375 vector · còn 740 · 99,5% ·
backlog 19.711**. Cộng một chỗ sổ không nói: **scheduler đang TẮT**. ⚠ "coverage 99,5%" tính trên
phần ĐỦ ĐIỀU KIỆN nhúng, KHÔNG phải trên 216.885 tin — 62.644 tin `tool_use` ngoài mẫu số.

**Luật mới `03_STRUCTURE §5` "Tên file = TIẾNG ANH"** (user chốt). Quét 22.475 mục: **0 tên tiếng
Việt** — 953 file tracked đều đã tuân, tức quy ước sống bằng thói quen mà **chưa từng viết ra**,
nên vi phạm được không cổng nào kêu (tôi đặt `zemory_van_hanh.html`, user bắt). 3 tên ngoài ASCII
đều **KHÔNG đổi** vì không phải của mình: 2 bundle extension `data/browser/**` (ký tự đầu là `с`
**Cyrillic**, đồng hình) + 1 file tiếng Trung trong `external/` (HP điều 2) ⇒ luật khoanh vùng
ĐỂ YÊN hai chỗ đó ngay trong câu chữ.

## [2026-08-09c] — THƯỚC THỨ HAI (tương đương) · vá hồi quy FTS tự gây · gộp near-dup BẬT + thang leo

> 🔄 **Supersede [2026-08-09] và [2026-08-09b]** ở hai điểm: gộp near-dup từ *"trượt cổng, mặc định
> TẮT"* → **BẬT mặc định**; hình phạt tin tool từ *một mức 0,7* → **hai mức theo lane**.

**Tám giả thuyết liên tiếp thất bại theo CÙNG MỘT hướng (`@40` lên, `@1` xuống) ⇒ dấu hiệu THƯỚC
SAI, không phải tám thiết kế sai.** Soi 6 ca "đáp án bị tụt": kẻ chiếm chỗ **gần trùng nội dung 4/6
· lạc đề 0/6** — recall trả về *một tin tương đương từ phiên khác*, mà thước nhãn-đơn-uuid đếm là
TRƯỢT, trong khi chuẩn ngành (NQ) tính hit khi **bất kỳ** đoạn nào chứa đáp án.

**Bench nay in HAI DÒNG** (`ZEMORY_EQUIV_SIM`=0,85; lớp thiếu vector rơi về thước nghiêm, không bịa
điểm — điều 12). Cùng một hệ, không đổi dòng code: hybrid nghiêm MRR 0,319 → **tương đương 0,407**;
`prose` 0,458 → **0,552** · `keyword` 0,373 → **0,515** · `tool_result@10` 38% → **63%**.
GIỮ CẢ HAI: nghiêm = *"trả đúng cái được đánh dấu"*, tương đương = *"người dùng có câu trả lời"*.

**Hồi quy do chính đợt trước gây ra.** `TOOL_DEMOTE` 0,3→0,7 quét CHỈ bằng `searchHybrid` ⇒ không
thấy lane **FTS-thuần** tụt MRR 0,204 → 0,121 — mà đó là **đường nhanh của app** (`search()`) và
đường fail-open. Đo lại cả hai lane: không mức nào tốt cho cả hai (FTS tốt nhất 0,3; hybrid 0,7) ⇒
**tách hai mức**, tiêu chí là *lane vector CÓ THẬT SỰ tham gia* (`vec.length>0`), không phải "hàm
nào được gọi" — vector fail-open trả rỗng thì đó thực sự là FTS-thuần.

**Gộp near-dup BẬT mặc định (user chốt).** Nghiêm 0,319→0,288 nhưng tương đương 0,407→**0,413**
(`@10` 49→**54%** · `prose@40` 76→**82%** · `tool_result@10` 63→**75%**). Kèm **thang leo cho
agent**: mỗi đại diện mang `similar` + **`similarIds`** ⇒ mở bản khác bằng một lượt `memory_show`,
không phải tìm lại; cần liệt kê riêng thì `expand_duplicates:true`. Không gì bị ẩn ⇒ đúng điều 8.

**Bài học cách đo (dính HAI lần trong một phiên):** đo một cấu hình bằng bề mặt **hẹp hơn** bề mặt
sẽ chịu ảnh hưởng — T3 chấm theo "cụm" thay vì tin TRẢ VỀ (báo +29% giả); hình phạt tool quét chỉ
bằng hybrid (hỏng app). Cả hai chỉ lộ ra khi **mở rộng phép đo**, không khi suy luận thêm.

## [2026-08-09b] — Nới hình phạt tin tool 0,3→0,7 (thắng không đánh đổi) · LLM nhẹ: thử, kết quả ÂM

**Hằng số đúng lúc chọn, sai dần khi lớp quanh nó mạnh lên.** `TOOL_DEMOTE=0,3` chọn 07-27 khi tin
tool chiếm **8/20 = 40%** kết quả đầu; đo lại ở chính mức đó hôm nay còn **7%** ⇒ hình phạt quá tay,
chôn luôn lớp ĐÃ tốn công embed (`tool_result` 61.473 tin, vector 99,8%, recall@10 chỉ 25%). Quét 5
mức: **0,7 là mức duy nhất KHÔNG đánh đổi** — `prose` MRR 0,458 → 0,458 y nguyên, `keyword` +55%,
`tool_result` +127%, tổng MRR 0,282 → **0,319**. Không lên 0,85 dù tổng cao hơn: nó bắt `prose` trả
giá (`@1` 35%→32%). Loại lỗi này **không hỏng, không gate nào đỏ** — chỉ bắt được bằng cách đo lại
CHÍNH con số đã sinh ra hằng số.

**Thước sau ba bản vá hôm nay: `@10` 32% → 44% · MRR 0,235 → 0,319** (cân trọng số · trộn cosine ·
nới hình phạt tool). Không lớp nào cần embed lại, không model mới.

**LLM nhẹ trong lõi (điều 6 bậc ③, user chốt) — thử đúng thủ tục, kết quả ÂM.** Việc chọn: sinh biến
thể truy vấn (chỗ bậc ② BẾ TẮC vì trong app không có agent nào viết hộ; phần thưởng đã đo trước:
biến thể TAY cho `prose@40` 68%→94%). Qwen3-0.6B ONNX chạy được trên runtime sẵn có, nhưng biến thể
nó sinh **tệ hơn cả một truy vấn** (MRR 0,458 → 0,334) vì model **nhại lại chính chỉ thị** thay vì
làm theo — vách năng lực, không phải chuyện prompt. ⇒ Đường đúng vẫn là **bậc ②**: agent liên kết
viết (đã ship). Xác nhận thứ tự ưu tiên điều 6 **bằng số**, không bằng nguyên tắc.
Số phụ giữ lại: `enable_thinking:false` phải ở KHUÔN CHAT (`/no_think` trong tin không ăn) — 7,7 →
17,1 tok/s · dtype KHÔNG đổi tốc độ sinh (bài học fp32 của embedder không chuyển sang model sinh) ·
7,45 s/câu ⇒ dù tốt cũng chỉ đặt được ở tầng "Tìm sâu".

**`tool_use` — đã thử, ĐÁNG LÀM.** Nhúng `Edit`+`Write` (code thật; `Read`/`Bash` chỉ là path/lệnh,
29% lớp dưới 200 ký tự) đưa lớp này từ **0% tuyệt đối** lên `@10` 100% trong pool 326 tin có 218 tin
tool làm nhiễu cùng hạng. Bác nghi vấn cũ "câu diễn giải đo lối dùng không có thật" — cả nhóm gõ
nguyên văn cũng tăng như vậy. Ship phần chuẩn bị: `ZEMORY_EMBED_TOOLS` nhận DANH SÁCH tên tool
(backlog đo thật **20.196 tin**, ~9–16 giờ). Chạy job là quyết định giờ máy, chưa chạy.

## [2026-08-09] — Plan 17: đo 6 giả thuyết recall · ship đa-truy-vấn + trộn cosine · 2 thước mới

**Thước chính thức (68 nhãn, kho 768): `@10` 32% → 41% · MRR 0,235 → 0,282 · `prose` MRR
0,410 → 0,458.** Riêng khi agent gửi 3 lối nói: `prose@40` **68% → 94%**.

**Ship mặc định 2 lớp.** ① **Đa-truy-vấn RRF** (`searchMulti`, CLI `--also`, MCP `also[]`,
`/memory-search?also=`): một câu hỏi nhiều cách diễn đạt, gộp bằng RRF — `@10` 39% → 48%.
Agent sinh biến thể (điều 6②), lõi chỉ trộn. Cái này **lật một chẩn đoán cũ**: trần pool từng
bị quy cho lớp NHÚNG (lý do bỏ 43 giờ dựng 768 chiều) — phần lớn là giới hạn của MỘT cách hỏi.
② **Trộn cosine** (`mixByCosine`, `ZEMORY_VECMIX`): xếp lại bằng vector đã lưu rồi trộn với RRF
— MRR +9% ở **119 ms**, trong khi cross-encoder tốn 10–32 GIÂY và làm recall TỆ ĐI. Đánh đổi đã
biết: lớp `keyword` `@1` 25% → 17%.

**Bác bằng số 2 lớp, giữ opt-in 2 lớp.** Tiền tố ngữ cảnh tất định: MRR −10% (ngữ cảnh cấp
PHIÊN giống nhau cho mọi tin nên là nhiễu chia đều) — **cứu ~40 giờ embed lại toàn kho**. Router
trọng số theo độ dài: không đổi một con số nào. Gộp near-dup và cổng không-biết TRƯỢT cổng ⇒
mặc định TẮT, có test khoá.

**Hai thước mới, vì thước cũ mù hai chỗ.** ① `NEGATIVE_HOLDOUT` 10 câu **giữ riêng** — ngưỡng cổng
từng hiệu chỉnh trên chính 8 ca âm dùng để chấm nó, thêm bộ giữ riêng thì "tách hoàn hảo 8/8" bốc
hơi (hai phân bố chồng nhau 0,806–0,856). ② Lớp nhãn **`keyword` 12 câu** (12 phiên/12 project) —
cả 64 nhãn cũ đều có lane AND rỗng nên lối gõ từ khoá CHƯA TỪNG được đo. bench nay chạy cả hai bộ âm.

**Ba lần số tự báo bị chính phép đo sau bác bỏ, đều vì đo bằng bản tự viết lại thay vì gọi đường
thật:** gộp near-dup "+29%" (chấm theo cụm, không theo tin TRẢ VỀ) · cổng "tách hoàn hảo" (fit trên
tập test) · `ftsAnd = 0` (bộ tách từ khác `ftsTerms` — lane AND thật không bao giờ rỗng).

## [2026-08-08] — TRÁO kho 768 · tìm ra NGHẼN THẬT của recall (không phải model) · vá write-gate thủng

**TRÁO KHO 768/fp32 — xong.** Embed 43 giờ kết thúc (`152.894 vector`); tráo: tắt daemon → 256
thành bản lùi `global_memory.256d-backup-20260808.db` → chép 768 vào → `quick_check ok` →
`memory scan` (**+9.530 tin**, 6 s) → embed bù. Kho thật nay **215.452 tin · coverage 99,2% ·
768d**. **Cổng điều 12 vượt** (so `prose` với `prose` — mốc 41%@10 vốn đo trên corpus toàn
prose): **41% → 62%**@10, MRR 0,245 → 0,354. `tool_use` giữ **0%**, đúng như đã cảnh báo.
⚠ Bảng `dims-test` cũ hứa `recall@1` **91%**, thực đo **18%** — nó so vector-với-vector trên tập
hẹp, không phải recall xuyên 215k tin. Thứ hạng tương đối thì đúng; ĐỪNG dùng lại làm mốc.

**NGHẼN THẬT của "search trả rác" — hai dòng dựng truy vấn, KHÔNG phải model.** Bác bỏ lần lượt
bằng đo: model đa ngữ LÀNH (đồng nghĩa VI 0,824 · khác nghĩa 0,602 · VI↔EN 0,827) · dedup,
recency, lane định danh đều làm recall TỆ ĐI. Gốc ở `ftsStreams`: lane `tri` khớp NGUYÊN CỤM cả
câu ⇒ **56/56 câu ra 0 kết quả** (nửa sức FTS chết, fail-open nên không ai biết); lane `word`
AND ngầm ⇒ còn **5,4 ứng viên** trên 215k tin — `search()` trả **1 kết quả** trong khi SQL cùng
index với OR trả đủ 100. ⇒ Thêm lane `word` OR + `tri` khớp theo TỪ. GIỮ lane AND — bỏ nó thì
truy vấn ngắn tụt 75% → 63%@1, mà đó là lối dùng phổ biến nhất.
> ⚠ **NGHIỆM THU THẬT (bench cuối ngày, máy rảnh) — KHÔNG phải cải thiện thuần, ĐỪNG đọc mô
> phỏng thành kết quả.** `prose` @1 **18% → 32%** và MRR 0,354 → 0,384 (tốt), nhưng @3 **47% →
> 41%** và @10 **62% → 53%** (xấu); `tool_result` @10 **25% → 0%**. Bản vá ĐỔI CHỖ: đẩy đáp án
> lên vị trí đầu nhưng làm mỏng top-3/top-10. Giả thuyết: lane OR rộng, lấn chỗ lane VECTOR vốn
> đang gánh @10 cho `prose` — mô phỏng trước đó chạy FTS thuần nên không thấy cạnh tranh này.
> **Bước kế: hạ `W_OR` (0,6 → ~0,25) rồi đo lại**, để OR chỉ cứu ca pool rỗng chứ không lấn.

**Corpus thêm `NEGATIVE_CORPUS`** (8 câu kho chắc chắn không có đáp án) — và nó **trả giá ngay
trong ngày**: đo lần đầu ra **0/8 câu trả rỗng · trung bình 40 kết quả · điểm đầu 0,0284**, gần
bằng điểm ca thật. Hỏi về nấu phở/bóng đá/thơ mà hệ vẫn trả 40 kết quả trông tự tin — **đây
chính là "search trả rác" người dùng báo, nay thành số**. Không có vế này thì bảng recall chỉ
khoe `@1` tăng và bản vá đã được kết luận là thành công. Bài học: mọi thay đổi NỚI POOL phải đo
kèm mặt trái, thước một chiều luôn nói "cải thiện".

**WRITE-GATE THỦNG — bắt được ĐANG XẢY RA:** hai `memory embed --all` cùng ghi một kho sau khi
bật app — đúng tổ hợp hỏng kho 03/08. Khoá KHÔNG hỏng (`cli-write.lock` ghi rõ pid giữ); hai chỗ
NGƯỜI GỌI bỏ qua: ① con của daemon (`ZEMORY_DAEMON_CHILD=1`) bỏ qua SẠCH gate — token daemon chỉ
điều phối job của daemon, mù với CLI ngoài (gốc) · ② CLI thường chờ 2 phút rồi "chạy tiếp", mà
job dài hàng giờ thì nhánh đó LUÔN được chọn. Nay khoá còn TƯƠI ⇒ dừng (exit 1), chỉ đè khi khoá
MỒ CÔI, `--force` là đường vượt có ý thức, chờ 120 s → 30 s. Test mới ở tầng LỆNH (cũ chỉ tầng HÀM).

**Kèm:** xoá `global_memory.HONG-*.db` sau khi SHA256 chứng minh trùng khít vật chứng · rerank ĐO
XONG: TỤT 41%→27%@10 và 11 s/truy vấn ⇒ giữ tắt · phát hiện `config.json` máy này vẫn
`"rerank": true` (giá trị cũ không tự tắt khi code sửa mặc định) — `05_TODO` ưu tiên cao.

## [2026-08-07d] — RELEASE 1.2.0 · Vét TRỌN harness theo marker (đóng ADAPT v2) · corpus recall CHIA LỚP · 3 lượt audit

> 🏷 **1.2.0 (user chốt số, push 2026-08-07)** — minor vì có tính năng mới: `zemory hook guard`
> (chốt chặn lớp ①) · chuẩn ADAPT v2 (harness đặt được ở bất kỳ đâu trong repo) · chuẩn NON-APP
> mở rộng (1-case-1-folder + data 3 chặng) · corpus recall chia lớp. Gộp 20 commit của ngày.
> Trước khi đẩy: `typecheck` · `lint` · `conform --gate` · `todo verify` · `validate` đều exit 0;
> `no-data-in-git` 5/5; `git ls-files` không có `data/` · `share.key` · `.env` · `*.db` · `*.enc`;
> `docs/hooks/` chỉ track 4 file (policy chứa MẪU secret, không có giá trị thật), 0 flag `.allow-*`.

**Vét trọn nhóm LỆNH + bề mặt** (các cổng đã theo marker ở `[2026-08-07c]`; đây là phần đuôi):
`reindex` · `archive` · `todo verify` · `plan ls` · và **UI** (`listHarnessFiles`/`readDoc`).
Mỗi cái hỏng một kiểu riêng trên repo đặt harness ở `harness/`: reindex nhận chỉ mục RỖNG mà
không báo lỗi · todo verify báo 0 mục = **cổng không bao giờ đỏ được** · archive ĐẺ cây docs
thứ hai (ghi vào thư mục của team) · UI hiện cây file rỗng rồi mời chạy `init/sync` — đúng
lệnh sẽ scaffold vào `docs/` của team. Nghiệm thu trên clone repo tham chiếu: reindex 9 plan +
6 harness doc + 117 section + 17 changelog (trước: 0 hết) · todo verify thấy 63 mục.
⇒ **10/10 điểm ép của spec đã đóng; hai literal còn lại là CỐ Ý** (fallback nếp cũ trong
`core/config`, tham số mặc định `readStandardSpec` — ghi đè được).

**Corpus recall CHIA LỚP 34 → 56 câu** (`prose` · `tool_use` · `tool_result`) + bench in bảng
theo lớp. Cơ sở: đo thành phần kho 213.241 tin — `tool_use` 28,7% (không vector, không trigram
⇒ chỉ FTS word) · `tool_result` 28,3% (CÓ vector, đang ăn ~40% công embed) · hội thoại 42,9%.
Corpus cũ toàn `prose` nên có nhân lên 200 câu vẫn mù với 57% kho. Kèm `coverage` theo lớp
(cột `n` in `2/14` khi thiếu nhãn; lớp mất sạch nhãn vẫn có hàng riêng) — nếu không, tỉ lệ
tính trên 2 câu trông y hệt tỉ lệ tính trên 14 câu.

**3 lượt audit, 6 mặt.** Lượt 2 ra bug thật: `conform` còn 3 literal ⇒ **XANH GIẢ** trên repo
adapt — sửa xong nó bắt ngay 2 dangling-ref THẬT của repo đó. Lượt 3 không còn bug chức năng,
chỉ ra: thang marker chưa có test (đã thêm 6 ca, đột biến đỏ 2/6) · guard thêm **~650 ms/tool
call** (số đo, chờ user quyết có thu hẹp matcher) · **còn mù 5 file test nặng model** (embed ·
rerank · vectors · memory-search · digest) — chạy sau khi embed xong, ghi ra để không đọc
"audit xanh" thành "đã soi hết".
- **Bug do chính đợt vét gây ra, bề mặt thật mới bắt được:** tôi "chuẩn hoá" đường index sang
  posix, nhưng index lưu theo separator OS (23 doc row dạng `docs\agent\…`) ⇒ lần reindex sau
  sẽ đẻ hàng TRÙNG, và `plan ls` im lặng báo "index rỗng" dù chỉ mục đủ. **115/115 test xanh
  không bắt được — chỉ gọi bề mặt thật mới bắt.** Chuyển index sang posix là MIGRATION riêng.
