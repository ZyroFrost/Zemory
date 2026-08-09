<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

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
